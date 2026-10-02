-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATIONS_MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('MONTHLY_FIXED', 'PER_TRIP', 'PER_KM', 'HYBRID');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('BUS_50_SEATER', 'MINIBUS_30_SEATER', 'VAN_14_SEATER', 'SEDAN', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "DutyStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ON_DUTY', 'OFF_DUTY', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DRIVING_LICENSE', 'NATIONAL_ID', 'MEDICAL_CERTIFICATE', 'CRIMINAL_RECORD', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('OIL_CHANGE', 'TIRES', 'ENGINE', 'MECHANICAL_REPAIR', 'ELECTRICAL_REPAIR', 'PERIODIC_INSPECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "tax_id" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "contract_number" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigned_vehicle_count" INTEGER NOT NULL DEFAULT 1,
    "pricing_model" "PricingModel" NOT NULL DEFAULT 'MONTHLY_FIXED',
    "monthly_value" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "manufacturing_year" INTEGER NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "current_mileage" INTEGER NOT NULL DEFAULT 0,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "insurance_expiry" DATE NOT NULL,
    "license_expiry" DATE NOT NULL,
    "inspection_expiry" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "national_id" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "license_expiration_date" DATE NOT NULL,
    "employment_status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "duty_status" "DutyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "assigned_vehicle_id" TEXT,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" TEXT,
    "issue_date" DATE,
    "expiry_date" DATE,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_vehicles" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "contract_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "route_name" TEXT NOT NULL,
    "start_location" TEXT NOT NULL,
    "final_destination" TEXT NOT NULL,
    "estimated_distance_km" DECIMAL(8,2) NOT NULL,
    "estimated_duration_min" INTEGER NOT NULL,
    "default_vehicle_id" TEXT,
    "default_driver_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "stop_order" INTEGER NOT NULL,
    "stop_name" TEXT NOT NULL,
    "pickup_time_offset_min" INTEGER NOT NULL DEFAULT 0,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "notes" TEXT,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "trip_number" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "trip_date" DATE NOT NULL,
    "shift" "ShiftType" NOT NULL,
    "scheduled_departure" TIMESTAMP(3) NOT NULL,
    "expected_arrival" TIMESTAMP(3) NOT NULL,
    "actual_departure" TIMESTAMP(3),
    "actual_arrival" TIMESTAMP(3),
    "trip_status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "maintenance_type" "MaintenanceType" NOT NULL,
    "service_date" DATE NOT NULL,
    "completion_date" DATE,
    "cost" DECIMAL(10,2) NOT NULL,
    "mileage_at_service" INTEGER NOT NULL,
    "next_maintenance_date" DATE,
    "next_maintenance_mileage" INTEGER,
    "service_provider" TEXT,
    "downtime_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT NOT NULL,
    "invoice_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_operations" (
    "id" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "date" DATE,
    "driver_code" INTEGER,
    "driver_name" TEXT NOT NULL,
    "route_name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "branch" TEXT,
    "vehicle_type" TEXT,
    "daily_rate" DECIMAL(12,2) NOT NULL,
    "trip_count" DECIMAL(8,2) NOT NULL DEFAULT 1,
    "driver_daily_rate" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    "withholding_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "advance_payment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overtime" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_driver_pay" DECIMAL(12,2) NOT NULL,
    "daily_profit" DECIMAL(12,2) NOT NULL,
    "net_revenue" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "operation_type" TEXT NOT NULL DEFAULT 'ايراد',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_overtimes" (
    "id" TEXT NOT NULL,
    "day_of_week" TEXT,
    "date" DATE NOT NULL,
    "driver_name" TEXT NOT NULL,
    "vehicle_type" TEXT,
    "route_name" TEXT NOT NULL,
    "shift_description" TEXT,
    "shifts_count" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "shift_rate" DECIMAL(10,2) NOT NULL,
    "branch" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_overtimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "day" INTEGER,
    "month" INTEGER,
    "year" INTEGER,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "branch" TEXT,
    "vehicle_number" TEXT,
    "notes" TEXT,
    "operation_type" TEXT NOT NULL DEFAULT 'مصروف',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_payrolls" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "employee_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "basic_salary" DECIMAL(12,2) NOT NULL,
    "overtime" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "advances" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "penalties" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'VEHICLE',
    "asset_name" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "bank_due_date" DATE NOT NULL,
    "bank_amount" DECIMAL(12,2) NOT NULL,
    "client_due_date" DATE,
    "client_amount" DECIMAL(12,2),
    "margin" DECIMAL(12,2),
    "cheque_number" TEXT,
    "bank_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_transactions" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "document_number" TEXT,
    "description" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_national_id_key" ON "drivers"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_assigned_vehicle_id_key" ON "drivers"("assigned_vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_vehicles_contract_id_vehicle_id_key" ON "contract_vehicles"("contract_id", "vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_route_id_stop_order_key" ON "route_stops"("route_id", "stop_order");

-- CreateIndex
CREATE UNIQUE INDEX "trips_trip_number_key" ON "trips"("trip_number");

-- CreateIndex
CREATE INDEX "trips_trip_date_idx" ON "trips"("trip_date");

-- CreateIndex
CREATE INDEX "trips_scheduled_departure_expected_arrival_idx" ON "trips"("scheduled_departure", "expected_arrival");

-- CreateIndex
CREATE INDEX "daily_operations_year_month_idx" ON "daily_operations"("year", "month");

-- CreateIndex
CREATE INDEX "daily_operations_company_name_idx" ON "daily_operations"("company_name");

-- CreateIndex
CREATE INDEX "daily_operations_driver_name_idx" ON "daily_operations"("driver_name");

-- CreateIndex
CREATE INDEX "driver_overtimes_driver_name_idx" ON "driver_overtimes"("driver_name");

-- CreateIndex
CREATE INDEX "driver_overtimes_date_idx" ON "driver_overtimes"("date");

-- CreateIndex
CREATE INDEX "expenses_year_month_idx" ON "expenses"("year", "month");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "staff_payrolls_employee_name_idx" ON "staff_payrolls"("employee_name");

-- CreateIndex
CREATE INDEX "installments_category_idx" ON "installments"("category");

-- CreateIndex
CREATE INDEX "installments_bank_due_date_idx" ON "installments"("bank_due_date");

-- CreateIndex
CREATE INDEX "client_transactions_company_name_idx" ON "client_transactions"("company_name");

-- CreateIndex
CREATE INDEX "client_transactions_date_idx" ON "client_transactions"("date");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_assigned_vehicle_id_fkey" FOREIGN KEY ("assigned_vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_vehicles" ADD CONSTRAINT "contract_vehicles_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_vehicles" ADD CONSTRAINT "contract_vehicles_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_default_vehicle_id_fkey" FOREIGN KEY ("default_vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_default_driver_id_fkey" FOREIGN KEY ("default_driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

