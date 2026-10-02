import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting full database clean...');

  // 1. Delete Child / Transactional tables
  console.log('Clearing operations & accounting records...');
  await prisma.tripPassenger.deleteMany({});
  await prisma.tripEvent.deleteMany({});
  await prisma.financeLine.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.financeDocument.deleteMany({});
  await prisma.dailyOperation.deleteMany({});
  await prisma.driverOvertime.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.staffPayroll.deleteMany({});
  await prisma.installment.deleteMany({});
  await prisma.clientTransaction.deleteMany({});
  await prisma.supplierTransaction.deleteMany({});
  await prisma.treasuryEntry.deleteMany({});
  await prisma.treasuryAccount.deleteMany({});
  await prisma.auditEvent.deleteMany({});

  // 2. Delete Trips & Plans
  console.log('Clearing trips and service plans...');
  await prisma.trip.deleteMany({});
  await prisma.servicePlan.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.passenger.deleteMany({});
  await prisma.site.deleteMany({});

  // 3. Delete Routes & Stops
  console.log('Clearing routes and stops...');
  await prisma.routeStop.deleteMany({});
  await prisma.route.deleteMany({});

  // 4. Delete Contracts
  console.log('Clearing contracts...');
  await prisma.contractVehicle.deleteMany({});
  await prisma.contract.deleteMany({});

  // 5. Unlink Driver-Vehicle relations
  console.log('Unlinking vehicle assignments...');
  await prisma.driver.updateMany({
    data: { assignedVehicleId: null },
  });

  // 6. Delete Driver Documents & Drivers
  console.log('Clearing drivers and documents...');
  await prisma.driverDocument.deleteMany({});
  await prisma.driver.deleteMany({});

  // 7. Delete Maintenance & Vehicles
  console.log('Clearing vehicles and maintenance logs...');
  await prisma.maintenanceRecord.deleteMany({});
  await prisma.vehicle.deleteMany({});

  // 8. Delete Partners & Clients
  console.log('Clearing partners and clients...');
  await prisma.partner.deleteMany({});
  await prisma.client.deleteMany({});

  // 9. Ensure Admin & Ops Users exist and are active
  console.log('Ensuring admin credentials are active...');
  const passwordHash = await bcrypt.hash('admin123', 10);
  const opsPasswordHash = await bcrypt.hash('ops123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@tms.com' },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@tms.com',
      passwordHash,
      fullName: 'System Administrator',
      phone: '+201000000001',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { email: 'ops@tms.com' },
    update: {
      passwordHash: opsPasswordHash,
      status: UserStatus.ACTIVE,
      role: UserRole.OPERATIONS_MANAGER,
    },
    create: {
      email: 'ops@tms.com',
      passwordHash: opsPasswordHash,
      fullName: 'Operations Manager',
      phone: '+201000000002',
      role: UserRole.OPERATIONS_MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ Database successfully cleared! System is clean and ready for real testing.');
}

main()
  .catch((e) => {
    console.error('Error during database cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
