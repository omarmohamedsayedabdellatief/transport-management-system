import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
if (process.env.DEMO_MODE !== "true" || process.env.NODE_ENV === "production")
  throw new Error(
    "This fixture requires DEMO_MODE=true and a non-production environment.",
  );
try {
  const client = await db.client.findUniqueOrThrow({
    where: { id: "00000000-0000-0000-0000-000000000001" },
  });
  const supplier = await db.partner.upsert({
    where: { id: "00000000-0000-0000-0000-000000000101" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000101",
      name: "النور لخدمات النقل — مثال",
      kind: "TRANSPORT",
      contactName: "مسؤول التشغيل",
      notes: "بيانات توضيحية وليست موردًا حقيقيًا",
    },
  });
  const employer = await db.partner.upsert({
    where: { id: "00000000-0000-0000-0000-000000000102" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000102",
      name: "كوادر للتوظيف — مثال",
      kind: "STAFFING",
      notes: "بيانات توضيحية",
    },
  });
  const site = await db.site.upsert({
    where: { id: "00000000-0000-0000-0000-000000000103" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000103",
      name: "مصنع العاشر من رمضان — مثال",
      clientId: client.id,
      address: "المنطقة الصناعية",
    },
  });
  const route = await db.route.upsert({
    where: { id: "00000000-0000-0000-0000-000000000104" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000104",
      routeName: "مصر الجديدة ← العاشر من رمضان",
      clientId: client.id,
      startLocation: "ميدان الحجاز",
      finalDestination: "مصنع العاشر من رمضان",
      estimatedDistanceKm: 45,
      estimatedDurationMin: 70,
      stops: {
        create: [
          { stopOrder: 1, stopName: "ميدان الحجاز", pickupTimeOffsetMin: 0 },
          { stopOrder: 2, stopName: "جسر السويس", pickupTimeOffsetMin: 15 },
        ],
      },
    },
  });
  const vehicle = await db.vehicle.findUniqueOrThrow({
    where: { plateNumber: "TRN-2002" },
  });
  const driver = await db.driver.findUniqueOrThrow({
    where: { nationalId: "29107081500319" },
  });
  await db.vehicle.update({
    where: { id: vehicle.id },
    data: { supplierId: supplier.id },
  });
  await db.driver.update({
    where: { id: driver.id },
    data: { supplierId: supplier.id },
  });
  const contract = await db.contract.findUniqueOrThrow({
    where: { contractNumber: "CTR-2026-APX01" },
  });
  for (const [index, name] of [
    "أحمد محمود — مثال",
    "سارة حسن — مثال",
    "عمر علي — مثال",
    "مريم إبراهيم — مثال",
  ].entries()) {
    const passenger = await db.passenger.upsert({
      where: {
        clientId_employeeCode: {
          clientId: client.id,
          employeeCode: "DEMO-" + (index + 1),
        },
      },
      update: {},
      create: {
        employeeCode: "DEMO-" + (index + 1),
        fullName: name,
        clientId: client.id,
        employerId: index > 1 ? employer.id : null,
        siteId: site.id,
        notes: "راكب توضيحي للتجربة",
      },
    });
    if (
      !(await db.enrollment.findFirst({
        where: { passengerId: passenger.id, routeId: route.id },
      }))
    )
      await db.enrollment.create({
        data: {
          passengerId: passenger.id,
          routeId: route.id,
          stopName: index % 2 ? "جسر السويس" : "ميدان الحجاز",
          direction: "BOTH",
          shift: "MORNING",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-12-31"),
        },
      });
  }
  for (const direction of ["OUTBOUND", "RETURN"]) {
    const scheduleId =
      direction === "OUTBOUND"
        ? "00000000-0000-0000-0000-000000000105"
        : "00000000-0000-0000-0000-000000000106";
    await db.servicePlan.upsert({
      where: { id: scheduleId },
      update: {},
      create: {
        id: scheduleId,
        name:
          direction === "OUTBOUND"
            ? "وردية المصنع — الذهاب"
            : "وردية المصنع — العودة",
        routeId: route.id,
        contractId: contract.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        supplierId: supplier.id,
        direction,
        shift: "MORNING",
        departureTime: direction === "OUTBOUND" ? "06:00" : "17:00",
        durationMinutes: 70,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-12-31"),
        saleRate: 900,
        supplierRate: 550,
      },
    });
  }
  console.log(
    "Illustrative partners, passengers, enrollments, and schedules are ready.",
  );
} finally {
  await db.$disconnect();
}
