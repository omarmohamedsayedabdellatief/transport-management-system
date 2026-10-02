import 'dotenv/config';
if(process.env.NODE_ENV==='production')throw new Error('Demo seeding is disabled in production.');
import { PrismaClient, UserRole, UserStatus, VehicleStatus, VehicleType, EmploymentStatus, DutyStatus, ClientStatus, ContractStatus, PricingModel, ShiftType, TripStatus, MaintenanceType, MaintenanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Users
  const passwordHash = await bcrypt.hash('admin123456', 10);
  const opsPasswordHash = await bcrypt.hash('ops123456', 10);
  const viewerPasswordHash = await bcrypt.hash('viewer123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tms.com' },
    update: {},
    create: {
      email: 'admin@tms.com',
      passwordHash,
      fullName: 'System Administrator',
      phone: '+201000000001',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const opsManager = await prisma.user.upsert({
    where: { email: 'ops@tms.com' },
    update: {},
    create: {
      email: 'ops@tms.com',
      passwordHash: opsPasswordHash,
      fullName: 'Operations Manager',
      phone: '+201000000002',
      role: UserRole.OPERATIONS_MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@tms.com' },
    update: {},
    create: {
      email: 'viewer@tms.com',
      passwordHash: viewerPasswordHash,
      fullName: 'Auditor / Viewer',
      phone: '+201000000003',
      role: UserRole.VIEWER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ Seeded users: admin@tms.com, ops@tms.com, viewer@tms.com');

  // 2. Seed Client
  const client1 = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      companyName: 'Apex Textiles Industrial Co.',
      contactPerson: 'Mohamed Tarek (HR Director)',
      phone: '+201223456789',
      email: 'logistics@apextextiles.com',
      address: 'Industrial Zone 3, 10th of Ramadan City',
      status: ClientStatus.ACTIVE,
      notes: 'Requires 3 shifts daily for plant workers.',
    },
  });

  // 3. Seed Contract
  const contract1 = await prisma.contract.upsert({
    where: { contractNumber: 'CTR-2026-APX01' },
    update: {},
    create: {
      clientId: client1.id,
      contractNumber: 'CTR-2026-APX01',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: ContractStatus.ACTIVE,
      assignedVehicleCount: 2,
      pricingModel: PricingModel.MONTHLY_FIXED,
      monthlyValue: 45000.0,
      notes: 'Dedicated 50-seater and 30-seater for daily shifts.',
    },
  });

  // 4. Seed Vehicles
  const vehicle1 = await prisma.vehicle.upsert({
    where: { plateNumber: 'TRN-1001' },
    update: {},
    create: {
      plateNumber: 'TRN-1001',
      make: 'Mercedes-Benz',
      model: 'Travego 50',
      manufacturingYear: 2022,
      vehicleType: VehicleType.BUS_50_SEATER,
      capacity: 50,
      currentMileage: 48500,
      status: VehicleStatus.AVAILABLE,
      insuranceExpiry: new Date('2027-02-15'),
      licenseExpiry: new Date('2027-04-10'),
      inspectionExpiry: new Date('2026-11-20'),
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { plateNumber: 'TRN-2002' },
    update: {},
    create: {
      plateNumber: 'TRN-2002',
      make: 'Toyota',
      model: 'Coaster',
      manufacturingYear: 2023,
      vehicleType: VehicleType.MINIBUS_30_SEATER,
      capacity: 30,
      currentMileage: 28200,
      status: VehicleStatus.AVAILABLE,
      insuranceExpiry: new Date('2027-06-01'),
      licenseExpiry: new Date('2027-06-01'),
      inspectionExpiry: new Date('2026-12-15'),
    },
  });

  // 5. Seed Drivers (1-to-1 permanent pairing with Vehicle)
  const driver1 = await prisma.driver.upsert({
    where: { nationalId: '28805121400213' },
    update: { assignedVehicleId: vehicle1.id },
    create: {
      fullName: 'Ibrahim Mostafa',
      phoneNumber: '+201012345671',
      nationalId: '28805121400213',
      licenseNumber: 'DL-EGY-88912',
      licenseExpirationDate: new Date('2028-09-01'),
      employmentStatus: EmploymentStatus.ACTIVE,
      dutyStatus: DutyStatus.AVAILABLE,
      assignedVehicleId: vehicle1.id,
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { nationalId: '29107081500319' },
    update: { assignedVehicleId: vehicle2.id },
    create: {
      fullName: 'Mahmoud El-Sayed',
      phoneNumber: '+201098765432',
      nationalId: '29107081500319',
      licenseNumber: 'DL-EGY-91244',
      licenseExpirationDate: new Date('2027-11-15'),
      employmentStatus: EmploymentStatus.ACTIVE,
      dutyStatus: DutyStatus.AVAILABLE,
      assignedVehicleId: vehicle2.id,
    },
  });

  console.log('✅ Seeded vehicles & paired drivers (1:1 dedicated assignment)');
  console.log('🌱 Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });