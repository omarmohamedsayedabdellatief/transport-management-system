import { AccountingActionButton } from './AccountingActionButton';
import React, { useState } from 'react';
import {
  Wallet,
  Building2,
  Users,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Receipt,
  Truck,
  Briefcase,
} from 'lucide-react';

interface AccountingOverviewTabProps {
  isAr: boolean;
  selectedMonth?: number;
  selectedYear: number;
  currentMonthLabel: string;
  opsSummary?: any;
  expSummary?: any;
  pnlData?: any;
  treasuryData?: any;
  accountStatementData?: any;
  statementLoading: boolean;
  selectedAccountIdForStatement: string;
  setSelectedAccountIdForStatement: (id: string) => void;
  onNavigateTab: (tabKey: any) => void;
  onOpenCreateAccount: () => void;
  onOpenTransfer: () => void;
  onOpenAddOp: () => void;
  onOpenAddExpense: () => void;
  onOpenClientReceipt: () => void;
  onOpenPayDriver: () => void;
  onOpenStaffPayroll: () => void;
}

export const AccountingOverviewTab: React.FC<AccountingOverviewTabProps> = ({
  isAr,
  selectedMonth,
  selectedYear,
  currentMonthLabel,
  opsSummary,
  expSummary,
  pnlData,
  treasuryData,
  accountStatementData,
  statementLoading,
  selectedAccountIdForStatement,
  setSelectedAccountIdForStatement,
  onNavigateTab,
  onOpenCreateAccount,
  onOpenTransfer,
  onOpenAddOp,
  onOpenAddExpense,
  onOpenClientReceipt,
  onOpenPayDriver,
  onOpenStaffPayroll,
}) => {
  const [showFlowGuide, setShowFlowGuide] = useState(true);

  const totalBilling = Number(opsSummary?.totalBilling || 0);
  const netDriverPay = Number(opsSummary?.totalNetDriverPay || 0);
  const totalOvertime = Number(opsSummary?.totalOvertime || 0);
  const grossProfit = Number(opsSummary?.totalDailyProfit || 0);
  const withholdingTax = Number(opsSummary?.totalWithholdingTax || 0);
  const totalExpenses = Number(expSummary?.totalExpenses || 0);
  const netProfit = Number(pnlData?.netProfit ?? (grossProfit - totalExpenses));

  return (
    <div className="space-y-6">
      {/* 1. Level 1 - Executive Financial Health Metric Cards */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900">
              {isAr ? 'المؤشرات المالية الرئيسية' : 'Executive Financial Summary'}
            </h2>
            <span className="text-xs text-slate-500 font-medium">({currentMonthLabel})</span>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
          >
            {isAr ? 'عرض تقرير الأرباح وقائمة الدخل (P&L) ←' : 'View P&L Report →'}
          </button>
        </div>

        <div className="accounting-metrics accounting-summary-metrics grid gap-3">
          {/* 1. Total Billing */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-2 text-[11px] font-semibold text-slate-500">
              <span>{isAr ? 'إجمالي المطالبات' : 'Gross Billing'}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {selectedMonth ? `شهر ${selectedMonth}` : 'السنة'}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
              <span className="text-lg font-semibold text-slate-900 font-mono">
                {totalBilling.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-slate-500">ج.م</span>
            </div>
            <span className="text-[10px] text-blue-600 font-bold block mt-1">
              {isAr ? 'شامل خصم 3%' : 'After 3% W/H Tax'}
            </span>
          </div>

          {/* 2. Driver Net Pay */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-2 text-[11px] font-semibold text-slate-500">
              <span>{isAr ? 'مستحقات السائقين' : 'Driver Net Pay'}</span>
              <Users className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
              <span className="text-lg font-semibold text-amber-600 font-mono">
                {netDriverPay.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-slate-500">ج.م</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {isAr ? `إجمالي ${opsSummary?.totalTrips || 0} دورة` : `${opsSummary?.totalTrips || 0} Trips`}
            </span>
          </div>

          {/* 3. Driver Overtime */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-2 text-[11px] font-semibold text-slate-500">
              <span>{isAr ? 'إضافي السائقين' : 'Driver Overtime'}</span>
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
              <span className="text-lg font-semibold text-indigo-600 font-mono">
                {totalOvertime.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-slate-500">ج.م</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {isAr ? 'سهرات ودورات إضافية' : 'Extra shifts'}
            </span>
          </div>

          {/* 4. Gross Direct Profit */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-2 text-[11px] font-semibold text-slate-500">
              <span>{isAr ? 'مجمل الربح التشغيلي' : 'Gross Profit'}</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
              <span className="text-lg font-semibold text-emerald-600 font-mono">
                {grossProfit.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-slate-500">ج.م</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold block mt-1">
              {isAr ? 'هامش التشغيل المباشر' : 'Direct Margin'}
            </span>
          </div>

          {/* 5. Withholding Tax (3%) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-2 text-[11px] font-semibold text-slate-500">
              <span>{isAr ? 'ضريبة الخصم (3%)' : 'W/H Tax (3%)'}</span>
              <Receipt className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
              <span className="text-lg font-semibold text-rose-600 font-mono">
                {withholdingTax.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-slate-500">ج.م</span>
            </div>
            <span className="text-[10px] text-rose-700 font-semibold block mt-1">
              {isAr ? 'خصم وإضافة' : 'Withholding Tax'}
            </span>
          </div>

          {/* 6. Expenses */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-start justify-between gap-2 text-[11px] font-semibold text-slate-500">
              <span>{isAr ? 'المصروفات العامة' : 'General Expenses'}</span>
              <DollarSign className="h-3.5 w-3.5 text-rose-700" />
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-1">
              <span className="text-lg font-semibold text-rose-700 font-mono">
                {totalExpenses.toLocaleString()}
              </span>
              <span className="text-xs font-normal text-slate-500">ج.م</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              {isAr ? 'تشغيل وإدارة ومكتب' : 'Fleet & Overheads'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Hub Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">{isAr ? '⚡ الإجراءات والعمليات السريعة:' : '⚡ Quick Accounting Actions:'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AccountingActionButton
              onClick={onOpenAddOp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isAr ? 'إضافة حركة تشغيل' : 'Add Operation'}</span>
            </AccountingActionButton>

            <AccountingActionButton
              onClick={onOpenClientReceipt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>{isAr ? 'تحصيل من عميل' : 'Client Receipt'}</span>
            </AccountingActionButton>

            <AccountingActionButton
              onClick={onOpenPayDriver}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              <span>{isAr ? 'صرف مستحق سائق' : 'Pay Driver'}</span>
            </AccountingActionButton>

            <AccountingActionButton
              onClick={onOpenAddExpense}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>{isAr ? 'تسجيل مصروف' : 'Add Expense'}</span>
            </AccountingActionButton>

            <AccountingActionButton
              onClick={onOpenStaffPayroll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>{isAr ? 'مسير راتب' : 'Staff Payroll'}</span>
            </AccountingActionButton>
          </div>
        </div>
      </div>

      {treasuryData?.balancesVisible === false && <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{isAr ? 'أرصدة الخزينة والكشوف متاحة للمالك فقط. يمكنك تسجيل التحصيل والصرف حسب صلاحياتك.' : 'Treasury balances and statements are visible only to the owner. You can record receipts and payments according to your permissions.'}</p>}
      {treasuryData?.balancesVisible === true && <>
      {/* 3. Treasury & Bank Liquidity Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-3xl shadow-md border border-slate-700/60 space-y-4">
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex flex-wrap items-center gap-2">
                <span>{isAr ? 'الخزينة والسيولة النقدية والبنوك الحية' : 'Live Treasury & Bank Liquidity'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {isAr ? 'متصل بالبنوك والخزن' : 'Connected'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {isAr
                  ? 'رصيد السيولة الفعلي: يتحرك تلقائياً مع تحصيل العملاء ⬆️ وصرف مستحقات السائقين والموردين والمصروفات ⬇️'
                  : 'Live balances: Automatically updated on client collections and operational payouts'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AccountingActionButton
              onClick={onOpenCreateAccount}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isAr ? 'حساب خزينة جديد' : 'New Account'}</span>
            </AccountingActionButton>

            <AccountingActionButton
              onClick={onOpenTransfer}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-500/30 rounded-xl text-xs font-bold transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>{isAr ? 'تحويل بين الخزن' : 'Transfer'}</span>
            </AccountingActionButton>

            <button
              onClick={() => setShowFlowGuide(!showFlowGuide)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5"
            >
              <span>{showFlowGuide ? (isAr ? 'إخفاء الدليل 🔼' : 'Hide Guide 🔼') : (isAr ? 'خريطة الدورة المالية 🔽' : 'Financial Flow 🔽')}</span>
            </button>
          </div>
        </div>

        {/* 3 Core Liquidity Blocks */}
        <div className="accounting-cards grid gap-3">
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/70 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">{isAr ? '💵 الخزينة النقدية (الكاش)' : 'Cash Vault'}</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block font-mono">
                {(treasuryData?.totals?.cash || 0).toLocaleString()} <span className="text-xs font-normal text-slate-300">ج.م</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'جاهز لصرف رواتب وبدلات السائقين' : 'For cash payouts'}</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-base">
              💵
            </div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/70 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">{isAr ? '🏦 الحسابات البنكية (جاري)' : 'Bank Accounts'}</span>
              <span className="text-lg font-black text-blue-400 mt-0.5 block font-mono">
                {(treasuryData?.totals?.bank || 0).toLocaleString()} <span className="text-xs font-normal text-slate-300">ج.م</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'إيداع تحويلات وشيكات العملاء' : 'Client wire transfers'}</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-base">
              🏦
            </div>
          </div>

          <div className="bg-indigo-950/60 p-3.5 rounded-2xl border border-indigo-500/40 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-indigo-300 block">{isAr ? '💎 إجمالي السيولة المتاحة' : 'Total Liquidity'}</span>
              <span className="text-lg font-black text-white mt-0.5 block font-mono">
                {(treasuryData?.totals?.totalLiquidity || 0).toLocaleString()} <span className="text-xs font-normal text-indigo-200">ج.م</span>
              </span>
              <span className="text-[10px] text-indigo-300/80 block mt-0.5">{isAr ? 'كاش + بنوك = رأس المال الجاهز' : 'Total available operating funds'}</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-base">
              💎
            </div>
          </div>
        </div>

        {/* 🗺️ Collapsible 5-Step Financial Workflow Guide */}
        {showFlowGuide && (
          <div className="pt-3 border-t border-slate-700/60">
            <div className="text-xs font-bold text-indigo-300 mb-2.5 flex items-center gap-1.5">
              <span>{isAr ? '🗺️ خريطة الدورة المالية المبسطة (اضغط على أي خطوة للانتقال لها وتطبيقها):' : '🗺️ Simplified Financial Cycle Map (Click any step to navigate):'}</span>
            </div>

            <div className="accounting-metrics grid gap-2.5">
              {/* Step 1 */}
              <button
                onClick={() => onNavigateTab('operations')}
                className="p-3 rounded-2xl text-right transition-all flex flex-col justify-between bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 text-[11px] font-black text-blue-400 mb-1">
                    <span>1. تشغيل وفواتير اليومية</span>
                    <span>✍️</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    الرحلة بتتسجل هنا ➜ بينزل استحقاق على العميل وخصم ضريبة 3%.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-blue-300 mt-2 block underline">
                  {isAr ? 'فتح اليومية ←' : 'Open Operations →'}
                </span>
              </button>

              {/* Step 2 */}
              <button
                onClick={() => onNavigateTab('operations')}
                className="p-3 rounded-2xl text-right transition-all flex flex-col justify-between bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 text-[11px] font-black text-emerald-400 mb-1">
                    <span>2. تحصيل فلوس العملاء</span>
                    <span>📥</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    العميل لما يدفع ➜ بتسجل "تحصيل" فتزيد فلوسك في البنك/الخزينة.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 mt-2 block underline">
                  {isAr ? 'كشوف وتحصيل العملاء ←' : 'Client Ledgers →'}
                </span>
              </button>

              {/* Step 3 */}
              <button
                onClick={() => onNavigateTab('settlements')}
                className="p-3 rounded-2xl text-right transition-all flex flex-col justify-between bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 text-[11px] font-black text-amber-400 mb-1">
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
                onClick={() => onNavigateTab('suppliers')}
                className="p-3 rounded-2xl text-right transition-all flex flex-col justify-between bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 text-[11px] font-black text-purple-400 mb-1">
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
                onClick={() => onNavigateTab('reports')}
                className="p-3 rounded-2xl text-right transition-all flex flex-col justify-between bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 text-[11px] font-black text-rose-400 mb-1">
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

      {/* 4. Vaults & Bank Accounts Detail Cards */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-black text-slate-900">
              {isAr ? 'حسابات الخزينة والبنوك التفصيلية' : 'Bank & Cash Vault Accounts'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {treasuryData?.accounts?.length || 0} {isAr ? 'حسابات مسجلة' : 'registered accounts'}
          </span>
        </div>

        <div className="accounting-cards grid gap-3.5">
          {treasuryData?.accounts?.map((acc: any) => {
            const isBank = acc.kind === 'BANK';
            const isSelected = selectedAccountIdForStatement === acc.id;

            return (
              <div
                key={acc.id}
                className={`bg-white p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20' : 'border-slate-200/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isBank
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}
                      >
                        {isBank ? '🏦' : '💵'}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-relaxed">{acc.name}</h4>
                        <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                          {isBank ? `بنك: ${acc.bankName || 'حساب بنكي'}` : 'خزينة نقدية (كاش)'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isBank
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isBank ? (isAr ? 'حساب بنكي' : 'Bank') : (isAr ? 'خزينة كاش' : 'Cash Vault')}
                    </span>
                  </div>

                  {acc.reference && (
                    <div className="mt-2.5 text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 flex items-center justify-between gap-3">
                      <span>{isAr ? 'رقم الحساب / المرجع:' : 'Ref / IBAN:'}</span>
                      <span className="font-mono font-bold text-slate-700">{acc.reference}</span>
                    </div>
                  )}

                  {/* Current Balance */}
                  <div className="mt-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'الرصيد الفعلي الحالي:' : 'Current Balance:'}</span>
                    <div className="flex flex-wrap items-baseline gap-1 mt-0.5">
                      <span
                        className={`text-xl font-black font-mono ${
                          acc.currentBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
                        }`}
                      >
                        {Number(acc.currentBalance || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">{acc.currency || 'ج.م'}</span>
                    </div>
                  </div>

                  {/* Inflow vs Outflow */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-xs">
                    <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                      <span className="text-[9px] font-bold text-emerald-700 block">{isAr ? 'الوارد (+)' : 'Inflows (+)'}</span>
                      <span className="font-black text-emerald-800 text-[11px] font-mono">
                        {Number(acc.totalIn || 0).toLocaleString()} ج.م
                      </span>
                    </div>

                    <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                      <span className="text-[9px] font-bold text-rose-700 block">{isAr ? 'المنصرف (-)' : 'Outflows (-)'}</span>
                      <span className="font-black text-rose-800 text-[11px] font-mono">
                        {Number(acc.totalOut || 0).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {acc.transactionCount || 0} {isAr ? 'حركة مسجلة' : 'entries'}
                  </span>

                  <button
                    onClick={() => setSelectedAccountIdForStatement(isSelected ? '' : acc.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isSelected
                      ? isAr
                        ? 'إخفاء كشف الحساب 🔼'
                        : 'Hide Statement 🔼'
                      : isAr
                      ? 'كشف الحركات 📄'
                      : 'Statement 📄'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Statement Viewer Drawer for Selected Account */}
      {selectedAccountIdForStatement && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                📄
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  {isAr ? 'كشف حركات الحساب:' : 'Account Statement:'}{' '}
                  <span className="text-blue-600">
                    {accountStatementData?.account?.name || 'الخزينة المحددة'}
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {accountStatementData?.statement?.length || 0} {isAr ? 'حركة في السجل' : 'entries recorded'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'الرصيد الختامي:' : 'Final Balance:'}</span>
              <span className="text-base font-black text-blue-700 font-mono">
                {Number(accountStatementData?.finalBalance || 0).toLocaleString()} ج.م
              </span>
            </div>
          </div>

          {statementLoading ? (
            <div className="py-8 text-center text-slate-400 font-medium">
              {isAr ? 'جاري تحميل كشف الحساب...' : 'Loading statement...'}
            </div>
          ) : !accountStatementData?.statement || accountStatementData.statement.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              {isAr ? 'لا توجد حركات مسجلة لهذا الحساب بعد' : 'No transactions recorded yet'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 max-h-[400px]">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'نوع الحركة' : 'Type'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'البيان / المرجع' : 'Reference'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'ملاحظات' : 'Notes'}</th>
                    <th className="py-2.5 px-3 text-left">{isAr ? 'الرصيد التراكمي' : 'Running Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {accountStatementData.statement.map((entry: any, idx: number) => {
                    const isIn = entry.kind === 'IN';
                    return (
                      <tr key={entry.id || idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {new Date(entry.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </td>
                        <td className="py-2 px-3">
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
                          className={`py-2 px-3 font-black font-mono ${
                            isIn ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIn ? '+' : '-'}{Number(entry.amount).toLocaleString()} ج.م
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-semibold">{entry.reference || '-'}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{entry.notes || '-'}</td>
                        <td className="py-2 px-3 text-left font-black text-slate-900 font-mono">
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
      </>}
    </div>
  );
};
