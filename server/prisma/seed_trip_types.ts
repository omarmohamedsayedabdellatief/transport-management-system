import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
if (process.env.DEMO_MODE !== "true" || process.env.NODE_ENV === "production")
  throw new Error("Local demo only.");
const db = new PrismaClient();
try {
  await db.user.upsert({
    where: { email: "accountant@tms.com" },
    update: {},
    create: {
      email: "accountant@tms.com",
      fullName: "محاسب تجريبي",
      role: "ACCOUNTANT",
      passwordHash: await bcrypt.hash("accountant123456", 10),
    },
  });
  const routes = await db.route.findMany({
    where: { routeName: { contains: "تجريبي" } },
    include: { servicePlans: true },
  });
  const types = await db.tripBillingType.findMany({
    where: {
      id: {
        in: [
          "10000000-0000-4000-a000-000000000001",
          "10000000-0000-4000-a000-000000000002",
        ],
      },
    },
  });
  for (const route of routes) {
    const plan = route.servicePlans[0];
    const base = Number(plan?.saleRate || 900),
      cost = Number(plan?.supplierRate || 0);
    for (const type of types) {
      const ret = type.direction === "RETURN";
      const data = {
        departureTime: ret ? "17:00" : "07:00",
        returnDepartureTime: null,
        saleAmount: ret ? base + 50 : base,
        costAmount: cost,
        driverAllowance: cost ? 0 : 75,
        vehicleCost: cost ? 0 : 150,
      };
      const existing = await db.routeRate.findUnique({
        where: {
          routeId_billingTypeId: { routeId: route.id, billingTypeId: type.id },
        },
      });
      if (!existing)
        await db.routeRate.create({
          data: { routeId: route.id, billingTypeId: type.id, ...data },
        });
      else if (
        Number(existing.saleAmount) === 0 &&
        existing.id.endsWith("-outbound")
      )
        await db.routeRate.update({ where: { id: existing.id }, data });
    }
  }
  console.log(
    `Demo billing options configured for ${routes.length} routes; accountant demo account available.`,
  );
} finally {
  await db.$disconnect();
}
