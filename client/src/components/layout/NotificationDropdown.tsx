import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, ShieldAlert, CheckCircle2, FileText, Bus, User } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface NotificationItem {
  id: string;
  category: 'DRIVER' | 'VEHICLE' | 'CONTRACT';
  severity: 'CRITICAL' | 'WARNING';
  titleEn: string;
  titleAr: string;
  detailsEn: string;
  detailsAr: string;
  expiryDate: string;
  daysDiff: number;
  targetId: string;
  link: string;
}

interface NotificationsResponse {
  totalCount: number;
  criticalCount: number;
  warningCount: number;
  notifications: NotificationItem[];
}

export const NotificationDropdown: React.FC = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRIVER' | 'VEHICLE' | 'CONTRACT'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifData, isPending, isError, refetch } = useQuery<{ data: NotificationsResponse }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/dashboard/notifications');
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const notifs = notifData?.data?.notifications || [];
  const criticalCount = notifData?.data?.criticalCount || 0;
  const totalCount = notifData?.data?.totalCount || 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isOpen]);

  const filteredNotifs = notifs.filter((item) => {
    if (activeTab === 'ALL') return true;
    return item.category === activeTab;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'DRIVER':
        return <User className="h-3.5 w-3.5" />;
      case 'VEHICLE':
        return <Bus className="h-3.5 w-3.5" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  const handleNotificationClick = (link: string) => {
    setIsOpen(false);
    navigate(link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ops-icon relative text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
        aria-expanded={isOpen}
        aria-controls="compliance-notifications"
        aria-label={lang === 'ar' ? 'التنبيهات' : 'Notifications'}
        title={lang === 'ar' ? 'التنبيهات والإشعارات' : 'Compliance & Notifications'}
      >
        <Bell className="h-5 w-5" />
        {totalCount > 0 && (
          <span
            className={`absolute top-1 rtl:left-1 ltr:right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs ${
              criticalCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
            }`}
          >
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="compliance-notifications"
          className="ops-notification-panel rounded-xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`h-4 w-4 ${criticalCount > 0 ? 'text-rose-600' : 'text-amber-600'}`} />
              <span className="text-xs font-bold text-slate-900">
                {lang === 'ar' ? 'مركز تنبيهات الامتثال والرخص' : 'Statutory Compliance Alerts'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {criticalCount > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                  {criticalCount} {lang === 'ar' ? 'منتهي' : 'Expired'}
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                {totalCount} {lang === 'ar' ? 'تنبيه' : 'Alerts'}
              </span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex border-b border-slate-100 bg-white px-2 pt-1 text-[11px] font-medium text-slate-600 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-2.5 py-1.5 rounded-t-md border-b-2 transition-colors ${
                activeTab === 'ALL'
                  ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All'} ({notifs.length})
            </button>
            <button
              onClick={() => setActiveTab('DRIVER')}
              className={`px-2.5 py-1.5 rounded-t-md border-b-2 transition-colors ${
                activeTab === 'DRIVER'
                  ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {lang === 'ar' ? 'السائقين' : 'Drivers'} ({notifs.filter((n) => n.category === 'DRIVER').length})
            </button>
            <button
              onClick={() => setActiveTab('VEHICLE')}
              className={`px-2.5 py-1.5 rounded-t-md border-b-2 transition-colors ${
                activeTab === 'VEHICLE'
                  ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {lang === 'ar' ? 'الحافلات' : 'Vehicles'} ({notifs.filter((n) => n.category === 'VEHICLE').length})
            </button>
            <button
              onClick={() => setActiveTab('CONTRACT')}
              className={`px-2.5 py-1.5 rounded-t-md border-b-2 transition-colors ${
                activeTab === 'CONTRACT'
                  ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {lang === 'ar' ? 'العقود' : 'Contracts'} ({notifs.filter((n) => n.category === 'CONTRACT').length})
            </button>
          </div>

          {/* Notifications List */}
          <div className="ops-notification-list divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {isPending ? <p className="p-6 text-xs" role="status">{lang === "ar" ? "جاري تحميل التنبيهات…" : "Loading alerts…"}</p> : isError ? <div className="p-6 text-xs" role="alert"><p>{lang === "ar" ? "تعذر تحميل التنبيهات." : "Could not load alerts."}</p><button className="ops-text-link" onClick={() => refetch()}>{lang === "ar" ? "حاول مرة أخرى" : "Try again"}</button></div> : filteredNotifs.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">
                  {lang === 'ar' ? 'جميع الوثائق والرخص سارية ومتوافقة' : 'All licenses and documents compliant'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'لا توجد رخص منتهية أو تستحق التجديد حالياً' : 'No upcoming expirations in this category'}
                </p>
              </div>
            ) : (
              filteredNotifs.map((item) => {
                const isCrit = item.severity === 'CRITICAL';
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleNotificationClick(item.link)}
                    className={`w-full p-3 text-start hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isCrit ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                        isCrit ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {isCrit ? <AlertTriangle className="h-4 w-4" /> : getCategoryIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {lang === 'ar' ? item.titleAr : item.titleEn}
                        </h4>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isCrit
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isCrit
                            ? lang === 'ar'
                              ? `منتهية (${Math.abs(item.daysDiff)} ي)`
                              : `Expired (${Math.abs(item.daysDiff)}d)`
                            : lang === 'ar'
                            ? `باقي ${item.daysDiff} يوم`
                            : `In ${item.daysDiff}d`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                        {lang === 'ar' ? item.detailsAr : item.detailsEn}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-mono">{item.expiryDate}</span>
                        <span>•</span>
                        <span className="text-blue-600 font-medium hover:underline">
                          {lang === 'ar' ? 'عرض السجل وتحديثه ←' : 'View record →'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
