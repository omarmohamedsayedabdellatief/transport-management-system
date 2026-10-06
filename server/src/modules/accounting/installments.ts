import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { ConflictError, ValidationError } from "../../types/index.js";
import { driverSettlements } from "./driver-settlements.js";

const money = z
  .number()
  .finite()
  .min(0)
  .max(9999999999.99)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.0001,
    "استخدم منزلتين عشريتين فقط.",
  );
const text = z.string().trim().min(1).max(250);
const cents = (n: any) => Math.round(Number(n || 0) * 100);
const round = (n: number) => Math.round(n * 100) / 100;
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function installmentView(row: any) {
  const payments: any[] = row.payments || [];
  const bankPayments = payments.filter((p) => p.kind === "BANK");
  const bankPaid = bankPayments.length
    ? bankPayments.reduce((s, p) => s + cents(p.amount), 0) / 100
    : row.status === "PAID"
      ? Number(row.bankAmount)
      : 0;
  const driverCash =
    payments
      .filter((p) => p.kind === "DRIVER_CASH")
      .reduce((s, p) => s + cents(p.amount), 0) / 100;
  const driverOffset =
    payments
      .filter((p) => p.kind === "DRIVER_OFFSET")
      .reduce((s, p) => s + cents(p.amount), 0) / 100;
  const driverRemaining = round(
    Number(row.driverAmount || 0) - driverCash - driverOffset,
  );
  const bankRemaining = round(Number(row.bankAmount) - bankPaid);
  return {
    ...row,
    bankPaid,
    bankRemaining,
    driverCash,
    driverOffset,
    driverSettled: round(driverCash + driverOffset),
    driverRemaining,
    bankStatus:
      bankRemaining <= 0 ? "PAID" : bankPaid > 0 ? "PARTIAL" : "PENDING",
    driverStatus:
      Number(row.driverAmount) <= 0
        ? "NONE"
        : driverRemaining <= 0
          ? "PAID"
          : driverCash + driverOffset > 0
            ? "PARTIAL"
            : "PENDING",
    bankOverdue:
      bankRemaining > 0 &&
      new Date(row.bankDueDate).toISOString().slice(0, 10) < today(),
    driverOverdue:
      driverRemaining > 0 &&
      row.driverDueDate &&
      new Date(row.driverDueDate).toISOString().slice(0, 10) < today(),
  };
}
export async function createInstallment(raw: unknown) {
  const d = z
    .object({
      category: z.enum(["VEHICLE", "PROPERTY_OFFICE"]).default("VEHICLE"),
      assetName: text,
      vehiclePlate: z.string().trim().optional(),
      installmentNumber: z.number().int().positive(),
      bankDueDate: z.string().date(),
      bankAmount: money.refine((n) => n > 0),
      bankName: text,
      driverId: z.string().uuid().optional(),
      driverAmount: money.default(0),
      driverDueDate: z.string().date().optional(),
      chequeNumber: z.string().trim().max(100).optional(),
      notes: z.string().trim().max(2000).optional(),
      status: z.literal("PENDING").optional(),
    })
    .parse(raw);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
    if (d.category === "VEHICLE") {
      if (
        !d.vehiclePlate ||
        !(await tx.vehicle.findUnique({
          where: { plateNumber: d.vehiclePlate },
        }))
      )
        throw new ValidationError("اختر سيارة مسجلة للقسط.");
    }
    if (
      d.driverAmount > 0 &&
      (!d.driverId || !d.driverDueDate || d.category !== "VEHICLE")
    )
      throw new ValidationError("اختر السائق وتاريخ استحقاق قسط السيارة.");
    const driver =
      d.driverAmount > 0
        ? await tx.driver.findUnique({ where: { id: d.driverId! } })
        : null;
    if (d.driverAmount > 0 && (!driver || driver.supplierId))
      throw new ValidationError("اختر سائق شركة مسجلًا.");
    const dates = [
      new Date(d.bankDueDate),
      ...(d.driverAmount > 0 ? [new Date(d.driverDueDate!)] : []),
    ];
    await checkPeriods(tx, dates);
    return installmentView(
      await tx.installment.create({
        data: {
          ...d,
          driverId: driver?.id || null,
          driverName: driver?.fullName || null,
          driverDueDate: driver ? new Date(d.driverDueDate!) : null,
          bankDueDate: new Date(d.bankDueDate),
          status: "PENDING",
          margin: driver ? round(d.driverAmount - d.bankAmount) : null,
        },
        include: { payments: true },
      }),
    );
  });
}
async function checkPeriods(tx: Prisma.TransactionClient, dates: Date[]) {
  if (
    await tx.financialPeriod.count({
      where: {
        status: "CLOSED",
        OR: dates.map((d) => ({
          year: d.getUTCFullYear(),
          month: d.getUTCMonth() + 1,
        })),
      },
    })
  )
    throw new ConflictError("الفترة المالية مغلقة.");
}
const paymentSchema = z.object({
  installmentId: z.string().uuid(),
  kind: z.enum(["BANK", "DRIVER_CASH", "DRIVER_OFFSET"]),
  amount: money.refine((n) => n > 0),
  date: z.string().date(),
  accountId: z.string().uuid().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2200).optional(),
  reference: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(2000).default(""),
  requestKey: z.string().uuid(),
  actorId: z.string().min(1),
});
export async function recordInstallmentPayment(raw: unknown) {
  const d = paymentSchema.parse(raw);
  if (d.date > today())
    throw new ValidationError(
      "لا يمكن تسجيل تحصيل أو سداد فعلي بتاريخ مستقبلي.",
    );
  if (d.kind !== "DRIVER_OFFSET" && !d.accountId)
    throw new ValidationError("اختر الخزينة أو الحساب البنكي.");
  if (d.kind === "DRIVER_OFFSET" && (!d.month || !d.year || d.accountId))
    throw new ValidationError(
      "اختر شهر وسنة المستحقات؛ الخصم لا يحتاج حساب خزينة.",
    );
  const fingerprint = JSON.stringify(d);
  return prisma.$transaction(
    async (tx) => {
      // Same lock as driver payouts: collection/offset and wage payment cannot race.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
      const existing = await tx.installmentPayment.findUnique({
        where: { requestKey: d.requestKey },
      });
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new ConflictError("تم استخدام رقم الطلب بتفاصيل مختلفة.");
        return {
          payment: existing,
          installment: installmentView(
            await tx.installment.findUniqueOrThrow({
              where: { id: existing.installmentId },
              include: { payments: true },
            }),
          ),
        };
      }
      const row = await tx.installment.findUniqueOrThrow({
        where: { id: d.installmentId },
        include: { payments: true },
      });
      const view = installmentView(row);
      const remaining =
        d.kind === "BANK" ? view.bankRemaining : view.driverRemaining;
      if (cents(d.amount) > cents(remaining))
        throw new ValidationError(`المبلغ أكبر من المتبقي (${remaining} ج.م).`);
      const date = new Date(d.date);
      await checkPeriods(tx, [
        date,
        ...(d.kind === "DRIVER_OFFSET"
          ? [new Date(Date.UTC(d.year!, d.month! - 1, 1))]
          : []),
      ]);
      const reference =
        d.reference ||
        `${d.kind === "BANK" ? "سداد للبنك" : d.kind === "DRIVER_CASH" ? "تحصيل من السائق" : "خصم من مستحقات السائق"} — قسط ${row.installmentNumber} — ${row.vehiclePlate || row.assetName} — ${d.kind === "BANK" ? row.bankName : row.driverName}`;
      let treasuryEntryId: string | null = null,
        driverEntryId: string | null = null;
      if (d.kind === "DRIVER_OFFSET") {
        const driver = await tx.driver.findUnique({
          where: { id: row.driverId! },
        });
        if (!driver || driver.supplierId)
          throw new ValidationError("السائق غير متاح لخصم المستحقات.");
        if (
          (await tx.driver.count({
            where: { fullName: driver.fullName, supplierId: null },
          })) !== 1
        )
          throw new ValidationError("يجب تمييز اسم السائق قبل تسوية مستحقاته.");
        const balances = await driverSettlements(
          { year: d.year, month: d.month },
          tx,
        );
        const available =
          balances.find((b) => b.driverName === driver.fullName)?.netPayable ||
          0;
        if (cents(d.amount) > cents(available))
          throw new ValidationError(
            `مستحقات السائق المتاحة للخصم ${available} ج.م فقط.`,
          );
        const entry = await tx.driverAccountingEntry.create({
          data: {
            driverId: driver.id,
            driverName: driver.fullName,
            month: d.month!,
            year: d.year!,
            kind: "INSTALLMENT_OFFSET",
            amount: d.amount,
            date,
            reference,
            notes: d.notes,
            actorId: d.actorId,
            requestKey: `INSTALLMENT_OFFSET:${d.requestKey}`,
            fingerprint,
          },
        });
        driverEntryId = entry.id;
      } else {
        await tx.$queryRaw`SELECT id FROM "TreasuryAccount" WHERE id=${d.accountId!} FOR UPDATE`;
        const account = await tx.treasuryAccount.findUnique({
          where: { id: d.accountId! },
        });
        if (!account?.active || account.currency !== "EGP")
          throw new ValidationError("اختر حسابًا نشطًا بالجنيه المصري.");
        if (date < account.openingDate)
          throw new ValidationError("تاريخ الحركة يسبق افتتاح الحساب.");
        if (d.kind === "BANK") {
          const ledger = await tx.treasuryEntry.findMany({
            where: { accountId: account.id },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }],
          });
          let balance = 0,
            applied = false;
          for (const e of ledger) {
            if (!applied && e.date > date) {
              balance -= cents(d.amount);
              applied = true;
              if (balance < 0)
                throw new ConflictError(
                  "رصيد الخزينة غير كافٍ في تاريخ السداد.",
                );
            }
            balance +=
              e.kind === "OUT"
                ? -cents(e.amount)
                : e.kind === "IN"
                  ? cents(e.amount)
                  : cents(e.amount);
            if (applied && balance < 0)
              throw new ConflictError("السداد بأثر رجعي يؤدي إلى رصيد سالب.");
          }
          if (!applied) balance -= cents(d.amount);
          if (balance < 0) throw new ConflictError("رصيد الخزينة غير كافٍ.");
        }
        const entry = await tx.treasuryEntry.create({
          data: {
            accountId: account.id,
            date,
            amount: d.amount,
            kind: d.kind === "BANK" ? "OUT" : "IN",
            reference,
            notes: d.notes,
            actorId: d.actorId,
            requestKey: `INSTALLMENT:${d.requestKey}`,
            fingerprint,
            sourceKey: `INSTALLMENT:${row.id}:${d.requestKey}`,
          },
        });
        treasuryEntryId = entry.id;
      }
      const payment = await tx.installmentPayment.create({
        data: {
          installmentId: row.id,
          kind: d.kind,
          amount: d.amount,
          date,
          reference,
          notes: d.notes,
          actorId: d.actorId,
          requestKey: d.requestKey,
          fingerprint,
          treasuryEntryId,
          driverEntryId,
        },
      });
      if (d.kind === "BANK")
        await tx.installment.update({
          where: { id: row.id },
          data: {
            status:
              cents(view.bankRemaining) === cents(d.amount)
                ? "PAID"
                : "PARTIAL",
          },
        });
      return {
        payment,
        installment: installmentView(
          await tx.installment.findUniqueOrThrow({
            where: { id: row.id },
            include: { payments: { orderBy: { createdAt: "desc" } } },
          }),
        ),
      };
    },
    { timeout: 20000 },
  );
}
