const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../server/node_modules/@prisma/client'));

const prisma = new PrismaClient();

async function run() {
  console.log('Testing import...');
  const { AccountingService } = await import('../server/dist/modules/accounting/accounting.service.js').catch(async () => {
    // If not built yet, we can test with tsx or direct service
    return { AccountingService: null };
  });

  if (!AccountingService) {
    console.log('Note: We will run via tsx or api.');
  }
}

run();
