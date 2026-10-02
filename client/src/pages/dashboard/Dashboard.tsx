import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { DashboardKPIs, Trip } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Bus,
  Users,
  Building2,
  CalendarCheck,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Receipt,
  Route as RouteIcon,
  Wrench,
  Handshake,
  BarChart3,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const queryClient = useQueryClient();

  const { data: kpiData, isLoading: kpiLoading, isFetching: isRefreshingKPIs } = useQuery<{ data: DashboardKPIs }>({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await api.get('/dashboard/kpis');
      return res.data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: trendData } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: async () => {
      const res = await api.get('/dashboard/trends');
      return res.data.data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: todayTrips } = useQuery<{ data: Trip[] }>({
    queryKey: ['dashboard-today-trips'],
    queryFn: async () => {
      const res = await api.get('/trips?status=SCHEDULED&limit=5');
      return res.data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const kpis = kpiData?.data;
  const trips = todayTrips?.data || [];

  if (kpiLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasCriticalAlerts =
    (kpis?.alerts?.expiredDriverLicenses || 0) > 0 ||
    (kpis?.alerts?.expiredVehicleDocs || 0) > 0 ||
    (kpis?.alerts?.expiredContracts || 0) > 0;

  const hasWarningAlerts =
    (kpis?.alerts?.expiringContracts || 0) > 0 ||
    (kpis?.alerts?.expiringVehicleDocs || 0) > 0 ||
    (kpis?.alerts?.expiringDriverLicenses || 0) > 0;

  const quickNav = [
    { label: isAr ? 'تشغيل ورحلات اليوم' : 'Daily Trips', to: '/trips', icon: CalendarCheck, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200' },
    { label: isAr ? 'الشركات والعملاء' : 'Clients', to: '/clients', icon: Building2, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200' },
    { label: isAr ? 'قوالب وخطوط السير' : 'Routes', to: '/routes', icon: RouteIcon, color: 'text-teal-600 bg-teal-50 hover:bg-teal-100 border-teal-200' },
    { label: isAr ? 'الأسطول والمركبات' : 'Fleet Vehicles', to: '/vehicles', icon: Bus, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
    { label: isAr ? 'السائقون' : 'Drivers', to: '/drivers', icon: Users, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200' },
    { label: isAr ? 'الشركاء والموردون' : 'Suppliers', to: '/partners', icon: Handshake, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
    { label: isAr ? 'الحسابات والخزينة العامة' : 'Accounting', to: '/accounting', icon: Receipt, color: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300' },
    { label: isAr ? 'الصيانة الدورية' : 'Maintenance', to: '/maintenance', icon: Wrench, color: 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200' },
    { label: isAr ? 'التقارير والتحليلات' : 'Reports', to: '/reports', icon: BarChart3, color: 'text-sky-600 bg-sky-50 hover:bg-sky-100 border-sky-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('dashboardTitle')}</h1>
          <p className="text-xs text-slate-500 mt-1">{t('dashboardSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-trends'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-today-trips'] });
            }}
            disabled={isRefreshingKPIs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors disabled:opacity-50"
            title={isAr ? 'تحديث مؤشرات الداش بورد فورياً' : 'Refresh KPIs'}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshingKPIs ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث المؤشرات' : 'Refresh'}</span>
          </button>
          <Link
            to="/trips"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <CalendarCheck className="h-4 w-4" />
            <span>{t('openDispatch')}</span>
          </Link>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700">{isAr ? 'الوصول المباشر لأقسام المنظومة' : 'Direct System Access'}</span>
          <span className="text-[11px] text-slate-400 font-medium">{isAr ? 'روابط سريعة لكافة المميزات' : 'Quick links'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
          {quickNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`p-3 rounded-xl border flex flex-col items-center text-center justify-center gap-1.5 transition-all duration-150 group shadow-2xs ${item.color}`}
            >
              <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
              <span className="text-[11px] font-bold leading-tight line-clamp-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Critical Expired Compliance Alert Banner (RED) */}
      {hasCriticalAlerts && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3.5 shadow-xs">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-rose-900">
                {lang === 'ar' ? 'تنبيهات حرجة: وثائق ورخص منتهية الصلاحية!' : 'Critical Compliance: Expired Documents!'}
              </h4>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-200 text-rose-900">
                {lang === 'ar' ? 'يتطلب إجراء فوري' : 'Action Required'}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-4 text-xs text-rose-800 font-medium">
              {Boolean(kpis?.alerts?.expiredDriverLicenses) && (
                <Link to="/drivers" className="hover:underline flex items-center gap-1">
                  • {kpis?.alerts?.expiredDriverLicenses} {lang === 'ar' ? 'سائق رخصته منتهية الصلاحية' : 'Driver license(s) expired'}
                </Link>
              )}
              {Boolean(kpis?.alerts?.expiredVehicleDocs) && (
                <Link to="/vehicles" className="hover:underline flex items-center gap-1">
                  • {kpis?.alerts?.expiredVehicleDocs} {lang === 'ar' ? 'حافلة وثائقها/رخصتها منتهية الصلاحية' : 'Vehicle doc(s) expired'}
                </Link>
              )}
              {Boolean(kpis?.alerts?.expiredContracts) && (
                <Link to="/contracts" className="hover:underline flex items-center gap-1">
                  • {kpis?.alerts?.expiredContracts} {lang === 'ar' ? 'عقد منتهي الصلاحية' : 'Contract(s) expired'}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Expiration Warning Alert Banner (AMBER) */}
      {hasWarningAlerts && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-amber-900">{t('complianceAlerts')}</h4>
            <div className="mt-1 flex flex-wrap gap-4 text-xs text-amber-800">
              {Boolean(kpis?.alerts?.expiringContracts) && (
                <Link to="/contracts" className="hover:underline font-medium">
                  • {kpis?.alerts?.expiringContracts} {lang === 'ar' ? 'عقد ينتهي خلال 30 يوم' : 'Contract(s) expiring within 30 days'}
                </Link>
              )}
              {Boolean(kpis?.alerts?.expiringVehicleDocs) && (
                <Link to="/vehicles" className="hover:underline font-medium">
                  • {kpis?.alerts?.expiringVehicleDocs} {lang === 'ar' ? 'حافلة تنتهي رخصتها أو فحصها خلال 30 يوم' : 'Vehicle doc(s) expiring within 30 days'}
                </Link>
              )}
              {Boolean(kpis?.alerts?.expiringDriverLicenses) && (
                <Link to="/drivers" className="hover:underline font-medium">
                  • {kpis?.alerts?.expiringDriverLicenses} {lang === 'ar' ? 'سائق تنتهي رخصته خلال 30 يوم' : 'Driver license(s) expiring within 30 days'}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('kpiVehicles')}
          value={kpis?.vehicles?.total || 0}
          subtitle={
            lang === 'ar'
              ? `${kpis?.vehicles?.available || 0} متاح • ${kpis?.vehicles?.underMaintenance || 0} في الصيانة`
              : `${kpis?.vehicles?.available || 0} available • ${kpis?.vehicles?.underMaintenance || 0} in repair`
          }
          icon={Bus}
          color="blue"
        />
        <StatCard
          title={t('kpiDrivers')}
          value={kpis?.drivers?.total || 0}
          subtitle={
            lang === 'ar'
              ? `${kpis?.drivers?.available || 0} سائق متاح للتوجيه`
              : `${kpis?.drivers?.available || 0} available for dispatch`
          }
          icon={Users}
          color="emerald"
        />
        <StatCard
          title={t('kpiClientsContracts')}
          value={`${kpis?.clients?.active || 0} / ${kpis?.contracts?.active || 0}`}
          subtitle={
            lang === 'ar'
              ? `${kpis?.contracts?.expiringSoon || 0} عقود تنتهي قريباً`
              : `${kpis?.contracts?.expiringSoon || 0} contracts expiring soon`
          }
          icon={Building2}
          color="purple"
        />
        <StatCard
          title={t('kpiTodayTrips')}
          value={kpis?.tripsToday?.total || 0}
          subtitle={
            lang === 'ar'
              ? `${kpis?.tripsToday?.completed || 0} مكتملة • ${kpis?.tripsToday?.inProgress || 0} قيد الطريق`
              : `${kpis?.tripsToday?.completed || 0} completed • ${kpis?.tripsToday?.inProgress || 0} on road`
          }
          icon={CalendarCheck}
          color="indigo"
        />
      </div>

      {/* Charts & Operational Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Operations Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{t('weeklyTripVolume')}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('weeklyTripSubtitle')}</p>
            </div>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="completed" name={t('COMPLETED')} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scheduled" name={t('SCHEDULED')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name={t('CANCELLED')} fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Distribution & Quick Status */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{t('vehicleStatusTitle')}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{t('vehicleStatusSubtitle')}</p>

            <div className="mt-5 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">{t('AVAILABLE')}</span>
                  <span className="font-bold text-emerald-600">{kpis?.vehicles?.available || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${
                        kpis?.vehicles?.total
                          ? Math.round(((kpis?.vehicles?.available || 0) / kpis.vehicles.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">{t('ASSIGNED')} / {t('ON_TRIP')}</span>
                  <span className="font-bold text-blue-600">{kpis?.vehicles?.assigned || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${
                        kpis?.vehicles?.total
                          ? Math.round(((kpis?.vehicles?.assigned || 0) / kpis.vehicles.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">{t('UNDER_MAINTENANCE')}</span>
                  <span className="font-bold text-amber-600">{kpis?.vehicles?.underMaintenance || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{
                      width: `${
                        kpis?.vehicles?.total
                          ? Math.round(((kpis?.vehicles?.underMaintenance || 0) / kpis.vehicles.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to="/vehicles"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <span>{t('manageFleetVehicles')}</span>
              <ArrowUpRight className="h-3.5 w-3.5 rtl:rotate-90" />
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming Scheduled Trips List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-800">{t('nextDepartures')}</h3>
          </div>
          <Link to="/trips" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            {t('viewAllDispatches')}
          </Link>
        </div>

        {trips.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">{t('noUpcomingTrips')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-4">{t('tripNumber')}</th>
                  <th className="py-3 px-4">{t('clientFactory')}</th>
                  <th className="py-3 px-4">{t('route')}</th>
                  <th className="py-3 px-4">{t('driverVehicle')}</th>
                  <th className="py-3 px-4">{t('shift')}</th>
                  <th className="py-3 px-4">{t('departure')}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.slice(0, 5).map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{trip.tripNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{trip.client?.companyName}</td>
                    <td className="py-3 px-4 text-slate-600">{trip.route?.routeName}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{trip.driver?.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {trip.vehicle?.plateNumber} ({trip.vehicle?.make})
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {t(trip.shift as any) || trip.shift}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono">
                      {new Date(trip.scheduledDeparture).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={trip.tripStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};