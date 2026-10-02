-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'ACCOUNTANT';
ALTER TYPE "UserRole" ADD VALUE 'DRIVER';
ALTER TYPE "UserRole" ADD VALUE 'CLIENT';
ALTER TYPE "UserRole" ADD VALUE 'SUPPLIER';

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "billToClientId" TEXT;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "billToClientId" TEXT,
ADD COLUMN     "costAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
ADD COLUMN     "generationKey" TEXT,
ADD COLUMN     "saleAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "servicePlanId" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clientScopeId" TEXT,
ADD COLUMN     "driverScopeId" TEXT,
ADD COLUMN     "partnerScopeId" TEXT,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TRANSPORT',
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "clientId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "clientId" TEXT NOT NULL,
    "employerId" TEXT,
    "siteId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopName" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'BOTH',
    "shift" "ShiftType" NOT NULL DEFAULT 'MORNING',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "supplierId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "shift" "ShiftType" NOT NULL DEFAULT 'MORNING',
    "departureTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "weekdays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4]::INTEGER[],
    "excludedDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "saleRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "supplierRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPassenger" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "passengerName" TEXT NOT NULL,
    "employerName" TEXT NOT NULL,
    "stopName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EXPECTED',
    "recordedAt" TIMESTAMP(3),

    CONSTRAINT "TripPassenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripEvent" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceDocument" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "clientId" TEXT,
    "partnerId" TEXT,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dueDate" DATE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "total" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tripId" TEXT,
    "sourceKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "FinanceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "reference" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Passenger_clientId_employeeCode_key" ON "Passenger"("clientId", "employeeCode");

-- CreateIndex
CREATE INDEX "Enrollment_routeId_active_idx" ON "Enrollment"("routeId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "TripPassenger_tripId_passengerId_key" ON "TripPassenger"("tripId", "passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceDocument_number_key" ON "FinanceDocument"("number");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceLine_sourceKey_key" ON "FinanceLine"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_requestKey_key" ON "Payment"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "trips_generationKey_key" ON "trips"("generationKey");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_servicePlanId_fkey" FOREIGN KEY ("servicePlanId") REFERENCES "ServicePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPassenger" ADD CONSTRAINT "TripPassenger_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPassenger" ADD CONSTRAINT "TripPassenger_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEvent" ADD CONSTRAINT "TripEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceDocument" ADD CONSTRAINT "FinanceDocument_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLine" ADD CONSTRAINT "FinanceLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FinanceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLine" ADD CONSTRAINT "FinanceLine_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FinanceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

