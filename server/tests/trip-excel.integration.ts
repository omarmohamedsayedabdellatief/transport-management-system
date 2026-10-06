import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw Error("Use a dedicated TEST_DATABASE_URL ending in _test.");
const db = new PrismaClient({ datasourceUrl: url });
const base = "http://127.0.0.1:5112/api";
const excel = (rows: any[], headers?: string[]) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows, { header: headers }),
    "Worksheet",
  );
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
};
test("Excel import is scoped, atomic, repeatable and reconciles trip accounting", async (t) => {
  const server = spawn(
    process.execPath,
    [fileURLToPath(new URL("../dist/server.js", import.meta.url))],
    {
      env: {
        ...process.env,
        DATABASE_URL: url,
        PORT: "5112",
        HOST: "127.0.0.1",
        NODE_ENV: "test",
        JWT_ACCESS_SECRET: "test-access-secret-with-at-least-32-characters",
        JWT_REFRESH_SECRET: "test-refresh-secret-with-at-least-32-characters",
      },
      stdio: "ignore",
    },
  );
  const tokens: Record<string, string> = {},
    suffix = randomUUID().slice(0, 8),
    company = "Excel " + suffix,
    route = "Excel route " + suffix,
    typeName = "Excel return " + suffix;
  const call = async (path: string, body?: any, role = "ADMIN") => {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(tokens[role] ? { Authorization: "Bearer " + tokens[role] } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json() };
  };
  const good = async (path: string, body?: any, role = "ADMIN") => {
    const r = await call(path, body, role);
    assert.ok(r.status < 300, JSON.stringify(r));
    return r.body.data;
  };
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base.replace("/api", "/health"))).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    for (const role of [
      "ADMIN",
      "ACCOUNTANT",
      "VIEWER",
      "OPERATIONS_MANAGER",
    ] as const) {
      const email = `excel-${role.toLowerCase()}-${suffix}@test.local`,
        password = "ExcelTest123456";
      await db.user.create({
        data: {
          email,
          fullName: role,
          role,
          passwordHash: await bcrypt.hash(password, 4),
        },
      });
      tokens[role] = (
        await good("/auth/login", { email, password }, role)
      ).accessToken;
    }
    const vehicle = await db.vehicle.create({
      data: {
        plateNumber: "EXCEL-" + suffix,
        make: "Toyota",
        model: "Test",
        manufacturingYear: 2026,
        vehicleType: "SEDAN",
        capacity: 4,
        insuranceExpiry: new Date("2035-01-01"),
        licenseExpiry: new Date("2035-01-01"),
        inspectionExpiry: new Date("2035-01-01"),
      },
    });
    const driver = await db.driver.create({
      data: {
        fullName: "Excel driver " + suffix,
        phoneNumber: "test",
        nationalId: "EXCEL-" + suffix,
        licenseNumber: "EXCEL-" + suffix,
        licenseExpirationDate: new Date("2035-01-01"),
        assignedVehicleId: vehicle.id,
      },
    });
    await db.tripBillingType.create({
      data: { name: typeName, direction: "RETURN" },
    });
    const row: any = {
      التاريخ: "2028-02-01",
      الشركة: company,
      الخط: route,
      من: "Factory",
      إلى: "Home",
      "ذهاب/عودة": "عودة",
      "وقت البداية": "00:00",
      "وقت الوصول": "01:00",
      "أسم السائق": driver.fullName,
      "رقم اللوحة": vehicle.plateNumber,
      "نوع الفوترة": typeName,
      "حالة الرحلة": "COMPLETED",
      "سعر العميل": 500,
      "تكلفة المورد": 0,
      "أجر الدورة": 100,
      "تكلفة السيارة": 20,
      عدد: 1,
      "تم التأكيد": false,
      "ترتيب 1": 24,
    };
    let input: any = {
      fileName: "test.xlsx",
      fileContent: excel([row]),
      startDate: "2028-02-01",
      endDate: "2028-02-02",
      newCompanies: [company],
      companyIds: [],
      mode: "REPLACE",
    };
    let preview: any, client: any, trip: any;
    await t.test(
      "preview rolls back master data, trips and accounting; unauthorized roles cannot import",
      async () => {
        for (const role of ["VIEWER", "OPERATIONS_MANAGER"])
          assert.equal(
            (
              await call(
                "/trips/excel/inspect",
                { fileContent: input.fileContent },
                role,
              )
            ).status,
            403,
          );
        preview = await good("/trips/excel/preview", input);
        assert.equal(preview.created, 1);
        assert.deepEqual(preview.creations.companies, [company]);
        assert.equal(
          await db.client.count({ where: { companyName: company } }),
          0,
        );
        assert.equal(preview.rows[0].saleAmount, 500);
      },
    );
    await t.test(
      "commit once creates route/rate and financials; retry is idempotent; actor is bound",
      async () => {
        assert.equal(
          (
            await call(
              "/trips/excel/commit",
              { batchId: preview.batchId, confirm: true },
              "ACCOUNTANT",
            )
          ).status,
          403,
        );
        await good("/trips/excel/commit", {
          batchId: preview.batchId,
          confirm: true,
        });
        await good("/trips/excel/commit", {
          batchId: preview.batchId,
          confirm: true,
        });
        client = await db.client.findFirstOrThrow({
          where: { companyName: company },
        });
        trip = await db.trip.findFirstOrThrow({
          where: { clientId: client.id },
        });
        assert.equal(
          await db.trip.count({ where: { clientId: client.id } }),
          1,
        );
        assert.equal(
          trip.scheduledDeparture.toISOString(),
          "2028-01-31T22:00:00.000Z",
        );
        assert.equal(
          await db.dailyOperation.count({
            where: { notes: { contains: trip.id } },
          }),
          1,
        );
        assert.equal(
          Number(
            (
              await db.clientTransaction.findFirstOrThrow({
                where: { notes: { contains: trip.id } },
              })
            ).debit,
          ),
          500,
        );
        input = { ...input, companyIds: [client.id], newCompanies: [] };
      },
    );
    let exported: any[] = [];
    await t.test(
      "export/reupload preserves IDs, extra source columns, prices and makes no duplicate trips",
      async () => {
        const r = await fetch(
          base +
            `/trips/excel/export?startDate=2028-02-01&endDate=2028-02-02&companyIds=${client.id}`,
          { headers: { Authorization: "Bearer " + tokens.ADMIN } },
        );
        assert.equal(r.status, 200);
        const buffer = Buffer.from(await r.arrayBuffer());
        const wb = XLSX.read(buffer);
        exported = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        assert.equal(exported[0]["معرف الرحلة"], trip.id);
        assert.equal(exported[0]["تم التأكيد"], false);
        assert.equal(exported[0]["ترتيب 1"], 24);
        const p = await good("/trips/excel/preview", {
          ...input,
          fileContent: buffer.toString("base64"),
        });
        assert.equal(p.unchanged, 1);
        assert.equal(p.created, 0);
        assert.equal(p.deleted, 0);
        await good("/trips/excel/commit", {
          batchId: p.batchId,
          confirm: true,
        });
        assert.equal(
          await db.trip.count({ where: { clientId: client.id } }),
          1,
        );
        const view = await good("/trips/" + trip.id, undefined, "VIEWER");
        assert.equal(view.importMetadata, undefined);
        assert.equal(view.saleAmount, undefined);
        const limited = await fetch(
          base +
            `/trips/excel/export?startDate=2028-02-01&endDate=2028-02-02&companyIds=${client.id}`,
          { headers: { Authorization: "Bearer " + tokens.VIEWER } },
        );
        assert.equal(limited.status, 200);
        const limitedBook = XLSX.read(Buffer.from(await limited.arrayBuffer()));
        const limitedRows: any[] = XLSX.utils.sheet_to_json(
          limitedBook.Sheets[limitedBook.SheetNames[0]],
        );
        assert.equal(limitedRows[0]["سعر العميل"], undefined);
        assert.equal(limitedRows[0]["أجر الدورة"], undefined);
        assert.equal(limitedRows[0]["تم التأكيد"], undefined);
      },
    );
    await t.test(
      "replace edits and deletes inside the selected scope, preserves outside range/company and cash credits",
      async () => {
        const second = { ...row, التاريخ: "2028-02-02" };
        const p = await good("/trips/excel/preview", {
          ...input,
          fileContent: excel([...exported, second]),
        });
        await good("/trips/excel/commit", {
          batchId: p.batchId,
          confirm: true,
        });
        await db.clientTransaction.create({
          data: {
            companyName: company,
            date: new Date("2028-02-03"),
            description: "Actual receipt",
            debit: 0,
            credit: 50,
            balance: 950,
          },
        });
        const beforeCash = await db.treasuryEntry.count();
        const other = await db.trip.create({
          data: {
            clientId: client.id,
            routeId: trip.routeId,
            driverId: driver.id,
            vehicleId: vehicle.id,
            tripNumber: "OUTSIDE-" + suffix,
            tripDate: new Date("2028-03-01"),
            shift: "MORNING",
            scheduledDeparture: new Date("2028-03-01T05:00Z"),
            expectedArrival: new Date("2028-03-01T06:00Z"),
          },
        });
        const p2 = await good("/trips/excel/preview", {
          ...input,
          fileContent: excel([{ ...exported[0], "سعر العميل": 700 }]),
        });
        assert.equal(p2.updated, 1);
        assert.equal(p2.deleted, 1);
        await good("/trips/excel/commit", {
          batchId: p2.batchId,
          confirm: true,
        });
        assert.equal(
          Number(
            (await db.trip.findUniqueOrThrow({ where: { id: trip.id } }))
              .saleAmount,
          ),
          700,
        );
        assert.ok(await db.trip.findUnique({ where: { id: other.id } }));
        assert.equal(await db.treasuryEntry.count(), beforeCash);
        const ledger = await db.clientTransaction.findMany({
          where: { companyName: company },
          orderBy: { date: "asc" },
        });
        assert.equal(ledger.length, 2);
        assert.equal(Number(ledger[1].credit), 50);
        assert.equal(Number(ledger[1].balance), 650);
      },
    );
    await t.test(
      "changed source data invalidates preview; duplicate rows and conflicts roll back all creations",
      async () => {
        const p = await good("/trips/excel/preview", {
          ...input,
          fileContent: excel([{ ...exported[0], "سعر العميل": 800 }]),
        });
        await db.trip.update({
          where: { id: trip.id },
          data: { notes: "concurrent edit" },
        });
        assert.equal(
          (
            await call("/trips/excel/commit", {
              batchId: p.batchId,
              confirm: true,
            })
          ).status,
          409,
        );
        const badCompany = "Rollback " + suffix;
        const bad = { ...row, الشركة: badCompany };
        assert.equal(
          (
            await call("/trips/excel/preview", {
              ...input,
              newCompanies: [badCompany],
              companyIds: [],
              fileContent: excel([bad, bad]),
            })
          ).status,
          422,
        );
        assert.equal(
          await db.client.count({ where: { companyName: badCompany } }),
          0,
        );
        const conflict = await call("/trips/excel/preview", {
          ...input,
          newCompanies: [badCompany],
          companyIds: [],
          fileContent: excel([bad]),
        });
        assert.equal(conflict.status, 422);
        assert.equal(
          await db.client.count({ where: { companyName: badCompany } }),
          0,
        );
      },
    );
    await t.test(
      "protected attendance and closed periods cannot be replaced; empty deletion needs explicit opt-in",
      async () => {
        const event = await db.tripEvent.create({
          data: {
            tripId: trip.id,
            type: "NOTE",
            description: "Protected history",
            actorId: "test",
          },
        });
        assert.equal(
          (
            await call("/trips/excel/preview", {
              ...input,
              fileContent: excel([{ ...exported[0], "سعر العميل": 900 }]),
            })
          ).status,
          422,
        );
        await db.tripEvent.delete({ where: { id: event.id } });
        await db.financialPeriod.upsert({
          where: { year_month: { year: 2028, month: 2 } },
          create: { year: 2028, month: 2, status: "CLOSED" },
          update: { status: "CLOSED" },
        });
        assert.equal(
          (
            await call("/trips/excel/preview", {
              ...input,
              fileContent: excel([{ ...exported[0], "سعر العميل": 900 }]),
            })
          ).status,
          422,
        );
        await db.financialPeriod.update({
          where: { year_month: { year: 2028, month: 2 } },
          data: { status: "OPEN" },
        });
        const empty = excel([], Object.keys(row));
        assert.equal(
          (await call("/trips/excel/preview", { ...input, fileContent: empty }))
            .status,
          422,
        );
        const p = await good("/trips/excel/preview", {
          ...input,
          fileContent: empty,
          allowEmpty: true,
        });
        assert.equal(p.deleted, 1);
        assert.equal(p.created, 0);
      },
    );
    await t.test(
      "out-of-range workbook rows do not broaden selected dates; foreign trip IDs are rejected",
      async () => {
        const p = await good("/trips/excel/preview", {
          ...input,
          mode: "MERGE",
          fileContent: excel([
            { ...row, التاريخ: "2028-02-04" },
            { ...row, التاريخ: "2028-02-02" },
          ]),
        });
        assert.equal(p.skipped, 1);
        assert.equal(p.created, 1);
        assert.equal(p.deleted, 0);
        assert.equal(
          (
            await call("/trips/excel/preview", {
              ...input,
              fileContent: excel([{ ...row, "معرف الرحلة": randomUUID() }]),
            })
          ).status,
          422,
        );
      },
    );
    await t.test(
      "replacement cannot reduce driver wages below already paid or offset earnings",
      async () => {
        const payment = await db.driverAccountingEntry.create({
          data: {
            driverId: driver.id,
            driverName: driver.fullName,
            month: 2,
            year: 2028,
            kind: "PAYMENT",
            amount: 90,
            date: new Date("2028-02-02"),
            reference: "Test payment",
            actorId: "test",
            requestKey: randomUUID(),
            fingerprint: "test",
          },
        });
        const result = await call("/trips/excel/preview", {
          ...input,
          fileContent: excel([{ ...exported[0], "أجر الدورة": 50 }]),
        });
        assert.equal(result.status, 422);
        assert.match(result.body.error.message, /المبالغ المصروفة/);
        assert.equal(
          Number(
            (await db.trip.findUniqueOrThrow({ where: { id: trip.id } }))
              .driverAllowance,
          ),
          100,
        );
        assert.ok(
          await db.driverAccountingEntry.findUnique({
            where: { id: payment.id },
          }),
        );
        await db.driverAccountingEntry.delete({ where: { id: payment.id } });
      },
    );
  } finally {
    server.kill("SIGTERM");
    await db.$disconnect();
  }
});
