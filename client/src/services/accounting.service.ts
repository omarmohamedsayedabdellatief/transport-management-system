import api from './api';

export interface DailyOperationItem {
  id: string;
  day: number;
  month: number;
  year: number;
  date: string;
  driverCode?: number;
  driverName: string;
  routeName: string;
  companyName: string;
  branch?: string;
  vehicleType?: string;
  dailyRate: number;
  tripCount: number;
  driverDailyRate: number;
  taxRate: number;
  withholdingTax: number;
  totalAmount: number;
  advancePayment: number;
  deduction: number;
  overtime: number;
  netDriverPay: number;
  dailyProfit: number;
  netRevenue: number;
  vehicleCost?: number;
  vehiclePlate?: string;
  notes?: string;
  operationType: string;
}

export interface DriverOvertimeItem {
  id: string;
  dayOfWeek?: string;
  date: string;
  driverName: string;
  vehicleType?: string;
  routeName: string;
  shiftDescription?: string;
  shiftsCount: number;
  shiftRate: number;
  branch?: string;
  notes?: string;
}

export interface DriverSettlementItem {
  driverCode?: number;
  driverName: string;
  companyName: string;
  branch: string;
  driverDailyRate: number;
  totalTrips: number;
  totalBasePay: number;
  totalOvertime: number;
  totalDeductions: number;
  totalAdvances: number;
  netPayable: number;
  companyBilling: number;
  companyProfit: number;
  status?: string;
  paidAt?: string;
  paymentTransactionId?: string;
}

export interface ExpenseItem {
  id: string;
  day?: number;
  month?: number;
  year?: number;
  date: string;
  category: string;
  amount: number;
  branch?: string;
  vehicleNumber?: string;
  notes?: string;
}

export interface StaffPayrollItem {
  id: string;
  date: string;
  employeeName: string;
  jobTitle: string;
  basicSalary: number;
  overtime: number;
  deductions: number;
  advances: number;
  penalties: number;
  netSalary: number;
  notes?: string;
}

export interface InstallmentItem {
  id: string;
  category: 'VEHICLE' | 'PROPERTY_OFFICE';
  assetName: string;
  vehiclePlate?: string;
  installmentNumber: number;
  bankDueDate: string;
  bankAmount: number;
  clientDueDate?: string;
  clientAmount?: number;
  margin?: number;
  chequeNumber?: string;
  bankName?: string;
  status: string;
  notes?: string;
}

export interface ClientTransactionItem {
  id: string;
  companyName: string;
  date: string;
  documentNumber?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  notes?: string;
}

export interface IncomeStatementData {
  period: { month: any; year: any; status?: string; closedAt?: string; closedBy?: string };
  revenues?: {
    grossBilling: number;
    withholdingTaxDeducted: number;
    netClientBilling: number;
  };
  revenue?: {
    grossBilling: number;
    withholdingTax: number;
    netClientBilling: number;
  };
  directCosts?: {
    driverPayAndOvertime: number;
    driverAdvances?: number;
    driverDeductions?: number;
    driverOvertime?: number;
    vehicleDirectOperatingCosts: number;
    totalDirectCosts: number;
  };
  costs?: {
    totalDriverPayouts: number;
    driverAdvances?: number;
    driverDeductions?: number;
    driverOvertime?: number;
    grossOperatingMargin: number;
  };
  grossProfit?: number;
  indirectExpenses?: {
    categorizedExpenses: number;
    expensesByCategory: Record<string, number>;
    staffPayroll: number;
    fleetMaintenance: number;
    vehicleInstallments: number;
    totalIndirectExpenses: number;
  };
  expenses?: {
    totalExpenses: number;
    byCategory: Record<string, number>;
    categorizedExpenses?: number;
    staffPayroll?: number;
    fleetMaintenance?: number;
    vehicleInstallments?: number;
  };
  netProfit: number;
}

export interface SupplierTransactionItem {
  id: string;
  supplierName: string;
  date: string;
  documentNumber?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  notes?: string;
}

export const accountingApi = {
  // Treasury & Vaults
  getTreasuryOverview: async () => {
    const res = await api.get('/accounting/treasury');
    return res.data.data;
  },
  createTreasuryAccount: async (data: {
    name: string;
    kind: 'CASH' | 'BANK' | 'VAULT';
    bankName?: string;
    reference?: string;
    openingBalance?: number;
  }) => {
    const res = await api.post('/accounting/treasury/accounts', data);
    return res.data.data;
  },
  transferTreasury: async (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    reference?: string;
    notes?: string;
  }) => {
    const res = await api.post('/accounting/treasury/transfers', data);
    return res.data.data;
  },
  getTreasuryStatement: async (accountId: string) => {
    const res = await api.get(`/accounting/treasury/accounts/${accountId}/statement`);
    return res.data.data;
  },

  // Operations
  getOperations: async (params?: any) => {
    const res = await api.get('/accounting/operations', { params });
    return res.data.data;
  },
  getOperationsSummary: async (params?: any) => {
    const res = await api.get('/accounting/operations/summary', { params });
    return res.data.data;
  },
  createOperation: async (data: any) => {
    const res = await api.post('/accounting/operations', data);
    return res.data.data;
  },
  deleteOperation: async (id: string) => {
    const res = await api.delete(`/accounting/operations/${id}`);
    return res.data;
  },

  // Overtime
  getOvertimes: async (params?: any) => {
    const res = await api.get('/accounting/overtime', { params });
    return res.data.data;
  },
  createOvertime: async (data: any) => {
    const res = await api.post('/accounting/overtime', data);
    return res.data.data;
  },
  deleteOvertime: async (id: string) => {
    const res = await api.delete(`/accounting/overtime/${id}`);
    return res.data;
  },

  // Settlements
  getSettlements: async (params?: any) => {
    const res = await api.get('/accounting/settlements', { params });
    return res.data.data;
  },
  payDriverSettlement: async (data: any) => {
    const res = await api.post('/accounting/settlements/pay', data);
    return res.data.data;
  },

  // Expenses
  getExpenses: async (params?: any) => {
    const res = await api.get('/accounting/expenses', { params });
    return res.data.data;
  },
  getExpensesSummary: async (params?: any) => {
    const res = await api.get('/accounting/expenses/summary', { params });
    return res.data.data;
  },
  createExpense: async (data: any) => {
    const res = await api.post('/accounting/expenses', data);
    return res.data.data;
  },
  deleteExpense: async (id: string) => {
    const res = await api.delete(`/accounting/expenses/${id}`);
    return res.data;
  },

  // Staff Payroll
  getStaffPayroll: async () => {
    const res = await api.get('/accounting/staff-payroll');
    return res.data.data;
  },
  createStaffPayroll: async (data: any) => {
    const res = await api.post('/accounting/staff-payroll', data);
    return res.data.data;
  },
  deleteStaffPayroll: async (id: string) => {
    const res = await api.delete(`/accounting/staff-payroll/${id}`);
    return res.data;
  },

  // Installments
  getInstallments: async (params?: any) => {
    const res = await api.get('/accounting/installments', { params });
    return res.data.data;
  },
  getInstallmentsSummary: async (params?: any) => {
    const res = await api.get('/accounting/installments/summary', { params });
    return res.data.data;
  },
  toggleInstallmentStatus: async (id: string, status: string) => {
    const res = await api.put(`/accounting/installments/${id}/status`, { status });
    return res.data.data;
  },
  createInstallment: async (data: any) => {
    const res = await api.post('/accounting/installments', data);
    return res.data.data;
  },
  payInstallmentFromTreasury: async (id: string, accountId: string) => {
    const res = await api.post(`/accounting/installments/${id}/pay`, { accountId });
    return res.data.data;
  },
  getVehicleEconomics: async (params?: any) => {
    const res = await api.get('/accounting/vehicle-economics', { params });
    return res.data.data;
  },

  // Client Transactions
  getClientTransactions: async (companyName?: string) => {
    const res = await api.get('/accounting/client-transactions', { params: { companyName } });
    return res.data.data;
  },
  getClientsLedgerSummary: async () => {
    const res = await api.get('/accounting/client-transactions/summary');
    return res.data.data;
  },
  createClientTransaction: async (data: any) => {
    const res = await api.post('/accounting/client-transactions', data);
    return res.data.data;
  },
  recordClientReceipt: async (data: any) => {
    const res = await api.post('/accounting/treasury/record-receipt', data);
    return res.data.data;
  },

  // Supplier Transactions
  getSupplierTransactions: async (supplierName?: string) => {
    const res = await api.get('/accounting/supplier-transactions', { params: { supplierName } });
    return res.data.data;
  },
  getSuppliersLedgerSummary: async () => {
    const res = await api.get('/accounting/supplier-transactions/summary');
    return res.data.data;
  },
  createSupplierTransaction: async (data: any) => {
    const res = await api.post('/accounting/supplier-transactions', data);
    return res.data.data;
  },
  paySupplierFromTreasury: async (data: any) => {
    const res = await api.post('/accounting/treasury/pay-supplier', data);
    return res.data.data;
  },

  // Income Statement
  getIncomeStatement: async (params?: any): Promise<IncomeStatementData> => {
    const res = await api.get('/accounting/income-statement', { params });
    return res.data.data;
  },

  // Monthly Breakdown
  getMonthlyBreakdown: async (year?: number) => {
    const res = await api.get('/accounting/monthly-breakdown', { params: { year } });
    return res.data.data;
  },

  // Authenticated Excel Downloads
  downloadOperationsExcel: async (year: number, month?: number) => {
    const res = await api.get('/accounting/export/operations', {
      params: { year, month },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `operations_${month ? `m${month}` : 'full_year'}_${year}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadSettlementsExcel: async (year: number, month?: number) => {
    const res = await api.get('/accounting/export/settlements', {
      params: { year, month },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `driver_settlements_${month ? `m${month}` : 'full_year'}_${year}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Excel Migration
  importWorkspaceFiles: async () => {
    const res = await api.post('/accounting/import-workspace-files');
    return res.data.data;
  },
};
