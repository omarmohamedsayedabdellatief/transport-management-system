import { AccountingActionButton } from './AccountingActionButton';
import React, { useState } from "react";
import {
  Users,
  Search,
  Wallet,
  Download,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";
import { DriverSettlementItem, InstallmentItem } from "../../../services/accounting.service";

interface DriverSettlementsTabProps {
  isAr: boolean;
  selectedMonth?: number;
  selectedYear: number;
  currentMonthLabel: string;
  settlementsData?: DriverSettlementItem[];
  setLoading: boolean;
  settlementSearch: string;
  setSettlementSearch: (val: string) => void;
  settlementStatusFilter: "ALL" | "PENDING" | "PAID";
  setSettlementStatusFilter: (val: "ALL" | "PENDING" | "PAID") => void;
  selectedCompany: string;
  setSelectedCompany: (val: string) => void;
  dbClients?: any[];
  onOpenPayDriverModal: (driverName?: string, netPayable?: number) => void;
  onOpenDeductDriverModal: (driverName?: string) => void;
  onDownloadSettlements: () => void;
  onCollectInstallment: (row: InstallmentItem) => void;
}

export const DriverSettlementsTab: React.FC<DriverSettlementsTabProps> = ({
  isAr,
  selectedMonth,
  selectedYear,
  currentMonthLabel,
  settlementsData,
  setLoading,
  settlementSearch,
  setSettlementSearch,
  settlementStatusFilter,
  setSettlementStatusFilter,
  selectedCompany,
  setSelectedCompany,
  dbClients,
  onOpenPayDriverModal,
  onDownloadSettlements,
  onOpenDeductDriverModal,
  onCollectInstallment,
}) => {
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  const filteredSettlements = (settlementsData || []).filter(
    (st: DriverSettlementItem) => {
      if (settlementSearch) {
        const q = settlementSearch.toLowerCase();
        if (
          !st.driverName.toLowerCase().includes(q) &&
          !(st.companyName || "").toLowerCase().includes(q) &&
          !(st.branch || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (settlementStatusFilter !== "ALL") {
        const isPaid = st.status === "PAID";
        if (settlementStatusFilter === "PAID" && !isPaid) return false;
        if (settlementStatusFilter === "PENDING" && isPaid) return false;
      }
      return true;
    },
  );

  const totalPendingPayout = filteredSettlements
    .filter((s) => s.status !== "PAID")
    .reduce((sum, s) => sum + Number(s.netPayable || 0), 0);

  const totalPaidPayout = filteredSettlements.reduce(
    (sum, s) => sum + Number(s.totalPaid || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
        <h2 className="font-bold text-blue-950">
          {isAr
            ? "أجر الدورات ودفعات السائقين"
            : "Driver trip earnings and payments"}
        </h2>
        <p className="text-sm">
          {isAr
            ? "المتبقي = أجر الدورات + الإضافي − الخصومات − السلف − الدفعات المصروفة − الأقساط المخصومة من المستحقات."
            : "Remaining = trip earnings + overtime − deductions − advances − payments − installment offsets."}
        </p>
        <div className="flex flex-wrap gap-2">
          <AccountingActionButton
            disabled={!selectedMonth || setLoading}
            onClick={() => onOpenPayDriverModal()}
            className="ops-btn primary disabled:opacity-50"
          >
            {isAr ? "صرف دفعة للسائق" : "Pay driver installment"}
          </AccountingActionButton>
          <AccountingActionButton
            disabled={!selectedMonth || setLoading}
            onClick={() => onOpenDeductDriverModal()}
            className="ops-btn disabled:opacity-50"
          >
            {isAr ? "إضافة خصم للسائق" : "Add driver deduction"}
          </AccountingActionButton>
        </div>
        {!selectedMonth && (
          <p className="text-amber-800">
            {isAr
              ? "اختر شهرًا محددًا لتسجيل خصم أو صرف دفعة."
              : "Select a month to record a deduction or payment."}
          </p>
        )}
      </div>
      {/* Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">
            {isAr ? "إجمالي المستحقات المعلقة (لم تصرف)" : "Pending Payouts"}
          </span>
          <span className="text-xl font-black text-amber-600 mt-1 block font-mono">
            {totalPendingPayout.toLocaleString()}{" "}
            <span className="text-xs font-normal">ج.م</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {filteredSettlements.filter((s) => s.status !== "PAID").length}{" "}
            {isAr ? "سائقين قيد الصرف" : "drivers pending"}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">
            {isAr ? "إجمالي الدفعات المصروفة" : "Completed Payouts"}
          </span>
          <span className="text-xl font-black text-emerald-600 mt-1 block font-mono">
            {totalPaidPayout.toLocaleString()}{" "}
            <span className="text-xs font-normal">ج.م</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {filteredSettlements.filter((s) => Number(s.totalPaid || 0) > 0).length}{" "}
            {isAr ? "سائقين تم صرفهم" : "drivers paid"}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">
            {isAr ? "إجمالي السائقين بالسجل" : "Total Driver Count"}
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
            {filteredSettlements.length}{" "}
            <span className="text-xs font-normal">
              {isAr ? "سائق" : "drivers"}
            </span>
          </span>
          <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
            {currentMonthLabel}
          </span>
        </div>
      </div>

      {/* Top Filter & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Driver */}
          <div className="relative">
            <Search className="h-4 w-4 absolute rtl:right-3 ltr:left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={
                isAr
                  ? "بحث باسم السائق أو الشركة..."
                  : "Search driver or company..."
              }
              value={settlementSearch}
              onChange={(e) => setSettlementSearch(e.target.value)}
              className="rtl:pr-9 ltr:pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
            <span>{isAr ? "حالة الصرف:" : "Status:"}</span>
            <select
              value={settlementStatusFilter}
              onChange={(e) => setSettlementStatusFilter(e.target.value as any)}
              className="bg-transparent font-bold text-blue-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">
                {isAr ? "كافة الحالات (الكل)" : "All Statuses"}
              </option>
              <option value="PENDING">
                {isAr ? "⏳ معلق (لم يصرف)" : "Pending"}
              </option>
              <option value="PAID">{isAr ? "✅ تم الصرف" : "Paid"}</option>
            </select>
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
            <span>{isAr ? "الشركة:" : "Company:"}</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-transparent font-bold text-blue-700 focus:outline-hidden cursor-pointer max-w-[150px] truncate"
            >
              <option value="">
                {isAr ? "جميع الشركات" : "All Companies"}
              </option>
              {dbClients?.map((c: any) => (
                <option key={c.id || c.companyName} value={c.companyName}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 hidden sm:inline-block">
            {currentMonthLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadSettlements}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isAr ? "تصدير إكسل" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">السائق</th>
                <th className="py-3 px-4">الشركة والموقع</th>
                <th className="py-3 px-4">الفرع</th>
                <th className="py-3 px-4 text-center">إجمالي الدورات</th>
                <th className="py-3 px-4 text-left">أجر الدورات</th>
                <th className="py-3 px-4 text-left">إضافي (+)</th>
                <th className="py-3 px-4 text-left">خصومات (-)</th>
                <th className="py-3 px-4 text-left">سلف (-)</th>
                <th className="py-3 px-4 text-left">الدفعات المصروفة</th>
                <th className="py-3 px-4 text-left">أقساط مخصومة (-)</th>
                <th className="py-3 px-4 text-left bg-amber-50/50">
                  المتبقي للسائق
                </th>
                <th className="py-3 px-4 text-center">حالة الصرف</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {setLoading ? (
                <tr>
                  <td
                    colSpan={13}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    {isAr
                      ? "جاري حساب كشوف المستحقات..."
                      : "Calculating settlements..."}
                  </td>
                </tr>
              ) : filteredSettlements.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    {isAr
                      ? `لا توجد مستحقات مسجلة في ${currentMonthLabel}`
                      : "No settlements found"}
                  </td>
                </tr>
              ) : (
                filteredSettlements.map(
                  (st: DriverSettlementItem, idx: number) => {
                    const isPaid = st.status === "PAID";
                    return (
                      <React.Fragment key={st.driverName}>
                        <tr className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{st.driverName}</span>
                              {st.driverCode && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  #{st.driverCode}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-blue-700">
                            {st.companyName}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">
                            {st.branch}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                            {st.totalTrips}
                          </td>
                          <td className="py-2.5 px-4 text-left font-semibold text-slate-700 font-mono">
                            {Number(st.totalBasePay || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-left font-bold text-emerald-600 font-mono">
                            {Number(st.totalOvertime || 0) > 0
                              ? `+${Number(st.totalOvertime).toLocaleString()}`
                              : "0"}
                          </td>
                          <td className="py-2.5 px-4 text-left font-medium text-rose-600 font-mono">
                            {Number(st.totalDeductions || 0) > 0
                              ? `-${Number(st.totalDeductions).toLocaleString()}`
                              : "0"}
                          </td>
                          <td className="py-2.5 px-4 text-left font-medium text-amber-600 font-mono">
                            {Number(st.totalAdvances || 0) > 0
                              ? `-${Number(st.totalAdvances).toLocaleString()}`
                              : "0"}
                          </td>
                          <td className="py-2.5 px-4 text-left font-mono text-emerald-700">
                            {Number(st.totalPaid || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-left font-mono text-rose-700">{Number(st.totalInstallmentOffsets || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-left font-black text-amber-700 bg-amber-50/50 font-mono">
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
                                <span>
                                  {st.status === "PARTIAL"
                                    ? "صرف جزئي"
                                    : "معلق"}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {isPaid ? (
                              <span className="text-[11px] text-slate-400 font-medium">
                                مسدد بالكامل
                              </span>
                            ) : (
                              <AccountingActionButton
                                disabled={!selectedMonth}
                                onClick={() =>
                                  onOpenPayDriverModal(
                                    st.driverName,
                                    Number(st.netPayable || 0),
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-colors"
                              >
                                <Wallet className="h-3 w-3" />
                                <span>صرف دفعة</span>
                              </AccountingActionButton>
                            )}
                            {!isPaid && (
                              <AccountingActionButton
                                disabled={!selectedMonth}
                                onClick={() =>
                                  onOpenDeductDriverModal(st.driverName)
                                }
                                className="ops-btn mt-2"
                              >
                                {isAr ? "إضافة خصم" : "Deduct"}
                              </AccountingActionButton>
                            )}
                            <button
                              onClick={() =>
                                setExpandedDriver(
                                  expandedDriver === st.driverName
                                    ? null
                                    : st.driverName,
                                )
                              }
                              aria-expanded={expandedDriver === st.driverName}
                              className="ops-btn mt-2"
                            >
                              {isAr
                                ? "سجل الدفعات والخصومات"
                                : "Payments and deductions"}
                            </button>
                          </td>
                        </tr>
                        {!!st.installments?.length && <tr><td colSpan={13} className="bg-emerald-50/50 p-4">
                          <strong>{isAr ? 'أقساط السيارات المستحقة على السائق' : 'Vehicle installments due from driver'}: {Number(st.driverInstallmentRemaining || 0).toLocaleString()} EGP</strong>
                          <div className="mt-2 flex flex-wrap gap-3">{st.installments.map(inst => <div key={inst.id} className="border rounded-xl p-3 bg-white">
                            <p>{inst.vehiclePlate} — #{inst.installmentNumber} · {inst.driverDueDate?.slice(0, 10)}</p>
                            <p>{isAr ? 'القسط / المحصّل / المتبقي' : 'Due / settled / remaining'}: {Number(inst.driverAmount).toLocaleString()} / {Number(inst.driverSettled).toLocaleString()} / {Number(inst.driverRemaining).toLocaleString()} EGP</p>
                            <AccountingActionButton className="ops-btn mt-2" disabled={inst.driverRemaining <= 0} onClick={() => onCollectInstallment(inst)}>{isAr ? 'تحصيل / خصم القسط' : 'Collect / offset installment'}</AccountingActionButton>
                          </div>)}</div>
                          <p className="text-xs mt-2">{isAr ? 'المبلغ المستحق على السائق لا يُخصم من أجره إلا عند تسجيل خصم القسط. التحصيل النقدي لا يقلل أجر الدورات.' : 'Only a recorded offset reduces wages. Cash collection does not reduce trip earnings.'}</p>
                        </td></tr>}
                        {expandedDriver === st.driverName && (
                          <tr>
                            <td colSpan={13} className="p-4 bg-slate-50">
                              <strong>
                                {isAr
                                  ? "سجل الدفعات والخصومات"
                                  : "Payments and deductions"}{" "}
                                — {st.driverName}
                              </strong>
                              {!st.entries?.length ? (
                                <p className="mt-2">
                                  {isAr
                                    ? "لا توجد حركات مستقلة لهذه الفترة. السلف والخصومات القديمة تظهر ضمن يوميات التشغيل."
                                    : "No separate entries this period. Existing operational adjustments remain in daily operations."}
                                </p>
                              ) : (
                                <ul className="mt-3 space-y-2">
                                  {st.entries.map((e) => (
                                    <li
                                      key={e.id}
                                      className="flex flex-wrap gap-3 border-b pb-2"
                                    >
                                      <span>{e.date.slice(0, 10)}</span>
                                      <strong>
                                        {e.kind === "PAYMENT"
                                          ? isAr
                                            ? "صرف دفعة"
                                            : "Payment"
                                          : e.kind === "INSTALLMENT_OFFSET"
                                            ? (isAr ? "خصم قسط سيارة" : "Vehicle installment offset")
                                            : isAr ? "خصم" : "Deduction"}
                                      </strong>
                                      <span>
                                        {Number(e.amount).toLocaleString()} EGP
                                      </span>
                                      <span>{e.reference}</span>
                                      {e.notes && <span>{e.notes}</span>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  },
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
