import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { MONTH_NAMES_AR, MONTH_NAMES_EN } from './AccountingHeader';

interface ReportsPnLTabProps {
  isAr: boolean;
  selectedMonth?: number;
  selectedYear: number;
  currentMonthLabel: string;
  pnlData?: any;
  pnlLoading: boolean;
  monthlyBreakdown?: any;
  onSelectMonthForOps: (m: number) => void;
}

export const ReportsPnLTab: React.FC<ReportsPnLTabProps> = ({
  isAr,
  selectedMonth,
  selectedYear,
  currentMonthLabel,
  pnlData,
  pnlLoading,
  monthlyBreakdown,
  onSelectMonthForOps,
}) => {
  const [subTab, setSubTab] = useState<'pnl' | 'comparison'>('pnl');

  return (
    <div className="space-y-4">
      {/* Sub-tab Pill Switcher */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSubTab('pnl')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              subTab === 'pnl'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>{isAr ? 'قائمة الدخل والأرباح (P&L)' : 'Income Statement (P&L)'}</span>
          </button>

          <button
            onClick={() => setSubTab('comparison')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              subTab === 'comparison'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>{isAr ? 'جدول مقارنة الشهور الـ 12' : '12-Month Comparison'}</span>
          </button>
        </div>

        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shrink-0 hidden md:inline-block">
          {currentMonthLabel}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: INCOME STATEMENT (P&L) */}
      {/* ========================================================================= */}
      {subTab === 'pnl' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
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
                      <span className="font-bold font-mono">{Number(pnlData?.revenues?.grossBilling ?? pnlData?.revenue?.grossBilling ?? 0).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>{isAr ? '(-) ضريبة الخصم والإضافة 3%' : '(-) Withholding Tax (3%):'}</span>
                      <span className="font-bold font-mono">
                        -{Number(pnlData?.revenues?.withholdingTaxDeducted ?? pnlData?.revenue?.withholdingTax ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                      <span>{isAr ? 'صافي إيرادات التشغيل (Net Client Revenue)' : 'Net Operating Revenue:'}</span>
                      <span className="text-blue-700 font-mono">
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
                      <span className="font-bold font-mono">
                        {Number(pnlData?.directCosts?.driverPayAndOvertime ?? pnlData?.costs?.totalDriverPayouts ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                    {Number(pnlData?.directCosts?.driverOvertime ?? pnlData?.costs?.driverOvertime ?? 0) > 0 && (
                      <div className="flex justify-between text-emerald-600 text-[11px]">
                        <span>{isAr ? '  ↳ منها سهرات وإضافي دورات' : '  ↳ Of which Overtime/Extra Shifts:'}</span>
                        <span className="font-bold font-mono">
                          +{Number(pnlData?.directCosts?.driverOvertime ?? pnlData?.costs?.driverOvertime ?? 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700">
                      <span>{isAr ? 'تكاليف تشغيل وإيجار أسطول السيارات المباشرة' : 'Vehicle Direct Costs:'}</span>
                      <span className="font-bold font-mono">
                        {Number(pnlData?.directCosts?.vehicleDirectOperatingCosts ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                      <span>{isAr ? 'مجمل الربح التشغيلي المباشر (Gross Operating Profit)' : 'Gross Operating Margin:'}</span>
                      <span className="text-emerald-700 font-mono">
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
                            <span className="font-semibold text-slate-800 font-mono">
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
                            <span className="font-semibold text-slate-800 font-mono">
                              {Number(amt || 0).toLocaleString()} ج.م
                            </span>
                          </div>
                        ))
                    ) : null}

                    {Number(pnlData?.indirectExpenses?.staffPayroll ?? pnlData?.expenses?.staffPayroll ?? 0) > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>{isAr ? 'رواتب الموظفين والإدارة' : 'Staff Payroll:'}</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {Number(pnlData?.indirectExpenses?.staffPayroll ?? pnlData?.expenses?.staffPayroll ?? 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    )}

                    {Number(pnlData?.indirectExpenses?.fleetMaintenance ?? pnlData?.expenses?.fleetMaintenance ?? 0) > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>{isAr ? 'صيانة وإصلاح أسطول المركبات' : 'Fleet Maintenance:'}</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {Number(pnlData?.indirectExpenses?.fleetMaintenance ?? pnlData?.expenses?.fleetMaintenance ?? 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    )}

                    {Number(pnlData?.indirectExpenses?.vehicleInstallments ?? pnlData?.expenses?.vehicleInstallments ?? 0) > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>{isAr ? 'أقساط السيارات المسددة' : 'Vehicle Installments Paid:'}</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {Number(pnlData?.indirectExpenses?.vehicleInstallments ?? pnlData?.expenses?.vehicleInstallments ?? 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                      <span>{isAr ? 'إجمالي المصروفات غير المباشرة' : 'Total Indirect Expenses:'}</span>
                      <span className="text-rose-600 font-mono">
                        {Number(pnlData?.indirectExpenses?.totalIndirectExpenses ?? pnlData?.expenses?.totalExpenses ?? 0).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Net Profit / Loss Banner & Diagnostic Box */}
                {(() => {
                  const netProfitVal = Number(pnlData?.netProfit || 0);
                  const isLoss = netProfitVal < 0;
                  const absLoss = Math.abs(netProfitVal);

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
                                {isAr ? '⚠️ تنبيه: عجز وخسارة مالية للفترة' : '⚠️ Deficit Alert'}
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
                              {netProfitVal.toLocaleString()}
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

                      {/* Deficit Root-Cause Diagnostic (When in Deficit) */}
                      {isLoss && (
                        <div className="bg-rose-50/80 border-2 border-rose-200 rounded-3xl p-5 space-y-4 shadow-2xs text-xs">
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

                          {/* Expense Breakdown Hotspots */}
                          <div>
                            <span className="font-bold text-slate-700 block mb-2">
                              {isAr ? 'توزيع مراكز النفقات والتكاليف لهذا الشهر:' : 'Monthly Expense Allocation Breakdown:'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                              <div className="p-3 bg-white border border-rose-200 rounded-2xl space-y-1">
                                <span className="text-[11px] text-slate-500 font-semibold block">🏦 أقساط السيارات</span>
                                <span className="text-sm font-black text-rose-700 font-mono block">
                                  {installments.toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {totalIndirect > 0 ? `${Math.round((installments / totalIndirect) * 100)}% من المصروفات` : '0%'}
                                </span>
                              </div>

                              <div className="p-3 bg-white border border-rose-200 rounded-2xl space-y-1">
                                <span className="text-[11px] text-slate-500 font-semibold block">🔧 صيانة وإصلاح الأسطول</span>
                                <span className="text-sm font-black text-amber-700 font-mono block">
                                  {maintenance.toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {totalIndirect > 0 ? `${Math.round((maintenance / totalIndirect) * 100)}% من المصروفات` : '0%'}
                                </span>
                              </div>

                              <div className="p-3 bg-white border border-rose-200 rounded-2xl space-y-1">
                                <span className="text-[11px] text-slate-500 font-semibold block">👥 رواتب الموظفين والإدارة</span>
                                <span className="text-sm font-black text-slate-800 font-mono block">
                                  {payroll.toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {totalIndirect > 0 ? `${Math.round((payroll / totalIndirect) * 100)}% من المصروفات` : '0%'}
                                </span>
                              </div>

                              <div className="p-3 bg-white border border-rose-200 rounded-2xl space-y-1">
                                <span className="text-[11px] text-slate-500 font-semibold block">👨‍✈️ أجور وبدلات السائقين</span>
                                <span className="text-sm font-black text-slate-800 font-mono block">
                                  {driverCosts.toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {netRev > 0 ? `${Math.round((driverCosts / netRev) * 100)}% من الإيراد` : '0%'}
                                </span>
                              </div>

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

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: 12-MONTH COMPARATIVE TABLE */}
      {/* ========================================================================= */}
      {subTab === 'comparison' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
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
                    const netProfitVal = Number(m.netProfit || 0);

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
                        <td className="py-3 px-3 text-center font-semibold font-mono">
                          {opsCount > 0 ? `${opsCount}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold font-mono">
                          {tripsCount > 0 ? `${tripsCount}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-semibold font-mono">
                          {grossBill > 0 ? `${grossBill.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left text-rose-600 font-mono">
                          {whTax > 0 ? `${whTax.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-semibold text-blue-700 font-mono">
                          {netBill > 0 ? `${netBill.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-semibold text-amber-600 font-mono">
                          {driverPay > 0 ? `${driverPay.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-emerald-600 font-mono">
                          {grossMargin > 0 ? `${grossMargin.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-medium text-rose-600 font-mono">
                          {expenses > 0 ? `${expenses.toLocaleString()}` : '-'}
                        </td>
                        <td
                          className={`py-3 px-4 text-left font-black ${
                            hasActivity && netProfitVal < 0
                              ? 'text-rose-700 bg-rose-50/80 font-mono font-bold'
                              : 'text-emerald-700 bg-emerald-50/40'
                          }`}
                        >
                          {hasActivity ? (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <span>{netProfitVal < 0 ? '📉' : '📈'}</span>
                              <span>{netProfitVal.toLocaleString()} ج.م</span>
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {hasActivity && (
                            <button
                              onClick={() => onSelectMonthForOps(m.month)}
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
                      <td className="py-3.5 px-3 text-center text-blue-300 font-mono">
                        {Number(monthlyBreakdown.total.operationsCount ?? monthlyBreakdown.total.trips ?? 0)}
                      </td>
                      <td className="py-3.5 px-3 text-center text-blue-300 font-mono">
                        {Number(monthlyBreakdown.total.tripsCount ?? monthlyBreakdown.total.trips ?? 0)}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono">
                        {Number(monthlyBreakdown.total.grossBilling || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-rose-300 font-mono">
                        {Number(monthlyBreakdown.total.withholdingTax || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-blue-300 font-mono">
                        {Number(monthlyBreakdown.total.netClientBilling || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-amber-300 font-mono">
                        {Number(monthlyBreakdown.total.totalDriverPayouts ?? monthlyBreakdown.total.driverCosts ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-emerald-300 font-mono">
                        {Number(monthlyBreakdown.total.grossOperatingMargin ?? monthlyBreakdown.total.grossProfit ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-left text-rose-300 font-mono">
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
    </div>
  );
};
