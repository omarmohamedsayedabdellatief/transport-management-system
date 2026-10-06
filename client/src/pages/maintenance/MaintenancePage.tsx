import { MutationNotice, QueryNotice } from "../../components/ui/MutationNotice";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { MaintenanceRecord, Vehicle, MaintenanceType, MaintenanceStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Wrench, Plus, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const { canManage, canFinance } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingMaint, setDeletingMaint] = useState<MaintenanceRecord | null>(null);

  const [filterVehicleId, setFilterVehicleId] = useState<string>('');
  const [filterOwnership, setFilterOwnership] = useState<string>('');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [formData, setFormData] = useState({
    vehicleId: '',
    maintenanceType: 'OIL_CHANGE' as MaintenanceType,
    serviceDate: new Date().toISOString().split('T')[0],
    cost: '',
    mileageAtService: 0,
    serviceProvider: '',
    downtimeHours: 0,
    status: 'IN_PROGRESS' as MaintenanceStatus,
    description: '',
  });

  const { data: maintData, isLoading, isError, refetch } = useQuery<{ data: MaintenanceRecord[] }>({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const res = await api.get('/maintenance');
      return res.data;
    },
  });

  const { data: summaryData } = useQuery({
    queryKey: ['maintenance-summary'],
    queryFn: async () => {
      const res = await api.get('/maintenance/summary');
      return res.data.data;
    },
  });

  const { data: vehiclesData } = useQuery<{ data: Vehicle[] }>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    },
  });

  const { data: suppliersData } = useQuery<{ data: any[] }>({
    queryKey: ['partners'],
    queryFn: async () => {
      const res = await api.get('/partners');
      return res.data;
    },
  });
  const suppliers = suppliersData?.data || [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/maintenance', {
        ...payload,
        cost: Number(payload.cost),
        mileageAtService: Number(payload.mileageAtService),
        downtimeHours: Number(payload.downtimeHours),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setIsModalOpen(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/maintenance/${id}`, { status: 'COMPLETED' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/maintenance/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setDeletingMaint(null);
    },
  });

  const allRecords = maintData?.data || [];
  const vehicles = vehiclesData?.data || [];
  const summary = summaryData || { totalCost: 0, totalRecords: 0 };

  // Filter records based on selected filters
  const records = allRecords.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterVehicleId && r.vehicleId !== filterVehicleId) return false;
    if (filterSupplierId && r.vehicle?.supplierId !== filterSupplierId) return false;
    if (filterOwnership === 'COMPANY' && r.vehicle?.supplierId) return false;
    if (filterOwnership === 'SUPPLIER' && !r.vehicle?.supplierId) return false;
    return true;
  });

  const filteredTotalCost = records.reduce((sum, r) => sum + Number(r.cost || 0), 0);

  const getMaintenanceTypeName = (mType: string) => {
    if (lang === 'ar') {
      switch (mType) {
        case 'OIL_CHANGE': return 'تغيير زيت وفلاتر';
        case 'TIRES': return 'إطارات وترصيص';
        case 'ENGINE': return 'عمرة / ميكانيكا محرك';
        case 'MECHANICAL_REPAIR': return 'إصلاح فرامل وميكانيكا';
        case 'ELECTRICAL_REPAIR': return 'كهرباء وتكييف';
        case 'PERIODIC_INSPECTION': return 'فحص دوري';
        default: return 'صيانة عامة';
      }
    }
    return mType.replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      <QueryNotice failed={isError} retry={refetch} />
      <MutationNotice mutations={[createMutation, completeMutation, deleteMutation]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('navMaintenance')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'متابعة الإصلاحات الميكانيكية، الفحص الدوري، فواتير الورش، وحساب ساعات توقف الحافلات'
              : 'Track mechanical repairs, periodic inspections, workshop costs, and vehicle downtime'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setFormData({
                vehicleId: '',
                maintenanceType: 'OIL_CHANGE',
                serviceDate: new Date().toISOString().split('T')[0],
                cost: '',
                mileageAtService: 0,
                serviceProvider: '',
                downtimeHours: 0,
                status: 'IN_PROGRESS',
                description: '',
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('logMaintenance')}</span>
          </button>
        )}
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {canFinance && <>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t('totalMaintenanceSpend')}</span>
          <div className="mt-1 text-2xl font-bold text-slate-900 font-mono">
            EGP {Number((filterVehicleId || filterOwnership || filterSupplierId || filterStatus ? filteredTotalCost : summary.totalCost) || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {filterVehicleId || filterOwnership || filterSupplierId || filterStatus
              ? (lang === 'ar' ? 'تكلفة الصيانة للنتائج المفلترة' : 'Filtered maintenance cost')
              : (lang === 'ar' ? 'إجمالي تكلفة صيانة الأسطول' : 'Fleet lifetime service cost')}
          </span>
        </div>
        </>}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t('totalServiceEvents')}</span>
          <div className="mt-1 text-2xl font-bold text-slate-900 font-mono">{records.length}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{lang === 'ar' ? 'عمليات إصلاح مطابقة' : 'Matching repair events'}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">{t('vehiclesInWorkshop')}</span>
          <div className="mt-1 text-2xl font-bold text-amber-600 font-mono">
            {records.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'SCHEDULED').length}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{lang === 'ar' ? 'تخضع للصيانة حالياً' : 'Currently undergoing maintenance'}</span>
        </div>
      </div>

      {/* Filter Toolbar: Vehicle, Ownership, Supplier, Status */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-blue-600" />
            {lang === 'ar' ? 'تصفية وبحث سجلات الصيانة:' : 'Filter Maintenance Records:'}
          </span>
          {(filterVehicleId || filterOwnership || filterSupplierId || filterStatus) && (
            <button
              onClick={() => {
                setFilterVehicleId('');
                setFilterOwnership('');
                setFilterSupplierId('');
                setFilterStatus('');
              }}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
            >
              {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {/* Filter by Vehicle */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">{lang === 'ar' ? 'حسب المركبة' : 'By Vehicle'}</label>
            <select
              value={filterVehicleId}
              onChange={(e) => setFilterVehicleId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">{lang === 'ar' ? 'كل المركبات' : 'All Vehicles'}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber} ({v.make} {v.model}) {v.supplier ? `[${v.supplier.name}]` : '[شركة]'}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Ownership */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">{lang === 'ar' ? 'ملكية المركبة' : 'Ownership'}</label>
            <select
              value={filterOwnership}
              onChange={(e) => {
                setFilterOwnership(e.target.value);
                if (e.target.value !== 'SUPPLIER') setFilterSupplierId('');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">{lang === 'ar' ? 'الكل (شركة وموردين)' : 'All Ownership'}</option>
              <option value="COMPANY">{lang === 'ar' ? '🏢 أسطول الشركة فقط' : 'Company Fleet Only'}</option>
              <option value="SUPPLIER">{lang === 'ar' ? '🚚 سيارات الموردين فقط' : 'Supplier Vehicles Only'}</option>
            </select>
          </div>

          {/* Filter by Specific Supplier */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">{lang === 'ar' ? 'المورد المسؤول' : 'By Supplier'}</label>
            <select
              disabled={filterOwnership === 'COMPANY'}
              value={filterSupplierId}
              onChange={(e) => {
                setFilterSupplierId(e.target.value);
                if (e.target.value) setFilterOwnership('SUPPLIER');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">{lang === 'ar' ? 'جميع الموردين' : 'All Suppliers'}</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">{lang === 'ar' ? 'حالة الصيانة' : 'Status'}</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">{lang === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="IN_PROGRESS">{t('IN_PROGRESS')}</option>
              <option value="SCHEDULED">{t('SCHEDULED')}</option>
              <option value="COMPLETED">{t('COMPLETED')}</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
          <Wrench className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            {lang === 'ar' ? 'لا توجد سجلات صيانة تطابق هذا الفلتر' : 'No maintenance records matching criteria'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-4">{t('plateNumber')}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'التبعية' : 'Affiliation'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'نوع الصيانة' : 'Service Type'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'التفاصيل' : 'Description'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الورشة / جهة الصيانة' : 'Workshop / Provider'}</th>
                  {canFinance && <th className="py-3 px-4">{lang === 'ar' ? 'التكلفة' : 'Cost'}</th>}
                  <th className="py-3 px-4">{t('status')}</th>
                  {canManage && <th className="py-3 px-4 text-end">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900">{r.vehicle?.plateNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.vehicle?.make} {r.vehicle?.model}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {r.vehicle?.supplier ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          🚚 {r.vehicle.supplier.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          🏢 {lang === 'ar' ? 'شركة' : 'Company'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {getMaintenanceTypeName(r.maintenanceType)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {new Date(r.serviceDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">{r.description}</td>
                    <td className="py-3.5 px-4 text-slate-600">{r.serviceProvider || (lang === 'ar' ? 'ورشة داخلية' : 'In-house garage')}</td>
                    {canFinance && <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {canFinance ? `EGP ${Number(r.cost).toLocaleString()}` : '—'}
                    </td>}
                    <td className="py-3.5 px-4">
                      <Badge status={r.status} />
                    </td>
                    {canManage && (
                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status !== 'COMPLETED' ? (
                            <button
                              disabled={completeMutation.isPending}
                              onClick={() => completeMutation.mutate(r.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{t('markFixed')}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">{t('resolved')}</span>
                          )}
                          {r.status === 'SCHEDULED' && <button
                            onClick={() => setDeletingMaint(r)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title={t('deleteMaintenance')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Maintenance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('logMaintenance')}
        subtitle={
          lang === 'ar'
            ? 'راجع المركبة والتاريخ والتكلفة. الصيانة الحالية تمنع التشغيل حتى إتمام الإصلاح.'
            : 'Check the vehicle, date and cost. Current maintenance blocks dispatch until resolved.'
        }
      >
        <MutationNotice mutations={[createMutation, completeMutation, deleteMutation]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('navVehicles')}</label>
              <select
                required
                value={formData.vehicleId}
                onChange={(e) => {
                  const v = vehicles.find((item) => item.id === e.target.value);
                  setFormData({
                    ...formData,
                    vehicleId: e.target.value,
                    mileageAtService: v?.currentMileage || 0,
                  });
                }}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">{lang === "ar" ? "اختر…" : "Choose…"}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.make} {v.model})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'نوع الصيانة' : 'Maintenance Type'}</label>
              <select
                value={formData.maintenanceType}
                onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value as MaintenanceType })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="OIL_CHANGE">{lang === 'ar' ? 'تغيير زيت وفلاتر' : 'Oil & Filter Change'}</option>
                <option value="TIRES">{lang === 'ar' ? 'استبدال وترصيص إطارات' : 'Tire Replacement & Balancing'}</option>
                <option value="ENGINE">{lang === 'ar' ? 'عمرة محرك وفتيس' : 'Engine & Transmission Overhaul'}</option>
                <option value="MECHANICAL_REPAIR">{lang === 'ar' ? 'إصلاح فرامل وميكانيكا' : 'Mechanical & Brakes Repair'}</option>
                <option value="ELECTRICAL_REPAIR">{lang === 'ar' ? 'كهرباء وتكييف' : 'Electrical & AC System'}</option>
                <option value="PERIODIC_INSPECTION">{lang === 'ar' ? 'فحص دوري وسلامة' : 'Periodic Safety Inspection'}</option>
                <option value="OTHER">{lang === 'ar' ? 'صيانة عامة / أخرى' : 'General Servicing / Other'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ الصيانة' : 'Service Date'}</label>
              <input
                type="date"
                required
                value={formData.serviceDate}
                onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'التكلفة (EGP)' : 'Service Cost (EGP)'}</label>
              <input
                type="number"
                required
                min={0}
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'التوقف (ساعات)' : 'Downtime (Hours)'}</label>
              <input
                type="number"
                required
                min={0}
                value={formData.downtimeHours}
                onChange={(e) => setFormData({ ...formData, downtimeHours: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'قراءة العداد الحالية (كم)' : 'Odometer at Service (km)'}</label>
              <input
                type="number"
                required
                min={0}
                value={formData.mileageAtService}
                onChange={(e) => setFormData({ ...formData, mileageAtService: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'الورشة / جهة الصيانة' : 'Workshop / Service Provider'}</label>
              <input
                type="text"
                value={formData.serviceProvider}
                onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'شرح الأعمال المنفذة' : 'Work Description'}</label>
            <textarea
              required
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {createMutation.isPending ? t('authenticating') : t('logMaintenance')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Maintenance Confirmation Modal */}
      <Modal
        isOpen={!!deletingMaint}
        onClose={() => setDeletingMaint(null)}
        title={t('deleteMaintenance')}
        subtitle={`${t('navVehicles')}: ${deletingMaint?.vehicle?.plateNumber}`}
      >
        <MutationNotice mutations={[createMutation, completeMutation, deleteMutation]} />
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('deleteWarningText')}</p>
              <p className="mt-1 text-rose-700">
                {lang === 'ar'
                  ? 'سيتم حذف سجل الصيانة هذا وتحديث ملخص نفقات الأسطول.'
                  : 'This maintenance record will be deleted, and fleet expense summary will be updated.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeletingMaint(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deletingMaint && deleteMutation.mutate(deletingMaint.id)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {deleteMutation.isPending ? t('authenticating') : t('delete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};