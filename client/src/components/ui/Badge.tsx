import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface BadgeProps {
  status: string;
  variant?: 'default' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const { t } = useLanguage();

  const getColors = (s: string) => {
    switch (s.toUpperCase()) {
      case 'AVAILABLE':
      case 'ACTIVE':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ASSIGNED':
      case 'IN_PROGRESS':
      case 'ON_DUTY':
      case 'ON_TRIP':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SCHEDULED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'UNDER_MAINTENANCE':
      case 'EXPIRING_SOON':
      case 'DELAYED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED':
      case 'OUT_OF_SERVICE':
      case 'EXPIRED':
      case 'SUSPENDED':
      case 'INACTIVE':
      case 'TERMINATED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const translated = t(status as any) || status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColors(
        status
      )} capitalize`}
    >
      <span className="w-1.5 h-1.5 rounded-full rtl:ml-1.5 ltr:mr-1.5 bg-current opacity-75 shrink-0" />
      {translated}
    </span>
  );
};