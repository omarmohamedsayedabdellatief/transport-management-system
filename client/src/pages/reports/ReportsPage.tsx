import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Bus, Users, Printer } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const ReportsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'vehicle' | 'driver'>('vehicle');
  const [filterOwnership, setFilterOwnership] = useState<string>('');
  const [filterSupplierId, setFilterSupplierId] = useState<string>('');

  const { data: vehicleReportData, isLoading: vLoading } = useQuery({
    queryKey: ['reports-vehicles'],
    queryFn: async () => {
      const res = await api.get('/dashboard/reports/vehicle-utilization');
      return res.data.data;
    },
  });

  const { data: driverReportData, isLoading: dLoading } = useQuery({
    queryKey: ['reports-drivers'],
    queryFn: async () => {
      const res = await api.get('/dashboard/reports/driver-performance');
      return res.data.data;
    },
  });

  const { data: suppliersData } = useQuery<{ data: any[] }>({
    queryKey: ['vehicle-suppliers'],
    queryFn: async () => {
      const res = await api.get('/vehicles/suppliers');
      return res.data;
    },
  });
  const suppliers = suppliersData?.data || [];

  const rawVehicleReport = vehicleReportData || [];
  const rawDriverReport = driverReportData || [];

  const vehicleReport = rawVehicleReport.filter((v: any) => {
    if (filterSupplierId && v.supplierId !== filterSupplierId) return false;
    if (filterOwnership === 'COMPANY' && v.supplierId) return false;
    if (filterOwnership === 'SUPPLIER' && !v.supplierId) return false;
    return true;
  });

  const driverReport = rawDriverReport.filter((d: any) => {
    if (filterSupplierId && d.supplierId !== filterSupplierId) return false;
    if (filterOwnership === 'COMPANY' && d.supplierId) return false;
    if (filterOwnership === 'SUPPLIER' && !d.supplierId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('reportsTitle')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('reportsSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>{t('printReport')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('vehicle')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'vehicle'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bus className="h-4 w-4" />
          <span>{t('tabVehicles')}</span>
        </button>
        <button
          onClick={() => setActiveTab('driver')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'driver'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{t('tabDrivers')}</span>
        </button>
      </div>

      {/* Filter Bar for Active Tab */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
        <span className="text-xs font-bold text-slate-700">
          {activeTab === 'vehicle'
            ? (lang === 'ar' ? 'تصفية تقرير الحافلات حسب التبعية:' : 'Filter Vehicle Report by Affiliation:')
            : (lang === 'ar' ? 'تصفية تقرير السائقين حسب التبعية:' : 'Filter Driver Report by Affiliation:')}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={filterOwnership}
            onChange={(e) => {
              setFilterOwnership(e.target.value);
              if (e.target.value !== 'SUPPLIER') setFilterSupplierId('');
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">
              {activeTab === 'vehicle'
                ? (lang === 'ar' ? '🏢 جميع الحافلات (شركة وموردين)' : 'All Vehicles')
                : (lang === 'ar' ? '🏢 جميع السائقين (شركة وموردين)' : 'All Drivers')}
            </option>
            <option value="COMPANY">
              {activeTab === 'vehicle'
                ? (lang === 'ar' ? '🏢 أسطول الشركة فقط' : 'Company Fleet Only')
                : (lang === 'ar' ? '🏢 سائقو أسطول الشركة فقط' : 'Company Drivers Only')}
            </option>
            <option value="SUPPLIER">
              {activeTab === 'vehicle'
                ? (lang === 'ar' ? '🚚 حافلات الموردين فقط' : 'Supplier Vehicles Only')
                : (lang === 'ar' ? '🚚 سائقو الموردين فقط' : 'Supplier Drivers Only')}
            </option>
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

      {activeTab === 'vehicle' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                    <th className="py-3 px-4">{t('plateNumber')}</th>
                    <th className="py-3 px-4">{lang === 'ar' ? 'التبعية' : 'Ownership'}</th>
                    <th className="py-3 px-4">{t('makeModel')}</th>
                    <th className="py-3 px-4">{t('capacity')}</th>
                    <th className="py-3 px-4">{t('dedicatedDriver')}</th>
                    <th className="py-3 px-4">{t('completedTrips')}</th>
                    <th className="py-3 px-4">{t('currentOdometer')}</th>
                    <th className="py-3 px-4">{t('maintenanceSpend')}</th>
                    <th className="py-3 px-4">{t('downtimeHours')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8">
                        {t('loadingVehicles')}
                      </td>
                    </tr>
                  ) : vehicleReport.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-500">
                        {lang === 'ar' ? 'لا توجد حافلات تطابق هذا الفلتر' : 'No matching vehicles found'}
                      </td>
                    </tr>
                  ) : (
                    vehicleReport.map((v: any) => (
                      <tr key={v.vehicleId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{v.plateNumber}</td>
                        <td className="py-3.5 px-4">
                          {v.supplierName ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              🚚 {v.supplierName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              🏢 {lang === 'ar' ? 'أسطول الشركة' : 'Company Fleet'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {v.make} {v.model}
                        </td>
                        <td className="py-3.5 px-4">{v.capacity}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-800">{v.driver}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-600">{v.completedTrips}</td>
                        <td className="py-3.5 px-4 font-mono">{v.currentMileage.toLocaleString()} km</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          EGP {Number(v.totalMaintenanceCost).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-amber-600 font-medium">{v.totalDowntimeHours} hrs</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-4">{t('driverName')}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'التبعية' : 'Affiliation'}</th>
                  <th className="py-3 px-4">{t('phone')}</th>
                  <th className="py-3 px-4">{t('dedicatedDriver')}</th>
                  <th className="py-3 px-4">{t('totalAssignedTrips')}</th>
                  <th className="py-3 px-4">{t('COMPLETED')}</th>
                  <th className="py-3 px-4">{t('DELAYED')}</th>
                  <th className="py-3 px-4">{t('CANCELLED')}</th>
                  <th className="py-3 px-4">{t('reliability')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8">
                      {t('loadingDrivers')}
                    </td>
                  </tr>
                ) : driverReport.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500">
                      {lang === 'ar' ? 'لا يوجد سائقين يطابقون هذا الفلتر' : 'No matching drivers found'}
                    </td>
                  </tr>
                ) : (
                  driverReport.map((d: any) => {
                    const reliability = d.totalTrips > 0 ? Math.round((d.completedTrips / d.totalTrips) * 100) : 100;
                    return (
                      <tr key={d.driverId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{d.fullName}</td>
                        <td className="py-3.5 px-4">
                          {d.supplierName ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              🚚 {d.supplierName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              🏢 {lang === 'ar' ? 'أسطول الشركة' : 'Company Fleet'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{d.phone}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{d.assignedVehicle}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{d.totalTrips}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-600">{d.completedTrips}</td>
                        <td className="py-3.5 px-4 text-amber-600 font-medium">{d.delayedTrips}</td>
                        <td className="py-3.5 px-4 text-rose-600 font-medium">{d.cancelledTrips}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              reliability >= 95
                                ? 'bg-emerald-50 text-emerald-700'
                                : reliability >= 80
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {reliability}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};