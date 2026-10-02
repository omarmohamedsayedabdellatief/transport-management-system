import { MutationNotice, QueryNotice } from "../../components/ui/MutationNotice";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Driver, Vehicle } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Users, Plus, Phone, Bus, AlertTriangle, ArrowRightLeft, Edit3, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { getComplianceStatus, formatLocalDate } from '../../utils/compliance';

export const DriversPage: React.FC = () => {
  const { canManage } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [filterOwnership, setFilterOwnership] = useState<string>('');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('');

  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    nationalId: '',
    licenseNumber: '',
    licenseExpirationDate: '',
    assignedVehicleId: '',
    ownershipType: 'COMPANY' as 'COMPANY' | 'SUPPLIER',
    supplierId: '',
  });

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phoneNumber: '',
    nationalId: '',
    licenseNumber: '',
    licenseExpirationDate: '',
    dutyStatus: 'AVAILABLE',
    employmentStatus: 'ACTIVE',
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

  const { data: driversData, isLoading, isError, refetch } = useQuery<{ data: Driver[] }>({
    queryKey: ['drivers', filterOwnership, filterSupplierId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterSupplierId) {
        params.append('supplierId', filterSupplierId);
      } else if (filterOwnership) {
        params.append('ownership', filterOwnership);
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/drivers${queryString}`);
      return res.data;
    },
  });

  const { data: unassignedVehiclesData } = useQuery<{ data: Vehicle[] }>({
    queryKey: ['unassigned-vehicles'],
    queryFn: async () => {
      const res = await api.get('/vehicles/unassigned');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { ownershipType, supplierId, ...rest } = payload;
      return api.post('/drivers', {
        ...rest,
        supplierId: ownershipType === 'SUPPLIER' && supplierId ? supplierId : null,
        assignedVehicleId: payload.assignedVehicleId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { ownershipType, supplierId, ...rest } = payload;
      return api.put(`/drivers/${id}`, {
        ...rest,
        supplierId: ownershipType === 'SUPPLIER' && supplierId ? supplierId : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setEditingDriver(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/drivers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setDeletingDriver(null);
    },
  });

  const assignVehicleMutation = useMutation({
    mutationFn: async ({ driverId, vehicleId }: { driverId: string; vehicleId: string | null }) => {
      return api.patch(`/drivers/${driverId}/assign-vehicle`, { vehicleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setIsAssignModalOpen(false);
      setSelectedDriver(null);
    },
  });

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setEditFormData({
      fullName: driver.fullName,
      phoneNumber: driver.phoneNumber,
      nationalId: driver.nationalId,
      licenseNumber: driver.licenseNumber,
      licenseExpirationDate: formatLocalDate(driver.licenseExpirationDate),
      dutyStatus: driver.dutyStatus,
      employmentStatus: driver.employmentStatus,
      ownershipType: driver.supplierId ? 'SUPPLIER' : 'COMPANY',
      supplierId: driver.supplierId || '',
    });
  };

  const drivers = driversData?.data || [];
  const unassignedVehicles = unassignedVehiclesData?.data || [];

  const openAssignModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setSelectedVehicleId(driver.assignedVehicleId || '');
    setIsAssignModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <QueryNotice failed={isError} retry={refetch} />
      <MutationNotice mutations={[createMutation, updateMutation, deleteMutation, assignVehicleMutation]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('navDrivers')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'إدارة السائقين، متابعة صلاحيات رخص القيادة، وتخصيص الحافلات الدائم (1:1)'
              : 'Manage company drivers, license compliance, and 1:1 dedicated vehicle pairings'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setFormData({
                fullName: '',
                phoneNumber: '',
                nationalId: '',
                licenseNumber: '',
                licenseExpirationDate: '',
                assignedVehicleId: '',
                ownershipType: 'COMPANY',
                supplierId: '',
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addDriver')}</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar for Driver Ownership */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">
            {lang === 'ar' ? 'تصنيف السائقين حسب التبعية:' : 'Filter Drivers by Affiliation:'}
          </span>
          <select
            value={filterOwnership}
            onChange={(e) => {
              setFilterOwnership(e.target.value);
              if (e.target.value !== 'SUPPLIER') setFilterSupplierId('');
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">{lang === 'ar' ? '🏢 جميع السائقين (الشركة والموردين)' : 'All Drivers'}</option>
            <option value="COMPANY">{lang === 'ar' ? '🏢 سائقو أسطول الشركة فقط' : 'Company Drivers Only'}</option>
            <option value="SUPPLIER">{lang === 'ar' ? '🚚 سائقو الموردين فقط' : 'Supplier Drivers Only'}</option>
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
      ) : drivers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            {lang === 'ar' ? 'لا يوجد سائقين مسجلين يطابقون الفلتر الحالي' : 'No drivers matching criteria'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-4">{t('fullName')}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'التبعية والملكية' : 'Affiliation'}</th>
                  <th className="py-3 px-4">{t('contact')}</th>
                  <th className="py-3 px-4">{t('nationalId')}</th>
                  <th className="py-3 px-4">{t('licenseExpiry')}</th>
                  <th className="py-3 px-4">{t('dedicatedDriver')}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'حالة العمل' : 'Duty Status'}</th>
                  {canManage && <th className="py-3 px-4 text-end">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map((d) => {
                  const licComp = getComplianceStatus(d.licenseExpirationDate);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 break-words break-all">{d.fullName}</td>
                      <td className="py-3.5 px-4">
                        {d.supplier ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              🚚 {d.supplier.name}
                            </span>
                            <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'مورد نقل' : 'Outsourced Supplier'}</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              🏢 {lang === 'ar' ? 'أسطول الشركة' : 'Company Fleet'}
                            </span>
                            <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'سائق داخلي' : 'In-House Driver'}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{d.phoneNumber}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{d.nationalId}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{d.licenseNumber}</div>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          <span className="font-mono text-[11px] text-slate-500">
                            {licComp.formattedDate}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${licComp.badgeClass}`}>
                            {licComp.status === 'EXPIRED' && <ShieldAlert className="h-2.5 w-2.5 shrink-0" />}
                            {licComp.status === 'EXPIRING_SOON' && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
                            {licComp.status === 'VALID' && <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 shrink-0" />}
                            <span>{lang === 'ar' ? licComp.labelAr : licComp.labelEn}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {d.assignedVehicle ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-900 font-medium">
                            <Bus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span className="font-mono font-bold">{d.assignedVehicle.plateNumber}</span>
                            <span className="text-[10px] text-blue-600">({d.assignedVehicle.make})</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            {t('noDedicatedVehicle')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={d.dutyStatus} />
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openAssignModal(d)}
                              title={t('pairVehicle')}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-2 py-1 rounded-md border border-blue-200 transition-colors"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              <span>{t('pairVehicle')}</span>
                            </button>
                            <button
                              onClick={() => openEditModal(d)}
                              title={t('edit')}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingDriver(d)}
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

      {/* Register Driver Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('addDriver')}
        subtitle={
          lang === 'ar'
            ? 'تطبيق قاعدة التخصيص الدائم (1:1) وتحديد جهة تبعية السائق'
            : 'Enforces 1:1 dedicated vehicle pairing and driver affiliation'
        }
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation, assignVehicleMutation]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          {/* Driver Ownership / Affiliation */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              {lang === 'ar' ? 'جهة تبعية السائق *' : 'Driver Affiliation / Ownership *'}
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
                  name="createDriverOwnership"
                  value="COMPANY"
                  checked={formData.ownershipType === 'COMPANY'}
                  onChange={() => setFormData({ ...formData, ownershipType: 'COMPANY', supplierId: '', assignedVehicleId: '' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>{lang === 'ar' ? '🏢 سائق تابع للشركة (داخلي)' : '🏢 Company Driver (In-House)'}</span>
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
                  name="createDriverOwnership"
                  value="SUPPLIER"
                  checked={formData.ownershipType === 'SUPPLIER'}
                  onChange={() => setFormData({ ...formData, ownershipType: 'SUPPLIER', assignedVehicleId: '' })}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>{lang === 'ar' ? '🚚 سائق تابع لمورد خارجي' : '🚚 Supplier / Outsourced'}</span>
              </label>
            </div>

            {formData.ownershipType === 'SUPPLIER' && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  {lang === 'ar' ? 'اختر المورد التابع له السائق *' : 'Select Driver Supplier *'}
                </label>
                <select
                  required
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value, assignedVehicleId: '' })}
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

          <div>
            <label className="block text-xs font-medium text-slate-700">{t('fullName')}</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder={lang === 'ar' ? 'مثال: إبراهيم مصطفى' : 'e.g. Ibrahim Mostafa'}
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('contact')}</label>
              <input
                type="tel"
                pattern="[0-9+ ]*"
                maxLength={20}
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+20 100 000 0000"
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('nationalId')}</label>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={14}
                required
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="28805121400213"
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'رقم رخصة القيادة' : 'Driving License Number'}</label>
              <input
                type="text"
                maxLength={50}
                required
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="DL-994821"
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ انتهاء الرخصة' : 'License Expiration Date'}</label>
              <input
                type="date"
                required
                value={formData.licenseExpirationDate}
                onChange={(e) => setFormData({ ...formData, licenseExpirationDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 1:1 Vehicle Pairing Selection */}
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
            <label className="block text-xs font-bold text-blue-900 mb-1">
              {lang === 'ar' ? 'تخصيص الحافلة الدائمة (قاعدة 1:1)' : 'Assign Dedicated Vehicle (1:1 Operational Pairing)'}
            </label>
            <p className="text-[11px] text-blue-700 mb-2">
              {formData.ownershipType === 'COMPANY'
                ? (lang === 'ar' ? 'يتم عرض حافلات أسطول الشركة غير المخصصة فقط:' : 'Only unassigned company fleet vehicles are listed:')
                : (lang === 'ar' ? 'يتم عرض حافلات المورد المختار غير المخصصة فقط:' : 'Only unassigned vehicles of the selected supplier are listed:')}
            </p>

            {formData.ownershipType === 'SUPPLIER' && !formData.supplierId ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                {lang === 'ar' ? '⚠️ يرجى اختيار المورد المسؤول أولاً لتظهر الحافلات التابعة له' : '⚠️ Please select a supplier first to view their vehicles'}
              </div>
            ) : (
              <select
                value={formData.assignedVehicleId}
                onChange={(e) => setFormData({ ...formData, assignedVehicleId: e.target.value })}
                className="block w-full px-3 py-2 border border-blue-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
              >
                <option value="">{lang === 'ar' ? '-- بدون حافلة حالياً (يمكن تخصيصها لاحقاً) --' : '-- Leave Unassigned (Vehicle can be assigned later) --'}</option>
                {unassignedVehicles
                  .filter((v) => (formData.ownershipType === 'COMPANY' ? !v.supplierId : v.supplierId === formData.supplierId))
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} — {v.make} {v.model} ({v.capacity} {lang === 'ar' ? 'مقعد' : 'Seats'})
                    </option>
                  ))}
              </select>
            )}
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
              {createMutation.isPending ? t('authenticating') : t('addDriver')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Pair / Re-assign Vehicle Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={lang === 'ar' ? `تخصيص الحافلة للسائق: ${selectedDriver?.fullName}` : `Assign Dedicated Vehicle to ${selectedDriver?.fullName}`}
        subtitle={lang === 'ar' ? 'ربط تشغيلي دائم 1:1 بين السائق والحافلة' : '1:1 Driver-to-Vehicle operational pairing'}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation, assignVehicleMutation]} />
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {lang === 'ar'
              ? 'كل سائق مخصص لحافلة واحدة محددة. اختيار حافلة هنا يقوم بتحديث بيانات السائق وسجل الحافلة معاً.'
              : 'Each driver is permanently dedicated to one specific vehicle. Selecting a vehicle here updates both the driver and vehicle records.'}
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {selectedDriver?.supplierId
                ? (lang === 'ar' ? `حافلات المورد (${selectedDriver.supplier?.name || 'المورد'}) المتاحة:` : `Available vehicles for supplier (${selectedDriver.supplier?.name || 'Supplier'}):`)
                : (lang === 'ar' ? 'حافلات أسطول الشركة المتاحة:' : 'Available company fleet vehicles:')}
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
            >
              <option value="">{lang === 'ar' ? '-- بدون حافلة (إلغاء التخصيص) --' : '-- No Assigned Vehicle (Unpair) --'}</option>
              {selectedDriver?.assignedVehicle && (
                <option value={selectedDriver.assignedVehicle.id}>
                  {lang === 'ar' ? 'الحالية:' : 'Current:'} {selectedDriver.assignedVehicle.plateNumber} ({selectedDriver.assignedVehicle.make})
                </option>
              )}
              {unassignedVehicles
                .filter((v) => {
                  if (v.id === selectedDriver?.assignedVehicleId) return false;
                  if (selectedDriver?.supplierId) {
                    return v.supplierId === selectedDriver.supplierId;
                  } else {
                    return !v.supplierId;
                  }
                })
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} — {v.make} {v.model} ({v.capacity} {lang === 'ar' ? 'مقعد' : 'Seats'})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedDriver) {
                  assignVehicleMutation.mutate({
                    driverId: selectedDriver.id,
                    vehicleId: selectedVehicleId || null,
                  });
                }
              }}
              disabled={assignVehicleMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {assignVehicleMutation.isPending ? t('authenticating') : (lang === 'ar' ? 'تأكيد التخصيص' : 'Confirm Pairing')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Driver Modal */}
      <Modal
        isOpen={!!editingDriver}
        onClose={() => setEditingDriver(null)}
        title={t('editDriver')}
        subtitle={t('editDriverSubtitle')}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation, assignVehicleMutation]} />
        {editingDriver && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: editingDriver.id, payload: editFormData });
            }}
            className="space-y-4"
          >
            {/* Driver Ownership / Affiliation Edit */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">
                {lang === 'ar' ? 'جهة تبعية السائق *' : 'Driver Affiliation / Ownership *'}
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
                    name="editDriverOwnership"
                    value="COMPANY"
                    checked={editFormData.ownershipType === 'COMPANY'}
                    onChange={() => setEditFormData({ ...editFormData, ownershipType: 'COMPANY', supplierId: '' })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>{lang === 'ar' ? '🏢 سائق تابع للشركة (داخلي)' : '🏢 Company Driver (In-House)'}</span>
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
                    name="editDriverOwnership"
                    value="SUPPLIER"
                    checked={editFormData.ownershipType === 'SUPPLIER'}
                    onChange={() => setEditFormData({ ...editFormData, ownershipType: 'SUPPLIER' })}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>{lang === 'ar' ? '🚚 سائق تابع لمورد خارجي' : '🚚 Supplier / Outsourced'}</span>
                </label>
              </div>

              {editFormData.ownershipType === 'SUPPLIER' && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    {lang === 'ar' ? 'اختر المورد التابع له السائق *' : 'Select Driver Supplier *'}
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
                <label className="block text-xs font-medium text-slate-700">{t('fullName')}</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{t('contact')}</label>
                <input
                  type="tel"
                  pattern="[0-9+ ]*"
                  maxLength={20}
                  required
                  value={editFormData.phoneNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">{t('nationalId')}</label>
                <input
                  type="text"
                  pattern="[0-9]*"
                  maxLength={14}
                  required
                  value={editFormData.nationalId}
                  onChange={(e) => setEditFormData({ ...editFormData, nationalId: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'رقم الرخصة' : 'License Number'}</label>
                <input
                  type="text"
                  maxLength={50}
                  required
                  value={editFormData.licenseNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, licenseNumber: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ انتهاء الرخصة' : 'License Expiry'}</label>
                <input
                  type="date"
                  required
                  value={editFormData.licenseExpirationDate}
                  onChange={(e) => setEditFormData({ ...editFormData, licenseExpirationDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'حالة العمل' : 'Duty Status'}</label>
                <select
                  value={editFormData.dutyStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, dutyStatus: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="AVAILABLE">{t('AVAILABLE')}</option>
                  <option value="ON_DUTY">{t('ON_DUTY')}</option>
                  <option value="OFF_DUTY">{t('OFF_DUTY')}</option>
                  <option value="ON_TRIP">{t('ON_TRIP')}</option>
                  <option value="SUSPENDED">{t('SUSPENDED')}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
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

      {/* Delete Driver Confirmation Modal */}
      <Modal
        isOpen={!!deletingDriver}
        onClose={() => setDeletingDriver(null)}
        title={t('deleteDriver')}
        subtitle={`${t('deleteDriverConfirm')} "${deletingDriver?.fullName}"`}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation, assignVehicleMutation]} />
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('deleteWarningText')}</p>
              {deletingDriver?.assignedVehicle && (
                <p className="mt-1 text-rose-700">
                  {lang === 'ar'
                    ? `ملاحظة: السائق مرتبط حالياً بالحافلة (${deletingDriver.assignedVehicle.plateNumber}). سيتم إلغاء الربط وإعادة الحافلة لحالة متاح.`
                    : `Note: Driver is paired with vehicle (${deletingDriver.assignedVehicle.plateNumber}). Vehicle will be released back to AVAILABLE.`}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeletingDriver(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deletingDriver && deleteMutation.mutate(deletingDriver.id)}
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