// Shared destinations for the header's page finder and current-page label.
export const destinations = [
  ["/", "Overview & Dashboard", "لوحة التحكم الرئيسية"],
  ["/trips", "Daily Trips & Dispatch", "تشغيل ورحلات اليوم"],
  ["/clients", "Clients & Companies", "الشركات والعملاء"],
  ["/contracts", "Contracts", "العقود والاتفاقيات"],
  ["/routes", "Route Templates", "قوالب وخطوط السير"],
  ["/vehicles", "Fleet & Vehicles", "الأسطول والمركبات"],
  ["/drivers", "Drivers", "السائقون"],
  ["/partners", "Partners & Suppliers", "الشركاء والموردون"],
  ["/maintenance", "Maintenance", "الصيانة"],
  ["/accounting", "Accounts & Treasury", "الحسابات والخزينة العامة"],
  ["/reports", "Reports & Analytics", "التقارير والتحليلات"],
  ["/settings", "Workspace Settings", "إعدادات التشغيل"],
  ["/users", "Users & Permissions", "المستخدمون والصلاحيات"],
  ["/audit", "Activity Log", "سجل النشاط والعمليات"],
  ["/guide", "Help & User Guide", "دليل الاستخدام والمساعدة"],
] as const;
export const allowedDestinations = (role?: string) => destinations.filter(([path]) => {
  if (["DRIVER", "CLIENT", "SUPPLIER"].includes(role || ""))
    return ["/", "/trips", "/guide"].includes(path);
  return role === "ADMIN" || !["/users", "/audit"].includes(path);
});
