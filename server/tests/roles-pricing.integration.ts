import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error("Set TEST_DATABASE_URL to a dedicated _test database.");
const db = new PrismaClient({ datasourceUrl: url });
const port = Number(process.env.TEST_PORT || 5111),
  base = `http://127.0.0.1:${port}/api`;
test("role boundaries and configurable direction/pricing workflow", async (t) => {
  const server = spawn(
    process.execPath,
    [fileURLToPath(new URL("../dist/server.js", import.meta.url))],
    {
      env: {
        ...process.env,
        DATABASE_URL: url,
        PORT: String(port),
        HOST: "127.0.0.1",
        NODE_ENV: "test",
        JWT_ACCESS_SECRET: "test-access-secret-with-at-least-32-characters",
        JWT_REFRESH_SECRET: "test-refresh-secret-with-at-least-32-characters",
      },
      stdio: "ignore",
    },
  );
  const tokens: Record<string, string> = {};
  const call = async (
    path: string,
    role = "ADMIN",
    body?: any,
    method = body ? "POST" : "GET",
  ) => {
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json() };
  };
  const good = async (
    path: string,
    role = "ADMIN",
    body?: any,
    method?: string,
  ) => {
    const r = await call(path, role, body, method);
    assert.ok(r.status < 300, `${path}: ${JSON.stringify(r)}`);
    return r.body.data;
  };
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base.replace("/api", "/health"))).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    const suffix = randomUUID().slice(0, 8),
      password = "DemoTest123456";
    for (const role of [
      "ADMIN",
      "ACCOUNTANT",
      "OPERATIONS_MANAGER",
      "VIEWER",
    ] as const) {
      const email = `${role.toLowerCase()}-${suffix}@test.local`;
      await db.user.create({
        data: {
          email,
          fullName: role,
          role,
          passwordHash: await bcrypt.hash(password, 4),
        },
      });
      tokens[role] = (
        await good("/auth/login", role, { email, password })
      ).accessToken;
    }
    const client = await db.client.create({
      data: {
        companyName: "Test " + suffix,
        contactPerson: "Tester",
        phone: "DEMO",
        email: "test@example.invalid",
        address: "Cairo",
      },
    });
    const vehicle = await db.vehicle.create({
      data: {
        plateNumber: "TEST-" + suffix,
        make: "Toyota",
        model: "Bus",
        manufacturingYear: 2026,
        vehicleType: "SEDAN",
        capacity: 30,
        insuranceExpiry: new Date("2030-01-01"),
        licenseExpiry: new Date("2030-01-01"),
        inspectionExpiry: new Date("2030-01-01"),
      },
    });
    const driver = await db.driver.create({
      data: {
        fullName: "Driver " + suffix,
        phoneNumber: "DEMO",
        nationalId: suffix,
        licenseNumber: suffix,
        licenseExpirationDate: new Date("2030-01-01"),
        assignedVehicleId: vehicle.id,
      },
    });
    const route = await db.route.create({
      data: {
        clientId: client.id,
        routeName: "Route " + suffix,
        startLocation: "Cairo",
        finalDestination: "Factory",
        estimatedDistanceKm: 20,
        estimatedDurationMin: 60,
        clientPricePerTrip: 999,
        driverTripAllowance: 99,
        defaultDriverId: driver.id,
        defaultVehicleId: vehicle.id,
      },
    });
    // Other suites may clear lookup rows; this suite owns its required catalog fixtures.
    for (const [code, name] of [
      ["SEDAN", "سيارة سيدان"],
      ["BUS_50_SEATER", "باص 50 راكب"],
      ["VAN_14_SEATER", "ميكروباص 14 راكب"],
    ])
      await db.vehicleCategory.upsert({
        where: { code },
        create: { code, name },
        update: { active: true },
      });
    for (const [id, name, direction] of [
      ["10000000-0000-4000-a000-000000000001", "ذهاب", "OUTBOUND"],
      ["10000000-0000-4000-a000-000000000002", "عودة", "RETURN"],
      ["10000000-0000-4000-a000-000000000003", "ذهاب وعودة", "BOTH"],
    ])
      await db.tripBillingType.upsert({
        where: { id },
        create: { id, name, direction, active: direction !== "BOTH" },
        update: { active: direction !== "BOTH" },
      });
    await db.tripBillingType.updateMany({
      where: {
        id: { startsWith: "10000000-" },
        direction: { in: ["OUTBOUND", "RETURN"] },
      },
      data: { active: true },
    });
    const configuration = await good("/configuration");
    const types = configuration.billingTypes;
    const rates = types.map((b: any, i: number) => ({
      billingTypeId: b.id,
      departureTime: b.direction === "RETURN" ? "17:00" : "07:00",
      returnDepartureTime: null,
      saleAmount: [100, 130, 210][i] || 210,
      costAmount: 0,
      driverAllowance: 0,
      vehicleCost: 0,
    }));
    await t.test(
      "accountant can manage settings, route prices and users",
      async () => {
        await good(`/routes/${route.id}/rates`, "ACCOUNTANT", { rates }, "PUT");
        const cat = await good("/configuration/vehicle-types", "ACCOUNTANT", {
          name: "Custom " + suffix,
        });
        await good(
          `/vehicles/${vehicle.id}`,
          "ACCOUNTANT",
          { vehicleType: cat.code },
          "PUT",
        );
        await good("/users", "ACCOUNTANT");
      },
    );
    await t.test(
      "both restricted roles cannot read any accounting routes",
      async () => {
        for (const role of ["OPERATIONS_MANAGER", "VIEWER"])
          for (const path of [
            "/accounting/operations",
            "/ACCOUNTING/operations",
            "/operations/documents",
            "/operations/billing/party-trips",
            "/operations/treasury",
            "/operations/records/payroll",
            "/operations/analytics",
            "/users",
          ])
            assert.equal(
              (await call(path, role)).status,
              403,
              `${role} ${path}`,
            );
      },
    );
    await t.test(
      "recursive redaction covers routes, vehicles, bootstrap and dashboard",
      async () => {
        for (const role of ["OPERATIONS_MANAGER", "VIEWER"])
          for (const path of [
            "/routes",
            "/vehicles/" + vehicle.id,
            "/operations/bootstrap",
            "/dashboard/kpis",
          ]) {
            const data = await good(path, role);
            const serialized = JSON.stringify(data);
            assert.ok(
              !/"(?:saleAmount|clientPricePerTrip|costAmount|driverAllowance|monthlyValue|saleRate|totalRevenue)":/.test(
                serialized,
              ),
              path,
            );
          }
      },
    );
    await t.test(
      "viewer can update vehicles but cannot create/delete/manage anything else",
      async () => {
        await good(
          `/vehicles/${vehicle.id}`,
          "VIEWER",
          { model: "Updated model" },
          "PUT",
        );
        for (const [path, method] of [
          ["/vehicles", "POST"],
          ["/vehicles/" + vehicle.id, "DELETE"],
          ["/routes", "POST"],
          ["/trips", "POST"],
          ["/configuration/vehicle-types", "POST"],
        ])
          assert.equal(
            (await call(path, "VIEWER", { name: "Denied" }, method)).status,
            403,
          );
      },
    );
    await t.test(
      "operations manager can change vehicle type only",
      async () => {
        await good(
          `/vehicles/${vehicle.id}`,
          "OPERATIONS_MANAGER",
          { vehicleType: "SEDAN" },
          "PUT",
        );
        assert.equal(
          (
            await call(
              `/vehicles/${vehicle.id}`,
              "OPERATIONS_MANAGER",
              { model: "Denied" },
              "PUT",
            )
          ).status,
          403,
        );
        assert.equal(
          (await call("/routes", "OPERATIONS_MANAGER", { routeName: "Denied" }))
            .status,
          403,
        );
      },
    );
    const trips: any[] = [];
    await t.test(
      "outbound and return save independent prices and correct Cairo times",
      async () => {
        for (const [index, type] of types.entries()) {
          const rate = rates[index],
            day = `2026-11-${String(10 + index).padStart(2, "0")}`;
          const data = await good("/trips", "OPERATIONS_MANAGER", {
            routeId: route.id,
            clientId: client.id,
            vehicleId: vehicle.id,
            driverId: driver.id,
            billingTypeId: type.id,
            direction: type.direction,
            tripDate: day,
            shift: "MORNING",
            scheduledDeparture: `${day}T${rate.departureTime}`,
            expectedArrival: `${day}T${type.direction === "OUTBOUND" ? "08:00" : "18:00"}`,
          });
          assert.equal(data.saleAmount, undefined);
          const saved = await good(`/trips/${data.id}`);
          assert.equal(Number(saved.saleAmount), rate.saleAmount);
          assert.equal(saved.direction, type.direction);
          assert.equal(saved.billingTypeName, type.name);
          assert.equal(
            saved.scheduledDeparture,
            `${day}T${type.direction === "RETURN" ? "15" : "05"}:00:00.000Z`,
          );
          trips.push(saved);
        }
      },
    );
    await t.test(
      "ops cannot override prices; viewer cannot edit trip; normal CRUD denied",
      async () => {
        assert.equal(
          (
            await call(
              `/trips/${trips[0].id}`,
              "OPERATIONS_MANAGER",
              { saleAmount: 1 },
              "PUT",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              `/trips/${trips[0].id}`,
              "VIEWER",
              { notes: "Denied" },
              "PUT",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              `/trips/${trips[0].id}`,
              "OPERATIONS_MANAGER",
              {},
              "DELETE",
            )
          ).status,
          403,
        );
      },
    );
    await t.test(
      "editing notes preserves price and arrival snapshots after route changes",
      async () => {
        await good(
          `/routes/${route.id}/rates`,
          "ACCOUNTANT",
          { rates: rates.map((r: any) => ({ ...r, saleAmount: 777 })) },
          "PUT",
        );
        await db.route.update({
          where: { id: route.id },
          data: { estimatedDurationMin: 90 },
        });
        await good(
          `/trips/${trips[0].id}`,
          "OPERATIONS_MANAGER",
          { notes: "Updated" },
          "PUT",
        );
        assert.equal(
          (await good(`/trips/${trips[0].id}`)).expectedArrival,
          trips[0].expectedArrival,
        );
        assert.equal(
          Number((await good(`/trips/${trips[0].id}`)).saleAmount),
          rates[0].saleAmount,
        );
      },
    );
    await t.test(
      "completion posts snapshot once, including zero overrides",
      async () => {
        const id = trips[0].id;
        await good(
          `/trips/${id}`,
          "ACCOUNTANT",
          { saleAmount: 0, driverAllowance: 0, vehicleCost: 0 },
          "PUT",
        );
        await good(
          `/trips/${id}/status`,
          "OPERATIONS_MANAGER",
          { tripStatus: "IN_PROGRESS" },
          "PATCH",
        );
        await good(
          `/trips/${id}/status`,
          "OPERATIONS_MANAGER",
          { tripStatus: "COMPLETED" },
          "PATCH",
        );
        const rows = await db.dailyOperation.findMany({
          where: { notes: { contains: `[Trip#${id}]` } },
        });
        assert.equal(rows.length, 1);
        assert.equal(Number(rows[0].dailyRate), 0);
        assert.equal(Number(rows[0].driverDailyRate), 0);
        assert.equal(
          (
            await call(
              `/trips/${id}/status`,
              "OPERATIONS_MANAGER",
              { tripStatus: "COMPLETED" },
              "PATCH",
            )
          ).status,
          422,
        );
      },
    );
    await t.test(
      "combined trips are unavailable in configuration, pricing and trip creation",
      async () => {
        assert.deepEqual(
          [...new Set(types.map((type: any) => type.direction))].sort(),
          ["OUTBOUND", "RETURN"],
        );
        assert.equal(
          (
            await call("/configuration/billing-types", "ACCOUNTANT", {
              name: "Combined " + suffix,
              direction: "BOTH",
            })
          ).status,
          422,
        );
        const combinedId = "10000000-0000-4000-a000-000000000003";
        const payload = {
          routeId: route.id,
          clientId: client.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          billingTypeId: combinedId,
          tripDate: "2026-11-20",
          shift: "MORNING",
          scheduledDeparture: "2026-11-20T07:00",
          expectedArrival: "2026-11-20T18:00",
        };
        assert.equal(
          (await call("/trips", "OPERATIONS_MANAGER", payload)).status,
          422,
        );
        assert.equal(
          (
            await call("/trips", "OPERATIONS_MANAGER", {
              ...payload,
              billingTypeId: types[0].id,
              direction: "BOTH",
            })
          ).status,
          422,
        );
        assert.equal(
          (
            await call(
              `/routes/${route.id}/rates`,
              "ACCOUNTANT",
              { rates: [{ ...rates[0], billingTypeId: combinedId }] },
              "PUT",
            )
          ).status,
          422,
        );
        assert.equal(
          (
            await call("/trips/batch-generate", "OPERATIONS_MANAGER", {
              routeId: route.id,
              billingTypeId: combinedId,
              startDate: "2026-11-20",
              endDate: "2026-11-20",
              shifts: ["MORNING"],
              departureTime: "07:00",
              durationMinutes: 60,
            })
          ).status,
          422,
        );
      },
    );
    await t.test("return batch keeps its own price and departure", async () => {
      const type = types.find((x: any) => x.direction === "RETURN");
      const result = await good("/trips/batch-generate", "OPERATIONS_MANAGER", {
        routeId: route.id,
        billingTypeId: type.id,
        direction: "RETURN",
        startDate: "2026-11-20",
        endDate: "2026-11-20",
        shifts: ["MORNING"],
        departureTime: "17:00",
        durationMinutes: 60,
      });
      assert.equal(result.generatedCount, 1, JSON.stringify(result));
      const trip = await db.trip.findFirstOrThrow({
        where: { routeId: route.id, tripDate: new Date("2026-11-20") },
      });
      assert.equal(Number(trip.saleAmount), 777);
      assert.equal(trip.direction, "RETURN");
      assert.equal(
        trip.scheduledDeparture.toISOString(),
        "2026-11-20T15:00:00.000Z",
      );
      assert.equal(trip.returnDeparture, null);
    });
    await t.test(
      "disabled types and unknown vehicle types are rejected",
      async () => {
        const type = types.find((x: any) => x.direction === "RETURN");
        await good(
          `/configuration/billing-types/${type.id}`,
          "ACCOUNTANT",
          { name: type.name, direction: type.direction, active: false },
          "PUT",
        );
        const result = await call("/trips", "OPERATIONS_MANAGER", {
          routeId: route.id,
          clientId: client.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          billingTypeId: type.id,
          direction: "RETURN",
          tripDate: "2026-11-25",
          shift: "MORNING",
          scheduledDeparture: "2026-11-25T17:00",
          expectedArrival: "2026-11-25T18:00",
        });
        assert.equal(result.status, 422);
        assert.equal(
          (
            await call(
              `/vehicles/${vehicle.id}`,
              "VIEWER",
              { vehicleType: "MADE_UP" },
              "PUT",
            )
          ).status,
          422,
        );
        await good(
          `/configuration/billing-types/${type.id}`,
          "ACCOUNTANT",
          { name: type.name, direction: type.direction, active: true },
          "PUT",
        );
      },
    );

    await t.test(
      "driver deductions and partial payments preserve balances, history and treasury",
      async () => {
        const month = 8,
          year = 2028;
        await db.dailyOperation.create({
          data: {
            driverName: driver.fullName,
            companyName: client.companyName,
            routeName: route.routeName,
            day: 1,
            month,
            year,
            date: new Date("2028-08-01"),
            dailyRate: 2000,
            tripCount: 2,
            driverDailyRate: 500,
            totalAmount: 4000,
            netDriverPay: 1000,
            dailyProfit: 3000,
            netRevenue: 3000,
          },
        });
        const account = await good(
          "/accounting/treasury/accounts",
          "ADMIN",
          {
            name: "Driver cash " + suffix,
            kind: "CASH",
            openingBalance: 5000,
            openingDate: "2028-08-01",
          },
        );
        const payment = {
          driverName: driver.fullName,
          month,
          year,
          amount: 200.25,
          accountId: account.id,
          date: "2028-08-02",
          reference: "First installment",
          requestKey: randomUUID(),
        };
        const balances = async () =>
          (
            await good(`/accounting/settlements?month=${month}&year=${year}`)
          ).find((s: any) => s.driverName === driver.fullName);
        for (const role of ["VIEWER", "OPERATIONS_MANAGER"])
          for (const path of [
            "/accounting/settlements/pay",
            "/accounting/settlements/deduct",
          ])
            assert.equal((await call(path, role, payment)).status, 403);
        const first = await good(
          "/accounting/settlements/pay",
          "ACCOUNTANT",
          payment,
        );
        let balance = await balances();
        assert.equal(balance.status, "PARTIAL");
        assert.equal(balance.netPayable, 799.75);
        assert.equal(balance.totalPaid, 200.25);
        const duplicate = await good(
          "/accounting/settlements/pay",
          "ACCOUNTANT",
          payment,
        );
        assert.equal(duplicate.entry.id, first.entry.id);
        assert.equal((await balances()).totalPaid, 200.25);
        assert.equal(
          (
            await call("/accounting/settlements/pay", "ACCOUNTANT", {
              ...payment,
              amount: 200,
            })
          ).status,
          409,
        );
        const pnlBefore = await good(
          `/accounting/income-statement?month=${month}&year=${year}`,
        );
        const deduction = {
          driverName: driver.fullName,
          month,
          year,
          amount: 50.25,
          date: "2028-08-02",
          reference: "Late arrival",
          requestKey: randomUUID(),
        };
        await good("/accounting/settlements/deduct", "ACCOUNTANT", deduction);
        await good("/accounting/settlements/deduct", "ACCOUNTANT", deduction);
        balance = await balances();
        assert.equal(balance.totalDeductions, 50.25);
        assert.equal(balance.netPayable, 749.5);
        assert.equal(balance.entries.length, 2);
        assert.equal(
          await db.treasuryEntry.count({
            where: { accountId: account.id, kind: "OUT" },
          }),
          1,
        );
        const pnlAfter = await good(
          `/accounting/income-statement?month=${month}&year=${year}`,
        );
        assert.equal(
          pnlBefore.directCosts.driverPayAndOvertime -
            pnlAfter.directCosts.driverPayAndOvertime,
          50.25,
        );
        for (const amount of [0, -1, 0.001, 800])
          assert.equal(
            (
              await call("/accounting/settlements/deduct", "ACCOUNTANT", {
                ...deduction,
                amount,
                requestKey: randomUUID(),
              })
            ).status,
            422,
          );
        const poor = await good("/accounting/treasury/accounts", "ADMIN", {
          name: "Empty " + suffix,
          kind: "CASH",
          openingDate: "2028-08-01",
        });
        assert.equal(
          (
            await call("/accounting/settlements/pay", "ACCOUNTANT", {
              ...payment,
              accountId: poor.id,
              requestKey: randomUUID(),
            })
          ).status,
          422,
        );
        const competing = await Promise.all(
          [1, 2].map(() =>
            call("/accounting/settlements/pay", "ACCOUNTANT", {
              ...payment,
              amount: 500,
              requestKey: randomUUID(),
            }),
          ),
        );
        assert.deepEqual(competing.map((r) => r.status).sort(), [200, 422]);
        assert.equal((await balances()).netPayable, 249.5);
        await good("/accounting/settlements/pay", "ADMIN", {
          ...payment,
          amount: 249.5,
          requestKey: randomUUID(),
        });
        balance = await balances();
        assert.equal(balance.status, "PAID");
        assert.equal(balance.netPayable, 0);
        assert.equal(balance.totalPaid, 949.75);
        assert.equal(balance.entries.length, 4);
        assert.equal(
          (
            await call("/accounting/settlements/pay", "ADMIN", {
              ...payment,
              amount: 1,
              requestKey: randomUUID(),
            })
          ).status,
          422,
        );
        const annual = (
          await good(`/accounting/settlements?year=${year}`)
        ).find((s: any) => s.driverName === driver.fullName);
        assert.equal(annual.totalPaid, 949.75);
        assert.equal(annual.netPayable, 0);
        const filtered = (
          await good(
            `/accounting/settlements?month=${month}&year=${year}&companyName=${encodeURIComponent(client.companyName)}`,
          )
        ).find((s: any) => s.driverName === driver.fullName);
        assert.equal(filtered.netPayable, 0);
      },
    );

    await t.test(
      "vehicle costs split fuel, maintenance and other expenses without changing totals",
      async () => {
        const year = 2029,
          month = 4;
        const baseExpense = {
          date: "2029-04-10",
          vehicleNumber: vehicle.plateNumber,
          category: "Expense description",
        };
        await good("/accounting/expenses", "ACCOUNTANT", {
          ...baseExpense,
          expenseType: "FUEL",
          amount: 130.25,
        });
        await good("/accounting/expenses", "ACCOUNTANT", {
          ...baseExpense,
          expenseType: "MAINTENANCE",
          amount: 200,
        });
        await good("/accounting/expenses", "ACCOUNTANT", {
          ...baseExpense,
          expenseType: "OTHER",
          amount: 50,
        });
        const legacy = await good("/accounting/expenses", "ACCOUNTANT", {
          ...baseExpense,
          category: "سولار ووقود",
          amount: 30,
        });
        assert.equal(legacy.expenseType, "FUEL");
        assert.equal(legacy.branch, null);
        await good("/accounting/expenses", "ACCOUNTANT", {
          ...baseExpense,
          expenseType: "FUEL",
          amount: 700,
          date: "2029-05-10",
        });
        assert.equal(
          (
            await call("/accounting/expenses", "ACCOUNTANT", {
              ...baseExpense,
              expenseType: "INVALID",
              amount: 10,
            })
          ).status,
          422,
        );
        await db.maintenanceRecord.create({
          data: {
            vehicleId: vehicle.id,
            maintenanceType: "MECHANICAL_REPAIR",
            serviceDate: new Date("2029-04-12"),
            cost: 75,
            mileageAtService: 100,
            description: "Maintenance test",
          },
        });
        const ledger = await good(
          `/accounting/vehicles-ledger?year=${year}&month=${month}&vehiclePlate=${encodeURIComponent(vehicle.plateNumber)}`,
        );
        assert.equal(ledger.items.length, 1);
        const item = ledger.items[0];
        assert.equal(item.fuelCosts, 160.25);
        assert.equal(item.maintenanceCosts, 275);
        assert.equal(item.otherExpenses, 50);
        assert.equal(item.totalExpenses, 485.25);
        assert.equal(item.netCashFlow, -485.25);
        assert.equal(ledger.summary.totalFuel, 160.25);
        assert.equal(ledger.summary.totalMaintenance, 275);
        assert.equal(ledger.summary.totalOtherExpenses, 50);
        assert.equal(ledger.summary.totalExpenses, 485.25);
      },
    );
    await t.test(
      "daily template exclusions save optional notes without creating or cancelling trips",
      async () => {
        const date = "2029-06-12";
        const baseRun = {
          date,
          clientId: client.id,
          shift: "MORNING",
          tripStatus: "SCHEDULED",
        };
        const excluded = await good(
          "/trips/generate-daily-from-templates",
          "OPERATIONS_MANAGER",
          {
            ...baseRun,
            routeOverrides: [
              {
                routeId: route.id,
                selected: false,
                exclusionNote: "  العميل ألغى التشغيل اليوم  ",
              },
            ],
          },
        );
        assert.equal(excluded.generatedCount, 0);
        assert.equal(excluded.excludedCount, 1);
        assert.equal(
          excluded.excludedDetails[0].note,
          "العميل ألغى التشغيل اليوم",
        );
        assert.equal(
          await db.trip.count({
            where: { routeId: route.id, tripDate: new Date(date) },
          }),
          0,
        );
        let history = await good(
          `/trips/template-exclusions?date=${date}`,
          "OPERATIONS_MANAGER",
        );
        assert.ok(
          history.some(
            (row: any) =>
              row.routeId === route.id &&
              row.note === "العميل ألغى التشغيل اليوم",
          ),
        );
        const noReason = await good(
          "/trips/generate-daily-from-templates",
          "OPERATIONS_MANAGER",
          {
            ...baseRun,
            routeOverrides: [{ routeId: route.id, selected: false }],
          },
        );
        assert.equal(noReason.excludedDetails[0].note, "");
        const countBefore = (
          await good(`/trips/template-exclusions?date=${date}`)
        ).filter((row: any) => row.routeId === route.id).length;
        const resumed = await good(
          "/trips/generate-daily-from-templates",
          "OPERATIONS_MANAGER",
          {
            ...baseRun,
            routeOverrides: [
              {
                routeId: route.id,
                selected: true,
                billingTypeId: types[0].id,
                exclusionNote: "Stale reason",
              },
            ],
          },
        );
        assert.equal(resumed.generatedCount, 1, JSON.stringify(resumed));
        history = await good(`/trips/template-exclusions?date=${date}`);
        assert.equal(
          history.filter((row: any) => row.routeId === route.id).length,
          countBefore,
        );
        assert.ok(!history.some((row: any) => row.note === "Stale reason"));
        await good(
          "/trips/generate-daily-from-templates",
          "OPERATIONS_MANAGER",
          {
            ...baseRun,
            routeOverrides: [{ routeId: route.id, selected: false }],
          },
        );
        assert.equal(
          (
            await db.trip.findFirstOrThrow({
              where: { routeId: route.id, tripDate: new Date(date) },
            })
          ).tripStatus,
          "SCHEDULED",
        );
        assert.equal(
          (
            await call(
              "/trips/generate-daily-from-templates",
              "OPERATIONS_MANAGER",
              {
                ...baseRun,
                routeOverrides: [
                  {
                    routeId: route.id,
                    selected: false,
                    exclusionNote: "x".repeat(2001),
                  },
                ],
              },
            )
          ).status,
          422,
        );
      },
    );
    await t.test(
      "regular users are restricted to multiple assigned companies across reads and vehicle edits",
      async () => {
        const { id: ignoredClientId, ...clientData } = client;
        const second = await db.client.create({
          data: { ...clientData, companyName: "Second " + suffix },
        });
        const foreign = await db.client.create({
          data: { ...clientData, companyName: "Hidden " + suffix },
        });
        const { id: ignoredRouteId, ...routeData } = route;
        const secondRoute = await db.route.create({
          data: {
            ...routeData,
            clientId: second.id,
            routeName: "Second route " + suffix,
          },
        });
        const foreignRoute = await db.route.create({
          data: {
            ...routeData,
            clientId: foreign.id,
            routeName: "Hidden route " + suffix,
          },
        });
        const { id: ignoredVehicleId, ...vehicleData } = vehicle;
        const foreignVehicle = await db.vehicle.create({
          data: { ...vehicleData, plateNumber: "HIDDEN-" + suffix },
        });
        await db.route.update({
          where: { id: foreignRoute.id },
          data: { defaultVehicleId: foreignVehicle.id },
        });
        const sourceTrip = await db.trip.findUniqueOrThrow({
          where: { id: trips[0].id },
        });
        const { id: ignoredTripId, ...tripData } = sourceTrip;
        const foreignTrip = await db.trip.create({
          data: {
            ...tripData,
            clientId: foreign.id,
            routeId: foreignRoute.id,
            tripNumber: "HIDDEN-" + suffix,
            tripStatus: "SCHEDULED",
          },
        });
        const email = `scoped-${suffix}@test.local`;
        const newUser = await good("/users", "ACCOUNTANT", {
          email,
          password,
          fullName: "Scoped regular",
          role: "VIEWER",
          companyIds: [client.id, second.id],
        });
        assert.equal(newUser.companyScopeEnabled, true);
        assert.deepEqual(newUser.companyIds, [client.id, second.id]);
        tokens.SCOPED = (
          await good("/auth/login", "ADMIN", { email, password })
        ).accessToken;
        assert.deepEqual(
          (await good("/clients", "SCOPED")).map((c: any) => c.id).sort(),
          [client.id, second.id].sort(),
        );
        const visibleRoutes = await good("/routes", "SCOPED");
        assert.ok(visibleRoutes.some((r: any) => r.id === secondRoute.id));
        assert.ok(
          visibleRoutes.every((r: any) =>
            [client.id, second.id].includes(r.clientId),
          ),
        );
        assert.equal(
          (await good(`/routes?clientId=${foreign.id}`, "SCOPED")).length,
          0,
        );
        assert.ok(
          (await good("/trips", "SCOPED")).every((trip: any) =>
            [client.id, second.id].includes(trip.clientId),
          ),
        );
        for (const path of [
          `/clients/${foreign.id}`,
          `/routes/${foreignRoute.id}`,
          `/trips/${foreignTrip.id}`,
          `/vehicles/${foreignVehicle.id}`,
          `/operations/trips/${foreignTrip.id}`,
        ]) {
          const response = await call(path, "SCOPED");
          assert.ok(
            [403, 404].includes(response.status),
            path + JSON.stringify(response),
          );
        }
        const bootstrap = await good("/operations/bootstrap", "SCOPED");
        assert.equal(bootstrap.clients.length, 2);
        assert.ok(
          !bootstrap.vehicles.some((v: any) => v.id === foreignVehicle.id),
        );
        const vehicleDetails = await good(`/vehicles/${vehicle.id}`, "SCOPED");
        assert.ok(
          !vehicleDetails.trips.some((t: any) => t.id === foreignTrip.id),
        );
        const scopedVehicles = await good("/vehicles", "SCOPED");
        assert.equal(
          scopedVehicles.find((v: any) => v.id === vehicle.id)._count.trips,
          await db.trip.count({
            where: {
              vehicleId: vehicle.id,
              clientId: { in: [client.id, second.id] },
            },
          }),
        );
        assert.equal(
          (await good("/dashboard/kpis", "SCOPED")).clients.active,
          2,
        );
        await good("/dashboard/trends", "SCOPED");
        await good("/dashboard/notifications", "SCOPED");
        await good("/dashboard/reports/vehicle-utilization", "SCOPED");
        await good("/dashboard/reports/driver-performance", "SCOPED");
        await good("/operations/summary", "SCOPED");
        for (const resource of [
          "sites",
          "passengers",
          "enrollments",
          "plans",
          "partners",
        ])
          await good(`/operations/records/${resource}`, "SCOPED");
        await good(
          `/vehicles/${vehicle.id}`,
          "SCOPED",
          { currentMileage: 111 },
          "PUT",
        );
        assert.equal(
          (
            await call(
              `/vehicles/${foreignVehicle.id}`,
              "SCOPED",
              { currentMileage: 222 },
              "PUT",
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await db.vehicle.findUniqueOrThrow({
              where: { id: foreignVehicle.id },
            })
          ).currentMileage,
          0,
        );
        assert.equal(
          (
            await call(
              `/users/${newUser.id}/companies`,
              "SCOPED",
              { companyIds: [foreign.id] },
              "PATCH",
            )
          ).status,
          403,
        );
        assert.equal(
          (await call("/accounting/dashboard", "SCOPED")).status,
          403,
        );
        assert.equal(
          (
            await call("/users", "ADMIN", {
              email: "empty-" + email,
              password,
              fullName: "No companies",
              role: "VIEWER",
              companyIds: [],
            })
          ).status,
          422,
        );
        assert.equal(
          (
            await call(
              `/users/${newUser.id}/companies`,
              "ADMIN",
              { companyIds: [randomUUID()] },
              "PATCH",
            )
          ).status,
          422,
        );
        const concurrent = await Promise.all([
          good("/clients", "SCOPED"),
          good("/clients", "ADMIN"),
          good("/clients", "SCOPED"),
        ]);
        assert.equal(concurrent[0].length, 2);
        assert.ok(concurrent[1].some((c: any) => c.id === foreign.id));
        assert.equal(concurrent[2].length, 2);
        await good(
          `/users/${newUser.id}/companies`,
          "ACCOUNTANT",
          { companyIds: [second.id] },
          "PATCH",
        );
        assert.equal((await call("/clients", "SCOPED")).status, 401);
        tokens.SCOPED = (
          await good("/auth/login", "ADMIN", { email, password })
        ).accessToken;
        assert.deepEqual(
          (await good("/clients", "SCOPED")).map((c: any) => c.id),
          [second.id],
        );
        await db.user.update({
          where: { id: newUser.id },
          data: { companyIds: [] },
        });
        assert.equal((await good("/clients", "SCOPED")).length, 0);
        assert.equal((await good("/vehicles", "SCOPED")).length, 0);
        assert.equal(
          (await good("/dashboard/kpis", "SCOPED")).clients.active,
          0,
        );
      },
    );
    await t.test(
      "activity logs identify actors, preserve before/after and redact credentials",
      async () => {
        const before = await db.vehicle.findUniqueOrThrow({
          where: { id: vehicle.id },
        });
        await good(
          `/vehicles/${vehicle.id}`,
          "VIEWER",
          { currentMileage: 456 },
          "PUT",
        );
        const edit = await db.activityLog.findFirstOrThrow({
          where: {
            path: `/vehicles/${vehicle.id}`,
            method: "PUT",
            outcome: "SUCCESS",
          },
          orderBy: { createdAt: "desc" },
        });
        assert.equal(edit.actorName, "VIEWER");
        assert.equal(edit.actorEmail, `viewer-${suffix}@test.local`);
        assert.equal(edit.action, "UPDATE");
        assert.equal(
          JSON.parse(edit.detail).before.currentMileage,
          before.currentMileage,
        );
        assert.equal(JSON.parse(edit.detail).after.currentMileage, 456);
        const denied = await call("/users", "VIEWER");
        assert.equal(denied.status, 403);
        const failure = await db.activityLog.findFirstOrThrow({
          where: { actorId: edit.actorId, path: "/users", outcome: "FAILED" },
          orderBy: { createdAt: "desc" },
        });
        assert.equal(failure.statusCode, 403);
        assert.ok(JSON.parse(failure.detail).error);
        const secret = "DoNotPersistThisPassword123!";
        const email = `audit-${suffix}@test.local`;
        const created = await good("/users", "ADMIN", {
          email,
          fullName: "Audit user " + suffix,
          password: secret,
          role: "ACCOUNTANT",
        });
        const creation = await db.activityLog.findFirstOrThrow({
          where: { path: "/users", entityId: created.id, action: "CREATE" },
        });
        assert.equal(creation.actorName, "ADMIN");
        assert.ok(!creation.detail.includes(secret));
        const logged = await good("/auth/login", "ADMIN", {
          email,
          password: secret,
        });
        const loginEvent = await db.activityLog.findFirstOrThrow({
          where: { actorId: created.id, action: "LOGIN", outcome: "SUCCESS" },
          orderBy: { createdAt: "desc" },
        });
        assert.equal(loginEvent.actorName, "Audit user " + suffix);
        assert.ok(!loginEvent.detail.includes(logged.accessToken));
        assert.ok(!loginEvent.detail.includes(secret));
        assert.ok(!loginEvent.detail.includes("password"));
        await good(
          `/users/${created.id}/status`,
          "ADMIN",
          { status: "INACTIVE" },
          "PATCH",
        );
        const userChange = await db.activityLog.findFirstOrThrow({
          where: { entityId: created.id, action: "STATUS" },
          orderBy: { createdAt: "desc" },
        });
        assert.ok(!userChange.detail.includes("passwordHash"));
        assert.equal(JSON.parse(userChange.detail).before.status, "ACTIVE");
        assert.equal(JSON.parse(userChange.detail).after.status, "INACTIVE");
        const failedLogin = await call("/auth/login", "ADMIN", {
          email,
          password: secret,
        });
        assert.equal(failedLogin.status, 401);
        const failureLogin = await db.activityLog.findFirstOrThrow({
          where: { actorEmail: email, action: "LOGIN", outcome: "FAILED" },
          orderBy: { createdAt: "desc" },
        });
        assert.ok(!failureLogin.detail.includes(secret));
        const expense = await good("/accounting/expenses", "ACCOUNTANT", {
          date: "2029-07-01",
          amount: 12,
          category: "Audit expense " + suffix,
          expenseType: "OTHER",
        });
        await good(
          `/accounting/expenses/${expense.id}`,
          "ACCOUNTANT",
          undefined,
          "DELETE",
        );
        const removal = await db.activityLog.findFirstOrThrow({
          where: { entityId: expense.id, action: "DELETE", outcome: "SUCCESS" },
        });
        assert.equal(
          JSON.parse(removal.detail).before.category,
          "Audit expense " + suffix,
        );
        assert.equal(removal.actorName, "ACCOUNTANT");
        const filtered = await good(
          `/operations/audit?action=UPDATE&actorId=${edit.actorId}&search=${vehicle.id}&pageSize=1`,
        );
        assert.ok(filtered.total >= 1);
        assert.equal(filtered.rows.length, 1);
        assert.equal(filtered.rows[0].actorId, edit.actorId);
        assert.equal(filtered.rows[0].detail.after.currentMileage, 456);
        assert.ok(filtered.people.some((p: any) => p.actorId === edit.actorId));
        const details = await good("/operations/audit?search=" + suffix);
        assert.ok(
          details.rows.every(
            (row: any) => !JSON.stringify(row.detail).includes(secret),
          ),
        );
        for (const role of ["VIEWER", "OPERATIONS_MANAGER", "SCOPED"])
          assert.equal((await call("/operations/audit", role)).status, 403);
        assert.equal(
          (
            await fetch(base + "/operations/audit", {
              method: "DELETE",
              headers: { Authorization: `Bearer ${tokens.ADMIN}` },
            })
          ).status,
          404,
        );
        assert.ok(await db.activityLog.findUnique({ where: { id: edit.id } }));
        const csv = await fetch(
          base + "/accounting/export/operations?year=2029",
          { headers: { Authorization: `Bearer ${tokens.ADMIN}` } },
        );
        assert.equal(csv.status, 200);
        await csv.arrayBuffer();
        assert.ok(
          await db.activityLog.findFirst({
            where: {
              action: "EXPORT",
              outcome: "SUCCESS",
              path: "/accounting/export/operations",
            },
          }),
        );
      },
    );

    await t.test(
      "dual vehicle installments keep driver receivables, wage offsets and bank cash separate",
      async () => {
        const date = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Cairo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        const year = Number(date.slice(0, 4)),
          month = Number(date.slice(5, 7));
        const d = await db.driver.create({
          data: {
            fullName: "Installment driver " + suffix,
            phoneNumber: "TEST",
            nationalId: "INST-" + suffix,
            licenseNumber: "INST-" + suffix,
            licenseExpirationDate: new Date("2035-01-01"),
          },
        });
        await db.dailyOperation.create({
          data: {
            driverName: d.fullName,
            companyName: client.companyName,
            routeName: route.routeName,
            date: new Date(date),
            day: Number(date.slice(8)),
            month,
            year,
            dailyRate: 2000,
            tripCount: 1,
            driverDailyRate: 1000,
            totalAmount: 2000,
            netDriverPay: 1000,
            dailyProfit: 1000,
            netRevenue: 1000,
          },
        });
        const account = await good(
          "/accounting/treasury/accounts",
          "ADMIN",
          {
            name: "Installment bank " + suffix,
            kind: "BANK",
            openingBalance: 1000,
            openingDate: "2020-01-01",
          },
        );
        const input = {
          category: "VEHICLE",
          assetName: "Dual installment " + suffix,
          vehiclePlate: vehicle.plateNumber,
          installmentNumber: 1,
          bankName: "Test bank",
          bankDueDate: date,
          bankAmount: 1200,
          driverId: d.id,
          driverDueDate: date,
          driverAmount: 1500,
        };
        const balance = async () =>
          (await good("/accounting/treasury")).accounts.find(
            (a: any) => a.id === account.id,
          ).currentBalance;
        const wages = async () =>
          (
            await good(`/accounting/settlements?year=${year}&month=${month}`)
          ).find((r: any) => r.driverName === d.fullName);
        for (const role of ["VIEWER", "OPERATIONS_MANAGER"])
          assert.equal(
            (await call("/accounting/installments", role, input)).status,
            403,
          );
        assert.equal(
          (
            await call("/accounting/installments", "ACCOUNTANT", {
              ...input,
              driverId: undefined,
            })
          ).status,
          422,
        );
        assert.equal(
          (
            await call("/accounting/installments", "ACCOUNTANT", {
              ...input,
              bankAmount: -1,
            })
          ).status,
          422,
        );
        assert.equal(
          (
            await call("/accounting/installments", "ACCOUNTANT", {
              ...input,
              status: "PAID",
            })
          ).status,
          422,
        );
        const pnlBefore = await good(
          `/accounting/income-statement?year=${year}&month=${month}`,
        );
        const inst = await good(
          "/accounting/installments",
          "ACCOUNTANT",
          input,
        );
        assert.equal(await balance(), 1000);
        assert.equal(inst.bankRemaining, 1200);
        assert.equal(inst.driverRemaining, 1500);
        assert.equal((await wages()).netPayable, 1000);
        assert.equal((await wages()).driverInstallmentRemaining, 1500);
        const payPath = `/accounting/installments/${inst.id}/pay`,
          collectPath = `/accounting/installments/${inst.id}/collect`;
        const payment = {
          amount: 400,
          date,
          accountId: account.id,
          requestKey: randomUUID(),
        };
        for (const role of ["VIEWER", "OPERATIONS_MANAGER"])
          assert.equal((await call(payPath, role, payment)).status, 403);
        assert.equal(
          (await call(payPath, "ACCOUNTANT", { ...payment, amount: 1100 }))
            .status,
          409,
        );
        assert.equal(await balance(), 1000);
        const receipt = {
          amount: 300,
          date,
          method: "CASH",
          accountId: account.id,
          requestKey: randomUUID(),
        };
        const receiptResult = await good(collectPath, "ACCOUNTANT", receipt);
        assert.equal(receiptResult.installment.driverRemaining, 1200);
        assert.equal(receiptResult.installment.bankRemaining, 1200);
        assert.equal(
          (await good(collectPath, "ACCOUNTANT", receipt)).payment.id,
          receiptResult.payment.id,
        );
        assert.equal(await balance(), 1300);
        assert.equal((await wages()).netPayable, 1000);
        assert.equal(
          (await call(collectPath, "ACCOUNTANT", { ...receipt, amount: 301 }))
            .status,
          409,
        );
        const first = await good(payPath, "ACCOUNTANT", payment);
        assert.equal(first.installment.bankStatus, "PARTIAL");
        assert.equal(first.installment.bankRemaining, 800);
        assert.equal(first.installment.driverRemaining, 1200);
        assert.equal(await balance(), 900);
        assert.equal(
          (await good(payPath, "ACCOUNTANT", payment)).payment.id,
          first.payment.id,
        );
        const offset = await good(collectPath, "ACCOUNTANT", {
          amount: 200,
          date,
          month,
          year,
          method: "OFFSET",
          requestKey: randomUUID(),
        });
        assert.equal(offset.installment.driverRemaining, 1000);
        assert.equal(await balance(), 900);
        assert.equal((await wages()).netPayable, 800);
        assert.equal((await wages()).totalDeductions, 0);
        assert.equal((await wages()).totalInstallmentOffsets, 200);
        assert.equal((await wages()).netEarned, 1000);
        assert.equal(
          (
            await call(collectPath, "ACCOUNTANT", {
              amount: 900,
              date,
              month,
              year,
              method: "OFFSET",
              requestKey: randomUUID(),
            })
          ).status,
          422,
        );
        const races = await Promise.all(
          [1, 2].map(() =>
            call(collectPath, "ACCOUNTANT", {
              amount: 700,
              date,
              method: "CASH",
              accountId: account.id,
              requestKey: randomUUID(),
            }),
          ),
        );
        assert.deepEqual(races.map((r) => r.status).sort(), [200, 422]);
        await good(collectPath, "ACCOUNTANT", {
          amount: 300,
          date,
          month,
          year,
          method: "OFFSET",
          requestKey: randomUUID(),
        });
        assert.equal((await wages()).netPayable, 500);
        assert.equal((await wages()).driverInstallmentRemaining, 0);
        assert.equal(
          (
            await call(collectPath, "ACCOUNTANT", {
              ...receipt,
              amount: 1,
              requestKey: randomUUID(),
            })
          ).status,
          422,
        );
        const last = await good(payPath, "ACCOUNTANT", {
          ...payment,
          amount: 800,
          requestKey: randomUUID(),
        });
        assert.equal(last.installment.bankStatus, "PAID");
        assert.equal(last.installment.driverStatus, "PAID");
        assert.equal(last.installment.driverCash, 1000);
        assert.equal(last.installment.driverOffset, 500);
        assert.equal(await balance(), 800);
        const statement = await good(
          `/accounting/treasury/accounts/${account.id}/statement`,
        );
        assert.equal(statement.finalBalance, 800);
        assert.equal(
          statement.statement
            .filter((r: any) => r.kind === "OUT")
            .reduce((s: number, r: any) => s + r.amount, 0),
          1200,
        );
        const totals = await good(
          "/accounting/installments/summary?vehiclePlate=" +
            encodeURIComponent(vehicle.plateNumber),
        );
        assert.equal(totals.totalDriverCash, 1000);
        assert.equal(totals.totalDriverOffset, 500);
        assert.equal(totals.totalDriverPending, 0);
        const ledger = await good(
          `/accounting/vehicle-economics?year=${year}&month=${month}&vehiclePlate=${encodeURIComponent(vehicle.plateNumber)}`,
        );
        assert.equal(ledger.items[0].totalInstallmentsPaid, 1200);
        assert.equal(ledger.items[0].driverInstallmentCash, 1000);
        const pnl = await good(
          `/accounting/income-statement?year=${year}&month=${month}`,
        );
        assert.equal(
          pnl.installmentCashFlow.bankPaid -
            pnlBefore.installmentCashFlow.bankPaid,
          1200,
        );
        assert.equal(
          pnl.installmentCashFlow.driverCollected -
            pnlBefore.installmentCashFlow.driverCollected,
          1000,
        );
        assert.equal(
          pnl.installmentCashFlow.driverOffsets -
            pnlBefore.installmentCashFlow.driverOffsets,
          500,
        );
        assert.equal(
          pnl.directCosts.driverPayAndOvertime,
          pnlBefore.directCosts.driverPayAndOvertime,
        );

        const audit = await db.activityLog.findFirst({
          where: {
            path: `/accounting/installments/${inst.id}/collect`,
            outcome: "SUCCESS",
          },
        });
        assert.equal(audit?.actorName, "ACCOUNTANT");
        // Attempts in a closed transaction period and future cash dates cannot post any money.
        const nextInst = await good("/accounting/installments", "ACCOUNTANT", {
          ...input,
          installmentNumber: 2,
          bankDueDate: "2020-02-01",
          driverDueDate: "2020-02-01",
        });
        assert.equal(
          (
            await call(
              `/accounting/installments/${nextInst.id}/pay`,
              "ACCOUNTANT",
              { ...payment, date: "2099-01-01", requestKey: randomUUID() },
            )
          ).status,
          422,
        );
        const previousPeriod = await db.financialPeriod.findUnique({
          where: { year_month: { year: 2020, month: 2 } },
        });
        await db.financialPeriod.upsert({
          where: { year_month: { year: 2020, month: 2 } },
          create: { year: 2020, month: 2, status: "CLOSED" },
          update: { status: "CLOSED" },
        });
        try {
          assert.equal(
            (
              await call(
                `/accounting/installments/${nextInst.id}/pay`,
                "ACCOUNTANT",
                { ...payment, date: "2020-02-02", requestKey: randomUUID() },
              )
            ).status,
            409,
          );
        } finally {
          if (previousPeriod)
            await db.financialPeriod.update({
              where: { id: previousPeriod.id },
              data: { status: previousPeriod.status },
            });
          else
            await db.financialPeriod.delete({
              where: { year_month: { year: 2020, month: 2 } },
            });
        }
        assert.equal(await balance(), 800);
        assert.equal(
          await db.installmentPayment.count({
            where: { installmentId: nextInst.id },
          }),
          0,
        );
        // An older due installment paid now belongs to the current cash reporting period.
        await good(
          `/accounting/installments/${nextInst.id}/pay`,
          "ACCOUNTANT",
          { ...payment, amount: 100, requestKey: randomUUID() },
        );
        const updatedLedger = await good(
          `/accounting/vehicle-economics?year=${year}&month=${month}&vehiclePlate=${encodeURIComponent(vehicle.plateNumber)}`,
        );
        assert.equal(updatedLedger.items[0].totalInstallmentsPaid, 1300);
        const updatedPnl = await good(
          `/accounting/income-statement?year=${year}&month=${month}`,
        );
        assert.equal(
          updatedPnl.installmentCashFlow.bankPaid -
            pnlBefore.installmentCashFlow.bankPaid,
          1300,
        );
        assert.equal(await balance(), 700);
      },
    );
    await t.test(
      "custom roles enforce granular permissions, live revocation and audit history",
      async () => {
        const catalog = await good("/roles");
        const expand = (keys: string[]) => {
          const set = new Set<string>();
          const add = (k: string) => {
            if (set.has(k)) return;
            set.add(k);
            (catalog.dependencies[k] || []).forEach(add);
          };
          keys.forEach(add);
          return [...set];
        };
        const role = await good("/roles", "ADMIN", {
          name: "Fleet " + suffix,
          permissions: expand(["vehicles.editType"]),
        });
        const email = "custom-" + suffix + "@test.local";
        const user = await good("/users", "ADMIN", {
          email,
          password,
          fullName: "Custom fleet user",
          roleId: role.id,
        });
        const login = await good("/auth/login", "ADMIN", { email, password });
        tokens.CUSTOM = login.accessToken;
        assert.equal(login.user.roleName, role.name);
        assert.equal(login.user.companyScopeEnabled, false);
        await good("/vehicles", "CUSTOM");
        await good(
          "/vehicles/" + vehicle.id,
          "CUSTOM",
          { vehicleType: "SEDAN" },
          "PUT",
        );
        assert.equal(
          (
            await call(
              "/vehicles/" + vehicle.id,
              "CUSTOM",
              { capacity: 44 },
              "PUT",
            )
          ).status,
          403,
        );
        assert.equal((await call("/vehicles", "CUSTOM", {})).status, 403);
        assert.equal((await call("/clients", "CUSTOM")).status, 403);
        assert.equal(
          (await call("/accounting/overview", "CUSTOM")).status,
          403,
        );
        assert.equal(
          (await good("/operations/bootstrap", "CUSTOM")).clients.length,
          0,
        );
        const updated = await good(
          "/roles/" + role.id,
          "ADMIN",
          { ...role, permissions: expand(["vehicles.edit"]) },
          "PUT",
        );
        await good(
          "/vehicles/" + vehicle.id,
          "CUSTOM",
          { capacity: 31 },
          "PUT",
        );
        assert.equal(
          (
            await call(
              "/roles/" + role.id,
              "ADMIN",
              { ...role, permissions: role.permissions },
              "PUT",
            )
          ).status,
          409,
        );
        await good(
          "/roles/" + role.id,
          "ADMIN",
          { ...updated, permissions: [] },
          "PUT",
        );
        assert.equal((await call("/vehicles", "CUSTOM")).status, 403);
        assert.deepEqual((await good("/auth/me", "CUSTOM")).permissions, []);
        assert.equal(
          (
            await call("/roles", "ADMIN", {
              name: "Invalid " + suffix,
              permissions: ["root.all"],
            })
          ).status,
          422,
        );
        assert.equal(
          (
            await call("/roles", "ADMIN", {
              name: "Missing dependency " + suffix,
              permissions: ["trips.create"],
            })
          ).status,
          422,
        );
        await new Promise((r) => setTimeout(r, 80));
        const event = await db.activityLog.findFirst({
          where: {
            entity: "roles",
            entityId: role.id,
            action: "UPDATE",
            outcome: "SUCCESS",
          },
          orderBy: { createdAt: "desc" },
        });
        assert.ok(event?.actorId);
        assert.ok(JSON.parse(event!.detail).before);
      },
    );

    await t.test(
      "editable default roles affect existing users and cannot be escalated through user assignment",
      async () => {
        const { roles, dependencies } = await good("/roles");
        const viewer = roles.find((r: any) => r.code === "VIEWER");
        try {
          const changed = await good(
            "/roles/" + viewer.id,
            "ADMIN",
            {
              ...viewer,
              permissions: viewer.permissions.filter(
                (p: string) => p !== "vehicles.edit",
              ),
            },
            "PUT",
          );
          assert.equal(
            (
              await call(
                "/vehicles/" + vehicle.id,
                "VIEWER",
                { capacity: 30 },
                "PUT",
              )
            ).status,
            403,
          );
          await good(
            "/roles/" + viewer.id,
            "ADMIN",
            { ...viewer, revision: changed.revision },
            "PUT",
          );
          await good(
            "/vehicles/" + vehicle.id,
            "VIEWER",
            { capacity: 30 },
            "PUT",
          );
        } finally {
          await db.appRole.update({
            where: { id: viewer.id },
            data: {
              permissions: viewer.permissions,
              revision: { increment: 1 },
            },
          });
        }
        const permissions = [
          "users.manage",
          "users.view",
          "clients.view",
          "roles.manage",
        ];
        const limited = await good("/roles", "ADMIN", {
          name: "User manager " + suffix,
          permissions,
        });
        const email = "user-manager-" + suffix + "@test.local";
        const user = await good("/users", "ADMIN", {
          email,
          password,
          fullName: "User manager",
          roleId: limited.id,
        });
        tokens.MANAGER = (
          await good("/auth/login", "ADMIN", { email, password })
        ).accessToken;
        assert.equal(
          (
            await call("/roles", "MANAGER", {
              name: "Escalation " + suffix,
              permissions: ["finance.view"],
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call("/users", "MANAGER", {
              email: "escalation-" + suffix + "@test.local",
              password,
              fullName: "Escalation",
              roleId: "ADMIN",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              "/users/" + user.id + "/role",
              "MANAGER",
              { roleId: "ADMIN" },
              "PATCH",
            )
          ).status,
          403,
        );
        const adminUser = await db.user.findFirstOrThrow({
          where: { email: "admin-" + suffix + "@test.local" },
        });
        assert.equal(
          (
            await call(
              "/users/" + adminUser.id + "/role",
              "MANAGER",
              { roleId: limited.id },
              "PATCH",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await call("/operations/users/scope", "MANAGER", {
              userId: adminUser.id,
              role: "VIEWER",
              companyIds: [client.id],
            })
          ).status,
          403,
        );
        const options = await good("/roles/options", "MANAGER");
        assert.ok(!options.some((r: any) => r.code === "ADMIN"));
      },
    );

    await t.test(
      "custom dispatch roles retain assigned-company boundaries while allowing authorized trip writes",
      async () => {
        const catalog = await good("/roles");
        const set = new Set<string>();
        const add = (k: string) => {
          if (set.has(k)) return;
          set.add(k);
          (catalog.dependencies[k] || []).forEach(add);
        };
        ["trips.create", "trips.edit"].forEach(add);
        const role = await good("/roles", "ADMIN", {
          name: "Scoped dispatch " + suffix,
          permissions: [...set],
        });
        const email = "scoped-dispatch-" + suffix + "@test.local";
        const user = await good("/users", "ADMIN", {
          email,
          password,
          fullName: "Scoped dispatcher",
          roleId: role.id,
        });
        tokens.SCOPED_CUSTOM = (
          await good("/auth/login", "ADMIN", { email, password })
        ).accessToken;
        await good(
          "/users/" + user.id + "/role",
          "ADMIN",
          {
            roleId: role.id,
            companyScopeEnabled: true,
            companyIds: [client.id],
          },
          "PATCH",
        );
        assert.equal((await call("/auth/me", "SCOPED_CUSTOM")).status, 401);
        tokens.SCOPED_CUSTOM = (
          await good("/auth/login", "ADMIN", { email, password })
        ).accessToken;
        const foreign = await db.client.create({
          data: {
            companyName: "Foreign " + suffix,
            contactPerson: "Other",
            phone: "DEMO",
            email: "other@example.invalid",
            address: "Cairo",
          },
        });
        assert.equal((await good("/clients", "SCOPED_CUSTOM")).length, 1);
        const data = {
          clientId: client.id,
          routeId: route.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          billingTypeId: "10000000-0000-4000-a000-000000000001",
          direction: "OUTBOUND",
          tripDate: "2027-12-20",
          shift: "MORNING",
          scheduledDeparture: "2027-12-20T07:00",
          expectedArrival: "2027-12-20T08:00",
        };
        const trip = await good("/trips", "SCOPED_CUSTOM", data);
        assert.equal(trip.saleAmount, undefined);
        assert.ok(
          (
            await call("/trips", "SCOPED_CUSTOM", {
              ...data,
              clientId: foreign.id,
              tripDate: "2027-12-21",
            })
          ).status >= 400,
        );
        assert.ok(
          (
            await call(
              "/trips/" + trip.id,
              "SCOPED_CUSTOM",
              { clientId: foreign.id },
              "PUT",
            )
          ).status >= 400,
        );
        await good(
          "/trips/" + trip.id,
          "SCOPED_CUSTOM",
          { notes: "Authorized scoped edit" },
          "PUT",
        );
        await good(
          "/trips/" + trip.id + "/status",
          "SCOPED_CUSTOM",
          { tripStatus: "IN_PROGRESS" },
          "PATCH",
        );
        await good(
          "/trips/" + trip.id + "/status",
          "SCOPED_CUSTOM",
          { tripStatus: "COMPLETED" },
          "PATCH",
        );
        assert.equal(
          (
            await call(
              "/trips/" + trip.id,
              "SCOPED_CUSTOM",
              undefined,
              "DELETE",
            )
          ).status,
          403,
        );
        assert.equal(
          (await call("/accounting/overview", "SCOPED_CUSTOM")).status,
          403,
        );
      },
    );

    await t.test(
      "read-only accounting is separate from posting and the last role administrator is protected",
      async () => {
        const catalog = await good("/roles");
        const set = new Set<string>();
        const add = (k: string) => {
          if (set.has(k)) return;
          set.add(k);
          (catalog.dependencies[k] || []).forEach(add);
        };
        add("accounting.view");
        const role = await good("/roles", "ADMIN", {
          name: "Account reviewer " + suffix,
          permissions: [...set],
        });
        const email = "reviewer-" + suffix + "@test.local";
        await good("/users", "ADMIN", {
          email,
          password,
          fullName: "Account reviewer",
          roleId: role.id,
        });
        tokens.REVIEW = (
          await good("/auth/login", "ADMIN", { email, password })
        ).accessToken;
        await good("/accounting/treasury/overview", "REVIEW");
        assert.equal(
          (await call("/accounting/expenses", "REVIEW", {})).status,
          403,
        );
        assert.equal(
          (await call("/operations/treasury/accounts", "REVIEW", {})).status,
          403,
        );
        const ownerRole = await good("/roles", "ADMIN", {
          name: "Protected owner " + suffix,
          permissions: catalog.catalog.map((p: any) => p.key),
        });
        const ownerEmail = "sole-admin-" + suffix + "@test.local";
        const owner = await good("/users", "ADMIN", {
          email: ownerEmail,
          password,
          fullName: "Sole administrator",
          roleId: ownerRole.id,
        });
        tokens.SOLE = (
          await good("/auth/login", "ADMIN", { email: ownerEmail, password })
        ).accessToken;
        const active = await db.user.findMany({
          where: { status: "ACTIVE", id: { not: owner.id } },
          select: { id: true },
        });
        try {
          await db.user.updateMany({
            where: { id: { in: active.map((u) => u.id) } },
            data: { status: "INACTIVE" },
          });
          assert.equal(
            (
              await call(
                "/roles/" + ownerRole.id,
                "SOLE",
                {
                  ...ownerRole,
                  permissions: ownerRole.permissions.filter(
                    (p: string) => p !== "roles.manage",
                  ),
                },
                "PUT",
              )
            ).status,
            409,
          );
          assert.equal(
            (
              await call(
                "/users/" + owner.id + "/role",
                "SOLE",
                { roleId: role.id, companyScopeEnabled: false },
                "PATCH",
              )
            ).status,
            409,
          );
          assert.equal(
            (
              await db.appRole.findUniqueOrThrow({
                where: { id: ownerRole.id },
              })
            ).revision,
            ownerRole.revision,
          );
        } finally {
          await db.user.updateMany({
            where: { id: { in: active.map((u) => u.id) } },
            data: { status: "ACTIVE" },
          });
        }
      },
    );
    await t.test("only the owner can read treasury balances, statements and treasury audit payloads", async () => {
      const account = await good('/accounting/treasury/accounts','ADMIN',{name:'Private treasury '+suffix,kind:'CASH',openingDate:'2020-01-01',openingBalance:98765.43});
      const owner = await good('/accounting/treasury/overview');
      assert.equal(owner.balancesVisible,true);
      assert.equal(owner.accounts.find((a:any)=>a.id===account.id).currentBalance,98765.43);
      const {catalog}=await good('/roles');
      const role=await good('/roles','ADMIN',{name:'Full permissions without ownership '+suffix,permissions:catalog.map((p:any)=>p.key)});
      const email='full-non-owner-'+suffix+'@test.local';
      await good('/users','ADMIN',{email,password,fullName:'Non owner',roleId:role.id});
      tokens.NONOWNER=(await good('/auth/login','ADMIN',{email,password})).accessToken;
      for(const actor of ['ACCOUNTANT','NONOWNER','REVIEW']) {
        for(const endpoint of ['/accounting/treasury','/accounting/treasury/overview']) {
          const data=await good(endpoint,actor);
          assert.equal(data.balancesVisible,false);
          assert.equal(data.totals,undefined);
          const picker=data.accounts.find((a:any)=>a.id===account.id);
          assert.deepEqual(Object.keys(picker).sort(),['currency','id','kind','name']);
          assert.equal(JSON.stringify(data).includes('98765'),false);
        }
        assert.equal((await call('/accounting/treasury/accounts/'+account.id+'/statement',actor)).status,403);
        assert.equal((await call('/accounting/treasury/accounts',actor,{name:'blocked',kind:'CASH'})).status,403);
        assert.equal((await call('/accounting/treasury/transfers',actor,{})).status,403);
      }
      await new Promise(r=>setTimeout(r,80));
      const ownerLog=await good('/operations/audit?search='+encodeURIComponent('Private treasury '+suffix));
      assert.ok(ownerLog.rows.some((r:any)=>r.path==='/accounting/treasury/accounts'));
      const accountantLog=await good('/operations/audit?search='+encodeURIComponent('Private treasury '+suffix),'ACCOUNTANT');
      assert.equal(accountantLog.total,0);
      assert.equal(JSON.stringify(accountantLog).includes('98765'),false);
    });
  } finally {
    server.kill("SIGTERM");
    await db.$disconnect();
  }
});
