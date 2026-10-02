-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "billingModel" TEXT NOT NULL DEFAULT 'PER_TRIP',
ADD COLUMN     "monthlyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

