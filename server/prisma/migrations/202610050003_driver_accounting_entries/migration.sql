CREATE TABLE "DriverAccountingEntry" (
  "id" TEXT NOT NULL,
  "driverId" TEXT,
  "driverName" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('PAYMENT', 'DEDUCTION')),
  "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" > 0),
  "date" DATE NOT NULL,
  "reference" TEXT NOT NULL,
  "notes" TEXT,
  "actorId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "treasuryEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverAccountingEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DriverAccountingEntry_month_check" CHECK ("month" BETWEEN 1 AND 12)
);
CREATE UNIQUE INDEX "DriverAccountingEntry_requestKey_key" ON "DriverAccountingEntry"("requestKey");
CREATE UNIQUE INDEX "DriverAccountingEntry_treasuryEntryId_key" ON "DriverAccountingEntry"("treasuryEntryId");
CREATE INDEX "DriverAccountingEntry_driverName_year_month_idx" ON "DriverAccountingEntry"("driverName", "year", "month");
INSERT INTO "DriverAccountingEntry" ("id", "driverId", "driverName", "month", "year", "kind", "amount", "date", "reference", "notes", "actorId", "requestKey", "fingerprint", "treasuryEntryId")
SELECT 'legacy-' || s."id", s."driver_id", s."driver_name", s."month", s."year", 'PAYMENT',
       COALESCE(t."amount", s."netPayable"), COALESCE(t."date", s."paid_at"::date, s."updated_at"::date),
       COALESCE(t."reference", 'دفعة سائق سابقة'), s."notes", COALESCE(t."actorId", 'SYSTEM'),
       'LEGACY_DRIVER_' || s."id", 'legacy', t."id"
FROM "driver_settlements" s LEFT JOIN "TreasuryEntry" t ON t."id" = s."payment_transaction_id"
WHERE s."status" = 'PAID' AND COALESCE(t."amount", s."netPayable") > 0;
