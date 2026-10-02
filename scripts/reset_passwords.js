const path = require('path');
const bcrypt = require(path.join(__dirname, '../server/node_modules/bcryptjs'));
const { PrismaClient } = require(path.join(__dirname, '../server/node_modules/@prisma/client'));

const prisma = new PrismaClient();

async function reset() {
  const adminHash = await bcrypt.hash('admin123456', 10);
  const opsHash = await bcrypt.hash('ops123456', 10);
  const viewerHash = await bcrypt.hash('viewer123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@tms.com' },
    update: { passwordHash: adminHash },
    create: {
      email: 'admin@tms.com',
      passwordHash: adminHash,
      fullName: 'System Administrator',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });

  await prisma.user.upsert({
    where: { email: 'ops@tms.com' },
    update: { passwordHash: opsHash },
    create: {
      email: 'ops@tms.com',
      passwordHash: opsHash,
      fullName: 'Operations Manager',
      role: 'OPERATIONS_MANAGER',
      status: 'ACTIVE'
    }
  });

  await prisma.user.upsert({
    where: { email: 'viewer@tms.com' },
    update: { passwordHash: viewerHash },
    create: {
      email: 'viewer@tms.com',
      passwordHash: viewerHash,
      fullName: 'Auditor Viewer',
      role: 'VIEWER',
      status: 'ACTIVE'
    }
  });

  console.log('✅ Demo passwords reset successfully!');
  await prisma.$disconnect();
}

reset().catch(console.error);
