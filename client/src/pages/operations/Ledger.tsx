import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  FileSpreadsheet,
  Building2,
  Users,
  TrendingUp,
  Receipt,
  Plus,
  Download,
  Calendar,
  Wallet,
  ShieldAlert,
  Search,
  Filter,
  Landmark,
  Truck,
  ArrowRightLeft,
  Coins,
  CreditCard,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

export const Ledger: React.FC = () => {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'ACCOUNTANT'].includes(user?.role || '');
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    | 'dailyOperations'
    | 'clientLedger'
    | 'supplierLedger'
    | 'settlements'
    | 'incomeStatement'
    | 'expenses'
    | 'payroll'
    | 'installments'
    | 'treasury'
    | 'vehicleLedger'
  >('dailyOperations');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isClientTxModalOpen, setIsClientTxModalOpen] = useState(false);
  const [isSupplierTxModalOpen, setIsSupplierTxModalOpen] = useState(false);
  const [isPaySupplierModalOpen, setIsPaySupplierModalOpen] = useState(false);
  const [isNewTreasuryModalOpen, setIsNewTreasuryModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isPayInstallmentModalOpen, setIsPayInstallmentModalOpen] = useState(false);
  const [isClientReceiptModalOpen, setIsClientReceiptModalOpen] = useState(false);
  const [selectedInstallmentToPay, setSelectedInstallmentToPay] = useState<any>(null);
  const [selectedSupplierToPay, setSelectedSupplierToPay] = useState<any>(null);

  // Forms
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'وقود وبنزين',
    amount: 0,
    branch: '',
    vehicleNumber: '',
    notes: '',
  });

  const [payrollForm, setPayrollForm] = useState({
    date: new Date().toISOString().split('T')[0],
    employeeName: '',
    jobTitle: 'سائق',
    basicSalary: 0,
    overtime: 0,
    deductions: 0,
    advances: 0,
    penalties: 0,
    notes: '',
  });

  const [installmentForm, setInstallmentForm] = useState({
    assetName: '',
    vehiclePlate: '',
    category: 'VEHICLE',
    installmentNumber: 1,
    bankDueDate: new Date().toISOString().split('T')[0],
    bankAmount: 0,
    bankName: '',
    chequeNumber: '',
    status: 'PENDING',
    notes: '',
  });

  const [clientTxForm, setClientTxForm] = useState({
    companyName: '',
    date: new Date().toISOString().split('T')[0],
    documentNumber: '',
    description: 'دفعة سداد / تحصيل',
    debit: 0,
    credit: 0,
    notes: '',
  });

  const [supplierTxForm, setSupplierTxForm] = useState({
    supplierName: '',
    date: new Date().toISOString().split('T')[0],
    documentNumber: '',
    description: 'استحقاق / سداد دفعة مورد',
    debit: 0,
    credit: 0,
    notes: '',
  });

  const [paySupplierForm, setPaySupplierForm] = useState({
    supplierName: '',
    accountId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    documentNumber: '',
    notes: '',
  });

  const [treasuryAccountForm, setTreasuryAccountForm] = useState({
    name: '',
    type: 'CASH_SAFE',
    accountNumber: '',
    bankName: '',
    initialBalance: 0,
    notes: '',
  });

  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    transferFee: 0,
    referenceNumber: '',
    notes: '',
  });

  const [depositForm, setDepositForm] = useState({
    depositSource: 'PROFIT_BY_CLIENT' as 'PROFIT_BY_CLIENT' | 'OPERATIONS_PERIOD' | 'CUSTOM',
    clientName: '',
    accountId: '',
    amount: 0,
    type: 'DEPOSIT',
    description: 'توريد أرباح تشغيل وفواتير',
    referenceNumber: '',
    notes: '',
  });

  const openDepositModalForClient = (companyName: string) => {
    const clientOps = (operationsData?.items || []).filter((op: any) => op.companyName === companyName);
    const clientProfit = clientOps.reduce((sum: number, op: any) => sum + Number(op.dailyProfit || 0), 0);
    const defaultAcc = treasuryOverviewData?.accounts?.[0]?.id || '';

    setDepositForm({
      depositSource: 'PROFIT_BY_CLIENT',
      clientName: companyName,
      accountId: defaultAcc,
      amount: clientProfit > 0 ? clientProfit : 0,
      type: 'DEPOSIT',
      description: `توريد أرباح تشغيل فواتير شركة ${companyName}`,
      referenceNumber: `DEP-${Date.now().toString().slice(-6)}`,
      notes: `أرباح تشغيل فواتير ورحلات شركة ${companyName}`,
    });
    setIsDepositModalOpen(true);
  };

  const openDepositModalForPeriod = () => {
    const periodProfit = Number(opsSummary?.totalDailyProfit || incomeStatementData?.netProfit || 0);
    const defaultAcc = treasuryOverviewData?.accounts?.[0]?.id || '';

    setDepositForm({
      depositSource: 'OPERATIONS_PERIOD',
      clientName: '',
      accountId: defaultAcc,
      amount: periodProfit > 0 ? periodProfit : 0,
      type: 'DEPOSIT',
      description: `توريد صافي أرباح تشغيل شهر ${selectedMonth}/${selectedYear}`,
      referenceNumber: `DEP-${Date.now().toString().slice(-6)}`,
      notes: `صافي أرباح التشغيل المجمعة للفترة ${selectedMonth}/${selectedYear}`,
    });
    setIsDepositModalOpen(true);
  };

  const [payInstallmentForm, setPayInstallmentForm] = useState({
    installmentId: '',
    accountId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: '',
  });

  const [clientReceiptForm, setClientReceiptForm] = useState({
    companyName: '',
    accountId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    description: 'تحصيل وتوريد للخزينة',
    notes: '',
  });

  // Queries
  const { data: operationsData, isLoading: isOpsLoading } = useQuery({
    queryKey: ['accounting-operations', selectedMonth, selectedYear, searchQuery],
    queryFn: async () => {
      let url = `/accounting/operations?month=${selectedMonth}&year=${selectedYear}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await api.get(url);
      return res.data?.data || { items: [], pagination: {} };
    },
    enabled: activeTab === 'dailyOperations',
  });

  const { data: opsSummary } = useQuery({
    queryKey: ['accounting-operations-summary', selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await api.get(`/accounting/operations/summary?month=${selectedMonth}&year=${selectedYear}`);
      return res.data?.data || {};
    },
    enabled: activeTab === 'dailyOperations',
  });

  const { data: clientTxsData, isLoading: isClientTxsLoading } = useQuery({
    queryKey: ['accounting-client-txs', clientFilter],
    queryFn: async () => {
      let url = '/accounting/client-transactions';
      if (clientFilter) url += `?companyName=${encodeURIComponent(clientFilter)}`;
      const res = await api.get(url);
      return res.data?.data || [];
    },
    enabled: activeTab === 'clientLedger',
  });

  const { data: clientSummaryData } = useQuery({
    queryKey: ['accounting-client-summary'],
    queryFn: async () => {
      const res = await api.get('/accounting/client-transactions/summary');
      return res.data?.data || [];
    },
    enabled: activeTab === 'clientLedger' || isClientReceiptModalOpen,
  });

  const { data: supplierTxsData, isLoading: isSupplierTxsLoading } = useQuery({
    queryKey: ['accounting-supplier-txs', supplierFilter],
    queryFn: async () => {
      let url = '/accounting/supplier-transactions';
      if (supplierFilter) url += `?supplierName=${encodeURIComponent(supplierFilter)}`;
      const res = await api.get(url);
      return res.data?.data || [];
    },
    enabled: activeTab === 'supplierLedger',
  });

  const { data: supplierSummaryData } = useQuery({
    queryKey: ['accounting-supplier-summary'],
    queryFn: async () => {
      const res = await api.get('/accounting/supplier-transactions/summary');
      return res.data?.data || [];
    },
    enabled: activeTab === 'supplierLedger' || isPaySupplierModalOpen,
  });

  const { data: settlementsData, isLoading: isSettlementsLoading } = useQuery({
    queryKey: ['accounting-settlements', selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await api.get(`/accounting/settlements?month=${selectedMonth}&year=${selectedYear}`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'settlements',
  });

  const { data: incomeStatementData, isLoading: isISLoading } = useQuery({
    queryKey: ['accounting-income-statement', selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await api.get(`/accounting/income-statement?month=${selectedMonth}&year=${selectedYear}`);
      return res.data?.data || {};
    },
    enabled: activeTab === 'incomeStatement',
  });

  const { data: expensesData, isLoading: isExpLoading } = useQuery({
    queryKey: ['accounting-expenses', selectedMonth, selectedYear, searchQuery],
    queryFn: async () => {
      let url = `/accounting/expenses?month=${selectedMonth}&year=${selectedYear}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await api.get(url);
      return res.data?.data || { items: [] };
    },
    enabled: activeTab === 'expenses',
  });

  const { data: payrollData, isLoading: isPayrollLoading } = useQuery({
    queryKey: ['accounting-payroll', selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await api.get(`/accounting/staff-payroll?month=${selectedMonth}&year=${selectedYear}`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'payroll',
  });

  const { data: installmentsData, isLoading: isInstLoading } = useQuery({
    queryKey: ['accounting-installments'],
    queryFn: async () => {
      const res = await api.get('/accounting/installments');
      return res.data?.data || [];
    },
    enabled: activeTab === 'installments',
  });

  const { data: treasuryOverviewData, isLoading: isTreasuryLoading } = useQuery({
    queryKey: ['accounting-treasury-overview'],
    queryFn: async () => {
      const res = await api.get('/accounting/treasury/overview');
      return res.data?.data || { accounts: [], recentEntries: [], stats: {} };
    },
    enabled: activeTab === 'treasury' || isPayInstallmentModalOpen || isClientReceiptModalOpen || isTransferModalOpen || isDepositModalOpen,
  });

  const { data: vehiclesLedgerData, isLoading: isVehiclesLedgerLoading } = useQuery({
    queryKey: ['accounting-vehicles-ledger'],
    queryFn: async () => {
      const res = await api.get('/accounting/vehicles-ledger');
      return res.data?.data || { vehicles: [], summary: {} };
    },
    enabled: activeTab === 'vehicleLedger',
  });

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-expenses'] });
      setIsExpenseModalOpen(false);
    },
  });

  const createPayrollMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/staff-payroll', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-payroll'] });
      setIsPayrollModalOpen(false);
    },
  });

  const createInstallmentMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/installments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-installments'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-vehicles-ledger'] });
      setIsInstallmentModalOpen(false);
    },
  });

  const createClientTxMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/client-transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-client-txs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-client-summary'] });
      setIsClientTxModalOpen(false);
    },
  });

  const createSupplierTxMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/supplier-transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-supplier-txs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-supplier-summary'] });
      setIsSupplierTxModalOpen(false);
    },
  });

  const paySupplierFromTreasuryMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/treasury/pay-supplier', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-supplier-txs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-supplier-summary'] });
      setIsPaySupplierModalOpen(false);
      setSelectedSupplierToPay(null);
    },
  });

  const createTreasuryAccountMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/treasury/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-treasury-overview'] });
      setIsNewTreasuryModalOpen(false);
      setTreasuryAccountForm({
        name: '',
        type: 'CASH_SAFE',
        accountNumber: '',
        bankName: '',
        initialBalance: 0,
        notes: '',
      });
    },
  });

  const transferTreasuryMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/treasury/transfer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-treasury-overview'] });
      setIsTransferModalOpen(false);
      setTransferForm({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        transferFee: 0,
        referenceNumber: '',
        notes: '',
      });
    },
  });

  const depositTreasuryMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/treasury/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-treasury-overview'] });
      setIsDepositModalOpen(false);
      setDepositForm({
        depositSource: 'PROFIT_BY_CLIENT',
        clientName: '',
        accountId: '',
        amount: 0,
        type: 'DEPOSIT',
        description: 'توريد أرباح تشغيل وفواتير',
        referenceNumber: '',
        notes: '',
      });
    },
  });

  const payInstallmentFromTreasuryMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/treasury/pay-installment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-installments'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-vehicles-ledger'] });
      setIsPayInstallmentModalOpen(false);
      setSelectedInstallmentToPay(null);
    },
  });

  const recordClientReceiptMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounting/treasury/client-receipt', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-client-txs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-client-summary'] });
      setIsClientReceiptModalOpen(false);
      setClientReceiptForm({
        companyName: '',
        accountId: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        description: 'تحصيل وتوريد للخزينة',
        notes: '',
      });
    },
  });

  const toggleInstallmentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/accounting/installments/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-installments'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-vehicles-ledger'] });
    },
  });

  const formatEGP = (val: any) => `${Number(val || 0).toLocaleString('en-EG', { maximumFractionDigits: 2 })} EGP`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isAr ? 'دفتر الحسابات واليومية العامة' : 'General Ledger & Accounts'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? 'سجل اليومية المباشر، كشوف حسابات العملاء والموردين، المستحقات، والمصروفات وقائمة الدخل'
              : 'Direct operations journal, client & supplier statements, payroll, expenses, and P&L statements'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'dailyOperations' && (
            <a
              href={`${api.defaults.baseURL || '/api'}/accounting/export/operations?month=${selectedMonth}&year=${selectedYear}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>{isAr ? 'تصدير إكسيل لليومية' : 'Export Excel'}</span>
            </a>
          )}
          {activeTab === 'settlements' && (
            <a
              href={`${api.defaults.baseURL || '/api'}/accounting/export/settlements?month=${selectedMonth}&year=${selectedYear}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>{isAr ? 'تصدير تصفية السائقين' : 'Export Excel'}</span>
            </a>
          )}
          {activeTab === 'expenses' && canEdit && (
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إضافة مصروف جديد' : 'Add Expense'}</span>
            </button>
          )}
          {activeTab === 'payroll' && canEdit && (
            <button
              onClick={() => setIsPayrollModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إضافة سجل راتب' : 'Add Payroll'}</span>
            </button>
          )}
          {activeTab === 'installments' && canEdit && (
            <button
              onClick={() => setIsInstallmentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إضافة قسط جديد' : 'Add Installment'}</span>
            </button>
          )}
          {activeTab === 'clientLedger' && canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsClientReceiptModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Coins className="h-4 w-4" />
                <span>{isAr ? 'تحصيل وتوريد للخزينة' : 'Collect to Treasury'}</span>
              </button>
              <button
                onClick={() => setIsClientTxModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'تسجيل حركة يدوية' : 'Manual Entry'}</span>
              </button>
            </div>
          )}
          {activeTab === 'supplierLedger' && canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedSupplierToPay(null);
                  setPaySupplierForm({
                    supplierName: supplierFilter || supplierSummaryData?.[0]?.supplierName || '',
                    accountId: treasuryOverviewData?.accounts?.[0]?.id || '',
                    amount: 0,
                    date: new Date().toISOString().split('T')[0],
                    referenceNumber: '',
                    documentNumber: '',
                    notes: 'سداد دفعة للمورد من الخزينة',
                  });
                  setIsPaySupplierModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Coins className="h-4 w-4" />
                <span>{isAr ? 'سداد للمورد من الخزينة' : 'Pay Supplier from Treasury'}</span>
              </button>
              <button
                onClick={() => setIsSupplierTxModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'تسجيل حركة يدوية' : 'Manual Entry'}</span>
              </button>
            </div>
          )}
          {activeTab === 'treasury' && canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsNewTreasuryModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'خزينة / بنك جديد' : 'New Account'}</span>
              </button>
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>{isAr ? 'تحويل بين الخزائن' : 'Transfer'}</span>
              </button>
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>{isAr ? 'توريد أرباح / إيداع' : 'Deposit Profit'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/80">
        {[
          { key: 'dailyOperations', labelEn: 'Daily Operations Journal', labelAr: 'سجل التشغيل واليومية', Icon: FileSpreadsheet },
          { key: 'treasury', labelEn: 'Treasury & Safes', labelAr: 'الخزائن والحسابات البنكية والسيولة', Icon: Landmark },
          { key: 'vehicleLedger', labelEn: 'Vehicle Fleet Ledger', labelAr: 'سجل أرباح وأقساط السيارات', Icon: Truck },
          { key: 'clientLedger', labelEn: 'Client Statements & Ledger', labelAr: 'كشوف حسابات العملاء', Icon: Building2 },
          { key: 'supplierLedger', labelEn: 'Supplier Statements & Ledger', labelAr: 'كشوف ومستحقات الموردين', Icon: Users },
          { key: 'settlements', labelEn: 'Driver Settlements', labelAr: 'تصفية ومستحقات السائقين', Icon: Users },
          { key: 'incomeStatement', labelEn: 'Income Statement (P&L)', labelAr: 'قائمة الدخل والأرباح', Icon: TrendingUp },
          { key: 'expenses', labelEn: 'General Expenses', labelAr: 'المصروفات العامة', Icon: Receipt },
          { key: 'payroll', labelEn: 'Staff Payroll', labelAr: 'رواتب العاملين', Icon: Wallet },
          { key: 'installments', labelEn: 'Installments', labelAr: 'الأقساط', Icon: ShieldAlert },
        ].map(({ key, labelEn, labelAr, Icon }: any) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === key
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Icon className={`h-4 w-4 ${activeTab === key ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>{isAr ? labelAr : labelEn}</span>
          </button>
        ))}
      </div>

      {/* Period Filter for Operations, Settlements, Income Statement */}
      {['dailyOperations', 'settlements', 'incomeStatement', 'expenses'].includes(activeTab) && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{isAr ? 'فترة التقرير:' : 'Period:'}</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
            >
              {[
                'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)', 'مايو (5)', 'يونيو (6)',
                'يوليو (7)', 'أغسطس (8)', 'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
              ].map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالشركة أو السائق أو الخط...' : 'Search company, driver, route...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            />
          </div>
        </div>
      )}

      {/* TAB 1: DAILY OPERATIONS JOURNAL */}
      {activeTab === 'dailyOperations' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'إجمالي الرحلات' : 'Total Trips'}</span>
              <strong className="text-lg font-bold text-slate-900 mt-1 block">
                {opsSummary?.totalTrips || 0}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'إجمالي الفواتير (إيراد)' : 'Total Invoiced'}</span>
              <strong className="text-lg font-bold text-blue-700 mt-1 block">
                {formatEGP(opsSummary?.totalBilling)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'ضريبة الخصم (3%)' : 'Withholding Tax'}</span>
              <strong className="text-lg font-bold text-amber-700 mt-1 block">
                {formatEGP(opsSummary?.totalWithholdingTax)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'مستحق السائقين والموردين' : 'Driver / Supplier Pay'}</span>
              <strong className="text-lg font-bold text-rose-700 mt-1 block">
                {formatEGP(opsSummary?.totalNetDriverPay)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">{isAr ? 'صافي أرباح التشغيل' : 'Net Operating Margin'}</span>
                <strong className="text-lg font-bold text-emerald-700 mt-1 block">
                  {formatEGP(opsSummary?.totalDailyProfit)}
                </strong>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={openDepositModalForPeriod}
                  className="mt-2 inline-flex items-center justify-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold transition-colors"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>{isAr ? 'إيداع الأرباح بالخزينة' : 'Deposit Profit'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Operations Table */}
          {isOpsLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (operationsData?.items || []).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
              <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isAr ? 'لا توجد حركات تشغيل مسجلة لهذه الفترة.' : 'No daily operations recorded for this period.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-3 px-3.5">{isAr ? 'اليوم' : 'Day'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الشركة' : 'Client'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'خط السير' : 'Route'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'السائق / المورد' : 'Driver / Supplier'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'سعر الرحلة' : 'Rate'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الضريبة' : 'Tax'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'المفوتر' : 'Billing'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'المستحق' : 'Pay'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الصافي' : 'Profit'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {operationsData.items.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors font-mono">
                        <td className="py-3 px-3.5 font-bold text-slate-900">{row.day}</td>
                        <td className="py-3 px-3.5 text-slate-600">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="py-3 px-3.5 font-sans font-medium text-slate-800">{row.companyName}</td>
                        <td className="py-3 px-3.5 font-sans text-slate-700">{row.routeName}</td>
                        <td className="py-3 px-3.5 font-sans font-medium text-slate-900">{row.driverName}</td>
                        <td className="py-3 px-3.5 font-bold text-blue-700">{formatEGP(row.dailyRate)}</td>
                        <td className="py-3 px-3.5 text-amber-700">{formatEGP(row.withholdingTax)}</td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">{formatEGP(row.totalAmount)}</td>
                        <td className="py-3 px-3.5 font-bold text-rose-700">{formatEGP(row.netDriverPay)}</td>
                        <td className="py-3 px-3.5 font-bold text-emerald-700">{formatEGP(row.dailyProfit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLIENT LEDGER & STATEMENTS */}
      {activeTab === 'clientLedger' && (
        <div className="space-y-4">
          {/* Client Balances Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(clientSummaryData || []).map((c: any) => (
              <div
                key={c.companyName}
                onClick={() => setClientFilter(clientFilter === c.companyName ? '' : c.companyName)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  clientFilter === c.companyName ? 'bg-blue-50/60 border-blue-300 shadow-xs' : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{c.companyName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{c.txCount} {isAr ? 'حركة' : 'txs'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 font-mono text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">{isAr ? 'مدين (مفوتر)' : 'Billed'}</span>
                      <span className="font-bold text-blue-700">{formatEGP(c.totalDebit)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">{isAr ? 'دائن (مسدد)' : 'Paid'}</span>
                      <span className="font-bold text-emerald-700">{formatEGP(c.totalCredit)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">{isAr ? 'الرصيد المتبقي' : 'Balance'}</span>
                      <span className={`font-bold ${c.currentBalance > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                        {formatEGP(c.currentBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{isAr ? 'إجراءات مالية:' : 'Actions:'}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDepositModalForClient(c.companyName);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition-colors"
                    >
                      <ArrowDownLeft className="h-3 w-3" />
                      <span>{isAr ? 'توريد أرباح العميل' : 'Deposit Profit'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Transactions Table */}
          {isClientTxsLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (clientTxsData || []).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isAr ? 'لا توجد حركات مسجلة لكشف حساب العملاء.' : 'No transactions recorded for client statements.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-3 px-3.5">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الشركة العميل' : 'Client'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'رقم المستند / الرحلة' : 'Document #'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'البيان والتفاصيل' : 'Description'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'مدين (مستحق على العميل)' : 'Debit'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'دائن (مسدد من العميل)' : 'Credit'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الرصيد بعد الحركة' : 'Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientTxsData.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors font-mono">
                        <td className="py-3 px-3.5 text-slate-600">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="py-3 px-3.5 font-sans font-medium text-slate-800">{tx.companyName}</td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">{tx.documentNumber || '—'}</td>
                        <td className="py-3 px-3.5 font-sans text-slate-700">{tx.description}</td>
                        <td className="py-3 px-3.5 font-bold text-blue-700">
                          {Number(tx.debit) > 0 ? formatEGP(tx.debit) : '—'}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-emerald-700">
                          {Number(tx.credit) > 0 ? formatEGP(tx.credit) : '—'}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">{formatEGP(tx.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2.1: SUPPLIER LEDGER & STATEMENTS */}
      {activeTab === 'supplierLedger' && (
        <div className="space-y-4">
          {/* Supplier Balances Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(supplierSummaryData || []).map((s: any) => (
              <div
                key={s.supplierName}
                onClick={() => setSupplierFilter(supplierFilter === s.supplierName ? '' : s.supplierName)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  supplierFilter === s.supplierName ? 'bg-rose-50/60 border-rose-300 shadow-xs' : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{s.supplierName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{s.txCount} {isAr ? 'حركة' : 'txs'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 font-mono text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">{isAr ? 'مستحق له (رحلات)' : 'Owed'}</span>
                    <span className="font-bold text-rose-700">{formatEGP(s.totalCredit)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">{isAr ? 'مسدد له (دفعات)' : 'Paid'}</span>
                    <span className="font-bold text-emerald-700">{formatEGP(s.totalDebit)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">{isAr ? 'المتبقي للمورد' : 'Balance'}</span>
                    <span className={`font-bold ${s.currentBalance > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                      {formatEGP(s.currentBalance)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Supplier Transactions Table */}
          {isSupplierTxsLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (supplierTxsData || []).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isAr ? 'لا توجد حركات مسجلة لكشف حساب الموردين.' : 'No transactions recorded for supplier statements.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-3 px-3.5">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'اسم المورد' : 'Supplier'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'رقم المستند / الرحلة' : 'Document #'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'البيان والتفاصيل' : 'Description'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'مستحق للمورد (دائن)' : 'Owed (Credit)'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'مسدد للمورد (مدين)' : 'Paid (Debit)'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الرصيد المتبقي له' : 'Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplierTxsData.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors font-mono">
                        <td className="py-3 px-3.5 text-slate-600">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="py-3 px-3.5 font-sans font-medium text-slate-800">{tx.supplierName}</td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">{tx.documentNumber || '—'}</td>
                        <td className="py-3 px-3.5 font-sans text-slate-700">{tx.description}</td>
                        <td className="py-3 px-3.5 font-bold text-rose-700">
                          {Number(tx.credit) > 0 ? formatEGP(tx.credit) : '—'}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-emerald-700">
                          {Number(tx.debit) > 0 ? formatEGP(tx.debit) : '—'}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">{formatEGP(tx.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTLEMENTS */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          {isSettlementsLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (settlementsData || []).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isAr ? 'لا توجد مستحقات مسجلة للسائقين والموردين لهذه الفترة.' : 'No settlements found for this period.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-3 px-3.5">{isAr ? 'السائق / المورد' : 'Driver / Supplier'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الشركة' : 'Company'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الفرع' : 'Branch'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'عدد الرحلات' : 'Trips'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'إجمالي البدل / الأجرة' : 'Base Pay'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'إضافي' : 'Overtime'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'استقطاعات وسلف' : 'Deductions'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'صافي المستحق' : 'Net Payable'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {settlementsData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors font-mono">
                        <td className="py-3 px-3.5 font-sans font-bold text-slate-900">{row.driverName}</td>
                        <td className="py-3 px-3.5 font-sans text-slate-700">{row.companyName}</td>
                        <td className="py-3 px-3.5 font-sans text-slate-500">{row.branch}</td>
                        <td className="py-3 px-3.5 font-bold text-slate-800">{row.totalTrips}</td>
                        <td className="py-3 px-3.5 text-slate-700">{formatEGP(row.totalBasePay)}</td>
                        <td className="py-3 px-3.5 text-emerald-700">{formatEGP(row.totalOvertime)}</td>
                        <td className="py-3 px-3.5 text-rose-700">{formatEGP(row.totalDeductions + row.totalAdvances)}</td>
                        <td className="py-3 px-3.5 font-bold text-emerald-700">{formatEGP(row.netPayable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INCOME STATEMENT */}
      {activeTab === 'incomeStatement' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {isISLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">
                  {isAr ? 'قائمة الدخل والأرباح التشغيلية' : 'Income Statement & Operating Profits'}
                </h2>
                <span className="text-xs text-slate-400">
                  {isAr ? `عن شهر ${selectedMonth} لسنة ${selectedYear}` : `For period: ${selectedMonth}/${selectedYear}`}
                </span>
              </div>

              {/* Revenues */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{isAr ? '١. الإيرادات التشغيلية المفوترة للعملاء' : '1. Operational Client Billing'}</span>
                  <span className="font-mono text-blue-700">{formatEGP(incomeStatementData.revenue?.grossBilling)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 ps-4">
                  <span>{isAr ? '− ضريبة الخصم التجاري والمهني (3%)' : '- Withholding Tax (3%)'}</span>
                  <span className="font-mono text-amber-700">− {formatEGP(incomeStatementData.revenue?.withholdingTax)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 ps-4 pt-1 border-t border-slate-100">
                  <span>{isAr ? 'صافي فواتير العملاء' : 'Net Client Revenues'}</span>
                  <span className="font-mono text-blue-800">{formatEGP(incomeStatementData.revenue?.netClientBilling)}</span>
                </div>
              </div>

              {/* Direct Costs */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{isAr ? '٢. تكاليف الرحلات المباشرة (بدل سائقين وموردين)' : '2. Direct Trip Costs'}</span>
                  <span className="font-mono text-rose-700">− {formatEGP(incomeStatementData.costs?.totalDriverPayouts)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800 ps-4 pt-1 border-t border-slate-100">
                  <span>{isAr ? 'مجمل الربح التشغيلي المباشر' : 'Gross Operating Margin'}</span>
                  <span className="font-mono text-emerald-700">{formatEGP(incomeStatementData.costs?.grossOperatingMargin)}</span>
                </div>
              </div>

              {/* General Expenses */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{isAr ? '٣. المصروفات العامة والإدارية والتشغيلية' : '3. Operating & General Expenses'}</span>
                  <span className="font-mono text-rose-700">− {formatEGP(incomeStatementData.expenses?.totalExpenses)}</span>
                </div>
              </div>

              {/* Net Profit */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">{isAr ? 'صافي أرباح الفترة' : 'Net Operating Profit'}</span>
                  <span className="text-[10px] text-emerald-700">{isAr ? 'بعد احتساب كافة التكاليف والضرائب والمصروفات' : 'After direct costs, taxes & expenses'}</span>
                </div>
                <span className="text-xl font-bold font-mono text-emerald-800">
                  {formatEGP(incomeStatementData.netProfit)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {isExpLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (expensesData?.items || []).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isAr ? 'لا توجد مصروفات مسجلة لهذه الفترة.' : 'No expenses recorded for this period.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-3 px-3.5">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'البند' : 'Category'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'المبلغ' : 'Amount'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الفرع' : 'Branch'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'المركبة' : 'Vehicle'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'ملاحظات' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expensesData.items.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3.5 font-mono text-slate-600">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">{r.category}</td>
                        <td className="py-3 px-3.5 font-mono font-bold text-rose-700">{formatEGP(r.amount)}</td>
                        <td className="py-3 px-3.5 text-slate-600">{r.branch || '—'}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-600">{r.vehicleNumber || '—'}</td>
                        <td className="py-3 px-3.5 text-slate-500">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {isPayrollLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (payrollData || []).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
              <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isAr ? 'لا توجد رواتب مسجلة.' : 'No payroll records found.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-3 px-3.5">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الموظف' : 'Employee'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الوظيفة' : 'Role'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الأساسي' : 'Basic'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'إضافي' : 'Overtime'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'استقطاعات' : 'Deductions'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'صافي الراتب' : 'Net Salary'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'ملاحظات' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors font-mono">
                        <td className="py-3 px-3.5 text-slate-600">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="py-3 px-3.5 font-sans font-bold text-slate-900">{r.employeeName}</td>
                        <td className="py-3 px-3.5 font-sans text-slate-600">{r.jobTitle}</td>
                        <td className="py-3 px-3.5 text-slate-700">{formatEGP(r.basicSalary)}</td>
                        <td className="py-3 px-3.5 text-emerald-700">{formatEGP(r.overtime)}</td>
                        <td className="py-3 px-3.5 text-rose-700">{formatEGP(Number(r.deductions || 0) + Number(r.advances || 0))}</td>
                        <td className="py-3 px-3.5 font-bold text-emerald-700">{formatEGP(r.netSalary)}</td>
                        <td className="py-3 px-3.5 font-sans text-slate-500">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: INSTALLMENTS */}
      {activeTab === 'installments' && (
        <div className="space-y-4">
          {isInstLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (installmentsData || []).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
              <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isAr ? 'لا توجد أقساط مسجلة.' : 'No installments found.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-3 px-3.5">{isAr ? 'المركبة / الأصل' : 'Asset'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'رقم القسط' : 'Inst #'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'المبلغ' : 'Amount'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'البنك' : 'Bank'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'الحالة' : 'Status'}</th>
                      {canEdit && <th className="py-3 px-3.5 text-end">{isAr ? 'الإجراء' : 'Action'}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {installmentsData.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-slate-900">{r.assetName}</td>
                        <td className="py-3 px-3.5 font-mono">{r.installmentNumber}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-600">{new Date(r.bankDueDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{formatEGP(r.bankAmount)}</td>
                        <td className="py-3 px-3.5 text-slate-600">{r.bankName || '—'}</td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {r.status === 'PAID' ? (isAr ? 'مسدد' : 'PAID') : isAr ? 'مستحق' : 'PENDING'}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="py-3 px-3.5 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              {r.status !== 'PAID' && (
                                <button
                                  onClick={() => {
                                    setSelectedInstallmentToPay(r);
                                    setPayInstallmentForm({
                                      installmentId: r.id,
                                      accountId: treasuryOverviewData?.accounts?.[0]?.id || '',
                                      paymentDate: new Date().toISOString().split('T')[0],
                                      referenceNumber: r.chequeNumber || '',
                                      notes: `سداد قسط ${r.assetName} رقم ${r.installmentNumber}`,
                                    });
                                    setIsPayInstallmentModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs"
                                >
                                  <Landmark className="h-3 w-3" />
                                  <span>{isAr ? 'سداد من الخزينة' : 'Pay from Safe'}</span>
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  toggleInstallmentMutation.mutate({
                                    id: r.id,
                                    status: r.status === 'PAID' ? 'PENDING' : 'PAID',
                                  })
                                }
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                              >
                                {r.status === 'PAID' ? (isAr ? 'تعيين كمستحق' : 'Mark Pending') : isAr ? 'تسجيل يدوي' : 'Mark Paid'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: TREASURY & VAULTS */}
      {activeTab === 'treasury' && (
        <div className="space-y-6">
          {/* Treasury KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'إجمالي السيولة النقدية' : 'Total Liquidity'}</span>
              <strong className="text-lg font-bold text-blue-700 mt-1 block">
                {formatEGP(treasuryOverviewData?.stats?.totalLiquidity)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'أرصدة الخزائن النقدية' : 'Cash Safes'}</span>
              <strong className="text-lg font-bold text-emerald-700 mt-1 block">
                {formatEGP(treasuryOverviewData?.stats?.safeLiquidity)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'أرصدة الحسابات البنكية' : 'Bank Accounts'}</span>
              <strong className="text-lg font-bold text-indigo-700 mt-1 block">
                {formatEGP(treasuryOverviewData?.stats?.bankLiquidity)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'إجمالي الإيداعات والتوريدات' : 'Total Inflows'}</span>
              <strong className="text-lg font-bold text-emerald-600 mt-1 block">
                {formatEGP(treasuryOverviewData?.stats?.totalInflow)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'إجمالي المصروفات وسداد الأقساط' : 'Total Outflows'}</span>
              <strong className="text-lg font-bold text-rose-700 mt-1 block">
                {formatEGP(treasuryOverviewData?.stats?.totalOutflow)}
              </strong>
            </div>
          </div>

          {/* Accounts Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-blue-600" />
                <span>{isAr ? 'الخزائن والحسابات البنكية النشطة' : 'Active Treasury Accounts & Safes'}</span>
              </h3>
            </div>

            {isTreasuryLoading ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (treasuryOverviewData?.accounts || []).length === 0 ? (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200/80">
                <Landmark className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  {isAr ? 'لا توجد خزن أو حسابات بنكية مضافة بعد.' : 'No treasury accounts found.'}
                </p>
                {canEdit && (
                  <button
                    onClick={() => setIsNewTreasuryModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isAr ? 'إضافة أول خزينة' : 'Add First Safe'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {treasuryOverviewData.accounts.map((acc: any) => (
                  <div key={acc.id} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{acc.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {acc.type === 'CASH_SAFE' ? (isAr ? 'خزينة نقدية كاش' : 'Cash Safe') : isAr ? 'حساب بنكي' : 'Bank Account'}
                          {acc.bankName ? ` • ${acc.bankName}` : ''}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          acc.type === 'CASH_SAFE' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {acc.currency || 'EGP'}
                      </span>
                    </div>

                    {acc.accountNumber && (
                      <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100">
                        {isAr ? 'رقم الحساب/الآيبان: ' : 'Acc #: '}
                        <span className="font-bold text-slate-700">{acc.accountNumber}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{isAr ? 'الرصيد الفعلي:' : 'Balance:'}</span>
                      <span className={`text-base font-bold font-mono ${Number(acc.balance) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatEGP(acc.balance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Entries Audit Log */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-slate-600" />
              <span>{isAr ? 'سجل حركات الخزينة والسيولة النقدية' : 'Treasury Entries & Cash Movement Log'}</span>
            </h3>

            {(treasuryOverviewData?.recentEntries || []).length === 0 ? (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200/80">
                <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">{isAr ? 'لا توجد حركات مسجلة بالخزائن.' : 'No entries recorded.'}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-start border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                        <th className="py-3 px-3.5">{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className="py-3 px-3.5">{isAr ? 'الخزينة / الحساب' : 'Account'}</th>
                        <th className="py-3 px-3.5">{isAr ? 'نوع الحركة' : 'Entry Type'}</th>
                        <th className="py-3 px-3.5">{isAr ? 'المبلغ' : 'Amount'}</th>
                        <th className="py-3 px-3.5">{isAr ? 'الرقم المرجعي' : 'Ref #'}</th>
                        <th className="py-3 px-3.5">{isAr ? 'البيان والملاحظات' : 'Description'}</th>
                        <th className="py-3 px-3.5">{isAr ? 'الرصيد بعدها' : 'Balance After'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {treasuryOverviewData.recentEntries.map((e: any) => (
                        <tr key={e.id} className="hover:bg-slate-50/50 transition-colors font-mono">
                          <td className="py-3 px-3.5 text-slate-600">{new Date(e.date).toLocaleDateString()}</td>
                          <td className="py-3 px-3.5 font-sans font-medium text-slate-800">{e.account?.name}</td>
                          <td className="py-3 px-3.5 font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                e.type === 'DEPOSIT' || e.type === 'CAPITAL_INJECTION' || e.type === 'TRANSFER_IN' || e.type === 'CLIENT_RECEIPT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {e.type === 'DEPOSIT'
                                ? (isAr ? 'إيداع / توريد' : 'Deposit')
                                : e.type === 'INSTALLMENT_PAYMENT'
                                ? (isAr ? 'سداد قسط' : 'Installment')
                                : e.type === 'EXPENSE_PAYMENT'
                                ? (isAr ? 'سداد مصروف' : 'Expense')
                                : e.type === 'CLIENT_RECEIPT'
                                ? (isAr ? 'تحصيل عميل' : 'Client Receipt')
                                : e.type === 'TRANSFER_IN'
                                ? (isAr ? 'تحويل وارد' : 'Transfer In')
                                : e.type === 'TRANSFER_OUT'
                                ? (isAr ? 'تحويل صادر' : 'Transfer Out')
                                : e.type}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-3.5 font-bold ${
                              Number(e.amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {Number(e.amount) >= 0 ? `+${formatEGP(e.amount)}` : formatEGP(e.amount)}
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">{e.referenceNumber || '—'}</td>
                          <td className="py-3 px-3.5 font-sans text-slate-700">{e.description || e.notes || '—'}</td>
                          <td className="py-3 px-3.5 font-bold text-slate-900">{formatEGP(e.balanceAfter)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 9: VEHICLE FLEET & INSTALLMENT LEDGER */}
      {activeTab === 'vehicleLedger' && (
        <div className="space-y-6">
          {/* Vehicle Fleet KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'سيارات الشركة بالأسطول' : 'Total Fleet Vehicles'}</span>
              <strong className="text-lg font-bold text-slate-900 mt-1 block">
                {vehiclesLedgerData?.summary?.totalVehicles || 0}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'إيراد تكلفة السيارات (من الرحلات)' : 'Vehicle Trip Revenue'}</span>
              <strong className="text-lg font-bold text-blue-700 mt-1 block">
                {formatEGP(vehiclesLedgerData?.summary?.totalVehicleCostRevenue)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'مصروفات وصيانة وبنزين الأسطول' : 'Fleet Direct Expenses'}</span>
              <strong className="text-lg font-bold text-rose-700 mt-1 block">
                {formatEGP(vehiclesLedgerData?.summary?.totalExpenses)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'أقساط السيارات المسددة' : 'Installments Paid'}</span>
              <strong className="text-lg font-bold text-indigo-700 mt-1 block">
                {formatEGP(vehiclesLedgerData?.summary?.totalInstallmentsPaid)}
              </strong>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'صافي تغطية وربح سيارات الشركة' : 'Net Vehicle Margin'}</span>
              <strong className="text-lg font-bold text-emerald-700 mt-1 block">
                {formatEGP(vehiclesLedgerData?.summary?.netFleetProfit)}
              </strong>
            </div>
          </div>

          {/* Vehicle Table */}
          {isVehiclesLedgerLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (vehiclesLedgerData?.vehicles || []).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
              <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                {isAr ? 'لا توجد سيارات تابعة للشركة مسجلة.' : 'No company vehicles found.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                      <th className="py-3 px-3.5">{isAr ? 'رقم اللوحة / المركبة' : 'Plate / Vehicle'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'النوع والموديل' : 'Model / Make'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'عدد الرحلات' : 'Trips'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'إيراد تكلفة السيارة المحصل' : 'Vehicle Cost Generated'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'مصروفات وبنزين' : 'Direct Expenses'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'أقساط مسددة' : 'Paid Inst.'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'أقساط متبقية' : 'Pending Inst.'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'صافي التغطية المالية' : 'Net Financial Margin'}</th>
                      <th className="py-3 px-3.5">{isAr ? 'حالة التغطية' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehiclesLedgerData.vehicles.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors font-mono">
                        <td className="py-3 px-3.5 font-bold text-slate-900">{v.plateNumber}</td>
                        <td className="py-3 px-3.5 font-sans text-slate-600">{v.makeModel || '—'} {v.year ? `(${v.year})` : ''}</td>
                        <td className="py-3 px-3.5 font-bold text-slate-800">{v.tripsCount}</td>
                        <td className="py-3 px-3.5 font-bold text-blue-700">{formatEGP(v.vehicleCostRevenue)}</td>
                        <td className="py-3 px-3.5 font-bold text-rose-700">{formatEGP(v.expensesTotal)}</td>
                        <td className="py-3 px-3.5 font-bold text-emerald-700">{formatEGP(v.installmentsPaid)}</td>
                        <td className="py-3 px-3.5 text-amber-700">{formatEGP(v.installmentsPending)}</td>
                        <td className={`py-3 px-3.5 font-bold ${Number(v.netMargin) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatEGP(v.netMargin)}
                        </td>
                        <td className="py-3 px-3.5 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              Number(v.netMargin) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {Number(v.netMargin) >= 0
                              ? (isAr ? 'مغطية وفائضة' : 'Profitable')
                              : isAr ? 'تحت التغطية' : 'Pending Coverage'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Expense */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={isAr ? 'إضافة مصروف تشغيلي' : 'Add Operating Expense'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createExpenseMutation.mutate(expenseForm);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'البند / التصنيف' : 'Category'}</label>
            <input
              required
              type="text"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="وقود، صيانة، رسوم طرق..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'المبلغ (جنيه)' : 'Amount'}</label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
              <input
                required
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الفرع / الموقع' : 'Branch'}</label>
              <input
                type="text"
                value={expenseForm.branch}
                onChange={(e) => setExpenseForm({ ...expenseForm, branch: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم المركبة (اختياري)' : 'Vehicle'}</label>
              <input
                type="text"
                value={expenseForm.vehicleNumber}
                onChange={(e) => setExpenseForm({ ...expenseForm, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'ملاحظات / مرجع الإيصال' : 'Notes'}</label>
            <textarea
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'حفظ المصروف' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Client Transaction / Payment */}
      <Modal
        isOpen={isClientTxModalOpen}
        onClose={() => setIsClientTxModalOpen(false)}
        title={isAr ? 'تسجيل حركة في كشف حساب العميل' : 'Record Client Transaction'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createClientTxMutation.mutate(clientTxForm);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الشركة العميل' : 'Company Name'}</label>
            <input
              required
              type="text"
              value={clientTxForm.companyName}
              onChange={(e) => setClientTxForm({ ...clientTxForm, companyName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="اسم الشركة كما هو مسجل في النظام..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
              <input
                required
                type="date"
                value={clientTxForm.date}
                onChange={(e) => setClientTxForm({ ...clientTxForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم الإيصال / الشيك' : 'Doc #'}</label>
              <input
                type="text"
                value={clientTxForm.documentNumber}
                onChange={(e) => setClientTxForm({ ...clientTxForm, documentNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'البيان' : 'Description'}</label>
            <input
              required
              type="text"
              value={clientTxForm.description}
              onChange={(e) => setClientTxForm({ ...clientTxForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'مدين (مستحق على العميل / فاتورة)' : 'Debit (Invoice)'}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={clientTxForm.debit}
                onChange={(e) => setClientTxForm({ ...clientTxForm, debit: Number(e.target.value), credit: 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-blue-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'دائن (سداد من العميل / تحصيل)' : 'Credit (Receipt)'}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={clientTxForm.credit}
                onChange={(e) => setClientTxForm({ ...clientTxForm, credit: Number(e.target.value), debit: 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsClientTxModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={createClientTxMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'حفظ الحركة' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Treasury Account */}
      <Modal
        isOpen={isNewTreasuryModalOpen}
        onClose={() => setIsNewTreasuryModalOpen(false)}
        title={isAr ? 'إضافة خزينة نقدية أو حساب بنكي جديد' : 'New Treasury Account'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTreasuryAccountMutation.mutate(treasuryAccountForm);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'اسم الخزينة / الحساب' : 'Account Name'}</label>
            <input
              required
              type="text"
              value={treasuryAccountForm.name}
              onChange={(e) => setTreasuryAccountForm({ ...treasuryAccountForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder={isAr ? 'خزينة الفرع الرئيسي، حساب بنك مصر...' : 'Main Vault, CIB Account...'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'النوع' : 'Type'}</label>
              <select
                value={treasuryAccountForm.type}
                onChange={(e) => setTreasuryAccountForm({ ...treasuryAccountForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="CASH_SAFE">{isAr ? 'خزينة نقدية (كاش)' : 'Cash Safe'}</option>
                <option value="BANK_ACCOUNT">{isAr ? 'حساب بنكي' : 'Bank Account'}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الرصيد الافتتاحي (جنيه)' : 'Initial Balance'}</label>
              <input
                type="number"
                step="0.01"
                value={treasuryAccountForm.initialBalance}
                onChange={(e) => setTreasuryAccountForm({ ...treasuryAccountForm, initialBalance: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
          </div>
          {treasuryAccountForm.type === 'BANK_ACCOUNT' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">{isAr ? 'اسم البنك' : 'Bank Name'}</label>
                <input
                  type="text"
                  value={treasuryAccountForm.bankName}
                  onChange={(e) => setTreasuryAccountForm({ ...treasuryAccountForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="البنك الأهلي، بنك مصر، CIB..."
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم الحساب / الآيبان' : 'Account / IBAN'}</label>
                <input
                  type="text"
                  value={treasuryAccountForm.accountNumber}
                  onChange={(e) => setTreasuryAccountForm({ ...treasuryAccountForm, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
            <textarea
              value={treasuryAccountForm.notes}
              onChange={(e) => setTreasuryAccountForm({ ...treasuryAccountForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTreasuryModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={createTreasuryAccountMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'حفظ الخزينة / الحساب' : 'Save Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Transfer between Treasury Accounts */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={isAr ? 'تحويل نقدية بين الخزائن والحسابات' : 'Treasury Transfer'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            transferTreasuryMutation.mutate(transferForm);
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'من الخزينة / الحساب' : 'From Account'}</label>
              <select
                required
                value={transferForm.fromAccountId}
                onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
              >
                <option value="">{isAr ? 'اختر الخزينة المحول منها' : 'Select Source'}</option>
                {(treasuryOverviewData?.accounts || []).map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatEGP(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'إلى الخزينة / الحساب' : 'To Account'}</label>
              <select
                required
                value={transferForm.toAccountId}
                onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
              >
                <option value="">{isAr ? 'اختر الخزينة المستلمة' : 'Select Destination'}</option>
                {(treasuryOverviewData?.accounts || [])
                  .filter((acc: any) => acc.id !== transferForm.fromAccountId)
                  .map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatEGP(acc.balance)})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'المبلغ المحول (جنيه)' : 'Amount'}</label>
              <input
                required
                type="number"
                min={1}
                step="0.01"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رسوم التحويل البنكي إن وجدت' : 'Transfer Fee'}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={transferForm.transferFee}
                onChange={(e) => setTransferForm({ ...transferForm, transferFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم الحوالة / الإيصال' : 'Ref #'}</label>
            <input
              type="text"
              value={transferForm.referenceNumber}
              onChange={(e) => setTransferForm({ ...transferForm, referenceNumber: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
            <textarea
              value={transferForm.notes}
              onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={transferTreasuryMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'تنفيذ التحويل' : 'Confirm Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Deposit Profit / Capital Adjustment */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title={isAr ? 'توريد أرباح التشغيل والفواتير إلى الخزينة' : 'Deposit Operating Profits to Treasury'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            depositTreasuryMutation.mutate(depositForm);
          }}
          className="space-y-4 text-xs"
        >
          {/* Deposit Source Mode Selector */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">{isAr ? 'مصدر الأرباح والإيداع' : 'Deposit Source'}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'PROFIT_BY_CLIENT', labelAr: '🏢 أرباح فواتير عميل', labelEn: 'Client Invoices Profit' },
                { key: 'OPERATIONS_PERIOD', labelAr: '📊 أرباح اليومية العامة', labelEn: 'Period Daily Profit' },
                { key: 'CUSTOM', labelAr: '✍️ إيداع نقدية مباشر', labelEn: 'Direct Deposit' },
              ].map((src) => (
                <button
                  type="button"
                  key={src.key}
                  onClick={() => {
                    const mode = src.key as any;
                    if (mode === 'PROFIT_BY_CLIENT') {
                      const cName = clientSummaryData?.[0]?.companyName || '';
                      const clientOps = (operationsData?.items || []).filter((op: any) => op.companyName === cName);
                      const p = clientOps.reduce((sum: number, op: any) => sum + Number(op.dailyProfit || 0), 0);
                      setDepositForm({
                        ...depositForm,
                        depositSource: mode,
                        clientName: cName,
                        amount: p > 0 ? p : depositForm.amount,
                        description: `توريد أرباح تشغيل فواتير شركة ${cName || ''}`,
                      });
                    } else if (mode === 'OPERATIONS_PERIOD') {
                      const p = Number(opsSummary?.totalDailyProfit || 0);
                      setDepositForm({
                        ...depositForm,
                        depositSource: mode,
                        clientName: '',
                        amount: p > 0 ? p : depositForm.amount,
                        description: `توريد صافي أرباح تشغيل شهر ${selectedMonth}/${selectedYear}`,
                      });
                    } else {
                      setDepositForm({
                        ...depositForm,
                        depositSource: mode,
                        description: 'إيداع نقدية بالخزينة',
                      });
                    }
                  }}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    depositForm.depositSource === src.key
                      ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {isAr ? src.labelAr : src.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* If Client Mode: Choose Client & Display Calculated Profit */}
          {depositForm.depositSource === 'PROFIT_BY_CLIENT' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div>
                <label className="block font-bold text-slate-800 mb-1">{isAr ? 'اختر الشركة العميل' : 'Select Client'}</label>
                <select
                  value={depositForm.clientName}
                  onChange={(e) => {
                    const cName = e.target.value;
                    const clientOps = (operationsData?.items || []).filter((op: any) => op.companyName === cName);
                    const p = clientOps.reduce((sum: number, op: any) => sum + Number(op.dailyProfit || 0), 0);
                    setDepositForm({
                      ...depositForm,
                      clientName: cName,
                      amount: p > 0 ? p : 0,
                      description: `توريد أرباح تشغيل فواتير شركة ${cName}`,
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
                >
                  <option value="">{isAr ? 'اختر العميل...' : 'Select client...'}</option>
                  {(clientSummaryData || []).map((c: any) => (
                    <option key={c.companyName} value={c.companyName}>
                      {c.companyName} ({isAr ? 'رصيد متبقي: ' : 'Balance: '} {formatEGP(c.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              {depositForm.clientName && (() => {
                const clientOps = (operationsData?.items || []).filter((op: any) => op.companyName === depositForm.clientName);
                const billed = clientOps.reduce((sum: number, op: any) => sum + Number(op.totalAmount || 0), 0);
                const driverCost = clientOps.reduce((sum: number, op: any) => sum + Number(op.netDriverPay || 0), 0);
                const profit = clientOps.reduce((sum: number, op: any) => sum + Number(op.dailyProfit || 0), 0);

                return (
                  <div className="grid grid-cols-3 gap-2 p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">{isAr ? 'المفوتر للعميل' : 'Billed'}</span>
                      <span className="font-bold text-blue-700">{formatEGP(billed)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">{isAr ? 'تكاليف التشغيل' : 'Costs'}</span>
                      <span className="font-bold text-amber-700">{formatEGP(driverCost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">{isAr ? 'صافي أرباح الفواتير' : 'Net Profit'}</span>
                      <span className={`font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatEGP(profit)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* If Period Mode: Display Period Profit */}
          {depositForm.depositSource === 'OPERATIONS_PERIOD' && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-900 block">{isAr ? 'أرباح اليومية للشهر المحدد' : 'Period Operating Profit'}</span>
                <span className="text-[11px] text-slate-500 font-sans">{isAr ? `شهر ${selectedMonth} / ${selectedYear}` : `${selectedMonth}/${selectedYear}`}</span>
              </div>
              <span className="text-base font-bold font-mono text-emerald-700">{formatEGP(opsSummary?.totalDailyProfit)}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الخزينة أو الحساب المستلم للإيداع' : 'Receiving Safe / Bank'}</label>
            <select
              required
              value={depositForm.accountId}
              onChange={(e) => setDepositForm({ ...depositForm, accountId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
            >
              <option value="">{isAr ? 'اختر الخزينة / الحساب' : 'Select Safe'}</option>
              {(treasuryOverviewData?.accounts || []).map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatEGP(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'مبلغ الأرباح المراد إيداعه (جنيه)' : 'Deposit Amount'}</label>
              <input
                required
                type="number"
                min={1}
                step="0.01"
                value={depositForm.amount}
                onChange={(e) => setDepositForm({ ...depositForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم الإيصال / المرجع' : 'Ref #'}</label>
              <input
                type="text"
                value={depositForm.referenceNumber}
                onChange={(e) => setDepositForm({ ...depositForm, referenceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'البيان' : 'Description'}</label>
            <input
              required
              type="text"
              value={depositForm.description}
              onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="توريد أرباح فواتير رحلات..."
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
            <textarea
              value={depositForm.notes}
              onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={depositTreasuryMutation.isPending || !depositForm.accountId || depositForm.amount <= 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>{depositTreasuryMutation.isPending ? (isAr ? 'جاري التوريد...' : 'Processing...') : isAr ? 'تأكيد إيداع الأرباح بالخزينة' : 'Confirm Deposit'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Pay Installment from Treasury Safe */}
      <Modal
        isOpen={isPayInstallmentModalOpen}
        onClose={() => {
          setIsPayInstallmentModalOpen(false);
          setSelectedInstallmentToPay(null);
        }}
        title={isAr ? 'سداد قسط سيارة من الخزينة' : 'Pay Installment from Treasury'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            payInstallmentFromTreasuryMutation.mutate(payInstallmentForm);
          }}
          className="space-y-4 text-xs"
        >
          {selectedInstallmentToPay && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{selectedInstallmentToPay.assetName} - قسط #{selectedInstallmentToPay.installmentNumber}</span>
                <span className="font-mono text-emerald-700">{formatEGP(selectedInstallmentToPay.bankAmount)}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {isAr ? 'استحقاق: ' : 'Due: '} {new Date(selectedInstallmentToPay.bankDueDate).toLocaleDateString()}
                {selectedInstallmentToPay.bankName ? ` • ${selectedInstallmentToPay.bankName}` : ''}
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الخزينة أو الحساب البنكي المراد الخصم منه' : 'Pay From Safe/Bank'}</label>
            <select
              required
              value={payInstallmentForm.accountId}
              onChange={(e) => setPayInstallmentForm({ ...payInstallmentForm, accountId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
            >
              <option value="">{isAr ? 'اختر الخزينة / الحساب' : 'Select Safe'}</option>
              {(treasuryOverviewData?.accounts || []).map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatEGP(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'تاريخ السداد' : 'Payment Date'}</label>
              <input
                required
                type="date"
                value={payInstallmentForm.paymentDate}
                onChange={(e) => setPayInstallmentForm({ ...payInstallmentForm, paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم الشيك / التحويل' : 'Cheque / Ref #'}</label>
              <input
                type="text"
                value={payInstallmentForm.referenceNumber}
                onChange={(e) => setPayInstallmentForm({ ...payInstallmentForm, referenceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'ملاحظات السداد' : 'Notes'}</label>
            <textarea
              value={payInstallmentForm.notes}
              onChange={(e) => setPayInstallmentForm({ ...payInstallmentForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsPayInstallmentModalOpen(false);
                setSelectedInstallmentToPay(null);
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={payInstallmentFromTreasuryMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'تأكيد السداد والخصم من الخزينة' : 'Confirm & Deduct'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Collect Client Receipt into Treasury */}
      <Modal
        isOpen={isClientReceiptModalOpen}
        onClose={() => setIsClientReceiptModalOpen(false)}
        title={isAr ? 'تحصيل دفعة عميل وتوريدها للخزينة' : 'Collect Client Receipt to Treasury'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            recordClientReceiptMutation.mutate(clientReceiptForm);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الشركة العميل' : 'Client Company'}</label>
            <input
              required
              type="text"
              value={clientReceiptForm.companyName}
              onChange={(e) => setClientReceiptForm({ ...clientReceiptForm, companyName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder={isAr ? 'اسم الشركة المسجل...' : 'Company Name...'}
              list="client-companies-list"
            />
            <datalist id="client-companies-list">
              {(clientSummaryData || []).map((c: any) => (
                <option key={c.companyName} value={c.companyName} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الخزينة أو الحساب البنكي المستلم' : 'Receiving Safe / Bank'}</label>
            <select
              required
              value={clientReceiptForm.accountId}
              onChange={(e) => setClientReceiptForm({ ...clientReceiptForm, accountId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
            >
              <option value="">{isAr ? 'اختر الخزينة / الحساب' : 'Select Safe'}</option>
              {(treasuryOverviewData?.accounts || []).map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatEGP(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'المبلغ المحصل (جنيه)' : 'Collected Amount'}</label>
              <input
                required
                type="number"
                min={1}
                step="0.01"
                value={clientReceiptForm.amount}
                onChange={(e) => setClientReceiptForm({ ...clientReceiptForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
              <input
                required
                type="date"
                value={clientReceiptForm.date}
                onChange={(e) => setClientReceiptForm({ ...clientReceiptForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم الشيك / الإيصال' : 'Receipt / Cheque #'}</label>
              <input
                type="text"
                value={clientReceiptForm.referenceNumber}
                onChange={(e) => setClientReceiptForm({ ...clientReceiptForm, referenceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'البيان' : 'Description'}</label>
              <input
                required
                type="text"
                value={clientReceiptForm.description}
                onChange={(e) => setClientReceiptForm({ ...clientReceiptForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'ملاحظات إضافية' : 'Notes'}</label>
            <textarea
              value={clientReceiptForm.notes}
              onChange={(e) => setClientReceiptForm({ ...clientReceiptForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsClientReceiptModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={recordClientReceiptMutation.isPending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'تأكيد التحصيل والتوريد للخزينة' : 'Confirm & Collect'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Installment */}
      <Modal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        title={isAr ? 'إضافة قسط جديد' : 'Add New Installment'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createInstallmentMutation.mutate(installmentForm);
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'نوع الأصل' : 'Category'}</label>
              <select
                value={installmentForm.category}
                onChange={(e) => setInstallmentForm({ ...installmentForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="VEHICLE">{isAr ? 'سيارة / حافلة (أقساط أسطول)' : 'Vehicle'}</option>
                <option value="PROPERTY_OFFICE">{isAr ? 'مقر / مكتب / أصل آخر' : 'Office / Property'}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'اسم الأصل أو السيارة' : 'Asset / Plate'}</label>
              <input
                required
                type="text"
                value={installmentForm.assetName}
                onChange={(e) => setInstallmentForm({ ...installmentForm, assetName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                placeholder={isAr ? 'حافلة مرسيدس أو رقم اللوحة...' : 'Bus / Plate...'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم اللوحة (إن وجد)' : 'Vehicle Plate'}</label>
              <input
                type="text"
                value={installmentForm.vehiclePlate}
                onChange={(e) => setInstallmentForm({ ...installmentForm, vehiclePlate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                placeholder="أ ب ج 1234"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم القسط' : 'Installment #'}</label>
              <input
                required
                type="number"
                min={1}
                value={installmentForm.installmentNumber}
                onChange={(e) => setInstallmentForm({ ...installmentForm, installmentNumber: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'مبلغ القسط (جنيه)' : 'Amount'}</label>
              <input
                required
                type="number"
                min={1}
                step="0.01"
                value={installmentForm.bankAmount}
                onChange={(e) => setInstallmentForm({ ...installmentForm, bankAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-blue-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
              <input
                required
                type="date"
                value={installmentForm.bankDueDate}
                onChange={(e) => setInstallmentForm({ ...installmentForm, bankDueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'البنك أو الجهة الممولة' : 'Bank'}</label>
              <input
                type="text"
                value={installmentForm.bankName}
                onChange={(e) => setInstallmentForm({ ...installmentForm, bankName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                placeholder="بنك مصر، الأهلي، كونتكت..."
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم الشيك / الإيصال' : 'Cheque #'}</label>
              <input
                type="text"
                value={installmentForm.chequeNumber}
                onChange={(e) => setInstallmentForm({ ...installmentForm, chequeNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
            <textarea
              value={installmentForm.notes}
              onChange={(e) => setInstallmentForm({ ...installmentForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInstallmentModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={createInstallmentMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'حفظ القسط' : 'Save Installment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Payroll */}
      <Modal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        title={isAr ? 'إضافة سجل راتب جديد' : 'Add Payroll Entry'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPayrollMutation.mutate(payrollForm);
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'اسم الموظف / السائق' : 'Employee Name'}</label>
              <input
                required
                type="text"
                value={payrollForm.employeeName}
                onChange={(e) => setPayrollForm({ ...payrollForm, employeeName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الوظيفة' : 'Job Title'}</label>
              <input
                required
                type="text"
                value={payrollForm.jobTitle}
                onChange={(e) => setPayrollForm({ ...payrollForm, jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الراتب الأساسي' : 'Basic'}</label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={payrollForm.basicSalary}
                onChange={(e) => setPayrollForm({ ...payrollForm, basicSalary: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'إضافي' : 'Overtime'}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={payrollForm.overtime}
                onChange={(e) => setPayrollForm({ ...payrollForm, overtime: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-emerald-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'استقطاعات وسلف' : 'Deductions'}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={payrollForm.deductions}
                onChange={(e) => setPayrollForm({ ...payrollForm, deductions: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-rose-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'تاريخ السجل' : 'Date'}</label>
            <input
              required
              type="date"
              value={payrollForm.date}
              onChange={(e) => setPayrollForm({ ...payrollForm, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
            <textarea
              value={payrollForm.notes}
              onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayrollModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={createPayrollMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'حفظ الراتب' : 'Save Payroll'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Supplier Transaction */}
      <Modal
        isOpen={isSupplierTxModalOpen}
        onClose={() => setIsSupplierTxModalOpen(false)}
        title={isAr ? 'تسجيل حركة في كشف حساب المورد' : 'Record Supplier Transaction'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSupplierTxMutation.mutate(supplierTxForm);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'اسم المورد' : 'Supplier Name'}</label>
            <input
              required
              type="text"
              value={supplierTxForm.supplierName}
              onChange={(e) => setSupplierTxForm({ ...supplierTxForm, supplierName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="اسم شركة النقل الموردة..."
              list="supplier-names-list"
            />
            <datalist id="supplier-names-list">
              {(supplierSummaryData || []).map((s: any) => (
                <option key={s.supplierName} value={s.supplierName} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
              <input
                required
                type="date"
                value={supplierTxForm.date}
                onChange={(e) => setSupplierTxForm({ ...supplierTxForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم الإيصال / الشيك' : 'Doc #'}</label>
              <input
                type="text"
                value={supplierTxForm.documentNumber}
                onChange={(e) => setSupplierTxForm({ ...supplierTxForm, documentNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'البيان' : 'Description'}</label>
            <input
              required
              type="text"
              value={supplierTxForm.description}
              onChange={(e) => setSupplierTxForm({ ...supplierTxForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'مستحق للمورد (دائن / رحلات)' : 'Credit (Owed to Supplier)'}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={supplierTxForm.credit}
                onChange={(e) => setSupplierTxForm({ ...supplierTxForm, credit: Number(e.target.value), debit: 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-rose-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                {isAr ? 'مسدد للمورد (مدين / دفعات)' : 'Debit (Paid to Supplier)'}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={supplierTxForm.debit}
                onChange={(e) => setSupplierTxForm({ ...supplierTxForm, debit: Number(e.target.value), credit: 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSupplierTxModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={createSupplierTxMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'حفظ الحركة' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Pay Supplier from Treasury */}
      <Modal
        isOpen={isPaySupplierModalOpen}
        onClose={() => {
          setIsPaySupplierModalOpen(false);
          setSelectedSupplierToPay(null);
        }}
        title={isAr ? 'سداد مستحقات مورد من الخزينة' : 'Pay Supplier from Treasury'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            paySupplierFromTreasuryMutation.mutate(paySupplierForm);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'اسم المورد' : 'Supplier Name'}</label>
            <input
              required
              type="text"
              value={paySupplierForm.supplierName}
              onChange={(e) => setPaySupplierForm({ ...paySupplierForm, supplierName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="اسم المورد..."
              list="supplier-pay-list"
            />
            <datalist id="supplier-pay-list">
              {(supplierSummaryData || []).map((s: any) => (
                <option key={s.supplierName} value={s.supplierName} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">{isAr ? 'الخزينة أو الحساب البنكي المراد الصرف منه' : 'Pay From Safe / Bank'}</label>
            <select
              required
              value={paySupplierForm.accountId}
              onChange={(e) => setPaySupplierForm({ ...paySupplierForm, accountId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium"
            >
              <option value="">{isAr ? 'اختر الخزينة / الحساب' : 'Select Safe'}</option>
              {(treasuryOverviewData?.accounts || []).map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatEGP(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'المبلغ المسدد (جنيه)' : 'Amount'}</label>
              <input
                required
                type="number"
                min={1}
                step="0.01"
                value={paySupplierForm.amount}
                onChange={(e) => setPaySupplierForm({ ...paySupplierForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-rose-700"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'تاريخ الصرف' : 'Payment Date'}</label>
              <input
                required
                type="date"
                value={paySupplierForm.date}
                onChange={(e) => setPaySupplierForm({ ...paySupplierForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'رقم الشيك / التحويل' : 'Cheque / Ref #'}</label>
              <input
                type="text"
                value={paySupplierForm.referenceNumber}
                onChange={(e) => setPaySupplierForm({ ...paySupplierForm, referenceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
              <input
                type="text"
                value={paySupplierForm.notes}
                onChange={(e) => setPaySupplierForm({ ...paySupplierForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsPaySupplierModalOpen(false);
                setSelectedSupplierToPay(null);
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={paySupplierFromTreasuryMutation.isPending}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg"
            >
              {isAr ? 'تأكيد الصرف والخصم من الخزينة' : 'Confirm & Pay'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Ledger;
