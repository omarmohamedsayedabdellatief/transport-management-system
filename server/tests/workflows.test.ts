import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  zonedDeparture,
  dateOnly,
} from "../src/modules/operations/operations.logic.js";

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated database ending in _test.",
  );
const db = new PrismaClient({ datasourceUrl: url });
const port = Number(process.env.TEST_PORT || 5109),
  base = `http://127.0.0.1:${port}/api`;
let server: ChildProcess;
let output = "";
const tokens: Record<string, string> = {};
const f: any = {};
async function call(path: string, body?: any, role = "admin", method?: string) {
  const r = await fetch(base + path, {
    method: method || (!body ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      ...(tokens[role] ? { Authorization: "Bearer " + tokens[role] } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await r.json();
  return { status: r.status, ...json };
}
async function good(path: string, body?: any, role = "admin", method?: string) {
  const r = await call(path, body, role, method);
  assert.ok(r.status >= 200 && r.status < 300, `${path}: ${JSON.stringify(r)}`);
  return r.data;
}
const op = "/operations";
const day = "2026-10-05";
before(async () => {
  const tables = await db.$queryRawUnsafe<any[]>(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'",
  );
  // Guarded dedicated test database only. Never use the local application database.
  if (tables.length)
    await db.$executeRawUnsafe(
      "TRUNCATE " +
        tables
          .map((t) => '"' + t.tablename.replaceAll('"', '""') + '"')
          .join(",") +
        " CASCADE",
    );
  const hash = await bcrypt.hash("TestPassword123!", 4);
  for (const [name, role] of [
    ["admin", "ADMIN"],
    ["ops", "OPERATIONS_MANAGER"],
    ["viewer", "VIEWER"],
    ["accountant", "ACCOUNTANT"],
    ["driver", "DRIVER"],
    ["client", "CLIENT"],
    ["supplier", "SUPPLIER"],
  ] as const) {
    f[name] = await db.user.create({
      data: {
        email: `${name}@test.local`,
        fullName: name,
        passwordHash: hash,
        role,
      },
    });
  }
  f.clientRecord = await db.client.create({
    data: {
      companyName: "Factory test",
      contactPerson: "HR",
      phone: "010",
      email: "hr@test.local",
      address: "Cairo",
    },
  });
  f.otherClient = await db.client.create({
    data: {
      companyName: "Other client",
      contactPerson: "HR",
      phone: "010",
      email: "other@test.local",
      address: "Cairo",
    },
  });
  f.treasury = await db.treasuryAccount.create({ data: { name: "Test Bank", kind: "BANK", openingDate: new Date("2026-01-01") } });
  f.contract = await db.contract.create({
    data: {
      clientId: f.clientRecord.id,
      contractNumber: "TEST-CONTRACT",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2027-12-31"),
      pricingModel: "PER_TRIP",
      monthlyValue: 12000,
    },
  });
  f.vehicle = await db.vehicle.create({
    data: {
      plateNumber: "TEST-01",
      make: "Toyota",
      model: "Hiace",
      manufacturingYear: 2025,
      vehicleType: "VAN_14_SEATER",
      capacity: 2,
      insuranceExpiry: new Date("2030-01-01"),
      licenseExpiry: new Date("2030-01-01"),
      inspectionExpiry: new Date("2030-01-01"),
    },
  });
  f.small = await db.vehicle.create({
    data: {
      plateNumber: "TEST-02",
      make: "Toyota",
      model: "Sedan",
      manufacturingYear: 2025,
      vehicleType: "SEDAN",
      capacity: 1,
      insuranceExpiry: new Date("2030-01-01"),
      licenseExpiry: new Date("2030-01-01"),
      inspectionExpiry: new Date("2030-01-01"),
    },
  });
  f.driverRecord = await db.driver.create({
    data: {
      fullName: "Test Driver",
      phoneNumber: "010",
      nationalId: "TEST-ID",
      licenseNumber: "TEST-LIC",
      licenseExpirationDate: new Date("2030-01-01"),
      assignedVehicleId: f.vehicle.id,
    },
  });
  f.route = await db.route.create({
    data: {
      clientId: f.clientRecord.id,
      routeName: "Factory route",
      startLocation: "Station",
      finalDestination: "Factory",
      estimatedDistanceKm: 20,
      estimatedDurationMin: 60,
      stops: { create: { stopOrder: 1, stopName: "Station" } },
    },
  });
  server = spawn(process.execPath, ["dist/server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: url,
      PORT: String(port),
      NODE_ENV: "test",
      JWT_ACCESS_SECRET: "test-access-secret-with-32-characters",
      JWT_REFRESH_SECRET: "test-refresh-secret-with-32-characters",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout!.on("data", (s) => (output += s));
  server.stderr!.on("data", (s) => (output += s));
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/ready`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, output);
  for (const name of [
    "admin",
    "ops",
    "viewer",
    "accountant",
    "driver",
    "client",
    "supplier",
  ]) {
    const r = await good(
      "/auth/login",
      { email: `${name}@test.local`, password: "TestPassword123!" },
      "none",
    );
    tokens[name] = r.accessToken;
  }
});
after(async () => {
  server?.kill("SIGTERM");
  await db.$disconnect();
});

test("timezone and calendar validation", () => {
  assert.equal(
    zonedDeparture("2026-10-05", "06:00", "Africa/Cairo").toISOString(),
    "2026-10-05T03:00:00.000Z",
  );
  assert.throws(() => dateOnly("2026-02-30"));
  assert.throws(() => zonedDeparture("2026-04-24", "00:30", "Africa/Cairo"));
  assert.throws(() => zonedDeparture("2026-10-29", "23:30", "Africa/Cairo"));
});
test("end-to-end operations, access controls, and financial integrity", async (t) => {
  await t.test(
    "partners, passengers, import preview and scoped enrollments",
    async () => {
      f.employer = await good(op + "/records/partners", {
        name: "Staffing test",
        kind: "STAFFING",
        active: true,
      });
      f.supplierRecord = await good(op + "/records/partners", {
        name: "Transport test",
        kind: "TRANSPORT",
        active: true,
      });
      f.p1 = await good(op + "/records/passengers", {
        employeeCode: "001",
        fullName: "Direct employee",
        clientId: f.clientRecord.id,
        active: true,
      });
      f.p2 = await good(op + "/records/passengers", {
        employeeCode: "002",
        fullName: "Staffing employee",
        clientId: f.clientRecord.id,
        employerId: f.employer.id,
        active: true,
      });
      const invalid = await call(op + "/records/passengers", {
        employeeCode: "003",
        fullName: "Invalid employer",
        clientId: f.clientRecord.id,
        employerId: f.supplierRecord.id,
      });
      assert.equal(invalid.status, 422);
      const csv =
        "employeeCode,fullName,phone\n001,Existing,\n003,Imported employee,010";
      const preview = await good(op + "/passengers/import", {
        clientId: f.clientRecord.id,
        csv,
        preview: true,
      });
      assert.equal(preview.validCount, 1);
      assert.equal(preview.skippedCount, 1);
      assert.equal(await db.passenger.count(), 2);
      await good(op + "/passengers/import", {
        clientId: f.clientRecord.id,
        csv,
        preview: false,
      });
      assert.equal(await db.passenger.count(), 3);
      const again = await good(op + "/passengers/import", {
        clientId: f.clientRecord.id,
        csv,
        preview: false,
      });
      assert.equal(again.importedCount, 0);
      f.p3 = await db.passenger.findUniqueOrThrow({
        where: {
          clientId_employeeCode: {
            clientId: f.clientRecord.id,
            employeeCode: "003",
          },
        },
      });
      for (const p of [f.p1, f.p2, f.p3]) {
        const data = {
          passengerId: p.id,
          routeId: f.route.id,
          stopName: "Station",
          direction: "BOTH",
          shift: "MORNING",
          startDate: "2026-10-01",
          endDate: "2026-10-31",
          active: true,
        };
        p.enrollment = await good(op + "/records/enrollments", data);
        p.enrollmentData = data;
      }
      assert.equal(
        (await call(op + "/records/enrollments", f.p1.enrollmentData)).status,
        409,
      );
      assert.equal(
        (
          await call(
            op + "/records/partners",
            { name: "Viewer write", kind: "TRANSPORT" },
            "viewer",
          )
        ).status,
        403,
      );
      assert.equal(
        (await call("/accounting/expenses", { amount: 10 }, "viewer")).status,
        403,
      );
      assert.equal(
        (await call("/accounting/import-workspace-files", {}, "admin")).status,
        409,
      );
      assert.equal((await call("/clients", undefined, "client")).status, 403);
    },
  );
  await t.test(
    "capacity, generation retries and concurrent assignments",
    async () => {
      f.planData = {
        name: "Test outbound",
        routeId: f.route.id,
        contractId: f.contract.id,
        vehicleId: f.vehicle.id,
        driverId: f.driverRecord.id,
        supplierId: f.supplierRecord.id,
        direction: "OUTBOUND",
        shift: "MORNING",
        departureTime: "06:00",
        durationMinutes: 60,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        saleRate: 1000,
        supplierRate: 600,
        active: true,
      };
      f.plan = await good(op + "/records/plans", f.planData);
      let r = await good(`${op}/plans/${f.plan.id}/generate`, {
        startDate: day,
        endDate: day,
        preview: true,
      });
      assert.equal(r.results[0].status, "BLOCKED");
      assert.match(r.results[0].reason, /seats/);
      await good(
        op + "/records/enrollments/" + f.p3.enrollment.id,
        { ...f.p3.enrollmentData, active: false },
        "admin",
        "put",
      );
      r = await good(`${op}/plans/${f.plan.id}/generate`, {
        startDate: day,
        endDate: day,
        preview: true,
      });
      assert.equal(r.results[0].status, "READY");
      assert.equal(await db.trip.count(), 0);
      const p2 = await good(op + "/records/plans", {
        ...f.planData,
        name: "Concurrent schedule",
      });
      const generated = await Promise.all(
        [f.plan, p2].map((p) =>
          good(`${op}/plans/${p.id}/generate`, {
            startDate: day,
            endDate: day,
            preview: false,
          }),
        ),
      );
      assert.equal(
        generated
          .flatMap((r) => r.results)
          .filter((r) => r.status === "CREATED").length,
        1,
      );
      assert.equal(await db.trip.count(), 1);
      f.trip = await db.trip.findFirstOrThrow({ include: { manifest: true } });
      assert.equal(f.trip.manifest.length, 2);
      r = await good(`${op}/plans/${f.trip.servicePlanId}/generate`, {
        startDate: day,
        endDate: day,
        preview: false,
      });
      assert.equal(r.results[0].status, "EXISTS");
      assert.equal(
        (await call("/trips/" + f.trip.id, {}, "admin", "delete")).status,
        409,
      );
      assert.equal(
        (await call("/contracts/" + f.contract.id, {}, "admin", "delete"))
          .status,
        409,
      );
      assert.equal(
        (
          await call(`${op}/trips/${f.trip.id}/replace`, {
            vehicleId: f.small.id,
            driverId: f.driverRecord.id,
            supplierId: f.supplierRecord.id,
            costAmount: 600,
            reason: "Capacity test",
          })
        ).status,
        409,
      );
    },
  );
  await t.test(
    "portal isolation, attendance, state transitions, and history",
    async () => {
      await db.user.update({
        where: { id: f.driver.id },
        data: { driverScopeId: f.driverRecord.id },
      });
      await db.user.update({
        where: { id: f.client.id },
        data: { clientScopeId: f.clientRecord.id },
      });
      await db.user.update({
        where: { id: f.supplier.id },
        data: { partnerScopeId: f.supplierRecord.id },
      });
      assert.equal(
        (await good(op + "/trips?date=" + day, undefined, "driver")).length,
        1,
      );
      await db.user.update({
        where: { id: f.client.id },
        data: { clientScopeId: f.otherClient.id },
      });
      assert.equal(
        (await good(op + "/trips?date=" + day, undefined, "client")).length,
        0,
      );
      assert.equal(
        (await call(`${op}/trips/${f.trip.id}`, undefined, "client")).status,
        403,
      );
      await db.user.update({
        where: { id: f.client.id },
        data: { clientScopeId: f.clientRecord.id },
      });
      const portal = await good(
        `${op}/trips/${f.trip.id}`,
        undefined,
        "client",
      );
      assert.equal(portal.costAmount, undefined);
      assert.equal(portal.monthlyAmount, undefined);
      assert.equal(
        (await call(`${op}/trips/${f.trip.id}/status`, { status: "COMPLETED" }))
          .status,
        409,
      );
      await good(
        `${op}/trips/${f.trip.id}/status`,
        { status: "IN_PROGRESS" },
        "driver",
      );
      assert.equal(
        (
          await call(
            `${op}/trips/${f.trip.id}/status`,
            { status: "COMPLETED" },
            "driver",
          )
        ).status,
        422,
      );
      for (const m of f.trip.manifest)
        await good(
          `${op}/trips/${f.trip.id}/attendance`,
          { manifestId: m.id, status: "BOARDED" },
          "driver",
        );
      await good(
        `${op}/trips/${f.trip.id}/incident`,
        { description: "Service completed without issues" },
        "driver",
      );
      await good(
        `${op}/trips/${f.trip.id}/status`,
        { status: "COMPLETED" },
        "driver",
      );
      assert.equal(
        (
          await call(
            `${op}/trips/${f.trip.id}/attendance`,
            { manifestId: f.trip.manifest[0].id, status: "NO_SHOW" },
            "driver",
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await db.tripPassenger.findUniqueOrThrow({
            where: {
              id: f.trip.manifest.find((m: any) => m.passengerId === f.p2.id)
                .id,
            },
          })
        ).employerName,
        "Staffing test",
      );
      await good(
        op + "/records/passengers/" + f.p2.id,
        {
          employeeCode: "002",
          fullName: "Staffing employee",
          clientId: f.clientRecord.id,
          employerId: null,
          active: true,
        },
        "admin",
        "put",
      );
      assert.equal(
        (
          await db.tripPassenger.findUniqueOrThrow({
            where: {
              id: f.trip.manifest.find((m: any) => m.passengerId === f.p2.id)
                .id,
            },
          })
        ).employerName,
        "Staffing test",
      );
    },
  );
  await t.test(
    "invoice and settlement generation, double-billing prevention, payments",
    async () => {
      const input = {
        kind: "INVOICE",
        partyId: f.clientRecord.id,
        period: "2026-10",
        dueDate: "2026-11-01",
      };
      assert.equal((await call(op + "/documents", input, "ops")).status, 403);
      f.invoice = await good(op + "/documents", input, "accountant");
      assert.equal(Number(f.invoice.total), 1000);
      assert.equal(
        (await good(op + "/documents", undefined, "client")).length,
        0,
      );
      assert.equal(
        (await call(op + "/documents", input, "accountant")).status,
        422,
      );
      await good(`${op}/documents/${f.invoice.id}/issue`, {}, "accountant");
      assert.equal(
        (await good(op + "/documents", undefined, "client")).length,
        1,
      );
      assert.equal(
        (
          await call(
            `${op}/documents/${f.invoice.id}/discard`,
            {},
            "accountant",
          )
        ).status,
        409,
      );
      const payment = {
        amount: 400,
        date: new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
        reference: "TEST-RECEIPT",
        accountId: f.treasury.id,
        requestKey: randomUUID(),
      };
      await good(
        `${op}/documents/${f.invoice.id}/payments`,
        payment,
        "accountant",
      );
      await good(
        `${op}/documents/${f.invoice.id}/payments`,
        payment,
        "accountant",
      );
      assert.equal(await db.payment.count(), 1);
      assert.equal(
        (
          await call(
            `${op}/documents/${f.invoice.id}/payments`,
            { ...payment, requestKey: randomUUID(), amount: 601 },
            "accountant",
          )
        ).status,
        422,
      );
      await good(
        `${op}/documents/${f.invoice.id}/payments`,
        { ...payment, requestKey: randomUUID(), amount: 600 },
        "accountant",
      );
      assert.equal(
        (
          await db.financeDocument.findUniqueOrThrow({
            where: { id: f.invoice.id },
          })
        ).status,
        "PAID",
      );
      f.settlement = await good(
        op + "/documents",
        { ...input, kind: "SETTLEMENT", partyId: f.supplierRecord.id },
        "accountant",
      );
      assert.equal(Number(f.settlement.total), 600);
      await good(`${op}/documents/${f.settlement.id}/issue`, {}, "accountant");
      const supplierDocs = await good(op + "/documents", undefined, "supplier");
      assert.equal(supplierDocs.length, 1);
      assert.equal(supplierDocs[0].kind, "SETTLEMENT");
      assert.ok((await db.auditEvent.count()) > 15);
    },
  );
  await t.test("monthly billing snapshots and distinct payer", async () => {
    const monthly = await db.contract.create({
      data: {
        clientId: f.clientRecord.id,
        billToClientId: f.otherClient.id,
        contractNumber: "MONTHLY",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-12-31"),
        pricingModel: "MONTHLY_FIXED",
        monthlyValue: 25000,
      },
    });
    const p = await good(op + "/records/plans", {
      ...f.planData,
      name: "Monthly return",
      direction: "RETURN",
      departureTime: "17:00",
      contractId: monthly.id,
    });
    await good(`${op}/plans/${p.id}/generate`, {
      startDate: "2026-10-06",
      endDate: "2026-10-07",
      preview: false,
    });
    const trips = await db.trip.findMany({ where: { servicePlanId: p.id } });
    assert.equal(trips.length, 2);
    // Complete fixture services through the application, including attendance.
    for (const trip of trips) {
      await good(`${op}/trips/${trip.id}/status`, { status: "IN_PROGRESS" });
      for (const m of await db.tripPassenger.findMany({
        where: { tripId: trip.id },
      }))
        await good(`${op}/trips/${trip.id}/attendance`, {
          manifestId: m.id,
          status: "BOARDED",
        });
      await good(`${op}/trips/${trip.id}/status`, { status: "COMPLETED" });
    }
    await db.contract.update({
      where: { id: monthly.id },
      data: { monthlyValue: 99000 },
    });
    const invoice = await good(
      op + "/documents",
      {
        kind: "INVOICE",
        partyId: f.otherClient.id,
        period: "2026-10",
        dueDate: "2026-11-01",
      },
      "accountant",
    );
    assert.equal(Number(invoice.total), 25000);
    assert.equal(invoice.lines.length, 1);
    await good(`${op}/documents/${invoice.id}/discard`, {}, "accountant");
    const second = await good(
      op + "/documents",
      {
        kind: "INVOICE",
        partyId: f.otherClient.id,
        period: "2026-10",
        dueDate: "2026-11-01",
      },
      "accountant",
    );
    assert.equal(Number(second.total), 25000);
  });
  await t.test(
    "expense, payroll and installment validation with finance permissions",
    async () => {
      const expense = await good(
        op + "/records/expenses",
        {
          date: day,
          category: "Fuel",
          amount: 125.5,
          vehicleNumber: "TEST-01",
        },
        "accountant",
      );
      assert.equal(Number(expense.amount), 125.5);
      assert.equal(expense.month, 10);
      assert.equal(
        (
          await call(
            op + "/records/expenses",
            { date: day, category: "Invalid", amount: -1 },
            "accountant",
          )
        ).status,
        422,
      );
      assert.equal(
        (
          await call(
            op + "/records/expenses",
            { date: day, category: "Forbidden", amount: 10 },
            "ops",
          )
        ).status,
        403,
      );
      const payroll = await good(
        op + "/records/payroll",
        {
          date: day,
          employeeName: "Test Employee",
          jobTitle: "Dispatcher",
          basicSalary: 1000,
          overtime: 100,
          deductions: 50,
          advances: 100,
          penalties: 0,
        },
        "accountant",
      );
      assert.equal(Number(payroll.netSalary), 950);
      assert.equal(
        (
          await call(
            op + "/records/payroll",
            {
              date: day,
              employeeName: "Invalid",
              jobTitle: "Staff",
              basicSalary: 100,
              advances: 200,
            },
            "accountant",
          )
        ).status,
        422,
      );
      const installment = await good(
        op + "/records/installments",
        {
          category: "VEHICLE",
          assetName: "Test vehicle",
          installmentNumber: 1,
          bankDueDate: day,
          bankAmount: 500,
          status: "PENDING",
        },
        "accountant",
      );
      assert.equal(installment.status, "PENDING");
    },
  );
  await t.test("contract, route and site edits preserve linked records", async () => {
    assert.equal((await call('/contracts/' + f.contract.id, { endDate: '2025-01-01' }, 'admin', 'put')).status, 422);
    assert.equal((await call('/contracts/' + f.contract.id, { clientId: f.otherClient.id }, 'admin', 'put')).status, 409);
    assert.equal((await call('/routes/' + f.route.id, { clientId: f.otherClient.id }, 'admin', 'put')).status, 409);
    assert.equal((await call('/routes/' + f.route.id, { startLocation: 'Other station', stops: [] }, 'admin', 'put')).status, 409);
    assert.equal((await db.routeStop.count({ where: { routeId: f.route.id } })), 1);
    const site = await good(op + '/records/sites', { name: 'Main site', clientId: f.clientRecord.id });
    await good(op + '/records/passengers/' + f.p1.id, { employeeCode: '001', fullName: 'Direct employee', clientId: f.clientRecord.id, siteId: site.id }, 'admin', 'put');
    assert.equal((await call(op + '/records/sites/' + site.id, { name: 'Main site', clientId: f.otherClient.id }, 'admin', 'put')).status, 409);
    assert.equal((await call(op + '/records/sites', { name: 'Invalid site', clientId: randomUUID() })).status, 422);
  });
  await t.test("dispatch blocks expired documents, maintenance and unavailable drivers", async () => {
    const preview = () => good(`${op}/plans/${f.plan.id}/generate`, { startDate: '2026-10-09', endDate: '2026-10-09', preview: true });
    await db.vehicle.update({ where: { id: f.vehicle.id }, data: { insuranceExpiry: new Date('2026-10-08') } });
    assert.match((await preview()).results[0].reason, /expired/);
    await db.vehicle.update({ where: { id: f.vehicle.id }, data: { insuranceExpiry: new Date('2030-01-01') } });
    await db.driver.update({ where: { id: f.driverRecord.id }, data: { dutyStatus: 'OFF_DUTY' } });
    assert.match((await preview()).results[0].reason, /unavailable/);
    await db.driver.update({ where: { id: f.driverRecord.id }, data: { dutyStatus: 'AVAILABLE' } });
    const maintenance = await good('/maintenance', { vehicleId: f.vehicle.id, maintenanceType: 'OTHER', serviceDate: '2026-10-09', completionDate: '2026-10-09', cost: 100, mileageAtService: 100, status: 'SCHEDULED', description: 'Scheduled inspection' });
    assert.match((await preview()).results[0].reason, /maintenance/);
    await good('/maintenance/' + maintenance.id, {}, 'admin', 'delete');
    assert.equal((await preview()).results[0].status, 'READY');
  });
  await t.test("supplier revalidation, breakdown recovery and attendance preservation", async () => {
    const generate = (preview: boolean) => good(`${op}/plans/${f.plan.id}/generate`, { startDate: '2026-10-08', endDate: '2026-10-08', preview });
    await db.partner.update({ where: { id: f.supplierRecord.id }, data: { active: false } });
    assert.equal((await generate(true)).results[0].status, 'BLOCKED');
    await db.partner.update({ where: { id: f.supplierRecord.id }, data: { active: true } });
    await generate(false);
    const trip = await db.trip.findFirstOrThrow({ where: { servicePlanId: f.plan.id, tripDate: new Date('2026-10-08') }, include: { manifest: true } });
    const path = `${op}/trips/${trip.id}`;
    await db.partner.update({ where: { id: f.supplierRecord.id }, data: { active: false } });
    assert.equal((await call(path + '/status', { status: 'IN_PROGRESS' })).status, 422);
    await db.partner.update({ where: { id: f.supplierRecord.id }, data: { active: true } });
    await good(path + '/status', { status: 'IN_PROGRESS' });
    const started = await db.trip.findUniqueOrThrow({ where: { id: trip.id } });
    assert.equal((await call('/maintenance', { vehicleId: f.vehicle.id, maintenanceType: 'OTHER', serviceDate: '2026-09-01', cost: 0, mileageAtService: 0, status: 'IN_PROGRESS', description: 'Must pause trip first' })).status, 409);
    await good(path + '/attendance', { manifestId: trip.manifest[0].id, status: 'BOARDED' });
    assert.equal((await call(path + '/status', { status: 'DELAYED' })).status, 422);
    await good(path + '/status', { status: 'DELAYED', reason: 'Breakdown at pickup' });
    assert.equal((await call(path + '/manifest', {})).status, 409);
    assert.equal((await db.tripPassenger.findUniqueOrThrow({ where: { id: trip.manifest[0].id } })).status, 'BOARDED');
    await good(path + '/replace', { vehicleId: f.vehicle.id, driverId: f.driverRecord.id, supplierId: f.supplierRecord.id, costAmount: 600, reason: 'Resources checked and ready' });
    await good(path + '/status', { status: 'IN_PROGRESS' });
    assert.equal((await db.trip.findUniqueOrThrow({ where: { id: trip.id } })).actualDeparture?.toISOString(), started.actualDeparture?.toISOString());
    for (const m of trip.manifest.slice(1)) await good(path + '/attendance', { manifestId: m.id, status: 'NO_SHOW' });
    await good(path + '/status', { status: 'COMPLETED' });
    assert.ok(await db.tripEvent.count({ where: { tripId: trip.id, type: 'REPLACEMENT' } }));
  });
  await t.test("maintenance availability, multiple jobs and protected service history", async () => {
    const data = { vehicleId: f.small.id, maintenanceType: 'OTHER', serviceDate: '2026-09-01', cost: 100, mileageAtService: 1000, status: 'IN_PROGRESS', description: 'Test service job' };
    assert.equal((await call('/maintenance', { ...data, completionDate: '2026-08-01' })).status, 422);
    assert.equal((await call('/maintenance', { ...data, serviceDate: '2026-02-30' })).status, 422);
    const future = await good('/maintenance', { ...data, serviceDate: '2030-01-01', status: 'SCHEDULED' });
    assert.notEqual((await db.vehicle.findUniqueOrThrow({ where: { id: f.small.id } })).status, 'UNDER_MAINTENANCE');
    const first = await good('/maintenance', data);
    const second = await good('/maintenance', data);
    await good('/maintenance/' + first.id, { status: 'COMPLETED' }, 'admin', 'put');
    assert.equal((await db.vehicle.findUniqueOrThrow({ where: { id: f.small.id } })).status, 'UNDER_MAINTENANCE');
    await good('/maintenance/' + second.id, { status: 'COMPLETED' }, 'admin', 'put');
    assert.equal((await db.vehicle.findUniqueOrThrow({ where: { id: f.small.id } })).status, 'AVAILABLE');
    assert.equal((await call('/maintenance/' + first.id, {}, 'admin', 'delete')).status, 409);
    await good('/maintenance/' + future.id, {}, 'admin', 'delete');
  });
  await t.test(
    "disabled accounts and changed access invalidate existing tokens",
    async () => {
      await db.user.update({
        where: { id: f.viewer.id },
        data: { status: "SUSPENDED" },
      });
      assert.equal(
        (await call(op + "/summary", undefined, "viewer")).status,
        401,
      );
      await good(op + "/users/scope", {
        userId: f.client.id,
        role: "CLIENT",
        clientScopeId: f.otherClient.id,
      });
      assert.equal(
        (await call(op + "/trips", undefined, "client")).status,
        401,
      );
      assert.equal(
        (
          await call(op + "/users/scope", {
            userId: f.admin.id,
            role: "VIEWER",
          })
        ).status,
        422,
      );
    },
  );
});

test('showcase, reporting and fast attendance', async t => {
  const { seedShowcase, demoId } = await import('../prisma/showcase.js');
  const currentDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await t.test('demo seed is additive, repeatable and financially consistent', async () => {
    const original = await db.user.findUniqueOrThrow({ where: { id: f.admin.id } });
    await seedShowcase(db, currentDay);
    const count = await db.trip.count();
    await db.client.update({ where: { id: demoId('client:0') }, data: { contactPerson: 'Retained edit' } });
    await seedShowcase(db, currentDay);
    assert.equal(await db.trip.count(), count);
    assert.equal(await db.trip.count({ where: { tripNumber: { startsWith: 'DEMO-OT-' } } }), 288);
    assert.equal(await db.passenger.count({ where: { employeeCode: { startsWith: 'DEMO-OT-' } } }), 48);
    assert.equal((await db.client.findUniqueOrThrow({ where: { id: demoId('client:0') } })).contactPerson, 'Retained edit');
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: f.admin.id } })).passwordHash, original.passwordHash);
    const docs = await db.financeDocument.findMany({ where: { number: { startsWith: 'DEMO-OT-' } }, include: { lines: true, payments: true } });
    for (const doc of docs) {
      assert.equal(doc.lines.reduce((sum, line) => sum + Number(line.amount), 0), Number(doc.total));
      const paid = doc.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      assert.ok(paid <= Number(doc.total));
      if (doc.status === 'PAID') assert.equal(paid, Number(doc.total));
    }
  });
  await t.test('analytics agree with source records and protect portal access', async () => {
    assert.equal((await call(op + '/analytics?days=30', undefined, 'driver')).status, 403);
    assert.equal((await call(op + '/analytics?days=8')).status, 422);
    for (const days of [7, 30, 90]) {
      const report = await good(op + '/analytics?days=' + days);
      assert.equal(report.daily.length, days);
      assert.equal(report.end, currentDay);
      assert.equal(report.demoPresent, true);
      const trips = await db.trip.findMany({ where: { tripDate: { gte: dateOnly(report.start), lte: dateOnly(report.end) }, tripStatus: 'COMPLETED' }, include: { manifest: true } });
      assert.equal(report.metrics.completed, trips.length);
      assert.equal(report.daily.reduce((s: number, d: any) => s + d.completed, 0), trips.length);
      const boarded = trips.flatMap(t => t.manifest).filter(m => m.status === 'BOARDED').length;
      assert.equal(report.metrics.boarded, boarded);
      const timed = trips.filter(t => t.actualDeparture);
      assert.equal(report.metrics.onTimeRate, timed.length ? Math.round(timed.filter(t => t.actualDeparture!.getTime() <= t.scheduledDeparture.getTime() + 300000).length / timed.length * 100) : null);
      const payments = await db.payment.findMany({ where: { date: { gte: dateOnly(report.start), lte: dateOnly(report.end) }, document: { status: { in: ['ISSUED', 'PAID'] } } }, include: { document: true } });
      for (const [kind, metric] of [['INVOICE', 'receipts'], ['SETTLEMENT', 'payouts']]) assert.equal(report.metrics[metric], payments.filter(p => p.document.kind === kind).reduce((s, p) => s + Number(p.amount), 0));
      assert.equal(report.passengerMix.direct + report.passengerMix.outsourced, await db.passenger.count({ where: { active: true } }));
    }
  });
  await t.test('bulk boarding enforces scope, confirmation, atomic updates and trip state', async () => {
    const trip = await db.trip.findUniqueOrThrow({ where: { id: demoId(`trip:${currentDay}:0:0`) }, include: { manifest: true } });
    const path = op + '/trips/' + trip.id;
    const ids = trip.manifest.map(m => m.id);
    assert.equal((await call(path + '/attendance-batch', { manifestIds: ids, confirmed: true })).status, 409);
    await good(path + '/status', { status: 'IN_PROGRESS' });
    assert.equal((await call(path + '/attendance-batch', { manifestIds: ids, confirmed: true }, 'driver')).status, 403);
    assert.equal((await call(path + '/attendance-batch', { manifestIds: ids })).status, 422);
    await good(path + '/attendance', { manifestId: ids[0], status: 'NO_SHOW' });
    assert.equal((await call(path + '/attendance-batch', { manifestIds: [ids[1], randomUUID()], confirmed: true })).status, 409);
    assert.equal((await db.tripPassenger.findUniqueOrThrow({ where: { id: ids[1] } })).status, 'EXPECTED');
    await good(path + '/attendance-batch', { manifestIds: ids.slice(1), confirmed: true });
    assert.equal((await db.tripPassenger.findUniqueOrThrow({ where: { id: ids[0] } })).status, 'NO_SHOW');
    assert.equal(await db.tripPassenger.count({ where: { tripId: trip.id, status: 'BOARDED' } }), 11);
    assert.equal((await call(path + '/attendance-batch', { manifestIds: ids.slice(1), confirmed: true })).status, 409);
    await good(path + '/status', { status: 'COMPLETED' });
    assert.equal((await call(path + '/attendance-batch', { manifestIds: ids, confirmed: true })).status, 409);
  });
});

test('treasury balances, payment routing and client statements', async t => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const base = op + '/treasury';
  let bank:any, cash:any, invoice:any;
  const balance=async(id:string)=>Number((await good(base)).accounts.find((a:any)=>a.id===id).balance);
  await t.test('only admin creates accounts; opening amounts and dates are validated', async()=>{
    const input={name:'Treasury Bank',kind:'BANK',openingDate:'2026-01-01',openingBalance:10000,requestKey:randomUUID()};
    assert.equal((await call(base+'/accounts',input,'accountant')).status,403);
    assert.equal((await call(base,undefined,'driver')).status,403);
    assert.equal((await call(base+'/accounts',{...input,openingBalance:-1})).status,422);
    assert.equal((await call(base+'/accounts',{...input,openingBalance:1.001})).status,422);
    assert.equal((await call(base+'/accounts',{...input,openingDate:'2099-01-01'})).status,422);
    bank=await good(base+'/accounts',input);
    assert.equal((await good(base+'/accounts',input)).id,bank.id);
    assert.equal((await call(base+'/accounts',{...input,openingBalance:12000})).status,409);
    cash=await good(base+'/accounts',{...input,name:'Treasury Cash',kind:'CASH',openingBalance:0,requestKey:randomUUID()});
    assert.equal(await balance(bank.id),10000);
    assert.equal(await balance(cash.id),0);
  });
  await t.test('invoice receipts post atomically into the selected bank with strict retries',async()=>{
    invoice=await db.financeDocument.create({data:{number:'TREASURY-INVOICE',kind:'INVOICE',clientId:f.otherClient.id,period:date.slice(0,7),dueDate:dateOnly(date),total:300,status:'ISSUED'}});
    const path=op+'/documents/'+invoice.id+'/payments';
    const input={amount:100,date,reference:'BANK-RECEIPT',requestKey:randomUUID(),accountId:bank.id};
    assert.equal((await call(path,{...input,accountId:undefined})).status,422);
    assert.equal((await call(path,{...input,accountId:randomUUID()})).status,404);
    assert.equal(await db.payment.count({where:{documentId:invoice.id}}),0);
    await good(path,input,'accountant');await good(path,input,'accountant');
    assert.equal(await balance(bank.id),10100);
    assert.equal((await call(path,{...input,accountId:cash.id})).status,409);
    assert.equal((await call(path,{...input,date:'2026-01-02'})).status,409);
    assert.equal((await call(path,{...input,amount:201,requestKey:randomUUID()})).status,422);
    const statement=await good(base+'/clients/'+f.otherClient.id);
    assert.equal(statement.documents.find((d:any)=>d.id===invoice.id).payments[0].treasuryEntry.account.id,bank.id);
    assert.equal((await db.financeDocument.findUniqueOrThrow({where:{id:invoice.id}})).status,'ISSUED');
  });
  await t.test('transfers are balanced, retry-safe and reject concurrent overdrafts',async()=>{
    const input={fromAccountId:bank.id,toAccountId:cash.id,amount:500,date,reference:'TRANSFER',requestKey:randomUUID()};
    await good(base+'/transfers',input,'accountant');await good(base+'/transfers',input,'accountant');
    assert.equal(await balance(bank.id),9600);assert.equal(await balance(cash.id),500);
    const entries=await db.treasuryEntry.findMany({where:{requestKey:{startsWith:input.requestKey}}});
    assert.equal(entries.length,2);assert.equal(entries.reduce((s,e)=>s+Number(e.amount),0),0);
    assert.equal((await call(base+'/transfers',{...input,toAccountId:bank.id,requestKey:randomUUID()})).status,422);
    assert.equal((await call(base+'/transfers',{...input,toAccountId:randomUUID(),requestKey:randomUUID()})).status,404);
    assert.equal(await balance(bank.id),9600);
    const result=await Promise.all([1,2].map(()=>call(base+'/transfers',{...input,fromAccountId:cash.id,toAccountId:bank.id,amount:400,requestKey:randomUUID()})));
    assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);
    assert.equal(await balance(cash.id),100);
    // A current balance cannot fund a withdrawal that predates the receipt.
    assert.equal((await call(base+'/transfers',{...input,fromAccountId:cash.id,toAccountId:bank.id,amount:10,date:'2026-01-02',requestKey:randomUUID()})).status,409);
  });
  await t.test('supplier payment posts an outflow and rolls back when funds are insufficient',async()=>{
    const doc=await db.financeDocument.create({data:{number:'TREASURY-SETTLEMENT',kind:'SETTLEMENT',partnerId:f.supplierRecord.id,period:date.slice(0,7),dueDate:dateOnly(date),total:500,status:'ISSUED'}});
    const input={accountId:cash.id,date,amount:200,reference:'SUPPLIER',requestKey:randomUUID()};
    assert.equal((await call(op+'/documents/'+doc.id+'/payments',input)).status,409);
    assert.equal(await db.payment.count({where:{documentId:doc.id}}),0);
    await good(op+'/documents/'+doc.id+'/payments',{...input,amount:50});
    assert.equal(await balance(cash.id),50);
  });
  await t.test('cost payments lock records and cannot be duplicated or bypassed through legacy APIs',async()=>{
    for(const [sourceType,body] of [
      ['expenses',{date,category:'Fuel',amount:10}],
      ['payroll',{date,employeeName:'Test staff',jobTitle:'Dispatch',basicSalary:10}],
      ['installments',{category:'VEHICLE',assetName:'Test asset',installmentNumber:1,bankDueDate:date,bankAmount:10,status:'PENDING'}],
    ] as any[]){
      const record=await good(op+'/records/'+sourceType,body);
      const input={sourceType,sourceId:record.id,accountId:cash.id,date,reference:'COST',requestKey:randomUUID()};
      await good(base+'/record-payments',input,'accountant');await good(base+'/record-payments',input,'accountant');
      assert.equal((await call(base+'/record-payments',{...input,requestKey:randomUUID()})).status,409);
      assert.equal((await call(op+'/records/'+sourceType+'/'+record.id,body,'admin','put')).status,409);
      if(sourceType==='installments')assert.equal((await db.installment.findUniqueOrThrow({where:{id:record.id}})).status,'PAID');
      if(sourceType==='expenses')assert.equal((await call('/accounting/expenses/'+record.id,{},'admin','delete')).status,409);
    }
    assert.equal(await balance(cash.id),20);
  });
  await t.test('historical allocation changes treasury only; adjustments and archiving are controlled',async()=>{
    const old=await db.payment.create({data:{documentId:invoice.id,amount:20,date:dateOnly(date),reference:'HISTORICAL',requestKey:randomUUID()}});
    const before=await balance(bank.id),count=await db.payment.count();
    assert.equal((await call(base+'/payments/'+old.id+'/allocate',{accountId:bank.id},'accountant')).status,403);
    await good(base+'/payments/'+old.id+'/allocate',{accountId:bank.id});
    await good(base+'/payments/'+old.id+'/allocate',{accountId:bank.id});
    assert.equal(await balance(bank.id),before+20);assert.equal(await db.payment.count(),count);
    assert.equal((await call(base+'/payments/'+old.id+'/allocate',{accountId:cash.id})).status,409);
    assert.equal((await call(base+'/accounts/'+cash.id+'/status',{active:false})).status,409);
    const adjustment={accountId:cash.id,direction:'OUT',amount:20,date,reference:'CORRECTION',notes:'Reviewed test balance correction',requestKey:randomUUID()};
    assert.equal((await call(base+'/adjustments',adjustment,'accountant')).status,403);
    await good(base+'/adjustments',adjustment);assert.equal(await balance(cash.id),0);
    await good(base+'/accounts/'+cash.id+'/status',{active:false});
    assert.equal((await call(base+'/adjustments',{...adjustment,direction:'IN',requestKey:randomUUID()})).status,409);
    await good(base+'/accounts/'+cash.id+'/status',{active:true});
  });
});
