-- DropForeignKey
ALTER TABLE "trips" DROP CONSTRAINT "trips_contract_id_fkey";

-- AlterTable
ALTER TABLE "daily_operations" ADD COLUMN     "vehicle_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vehicle_plate" TEXT;

-- AlterTable
ALTER TABLE "installments" ADD COLUMN     "vehicle_plate" TEXT;

-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "client_price_per_trip" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "driver_trip_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "execution_type" TEXT NOT NULL DEFAULT 'COMPANY',
ADD COLUMN     "supplier_cost_per_trip" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "supplier_id" TEXT,
ADD COLUMN     "vehicle_rental_cost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "driver_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "execution_type" TEXT NOT NULL DEFAULT 'COMPANY',
ADD COLUMN     "vehicle_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "contract_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "supplier_transactions" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "supplier_name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "document_number" TEXT,
    "description" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_periods" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "notes" TEXT,
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_settlements" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT,
    "driver_name" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalTrips" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "baseTripPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overtimePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "advances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPayable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "payment_transaction_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_transactions_supplier_name_idx" ON "supplier_transactions"("supplier_name");

-- CreateIndex
CREATE INDEX "supplier_transactions_date_idx" ON "supplier_transactions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "financial_periods_year_month_key" ON "financial_periods"("year", "month");

-- CreateIndex
CREATE INDEX "driver_settlements_year_month_idx" ON "driver_settlements"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "driver_settlements_driver_name_month_year_key" ON "driver_settlements"("driver_name", "month", "year");

-- CreateIndex
CREATE INDEX "daily_operations_vehicle_plate_idx" ON "daily_operations"("vehicle_plate");

-- CreateIndex
CREATE INDEX "installments_vehicle_plate_idx" ON "installments"("vehicle_plate");

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

