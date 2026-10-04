import React, { useState } from 'react';
import {
  Truck,
  Building2,
  CheckCircle2,
  Clock,
  Check,
  Search,
  Plus,
  Printer,
  Wallet,
  Calendar,
  Car,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';
import {
  SupplierTransactionItem,
  InstallmentItem,
} from '../../../services/accounting.service';

interface SuppliersFleetTabProps {
  isAr: boolean;
  selectedMonth?: number;
  selectedYear: number;
  currentMonthLabel: string;
  // Supplier props
  suppliersSummary?: any[];
  supplierLedgerData?: SupplierTransactionItem[];
  supLedgerLoading: boolean;
  selectedSupplier: string;
  setSelectedSupplier: (val: string) => void;
  onOpenSupplierInvoice: (supplierName?: string) => void;
  onOpenSupplierTx: () => void;
  onOpenSupplierPay: (supplierName?: string) => void;
  // Fleet & Installment props
  selectedVehiclePlate: string;
  setSelectedVehiclePlate: (val: string) => void;
  vehicleSearch: string;
  setVehicleSearch: (val: string) => void;
  dbVehicles?: any[];
  vehicleEconData?: any;
  vehicleEconLoading: boolean;
  installmentsData?: InstallmentItem[];
  instLoading: boolean;
  instSummary?: any;
  onOpenAddInstallment: () => void;
  onToggleInstallmentStatus: (id: string, currentStatus: string) => void;
}

export const SuppliersFleetTab: React.FC<SuppliersFleetTabProps> = ({
  isAr,
  selectedMonth,
  selectedYear,
  currentMonthLabel,
  suppliersSummary,
  supplierLedgerData,
  supLedgerLoading,
  selectedSupplier,
  setSelectedSupplier,
  onOpenSupplierInvoice,
  onOpenSupplierTx,
  onOpenSupplierPay,
  selectedVehiclePlate,
  setSelectedVehiclePlate,
  vehicleSearch,
  setVehicleSearch,
  dbVehicles,
  vehicleEconData,
  vehicleEconLoading,
  installmentsData,
  instLoading,
  instSummary,
  onOpenAddInstallment,
  onToggleInstallmentStatus,
}) => {
  const [subTab, setSubTab] = useState<'suppliers' | 'fleet_economics'>('suppliers');

  return (
    <div className="space-y-4">
      {/* Sub-tab Pill Switcher */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSubTab('suppliers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              subTab === 'suppliers'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>{isAr ? 'كشوف حساب وسداد الموردين والشركاء' : 'Supplier Ledgers & Payables'}</span>
            {suppliersSummary && suppliersSummary.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  subTab === 'suppliers' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {suppliersSummary.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('fleet_economics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
              subTab === 'fleet_economics'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isAr ? 'أقساط وعوائد مركبات الشركة ومراكز التكلفة' : 'Fleet Asset Economics & Installments'}</span>
            {vehicleEconData?.items && vehicleEconData.items.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  subTab === 'fleet_economics' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {vehicleEconData.items.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 shrink-0 hidden md:inline-block">
          {currentMonthLabel}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: SUPPLIERS LEDGERS & PAYABLES */}
      {/* ========================================================================= */}
      {subTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Supplier Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {suppliersSummary && suppliersSummary.length > 0 ? (
              suppliersSummary.map((s: any) => {
                const balanceVal = Number(s.balance ?? 0);
                const isSelected = selectedSupplier === s.supplierName;

                return (
                  <div
                    key={s.supplierName}
                    onClick={() => setSelectedSupplier(isSelected ? '' : s.supplierName)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all shadow-2xs hover:shadow-xs ${
                      isSelected
                        ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/30'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-black text-slate-900 block truncate">{s.supplierName}</span>
                    <div className="mt-2 space-y-0.5 text-[11px]">
                      <div className="flex justify-between text-slate-500">
                        <span>{isAr ? 'فواتير له:' : 'Payable:'}</span>
                        <span className="font-semibold text-purple-800 font-mono">{Number(s.totalCredit || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>{isAr ? 'مسدد له:' : 'Paid:'}</span>
                        <span className="font-semibold text-emerald-600 font-mono">{Number(s.totalDebit || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-1 font-bold">
                        <span>{isAr ? 'المتبقي له:' : 'Balance:'}</span>
                        <span className={`font-mono ${balanceVal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {balanceVal.toLocaleString()} ج.م
                        </span>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSupplierInvoice(s.supplierName);
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

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                {isAr
                  ? `كشف حساب المورد: ${selectedSupplier || 'جميع الموردين والشركاء'}`
                  : `Supplier Ledger: ${selectedSupplier || 'All Suppliers'}`}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAr
                  ? 'متابعة استحقاقات إيجار سيارات الموردين، السدادات النقدية والبنكية، والرصيد المتبقي'
                  : 'Track supplier payables, disbursements, and outstanding balances'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onOpenSupplierInvoice(selectedSupplier)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>{isAr ? '🖨️ فاتورة ومطالبة المورد' : 'Supplier Invoice'}</span>
              </button>
              <button
                onClick={onOpenSupplierTx}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إضافة قيد / مطالبة' : 'Add Bill'}</span>
              </button>
              <button
                onClick={() => onOpenSupplierPay(selectedSupplier)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
              >
                <Wallet className="h-4 w-4" />
                <span>{isAr ? 'صرف دفعة للمورد' : 'Pay Supplier'}</span>
              </button>
            </div>
          </div>

          {/* Supplier Statement Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
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
                        <td className="py-2.5 px-4 text-slate-600 font-mono">{tx.documentNumber || '-'}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{tx.description}</td>
                        <td className="py-2.5 px-4 text-left font-bold text-purple-700 font-mono">
                          {Number(tx.credit || 0) > 0 ? Number(tx.credit).toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-left font-bold text-emerald-600 font-mono">
                          {Number(tx.debit || 0) > 0 ? Number(tx.debit).toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-left font-black text-slate-900 font-mono">
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

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: FLEET ASSET ECONOMICS & INSTALLMENTS */}
      {/* ========================================================================= */}
      {subTab === 'fleet_economics' && (
        <div className="space-y-6">
          {/* Top Control Bar & Vehicle Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                  🚗
                </span>
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 block">
                    {isAr ? 'أقساط وعوائد سيارات الشركة ومراكز التكلفة' : 'Vehicle Unit Economics & Installments'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isAr
                      ? 'متابعة أرباح ومصاريف وأقساط كل سيارة على حدة وعوائد الأسطول'
                      : 'Track unit economics, profits, costs and bank installments per vehicle'}
                  </span>
                </div>
              </div>

              {/* Dynamic Vehicle Selector */}
              {(() => {
                const compV = (dbVehicles || []).filter((v: any) => !v.supplierId && !v.supplier);
                const supV = (dbVehicles || []).filter((v: any) => !!(v.supplierId || v.supplier));
                return (
                  <select
                    value={selectedVehiclePlate}
                    onChange={(e) => setSelectedVehiclePlate(e.target.value)}
                    className="py-1.5 px-3 text-xs font-bold bg-purple-50/70 border border-purple-200 text-purple-900 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 max-w-xs"
                  >
                    <option value="">{isAr ? '🚗 جميع المركبات (أسطول وموردين)' : '🚗 All Fleet Vehicles'}</option>
                    <optgroup label={isAr ? `🏢 أسطول الشركة الداخلي (${compV.length} مركبة)` : 'Company Fleet'}>
                      {compV.map((v: any) => (
                        <option key={v.id || v.plateNumber} value={v.plateNumber}>
                          {v.plateNumber} - {v.make} {v.model} {v.assignedDriver ? `(${v.assignedDriver.fullName})` : ''}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={isAr ? `🚚 سيارات الموردين والشركاء (${supV.length} مركبة)` : 'Supplier Vehicles'}>
                      {supV.map((v: any) => (
                        <option key={v.id || v.plateNumber} value={v.plateNumber}>
                          {v.plateNumber} - {v.make} {v.model} [مورد: {v.supplier?.name || 'شريك'}]
                        </option>
                      ))}
                    </optgroup>
                  </select>
                );
              })()}

              {/* Instant Search */}
              <div className="relative">
                <Search className="h-4 w-4 absolute rtl:right-3 ltr:left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث باللوحة، الموديل، السائق...' : 'Search plate, driver...'}
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="rtl:pr-9 ltr:pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 w-52"
                />
              </div>

              {selectedVehiclePlate && (
                <button
                  onClick={() => setSelectedVehiclePlate('')}
                  className="text-[11px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>✕</span>
                  <span>{isAr ? 'إلغاء فلترة السيارة' : 'Clear Filter'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddInstallment}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إضافة قسط جديد' : 'Add Installment'}</span>
              </button>
            </div>
          </div>

          {/* Selected Vehicle Deep-Dive Dashboard */}
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
                      <p className="text-xs text-slate-300 font-medium mt-1 flex flex-wrap items-center gap-3">
                        <span>👤 السائق: <strong>{currentV.driverName || 'بدون سائق ثابت'}</strong></span>
                        {currentV.driverPhone && <span>📞 {currentV.driverPhone}</span>}
                        <span>🏷️ نوع المركبة: {currentV.vehicleType || '-'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedVehiclePlate('')}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors"
                  >
                    {isAr ? 'عرض كل الأسطول ✕' : 'View All Fleet ✕'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/70">
                    <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'الرحلات المنفذة' : 'Completed Trips'}</span>
                    <span className="text-lg font-black text-white mt-0.5 block font-mono">{currentV.totalTrips || 0}</span>
                    <span className="text-[10px] text-slate-400">{isAr ? 'خلال الفترة' : 'In period'}</span>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/70">
                    <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'إيرادات الرحلات' : 'Gross Revenue'}</span>
                    <span className="text-lg font-black text-blue-300 mt-0.5 block font-mono">
                      {Number(currentV.grossRevenue || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                    <span className="text-[10px] text-blue-400 font-medium">{isAr ? 'فواتير العملاء' : 'From billing'}</span>
                  </div>

                  <div className="bg-purple-900/40 p-3 rounded-2xl border border-purple-500/40">
                    <span className="text-[10px] font-bold text-purple-300 block">{isAr ? 'عوائد إيجار الأسطول' : 'Allocated Rental'}</span>
                    <span className="text-lg font-black text-purple-200 mt-0.5 block font-mono">
                      {Number(currentV.totalVehicleCostAllocated || currentV.vehicleDirectCost || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                    <span className="text-[10px] text-purple-300/80">{isAr ? 'عوائد الرحلات للقسط' : 'For installment'}</span>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/70">
                    <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'صيانة ومصروفات' : 'Maintenance & Fuel'}</span>
                    <span className="text-lg font-black text-rose-300 mt-0.5 block font-mono">
                      {Number(currentV.totalExpenses || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                    <span className="text-[10px] text-rose-400 font-medium font-mono">
                      {isAr ? `صيانة: ${Number(currentV.maintenanceCosts || 0).toLocaleString()} ج.م` : ''}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/70">
                    <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'أقساط مسددة' : 'Installments Paid'}</span>
                    <span className="text-lg font-black text-amber-300 mt-0.5 block font-mono">
                      {Number(currentV.totalInstallmentsPaid || 0).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium font-mono">
                      {isAr ? `متبقي: ${Number(currentV.totalInstallmentsPending || 0).toLocaleString()} ج.م` : ''}
                    </span>
                  </div>

                  <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-500/40">
                    <span className="text-[10px] font-bold text-emerald-300 block">{isAr ? 'صافي الفائض والأرباح' : 'Net Surplus / ROI'}</span>
                    <span className="text-lg font-black text-emerald-400 mt-0.5 block font-mono">
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

          {/* Segmented Fleet Economics KPIs */}
          {(() => {
            const allItems = vehicleEconData?.items || [];
            const compVehicles = allItems.filter((v: any) => v.isCompanyVehicle);
            const supVehicles = allItems.filter((v: any) => !v.isCompanyVehicle);

            const compTrips = compVehicles.reduce((sum: number, v: any) => sum + Number(v.totalTrips || 0), 0);
            const compRental = compVehicles.reduce((sum: number, v: any) => sum + Number(v.totalVehicleCostAllocated || v.vehicleDirectCost || 0), 0);

            const supTrips = supVehicles.reduce((sum: number, v: any) => sum + Number(v.totalTrips || 0), 0);
            const supCost = supVehicles.reduce((sum: number, v: any) => sum + Number(v.totalVehicleCostAllocated || v.vehicleDirectCost || 0), 0);

            const totalTripsAll = compTrips + supTrips;
            const totalVehiclesCostAll = compRental + supCost;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* 1. Company Fleet Rental Income */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 font-medium block">
                    {isAr ? 'عوائد إيجار أسطول الشركة (الداخلي)' : 'Company Fleet Rental Income'}
                  </span>
                  <span className="text-lg font-black text-purple-700 mt-1 block font-mono">
                    {compRental.toLocaleString()} ج.م
                  </span>
                  <span className="text-[11px] text-purple-600 font-bold block mt-0.5">
                    {isAr ? `رحلات أسطول الشركة: ${compTrips} رحلة (${compVehicles.length} مركبة)` : `${compTrips} trips`}
                  </span>
                </div>

                {/* 2. Supplier Fleet Costs */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 font-medium block">
                    {isAr ? 'تكلفة تشغيل سيارات الموردين (الشركاء)' : 'Supplier Fleet Operating Cost'}
                  </span>
                  <span className="text-lg font-black text-rose-700 mt-1 block font-mono">
                    {supCost.toLocaleString()} ج.م
                  </span>
                  <span className="text-[11px] text-rose-600 font-bold block mt-0.5">
                    {isAr ? `رحلات الموردين: ${supTrips} رحلة (${supVehicles.length} مركبة)` : `${supTrips} trips`}
                  </span>
                </div>

                {/* 3. Combined Total Vehicle Costs */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 font-medium block">
                    {isAr ? 'إجمالي تكلفة وتشغيل الحافلات' : 'Total Vehicles Operating Cost'}
                  </span>
                  <span className="text-lg font-black text-slate-900 mt-1 block font-mono">
                    {totalVehiclesCostAll.toLocaleString()} ج.م
                  </span>
                  <span className="text-[11px] text-slate-600 font-bold block mt-0.5">
                    {isAr ? `إجمالي كافة الرحلات: ${totalTripsAll} رحلة (${allItems.length} مركبة)` : `${totalTripsAll} trips`}
                  </span>
                </div>

                {/* 4. Installments Status */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs text-slate-500 font-medium block">
                    {isAr ? 'الأقساط البنكية المستحقة' : 'Pending Installments'}
                  </span>
                  <span className="text-lg font-black text-amber-600 mt-1 block font-mono">
                    {(instSummary?.totalPending || 0).toLocaleString()} ج.م
                  </span>
                  <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                    {isAr ? `مسدد: ${(instSummary?.totalPaid || 0).toLocaleString()} ج.م (${instSummary?.paidCount || 0} قسط)` : ''}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Fleet Unit Economics Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? '📊 سجل أداء وإيجارات مركبات الشركة (سداد الأقساط من عوائد الرحلات)' : 'Vehicle Fleet Unit Economics'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isAr
                    ? 'اضغط على أي مركبة لاستعراض أرباحها ومصاريفها وأقساطها ومؤشراتها المالية بالكامل'
                    : 'Click any vehicle to view its profit, costs, installments and KPIs'}
                </p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">
                {isAr ? `عدد المركبات: ${vehicleEconData?.items?.length || 0}` : `Vehicles: ${vehicleEconData?.items?.length || 0}`}
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
                          <td className="py-2.5 px-4 text-left font-black text-purple-700 font-mono">
                            {Number(v.totalVehicleCostAllocated ?? v.vehicleDirectCost ?? 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-2.5 px-4 text-left font-semibold text-rose-600 font-mono">
                            {Number(v.totalExpenses ?? (Number(v.maintenanceCosts || 0) + Number(v.otherExpenses || 0))).toLocaleString()} ج.م
                          </td>
                          <td className="py-2.5 px-4 text-left font-semibold text-amber-700 font-mono">
                            {Number(v.totalInstallmentsPaid ?? v.totalInstallments ?? 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-2.5 px-4 text-left font-black font-mono">
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
                              {isSelected ? (isAr ? 'إلغاء التحديد' : 'Deselect') : (isAr ? '🔍 تحليل' : 'Analyze')}
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

          {/* Bank Installments Schedule Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  {isAr ? '📑 جدول استحقاقات وسداد الأقساط البنكية' : 'Bank Installments Schedule'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedVehiclePlate
                    ? (isAr ? `عرض الأقساط الخاصة بالمركبة: ${selectedVehiclePlate}` : `Installments for: ${selectedVehiclePlate}`)
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
                        <td className="py-2.5 px-4 text-left font-black text-rose-600 font-mono">
                          {Number(inst.bankAmount).toLocaleString()} ج.م
                        </td>
                        <td className="py-2.5 px-4 text-left font-bold text-slate-900 font-mono">
                          {inst.clientAmount ? `${Number(inst.clientAmount).toLocaleString()} ج.م` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-left font-bold text-emerald-600 font-mono">
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
                              onToggleInstallmentStatus(
                                inst.id,
                                inst.status === 'PAID' || inst.status === 'تم الدفع' ? 'PENDING' : 'PAID'
                              )
                            }
                            className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          >
                            {inst.status === 'PAID' || inst.status === 'تم الدفع'
                              ? isAr
                                ? 'تحويل لمستحق'
                                : 'Mark Pending'
                              : isAr
                              ? 'تسجيل كسداد'
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
    </div>
  );
};
