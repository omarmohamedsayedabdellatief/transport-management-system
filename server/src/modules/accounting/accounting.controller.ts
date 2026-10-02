import { Request, Response, NextFunction } from 'express';
import { AccountingService } from './accounting.service.js';

export class AccountingController {
  // =========================================================================
  // 1. TREASURY (الخزينة والبنوك)
  // =========================================================================

  static async listTreasuryOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.listTreasuryOverview();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createTreasuryAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.createTreasuryAccount(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async transferTreasury(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.userId || 'SYSTEM';
      const data = await AccountingService.transferTreasury({ ...req.body, actorId });
      res.json({ success: true, data, message: 'تم التحويل بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async recordTreasuryAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.userId || 'SYSTEM';
      const data = await AccountingService.recordTreasuryAdjustment({ ...req.body, actorId });
      res.json({ success: true, data, message: 'تم تسجيل التسوية بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async getTreasuryStatement(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.id as string;
      const { fromDate, toDate } = req.query as any;
      const data = await AccountingService.getTreasuryStatement(accountId, fromDate, toDate);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 2. DAILY OPERATIONS (تشغيل اليوميات)
  // =========================================================================

  static async listOperations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AccountingService.listDailyOperations(req.query as any);
      res.json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  static async getOperationsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.getDailyOperationsSummary(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createOperation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.createDailyOperation(req.body);
      res.status(201).json({ success: true, data, message: 'تم حفظ يومية التشغيل بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async updateOperation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.updateDailyOperation(req.params.id as string, req.body);
      res.json({ success: true, data, message: 'تم تعديل يومية التشغيل بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteOperation(req: Request, res: Response, next: NextFunction) {
    try {
      await AccountingService.deleteDailyOperation(req.params.id as string);
      res.json({ success: true, message: 'تم حذف يومية التشغيل بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 3. DRIVER OVERTIME & SETTLEMENTS (مستحقات وسهرات السائقين)
  // =========================================================================

  static async listDriverOvertimes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AccountingService.listDriverOvertimes(req.query as any);
      res.json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  static async createDriverOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.createDriverOvertime(req.body);
      res.status(201).json({ success: true, data, message: 'تم تسجيل السهرة بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async updateDriverOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.updateDriverOvertime(req.params.id as string, req.body);
      res.json({ success: true, data, message: 'تم تعديل السهرة بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDriverOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      await AccountingService.deleteDriverOvertime(req.params.id as string);
      res.json({ success: true, message: 'تم حذف السهرة بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async getDriverSettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.getDriverMonthlySettlements(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async payDriverSettlement(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.userId || 'SYSTEM';
      const data = await AccountingService.payDriverSettlement({ ...req.body, actorId });
      res.json({ success: true, data, message: 'تم صرف مستحقات السائق بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 4. SUPPLIER TRANSACTIONS (الموردين والشركاء)
  // =========================================================================

  static async listSupplierTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.listSupplierTransactions(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getSuppliersLedgerSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.getSuppliersLedgerSummary();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createSupplierTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.createSupplierTransaction(req.body);
      res.status(201).json({ success: true, data, message: 'تم تسجيل حركة المورد بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async paySupplierFromTreasury(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.userId || 'SYSTEM';
      const data = await AccountingService.paySupplierFromTreasury({ ...req.body, actorId });
      res.json({ success: true, data, message: 'تم صرف الدفعة للمورد بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 5. CLIENT TRANSACTIONS (العملاء والتحصيل)
  // =========================================================================

  static async listClientTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.listClientTransactions(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getClientsLedgerSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.getClientsLedgerSummary();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createClientTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.createClientTransaction(req.body);
      res.status(201).json({ success: true, data, message: 'تم تسجيل حركة العميل بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async recordClientReceiptToTreasury(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.userId || 'SYSTEM';
      const data = await AccountingService.recordClientReceiptToTreasury({ ...req.body, actorId });
      res.json({ success: true, data, message: 'تم تسجيل التحصيل بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 6. EXPENSES (المصروفات)
  // =========================================================================

  static async listExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AccountingService.listExpenses(req.query as any);
      res.json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  static async getExpensesSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.getExpensesSummary(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.userId || 'SYSTEM';
      const { accountId, ...expenseData } = req.body;
      const data = await AccountingService.createExpense(expenseData, accountId, actorId);
      res.status(201).json({ success: true, data, message: 'تم تسجيل المصروف بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.updateExpense(req.params.id as string, req.body);
      res.json({ success: true, data, message: 'تم تعديل المصروف بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      await AccountingService.deleteExpense(req.params.id as string);
      res.json({ success: true, message: 'تم حذف المصروف بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 7. INSTALLMENTS (الأقساط)
  // =========================================================================

  static async listInstallments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.listInstallments(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getInstallmentsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.getInstallmentsSummary(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createInstallment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.createInstallment(req.body);
      res.status(201).json({ success: true, data, message: 'تم إضافة القسط بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async payInstallmentFromTreasury(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.userId || 'SYSTEM';
      const data = await AccountingService.payInstallmentFromTreasury({
        installmentId: (req.params.id || req.body.installmentId) as string,
        accountId: req.body.accountId,
        date: req.body.date,
        reference: req.body.reference,
        notes: req.body.notes,
        actorId,
      });
      res.json({ success: true, data, message: 'تم سداد القسط بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 8. STAFF PAYROLL (رواتب الموظفين)
  // =========================================================================

  static async listStaffPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.listStaffPayroll();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async createStaffPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const actorId = (req as any).user?.userId || 'SYSTEM';
      const { accountId, ...payrollData } = req.body;
      const data = await AccountingService.createStaffPayroll(payrollData, accountId, actorId);
      res.status(201).json({ success: true, data, message: 'تم تسجيل مسير الراتب بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteStaffPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      await AccountingService.deleteStaffPayroll(req.params.id as string);
      res.json({ success: true, message: 'تم حذف مسير الراتب بنجاح' });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 9. VEHICLE FINANCIAL LEDGER (ربحية وتكاليف السيارات)
  // =========================================================================

  static async getVehicleFinancialLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.getVehicleFinancialLedger(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 10. INCOME STATEMENT & PERIOD CLOSING (قائمة الدخل وإقفال الشهور)
  // =========================================================================

  static async getIncomeStatement(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.getIncomeStatement(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async getMonthlyBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountingService.getMonthlyBreakdown(req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async closeFinancialPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month, notes } = req.body;
      const userId = (req as any).user?.email || (req as any).user?.userId || 'ADMIN';
      const data = await AccountingService.closeFinancialPeriod(Number(year), Number(month), userId, notes);
      res.json({ success: true, data, message: `تم إقفال الفترة المالية لشهر ${month}/${year} بنجاح` });
    } catch (error) {
      next(error);
    }
  }

  static async reopenFinancialPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.body;
      const userId = (req as any).user?.email || (req as any).user?.userId || 'ADMIN';
      const data = await AccountingService.reopenFinancialPeriod(Number(year), Number(month), userId);
      res.json({ success: true, data, message: `تم إعادة فتح الفترة المالية لشهر ${month}/${year} بنجاح` });
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 11. EXCEL EXPORTS (تصدير شيتات الإكسيل)
  // =========================================================================

  static async exportOperationsToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await AccountingService.exportOperationsToExcel(req.query as any);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="operations_${req.query.month || 'all'}_${req.query.year || ''}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  static async exportSettlementsToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await AccountingService.exportSettlementsToExcel(req.query as any);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="settlements_${req.query.month || ''}_${req.query.year || ''}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
