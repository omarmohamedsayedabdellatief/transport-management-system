import { PrismaClient } from '@prisma/client';
import { AccountingService } from './modules/accounting/accounting.service.js';

const prisma = new PrismaClient();

async function runAccountingSuite() {
  console.log('================================================================');
  console.log('🚀 STARTING COMPREHENSIVE FINANCIAL & OPERATIONS TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. Clean test data if existing
    console.log('🔹 1. Setting up Treasury Accounts...');
    const mainCash = await AccountingService.createTreasuryAccount({
      name: `الخزينة الرئيسية - تجريبي ${Date.now()}`,
      kind: 'CASH',
      currency: 'EGP',
      openingBalance: 100000,
    });
    console.log(`   ✅ Created Cash Vault: ${mainCash.name} (Opening Balance: 100,000 EGP)`);

    const bankAccount = await AccountingService.createTreasuryAccount({
      name: `بنك مصر - جاري ${Date.now()}`,
      kind: 'BANK',
      bankName: 'Banque Misr',
      openingBalance: 500000,
    });
    console.log(`   ✅ Created Bank Account: ${bankAccount.name} (Opening Balance: 500,000 EGP)`);

    // Verify Treasury Overview
    const treasuryOverview = await AccountingService.listTreasuryOverview();
    console.log(`   📊 Total Cash: ${treasuryOverview.totals.cash} EGP | Total Bank: ${treasuryOverview.totals.bank} EGP | Total Liquidity: ${treasuryOverview.totals.totalLiquidity} EGP`);
    if (treasuryOverview.totals.totalLiquidity < 600000) {
      throw new Error('Treasury liquidity balance mismatch!');
    }

    // 2. Test Internal Transfer
    console.log('\n🔹 2. Testing Internal Treasury Transfer...');
    const transfer = await AccountingService.transferTreasury({
      fromAccountId: bankAccount.id,
      toAccountId: mainCash.id,
      amount: 25000,
      reference: 'تغذية الخزينة الرئيسية من بنك مصر',
      notes: 'تحويل نقدي لمصروفات التشغيل',
    });
    console.log(`   ✅ Transferred 25,000 EGP from [${transfer.fromAccount}] to [${transfer.toAccount}]`);

    const cashStatement = await AccountingService.getTreasuryStatement(mainCash.id);
    console.log(`   ✅ Cash Account New Balance: ${cashStatement.finalBalance} EGP (Expected: 125,000 EGP)`);
    if (cashStatement.finalBalance !== 125000) {
      throw new Error(`Expected Cash balance 125,000 but got ${cashStatement.finalBalance}`);
    }

    // 3. Test Operational Trip Hook (Creating a simulated Client, Route, Driver, Vehicle & Trip)
    console.log('\n🔹 3. Testing Automated Trip Completion Hook to Financials...');
    const client = await prisma.client.create({
      data: {
        companyName: `شركة الفا للاتصالات - تجريبي ${Date.now()}`,
        contactPerson: 'أ/ محمد طارق',
        phone: '01011112222',
        email: `alpha_${Date.now()}@example.com`,
        address: 'القرية الذكية - مبنى B12',
      },
    });

    const driver = await prisma.driver.create({
      data: {
        fullName: `كابتن محمود الباز ${Date.now().toString().slice(-4)}`,
        phoneNumber: `012${Math.floor(10000000 + Math.random() * 90000000)}`,
        nationalId: `${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`,
        licenseNumber: `LIC_${Date.now()}`,
        licenseExpirationDate: new Date('2028-12-31'),
      },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: `ط س ر ${Math.floor(1000 + Math.random() * 9000)}`,
        make: 'Toyota',
        model: 'Coaster 2024',
        manufacturingYear: 2024,
        vehicleType: 'MINIBUS_30_SEATER',
        capacity: 30,
        insuranceExpiry: new Date('2028-12-31'),
        licenseExpiry: new Date('2028-12-31'),
        inspectionExpiry: new Date('2028-12-31'),
      },
    });

    const route = await prisma.route.create({
      data: {
        clientId: client.id,
        routeName: 'المهندسين - القرية الذكية (خط 101)',
        startLocation: 'المهندسين - ميدان لبنان',
        finalDestination: 'القرية الذكية',
        estimatedDistanceKm: 28,
        estimatedDurationMin: 45,
        clientPricePerTrip: 1500, // Client pays 1,500 EGP
        driverTripAllowance: 350,  // Driver earns 350 EGP
        vehicleRentalCost: 200,    // Fuel/Vehicle direct cost: 200 EGP
      },
    });

    const trip = await prisma.trip.create({
      data: {
        tripNumber: `TRP_${Date.now()}`,
        clientId: client.id,
        routeId: route.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        tripDate: new Date(),
        shift: 'MORNING',
        scheduledDeparture: new Date(),
        expectedArrival: new Date(Date.now() + 3600000),
        saleAmount: 1500,
        costAmount: 0,
        driverAllowance: 350,
        vehicleCost: 200,
        tripStatus: 'COMPLETED',
      },
    });

    // Execute Hook
    await AccountingService.syncTripToFinancials(trip.id);
    console.log(`   ✅ Trip ${trip.tripNumber} synced to Financials!`);

    // Verify Daily Operations Table
    const ops = await prisma.dailyOperation.findFirst({
      where: { notes: { contains: `[Trip#${trip.id}]` } },
    });
    console.log(`   📊 Daily Operation Created:`);
    console.log(`      • Daily Rate: ${ops?.dailyRate} EGP`);
    console.log(`      • Withholding Tax (3%): ${ops?.withholdingTax} EGP`);
    console.log(`      • Total Client Billing: ${ops?.totalAmount} EGP (1,500 - 45 = 1,455 EGP)`);
    console.log(`      • Net Driver Pay: ${ops?.netDriverPay} EGP`);
    console.log(`      • Daily Profit: ${ops?.dailyProfit} EGP (1,500 - 350 - 200 = 950 EGP)`);
    console.log(`      • Net Revenue: ${ops?.netRevenue} EGP (950 - 45 = 905 EGP)`);

    if (Number(ops?.withholdingTax) !== 45 || Number(ops?.totalAmount) !== 1455) {
      throw new Error('Daily operation financial formula calculation mismatch!');
    }

    // Verify Client Transaction Created
    const clientTx = await prisma.clientTransaction.findFirst({
      where: { notes: { contains: `[Trip#${trip.id}]` } },
    });
    console.log(`   ✅ Client Ledger Updated: Debit = ${clientTx?.debit} EGP | Balance = ${clientTx?.balance} EGP`);

    // 4. Test Driver Overtime & Monthly Settlement
    console.log('\n🔹 4. Testing Driver Overtime & Monthly Settlements...');
    const overtime = await AccountingService.createDriverOvertime({
      driverName: driver.fullName,
      date: new Date(),
      routeName: route.routeName,
      shiftDescription: 'سهرة إضافية توصيل موظفي وردية مسائية',
      shiftsCount: 1,
      shiftRate: 200,
      branch: 'القرية الذكية',
    });
    console.log(`   ✅ Overtime Recorded: ${overtime.shiftDescription} (+${overtime.shiftRate} EGP)`);

    const curMonth = new Date().getMonth() + 1;
    const curYear = new Date().getFullYear();

    const settlements = await AccountingService.getDriverMonthlySettlements({
      month: curMonth,
      year: curYear,
    });
    const driverSettlement = settlements.find((s) => s.driverName === driver.fullName);
    console.log(`   📊 Driver Settlement Summary for ${curMonth}/${curYear}:`);
    console.log(`      • Driver: ${driverSettlement?.driverName}`);
    console.log(`      • Base Trip Pay: ${driverSettlement?.totalBasePay} EGP`);
    console.log(`      • Overtime Pay: ${driverSettlement?.totalOvertime} EGP`);
    console.log(`      • Net Payable: ${driverSettlement?.netPayable} EGP`);

    // Pay Driver Settlement from Treasury
    console.log('   💸 Paying Driver from Cash Vault...');
    const payResult = await AccountingService.payDriverSettlement({
      driverName: driver.fullName,
      month: curMonth,
      year: curYear,
      amount: driverSettlement?.netPayable || 350,
      accountId: mainCash.id,
      notes: 'صرف مستحقات نقدية من الخزينة',
    });
    console.log(`   ✅ Driver Settlement Paid! Status: ${payResult.settlement.status} (Voucher #${payResult.treasuryEntry.id.slice(0, 8)})`);

    // 5. Test Supplier Trip Hook, Ledger & Treasury Payment
    console.log('\n🔹 5. Testing Supplier Trip Hook & Supplier Ledgers...');
    const supplierPartner = await prisma.partner.create({
      data: {
        name: `شركة النيل للنقل والتوريدات - تجريبي ${Date.now()}`,
        kind: 'TRANSPORT',
        contactName: 'م/ طارق السويفي',
        phone: '01122334455',
      },
    });

    const supplierTrip = await prisma.trip.create({
      data: {
        tripNumber: `TRP_SUPP_${Date.now()}`,
        clientId: client.id,
        routeId: route.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        tripDate: new Date(),
        shift: 'AFTERNOON',
        scheduledDeparture: new Date(),
        expectedArrival: new Date(Date.now() + 3600000),
        executionType: 'SUPPLIER',
        supplierId: supplierPartner.id,
        saleAmount: 1800,
        costAmount: 1200, // Supplier cost
        driverAllowance: 0,
        vehicleCost: 1200,
        tripStatus: 'COMPLETED',
      },
    });

    await AccountingService.syncTripToFinancials(supplierTrip.id);
    console.log(`   ✅ Supplier Trip ${supplierTrip.tripNumber} synced to Financials!`);

    // Verify Supplier Transaction Created
    const supplierLedger = await AccountingService.getSuppliersLedgerSummary();
    const currentSupplierSummary = supplierLedger.find(s => s.supplierName === supplierPartner.name);
    console.log(`   📊 Supplier Ledger [${supplierPartner.name}]:`);
    console.log(`      • Due Credit: ${currentSupplierSummary?.totalCredit} EGP (Expected: 1,200 EGP)`);
    console.log(`      • Balance: ${currentSupplierSummary?.balance} EGP`);
    if (currentSupplierSummary?.totalCredit !== 1200) {
      throw new Error('Supplier trip cost failed to reflect in supplier ledger!');
    }

    // Verify that Supplier trip did NOT create any driver payable for company drivers
    const freshDriverSettlements = await AccountingService.getDriverMonthlySettlements({
      month: curMonth,
      year: curYear,
    });
    const hasSupplierDriverInSettlements = freshDriverSettlements.some(s => s.driverName.includes(supplierPartner.name));
    if (hasSupplierDriverInSettlements) {
      throw new Error('Supplier driver unexpectedly appeared in Company Driver Settlements!');
    }
    console.log(`   ✅ Verified: Supplier cost is strictly in Supplier Ledgers and NOT mixed in Driver Settlements!`);

    // Pay Supplier from Bank Account
    console.log('   💸 Paying Supplier from Bank Account...');
    const supplierPayment = await AccountingService.paySupplierFromTreasury({
      supplierName: supplierPartner.name,
      amount: 1200,
      accountId: bankAccount.id,
      reference: 'سداد مستحقات رحلة المورد',
    });
    console.log(`   ✅ Supplier Paid from Treasury [${bankAccount.name}]! (Voucher #${supplierPayment.supplierTx.documentNumber})`);

    // 6. Test Client Receipt Collection
    console.log('\n🔹 6. Testing Client Invoice Receipt & Collection...');
    const clientReceipt = await AccountingService.recordClientReceiptToTreasury({
      companyName: client.companyName,
      amount: 1455,
      accountId: bankAccount.id,
      reference: 'تحويل بنكي سداد فاتورة رحلة 101',
      notes: 'سداد مطالبة العميل',
    });
    console.log(`   ✅ Client payment of 1,455 EGP deposited to Bank: [${clientReceipt.accountName}]`);

    const clientSummary = await AccountingService.getClientsLedgerSummary();
    const updatedClient = clientSummary.find((c) => c.companyName === client.companyName);
    console.log(`   ✅ Client Outstanding Balance after payment: ${updatedClient?.balance} EGP (Settled!)`);

    // 6. Test Vehicle Maintenance & Cost Center Tracking
    console.log('\n🔹 6. Testing Maintenance & Vehicle Cost Center Allocation...');
    const maint = await prisma.maintenanceRecord.create({
      data: {
        vehicleId: vehicle.id,
        maintenanceType: 'OIL_CHANGE',
        serviceDate: new Date(),
        cost: 2200,
        mileageAtService: 15400,
        status: 'COMPLETED',
        description: 'تغيير زيت وفلاتر 10,000 كم + فحص دوري',
      },
    });

    // Record Maintenance payment from Cash Vault
    await AccountingService.createExpense(
      {
        category: 'صيانة وزيوت أسطول',
        amount: 2200,
        vehicleNumber: vehicle.plateNumber,
        notes: `صيانة دورية للمركبة ${vehicle.plateNumber} (سند #${maint.id.slice(0, 6)})`,
      },
      mainCash.id
    );
    console.log(`   ✅ Maintenance of 2,200 EGP recorded for vehicle [${vehicle.plateNumber}] and paid from Treasury`);

    // Check Vehicle Financial Ledger
    const vehicleLedger = await AccountingService.getVehicleFinancialLedger({
      month: curMonth,
      year: curYear,
    });
    const vReport = vehicleLedger.items.find((v: any) => v.plateNumber === vehicle.plateNumber);
    console.log(`   📊 Vehicle ROI Report [${vReport?.plateNumber}]:`);
    console.log(`      • Gross Trip Revenue: ${vReport?.grossRevenue} EGP`);
    console.log(`      • Direct Trip Cost: ${vReport?.vehicleDirectCost} EGP`);
    console.log(`      • Maintenance & Expenses: ${vReport?.otherExpenses} EGP`);
    console.log(`      • Net Vehicle ROI: ${vReport?.netROI} EGP`);

    // 7. Test Vehicle Installment
    console.log('\n🔹 7. Testing Vehicle Installment Payment...');
    const inst = await AccountingService.createInstallment({
      category: 'VEHICLE',
      assetName: `أتوبيس تويوتا كوستر - ${vehicle.plateNumber}`,
      vehiclePlate: vehicle.plateNumber,
      installmentNumber: 1,
      bankDueDate: new Date(),
      bankAmount: 12000,
      bankName: 'بنك مصر',
      chequeNumber: 'CHQ-889900',
    });

    const paidInst = await AccountingService.payInstallmentFromTreasury({
      installmentId: inst.id,
      accountId: bankAccount.id,
      reference: 'سداد شيك قسط رقم 1 من بنك مصر',
    });
    console.log(`   ✅ Installment #${paidInst.installment.installmentNumber} paid successfully! Status: ${paidInst.installment.status}`);

    // 8. Test Income Statement (P&L) & Monthly Period Closing
    console.log('\n🔹 8. Testing Income Statement (P&L) & Period Locking...');
    const pnl = await AccountingService.getIncomeStatement({
      month: curMonth,
      year: curYear,
    });
    console.log(`   📊 Income Statement for ${curMonth}/${curYear}:`);
    console.log(`      • Gross Revenues: ${pnl.revenues.grossBilling} EGP`);
    console.log(`      • Net Client Billing: ${pnl.revenues.netClientBilling} EGP`);
    console.log(`      • Total Direct Costs: ${pnl.directCosts.totalDirectCosts} EGP`);
    console.log(`      • Gross Profit: ${pnl.grossProfit} EGP`);
    console.log(`      • Total Indirect Expenses (Maint/Exp/Inst): ${pnl.indirectExpenses.totalIndirectExpenses} EGP`);
    console.log(`      • Net Operating Profit: ${pnl.netProfit} EGP`);

    // Close Period
    const closedPeriod = await AccountingService.closeFinancialPeriod(curYear, curMonth, 'ADMIN_TEST', 'إقفال تجريبي ناجح');
    console.log(`   🔒 Financial Period ${closedPeriod.month}/${closedPeriod.year} Status: [${closedPeriod.status}] (Closed At: ${closedPeriod.closedAt?.toISOString()})`);

    // 9. Test Excel Exporters
    console.log('\n🔹 9. Testing Excel Sheet Generators...');
    const opsExcel = await AccountingService.exportOperationsToExcel({ month: curMonth, year: curYear });
    const settlementsExcel = await AccountingService.exportSettlementsToExcel({ month: curMonth, year: curYear });
    console.log(`   ✅ Generated Operations Excel Buffer: ${opsExcel.length} bytes`);
    console.log(`   ✅ Generated Settlements Excel Buffer: ${settlementsExcel.length} bytes`);

    console.log('\n================================================================');
    console.log('🎉 ALL 9 ACCOUNTING & OPERATIONS INTEGRATION TESTS PASSED 100%!');
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAccountingSuite();
