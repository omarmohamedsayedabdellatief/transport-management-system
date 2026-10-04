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
  LayoutDashboard,
  CalendarDays,
  DollarSign,
  Users,
  Truck,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { AccountingHeader, MONTH_NAMES_AR, MONTH_NAMES_EN } from './components/AccountingHeader';
import { AccountingOverviewTab } from './components/AccountingOverviewTab';
import { OperationsRevenueTab } from './components/OperationsRevenueTab';
import { ExpensesPayrollTab } from './components/ExpensesPayrollTab';
import { DriverSettlementsTab } from './components/DriverSettlementsTab';
import { SuppliersFleetTab } from './components/SuppliersFleetTab';
import { ReportsPnLTab } from './components/ReportsPnLTab';

export type AccountingTabKey = 'overview' | 'operations' | 'expenses' | 'settlements' | 'suppliers' | 'reports';

export const AccountingPage: React.FC = () => {
  const { isRTL } = useLanguage();
  const isAr = isRTL;
  const queryClient = useQueryClient();

  // Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<AccountingTabKey>('overview');

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

  // Modals visibility
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

  // Supplier Pay initial state
  const [supplierPayForm, setSupplierPayForm] = useState({
    supplierName: '',
    amount: 5000,
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    reference: 'سداد دفعة إيجار وتشغيل',
    notes: '',
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
    enabled: activeTab === 'operations' || activeTab === 'overview',
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
    enabled: activeTab === 'operations',
  });

  const { data: settlementsData, isLoading: setLoading } = useQuery({
    queryKey: ['acc-settlements', selectedMonth, selectedYear, selectedCompany],
    queryFn: () =>
      accountingApi.getSettlements({
        month: selectedMonth,
        year: selectedYear,
        companyName: selectedCompany || undefined,
      }),
    enabled: activeTab === 'settlements' || showDriverPayModal || activeTab === 'overview',
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
    enabled: activeTab === 'operations',
  });

  const { data: clientsSummary } = useQuery({
    queryKey: ['acc-clients-summary'],
    queryFn: () => accountingApi.getClientsLedgerSummary(),
    enabled: activeTab === 'operations' || showClientReceiptModal || showClientInvoiceModal || activeTab === 'overview',
  });

  const { data: supplierLedgerData, isLoading: supLedgerLoading } = useQuery({
    queryKey: ['acc-supplier-ledger', selectedSupplier],
    queryFn: () => accountingApi.getSupplierTransactions(selectedSupplier || undefined),
    enabled: activeTab === 'suppliers',
  });

  const { data: suppliersSummary } = useQuery({
    queryKey: ['acc-suppliers-summary'],
    queryFn: () => accountingApi.getSuppliersLedgerSummary(),
    enabled: activeTab === 'suppliers' || activeTab === 'overview',
  });

  const { data: installmentsData, isLoading: instLoading } = useQuery({
    queryKey: ['acc-installments', selectedVehiclePlate, deferredVehicleSearch],
    queryFn: () =>
      accountingApi.getInstallments({
        vehiclePlate: selectedVehiclePlate || undefined,
        search: deferredVehicleSearch || undefined,
      }),
    enabled: activeTab === 'suppliers',
  });

  const { data: instSummary } = useQuery({
    queryKey: ['acc-inst-summary', selectedVehiclePlate],
    queryFn: () =>
      accountingApi.getInstallmentsSummary({
        vehiclePlate: selectedVehiclePlate || undefined,
      }),
    enabled: activeTab === 'suppliers',
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
    enabled: activeTab === 'suppliers' || activeTab === 'reports',
  });

  const { data: pnlData, isLoading: pnlLoading } = useQuery({
    queryKey: ['acc-pnl', selectedMonth, selectedYear],
    queryFn: () => accountingApi.getIncomeStatement({ month: selectedMonth, year: selectedYear }),
    enabled: activeTab === 'reports' || activeTab === 'overview',
  });

  const { data: payrollData, isLoading: payrollLoading } = useQuery({
    queryKey: ['acc-staff-payroll', selectedMonth, selectedYear],
    queryFn: () => accountingApi.getStaffPayroll({ month: selectedMonth, year: selectedYear }),
    enabled: activeTab === 'expenses' || activeTab === 'reports',
  });

  const { data: accountStatementData, isLoading: statementLoading } = useQuery({
    queryKey: ['acc-statement', selectedAccountIdForStatement],
    queryFn: () => accountingApi.getTreasuryStatement(selectedAccountIdForStatement),
    enabled: !!selectedAccountIdForStatement,
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

  const currentMonthLabel = selectedMonth
    ? isAr
      ? MONTH_NAMES_AR[selectedMonth - 1]
      : MONTH_NAMES_EN[selectedMonth - 1]
    : isAr
    ? `إجمالي سنة ${selectedYear} بالكامل`
    : `Full Year ${selectedYear} Total`;

  return (
    <div className="space-y-5">
      {/* 1. Global Header with Scope & Month Ribbon */}
      <AccountingHeader
        isAr={isAr}
        selectedMonth={selectedMonth}
        setSelectedMonth={(m) => {
          setSelectedMonth(m);
          setPage(1);
        }}
        selectedYear={selectedYear}
        setSelectedYear={(y) => {
          setSelectedYear(y);
          setPage(1);
        }}
        monthlyBreakdown={monthlyBreakdown}
        isExportingOps={isExportingOps}
        isExportingSet={isExportingSet}
        onExportOps={handleDownloadOperations}
        onExportSet={handleDownloadSettlements}
        onQuickAddOp={() => setShowOpModal(true)}
      />

      {/* 2. Structured Main Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>{isAr ? 'نظرة عامة والخزينة والسيولة' : 'Overview & Treasury'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('operations');
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'operations'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>{isAr ? 'الإيرادات والتشغيل والفواتير' : 'Operations & Revenue'}</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>{isAr ? 'المصروفات والرواتب' : 'Expenses & Payroll'}</span>
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'settlements'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{isAr ? 'مستحقات السائقين (التسوية)' : 'Driver Settlements'}</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>{isAr ? 'الموردون وأسطول المركبات' : 'Suppliers & Fleet'}</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>{isAr ? 'التقارير وقوائم الدخل (P&L)' : 'Reports & P&L'}</span>
        </button>
      </div>

      {/* 3. Render Domain Component for Active Tab */}
      {activeTab === 'overview' && (
        <AccountingOverviewTab
          isAr={isAr}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          currentMonthLabel={currentMonthLabel}
          opsSummary={opsSummary}
          expSummary={expSummary}
          pnlData={pnlData}
          treasuryData={treasuryData}
          accountStatementData={accountStatementData}
          statementLoading={statementLoading}
          selectedAccountIdForStatement={selectedAccountIdForStatement}
          setSelectedAccountIdForStatement={setSelectedAccountIdForStatement}
          onNavigateTab={(tabKey) => {
            setActiveTab(tabKey);
            setPage(1);
          }}
          onOpenCreateAccount={() => setShowCreateAccountModal(true)}
          onOpenTransfer={() => setShowTransferModal(true)}
          onOpenAddOp={() => setShowOpModal(true)}
          onOpenAddExpense={() => setShowExpenseModal(true)}
          onOpenClientReceipt={() => {
            const defaultAcc = treasuryData?.accounts?.find((a: any) => a.kind === 'BANK') || treasuryData?.accounts?.[0];
            setClientReceiptForm({
              companyName: '',
              amount: 0,
              accountId: defaultAcc?.id || '',
              date: new Date().toISOString().split('T')[0],
              reference: '',
              notes: '',
              maxDueBalance: 0,
            });
            setShowClientReceiptModal(true);
          }}
          onOpenPayDriver={() => {
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
          onOpenStaffPayroll={() => setShowPayrollModal(true)}
        />
      )}

      {activeTab === 'operations' && (
        <OperationsRevenueTab
          isAr={isAr}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          currentMonthLabel={currentMonthLabel}
          operationsData={operationsData}
          opsSummary={opsSummary}
          opsLoading={opsLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCompany={selectedCompany}
          setSelectedCompany={setSelectedCompany}
          page={page}
          setPage={setPage}
          dbClients={dbClients}
          onOpenAddOp={() => setShowOpModal(true)}
          onDeleteOp={(id) => deleteOpMutation.mutate(id)}
          overtimeData={overtimeData}
          otLoading={otLoading}
          onOpenAddOvertime={() => setShowOvertimeModal(true)}
          onDeleteOvertime={(id) => deleteOvertimeMutation.mutate(id)}
          clientLedgerData={clientLedgerData}
          ledgerLoading={ledgerLoading}
          clientsSummary={clientsSummary}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          onOpenClientReceipt={(companyName, due) => {
            const defaultAcc = treasuryData?.accounts?.find((a: any) => a.kind === 'BANK') || treasuryData?.accounts?.[0];
            setClientReceiptForm({
              companyName: companyName || '',
              amount: due || 0,
              accountId: defaultAcc?.id || '',
              date: new Date().toISOString().split('T')[0],
              reference: companyName ? `تحصيل مستحقات فواتير شركة ${companyName}` : 'تحصيل من عميل',
              notes: '',
              maxDueBalance: due || 0,
            });
            setShowClientReceiptModal(true);
          }}
          onOpenClientInvoice={(companyName) => {
            const comp = companyName || selectedCompany || clientsSummary?.[0]?.companyName || 'CLIENT';
            setClientInvoiceState({
              companyName: comp,
              month: selectedMonth || currentActualMonth,
              year: selectedYear || currentActualYear,
              invoiceNumber: `INV-${selectedYear || currentActualYear}-${String(selectedMonth || currentActualMonth).padStart(2, '0')}-${comp.replace(/\s+/g, '-').slice(0, 10)}`,
              invoiceDate: new Date().toISOString().split('T')[0],
              dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              notes: `فاتورة مطالبة تشغيل رحلات ونقل عاملين عن شهر ${selectedMonth || currentActualMonth}/${selectedYear || currentActualYear}`,
            });
            setShowClientInvoiceModal(true);
          }}
          onOpenManualDebit={(companyName) => {
            setManualDebitForm({
              companyName: companyName || selectedCompany || '',
              date: new Date().toISOString().split('T')[0],
              documentNumber: '',
              description: 'مطالبة / فاتورة تشغيل إضافية',
              debit: 0,
              notes: '',
            });
            setShowManualDebitModal(true);
          }}
        />
      )}

      {activeTab === 'expenses' && (
        <ExpensesPayrollTab
          isAr={isAr}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          currentMonthLabel={currentMonthLabel}
          expensesData={expensesData}
          expSummary={expSummary}
          expLoading={expLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenAddExpense={() => setShowExpenseModal(true)}
          onDeleteExpense={(id) => deleteExpenseMutation.mutate(id)}
          payrollData={payrollData}
          payrollLoading={payrollLoading}
          payrollSearch={payrollSearch}
          setPayrollSearch={setPayrollSearch}
          payrollJobFilter={payrollJobFilter}
          setPayrollJobFilter={setPayrollJobFilter}
          onOpenAddPayroll={() => setShowPayrollModal(true)}
          onDeletePayroll={(id) => deletePayrollMutation.mutate(id)}
        />
      )}

      {activeTab === 'settlements' && (
        <DriverSettlementsTab
          isAr={isAr}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          currentMonthLabel={currentMonthLabel}
          settlementsData={settlementsData}
          setLoading={setLoading}
          settlementSearch={settlementSearch}
          setSettlementSearch={setSettlementSearch}
          settlementStatusFilter={settlementStatusFilter}
          setSettlementStatusFilter={setSettlementStatusFilter}
          selectedCompany={selectedCompany}
          setSelectedCompany={setSelectedCompany}
          dbClients={dbClients}
          onOpenPayDriverModal={(driverName, netPayable) => {
            const defaultAcc = treasuryData?.accounts?.find((a: any) => a.kind === 'CASH') || treasuryData?.accounts?.[0];
            setDriverPayForm({
              driverName: driverName || '',
              month: selectedMonth || currentActualMonth,
              year: selectedYear || currentActualYear,
              amount: netPayable || 0,
              accountId: defaultAcc?.id || '',
              paymentDate: new Date().toISOString().split('T')[0],
              reference: driverName ? `صرف راتب شهر ${selectedMonth || currentActualMonth}/${selectedYear || currentActualYear} للسائق ${driverName}` : '',
              notes: '',
              maxPayable: netPayable || 0,
            });
            setShowDriverPayModal(true);
          }}
          onDownloadSettlements={handleDownloadSettlements}
        />
      )}

      {activeTab === 'suppliers' && (
        <SuppliersFleetTab
          isAr={isAr}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          currentMonthLabel={currentMonthLabel}
          suppliersSummary={suppliersSummary}
          supplierLedgerData={supplierLedgerData}
          supLedgerLoading={supLedgerLoading}
          selectedSupplier={selectedSupplier}
          setSelectedSupplier={setSelectedSupplier}
          onOpenSupplierInvoice={(supplierName) => {
            const targetSup = supplierName || selectedSupplier || suppliersSummary?.[0]?.supplierName || 'SUP';
            setSupplierInvoiceState({
              supplierName: targetSup,
              month: selectedMonth || currentActualMonth,
              year: selectedYear || currentActualYear,
              invoiceNumber: `SUP-INV-${selectedYear || currentActualYear}-${String(selectedMonth || currentActualMonth).padStart(2, '0')}-${targetSup.replace(/\s+/g, '-').slice(0, 10)}`,
              invoiceDate: new Date().toISOString().split('T')[0],
              dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              notes: '',
            });
            setShowSupplierInvoiceModal(true);
          }}
          onOpenSupplierTx={() => setShowSupplierTxModal(true)}
          onOpenSupplierPay={(supplierName) => {
            const targetSup = supplierName || selectedSupplier || suppliersSummary?.[0]?.supplierName || '';
            const defaultAcc = treasuryData?.accounts?.find((a: any) => a.kind === 'BANK') || treasuryData?.accounts?.[0];
            setSupplierPayForm({
              supplierName: targetSup,
              amount: 5000,
              accountId: defaultAcc?.id || '',
              date: new Date().toISOString().split('T')[0],
              reference: targetSup ? `سداد دفعة للمورد ${targetSup}` : 'سداد دفعة إيجار وتشغيل',
              notes: '',
            });
            setShowSupplierPayModal(true);
          }}
          selectedVehiclePlate={selectedVehiclePlate}
          setSelectedVehiclePlate={setSelectedVehiclePlate}
          vehicleSearch={vehicleSearch}
          setVehicleSearch={setVehicleSearch}
          dbVehicles={dbVehicles}
          vehicleEconData={vehicleEconData}
          vehicleEconLoading={vehicleEconLoading}
          installmentsData={installmentsData}
          instLoading={instLoading}
          instSummary={instSummary}
          onOpenAddInstallment={() => setShowInstallmentModal(true)}
          onToggleInstallmentStatus={(id, status) => toggleInstMutation.mutate({ id, status })}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsPnLTab
          isAr={isAr}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          currentMonthLabel={currentMonthLabel}
          pnlData={pnlData}
          pnlLoading={pnlLoading}
          monthlyBreakdown={monthlyBreakdown}
          onSelectMonthForOps={(m) => {
            setSelectedMonth(m);
            setActiveTab('operations');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS (All 13 Preserved with Identical Handlers and Props) */}
      {/* ========================================================================= */}

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
        defaultMonth={selectedMonth}
        defaultYear={selectedYear}
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
        defaultMonth={selectedMonth}
        defaultYear={selectedYear}
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
