import { MutationNotice, QueryNotice } from "../../components/ui/MutationNotice";
import React, { useState, useMemo, useDeferredValue } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Route, Client, Driver, Vehicle } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  MapPin,
  Plus,
  Clock,
  Navigation,
  Trash2,
  ChevronRight,
  Edit3,
  Search,
  Building2,
  Truck,
  DollarSign,
  UserCheck,
  Percent,
} from 'lucide-react';

export const RoutesPage: React.FC = () => {
  const { canManage } = useAuth();
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewStopsRoute, setViewStopsRoute] = useState<Route | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<Route | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterExecutionType, setFilterExecutionType] = useState<'ALL' | 'COMPANY' | 'SUPPLIER'>('ALL');
  const [filterSupplier, setFilterSupplier] = useState('');

  const [formData, setFormData] = useState({
    clientId: '',
    routeName: '',
    startLocation: '',
    finalDestination: '',
    estimatedDistanceKm: 35,
    estimatedDurationMin: 50,
    clientPricePerTrip: 0,
    executionType: 'COMPANY' as 'COMPANY' | 'SUPPLIER',
    supplierId: '',
    supplierCostPerTrip: 0,
    driverTripAllowance: 0,
    vehicleRentalCost: 0,
    defaultDriverId: '',
    stops: [
      { stopOrder: 1, stopName: isAr ? 'ميدان التحرير (المحطة المركزية)' : 'Tahrir Square Central', pickupTimeOffsetMin: 0 },
      { stopOrder: 2, stopName: isAr ? 'محطة المظلات / الطريق الدائري' : 'Ring Road Hub', pickupTimeOffsetMin: 15 },
    ],
  });

  const [editFormData, setEditFormData] = useState({
    clientId: '',
    routeName: '',
    startLocation: '',
    finalDestination: '',
    estimatedDistanceKm: 35,
    estimatedDurationMin: 50,
    clientPricePerTrip: 0,
    executionType: 'COMPANY' as 'COMPANY' | 'SUPPLIER',
    supplierId: '',
    supplierCostPerTrip: 0,
    driverTripAllowance: 0,
    vehicleRentalCost: 0,
    defaultDriverId: '',
    stops: [] as { stopOrder: number; stopName: string; pickupTimeOffsetMin: number }[],
  });

  const { data: routesData, isLoading, isError, refetch } = useQuery<{ data: Route[] }>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await api.get('/routes');
      return res.data;
    },
  });

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await api.get('/clients');
      return res.data;
    },
  });

  const { data: driversData } = useQuery<{ data: Driver[] }>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await api.get('/drivers');
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

  const routes = routesData?.data || [];
  const clients = clientsData?.data || [];
  const drivers = driversData?.data || [];
  const suppliers = suppliersData?.data || [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const driver = drivers.find((d) => d.id === payload.defaultDriverId);
      return api.post('/routes', {
        ...payload,
        estimatedDistanceKm: Number(payload.estimatedDistanceKm),
        estimatedDurationMin: Number(payload.estimatedDurationMin),
        clientPricePerTrip: Number(payload.clientPricePerTrip || 0),
        supplierCostPerTrip: payload.executionType === 'SUPPLIER' ? Number(payload.supplierCostPerTrip || 0) : 0,
        supplierId: payload.executionType === 'SUPPLIER' && payload.supplierId ? payload.supplierId : null,
        driverTripAllowance: payload.executionType === 'COMPANY' ? Number(payload.driverTripAllowance || 0) : 0,
        vehicleRentalCost: payload.executionType === 'COMPANY' ? Number(payload.vehicleRentalCost || 0) : 0,
        defaultDriverId: payload.defaultDriverId || null,
        defaultVehicleId: driver?.assignedVehicleId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const driver = drivers.find((d) => d.id === payload.defaultDriverId);
      return api.put(`/routes/${id}`, {
        ...payload,
        estimatedDistanceKm: Number(payload.estimatedDistanceKm),
        estimatedDurationMin: Number(payload.estimatedDurationMin),
        clientPricePerTrip: Number(payload.clientPricePerTrip || 0),
        supplierCostPerTrip: payload.executionType === 'SUPPLIER' ? Number(payload.supplierCostPerTrip || 0) : 0,
        supplierId: payload.executionType === 'SUPPLIER' && payload.supplierId ? payload.supplierId : null,
        driverTripAllowance: payload.executionType === 'COMPANY' ? Number(payload.driverTripAllowance || 0) : 0,
        vehicleRentalCost: payload.executionType === 'COMPANY' ? Number(payload.vehicleRentalCost || 0) : 0,
        defaultDriverId: payload.defaultDriverId || null,
        defaultVehicleId: driver?.assignedVehicleId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setEditingRoute(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setDeletingRoute(null);
    },
  });

  const openEditModal = (r: Route) => {
    setEditingRoute(r);
    const execType = (r.executionType || (r.supplierId ? 'SUPPLIER' : 'COMPANY')) as 'COMPANY' | 'SUPPLIER';
    setEditFormData({
      clientId: r.clientId,
      routeName: r.routeName,
      startLocation: r.startLocation,
      finalDestination: r.finalDestination,
      estimatedDistanceKm: r.estimatedDistanceKm,
      estimatedDurationMin: r.estimatedDurationMin,
      clientPricePerTrip: Number(r.clientPricePerTrip || 0),
      executionType: execType,
      supplierId: r.supplierId || '',
      supplierCostPerTrip: Number(r.supplierCostPerTrip || 0),
      driverTripAllowance: Number(r.driverTripAllowance || 0),
      vehicleRentalCost: Number(r.vehicleRentalCost || 0),
      defaultDriverId: r.defaultDriverId || '',
      stops: (r.stops || []).map((s) => ({
        stopOrder: s.stopOrder,
        stopName: s.stopName,
        pickupTimeOffsetMin: s.pickupTimeOffsetMin,
      })),
    });
  };

  const addEditStopField = () => {
    setEditFormData({
      ...editFormData,
      stops: [
        ...editFormData.stops,
        {
          stopOrder: editFormData.stops.length + 1,
          stopName: isAr ? `محطة ركوب ${editFormData.stops.length + 1}` : `Pickup Stop ${editFormData.stops.length + 1}`,
          pickupTimeOffsetMin: editFormData.stops.length * 10,
        },
      ],
    });
  };

  const removeEditStopField = (index: number) => {
    const updated = editFormData.stops
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, stopOrder: idx + 1 }));
    setEditFormData({ ...editFormData, stops: updated });
  };

  const addStopField = () => {
    setFormData({
      ...formData,
      stops: [
        ...formData.stops,
        {
          stopOrder: formData.stops.length + 1,
          stopName: isAr ? `محطة ركوب ${formData.stops.length + 1}` : `Pickup Stop ${formData.stops.length + 1}`,
          pickupTimeOffsetMin: formData.stops.length * 10,
        },
      ],
    });
  };

  const removeStopField = (index: number) => {
    const updated = formData.stops
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, stopOrder: idx + 1 }));
    setFormData({ ...formData, stops: updated });
  };

  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (deferredSearchQuery) {
        const q = deferredSearchQuery.toLowerCase();
        const match =
          r.routeName.toLowerCase().includes(q) ||
          r.startLocation.toLowerCase().includes(q) ||
          r.finalDestination.toLowerCase().includes(q) ||
          (r.client?.companyName || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterClient && r.clientId !== filterClient) return false;
      const isSupplier = r.executionType === 'SUPPLIER' || !!r.supplierId;
      if (filterExecutionType === 'SUPPLIER' && !isSupplier) return false;
      if (filterExecutionType === 'COMPANY' && isSupplier) return false;
      if (filterSupplier && r.supplierId !== filterSupplier) return false;
      return true;
    });
  }, [routes, deferredSearchQuery, filterClient, filterExecutionType, filterSupplier]);

  return (
    <div className="space-y-6">
      <QueryNotice failed={isError} retry={refetch} />
      <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('navRoutes')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? 'إدارة خطوط سير الشركات، تحديد جهة التشغيل (مورد أو أسطول الشركة)، وحسابات الرحلة لكل خط'
              : 'Manage company routes, operational ownership (Supplier vs Company Fleet), and per-route rates'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setFormData({
                clientId: '',
                routeName: '',
                startLocation: '',
                finalDestination: '',
                estimatedDistanceKm: 35,
                estimatedDurationMin: 50,
                clientPricePerTrip: 0,
                executionType: 'COMPANY',
                supplierId: '',
                supplierCostPerTrip: 0,
                driverTripAllowance: 0,
                vehicleRentalCost: 0,
                defaultDriverId: '',
                stops: [
                  { stopOrder: 1, stopName: isAr ? 'نقطة التجمع الأولى' : 'Stop 1', pickupTimeOffsetMin: 0 },
                  { stopOrder: 2, stopName: isAr ? 'المحطة الوسيطة' : 'Stop 2', pickupTimeOffsetMin: 15 },
                ],
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('createRoute')}</span>
          </button>
        )}
      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-400 absolute rtl:right-3 ltr:left-3 top-2.5" />
          <input
            type="text"
            placeholder={isAr ? 'بحث باسم الخط، العميل، المحطة...' : 'Search routes, clients, stops...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rtl:pr-9 ltr:pl-9 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">{isAr ? 'جميع الشركات والعملاء' : 'All Clients'}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName}
            </option>
          ))}
        </select>

        <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setFilterExecutionType('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              filterExecutionType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setFilterExecutionType('COMPANY')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1 ${
              filterExecutionType === 'COMPANY' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>{isAr ? 'أسطول الشركة' : 'Company Fleet'}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterExecutionType('SUPPLIER')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1 ${
              filterExecutionType === 'SUPPLIER' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>{isAr ? 'مورد خارجي' : 'Suppliers'}</span>
          </button>
        </div>

        {filterExecutionType !== 'COMPANY' && suppliers.length > 0 && (
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">{isAr ? 'جميع الموردين' : 'All Suppliers'}</option>
            {suppliers.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Routes Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
          <Navigation className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            {isAr ? 'لا توجد خطوط سير مطابقة للفلاتر' : 'No routes matching selected criteria'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoutes.map((r) => {
            const isSupplier = r.executionType === 'SUPPLIER' || !!r.supplierId;
            const clientRate = Number(r.clientPricePerTrip || 0);
            const supplierRate = Number(r.supplierCostPerTrip || 0);
            const driverWage = Number(r.driverTripAllowance || 0);
            const vehicleCost = Number(r.vehicleRentalCost || 0);
            const estimatedMargin = isSupplier ? clientRate - supplierRate : clientRate - (driverWage + vehicleCost);

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top highlight bar */}
                <div className={`absolute top-0 inset-x-0 h-1 ${isSupplier ? 'bg-amber-500' : 'bg-blue-600'}`} />

                <div>
                  <div className="flex items-center justify-between text-xs font-medium mb-2 pt-1 gap-2">
                    <span className="text-blue-600 font-bold truncate max-w-[160px]">{r.client?.companyName}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSupplier ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-[150px]">
                          <Truck className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.supplier?.name || (isAr ? 'مورد خارجي' : 'Supplier')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span>{isAr ? 'أسطول الشركة' : 'Company Fleet'}</span>
                        </span>
                      )}

                      {canManage && (
                        <div className="flex items-center gap-0.5 ltr:ml-1.5 rtl:mr-1.5 shrink-0">
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={t('editRoute')}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingRoute(r)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title={t('deleteRoute')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 break-words break-all line-clamp-2" title={r.routeName}>{r.routeName}</h3>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-slate-700 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block uppercase">{t('origin')}</span>
                        <span className="font-medium break-words break-all">{r.startLocation}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block uppercase">{t('destination')}</span>
                        <span className="font-medium break-words break-all">{r.finalDestination}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium font-mono">
                      <Navigation className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{r.estimatedDistanceKm} km</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{r.estimatedDurationMin} {isAr ? 'دقيقة' : 'mins'}</span>
                    </div>
                  </div>

                  {/* Financial & Settlement Definition Card */}
                  <div className="mt-2.5 rounded-lg border border-slate-200/90 bg-slate-50/70 p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">{isAr ? 'سعر بيع الرحلة للعميل:' : 'Client Price / Trip:'}</span>
                      <span className="font-mono font-bold text-blue-700">{clientRate.toLocaleString()} EGP</span>
                    </div>

                    {isSupplier ? (
                      <>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-amber-900">
                          <span className="font-medium">{isAr ? 'سعر الرحلة للمورد:' : 'Supplier Cost Rate:'}</span>
                          <span className="font-mono font-bold text-amber-700">{supplierRate.toLocaleString()} EGP</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
                          <span>{isAr ? 'هامش ربح الرحلة:' : 'Trip Margin:'}</span>
                          <span className="font-mono">{estimatedMargin > 0 ? `+${estimatedMargin.toLocaleString()}` : estimatedMargin.toLocaleString()} EGP</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-slate-700">
                          <span>{isAr ? 'بدل/راتب السائق بالرحلة:' : 'Driver Trip Wage:'}</span>
                          <span className="font-mono font-semibold text-slate-900">{driverWage.toLocaleString()} EGP</span>
                        </div>
                        {vehicleCost > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-slate-600">
                            <span>{isAr ? 'تكلفة/إيجار الحافلة:' : 'Vehicle Cost:'}</span>
                            <span className="font-mono">{vehicleCost.toLocaleString()} EGP</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
                          <span>{isAr ? 'صافي عائد الرحلة للشركة:' : 'Net Fleet Revenue:'}</span>
                          <span className="font-mono">+{estimatedMargin.toLocaleString()} EGP</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setViewStopsRoute(r)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{r.stops?.length || 0} {t('stops')}</span>
                    <ChevronRight className="h-3 w-3 rtl:rotate-180" />
                  </button>
                  {r.defaultDriver && (
                    <span className="text-[11px] text-slate-600 font-medium">
                      👨‍✈️ {r.defaultDriver.fullName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Stops Modal */}
      <Modal
        isOpen={!!viewStopsRoute}
        onClose={() => setViewStopsRoute(null)}
        title={viewStopsRoute?.routeName || t('stops')}
        subtitle={`${viewStopsRoute?.startLocation} ➔ ${viewStopsRoute?.finalDestination}`}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        <div className="space-y-4">
          <div className="relative rtl:pr-6 rtl:border-r-2 ltr:pl-6 ltr:border-l-2 border-blue-400 space-y-4 my-2">
            <div className="relative">
              <div className="absolute rtl:-right-[31px] ltr:-left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
              <div className="text-xs font-bold text-slate-900">{viewStopsRoute?.startLocation}</div>
              <span className="text-[10px] text-slate-400">{t('origin')} (0 {isAr ? 'دقيقة' : 'mins'})</span>
            </div>

            {viewStopsRoute?.stops?.map((stop) => (
              <div key={stop.id} className="relative">
                <div className="absolute rtl:-right-[31px] ltr:-left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-xs" />
                <div className="text-xs font-semibold text-slate-800">{stop.stopName}</div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {isAr ? `محطة #${stop.stopOrder}` : `Stop #${stop.stopOrder}`} • +{stop.pickupTimeOffsetMin} {isAr ? 'دقيقة من الانطلاق' : 'mins from departure'}
                </span>
              </div>
            ))}

            <div className="relative">
              <div className="absolute rtl:-right-[31px] ltr:-left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white shadow-xs" />
              <div className="text-xs font-bold text-slate-900">{viewStopsRoute?.finalDestination}</div>
              <span className="text-[10px] text-slate-400">
                {t('destination')} (+{viewStopsRoute?.estimatedDurationMin} {isAr ? 'دقيقة' : 'mins'})
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setViewStopsRoute(null)}
              className="px-4 py-2 bg-slate-100 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-200"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Route Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isAr ? 'إنشاء خط سير جديد وتحديد هيكله المالي' : 'Create Route & Define Financial Rates'}
        subtitle={isAr ? 'تحديد الشركة، أسعار الرحلة، وجهة التشغيل (مورد خارجي أو أسطول الشركة)' : 'Define client, trip rate, and operational ownership (Supplier vs Company)'}
        maxWidth="2xl"
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          {/* Client & Route Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800">{isAr ? 'الشركة / المصنع (العميل)' : 'Client / Company'}</label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
              >
                <option value="">{isAr ? 'اختر الشركة...' : 'Select Client...'}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800">{isAr ? 'اسم خط السير' : 'Route Name'}</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                placeholder={isAr ? 'مثال: خط أكتوبر - رمسيس السريع' : 'e.g., Cairo - 6th October Direct'}
                value={formData.routeName}
                onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('origin')}</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={formData.startLocation}
                onChange={(e) => setFormData({ ...formData, startLocation: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('destination')}</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={formData.finalDestination}
                onChange={(e) => setFormData({ ...formData, finalDestination: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{isAr ? 'المسافة التقديرية (كم)' : 'Est. Distance (km)'}</label>
              <input
                type="number"
                required
                min={1}
                value={formData.estimatedDistanceKm}
                onChange={(e) => setFormData({ ...formData, estimatedDistanceKm: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{isAr ? 'المدة التقديرية (دقيقة)' : 'Est. Duration (mins)'}</label>
              <input
                type="number"
                required
                min={1}
                value={formData.estimatedDurationMin}
                onChange={(e) => setFormData({ ...formData, estimatedDurationMin: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* FINANCIAL SECTION: CLIENT PRICE & EXECUTION TYPE */}
          <div className="border border-blue-200 bg-blue-50/40 p-3.5 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span>{isAr ? 'الهيكل المالي والتشغيلي للخط' : 'Financial & Operational Setup'}</span>
            </h4>

            {/* Client Price */}
            <div>
              <label className="block text-xs font-bold text-blue-900 mb-1">
                💵 {isAr ? 'سعر بيع الرحلة للعميل (ج.م / رحلة)' : 'Client Price per Trip (EGP)'}
              </label>
              <input
                type="number"
                required
                min={0}
                step="any"
                placeholder="1500"
                value={formData.clientPricePerTrip || ''}
                onChange={(e) => setFormData({ ...formData, clientPricePerTrip: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-950 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              />
            </div>

            {/* Execution Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {isAr ? 'طبيعة تشغيل هذا الخط:' : 'Operational Ownership:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, executionType: 'COMPANY', supplierId: '', supplierCostPerTrip: 0 })}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    formData.executionType === 'COMPANY'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>{isAr ? 'أسطول وسائقين الشركة' : 'Company Fleet'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, executionType: 'SUPPLIER', driverTripAllowance: 0, vehicleRentalCost: 0 })}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    formData.executionType === 'SUPPLIER'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  <span>{isAr ? 'مورد خارجي (Supplier)' : 'External Supplier'}</span>
                </button>
              </div>
            </div>

            {/* SUPPLIER DETAILS */}
            {formData.executionType === 'SUPPLIER' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-900">{isAr ? 'المورد المسؤول عن الخط' : 'Supplier'}</label>
                    <select
                      required
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="">{isAr ? 'اختر المورد...' : 'Select Supplier...'}</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900">
                      💰 {isAr ? 'سعر الرحلة المستحق للمورد (ج.م)' : 'Supplier Rate per Trip (EGP)'}
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      placeholder="1100"
                      value={formData.supplierCostPerTrip || ''}
                      onChange={(e) => setFormData({ ...formData, supplierCostPerTrip: Number(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                    />
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                      * {isAr ? 'يسمّع تلقائياً في كشف حساب وفواتير المورد' : 'Auto-posts to Supplier statement & invoices'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-900">{isAr ? 'سائق وحافلة المورد الافتراضية' : 'Supplier Driver & Vehicle'}</label>
                  <select
                    value={formData.defaultDriverId}
                    onChange={(e) => setFormData({ ...formData, defaultDriverId: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="">{isAr ? '-- بدون سائق افتراضي --' : '-- No Default Driver --'}</option>
                    {drivers
                      .filter((d) => !formData.supplierId || d.supplierId === formData.supplierId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} {d.assignedVehicle ? `(${d.assignedVehicle.plateNumber})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* COMPANY FLEET DETAILS */}
            {formData.executionType === 'COMPANY' && (
              <div className="p-3 bg-white border border-blue-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      👨‍✈️ {isAr ? 'بدل/راتب السائق في الرحلة (ج.م)' : 'Driver Trip Wage / Allowance (EGP)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="250"
                      value={formData.driverTripAllowance || ''}
                      onChange={(e) => setFormData({ ...formData, driverTripAllowance: Number(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      * {isAr ? 'يسمّع في مسيرات ومستحقات السائقين' : 'Auto-feeds into Driver Payroll'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      🚌 {isAr ? 'تكلفة/إيجار الحافلة بالرحلة (ج.م)' : 'Vehicle Rental / Cost Allocation (EGP)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="350"
                      value={formData.vehicleRentalCost || ''}
                      onChange={(e) => setFormData({ ...formData, vehicleRentalCost: Number(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      * {isAr ? 'يُحتسب في تكاليف وربحية أسطول الشركة' : 'Used for company fleet unit economics'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">{isAr ? 'سائق وحافلة الشركة الافتراضية' : 'Company Driver & Vehicle'}</label>
                  <select
                    value={formData.defaultDriverId}
                    onChange={(e) => setFormData({ ...formData, defaultDriverId: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">{isAr ? '-- بدون سائق افتراضي --' : '-- No Default Driver --'}</option>
                    {drivers
                      .filter((d) => !d.supplierId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} {d.assignedVehicle ? `(${d.assignedVehicle.plateNumber})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Pickup Stops Section */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">{t('stops')}</span>
              <button
                type="button"
                onClick={addStopField}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3 w-3" />
                <span>{isAr ? 'إضافة محطة' : 'Add Stop'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {formData.stops.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-mono font-bold text-slate-400 w-5 text-center">#{idx + 1}</span>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'اسم محطة الركوب' : 'Stop / Station Name'}
                    value={stop.stopName}
                    onChange={(e) => {
                      const updated = [...formData.stops];
                      updated[idx].stopName = e.target.value;
                      setFormData({ ...formData, stops: updated });
                    }}
                    className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      required
                      min={0}
                      title={isAr ? 'دقائق بعد الانطلاق' : 'Minutes after departure'}
                      value={stop.pickupTimeOffsetMin}
                      onChange={(e) => {
                        const updated = [...formData.stops];
                        updated[idx].pickupTimeOffsetMin = Number(e.target.value);
                        setFormData({ ...formData, stops: updated });
                      }}
                      className="w-16 text-xs px-2 py-1.5 border border-slate-200 rounded text-center focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-400">{isAr ? 'دقيقة' : 'min'}</span>
                  </div>
                  {formData.stops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStopField(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-200"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {createMutation.isPending ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'حفظ خط السير' : 'Create Route'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Route Modal */}
      <Modal
        isOpen={!!editingRoute}
        onClose={() => setEditingRoute(null)}
        title={isAr ? 'تعديل خط السير والهيكل المالي' : 'Edit Route & Financial Rates'}
        subtitle={editingRoute?.routeName}
        maxWidth="2xl"
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editingRoute) updateMutation.mutate({ id: editingRoute.id, payload: editFormData });
          }}
          className="space-y-4"
        >
          {/* Client & Route Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800">{isAr ? 'الشركة / المصنع (العميل)' : 'Client / Company'}</label>
              <select
                required
                value={editFormData.clientId}
                onChange={(e) => setEditFormData({ ...editFormData, clientId: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800">{isAr ? 'اسم خط السير' : 'Route Name'}</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={editFormData.routeName}
                onChange={(e) => setEditFormData({ ...editFormData, routeName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('origin')}</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={editFormData.startLocation}
                onChange={(e) => setEditFormData({ ...editFormData, startLocation: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('destination')}</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={editFormData.finalDestination}
                onChange={(e) => setEditFormData({ ...editFormData, finalDestination: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{isAr ? 'المسافة التقديرية (كم)' : 'Est. Distance (km)'}</label>
              <input
                type="number"
                required
                min={1}
                value={editFormData.estimatedDistanceKm}
                onChange={(e) => setEditFormData({ ...editFormData, estimatedDistanceKm: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{isAr ? 'المدة التقديرية (دقيقة)' : 'Est. Duration (mins)'}</label>
              <input
                type="number"
                required
                min={1}
                value={editFormData.estimatedDurationMin}
                onChange={(e) => setEditFormData({ ...editFormData, estimatedDurationMin: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* FINANCIAL SECTION: CLIENT PRICE & EXECUTION TYPE */}
          <div className="border border-blue-200 bg-blue-50/40 p-3.5 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span>{isAr ? 'الهيكل المالي والتشغيلي للخط' : 'Financial & Operational Setup'}</span>
            </h4>

            {/* Client Price */}
            <div>
              <label className="block text-xs font-bold text-blue-900 mb-1">
                💵 {isAr ? 'سعر بيع الرحلة للعميل (ج.م / رحلة)' : 'Client Price per Trip (EGP)'}
              </label>
              <input
                type="number"
                required
                min={0}
                step="any"
                value={editFormData.clientPricePerTrip || ''}
                onChange={(e) => setEditFormData({ ...editFormData, clientPricePerTrip: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-950 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              />
            </div>

            {/* Execution Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {isAr ? 'طبيعة تشغيل هذا الخط:' : 'Operational Ownership:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, executionType: 'COMPANY', supplierId: '', supplierCostPerTrip: 0 })}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    editFormData.executionType === 'COMPANY'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span>{isAr ? 'أسطول وسائقين الشركة' : 'Company Fleet'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, executionType: 'SUPPLIER', driverTripAllowance: 0, vehicleRentalCost: 0 })}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    editFormData.executionType === 'SUPPLIER'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  <span>{isAr ? 'مورد خارجي (Supplier)' : 'External Supplier'}</span>
                </button>
              </div>
            </div>

            {/* SUPPLIER DETAILS */}
            {editFormData.executionType === 'SUPPLIER' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-900">{isAr ? 'المورد المسؤول عن الخط' : 'Supplier'}</label>
                    <select
                      required
                      value={editFormData.supplierId}
                      onChange={(e) => setEditFormData({ ...editFormData, supplierId: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="">{isAr ? 'اختر المورد...' : 'Select Supplier...'}</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900">
                      💰 {isAr ? 'سعر الرحلة المستحق للمورد (ج.م)' : 'Supplier Rate per Trip (EGP)'}
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={editFormData.supplierCostPerTrip || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, supplierCostPerTrip: Number(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                    />
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                      * {isAr ? 'يسمّع تلقائياً في كشف حساب وفواتير المورد' : 'Auto-posts to Supplier statement & invoices'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-900">{isAr ? 'سائق وحافلة المورد الافتراضية' : 'Supplier Driver & Vehicle'}</label>
                  <select
                    value={editFormData.defaultDriverId}
                    onChange={(e) => setEditFormData({ ...editFormData, defaultDriverId: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="">{isAr ? '-- بدون سائق افتراضي --' : '-- No Default Driver --'}</option>
                    {drivers
                      .filter((d) => !editFormData.supplierId || d.supplierId === editFormData.supplierId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} {d.assignedVehicle ? `(${d.assignedVehicle.plateNumber})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* COMPANY FLEET DETAILS */}
            {editFormData.executionType === 'COMPANY' && (
              <div className="p-3 bg-white border border-blue-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      👨‍✈️ {isAr ? 'بدل/راتب السائق في الرحلة (ج.م)' : 'Driver Trip Wage / Allowance (EGP)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={editFormData.driverTripAllowance || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, driverTripAllowance: Number(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      * {isAr ? 'يسمّع في مسيرات ومستحقات السائقين' : 'Auto-feeds into Driver Payroll'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      🚌 {isAr ? 'تكلفة/إيجار الحافلة بالرحلة (ج.م)' : 'Vehicle Rental / Cost Allocation (EGP)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={editFormData.vehicleRentalCost || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, vehicleRentalCost: Number(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      * {isAr ? 'يُحتسب في تكاليف وربحية أسطول الشركة' : 'Used for company fleet unit economics'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700">{isAr ? 'سائق وحافلة الشركة الافتراضية' : 'Company Driver & Vehicle'}</label>
                  <select
                    value={editFormData.defaultDriverId}
                    onChange={(e) => setEditFormData({ ...editFormData, defaultDriverId: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">{isAr ? '-- بدون سائق افتراضي --' : '-- No Default Driver --'}</option>
                    {drivers
                      .filter((d) => !d.supplierId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} {d.assignedVehicle ? `(${d.assignedVehicle.plateNumber})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Pickup Stops Section */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">{t('stops')}</span>
              <button
                type="button"
                onClick={addEditStopField}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3 w-3" />
                <span>{isAr ? 'إضافة محطة' : 'Add Stop'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {editFormData.stops.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-mono font-bold text-slate-400 w-5 text-center">#{idx + 1}</span>
                  <input
                    type="text"
                    required
                    value={stop.stopName}
                    onChange={(e) => {
                      const updated = [...editFormData.stops];
                      updated[idx].stopName = e.target.value;
                      setEditFormData({ ...editFormData, stops: updated });
                    }}
                    className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      required
                      min={0}
                      value={stop.pickupTimeOffsetMin}
                      onChange={(e) => {
                        const updated = [...editFormData.stops];
                        updated[idx].pickupTimeOffsetMin = Number(e.target.value);
                        setEditFormData({ ...editFormData, stops: updated });
                      }}
                      className="w-16 text-xs px-2 py-1.5 border border-slate-200 rounded text-center focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-400">{isAr ? 'دقيقة' : 'min'}</span>
                  </div>
                  {editFormData.stops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEditStopField(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingRoute(null)}
              className="px-4 py-2 bg-slate-100 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-200"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {updateMutation.isPending ? (isAr ? 'جاري الحفظ...' : 'Saving...') : isAr ? 'حفظ التعديلات' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingRoute}
        onClose={() => setDeletingRoute(null)}
        title={t('deleteRoute')}
        subtitle={deletingRoute?.routeName}
      >
        <MutationNotice mutations={[createMutation, updateMutation, deleteMutation]} />
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {isAr
              ? `هل أنت متأكد من رغبتك في حذف خط السير "${deletingRoute?.routeName}"؟ لا يمكن التراجع عن هذا الإجراء.`
              : `Are you sure you want to delete route "${deletingRoute?.routeName}"? This action cannot be undone.`}
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeletingRoute(null)}
              className="px-4 py-2 bg-slate-100 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-200"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => deletingRoute && deleteMutation.mutate(deletingRoute.id)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {deleteMutation.isPending ? (isAr ? 'جاري الحذف...' : 'Deleting...') : isAr ? 'تأكيد الحذف' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};