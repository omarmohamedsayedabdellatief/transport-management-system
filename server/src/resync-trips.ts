import { PrismaClient } from '@prisma/client';
import { AccountingService } from './modules/accounting/accounting.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting financial synchronization for all existing trips...');
  const trips = await prisma.trip.findMany();
  console.log(`Found ${trips.length} trips to sync.`);

  for (const t of trips) {
    await AccountingService.syncTripToFinancials(t.id);
  }

  console.log('✅ Trips synchronized.');

  // Check Driver Settlements for month 9 / 2026
  const driverSettlements = await AccountingService.getDriverMonthlySettlements({ month: 9, year: 2026 });
  console.log('\n📊 Company Driver Settlements (month 9/2026):', driverSettlements.length, 'drivers');
  console.log(driverSettlements.map(d => ({
    driver: d.driverName,
    company: d.companyName,
    trips: d.totalTrips,
    basePay: d.totalBasePay,
    overtime: d.totalOvertime,
    netPayable: d.netPayable,
  })));

  // Check Supplier Ledger Summary
  const supplierSummary = await AccountingService.getSuppliersLedgerSummary();
  console.log('\n🏢 Supplier Ledgers Summary:', supplierSummary.length, 'suppliers');
  console.log(supplierSummary.map(s => ({
    supplier: s.supplierName,
    totalDueCredit: s.totalCredit,
    totalPaidDebit: s.totalDebit,
    remainingBalance: s.balance,
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
