import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Trip, Route, Driver, Client, Contract, ShiftType, TripStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  CalendarCheck,
  Plus,
  Clock,
  Bus,
  CheckCircle2,
  Play,
  Repeat,
  ShieldCheck,
  AlertCircle,
  Lock,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const TripsPage: React.FC = () => {
  const { canManage } = useAuth();
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterShift, setFilterShift] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterClient, setFilterClient] = useState<string>('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isDailyTemplateModalOpen, setIsDailyTemplateModalOpen] = useState(false);
  const [dailyGenResult, setDailyGenResult] = useState<any>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [conflictMessage, setConflictMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    contractId: '',
    routeId: '',
    driverId: '',
    vehicleId: '',
    tripDate: new Date().toISOString().split('T')[0],
    shift: 'MORNING' as ShiftType,
    scheduledDeparture: `${new Date().toISOString().split('T')[0]}T06:00`,
    expectedArrival: `${new Date().toISOString().split('T')[0]}T07:30`,
    saleAmount: 0,
    costAmount: 0,
    driverAllowance: 0,
    vehicleCost: 0,
    executionType: 'COMPANY' as 'COMPANY' | 'SUPPLIER',
    notes: '',
  });

  const updateShiftTimes = (newShift: ShiftType, targetDate: string = formData.tripDate) => {
    let depHour = '06:00';
    let arrHour = '07:30';

    if (newShift === 'MORNING') {
      depHour = '06:00';
      arrHour = '07:30';
    } else if (newShift === 'AFTERNOON') {
      depHour = '15:00';
      arrHour = '16:30';
    } else if (newShift === 'NIGHT') {
      depHour = '22:00';
      arrHour = '23:30';
    } else {
      depHour = '08:00';
      arrHour = '09:30';
    }

    setFormData((prev) => ({
      ...prev,
      shift: newShift,
      tripDate: targetDate,
      scheduledDeparture: `${targetDate}T${depHour}`,
      expectedArrival: `${targetDate}T${arrHour}`,
    }));
  };

  const handleDepartureChange = (newDeparture: string) => {
    const depDate = new Date(newDeparture);
    if (isNaN(depDate.getTime())) {
      setFormData((prev) => ({ ...prev, scheduledDeparture: newDeparture }));
      return;
    }
    const arrDate = new Date(depDate.getTime() + 90 * 60000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const arrString = `${arrDate.getFullYear()}-${pad(arrDate.getMonth() + 1)}-${pad(arrDate.getDate())}T${pad(arrDate.getHours())}:${pad(arrDate.getMinutes())}`;

    setFormData((prev) => ({
      ...prev,
      scheduledDeparture: newDeparture,
      expectedArrival: arrString,
    }));
  };

  const [batchData, setBatchData] = useState({
    routeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
    shifts: ['MORNING'] as ShiftType[],
    departureTime: '06:00',
    durationMinutes: 60,
  });

  const [dailyTemplateData, setDailyTemplateData] = useState({
    date: new Date().toISOString().split('T')[0],
    clientId: '',
    shifts: ['MORNING'] as ShiftType[],
    departureTime: '07:00',
  });

  const [routeOverrides, setRouteOverrides] = useState<
    Array<{
      routeId: string;
      selected: boolean;
      driverId: string;
      vehicleId: string;
      shift: ShiftType;
      departureTime: string;
      saleAmount: number;
      costAmount: number;
      driverAllowance: number;
      vehicleCost: number;
      executionType: 'COMPANY' | 'SUPPLIER';
    }>
  >([]);
  const [autoCompleteTrip, setAutoCompleteTrip] = useState(true);

  const { data: tripsData, isLoading } = useQuery<{ data: Trip[] }>({
    queryKey: ['trips', filterDate, filterShift, filterStatus, filterClient],
    queryFn: async () => {
      let url = '/trips?';
      if (filterDate) url += `date=${filterDate}&`;
      if (filterShift) url += `shift=${filterShift}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterClient) url += `clientId=${filterClient}&`;
      const res = await api.get(url);
      return res.data;
    },
  });

  const { data: routesData } = useQuery<{ data: Route[] }>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await api.get('/routes');
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

  const { data: clientsData } = useQuery<{ data: Client[] }>({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await api.get('/clients');
      return res.data;
    },
  });

  const { data: contractsData } = useQuery<{ data: Contract[] }>({
    queryKey: ['contracts'],
    queryFn: async () => {
      const res = await api.get('/contracts');
      return res.data;
    },
  });

  const { data: templateDateTripsData } = useQuery<{ data: Trip[] }>({
    queryKey: ['trips-template-date', dailyTemplateData.date],
    queryFn: async () => {
      const res = await api.get(`/trips?date=${dailyTemplateData.date}`);
      return res.data;
    },
    enabled: isDailyTemplateModalOpen,
  });

  const routes = routesData?.data || [];
  const drivers = driversData?.data || [];
  const clients = clientsData?.data || [];
  const contracts = contractsData?.data || [];
  const trips = tripsData?.data || [];
  const templateDateTrips = templateDateTripsData?.data || [];

  const initRouteOverrides = (targetClientId: string, targetShift: ShiftType = 'MORNING', defaultDepTime: string = '07:00') => {
    const relevantRoutes = routes.filter((r) => !targetClientId || r.clientId === targetClientId);
    const overrides = relevantRoutes.map((r) => {
      const defaultDriver = drivers.find((d) => d.id === r.defaultDriverId);
      return {
        routeId: r.id,
        selected: true,
        driverId: r.defaultDriverId || '',
        vehicleId: defaultDriver?.assignedVehicleId || r.defaultVehicleId || '',
        shift: targetShift,
        departureTime: defaultDepTime,
        saleAmount: Number(r.clientPricePerTrip || 0),
        costAmount: Number(r.supplierCostPerTrip || 0),
        driverAllowance: Number(r.driverTripAllowance || 0),
        vehicleCost: Number(r.vehicleRentalCost || 0),
        executionType: (r.executionType || (r.supplierId ? 'SUPPLIER' : 'COMPANY')) as 'COMPANY' | 'SUPPLIER',
      };
    });
    setRouteOverrides(overrides);
  };

  const updateRouteOverride = (routeId: string, fields: Partial<typeof routeOverrides[0]>) => {
    setRouteOverrides((prev) =>
      prev.map((item) => {
        if (item.routeId !== routeId) return item;
        const updated = { ...item, ...fields };
        if (fields.driverId && fields.driverId !== item.driverId) {
          const matchedDriver = drivers.find((d) => d.id === fields.driverId);
          updated.vehicleId = matchedDriver?.assignedVehicleId || '';
        }
        return updated;
      })
    );
  };

  const invalidateAllSync = () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-trends'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today-trips'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    queryClient.invalidateQueries({ queryKey: ['acc-operations'] });
    queryClient.invalidateQueries({ queryKey: ['acc-ops-summary'] });
    queryClient.invalidateQueries({ queryKey: ['acc-settlements'] });
    queryClient.invalidateQueries({ queryKey: ['acc-clients'] });
    queryClient.invalidateQueries({ queryKey: ['acc-suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['acc-income-statement'] });
    queryClient.invalidateQueries({ queryKey: ['acc-treasury-overview'] });
    queryClient.invalidateQueries({ queryKey: ['acc-monthly-breakdown'] });
    queryClient.invalidateQueries({ queryKey: ['acc-comparison'] });
    queryClient.invalidateQueries({ queryKey: ['accounting-kpis'] });
  };

  const createTripMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/trips', {
        ...payload,
        scheduledDeparture: new Date(payload.scheduledDeparture).toISOString(),
        expectedArrival: new Date(payload.expectedArrival).toISOString(),
      });
    },
    onSuccess: () => {
      invalidateAllSync();
      setIsCreateModalOpen(false);
      setConflictMessage(null);
    },
    onError: (err: any) => {
      setConflictMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Error scheduling trip',
      });
    },
  });

  const batchMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/trips/batch-generate', payload);
    },
    onSuccess: () => {
      invalidateAllSync();
      setIsBatchModalOpen(false);
    },
  });

  const dailyGenerateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/trips/generate-daily-from-templates', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      invalidateAllSync();

      const gen = resData?.data?.generatedCount ?? resData?.generatedCount ?? 0;
      const skipped = resData?.data?.skippedCount ?? resData?.skippedCount ?? 0;

      setIsDailyTemplateModalOpen(false);
      if (gen === 0 && skipped > 0) {
        setConflictMessage({
          type: 'error',
          text:
            lang === 'ar'
              ? `⚠️ تنبيه: لم يتم إنشاء أي رحلات جديدة لأن كافة الخطوط المختارة (${skipped}) مشغلة ومسجلة بالحسابات مسبقاً لهذا اليوم والوردية. تم تفعيل نظام منع التكرار لحماية الدفاتر المالية والحسابات من الازدواجية.`
              : `⚠️ Warning: 0 trips created because all selected routes (${skipped}) are already dispatched and recorded in the ledger for this date and shift. Duplicate protection prevented double posting.`,
        });
      } else {
        setConflictMessage({
          type: 'success',
          text:
            lang === 'ar'
              ? `✅ تم بنجاح تشغيل ${gen} رحلة من القالب وترحيل حساباتها فوراً (${skipped} تم تخطيها أو مسجلة مسبقاً).`
              : `✅ Successfully dispatched ${gen} trips from template and posted to general ledger (${skipped} skipped/duplicate).`,
        });
      }
      setDailyGenResult(null);
    },
    onError: (error: any) => {
      const errMsg =
        error.response?.data?.error?.message ||
        (lang === 'ar'
          ? 'حدث خطأ أثناء تشغيل القالب. يرجى مراجعة إعدادات الخطوط والأسطول والمحاولة مجدداً.'
          : 'Validation or dispatch error occurred.');
      setConflictMessage({
        type: 'error',
        text: `❌ ${errMsg}`,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TripStatus }) => {
      return api.patch(`/trips/${id}/status`, { tripStatus: status });
    },
    onSuccess: () => {
      invalidateAllSync();
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/trips/${id}`);
    },
    onSuccess: () => {
      invalidateAllSync();
      setDeletingTrip(null);
    },
  });

  const checkConflict = async () => {
    if (!formData.driverId || !formData.vehicleId) return;
    try {
      setConflictMessage(null);
      await api.post('/trips/check-conflict', {
        driverId: formData.driverId,
        vehicleId: formData.vehicleId,
        tripDate: formData.tripDate,
        scheduledDeparture: new Date(formData.scheduledDeparture).toISOString(),
        expectedArrival: new Date(formData.expectedArrival).toISOString(),
      });
      setConflictMessage({
        type: 'success',
        text: lang === 'ar' ? 'السائق والحافلة متاحين تماماً ولا يوجد أي تعارض بالمواعيد.' : 'Vehicle & Driver are verified available. No overlapping trips found.',
      });
    } catch (err: any) {
      setConflictMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Conflict detected',
      });
    }
  };

  const openCreateModal = () => {
    const defaultRoute = routes[0];
    const defaultClient = clients[0];
    const activeContract = contracts.find((c) => c.status === 'ACTIVE');
    const firstDriver = drivers.find((d) => d.assignedVehicleId) || drivers[0];

    const isSup = defaultRoute ? Boolean(defaultRoute.supplierId) : false;

    setFormData({
      clientId: defaultRoute?.clientId || defaultClient?.id || '',
      contractId: activeContract?.id || '',
      routeId: defaultRoute?.id || '',
      driverId: firstDriver?.id || '',
      vehicleId: firstDriver?.assignedVehicleId || defaultRoute?.defaultVehicleId || '',
      tripDate: new Date().toISOString().split('T')[0],
      shift: 'MORNING',
      scheduledDeparture: `${new Date().toISOString().split('T')[0]}T06:00`,
      expectedArrival: `${new Date().toISOString().split('T')[0]}T07:30`,
      saleAmount: Number(defaultRoute?.clientPricePerTrip || 0),
      costAmount: Number(defaultRoute?.supplierCostPerTrip || 0),
      driverAllowance: Number(defaultRoute?.driverTripAllowance || 0),
      vehicleCost: Number(defaultRoute?.vehicleRentalCost || 0),
      executionType: (defaultRoute?.executionType || (isSup ? 'SUPPLIER' : 'COMPANY')) as 'COMPANY' | 'SUPPLIER',
      notes: '',
    });
    setConflictMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleDriverChange = (driverId: string) => {
    const selected = drivers.find((d) => d.id === driverId);
    setFormData((prev) => ({
      ...prev,
      driverId,
      vehicleId: selected?.assignedVehicleId || '',
    }));
    setConflictMessage(null);
  };

  const selectedDriverObj = drivers.find((d) => d.id === formData.driverId);
  const selectedVehicleObj = selectedDriverObj?.assignedVehicle;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('navTrips')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'العمليات التشغيلية، توجيه الحافلات للورديات، وجدولة السائقين بدون تعارض'
              : 'Real-time transportation operations, shift dispatching, and conflict-free driver scheduling'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              invalidateAllSync();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title={lang === 'ar' ? 'تحديث ومزامنة الحسابات والتشغيل فورياً' : 'Sync Ledger & Operations'}
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
            <span>{lang === 'ar' ? 'تحديث الحسابات 🔄' : 'Sync Ledger'}</span>
          </button>
          {canManage && (
            <>
              <button
                onClick={() => {
                  const defaultDate = filterDate || new Date().toISOString().split('T')[0];
                  setDailyTemplateData({
                    date: defaultDate,
                    clientId: '',
                    shifts: ['MORNING'],
                    departureTime: '07:00',
                  });
                  initRouteOverrides('', 'MORNING', '07:00');
                  setDailyGenResult(null);
                  setIsDailyTemplateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
                <span>{lang === 'ar' ? 'تشغيل رحلات اليوم من القالب' : 'Run Daily Template Dispatch'}</span>
              </button>
              <button
                onClick={() => {
                  setBatchData({
                    routeId: routes[0]?.id || '',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
                    shifts: ['MORNING'],
                    departureTime: '06:00',
                    durationMinutes: 60,
                  });
                  setIsBatchModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Repeat className="h-4 w-4 text-blue-600" />
                <span>{t('batchRecurring')}</span>
              </button>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{t('scheduleTrip')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Global Alert Notification */}
      {conflictMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
            conflictMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {conflictMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{conflictMessage.text}</span>
          </div>
          <button
            onClick={() => setConflictMessage(null)}
            className="p-1 hover:bg-black/5 rounded transition-colors text-slate-500 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
        >
          <option value="">{isAr ? '🏢 جميع الشركات والعملاء' : '🏢 All Companies / Clients'}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName}
            </option>
          ))}
        </select>

        <select
          value={filterShift}
          onChange={(e) => setFilterShift(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
        >
          <option value="">{t('allShifts')}</option>
          <option value="MORNING">{t('MORNING')}</option>
          <option value="AFTERNOON">{t('AFTERNOON')}</option>
          <option value="NIGHT">{t('NIGHT')}</option>
          <option value="CUSTOM">{t('CUSTOM')}</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
        >
          <option value="">{t('allStatuses')}</option>
          <option value="SCHEDULED">{t('SCHEDULED')}</option>
          <option value="IN_PROGRESS">{t('IN_PROGRESS')}</option>
          <option value="COMPLETED">{t('COMPLETED')}</option>
          <option value="DELAYED">{t('DELAYED')}</option>
          <option value="CANCELLED">{t('CANCELLED')}</option>
        </select>

        {(filterDate || filterClient || filterShift || filterStatus) && (
          <button
            onClick={() => {
              setFilterDate('');
              setFilterClient('');
              setFilterShift('');
              setFilterStatus('');
            }}
            className="text-xs text-blue-600 hover:underline font-bold"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {/* Trips Table */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200/80">
          <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            {lang === 'ar' ? 'لا توجد رحلات مجدولة تطابق هذا البحث' : 'No trips scheduled for selected filters'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-4">{t('tripNumber')}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'التاريخ والوردية' : 'Date & Shift'}</th>
                  <th className="py-3 px-4">{t('clientFactory')}</th>
                  <th className="py-3 px-4">{t('route')}</th>
                  <th className="py-3 px-4">{t('driverVehicle')}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'المغادرة – الوصول' : 'Departure – Arrival'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'التسعير والربحية' : 'Pricing & Margin'}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                  {canManage && <th className="py-3 px-4 text-end">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.map((tItem) => {
                  const sale = Number(tItem.saleAmount || tItem.route?.clientPricePerTrip || 0);
                  const isSupplier = tItem.executionType === 'SUPPLIER' || !!tItem.supplierId || !!tItem.route?.supplierId;
                  const driverAllowance = Number(tItem.driverAllowance || tItem.route?.driverTripAllowance || 0);
                  const vehicleCost = Number(tItem.vehicleCost || tItem.route?.vehicleRentalCost || 0);
                  const supplierCost = Number(tItem.costAmount || tItem.route?.supplierCostPerTrip || 0);
                  const totalCost = isSupplier ? supplierCost : (driverAllowance + vehicleCost);
                  const margin = sale - totalCost;
                  const supplierName = tItem.supplier?.name || tItem.route?.supplier?.name;

                  return (
                    <tr key={tItem.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{tItem.tripNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {new Date(tItem.tripDate).toLocaleDateString()}
                        </div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 uppercase">
                          {t(tItem.shift as any) || tItem.shift}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{tItem.client?.companyName}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{tItem.route?.routeName}</div>
                        <div className="text-[10px] text-slate-400">
                          {tItem.route?.startLocation} → {tItem.route?.finalDestination}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{tItem.driver?.fullName}</div>
                        <div className="text-[11px] font-mono text-blue-600 font-medium">
                          {tItem.vehicle?.plateNumber} ({tItem.vehicle?.make})
                        </div>
                        {isSupplier && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-[10px] font-medium text-amber-700 border border-amber-200">
                            🚚 {supplierName || (lang === 'ar' ? 'مورد خارجي' : 'Supplier')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>
                            {new Date(tItem.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                            –{' '}
                            {new Date(tItem.expectedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-slate-400 text-[10px]">{lang === 'ar' ? 'إيراد:' : 'Rev:'}</span>
                            <span className="font-bold text-blue-700">{sale.toLocaleString()} EGP</span>
                          </div>
                          {isSupplier ? (
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              <span className="text-slate-400 text-[10px]">{lang === 'ar' ? 'مورد:' : 'Supplier:'}</span>
                              <span className="font-bold text-amber-700">{supplierCost.toLocaleString()} EGP</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600">
                                <span className="text-slate-400 text-[9px]">{lang === 'ar' ? 'سائق:' : 'Wage:'}</span>
                                <span>{driverAllowance.toLocaleString()}</span>
                                <span className="text-slate-400 text-[9px] ms-1">{lang === 'ar' ? 'عربية:' : 'Veh:'}</span>
                                <span className="font-bold text-amber-800">{vehicleCost.toLocaleString()}</span>
                              </div>
                            </>
                          )}
                          <div className="pt-0.5 border-t border-slate-100 flex items-center gap-1 text-[10px] font-semibold">
                            <span className="text-slate-400">{lang === 'ar' ? 'صافي:' : 'Net:'}</span>
                            <span className={margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {margin.toLocaleString()} EGP
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={tItem.tripStatus} />
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            {tItem.tripStatus === 'SCHEDULED' && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: tItem.id, status: 'IN_PROGRESS' })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-semibold transition-colors"
                              >
                                <Play className="h-3 w-3" />
                                <span>{t('startTrip')}</span>
                              </button>
                            )}
                            {tItem.tripStatus === 'IN_PROGRESS' && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: tItem.id, status: 'COMPLETED' })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md text-xs font-semibold transition-colors"
                                title={lang === 'ar' ? 'إتمام الرحلة وترحيل الحسابات للخزينة ودفتر القيود تلقائياً' : 'Complete trip and auto-post to Treasury & Ledger'}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{t('completeTrip')}</span>
                              </button>
                            )}
                            {(tItem.tripStatus === 'COMPLETED' || tItem.tripStatus === 'CANCELLED') && (
                              <span className="text-[11px] text-slate-400 italic">{t('archived')}</span>
                            )}
                            <button
                              onClick={() => setDeletingTrip(tItem)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title={t('deleteTrip')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* Schedule Single Trip Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={lang === 'ar' ? 'جدولة رحلة نقل جديدة' : 'Schedule Single Transportation Trip'}
        subtitle={
          lang === 'ar'
            ? 'تطبيق قاعدة التخصيص الدائم (1:1) مع فحص تعارض المواعيد وتداخل الرحلات'
            : 'Enforces 1:1 driver-to-vehicle pairing and zero-overlap conflict checking'
        }
        maxWidth="2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTripMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          {conflictMessage && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                conflictMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {conflictMessage.type === 'success' ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{conflictMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800">{isAr ? 'الشركة / المصنع (العميل)' : 'Client / Company'}</label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => {
                  const cId = e.target.value;
                  const firstRoute = routes.find((r) => r.clientId === cId);
                  const firstContract = contracts.find((c) => c.clientId === cId);
                  const isSup = firstRoute?.executionType === 'SUPPLIER' || !!firstRoute?.supplierId;
                  setFormData({
                    ...formData,
                    clientId: cId,
                    contractId: firstContract?.id || '',
                    routeId: firstRoute?.id || '',
                    driverId: firstRoute?.defaultDriverId || formData.driverId,
                    vehicleId: firstRoute?.defaultVehicleId || formData.vehicleId,
                    saleAmount: Number(firstRoute?.clientPricePerTrip || 0),
                    costAmount: Number(firstRoute?.supplierCostPerTrip || 0),
                    driverAllowance: Number(firstRoute?.driverTripAllowance || 0),
                    vehicleCost: Number(firstRoute?.vehicleRentalCost || 0),
                    executionType: isSup ? 'SUPPLIER' : 'COMPANY',
                  });
                }}
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
              <label className="block text-xs font-bold text-slate-800">{t('route')}</label>
              <select
                required
                value={formData.routeId}
                onChange={(e) => {
                  const rId = e.target.value;
                  const r = routes.find((rt) => rt.id === rId);
                  const isSup = r?.executionType === 'SUPPLIER' || !!r?.supplierId;
                  setFormData({
                    ...formData,
                    routeId: rId,
                    clientId: r?.clientId || formData.clientId,
                    driverId: r?.defaultDriverId || formData.driverId,
                    vehicleId: r?.defaultVehicleId || formData.vehicleId,
                    saleAmount: Number(r?.clientPricePerTrip || 0),
                    costAmount: Number(r?.supplierCostPerTrip || 0),
                    driverAllowance: Number(r?.driverTripAllowance || 0),
                    vehicleCost: Number(r?.vehicleRentalCost || 0),
                    executionType: isSup ? 'SUPPLIER' : 'COMPANY',
                  });
                }}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
              >
                <option value="">{isAr ? 'اختر خط السير...' : 'Select Route...'}</option>
                {routes
                  .filter((r) => !formData.clientId || r.clientId === formData.clientId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.routeName} ({r.startLocation} → {r.finalDestination})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Route Financial Details Card & Editable Rates */}
          {(() => {
            const isSupplier = formData.executionType === 'SUPPLIER';
            const totalCost = isSupplier
              ? Number(formData.costAmount || 0)
              : Number(formData.driverAllowance || 0) + Number(formData.vehicleCost || 0);
            const netMargin = Number(formData.saleAmount || 0) - totalCost;

            return (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{isAr ? 'بيانات التسعير والربحية للرحلة:' : 'Trip Financial Rates & Margin:'}</span>
                  {isSupplier ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      🚚 {isAr ? 'رحلة مورد خارجي' : 'Supplier Route'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      🏢 {isAr ? 'أسطول وسائقين الشركة' : 'Company Fleet'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      {isAr ? 'سعر العميل (إيراد):' : 'Client Rate (Rev):'}
                    </label>
                    <input
                      type="number"
                      value={formData.saleAmount}
                      onChange={(e) => setFormData({ ...formData, saleAmount: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg font-mono font-bold text-blue-700 bg-white"
                    />
                  </div>

                  {isSupplier ? (
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                        {isAr ? 'تكلفة المورد المستحقة:' : 'Supplier Cost:'}
                      </label>
                      <input
                        type="number"
                        value={formData.costAmount}
                        onChange={(e) => setFormData({ ...formData, costAmount: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg font-mono font-bold text-amber-700 bg-white"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          {isAr ? 'بدل السائق:' : 'Driver Wage:'}
                        </label>
                        <input
                          type="number"
                          value={formData.driverAllowance}
                          onChange={(e) => setFormData({ ...formData, driverAllowance: Number(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg font-mono font-bold text-amber-700 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          {isAr ? 'تكلفة/إيجار العربية:' : 'Vehicle Rental Cost:'}
                        </label>
                        <input
                          type="number"
                          value={formData.vehicleCost}
                          onChange={(e) => setFormData({ ...formData, vehicleCost: Number(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg font-mono font-bold text-purple-700 bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] font-bold">
                  <span className="text-slate-600">{isAr ? 'صافي الربح المتوقع للرحلة:' : 'Expected Net Margin:'}</span>
                  <span className={`font-mono text-xs ${netMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {netMargin.toLocaleString()} EGP
                  </span>
                </div>
              </div>
            );
          })()}

          {/* 1:1 DRIVER & AUTO-LOCKED VEHICLE SECTION */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-slate-800">
                {t('chooseDriver')}
              </label>
              <select
                required
                value={formData.driverId}
                onChange={(e) => handleDriverChange(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">{t('chooseDriverPlaceholder')}</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} {d.assignedVehicle ? `[${d.assignedVehicle.plateNumber}]` : (lang === 'ar' ? '[بدون حافلة]' : '[No Vehicle]')}
                  </option>
                ))}
              </select>
              {selectedDriverObj && !selectedDriverObj.assignedVehicleId && (
                <span className="text-[11px] text-rose-600 block mt-1">
                  {lang === 'ar' ? '⚠️ هذا السائق ليس لديه حافلة مخصصة بعد.' : '⚠️ This driver has no dedicated vehicle assigned.'}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  {t('autoLockedVehicle')}
                </label>
                <Lock className="h-3 w-3 text-slate-400" />
              </div>
              <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono">
                <Bus className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="font-bold text-slate-900">
                  {selectedVehicleObj ? selectedVehicleObj.plateNumber : (lang === 'ar' ? 'لم يتم اختيار حافلة' : 'No Vehicle Selected')}
                </span>
                {selectedVehicleObj && (
                  <span className="text-[11px] text-slate-500">
                    ({selectedVehicleObj.make} • {selectedVehicleObj.capacity} {lang === 'ar' ? 'مقعد' : 'seats'})
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {t('autoLockedNote')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ الرحلة' : 'Trip Date'}</label>
              <input
                type="date"
                required
                value={formData.tripDate}
                onChange={(e) => updateShiftTimes(formData.shift, e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{t('shift')}</label>
              <select
                value={formData.shift}
                onChange={(e) => updateShiftTimes(e.target.value as ShiftType, formData.tripDate)}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
              >
                <option value="MORNING">{t('MORNING')} (صباحية 06:00)</option>
                <option value="AFTERNOON">{t('AFTERNOON')} (مسائية 15:00)</option>
                <option value="NIGHT">{t('NIGHT')} (ليلية 22:00)</option>
                <option value="CUSTOM">{t('CUSTOM')} (مخصصة)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'موعد المغادرة المجدول' : 'Scheduled Departure Time'}</label>
              <input
                type="datetime-local"
                required
                value={formData.scheduledDeparture}
                onChange={(e) => handleDepartureChange(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'موعد الوصول المتوقع' : 'Expected Arrival Time'}</label>
              <input
                type="datetime-local"
                required
                value={formData.expectedArrival}
                onChange={(e) => setFormData({ ...formData, expectedArrival: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={checkConflict}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{t('verifyConflict')}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={createTripMutation.isPending || !formData.vehicleId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {createTripMutation.isPending ? t('authenticating') : (lang === 'ar' ? 'تأكيد الجدولة' : 'Dispatch Trip')}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Batch Recurring Trips Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={t('batchRecurring')}
        subtitle={
          lang === 'ar'
            ? 'توليد تلقائي للرحلات اليومية والورديات عبر فترة زمنية'
            : 'Auto-schedules daily recurring shifts across a date range'
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            batchMutation.mutate(batchData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'اختر خط السير' : 'Select Route Template'}</label>
            <select
              required
              value={batchData.routeId}
              onChange={(e) => setBatchData({ ...batchData, routeId: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeName} ({r.client?.companyName})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
              <input
                type="date"
                required
                value={batchData.startDate}
                onChange={(e) => setBatchData({ ...batchData, startDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</label>
              <input
                type="date"
                required
                value={batchData.endDate}
                onChange={(e) => setBatchData({ ...batchData, endDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'ساعة المغادرة اليومية' : 'Daily Departure Time'}</label>
              <input
                type="time"
                required
                value={batchData.departureTime}
                onChange={(e) => setBatchData({ ...batchData, departureTime: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">{lang === 'ar' ? 'مدة الرحلة (دقائق)' : 'Trip Duration (mins)'}</label>
              <input
                type="number"
                required
                min={15}
                value={batchData.durationMinutes}
                onChange={(e) => setBatchData({ ...batchData, durationMinutes: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={batchMutation.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {batchMutation.isPending ? t('authenticating') : (lang === 'ar' ? 'بدء التوليد التلقائي' : 'Run Batch Generator')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Trip Confirmation Modal */}
      <Modal
        isOpen={!!deletingTrip}
        onClose={() => setDeletingTrip(null)}
        title={t('deleteTrip')}
        subtitle={`${t('deleteTripConfirm')} "${deletingTrip?.tripNumber}" (${deletingTrip?.route?.routeName})`}
      >
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('deleteWarningText')}</p>
              <p className="mt-1 text-rose-700">
                {lang === 'ar'
                  ? 'سيتم إلغاء وحذف سجل هذه الرحلة وإعادة تعيين حالة الحافلة والسائق إذا كانت جارية.'
                  : 'This trip record will be permanently deleted, and vehicle/driver states will be restored if active.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeletingTrip(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={deleteTripMutation.isPending}
              onClick={() => deletingTrip && deleteTripMutation.mutate(deletingTrip.id)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {deleteTripMutation.isPending ? t('authenticating') : t('delete')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Daily Template Dispatch Pop-out Modal */}
      <Modal
        isOpen={isDailyTemplateModalOpen}
        onClose={() => setIsDailyTemplateModalOpen(false)}
        title={lang === 'ar' ? 'تشغيل رحلات اليوم من قوالب الخطوط' : 'Run Daily Template Dispatch'}
        subtitle={
          lang === 'ar'
            ? 'مراجعة وتعديل خطوط الشركة وتشغيل القالب بضغطة واحدة مع ترحيل الحسابات فورياً للخزينة'
            : 'Preview, customize route fleet/pricing, and dispatch company template with instant accounting ledger synchronization'
        }
        maxWidth="3xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            dailyGenerateMutation.mutate({
              ...dailyTemplateData,
              tripStatus: autoCompleteTrip ? 'COMPLETED' : 'SCHEDULED',
              routeOverrides,
            });
          }}
          className="space-y-4"
        >
          {dailyGenResult && (
            <div
              className={`p-3.5 rounded-lg text-xs space-y-1.5 ${
                dailyGenResult.generatedCount > 0
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {lang === 'ar'
                    ? `تم بنجاح تشغيل ${dailyGenResult.generatedCount} رحلة وترحيل حساباتها (${dailyGenResult.skippedCount} تم تخطيها أو مسجلة مسبقاً).`
                    : `Successfully dispatched ${dailyGenResult.generatedCount} trips and posted ledger (${dailyGenResult.skippedCount} skipped/duplicate).`}
                </span>
              </div>
              {dailyGenResult.skippedDetails && dailyGenResult.skippedDetails.length > 0 && (
                <div className="text-[11px] text-slate-600 mt-2 border-t border-slate-200/50 pt-1.5 max-h-32 overflow-y-auto space-y-1">
                  {dailyGenResult.skippedDetails.map((sk: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="font-medium text-slate-700">{sk.routeName}:</span>
                      <span className="text-slate-500">{sk.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top Controls: Date & Client Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-slate-800">
                {lang === 'ar' ? 'تاريخ التشغيل المطلوب' : 'Target Operating Date'}
              </label>
              <input
                type="date"
                required
                value={dailyTemplateData.date}
                onChange={(e) => setDailyTemplateData({ ...dailyTemplateData, date: e.target.value })}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800">
                {lang === 'ar' ? 'الشركة / المصنع' : 'Client Company'}
              </label>
              <select
                value={dailyTemplateData.clientId}
                onChange={(e) => {
                  const cId = e.target.value;
                  setDailyTemplateData({ ...dailyTemplateData, clientId: cId });
                  initRouteOverrides(cId, dailyTemplateData.shifts[0] || 'MORNING', dailyTemplateData.departureTime || '07:00');
                }}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="">{lang === 'ar' ? 'جميع الشركات والخطوط النشطة' : 'All Companies & Active Routes'}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800">{lang === 'ar' ? 'الوردية الافتراضية' : 'Default Shift'}</label>
              <select
                value={dailyTemplateData.shifts[0] || 'MORNING'}
                onChange={(e) => {
                  const newShift = e.target.value as ShiftType;
                  const newDepTime = newShift === 'MORNING' ? '07:00' : newShift === 'AFTERNOON' ? '15:00' : '22:00';
                  setDailyTemplateData({ ...dailyTemplateData, shifts: [newShift], departureTime: newDepTime });
                  setRouteOverrides((prev) => prev.map((item) => ({ ...item, shift: newShift, departureTime: newDepTime })));
                }}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
              >
                <option value="MORNING">{lang === 'ar' ? 'صباحية (Morning 07:00)' : 'Morning (07:00)'}</option>
                <option value="AFTERNOON">{lang === 'ar' ? 'مسائية (Afternoon 15:00)' : 'Afternoon (15:00)'}</option>
                <option value="NIGHT">{lang === 'ar' ? 'ليلية (Night 22:00)' : 'Night (22:00)'}</option>
              </select>
            </div>
          </div>

          {/* Duplicate protection warning banner */}
          {(() => {
            const currentShift = dailyTemplateData.shifts[0] || 'MORNING';
            const existingTripsForShift = templateDateTrips.filter(
              (t) => t.shift === currentShift && t.tripStatus !== 'CANCELLED'
            );
            const existingRouteMap = new Map(existingTripsForShift.map((t) => [t.routeId, t]));
            const alreadyDispatchedCount = routeOverrides.filter((item) => existingRouteMap.has(item.routeId)).length;
            const allDispatched = routeOverrides.length > 0 && alreadyDispatchedCount === routeOverrides.length;

            if (!allDispatched) return null;

            return (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">
                    {lang === 'ar'
                      ? `⚠️ تنبيه هام: جميع الخطوط المحددة (${alreadyDispatchedCount} خط) تم تشغيلها ومسجلة بالحسابات مسبقاً لهذا اليوم (${dailyTemplateData.date}) والوردية (${currentShift === 'MORNING' ? 'صباحية' : currentShift === 'AFTERNOON' ? 'مسائية' : 'ليلية'}).`
                      : `⚠️ Notice: All selected routes (${alreadyDispatchedCount}) have already been dispatched and posted for date (${dailyTemplateData.date}) and shift (${currentShift}).`}
                  </p>
                  <p className="mt-1 text-amber-800">
                    {lang === 'ar'
                      ? 'نظام الحماية من الازدواجية يمنع التكرار لضمان عدم ازدواجية الفواتير والقيود المحاسبية. إذا كنت تريد تشغيل وردية أخرى، اختر (مسائية أو ليلية) من خيار الوردية أعلاه.'
                      : 'Duplicate prevention prevents double entries. If you want to dispatch another shift, choose Afternoon or Night above.'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Financial Summary & Count of selected routes */}
          {(() => {
            const activeItems = routeOverrides.filter((o) => o.selected);
            const totalRev = activeItems.reduce((acc, cur) => acc + Number(cur.saleAmount || 0), 0);
            const totalCost = activeItems.reduce(
              (acc, cur) =>
                acc + (cur.executionType === 'SUPPLIER' ? Number(cur.costAmount || 0) : (Number(cur.driverAllowance || 0) + Number(cur.vehicleCost || 0))),
              0
            );
            const totalMargin = totalRev - totalCost;

            return (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-900">
                    {lang === 'ar'
                      ? `الخطوط المحددة للتشغيل: ${activeItems.length} من أصل ${routeOverrides.length}`
                      : `Selected Lines: ${activeItems.length} of ${routeOverrides.length}`}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 font-sans text-[11px]">{lang === 'ar' ? 'إجمالي الإيراد: ' : 'Revenue: '}</span>
                    <span className="font-bold text-blue-700">{totalRev.toLocaleString()} EGP</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[11px]">{lang === 'ar' ? 'إجمالي التكلفة: ' : 'Cost: '}</span>
                    <span className="font-bold text-amber-700">{totalCost.toLocaleString()} EGP</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans text-[11px]">{lang === 'ar' ? 'صافي الربح: ' : 'Margin: '}</span>
                    <span className={`font-bold ${totalMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {totalMargin.toLocaleString()} EGP
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Interactive Route Cards (Pop-out List) */}
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {routeOverrides.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                {lang === 'ar' ? 'لا توجد خطوط سير نشطة لهذه الشركة حالياً.' : 'No active route templates found for this client.'}
              </div>
            ) : (
              routeOverrides.map((item) => {
                const routeObj = routes.find((r) => r.id === item.routeId);
                const selectedDriver = drivers.find((d) => d.id === item.driverId);
                const selectedVehicle = selectedDriver?.assignedVehicle || (item.vehicleId ? routeObj?.defaultVehicle : null);
                const isSupplier = item.executionType === 'SUPPLIER';
                const currentCost = isSupplier ? Number(item.costAmount || 0) : (Number(item.driverAllowance || 0) + Number(item.vehicleCost || 0));
                const currentMargin = Number(item.saleAmount || 0) - currentCost;

                const currentShift = item.shift || dailyTemplateData.shifts[0] || 'MORNING';
                const existingTrip = templateDateTrips.find(
                  (t) => t.routeId === item.routeId && t.shift === currentShift && t.tripStatus !== 'CANCELLED'
                );
                const isUnassigned = !item.driverId || !selectedVehicle;

                return (
                  <div
                    key={item.routeId}
                    className={`p-3.5 rounded-xl border transition-all ${
                      existingTrip
                        ? 'bg-amber-50/40 border-amber-200'
                        : isUnassigned
                        ? 'bg-rose-50/30 border-rose-200'
                        : item.selected
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1 overflow-hidden">
                        <input
                          type="checkbox"
                          checked={item.selected && !isUnassigned}
                          disabled={isUnassigned}
                          onChange={(e) => updateRouteOverride(item.routeId, { selected: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-1 cursor-pointer shrink-0 disabled:opacity-40"
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span
                              className="font-black text-slate-900 text-xs break-words break-all line-clamp-2 max-w-full"
                              title={routeObj?.routeName}
                            >
                              {routeObj?.routeName}
                            </span>
                            {routeObj?.client?.companyName && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 truncate max-w-[180px] shrink-0">
                                {routeObj?.client?.companyName}
                              </span>
                            )}
                            {existingTrip && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0 flex items-center gap-1">
                                ⚠️ {lang === 'ar' ? `مشغلة مسبقاً (${existingTrip.tripNumber})` : `Dispatched (${existingTrip.tripNumber})`}
                              </span>
                            )}
                            {isUnassigned && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                                ⚠️ {lang === 'ar' ? 'يحتاج تعيين سائق وحافلة' : 'Missing Driver'}
                              </span>
                            )}
                            {isSupplier ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 truncate max-w-[200px] shrink-0">
                                🚚 {lang === 'ar' ? `مورد: ${routeObj?.supplier?.name || 'مورد خارجي'}` : 'Supplier'}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                                🏢 {lang === 'ar' ? 'أسطول الشركة' : 'Company Fleet'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 break-words break-all line-clamp-1">
                            {routeObj?.startLocation} → {routeObj?.finalDestination}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs shrink-0 self-end sm:self-center">
                        <span className="text-[10px] text-slate-400">{lang === 'ar' ? 'الربح:' : 'Margin:'}</span>
                        <span className={`font-bold ${currentMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {currentMargin.toLocaleString()} EGP
                        </span>
                      </div>
                    </div>

                    {/* Inline Overrides for this Route */}
                    {item.selected && (
                      <div className={`mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-1 ${isSupplier ? 'sm:grid-cols-4' : 'sm:grid-cols-5'} gap-2.5 text-xs`}>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            {lang === 'ar' ? 'السائق المخصص:' : 'Driver:'}
                          </label>
                          <select
                            value={item.driverId}
                            onChange={(e) => updateRouteOverride(item.routeId, { driverId: e.target.value })}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                          >
                            <option value="">{lang === 'ar' ? 'اختر سائق...' : 'Select driver...'}</option>
                            {drivers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.fullName} {d.assignedVehicle ? `[${d.assignedVehicle.plateNumber}]` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            {lang === 'ar' ? 'الحافلة (مقفولة):' : 'Vehicle (Locked):'}
                          </label>
                          <div className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 truncate">
                            {selectedVehicle ? `${selectedVehicle.plateNumber} (${selectedVehicle.make})` : '—'}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            {lang === 'ar' ? 'سعر العميل (إيراد):' : 'Client Rate:'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.saleAmount || ''}
                            onChange={(e) => updateRouteOverride(item.routeId, { saleAmount: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono font-bold text-blue-700"
                          />
                        </div>

                        {isSupplier ? (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              {lang === 'ar' ? 'تكلفة المورد:' : 'Supplier Cost:'}
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={item.costAmount || ''}
                              onChange={(e) => updateRouteOverride(item.routeId, { costAmount: Math.max(0, Number(e.target.value)) })}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono font-bold text-amber-700"
                            />
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                {lang === 'ar' ? 'بدل السائق:' : 'Driver Wage:'}
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.driverAllowance || ''}
                                onChange={(e) => updateRouteOverride(item.routeId, { driverAllowance: Math.max(0, Number(e.target.value)) })}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono font-bold text-amber-700"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                {lang === 'ar' ? 'تكلفة/مخصص العربية:' : 'Vehicle Cost:'}
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.vehicleCost || ''}
                                onChange={(e) => updateRouteOverride(item.routeId, { vehicleCost: Math.max(0, Number(e.target.value)) })}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono font-bold text-purple-700"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Instant Ledger Posting Checkbox */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <input
              type="checkbox"
              id="autoCompleteTrip"
              checked={autoCompleteTrip}
              onChange={(e) => setAutoCompleteTrip(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="autoCompleteTrip" className="font-semibold text-slate-800 cursor-pointer">
              {lang === 'ar'
                ? 'ترحيل فوري لدفتر الحسابات والخزينة (تسجيل الرحلات كمكتملة فوراً بدون خطوات إضافية)'
                : 'Instantly post to Accounting Ledger & Treasury (Mark trips as COMPLETED immediately)'}
            </label>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDailyTemplateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-50"
            >
              {dailyGenResult ? (lang === 'ar' ? 'إغلاق' : 'Close') : t('cancel')}
            </button>
            <button
              type="submit"
              disabled={dailyGenerateMutation.isPending || routeOverrides.filter((o) => o.selected).length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <CalendarCheck className="h-4 w-4" />
              <span>
                {dailyGenerateMutation.isPending
                  ? t('authenticating')
                  : lang === 'ar'
                  ? '🚀 تشغيل القالب وترحيل الحسابات فوراً'
                  : '🚀 Run Template & Post Ledger'}
              </span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};