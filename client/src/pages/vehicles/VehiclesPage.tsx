import { MutationNotice, QueryNotice } from "../../components/ui/MutationNotice";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Vehicle } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Bus, Plus, Gauge, AlertTriangle, UserCheck, Edit3, Trash2, ShieldAlert } from 'lucide-react';
import { getComplianceStatus, formatLocalDate } from '../../utils/compliance';

export const VehiclesPage: React.FC = () => {
  const { canManage } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterOwnership, setFilterOwnership] = useState<string>('');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('');

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    plateNumber: '',
    make: '',
    model: '',
    manufacturingYear: new Date().getFullYear(),
    vehicleType: 'BUS_50_SEATER',
    capacity: 50,
    currentMileage: 0,
    insuranceExpiry: '',
    licenseExpiry: '',
    inspectionExpiry: '',
    ownershipType: 'COMPANY' as 'COMPANY' | 'SUPPLIER',
    supplierId: '',
  });

  const [editFormData, setEditFormData] = useState({
    plateNumber: '',
    make: '',
    model: '',
    manufacturingYear: new Date().getFullYear(),
    vehicleType: 'BUS_50_SEATER',
    capacity: 50,
    currentMileage: 0,
    status: 'AVAILABLE',
    insuranceExpiry: '',
    licenseExpiry: '',
    inspectionExpiry: '',
    ownershipType: 'COMPANY' as 'COMPANY' | 'SUPPLIER',
    supplierId: '',
  });

  const { data: suppliersData } = useQuery<{ data: any[] }>({
    queryKey: ['partners'],
    queryFn: async () => {
      const res = await api.get('/partners');
      return res.data;
    },
  });
  const suppliers = suppliersData?.data || [];

  const { data, isLoading, isError, refetch } = useQuery<{ data: Vehicle[] }>({
    queryKey: ['vehicles', filterStatus, filterOwnership, filterSupplierId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterSupplierId) {
        params.append('supplierId', filterSupplierId);
      } else if (filterOwnership) {
        params.append('ownership', filterOwnership);
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/vehicles${queryString}`);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { ownershipType, supplierId, ...rest } = payload;
      return api.post('/vehicles', {
        ...rest,
        supplierId: ownershipType === 'SUPPLIER' && supplierId ? supplierId : null,
        manufacturingYear: Number(payload.manufacturingYear),
        capacity: Number(payload.capacity),
        currentMileage: Number(payload.currentMileage),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { ownershipType, supplierId, ...rest } = payload;
      return api.put(`/vehicles/${id}`, {
        ...rest,
        supplierId: ownershipType === 'SUPPLIER' && supplierId ? supplierId : null,
        manufacturingYear: Number(payload.manufacturingYear),
        capacity: Number(payload.capacity),
        currentMileage: Number(payload.currentMileage),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setEditingVehicle(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setDeletingVehicle(null);
    },
  });

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setEditFormData({
      plateNumber: v.plateNumber,
      make: v.make,
      model: v.model,
      manufacturingYear: v.manufacturingYear,
      vehicleType: v.vehicleType,
      capacity: v.capacity,
      currentMileage: v.currentMileage,
      status: v.status,
      insuranceExpiry: formatLocalDate(v.insuranceExpiry),
      licenseExpiry: formatLocalDate(v.licenseExpiry),
      inspectionExpiry: formatLocalDate(v.inspectionExpiry),
      ownershipType: v.supplierId ? 'SUPPLIER' : 'COMPANY',
      supplierId: v.supplierId || '',
    });
  };

  const vehicles = data?.data || [];

  return (
    <div className="space-y-6">
      <QueryNotice failed={isError} retry={refetch} />
      <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('navVehicles')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'متابعة أسطول الحافلات، قراءات العدادات، وتواريخ انتهاء الفحص الدوري والتأمين'
              : 'Manage company-owned buses, vans, odometer readings, and statutory inspection certificates'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setFormData({
                plateNumber: '',
                make: '',
                model: '',
                manufacturingYear: new Date().getFullYear(),
                vehicleType: 'BUS_50_SEATER',
                capacity: 50,
                currentMileage: 0,
                insuranceExpiry: '',
                licenseExpiry: '',
                inspectionExpiry: '',
                ownershipType: 'COMPANY',
                supplierId: '',
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('registerVehicle')}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Ownership Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['', 'AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st ? t(st as any) || st.replace('_', ' ') : t('allVehicles')}
            </button>
          ))}
        </div>

        {/* Ownership & Supplier Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterOwnership}
            onChange={(e) => {
              setFilterOwnership(e.target.value);
              if (e.target.value !== 'SUPPLIER') setFilterSupplierId('');
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">{lang === 'ar' ? '🏢 جميع جهات الملكية' : 'All Ownership'}</option>
            <option value="COMPANY">{lang === 'ar' ? '🏢 أسطول الشركة فقط' : 'Company Fleet Only'}</option>
            <option value="SUPPLIER">{lang === 'ar' ? '🚚 سيارات الموردين فقط' : 'Supplier Vehicles Only'}</option>
          </select>

          {filterOwnership === 'SUPPLIER' && (
            <select
              value={filterSupplierId}
              onChange={(e) => setFilterSupplierId(e.target.value)}
              className="px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none animate-fade-in"
            >
              <option value="">{lang === 'ar' ? 'جميع الموردين' : 'All Suppliers'}</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
          <Bus className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            {lang === 'ar' ? 'لا توجد حافلات تطابق هذا الفلتر' : 'No vehicles matching criteria'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-4">{t('plateNumber')}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الملكية والتبعية' : 'Ownership'}</th>
                  <th className="py-3 px-4">{t('specs')}</th>
                  <th className="py-3 px-4">{t('capacity')}</th>
                  <th className="py-3 px-4">{t('mileage')}</th>
                  <th className="py-3 px-4">{t('dedicatedDriver')}</th>
                  <th className="py-3 px-4">{t('docExpirations')}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                  {canManage && <th className="py-3 px-4 text-end">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => {
                  const licComp = getComplianceStatus(v.licenseExpiry);
                  const inspComp = getComplianceStatus(v.inspectionExpiry);
                  const insComp = getComplianceStatus(v.insuranceExpiry);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 text-sm">{v.plateNumber}</div>
                        <span className="text-[10px] text-slate-400 uppercase">{v.vehicleType.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {v.supplier ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              🚚 {v.supplier.name}
                            </span>
                            <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'مورد خارجي' : 'Outsourced Supplier'}</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              🏢 {lang === 'ar' ? 'أسطول الشركة' : 'Company Fleet'}
                            </span>
                            <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'أصل داخلي' : 'In-House Asset'}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {v.make} {v.model}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lang === 'ar' ? `موديل ${v.manufacturingYear}` : `Year ${v.manufacturingYear}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {v.capacity} {lang === 'ar' ? 'مقعد' : 'seats'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium font-mono">
                          <Gauge className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{v.currentMileage.toLocaleString()} km</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {v.assignedDriver ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <div className="font-medium text-slate-900">{v.assignedDriver.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{v.assignedDriver.phoneNumber}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                            {t('unassigned')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-[10px]">
                          {/* Vehicle License */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 font-medium">{t('license')}:</span>
                            <span className={`inline-flex items-center gap-1 px-1 py-0.2 rounded font-semibold border ${licComp.badgeClass}`}>
                              {licComp.status === 'EXPIRED' && <ShieldAlert className="h-2 w-2 shrink-0" />}
                              {licComp.status === 'EXPIRING_SOON' && <AlertTriangle className="h-2 w-2 shrink-0" />}
                              <span>{licComp.formattedDate} ({lang === 'ar' ? licComp.labelAr : licComp.labelEn})</span>
                            </span>
                          </div>
                          {/* Technical Inspection */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 font-medium">{t('inspection')}:</span>
                            <span className={`inline-flex items-center gap-1 px-1 py-0.2 rounded font-semibold border ${inspComp.badgeClass}`}>
                              {inspComp.status === 'EXPIRED' && <ShieldAlert className="h-2 w-2 shrink-0" />}
                              {inspComp.status === 'EXPIRING_SOON' && <AlertTriangle className="h-2 w-2 shrink-0" />}
                              <span>{inspComp.formattedDate} ({lang === 'ar' ? inspComp.labelAr : inspComp.labelEn})</span>
                            </span>
                          </div>
                          {/* Insurance */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 font-medium">{t('insurance')}:</span>
                            <span className={`inline-flex items-center gap-1 px-1 py-0.2 rounded font-semibold border ${insComp.badgeClass}`}>
                              {insComp.status === 'EXPIRED' && <ShieldAlert className="h-2 w-2 shrink-0" />}
                              {insComp.status === 'EXPIRING_SOON' && <AlertTriangle className="h-2 w-2 shrink-0" />}
                              <span>{insComp.formattedDate} ({lang === 'ar' ? insComp.labelAr : insComp.labelEn})</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={v.status} />
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 text-end">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(v)}
                              title={t('edit')}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingVehicle(v)}
                              title={t('delete')}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Vehicle Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('registerVehicle')}
        subtitle={lang === 'ar' ? 'إضافة حافلة جديدة إلى أسطول النقل الخاص بالشركة' : 'Add new shuttle bus, van, or fleet unit'}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          {/* Ownership Type Section */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              {lang === 'ar' ? 'جهة ملكية وتبعية المركبة' : 'Vehicle Ownership & Affiliation'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  formData.ownershipType === 'COMPANY'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="createOwnershipType"
                  value="COMPANY"
                  checked={formData.ownershipType === 'COMPANY'}
                  onChange={() => setFormData({ ...formData, ownershipType: 'COMPANY', supplierId: '' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>{lang === 'ar' ? '🏢 تابعة للشركة (أسطول داخلي)' : '🏢 Company Owned (Internal Fleet)'}</span>
              </label>
              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  formData.ownershipType === 'SUPPLIER'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="createOwnershipType"
                  value="SUPPLIER"
                  checked={formData.ownershipType === 'SUPPLIER'}
                  onChange={() => setFormData({ ...formData, ownershipType: 'SUPPLIER' })}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>{lang === 'ar' ? '🚚 تابعة لمورد خارجي' : '🚚 Supplier / Outsourced'}</span>
              </label>
            </div>

            {formData.ownershipType === 'SUPPLIER' && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  {lang === 'ar' ? 'اختر المورد المسؤول عن الحافلة *' : 'Select Vehicle Supplier *'}
                </label>
                <select
                  required
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="block w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                >
                  <option value="">{lang === 'ar' ? '-- اختر المورد من القائمة --' : '-- Select Supplier --'}</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('plateNumber')}</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={30}
                value={formData.plateNumber}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                placeholder="TRN-1001"
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'نوع الحافلة' : 'Vehicle Type'}</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="BUS_50_SEATER">{lang === 'ar' ? 'باص كبير (50 مقعد)' : 'Bus (50-Seater)'}</option>
                <option value="MINIBUS_30_SEATER">{lang === 'ar' ? 'ميني باص (30 مقعد)' : 'Minibus (30-Seater)'}</option>
                <option value="VAN_14_SEATER">{lang === 'ar' ? 'ميكروباص / فان (14 مقعد)' : 'Van (14-Seater)'}</option>
                <option value="SEDAN">{lang === 'ar' ? 'سيارة سيدان' : 'Sedan'}</option>
                <option value="OTHER">{lang === 'ar' ? 'أخرى' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'الماركة' : 'Make / Brand'}</label>
              <input
                type="text"
                required
                maxLength={50}
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                placeholder="Mercedes-Benz"
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'الموديل' : 'Model'}</label>
              <input
                type="text"
                required
                maxLength={50}
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Travego"
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'سنة الصنع' : 'Year'}</label>
              <input
                type="number"
                required
                min={1990}
                max={2030}
                value={formData.manufacturingYear}
                onChange={(e) => setFormData({ ...formData, manufacturingYear: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('capacity')}</label>
              <input
                type="number"
                min={1}
                max={150}
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('mileage')}</label>
              <input
                type="number"
                min={0}
                required
                value={formData.currentMileage}
                onChange={(e) => setFormData({ ...formData, currentMileage: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700">{t('insurance')}</label>
              <input
                type="date"
                required
                value={formData.insuranceExpiry}
                onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                className="mt-1 block w-full px-2 py-2 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700">{t('license')}</label>
              <input
                type="date"
                required
                value={formData.licenseExpiry}
                onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                className="mt-1 block w-full px-2 py-2 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700">{t('inspection')}</label>
              <input
                type="date"
                required
                value={formData.inspectionExpiry}
                onChange={(e) => setFormData({ ...formData, inspectionExpiry: e.target.value })}
                className="mt-1 block w-full px-2 py-2 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
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
              {createMutation.isPending ? t('authenticating') : t('registerVehicle')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Vehicle Modal */}
      <Modal
        isOpen={!!editingVehicle}
        onClose={() => setEditingVehicle(null)}
        title={t('editVehicle')}
        subtitle={t('editVehicleSubtitle')}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        {editingVehicle && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: editingVehicle.id, payload: editFormData });
            }}
            className="space-y-4"
          >
            {/* Ownership Type Section */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">
                {lang === 'ar' ? 'جهة ملكية وتبعية المركبة' : 'Vehicle Ownership & Affiliation'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    editFormData.ownershipType === 'COMPANY'
                      ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="editOwnershipType"
                    value="COMPANY"
                    checked={editFormData.ownershipType === 'COMPANY'}
                    onChange={() => setEditFormData({ ...editFormData, ownershipType: 'COMPANY', supplierId: '' })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>{lang === 'ar' ? '🏢 تابعة للشركة (أسطول داخلي)' : '🏢 Company Owned (Internal Fleet)'}</span>
                </label>
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    editFormData.ownershipType === 'SUPPLIER'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="editOwnershipType"
                    value="SUPPLIER"
                    checked={editFormData.ownershipType === 'SUPPLIER'}
                    onChange={() => setEditFormData({ ...editFormData, ownershipType: 'SUPPLIER' })}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>{lang === 'ar' ? '🚚 تابعة لمورد خارجي' : '🚚 Supplier / Outsourced'}</span>
                </label>
              </div>

              {editFormData.ownershipType === 'SUPPLIER' && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    {lang === 'ar' ? 'اختر المورد المسؤول عن الحافلة *' : 'Select Vehicle Supplier *'}
                  </label>
                  <select
                    required
                    value={editFormData.supplierId}
                    onChange={(e) => setEditFormData({ ...editFormData, supplierId: e.target.value })}
                    className="block w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="">{lang === 'ar' ? '-- اختر المورد من القائمة --' : '-- Select Supplier --'}</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">{t('plateNumber')}</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={30}
                  value={editFormData.plateNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, plateNumber: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'نوع الحافلة' : 'Vehicle Type'}</label>
                <select
                  value={editFormData.vehicleType}
                  onChange={(e) => setEditFormData({ ...editFormData, vehicleType: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="BUS_50_SEATER">{lang === 'ar' ? 'باص كبير (50 مقعد)' : 'Bus (50-Seater)'}</option>
                  <option value="MINIBUS_30_SEATER">{lang === 'ar' ? 'ميني باص (30 مقعد)' : 'Minibus (30-Seater)'}</option>
                  <option value="VAN_14_SEATER">{lang === 'ar' ? 'ميكروباص / فان (14 مقعد)' : 'Van (14-Seater)'}</option>
                  <option value="SEDAN">{lang === 'ar' ? 'سيارة سيدان' : 'Sedan'}</option>
                  <option value="OTHER">{lang === 'ar' ? 'أخرى' : 'Other'}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'الماركة' : 'Make / Brand'}</label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={editFormData.make}
                  onChange={(e) => setEditFormData({ ...editFormData, make: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'الموديل' : 'Model'}</label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={editFormData.model}
                  onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'سنة الصنع' : 'Year'}</label>
                <input
                  type="number"
                  required
                  min={1990}
                  max={2030}
                  value={editFormData.manufacturingYear}
                  onChange={(e) => setEditFormData({ ...editFormData, manufacturingYear: Number(e.target.value) })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">{t('capacity')}</label>
                <input
                  type="number"
                  min={1}
                  max={150}
                  required
                  value={editFormData.capacity}
                  onChange={(e) => setEditFormData({ ...editFormData, capacity: Number(e.target.value) })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{t('mileage')}</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editFormData.currentMileage}
                  onChange={(e) => setEditFormData({ ...editFormData, currentMileage: Number(e.target.value) })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{t('status')}</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="AVAILABLE">{t('AVAILABLE')}</option>
                  <option value="ASSIGNED">{t('ASSIGNED')}</option>
                  <option value="ON_TRIP">{t('ON_TRIP')}</option>
                  <option value="UNDER_MAINTENANCE">{t('UNDER_MAINTENANCE')}</option>
                  <option value="OUT_OF_SERVICE">{t('OUT_OF_SERVICE')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700">{t('insurance')}</label>
                <input
                  type="date"
                  required
                  value={editFormData.insuranceExpiry}
                  onChange={(e) => setEditFormData({ ...editFormData, insuranceExpiry: e.target.value })}
                  className="mt-1 block w-full px-2 py-2 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700">{t('license')}</label>
                <input
                  type="date"
                  required
                  value={editFormData.licenseExpiry}
                  onChange={(e) => setEditFormData({ ...editFormData, licenseExpiry: e.target.value })}
                  className="mt-1 block w-full px-2 py-2 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700">{t('inspection')}</label>
                <input
                  type="date"
                  required
                  value={editFormData.inspectionExpiry}
                  onChange={(e) => setEditFormData({ ...editFormData, inspectionExpiry: e.target.value })}
                  className="mt-1 block w-full px-2 py-2 border border-slate-200 rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {updateMutation.isPending ? t('authenticating') : t('save')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Vehicle Confirmation Modal */}
      <Modal
        isOpen={!!deletingVehicle}
        onClose={() => setDeletingVehicle(null)}
        title={t('deleteVehicle')}
        subtitle={`${t('deleteVehicleConfirm')} "${deletingVehicle?.plateNumber}" (${deletingVehicle?.make} ${deletingVehicle?.model})`}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('deleteWarningText')}</p>
              {deletingVehicle?.assignedDriver && (
                <p className="mt-1 text-rose-700">
                  {lang === 'ar'
                    ? `ملاحظة: هذه الحافلة مخصصة حالياً للسائق (${deletingVehicle.assignedDriver.fullName}). سيتم فك التخصيص وإتاحة السائق.`
                    : `Note: This vehicle is assigned to (${deletingVehicle.assignedDriver.fullName}). The driver will be uncoupled.`}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeletingVehicle(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deletingVehicle && deleteMutation.mutate(deletingVehicle.id)}
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