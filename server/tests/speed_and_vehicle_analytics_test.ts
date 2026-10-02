/**
 * Dedicated Speed, Latency, Installments & Vehicle Asset Economics Test Suite
 */
import { PrismaClient } from '@prisma/client';
import { AccountingService } from '../src/modules/accounting/accounting.service.js';
import { DashboardService } from '../src/modules/dashboard/dashboard.service.js';

const prisma = new PrismaClient();

interface TestMetric {
  name: string;
  durationMs: number;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const metrics: TestMetric[] = [];

async function measureTest(name: string, fn: () => Promise<any>, maxExpectedMs = 250) {
  const start = performance.now();
  try {
    const res = await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const passed = durationMs <= maxExpectedMs;
    metrics.push({
      name,
      durationMs,
      status: passed ? 'PASS' : 'FAIL',
      details: `Execution took ${durationMs}ms (Threshold: ${maxExpectedMs}ms)`,
    });
    console.log(`  ${passed ? '⚡ [PASS]' : '⚠️ [SLOW]'} (${durationMs}ms) ${name}`);
    return res;
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    metrics.push({
      name,
      durationMs,
      status: 'FAIL',
      details: err?.message || String(err),
    });
    console.error(`  ❌ [FAIL] (${durationMs}ms) ${name}: ${err?.message}`);
    throw err;
  }
}

async function runSpeedAndVehicleAnalyticsAudit() {
  console.log('\n===============================================================');
  console.log('🏎️ SPEED, LATENCY, INSTALLMENTS & VEHICLE ANALYTICS TEST SUITE');
  console.log('===============================================================\n');

  const testPlate = `QA-TEST-${Date.now().toString().slice(-4)}`;
  let testVehicleId = '';
  let testAccountId = '';
  let testInstallmentId = '';

  try {
    // Setup Test Vehicle
    const v = await prisma.vehicle.create({
      data: {
        plateNumber: testPlate,
        make: 'Mercedes-Benz',
        model: 'Tourismo 2026',
        manufacturingYear: 2026,
        vehicleType: 'BUS_50_SEATER',
        capacity: 50,
        insuranceExpiry: new Date(Date.now() + 365 * 86400000),
        licenseExpiry: new Date(Date.now() + 365 * 86400000),
        inspectionExpiry: new Date(Date.now() + 365 * 86400000),
      },
    });
    testVehicleId = v.id;

    // Setup Test Treasury Account
    const acc = await prisma.treasuryAccount.create({
      data: {
        name: `Test Vault ${testPlate}`,
        kind: 'BANK',
        currency: 'EGP',
        openingDate: new Date(),
      },
    });
    testAccountId = acc.id;

    // Add 10 daily operations for this vehicle
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    for (let i = 1; i <= 10; i++) {
      await prisma.dailyOperation.create({
        data: {
          day: i,
          month: currentMonth,
          year: currentYear,
          driverName: 'سائق محاكي السرعة',
          routeName: 'القاهرة - السخنة',
          companyName: 'شركة السويدي إلكتريك',
          vehiclePlate: testPlate,
          vehicleType: 'أتوبيس 50 راكب',
          dailyRate: 3500,
          tripCount: 2,
          driverDailyRate: 500,
          vehicleCost: 1800, // عوائد إيجار السيارة المخصصة
          taxRate: 3.0,
          withholdingTax: 210,
          totalAmount: 7000,
          netDriverPay: 1000,
          dailyProfit: 2200,
          netRevenue: 6790,
        },
      });
    }

    // Add Expenses for this vehicle
    await prisma.expense.create({
      data: {
        day: 5,
        month: currentMonth,
        year: currentYear,
        category: 'سولار ووقود وزيوت',
        amount: 3200,
        vehicleNumber: testPlate,
        notes: 'بنزين وسولار للرحلات',
      },
    });

    // Add Maintenance Record for this vehicle
    await prisma.maintenanceRecord.create({
      data: {
        vehicleId: testVehicleId,
        maintenanceType: 'PERIODIC_INSPECTION',
        serviceDate: new Date(),
        cost: 1500,
        mileageAtService: 12000,
        description: 'صيانة دورية وتغيير فلاتر وزيت',
      },
    });

    // SECTION 1: Installments & Asset Yields
    console.log('\n--- 1. Testing Installments Creation, Status & Treasury Payment ---');

    await measureTest('Create Vehicle Bank Installment', async () => {
      const inst = await AccountingService.createInstallment({
        category: 'VEHICLE',
        assetName: `أتوبيس مرسيدس ${testPlate}`,
        vehiclePlate: testPlate,
        bankName: 'بنك بيت التمويل الكويتي KFH',
        installmentNumber: 1,
        bankDueDate: new Date(),
        bankAmount: 15000,
        clientAmount: 18000,
        status: 'PENDING',
      });
      testInstallmentId = inst.id;
      if (!inst.id || inst.status !== 'PENDING' || inst.vehiclePlate !== testPlate) {
        throw new Error('Installment creation failed or missing vehiclePlate');
      }
      return inst;
    });

    await measureTest('Filter Installments by Vehicle Plate', async () => {
      const list = await AccountingService.listInstallments({ vehiclePlate: testPlate });
      if (list.length === 0 || list[0].vehiclePlate !== testPlate) {
        throw new Error('Filtering installments by vehicle plate failed');
      }
      return list;
    });

    await measureTest('Get Installments Summary Filtered by Vehicle Plate', async () => {
      const summary = await AccountingService.getInstallmentsSummary({ vehiclePlate: testPlate });
      if (summary.pendingCount !== 1 || summary.totalPending !== 15000) {
        throw new Error(`Summary mismatch: pendingCount=${summary.pendingCount}, totalPending=${summary.totalPending}`);
      }
      return summary;
    });

    await measureTest('Pay Installment from Treasury & Validate Balances', async () => {
      // First fund the treasury account
      await prisma.treasuryEntry.create({
        data: {
          accountId: testAccountId,
          date: new Date(),
          amount: 50000,
          kind: 'DEPOSIT',
          reference: 'Opening Funding',
          actorId: 'SYSTEM',
          requestKey: `TEST_FUND_${Date.now()}`,
          fingerprint: `TEST_FUND_${Date.now()}`,
        },
      });

      const res = await AccountingService.payInstallmentFromTreasury({
        installmentId: testInstallmentId,
        accountId: testAccountId,
        reference: `سداد قسط شيك رقم 101 - ${testPlate}`,
      });

      if (res.installment.status !== 'PAID') throw new Error('Installment status not updated to PAID');
      if (Math.abs(Number(res.treasuryEntry.amount)) !== 15000) throw new Error('Treasury deduction amount incorrect');
      return res;
    });

    // SECTION 2: Vehicle Economics & Filtering
    console.log('\n--- 2. Testing Vehicle Profitability, Yields & Filtering ---');

    await measureTest('Query Vehicle Financial Ledger for Single Vehicle (Deep-Dive)', async () => {
      const data = await AccountingService.getVehicleFinancialLedger({
        month: currentMonth,
        year: currentYear,
        vehiclePlate: testPlate,
      });

      if (!data.items || data.items.length !== 1) {
        throw new Error(`Expected 1 item for vehicle ${testPlate}, got ${data.items?.length}`);
      }

      const vItem = data.items[0];
      // 10 operations * 2 trips = 20 trips
      if (vItem.totalTrips !== 20) throw new Error(`Expected 20 trips, got ${vItem.totalTrips}`);
      // 10 ops * 7000 = 70000 gross revenue
      if (vItem.grossRevenue !== 70000) throw new Error(`Expected 70000 revenue, got ${vItem.grossRevenue}`);
      // 20 trips * 1800 = 36000 vehicle direct rental allocated
      if (vItem.totalVehicleCostAllocated !== 36000) throw new Error(`Expected 36000 vehicle rental allocated, got ${vItem.totalVehicleCostAllocated}`);
      // Maintenance: 1500, Expenses: 3200, Total Expenses = 4700
      if (vItem.maintenanceCosts !== 1500) throw new Error(`Expected 1500 maintenance, got ${vItem.maintenanceCosts}`);
      if (vItem.otherExpenses !== 3200) throw new Error(`Expected 3200 expenses, got ${vItem.otherExpenses}`);
      // Paid Installments: 15000
      if (vItem.totalInstallmentsPaid !== 15000) throw new Error(`Expected 15000 paid installments, got ${vItem.totalInstallmentsPaid}`);

      // Net Cash Flow for vehicle: 36000 allocated - (4700 expenses + 15000 installment) = 16300 EGP surplus
      if (vItem.netCashFlow !== 16300) throw new Error(`Expected netCashFlow 16300, got ${vItem.netCashFlow}`);

      return vItem;
    });

    // SECTION 3: System Latency & Speed Benchmarks
    console.log('\n--- 3. System Latency & Speed Benchmarks ---');

    await measureTest('Dashboard Live KPIs Response Time', async () => {
      return DashboardService.getOverviewKPIs();
    }, 100);

    await measureTest('Accounting Operations Summary Aggregation Speed', async () => {
      return AccountingService.getDailyOperationsSummary({ month: currentMonth, year: currentYear });
    }, 100);

    await measureTest('Full Fleet Economics Multi-Vehicle Aggregation Speed', async () => {
      return AccountingService.getVehicleFinancialLedger({ month: currentMonth, year: currentYear });
    }, 150);

    await measureTest('Full P&L Income Statement Generation Speed', async () => {
      return AccountingService.getIncomeStatement({ month: currentMonth, year: currentYear });
    }, 150);

  } finally {
    // Cleanup
    if (testVehicleId) {
      await prisma.maintenanceRecord.deleteMany({ where: { vehicleId: testVehicleId } }).catch(() => {});
      await prisma.dailyOperation.deleteMany({ where: { vehiclePlate: testPlate } }).catch(() => {});
      await prisma.expense.deleteMany({ where: { vehicleNumber: testPlate } }).catch(() => {});
      await prisma.installment.deleteMany({ where: { vehiclePlate: testPlate } }).catch(() => {});
      await prisma.vehicle.delete({ where: { id: testVehicleId } }).catch(() => {});
    }
    if (testAccountId) {
      await prisma.treasuryEntry.deleteMany({ where: { accountId: testAccountId } }).catch(() => {});
      await prisma.treasuryAccount.delete({ where: { id: testAccountId } }).catch(() => {});
    }
  }

  console.log('\n===============================================================');
  console.log('📊 TEST SUMMARY & PERFORMANCE RESULTS:');
  console.log('===============================================================');
  const passedCount = metrics.filter((m) => m.status === 'PASS').length;
  const failedCount = metrics.filter((m) => m.status === 'FAIL').length;
  console.log(`Total Scenarios: ${metrics.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log('---------------------------------------------------------------');
  for (const m of metrics) {
    console.log(`- ${m.name}: ${m.durationMs}ms [${m.status}]`);
  }
  console.log('===============================================================\n');
}

runSpeedAndVehicleAnalyticsAudit().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
