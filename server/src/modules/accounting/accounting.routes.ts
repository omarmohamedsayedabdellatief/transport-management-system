import { Router } from 'express';
import { AccountingController } from './accounting.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// 1. Treasury & Vaults (الخزينة والبنوك)
router.get('/treasury', AccountingController.listTreasuryOverview);
router.get('/treasury/overview', AccountingController.listTreasuryOverview);
router.post('/treasury/accounts', AccountingController.createTreasuryAccount);
router.post('/treasury/transfers', AccountingController.transferTreasury);
router.post('/treasury/adjustments', AccountingController.recordTreasuryAdjustment);
router.get('/treasury/accounts/:id/statement', AccountingController.getTreasuryStatement);

// 2. Daily Operations (تشغيل اليوميات)
router.get('/operations', AccountingController.listOperations);
router.get('/operations/summary', AccountingController.getOperationsSummary);
router.post('/operations', AccountingController.createOperation);
router.put('/operations/:id', AccountingController.updateOperation);
router.delete('/operations/:id', AccountingController.deleteOperation);

// 3. Driver Overtime & Monthly Settlements (سهرات ومستحقات السائقين)
router.get('/overtime', AccountingController.listDriverOvertimes);
router.post('/overtime', AccountingController.createDriverOvertime);
router.put('/overtime/:id', AccountingController.updateDriverOvertime);
router.delete('/overtime/:id', AccountingController.deleteDriverOvertime);
router.get('/settlements', AccountingController.getDriverSettlements);
router.post('/settlements/pay', AccountingController.payDriverSettlement);

// 4. Supplier Transactions & Settlements (الموردين والشركاء)
router.get('/supplier-transactions', AccountingController.listSupplierTransactions);
router.get('/supplier-transactions/summary', AccountingController.getSuppliersLedgerSummary);
router.post('/supplier-transactions', AccountingController.createSupplierTransaction);
router.post('/treasury/pay-supplier', AccountingController.paySupplierFromTreasury);

// 5. Client Transactions & Receipts (العملاء والتحصيلات)
router.get('/client-transactions', AccountingController.listClientTransactions);
router.get('/client-transactions/summary', AccountingController.getClientsLedgerSummary);
router.post('/client-transactions', AccountingController.createClientTransaction);
router.post('/treasury/record-receipt', AccountingController.recordClientReceiptToTreasury);

// 6. Expenses (المصروفات العامة والتشغيلية)
router.get('/expenses', AccountingController.listExpenses);
router.get('/expenses/summary', AccountingController.getExpensesSummary);
router.post('/expenses', AccountingController.createExpense);
router.put('/expenses/:id', AccountingController.updateExpense);
router.delete('/expenses/:id', AccountingController.deleteExpense);

// 7. Installments (الأقساط والتمويل البنكي)
router.get('/installments', AccountingController.listInstallments);
router.get('/installments/summary', AccountingController.getInstallmentsSummary);
router.post('/installments', AccountingController.createInstallment);
router.post('/installments/:id/pay', AccountingController.payInstallmentFromTreasury);

// 8. Staff Payroll (رواتب الموظفين)
router.get('/staff-payroll', AccountingController.listStaffPayroll);
router.post('/staff-payroll', AccountingController.createStaffPayroll);
router.delete('/staff-payroll/:id', AccountingController.deleteStaffPayroll);

// 9. Vehicle Financial Ledger & Cost Centers (ربحية السيارات ومراكز التكلفة)
router.get('/vehicles-ledger', AccountingController.getVehicleFinancialLedger);
router.get('/vehicle-economics', AccountingController.getVehicleFinancialLedger);

// 10. Income Statement & Monthly Period Locking (قائمة الدخل وإقفال الشهور)
router.get('/income-statement', AccountingController.getIncomeStatement);
router.get('/monthly-breakdown', AccountingController.getMonthlyBreakdown);
router.post('/periods/close', AccountingController.closeFinancialPeriod);
router.post('/periods/reopen', AccountingController.reopenFinancialPeriod);

// 11. Excel Exports (تصدير شيتات الإكسيل)
router.get('/export/operations', AccountingController.exportOperationsToExcel);
router.get('/export/settlements', AccountingController.exportSettlementsToExcel);

export default router;
