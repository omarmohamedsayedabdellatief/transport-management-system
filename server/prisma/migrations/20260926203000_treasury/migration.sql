-- CreateTable
CREATE TABLE "TreasuryAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "bankName" TEXT,
    "reference" TEXT,
    "openingDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreasuryEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "kind" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "notes" TEXT,
    "actorId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "sourceKey" TEXT,
    "paymentId" TEXT,
    "transferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreasuryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryAccount_name_key" ON "TreasuryAccount"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryEntry_requestKey_key" ON "TreasuryEntry"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryEntry_sourceKey_key" ON "TreasuryEntry"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryEntry_paymentId_key" ON "TreasuryEntry"("paymentId");

-- CreateIndex
CREATE INDEX "TreasuryEntry_accountId_date_idx" ON "TreasuryEntry"("accountId", "date");

-- CreateIndex
CREATE INDEX "TreasuryEntry_transferId_idx" ON "TreasuryEntry"("transferId");

-- AddForeignKey
ALTER TABLE "TreasuryEntry" ADD CONSTRAINT "TreasuryEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TreasuryAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreasuryEntry" ADD CONSTRAINT "TreasuryEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

