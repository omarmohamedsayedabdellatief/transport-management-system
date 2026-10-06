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
  ["/roles", "Roles & Permissions", "الأدوار والصلاحيات"],
  ["/users", "Users & Permissions", "المستخدمون والصلاحيات"],
  ["/audit", "Activity Log", "سجل النشاط والعمليات"],
  ["/guide", "Help & User Guide", "دليل الاستخدام والمساعدة"],
] as const;
export const canVisit = (
  path: string,
  user?: {
    role?: string;
    permissions?: string[];
    companyScopeEnabled?: boolean;
  } | null,
) => {
  if (path === "/guide") return true;
  if (["DRIVER", "CLIENT", "SUPPLIER"].includes(user?.role || ""))
    return [
      "/",
      "/trips",
      "/guide",
      ...(user?.role === "DRIVER" ? [] : ["/billing"]),
    ].includes(path);
  if (
    user?.companyScopeEnabled &&
    ["/accounting", "/reports", "/users", "/roles", "/audit"].includes(path)
  )
    return false;
  const resource =
    (
      {
        "/": "dashboard",
        "/settings": "configuration",
        "/schedules": "plans",
      } as Record<string, string>
    )[path] || path.split("/")[1];
  return !!user?.permissions?.includes(
    resource + (resource === "roles" ? ".manage" : ".view"),
  );
};
export const allowedDestinations = (
  user?: {
    role?: string;
    permissions?: string[];
    companyScopeEnabled?: boolean;
  } | null,
) => destinations.filter(([path]) => canVisit(path, user));
