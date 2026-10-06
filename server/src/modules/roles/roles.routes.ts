import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "../../types/index.js";
import {
  allPermissions,
  permissionCatalog,
  accessFor,
  ensureDefaultRoles,
  hasPermission,
} from "./permissions.js";

export const dependencies: Record<string, string[]> = {
  "trips.create": [
    "trips.view",
    "routes.view",
    "clients.view",
    "vehicles.view",
    "drivers.view",
    "configuration.view",
  ],
  "trips.edit": [
    "trips.view",
    "routes.view",
    "vehicles.view",
    "drivers.view",
    "configuration.view",
  ],
  "routes.create": [
    "routes.view",
    "clients.view",
    "drivers.view",
    "vehicles.view",
    "partners.view",
    "configuration.view",
  ],
  "routes.edit": [
    "routes.view",
    "clients.view",
    "drivers.view",
    "vehicles.view",
    "partners.view",
    "configuration.view",
  ],
  "vehicles.create": ["vehicles.view", "partners.view", "configuration.view"],
  "vehicles.edit": ["vehicles.view", "partners.view", "configuration.view"],
  "vehicles.editType": ["vehicles.view", "configuration.view"],
  "drivers.create": ["drivers.view", "vehicles.view", "partners.view"],
  "drivers.edit": ["drivers.view", "vehicles.view", "partners.view"],
  "contracts.manage": ["contracts.view", "clients.view", "finance.view"],
  "maintenance.manage": ["maintenance.view", "vehicles.view", "finance.view"],
  "plans.manage": [
    "plans.view",
    "routes.view",
    "vehicles.view",
    "drivers.view",
    "contracts.view",
    "partners.view",
    "finance.view",
  ],
  "passengers.manage": [
    "passengers.view",
    "clients.view",
    "sites.view",
    "partners.view",
  ],
  "sites.manage": ["sites.view", "clients.view"],
  "enrollments.manage": ["enrollments.view", "passengers.view", "routes.view"],
  "configuration.manage": ["configuration.view"],
  "pricing.manage": ["routes.view", "finance.view", "configuration.view"],
  "accounting.view": [
    "finance.view",
    "clients.view",
    "drivers.view",
    "vehicles.view",
    "routes.view",
    "partners.view",
  ],
  "accounting.manage": ["accounting.view"],
  "reports.view": ["finance.view"],
  "users.manage": ["users.view", "clients.view"],
  "roles.manage": ["users.view"],
  "audit.view": ["finance.view"],
};
for (const p of allPermissions)
  if (
    !p.endsWith(".view") &&
    !dependencies[p] &&
    allPermissions.includes(p.split(".")[0] + ".view")
  )
    dependencies[p] = [p.split(".")[0] + ".view"];
export function validatePermissions(input: string[]) {
  const permissions = [...new Set(input)].sort();
  for (const p of permissions) {
    if (!allPermissions.includes(p))
      throw new ValidationError("صلاحية غير معروفة: " + p);
    for (const dep of dependencies[p] || [])
      if (!permissions.includes(dep))
        throw new ValidationError(`الصلاحية ${p} تحتاج ${dep}.`);
  }
  return permissions;
}
export function assertCanGrant(actor: any, permissions: string[]) {
  if (permissions.some((p) => !hasPermission(actor, p)))
    throw new ForbiddenError("لا يمكنك منح أو تعديل صلاحيات تتجاوز صلاحياتك.");
}
export async function preserveRoleAdministrators(tx: any) {
  const users = await tx.user.findMany({
    where: {
      status: "ACTIVE",
      companyScopeEnabled: false,
      role: { in: ["ADMIN", "ACCOUNTANT", "OPERATIONS_MANAGER", "VIEWER"] },
    },
  });
  for (const user of users) {
    const a = await accessFor(user, tx);
    if (
      a.permissions.includes("roles.manage") &&
      a.permissions.includes("users.manage")
    )
      return;
  }
  throw new ConflictError(
    "يجب الإبقاء على حساب نشط واحد على الأقل يستطيع إدارة الأدوار والمستخدمين.",
  );
}
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(""),
  permissions: z.array(z.string()).max(100),
  revision: z.number().int().positive().optional(),
});
const wrap = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res)).catch(next);
const router = Router();
router.get(
  "/options",
  wrap(async (req: any, res: any) => {
    await ensureDefaultRoles();
    const roles = await prisma.appRole.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json({
      success: true,
      data: roles
        .filter((r) => r.permissions.every((p) => hasPermission(req.user, p)))
        .map(({ id, code, name }) => ({ id, code, name })),
    });
  }),
);
router.get(
  "/",
  wrap(async (_req: any, res: any) => {
    await ensureDefaultRoles();
    const rows = await prisma.appRole.findMany({
      orderBy: { createdAt: "asc" },
    });
    const users = await prisma.user.findMany({
      select: { role: true, roleId: true },
    });
    res.json({
      success: true,
      data: {
        roles: rows.map((r) => ({
          ...r,
          userCount: users.filter(
            (u) => u.roleId === r.id || (!u.roleId && u.role === r.code),
          ).length,
        })),
        catalog: permissionCatalog,
        dependencies,
      },
    });
  }),
);
router.post(
  "/",
  wrap(async (req: any, res: any) => {
    await ensureDefaultRoles();
    const d = schema.parse(req.body),
      permissions = validatePermissions(d.permissions);
    assertCanGrant(req.user, permissions);
    const role = await prisma.appRole.create({
      data: { name: d.name, description: d.description, permissions },
    });
    res.status(201).json({ success: true, data: role });
  }),
);
router.put(
  "/:id",
  wrap(async (req: any, res: any) => {
    const d = schema
        .extend({ revision: z.number().int().positive() })
        .parse(req.body),
      permissions = validatePermissions(d.permissions);
    assertCanGrant(req.user, permissions);
    const role = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632902)`;
        const old = await tx.appRole.findUniqueOrThrow({
          where: { id: req.params.id },
        });
        assertCanGrant(req.user, old.permissions);
        if (old.revision !== d.revision)
          throw new ConflictError(
            "تم تعديل الدور بواسطة مستخدم آخر. حدّث الصفحة ثم راجع الصلاحيات.",
          );
        const result = await tx.appRole.update({
          where: { id: old.id },
          data: {
            name: d.name,
            description: d.description,
            permissions,
            revision: { increment: 1 },
          },
        });
        await preserveRoleAdministrators(tx);
        return result;
      },
      { timeout: 20000 },
    );
    res.json({ success: true, data: role });
  }),
);
export default router;
