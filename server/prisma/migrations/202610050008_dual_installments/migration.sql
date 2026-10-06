ALTER TABLE "installments"
  ADD COLUMN "driverId" TEXT,
  ADD COLUMN "driverName" TEXT,
  ADD COLUMN "driverDueDate" DATE,
  ADD COLUMN "driverAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
CREATE TABLE "InstallmentPayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "installmentId" TEXT NOT NULL REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('BANK', 'DRIVER_CASH', 'DRIVER_OFFSET')),
  "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" > 0),
  "date" DATE NOT NULL,
  "reference" TEXT NOT NULL,
  "notes" TEXT,
  "actorId" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL UNIQUE,
  "fingerprint" TEXT NOT NULL,
  "treasuryEntryId" TEXT UNIQUE,
  "driverEntryId" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InstallmentPayment_installmentId_kind_idx" ON "InstallmentPayment"("installmentId", "kind");
CREATE INDEX "InstallmentPayment_date_idx" ON "InstallmentPayment"("date");
-- Historical client amounts are deliberately retained. They cannot be attributed
-- to a driver or treated as collected without an explicit recorded transaction.
