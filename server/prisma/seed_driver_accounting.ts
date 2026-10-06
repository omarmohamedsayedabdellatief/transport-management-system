import "dotenv/config";
import { prisma } from "../src/prisma.js";
import { AccountingService } from "../src/modules/accounting/accounting.service.js";
import { recordDriverEntry } from "../src/modules/accounting/driver-settlements.js";
import { createHash } from "node:crypto";

if (process.env.DEMO_MODE !== "true" || process.env.NODE_ENV === "production")
  throw new Error("Requires an explicitly enabled local demo.");
const date = new Date().toLocaleDateString("en-CA", {
  timeZone: "Africa/Cairo",
});
const [year, month, day] = date.split("-").map(Number);
function key(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
try {
  const drivers = await prisma.driver.findMany({
    where: { fullName: { contains: "— تجريبي" }, supplierId: null },
    orderBy: { fullName: "asc" },
    take: 2,
  });
  if (!drivers.length) throw new Error("Run demo:showcase first.");
  const accountName = "خزينة عرض حسابات السائقين — تجريبي";
  const account =
    (await prisma.treasuryAccount.findUnique({
      where: { name: accountName },
    })) ||
    (await AccountingService.createTreasuryAccount({
      name: accountName,
      kind: "CASH",
      openingBalance: 10000,
      openingDate: date,
    }));
  for (const driver of drivers) {
    const tag = `[DriverAccountingDemo:${driver.id}:${year}:${month}]`;
    if (
      !(await prisma.dailyOperation.findFirst({
        where: { notes: { contains: tag } },
      }))
    ) {
      const amounts = AccountingService.calculateOperationFields({
        dailyRate: 900,
        tripCount: 4,
        driverDailyRate: 100,
        vehicleCost: 150,
      });
      await prisma.dailyOperation.create({
        data: {
          day,
          month,
          year,
          date: new Date(date),
          driverName: driver.fullName,
          routeName: "دورات إضافية لعرض الحسابات — تجريبي",
          companyName: "عميل عرض حسابات السائقين — تجريبي",
          notes: `${tag} بيانات وهمية لشرح أجر الدورات والدفعات والخصومات`,
          ...amounts,
        },
      });
    }
    if (
      !(await prisma.driverAccountingEntry.findUnique({
        where: { requestKey: key(`${tag}:payment`) },
      }))
    )
      await recordDriverEntry(
        {
          driverName: driver.fullName,
          month,
          year,
          date,
          amount: 100,
          accountId: account.id,
          reference: "دفعة تجريبية من أجر الدورات",
          actorId: "DEMO",
          requestKey: key(`${tag}:payment`),
        },
        "PAYMENT",
      );
    if (
      !(await prisma.driverAccountingEntry.findUnique({
        where: { requestKey: key(`${tag}:deduction`) },
      }))
    )
      await recordDriverEntry(
        {
          driverName: driver.fullName,
          month,
          year,
          date,
          amount: 25,
          reference: "خصم تجريبي لشرح كشف الحساب",
          actorId: "DEMO",
          requestKey: key(`${tag}:deduction`),
        },
        "DEDUCTION",
      );
  }
  console.log(
    `Driver accounting demo ready for ${drivers.length} drivers (${month}/${year}).`,
  );
} finally {
  await prisma.$disconnect();
}
