import React, { useState } from 'react';
import {
  DollarSign,
  Briefcase,
  Search,
  Plus,
  Trash2,
  TrendingDown,
  Users,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  ExpenseItem,
  StaffPayrollItem,
} from '../../../services/accounting.service';

interface ExpensesPayrollTabProps {
  isAr: boolean;
  selectedMonth?: number;
  selectedYear: number;
  currentMonthLabel: string;
  // Expenses props
  expensesData?: ExpenseItem[];
  expSummary?: any;
  expLoading: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onOpenAddExpense: () => void;
  onDeleteExpense: (id: string) => void;
  // Payroll props
  payrollData?: StaffPayrollItem[];
  payrollLoading: boolean;
  payrollSearch: string;
  setPayrollSearch: (val: string) => void;
  payrollJobFilter: string;
  setPayrollJobFilter: (val: string) => void;
  onOpenAddPayroll: () => void;
  onDeletePayroll: (id: string) => void;
}

export const ExpensesPayrollTab: React.FC<ExpensesPayrollTabProps> = ({
  isAr,
  selectedMonth,
  selectedYear,
  currentMonthLabel,
  expensesData,
  expSummary,
  expLoading,
  searchQuery,
  setSearchQuery,
  onOpenAddExpense,
  onDeleteExpense,
  payrollData,
  payrollLoading,
  payrollSearch,
  setPayrollSearch,
  payrollJobFilter,
  setPayrollJobFilter,
  onOpenAddPayroll,
  onDeletePayroll,
}) => {
  const [subTab, setSubTab] = useState<'expenses' | 'payroll'>('expenses');

  // Payroll Metrics
  const payrolls = (payrollData as StaffPayrollItem[]) || [];
  const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
  const totalBasic = payrolls.reduce((sum, p) => sum + Number(p.basicSalary || 0), 0);
  const totalOT = payrolls.reduce((sum, p) => sum + Number(p.overtime || 0), 0);
  const totalDeduct = payrolls.reduce(
    (sum, p) => sum + Number(p.deductions || 0) + Number(p.advances || 0) + Number(p.penalties || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation Pill Switcher */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSubTab('expenses')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              subTab === 'expenses'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>{isAr ? 'المصروفات العامة والتشغيلية' : 'Operating Expenses'}</span>
            {expensesData && expensesData.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  subTab === 'expenses' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {expensesData.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('payroll')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              subTab === 'payroll'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>{isAr ? 'رواتب ومسيرات الموظفين والإداريين' : 'Staff Payroll & Salaries'}</span>
            {payrolls.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  subTab === 'payroll' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {payrolls.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shrink-0 hidden md:inline-block">
          {currentMonthLabel}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: OPERATING EXPENSES */}
      {/* ========================================================================= */}
      {subTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <span>{isAr ? `إجمالي المصروفات (${currentMonthLabel}):` : `Expenses (${currentMonthLabel}):`}</span>
                <span className="text-rose-600 font-black text-base font-mono">
                  {(expSummary?.totalExpenses || 0).toLocaleString()} ج.م
                </span>
              </div>
            </div>

            <button
              onClick={onOpenAddExpense}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'تسجيل بند مصروف جديد' : 'Add Expense'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
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
                        <td className="py-2.5 px-4 text-left font-black text-rose-600 font-mono">
                          {Number(exp.amount).toLocaleString()} ج.م
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{exp.branch || '-'}</td>
                        <td className="py-2.5 px-4 text-slate-600 font-mono">{exp.vehicleNumber || '-'}</td>
                        <td className="py-2.5 px-4 text-slate-500">{exp.notes || '-'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(isAr ? 'حذف هذا المصروف؟' : 'Delete expense?')) {
                                onDeleteExpense(exp.id);
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: STAFF PAYROLL */}
      {/* ========================================================================= */}
      {subTab === 'payroll' && (
        <div className="space-y-4">
          {/* Payroll KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 block">
                {isAr ? `إجمالي الرواتب المنصرفة (${currentMonthLabel})` : `Disbursed Payroll (${currentMonthLabel})`}
              </span>
              <span className="text-xl font-black text-indigo-700 mt-1 block font-mono">
                {totalNet.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{payrolls.length} مسير راتب مسجل</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 block">إجمالي الأجر الأساسي</span>
              <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                {totalBasic.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">الرواتب الأساسية التعاقدية</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 block">إجمالي الإضافي والبدلات (+)</span>
              <span className="text-xl font-black text-emerald-600 mt-1 block font-mono">
                {totalOT.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">حوافز ومكافآت</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 block">الخصومات والسلف والجزاءات (-)</span>
              <span className="text-xl font-black text-rose-600 mt-1 block font-mono">
                {totalDeduct.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </span>
              <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">إجمالي الاستقطاعات</span>
            </div>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
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
              onClick={onOpenAddPayroll}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'تسجيل وصرف راتب موظف جديد' : 'Add Staff Payroll'}</span>
            </button>
          </div>

          {/* Payroll Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
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
                        {isAr ? `لا توجد مسيرات رواتب مسجلة في ${currentMonthLabel}` : `No payroll records found for ${currentMonthLabel}`}
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
                          <td className="py-2.5 px-4 text-left font-semibold text-slate-700 font-mono">
                            {Number(p.basicSalary || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-left font-bold text-emerald-600 font-mono">
                            {Number(p.overtime || 0) > 0 ? `+${Number(p.overtime).toLocaleString()}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-left font-medium text-rose-600 font-mono">
                            {Number(p.deductions || 0) > 0 ? `-${Number(p.deductions).toLocaleString()}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-left font-medium text-amber-600 font-mono">
                            {Number(p.advances || 0) > 0 ? `-${Number(p.advances).toLocaleString()}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-left font-medium text-rose-700 font-mono">
                            {Number(p.penalties || 0) > 0 ? `-${Number(p.penalties).toLocaleString()}` : '0'}
                          </td>
                          <td className="py-2.5 px-4 text-left font-black text-indigo-700 bg-indigo-50/50 font-mono">
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
                                  onDeletePayroll(p.id);
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
    </div>
  );
};
