import React from 'react';
import {
  Calculator,
  Calendar,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  Wallet,
  FileText,
  DollarSign,
} from 'lucide-react';

export const MONTH_NAMES_AR = [
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

export const MONTH_NAMES_EN = [
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

interface AccountingHeaderProps {
  isAr: boolean;
  selectedMonth: number | undefined;
  setSelectedMonth: (month: number | undefined) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  monthlyBreakdown?: any;
  isExportingOps: boolean;
  isExportingSet: boolean;
  onExportOps: () => void;
  onExportSet: () => void;
  onQuickAddOp?: () => void;
  onQuickAddExpense?: () => void;
  onQuickRecordReceipt?: () => void;
  onQuickAddPayroll?: () => void;
}

export const AccountingHeader: React.FC<AccountingHeaderProps> = ({
  isAr,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  monthlyBreakdown,
  isExportingOps,
  isExportingSet,
  onExportOps,
  onExportSet,
  onQuickAddOp,
  onQuickAddExpense,
  onQuickRecordReceipt,
  onQuickAddPayroll,
}) => {
  const currentMonthLabel = selectedMonth
    ? isAr
      ? MONTH_NAMES_AR[selectedMonth - 1]
      : MONTH_NAMES_EN[selectedMonth - 1]
    : isAr
    ? `إجمالي سنة ${selectedYear} بالكامل`
    : `Full Year ${selectedYear} Total`;

  return (
    <div className="space-y-3">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isAr ? 'قسم الحسابات والماليات الشاملة' : 'Accounting & Financial Management'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {currentMonthLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isAr
                ? 'منظومة مالية متكاملة: تشغيل، عملاء، موردين، مستحقات سائقين، مراكز تكلفة الأسطول، وقوائم الدخل'
                : 'Enterprise Accounting: Operations, Clients, Suppliers, Driver Settlements, Fleet Economics & P&L'}
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs">
            <span className="text-slate-500">{isAr ? 'السنة المالية:' : 'Fiscal Year:'}</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label={isAr ? 'السنة المالية' : 'Fiscal Year'}
              className="bg-transparent font-black text-blue-700 focus:outline-hidden cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Export Operations */}
          <button
            onClick={onExportOps}
            disabled={isExportingOps}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
            title={isAr ? 'تصدير شيت اليومية لإكسل' : 'Export Operations to Excel'}
          >
            {isExportingOps ? (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            ) : (
              <Download className="h-4 w-4 text-blue-600" />
            )}
            <span>{isAr ? 'تصدير اليومية' : 'Export Ops'}</span>
          </button>

          {/* Export Settlements */}
          <button
            onClick={onExportSet}
            disabled={isExportingSet}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all disabled:opacity-50"
            title={isAr ? 'تصدير شيت المستحقات لإكسل' : 'Export Settlements to Excel'}
          >
            {isExportingSet ? (
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            )}
            <span>{isAr ? 'تصدير المستحقات' : 'Export Settlements'}</span>
          </button>

          {/* Quick Primary Trigger */}
          {onQuickAddOp && (
            <button
              onClick={onQuickAddOp}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'حركة تشغيل جديدة' : 'Add Operation'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Month Selector Ribbon */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>{isAr ? 'تصفية الحسابات حسب الشهر:' : 'Filter Accounting by Month:'}</span>
            <span className="text-[11px] font-medium text-slate-400">
              {isAr
                ? '(اختر شهراً لعزل حساباته بدقة، أو اختر إجمالي السنة)'
                : '(Select a specific month or Full Year)'}
            </span>
          </div>
          {selectedMonth !== undefined && (
            <button
              onClick={() => setSelectedMonth(undefined)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              <span>{isAr ? 'عرض إجمالي كافة الشهور ←' : 'Show Full Year Total →'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const mData = monthlyBreakdown?.months?.find((x: any) => x.month === m);
            const count = Number(mData?.operationsCount ?? mData?.tripsCount ?? mData?.trips ?? 0);
            const hasData = count > 0 || Number(mData?.totalExpenses || mData?.generalExpenses || 0) > 0;
            const isSelected = selectedMonth === m;

            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`py-2 px-1.5 rounded-xl text-center transition-all relative flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/25 scale-[1.02]'
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
                    {count} {isAr ? 'حركة' : 'ops'}
                  </span>
                )}
              </button>
            );
          })}

          {/* Full Year Button */}
          <button
            onClick={() => setSelectedMonth(undefined)}
            className={`py-2 px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center ${
              selectedMonth === undefined
                ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-500/25 scale-[1.02]'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold'
            }`}
          >
            <span className="text-xs">{isAr ? 'إجمالي السنة' : 'Full Year'}</span>
            <span
              className={`text-[9px] mt-0.5 px-1 rounded-full ${
                selectedMonth === undefined ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {isAr ? `توتال ${selectedYear}` : `${selectedYear} Total`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
