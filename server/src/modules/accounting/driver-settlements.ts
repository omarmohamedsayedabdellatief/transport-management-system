import { installmentView } from "./installments.js";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { ConflictError, ValidationError } from "../../types/index.js";

type Db = Prisma.TransactionClient;
const cents = (value: any) => Math.round(Number(value || 0) * 100);
const round = (value: number) => Math.round(value * 100) / 100;

export async function driverSettlements(
  query: { month?: number; year?: number; companyName?: string },
  db: Db = prisma,
) {
  const year = query.year ? Number(query.year) : new Date().getFullYear();
  const month = query.month ? Number(query.month) : undefined;
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2200 ||
    (month !== undefined &&
      (!Number.isInteger(month) || month < 1 || month > 12))
  )
    throw new ValidationError("اختر فترة حساب صحيحة.");
  const from = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const to = new Date(Date.UTC(year, month || 12, 1));
  const [operations, overtime, entries, drivers, installments] =
    await Promise.all([
      db.dailyOperation.findMany({
        where: { year, ...(month ? { month } : {}) },
      }),
      db.driverOvertime.findMany({ where: { date: { gte: from, lt: to } } }),
      db.driverAccountingEntry.findMany({
        where: { year, ...(month ? { month } : {}) },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      db.driver.findMany({
        where: { supplierId: null },
        select: { id: true, fullName: true },
      }),
      db.installment.findMany({
        where: {
          driverAmount: { gt: 0 },
          OR: [
            { driverDueDate: { gte: from, lt: to } },
            { payments: { some: { date: { gte: from, lt: to }, kind: { in: ['DRIVER_CASH', 'DRIVER_OFFSET'] } } } },
          ],
        },
        include: { payments: true },
        orderBy: { driverDueDate: "asc" },
      }),
    ]);
  const names = new Set(drivers.map((d) => d.fullName.trim()));
  const map = new Map<string, any>();
  function row(name: string) {
    if (!map.has(name))
      map.set(name, {
        driverId: drivers.find((d) => d.fullName.trim() === name)?.id,
        driverCode: null,
        driverName: name,
        companyName: "-",
        companies: [],
        branch: "-",
        totalTrips: 0,
        totalBasePay: 0,
        totalOvertime: 0,
        totalDeductions: 0,
        totalAdvances: 0,
        totalPaid: 0,
        totalInstallmentOffsets: 0,
        driverInstallmentDue: 0,
        driverInstallmentRemaining: 0,
        driverInstallmentCash: 0,
        installments: [],
        netEarned: 0,
        netPayable: 0,
        companyBilling: 0,
        companyProfit: 0,
        entries: [],
        status: "PENDING",
        paidAt: null,
        paymentTransactionId: null,
      });
    return map.get(name);
  }
  for (const op of operations) {
    const name = op.driverName.trim();
    if (
      name.includes("[مورد:") ||
      op.notes?.includes("رحلة مورد") ||
      (!names.has(name) && !name.includes("سائق الشركة"))
    )
      continue;
    const item = row(name);
    item.driverCode ||= op.driverCode;
    if (!item.companies.includes(op.companyName))
      item.companies.push(op.companyName);
    item.companyName = item.companies.join("، ");
    item.branch = op.branch || item.branch;
    item.totalTrips += Number(op.tripCount);
    item.totalBasePay += Number(op.driverDailyRate) * Number(op.tripCount);
    item.totalOvertime += Number(op.overtime);
    item.totalDeductions += Number(op.deduction);
    item.totalAdvances += Number(op.advancePayment);
    item.companyBilling += Number(op.totalAmount);
    item.companyProfit += Number(op.netRevenue);
  }
  for (const ot of overtime) {
    const name = ot.driverName.trim();
    if (names.has(name) || map.has(name))
      row(name).totalOvertime += Number(ot.shiftsCount) * Number(ot.shiftRate);
  }
  for (const entry of entries) {
    const item = row(entry.driverName.trim());
    if (entry.kind === "PAYMENT") {
      item.totalPaid += Number(entry.amount);
      if (!item.paidAt) {
        item.paidAt = entry.date;
        item.paymentTransactionId = entry.treasuryEntryId;
      }
    } else if (entry.kind === "INSTALLMENT_OFFSET")
      item.totalInstallmentOffsets += Number(entry.amount);
    else item.totalDeductions += Number(entry.amount);
    item.entries.push(entry);
  }
  for (const installment of installments) {
    const name =
      drivers.find((d) => d.id === installment.driverId)?.fullName ||
      installment.driverName;
    if (!name) continue;
    const item = row(name.trim()),
      view = installmentView(installment);
    item.driverInstallmentDue += Number(installment.driverAmount);
    item.driverInstallmentRemaining += view.driverRemaining;
    item.driverInstallmentCash += view.driverCash;
    item.installments.push(view);
  }
  for (const item of map.values()) {
    for (const key of [
      "totalBasePay",
      "totalOvertime",
      "totalDeductions",
      "totalAdvances",
      "totalPaid",
      "totalInstallmentOffsets",
      "driverInstallmentDue",
      "driverInstallmentRemaining",
      "driverInstallmentCash",
    ])
      item[key] = round(item[key]);
    item.netEarned = round(
      item.totalBasePay +
        item.totalOvertime -
        item.totalDeductions -
        item.totalAdvances,
    );
    item.netPayable = round(
      item.netEarned - item.totalPaid - item.totalInstallmentOffsets,
    );
    item.status =
      item.netPayable <= 0
        ? "PAID"
        : item.totalPaid > 0
          ? "PARTIAL"
          : "PENDING";
  }
  // Company filtering selects whole driver balances; it must not subtract all payments from only one company's wages.
  return [...map.values()]
    .filter(
      (item) =>
        !query.companyName ||
        item.companies.some((name: string) =>
          name.toLowerCase().includes(query.companyName!.toLowerCase()),
        ),
    )
    .sort((a, b) => b.netPayable - a.netPayable);
}

const entrySchema = z.object({
  driverName: z.string().trim().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2200),
  amount: z
    .number()
    .finite()
    .positive()
    .max(9999999999.99)
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.0001,
      "استخدم منزلتين عشريتين فقط.",
    ),
  accountId: z.string().min(1).optional(),
  paymentDate: z.string().date().optional(),
  date: z.string().date().optional(),
  reference: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  requestKey: z.string().uuid().optional(),
  actorId: z.string().min(1),
});
export async function recordDriverEntry(
  raw: unknown,
  kind: "PAYMENT" | "DEDUCTION",
) {
  const parsed = entrySchema.safeParse(raw);
  if (!parsed.success)
    throw new ValidationError(
      "راجع السائق والفترة والمبلغ والتاريخ.",
      parsed.error.flatten(),
    );
  const data = parsed.data;
  if (kind === "DEDUCTION" && !data.reference)
    throw new ValidationError("اكتب سبب الخصم.");
  if (kind === "PAYMENT" && !data.accountId)
    throw new ValidationError("اختر خزينة لصرف الدفعة.");
  const date = new Date(
    data.paymentDate || data.date || new Date().toISOString().slice(0, 10),
  );
  const requestKey = data.requestKey || randomUUID();
  const fingerprint = JSON.stringify([
    kind,
    data.driverName,
    data.month,
    data.year,
    data.amount,
    data.accountId || null,
    date.toISOString(),
    data.reference || "",
    data.notes || "",
  ]);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
      const existing = await tx.driverAccountingEntry.findUnique({
        where: { requestKey },
      });
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new ConflictError("تم استخدام رقم الطلب لعملية أخرى.");
        return existing;
      }
      const periods = await tx.financialPeriod.count({
        where: {
          status: "CLOSED",
          OR: [
            { month: data.month, year: data.year },
            { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() },
          ],
        },
      });
      if (periods) throw new ConflictError("الفترة المالية مغلقة.");
      const drivers = await tx.driver.findMany({
        where: { fullName: data.driverName, supplierId: null },
        take: 2,
      });
      if (drivers.length !== 1)
        throw new ValidationError("اختر سائق شركة مسجلًا باسم مميز.");
      const balance = (
        await driverSettlements({ month: data.month, year: data.year }, tx)
      ).find((d) => d.driverName === data.driverName);
      if (cents(data.amount) > cents(balance?.netPayable))
        throw new ValidationError(
          `المبلغ أكبر من المتبقي للسائق (${balance?.netPayable || 0} ج.م).`,
        );
      const id = randomUUID();
      let treasuryEntryId: string | null = null;
      if (kind === "PAYMENT") {
        await tx.$queryRaw`SELECT id FROM "TreasuryAccount" WHERE id=${data.accountId!} FOR UPDATE`;
        const account = await tx.treasuryAccount.findUnique({
          where: { id: data.accountId! },
        });
        if (!account?.active || account.currency !== "EGP")
          throw new ValidationError("اختر خزينة نشطة بالجنيه المصري.");
        const totals = await tx.treasuryEntry.groupBy({
          by: ["kind"],
          where: { accountId: account.id },
          _sum: { amount: true },
        });
        const funds = totals.reduce(
          (sum, e) => sum + (e.kind === "IN" ? 1 : -1) * cents(e._sum.amount),
          0,
        );
        if (funds < cents(data.amount))
          throw new ValidationError("رصيد الخزينة غير كافٍ لصرف الدفعة.");
        const treasury = await tx.treasuryEntry.create({
          data: {
            accountId: account.id,
            date,
            amount: data.amount,
            kind: "OUT",
            reference:
              data.reference ||
              `دفعة للسائق ${data.driverName} عن ${data.month}/${data.year}`,
            notes: data.notes,
            actorId: data.actorId,
            requestKey: `DRIVER_PAYMENT_${requestKey}`,
            fingerprint,
            sourceKey: `DRIVER_PAYMENT:${id}`,
          },
        });
        treasuryEntryId = treasury.id;
      }
      return tx.driverAccountingEntry.create({
        data: {
          id,
          driverId: drivers[0].id,
          driverName: data.driverName,
          month: data.month,
          year: data.year,
          kind,
          amount: data.amount,
          date,
          reference: data.reference || "صرف دفعة للسائق",
          notes: data.notes,
          actorId: data.actorId,
          requestKey,
          fingerprint,
          treasuryEntryId,
        },
      });
    },
    { timeout: 20000 },
  );
}
