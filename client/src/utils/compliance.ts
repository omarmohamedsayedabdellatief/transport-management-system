export type ComplianceStatus = 'EXPIRED' | 'EXPIRING_SOON' | 'VALID';

export interface ComplianceInfo {
  status: ComplianceStatus;
  diffDays: number;
  labelAr: string;
  labelEn: string;
  badgeClass: string;
  textClass: string;
  formattedDate: string;
}

/**
 * Normalizes any date string or Date object to a clean YYYY-MM-DD representation
 * without timezone drift.
 */
export function formatLocalDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  if (typeof date === 'string') {
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    return date;
  }
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Evaluates the statutory compliance of a document expiry date against current day.
 */
export function getComplianceStatus(date: string | Date | null | undefined): ComplianceInfo {
  if (!date) {
    return {
      status: 'EXPIRED',
      diffDays: -999,
      labelAr: 'غير مسجل',
      labelEn: 'Unspecified',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      textClass: 'text-slate-500',
      formattedDate: '--',
    };
  }

  const dateStr = formatLocalDate(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      status: 'EXPIRED',
      diffDays,
      labelAr: `منتهية (منذ ${absDays} ${absDays === 1 ? 'يوم' : absDays <= 10 ? 'أيام' : 'يوماً'})`,
      labelEn: `Expired (${absDays}d ago)`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      textClass: 'text-rose-600 font-semibold',
      formattedDate: dateStr,
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'EXPIRING_SOON',
      diffDays,
      labelAr: diffDays === 0 ? 'تنتهي اليوم' : `تنتهي خلال ${diffDays} يوم`,
      labelEn: diffDays === 0 ? 'Expires today' : `Expires in ${diffDays}d`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      textClass: 'text-amber-600 font-semibold',
      formattedDate: dateStr,
    };
  }

  return {
    status: 'VALID',
    diffDays,
    labelAr: 'سارية',
    labelEn: 'Valid',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textClass: 'text-slate-600',
    formattedDate: dateStr,
  };
}
