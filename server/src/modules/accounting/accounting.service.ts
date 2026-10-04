import { Prisma, TripStatus } from '@prisma/client';
import { prisma } from '../../prisma.js';
import * as XLSX from 'xlsx';
import { randomUUID } from 'node:crypto';

// Helper to convert Excel serial numbers (e.g. 46204) or date strings to Date
export function excelSerialToDate(serial: any): Date {
  if (!serial) return new Date();
  if (serial instanceof Date) return serial;
  if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) {
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d;
  }
  const num = Number(serial);
  if (!isNaN(num) && num > 20000) {
    const utcDays = Math.floor(num - 25569);
    const dateInfo = new Date(utcDays * 86400 * 1000);
    return isNaN(dateInfo.getTime()) ? new Date() : dateInfo;
  }
  return new Date();
}

export class AccountingService {
  // =========================================================================
  // 1. TREASURY & BANK ACCOUNTS (الخزينة والحسابات البنكية)
  // =========================================================================

  static async listTreasuryOverview() {
    const accounts = await prisma.treasuryAccount.findMany({
      where: { active: true },
      include: {
        entries: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
      orderBy: { name: 'asc' },
    });

    const entriesGroup = await prisma.treasuryEntry.groupBy({
      by: ['accountId', 'kind'],
      _sum: { amount: true },
      _count: { id: true },
    });

    const accountSummaries = accounts.map((acc) => {
      const inEntries = entriesGroup.find((g) => g.accountId === acc.id && g.kind === 'IN');
      const outEntries = entriesGroup.find((g) => g.accountId === acc.id && g.kind === 'OUT');

      const totalIn = Number(inEntries?._sum?.amount || 0);
      const totalOut = Number(outEntries?._sum?.amount || 0);
      const currentBalance = totalIn - totalOut;

      return {
        id: acc.id,
        name: acc.name,
        kind: acc.kind,
        currency: acc.currency,
        bankName: acc.bankName,
        reference: acc.reference,
        openingDate: acc.openingDate,
        totalIn: Math.round(totalIn * 100) / 100,
        totalOut: Math.round(totalOut * 100) / 100,
        currentBalance: Math.round(currentBalance * 100) / 100,
        transactionCount: (inEntries?._count?.id || 0) + (outEntries?._count?.id || 0),
        recentEntries: acc.entries,
      };
    });

    const grandTotalCash = accountSummaries
      .filter((a) => a.kind === 'CASH' || a.kind === 'VAULT')
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const grandTotalBank = accountSummaries
      .filter((a) => a.kind === 'BANK')
      .reduce((sum, a) => sum + a.currentBalance, 0);

    return {
      accounts: accountSummaries,
      totals: {
        cash: Math.round(grandTotalCash * 100) / 100,
        bank: Math.round(grandTotalBank * 100) / 100,
        totalLiquidity: Math.round((grandTotalCash + grandTotalBank) * 100) / 100,
      },
    };
  }

  static async createTreasuryAccount(data: {
    name: string;
    kind: string;
    currency?: string;
    bankName?: string;
    reference?: string;
    openingBalance?: number;
    openingDate?: string | Date;
  }) {
    const openingDate = data.openingDate ? new Date(data.openingDate) : new Date();

    return prisma.$transaction(async (tx) => {
      const account = await tx.treasuryAccount.create({
        data: {
          name: data.name,
          kind: data.kind || 'CASH',
          currency: data.currency || 'EGP',
          bankName: data.bankName || null,
          reference: data.reference || null,
          openingDate,
        },
      });

      const initialAmount = Number(data.openingBalance || 0);
      if (initialAmount > 0) {
        await tx.treasuryEntry.create({
          data: {
            accountId: account.id,
            date: openingDate,
            amount: new Prisma.Decimal(initialAmount),
            kind: 'IN',
            reference: 'رصيد افتتاحي تأسيسي',
            notes: 'افتتاح الحساب/الخزينة',
            actorId: 'SYSTEM',
            requestKey: `INIT_${account.id}_${Date.now()}`,
            fingerprint: `OPENING_BALANCE_${account.id}`,
            sourceKey: `TREASURY_INIT:${account.id}`,
          },
        });
      }

      return account;
    });
  }

  static async transferTreasury(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date?: string | Date;
    reference?: string;
    notes?: string;
    actorId?: string;
  }) {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('المبلغ المحول يجب أن يكون أكبر من الصفر');
    if (data.fromAccountId === data.toAccountId) throw new Error('لا يمكن التحويل لنفس الحساب');

    const transferDate = data.date ? new Date(data.date) : new Date();
    const transferId = randomUUID();
    const actorId = data.actorId || 'SYSTEM';

    return prisma.$transaction(async (tx) => {
      const [fromAcc, toAcc] = await Promise.all([
        tx.treasuryAccount.findUniqueOrThrow({ where: { id: data.fromAccountId } }),
        tx.treasuryAccount.findUniqueOrThrow({ where: { id: data.toAccountId } }),
      ]);

      // Check current balance of source
      const fromIn = await tx.treasuryEntry.aggregate({
        where: { accountId: data.fromAccountId, kind: 'IN' },
        _sum: { amount: true },
      });
      const fromOut = await tx.treasuryEntry.aggregate({
        where: { accountId: data.fromAccountId, kind: 'OUT' },
        _sum: { amount: true },
      });
      const available = Number(fromIn._sum.amount || 0) - Number(fromOut._sum.amount || 0);

      if (available < amount) {
        throw new Error(`رصيد حساب (${fromAcc.name}) غير كافٍ. المتاح: ${available.toFixed(2)} EGP`);
      }

      const outEntry = await tx.treasuryEntry.create({
        data: {
          accountId: data.fromAccountId,
          date: transferDate,
          amount: new Prisma.Decimal(amount),
          kind: 'OUT',
          reference: data.reference || `تحويل صادر إلى ${toAcc.name}`,
          notes: data.notes || `تحويل داخلي إلى ${toAcc.name}`,
          actorId,
          requestKey: `TRF_OUT_${transferId}`,
          fingerprint: `TRANSFER_${transferId}_OUT`,
          transferId,
        },
      });

      const inEntry = await tx.treasuryEntry.create({
        data: {
          accountId: data.toAccountId,
          date: transferDate,
          amount: new Prisma.Decimal(amount),
          kind: 'IN',
          reference: data.reference || `تحويل وارد من ${fromAcc.name}`,
          notes: data.notes || `تحويل داخلي من ${fromAcc.name}`,
          actorId,
          requestKey: `TRF_IN_${transferId}`,
          fingerprint: `TRANSFER_${transferId}_IN`,
          transferId,
        },
      });

      return {
        transferId,
        amount,
        fromAccount: fromAcc.name,
        toAccount: toAcc.name,
        outEntryId: outEntry.id,
        inEntryId: inEntry.id,
      };
    });
  }

  static async recordTreasuryAdjustment(data: {
    accountId: string;
    kind: 'IN' | 'OUT';
    amount: number;
    reference: string;
    notes?: string;
    actorId?: string;
  }) {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('مبلغ التسوية يجب أن يكون أكبر من الصفر');

    return prisma.treasuryEntry.create({
      data: {
        accountId: data.accountId,
        date: new Date(),
        amount: new Prisma.Decimal(amount),
        kind: data.kind,
        reference: data.reference,
        notes: data.notes || null,
        actorId: data.actorId || 'SYSTEM',
        requestKey: `ADJ_${randomUUID()}`,
        fingerprint: `MANUAL_ADJUSTMENT_${Date.now()}`,
      },
    });
  }

  static async getTreasuryStatement(accountId: string, fromDate?: string, toDate?: string) {
    const where: Prisma.TreasuryEntryWhereInput = { accountId };
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const [account, entries] = await Promise.all([
      prisma.treasuryAccount.findUniqueOrThrow({ where: { id: accountId } }),
      prisma.treasuryEntry.findMany({
        where,
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    let runningBalance = 0;
    const ledger = entries.map((e) => {
      const amt = Number(e.amount);
      if (e.kind === 'IN') {
        runningBalance += amt;
      } else {
        runningBalance -= amt;
      }
      return {
        id: e.id,
        date: e.date,
        kind: e.kind,
        amount: amt,
        reference: e.reference,
        notes: e.notes,
        transferId: e.transferId,
        runningBalance: Math.round(runningBalance * 100) / 100,
      };
    });

    return {
      account,
      statement: ledger,
      finalBalance: Math.round(runningBalance * 100) / 100,
    };
  }

  // =========================================================================
  // 2. DAILY OPERATIONS & AUTOMATED TRIP FINANCIAL HOOKS (التشغيل اليومي)
  // =========================================================================

  static calculateOperationFields(data: any) {
    const dailyRate = Number(data.dailyRate || 0);
    const tripCount = Number(data.tripCount || 1);
    const driverDailyRate = Number(data.driverDailyRate || 0);
    const vehicleCost = Number(data.vehicleCost || 0);
    const taxRate = Number(data.taxRate !== undefined ? data.taxRate : 3.0);
    const advancePayment = Number(data.advancePayment || 0);
    const deduction = Number(data.deduction || 0);
    const overtime = Number(data.overtime || 0);

    // Exact standard formulas:
    // Withholding Tax (ضريبة الخصم 3%) = dailyRate * (taxRate / 100) * tripCount
    const withholdingTax = dailyRate * (taxRate / 100) * tripCount;
    // Total Billing = (dailyRate * tripCount) - withholdingTax
    const totalAmount = dailyRate * tripCount - withholdingTax;
    // Net Driver Pay = (driverDailyRate * tripCount) - (advancePayment + deduction) + overtime
    const netDriverPay = driverDailyRate * tripCount - (advancePayment + deduction) + overtime;
    // Daily Profit = (dailyRate - driverDailyRate - vehicleCost) * tripCount
    const dailyProfit = (dailyRate - driverDailyRate - vehicleCost) * tripCount;
    // Net Revenue = dailyProfit - withholdingTax
    const netRevenue = dailyProfit - withholdingTax;

    return {
      dailyRate,
      tripCount,
      driverDailyRate,
      vehicleCost,
      taxRate,
      withholdingTax: Math.round(withholdingTax * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      advancePayment,
      deduction,
      overtime,
      netDriverPay: Math.round(netDriverPay * 100) / 100,
      dailyProfit: Math.round(dailyProfit * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
    };
  }

  static async syncTripToFinancials(tripId: string, txClient?: any) {
    const db = txClient || prisma;
    const trip = await db.trip.findUnique({
      where: { id: tripId },
      include: {
        client: true,
        route: { include: { supplier: true } },
        vehicle: { include: { supplier: true } },
        driver: { include: { supplier: true } },
        supplier: true,
      },
    });

    if (!trip) return null;

    const tripDate = trip.tripDate ? new Date(trip.tripDate) : new Date();
    const day = typeof tripDate.getUTCDate === 'function' ? tripDate.getUTCDate() : tripDate.getDate();
    const month = (typeof tripDate.getUTCMonth === 'function' ? tripDate.getUTCMonth() : tripDate.getMonth()) + 1;
    const year = typeof tripDate.getUTCFullYear === 'function' ? tripDate.getUTCFullYear() : tripDate.getFullYear();

    const isSupplier = trip.executionType === 'SUPPLIER' || !!trip.supplierId || !!trip.vehicle?.supplierId || !!trip.driver?.supplierId;
    const dailyRate = Number(trip.saleAmount) > 0 ? Number(trip.saleAmount) : Number(trip.route?.clientPricePerTrip || 0);

    // If it is a supplier trip: Company driver allowance is 0 (company does not pay supplier drivers on payroll),
    // and the trip cost is the supplier's charge allocated to vehicleCost/direct supplier cost.
    const driverDailyRate = isSupplier
      ? 0
      : (Number(trip.driverAllowance) > 0 ? Number(trip.driverAllowance) : Number(trip.route?.driverTripAllowance || 0));

    // Vehicle/Supplier Cost Allocation:
    const vehicleCost = isSupplier
      ? (Number(trip.costAmount) > 0 ? Number(trip.costAmount) : Number(trip.route?.supplierCostPerTrip || 0))
      : (Number(trip.vehicleCost) > 0 ? Number(trip.vehicleCost) : Number(trip.route?.vehicleRentalCost || 0));

    const vehiclePlate = trip.vehicle?.plateNumber || null;
    const vehicleType = trip.vehicle ? `${trip.vehicle.make || ''} ${trip.vehicle.model || ''} (${trip.vehicle.plateNumber || ''})`.trim() : null;

    const calculated = this.calculateOperationFields({
      dailyRate,
      tripCount: 1,
      driverDailyRate,
      vehicleCost,
      taxRate: 3.0,
      advancePayment: 0,
      deduction: 0,
      overtime: 0,
    });

    const supplierName = trip.supplier?.name || trip.route?.supplier?.name || trip.vehicle?.supplier?.name || trip.driver?.supplier?.name;
    const executionLabel = isSupplier ? `رحلة مورد (${supplierName || 'مورد خارجي'})` : 'رحلة أسطول الشركة';
    const noteTag = `[Trip#${trip.id}]`;
    const fullNotes = `${noteTag} - ${executionLabel} (${trip.tripNumber || trip.id})`;

    const driverDisplayName = isSupplier
      ? (trip.driver?.fullName ? `${trip.driver.fullName} [مورد: ${supplierName || 'شريك'}]` : `سائق مورد (${supplierName || 'خارجي'})`)
      : (trip.driver?.fullName || 'سائق الشركة');

    const existing = await db.dailyOperation.findFirst({
      where: { notes: { contains: noteTag } },
    });

    let operationResult: any;
    if (existing) {
      operationResult = await db.dailyOperation.update({
        where: { id: existing.id },
        data: {
          day,
          month,
          year,
          date: tripDate,
          driverName: driverDisplayName,
          routeName: trip.route?.routeName || 'خط غير محدد',
          companyName: trip.client?.companyName || 'عميل غير محدد',
          branch: trip.route?.startLocation || null,
          vehicleType,
          vehiclePlate,
          ...calculated,
          notes: fullNotes,
          operationType: 'ايراد',
        },
      });
    } else {
      operationResult = await db.dailyOperation.create({
        data: {
          day,
          month,
          year,
          date: tripDate,
          driverName: driverDisplayName,
          routeName: trip.route?.routeName || 'خط غير محدد',
          companyName: trip.client?.companyName || 'عميل غير محدد',
          branch: trip.route?.startLocation || null,
          vehicleType,
          vehiclePlate,
          ...calculated,
          notes: fullNotes,
          operationType: 'ايراد',
        },
      });
    }

    // Synchronize ClientTransaction (كشف حساب العميل - استحقاق إيراد الرحلة)
    const clientCompanyName = trip.client?.companyName || 'عميل غير محدد';
    const clientNoteTag = `[Trip#${trip.id}]`;
    const debitAmount = Number(trip.saleAmount) > 0 ? Number(trip.saleAmount) : calculated.totalAmount;

    if (debitAmount > 0) {
      const existingClientTx = await db.clientTransaction.findFirst({
        where: { notes: { contains: clientNoteTag } },
      });

      if (existingClientTx) {
        await db.clientTransaction.update({
          where: { id: existingClientTx.id },
          data: {
            companyName: clientCompanyName,
            date: tripDate,
            documentNumber: trip.tripNumber || null,
            description: `تشغيل رحلة: ${trip.route?.routeName || ''} (${trip.tripNumber || ''})`,
            debit: debitAmount,
            notes: clientNoteTag,
          },
        });
      } else {
        const lastTx = await db.clientTransaction.findFirst({
          where: { companyName: clientCompanyName },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
        const prevBal = lastTx ? Number(lastTx.balance || 0) : 0;
        await db.clientTransaction.create({
          data: {
            companyName: clientCompanyName,
            date: tripDate,
            documentNumber: trip.tripNumber || null,
            description: `تشغيل رحلة: ${trip.route?.routeName || ''} (${trip.tripNumber || ''})`,
            debit: debitAmount,
            credit: 0,
            balance: prevBal + debitAmount,
            notes: clientNoteTag,
          },
        });
      }
    }

    // Synchronize SupplierTransaction (كشف حساب ومستحقات المورد - إذا كانت الرحلة لمورد)
    if (isSupplier) {
      const finalSupplierName = supplierName || 'مورد خارجي';
      const supplierCost = Number(trip.costAmount) > 0 ? Number(trip.costAmount) : Number(trip.route?.supplierCostPerTrip || 0);

      if (supplierCost > 0) {
        const existingSupplierTx = await db.supplierTransaction.findFirst({
          where: { notes: { contains: clientNoteTag } },
        });

        if (existingSupplierTx) {
          await db.supplierTransaction.update({
            where: { id: existingSupplierTx.id },
            data: {
              supplierName: finalSupplierName,
              supplierId: trip.supplierId || trip.route?.supplierId || trip.vehicle?.supplierId || null,
              date: tripDate,
              documentNumber: trip.tripNumber || null,
              description: `تشغيل رحلة مورد: ${trip.route?.routeName || ''} (${trip.tripNumber || ''})`,
              credit: supplierCost,
              notes: clientNoteTag,
            },
          });
        } else {
          const lastSupplierTx = await db.supplierTransaction.findFirst({
            where: { supplierName: finalSupplierName },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          });
          const prevSupplierBal = lastSupplierTx ? Number(lastSupplierTx.balance || 0) : 0;
          await db.supplierTransaction.create({
            data: {
              supplierName: finalSupplierName,
              supplierId: trip.supplierId || trip.route?.supplierId || trip.vehicle?.supplierId || null,
              date: tripDate,
              documentNumber: trip.tripNumber || null,
              description: `تشغيل رحلة مورد: ${trip.route?.routeName || ''} (${trip.tripNumber || ''})`,
              debit: 0,
              credit: supplierCost,
              balance: prevSupplierBal + supplierCost,
              notes: clientNoteTag,
            },
          });
        }
      }
    }

    return operationResult;
  }

  static async removeTripFromFinancials(tripId: string, txClient?: any) {
    const db = txClient || prisma;
    const noteTag = `[Trip#${tripId}]`;

    await Promise.all([
      db.dailyOperation.deleteMany({ where: { notes: { contains: noteTag } } }),
      db.clientTransaction.deleteMany({ where: { notes: { contains: noteTag } } }),
      db.supplierTransaction.deleteMany({ where: { notes: { contains: noteTag } } }),
    ]);

    return true;
  }

  static async listDailyOperations(query: {
    month?: number;
    year?: number;
    companyName?: string;
    driverName?: string;
    supplierName?: string;
    vehiclePlate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.DailyOperationWhereInput = {};
    if (query.year) where.year = Number(query.year);
    if (query.month) where.month = Number(query.month);
    if (query.companyName) where.companyName = { contains: query.companyName, mode: 'insensitive' };
    if (query.driverName) where.driverName = { contains: query.driverName, mode: 'insensitive' };
    if (query.vehiclePlate) where.vehiclePlate = { contains: query.vehiclePlate, mode: 'insensitive' };
    if (query.supplierName) {
      where.OR = [
        { notes: { contains: query.supplierName, mode: 'insensitive' } },
        { driverName: { contains: query.supplierName, mode: 'insensitive' } },
      ];
    }

    if (query.search) {
      where.OR = [
        { driverName: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { routeName: { contains: query.search, mode: 'insensitive' } },
        { branch: { contains: query.search, mode: 'insensitive' } },
        { vehiclePlate: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.dailyOperation.count({ where }),
      prisma.dailyOperation.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { day: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const enrichedItems = items.map((op) => {
      let inferredSupplierName: string | null = null;
      if (op.notes && op.notes.includes('رحلة مورد (')) {
        const match = op.notes.match(/رحلة مورد \(([^)]+)\)/);
        if (match) inferredSupplierName = match[1].trim();
      } else if (op.notes && op.notes.includes('[مورد:')) {
        const match = op.notes.match(/\[مورد:\s*([^\]]+)\]/);
        if (match) inferredSupplierName = match[1].trim();
      } else if (op.driverName && op.driverName.includes('[مورد:')) {
        const match = op.driverName.match(/\[مورد:\s*([^\]]+)\]/);
        if (match) inferredSupplierName = match[1].trim();
      }
      return {
        ...op,
        supplierName: inferredSupplierName,
        executionType: inferredSupplierName ? 'SUPPLIER' : 'COMPANY',
      };
    });

    return {
      items: enrichedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getDailyOperationsSummary(query: { month?: number; year?: number; companyName?: string; supplierName?: string; vehiclePlate?: string }) {
    const where: Prisma.DailyOperationWhereInput = {};
    if (query.year) where.year = Number(query.year);
    if (query.month) where.month = Number(query.month);
    if (query.companyName) where.companyName = { contains: query.companyName, mode: 'insensitive' };
    if (query.vehiclePlate) where.vehiclePlate = { contains: query.vehiclePlate, mode: 'insensitive' };
    if (query.supplierName) {
      where.OR = [
        { notes: { contains: query.supplierName, mode: 'insensitive' } },
        { driverName: { contains: query.supplierName, mode: 'insensitive' } },
      ];
    }

    const operations = await prisma.dailyOperation.findMany({
      where,
      select: {
        tripCount: true,
        withholdingTax: true,
        totalAmount: true,
        netDriverPay: true,
        vehicleCost: true,
        dailyProfit: true,
        netRevenue: true,
        advancePayment: true,
        deduction: true,
        overtime: true,
      },
    });

    const summary = operations.reduce(
      (acc, op) => {
        const trips = Number(op.tripCount || 0);
        acc.totalTrips += trips;
        acc.totalWithholdingTax += Number(op.withholdingTax || 0);
        acc.totalBilling += Number(op.totalAmount || 0);
        acc.totalNetDriverPay += Number(op.netDriverPay || 0);
        acc.totalVehicleCosts += Number(op.vehicleCost || 0) * trips;
        acc.totalDailyProfit += Number(op.dailyProfit || 0);
        acc.totalNetRevenue += Number(op.netRevenue || 0);
        acc.totalAdvances += Number(op.advancePayment || 0);
        acc.totalDeductions += Number(op.deduction || 0);
        acc.totalOvertime += Number(op.overtime || 0);
        return acc;
      },
      {
        count: operations.length,
        totalTrips: 0,
        totalWithholdingTax: 0,
        totalBilling: 0,
        totalNetDriverPay: 0,
        totalVehicleCosts: 0,
        totalDailyProfit: 0,
        totalNetRevenue: 0,
        totalAdvances: 0,
        totalDeductions: 0,
        totalOvertime: 0,
      }
    );

    return summary;
  }


  static async createDailyOperation(data: any) {
    const calculated = this.calculateOperationFields(data);
    const date = data.date ? new Date(data.date) : new Date(data.year, (data.month || 1) - 1, data.day || 1);

    const isSupplier = data.executionType === 'SUPPLIER' || !!data.supplierName;
    const noteTag = `[ManualOp#${Date.now()}]`;
    const executionLabel = isSupplier ? `[مورد: ${data.supplierName || 'شريك'}]` : '[أسطول الشركة]';
    const notes = data.notes ? `${data.notes} - ${executionLabel} ${noteTag}` : `${executionLabel} ${noteTag}`;

    const op = await prisma.dailyOperation.create({
      data: {
        day: Number(data.day),
        month: Number(data.month),
        year: Number(data.year),
        date,
        driverCode: data.driverCode ? Number(data.driverCode) : null,
        driverName: data.driverName,
        routeName: data.routeName,
        companyName: data.companyName,
        branch: data.branch || null,
        vehicleType: data.vehicleType || null,
        vehiclePlate: data.vehiclePlate || null,
        ...calculated,
        notes,
        operationType: data.operationType || 'ايراد',
      },
    });

    // 1. Sync to ClientTransaction (كشف حساب العميل - استحقاق إيراد)
    if (data.companyName && calculated.totalAmount > 0) {
      const lastTx = await prisma.clientTransaction.findFirst({
        where: { companyName: data.companyName },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });
      const prevBal = lastTx ? Number(lastTx.balance || 0) : 0;
      await prisma.clientTransaction.create({
        data: {
          companyName: data.companyName,
          date,
          documentNumber: `OP-${op.day}/${op.month}/${op.year}`,
          description: `حركة تشغيل: ${data.routeName || ''} (${data.driverName || ''})`,
          debit: calculated.totalAmount,
          credit: 0,
          balance: prevBal + calculated.totalAmount,
          notes: noteTag,
        },
      });
    }

    // 2. Sync to SupplierTransaction (كشف حساب ومستحقات المورد إن وجد)
    const supplierCost = (calculated.vehicleCost || 0) * (calculated.tripCount || 1);
    if (isSupplier && data.supplierName && supplierCost > 0) {
      const lastSupplierTx = await prisma.supplierTransaction.findFirst({
        where: { supplierName: data.supplierName },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });
      const prevSupplierBal = lastSupplierTx ? Number(lastSupplierTx.balance || 0) : 0;
      await prisma.supplierTransaction.create({
        data: {
          supplierName: data.supplierName,
          supplierId: data.supplierId || null,
          date,
          documentNumber: `OP-${op.day}/${op.month}/${op.year}`,
          description: `تشغيل خط مورد: ${data.routeName || ''} (${data.driverName || ''})`,
          debit: 0,
          credit: supplierCost,
          balance: prevSupplierBal + supplierCost,
          notes: noteTag,
        },
      });
    }

    // 3. Sync to Trip (لضمان ظهورها فورياً في رحلات اليوم، مؤشرات الداش بورد، وجدول التشغيل)
    try {
      const [client, route, driver, vehicle] = await Promise.all([
        data.companyName
          ? prisma.client.findFirst({ where: { companyName: { contains: data.companyName, mode: 'insensitive' } } })
          : null,
        data.routeName
          ? prisma.route.findFirst({ where: { routeName: { contains: data.routeName, mode: 'insensitive' } } })
          : null,
        data.driverId
          ? prisma.driver.findUnique({ where: { id: data.driverId } })
          : data.driverName
          ? prisma.driver.findFirst({ where: { fullName: { contains: data.driverName, mode: 'insensitive' } } })
          : null,
        data.vehiclePlate
          ? prisma.vehicle.findFirst({ where: { plateNumber: { contains: data.vehiclePlate, mode: 'insensitive' } } })
          : null,
      ]);

      if (client && route && driver && vehicle) {
        const dateCode = date.toISOString().slice(0, 10).replace(/-/g, '');
        const countToday = await prisma.trip.count({ where: { tripDate: date } });
        const tripNumber = `TRIP-${dateCode}-${String(countToday + 1).padStart(3, '0')}`;

        const depTime = new Date(date);
        depTime.setHours(7, 0, 0, 0);
        const arrTime = new Date(date);
        arrTime.setHours(8, 30, 0, 0);

        await prisma.trip.create({
          data: {
            tripNumber,
            clientId: client.id,
            routeId: route.id,
            driverId: driver.id,
            vehicleId: vehicle.id,
            executionType: isSupplier ? 'SUPPLIER' : 'COMPANY',
            supplierId: data.supplierId || null,
            saleAmount: calculated.totalAmount,
            costAmount: supplierCost,
            driverAllowance: calculated.driverDailyRate,
            vehicleCost: calculated.vehicleCost,
            tripDate: date,
            shift: 'MORNING',
            scheduledDeparture: depTime,
            expectedArrival: arrTime,
            actualDeparture: depTime,
            actualArrival: arrTime,
            notes: `${notes} (تم الإنشاء كحركة تشغيل إضافية)`,
            tripStatus: TripStatus.COMPLETED,
          },
        });
      }
    } catch (tripSyncErr) {
      console.warn('Trip synchronization hook for manual operation:', tripSyncErr);
    }

    return op;
  }

  static async updateDailyOperation(id: string, data: any) {
    const calculated = this.calculateOperationFields(data);
    return prisma.dailyOperation.update({
      where: { id },
      data: {
        day: data.day !== undefined ? Number(data.day) : undefined,
        month: data.month !== undefined ? Number(data.month) : undefined,
        year: data.year !== undefined ? Number(data.year) : undefined,
        driverCode: data.driverCode ? Number(data.driverCode) : undefined,
        driverName: data.driverName,
        routeName: data.routeName,
        companyName: data.companyName,
        branch: data.branch,
        vehicleType: data.vehicleType,
        vehiclePlate: data.vehiclePlate,
        ...calculated,
        notes: data.notes,
      },
    });
  }

  static async deleteDailyOperation(id: string) {
    const op = await prisma.dailyOperation.findUnique({ where: { id } });
    if (op && op.notes) {
      const match = op.notes.match(/\[(ManualOp|Trip)#[^\]]+\]/);
      if (match) {
        const noteTag = match[0];
        await Promise.all([
          prisma.clientTransaction.deleteMany({ where: { notes: { contains: noteTag } } }),
          prisma.supplierTransaction.deleteMany({ where: { notes: { contains: noteTag } } }),
          prisma.trip.deleteMany({ where: { notes: { contains: noteTag } } }),
        ]);
      }
    }
    return prisma.dailyOperation.delete({ where: { id } });
  }

  // =========================================================================
  // 3. DRIVER OVERTIME & MONTHLY SETTLEMENTS (مستحقات وسهرات السائقين)
  // =========================================================================

  static async listDriverOvertimes(query: {
    driverName?: string;
    month?: number;
    year?: number;
    fromDate?: string;
    toDate?: string;
    branch?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.DriverOvertimeWhereInput = {};
    if (query.driverName) where.driverName = { contains: query.driverName, mode: 'insensitive' };
    if (query.branch) where.branch = { contains: query.branch, mode: 'insensitive' };

    if (query.month && query.year) {
      const start = new Date(Number(query.year), Number(query.month) - 1, 1);
      const end = new Date(Number(query.year), Number(query.month), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    } else if (query.fromDate || query.toDate) {
      where.date = {};
      if (query.fromDate) where.date.gte = new Date(query.fromDate);
      if (query.toDate) where.date.lte = new Date(query.toDate);
    }

    if (query.search) {
      where.OR = [
        { driverName: { contains: query.search, mode: 'insensitive' } },
        { routeName: { contains: query.search, mode: 'insensitive' } },
        { branch: { contains: query.search, mode: 'insensitive' } },
        { shiftDescription: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.driverOvertime.count({ where }),
      prisma.driverOvertime.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createDriverOvertime(data: any) {
    const date = data.date ? new Date(data.date) : new Date();
    const shiftsCount = Number(data.shiftsCount || 1);
    const shiftRate = Number(data.shiftRate || 0);

    return prisma.driverOvertime.create({
      data: {
        dayOfWeek: data.dayOfWeek || null,
        date,
        driverName: data.driverName,
        vehicleType: data.vehicleType || null,
        routeName: data.routeName,
        shiftDescription: data.shiftDescription || null,
        shiftsCount,
        shiftRate,
        branch: data.branch || null,
        notes: data.notes || null,
      },
    });
  }

  static async updateDriverOvertime(id: string, data: any) {
    return prisma.driverOvertime.update({
      where: { id },
      data: {
        dayOfWeek: data.dayOfWeek,
        date: data.date ? new Date(data.date) : undefined,
        driverName: data.driverName,
        vehicleType: data.vehicleType,
        routeName: data.routeName,
        shiftDescription: data.shiftDescription,
        shiftsCount: data.shiftsCount ? Number(data.shiftsCount) : undefined,
        shiftRate: data.shiftRate ? Number(data.shiftRate) : undefined,
        branch: data.branch,
        notes: data.notes,
      },
    });
  }

  static async deleteDriverOvertime(id: string) {
    return prisma.driverOvertime.delete({ where: { id } });
  }

  static async getDriverMonthlySettlements(query: { month?: number; year?: number; companyName?: string }) {
    const where: Prisma.DailyOperationWhereInput = {};
    if (query.year) where.year = Number(query.year);
    if (query.month) where.month = Number(query.month);
    if (query.companyName) where.companyName = { contains: query.companyName, mode: 'insensitive' };

    const overtimeWhere: Prisma.DriverOvertimeWhereInput = {};
    if (query.month && query.year) {
      const start = new Date(Number(query.year), Number(query.month) - 1, 1);
      const end = new Date(Number(query.year), Number(query.month), 0, 23, 59, 59);
      overtimeWhere.date = { gte: start, lte: end };
    }

    const [operations, recordedSettlements, overtimes, companyDrivers] = await Promise.all([
      prisma.dailyOperation.findMany({
        where,
        select: {
          driverCode: true,
          driverName: true,
          companyName: true,
          branch: true,
          driverDailyRate: true,
          tripCount: true,
          advancePayment: true,
          deduction: true,
          overtime: true,
          netDriverPay: true,
          totalAmount: true,
          netRevenue: true,
          notes: true,
        },
      }),
      query.month && query.year
        ? prisma.driverSettlement.findMany({
            where: { month: Number(query.month), year: Number(query.year) },
          })
        : [],
      prisma.driverOvertime.findMany({
        where: overtimeWhere,
      }),
      prisma.driver.findMany({
        where: { supplierId: null },
        select: { id: true, fullName: true },
      }),
    ]);

    const companyDriverNames = new Set(companyDrivers.map((d) => d.fullName.trim()));

    const settlementMap = new Map<string, any>();
    for (const rs of recordedSettlements) {
      settlementMap.set(rs.driverName, rs);
    }

    const map = new Map<string, any>();

    // 1. Process Daily Operations for Company Drivers only
    for (const op of operations) {
      const rawName = (op.driverName || '').trim();

      // Skip supplier drivers or supplier trips
      if (rawName.includes('[مورد:') || (op.notes && op.notes.includes('رحلة مورد')) || (Number(op.driverDailyRate || 0) === 0 && Number(op.netDriverPay || 0) === 0)) {
        continue;
      }

      // Must be a company driver if we have company drivers defined, or match company driver name
      if (companyDriverNames.size > 0 && !companyDriverNames.has(rawName) && !rawName.includes('سائق الشركة')) {
        // Double check if it's explicitly a company driver
        const isKnownCompany = Array.from(companyDriverNames).some(cn => rawName.includes(cn));
        if (!isKnownCompany) continue;
      }

      const driverName = rawName;
      if (!map.has(driverName)) {
        const saved = settlementMap.get(driverName);
        map.set(driverName, {
          driverCode: op.driverCode,
          driverName,
          companyName: op.companyName,
          branch: op.branch || '-',
          driverDailyRate: Number(op.driverDailyRate || 0),
          totalTrips: 0,
          totalBasePay: 0,
          totalOvertime: 0,
          totalDeductions: 0,
          totalAdvances: 0,
          netPayable: 0,
          companyBilling: 0,
          companyProfit: 0,
          status: saved ? saved.status : 'PENDING',
          paidAt: saved?.paidAt || null,
          paymentTransactionId: saved?.paymentTransactionId || null,
        });
      }

      const item = map.get(driverName);
      const trips = Number(op.tripCount || 0);
      const rate = Number(op.driverDailyRate || 0);
      item.totalTrips += trips;
      item.totalBasePay += rate * trips;
      item.totalOvertime += Number(op.overtime || 0);
      item.totalDeductions += Number(op.deduction || 0);
      item.totalAdvances += Number(op.advancePayment || 0);
      item.netPayable += Number(op.netDriverPay || 0);
      item.companyBilling += Number(op.totalAmount || 0);
      item.companyProfit += Number(op.netRevenue || 0);
    }

    // 2. Add extra recorded overtime from DriverOvertime table for company drivers
    for (const ot of overtimes) {
      const otDriverName = (ot.driverName || '').trim();
      if (otDriverName.includes('[مورد:')) continue;

      if (map.has(otDriverName)) {
        const item = map.get(otDriverName);
        const otPay = Number(ot.shiftsCount || 1) * Number(ot.shiftRate || 0);
        item.totalOvertime += otPay;
        item.netPayable += otPay;
      } else if (companyDriverNames.has(otDriverName)) {
        const otPay = Number(ot.shiftsCount || 1) * Number(ot.shiftRate || 0);
        const saved = settlementMap.get(otDriverName);
        map.set(otDriverName, {
          driverCode: null,
          driverName: otDriverName,
          companyName: '-',
          branch: ot.branch || '-',
          driverDailyRate: 0,
          totalTrips: 0,
          totalBasePay: 0,
          totalOvertime: otPay,
          totalDeductions: 0,
          totalAdvances: 0,
          netPayable: otPay,
          companyBilling: 0,
          companyProfit: 0,
          status: saved ? saved.status : 'PENDING',
          paidAt: saved?.paidAt || null,
          paymentTransactionId: saved?.paymentTransactionId || null,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.netPayable - a.netPayable);
  }

  static async payDriverSettlement(data: {
    driverName: string;
    month: number;
    year: number;
    amount: number;
    accountId: string;
    paymentDate?: string | Date;
    reference?: string;
    notes?: string;
    actorId?: string;
  }) {
    const payDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('مبلغ الصرف يجب أن يكون أكبر من الصفر');

    return prisma.$transaction(async (tx) => {
      const account = await tx.treasuryAccount.findUniqueOrThrow({ where: { id: data.accountId } });

      // Check Treasury Liquidity Sufficiency
      const inEntries = await tx.treasuryEntry.aggregate({
        where: { accountId: data.accountId, kind: 'IN' },
        _sum: { amount: true },
      });
      const outEntries = await tx.treasuryEntry.aggregate({
        where: { accountId: data.accountId, kind: 'OUT' },
        _sum: { amount: true },
      });
      const availableFunds = Number(inEntries._sum.amount || 0) - Number(outEntries._sum.amount || 0);

      if (availableFunds < amount) {
        throw new Error(
          `رصيد حساب (${account.name}) غير كافٍ للصرف. المتاح: ${availableFunds.toLocaleString()} ج.م، والمطلوب صرفه: ${amount.toLocaleString()} ج.م`
        );
      }

      // Check Driver Due Settlement for that Month/Year
      const settlements = await AccountingService.getDriverMonthlySettlements({
        month: Number(data.month),
        year: Number(data.year),
      });
      const driverData = settlements.find(
        (s: any) => (s.driverName || '').trim().toLowerCase() === data.driverName.trim().toLowerCase()
      );
      const netPayableDue = driverData ? Number(driverData.netPayable || 0) : 0;
      const isAlreadyPaid = driverData?.status === 'PAID';

      if (isAlreadyPaid || netPayableDue <= 0) {
        throw new Error(
          `مستحقات السائق (${data.driverName}) عن شهر ${data.month}/${data.year} مسددة بالكامل بالفعل (الرصيد: 0 ج.م). لا توجد مبالغ مستحقة للصرف.`
        );
      }

      if (amount > netPayableDue) {
        throw new Error(
          `مبلغ الصرف المطلوب (${amount.toLocaleString()} ج.م) يتجاوز صافي مستحقات السائق للشهر وقدرها (${netPayableDue.toLocaleString()} ج.م)`
        );
      }

      const txEntry = await tx.treasuryEntry.create({
        data: {
          accountId: data.accountId,
          date: payDate,
          amount: new Prisma.Decimal(amount),
          kind: 'OUT',
          reference: data.reference || `صرف مستحقات سائق: ${data.driverName} عن شهر ${data.month}/${data.year}`,
          notes: data.notes || `صرف راتب وبدلات ${data.driverName}`,
          actorId: data.actorId || 'SYSTEM',
          requestKey: `PAY_DRIVER_${data.driverName}_${data.year}_${data.month}_${Date.now()}`,
          fingerprint: `DRIVER_PAYMENT_${data.driverName}`,
          sourceKey: `DRIVER_SETTLEMENT:${data.driverName}:${data.year}:${data.month}`,
        },
      });

      const settlement = await tx.driverSettlement.upsert({
        where: {
          driverName_month_year: {
            driverName: data.driverName,
            month: Number(data.month),
            year: Number(data.year),
          },
        },
        create: {
          driverName: data.driverName,
          month: Number(data.month),
          year: Number(data.year),
          netPayable: new Prisma.Decimal(amount),
          status: 'PAID',
          paidAt: payDate,
          paymentTransactionId: txEntry.id,
          notes: data.notes,
        },
        update: {
          status: 'PAID',
          paidAt: payDate,
          paymentTransactionId: txEntry.id,
          notes: data.notes,
        },
      });

      return {
        settlement,
        treasuryEntry: txEntry,
        accountName: account.name,
      };
    });
  }

  // =========================================================================
  // 4. SUPPLIER TRANSACTIONS & SETTLEMENTS (كشف حساب ومستحقات الموردين)
  // =========================================================================

  static async listSupplierTransactions(query: { supplierName?: string; fromDate?: string; toDate?: string }) {
    const where: Prisma.SupplierTransactionWhereInput = {};
    if (query.supplierName) where.supplierName = { contains: query.supplierName, mode: 'insensitive' };
    if (query.fromDate || query.toDate) {
      where.date = {};
      if (query.fromDate) where.date.gte = new Date(query.fromDate);
      if (query.toDate) where.date.lte = new Date(query.toDate);
    }

    const rawTxs = await prisma.supplierTransaction.findMany({
      where,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });

    const balancePerSupplier: Record<string, number> = {};
    const computedTxs = rawTxs.map((tx) => {
      const sName = tx.supplierName;
      const prev = balancePerSupplier[sName] || 0;
      const curBal = Math.round((prev + Number(tx.credit || 0) - Number(tx.debit || 0)) * 100) / 100;
      balancePerSupplier[sName] = curBal;
      return {
        ...tx,
        balance: curBal,
      };
    });

    return computedTxs.reverse();
  }

  static async getSuppliersLedgerSummary() {
    const txs = await prisma.supplierTransaction.findMany({
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    const map = new Map<string, any>();
    for (const t of txs) {
      const name = t.supplierName;
      if (!map.has(name)) {
        map.set(name, {
          supplierName: name,
          totalDebit: 0, // ما سددناه للمورد
          totalCredit: 0, // مستحقات رحلات المورد
          balance: 0, // المتبقي للمورد
          transactionsCount: 0,
        });
      }
      const item = map.get(name);
      item.totalDebit += Number(t.debit || 0);
      item.totalCredit += Number(t.credit || 0);
      item.balance = item.totalCredit - item.totalDebit;
      item.transactionsCount += 1;
    }

    return Array.from(map.values()).sort((a, b) => b.balance - a.balance);
  }

  static async createSupplierTransaction(data: any) {
    const date = data.date ? new Date(data.date) : new Date();
    const debit = Number(data.debit || 0);
    const credit = Number(data.credit || 0);

    const aggregates = await prisma.supplierTransaction.aggregate({
      where: { supplierName: { contains: data.supplierName.trim(), mode: 'insensitive' } },
      _sum: { debit: true, credit: true },
    });

    const prevBal = Number(aggregates._sum.credit || 0) - Number(aggregates._sum.debit || 0);
    const currentBal = prevBal + credit - debit;

    return prisma.supplierTransaction.create({
      data: {
        supplierId: data.supplierId || null,
        supplierName: data.supplierName,
        date,
        documentNumber: data.documentNumber || null,
        description: data.description || 'حركة حساب مورد',
        debit,
        credit,
        balance: currentBal,
        notes: data.notes || null,
      },
    });
  }

  static async paySupplierFromTreasury(data: {
    supplierId?: string;
    supplierName: string;
    amount: number;
    accountId: string;
    date?: string | Date;
    reference?: string;
    notes?: string;
    actorId?: string;
    allowAdvance?: boolean;
  }) {
    const payDate = data.date ? new Date(data.date) : new Date();
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('المبلغ المصروف يجب أن يكون أكبر من الصفر');

    return prisma.$transaction(async (tx) => {
      const account = await tx.treasuryAccount.findUniqueOrThrow({ where: { id: data.accountId } });

      // 1. Check Treasury Liquidity Sufficiency
      const inEntries = await tx.treasuryEntry.aggregate({
        where: { accountId: data.accountId, kind: 'IN' },
        _sum: { amount: true },
      });
      const outEntries = await tx.treasuryEntry.aggregate({
        where: { accountId: data.accountId, kind: 'OUT' },
        _sum: { amount: true },
      });
      const availableFunds = Number(inEntries._sum.amount || 0) - Number(outEntries._sum.amount || 0);

      if (availableFunds < amount) {
        throw new Error(
          `رصيد حساب (${account.name}) غير كافٍ للصرف. المتاح: ${availableFunds.toLocaleString()} ج.م، والمطلوب صرفه: ${amount.toLocaleString()} ج.م`
        );
      }

      // 2. Check Supplier Due Balance using actual aggregate totals
      const aggregates = await tx.supplierTransaction.aggregate({
        where: { supplierName: { contains: data.supplierName.trim(), mode: 'insensitive' } },
        _sum: { debit: true, credit: true },
      });
      const totalCredit = Number(aggregates._sum.credit || 0);
      const totalDebit = Number(aggregates._sum.debit || 0);
      const outstandingDue = Math.round((totalCredit - totalDebit) * 100) / 100;

      if (!data.allowAdvance) {
        if (outstandingDue <= 0) {
          throw new Error(
            `لا توجد فواتير أو مستحقات متبقية للمورد (${data.supplierName}). الرصيد الحالي: ${outstandingDue.toLocaleString()} ج.م`
          );
        }
        if (amount > outstandingDue + 1) { // 1 EGP buffer for rounding
          throw new Error(
            `المبلغ المطلوب صرفه (${amount.toLocaleString()} ج.م) أكبر من إجمالي مستحقات المورد المتبقية (${outstandingDue.toLocaleString()} ج.م). يُرجى إدخال مبلغ مساوٍ أو أقل من المستحق.`
          );
        }
      }

      const txEntry = await tx.treasuryEntry.create({
        data: {
          accountId: data.accountId,
          date: payDate,
          amount: new Prisma.Decimal(amount),
          kind: 'OUT',
          reference: data.reference || `سداد مستحقات مورد: ${data.supplierName}`,
          notes: data.notes || null,
          actorId: data.actorId || 'SYSTEM',
          requestKey: `PAY_SUPPLIER_${data.supplierName}_${Date.now()}`,
          fingerprint: `SUPPLIER_PAYMENT_${data.supplierName}`,
        },
      });

      const supplierTx = await tx.supplierTransaction.create({
        data: {
          supplierId: data.supplierId || null,
          supplierName: data.supplierName,
          date: payDate,
          documentNumber: txEntry.id.slice(0, 8).toUpperCase(),
          description: `سند صرف من (${account.name}) - ${data.reference || ''}`,
          debit: amount,
          credit: 0,
          balance: outstandingDue - amount,
          notes: `[TreasuryEntry#${txEntry.id}]`,
        },
      });

      return {
        supplierTx,
        treasuryEntry: txEntry,
        accountName: account.name,
      };
    });
  }

  // =========================================================================
  // 5. CLIENT TRANSACTIONS & RECEIVABLES (كشف حساب وفواتير وتحصيل العملاء)
  // =========================================================================

  static async listClientTransactions(query: { companyName?: string; fromDate?: string; toDate?: string }) {
    const where: Prisma.ClientTransactionWhereInput = {};
    if (query.companyName) where.companyName = { contains: query.companyName, mode: 'insensitive' };
    if (query.fromDate || query.toDate) {
      where.date = {};
      if (query.fromDate) where.date.gte = new Date(query.fromDate);
      if (query.toDate) where.date.lte = new Date(query.toDate);
    }

    const rawTxs = await prisma.clientTransaction.findMany({
      where,
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });

    const balancePerCompany: Record<string, number> = {};
    const computedTxs = rawTxs.map((tx) => {
      const cName = tx.companyName;
      const prev = balancePerCompany[cName] || 0;
      const curBal = Math.round((prev + Number(tx.debit || 0) - Number(tx.credit || 0)) * 100) / 100;
      balancePerCompany[cName] = curBal;
      return {
        ...tx,
        balance: curBal,
      };
    });

    return computedTxs.reverse();
  }

  static async getClientsLedgerSummary() {
    const txs = await prisma.clientTransaction.findMany({
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });

    const map = new Map<string, any>();
    for (const t of txs) {
      const name = t.companyName;
      if (!map.has(name)) {
        map.set(name, {
          companyName: name,
          totalDebit: 0, // إجمالي مطالبات الرحلات
          totalCredit: 0, // إجمالي التحصيلات
          balance: 0, // المديونية المستحقة على العميل
          currentBalance: 0,
          transactionsCount: 0,
        });
      }
      const item = map.get(name);
      item.totalDebit += Number(t.debit || 0);
      item.totalCredit += Number(t.credit || 0);
      item.balance = item.totalDebit - item.totalCredit;
      item.currentBalance = item.balance;
      item.transactionsCount += 1;
    }

    return Array.from(map.values()).map((c) => ({
      ...c,
      totalDebit: Math.round(c.totalDebit * 100) / 100,
      totalCredit: Math.round(c.totalCredit * 100) / 100,
      balance: Math.round(c.balance * 100) / 100,
      currentBalance: Math.round(c.balance * 100) / 100,
    })).sort((a, b) => b.balance - a.balance);
  }

  static async createClientTransaction(data: any) {
    const date = data.date ? new Date(data.date) : new Date();
    const debit = Number(data.debit || 0);
    const credit = Number(data.credit || 0);

    const lastTx = await prisma.clientTransaction.findFirst({
      where: { companyName: data.companyName },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    const prevBal = lastTx ? Number(lastTx.balance || 0) : 0;
    const currentBal = prevBal + debit - credit;

    return prisma.clientTransaction.create({
      data: {
        companyName: data.companyName,
        date,
        documentNumber: data.documentNumber || null,
        description: data.description || 'حركة حساب عميل',
        debit,
        credit,
        balance: currentBal,
        notes: data.notes || null,
      },
    });
  }

  static async recordClientReceiptToTreasury(data: {
    companyName: string;
    amount: number;
    accountId: string;
    date?: string | Date;
    reference?: string;
    notes?: string;
    actorId?: string;
  }) {
    const receiptDate = data.date ? new Date(data.date) : new Date();
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw new Error('مبلغ التحصيل يجب أن يكون أكبر من الصفر');

    return prisma.$transaction(async (tx) => {
      const account = await tx.treasuryAccount.findUniqueOrThrow({ where: { id: data.accountId } });

      // Calculate current outstanding client balance
      const aggregates = await tx.clientTransaction.aggregate({
        where: { companyName: data.companyName },
        _sum: { debit: true, credit: true },
      });
      const totalDebit = Number(aggregates._sum.debit || 0);
      const totalCredit = Number(aggregates._sum.credit || 0);
      const outstandingDue = Math.round((totalDebit - totalCredit) * 100) / 100;

      if (outstandingDue <= 0) {
        throw new Error(
          `لا توجد فواتير أو مديونية مستحقة على شركة (${data.companyName}) للتحصيل. رصيد الحساب الحالي: ${outstandingDue.toLocaleString()} ج.م (مسدد بالكامل)`
        );
      }

      if (amount > outstandingDue) {
        throw new Error(
          `مبلغ التحصيل المطلوب (${amount.toLocaleString()} ج.م) يتجاوز إجمالي الرصيد المستحق على شركة (${data.companyName}) وقدره (${outstandingDue.toLocaleString()} ج.م)`
        );
      }

      const txEntry = await tx.treasuryEntry.create({
        data: {
          accountId: data.accountId,
          date: receiptDate,
          amount: new Prisma.Decimal(amount),
          kind: 'IN',
          reference: data.reference || `تحصيل من شركة: ${data.companyName}`,
          notes: data.notes || null,
          actorId: data.actorId || 'SYSTEM',
          requestKey: `REC_CLIENT_${data.companyName}_${Date.now()}`,
          fingerprint: `CLIENT_RECEIPT_${data.companyName}`,
        },
      });

      const lastTx = await tx.clientTransaction.findFirst({
        where: { companyName: data.companyName },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });

      const prevBal = lastTx ? Number(lastTx.balance || 0) : 0;

      const clientTx = await tx.clientTransaction.create({
        data: {
          companyName: data.companyName,
          date: receiptDate,
          documentNumber: txEntry.id.slice(0, 8).toUpperCase(),
          description: `سند تحصيل في (${account.name}) - ${data.reference || ''}`,
          debit: 0,
          credit: amount,
          balance: prevBal - amount,
          notes: `[TreasuryEntry#${txEntry.id}]`,
        },
      });

      return {
        clientTx,
        treasuryEntry: txEntry,
        accountName: account.name,
      };
    });
  }

  // =========================================================================
  // 6. EXPENSES (المصروفات العامة والتشغيلية)
  // =========================================================================

  static async listExpenses(query: {
    month?: number;
    year?: number;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};
    if (query.year) where.year = Number(query.year);
    if (query.month) where.month = Number(query.month);
    if (query.category) where.category = { contains: query.category, mode: 'insensitive' };

    if (query.search) {
      where.OR = [
        { category: { contains: query.search, mode: 'insensitive' } },
        { branch: { contains: query.search, mode: 'insensitive' } },
        { vehicleNumber: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getExpensesSummary(query: { month?: number; year?: number }) {
    const where: Prisma.ExpenseWhereInput = {};
    if (query.year) where.year = Number(query.year);
    if (query.month) where.month = Number(query.month);

    const expenses = await prisma.expense.findMany({
      where,
      select: { category: true, amount: true },
    });

    const categoryTotals: Record<string, number> = {};
    let totalExpenses = 0;

    for (const exp of expenses) {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      const cat = exp.category || 'نثريات أخرى';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    }

    return {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      count: expenses.length,
      byCategory: categoryTotals,
    };
  }

  static async createExpense(data: any, accountId?: string, actorId?: string) {
    const date = data.date ? new Date(data.date) : new Date();
    const amount = Number(data.amount || 0);

    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          day: data.day ? Number(data.day) : date.getDate(),
          month: data.month ? Number(data.month) : date.getMonth() + 1,
          year: data.year ? Number(data.year) : date.getFullYear(),
          date,
          category: data.category,
          amount,
          branch: data.branch || null,
          vehicleNumber: data.vehicleNumber || null,
          notes: data.notes || null,
          operationType: 'مصروف',
        },
      });

      if (accountId && amount > 0) {
        await tx.treasuryEntry.create({
          data: {
            accountId,
            date,
            amount: new Prisma.Decimal(amount),
            kind: 'OUT',
            reference: `سداد مصروف: ${data.category} ${data.vehicleNumber ? `(سيارة ${data.vehicleNumber})` : ''}`,
            notes: data.notes || null,
            actorId: actorId || 'SYSTEM',
            requestKey: `EXP_${expense.id}`,
            fingerprint: `EXPENSE_${expense.id}`,
            sourceKey: `EXPENSE:${expense.id}`,
          },
        });
      }

      return expense;
    });
  }

  static async updateExpense(id: string, data: any) {
    return prisma.expense.update({
      where: { id },
      data: {
        day: data.day !== undefined ? Number(data.day) : undefined,
        month: data.month !== undefined ? Number(data.month) : undefined,
        year: data.year !== undefined ? Number(data.year) : undefined,
        date: data.date ? new Date(data.date) : undefined,
        category: data.category,
        amount: data.amount ? Number(data.amount) : undefined,
        branch: data.branch,
        vehicleNumber: data.vehicleNumber,
        notes: data.notes,
      },
    });
  }

  static async deleteExpense(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.treasuryEntry.deleteMany({ where: { sourceKey: `EXPENSE:${id}` } });
      return tx.expense.delete({ where: { id } });
    });
  }

  // =========================================================================
  // 7. INSTALLMENTS (أقساط السيارات والتمويل البنكي)
  // =========================================================================

  static async listInstallments(query: { category?: string; status?: string; vehiclePlate?: string; search?: string }) {
    const where: Prisma.InstallmentWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.vehiclePlate) where.vehiclePlate = query.vehiclePlate;
    if (query.search) {
      where.OR = [
        { assetName: { contains: query.search, mode: 'insensitive' } },
        { vehiclePlate: { contains: query.search, mode: 'insensitive' } },
        { bankName: { contains: query.search, mode: 'insensitive' } },
        { chequeNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return prisma.installment.findMany({
      where,
      orderBy: [{ category: 'asc' }, { bankDueDate: 'asc' }, { installmentNumber: 'asc' }],
    });
  }

  static async getInstallmentsSummary(query?: { vehiclePlate?: string }) {
    const where: Prisma.InstallmentWhereInput = {};
    if (query?.vehiclePlate) where.vehiclePlate = query.vehiclePlate;

    const installments = await prisma.installment.findMany({ where });
    let totalPending = 0;
    let totalPaid = 0;
    let pendingCount = 0;
    let paidCount = 0;

    for (const inst of installments) {
      const amt = Number(inst.bankAmount || 0);
      if (inst.status === 'PAID') {
        totalPaid += amt;
        paidCount++;
      } else {
        totalPending += amt;
        pendingCount++;
      }
    }

    return {
      totalPending: Math.round(totalPending * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      pendingCount,
      paidCount,
      totalCount: installments.length,
    };
  }

  static async createInstallment(data: any) {
    const bankAmount = Number(data.bankAmount || 0);
    const clientAmount = data.clientAmount ? Number(data.clientAmount) : null;
    const margin = clientAmount !== null ? clientAmount - bankAmount : null;
    const installmentNumber = Number(data.installmentNumber) || 1;
    const bankDueDate = data.bankDueDate ? new Date(data.bankDueDate) : new Date();

    return prisma.installment.create({
      data: {
        category: data.category || 'VEHICLE',
        assetName: data.assetName || (data.vehiclePlate ? `مركبة ${data.vehiclePlate}` : 'أصل جديد'),
        vehiclePlate: data.vehiclePlate || null,
        installmentNumber,
        bankDueDate,
        bankAmount,
        clientDueDate: data.clientDueDate ? new Date(data.clientDueDate) : null,
        clientAmount,
        margin,
        chequeNumber: data.chequeNumber || null,
        bankName: data.bankName || null,
        status: data.status || 'PENDING',
        notes: data.notes || null,
      },
    });
  }

  static async payInstallmentFromTreasury(data: {
    installmentId: string;
    accountId: string;
    date?: string | Date;
    reference?: string;
    notes?: string;
    actorId?: string;
  }) {
    const payDate = data.date ? new Date(data.date) : new Date();

    return prisma.$transaction(async (tx) => {
      const installment = await tx.installment.findUniqueOrThrow({ where: { id: data.installmentId } });
      if (installment.status === 'PAID') throw new Error('هذا القسط مسدد بالفعل');

      const amount = Number(installment.bankAmount);
      const account = await tx.treasuryAccount.findUniqueOrThrow({ where: { id: data.accountId } });

      const txEntry = await tx.treasuryEntry.create({
        data: {
          accountId: data.accountId,
          date: payDate,
          amount: new Prisma.Decimal(amount),
          kind: 'OUT',
          reference: data.reference || `سداد قسط رقم ${installment.installmentNumber} (${installment.assetName})`,
          notes: data.notes || `شيك رقم: ${installment.chequeNumber || '-'} / بنك: ${installment.bankName || '-'}`,
          actorId: data.actorId || 'SYSTEM',
          requestKey: `INST_PAY_${installment.id}`,
          fingerprint: `INSTALLMENT_PAYMENT_${installment.id}`,
          sourceKey: `INSTALLMENT:${installment.id}`,
        },
      });

      const updatedInstallment = await tx.installment.update({
        where: { id: installment.id },
        data: {
          status: 'PAID',
          notes: `${installment.notes || ''} [تم السداد من ${account.name} بتاريخ ${payDate.toISOString().slice(0, 10)}]`.trim(),
        },
      });

      return {
        installment: updatedInstallment,
        treasuryEntry: txEntry,
      };
    });
  }

  // =========================================================================
  // 8. STAFF PAYROLL (رواتب الموظفين الإداريين)
  // =========================================================================

  static async listStaffPayroll(query?: { month?: number; year?: number; search?: string }) {
    const where: Prisma.StaffPayrollWhereInput = {};
    if (query?.year && query?.month) {
      const year = Number(query.year);
      const month = Number(query.month);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      where.date = { gte: start, lte: end };
    } else if (query?.year) {
      const year = Number(query.year);
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      where.date = { gte: start, lte: end };
    }

    if (query?.search) {
      where.OR = [
        { employeeName: { contains: query.search, mode: 'insensitive' } },
        { jobTitle: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return prisma.staffPayroll.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  static async createStaffPayroll(data: any, accountId?: string, actorId?: string) {
    const basic = Number(data.basicSalary || 0);
    const overtime = Number(data.overtime || 0);
    const deductions = Number(data.deductions || 0);
    const advances = Number(data.advances || 0);
    const penalties = Number(data.penalties || 0);
    const netSalary = basic + overtime - (deductions + advances + penalties);
    const date = data.date ? new Date(data.date) : new Date();

    return prisma.$transaction(async (tx) => {
      const payroll = await tx.staffPayroll.create({
        data: {
          date,
          employeeName: data.employeeName,
          jobTitle: data.jobTitle,
          basicSalary: basic,
          overtime,
          deductions,
          advances,
          penalties,
          netSalary,
          notes: data.notes || null,
        },
      });

      if (accountId && netSalary > 0) {
        const account = await tx.treasuryAccount.findUniqueOrThrow({ where: { id: accountId } });
        const inEntries = await tx.treasuryEntry.aggregate({
          where: { accountId, kind: 'IN' },
          _sum: { amount: true },
        });
        const outEntries = await tx.treasuryEntry.aggregate({
          where: { accountId, kind: 'OUT' },
          _sum: { amount: true },
        });
        const availableFunds = Number(inEntries._sum.amount || 0) - Number(outEntries._sum.amount || 0);

        if (availableFunds < netSalary) {
          throw new Error(
            `رصيد حساب (${account.name}) غير كافٍ لصرف الراتب. المتاح: ${availableFunds.toLocaleString()} ج.م، والمطلوب صرفه: ${netSalary.toLocaleString()} ج.م`
          );
        }

        await tx.treasuryEntry.create({
          data: {
            accountId,
            date,
            amount: new Prisma.Decimal(netSalary),
            kind: 'OUT',
            reference: `صرف راتب الموظف: ${data.employeeName} (${data.jobTitle})`,
            notes: data.notes || null,
            actorId: actorId || 'SYSTEM',
            requestKey: `PAYROLL_${payroll.id}`,
            fingerprint: `STAFF_PAYROLL_${payroll.id}`,
            sourceKey: `STAFF_PAYROLL:${payroll.id}`,
          },
        });
      }

      return payroll;
    });
  }

  static async deleteStaffPayroll(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.treasuryEntry.deleteMany({ where: { sourceKey: `STAFF_PAYROLL:${id}` } });
      return tx.staffPayroll.delete({ where: { id } });
    });
  }

  // =========================================================================
  // 9. VEHICLE FINANCIAL & COST CENTER LEDGER (سجل أرباح وتكاليف وعوائد كل سيارة)
  // =========================================================================

  static async getVehicleFinancialLedger(query: { month?: number; year?: number; vehiclePlate?: string; search?: string }) {
    const whereVehicles: Prisma.VehicleWhereInput = {};
    const whereOps: Prisma.DailyOperationWhereInput = {};
    const whereExp: Prisma.ExpenseWhereInput = {};
    const whereInst: Prisma.InstallmentWhereInput = { category: 'VEHICLE' };

    if (query.year) {
      whereOps.year = Number(query.year);
      whereExp.year = Number(query.year);
    }
    if (query.month) {
      whereOps.month = Number(query.month);
      whereExp.month = Number(query.month);
    }

    if (query.vehiclePlate) {
      whereVehicles.plateNumber = query.vehiclePlate;
      whereOps.vehiclePlate = query.vehiclePlate;
      whereExp.vehicleNumber = query.vehiclePlate;
      whereInst.vehiclePlate = query.vehiclePlate;
    } else if (query.search) {
      whereVehicles.OR = [
        { plateNumber: { contains: query.search, mode: 'insensitive' } },
        { make: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const whereMaintenance: Prisma.MaintenanceRecordWhereInput = {};
    if (query.month && query.year) {
      const year = Number(query.year);
      const month = Number(query.month);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      whereMaintenance.serviceDate = { gte: start, lte: end };
      whereInst.bankDueDate = { gte: start, lte: end };
    } else if (query.year) {
      const year = Number(query.year);
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      whereMaintenance.serviceDate = { gte: start, lte: end };
      whereInst.bankDueDate = { gte: start, lte: end };
    }

    const [vehicles, ops, expenses, installments, maintenanceRecords] = await Promise.all([
      prisma.vehicle.findMany({
        where: whereVehicles,
        include: { assignedDriver: true, supplier: true },
        orderBy: { plateNumber: 'asc' },
      }),
      prisma.dailyOperation.findMany({
        where: whereOps,
        select: {
          id: true,
          day: true,
          month: true,
          year: true,
          routeName: true,
          companyName: true,
          vehiclePlate: true,
          vehicleType: true,
          tripCount: true,
          vehicleCost: true,
          dailyRate: true,
          totalAmount: true,
          dailyProfit: true,
        },
      }),
      prisma.expense.findMany({
        where: whereExp,
        select: {
          id: true,
          date: true,
          vehicleNumber: true,
          amount: true,
          category: true,
          notes: true,
        },
      }),
      prisma.installment.findMany({
        where: whereInst,
        orderBy: [{ bankDueDate: 'asc' }, { installmentNumber: 'asc' }],
      }),
      prisma.maintenanceRecord.findMany({
        where: whereMaintenance,
        include: { vehicle: true },
      }),
    ]);

    let totalAllTrips = 0;
    let totalAllGrossRevenue = 0;
    let totalAllVehicleDirectCost = 0;
    let totalAllMaintenanceCosts = 0;
    let totalAllOtherExpenses = 0;
    let totalAllInstallments = 0;

    const result = vehicles.map((v) => {
      const plate = v.plateNumber;
      const vOps = ops.filter((o) => o.vehiclePlate === plate);
      const vExpenses = expenses.filter((e) => e.vehicleNumber === plate);
      const vInstallments = installments.filter((i) => i.vehiclePlate === plate);
      const vMaintenance = maintenanceRecords.filter((m) => m.vehicleId === v.id || m.vehicle?.plateNumber === plate);

      const totalTrips = vOps.reduce((sum, o) => sum + Number(o.tripCount || 0), 0);
      const grossRevenue = vOps.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const vehicleDirectCost = vOps.reduce((sum, o) => sum + Number(o.vehicleCost || 0) * Number(o.tripCount || 0), 0);
      const maintenanceCosts = vMaintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0);
      const otherExpenses = vExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalInstallments = vInstallments.reduce((sum, i) => sum + Number(i.bankAmount || 0), 0);
      const totalInstallmentsPaid = vInstallments.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + Number(i.bankAmount || 0), 0);
      const totalInstallmentsPending = vInstallments.filter((i) => i.status !== 'PAID').reduce((sum, i) => sum + Number(i.bankAmount || 0), 0);

      const totalCosts = vehicleDirectCost + maintenanceCosts + otherExpenses + totalInstallmentsPaid;
      const netROI = grossRevenue - totalCosts;
      const netCashFlow = vehicleDirectCost - (maintenanceCosts + otherExpenses + totalInstallmentsPaid);
      const marginPercent = grossRevenue > 0 ? Math.round((netROI / grossRevenue) * 1000) / 10 : 0;

      totalAllTrips += totalTrips;
      totalAllGrossRevenue += grossRevenue;
      totalAllVehicleDirectCost += vehicleDirectCost;
      totalAllMaintenanceCosts += maintenanceCosts;
      totalAllOtherExpenses += otherExpenses;
      totalAllInstallments += totalInstallmentsPaid;

      const modelName = `${v.make || ''} ${v.model || ''}`.trim() || v.vehicleType || 'مركبة أسطول';
      const driverName = v.assignedDriver?.fullName || 'بدون سائق ثابت';

      return {
        vehicleId: v.id,
        plateNumber: v.plateNumber,
        make: v.make,
        model: v.model,
        modelName,
        vehicleType: v.vehicleType,
        assignedDriver: driverName,
        driverName,
        driverPhone: v.assignedDriver?.phoneNumber || null,
        supplier: v.supplier?.name || 'أسطول الشركة',
        isCompanyVehicle: !v.supplierId,
        totalTrips,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        vehicleDirectCost: Math.round(vehicleDirectCost * 100) / 100,
        totalVehicleCostAllocated: Math.round(vehicleDirectCost * 100) / 100,
        maintenanceCosts: Math.round(maintenanceCosts * 100) / 100,
        otherExpenses: Math.round(otherExpenses * 100) / 100,
        totalExpenses: Math.round((maintenanceCosts + otherExpenses) * 100) / 100,
        totalInstallments: Math.round(totalInstallments * 100) / 100,
        totalInstallmentsPaid: Math.round(totalInstallmentsPaid * 100) / 100,
        totalInstallmentsPending: Math.round(totalInstallmentsPending * 100) / 100,
        totalCosts: Math.round(totalCosts * 100) / 100,
        netROI: Math.round(netROI * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        marginPercent,
        operations: vOps,
        expenses: vExpenses,
        installments: vInstallments,
        maintenance: vMaintenance,
      };
    });

    const items = result.sort((a, b) => b.netROI - a.netROI);

    const summary = {
      totalTrips: totalAllTrips,
      totalGrossRevenue: Math.round(totalAllGrossRevenue * 100) / 100,
      totalVehicleCosts: Math.round(totalAllVehicleDirectCost * 100) / 100,
      totalVehicleCostAllocated: Math.round(totalAllVehicleDirectCost * 100) / 100,
      totalMaintenance: Math.round(totalAllMaintenanceCosts * 100) / 100,
      totalOtherExpenses: Math.round(totalAllOtherExpenses * 100) / 100,
      totalExpenses: Math.round((totalAllMaintenanceCosts + totalAllOtherExpenses) * 100) / 100,
      totalInstallments: Math.round(totalAllInstallments * 100) / 100,
      totalNetROI: Math.round((totalAllGrossRevenue - (totalAllVehicleDirectCost + totalAllMaintenanceCosts + totalAllOtherExpenses + totalAllInstallments)) * 100) / 100,
      vehicleCount: vehicles.length,
    };

    return {
      summary,
      items,
    };
  }

  // =========================================================================
  // 10. INCOME STATEMENT (P&L) & PERIOD CLOSING (قائمة الدخل وإقفال الشهور)
  // =========================================================================

  static async getIncomeStatement(query: { month?: number; year?: number }) {
    const whereOps: Prisma.DailyOperationWhereInput = {};
    const whereExp: Prisma.ExpenseWhereInput = {};
    const wherePayroll: Prisma.StaffPayrollWhereInput = {};

    if (query.year) {
      whereOps.year = Number(query.year);
      whereExp.year = Number(query.year);
    }
    if (query.month) {
      whereOps.month = Number(query.month);
      whereExp.month = Number(query.month);
    }

    const whereMaintenance: Prisma.MaintenanceRecordWhereInput = {};
    const whereInstallments: Prisma.InstallmentWhereInput = { status: 'PAID' };

    if (query.month && query.year) {
      const year = Number(query.year);
      const month = Number(query.month);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      wherePayroll.date = { gte: start, lte: end };
      whereMaintenance.serviceDate = { gte: start, lte: end };
      whereInstallments.bankDueDate = { gte: start, lte: end };
    } else if (query.year) {
      const year = Number(query.year);
      const start = new Date(Date.UTC(year, 0, 1));
      const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      wherePayroll.date = { gte: start, lte: end };
      whereMaintenance.serviceDate = { gte: start, lte: end };
      whereInstallments.bankDueDate = { gte: start, lte: end };
    }

    const [opsSummary, expensesSummary, payrolls, installments, maintenanceSummary, period] = await Promise.all([
      this.getDailyOperationsSummary(query),
      this.getExpensesSummary(query),
      prisma.staffPayroll.findMany({ where: wherePayroll }),
      prisma.installment.findMany({ where: whereInstallments }),
      prisma.maintenanceRecord.aggregate({
        where: whereMaintenance,
        _sum: { cost: true },
      }),
      query.year && query.month
        ? prisma.financialPeriod.findUnique({
            where: { year_month: { year: Number(query.year), month: Number(query.month) } },
          })
        : null,
    ]);

    const totalStaffSalaries = payrolls.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
    const totalMaintenance = Number(maintenanceSummary._sum.cost || 0);
    const totalInstallmentsPaid = installments.reduce((sum, i) => sum + Number(i.bankAmount || 0), 0);

    const grossRevenue = opsSummary.totalBilling + opsSummary.totalWithholdingTax;
    const withholdingTaxDeducted = opsSummary.totalWithholdingTax;
    const netRevenueFromOps = opsSummary.totalBilling;

    const directOperationsCosts = opsSummary.totalNetDriverPay + opsSummary.totalVehicleCosts;
    const grossProfit = netRevenueFromOps - directOperationsCosts;

    const totalIndirectExpenses =
      expensesSummary.totalExpenses + totalStaffSalaries + totalMaintenance + totalInstallmentsPaid;

    const netOperatingProfit = grossProfit - totalIndirectExpenses;

    const roundedGrossRevenue = Math.round(grossRevenue * 100) / 100;
    const roundedWHTax = Math.round(withholdingTaxDeducted * 100) / 100;
    const roundedNetBilling = Math.round(netRevenueFromOps * 100) / 100;
    const roundedDriverPay = Math.round(opsSummary.totalNetDriverPay * 100) / 100;
    const roundedVehicleCosts = Math.round(opsSummary.totalVehicleCosts * 100) / 100;
    const roundedDirectCosts = Math.round(directOperationsCosts * 100) / 100;
    const roundedGrossProfit = Math.round(grossProfit * 100) / 100;
    const roundedStaffSalaries = Math.round(totalStaffSalaries * 100) / 100;
    const roundedMaintenance = Math.round(totalMaintenance * 100) / 100;
    const roundedInstallments = Math.round(totalInstallmentsPaid * 100) / 100;
    const roundedIndirectExpenses = Math.round(totalIndirectExpenses * 100) / 100;
    const roundedNetProfit = Math.round(netOperatingProfit * 100) / 100;

    return {
      period: {
        year: query.year,
        month: query.month,
        status: period?.status || 'OPEN',
        closedAt: period?.closedAt || null,
        closedBy: period?.closedBy || null,
      },
      revenues: {
        grossBilling: roundedGrossRevenue,
        withholdingTaxDeducted: roundedWHTax,
        netClientBilling: roundedNetBilling,
      },
      revenue: {
        grossBilling: roundedGrossRevenue,
        withholdingTax: roundedWHTax,
        netClientBilling: roundedNetBilling,
      },
      directCosts: {
        driverPayAndOvertime: roundedDriverPay,
        driverAdvances: Math.round(opsSummary.totalAdvances * 100) / 100,
        driverDeductions: Math.round(opsSummary.totalDeductions * 100) / 100,
        driverOvertime: Math.round(opsSummary.totalOvertime * 100) / 100,
        vehicleDirectOperatingCosts: roundedVehicleCosts,
        totalDirectCosts: roundedDirectCosts,
      },
      costs: {
        totalDriverPayouts: roundedDriverPay,
        driverAdvances: Math.round(opsSummary.totalAdvances * 100) / 100,
        driverDeductions: Math.round(opsSummary.totalDeductions * 100) / 100,
        driverOvertime: Math.round(opsSummary.totalOvertime * 100) / 100,
        grossOperatingMargin: roundedGrossProfit,
      },
      grossProfit: roundedGrossProfit,
      indirectExpenses: {
        categorizedExpenses: expensesSummary.totalExpenses,
        expensesByCategory: expensesSummary.byCategory,
        staffPayroll: roundedStaffSalaries,
        fleetMaintenance: roundedMaintenance,
        vehicleInstallments: roundedInstallments,
        totalIndirectExpenses: roundedIndirectExpenses,
      },
      expenses: {
        totalExpenses: roundedIndirectExpenses,
        byCategory: expensesSummary.byCategory,
        categorizedExpenses: expensesSummary.totalExpenses,
        staffPayroll: roundedStaffSalaries,
        fleetMaintenance: roundedMaintenance,
        vehicleInstallments: roundedInstallments,
      },
      netProfit: roundedNetProfit,
    };
  }

  static async getMonthlyBreakdown(query: { year?: number }) {
    const currentYear = Number(query.year) || new Date().getFullYear();

    const [allOps, allExpenses] = await Promise.all([
      prisma.dailyOperation.findMany({
        where: { year: currentYear },
        select: {
          month: true,
          totalAmount: true,
          netDriverPay: true,
          vehicleCost: true,
          dailyProfit: true,
          netRevenue: true,
          tripCount: true,
          withholdingTax: true,
        },
      }),
      prisma.expense.findMany({
        where: { year: currentYear },
        select: { month: true, amount: true },
      }),
    ]);

    const monthlyMap: Record<number, any> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyMap[m] = {
        month: m,
        year: currentYear,
        operationsCount: 0,
        tripsCount: 0,
        trips: 0,
        grossBilling: 0,
        withholdingTax: 0,
        netClientBilling: 0,
        driverCosts: 0,
        totalDriverPayouts: 0,
        vehicleCosts: 0,
        grossProfit: 0,
        grossOperatingMargin: 0,
        generalExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
      };
    }

    for (const op of allOps) {
      const m = op.month;
      if (monthlyMap[m]) {
        monthlyMap[m].operationsCount += 1;
        monthlyMap[m].tripsCount += Number(op.tripCount || 0);
        monthlyMap[m].trips += Number(op.tripCount || 0);
        monthlyMap[m].withholdingTax += Number(op.withholdingTax || 0);
        monthlyMap[m].netClientBilling += Number(op.totalAmount || 0);
        monthlyMap[m].grossBilling += Number(op.totalAmount || 0) + Number(op.withholdingTax || 0);
        monthlyMap[m].driverCosts += Number(op.netDriverPay || 0);
        monthlyMap[m].totalDriverPayouts += Number(op.netDriverPay || 0);
        monthlyMap[m].vehicleCosts += Number(op.vehicleCost || 0) * Number(op.tripCount || 0);
      }
    }

    for (const exp of allExpenses) {
      const m = exp.month;
      if (m && monthlyMap[m]) {
        monthlyMap[m].generalExpenses += Number(exp.amount || 0);
        monthlyMap[m].totalExpenses += Number(exp.amount || 0);
      }
    }

    const result = Object.values(monthlyMap).map((item: any) => {
      const grossMargin = item.netClientBilling - item.driverCosts - item.vehicleCosts;
      item.grossProfit = Math.round(grossMargin * 100) / 100;
      item.grossOperatingMargin = Math.round(grossMargin * 100) / 100;
      item.netProfit = Math.round((grossMargin - item.generalExpenses) * 100) / 100;

      item.grossBilling = Math.round(item.grossBilling * 100) / 100;
      item.withholdingTax = Math.round(item.withholdingTax * 100) / 100;
      item.netClientBilling = Math.round(item.netClientBilling * 100) / 100;
      item.driverCosts = Math.round(item.driverCosts * 100) / 100;
      item.totalDriverPayouts = Math.round(item.totalDriverPayouts * 100) / 100;
      item.vehicleCosts = Math.round(item.vehicleCosts * 100) / 100;
      item.generalExpenses = Math.round(item.generalExpenses * 100) / 100;
      item.totalExpenses = Math.round(item.totalExpenses * 100) / 100;
      return item;
    });

    const total = result.reduce(
      (acc, m) => {
        acc.operationsCount += m.operationsCount;
        acc.tripsCount += m.tripsCount;
        acc.trips += m.trips;
        acc.grossBilling += m.grossBilling;
        acc.withholdingTax += m.withholdingTax;
        acc.netClientBilling += m.netClientBilling;
        acc.driverCosts += m.driverCosts;
        acc.totalDriverPayouts += m.totalDriverPayouts;
        acc.vehicleCosts += m.vehicleCosts;
        acc.grossProfit += m.grossProfit;
        acc.grossOperatingMargin += m.grossOperatingMargin;
        acc.generalExpenses += m.generalExpenses;
        acc.totalExpenses += m.totalExpenses;
        acc.netProfit += m.netProfit;
        return acc;
      },
      {
        month: 0,
        year: currentYear,
        operationsCount: 0,
        tripsCount: 0,
        trips: 0,
        grossBilling: 0,
        withholdingTax: 0,
        netClientBilling: 0,
        driverCosts: 0,
        totalDriverPayouts: 0,
        vehicleCosts: 0,
        grossProfit: 0,
        grossOperatingMargin: 0,
        generalExpenses: 0,
        totalExpenses: 0,
        netProfit: 0,
      }
    );

    total.grossBilling = Math.round(total.grossBilling * 100) / 100;
    total.withholdingTax = Math.round(total.withholdingTax * 100) / 100;
    total.netClientBilling = Math.round(total.netClientBilling * 100) / 100;
    total.driverCosts = Math.round(total.driverCosts * 100) / 100;
    total.totalDriverPayouts = Math.round(total.totalDriverPayouts * 100) / 100;
    total.vehicleCosts = Math.round(total.vehicleCosts * 100) / 100;
    total.grossProfit = Math.round(total.grossProfit * 100) / 100;
    total.grossOperatingMargin = Math.round(total.grossOperatingMargin * 100) / 100;
    total.generalExpenses = Math.round(total.generalExpenses * 100) / 100;
    total.totalExpenses = Math.round(total.totalExpenses * 100) / 100;
    total.netProfit = Math.round(total.netProfit * 100) / 100;

    return {
      year: currentYear,
      months: result,
      total,
    };
  }

  static async closeFinancialPeriod(year: number, month: number, userId: string, notes?: string) {
    const summary = await this.getIncomeStatement({ year, month });

    return prisma.financialPeriod.upsert({
      where: { year_month: { year, month } },
      create: {
        year,
        month,
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: userId,
        notes: notes || `إقفال الفترة المالية لشهر ${month}/${year}`,
        totalRevenue: new Prisma.Decimal(summary.revenues.netClientBilling),
        totalCost: new Prisma.Decimal(summary.directCosts.totalDirectCosts + summary.indirectExpenses.totalIndirectExpenses),
        netProfit: new Prisma.Decimal(summary.netProfit),
      },
      update: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: userId,
        notes: notes || `إعادة إقفال الفترة المالية لشهر ${month}/${year}`,
        totalRevenue: new Prisma.Decimal(summary.revenues.netClientBilling),
        totalCost: new Prisma.Decimal(summary.directCosts.totalDirectCosts + summary.indirectExpenses.totalIndirectExpenses),
        netProfit: new Prisma.Decimal(summary.netProfit),
      },
    });
  }

  static async reopenFinancialPeriod(year: number, month: number, userId: string) {
    return prisma.financialPeriod.update({
      where: { year_month: { year, month } },
      data: {
        status: 'OPEN',
        closedAt: null,
        notes: `تم إعادة فتح الشهر للمراجعة بواسطة ${userId}`,
      },
    });
  }

  // =========================================================================
  // 11. EXCEL EXPORTS (تصدير شيتات الإكسيل الرسمية)
  // =========================================================================

  static async exportOperationsToExcel(query: { month?: number; year?: number }) {
    const where: Prisma.DailyOperationWhereInput = {};
    if (query.year) where.year = Number(query.year);
    if (query.month) where.month = Number(query.month);

    const ops = await prisma.dailyOperation.findMany({
      where,
      orderBy: [{ day: 'asc' }, { driverName: 'asc' }],
    });

    const data = ops.map((o) => ({
      اليوم: o.day,
      الشهر: o.month,
      السنة: o.year,
      'كود السائق': o.driverCode || '',
      'اسم السائق': o.driverName,
      'اسم الخط': o.routeName,
      'اسم الشركة': o.companyName,
      الفرع: o.branch || '',
      'نوع السيارة': o.vehicleType || '',
      'رقم اللوحة': o.vehiclePlate || '',
      'سعر اليومية': Number(o.dailyRate),
      'عدد الرحلات': Number(o.tripCount),
      'يومية السائق': Number(o.driverDailyRate),
      'تكلفة السيارة': Number(o.vehicleCost),
      'نسبة الضريبة': Number(o.taxRate),
      'ضريبة الخصم': Number(o.withholdingTax),
      'إجمالي المطالبة': Number(o.totalAmount),
      'سلفة السائق': Number(o.advancePayment),
      'خصومات السائق': Number(o.deduction),
      'سهرات وإضافي': Number(o.overtime),
      'صافي مستحق السائق': Number(o.netDriverPay),
      'ربح اليومية': Number(o.dailyProfit),
      'صافي الإيراد': Number(o.netRevenue),
      ملاحظات: o.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `تشغيل_${query.month || 'الكل'}_${query.year || ''}`);

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  static async exportSettlementsToExcel(query: { month?: number; year?: number }) {
    const settlements = await this.getDriverMonthlySettlements(query);

    const data = settlements.map((s) => ({
      'كود السائق': s.driverCode || '',
      'اسم السائق': s.driverName,
      'الشركة / الموقع': s.companyName,
      الفرع: s.branch,
      'عدد الرحلات': s.totalTrips,
      'إجمالي اليوميات الأساسية': s.totalBasePay,
      'إجمالي السهرات والإضافي': s.totalOvertime,
      'إجمالي السلف': s.totalAdvances,
      'إجمالي الخصومات والجزاءات': s.totalDeductions,
      'صافي المستحق للدفع': s.netPayable,
      'إجمالي مطالبة العميل': s.companyBilling,
      'صافي ربح الشركة': s.companyProfit,
      الحالة: s.status === 'PAID' ? 'تم الصرف' : 'معلق',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `مستحقات_السائقين_${query.month || ''}_${query.year || ''}`);

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
