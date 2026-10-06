-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "billingTypeId" TEXT,
ADD COLUMN     "billingTypeName" TEXT,
ADD COLUMN     "returnDeparture" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" TYPE TEXT USING "vehicle_type"::text;

-- CreateTable
CREATE TABLE "VehicleCategory" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleCategory_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "TripBillingType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripBillingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteRate" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "billingTypeId" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "returnDepartureTime" TEXT,
    "saleAmount" DECIMAL(12,2) NOT NULL,
    "costAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "driverAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vehicleCost" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "RouteRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCategory_name_key" ON "VehicleCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TripBillingType_name_key" ON "TripBillingType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RouteRate_routeId_billingTypeId_key" ON "RouteRate"("routeId", "billingTypeId");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_billingTypeId_fkey" FOREIGN KEY ("billingTypeId") REFERENCES "TripBillingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRate" ADD CONSTRAINT "RouteRate_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRate" ADD CONSTRAINT "RouteRate_billingTypeId_fkey" FOREIGN KEY ("billingTypeId") REFERENCES "TripBillingType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve all existing vehicle types and initialize configurable defaults.
INSERT INTO "VehicleCategory" (code,name) VALUES
('BUS_50_SEATER','باص 50 راكب'),('MINIBUS_30_SEATER','ميني باص 30 راكب'),
('VAN_14_SEATER','ميكروباص 14 راكب'),('SEDAN','سيارة سيدان'),('OTHER','أخرى');
INSERT INTO "TripBillingType" (id,name,direction) VALUES
('10000000-0000-4000-a000-000000000001','ذهاب','OUTBOUND'),
('10000000-0000-4000-a000-000000000002','عودة','RETURN'),
('10000000-0000-4000-a000-000000000003','ذهاب وعودة','BOTH');
INSERT INTO "RouteRate" (id,"routeId","billingTypeId","departureTime","saleAmount","costAmount","driverAllowance","vehicleCost")
SELECT id || '-outbound', id, '10000000-0000-4000-a000-000000000001', '07:00',client_price_per_trip,supplier_cost_per_trip,driver_trip_allowance,vehicle_rental_cost FROM routes;
UPDATE trips SET "billingTypeId"= CASE direction WHEN 'RETURN' THEN '10000000-0000-4000-a000-000000000002' WHEN 'BOTH' THEN '10000000-0000-4000-a000-000000000003' ELSE '10000000-0000-4000-a000-000000000001' END,
"billingTypeName"= CASE direction WHEN 'RETURN' THEN 'عودة' WHEN 'BOTH' THEN 'ذهاب وعودة' ELSE 'ذهاب' END;
