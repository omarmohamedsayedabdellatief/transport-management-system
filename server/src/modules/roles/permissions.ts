import { prisma } from "../../prisma.js";

const groups = [
  ["dashboard", "لوحة التحكم", ["view"]],
  ["trips", "الرحلات والتشغيل", ["view", "create", "edit", "delete"]],
  ["vehicles", "السيارات", ["view", "create", "edit", "editType", "delete"]],
  ["clients", "الشركات", ["view", "create", "edit", "delete"]],
  ["routes", "الخطوط", ["view", "create", "edit", "delete"]],
  ["drivers", "السائقون", ["view", "create", "edit", "delete"]],
  ["contracts", "العقود", ["view", "manage"]],
  ["maintenance", "الصيانة", ["view", "manage"]],
  ["partners", "الموردون", ["view", "manage"]],
  ["passengers", "الركاب", ["view", "manage"]],
  ["sites", "المواقع", ["view", "manage"]],
  ["enrollments", "تسجيل الركاب", ["view", "manage"]],
  ["plans", "قوالب التشغيل", ["view", "manage"]],
  ["configuration", "إعدادات وأنواع التشغيل", ["view", "manage"]],
  ["finance", "الأسعار والبيانات المالية", ["view"]],
  ["pricing", "تعديل أسعار الخطوط والرحلات", ["manage"]],
  ["accounting", "الحسابات (أرصدة الخزينة للمالك فقط)", ["view", "manage"]],
  ["reports", "التقارير المالية", ["view"]],
  ["users", "المستخدمون وتعيين الأدوار", ["view", "manage"]],
  ["roles", "الأدوار والصلاحيات", ["manage"]],
  ["audit", "سجل النشاط", ["view"]],
] as const;
const verbs: Record<string, string> = {
  view: "عرض",
  create: "إضافة",
  edit: "تعديل",
  delete: "حذف",
  manage: "إدارة",
  editType: "تعديل نوع السيارة فقط",
};
export const permissionCatalog = groups.flatMap(([group, label, actions]) =>
  actions.map((action) => ({
    key: `${group}.${action}`,
    group,
    label,
    action,
    title: verbs[action],
  })),
);
export const allPermissions = permissionCatalog.map((p) => p.key);
const readDefaults = [
  "dashboard",
  "trips",
  "vehicles",
  "clients",
  "routes",
  "drivers",
  "maintenance",
  "partners",
  "passengers",
  "sites",
  "enrollments",
  "plans",
  "configuration",
].map((p) => p + ".view");
export const defaults: Record<string, string[]> = {
  ADMIN: allPermissions,
  ACCOUNTANT: allPermissions,
  OPERATIONS_MANAGER: [
    ...readDefaults,
    "vehicles.editType",
    "trips.create",
    "trips.edit",
  ],
  VIEWER: [...readDefaults, "vehicles.edit"],
};
export const defaultNames: Record<string, string> = {
  ADMIN: "المالك",
  ACCOUNTANT: "المحاسب",
  OPERATIONS_MANAGER: "مدير التشغيلات",
  VIEWER: "مستخدم عادي",
};
export const isInternal = (user: any) =>
  !!user && (user.roleId || Object.hasOwn(defaults, user.role));
export const hasPermission = (user: any, key: string) =>
  !!user?.permissions?.includes(key);
export async function accessFor(user: any, db: any = prisma) {
  const role = user.roleId
    ? await db.appRole.findUnique({ where: { id: user.roleId } })
    : await db.appRole.findUnique({ where: { code: user.role } });
  return {
    companyScopeEnabled: !!user.companyScopeEnabled,
    roleId: role?.id || null,
    roleName: role?.name || defaultNames[user.role] || user.role,
    permissions: role
      ? role.permissions.filter((p: string) => allPermissions.includes(p))
      : defaults[user.role] || [],
  };
}
export async function ensureDefaultRoles() {
  for (const code of Object.keys(defaults))
    await prisma.appRole.upsert({
      where: { code },
      update: {},
      create: {
        id: code,
        code,
        name: defaultNames[code],
        permissions: defaults[code],
      },
    });
}
export function requiredPermission(path: string, method: string): string[] {
  path = path.toLowerCase().replace(/\/+$/, "") || "/";
  const read = ["GET", "HEAD", "OPTIONS"].includes(method);
  const action = read
    ? "view"
    : method === "POST"
      ? "create"
      : method === "DELETE"
        ? "delete"
        : "edit";
  if (path === "/roles/options")
    return ["users.view", "users.manage", "roles.manage"];
  if (path.startsWith("/roles")) return ["roles.manage"];
  if (path.startsWith("/users") || path === "/operations/users/scope")
    return [read ? "users.view" : "users.manage"];
  if (path.startsWith("/configuration"))
    return [read ? "configuration.view" : "configuration.manage"];
  if (
    path.startsWith("/accounting") ||
    /^\/operations\/(billing|documents|treasury|records\/(expenses|payroll|installments))($|\/)/.test(
      path,
    )
  )
    return [read ? "accounting.view" : "accounting.manage"];
  if (path.startsWith("/operations/audit")) return ["audit.view"];
  if (path.startsWith("/operations/analytics")) return ["reports.view"];
  if (path.startsWith("/dashboard") || path === "/operations/summary")
    return ["dashboard.view"];
  if (path === "/operations/bootstrap")
    return [
      "trips.view",
      "plans.view",
      "passengers.view",
      "enrollments.view",
      "configuration.view",
    ];
  if (/^\/routes\/[^/]+\/rates$/.test(path))
    return [read ? "routes.view" : "pricing.manage"];
  if (/^\/drivers\/[^/]+\/documents$/.test(path) && !read)
    return ["drivers.edit"];
  if (path.startsWith("/trips/excel/")) return [read ? "trips.view" : "trips.create"];
  if (path === "/trips/check-conflict") return ["trips.create", "trips.edit"];
  if (
    /^\/trips\/(batch-generate|generate-daily-from-templates)$/.test(path) ||
    /^\/operations\/plans\/[^/]+\/generate$/.test(path)
  )
    return ["trips.create"];
  if (/^\/operations\/trips\/[^/]+\//.test(path))
    return [read ? "trips.view" : "trips.edit"];
  if (path === "/operations/contracts/payer") return ["contracts.manage"];
  if (path === "/operations/resources/supplier")
    return ["vehicles.edit", "drivers.edit"];
  let resource = path.split("/")[1];
  if (resource === "operations")
    resource =
      path.split("/")[2] === "records"
        ? path.split("/")[3]
        : path.split("/")[2];
  if (
    ["trips", "vehicles", "clients", "routes", "drivers"].includes(resource)
  ) {
    if (resource === "vehicles" && action === "edit")
      return ["vehicles.edit", "vehicles.editType"];
    return [`${resource}.${action}`];
  }
  if (
    [
      "contracts",
      "maintenance",
      "partners",
      "passengers",
      "sites",
      "enrollments",
      "plans",
    ].includes(resource)
  )
    return [`${resource}.${read ? "view" : "manage"}`];
  return []; // Unknown endpoints never inherit an allow-all role bypass.
}

// Treasury balances are reserved for the built-in owner, independently of editable permissions.
export const isTreasuryOwner = (user: any) =>
  user?.role === "ADMIN" && !user.companyScopeEnabled;
