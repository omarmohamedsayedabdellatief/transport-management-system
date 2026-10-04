import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { accountingApi } from '../../services/accounting.service';

let activeModalLockCount = 0;

/** Safe Hook with reference-counting to lock background scrolling while modal is open and guarantee 100% clean release on close */
export const useLockBodyScroll = (isOpen: boolean) => {
  useEffect(() => {
    if (isOpen) {
      activeModalLockCount++;
      if (activeModalLockCount === 1) {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        activeModalLockCount = Math.max(0, activeModalLockCount - 1);
        if (activeModalLockCount === 0) {
          document.body.style.overflow = '';
          const scrollContainers = document.querySelectorAll<HTMLElement>('.ops-main-scroll, #workspace');
          scrollContainers.forEach((el) => {
            el.style.overflow = '';
          });
        }
      };
    }
  }, [isOpen]);
};

/** Portal wrapper to ensure modals render in viewport at document.body */
export const ModalPortal: React.FC<{
  isOpen: boolean;
  children: React.ReactNode;
}> = ({ isOpen, children }) => {
  useLockBodyScroll(isOpen);
  if (!isOpen || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// =========================================================================
// 1. ADD OPERATION MODAL
// =========================================================================
export const AddOperationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  defaultMonth?: number;
  defaultYear?: number;
  dbClients?: any[];
  dbDrivers?: any[];
  dbRoutes?: any[];
  dbVehicles?: any[];
  dbSuppliers?: any[];
}> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  isAr,
  defaultMonth = new Date().getMonth() + 1,
  defaultYear = new Date().getFullYear(),
  dbClients = [],
  dbDrivers = [],
  dbRoutes = [],
  dbVehicles = [],
  dbSuppliers = [],
}) => {
  const [executionType, setExecutionType] = useState<'COMPANY' | 'SUPPLIER'>('COMPANY');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isCustomRoute, setIsCustomRoute] = useState(false);

  const [form, setForm] = useState({
    day: new Date().getDate(),
    month: defaultMonth,
    year: defaultYear,
    executionType: 'COMPANY',
    supplierId: '',
    supplierName: '',
    driverName: '',
    driverId: '',
    routeName: '',
    companyName: '',
    branch: '',
    vehicleType: '',
    vehiclePlate: '',
    dailyRate: 1500,
    tripCount: 1,
    driverDailyRate: 350,
    vehicleCost: 200,
    advancePayment: 0,
    deduction: 0,
    overtime: 0,
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({
        ...prev,
        day: new Date().getDate(),
        month: defaultMonth,
        year: defaultYear,
      }));
    }
  }, [isOpen, defaultMonth, defaultYear]);

  // Filtered lists based on execution type
  const companyDrivers = dbDrivers.filter((d: any) => !d.supplierId && !d.isSupplier && !d.supplier);
  const supplierDrivers = dbDrivers.filter((d: any) => {
    if (!selectedSupplierId) return !!(d.supplierId || d.isSupplier || d.supplier);
    return d.supplierId === selectedSupplierId || d.supplier?.id === selectedSupplierId;
  });

  const companyVehicles = dbVehicles.filter((v: any) => !v.supplierId && !v.supplier);
  const supplierVehicles = dbVehicles.filter((v: any) => {
    if (!selectedSupplierId) return !!(v.supplierId || v.supplier);
    return v.supplierId === selectedSupplierId || v.supplier?.id === selectedSupplierId;
  });

  // Client routes
  const selectedClient = dbClients.find((c: any) => c.companyName === form.companyName);
  const clientRoutes = dbRoutes.filter((r: any) => {
    if (!form.companyName) return true;
    if (selectedClient && r.clientId === selectedClient.id) return true;
    return r.client?.companyName === form.companyName || r.companyName === form.companyName;
  });

  // Handle Switching Execution Type
  const handleExecutionTypeChange = (type: 'COMPANY' | 'SUPPLIER') => {
    setExecutionType(type);
    setSelectedDriverId('');
    setSelectedSupplierId('');

    if (type === 'COMPANY') {
      setForm((prev) => ({
        ...prev,
        executionType: 'COMPANY',
        supplierId: '',
        supplierName: '',
        driverName: '',
        driverId: '',
        vehiclePlate: '',
        vehicleType: '',
        driverDailyRate: 350,
        vehicleCost: 200,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        executionType: 'SUPPLIER',
        supplierId: '',
        supplierName: '',
        driverName: '',
        driverId: '',
        vehiclePlate: '',
        vehicleType: '',
        driverDailyRate: 0,
        vehicleCost: 1000,
      }));
    }
  };

  // Handle Company Driver Selection
  const handleCompanyDriverSelect = (driverIdOrName: string) => {
    setSelectedDriverId(driverIdOrName);
    const driver = dbDrivers.find((d: any) => d.id === driverIdOrName || d.fullName === driverIdOrName);

    if (driver) {
      // Find assigned vehicle
      const vehicle =
        driver.assignedVehicle ||
        dbVehicles.find(
          (v: any) =>
            v.id === driver.assignedVehicleId ||
            v.plateNumber === driver.assignedVehicle?.plateNumber ||
            v.assignedDriver?.id === driver.id
        );

      const vPlate = vehicle?.plateNumber || driver.vehiclePlate || '';
      const vType = vehicle ? [vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.vehicleType || '' : driver.vehicleType || '';
      const vCost = vehicle?.costPerTrip ? Number(vehicle.costPerTrip) : 200;
      const dRate = driver.dailyRate ? Number(driver.dailyRate) : driver.tripAllowance ? Number(driver.tripAllowance) : 350;

      setForm((prev) => ({
        ...prev,
        driverName: driver.fullName,
        driverId: driver.id,
        vehiclePlate: vPlate,
        vehicleType: vType,
        driverDailyRate: dRate,
        vehicleCost: vCost,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        driverName: driverIdOrName,
      }));
    }
  };

  // Handle Supplier Selection
  const handleSupplierSelect = (supIdOrName: string) => {
    setSelectedSupplierId(supIdOrName);
    const supplier = dbSuppliers.find((s: any) => s.id === supIdOrName || s.name === supIdOrName);

    if (supplier) {
      setForm((prev) => ({
        ...prev,
        supplierId: supplier.id,
        supplierName: supplier.name,
        driverDailyRate: 0,
        vehicleCost: supplier.costPerTrip ? Number(supplier.costPerTrip) : prev.vehicleCost || 1000,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        supplierName: supIdOrName,
        supplierId: '',
        driverDailyRate: 0,
      }));
    }
  };

  // Handle Route Selection
  const handleRouteSelect = (routeName: string) => {
    const route = dbRoutes.find((r: any) => r.routeName === routeName);
    if (route) {
      const clientPrice = Number(route.clientPricePerTrip || route.clientPricePerDay || form.dailyRate || 1500);
      const branchLoc = route.startLocation || form.branch;
      setForm((prev) => ({
        ...prev,
        routeName: route.routeName,
        dailyRate: clientPrice,
        branch: branchLoc,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        routeName,
      }));
    }
  };

  // Financial Calculations Preview
  const baseClientAmount = (Number(form.dailyRate) || 0) * (Number(form.tripCount) || 1);
  const taxAmount = baseClientAmount * 0.03;
  const netClientAmount = baseClientAmount - taxAmount;

  const totalDriverCost =
    (Number(form.driverDailyRate) || 0) * (Number(form.tripCount) || 1) +
    (Number(form.overtime) || 0) -
    (Number(form.advancePayment) || 0) -
    (Number(form.deduction) || 0);

  const totalVehicleCost = (Number(form.vehicleCost) || 0) * (Number(form.tripCount) || 1);
  const estimatedProfit = netClientAmount - totalDriverCost - totalVehicleCost;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">⚡</span>
              {isAr ? 'إضافة حركة تشغيل يومية / رحلة إضافية' : 'Add Daily Operation / Ad-hoc Trip'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? 'إضافة تشغيلة سريعة وتسميعها المباشر في الحسابات والأرباح والعملاء والموردين'
                : 'Instantly adds trip and syncs client, supplier & driver accounts'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* 1. Execution Type Toggle (نوع التنفيذ والتشغيل) */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
          <label className="text-xs font-bold text-slate-800 block">
            {isAr ? 'جهة التنفيذ والتشغيل (ديناميكي) *' : 'Execution Fleet Type *'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleExecutionTypeChange('COMPANY')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                executionType === 'COMPANY'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>🏢</span>
              <span>{isAr ? 'أسطول الشركة الداخلي' : 'Company Fleet'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecutionTypeChange('SUPPLIER')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                executionType === 'SUPPLIER'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>🚚</span>
              <span>{isAr ? 'مورد خارجي / شريك' : 'External Supplier'}</span>
            </button>
          </div>
        </div>

        {/* 2. Supplier Selector (Visible ONLY when executionType === 'SUPPLIER') */}
        {executionType === 'SUPPLIER' && (
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
            <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <span>🚚</span>
              <span>{isAr ? 'اختر المورد الخارجي / الشريك *' : 'Select External Supplier *'}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="w-full border border-purple-300 rounded-xl px-3 py-2 text-xs font-bold bg-white text-purple-900 focus:ring-2 focus:ring-purple-400"
                  required
                >
                  <option value="">{isAr ? '-- اختر المورد من القائمة --' : '-- Select Supplier --'}</option>
                  {dbSuppliers.map((s: any) => (
                    <option key={s.id || s.name} value={s.id}>
                      {s.name} {s.contactName ? `(${s.contactName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="text"
                  placeholder={isAr ? 'أو اكتب اسم مورد مخصص...' : 'Or custom supplier name...'}
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value, supplierId: '' })}
                  className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs font-medium bg-white"
                />
              </div>
            </div>
            <p className="text-[11px] text-purple-700 font-medium">
              💡 {isAr ? 'سيتم قيد تكلفة السيارة تلقائياً كمستحق للمورد في كشف حسابه بدون احتساب أجر لسائقي أسطول الشركة.' : 'Cost will be credited to supplier account.'}
            </p>
          </div>
        )}

        {/* 3. Main Form Grid */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {/* Day / Month / Year */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">{isAr ? 'اليوم' : 'Day'}</label>
            <input
              type="number"
              min="1"
              max="31"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-center"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">{isAr ? 'الشهر' : 'Month'}</label>
            <input
              type="number"
              min="1"
              max="12"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-center"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">{isAr ? 'السنة' : 'Year'}</label>
            <input
              type="number"
              min="2020"
              max="2035"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-center font-mono"
            />
          </div>

          {/* Client Selection */}
          <div className="col-span-3">
            <label className="font-bold text-slate-700 block mb-1">
              {isAr ? 'الشركة / العميل *' : 'Client / Company *'}
            </label>
            <select
              value={form.companyName}
              onChange={(e) => {
                const cName = e.target.value;
                setForm((prev) => ({ ...prev, companyName: cName }));
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-slate-50 focus:bg-white"
              required
            >
              <option value="">{isAr ? '-- اختر الشركة المتعاقدة --' : '-- Select Company --'}</option>
              {dbClients.map((c: any) => (
                <option key={c.id || c.companyName} value={c.companyName}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Driver Selection (Dynamic) */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">
                {executionType === 'COMPANY'
                  ? isAr ? 'سائق الشركة (يتم سحب مركبته تلقائياً) *' : 'Company Driver (Auto-loads vehicle) *'
                  : isAr ? 'سائق المورد الخارجي *' : 'Supplier Driver *'}
              </label>
              {executionType === 'COMPANY' && form.vehiclePlate && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  🚗 {form.vehiclePlate} ({form.vehicleType || 'مركبة معتمدة'})
                </span>
              )}
            </div>

            {executionType === 'COMPANY' ? (
              <div className="space-y-1.5">
                <select
                  value={selectedDriverId}
                  onChange={(e) => handleCompanyDriverSelect(e.target.value)}
                  className="w-full border border-blue-200 rounded-xl px-3 py-2 font-bold text-slate-900 bg-blue-50/40 focus:bg-white"
                  required
                >
                  <option value="">{isAr ? '-- اختر سائق من أسطول الشركة --' : '-- Select Company Driver --'}</option>
                  {companyDrivers.map((d: any) => {
                    const plate = d.assignedVehicle?.plateNumber || d.vehiclePlate || '';
                    return (
                      <option key={d.id} value={d.id}>
                        {d.fullName} {plate ? `[لوحة: ${plate}]` : '[بدون مركبة مثبتة]'}
                      </option>
                    );
                  })}
                </select>
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>أو كتابة اسم يدوي:</span>
                  <input
                    type="text"
                    placeholder="كتابة اسم سائق مخصص..."
                    value={form.driverName}
                    onChange={(e) => {
                      setSelectedDriverId('');
                      setForm({ ...form, driverName: e.target.value });
                    }}
                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-2/3"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {supplierDrivers.length > 0 && (
                  <select
                    value={form.driverName}
                    onChange={(e) => {
                      const d = supplierDrivers.find((drv: any) => drv.fullName === e.target.value || drv.id === e.target.value);
                      if (d) {
                        setForm({
                          ...form,
                          driverName: d.fullName,
                          vehiclePlate: d.assignedVehicle?.plateNumber || form.vehiclePlate,
                          vehicleType: d.assignedVehicle ? `${d.assignedVehicle.make} ${d.assignedVehicle.model || ''}` : form.vehicleType,
                        });
                      } else {
                        setForm({ ...form, driverName: e.target.value });
                      }
                    }}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 font-bold text-purple-900 bg-purple-50/40 focus:bg-white"
                  >
                    <option value="">{isAr ? '-- اختر سائق المورد (إن وجد بقاعدة البيانات) --' : '-- Select Supplier Driver --'}</option>
                    {supplierDrivers.map((d: any) => (
                      <option key={d.id} value={d.fullName}>
                        {d.fullName}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  placeholder={isAr ? 'اسم سائق المورد (مثال: محمد الشريك)' : 'Supplier driver name'}
                  value={form.driverName}
                  onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  required
                />
              </div>
            )}
          </div>

          {/* Route Selection */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">{isAr ? 'خط السير / الرحلة *' : 'Route Name *'}</label>
              <button
                type="button"
                onClick={() => setIsCustomRoute(!isCustomRoute)}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                {isCustomRoute ? (isAr ? '← اختيار من خطوط العميل' : '← Pick from list') : (isAr ? '+ خط إضافي مخصص' : '+ Custom route')}
              </button>
            </div>

            {!isCustomRoute && clientRoutes.length > 0 ? (
              <select
                value={form.routeName}
                onChange={(e) => handleRouteSelect(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
                required
              >
                <option value="">{isAr ? '-- اختر الخط --' : '-- Select Route --'}</option>
                {clientRoutes.map((r: any) => (
                  <option key={r.id || r.routeName} value={r.routeName}>
                    {r.routeName} {r.clientPricePerTrip ? `(${Number(r.clientPricePerTrip).toLocaleString()} ج.م)` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder={isAr ? 'مثال: خط أكتوبر وردية إضافية' : 'Route name'}
                value={form.routeName}
                onChange={(e) => setForm({ ...form, routeName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                required
              />
            )}
          </div>

          {/* Vehicle Info */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">{isAr ? 'رقم اللوحة' : 'Plate Number'}</label>
            {executionType === 'COMPANY' ? (
              <input
                type="text"
                list="op-vehicles-datalist"
                placeholder="أ ب ج 1234"
                value={form.vehiclePlate}
                onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold"
              />
            ) : (
              <div className="space-y-1">
                {supplierVehicles.length > 0 ? (
                  <select
                    value={form.vehiclePlate}
                    onChange={(e) => {
                      const v = supplierVehicles.find((veh: any) => veh.plateNumber === e.target.value);
                      if (v) {
                        setForm({
                          ...form,
                          vehiclePlate: v.plateNumber,
                          vehicleType: [v.make, v.model].filter(Boolean).join(' ') || v.vehicleType || '',
                        });
                      } else {
                        setForm({ ...form, vehiclePlate: e.target.value });
                      }
                    }}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 font-mono font-bold text-xs"
                  >
                    <option value="">{isAr ? '-- مركبة من مركبات المورد --' : '-- Supplier Vehicle --'}</option>
                    {supplierVehicles.map((v: any) => (
                      <option key={v.id} value={v.plateNumber}>
                        {v.plateNumber} ({v.make || ''} {v.model || ''})
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  type="text"
                  placeholder="رقم لوحة مركبة المورد"
                  value={form.vehiclePlate}
                  onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono"
                />
              </div>
            )}
            <datalist id="op-vehicles-datalist">
              {companyVehicles.map((v: any) => (
                <option key={v.id} value={v.plateNumber} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">{isAr ? 'نوع وموديل السيارة' : 'Vehicle Model'}</label>
            <input
              type="text"
              placeholder="تويوتا هاى اس / باص 28"
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>

          {/* Pricing & Financial Rates */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">{isAr ? 'سعر اليومية للعميل (ج.م)' : 'Client Price (EGP)'}</label>
            <input
              type="number"
              min="0"
              value={form.dailyRate}
              onChange={(e) => setForm({ ...form, dailyRate: Number(e.target.value) })}
              className="w-full border border-blue-300 rounded-xl px-3 py-2 font-black text-blue-700 bg-blue-50/30"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">{isAr ? 'عدد الدورات / الورديات' : 'Trip Count'}</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={form.tripCount}
              onChange={(e) => setForm({ ...form, tripCount: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isAr ? 'أجر/يومية السائق (ج.م)' : 'Driver Allowance'}
              {executionType === 'SUPPLIER' && (
                <span className="text-[10px] text-purple-600 mr-1 font-normal">(مورد: 0 ج.م)</span>
              )}
            </label>
            <input
              type="number"
              min="0"
              disabled={executionType === 'SUPPLIER'}
              value={form.driverDailyRate}
              onChange={(e) => setForm({ ...form, driverDailyRate: Number(e.target.value) })}
              className={`w-full border rounded-xl px-3 py-2 font-bold ${
                executionType === 'SUPPLIER'
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'border-amber-300 text-amber-800 bg-amber-50/30'
              }`}
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {executionType === 'SUPPLIER'
                ? isAr ? 'مستحقات المورد عن الرحلة (ج.م) *' : 'Supplier Trip Cost *'
                : isAr ? 'تكلفة تشغيل السيارة (ج.م)' : 'Vehicle Cost (EGP)'}
            </label>
            <input
              type="number"
              min="0"
              value={form.vehicleCost}
              onChange={(e) => setForm({ ...form, vehicleCost: Number(e.target.value) })}
              className={`w-full border rounded-xl px-3 py-2 font-black ${
                executionType === 'SUPPLIER'
                  ? 'border-purple-300 text-purple-700 bg-purple-50/40'
                  : 'border-slate-200 text-slate-800'
              }`}
            />
          </div>

          {/* Advances / Deductions / Overtime */}
          <div className="col-span-2">
            <label className="font-bold text-slate-700 block mb-1">{isAr ? 'سلف / خصومات / إضافي السائق' : 'Advances / Deductions / Overtime'}</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  placeholder="سلف"
                  value={form.advancePayment || ''}
                  onChange={(e) => setForm({ ...form, advancePayment: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-center text-rose-600 font-bold"
                />
                <span className="text-[10px] text-slate-400 block text-center mt-0.5">سلفية</span>
              </div>
              <div>
                <input
                  type="number"
                  placeholder="خصم"
                  value={form.deduction || ''}
                  onChange={(e) => setForm({ ...form, deduction: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-center text-rose-600 font-bold"
                />
                <span className="text-[10px] text-slate-400 block text-center mt-0.5">خصومات</span>
              </div>
              <div>
                <input
                  type="number"
                  placeholder="إضافي"
                  value={form.overtime || ''}
                  onChange={(e) => setForm({ ...form, overtime: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-2 py-1.5 text-center text-emerald-600 font-bold"
                />
                <span className="text-[10px] text-slate-400 block text-center mt-0.5">إضافي</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Live Calculation & Profit Preview Banner */}
        <div className="p-3 bg-slate-900 text-white rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold border-b border-slate-800 pb-2">
            <span>ملخص الأثر المالي المباشر للتشغيلة:</span>
            <span className="text-slate-400 font-mono">ضريبة الخصم: {taxAmount.toLocaleString()} ج.م (3%)</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-[10px] text-slate-400 block">إيراد العميل</span>
              <span className="font-bold text-blue-400">{netClientAmount.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl">
              <span className="text-[10px] text-slate-400 block">التكاليف المباشرة</span>
              <span className="font-bold text-rose-400">{(totalDriverCost + totalVehicleCost).toLocaleString()} ج.م</span>
            </div>
            <div className={`p-2 rounded-xl border ${estimatedProfit >= 0 ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' : 'bg-rose-950/60 border-rose-500/40 text-rose-400'}`}>
              <span className="text-[10px] block opacity-80">صافي الربح</span>
              <span className="font-black text-sm">{estimatedProfit.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.driverName || !form.routeName || !form.companyName}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-600/20"
          >
            {isPending ? (isAr ? 'جاري الحفظ والتسميع...' : 'Saving...') : (isAr ? 'حفظ وتسميع التشغيلة 🚀' : 'Save Operation')}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 2. ADD OVERTIME MODAL
// =========================================================================
export const AddOvertimeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  defaultMonth?: number;
  defaultYear?: number;
  dbDrivers?: any[];
  dbRoutes?: any[];
}> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  isAr,
  defaultMonth = new Date().getMonth() + 1,
  defaultYear = new Date().getFullYear(),
  dbDrivers = [],
  dbRoutes = [],
}) => {
  const [form, setForm] = useState({
    dayOfWeek: 'السبت',
    date: new Date().toISOString().split('T')[0],
    driverName: '',
    vehicleType: '',
    routeName: '',
    shiftDescription: 'سهرة',
    shiftsCount: 1,
    shiftRate: 300,
    branch: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      let defaultDate = now.toISOString().split('T')[0];
      if (defaultYear && defaultMonth && (defaultYear !== curYear || defaultMonth !== curMonth)) {
        const mStr = String(defaultMonth).padStart(2, '0');
        defaultDate = `${defaultYear}-${mStr}-01`;
      }
      setForm((prev) => ({
        ...prev,
        date: defaultDate,
      }));
    }
  }, [isOpen, defaultMonth, defaultYear]);

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
          {isAr ? 'إضافة سهرة أو إضافي سائق' : 'Add Driver Overtime'}
        </h3>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">اليوم</label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="السبت">السبت</option>
                <option value="الأحد">الأحد</option>
                <option value="الاثنين">الاثنين</option>
                <option value="الثلاثاء">الثلاثاء</option>
                <option value="الأربعاء">الأربعاء</option>
                <option value="الخميس">الخميس</option>
                <option value="الجمعة">الجمعة</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">التاريخ</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">اسم السائق</label>
            <input
              type="text"
              list="ot-drivers-datalist"
              placeholder="مثال: حاتم شعبان"
              value={form.driverName}
              onChange={(e) => setForm({ ...form, driverName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              required
            />
            <datalist id="ot-drivers-datalist">
              {dbDrivers.map((d: any) => (
                <option key={d.id} value={d.fullName} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم الخط</label>
              <input
                type="text"
                list="ot-routes-datalist"
                placeholder="مثال: المرج / أكتوبر"
                value={form.routeName}
                onChange={(e) => setForm({ ...form, routeName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
                required
              />
              <datalist id="ot-routes-datalist">
                {dbRoutes.map((r: any) => (
                  <option key={r.id} value={r.routeName} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">الفرع</label>
              <input
                type="text"
                placeholder="اكتوبر / ابورواش"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">وصف الدورة</label>
              <select
                value={form.shiftDescription}
                onChange={(e) => setForm({ ...form, shiftDescription: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              >
                <option value="سهرة">سهرة</option>
                <option value="1 ورديه">1 ورديه</option>
                <option value="ورديه ونصف">ورديه ونصف</option>
                <option value="ورديتين">ورديتين</option>
                <option value="ورديتين ونصف">ورديتين ونصف</option>
                <option value="3 ورديات">3 ورديات</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">عدد الدورات</label>
              <input
                type="number"
                step="0.5"
                value={form.shiftsCount}
                onChange={(e) => setForm({ ...form, shiftsCount: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">قيمة الإضافي (ج.م)</label>
            <input
              type="number"
              value={form.shiftRate}
              onChange={(e) => setForm({ ...form, shiftRate: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-black text-emerald-600"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات ومواعيد الورديات</label>
            <input
              type="text"
              placeholder="مثال: حضور 8 ص وانصراف 4 م"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.driverName}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ الإضافي'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 3. ADD EXPENSE MODAL
// =========================================================================
export const AddExpenseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  defaultMonth?: number;
  defaultYear?: number;
  treasuryAccounts?: any[];
  dbVehicles?: any[];
}> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  isAr,
  defaultMonth = new Date().getMonth() + 1,
  defaultYear = new Date().getFullYear(),
  treasuryAccounts = [],
  dbVehicles = [],
}) => {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'سولار ووقود',
    amount: 500,
    branch: '',
    vehicleNumber: '',
    accountId: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      let defaultDate = now.toISOString().split('T')[0];
      if (defaultYear && defaultMonth && (defaultYear !== curYear || defaultMonth !== curMonth)) {
        const mStr = String(defaultMonth).padStart(2, '0');
        defaultDate = `${defaultYear}-${mStr}-01`;
      }
      setForm((prev) => ({
        ...prev,
        date: defaultDate,
      }));
    }
  }, [isOpen, defaultMonth, defaultYear]);

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
          {isAr ? 'تسجيل بند مصروف جديد مع الخصم من الخزينة' : 'Add Expense & Pay from Treasury'}
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">التاريخ</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">البيان والتصنيف</label>
            <input
              type="text"
              placeholder="مثال: استهلاك سولار سيارة / صيانة فلاتر"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">المبلغ المنصروف (ج.م)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-black text-rose-600 text-sm"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">الصرف من الخزينة / الحساب البنكي (اختياري)</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-blue-700"
            >
              <option value="">{isAr ? '-- بدون خصم من الخزينة --' : '-- No Treasury deduction --'}</option>
              {treasuryAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (الرصيد: {Number(acc.currentBalance || 0).toLocaleString()} ج.م)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">الفرع أو الخط</label>
              <input
                type="text"
                placeholder="المنيب / اكتوبر"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم لوحة المركبة</label>
              <input
                type="text"
                list="exp-vehicles-datalist"
                placeholder="أ ب ج 1234"
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono"
              />
              <datalist id="exp-vehicles-datalist">
                {dbVehicles.map((v: any) => (
                  <option key={v.id} value={v.plateNumber} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              placeholder="أية تفاصيل تخص السند"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.category || !form.amount}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {isPending ? 'جاري الحفظ...' : 'تسجيل المصروف'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 4. CLIENT RECEIPT MODAL
// =========================================================================
export const ClientReceiptModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  dbClients?: any[];
  clientsSummary?: any;
  treasuryAccounts?: any[];
  initialData?: any;
}> = React.memo(({ isOpen, onClose, onSubmit, isPending, isAr, dbClients = [], clientsSummary, treasuryAccounts = [], initialData }) => {
  const [form, setForm] = useState({
    companyName: initialData?.companyName || '',
    amount: initialData?.amount || 0,
    accountId: initialData?.accountId || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    reference: initialData?.reference || '',
    notes: initialData?.notes || '',
    maxDueBalance: initialData?.maxDueBalance || 0,
  });

  useEffect(() => {
    if (isOpen) {
      const initCompany = initialData?.companyName || '';
      let due = Number(initialData?.maxDueBalance || 0);
      if (!due && initCompany && clientsSummary) {
        const clientInfo = Array.isArray(clientsSummary)
          ? clientsSummary.find((c: any) => c.companyName === initCompany)
          : clientsSummary?.clients?.find((c: any) => c.companyName === initCompany);
        due = Number(clientInfo?.currentBalance ?? clientInfo?.balance ?? 0);
      }
      const defaultAcc = treasuryAccounts.find((a: any) => a.kind === 'BANK')?.id || treasuryAccounts[0]?.id || '';
      setForm({
        companyName: initCompany,
        amount: initialData?.amount ? Number(initialData.amount) : (due > 0 ? due : 0),
        accountId: initialData?.accountId || defaultAcc,
        date: initialData?.date || new Date().toISOString().split('T')[0],
        reference: initialData?.reference || (initCompany ? `تحصيل مستحقات فواتير شركة ${initCompany}` : ''),
        notes: initialData?.notes || '',
        maxDueBalance: due,
      });
    }
  }, [isOpen, initialData, clientsSummary, treasuryAccounts]);

  const companyOptions = Array.from(
    new Set([
      ...(form.companyName ? [form.companyName] : []),
      ...dbClients.map((c: any) => c.companyName || c.name).filter(Boolean),
      ...(Array.isArray(clientsSummary)
        ? clientsSummary.map((c: any) => c.companyName).filter(Boolean)
        : (clientsSummary?.clients || []).map((c: any) => c.companyName).filter(Boolean)),
    ])
  );

  const selectedClientSum = Array.isArray(clientsSummary)
    ? clientsSummary.find((c: any) => c.companyName === form.companyName)
    : clientsSummary?.clients?.find((c: any) => c.companyName === form.companyName);
  const clientOutstanding = selectedClientSum
    ? Number(selectedClientSum.currentBalance ?? selectedClientSum.balance ?? 0)
    : Number(form.maxDueBalance || 0);

  const amountNum = Number(form.amount || 0);
  const isOverDue = Boolean(form.companyName && clientOutstanding > 0 && amountNum > clientOutstanding);
  const isZeroOrNegativeDue = Boolean(form.companyName && clientOutstanding <= 0);
  const hasValidationErrors = !form.companyName || !form.accountId || amountNum <= 0 || isOverDue || isZeroOrNegativeDue;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm">💵</span>
              {isAr ? 'تسجيل تحصيل وسداد وإيداع بالخزينة / البنك' : 'Record Client Receipt & Treasury Deposit'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isAr ? 'يتم إيداع المبلغ في الخزينة/البنك وخصمه فوراً من مديونية كشف حساب العميل' : 'Deposits funds into treasury/bank and settles client ledger balance'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {form.companyName && (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🏢</span>
                <div>
                  <span className="text-[11px] font-bold text-blue-700 block">الشركة / العميل المحدد للتحصيل:</span>
                  <span className="text-sm font-black text-slate-900">{form.companyName}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-blue-600 text-white px-2.5 py-1 rounded-lg shadow-xs">
                محدد تلقائياً ✓
              </span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">الشركة / العميل *</label>
            <select
              value={form.companyName}
              onChange={(e) => {
                const cName = e.target.value;
                const clientInfo = Array.isArray(clientsSummary)
                  ? clientsSummary.find((c: any) => c.companyName === cName)
                  : clientsSummary?.clients?.find((c: any) => c.companyName === cName);
                const due = Number(clientInfo?.currentBalance ?? clientInfo?.balance ?? 0);
                setForm({
                  ...form,
                  companyName: cName,
                  maxDueBalance: due,
                  amount: due > 0 ? due : form.amount,
                  reference: cName ? `تحصيل مستحقات فواتير شركة ${cName}` : form.reference,
                });
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-sm bg-slate-50 focus:bg-white"
              required
            >
              <option value="">{isAr ? '-- اختر الشركة --' : '-- Select Company --'}</option>
              {companyOptions.map((name) => {
                const cSum = Array.isArray(clientsSummary)
                  ? clientsSummary.find((cs: any) => cs.companyName === name)
                  : clientsSummary?.clients?.find((cs: any) => cs.companyName === name);
                const bal = cSum ? Number(cSum.currentBalance ?? cSum.balance ?? 0) : null;
                return (
                  <option key={name} value={name}>
                    {name} {bal !== null ? `(المستحق: ${bal.toLocaleString()} ج.م)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {form.companyName && (
            <div className={`p-3 rounded-2xl flex items-center justify-between border ${
              isZeroOrNegativeDue
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div>
                <span className="text-emerald-700 font-semibold block text-[11px]">الرصيد المستحق حالياً على العميل:</span>
                <span className="text-base font-black text-emerald-900">
                  {clientOutstanding.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                </span>
              </div>
              {clientOutstanding > 0 ? (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, amount: clientOutstanding })}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  تحصيل كامل المستحق ⚡
                </button>
              ) : (
                <span className="px-2.5 py-1 bg-emerald-200/70 text-emerald-800 rounded-lg font-bold text-[11px]">
                  ✓ مسدد بالكامل
                </span>
              )}
            </div>
          )}

          {isOverDue && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold block text-xs">تنبيه تجاوز الرصيد:</span>
                <span className="text-[11px]">
                  المبلغ المدخل ({amountNum.toLocaleString()} ج.م) أكبر من إجمالي المستحق القائم على العميل ({clientOutstanding.toLocaleString()} ج.م). يرجى ضبط المبلغ لمنع حدوث أرصدة سالبة.
                </span>
              </div>
            </div>
          )}

          {isZeroOrNegativeDue && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block text-xs">العميل مسدد بالكامل:</span>
                <span className="text-[11px]">
                  لا توجد أي فواتير أو مبالغ متبقية للتحصيل على هذه الشركة حالياً.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">المبلغ المحصل (ج.م) *</label>
              <input
                type="number"
                min="1"
                max={clientOutstanding > 0 ? clientOutstanding : undefined}
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                placeholder="مثال: 50000"
                className={`w-full border rounded-xl px-3 py-2 font-black text-sm ${
                  isOverDue
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                    : 'border-emerald-300 rounded-xl text-emerald-800 bg-emerald-50/40'
                }`}
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">إيداع إلى الخزينة / الحساب البنكي *</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-xs"
                required
              >
                <option value="">{isAr ? '-- اختر الخزينة أو البنك --' : '-- Select Account --'}</option>
                {treasuryAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.kind === 'BANK' ? '🏦' : '💼'} {acc.name} (الرصيد: {Number(acc.currentBalance || 0).toLocaleString()} ج.م)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ التحصيل</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم الشيك / الحوالة / الإيصال</label>
              <input
                type="text"
                placeholder="مثال: شيك رقم 987654"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">البيان / ملاحظات</label>
            <input
              type="text"
              placeholder="مثال: سداد فواتير تشغيل حافلات عن شهر 9"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isPending || hasValidationErrors}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 transition-all"
          >
            {isPending ? 'جاري الإيداع والتسجيل...' : 'تأكيد التحصيل والإيداع بالخزينة 💵'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// PRINT HELPER UTILITY FOR CLEAN A4 TAX INVOICES & STATEMENTS
// =========================================================================
export function printInvoiceDocument(params: {
  title: string;
  invoiceType: 'client' | 'supplier';
  partyName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  month: number;
  year: number;
  partyBalance?: number;
  items: Array<{
    day?: number;
    routeName?: string;
    vehicleType?: string;
    vehiclePlate?: string;
    tripCount: number;
    rate: number;
    total: number;
  }>;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  netTotal: number;
  notes?: string;
}) {
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = 'none';
  printFrame.style.zIndex = '-9999';
  document.body.appendChild(printFrame);

  const isClient = params.invoiceType === 'client';
  const partyLabel = isClient ? 'مُوجهة إلى السادة /' : 'مستحقة لصالح المورد /';
  const rateLabel = isClient ? 'فئة الرحلة' : 'تكلفة الإيجار';
  const taxLabel = isClient ? 'خصم ضريبة أ.ت.ص (3%)' : 'خصم ضريبة أ.ت.ص (1%)';
  const finalLabel = isClient ? 'صافي المبلغ المطلوب سداده' : 'صافي المبلغ المستحق للمورد';

  const rowsHtml = params.items.length === 0
    ? `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b; font-weight: bold;">لا توجد رحلات تشغيل مسجلة في هذه الفترة</td></tr>`
    : params.items.map((it, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="padding: 8px 10px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 8px 10px; font-weight: bold; color: #0f172a;">${it.day ? `يوم ${it.day} (${params.month}/${params.year})` : `${params.month}/${params.year}`}</td>
        <td style="padding: 8px 10px; color: #334155; font-weight: 600;">${it.routeName || 'خط سير رئيسي'}</td>
        <td style="padding: 8px 10px;">
          <span style="font-weight: 600; color: #1e293b;">${it.vehicleType || '-'}</span>
          ${it.vehiclePlate ? `<div style="font-size: 10px; color: #64748b; font-family: monospace;">${it.vehiclePlate}</div>` : ''}
        </td>
        <td style="padding: 8px 10px; text-align: center; font-weight: 900; color: #0f172a;">${it.tripCount}</td>
        <td style="padding: 8px 10px; text-align: left; font-family: monospace; font-weight: 600;">${Number(it.rate).toLocaleString()} ج.م</td>
        <td style="padding: 8px 10px; text-align: left; font-weight: 900; font-family: monospace; color: #1e40af;">${Number(it.total).toLocaleString()} ج.م</td>
      </tr>
    `).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${params.title} - ${params.partyName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          padding: 8px;
          font-size: 12px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 14px;
          border-bottom: 3px solid #0f172a;
          margin-bottom: 14px;
        }
        .brand h1 {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 3px;
        }
        .brand p {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
        }
        .inv-badge {
          display: inline-block;
          margin-top: 6px;
          padding: 3px 10px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          color: #1d4ed8;
          font-family: monospace;
          font-weight: bold;
          font-size: 11px;
        }
        .meta-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 14px;
          min-width: 220px;
          font-size: 11px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 4px;
        }
        .meta-row:last-child {
          margin-bottom: 0;
        }
        .meta-label {
          color: #64748b;
        }
        .meta-val {
          font-weight: bold;
          color: #0f172a;
        }
        .party-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px 16px;
          margin-bottom: 16px;
        }
        .party-name {
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 2px;
        }
        .table-wrap {
          margin-bottom: 16px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: right;
          font-size: 11px;
        }
        thead {
          background: #e2e8f0;
          color: #334155;
          font-weight: bold;
        }
        th {
          padding: 8px 10px;
          border-bottom: 2px solid #cbd5e1;
        }
        .summary-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-top: 14px;
          page-break-inside: avoid;
        }
        .terms {
          flex: 1;
          font-size: 10px;
          color: #64748b;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
        }
        .terms h4 {
          color: #334155;
          margin-bottom: 4px;
          font-size: 11px;
        }
        .totals-box {
          width: 290px;
          background: #0f172a;
          color: #ffffff;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 11px;
        }
        .tot-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
          color: #cbd5e1;
        }
        .tot-row.tax {
          color: #fde047;
        }
        .tot-row.final {
          border-top: 1px solid #334155;
          padding-top: 8px;
          margin-top: 6px;
          font-size: 13px;
          font-weight: 900;
          color: #34d399;
        }
        .signatures {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
          padding-top: 14px;
          border-top: 1px solid #e2e8f0;
        }
        .sig-col {
          text-align: center;
          font-size: 11px;
          color: #475569;
          width: 140px;
        }
        .sig-line {
          margin-top: 30px;
          border-bottom: 1px dashed #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <h1>${params.title}</h1>
          <p>نظام إدارة أسطول النقل الجماعي ونقل العاملين</p>
          <div class="inv-badge">رقم المطالبة: ${params.invoiceNumber || 'INV-0001'}</div>
        </div>
        <div class="meta-box">
          <div class="meta-row">
            <span class="meta-label">تاريخ الإصدار:</span>
            <span class="meta-val">${params.invoiceDate}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">تاريخ الاستحقاق:</span>
            <span class="meta-val" style="color: #b91c1c;">${params.dueDate}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">الفترة المحاسبية:</span>
            <span class="meta-val" style="color: #1d4ed8;">شهر ${params.month} / ${params.year}</span>
          </div>
        </div>
      </div>

      <div class="party-card">
        <div>
          <span style="font-size: 10px; color: #64748b; font-weight: bold;">${partyLabel}</span>
          <div class="party-name">${params.partyName}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">خدمات نقل العاملين والتشغيل الدوري للشركات والمصانع</div>
        </div>
        ${params.partyBalance !== undefined ? `
          <div style="text-align: left;">
            <span style="font-size: 10px; color: #64748b; display: block;">الرصيد المالي الحالي:</span>
            <span style="font-weight: 900; font-size: 14px; color: #0f172a;">${Number(params.partyBalance).toLocaleString()} ج.م</span>
          </div>
        ` : ''}
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">م</th>
              <th>التاريخ</th>
              <th>خط السير والمسار</th>
              <th>الحافلة / اللوحة</th>
              <th style="text-align: center;">الرحلات</th>
              <th style="text-align: left;">${rateLabel}</th>
              <th style="text-align: left;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <div class="summary-section">
        <div class="terms">
          <h4>الشروط والتعليمات المالية:</h4>
          <p>• يُرجى تسوية وسداد قيمة الفاتورة خلال فترة الاستحقاق المحددة بشيك بنكي أو تحويل إلى حساب الشركة.</p>
          <p>• الفاتورة خاضعة لخصم ضريبة الأرباح التجارية والصناعية طبقاً لأحكام القانون واللوائح المنظمة.</p>
          ${params.notes ? `<p style="margin-top: 4px; font-weight: bold; color: #1e293b;">ملاحظات: ${params.notes}</p>` : ''}
        </div>
        <div class="totals-box">
          <div class="tot-row">
            <span>إجمالي قيمة الرحلات:</span>
            <span style="font-family: monospace; font-weight: bold;">${params.subtotal.toLocaleString()} ج.م</span>
          </div>
          ${params.taxAmount && params.taxAmount > 0 ? `
            <div class="tot-row tax">
              <span>${taxLabel}:</span>
              <span style="font-family: monospace; font-weight: bold;">- ${params.taxAmount.toLocaleString()} ج.م</span>
            </div>
          ` : ''}
          <div class="tot-row final">
            <span>${finalLabel}:</span>
            <span style="font-family: monospace;">${params.netTotal.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      <div class="signatures">
        <div class="sig-col">
          <span>المحاسب المسئول</span>
          <div class="sig-line"></div>
        </div>
        <div class="sig-col">
          <span>المدير المالي</span>
          <div class="sig-line"></div>
        </div>
        <div class="sig-col">
          <span>اعتماد الإدارة / الختم</span>
          <div class="sig-line"></div>
        </div>
      </div>
    </body>
    </html>
  `;

  const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (printFrame.parentNode) {
          document.body.removeChild(printFrame);
        }
      }, 3000);
    }, 250);
  }
}

// =========================================================================
// 5. CLIENT INVOICE MODAL
// =========================================================================
export const ClientInvoiceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onPayNow?: (params: { companyName: string; amount: number; month: number; year: number }) => void;
  isAr: boolean;
  dbClients?: any[];
  clientsSummary?: any;
  clientInvoiceTripsData?: any;
  invoiceTripsLoading?: boolean;
  isLoadingTrips?: boolean;
  tripsData?: any[];
  initialData?: any;
  defaultMonth?: number;
  defaultYear?: number;
}> = React.memo(({
  isOpen,
  onClose,
  onPayNow,
  isAr,
  dbClients = [],
  clientsSummary,
  clientInvoiceTripsData,
  invoiceTripsLoading = false,
  isLoadingTrips,
  tripsData,
  initialData,
  defaultMonth = new Date().getMonth() + 1,
  defaultYear = new Date().getFullYear(),
}) => {
  const [form, setForm] = useState({
    companyName: initialData?.companyName || '',
    month: initialData?.month || defaultMonth,
    year: initialData?.year || defaultYear,
    invoiceNumber: initialData?.invoiceNumber || '',
    invoiceDate: initialData?.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: initialData?.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: initialData?.notes || '',
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
        companyName: initialData.companyName || prev.companyName || '',
        month: initialData.month || prev.month || defaultMonth,
        year: initialData.year || prev.year || defaultYear,
      }));
    }
  }, [isOpen, initialData]);

  // Live fetch operations for selected company and period
  const { data: liveOpsData, isLoading: isFetchingLiveOps } = useQuery({
    queryKey: ['client-invoice-operations', form.companyName, form.month, form.year],
    queryFn: async () => {
      if (!form.companyName) return [];
      const res = await accountingApi.getOperations({
        companyName: form.companyName,
        month: form.month,
        year: form.year,
        limit: 500,
      });
      if (Array.isArray(res)) return res;
      if (Array.isArray((res as any)?.items)) return (res as any).items;
      if (Array.isArray((res as any)?.data)) return (res as any).data;
      return [];
    },
    enabled: isOpen && !!form.companyName,
  });

  const rawOps = Array.isArray(liveOpsData) ? liveOpsData : [];
  const operations: any[] = rawOps;
  const isLoading = isFetchingLiveOps;

  const totalTripsCount = operations.reduce((sum: number, op: any) => sum + (Number(op.tripCount) || 1), 0);
  const subtotal = operations.reduce(
    (acc: number, op: any) => acc + (Number(op.dailyRate || 0) * Number(op.tripCount || 1)),
    0
  );
  const withholdingTax = Math.round(subtotal * 0.03 * 100) / 100;
  const netPayable = Math.round((subtotal - withholdingTax) * 100) / 100;

  const matchingClientSummary = Array.isArray(clientsSummary)
    ? clientsSummary.find((c: any) => c.companyName?.trim() === form.companyName?.trim())
    : clientsSummary?.clients?.find((c: any) => c.companyName?.trim() === form.companyName?.trim());

  const clientDue = Number(matchingClientSummary?.balance ?? matchingClientSummary?.currentBalance ?? 0);
  const isFullySettled = clientDue <= 0;
  const invoiceDueAmount = netPayable > 0 ? netPayable : subtotal;
  const payableNow = Math.min(invoiceDueAmount, Math.max(0, clientDue));

  const handlePrint = () => {
    printInvoiceDocument({
      title: 'فاتورة مطالبة مالية وتشغيل',
      invoiceType: 'client',
      partyName: form.companyName || 'العميل',
      invoiceNumber: form.invoiceNumber || `INV-${form.year}${String(form.month).padStart(2, '0')}-01`,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      month: form.month,
      year: form.year,
      partyBalance: clientDue,
      items: operations.map((op: any) => ({
        day: op.day,
        routeName: op.routeName,
        vehicleType: op.vehicleType,
        vehiclePlate: op.vehiclePlate,
        tripCount: Number(op.tripCount || 1),
        rate: Number(op.dailyRate || 0),
        total: Number(op.dailyRate || 0) * Number(op.tripCount || 1),
      })),
      subtotal,
      taxRate: 0.03,
      taxAmount: withholdingTax,
      netTotal: netPayable,
      notes: form.notes,
    });
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overscroll-contain print:p-0 print:bg-white print:static">
        <div className="printable-sheet-container bg-white rounded-3xl w-full max-w-4xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden overscroll-contain print:max-h-none print:shadow-none print:rounded-none print:w-full">
        {/* Modal Header - Hidden on print */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-lg">📄</span>
            <div>
              <h3 className="text-base font-bold">
                {isAr ? 'فاتورة تشغيل رحلات العميل الرسمية' : 'Client Operations Tax Invoice'}
              </h3>
              <p className="text-xs text-slate-300">
                {form.companyName || 'يرجى اختيار العميل'} - شهر {form.month} / {form.year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
            >
              <span>🖨️</span>
              <span>{isAr ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Controls - Hidden on print */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs print:hidden">
          <div>
            <label className="font-bold text-slate-700 block mb-1">الشركة / العميل</label>
            <select
              value={form.companyName}
              onChange={(e) => {
                const name = e.target.value;
                setForm({
                  ...form,
                  companyName: name,
                  invoiceNumber: name ? `INV-${form.year}${String(form.month).padStart(2, '0')}-${name.replace(/\s+/g, '-').slice(0, 8)}` : '',
                });
              }}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold bg-white"
            >
              <option value="">-- اختر الشركة --</option>
              {dbClients.map((c: any) => (
                <option key={c.id || c.companyName} value={c.companyName}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">الشهر</label>
            <select
              value={form.month}
              onChange={(e) => {
                const m = Number(e.target.value);
                setForm({
                  ...form,
                  month: m,
                  invoiceNumber: form.companyName ? `INV-${form.year}${String(m).padStart(2, '0')}-${form.companyName.replace(/\s+/g, '-').slice(0, 8)}` : '',
                });
              }}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  شهر {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">السنة</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold bg-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">رقم الفاتورة</label>
            <input
              type="text"
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
              placeholder="INV-2026-001"
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">تاريخ الاستحقاق</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-bold"
            />
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6 print:p-0 print:overflow-visible">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-slate-800 gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">فاتورة مطالبة مالية وتشغيل</h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">نظام إدارة أسطول النقل الجماعي ونقل العاملين</p>
              <p className="text-xs font-mono text-blue-700 font-bold mt-1">
                رقم المطالبة: {form.invoiceNumber || `INV-${form.year}${String(form.month).padStart(2, '0')}-01`}
              </p>
            </div>
            <div className="text-left sm:text-right text-xs space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">تاريخ الإصدار:</span>
                <span className="font-bold text-slate-800">{form.invoiceDate}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">تاريخ الاستحقاق:</span>
                <span className="font-bold text-rose-700">{form.dueDate}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">الفترة المحاسبية:</span>
                <span className="font-bold text-blue-700">شهر {form.month} / {form.year}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">مُوجهة إلى السادة /</span>
              <h4 className="text-base font-black text-slate-900 mt-0.5">{form.companyName || '---'}</h4>
              <p className="text-xs text-slate-500 mt-1">خدمات نقل العاملين والتشغيل الدوري للشركات والمصانع</p>
            </div>
            <div className="sm:text-left flex flex-col justify-center">
              <div className="inline-block sm:self-end text-xs">
                <span className="text-slate-500 block">إجمالي الرصيد الحالي للعميل:</span>
                <span className="font-black text-sm text-slate-800">
                  {matchingClientSummary ? `${Number(matchingClientSummary.balance || matchingClientSummary.currentBalance || 0).toLocaleString()} ج.م` : '---'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>تفاصيل رحلات التشغيل اليومية المنفذة:</span>
              <span className="text-[11px] text-slate-600 font-bold">
                إجمالي الحركات: {operations.length} | إجمالي عدد الرحلات: {totalTripsCount} رحلة
              </span>
            </h5>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">جاري جلب حركات وتشغيلات العميل...</div>
            ) : operations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                لا توجد رحلات تشغيل مسجلة باسم شركة ({form.companyName || 'العميل'}) في شهر {form.month} / {form.year}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-center w-10">م</th>
                      <th className="p-2.5">التاريخ / اليوم</th>
                      <th className="p-2.5">خط السير والمسار</th>
                      <th className="p-2.5">الحافلة / اللوحة</th>
                      <th className="p-2.5 text-center">الرحلات</th>
                      <th className="p-2.5 text-left">فئة الرحلة (ج.م)</th>
                      <th className="p-2.5 text-left">الإجمالي (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {operations.map((op: any, idx: number) => {
                      const opTrips = Number(op.tripCount || 1);
                      const opRate = Number(op.dailyRate || 0);
                      const opTotal = opRate * opTrips;
                      return (
                        <tr key={op.id || idx} className="hover:bg-slate-50/60">
                          <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold">
                            {op.day ? `يوم ${op.day}` : ''} ({op.month || form.month}/{op.year || form.year})
                          </td>
                          <td className="p-2.5 text-slate-700 font-semibold">{op.routeName || 'خط سير رئيسي'}</td>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-800">{op.vehicleType || '-'}</span>
                            {op.vehiclePlate && <span className="text-[10px] text-slate-400 block font-mono">{op.vehiclePlate}</span>}
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-900">{opTrips}</td>
                          <td className="p-2.5 text-left font-mono">{opRate.toLocaleString()}</td>
                          <td className="p-2.5 text-left font-bold font-mono text-blue-700">
                            {opTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 space-y-1 max-w-sm">
              <p className="font-bold text-slate-700">الشروط والتعليمات المالية:</p>
              <p>• يُرجى سداد قيمة الفاتورة خلال فترة الاستحقاق المحددة بشيك بنكي أو تحويل إلى حساب الشركة.</p>
              <p>• الفاتورة خاضعة لخصم ضريبة الأرباح التجارية والصناعية بنسبة 3% طبقاً لأحكام القانون.</p>
            </div>

            <div className="w-full sm:w-80 bg-slate-900 text-white rounded-2xl p-4 space-y-2.5 shadow-xl text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>إجمالي رحلات التشغيل ({totalTripsCount} رحلة):</span>
                <span className="font-mono font-bold text-sm">{subtotal.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-amber-400">
                <span>خصم ضريبة أ.ت.ص (3%):</span>
                <span className="font-mono font-bold">- {withholdingTax.toLocaleString()} ج.م</span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between items-center">
                <span className="font-black text-sm text-white">صافي المستحق للسداد:</span>
                <span className="font-mono font-black text-base text-emerald-400">
                  {netPayable.toLocaleString()} ج.م
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer - Hidden on print */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            {isFullySettled ? (
              <div className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 select-none">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>الفاتورة مسددة بالكامل (رصيد العميل: 0 ج.م)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onPayNow && form.companyName) {
                    onPayNow({
                      companyName: form.companyName,
                      amount: payableNow,
                      month: form.month,
                      year: form.year,
                    });
                  }
                }}
                disabled={!form.companyName || operations.length === 0 || payableNow <= 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
              >
                <span>💵</span>
                <span>
                  {payableNow < invoiceDueAmount
                    ? `سداد المتبقي من الفاتورة (${payableNow.toLocaleString()} ج.م)`
                    : `سداد وتحصيل هذه الفاتورة الآن (${payableNow.toLocaleString()} ج.م)`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 6. MANUAL DEBIT MODAL
// =========================================================================
export const ManualDebitModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  dbClients?: any[];
  initialData?: any;
}> = React.memo(({ isOpen, onClose, onSubmit, isPending, isAr, dbClients = [], initialData }) => {
  const [form, setForm] = useState({
    companyName: initialData?.companyName || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    documentNumber: initialData?.documentNumber || '',
    description: initialData?.description || 'مطالبة / فاتورة تشغيل إضافية',
    debit: initialData?.debit || 0,
    notes: initialData?.notes || '',
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [isOpen, initialData]);

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-sm">📝</span>
              {isAr ? 'إضافة قيد / مطالبة يدوية على العميل' : 'Add Manual Client Debit Entry'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isAr ? 'لتسجيل أي مديونية أو مطالبة إضافية تزيد من رصيد حساب العميل' : 'Adds a debit claim to client ledger balance'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">الشركة / العميل *</label>
            <select
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              required
            >
              <option value="">{isAr ? '-- اختر الشركة --' : '-- Select Company --'}</option>
              {dbClients.map((c: any) => (
                <option key={c.id || c.companyName} value={c.companyName}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">التاريخ</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">رقم المستند / المطالبة</label>
            <input
              type="text"
              placeholder="مثال: مطالبة رقم 401"
              value={form.documentNumber}
              onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">البيان *</label>
            <input
              type="text"
              placeholder="مثال: مطالبة رحلات إضافية وسيارات طوارئ"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">مبلغ المطالبة (مدين ج.م) *</label>
            <input
              type="number"
              min="1"
              value={form.debit || ''}
              onChange={(e) => setForm({ ...form, debit: Number(e.target.value) })}
              placeholder="مثال: 15000"
              className="w-full border border-blue-300 rounded-xl px-3 py-2 text-blue-700 font-black text-sm bg-blue-50/40"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="أي تفاصيل إضافية..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.companyName || !form.description || !form.debit}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ المطالبة'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 7. SUPPLIER TRANSACTION MODAL
// =========================================================================
export const SupplierTxModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  dbSuppliers?: any[];
}> = React.memo(({ isOpen, onClose, onSubmit, isPending, isAr, dbSuppliers = [] }) => {
  const [form, setForm] = useState({
    supplierName: '',
    date: new Date().toISOString().split('T')[0],
    documentNumber: '',
    description: 'فاتورة إيجار وتشغيل حافلات',
    debit: 0,
    credit: 15000,
    notes: '',
  });

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
          {isAr ? 'إضافة حركة في كشف حساب المورد' : 'Add Supplier Ledger Entry'}
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">المورد / الشريك</label>
            <select
              value={form.supplierName}
              onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              required
            >
              <option value="">{isAr ? '-- اختر المورد --' : '-- Select Supplier --'}</option>
              {dbSuppliers.map((s: any) => (
                <option key={s.id || s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">التاريخ</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">رقم الفاتورة / المستند</label>
            <input
              type="text"
              placeholder="مثال: فاتورة #4567"
              value={form.documentNumber}
              onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">البيان</label>
            <input
              type="text"
              placeholder="مثال: إيجار وتشغيل حافلات لنقل موظفين"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">دائن (استحقاق للمورد)</label>
              <input
                type="number"
                value={form.credit}
                onChange={(e) => setForm({ ...form, credit: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-purple-700 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">مدين (سداد وخصم منه)</label>
              <input
                type="number"
                value={form.debit}
                onChange={(e) => setForm({ ...form, debit: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-emerald-600 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.supplierName || !form.description}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ حركة المورد'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 8. SUPPLIER PAY MODAL
// =========================================================================
export const SupplierPayModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  dbSuppliers?: any[];
  suppliersSummary?: any[];
  treasuryAccounts?: any[];
  initialData?: any;
}> = React.memo(({ isOpen, onClose, onSubmit, isPending, isAr, dbSuppliers = [], suppliersSummary = [], treasuryAccounts = [], initialData }) => {
  const [form, setForm] = useState({
    supplierName: initialData?.supplierName || '',
    amount: initialData?.amount || 5000,
    accountId: initialData?.accountId || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    reference: initialData?.reference || 'سداد دفعة إيجار وتشغيل',
    notes: initialData?.notes || '',
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const targetSup = Array.isArray(suppliersSummary)
    ? suppliersSummary.find(
        (s: any) =>
          (s.supplierName || s.name || '').trim().toLowerCase() === (form.supplierName || '').trim().toLowerCase()
      )
    : null;
  const targetAcc = treasuryAccounts?.find((a: any) => a.id === form.accountId);
  const supDueBalance = Number(
    targetSup?.balance ?? (targetSup as any)?.currentBalance ?? initialData?.maxDueBalance ?? initialData?.amount ?? 0
  );
  const accAvailableFunds = Number(targetAcc?.currentBalance || 0);
  const amountNum = Number(form.amount || 0);

  const isOverSupplierDue = !!form.supplierName && amountNum > supDueBalance && supDueBalance > 0;
  const isSupplierZeroOrNegative = !!form.supplierName && supDueBalance <= 0;
  const isOverTreasuryFunds = !!form.accountId && amountNum > accAvailableFunds;

  const hasValidationErrors =
    !form.supplierName ||
    !form.accountId ||
    amountNum <= 0 ||
    isOverSupplierDue ||
    isSupplierZeroOrNegative ||
    isOverTreasuryFunds;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-slate-100 max-h-[92vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-purple-600" />
            <span>{isAr ? 'صرف وسداد مستحقات مورد من الخزينة/البنك' : 'Disburse Payment to Supplier'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">المورد المستفيد</label>
            <select
              value={form.supplierName}
              onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              required
            >
              <option value="">{isAr ? '-- اختر المورد --' : '-- Select Supplier --'}</option>
              {dbSuppliers.map((s: any) => (
                <option key={s.id || s.supplierName || s.name} value={s.supplierName || s.name}>
                  {s.supplierName || s.name}
                </option>
              ))}
            </select>

            {(targetSup || supDueBalance > 0) && (
              <div className="mt-1.5 p-2 rounded-xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between">
                <span className="font-bold text-purple-800">إجمالي مستحقات المورد المتبقية:</span>
                <span className="font-black text-purple-900 text-sm">
                  {supDueBalance.toLocaleString()} ج.م
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">حساب الخزينة / البنك للصرف منه</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-blue-700"
              required
            >
              <option value="">{isAr ? '-- اختر الخزينة أو الحساب --' : '-- Select Account --'}</option>
              {treasuryAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (الرصيد المتاح: {Number(acc.currentBalance || 0).toLocaleString()} ج.م)
                </option>
              ))}
            </select>

            {targetAcc && (
              <div className="mt-1.5 p-2 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between">
                <span className="font-bold text-blue-800">السيولة المتاحة في {targetAcc.name}:</span>
                <span className="font-black text-blue-900 text-sm">
                  {accAvailableFunds.toLocaleString()} ج.م
                </span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">المبلغ المصروف (ج.م)</label>
              {targetSup && supDueBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, amount: supDueBalance })}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-800 underline"
                >
                  سداد كامل المستحق ({supDueBalance.toLocaleString()} ج.م)
                </button>
              )}
            </div>
            <input
              type="number"
              min={1}
              max={supDueBalance > 0 ? supDueBalance : undefined}
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className={`w-full border rounded-xl px-3 py-2 font-black text-sm ${
                isOverSupplierDue || isOverTreasuryFunds
                  ? 'border-rose-500 text-rose-600 bg-rose-50/30'
                  : 'border-slate-200 text-slate-900'
              }`}
              required
            />
          </div>

          {isOverSupplierDue && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div className="text-[11px] leading-tight">
                <strong className="block font-bold">المبلغ المدخل يتجاوز مستحقات المورد!</strong>
                <span>
                  المبلغ المطلوب صرفه ({amountNum.toLocaleString()} ج.م) أكبر من رصيد المورد المتبقي ({supDueBalance.toLocaleString()} ج.م).
                </span>
              </div>
            </div>
          )}

          {isSupplierZeroOrNegative && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div className="text-[11px] leading-tight">
                <strong className="font-bold block">لا توجد مستحقات لهذا المورد!</strong>
                <span>رصيد المورد الحالي خالص أو به دفعات زائدة ({supDueBalance.toLocaleString()} ج.م).</span>
              </div>
            </div>
          )}

          {isOverTreasuryFunds && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div className="text-[11px] leading-tight">
                <strong className="block font-bold">رصيد الخزينة/البنك غير كافٍ!</strong>
                <span>
                  الرصيد المتاح في الحساب المالي ({accAvailableFunds.toLocaleString()} ج.م) أقل من المبلغ المطلوب صرفه.
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">التاريخ</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">البيان ورقم الشيك/التحويل</label>
            <input
              type="text"
              placeholder="سداد دفعة حساب إيجار سيارات"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isPending || hasValidationErrors}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all"
          >
            {isPending ? 'جاري الصرف...' : 'تأكيد الصرف من الخزينة'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 8.5. SUPPLIER INVOICE & STATEMENT MODAL (فاتورة ومطالبة حساب المورد للطباعة)
// =========================================================================
export const SupplierInvoiceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onPayNow?: (params: { supplierName: string; amount: number; month: number; year: number }) => void;
  isAr: boolean;
  dbSuppliers?: any[];
  suppliersSummary?: any[];
  defaultMonth?: number;
  defaultYear?: number;
  initialData?: any;
}> = React.memo(({
  isOpen,
  onClose,
  onPayNow,
  isAr,
  dbSuppliers = [],
  suppliersSummary = [],
  defaultMonth = new Date().getMonth() + 1,
  defaultYear = new Date().getFullYear(),
  initialData,
}) => {
  const [form, setForm] = useState({
    supplierName: initialData?.supplierName || '',
    month: initialData?.month || defaultMonth,
    year: initialData?.year || defaultYear,
    invoiceNumber: initialData?.invoiceNumber || '',
    invoiceDate: initialData?.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: initialData?.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: initialData?.notes || '',
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
        supplierName: initialData.supplierName || prev.supplierName || '',
        month: initialData.month || prev.month || defaultMonth,
        year: initialData.year || prev.year || defaultYear,
        invoiceNumber:
          initialData.invoiceNumber ||
          (initialData.supplierName
            ? `SUP-INV-${initialData.year || defaultYear}${String(initialData.month || defaultMonth).padStart(2, '0')}-${initialData.supplierName.replace(/\\s+/g, '-').slice(0, 8)}`
            : prev.invoiceNumber),
      }));
    }
  }, [isOpen, initialData, defaultMonth, defaultYear]);

  // Live fetch operations executed by this supplier during the selected month/year
  const { data: supplierOpsData, isLoading: opsLoading } = useQuery({
    queryKey: ['supplier-invoice-ops', form.supplierName, form.month, form.year],
    queryFn: async () => {
      if (!form.supplierName) return [];
      const res = await accountingApi.getOperations({
        supplierName: form.supplierName,
        month: form.month,
        year: form.year,
        limit: 500,
      });
      const items = Array.isArray(res) ? res : (res as any)?.items || [];
      const target = form.supplierName.trim().toLowerCase();
      return items.filter((op: any) => {
        const supName = (op.supplierName || '').trim().toLowerCase();
        const notes = (op.notes || '').toLowerCase();
        const driver = (op.driverName || '').toLowerCase();
        return (
          supName === target ||
          notes.includes(target) ||
          driver.includes(target) ||
          (op.executionType === 'SUPPLIER' && Number(op.vehicleCost || 0) > 0)
        );
      });
    },
    enabled: isOpen && !!form.supplierName,
  });

  // Live fetch supplier ledger transactions
  const { data: supplierTxsData, isLoading: txsLoading } = useQuery({
    queryKey: ['supplier-invoice-txs', form.supplierName],
    queryFn: async () => {
      if (!form.supplierName) return [];
      const res = await accountingApi.getSupplierTransactions(form.supplierName);
      return Array.isArray(res) ? res : [];
    },
    enabled: isOpen && !!form.supplierName,
  });

  const operations = Array.isArray(supplierOpsData) ? supplierOpsData : [];
  const transactions = Array.isArray(supplierTxsData) ? supplierTxsData : [];
  const isLoading = opsLoading || txsLoading;

  const totalTripsCount = operations.reduce((sum: number, op: any) => sum + (Number(op.tripCount) || 1), 0);
  const totalOperationsCost = operations.reduce(
    (acc: number, op: any) => acc + (Number(op.vehicleCost || 0) * Number(op.tripCount || 1)),
    0
  );

  const matchingSupSummary = Array.isArray(suppliersSummary)
    ? suppliersSummary.find((s: any) => s.supplierName?.trim() === form.supplierName?.trim())
    : null;

  const currentDueBalance = matchingSupSummary ? Number(matchingSupSummary.balance || 0) : totalOperationsCost;
  const isFullySettled = currentDueBalance <= 0;
  const payableNow = Math.max(0, currentDueBalance);

  const withholdingTax = Math.round(totalOperationsCost * 0.01 * 100) / 100;
  const netPayableToSupplier = Math.round((totalOperationsCost - withholdingTax) * 100) / 100;

  const handlePrint = () => {
    printInvoiceDocument({
      title: 'فاتورة استحقاق وتشغيل حافلات المورد',
      invoiceType: 'supplier',
      partyName: form.supplierName || 'المورد',
      invoiceNumber: form.invoiceNumber || `SUP-INV-${form.year}${String(form.month).padStart(2, '0')}-01`,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      month: form.month,
      year: form.year,
      partyBalance: currentDueBalance,
      items: operations.map((op: any) => ({
        day: op.day,
        routeName: op.routeName,
        vehicleType: op.vehicleType,
        vehiclePlate: op.vehiclePlate,
        tripCount: Number(op.tripCount || 1),
        rate: Number(op.vehicleCost || 0),
        total: Number(op.vehicleCost || 0) * Number(op.tripCount || 1),
      })),
      subtotal: totalOperationsCost,
      taxRate: 0.01,
      taxAmount: withholdingTax,
      netTotal: netPayableToSupplier,
      notes: form.notes,
    });
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overscroll-contain print:p-0 print:bg-white print:static">
        <div className="printable-sheet-container bg-white rounded-3xl w-full max-w-4xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden overscroll-contain print:max-h-none print:shadow-none print:rounded-none print:w-full">
          {/* Modal Header - Hidden on print */}
          <div className="p-4 sm:px-6 bg-purple-950 text-white flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-purple-800/60 border border-purple-500/30 flex items-center justify-center text-lg">📄</span>
              <div>
                <h3 className="text-base font-bold">
                  {isAr ? 'فاتورة ومطالبة استحقاقات المورد الرسمية' : 'Supplier Operations Bill & Statement'}
                </h3>
                <p className="text-xs text-purple-200">
                  {form.supplierName || 'يرجى اختيار المورد'} - شهر {form.month} / {form.year}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
              >
                <span>🖨️</span>
                <span>{isAr ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-purple-900 text-purple-200 hover:bg-purple-800 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Controls - Hidden on print */}
          <div className="p-4 bg-purple-50/50 border-b border-purple-100 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs print:hidden">
            <div>
              <label className="font-bold text-slate-700 block mb-1">المورد / الشريك</label>
              <select
                value={form.supplierName}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm({
                    ...form,
                    supplierName: name,
                    invoiceNumber: name ? `SUP-INV-${form.year}${String(form.month).padStart(2, '0')}-${name.replace(/\\s+/g, '-').slice(0, 8)}` : '',
                  });
                }}
                className="w-full border border-purple-200 rounded-xl px-2.5 py-1.5 font-bold bg-white"
              >
                <option value="">-- اختر المورد --</option>
                {dbSuppliers.map((s: any) => (
                  <option key={s.id || s.supplierName || s.name} value={s.supplierName || s.name}>
                    {s.supplierName || s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">الشهر</label>
              <select
                value={form.month}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setForm({
                    ...form,
                    month: m,
                    invoiceNumber: form.supplierName ? `SUP-INV-${form.year}${String(m).padStart(2, '0')}-${form.supplierName.replace(/\\s+/g, '-').slice(0, 8)}` : '',
                  });
                }}
                className="w-full border border-purple-200 rounded-xl px-2.5 py-1.5 font-bold bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    شهر {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">السنة</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full border border-purple-200 rounded-xl px-2.5 py-1.5 font-bold bg-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم الفاتورة / المطالبة</label>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                placeholder="SUP-INV-2026-001"
                className="w-full border border-purple-200 rounded-xl px-2.5 py-1.5 bg-white font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ الاستحقاق</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border border-purple-200 rounded-xl px-2.5 py-1.5 bg-white font-bold"
              />
            </div>
          </div>

          {/* Printable Invoice Sheet */}
          <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6 print:p-0 print:overflow-visible">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-purple-900 gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">فاتورة استحقاق وتشغيل حافلات المورد</h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">نظام إدارة أسطول النقل الجماعي ونقل العاملين</p>
                <p className="text-xs font-mono text-purple-700 font-bold mt-1">
                  رقم المطالبة: {form.invoiceNumber || `SUP-INV-${form.year}${String(form.month).padStart(2, '0')}-01`}
                </p>
              </div>
              <div className="text-left sm:text-right text-xs space-y-1 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">تاريخ الإصدار:</span>
                  <span className="font-bold text-slate-800">{form.invoiceDate}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">تاريخ الاستحقاق:</span>
                  <span className="font-bold text-rose-700">{form.dueDate}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">الفترة المحاسبية:</span>
                  <span className="font-bold text-purple-700">شهر {form.month} / {form.year}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-purple-50/40 rounded-2xl border border-purple-100">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">مُستحقة لصالح المورد / الشريك:</span>
                <h4 className="text-base font-black text-slate-900 mt-0.5">{form.supplierName || '---'}</h4>
                <p className="text-xs text-slate-500 mt-1">إيجار وتشغيل حافلات وسيارات النقل الجماعي</p>
              </div>
              <div className="sm:text-left flex flex-col justify-center">
                <div className="inline-block sm:self-end text-xs">
                  <span className="text-slate-500 block">صافي الرصيد الحالي المستحق للمورد:</span>
                  <span className="font-black text-base text-purple-900">
                    {matchingSupSummary ? `${Number(matchingSupSummary.balance || 0).toLocaleString()} ج.م` : '---'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>تفاصيل رحلات وتشغيلات سيارات المورد المنفذة:</span>
                <span className="text-[11px] text-slate-600 font-bold">
                  إجمالي الحركات: {operations.length} | إجمالي عدد الرحلات: {totalTripsCount} رحلة
                </span>
              </h5>

              {isLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">جاري جلب رحلات المورد...</div>
              ) : operations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لا توجد رحلات تشغيل مسجلة باسم المورد ({form.supplierName || 'المورد'}) في شهر {form.month} / {form.year}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-purple-100/70 text-purple-950 font-bold border-b border-purple-200">
                      <tr>
                        <th className="p-2.5 text-center w-10">م</th>
                        <th className="p-2.5">التاريخ / اليوم</th>
                        <th className="p-2.5">العميل / الشركة</th>
                        <th className="p-2.5">خط السير والمسار</th>
                        <th className="p-2.5">الحافلة واللوحة</th>
                        <th className="p-2.5 text-center">الرحلات</th>
                        <th className="p-2.5 text-left">تكلفة الرحلة للمورد (ج.م)</th>
                        <th className="p-2.5 text-left">الإجمالي المستحق (ج.م)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {operations.map((op: any, idx: number) => {
                        const opTrips = Number(op.tripCount || 1);
                        const opCost = Number(op.vehicleCost || 0);
                        const opTotal = opCost * opTrips;
                        return (
                          <tr key={op.id || idx} className="hover:bg-purple-50/40">
                            <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold">
                              {op.day ? `يوم ${op.day}` : ''} ({op.month || form.month}/{op.year || form.year})
                            </td>
                            <td className="p-2.5 text-purple-900 font-bold">{op.companyName || '-'}</td>
                            <td className="p-2.5 text-slate-700 font-semibold">{op.routeName || 'خط سير'}</td>
                            <td className="p-2.5">
                              <span className="font-semibold text-slate-800">{op.vehicleType || '-'}</span>
                              {op.vehiclePlate && <span className="text-[10px] text-slate-400 block font-mono">{op.vehiclePlate}</span>}
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-900">{opTrips}</td>
                            <td className="p-2.5 text-left font-mono">{opCost.toLocaleString()}</td>
                            <td className="p-2.5 text-left font-bold font-mono text-purple-700">
                              {opTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500 space-y-1 max-w-sm">
                <p className="font-bold text-slate-700">ملاحظات واعتماد الحساب:</p>
                <p>• تُصرف مستحقات الموردين والشركاء دورياً بعد مطابقة كشف الحركات والرحلات المعتمدة.</p>
                <p>• يتم قيد المبالغ تلقائياً في كشف حساب المورد وخصمها عند التحويل من الخزينة/البنك.</p>
              </div>

              <div className="w-full sm:w-80 bg-slate-900 text-white rounded-2xl p-4 space-y-2.5 shadow-xl text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>إجمالي رحلات المورد ({totalTripsCount} رحلة):</span>
                  <span className="font-mono font-bold text-sm">{totalOperationsCost.toLocaleString()} ج.م</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between items-center">
                  <span className="font-black text-sm text-white">صافي المستحق للمورد:</span>
                  <span className="font-mono font-black text-base text-purple-400">
                    {totalOperationsCost.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer - Hidden on print */}
          <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              إغلاق
            </button>

            <div className="flex items-center gap-2">
              {isFullySettled ? (
                <div className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 select-none">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>مستحقات المورد مسددة بالكامل (الرصيد: 0 ج.م)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onPayNow && form.supplierName) {
                      onPayNow({
                        supplierName: form.supplierName,
                        amount: payableNow,
                        month: form.month,
                        year: form.year,
                      });
                    }
                  }}
                  disabled={!form.supplierName || operations.length === 0 || payableNow <= 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                >
                  <Wallet className="h-4 w-4" />
                  <span>صرف دفعة للمورد الآن ({payableNow.toLocaleString()} ج.م)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
});

// =========================================================================
// 9. ADD INSTALLMENT MODAL
// =========================================================================
export const AddInstallmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  dbVehicles?: any[];
}> = React.memo(({ isOpen, onClose, onSubmit, isPending, isAr, dbVehicles = [] }) => {
  const [form, setForm] = useState({
    category: 'VEHICLE',
    assetName: '',
    vehiclePlate: '',
    bankName: 'بنك بيت التمويل الكويتي KFH',
    chequeNumber: '',
    installmentNumber: 1,
    bankDueDate: new Date().toISOString().split('T')[0],
    bankAmount: 12500,
    clientDueDate: '',
    clientAmount: 0,
    status: 'PENDING',
    notes: '',
  });

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
          {isAr ? 'إضافة قسط بنكي / أصل جديد' : 'Add Bank Installment'}
        </h3>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">نوع وفئة الأصل</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              >
                <option value="VEHICLE">أقساط سيارات وأتوبيسات</option>
                <option value="PROPERTY_OFFICE">أقساط مقر المكتب والوحدات</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم القسط</label>
              <input
                type="number"
                min={1}
                value={form.installmentNumber}
                onChange={(e) => setForm({ ...form, installmentNumber: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">اسم الأصل وبيان المركبة</label>
            <input
              type="text"
              placeholder="مثال: أتوبيس مرسيدس 50 راكب (قسط شهر 9)"
              value={form.assetName}
              onChange={(e) => setForm({ ...form, assetName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم لوحة المركبة</label>
              <input
                type="text"
                list="inst-vehicles-datalist"
                placeholder="أ ب ج 1234"
                value={form.vehiclePlate}
                onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono"
              />
              <datalist id="inst-vehicles-datalist">
                {dbVehicles.map((v: any) => (
                  <option key={v.id} value={v.plateNumber} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم البنك المسحوب عليه</label>
              <input
                type="text"
                placeholder="بيت التمويل الكويتي KFH / بنك مصر / FAB"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ استحقاق البنك</label>
              <input
                type="date"
                value={form.bankDueDate}
                onChange={(e) => setForm({ ...form, bankDueDate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">قيمة قسط البنك (ج.م)</label>
              <input
                type="number"
                value={form.bankAmount}
                onChange={(e) => setForm({ ...form, bankAmount: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-black text-rose-600 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">قسط العميل المقابل (إن وجد)</label>
              <input
                type="number"
                placeholder="0"
                value={form.clientAmount || ''}
                onChange={(e) => setForm({ ...form, clientAmount: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-emerald-700 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم الشيك البنكي</label>
              <input
                type="text"
                placeholder="CHQ-998811"
                value={form.chequeNumber}
                onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات</label>
            <input
              type="text"
              placeholder="أية تفاصيل تخص القسط أو التمويل"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.assetName || !form.bankAmount}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ القسط'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 10. CREATE ACCOUNT MODAL
// =========================================================================
export const CreateAccountModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
}> = React.memo(({ isOpen, onClose, onSubmit, isPending, isAr }) => {
  const [form, setForm] = useState({
    name: '',
    kind: 'CASH' as 'CASH' | 'BANK',
    bankName: '',
    reference: '',
    openingBalance: '',
  });

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 max-h-[92vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span>🏦</span>
            <span>{isAr ? 'إضافة خزينة نقدية أو حساب بنكي جديد' : 'Add Cash Vault / Bank Account'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name: form.name,
              kind: form.kind,
              bankName: form.kind === 'BANK' ? form.bankName : undefined,
              reference: form.reference || undefined,
              openingBalance: Number(form.openingBalance || 0),
            });
          }}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="font-bold text-slate-700 block mb-1">نوع الحساب المالي</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, kind: 'CASH' })}
                className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                  form.kind === 'CASH'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>💵</span>
                <span>خزينة نقدية (كاش)</span>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, kind: 'BANK' })}
                className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition-all ${
                  form.kind === 'BANK'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🏦</span>
                <span>حساب بنكي (جاري)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {form.kind === 'BANK' ? 'اسم الحساب البنكي' : 'اسم الخزينة النقدية'}
            </label>
            <input
              type="text"
              placeholder={form.kind === 'BANK' ? 'مثال: بنك مصر - حساب جاري رئيسي' : 'مثال: الخزينة الرئيسية - فرع القاهرة'}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              required
            />
          </div>

          {form.kind === 'BANK' && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم البنك</label>
              <input
                type="text"
                placeholder="مثال: Banque Misr / CIB / QNB / الأهلي"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-medium"
                required
              />
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {form.kind === 'BANK' ? 'رقم الحساب / الآيبان IBAN' : 'كود / مرجع الخزينة'}
            </label>
            <input
              type="text"
              placeholder={form.kind === 'BANK' ? 'EG120002000100000...' : 'VAULT-001'}
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">الرصيد الافتتاحي التأسيسي (ج.م)</label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-black text-emerald-700 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending || !form.name}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'جاري الإنشاء...' : 'حفظ وإنشاء الحساب'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 11. TRANSFER MODAL
// =========================================================================
export const TransferModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  treasuryAccounts?: any[];
}> = React.memo(({ isOpen, onClose, onSubmit, isPending, isAr, treasuryAccounts = [] }) => {
  const [form, setForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    reference: '',
    notes: '',
  });

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100 max-h-[92vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span>⇄</span>
            <span>{isAr ? 'تحويل داخلي بين الخزائن والبنوك' : 'Internal Treasury Transfer'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              fromAccountId: form.fromAccountId,
              toAccountId: form.toAccountId,
              amount: Number(form.amount),
              reference: form.reference || undefined,
              notes: form.notes || undefined,
            });
          }}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="font-bold text-slate-700 block mb-1">من حساب / خزينة (الخصم منه)</label>
            <select
              value={form.fromAccountId}
              onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              required
            >
              <option value="">-- اختر الحساب المسحوب منه --</option>
              {treasuryAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (المتاح: {Number(acc.currentBalance || 0).toLocaleString()} ج.م)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">إلى حساب / خزينة (الإيداع فيه)</label>
            <select
              value={form.toAccountId}
              onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
              required
            >
              <option value="">-- اختر الحساب المودع فيه --</option>
              {treasuryAccounts
                .filter((acc: any) => acc.id !== form.fromAccountId)
                .map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (الحالي: {Number(acc.currentBalance || 0).toLocaleString()} ج.م)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">المبلغ المحول (ج.م)</label>
            <input
              type="number"
              min={1}
              placeholder="مثال: 50000"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900 text-sm"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">بيان / سبب التحويل</label>
            <input
              type="text"
              placeholder="مثال: تغذية الخزينة النقدية لمصروفات وسلف السائقين"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات</label>
            <input
              type="text"
              placeholder="رقم الشيك أو إشعار التحويل البنكي"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending || !form.fromAccountId || !form.toAccountId || !form.amount}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isPending ? 'جاري التحويل...' : 'تنفيذ التحويل الآن'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 12. DRIVER PAY MODAL
// =========================================================================
export const DriverPayModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  settlementsData?: any[];
  driversList?: any[];
  treasuryAccounts?: any[];
  initialData?: any;
}> = React.memo(({ isOpen, onClose, onSubmit, isPending, isAr, settlementsData = [], driversList = [], treasuryAccounts = [], initialData }) => {
  const [form, setForm] = useState({
    driverName: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: 0,
    accountId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    maxPayable: 0,
  });

  // Merge settlementsData and driversList to ensure every company driver is selectable
  const availableDrivers = React.useMemo(() => {
    const map = new Map<string, { driverName: string; driverCode?: any; netPayable: number; isPaid: boolean }>();

    // 1. Add calculated settlements first
    (settlementsData || []).forEach((s: any) => {
      const name = (s.driverName || '').trim();
      if (name) {
        map.set(name, {
          driverName: name,
          driverCode: s.driverCode,
          netPayable: Number(s.netPayable || 0),
          isPaid: s.status === 'PAID',
        });
      }
    });

    // 2. Add registered company drivers if not in settlementsData
    (driversList || []).forEach((d: any) => {
      const name = (d.fullName || d.driverName || '').trim();
      if (name && !map.has(name) && !d.supplierId) {
        map.set(name, {
          driverName: name,
          driverCode: d.id ? String(d.id).slice(0, 4) : undefined,
          netPayable: 0,
          isPaid: false,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.netPayable - a.netPayable);
  }, [settlementsData, driversList]);

  useEffect(() => {
    if (isOpen) {
      const defaultAcc = treasuryAccounts.find((a: any) => a.kind === 'CASH') || treasuryAccounts[0];
      const driverName = initialData?.driverName || form.driverName || '';
      const matchingSettlement = settlementsData.find((s: any) => (s.driverName || '').trim() === driverName.trim());
      const calculatedDue = initialData?.maxPayable !== undefined 
        ? Number(initialData.maxPayable) 
        : (matchingSettlement ? Number(matchingSettlement.netPayable || 0) : 0);
      
      const targetAmount = initialData?.amount !== undefined 
        ? Number(initialData.amount) 
        : (calculatedDue > 0 ? calculatedDue : 0);

      const m = initialData?.month || form.month || (new Date().getMonth() + 1);
      const y = initialData?.year || form.year || new Date().getFullYear();

      setForm({
        driverName,
        month: m,
        year: y,
        amount: targetAmount,
        accountId: initialData?.accountId || form.accountId || defaultAcc?.id || '',
        paymentDate: initialData?.paymentDate || form.paymentDate || new Date().toISOString().split('T')[0],
        reference: initialData?.reference || (driverName ? `صرف راتب شهر ${m}/${y} للسائق ${driverName}` : ''),
        notes: initialData?.notes || '',
        maxPayable: calculatedDue,
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const selectedAccount = treasuryAccounts.find((a: any) => a.id === form.accountId);
  const availableBalance = Number(selectedAccount?.currentBalance ?? 0);
  const amountNum = Number(form.amount || 0);
  const isOverTreasury = Boolean(form.accountId && amountNum > availableBalance);
  const isOverDue = Boolean(form.maxPayable > 0 && amountNum > form.maxPayable);
  const isZeroOrNegativeDue = Boolean(form.driverName && form.maxPayable <= 0);

  const handleDriverChange = (name: string) => {
    const trimmed = name.trim();
    const found = settlementsData.find((s: any) => (s.driverName || '').trim() === trimmed);
    const due = Number(found?.netPayable ?? 0);
    const defaultAcc = treasuryAccounts.find((a: any) => a.kind === 'CASH') || treasuryAccounts[0];

    setForm((prev) => ({
      ...prev,
      driverName: trimmed,
      maxPayable: due,
      amount: due > 0 ? due : (prev.amount > 0 ? prev.amount : 0),
      accountId: prev.accountId || defaultAcc?.id || '',
      reference: trimmed ? `صرف راتب شهر ${prev.month}/${prev.year} للسائق ${trimmed}` : '',
    }));
  };

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-100 max-h-[92vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg">
              💸
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isAr ? 'صرف راتب ومستحقات سائق من الخزينة' : 'Disburse Driver Settlement'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isAr
                  ? `شهر ${form.month}/${form.year} - خصم فوري من رصيد الخزينة المحدد`
                  : `Month ${form.month}/${form.year}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
          className="space-y-3.5 text-xs"
        >
          <div>
            <label className="font-bold text-slate-700 block mb-1">السائق المستحق للصرف</label>
            <select
              value={form.driverName}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900 bg-slate-50 focus:bg-white"
              required
            >
              <option value="">-- اختر السائق --</option>
              {availableDrivers.map((s: any) => (
                <option key={s.driverName} value={s.driverName}>
                  {s.driverName} {s.driverCode ? `(#${s.driverCode})` : ''} - صافي المستحق: {Number(s.netPayable || 0).toLocaleString()} ج.م {s.isPaid ? '(مسدد)' : ''}
                </option>
              ))}
            </select>
          </div>

          {form.driverName && (
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-800 block">صافي المستحق للسائق عن الشهر ({form.month}/{form.year})</span>
                <span className="text-lg font-black text-amber-900 mt-0.5 block">
                  {form.maxPayable.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                </span>
              </div>
              {form.maxPayable > 0 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, amount: form.maxPayable })}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 transition-colors"
                >
                  صرف كامل المستحق
                </button>
              )}
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">الخزينة أو الحساب البنكي (الخصم منه)</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
              required
            >
              <option value="">-- اختر الخزينة أو البنك --</option>
              {treasuryAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.kind === 'CASH' ? '💵' : '🏦'} {acc.name} (الرصيد المتاح: {Number(acc.currentBalance || 0).toLocaleString()} ج.م)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">المبلغ المطلوب صرفه (ج.م)</label>
            <input
              type="number"
              min={1}
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900 text-base"
              required
            />
          </div>

          {isOverTreasury && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 flex items-start gap-2 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span>رصيد الخزينة المحددة غير كافٍ للصرف!</span>
                <p className="text-[11px] text-rose-700 font-normal mt-0.5">
                  المتاح في ({selectedAccount?.name}): {availableBalance.toLocaleString()} ج.م، والمطلوب: {amountNum.toLocaleString()} ج.م.
                </p>
              </div>
            </div>
          )}

          {isZeroOrNegativeDue && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-start gap-2 text-xs font-semibold">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span>السائق مسدد بالكامل!</span>
                <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                  مستحقات هذا السائق عن شهر {form.month}/{form.year} مسددة بالكامل بالفعل (الرصيد: 0 ج.م).
                </p>
              </div>
            </div>
          )}

          {isOverDue && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 flex items-start gap-2 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span>تحذير: المبلغ المدخل أكبر من صافي المستحق للسائق!</span>
                <p className="text-[11px] text-amber-700 font-normal mt-0.5">
                  المستحق: {form.maxPayable.toLocaleString()} ج.م، والمبلغ المدخل: {amountNum.toLocaleString()} ج.م.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ الصرف</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">البيان / المرجع</label>
              <input
                type="text"
                placeholder="رقم السند أو إشعار الصرف"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              placeholder="أي تفاصيل أخرى تخص الصرف"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                Boolean(isOverTreasury) ||
                Boolean(isOverDue) ||
                isZeroOrNegativeDue ||
                amountNum <= 0 ||
                !form.driverName ||
                !form.accountId
              }
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all"
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>{isPending ? 'جاري تسجيل الصرف...' : 'تأكيد صرف الراتب والخصم'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
});

// =========================================================================
// 13. STAFF PAYROLL MODAL
// =========================================================================
export const StaffPayrollModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  treasuryAccounts?: any[];
  defaultMonth?: number;
  defaultYear?: number;
  initialData?: any;
}> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  isAr,
  treasuryAccounts = [],
  defaultMonth = new Date().getMonth() + 1,
  defaultYear = new Date().getFullYear(),
  initialData,
}) => {
  const [form, setForm] = useState({
    employeeName: initialData?.employeeName || '',
    jobTitle: initialData?.jobTitle || '',
    basicSalary: initialData?.basicSalary || 0,
    overtime: initialData?.overtime || 0,
    deductions: initialData?.deductions || 0,
    advances: initialData?.advances || 0,
    penalties: initialData?.penalties || 0,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    accountId: initialData?.accountId || '',
    month: initialData?.month || defaultMonth,
    year: initialData?.year || defaultYear,
    notes: initialData?.notes || '',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm((prev) => ({
          ...prev,
          ...initialData,
        }));
      } else {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth() + 1;
        let defaultDate = now.toISOString().split('T')[0];
        if (defaultYear && defaultMonth && (defaultYear !== curYear || defaultMonth !== curMonth)) {
          const mStr = String(defaultMonth).padStart(2, '0');
          defaultDate = `${defaultYear}-${mStr}-01`;
        }
        setForm((prev) => ({
          ...prev,
          date: defaultDate,
          month: defaultMonth || curMonth,
          year: defaultYear || curYear,
        }));
      }
    }
  }, [isOpen, initialData, defaultMonth, defaultYear]);

  const selectedAccount = treasuryAccounts.find((a: any) => a.id === form.accountId);
  const availableBalance = Number(selectedAccount?.currentBalance ?? 0);
  const basic = Number(form.basicSalary || 0);
  const ot = Number(form.overtime || 0);
  const deduct = Number(form.deductions || 0);
  const adv = Number(form.advances || 0);
  const pen = Number(form.penalties || 0);
  const netSalary = basic + ot - (deduct + adv + pen);
  const isOverTreasury = form.accountId && netSalary > availableBalance;

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overscroll-contain">
        <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-lg">
              👔
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isAr ? 'تسجيل وصرف مسير راتب موظف' : 'Staff Salary Disbursement'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isAr
                  ? 'حساب صافي الراتب والخصم الفوري من الخزينة المختارة وإدراجه بقائمة الدخل'
                  : 'Calculates net salary and deducts directly from Treasury'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              ...form,
              basicSalary: basic,
              overtime: ot,
              deductions: deduct,
              advances: adv,
              penalties: pen,
            });
          }}
          className="space-y-3 text-xs"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم الموظف</label>
              <input
                type="text"
                placeholder="مثال: أحمد محمود"
                value={form.employeeName}
                onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">المسمى الوظيفي / القسم</label>
              <input
                type="text"
                placeholder="محاسب / مدير تشغيل / مشرف"
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">الراتب الأساسي (ج.م)</label>
              <input
                type="number"
                min={0}
                value={form.basicSalary || ''}
                onChange={(e) => setForm({ ...form, basicSalary: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900 text-sm"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">إضافي وبدلات وحوافز (+) (ج.م)</label>
              <input
                type="number"
                min={0}
                value={form.overtime || ''}
                onChange={(e) => setForm({ ...form, overtime: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">خصومات (-)</label>
              <input
                type="number"
                min={0}
                value={form.deductions || ''}
                onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-rose-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">سلف مستردة (-)</label>
              <input
                type="number"
                min={0}
                value={form.advances || ''}
                onChange={(e) => setForm({ ...form, advances: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-amber-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">جزاءات غياب (-)</label>
              <input
                type="number"
                min={0}
                value={form.penalties || ''}
                onChange={(e) => setForm({ ...form, penalties: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-rose-700"
              />
            </div>
          </div>

          <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-700 block">صافي الراتب المستحق للصرف</span>
              <span className="text-xl font-black text-indigo-950 mt-0.5 block">
                {netSalary.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </span>
            </div>
            <div className="text-right text-[10px] text-indigo-600">
              <div>{basic.toLocaleString()} أساسي + {ot.toLocaleString()} إضافي</div>
              <div>- {(deduct + adv + pen).toLocaleString()} استقطاعات</div>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">الخزينة أو البنك (الصرف منه)</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900"
              required
            >
              <option value="">-- اختر الخزينة أو البنك --</option>
              {treasuryAccounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.kind === 'CASH' ? '💵' : '🏦'} {acc.name} (الرصيد المتاح: {Number(acc.currentBalance || 0).toLocaleString()} ج.م)
                </option>
              ))}
            </select>
          </div>

          {isOverTreasury && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 flex items-start gap-2 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span>رصيد الخزينة المحددة غير كافٍ لصرف الراتب!</span>
                <p className="text-[11px] text-rose-700 font-normal mt-0.5">
                  المتاح في ({selectedAccount?.name}): {availableBalance.toLocaleString()} ج.م، وصافي الراتب: {netSalary.toLocaleString()} ج.م.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ الصرف</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">ملاحظات</label>
              <input
                type="text"
                placeholder="راتب شهر ... / مكافأة تقييم"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                Boolean(isOverTreasury) ||
                netSalary <= 0 ||
                !form.employeeName ||
                !form.jobTitle ||
                !form.accountId
              }
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>{isPending ? 'جاري الحفظ والصرف...' : 'حفظ وصرف الراتب الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
});
