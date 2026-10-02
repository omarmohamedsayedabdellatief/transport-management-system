import React, { useState, useDeferredValue } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  AddOperationModal,
  AddOvertimeModal,
  AddExpenseModal,
  ClientReceiptModal,
  ClientInvoiceModal,
  SupplierInvoiceModal,
  ManualDebitModal,
  SupplierTxModal,
  SupplierPayModal,
  AddInstallmentModal,
  CreateAccountModal,
  TransferModal,
  DriverPayModal,
  StaffPayrollModal,
} from './AccountingModals';
import {
  accountingApi,
  DailyOperationItem,
  DriverOvertimeItem,
  DriverSettlementItem,
  ExpenseItem,
  InstallmentItem,
  ClientTransactionItem,
  SupplierTransactionItem,
  StaffPayrollItem,
} from '../../services/accounting.service';
import {
  Calculator,
  CalendarDays,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Users,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Calendar,
  Truck,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Briefcase,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Receipt,
  UserCheck,
  Printer,
  FileText,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const MONTH_NAMES_AR = [
  'شهر 1 (يناير)',
  'شهر 2 (فبراير)',
  'شهر 3 (مارس)',
  'شهر 4 (أبريل)',
  'شهر 5 (مايو)',
  'شهر 6 (يونيو)',
  'شهر 7 (يوليو)',
  'شهر 8 (أغسطس)',
  'شهر 9 (سبتمبر)',
  'شهر 10 (أكتوبر)',
  'شهر 11 (نوفمبر)',
  'شهر 12 (ديسمبر)',
];

const MONTH_NAMES_EN = [
  'Month 1 (Jan)',
  'Month 2 (Feb)',
  'Month 3 (Mar)',
  'Month 4 (Apr)',
  'Month 5 (May)',
  'Month 6 (Jun)',
  'Month 7 (Jul)',
  'Month 8 (Aug)',
  'Month 9 (Sep)',
  'Month 10 (Oct)',
  'Month 11 (Nov)',
  'Month 12 (Dec)',
];

export const AccountingPage: React.FC = () => {
  const { isRTL } = useLanguage();
  const isAr = isRTL;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'operations' | 'overtime' | 'settlements' | 'payroll' | 'expenses' | 'clients' | 'suppliers' | 'installments' | 'treasury' | 'pnl' | 'comparison'
  >('operations');

  // Dynamic Month & Year defaulting to current date
  const currentActualMonth = new Date().getMonth() + 1;
  const currentActualYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(currentActualMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentActualYear);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [isExportingOps, setIsExportingOps] = useState<boolean>(false);
  const [isExportingSet, setIsExportingSet] = useState<boolean>(false);

  // Filters for tabs with useDeferredValue for 60fps instant UI typing
  const [settlementSearch, setSettlementSearch] = useState<string>('');
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [payrollSearch, setPayrollSearch] = useState<string>('');
  const [payrollJobFilter, setPayrollJobFilter] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [selectedVehiclePlate, setSelectedVehiclePlate] = useState<string>('');
  const [vehicleSearch, setVehicleSearch] = useState<string>('');

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredSettlementSearch = useDeferredValue(settlementSearch);
  const deferredPayrollSearch = useDeferredValue(payrollSearch);
  const deferredClientSearch = useDeferredValue(clientSearch);
  const deferredVehicleSearch = useDeferredValue(vehicleSearch);

  // Modals
  const [showOpModal, setShowOpModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showClientReceiptModal, setShowClientReceiptModal] = useState(false);
  const [showClientInvoiceModal, setShowClientInvoiceModal] = useState(false);
  const [showSupplierInvoiceModal, setShowSupplierInvoiceModal] = useState(false);
  const [showManualDebitModal, setShowManualDebitModal] = useState(false);
  const [showSupplierTxModal, setShowSupplierTxModal] = useState(false);
  const [showSupplierPayModal, setShowSupplierPayModal] = useState(false);
  const [showDriverPayModal, setShowDriverPayModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAccountIdForStatement, setSelectedAccountIdForStatement] = useState<string>('');
  const [showFlowGuide, setShowFlowGuide] = useState(true);

  // Client Receipt to Treasury Initial Form State (تحصيل وسداد في الخزينة)
  const [clientReceiptForm, setClientReceiptForm] = useState({
    companyName: '',
    amount: 0,
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    maxDueBalance: 0,
  });

  // Client Invoice Generator / Viewer State (إصدار ومعاينة فاتورة)
  const [clientInvoiceState, setClientInvoiceState] = useState({
    companyName: '',
    month: currentActualMonth,
    year: currentActualYear,
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  // Supplier Invoice Generator / Viewer State (إصدار ومعاينة فاتورة مورد)
  const [supplierInvoiceState, setSupplierInvoiceState] = useState({
    supplierName: '',
    month: currentActualMonth,
    year: currentActualYear,
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  // Manual Client Debit Form State (إضافة قيد / مطالبة يدوية)
  const [manualDebitForm, setManualDebitForm] = useState({
    companyName: '',
    date: new Date().toISOString().split('T')[0],
    documentNumber: '',
    description: 'مطالبة / فاتورة تشغيل إضافية',
    debit: 0,
    notes: '',
  });

  // Driver Settlement Payment Form State
  const [driverPayForm, setDriverPayForm] = useState({
    driverName: '',
    month: currentActualMonth,
    year: currentActualYear,
    amount: 0,
    accountId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    maxPayable: 0,
  });

  // Dynamic Data Sources from Database
  const { data: dbClients } = useQuery({
    queryKey: ['db-clients-list'],
    queryFn: async () => {
      const res = await api.get('/clients');
      return res.data.data || [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: dbSuppliers } = useQuery({
    queryKey: ['db-suppliers-list'],
    queryFn: async () => {
      const res = await api.get('/partners');
      return res.data.data || [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: dbDrivers } = useQuery({
    queryKey: ['db-drivers-list'],
    queryFn: async () => {
      const res = await api.get('/drivers');
      return res.data.data || [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: dbVehicles } = useQuery({
    queryKey: ['db-vehicles-list'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data.data || [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: dbRoutes } = useQuery({
    queryKey: ['db-routes-list'],
    queryFn: async () => {
      const res = await api.get('/routes?summary=true');
      return res.data.data || [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: treasuryData } = useQuery({
    queryKey: ['acc-treasury-overview'],
    queryFn: () => accountingApi.getTreasuryOverview(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Supplier Pay initial state
  const [supplierPayForm, setSupplierPayForm] = useState({
    supplierName: '',
    amount: 5000,
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    reference: 'سداد دفعة إيجار وتشغيل',
    notes: '',
  });

  // Monthly breakdown for badging & comparative view
  const { data: monthlyBreakdown } = useQuery({
    queryKey: ['acc-monthly-breakdown', selectedYear],
    queryFn: () => accountingApi.getMonthlyBreakdown(selectedYear),
  });

  // Queries - Strictly filtered by selectedMonth (if defined)
  const { data: operationsData, isLoading: opsLoading } = useQuery({
    queryKey: ['acc-operations', selectedMonth, selectedYear, selectedCompany, deferredSearchQuery, page],
    queryFn: () =>
      accountingApi.getOperations({
        month: selectedMonth,
        year: selectedYear,
        companyName: selectedCompany || undefined,
        search: deferredSearchQuery || undefined,
        page,
        limit: 25,
      }),
    enabled: activeTab === 'operations',
  });

  const { data: opsSummary } = useQuery({
    queryKey: ['acc-ops-summary', selectedMonth, selectedYear, selectedCompany],
    queryFn: () =>
      accountingApi.getOperationsSummary({
        month: selectedMonth,
        year: selectedYear,
        companyName: selectedCompany || undefined,
      }),
  });

  const { data: overtimeData, isLoading: otLoading } = useQuery({
    queryKey: ['acc-overtime', selectedMonth, selectedYear, deferredSearchQuery, page],
    queryFn: () =>
      accountingApi.getOvertimes({
        month: selectedMonth,
        year: selectedYear,
        search: deferredSearchQuery || undefined,
        page,
        limit: 25,
      }),
    enabled: activeTab === 'overtime',
  });

  const { data: settlementsData, isLoading: setLoading } = useQuery({
    queryKey: ['acc-settlements', selectedMonth, selectedYear, selectedCompany],
    queryFn: () =>
      accountingApi.getSettlements({
        month: selectedMonth,
        year: selectedYear,
        companyName: selectedCompany || undefined,
      }),
    enabled: activeTab === 'settlements' || showDriverPayModal,
  });

  const { data: expensesData, isLoading: expLoading } = useQuery({
    queryKey: ['acc-expenses', selectedMonth, selectedYear, deferredSearchQuery],
    queryFn: () =>
      accountingApi.getExpenses({
        month: selectedMonth,
        year: selectedYear,
        search: deferredSearchQuery || undefined,
        limit: 50,
      }),
    enabled: activeTab === 'expenses',
  });

  const { data: expSummary } = useQuery({
    queryKey: ['acc-exp-summary', selectedMonth, selectedYear],
    queryFn: () =>
      accountingApi.getExpensesSummary({
        month: selectedMonth,
        year: selectedYear,
      }),
  });

  const { data: clientLedgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['acc-client-ledger', selectedCompany],
    queryFn: () => accountingApi.getClientTransactions(selectedCompany || undefined),
    enabled: activeTab === 'clients',
  });

  const { data: clientsSummary } = useQuery({
    queryKey: ['acc-clients-summary'],
    queryFn: () => accountingApi.getClientsLedgerSummary(),
    enabled: activeTab === 'clients' || showClientReceiptModal || showClientInvoiceModal,
  });

  const { data: supplierLedgerData, isLoading: supLedgerLoading } = useQuery({
    queryKey: ['acc-supplier-ledger', selectedSupplier],
    queryFn: () => accountingApi.getSupplierTransactions(selectedSupplier || undefined),
    enabled: activeTab === 'suppliers',
  });

  const { data: suppliersSummary } = useQuery({
    queryKey: ['acc-suppliers-summary'],
    queryFn: () => accountingApi.getSuppliersLedgerSummary(),
    enabled: activeTab === 'suppliers',
  });

  const { data: installmentsData, isLoading: instLoading } = useQuery({
    queryKey: ['acc-installments', selectedVehiclePlate, deferredVehicleSearch],
    queryFn: () =>
      accountingApi.getInstallments({
        vehiclePlate: selectedVehiclePlate || undefined,
        search: deferredVehicleSearch || undefined,
      }),
    enabled: activeTab === 'installments',
  });

  const { data: instSummary } = useQuery({
    queryKey: ['acc-inst-summary', selectedVehiclePlate],
    queryFn: () =>
      accountingApi.getInstallmentsSummary({
        vehiclePlate: selectedVehiclePlate || undefined,
      }),
    enabled: activeTab === 'installments',
  });

  const { data: vehicleEconData, isLoading: vehicleEconLoading } = useQuery({
    queryKey: ['acc-vehicle-economics', selectedMonth, selectedYear, selectedVehiclePlate, deferredVehicleSearch],
    queryFn: () =>
      accountingApi.getVehicleEconomics({
        month: selectedMonth,
        year: selectedYear,
        vehiclePlate: selectedVehiclePlate || undefined,
        search: deferredVehicleSearch || undefined,
      }),
    enabled: activeTab === 'installments' || activeTab === 'pnl',
  });

  const { data: pnlData, isLoading: pnlLoading } = useQuery({
    queryKey: ['acc-pnl', selectedMonth, selectedYear],
    queryFn: () => accountingApi.getIncomeStatement({ month: selectedMonth, year: selectedYear }),
    enabled: activeTab === 'pnl',
  });

  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['acc-staff-payroll'],
    queryFn: () => accountingApi.getStaffPayroll(),
    enabled: activeTab === 'payroll' || activeTab === 'pnl',
  });

  // Mutations
  const payDriverMutation = useMutation({
    mutationFn: (data: any) => accountingApi.payDriverSettlement(data),
    onSuccess: () => {
      setShowDriverPayModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['acc-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['acc-monthly-breakdown'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'تعذر صرف مستحقات السائق');
    },
  });

  const createPayrollMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createStaffPayroll(data),
    onSuccess: () => {
      setShowPayrollModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-staff-payroll'] });
      queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['acc-pnl'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'تعذر تسجيل مسير الراتب');
    },
  });

  const deletePayrollMutation = useMutation({
    mutationFn: (id: string) => accountingApi.deleteStaffPayroll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acc-staff-payroll'] });
      queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['acc-pnl'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'تعذر حذف مسير الراتب');
    },
  });
  const createOpMutation = useMutation({
    mutationFn: accountingApi.createOperation,
    onSuccess: () => {
      setShowOpModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-operations'] });
      queryClient.invalidateQueries({ queryKey: ['acc-ops-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-monthly-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['acc-clients-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-client-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['acc-suppliers-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trends'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-today-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const deleteOpMutation = useMutation({
    mutationFn: accountingApi.deleteOperation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acc-operations'] });
      queryClient.invalidateQueries({ queryKey: ['acc-ops-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-monthly-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['acc-pnl'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trends'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-today-trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const createOvertimeMutation = useMutation({
    mutationFn: accountingApi.createOvertime,
    onSuccess: () => {
      setShowOvertimeModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-overtime'] });
      queryClient.invalidateQueries({ queryKey: ['acc-settlements'] });
    },
  });

  const deleteOvertimeMutation = useMutation({
    mutationFn: accountingApi.deleteOvertime,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acc-overtime'] });
      queryClient.invalidateQueries({ queryKey: ['acc-settlements'] });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createExpense(data),
    onSuccess: () => {
      setShowExpenseModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['acc-exp-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-monthly-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['acc-pnl'] });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: accountingApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acc-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['acc-exp-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-monthly-breakdown'] });
      queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['acc-pnl'] });
    },
  });

  // Client Invoice Trips Query (جلب رحلات العميل لتوليد الفاتورة)
  const { data: clientInvoiceTripsData, isLoading: invoiceTripsLoading } = useQuery({
    queryKey: [
      'acc-client-invoice-trips',
      clientInvoiceState.companyName,
      clientInvoiceState.month,
      clientInvoiceState.year,
    ],
    queryFn: () =>
      accountingApi.getOperations({
        companyName: clientInvoiceState.companyName || undefined,
        month: clientInvoiceState.month,
        year: clientInvoiceState.year,
        limit: 200,
      }),
    enabled: showClientInvoiceModal && !!clientInvoiceState.companyName,
  });

  const handlePayInvoice = (params: { companyName: string; amount: number; month: number; year: number }) => {
    setShowClientInvoiceModal(false);
    const defaultAcc = treasuryData?.accounts?.find((a: any) => a.kind === 'BANK') || treasuryData?.accounts?.[0];
    setClientReceiptForm({
      companyName: params.companyName,
      amount: params.amount,
      accountId: defaultAcc?.id || '',
      date: new Date().toISOString().split('T')[0],
      reference: `سداد وتحصيل فاتورة شهر ${params.month}/${params.year} لشركة ${params.companyName}`,
      notes: `تحصيل وسداد فاتورة تشغيل رسمية`,
      maxDueBalance: params.amount,
    });
    setShowClientReceiptModal(true);
  };

  const handlePaySupplierInvoice = (params: { supplierName: string; amount: number; month: number; year: number }) => {
    setShowSupplierInvoiceModal(false);
    const defaultAcc = treasuryData?.accounts?.find((a: any) => a.kind === 'BANK') || treasuryData?.accounts?.[0];
    setSupplierPayForm({
      supplierName: params.supplierName,
      amount: params.amount,
      accountId: defaultAcc?.id || '',
      date: new Date().toISOString().split('T')[0],
      reference: `سداد فاتورة ومطالبة المورد شهر ${params.month}/${params.year} - ${params.supplierName}`,
      notes: `صرف وسداد مستحقات تشغيل مورد`,
    });
    setShowSupplierPayModal(true);
  };

  const recordClientReceiptMutation = useMutation({
    mutationFn: (data: any) => accountingApi.recordClientReceipt(data),
    onSuccess: () => {
      setShowClientReceiptModal(false);
      setClientReceiptForm({
        companyName: '',
        amount: 0,
        accountId: '',
        date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
        maxDueBalance: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['acc-client-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['acc-clients-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['acc-pnl'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'تعذر تسجيل التحصيل');
    },
  });

  const createClientManualDebitMutation = useMutation({
    mutationFn: (data: any) =>
      accountingApi.createClientTransaction({
        companyName: data.companyName,
        date: data.date,
        documentNumber: data.documentNumber || null,
        description: data.description,
        debit: Number(data.debit || 0),
        credit: 0,
        notes: data.notes || null,
      }),
    onSuccess: () => {
      setShowManualDebitModal(false);
      setManualDebitForm({
        companyName: '',
        date: new Date().toISOString().split('T')[0],
        documentNumber: '',
        description: 'مطالبة / فاتورة تشغيل إضافية',
        debit: 0,
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['acc-client-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['acc-clients-summary'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'تعذر تسجيل المطالبة');
    },
  });

  const createSupplierTxMutation = useMutation({
    mutationFn: accountingApi.createSupplierTransaction,
    onSuccess: () => {
      setShowSupplierTxModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-supplier-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['acc-suppliers-summary'] });
    },
  });

  const paySupplierMutation = useMutation({
    mutationFn: accountingApi.paySupplierFromTreasury,
    onSuccess: () => {
      setShowSupplierPayModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-supplier-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['acc-suppliers-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'تعذر صرف المبلغ للمورد');
    },
  });

  const toggleInstMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      accountingApi.toggleInstallmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acc-installments'] });
      queryClient.invalidateQueries({ queryKey: ['acc-inst-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-vehicle-economics'] });
    },
  });

  const createInstallmentMutation = useMutation({
    mutationFn: accountingApi.createInstallment,
    onSuccess: () => {
      setShowInstallmentModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-installments'] });
      queryClient.invalidateQueries({ queryKey: ['acc-inst-summary'] });
      queryClient.invalidateQueries({ queryKey: ['acc-vehicle-economics'] });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: accountingApi.createTreasuryAccount,
    onSuccess: () => {
      setShowCreateAccountModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to create account');
    },
  });

  const transferTreasuryMutation = useMutation({
    mutationFn: accountingApi.transferTreasury,
    onSuccess: () => {
      setShowTransferModal(false);
      queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
      queryClient.invalidateQueries({ queryKey: ['acc-statement'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to transfer funds');
    },
  });

  const { data: accountStatementData, isLoading: statementLoading } = useQuery({
    queryKey: ['acc-statement', selectedAccountIdForStatement],
    queryFn: () => accountingApi.getTreasuryStatement(selectedAccountIdForStatement),
    enabled: !!selectedAccountIdForStatement && activeTab === 'treasury',
  });

  // Handlers for authenticated Excel download
  const handleDownloadOperations = async () => {
    try {
      setIsExportingOps(true);
      await accountingApi.downloadOperationsExcel(selectedYear, selectedMonth);
    } catch (err: any) {
      alert(isAr ? `تعذر تصدير شيت اليومية: ${err.message}` : `Failed to export operations: ${err.message}`);
    } finally {
      setIsExportingOps(false);
    }
  };

  const handleDownloadSettlements = async () => {
    try {
      setIsExportingSet(true);
      await accountingApi.downloadSettlementsExcel(selectedYear, selectedMonth);
    } catch (err: any) {
      alert(isAr ? `تعذر تصدير شيت المستحقات: ${err.message}` : `Failed to export settlements: ${err.message}`);
    } finally {
      setIsExportingSet(false);
    }
  };

  // Current scope label
  const currentMonthLabel = selectedMonth
    ? isAr
      ? MONTH_NAMES_AR[selectedMonth - 1]
      : MONTH_NAMES_EN[selectedMonth - 1]
    : isAr
    ? `إجمالي سنة ${selectedYear} بالكامل`
    : `Full Year ${selectedYear} Total`;

  return (
    <div className="space-y-6">
      {/* Top Header with Dynamic Global Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isAr ? 'قسم الحسابات والماليات الشاملة' : 'Accounting & Financial Management'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {currentMonthLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isAr
                  ? 'منظومة مالية موحدة: تشغيل، عملاء، موردين، مستحقات سائقين، مراكز تكلفة السيارات، وقوائم الدخل'
                  : 'Universal Accounting: Operations, Clients, Suppliers, Driver Settlements, and P&L'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700">
            <span>{isAr ? 'السنة المالية:' : 'Year:'}</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setPage(1);
              }}
              className="bg-transparent font-bold text-blue-700 focus:outline-hidden cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Authenticated Export Operations Excel */}
          <button
            onClick={handleDownloadOperations}
            disabled={isExportingOps}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            {isExportingOps ? (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            ) : (
              <Download className="h-4 w-4 text-blue-600" />
            )}
            <span>{isAr ? 'تصدير اليومية (إكسل)' : 'Export Operations'}</span>
          </button>

          {/* Authenticated Export Settlements Excel */}
          <button
            onClick={handleDownloadSettlements}
            disabled={isExportingSet}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            {isExportingSet ? (
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            )}
            <span>{isAr ? 'تصدير المستحقات (إكسل)' : 'Export Settlements'}</span>
          </button>
        </div>
      </div>

      {/* 🌟 PROMINENT MONTH SELECTOR BAR (شريط تصفية واختيار الشهور المستقلة) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>{isAr ? 'تصفية الحسابات حسب الشهر:' : 'Filter Accounting by Month:'}</span>
            <span className="text-[11px] font-medium text-slate-500">
              {isAr
                ? '(اختر شهراً لعزل حساباته بدقة، أو اختر إجمالي السنة)'
                : '(Select a specific month to isolate its accounts, or select Full Year)'}
            </span>
          </div>
          {selectedMonth && (
            <button
              onClick={() => {
                setSelectedMonth(undefined);
                setPage(1);
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
            >
              {isAr ? 'عرض إجمالي كافة الشهور ←' : 'Show All Months Total →'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const mData = monthlyBreakdown?.months?.find((x: any) => x.month === m);
            const count = Number(mData?.operationsCount ?? mData?.tripsCount ?? mData?.trips ?? 0);
            const hasData = count > 0 || Number(mData?.totalExpenses || mData?.generalExpenses || 0) > 0;
            const isSelected = selectedMonth === m;

            return (
              <button
                key={m}
                onClick={() => {
                  setSelectedMonth(m);
                  setPage(1);
                }}
                className={`py-2 px-1.5 rounded-xl text-center transition-all relative flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/25 scale-[1.03]'
                    : hasData
                    ? 'bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 border border-blue-200/80 font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-400 font-medium'
                }`}
              >
                <span className="text-xs">{isAr ? `شهر ${m}` : `M ${m}`}</span>
                {hasData && (
                  <span
                    className={`text-[9px] mt-0.5 px-1 rounded-full ${
                      isSelected ? 'bg-blue-800/80 text-white' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {count} حركة
                  </span>
                )}
              </button>
            );
          })}

          {/* Full Year Button */}
          <button
            onClick={() => {
              setSelectedMonth(undefined);
              setPage(1);
            }}
            className={`py-2 px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center ${
              selectedMonth === undefined
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-500/25 scale-[1.03]'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold'
            }`}
          >
            <span className="text-xs">{isAr ? 'إجمالي السنة' : 'Full Year'}</span>
            <span
              className={`text-[9px] mt-0.5 px-1 rounded-full ${
                selectedMonth === undefined ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              توتال {selectedYear}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="text-[11px] font-medium text-slate-500 flex justify-between items-center">
            <span>{isAr ? 'إجمالي المطالبات' : 'Total Billing'}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {selectedMonth ? `شهر ${selectedMonth}` : 'السنة'}
            </span>
          </div>
          <span className="text-lg font-black text-slate-900 mt-1 block">
            {(opsSummary?.totalBilling || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </span>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            {isAr ? 'شامل خصم 3%' : 'After 3% W/H'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 flex justify-between items-center">
            <span>{isAr ? 'مستحقات السائقين' : 'Driver Net Pay'}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {selectedMonth ? `شهر ${selectedMonth}` : 'السنة'}
            </span>
          </div>
          <span className="text-lg font-black text-amber-600 mt-1 block">
            {(opsSummary?.totalNetDriverPay || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isAr ? `إجمالي ${opsSummary?.totalTrips || 0} دورة` : `${opsSummary?.totalTrips || 0} Trips`}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 flex justify-between items-center">
            <span>{isAr ? 'إضافي السائقين' : 'Driver Overtime'}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {selectedMonth ? `شهر ${selectedMonth}` : 'السنة'}
            </span>
          </div>
          <span className="text-lg font-black text-indigo-600 mt-1 block">
            {(opsSummary?.totalOvertime || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isAr ? 'سهرات ودورات إضافية' : 'Extra shifts'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 flex justify-between items-center">
            <span>{isAr ? 'مجمل الربح التشغيلي' : 'Gross Profit'}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {selectedMonth ? `شهر ${selectedMonth}` : 'السنة'}
            </span>
          </div>
          <span className="text-lg font-black text-emerald-600 mt-1 block">
            {(opsSummary?.totalDailyProfit || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            {isAr ? 'هامش التشغيل المباشر' : 'Direct Trip Margin'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 flex justify-between items-center">
            <span>{isAr ? 'ضريبة الخصم (3%)' : 'W/H Tax (3%)'}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {selectedMonth ? `شهر ${selectedMonth}` : 'السنة'}
            </span>
          </div>
          <span className="text-lg font-black text-rose-600 mt-1 block">
            {(opsSummary?.totalWithholdingTax || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </span>
          <span className="text-[10px] text-rose-700 font-semibold mt-0.5 block">
            {isAr ? 'ضريبة الخصم والإضافة' : 'Withholding tax'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 flex justify-between items-center">
            <span>{isAr ? 'المصروفات المنصرفة' : 'Expenses'}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {selectedMonth ? `شهر ${selectedMonth}` : 'السنة'}
            </span>
          </div>
          <span className="text-lg font-black text-rose-700 mt-1 block">
            {(expSummary?.totalExpenses || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </span>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
            {isAr ? 'مصروفات تشغيل ومكتب' : 'Fleet & Office'}
          </span>
        </div>
      </div>

      {/* 💳 TREASURY & BANK LIQUIDITY + INTERACTIVE WORKFLOW GUIDE */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-3xl shadow-md border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>{isAr ? 'الخزينة والسيولة النقدية والبنوك الحية' : 'Live Treasury & Bank Liquidity'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {isAr ? 'متصل بالبنوك والخزن' : 'Live Connected'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {isAr
                  ? 'رصيد السيولة الفعلي: يتحرك تلقائياً مع تحصيل العملاء ⬆️ وصرف مستحقات السائقين والموردين والمصروفات ⬇️'
                  : 'Live balances: Automatically updated on client collections ⬆️ and payments ⬇️'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFlowGuide(!showFlowGuide)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5"
            >
              <span>{showFlowGuide ? (isAr ? 'إخفاء دليل الخطوات 🔼' : 'Hide Guide 🔼') : (isAr ? 'عرض خريطة خطوات الدورة المالية 🔽' : 'Show Financial Flow 🔽')}</span>
            </button>
          </div>
        </div>

        {/* Treasury Accounts Live Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/70 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">{isAr ? '💵 الخزينة النقدية (الكاش)' : 'Cash Vault'}</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                {(treasuryData?.totals?.cash || 0).toLocaleString()} <span className="text-xs font-normal text-slate-300">ج.م</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'جاهز لصرف رواتب وبدلات السائقين' : 'For driver cash payouts'}</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              💵
            </div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/70 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">{isAr ? '🏦 الحسابات البنكية (جاري)' : 'Bank Accounts'}</span>
              <span className="text-lg font-black text-blue-400 mt-0.5 block">
                {(treasuryData?.totals?.bank || 0).toLocaleString()} <span className="text-xs font-normal text-slate-300">ج.م</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'إيداع تحويلات العملاء وشيكات الموردين' : 'Client wire transfers & cheques'}</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              🏦
            </div>
          </div>

          <div className="bg-indigo-950/60 p-3.5 rounded-2xl border border-indigo-500/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-300 block">{isAr ? '💎 إجمالي السيولة المتاحة' : 'Total Liquidity'}</span>
              <span className="text-lg font-black text-white mt-0.5 block">
                {(treasuryData?.totals?.totalLiquidity || 0).toLocaleString()} <span className="text-xs font-normal text-indigo-200">ج.م</span>
              </span>
              <span className="text-[10px] text-indigo-300/80 block mt-0.5">{isAr ? 'كاش + بنوك = رأس المال الجاهز' : 'Total available operating funds'}</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
              💎
            </div>
          </div>
        </div>

        {/* 🗺️ INTERACTIVE 5-STEP FINANCIAL WORKFLOW GUIDE */}
        {showFlowGuide && (
          <div className="mt-4 pt-4 border-t border-slate-700/60">
            <div className="text-xs font-bold text-indigo-300 mb-3 flex items-center gap-1.5">
              <span>{isAr ? '🗺️ خريطة الدورة المالية المبسطة (اضغط على أي خطوة للانتقال لها وتطبيقها):' : '🗺️ Simplified Financial Cycle Map (Click any step to open its tab):'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Step 1 */}
              <button
                onClick={() => {
                  setActiveTab('operations');
                  setPage(1);
                }}
                className={`p-3 rounded-2xl text-right transition-all flex flex-col justify-between border ${
                  activeTab === 'operations'
                    ? 'bg-blue-600/30 border-blue-400 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-black text-blue-400 mb-1">
                    <span>1. تشغيل وتوليد الفواتير</span>
                    <span>✍️</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    الرحلة بتتسجل هنا ➜ بينزل استحقاق على العميل وخصم ضريبة 3%.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-blue-300 mt-2 block underline">
                  {isAr ? 'فتح اليومية والفواتير ←' : 'Open Operations →'}
                </span>
              </button>

              {/* Step 2 */}
              <button
                onClick={() => {
                  setActiveTab('clients');
                }}
                className={`p-3 rounded-2xl text-right transition-all flex flex-col justify-between border ${
                  activeTab === 'clients'
                    ? 'bg-blue-600/30 border-blue-400 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-black text-emerald-400 mb-1">
                    <span>2. تحصيل فلوس العملاء</span>
                    <span>📥</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    العميل لما يدفع ➜ بتسجل "تحصيل" فتزيد فلوسك في البنك/الخزينة.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 mt-2 block underline">
                  {isAr ? 'كشوف وتحصيل العملاء ←' : 'Client Collections →'}
                </span>
              </button>

              {/* Step 3 */}
              <button
                onClick={() => {
                  setActiveTab('settlements');
                }}
                className={`p-3 rounded-2xl text-right transition-all flex flex-col justify-between border ${
                  activeTab === 'settlements'
                    ? 'bg-blue-600/30 border-blue-400 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-black text-amber-400 mb-1">
                    <span>3. صرف مستحقات السائقين</span>
                    <span>💸</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    سائقي شركتنا ➜ بتدوس "صرف المستحق" فيخرج كاش من الخزينة برقم إيصال.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-amber-300 mt-2 block underline">
                  {isAr ? 'مستحق السائقين والتسوية ←' : 'Driver Settlements →'}
                </span>
              </button>

              {/* Step 4 */}
              <button
                onClick={() => {
                  setActiveTab('suppliers');
                }}
                className={`p-3 rounded-2xl text-right transition-all flex flex-col justify-between border ${
                  activeTab === 'suppliers'
                    ? 'bg-blue-600/30 border-blue-400 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-black text-purple-400 mb-1">
                    <span>4. سداد فواتير الموردين</span>
                    <span>🤝</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    شركات التوريد الخارجية ➜ بتدوس "سداد مورد" وتدفع له من البنك/الخزينة.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-purple-300 mt-2 block underline">
                  {isAr ? 'كشوف حساب وسداد الموردين ←' : 'Supplier Payables →'}
                </span>
              </button>

              {/* Step 5 */}
              <button
                onClick={() => {
                  setActiveTab('pnl');
                }}
                className={`p-3 rounded-2xl text-right transition-all flex flex-col justify-between border ${
                  activeTab === 'pnl'
                    ? 'bg-blue-600/30 border-blue-400 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-black text-rose-400 mb-1">
                    <span>5. قائمة الأرباح (P&L)</span>
                    <span>📊</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    تجميع كل الإيرادات - (سائقين + موردين + مصاريف + أقساط) = صافي ربحك.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-rose-300 mt-2 block underline">
                  {isAr ? 'عرض قائمة الدخل والأرباح ←' : 'View P&L Report →'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => {
            setActiveTab('operations');
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'operations'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>{isAr ? 'تشغيل اليومية والفواتير' : 'Daily Operations'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('overtime');
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'overtime'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>{isAr ? 'سجل إضافي السائقين' : 'Driver Overtime Log'}</span>
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'settlements'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{isAr ? 'مستحق السائقين (التسوية)' : 'Driver Settlements'}</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'payroll'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>{isAr ? 'رواتب ومسيرات الموظفين' : 'Staff Payroll'}</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>{isAr ? 'المصروفات العامة' : 'Expenses'}</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'clients'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>{isAr ? 'كشوف حساب العملاء' : 'Client Ledgers'}</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>{isAr ? 'كشوف حساب الموردين والشركاء' : 'Supplier Ledgers'}</span>
        </button>

        <button
          onClick={() => setActiveTab('installments')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'installments'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{isAr ? 'أقساط وعوائد المركبات' : 'Asset Economics'}</span>
        </button>

        <button
          onClick={() => setActiveTab('treasury')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'treasury'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="h-4 w-4 text-emerald-600" />
          <span>{isAr ? 'الخزائن والحسابات البنكية' : 'Treasury & Bank Accounts'}</span>
        </button>

        <button
          onClick={() => setActiveTab('pnl')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'pnl'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>{isAr ? 'قائمة الدخل والأرباح' : 'Income Statement (P&L)'}</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'comparison'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="h-4 w-4 text-indigo-500" />
          <span>{isAr ? 'جدول مقارنة الشهور الـ 12' : '12-Month Comparison'}</span>
        </button>
      </div>

      {/* TAB 1: DAILY OPERATIONS */}
      {activeTab === 'operations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute rtl:right-3 ltr:left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالسائق، الخط، الشركة...' : 'Search driver, route, company...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="rtl:pr-9 ltr:pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              {/* Dynamic Company Filter */}
              <select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 focus:outline-hidden"
              >
                <option value="">{isAr ? 'جميع الشركات والعملاء' : 'All Companies'}</option>
                {dbClients?.map((c: any) => (
                  <option key={c.id || c.companyName} value={c.companyName}>
                    {c.companyName}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                {selectedMonth ? `شهر ${selectedMonth} فقط` : 'جميع الشهور'}
              </span>
            </div>

            <button
              onClick={() => setShowOpModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إضافة حركة تشغيل جديدة' : 'Add Daily Operation'}</span>
            </button>
          </div>

          {/* Operations Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3">التاريخ</th>
                    <th className="py-3 px-3">السائق</th>
                    <th className="py-3 px-3">الشركة / العميل</th>
                    <th className="py-3 px-3">الخط والفرع</th>
                    <th className="py-3 px-3">نوع السيارة</th>
                    <th className="py-3 px-3 text-center">الدورات</th>
                    <th className="py-3 px-3 text-left">سعر اليومية</th>
                    <th className="py-3 px-3 text-left">أجر السائق</th>
                    <th className="py-3 px-3 text-left">إيجار العربية</th>
                    <th className="py-3 px-3 text-left">خصم 3%</th>
                    <th className="py-3 px-3 text-left">الإجمالي</th>
                    <th className="py-3 px-3 text-left">صافي السائق</th>
                    <th className="py-3 px-3 text-left">أرباح اليومية</th>
                    <th className="py-3 px-3 text-left">صافي الإيراد</th>
                    <th className="py-3 px-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {opsLoading ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'جاري تحميل حركات التشغيل...' : 'Loading operations...'}
                      </td>
                    </tr>
                  ) : !operationsData || operationsData.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-400 font-medium">
                        {isAr
                          ? `لا توجد حركات تشغيل مسجلة في ${currentMonthLabel}`
                          : `No operations found for ${currentMonthLabel}`}
                      </td>
                    </tr>
                  ) : (
                    operationsData.map((op: DailyOperationItem) => (
                      <tr key={op.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {op.day}/{op.month}/{op.year}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{op.driverName}</span>
                          {op.driverCode && <span className="text-[10px] text-slate-400">#{op.driverCode}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {op.companyName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-800 block">{op.routeName}</span>
                          <span className="text-[10px] text-slate-500">{op.branch || '-'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{op.vehicleType || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">{Number(op.tripCount)}</td>
                        <td className="py-2.5 px-3 text-left font-semibold text-slate-700">
                          {Number(op.dailyRate).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-semibold text-slate-700">
                          {Number(op.driverDailyRate).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-bold text-purple-700">
                          {Number(op.vehicleCost || 0) > 0 ? Number(op.vehicleCost).toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-left text-rose-600 font-medium">
                          {Number(op.withholdingTax).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-bold text-slate-900">
                          {Number(op.totalAmount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-bold text-amber-600">
                          {Number(op.netDriverPay).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-bold text-emerald-600">
                          {Number(op.dailyProfit).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-black text-blue-700">
                          {Number(op.netRevenue).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(isAr ? 'حذف هذه الحركة؟' : 'Delete operation?')) {
                                deleteOpMutation.mutate(op.id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DRIVER OVERTIME & SHIFTS */}
      {activeTab === 'overtime' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute rtl:right-3 ltr:left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالسائق، الفرع، وصف الدورة...' : 'Search driver, branch, shift...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="rtl:pr-9 ltr:pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                {selectedMonth ? `شهر ${selectedMonth}` : 'جميع الشهور'}
              </span>
            </div>

            <button
              onClick={() => setShowOvertimeModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إضافة سهرة أو إضافي جديد' : 'Add Overtime / Shift'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">اليوم والتاريخ</th>
                    <th className="py-3 px-4">اسم السائق</th>
                    <th className="py-3 px-4">نوع السيارة</th>
                    <th className="py-3 px-4">اسم الخط</th>
                    <th className="py-3 px-4">الفرع</th>
                    <th className="py-3 px-4">وصف الدورة</th>
                    <th className="py-3 px-4 text-center">عدد الدورات</th>
                    <th className="py-3 px-4 text-left">قيمة الإضافي</th>
                    <th className="py-3 px-4">ملاحظات</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {otLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'جاري تحميل سجل الإضافي...' : 'Loading overtimes...'}
                      </td>
                    </tr>
                  ) : !overtimeData || overtimeData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        {isAr
                          ? `لا يوجد إضافي مسجل في ${currentMonthLabel}`
                          : `No overtime recorded for ${currentMonthLabel}`}
                      </td>
                    </tr>
                  ) : (
                    overtimeData.map((ot: DriverOvertimeItem) => (
                      <tr key={ot.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-700">
                          {ot.dayOfWeek} {new Date(ot.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{ot.driverName}</td>
                        <td className="py-2.5 px-4 text-slate-600">{ot.vehicleType || '-'}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{ot.routeName}</td>
                        <td className="py-2.5 px-4 text-slate-500">{ot.branch || '-'}</td>
                        <td className="py-2.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {ot.shiftDescription || 'إضافي'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-900">{Number(ot.shiftsCount)}</td>
                        <td className="py-2.5 px-4 text-left font-black text-emerald-600">
                          {Number(ot.shiftRate).toLocaleString()} ج.م
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{ot.notes || '-'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(isAr ? 'حذف هذا السجل؟' : 'Delete overtime record?')) {
                                deleteOvertimeMutation.mutate(ot.id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DRIVER SETTLEMENTS */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          {/* Top Filter & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Driver */}
              <div className="relative">
                <Search className="h-4 w-4 absolute rtl:right-3 ltr:left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث باسم السائق أو الشركة...' : 'Search driver or company...'}
                  value={settlementSearch}
                  onChange={(e) => setSettlementSearch(e.target.value)}
                  className="rtl:pr-9 ltr:pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-56"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'حالة الصرف:' : 'Status:'}</span>
                <select
                  value={settlementStatusFilter}
                  onChange={(e) => setSettlementStatusFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-blue-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">{isAr ? 'كافة الحالات (الكل)' : 'All Statuses'}</option>
                  <option value="PENDING">{isAr ? '⏳ معلق (لم يصرف)' : 'Pending'}</option>
                  <option value="PAID">{isAr ? '✅ تم الصرف' : 'Paid'}</option>
                </select>
              </div>

              {/* Company Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'الشركة:' : 'Company:'}</span>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="bg-transparent font-bold text-blue-700 focus:outline-hidden cursor-pointer max-w-[150px] truncate"
                >
                  <option value="">{isAr ? 'جميع الشركات' : 'All Companies'}</option>
                  {dbClients?.map((c: any) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                {currentMonthLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const defaultAcc = treasuryData?.accounts?.find((a: any) => a.kind === 'CASH') || treasuryData?.accounts?.[0];
                  setDriverPayForm({
                    driverName: '',
                    month: selectedMonth || currentActualMonth,
                    year: selectedYear || currentActualYear,
                    amount: 0,
                    accountId: defaultAcc?.id || '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    reference: '',
                    notes: '',
                    maxPayable: 0,
                  });
                  setShowDriverPayModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Wallet className="h-4 w-4" />
                <span>{isAr ? 'صرف مستحقات سائق' : 'Pay Driver'}</span>
              </button>

              <button
                onClick={handleDownloadSettlements}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isAr ? 'تصدير إكسل' : 'Export Excel'}</span>
              </button>
            </div>
          </div>

          {/* Settlements Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">السائق</th>
                    <th className="py-3 px-4">الشركة والموقع</th>
                    <th className="py-3 px-4">الفرع</th>
                    <th className="py-3 px-4 text-center">إجمالي الدورات</th>
                    <th className="py-3 px-4 text-left">الأجر الأساسي</th>
                    <th className="py-3 px-4 text-left">إضافي (+)</th>
                    <th className="py-3 px-4 text-left">خصومات (-)</th>
                    <th className="py-3 px-4 text-left">سلف (-)</th>
                    <th className="py-3 px-4 text-left bg-amber-50/50">الصافي المستحق</th>
                    <th className="py-3 px-4 text-center">حالة الصرف</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {setLoading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'جاري حساب كشوف المستحقات...' : 'Calculating settlements...'}
                      </td>
                    </tr>
                  ) : !settlementsData || settlementsData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? `لا توجد مستحقات مسجلة في ${currentMonthLabel}` : 'No settlements found'}
                      </td>
                    </tr>
                  ) : (
                    settlementsData
                      .filter((st: DriverSettlementItem) => {
                        if (settlementSearch) {
                          const q = settlementSearch.toLowerCase();
                          if (
                            !st.driverName.toLowerCase().includes(q) &&
                            !(st.companyName || '').toLowerCase().includes(q) &&
                            !(st.branch || '').toLowerCase().includes(q)
                          ) {
                            return false;
                          }
                        }
                        if (settlementStatusFilter !== 'ALL') {
                          const isPaid = st.status === 'PAID';
                          if (settlementStatusFilter === 'PAID' && !isPaid) return false;
                          if (settlementStatusFilter === 'PENDING' && isPaid) return false;
                        }
                        return true;
                      })
                      .map((st: DriverSettlementItem, idx: number) => {
                        const isPaid = st.status === 'PAID';
                        return (
                          <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{st.driverName}</span>
                                {st.driverCode && (
                                  <span className="text-[10px] text-slate-400 font-mono">#{st.driverCode}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-blue-700">{st.companyName}</td>
                            <td className="py-2.5 px-4 text-slate-500">{st.branch}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-slate-800">{st.totalTrips}</td>
                            <td className="py-2.5 px-4 text-left font-semibold text-slate-700">
                              {Number(st.totalBasePay || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-left font-bold text-emerald-600">
                              {Number(st.totalOvertime || 0) > 0 ? `+${Number(st.totalOvertime).toLocaleString()}` : '0'}
                            </td>
                            <td className="py-2.5 px-4 text-left font-medium text-rose-600">
                              {Number(st.totalDeductions || 0) > 0 ? `-${Number(st.totalDeductions).toLocaleString()}` : '0'}
                            </td>
                            <td className="py-2.5 px-4 text-left font-medium text-amber-600">
                              {Number(st.totalAdvances || 0) > 0 ? `-${Number(st.totalAdvances).toLocaleString()}` : '0'}
                            </td>
                            <td className="py-2.5 px-4 text-left font-black text-amber-700 bg-amber-50/50">
                              {Number(st.netPayable || 0).toLocaleString()} ج.م
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>تم الصرف</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="h-3 w-3" />
                                  <span>معلق</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {isPaid ? (
                                <span className="text-[11px] text-slate-400 font-medium">مسدد بالكامل</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    const defaultAcc =
                                      treasuryData?.accounts?.find((a: any) => a.kind === 'CASH') ||
                                      treasuryData?.accounts?.[0];
                                    setDriverPayForm({
                                      driverName: st.driverName,
                                      month: selectedMonth || currentActualMonth,
                                      year: selectedYear || currentActualYear,
                                      amount: Number(st.netPayable || 0),
                                      accountId: defaultAcc?.id || '',
                                      paymentDate: new Date().toISOString().split('T')[0],
                                      reference: `صرف راتب شهر ${selectedMonth || currentActualMonth}/${selectedYear || currentActualYear} للسائق ${st.driverName}`,
                                      notes: '',
                                      maxPayable: Number(st.netPayable || 0),
                                    });
                                    setShowDriverPayModal(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors"
                                >
                                  <Wallet className="h-3 w-3" />
                                  <span>صرف الراتب</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: STAFF PAYROLL (رواتب الموظفين والإداريين) */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {/* KPI Summary Cards */}
          {(() => {
            const payrolls = (payrollData as StaffPayrollItem[]) || [];
            const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
            const totalBasic = payrolls.reduce((sum, p) => sum + Number(p.basicSalary || 0), 0);
            const totalOT = payrolls.reduce((sum, p) => sum + Number(p.overtime || 0), 0);
            const totalDeduct = payrolls.reduce(
              (sum, p) => sum + Number(p.deductions || 0) + Number(p.advances || 0) + Number(p.penalties || 0),
              0
            );

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 block">إجمالي الرواتب المنصرفة</span>
                  <span className="text-xl font-black text-indigo-700 mt-1 block">
                    {totalNet.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{payrolls.length} مسير راتب مسجل</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 block">إجمالي الأجر الأساسي</span>
                  <span className="text-xl font-black text-slate-900 mt-1 block">
                    {totalBasic.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">الرواتب الأساسية التعاقدية</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 block">إجمالي الإضافي والبدلات (+)</span>
                  <span className="text-xl font-black text-emerald-600 mt-1 block">
                    {totalOT.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">حوافز ومكافآت</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                  <span className="text-[11px] font-bold text-slate-500 block">الخصومات والسلف والجزاءات (-)</span>
                  <span className="text-xl font-black text-rose-600 mt-1 block">
                    {totalDeduct.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                  </span>
                  <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">إجمالي الاستقطاعات</span>
                </div>
              </div>
            );
          })()}

          {/* Top Filter & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Employee */}
              <div className="relative">
                <Search className="h-4 w-4 absolute rtl:right-3 ltr:left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث باسم الموظف أو الوظيفة...' : 'Search employee or job...'}
                  value={payrollSearch}
                  onChange={(e) => setPayrollSearch(e.target.value)}
                  className="rtl:pr-9 ltr:pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              {/* Job Title Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
                <span>{isAr ? 'الوظيفة / القسم:' : 'Job Title:'}</span>
                <select
                  value={payrollJobFilter}
                  onChange={(e) => setPayrollJobFilter(e.target.value)}
                  className="bg-transparent font-bold text-blue-700 focus:outline-hidden cursor-pointer max-w-[150px] truncate"
                >
                  <option value="">{isAr ? 'جميع الوظائف' : 'All Roles'}</option>
                  <option value="محاسب">محاسب</option>
                  <option value="مدير تشغيل">مدير تشغيل</option>
                  <option value="مشرف حركة">مشرف حركة</option>
                  <option value="موارد بشرية">موارد بشرية</option>
                  <option value="أمن وحراسة">أمن وحراسة</option>
                  <option value="خدمات معاونة">خدمات معاونة</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowPayrollModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'تسجيل وصرف راتب موظف جديد' : 'Add Staff Payroll'}</span>
            </button>
          </div>

          {/* Payroll Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">تاريخ الصرف</th>
                    <th className="py-3 px-4">اسم الموظف</th>
                    <th className="py-3 px-4">المسمى الوظيفي</th>
                    <th className="py-3 px-4 text-left">الأساسي</th>
                    <th className="py-3 px-4 text-left text-emerald-600">إضافي (+)</th>
                    <th className="py-3 px-4 text-left text-rose-600">خصومات (-)</th>
                    <th className="py-3 px-4 text-left text-amber-600">سلف (-)</th>
                    <th className="py-3 px-4 text-left text-rose-700">جزاءات (-)</th>
                    <th className="py-3 px-4 text-left font-black bg-indigo-50/50">صافي الراتب</th>
                    <th className="py-3 px-4">ملاحظات</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollLoading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'جاري تحميل سجل رواتب الموظفين...' : 'Loading payroll records...'}
                      </td>
                    </tr>
                  ) : !payrollData || (payrollData as StaffPayrollItem[]).length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'لا توجد مسيرات رواتب مسجلة حتى الآن' : 'No payroll records found'}
                      </td>
                    </tr>
                  ) : (
                    (payrollData as StaffPayrollItem[])
                      .filter((p: StaffPayrollItem) => {
                        if (payrollSearch) {
                          const q = payrollSearch.toLowerCase();
                          if (!p.employeeName.toLowerCase().includes(q) && !p.jobTitle.toLowerCase().includes(q)) {
                            return false;
                          }
                        }
                        if (payrollJobFilter && !p.jobTitle.includes(payrollJobFilter)) {
                          return false;
                        }
                        return true;
                      })
                      .map((p: StaffPayrollItem) => (
                        <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-700">
                            {new Date(p.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">{p.employeeName}</td>
                          <td className="py-2.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {p.jobTitle}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-left font-semibold text-slate-700">
                            {Number(p.basicSalary || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-left font-bold text-emerald-600">
                            {Number(p.overtime || 0) > 0 ? `+${Number(p.overtime).toLocaleString()}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-left font-medium text-rose-600">
                            {Number(p.deductions || 0) > 0 ? `-${Number(p.deductions).toLocaleString()}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-left font-medium text-amber-600">
                            {Number(p.advances || 0) > 0 ? `-${Number(p.advances).toLocaleString()}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-left font-medium text-rose-700">
                            {Number(p.penalties || 0) > 0 ? `-${Number(p.penalties).toLocaleString()}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-left font-black text-indigo-700 bg-indigo-50/50">
                            {Number(p.netSalary || 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{p.notes || '-'}</td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    isAr
                                      ? `هل أنت متأكد من حذف مسير راتب (${p.employeeName})؟ سيتم إلغاء الحركة وإرجاع المبلغ للخزينة تلقائياً.`
                                      : `Delete payroll for ${p.employeeName}?`
                                  )
                                ) {
                                  deletePayrollMutation.mutate(p.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                              title={isAr ? 'حذف مسير الراتب' : 'Delete'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-slate-700">
                {isAr ? `إجمالي المصروفات المنصرفة (${currentMonthLabel}):` : `Expenses for ${currentMonthLabel}:`}{' '}
                <span className="text-rose-600 font-black text-base">
                  {(expSummary?.totalExpenses || 0).toLocaleString()} ج.م
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'تسجيل بند مصروف جديد' : 'Add Expense'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">البيان / البند</th>
                    <th className="py-3 px-4 text-left">المبلغ المنصروف</th>
                    <th className="py-3 px-4">الفرع / الخط</th>
                    <th className="py-3 px-4">رقم السيارة</th>
                    <th className="py-3 px-4">ملاحظات</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'جاري تحميل المصروفات...' : 'Loading expenses...'}
                      </td>
                    </tr>
                  ) : !expensesData || expensesData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? `لا توجد مصروفات مسجلة في ${currentMonthLabel}` : 'No expenses found'}
                      </td>
                    </tr>
                  ) : (
                    expensesData.map((exp: ExpenseItem) => (
                      <tr key={exp.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-700">
                          {new Date(exp.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{exp.category}</td>
                        <td className="py-2.5 px-4 text-left font-black text-rose-600">
                          {Number(exp.amount).toLocaleString()} ج.م
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{exp.branch || '-'}</td>
                        <td className="py-2.5 px-4 text-slate-600">{exp.vehicleNumber || '-'}</td>
                        <td className="py-2.5 px-4 text-slate-500">{exp.notes || '-'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(isAr ? 'حذف هذا المصروف؟' : 'Delete expense?')) {
                                deleteExpenseMutation.mutate(exp.id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CLIENT LEDGERS & INVOICES (كشوف حساب وفواتير وتحصيل العملاء) */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {/* Client Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {clientsSummary && clientsSummary.length > 0 ? (
              clientsSummary.map((c: any) => {
                const balanceVal = Number(c.balance ?? c.currentBalance ?? 0);
                const isSelected = selectedCompany === c.companyName;

                return (
                  <div
                    key={c.companyName}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedCompany(isSelected ? '' : c.companyName)}
                          className="text-xs font-black text-slate-900 text-right truncate hover:text-blue-600 block flex-1"
                        >
                          {c.companyName}
                        </button>
                        {balanceVal > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                            مستحق
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            مسدد بالكامل
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>إجمالي الفواتير والمطالبات:</span>
                          <span className="font-bold text-slate-800">
                            {Number(c.totalDebit || 0).toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>المسدد والمحصل بالخزينة:</span>
                          <span className="font-bold text-emerald-600">
                            {Number(c.totalCredit || 0).toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold">
                          <span>الرصيد المستحق:</span>
                          <span className={balanceVal > 0 ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}>
                            {balanceVal.toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                      {balanceVal > 0 ? (
                        <button
                          onClick={() => {
                            const defaultAcc =
                              treasuryData?.accounts?.find((a: any) => a.kind === 'BANK') ||
                              treasuryData?.accounts?.[0];
                            setClientReceiptForm({
                              companyName: c.companyName,
                              amount: balanceVal,
                              accountId: defaultAcc?.id || '',
                              date: new Date().toISOString().split('T')[0],
                              reference: `تحصيل مستحقات فواتير شركة ${c.companyName}`,
                              notes: '',
                              maxDueBalance: balanceVal,
                            });
                            setShowClientReceiptModal(true);
                          }}
                          className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 shadow-xs transition-colors"
                        >
                          <Wallet className="h-3 w-3" />
                          <span>تحصيل وسداد</span>
                        </button>
                      ) : (
                        <div className="py-1.5 px-2 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1 select-none">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>مسدد بالكامل</span>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setClientInvoiceState({
                            companyName: c.companyName,
                            month: selectedMonth || currentActualMonth,
                            year: selectedYear || currentActualYear,
                            invoiceNumber: `INV-${selectedYear || currentActualYear}-${String(selectedMonth || currentActualMonth).padStart(2, '0')}-${c.companyName.replace(/\s+/g, '-').slice(0, 10)}`,
                            invoiceDate: new Date().toISOString().split('T')[0],
                            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            notes: `فاتورة مطالبة تشغيل رحلات ونقل عاملين عن شهر ${selectedMonth || currentActualMonth}/${selectedYear || currentActualYear}`,
                          });
                          setShowClientInvoiceModal(true);
                        }}
                        className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center gap-1 transition-colors"
                      >
                        <FileText className="h-3 w-3" />
                        <span>فاتورة الشهر</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-6 text-center text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200">
                {isAr ? 'لا توجد كشوف حسابات عملاء مسجلة حالياً' : 'No client ledgers found'}
              </div>
            )}
          </div>

          {/* Action & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute rtl:right-3 ltr:left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالشركة، رقم الفاتورة أو البيان...' : 'Search company, invoice or notes...'}
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="rtl:pr-9 ltr:pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              {/* Dedicated Company Filter Dropdown */}
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="">{isAr ? '🏢 جميع الشركات والعملاء (عرض شامل)' : '🏢 All Companies (All Invoices)'}</option>
                {clientsSummary?.map((c: any) => {
                  const bal = Number(c.balance ?? c.currentBalance ?? 0);
                  return (
                    <option key={c.companyName} value={c.companyName}>
                      {c.companyName} {bal > 0 ? `(مستحق: ${bal.toLocaleString()} ج.م)` : '(خالص)'}
                    </option>
                  );
                })}
              </select>

              {selectedCompany && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-xs font-bold border border-blue-200">
                  <span>تم الفلترة على: {selectedCompany}</span>
                  <button onClick={() => setSelectedCompany('')} className="text-blue-500 hover:text-blue-800 mr-1 font-bold">
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const defaultAcc =
                    treasuryData?.accounts?.find((a: any) => a.kind === 'BANK') || treasuryData?.accounts?.[0];
                  const found = clientsSummary?.find((c: any) => c.companyName === selectedCompany);
                  const due = Number(found?.balance ?? 0);
                  setClientReceiptForm({
                    companyName: selectedCompany || '',
                    amount: due > 0 ? due : 0,
                    accountId: defaultAcc?.id || '',
                    date: new Date().toISOString().split('T')[0],
                    reference: selectedCompany ? `تحصيل مستحقات فواتير شركة ${selectedCompany}` : 'تحصيل من عميل',
                    notes: '',
                    maxDueBalance: due,
                  });
                  setShowClientReceiptModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Wallet className="h-4 w-4" />
                <span>{isAr ? 'تحصيل وسداد في الخزينة/البنك' : 'Record Client Receipt'}</span>
              </button>

              <button
                onClick={() => {
                  const comp = selectedCompany || clientsSummary?.[0]?.companyName || '';
                  setClientInvoiceState({
                    companyName: comp,
                    month: selectedMonth || currentActualMonth,
                    year: selectedYear || currentActualYear,
                    invoiceNumber: `INV-${selectedYear || currentActualYear}-${String(selectedMonth || currentActualMonth).padStart(2, '0')}-${(comp || 'CLIENT').replace(/\s+/g, '-').slice(0, 10)}`,
                    invoiceDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    notes: `فاتورة مطالبة تشغيل رحلات ونقل عاملين عن شهر ${selectedMonth || currentActualMonth}/${selectedYear || currentActualYear}`,
                  });
                  setShowClientInvoiceModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>{isAr ? 'إصدار ومعاينة فاتورة رحلات العميل' : 'Generate Trip Invoice'}</span>
              </button>

              <button
                onClick={() => {
                  setManualDebitForm({
                    companyName: selectedCompany || '',
                    date: new Date().toISOString().split('T')[0],
                    documentNumber: '',
                    description: 'مطالبة / فاتورة تشغيل إضافية',
                    debit: 0,
                    notes: '',
                  });
                  setShowManualDebitModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إضافة مطالبة يدوية' : 'Add Manual Invoice'}</span>
              </button>
            </div>
          </div>

          {/* Transactions Statement Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">الشركة / العميل</th>
                    <th className="py-3 px-4">رقم الفاتورة / المستند</th>
                    <th className="py-3 px-4">البيان ونوع الحركة</th>
                    <th className="py-3 px-4 text-left text-blue-600">مدين (فواتير ومطالبات)</th>
                    <th className="py-3 px-4 text-left text-emerald-600">دائن (سدادات وتحصيل بالخزينة)</th>
                    <th className="py-3 px-4 text-left font-black">الرصيد المستحق</th>
                    <th className="py-3 px-4 text-center">نوع السند</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'جاري تحميل كشف الحساب...' : 'Loading ledger...'}
                      </td>
                    </tr>
                  ) : !clientLedgerData || clientLedgerData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'لا توجد حركات مسجلة' : 'No transactions recorded'}
                      </td>
                    </tr>
                  ) : (
                    clientLedgerData
                      .filter((tx: ClientTransactionItem) => {
                        if (clientSearch) {
                          const q = clientSearch.toLowerCase();
                          if (
                            !tx.companyName.toLowerCase().includes(q) &&
                            !(tx.description || '').toLowerCase().includes(q) &&
                            !(tx.documentNumber || '').toLowerCase().includes(q)
                          ) {
                            return false;
                          }
                        }
                        return true;
                      })
                      .map((tx: ClientTransactionItem) => {
                        const isDebit = Number(tx.debit || 0) > 0;
                        const isTreasury = tx.notes && tx.notes.includes('TreasuryEntry#');

                        return (
                          <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-slate-700">
                              {new Date(tx.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-900">{tx.companyName}</td>
                            <td className="py-2.5 px-4 text-slate-600 font-mono">{tx.documentNumber || '-'}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-800">{tx.description}</td>
                            <td className="py-2.5 px-4 text-left font-bold text-blue-600">
                              {isDebit ? Number(tx.debit).toLocaleString() : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-left font-bold text-emerald-600">
                              {!isDebit ? Number(tx.credit).toLocaleString() : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-left font-black text-slate-900">
                              {Number(tx.balance || 0).toLocaleString()} ج.م
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {isDebit ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <span>📄 فاتورة تشغيل</span>
                                </span>
                              ) : isTreasury ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span>💵 تحصيل بالخزينة</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  <span>سند سداد</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SUPPLIER & PARTNER LEDGERS [NEW] */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Supplier Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {suppliersSummary && suppliersSummary.length > 0 ? (
              suppliersSummary.map((s: any) => {
                const balanceVal = Number(s.balance ?? 0);
                return (
                  <div
                    key={s.supplierName}
                    onClick={() => setSelectedSupplier(s.supplierName === selectedSupplier ? '' : s.supplierName)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedSupplier === s.supplierName
                        ? 'bg-purple-50 border-purple-400 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 block truncate">{s.supplierName}</span>
                    <div className="mt-2 space-y-0.5 text-[11px]">
                      <div className="flex justify-between text-slate-500">
                        <span>{isAr ? 'فواتير له:' : 'Payable:'}</span>
                        <span className="font-semibold text-purple-800">{Number(s.totalCredit || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>{isAr ? 'مسدد له:' : 'Paid:'}</span>
                        <span className="font-semibold text-emerald-600">{Number(s.totalDebit || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-1 font-bold">
                        <span>{isAr ? 'المتبقي له:' : 'Balance:'}</span>
                        <span className={balanceVal > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          {balanceVal.toLocaleString()} ج.م
                        </span>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSupplierInvoiceState({
                              supplierName: s.supplierName,
                              month: selectedMonth || currentActualMonth,
                              year: selectedYear || currentActualYear,
                              invoiceNumber: `SUP-INV-${selectedYear || currentActualYear}-${String(selectedMonth || currentActualMonth).padStart(2, '0')}-${s.supplierName.replace(/\s+/g, '-').slice(0, 10)}`,
                              invoiceDate: new Date().toISOString().split('T')[0],
                              dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                              notes: '',
                            });
                            setShowSupplierInvoiceModal(true);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                          <Printer className="h-3 w-3" />
                          <span>{isAr ? '📄 فاتورة ومطالبة' : 'Invoice'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-6 text-center text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200">
                {isAr ? 'لا توجد كشوف حسابات موردين حالياً' : 'No supplier ledgers found'}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isAr
                  ? `كشف حساب المورد: ${selectedSupplier || 'جميع الموردين والشركاء'}`
                  : `Supplier Ledger: ${selectedSupplier || 'All Suppliers'}`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'متابعة استحقاقات إيجار سيارات الموردين، السدادات النقدية والبنكية، والرصيد المتبقي'
                  : 'Track supplier payables, disbursements, and outstanding balances'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const targetSup = selectedSupplier || suppliersSummary?.[0]?.supplierName || '';
                  setSupplierInvoiceState({
                    supplierName: targetSup,
                    month: selectedMonth || currentActualMonth,
                    year: selectedYear || currentActualYear,
                    invoiceNumber: `SUP-INV-${selectedYear || currentActualYear}-${String(selectedMonth || currentActualMonth).padStart(2, '0')}-${(targetSup || 'SUP').replace(/\s+/g, '-').slice(0, 10)}`,
                    invoiceDate: new Date().toISOString().split('T')[0],
                    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    notes: '',
                  });
                  setShowSupplierInvoiceModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>{isAr ? '🖨️ فاتورة ومطالبة المورد' : 'Supplier Invoice'}</span>
              </button>
              <button
                onClick={() => setShowSupplierTxModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إضافة قيد / فاتورة مورد' : 'Add Supplier Bill'}</span>
              </button>
              <button
                onClick={() => setShowSupplierPayModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Wallet className="h-4 w-4" />
                <span>{isAr ? 'صرف دفعة للمورد من الخزينة' : 'Pay Supplier'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">المورد / الشريك</th>
                    <th className="py-3 px-4">رقم المستند / السند</th>
                    <th className="py-3 px-4">البيان</th>
                    <th className="py-3 px-4 text-left text-purple-700">دائن (فواتير مستحقة له)</th>
                    <th className="py-3 px-4 text-left text-emerald-600">مدين (سدادات ودفعات مصروفة)</th>
                    <th className="py-3 px-4 text-left font-black">الرصيد المتبقي له</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supLedgerLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'جاري تحميل كشف حساب المورد...' : 'Loading supplier ledger...'}
                      </td>
                    </tr>
                  ) : !supplierLedgerData || supplierLedgerData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'لا توجد حركات مسجلة لهذا المورد' : 'No transactions recorded'}
                      </td>
                    </tr>
                  ) : (
                    supplierLedgerData.map((tx: SupplierTransactionItem) => (
                      <tr key={tx.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-700">
                          {new Date(tx.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{tx.supplierName}</td>
                        <td className="py-2.5 px-4 text-slate-600">{tx.documentNumber || '-'}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{tx.description}</td>
                        <td className="py-2.5 px-4 text-left font-bold text-purple-700">
                          {Number(tx.credit || 0) > 0 ? Number(tx.credit).toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-left font-bold text-emerald-600">
                          {Number(tx.debit || 0) > 0 ? Number(tx.debit).toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-left font-black text-slate-900">
                          {Number(tx.balance || 0).toLocaleString()} ج.م
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: INSTALLMENTS & FLEET ASSET ECONOMICS (أقساط وعوائد المركبات ومراكز التكلفة) */}
      {activeTab === 'installments' && (
        <div className="space-y-6">
          {/* Top Control Bar & Vehicle Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                  🚗
                </span>
                <div>
                  <span className="text-sm font-black text-slate-900 block">
                    {isAr ? 'أقساط وعوائد سيارات الشركة ومراكز التكلفة' : 'Vehicle Economics & Bank Installments'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isAr
                      ? 'متابعة أرباح ومصاريف وأقساط كل سيارة على حدة وعوائد الأسطول'
                      : 'Track unit economics, profits, expenses and bank installments per vehicle'}
                  </span>
                </div>
              </div>

              {/* Dynamic Vehicle Selector Dropdown */}
              <div className="relative">
                <select
                  value={selectedVehiclePlate}
                  onChange={(e) => {
                    setSelectedVehiclePlate(e.target.value);
                  }}
                  className="py-1.5 px-3 text-xs font-bold bg-purple-50/70 border border-purple-200 text-purple-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 max-w-xs"
                >
                  <option value="">{isAr ? '🚗 جميع مركبات الأسطول' : '🚗 All Fleet Vehicles'}</option>
                  {dbVehicles?.map((v: any) => (
                    <option key={v.id || v.plateNumber} value={v.plateNumber}>
                      {v.plateNumber} - {v.make} {v.model} {v.assignedDriver ? `(${v.assignedDriver.fullName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instant Search Input */}
              <div className="relative">
                <Search className="h-4 w-4 absolute rtl:right-3 ltr:left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث باللوحة، الموديل، السائق، البنك...' : 'Search plate, model, driver, bank...'}
                  value={vehicleSearch}
                  onChange={(e) => {
                    setVehicleSearch(e.target.value);
                  }}
                  className="rtl:pr-9 ltr:pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 w-56"
                />
              </div>

              {selectedVehiclePlate && (
                <button
                  onClick={() => setSelectedVehiclePlate('')}
                  className="text-[11px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>✕</span>
                  <span>{isAr ? 'إلغاء فلترة السيارة' : 'Clear Vehicle Filter'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                {selectedMonth ? `شهر ${selectedMonth} / ${selectedYear}` : `إجمالي سنة ${selectedYear}`}
              </span>

              <button
                onClick={() => setShowInstallmentModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إضافة قسط جديد' : 'Add New Installment'}</span>
              </button>
            </div>
          </div>

          {/* 🌟 SELECTED VEHICLE DEEP-DIVE KPI & PERFORMANCE DASHBOARD */}
          {selectedVehiclePlate && (() => {
            const currentV = vehicleEconData?.items?.find((x: any) => x.plateNumber === selectedVehiclePlate);
            if (!currentV) return null;

            return (
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-5 rounded-3xl shadow-xl border border-purple-500/30 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center font-black text-lg">
                      🚐
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-lg text-white bg-slate-800/80 px-2.5 py-0.5 rounded-xl border border-slate-600">
                          {currentV.plateNumber}
                        </span>
                        <h3 className="text-base font-black text-purple-200">
                          {currentV.modelName}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {currentV.supplier || (currentV.isCompanyVehicle ? 'أسطول الشركة' : 'مورد خارجي')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-3">
                        <span>👤 السائق المخصص: <strong>{currentV.driverName || 'بدون سائق ثابت'}</strong></span>
                        {currentV.driverPhone && <span>📞 {currentV.driverPhone}</span>}
                        <span>🏷️ نوع المركبة: {currentV.vehicleType || '-'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedVehiclePlate('')}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors"
                    >
                      {isAr ? 'عرض كل الأسطول ✕' : 'View All Fleet ✕'}
                    </button>
                  </div>
                </div>

                {/* 6 Key Metrics for this Vehicle */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/70">
                    <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'الرحلات المنفذة' : 'Completed Trips'}</span>
                    <span className="text-lg font-black text-white mt-0.5 block">{currentV.totalTrips || 0}</span>
                    <span className="text-[10px] text-slate-400">{isAr ? 'خلال الفترة المحددة' : 'In selected period'}</span>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/70">
                    <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'إيرادات الرحلات (المطالبات)' : 'Gross Revenue'}</span>
                    <span className="text-lg font-black text-blue-300 mt-0.5 block">
                      {Number(currentV.grossRevenue || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                    <span className="text-[10px] text-blue-400 font-medium">{isAr ? 'فواتير العملاء' : 'From client billing'}</span>
                  </div>

                  <div className="bg-purple-900/40 p-3 rounded-2xl border border-purple-500/40">
                    <span className="text-[10px] font-bold text-purple-300 block">{isAr ? 'عوائد إيجار الأسطول' : 'Allocated Rental'}</span>
                    <span className="text-lg font-black text-purple-200 mt-0.5 block">
                      {Number(currentV.totalVehicleCostAllocated || currentV.vehicleDirectCost || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                    <span className="text-[10px] text-purple-300/80">{isAr ? 'عوائد الرحلات لتغطية القسط' : 'For installment coverage'}</span>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/70">
                    <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'صيانة ومصروفات' : 'Maintenance & Fuel'}</span>
                    <span className="text-lg font-black text-rose-300 mt-0.5 block">
                      {Number(currentV.totalExpenses || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                    <span className="text-[10px] text-rose-400 font-medium">
                      {isAr ? `صيانة: ${Number(currentV.maintenanceCosts || 0).toLocaleString()} ج.م` : ''}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/70">
                    <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'أقساط البنك (مسدد/متبقي)' : 'Bank Installments'}</span>
                    <span className="text-lg font-black text-amber-300 mt-0.5 block">
                      {Number(currentV.totalInstallmentsPaid || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium">
                      {isAr ? `متبقي: ${Number(currentV.totalInstallmentsPending || 0).toLocaleString()} ج.م` : ''}
                    </span>
                  </div>

                  <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-500/40">
                    <span className="text-[10px] font-bold text-emerald-300 block">{isAr ? 'صافي الفائض والأرباح' : 'Net Cash Flow / ROI'}</span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                      {Number(currentV.netCashFlow || currentV.netROI || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                    <span className="text-[10px] text-emerald-300 font-bold">
                      {isAr ? `هامش الربحية: ${currentV.marginPercent || 0}%` : `Margin: ${currentV.marginPercent || 0}%`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Key Summary Cards Across Fleet */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                {isAr ? 'عوائد إيجار أسطول الشركة (من الرحلات)' : 'Fleet Rental Income from Trips'}
              </span>
              <span className="text-lg font-black text-purple-700 mt-1 block">
                {(vehicleEconData?.summary?.totalVehicleCostAllocated || vehicleEconData?.summary?.totalVehicleCosts || 0).toLocaleString()} ج.م
              </span>
              <span className="text-[11px] text-purple-600 font-bold block mt-0.5">
                {isAr ? `إجمالي رحلات الأسطول: ${vehicleEconData?.summary?.totalTrips || 0} رحلة` : ''}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                {isAr ? 'أقساط مسددة' : 'Paid Installments'}
              </span>
              <span className="text-lg font-black text-slate-900 mt-1 block">
                {(instSummary?.totalPaid || 0).toLocaleString()} ج.م
              </span>
              <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                {isAr ? `عدد الأقساط المسددة: ${instSummary?.paidCount || 0}` : ''}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                {isAr ? 'أقساط متبقية ومستحقة' : 'Pending Installments'}
              </span>
              <span className="text-lg font-black text-amber-600 mt-1 block">
                {(instSummary?.totalPending || 0).toLocaleString()} ج.م
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {isAr ? `قيد الانتظار: ${instSummary?.pendingCount || 0}` : ''}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                {isAr ? 'حالة سداد الأقساط' : 'Payment Status'}
              </span>
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  <Check className="h-3.5 w-3.5" />
                  {isAr ? `تم دفع: ${instSummary?.paidCount || 0}` : `Paid: ${instSummary?.paidCount || 0}`}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                  <Clock className="h-3.5 w-3.5" />
                  {isAr
                    ? `مستحق: ${instSummary?.pendingCount || 0}`
                    : `Pending: ${instSummary?.pendingCount || 0}`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Vehicle Fleet Economics */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? '📊 سجل أداء وإيجارات مركبات الشركة (سداد الأقساط من عوائد الرحلات)' : 'Vehicle Fleet Unit Economics'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isAr
                    ? 'اضغط على أي مركبة لاستعراض أرباحها ومصاريفها وأقساطها ومؤشراتها المالية بالكامل'
                    : 'Click any vehicle row to isolate its profits, costs, installments and KPIs'}
                </p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
                {isAr
                  ? `عدد المركبات: ${vehicleEconData?.items?.length || 0}`
                  : `Vehicles: ${vehicleEconData?.items?.length || 0}`}
              </span>
            </div>

            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">رقم اللوحة</th>
                    <th className="py-3 px-4">الموديل والبيان</th>
                    <th className="py-3 px-4">السائق المخصص</th>
                    <th className="py-3 px-4 text-center">الرحلات المنفذة</th>
                    <th className="py-3 px-4 text-left">إيجار الرحلات المحقق</th>
                    <th className="py-3 px-4 text-left">مصاريف وصيانة</th>
                    <th className="py-3 px-4 text-left">أقساط مسددة</th>
                    <th className="py-3 px-4 text-left">صافي الفائض / العجز</th>
                    <th className="py-3 px-4 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleEconLoading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        {isAr ? 'جاري تحميل عوائد الأسطول...' : 'Loading fleet economics...'}
                      </td>
                    </tr>
                  ) : !vehicleEconData?.items?.length ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        {isAr ? 'لا توجد بيانات تشغيل لأسطول الشركة في هذه الفترة' : 'No vehicle operations recorded'}
                      </td>
                    </tr>
                  ) : (
                    vehicleEconData.items.map((v: any) => {
                      const isSelected = selectedVehiclePlate === v.plateNumber;
                      return (
                        <tr
                          key={v.plateNumber || v.vehicleId}
                          onClick={() => setSelectedVehiclePlate(isSelected ? '' : v.plateNumber)}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-100/70 font-bold border-l-4 border-purple-600'
                              : 'hover:bg-purple-50/30'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                            <span className="inline-flex items-center gap-1.5">
                              {isSelected && <span className="text-purple-600 font-black">●</span>}
                              {v.plateNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{v.modelName || v.model || v.vehicleType}</td>
                          <td className="py-2.5 px-4 text-slate-600">{v.driverName || v.assignedDriver || '-'}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-900">{v.totalTrips || 0}</td>
                          <td className="py-2.5 px-4 text-left font-black text-purple-700">
                            {Number(v.totalVehicleCostAllocated ?? v.vehicleDirectCost ?? 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-2.5 px-4 text-left font-semibold text-rose-600">
                            {Number(v.totalExpenses ?? (Number(v.maintenanceCosts || 0) + Number(v.otherExpenses || 0))).toLocaleString()} ج.م
                          </td>
                          <td className="py-2.5 px-4 text-left font-semibold text-amber-700">
                            {Number(v.totalInstallmentsPaid ?? v.totalInstallments ?? 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-2.5 px-4 text-left font-black">
                            <span className={(v.netCashFlow ?? v.netROI ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {Number(v.netCashFlow ?? v.netROI ?? 0).toLocaleString()} ج.م
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVehiclePlate(isSelected ? '' : v.plateNumber);
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                              }`}
                            >
                              {isSelected ? (isAr ? 'إلغاء التحديد' : 'Deselect') : (isAr ? '🔍 تحليل المركبة' : 'Analyze')}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Installments Schedule Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? '📑 جدول استحقاقات وسداد الأقساط البنكية' : 'Bank Installments Schedule'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedVehiclePlate
                    ? (isAr ? `عرض الأقساط الخاصة بالمركبة: ${selectedVehiclePlate}` : `Showing installments for: ${selectedVehiclePlate}`)
                    : (isAr ? 'عرض كافة الأقساط المسجلة لكافة الأصول' : 'Showing all installments')}
                </p>
              </div>

              {selectedVehiclePlate && (
                <span className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
                  {selectedVehiclePlate}
                </span>
              )}
            </div>
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">رقم القسط</th>
                    <th className="py-3 px-4">البيان والأصل</th>
                    <th className="py-3 px-4">لوحة المركبة</th>
                    <th className="py-3 px-4">البنك المسحوب عليه</th>
                    <th className="py-3 px-4">تاريخ استحقاق البنك</th>
                    <th className="py-3 px-4 text-left">قسط البنك</th>
                    <th className="py-3 px-4 text-left">قسط العميل</th>
                    <th className="py-3 px-4 text-left">الفرق والربح</th>
                    <th className="py-3 px-4 text-center">حالة السداد</th>
                    <th className="py-3 px-4 text-center">تغيير الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {instLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'جاري تحميل جدول الأقساط...' : 'Loading installments...'}
                      </td>
                    </tr>
                  ) : !installmentsData || installmentsData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                        {isAr ? 'لا توجد أقساط مسجلة' : 'No installments found'}
                      </td>
                    </tr>
                  ) : (
                    installmentsData.map((inst: InstallmentItem) => (
                      <tr key={inst.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-900">#{inst.installmentNumber}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{inst.assetName}</td>
                        <td className="py-2.5 px-4 font-mono text-purple-900 font-bold">{inst.vehiclePlate || '-'}</td>
                        <td className="py-2.5 px-4 text-slate-600">{inst.bankName || '-'}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-700">
                          {new Date(inst.bankDueDate).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </td>
                        <td className="py-2.5 px-4 text-left font-black text-rose-600">
                          {Number(inst.bankAmount).toLocaleString()} ج.م
                        </td>
                        <td className="py-2.5 px-4 text-left font-bold text-slate-900">
                          {inst.clientAmount ? `${Number(inst.clientAmount).toLocaleString()} ج.م` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-left font-bold text-emerald-600">
                          {inst.margin ? `${Number(inst.margin).toLocaleString()} ج.م` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              inst.status === 'PAID' || inst.status === 'تم الدفع'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {inst.status === 'PAID' || inst.status === 'تم الدفع'
                              ? isAr
                                ? 'تم السداد'
                                : 'Paid'
                              : isAr
                              ? 'مستحق'
                              : 'Pending'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() =>
                              toggleInstMutation.mutate({
                                id: inst.id,
                                status:
                                  inst.status === 'PAID' || inst.status === 'تم الدفع' ? 'PENDING' : 'PAID',
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            {inst.status === 'PAID' || inst.status === 'تم الدفع'
                              ? isAr
                                ? 'تعيين كمستحق'
                                : 'Set Pending'
                              : isAr
                              ? 'تأكيد السداد'
                              : 'Mark Paid'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TREASURY & BANK ACCOUNTS (الخزائن والحسابات البنكية) */}
      {activeTab === 'treasury' && (
        <div className="space-y-6">
          {/* Treasury Header with Actions */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  {isAr ? 'إدارة الخزائن والحسابات البنكية والسيولة' : 'Treasury, Vaults & Bank Management'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {treasuryData?.accounts?.length || 0} {isAr ? 'حسابات نشطة' : 'Active Accounts'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isAr
                  ? 'أنشئ خزن نقدية وحسابات بنكية، وحول بينها، وتابع كشوف الحركات الواردة والمنصرفة لحظياً'
                  : 'Manage cash vaults and bank accounts, execute internal transfers, and track statements'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowCreateAccountModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إضافة خزينة / بنك جديد' : 'New Vault / Bank'}</span>
              </button>

              <button
                onClick={() => setShowTransferModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-emerald-400" />
                <span>{isAr ? 'تحويل داخلي بين الحسابات' : 'Internal Transfer'}</span>
              </button>
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {treasuryData?.accounts?.map((acc: any) => {
              const isSelected = selectedAccountIdForStatement === acc.id;
              const isBank = acc.kind === 'BANK';

              return (
                <div
                  key={acc.id}
                  className={`bg-white p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-base ${
                            isBank
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isBank ? '🏦' : '💵'}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 leading-tight">{acc.name}</h3>
                          <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">
                            {isBank ? `بنك: ${acc.bankName || 'حساب بنكي'}` : 'خزينة نقدية (كاش)'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isBank
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isBank ? (isAr ? 'حساب بنكي' : 'Bank') : (isAr ? 'خزينة كاش' : 'Cash Vault')}
                      </span>
                    </div>

                    {acc.reference && (
                      <div className="mt-3 text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span>{isAr ? 'رقم الحساب / المرجع:' : 'Ref / IBAN:'}</span>
                        <span className="font-mono font-bold text-slate-700">{acc.reference}</span>
                      </div>
                    )}

                    {/* Balance */}
                    <div className="mt-4 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 block">{isAr ? 'الرصيد الفعلي الحالي:' : 'Current Balance:'}</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span
                          className={`text-2xl font-black ${
                            acc.currentBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
                          }`}
                        >
                          {Number(acc.currentBalance || 0).toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{acc.currency || 'ج.م'}</span>
                      </div>
                    </div>

                    {/* In vs Out */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
                        <span className="text-[10px] font-bold text-emerald-700 block">{isAr ? 'الوارد (+)' : 'Inflows (+)'}</span>
                        <span className="font-black text-emerald-800 text-xs">
                          {Number(acc.totalIn || 0).toLocaleString()} ج.م
                        </span>
                      </div>

                      <div className="bg-rose-50/60 p-2 rounded-xl border border-rose-100">
                        <span className="text-[10px] font-bold text-rose-700 block">{isAr ? 'المنصرف (-)' : 'Outflows (-)'}</span>
                        <span className="font-black text-rose-800 text-xs">
                          {Number(acc.totalOut || 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {acc.transactionCount || 0} {isAr ? 'حركة مسجلة' : 'entries'}
                    </span>

                    <button
                      onClick={() =>
                        setSelectedAccountIdForStatement(isSelected ? '' : acc.id)
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isSelected
                        ? isAr
                          ? 'إخفاء كشف الحساب 🔼'
                          : 'Hide Statement 🔼'
                        : isAr
                        ? 'كشف الحركات 📄'
                        : 'View Statement 📄'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Statement View for Selected Account */}
          {selectedAccountIdForStatement && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    📄
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {isAr ? 'كشف حركات الحساب:' : 'Account Statement:'}{' '}
                      <span className="text-blue-600">
                        {accountStatementData?.account?.name || 'الخزينة المحددة'}
                      </span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      {accountStatementData?.statement?.length || 0} {isAr ? 'حركة في السجل' : 'entries recorded'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 block">{isAr ? 'الرصيد الختامي:' : 'Final Balance:'}</span>
                  <span className="text-lg font-black text-blue-700">
                    {Number(accountStatementData?.finalBalance || 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {statementLoading ? (
                <div className="py-8 text-center text-slate-400 font-medium">
                  {isAr ? 'جاري تحميل كشف الحساب...' : 'Loading statement...'}
                </div>
              ) : !accountStatementData?.statement || accountStatementData.statement.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                  {isAr ? 'لا توجد حركات مسجلة لهذا الحساب بعد' : 'No transactions recorded yet'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className="py-3 px-4">{isAr ? 'نوع الحركة' : 'Type'}</th>
                        <th className="py-3 px-4">{isAr ? 'المبلغ' : 'Amount'}</th>
                        <th className="py-3 px-4">{isAr ? 'البيان / المرجع' : 'Reference'}</th>
                        <th className="py-3 px-4">{isAr ? 'ملاحظات' : 'Notes'}</th>
                        <th className="py-3 px-4 text-left">{isAr ? 'الرصيد التراكمي' : 'Running Balance'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {accountStatementData.statement.map((entry: any, idx: number) => {
                        const isIn = entry.kind === 'IN';
                        return (
                          <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">
                              {new Date(entry.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isIn
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {isIn ? '⬇️ وارد (إيداع/تحصيل)' : '⬆️ منصرف (سداد/صرف)'}
                              </span>
                            </td>
                            <td
                              className={`py-2.5 px-4 font-black ${
                                isIn ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isIn ? '+' : '-'}{Number(entry.amount).toLocaleString()} ج.م
                            </td>
                            <td className="py-2.5 px-4 text-slate-800 font-semibold">{entry.reference || '-'}</td>
                            <td className="py-2.5 px-4 text-slate-500 text-[11px]">{entry.notes || '-'}</td>
                            <td className="py-2.5 px-4 text-left font-black text-slate-900">
                              {Number(entry.runningBalance).toLocaleString()} ج.م
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: INCOME STATEMENT (P&L) */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {isAr
                    ? `قائمة الدخل والأرباح لسنة ${selectedYear} (${currentMonthLabel})`
                    : `Income Statement (P&L) for ${selectedYear} (${currentMonthLabel})`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'الحسابات معزولة ومخصصة للفترة المحددة في شريط الشهور بالأعلى'
                    : 'Calculations reflect strictly the selected month/period above'}
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                {currentMonthLabel}
              </span>
            </div>

            {pnlLoading ? (
              <div className="py-12 text-center text-slate-400 font-medium">
                {isAr ? 'جاري إعداد قائمة الدخل...' : 'Preparing Income Statement...'}
              </div>
            ) : (
              <div className="mt-5 space-y-6">
                {/* 1. Revenues */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-blue-700 uppercase tracking-wider block">
                    {isAr ? '١. الإيرادات التشغيلية للأسطول' : '1. Fleet Operating Revenues'}
                  </span>
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs font-medium border border-slate-100">
                    <div className="flex justify-between text-slate-700">
                      <span>{isAr ? 'إجمالي مطالبات العملاء' : 'Gross Client Billing:'}</span>
                      <span className="font-bold">{Number(pnlData?.revenues?.grossBilling ?? pnlData?.revenue?.grossBilling ?? 0).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>{isAr ? '(-) ضريبة الخصم والإضافة 3%' : '(-) Withholding Tax (3%):'}</span>
                      <span className="font-bold">
                        -{Number(pnlData?.revenues?.withholdingTaxDeducted ?? pnlData?.revenue?.withholdingTax ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                      <span>{isAr ? 'صافي إيرادات التشغيل (Net Client Revenue)' : 'Net Operating Revenue:'}</span>
                      <span className="text-blue-700">
                        {Number(pnlData?.revenues?.netClientBilling ?? pnlData?.revenue?.netClientBilling ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Direct Costs */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-amber-700 uppercase tracking-wider block">
                    {isAr ? '٢. تكاليف التشغيل المباشرة (Direct Operational Costs)' : '2. Direct Transportation Costs'}
                  </span>
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs font-medium border border-slate-100">
                    <div className="flex justify-between text-slate-700">
                      <span>{isAr ? 'إجمالي أجور ومستحقات السائقين' : 'Total Driver Payouts:'}</span>
                      <span className="font-bold">
                        {Number(pnlData?.directCosts?.driverPayAndOvertime ?? pnlData?.costs?.totalDriverPayouts ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                    {Number(pnlData?.directCosts?.driverOvertime ?? pnlData?.costs?.driverOvertime ?? 0) > 0 && (
                      <div className="flex justify-between text-emerald-600 text-[11px]">
                        <span>{isAr ? '  ↳ منها سهرات وإضافي دورات' : '  ↳ Of which Overtime/Extra Shifts:'}</span>
                        <span className="font-bold">
                          +{Number(pnlData?.directCosts?.driverOvertime ?? pnlData?.costs?.driverOvertime ?? 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700">
                      <span>{isAr ? 'تكاليف تشغيل وإيجار أسطول السيارات المباشرة' : 'Vehicle Direct Costs:'}</span>
                      <span className="font-bold">
                        {Number(pnlData?.directCosts?.vehicleDirectOperatingCosts ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                      <span>{isAr ? 'مجمل الربح التشغيلي المباشر (Gross Operating Profit)' : 'Gross Operating Margin:'}</span>
                      <span className="text-emerald-700">
                        {Number(pnlData?.grossProfit ?? pnlData?.costs?.grossOperatingMargin ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. General & Admin Expenses */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-rose-700 uppercase tracking-wider block">
                    {isAr ? '٣. المصروفات التشغيلية، الإدارية والأقساط' : '3. Operating, Administrative & Overhead Expenses'}
                  </span>
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs font-medium border border-slate-100">
                    {pnlData?.indirectExpenses?.expensesByCategory && Object.keys(pnlData.indirectExpenses.expensesByCategory).length > 0 ? (
                      Object.entries(pnlData.indirectExpenses.expensesByCategory)
                        .slice(0, 10)
                        .map(([cat, amt]) => (
                          <div key={cat} className="flex justify-between text-slate-600">
                            <span>{cat}</span>
                            <span className="font-semibold text-slate-800">
                              {Number(amt || 0).toLocaleString()} ج.م
                            </span>
                          </div>
                        ))
                    ) : pnlData?.expenses?.byCategory && Object.keys(pnlData.expenses.byCategory).length > 0 ? (
                      Object.entries(pnlData.expenses.byCategory)
                        .slice(0, 10)
                        .map(([cat, amt]) => (
                          <div key={cat} className="flex justify-between text-slate-600">
                            <span>{cat}</span>
                            <span className="font-semibold text-slate-800">
                              {Number(amt || 0).toLocaleString()} ج.م
                            </span>
                          </div>
                        ))
                    ) : null}

                    {Number(pnlData?.indirectExpenses?.staffPayroll ?? pnlData?.expenses?.staffPayroll ?? 0) > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>{isAr ? 'رواتب الموظفين والإدارة' : 'Staff Payroll:'}</span>
                        <span className="font-semibold text-slate-800">
                          {Number(pnlData?.indirectExpenses?.staffPayroll ?? pnlData?.expenses?.staffPayroll ?? 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    )}

                    {Number(pnlData?.indirectExpenses?.fleetMaintenance ?? pnlData?.expenses?.fleetMaintenance ?? 0) > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>{isAr ? 'صيانة وإصلاح أسطول المركبات' : 'Fleet Maintenance:'}</span>
                        <span className="font-semibold text-slate-800">
                          {Number(pnlData?.indirectExpenses?.fleetMaintenance ?? pnlData?.expenses?.fleetMaintenance ?? 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    )}

                    {Number(pnlData?.indirectExpenses?.vehicleInstallments ?? pnlData?.expenses?.vehicleInstallments ?? 0) > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>{isAr ? 'أقساط السيارات المسددة' : 'Vehicle Installments Paid:'}</span>
                        <span className="font-semibold text-slate-800">
                          {Number(pnlData?.indirectExpenses?.vehicleInstallments ?? pnlData?.expenses?.vehicleInstallments ?? 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                      <span>{isAr ? 'إجمالي المصروفات غير المباشرة' : 'Total Indirect Expenses:'}</span>
                      <span className="text-rose-600">
                        {Number(pnlData?.indirectExpenses?.totalIndirectExpenses ?? pnlData?.expenses?.totalExpenses ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Net Profit / Loss Banner & Intelligent Diagnostic Box */}
                {(() => {
                  const netProfit = Number(pnlData?.netProfit || 0);
                  const isLoss = netProfit < 0;
                  const absLoss = Math.abs(netProfit);

                  const netRev = Number(pnlData?.revenues?.netClientBilling ?? pnlData?.revenue?.netClientBilling ?? 0);
                  const driverCosts = Number(pnlData?.directCosts?.driverPayAndOvertime ?? pnlData?.costs?.totalDriverPayouts ?? 0);
                  const vehicleDirectCosts = Number(pnlData?.directCosts?.vehicleDirectOperatingCosts ?? 0);
                  const totalDirect = driverCosts + vehicleDirectCosts;

                  const totalIndirect = Number(pnlData?.indirectExpenses?.totalIndirectExpenses ?? pnlData?.expenses?.totalExpenses ?? 0);
                  const installments = Number(pnlData?.indirectExpenses?.vehicleInstallments ?? pnlData?.expenses?.vehicleInstallments ?? 0);
                  const maintenance = Number(pnlData?.indirectExpenses?.fleetMaintenance ?? pnlData?.expenses?.fleetMaintenance ?? 0);
                  const payroll = Number(pnlData?.indirectExpenses?.staffPayroll ?? pnlData?.expenses?.staffPayroll ?? 0);
                  const otherExpenses = Math.max(0, totalIndirect - (installments + maintenance + payroll));

                  const totalOutflows = totalDirect + totalIndirect;
                  const coveragePct = totalOutflows > 0 ? Math.min(100, Math.round((netRev / totalOutflows) * 100)) : 100;

                  return (
                    <div className="space-y-4">
                      {/* Main Banner Card */}
                      <div
                        className={`p-6 rounded-3xl shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isLoss
                            ? 'bg-gradient-to-r from-rose-900 via-rose-800 to-red-700 text-white border-2 border-rose-600/60 shadow-rose-900/30'
                            : 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white border-2 border-emerald-500/40 shadow-emerald-900/30'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isLoss ? (
                              <span className="px-2.5 py-1 rounded-lg bg-rose-500/30 border border-rose-400/50 text-rose-100 text-[11px] font-black flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />
                                {isAr ? '⚠️ تنبيه: عجز وخسارة مالية للفترة' : '⚠️ Operating Deficit / Loss Alert'}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[11px] font-black flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                                {isAr ? '✅ أداء مالي إيجابي وأرباح محققة' : '✅ Profitable Operation'}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-white/80">({currentMonthLabel})</span>
                          </div>

                          <h3 className="text-base font-bold text-white/90">
                            {isLoss
                              ? (isAr ? 'صافي خسارة الفترة التشغيلية' : 'Net Operating Loss')
                              : (isAr ? 'صافي أرباح الشركة التشغيلية' : 'Net Operating Profit')}
                          </h3>

                          <div className="flex items-baseline gap-2 pt-1">
                            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                              {netProfit.toLocaleString()}
                            </span>
                            <span className="text-sm font-bold text-white/80">جنيه مصري</span>
                          </div>
                        </div>

                        <div className="flex items-center sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 border-white/20 pt-3 sm:pt-0">
                          <div
                            className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner ${
                              isLoss ? 'bg-rose-950/50 text-rose-200 border border-rose-500/30' : 'bg-emerald-950/40 text-emerald-200 border border-emerald-400/30'
                            }`}
                          >
                            {isLoss ? <TrendingDown className="h-8 w-8 text-rose-300 animate-bounce" /> : <TrendingUp className="h-8 w-8 text-emerald-300" />}
                          </div>
                          <span className="text-xs text-white/70 font-mono mt-1">
                            {isAr ? `تغطية الإيراد للنفقات: ${coveragePct}%` : `Revenue Coverage: ${coveragePct}%`}
                          </span>
                        </div>
                      </div>

                      {/* Diagnostic & Root-Cause Analysis Section (When in Deficit) */}
                      {isLoss && (
                        <div className="bg-rose-50/80 border-2 border-rose-200 rounded-3xl p-5 space-y-4 shadow-sm text-xs">
                          {/* Alert Header */}
                          <div className="flex items-start gap-3 border-b border-rose-200/80 pb-3">
                            <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                              <ShieldAlert className="h-5 w-5 text-rose-700" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-black text-rose-900">
                                {isAr ? 'تشخيص أسباب العجز المالي: أين تركزت المصروفات؟' : 'Financial Deficit Root-Cause Diagnostic'}
                              </h4>
                              <p className="text-slate-600 mt-0.5">
                                {isAr
                                  ? `إجمالي النفقات والالتزامات (${totalOutflows.toLocaleString()} ج.م) تجاوزت صافي الإيرادات المحققة (${netRev.toLocaleString()} ج.م) بفارق عجز قدره ${absLoss.toLocaleString()} ج.م.`
                                  : `Total expenditures (${totalOutflows.toLocaleString()} EGP) exceeded net revenues (${netRev.toLocaleString()} EGP) resulting in a deficit of ${absLoss.toLocaleString()} EGP.`}
                              </p>
                            </div>
                          </div>

                          {/* Expense Breakdown / Hotspots Grid */}
                          <div>
                            <span className="font-bold text-slate-700 block mb-2">
                              {isAr ? 'توزيع مراكز النفقات والتكاليف لهذا الشهر:' : 'Monthly Expense Allocation Breakdown:'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                              {/* Installments */}
                              <div className="p-3 bg-white border border-rose-200 rounded-2xl space-y-1">
                                <span className="text-[11px] text-slate-500 font-semibold block">🏦 أقساط السيارات</span>
                                <span className="text-sm font-black text-rose-700 font-mono block">
                                  {installments.toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {totalIndirect > 0 ? `${Math.round((installments / totalIndirect) * 100)}% من المصروفات` : '0%'}
                                </span>
                              </div>

                              {/* Maintenance */}
                              <div className="p-3 bg-white border border-rose-200 rounded-2xl space-y-1">
                                <span className="text-[11px] text-slate-500 font-semibold block">🔧 صيانة وإصلاح الأسطول</span>
                                <span className="text-sm font-black text-amber-700 font-mono block">
                                  {maintenance.toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {totalIndirect > 0 ? `${Math.round((maintenance / totalIndirect) * 100)}% من المصروفات` : '0%'}
                                </span>
                              </div>

                              {/* Staff Payroll */}
                              <div className="p-3 bg-white border border-rose-200 rounded-2xl space-y-1">
                                <span className="text-[11px] text-slate-500 font-semibold block">👥 رواتب الموظفين والإدارة</span>
                                <span className="text-sm font-black text-slate-800 font-mono block">
                                  {payroll.toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {totalIndirect > 0 ? `${Math.round((payroll / totalIndirect) * 100)}% من المصروفات` : '0%'}
                                </span>
                              </div>

                              {/* Direct Driver Costs */}
                              <div className="p-3 bg-white border border-rose-200 rounded-2xl space-y-1">
                                <span className="text-[11px] text-slate-500 font-semibold block">👨‍✈️ أجور وبدلات السائقين</span>
                                <span className="text-sm font-black text-slate-800 font-mono block">
                                  {driverCosts.toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {netRev > 0 ? `${Math.round((driverCosts / netRev) * 100)}% من الإيراد` : '0%'}
                                </span>
                              </div>

                              {/* Other Expenses & Fuel */}
                              <div className="p-3 bg-white border border-rose-200 rounded-2xl space-y-1">
                                <span className="text-[11px] text-slate-500 font-semibold block">⛽ وقود ومصروفات عامة</span>
                                <span className="text-sm font-black text-slate-800 font-mono block">
                                  {otherExpenses.toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {totalIndirect > 0 ? `${Math.round((otherExpenses / totalIndirect) * 100)}% من المصروفات` : '0%'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actionable Recommendations */}
                          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1 text-amber-900">
                            <span className="font-bold block text-xs flex items-center gap-1.5">
                              <span>💡</span>
                              <span>{isAr ? 'توصيات مالية لمعالجة الفجوة وتحقيق التوازن:' : 'Financial Recommendations:'}</span>
                            </span>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 font-medium pt-1">
                              <li>مراجعة مواعيد سداد أقساط الحافلات وتوزيعها لتجنب تركزها في شهر واحد.</li>
                              <li>رفع وتيرة تشغيل أسطول الحافلات وزيادة عدد الدورات اليومية لتعظيم الإيرادات.</li>
                              <li>مراجعة أسعار عقود الخطوط مع العملاء لتغطية تكاليف التشغيل المتزايدة.</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 9: 12-MONTH COMPARATIVE TABLE */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {isAr
                    ? `جدول المقارنة الشهرية الشاملة لسنة ${selectedYear}`
                    : `12-Month Comprehensive Financial Comparison (${selectedYear})`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAr
                    ? 'عرض تفصيلي لكل شهر على حدة بجانب إجمالي السنة بالكامل للمقارنة والتحليل'
                    : 'Month-by-month financial side-by-side performance with grand total'}
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                12 شهراً
              </span>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-3 px-4">الشهر</th>
                    <th className="py-3 px-3 text-center">عدد الحركات</th>
                    <th className="py-3 px-3 text-center">إجمالي الدورات</th>
                    <th className="py-3 px-4 text-left">مطالبات العملاء</th>
                    <th className="py-3 px-4 text-left">خصم 3%</th>
                    <th className="py-3 px-4 text-left">صافي المطالبة</th>
                    <th className="py-3 px-4 text-left">أجور السائقين</th>
                    <th className="py-3 px-4 text-left">أرباح التشغيل</th>
                    <th className="py-3 px-4 text-left">المصروفات</th>
                    <th className="py-3 px-4 text-left bg-emerald-50/50">صافي الربح</th>
                    <th className="py-3 px-3 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {monthlyBreakdown?.months?.map((m: any) => {
                    const opsCount = Number(m.operationsCount ?? m.trips ?? 0);
                    const tripsCount = Number(m.tripsCount ?? m.trips ?? 0);
                    const grossBill = Number(m.grossBilling || 0);
                    const whTax = Number(m.withholdingTax || 0);
                    const netBill = Number(m.netClientBilling || 0);
                    const driverPay = Number(m.totalDriverPayouts ?? m.driverCosts ?? 0);
                    const grossMargin = Number(m.grossOperatingMargin ?? m.grossProfit ?? 0);
                    const expenses = Number(m.totalExpenses ?? m.generalExpenses ?? 0);
                    const netProfit = Number(m.netProfit || 0);

                    const hasActivity = opsCount > 0 || tripsCount > 0 || grossBill > 0 || expenses > 0;
                    return (
                      <tr
                        key={m.month}
                        className={`hover:bg-blue-50/30 transition-colors ${
                          hasActivity ? 'text-slate-900' : 'text-slate-400 opacity-60'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold">
                          {isAr ? MONTH_NAMES_AR[m.month - 1] : MONTH_NAMES_EN[m.month - 1]}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold">
                          {opsCount > 0 ? `${opsCount}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold">
                          {tripsCount > 0 ? `${tripsCount}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-semibold">
                          {grossBill > 0 ? `${grossBill.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left text-rose-600">
                          {whTax > 0 ? `${whTax.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-semibold text-blue-700">
                          {netBill > 0 ? `${netBill.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-semibold text-amber-600">
                          {driverPay > 0 ? `${driverPay.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-emerald-600">
                          {grossMargin > 0 ? `${grossMargin.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-medium text-rose-600">
                          {expenses > 0 ? `${expenses.toLocaleString()}` : '-'}
                        </td>
                        <td
                          className={`py-3 px-4 text-left font-black ${
                            hasActivity && netProfit < 0
                              ? 'text-rose-700 bg-rose-50/80 font-mono font-bold'
                              : 'text-emerald-700 bg-emerald-50/40'
                          }`}
                        >
                          {hasActivity ? (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <span>{netProfit < 0 ? '📉' : '📈'}</span>
                              <span>{netProfit.toLocaleString()} ج.م</span>
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {hasActivity && (
                            <button
                              onClick={() => {
                                setSelectedMonth(m.month);
                                setActiveTab('operations');
                              }}
                              className="text-[11px] px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors"
                            >
                              عرض الشهر ←
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Grand Total Row */}
                {monthlyBreakdown?.total && (
                  <tfoot className="bg-slate-900 text-white font-black border-t-2 border-slate-900">
                    <tr>
                      <td className="py-3.5 px-4 text-sm font-black">
                        {isAr ? `إجمالي سنة ${selectedYear}` : `Total ${selectedYear}`}
                      </td>
                      <td className="py-3.5 px-3 text-center text-blue-300">
                        {Number(monthlyBreakdown.total.operationsCount ?? monthlyBreakdown.total.trips ?? 0)}
                      </td>
                      <td className="py-3.5 px-3 text-center text-blue-300">
                        {Number(monthlyBreakdown.total.tripsCount ?? monthlyBreakdown.total.trips ?? 0)}
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        {Number(monthlyBreakdown.total.grossBilling || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-rose-300">
                        {Number(monthlyBreakdown.total.withholdingTax || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-blue-300">
                        {Number(monthlyBreakdown.total.netClientBilling || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-amber-300">
                        {Number(monthlyBreakdown.total.totalDriverPayouts ?? monthlyBreakdown.total.driverCosts ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-emerald-300">
                        {Number(monthlyBreakdown.total.grossOperatingMargin ?? monthlyBreakdown.total.grossProfit ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-rose-300">
                        {Number(monthlyBreakdown.total.totalExpenses ?? monthlyBreakdown.total.generalExpenses ?? 0).toLocaleString()}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-left text-sm font-black font-mono ${
                          Number(monthlyBreakdown.total.netProfit || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {Number(monthlyBreakdown.total.netProfit || 0).toLocaleString()} ج.م
                      </td>
                      <td className="py-3.5 px-3 text-center text-[10px] text-slate-400">توتال سنوي</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1. ADD OPERATION MODAL */}
      <AddOperationModal
        isOpen={showOpModal}
        onClose={() => setShowOpModal(false)}
        onSubmit={(data) => createOpMutation.mutate(data)}
        isPending={createOpMutation.isPending}
        isAr={isAr}
        defaultMonth={selectedMonth || currentActualMonth}
        defaultYear={selectedYear || currentActualYear}
        dbClients={dbClients}
        dbDrivers={dbDrivers}
        dbRoutes={dbRoutes}
        dbVehicles={dbVehicles}
        dbSuppliers={dbSuppliers}
      />

      {/* 2. ADD OVERTIME MODAL */}
      <AddOvertimeModal
        isOpen={showOvertimeModal}
        onClose={() => setShowOvertimeModal(false)}
        onSubmit={(data) => createOvertimeMutation.mutate(data)}
        isPending={createOvertimeMutation.isPending}
        isAr={isAr}
        dbDrivers={dbDrivers}
        dbRoutes={dbRoutes}
      />

      {/* 3. ADD EXPENSE MODAL */}
      <AddExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={(data) => createExpenseMutation.mutate(data)}
        isPending={createExpenseMutation.isPending}
        isAr={isAr}
        treasuryAccounts={treasuryData?.accounts || []}
        dbVehicles={dbVehicles}
      />

      {/* 4. CLIENT RECEIPT MODAL */}
      <ClientReceiptModal
        isOpen={showClientReceiptModal}
        onClose={() => setShowClientReceiptModal(false)}
        onSubmit={(data) => recordClientReceiptMutation.mutate(data)}
        isPending={recordClientReceiptMutation.isPending}
        isAr={isAr}
        dbClients={dbClients || []}
        clientsSummary={clientsSummary}
        treasuryAccounts={treasuryData?.accounts || []}
        initialData={clientReceiptForm}
      />

      {/* 5. CLIENT INVOICE MODAL */}
      <ClientInvoiceModal
        isOpen={showClientInvoiceModal}
        onClose={() => setShowClientInvoiceModal(false)}
        onPayNow={handlePayInvoice}
        isAr={isAr}
        dbClients={dbClients || []}
        clientsSummary={clientsSummary}
        initialData={clientInvoiceState}
        tripsData={Array.isArray(clientInvoiceTripsData) ? clientInvoiceTripsData : (clientInvoiceTripsData?.items || [])}
        isLoadingTrips={invoiceTripsLoading}
      />

      {/* 5.1. SUPPLIER INVOICE MODAL */}
      <SupplierInvoiceModal
        isOpen={showSupplierInvoiceModal}
        onClose={() => setShowSupplierInvoiceModal(false)}
        onPayNow={handlePaySupplierInvoice}
        isAr={isAr}
        dbSuppliers={dbSuppliers || []}
        suppliersSummary={suppliersSummary}
        initialData={supplierInvoiceState}
      />

      {/* 6. MANUAL DEBIT MODAL */}
      <ManualDebitModal
        isOpen={showManualDebitModal}
        onClose={() => setShowManualDebitModal(false)}
        onSubmit={(data) => createClientManualDebitMutation.mutate(data)}
        isPending={createClientManualDebitMutation.isPending}
        isAr={isAr}
        dbClients={dbClients}
        initialData={manualDebitForm}
      />

      {/* 7. SUPPLIER TRANSACTION MODAL */}
      <SupplierTxModal
        isOpen={showSupplierTxModal}
        onClose={() => setShowSupplierTxModal(false)}
        onSubmit={(data) => createSupplierTxMutation.mutate(data)}
        isPending={createSupplierTxMutation.isPending}
        isAr={isAr}
        dbSuppliers={dbSuppliers}
      />

      {/* 8. SUPPLIER PAY MODAL */}
      <SupplierPayModal
        isOpen={showSupplierPayModal}
        onClose={() => setShowSupplierPayModal(false)}
        onSubmit={(data) => paySupplierMutation.mutate(data)}
        isPending={paySupplierMutation.isPending}
        isAr={isAr}
        dbSuppliers={dbSuppliers}
        suppliersSummary={suppliersSummary}
        treasuryAccounts={treasuryData?.accounts || []}
        initialData={supplierPayForm}
      />

      {/* 9. ADD INSTALLMENT MODAL */}
      <AddInstallmentModal
        isOpen={showInstallmentModal}
        onClose={() => setShowInstallmentModal(false)}
        onSubmit={(data) => createInstallmentMutation.mutate(data)}
        isPending={createInstallmentMutation.isPending}
        isAr={isAr}
        dbVehicles={dbVehicles}
      />

      {/* 10. CREATE TREASURY ACCOUNT MODAL */}
      <CreateAccountModal
        isOpen={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onSubmit={(data) => createAccountMutation.mutate(data)}
        isPending={createAccountMutation.isPending}
        isAr={isAr}
      />

      {/* 11. TRANSFER MODAL */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSubmit={(data) => transferTreasuryMutation.mutate(data)}
        isPending={transferTreasuryMutation.isPending}
        isAr={isAr}
        treasuryAccounts={treasuryData?.accounts || []}
      />

      {/* 12. DRIVER PAY MODAL */}
      <DriverPayModal
        isOpen={showDriverPayModal}
        onClose={() => setShowDriverPayModal(false)}
        onSubmit={(data) => payDriverMutation.mutate(data)}
        isPending={payDriverMutation.isPending}
        isAr={isAr}
        settlementsData={settlementsData || []}
        driversList={dbDrivers || []}
        treasuryAccounts={treasuryData?.accounts || []}
        initialData={driverPayForm}
      />

      {/* 13. STAFF PAYROLL MODAL */}
      <StaffPayrollModal
        isOpen={showPayrollModal}
        onClose={() => setShowPayrollModal(false)}
        onSubmit={(data) => createPayrollMutation.mutate(data)}
        isPending={createPayrollMutation.isPending}
        isAr={isAr}
        treasuryAccounts={treasuryData?.accounts || []}
        defaultMonth={selectedMonth || currentActualMonth}
        defaultYear={selectedYear || currentActualYear}
      />
    </div>
  );
};

export default AccountingPage;
