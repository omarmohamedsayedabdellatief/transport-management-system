import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Building2,
  Search,
  Plus,
  Trash2,
  Download,
  Wallet,
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  DailyOperationItem,
  DriverOvertimeItem,
  ClientTransactionItem,
} from '../../../services/accounting.service';

interface OperationsRevenueTabProps {
  isAr: boolean;
  selectedMonth?: number;
  selectedYear: number;
  currentMonthLabel: string;
  // Operations props
  operationsData?: DailyOperationItem[];
  opsSummary?: any;
  opsLoading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCompany: string;
  setSelectedCompany: (val: string) => void;
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  dbClients?: any[];
  onOpenAddOp: () => void;
  onDeleteOp: (id: string) => void;
  // Overtime props
  overtimeData?: DriverOvertimeItem[];
  otLoading: boolean;
  onOpenAddOvertime: () => void;
  onDeleteOvertime: (id: string) => void;
  // Client Ledger props
  clientLedgerData?: ClientTransactionItem[];
  ledgerLoading: boolean;
  clientsSummary?: any[];
  clientSearch: string;
  setClientSearch: (val: string) => void;
  onOpenClientReceipt: (companyName?: string, due?: number) => void;
  onOpenClientInvoice: (companyName?: string) => void;
  onOpenManualDebit: (companyName?: string) => void;
}

export const OperationsRevenueTab: React.FC<OperationsRevenueTabProps> = ({
  isAr,
  selectedMonth,
  selectedYear,
  currentMonthLabel,
  operationsData,
  opsSummary,
  opsLoading,
  searchQuery,
  setSearchQuery,
  selectedCompany,
  setSelectedCompany,
  page,
  setPage,
  dbClients,
  onOpenAddOp,
  onDeleteOp,
  overtimeData,
  otLoading,
  onOpenAddOvertime,
  onDeleteOvertime,
  clientLedgerData,
  ledgerLoading,
  clientsSummary,
  clientSearch,
  setClientSearch,
  onOpenClientReceipt,
  onOpenClientInvoice,
  onOpenManualDebit,
}) => {
  const [subTab, setSubTab] = useState<'daily_ops' | 'overtime' | 'client_ledgers'>('daily_ops');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation Pill Switcher */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSubTab('daily_ops')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              subTab === 'daily_ops'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>{isAr ? 'حركات اليومية والتشغيل' : 'Daily Operations'}</span>
            {(opsSummary?.count !== undefined ? opsSummary.count > 0 : (operationsData && operationsData.length > 0)) && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  subTab === 'daily_ops' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {opsSummary?.count ?? operationsData?.length ?? 0}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('overtime')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              subTab === 'overtime'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{isAr ? 'سجل إضافي السائقين والسهرات' : 'Driver Overtime Log'}</span>
            {overtimeData && overtimeData.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  subTab === 'overtime' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {overtimeData.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('client_ledgers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              subTab === 'client_ledgers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>{isAr ? 'كشوف حساب وفواتير وتحصيل العملاء' : 'Client Ledgers & Invoices'}</span>
            {clientsSummary && clientsSummary.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  subTab === 'client_ledgers' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {clientsSummary.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shrink-0 hidden md:inline-block">
          {currentMonthLabel}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: DAILY OPERATIONS */}
      {/* ========================================================================= */}
      {subTab === 'daily_ops' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
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

              {/* Company Filter Dropdown */}
              <select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="">{isAr ? 'جميع الشركات والعملاء' : 'All Companies'}</option>
                {dbClients?.map((c: any) => (
                  <option key={c.id || c.companyName} value={c.companyName}>
                    {c.companyName}
                  </option>
                ))}
              </select>

              {selectedCompany && (
                <button
                  onClick={() => setSelectedCompany('')}
                  className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 flex items-center gap-1"
                >
                  <span>✕</span>
                  <span>{isAr ? 'إلغاء الفلتر' : 'Clear'}</span>
                </button>
              )}
            </div>

            <button
              onClick={onOpenAddOp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إضافة حركة تشغيل جديدة' : 'Add Daily Operation'}</span>
            </button>
          </div>

          {/* Summary KPI Strip */}
          {opsSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 text-xs shadow-2xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block font-medium">حركات التشغيل للشهر:</span>
                <span className="text-sm font-black text-slate-900 font-mono">
                  {opsSummary.count || operationsData?.length || 0} حركة
                  <span className="text-[10px] text-slate-400 mr-1 font-normal">({opsSummary.totalTrips || 0} رحلة)</span>
                </span>
              </div>
              <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                <span className="text-[11px] text-blue-700 block font-medium">إجمالي مطالبات التشغيل:</span>
                <span className="text-sm font-black text-blue-900 font-mono">
                  {Number(opsSummary.totalBilling || 0).toLocaleString()} ج.م
                </span>
              </div>
              <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
                <span className="text-[11px] text-purple-700 block font-medium">تكلفة الأسطول والموردين:</span>
                <span className="text-sm font-black text-purple-900 font-mono">
                  {Number(opsSummary.totalVehicleCosts || 0).toLocaleString()} ج.م
                </span>
              </div>
              <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-emerald-700 block font-medium">صافي الإيراد التشغيلي:</span>
                <span className="text-sm font-black text-emerald-800 font-mono">
                  {Number(opsSummary.totalNetRevenue || 0).toLocaleString()} ج.م
                </span>
              </div>
            </div>
          )}

          {/* Operations Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
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
                          {op.driverCode && <span className="text-[10px] text-slate-400 font-mono">#{op.driverCode}</span>}
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
                        <td className="py-2.5 px-3 text-left font-semibold text-slate-700 font-mono">
                          {Number(op.dailyRate).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-semibold text-slate-700 font-mono">
                          {Number(op.driverDailyRate).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-bold text-purple-700 font-mono">
                          {Number(op.vehicleCost || 0) > 0 ? Number(op.vehicleCost).toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-left text-rose-600 font-medium font-mono">
                          {Number(op.withholdingTax).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-bold text-slate-900 font-mono">
                          {Number(op.totalAmount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-bold text-amber-600 font-mono">
                          {Number(op.netDriverPay).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-bold text-emerald-600 font-mono">
                          {Number(op.dailyProfit).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-left font-black text-blue-700 font-mono">
                          {Number(op.netRevenue).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(isAr ? 'حذف هذه الحركة؟' : 'Delete operation?')) {
                                onDeleteOp(op.id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                            title={isAr ? 'حذف' : 'Delete'}
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

            {/* Pagination Controls */}
            {operationsData && operationsData.length > 0 && (
              <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-600 font-medium">
                  {isAr ? (
                    <span>
                      عرض <strong>{operationsData.length}</strong> حركة (صفحة {page}) من إجمالي{' '}
                      <strong>{opsSummary?.count || operationsData.length}</strong> حركة في هذا الشهر
                    </span>
                  ) : (
                    <span>
                      Showing <strong>{operationsData.length}</strong> ops (Page {page}) of{' '}
                      <strong>{opsSummary?.count || operationsData.length}</strong> total
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>{isAr ? 'السابق' : 'Prev'}</span>
                  </button>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl font-mono font-bold text-blue-700">
                    {page}
                  </span>
                  <button
                    type="button"
                    disabled={operationsData.length < 25}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span>{isAr ? 'التالي' : 'Next'}</span>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: DRIVER OVERTIME */}
      {/* ========================================================================= */}
      {subTab === 'overtime' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
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
            </div>

            <button
              onClick={onOpenAddOvertime}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إضافة سهرة أو إضافي جديد' : 'Add Overtime / Shift'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
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
                        <td className="py-2.5 px-4 text-left font-black text-emerald-600 font-mono">
                          {Number(ot.shiftRate).toLocaleString()} ج.م
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{ot.notes || '-'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(isAr ? 'حذف هذا السجل؟' : 'Delete overtime record?')) {
                                onDeleteOvertime(ot.id);
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

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: CLIENT LEDGERS & INVOICES */}
      {/* ========================================================================= */}
      {subTab === 'client_ledgers' && (
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
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-400/30'
                        : 'bg-white border-slate-200'
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
                            مسدد
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>إجمالي الفواتير:</span>
                          <span className="font-bold text-slate-800 font-mono">
                            {Number(c.totalDebit || 0).toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>المحصل بالخزينة:</span>
                          <span className="font-bold text-emerald-600 font-mono">
                            {Number(c.totalCredit || 0).toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold">
                          <span>الرصيد المستحق:</span>
                          <span className={`font-mono ${balanceVal > 0 ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}`}>
                            {balanceVal.toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                      {balanceVal > 0 ? (
                        <button
                          onClick={() => onOpenClientReceipt(c.companyName, balanceVal)}
                          className="py-1.5 px-2 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 shadow-2xs transition-colors"
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
                        onClick={() => onOpenClientInvoice(c.companyName)}
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

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
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

              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="">{isAr ? '🏢 جميع الشركات والعملاء (عرض شامل)' : '🏢 All Companies'}</option>
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
                onClick={() => onOpenClientReceipt(selectedCompany)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
              >
                <Wallet className="h-4 w-4" />
                <span>{isAr ? 'تحصيل وسداد في الخزينة/البنك' : 'Record Client Receipt'}</span>
              </button>

              <button
                onClick={() => onOpenClientInvoice(selectedCompany)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>{isAr ? 'إصدار ومعاينة فاتورة رحلات' : 'Generate Trip Invoice'}</span>
              </button>

              <button
                onClick={() => onOpenManualDebit(selectedCompany)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إضافة مطالبة يدوية' : 'Add Manual Invoice'}</span>
              </button>
            </div>
          </div>

          {/* Transactions Statement Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
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
                            <td className="py-2.5 px-4 text-left font-bold text-blue-600 font-mono">
                              {isDebit ? Number(tx.debit).toLocaleString() : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-left font-bold text-emerald-600 font-mono">
                              {!isDebit ? Number(tx.credit).toLocaleString() : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-left font-black text-slate-900 font-mono">
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
    </div>
  );
};
