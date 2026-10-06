import { UserService } from '../users/user.service.js';
import { assertCanGrant, preserveRoleAdministrators } from '../roles/roles.routes.js';
import { accessFor, ensureDefaultRoles, hasPermission, isTreasuryOwner } from '../roles/permissions.js';
import { listActivity } from './activity-log.js';
import treasuryRouter, { postDocumentPayment } from "./treasury.js";
import { analytics } from "./analytics.js";
import * as XLSX from "xlsx";
import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../../prisma.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  AuthenticatedRequest,
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../types/index.js";
import { dateOnly, zonedDeparture, transitions } from "./operations.logic.js";
import { AccountingService } from "../accounting/accounting.service.js";

const router = Router();
router.use(authenticate);
router.use("/treasury", (_req, res) => {
  res.status(503).json({
    success: false,
    error: {
      code: "TREASURY_MODULE_PAUSED",
      message: "قسم الخزينة والحسابات متوقف مؤقتاً لإعادة الهيكلة والتطوير الشامل من البداية.",
    },
  });
});
const internal = ["ADMIN", "OPERATIONS_MANAGER", "ACCOUNTANT", "VIEWER"];
const managers = ["ADMIN", "OPERATIONS_MANAGER"];
const finance = ["ADMIN", "ACCOUNTANT"];
const id = z.string().uuid();
const optionalId = z
  .union([id, z.literal(""), z.null()])
  .optional()
  .transform((v) => v || null);
const text = z.string().trim().min(1).max(250);
const optionalText = z.string().trim().max(2000).optional().default("");
const day = z.string().transform(dateOnly);
const amount = z.coerce
  .number()
  .finite()
  .min(0)
  .max(99999999)
  .refine(
    (v) => Math.abs(Math.round(v * 100) - v * 100) < 0.00001,
    "Use at most two decimal places.",
  );
const shift = z.enum(["MORNING", "AFTERNOON", "NIGHT", "CUSTOM"]);
const direction = z.enum(["OUTBOUND", "RETURN"]);
const schemas: Record<string, z.ZodTypeAny> = {
  partners: z.object({
    name: text,
    kind: z.enum(["TRANSPORT", "STAFFING", "BOTH"]),
    contactName: optionalText,
    phone: optionalText,
    email: z.union([z.string().email(), z.literal("")]).optional(),
    notes: optionalText,
    active: z.boolean().default(true),
  }),
  sites: z.object({
    name: text,
    clientId: id,
    address: optionalText,
    active: z.boolean().default(true),
  }),
  passengers: z.object({
    employeeCode: text,
    fullName: text,
    phone: optionalText,
    clientId: id,
    employerId: optionalId,
    siteId: optionalId,
    active: z.boolean().default(true),
    notes: optionalText,
  }),
  enrollments: z.object({
    passengerId: id,
    routeId: id,
    stopName: text,
    direction: z.enum(["OUTBOUND", "RETURN", "BOTH"]),
    shift,
    startDate: day,
    endDate: z
      .union([day, z.literal(""), z.null()])
      .optional()
      .transform((v) => v || null),
    active: z.boolean().default(true),
  }),
  plans: z.object({
    name: text,
    routeId: id,
    contractId: id,
    driverId: id,
    vehicleId: id,
    supplierId: optionalId,
    direction,
    shift,
    departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: z.coerce.number().int().min(1).max(1440),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1),
    excludedDates: z
      .array(
        z.string().refine((v) => {
          try {
            dateOnly(v);
            return true;
          } catch {
            return false;
          }
        }),
      )
      .default([]),
    timezone: text.default("Africa/Cairo"),
    startDate: day,
    endDate: day,
    saleRate: amount,
    supplierRate: amount,
    active: z.boolean().default(true),
  }),
};
schemas.expenses = z
  .object({
    date: day,
    category: text,
    amount,
    branch: optionalText,
    vehicleNumber: optionalText,
    notes: optionalText,
  })
  .transform((d) => ({
    ...d,
    day: d.date.getUTCDate(),
    month: d.date.getUTCMonth() + 1,
    year: d.date.getUTCFullYear(),
  }));
schemas.payroll = z
  .object({
    date: day,
    employeeName: text,
    jobTitle: text,
    basicSalary: amount,
    overtime: amount.default(0),
    deductions: amount.default(0),
    advances: amount.default(0),
    penalties: amount.default(0),
    notes: optionalText,
  })
  .transform((d) => ({
    ...d,
    netSalary: new Prisma.Decimal(d.basicSalary)
      .plus(d.overtime)
      .minus(d.deductions)
      .minus(d.advances)
      .minus(d.penalties),
  }))
  .refine(
    (d) => d.netSalary.gte(0),
    "Deductions and advances cannot exceed earnings.",
  );
schemas.installments = z.object({
  category: z.enum(["VEHICLE", "PROPERTY_OFFICE"]),
  assetName: text,
  installmentNumber: z.coerce.number().int().min(1),
  bankDueDate: day,
  bankAmount: amount,
  bankName: optionalText,
  chequeNumber: optionalText,
  status: z.enum(["PENDING", "PAID"]),
  notes: optionalText,
});
const financialResources = ["expenses", "payroll", "installments"];
const models: Record<string, string> = {
  expenses: "expense",
  payroll: "staffPayroll",
  installments: "installment",
  partners: "partner",
  sites: "site",
  passengers: "passenger",
  enrollments: "enrollment",
  plans: "servicePlan",
};
const include: Record<string, any> = {
  partners: {
    _count: { select: { vehicles: true, drivers: true, passengers: true } },
  },
  sites: { client: true },
  passengers: {
    client: true,
    employer: true,
    site: true,
    enrollments: { include: { route: true } },
  },
  enrollments: { passenger: true, route: true },
  plans: {
    route: true,
    contract: true,
    vehicle: true,
    driver: true,
    supplier: true,
  },
};
function permit(req: AuthenticatedRequest, roles: string[]) {
  if (req.permissionAuthorized) return;
  if (!req.user || !finance.includes(req.user.role) && !roles.includes(req.user.role)) throw new ForbiddenError();
}
const wrap =
  (fn: (req: any, res: any) => Promise<any>) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res)).catch(next);
const ok = (res: any, data: any) => res.json({ success: true, data });
const audit = (
  tx: any,
  req: AuthenticatedRequest,
  action: string,
  entity: string,
  entityId: string,
  detail: any,
) =>
  tx.auditEvent.create({
    data: {
      actorId: req.user!.userId,
      action,
      entity,
      entityId,
      detail: JSON.stringify(detail),
    },
  });
async function transaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
      return fn(tx);
    },
    { timeout: 20000 },
  );
}
async function tripScope(req: AuthenticatedRequest, trip: any) {
  if (!trip) throw new NotFoundError("Trip not found.");
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.userId },
  });
  if (internal.includes(u.role)) return;
  if (u.role === "DRIVER" && u.driverScopeId === trip.driverId) return;
  if (u.role === "CLIENT" && u.clientScopeId === trip.clientId) return;
  if (u.role === "SUPPLIER" && u.partnerScopeId === trip.supplierId) return;
  throw new ForbiddenError();
}
async function documentScope(req: AuthenticatedRequest, doc: any) {
  if (!doc) throw new NotFoundError();
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.userId },
  });
  if (internal.includes(u.role)) return;
  if (
    u.role === "CLIENT" &&
    u.clientScopeId === doc.clientId &&
    doc.status !== "DRAFT"
  )
    return;
  if (
    u.role === "SUPPLIER" &&
    u.partnerScopeId === doc.partnerId &&
    doc.status !== "DRAFT"
  )
    return;
  throw new ForbiddenError();
}

router.get(
  "/bootstrap",
  wrap(async (req, res) => {
    permit(req, internal);
    const [
      clients,
      contracts,
      vehicles,
      drivers,
      routes,
      partners,
      sites,
      passengers,
    ] = await Promise.all([
      prisma.client.findMany({ orderBy: { companyName: "asc" } }),
      prisma.contract.findMany({ orderBy: { contractNumber: "asc" } }),
      prisma.vehicle.findMany({
        include: { supplier: true },
        orderBy: { plateNumber: "asc" },
      }),
      prisma.driver.findMany({
        include: { supplier: true },
        orderBy: { fullName: "asc" },
      }),
      prisma.route.findMany({
        include: { stops: true },
        orderBy: { routeName: "asc" },
      }),
      prisma.partner.findMany({ orderBy: { name: "asc" } }),
      prisma.site.findMany({ orderBy: { name: "asc" } }),
      prisma.passenger.findMany({ orderBy: { fullName: "asc" } }),
    ]);
    const available = {clients, contracts, vehicles, drivers, routes, partners, sites, passengers};
    ok(res, Object.fromEntries(Object.entries(available).map(([resource,rows])=>[resource,hasPermission(req.user,resource+'.view')?rows:[]])));
  }),
);
router.get("/analytics", wrap(async (req, res) => {
  permit(req, internal);
  const days = z.coerce.number().refine(n => [7,30,90].includes(n), "Choose 7, 30 or 90 days.").parse(req.query.days || 30);
  ok(res, await analytics(days));
}));
router.get(
  "/summary",
  wrap(async (req, res) => {
    permit(req, internal);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const [passengers, suppliers, plans, trips, documents, issues] =
      await Promise.all([
        prisma.passenger.count({ where: { active: true } }),
        prisma.partner.count({
          where: { active: true, kind: { in: ["TRANSPORT", "BOTH"] } },
        }),
        prisma.servicePlan.count({ where: { active: true } }),
        prisma.trip.findMany({
          where: { tripDate: dateOnly(today) },
          orderBy: { scheduledDeparture: "asc" },
          include: {
            vehicle: true,
            driver: true,
            route: true,
            _count: { select: { manifest: true } },
          },
        }),
        prisma.financeDocument.findMany({
          where: { status: { in: ["ISSUED", "PAID"] } },
          include: { payments: true },
        }),
        prisma.vehicle.count({
          where: {
            OR: [
              { licenseExpiry: { lt: new Date() } },
              { insuranceExpiry: { lt: new Date() } },
              { inspectionExpiry: { lt: new Date() } },
              { status: "UNDER_MAINTENANCE" },
            ],
          },
        }),
      ]);
    const outstanding = (kind: string) =>
      documents
        .filter((d) => d.kind === kind)
        .reduce(
          (sum, d) =>
            sum +
            Number(d.total) -
            d.payments.reduce((s, p) => s + Number(p.amount), 0),
          0,
        );
    ok(res, {
      passengers,
      suppliers,
      plans,
      trips,
      issues,
      receivable: outstanding("INVOICE"),
      payable: outstanding("SETTLEMENT"),
    });
  }),
);
router.get(
  "/audit",
  wrap(async (req, res) => {
    permit(req, ["ADMIN"]);
    ok(res, await listActivity(req.query, res.locals.activityId, isTreasuryOwner(req.user)));
  }),
);

async function validateResource(
  tx: any,
  resource: string,
  data: any,
  recordId?: string,
) {
  if (data.endDate && data.startDate && data.endDate < data.startDate)
    throw new ValidationError("End date must be on or after start date.");
  if (resource === "sites") {
    if (!(await tx.client.findUnique({ where: { id: data.clientId } })))
      throw new ValidationError("Select a valid client.");
    if (recordId) {
      const old = await tx.site.findUniqueOrThrow({ where: { id: recordId } });
      if (old.clientId !== data.clientId && await tx.passenger.count({ where: { siteId: recordId } }))
        throw new ConflictError("This site has passengers. Create a new site for another client.");
    }
  }
  if (resource === "passengers") {
    const client = await tx.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new ValidationError("Select a valid client.");
    if (data.siteId) {
      const site = await tx.site.findUnique({ where: { id: data.siteId } });
      if (!site || !site.active || site.clientId !== data.clientId)
        throw new ValidationError(
          "The site must belong to the passenger’s client.",
        );
    }
    if (data.employerId) {
      const p = await tx.partner.findUnique({ where: { id: data.employerId } });
      if (!p || !p.active || !["STAFFING", "BOTH"].includes(p.kind))
        throw new ValidationError("Choose an active staffing employer.");
    }
    if (recordId) {
      const old = await tx.passenger.findUnique({ where: { id: recordId } });
      if (
        old.clientId !== data.clientId &&
        (await tx.enrollment.count({ where: { passengerId: recordId } }))
      )
        throw new ValidationError(
          "Archive the old passenger and create a new client enrollment to preserve history.",
        );
    }
  }
  if (resource === "enrollments") {
    const p = await tx.passenger.findUnique({
        where: { id: data.passengerId },
      }),
      r = await tx.route.findUnique({
        where: { id: data.routeId },
        include: { stops: true },
      });
    if (!p || !r || !p.active || p.clientId !== r.clientId)
      throw new ValidationError(
        "Passenger and route must belong to the same client and the passenger must be active.",
      );
    if (
      !r.stops.some((s: any) => s.stopName === data.stopName) &&
      data.stopName !== r.startLocation &&
      data.stopName !== r.finalDestination
    )
      throw new ValidationError("Choose a stop defined on this route.");
    const overlaps = await tx.enrollment.findFirst({
      where: {
        id: recordId ? { not: recordId } : undefined,
        passengerId: data.passengerId,
        active: true,
        shift: data.shift,
        direction:
          data.direction === "BOTH"
            ? undefined
            : { in: [data.direction, "BOTH"] },
        startDate: { lte: data.endDate || new Date("2100-01-01") },
        OR: [{ endDate: null }, { endDate: { gte: data.startDate } }],
      },
    });
    if (data.active && overlaps)
      throw new ConflictError(
        "An overlapping enrollment already exists for this passenger, shift, and direction.",
      );
  }
  if (resource === "plans") {
    const r = await tx.route.findUnique({ where: { id: data.routeId } }),
      c = await tx.contract.findUnique({ where: { id: data.contractId } });
    if (!r || !c || r.clientId !== c.clientId || c.status !== "ACTIVE")
      throw new ValidationError(
        "Choose an active contract belonging to the route’s client.",
      );
    if (!["MONTHLY_FIXED", "PER_TRIP"].includes(c.pricingModel))
      throw new ValidationError(
        "Automated billing supports monthly fixed or per-trip contracts. Configure the contract before scheduling.",
      );
    if (data.startDate < c.startDate || data.endDate > c.endDate)
      throw new ValidationError(
        "Schedule dates must fall within the contract.",
      );
    zonedDeparture(
      data.startDate.toISOString().slice(0, 10),
      data.departureTime,
      data.timezone,
    );
    if (data.supplierId) {
      const p = await tx.partner.findUnique({ where: { id: data.supplierId } });
      if (!p || !p.active || !["TRANSPORT", "BOTH"].includes(p.kind))
        throw new ValidationError("Choose an active transport supplier.");
    }
    if (!data.supplierId && data.supplierRate > 0)
      throw new ValidationError(
        "Select the supplier receiving the agreed cost.",
      );
    const v = await tx.vehicle.findUnique({ where: { id: data.vehicleId } }),
      d = await tx.driver.findUnique({ where: { id: data.driverId } });
    if (!v || !d) throw new ValidationError("Select a vehicle and driver.");
    if (
      (v.supplierId && v.supplierId !== data.supplierId) ||
      (d.supplierId && d.supplierId !== data.supplierId)
    )
      throw new ValidationError(
        "Assigned resources must match the selected supplier.",
      );
  }
}
router.get(
  "/records/:resource",
  wrap(async (req, res) => {
    permit(req, internal);
    const r = req.params.resource;
    if (!models[r]) throw new NotFoundError();
    ok(
      res,
      await (prisma as any)[models[r]].findMany({
        include: include[r],
        orderBy: { id: "desc" },
      }),
    );
  }),
);
router.post(
  "/records/:resource",
  wrap(async (req, res) => {
    const r = req.params.resource;
    permit(req, financialResources.includes(r) ? finance : managers);
    if (!schemas[r]) throw new NotFoundError();
    if (r === "installments") throw new ConflictError("استخدم صفحة أقساط السيارات في الحسابات لتسجيل الاستحقاقات والتحصيل والسداد.");
    const data = schemas[r].parse(req.body);
    ok(
      res,
      await transaction(async (tx) => {
        await validateResource(tx, r, data);
        if (r === "installments" && data.status === "PAID") throw new ValidationError("Record the installment payment through treasury.");
        const row = await (tx as any)[models[r]].create({ data });
        await audit(tx, req, "CREATE", r, row.id, data);
        return row;
      }),
    );
  }),
);
router.put(
  "/records/:resource/:id",
  wrap(async (req, res) => {
    const r = req.params.resource;
    permit(req, financialResources.includes(r) ? finance : managers);
    if (!schemas[r]) throw new NotFoundError();
    if (r === "installments") throw new ConflictError("استخدم صفحة أقساط السيارات في الحسابات لتسجيل الاستحقاقات والتحصيل والسداد.");
    const data = schemas[r].parse(req.body);
    ok(
      res,
      await transaction(async (tx) => {
        await validateResource(tx, r, data, req.params.id);
        if (financialResources.includes(r) && await tx.treasuryEntry.findUnique({ where: { sourceKey: r + ":" + req.params.id } })) throw new ConflictError("This record has a treasury payment and cannot be edited. Record a reviewed adjustment instead.");
        const before = await (tx as any)[models[r]].findUniqueOrThrow({
          where: { id: req.params.id },
        });
        if (r === "installments" && (before.status === "PAID" || data.status === "PAID")) throw new ConflictError("Paid installments are protected. Record a pending installment payment through treasury.");
        const row = await (tx as any)[models[r]].update({
          where: { id: req.params.id },
          data,
        });
        await audit(tx, req, "UPDATE", r, row.id, { before, after: data });
        return row;
      }),
    );
  }),
);
router.post(
  "/passengers/import",
  wrap(async (req, res) => {
    permit(req, managers);
    const input = z
      .object({
        clientId: id,
        employerId: optionalId,
        csv: z.string().min(1).max(1000000),
        preview: z.boolean().default(true),
      })
      .parse(req.body);
    const wb = XLSX.read(input.csv, { type: "string", raw: true });
    const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
      defval: "",
    });
    if (!rows.length || rows.length > 2000)
      throw new ValidationError(
        "Import between 1 and 2000 passengers at a time.",
      );
    ok(
      res,
      await transaction(async (tx) => {
        const errors: string[] = [],
          valid: any[] = [];
        let skippedCount = 0;
        const seen = new Set<string>();
        for (const [index, row] of rows.entries()) {
          try {
            const data = schemas.passengers.parse({
              employeeCode: String(row.employeeCode || "").trim(),
              fullName: String(row.fullName || "").trim(),
              phone: String(row.phone || ""),
              clientId: input.clientId,
              employerId: input.employerId,
              active: true,
            });
            await validateResource(tx, "passengers", data);
            if (
              seen.has(data.employeeCode) ||
              (await tx.passenger.findUnique({
                where: {
                  clientId_employeeCode: {
                    clientId: data.clientId,
                    employeeCode: data.employeeCode,
                  },
                },
              }))
            ) {
              skippedCount++;
              continue;
            }
            seen.add(data.employeeCode);
            valid.push(data);
          } catch (e: any) {
            errors.push(
              `Row ${index + 2}: ${e instanceof z.ZodError ? e.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ") : e.message}`,
            );
          }
        }
        if (!input.preview && errors.length)
          throw new ValidationError(
            "Fix all import errors before saving.",
            errors,
          );
        if (!input.preview) {
          await tx.passenger.createMany({ data: valid });
          await audit(tx, req, "IMPORT", "passengers", input.clientId, {
            count: valid.length,
            skippedCount,
          });
        }
        return {
          validCount: valid.length,
          skippedCount,
          importedCount: input.preview ? 0 : valid.length,
          errors,
        };
      }),
    );
  }),
);

router.post(
  "/resources/supplier",
  wrap(async (req, res) => {
    permit(req, managers);
    const data = z
      .object({
        resource: z.enum(["driver", "vehicle"]),
        id,
        supplierId: optionalId,
      })
      .parse(req.body);
    ok(
      res,
      await transaction(async (tx) => {
        if (data.supplierId) {
          const p = await tx.partner.findUnique({
            where: { id: data.supplierId },
          });
          if (!p?.active || !["TRANSPORT", "BOTH"].includes(p.kind))
            throw new ValidationError("Select an active transport supplier.");
        }
        const row = await (tx as any)[data.resource].update({
          where: { id: data.id },
          data: { supplierId: data.supplierId },
        });
        await audit(
          tx,
          req,
          "SUPPLIER_ASSIGNMENT",
          data.resource,
          row.id,
          data,
        );
        return row;
      }),
    );
  }),
);
router.post(
  "/contracts/payer",
  wrap(async (req, res) => {
    permit(req, managers);
    const data = z
      .object({ contractId: id, billToClientId: id })
      .parse(req.body);
    ok(
      res,
      await transaction(async (tx) => {
        await tx.client.findUniqueOrThrow({
          where: { id: data.billToClientId },
        });
        const row = await tx.contract.update({
          where: { id: data.contractId },
          data: { billToClientId: data.billToClientId },
        });
        await audit(tx, req, "PAYER", "contract", row.id, data);
        return row;
      }),
    );
  }),
);

async function ready(tx: any, t: any, excludeId?: string, dispatch = false) {
  const [v, d, c, r] = await Promise.all([
    tx.vehicle.findUnique({ where: { id: t.vehicleId } }),
    tx.driver.findUnique({ where: { id: t.driverId } }),
    tx.contract.findUnique({ where: { id: t.contractId } }),
    tx.route.findUnique({ where: { id: t.routeId } }),
  ]);
  if (!v || !d || !c || !r)
    throw new ValidationError(
      "Vehicle, driver, contract, and route are required.",
    );
  if (
    c.clientId !== t.clientId ||
    r.clientId !== t.clientId ||
    !r.isActive ||
    c.status !== "ACTIVE"
  )
    throw new ValidationError(
      "Route and active contract must belong to the selected client.",
    );
  if (t.supplierId) {
    const supplier = await tx.partner.findUnique({ where: { id: t.supplierId } });
    if (!supplier?.active || !["TRANSPORT", "BOTH"].includes(supplier.kind))
      throw new ValidationError("The assigned transport supplier is inactive or invalid.");
  }
  if ((v.supplierId && v.supplierId !== t.supplierId) || (d.supplierId && d.supplierId !== t.supplierId))
    throw new ValidationError("Resource ownership changed. Replace resources with the correct supplier before dispatch.");
  if (t.tripDate < c.startDate || t.tripDate > c.endDate)
    throw new ValidationError("Trip is outside the contract dates.");
  if (
    d.employmentStatus !== "ACTIVE" ||
    ["SUSPENDED", "OFF_DUTY"].includes(d.dutyStatus)
  )
    throw new ValidationError("Driver is unavailable.");
  if (["UNDER_MAINTENANCE", "OUT_OF_SERVICE"].includes(v.status))
    throw new ValidationError("Vehicle is unavailable.");
  if (
    d.licenseExpirationDate < t.tripDate ||
    v.licenseExpiry < t.tripDate ||
    v.insuranceExpiry < t.tripDate ||
    v.inspectionExpiry < t.tripDate
  )
    throw new ValidationError(
      "A required driver or vehicle document has expired.",
    );
  if (t.expectedArrival <= t.scheduledDeparture)
    throw new ValidationError("Arrival must be after departure.");
  const active = await tx.trip.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      tripStatus: "IN_PROGRESS",
      OR: [{ vehicleId: v.id }, { driverId: d.id }],
    },
  });
  if (active && (dispatch || t.scheduledDeparture <= new Date()))
    throw new ConflictError(
      "The driver or vehicle is still on an unfinished trip.",
    );
  const buffer = 20 * 60000;
  const clash = await tx.trip.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      tripStatus: { not: "CANCELLED" },
      OR: [{ driverId: d.id }, { vehicleId: v.id }],
      scheduledDeparture: {
        lt: new Date(t.expectedArrival.getTime() + buffer),
      },
      expectedArrival: {
        gt: new Date(t.scheduledDeparture.getTime() - buffer),
      },
    },
  });
  if (clash)
    throw new ConflictError(
      `Driver or vehicle overlaps trip ${clash.tripNumber}, including a 20-minute turnaround.`,
    );
  const maintenance = await tx.maintenanceRecord.findFirst({
    where: {
      vehicleId: v.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      serviceDate: { lte: t.expectedArrival },
      OR: [
        { completionDate: null },
        { completionDate: { gte: t.tripDate } },
      ],
    },
  });
  if (maintenance)
    throw new ConflictError(
      "Vehicle has an open maintenance job for this period.",
    );
  return v;
}
async function manifestFor(tx: any, t: any) {
  const enrollments = await tx.enrollment.findMany({
    where: {
      routeId: t.routeId,
      active: true,
      shift: t.shift,
      direction: { in: [t.direction, "BOTH"] },
      startDate: { lte: t.tripDate },
      OR: [{ endDate: null }, { endDate: { gte: t.tripDate } }],
      passenger: { active: true },
    },
    include: { passenger: { include: { employer: true, client: true } } },
  });
  return enrollments.map((e: any) => ({
    passengerId: e.passengerId,
    passengerName: e.passenger.fullName,
    employerName: e.passenger.employer?.name || e.passenger.client.companyName,
    stopName: e.stopName,
  }));
}
router.post(
  "/plans/:id/generate",
  wrap(async (req, res) => {
    permit(req, managers);
    const input = z
      .object({
        startDate: day,
        endDate: day,
        preview: z.boolean().default(true),
      })
      .parse(req.body);
    if (
      input.endDate < input.startDate ||
      +input.endDate - +input.startDate > 90 * 86400000
    )
      throw new ValidationError("Choose a period of up to 91 days.");
    ok(
      res,
      await transaction(async (tx) => {
        const plan = await tx.servicePlan.findUniqueOrThrow({
          where: { id: req.params.id },
          include: { route: true, contract: true },
        });
        if (!plan.active)
          throw new ValidationError("This schedule is inactive.");
        const results: any[] = [];
        for (
          let current = new Date(input.startDate);
          current <= input.endDate;
          current = new Date(+current + 86400000)
        ) {
          const date = current.toISOString().slice(0, 10);
          if (
            current < plan.startDate ||
            current > plan.endDate ||
            !plan.weekdays.includes(current.getUTCDay()) ||
            plan.excludedDates.includes(date)
          )
            continue;
          const key = `${plan.id}:${date}`;
          if (await tx.trip.findUnique({ where: { generationKey: key } })) {
            results.push({ date, status: "EXISTS" });
            continue;
          }
          try {
            const departure = zonedDeparture(
              date,
              plan.departureTime,
              plan.timezone,
            );
            const data = {
              clientId: plan.route.clientId,
              contractId: plan.contractId,
              routeId: plan.routeId,
              driverId: plan.driverId,
              vehicleId: plan.vehicleId,
              servicePlanId: plan.id,
              generationKey: key,
              tripDate: current,
              shift: plan.shift,
              direction: plan.direction,
              scheduledDeparture: departure,
              expectedArrival: new Date(
                +departure + plan.durationMinutes * 60000,
              ),
              supplierId: plan.supplierId,
              billToClientId:
                plan.contract.billToClientId || plan.contract.clientId,
              saleAmount: plan.saleRate,
              costAmount: plan.supplierRate,
              billingModel: plan.contract.pricingModel,
              monthlyAmount: plan.contract.monthlyValue,
            };
            const vehicle = await ready(tx, data);
            const manifest = await manifestFor(tx, data);
            if (manifest.length > vehicle.capacity)
              throw new ConflictError(
                `${manifest.length} passengers exceed ${vehicle.capacity} seats.`,
              );
            if (!input.preview) {
              await tx.trip.create({
                data: {
                  ...data,
                  tripNumber: `TR-${date.replaceAll("-", "")}-${randomUUID().slice(0, 8)}`,
                  manifest: { create: manifest },
                  events: {
                    create: {
                      type: "SCHEDULED",
                      description: plan.name,
                      actorId: req.user.userId,
                    },
                  },
                },
              });
            }
            results.push({
              date,
              status: input.preview ? "READY" : "CREATED",
              passengers: manifest.length,
            });
          } catch (error: any) {
            if (
              !(
                error instanceof ValidationError ||
                error instanceof ConflictError
              )
            )
              throw error;
            results.push({ date, status: "BLOCKED", reason: error.message });
          }
        }
        if (!input.preview)
          await audit(tx, req, "GENERATE", "plan", plan.id, results);
        return { preview: input.preview, results };
      }),
    );
  }),
);
router.get(
  "/trips",
  wrap(async (req, res) => {
    const u = await prisma.user.findUniqueOrThrow({
      where: { id: req.user.userId },
    });
    const where: any = {};
    if (req.query.date) where.tripDate = dateOnly(String(req.query.date));
    if (u.role === "DRIVER") where.driverId = u.driverScopeId || "unassigned";
    else if (u.role === "CLIENT")
      where.clientId = u.clientScopeId || "unassigned";
    else if (u.role === "SUPPLIER")
      where.supplierId = u.partnerScopeId || "unassigned";
    else permit(req, internal);
    const rows = await prisma.trip.findMany({
      where,
      include: {
        client: true,
        contract: true,
        route: true,
        vehicle: true,
        driver: true,
        supplier: true,
        manifest: true,
      },
      orderBy: { scheduledDeparture: "asc" },
      take: 500,
    });
    ok(
      res,
      rows.map((t) => {
        const {
          saleAmount,
          costAmount,
          monthlyAmount,
          billingModel,
          contract,
          ...rest
        } = t;
        return internal.includes(u.role)
          ? t
          : {
              ...rest,
              driver: {
                id: t.driver.id,
                fullName: t.driver.fullName,
                phoneNumber: t.driver.phoneNumber,
              },
              vehicle: {
                id: t.vehicle.id,
                plateNumber: t.vehicle.plateNumber,
                capacity: t.vehicle.capacity,
              },
              supplier: t.supplier
                ? { id: t.supplier.id, name: t.supplier.name }
                : null,
              ...(u.role === "SUPPLIER" ? { costAmount } : {}),
            };
      }),
    );
  }),
);
router.get(
  "/trips/:id",
  wrap(async (req, res) => {
    const t = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        route: { include: { stops: true } },
        client: true,
        vehicle: true,
        driver: true,
        manifest: true,
        events: { orderBy: { createdAt: "desc" } },
        supplier: true,
      },
    });
    await tripScope(req, t);
    const { saleAmount, costAmount, monthlyAmount, billingModel, ...rest } = t!;
    ok(
      res,
      internal.includes(req.user.role)
        ? t
        : {
            ...rest,
            driver: {
              id: t!.driver.id,
              fullName: t!.driver.fullName,
              phoneNumber: t!.driver.phoneNumber,
            },
            vehicle: {
              id: t!.vehicle.id,
              plateNumber: t!.vehicle.plateNumber,
              capacity: t!.vehicle.capacity,
            },
            supplier: t!.supplier
              ? { id: t!.supplier.id, name: t!.supplier.name }
              : null,
            events: t!.events.map((e) => ({
              id: e.id,
              type: e.type,
              createdAt: e.createdAt,
              description:
                e.type === "REPLACEMENT"
                  ? "Resources reassigned / تم تغيير الموارد"
                  : e.description,
            })),
          },
    );
  }),
);
router.post(
  "/trips/:id/manifest",
  wrap(async (req, res) => {
    permit(req, managers);
    ok(
      res,
      await transaction(async (tx) => {
        const trip = await tx.trip.findUniqueOrThrow({
          where: { id: req.params.id },
        });
        if (trip.actualDeparture || !["SCHEDULED", "DELAYED"].includes(trip.tripStatus))
          throw new ConflictError("Manifest is locked once the trip starts.");
        const rows = await manifestFor(tx, trip),
          v = await tx.vehicle.findUniqueOrThrow({
            where: { id: trip.vehicleId },
          });
        if (rows.length > v.capacity)
          throw new ConflictError("Passenger count exceeds vehicle capacity.");
        await tx.tripPassenger.deleteMany({ where: { tripId: trip.id } });
        await tx.tripPassenger.createMany({
          data: rows.map((r: any) => ({ ...r, tripId: trip.id })),
        });
        await audit(tx, req, "REFRESH_MANIFEST", "trip", trip.id, {
          count: rows.length,
        });
        return { count: rows.length };
      }),
    );
  }),
);
router.post("/trips/:id/attendance-batch", wrap(async (req, res) => {
  permit(req, [...managers, "DRIVER"]);
  const input = z.object({ manifestIds: z.array(id).min(1).max(100), confirmed: z.literal(true) }).parse(req.body);
  if (new Set(input.manifestIds).size !== input.manifestIds.length) throw new ValidationError("Choose each passenger once.");
  ok(res, await transaction(async tx => {
    const trip = await tx.trip.findUniqueOrThrow({ where: { id: req.params.id } });
    await tripScope(req, trip);
    if (trip.tripStatus !== "IN_PROGRESS") throw new ConflictError("Attendance is available while a trip is in progress.");
    const rows = await tx.tripPassenger.findMany({ where: { tripId: trip.id, id: { in: input.manifestIds }, status: "EXPECTED" } });
    if (rows.length !== input.manifestIds.length) throw new ConflictError("The passenger list changed. Refresh and review the remaining passengers.");
    const result = await tx.tripPassenger.updateMany({ where: { tripId: trip.id, id: { in: input.manifestIds }, status: "EXPECTED" }, data: { status: "BOARDED", recordedAt: new Date() } });
    await audit(tx, req, "ATTENDANCE_BATCH", "trip", trip.id, { manifestIds: input.manifestIds, status: "BOARDED" });
    return result;
  }));
}));
router.post(
  "/trips/:id/attendance",
  wrap(async (req, res) => {
    permit(req, [...managers, "DRIVER"]);
    const input = z
      .object({
        manifestId: id,
        status: z.enum(["EXPECTED", "BOARDED", "NO_SHOW", "CANCELLED"]),
      })
      .parse(req.body);
    ok(
      res,
      await transaction(async (tx) => {
        const trip = await tx.trip.findUniqueOrThrow({
          where: { id: req.params.id },
        });
        await tripScope(req, trip);
        if (trip.tripStatus !== "IN_PROGRESS")
          throw new ConflictError(
            "Attendance is available while a trip is in progress.",
          );
        const m = await tx.tripPassenger.findUniqueOrThrow({
          where: { id: input.manifestId },
        });
        if (m.tripId !== trip.id) throw new ForbiddenError();
        const result = await tx.tripPassenger.update({
          where: { id: m.id },
          data: { status: input.status, recordedAt: new Date() },
        });
        await audit(tx, req, "ATTENDANCE", "trip", trip.id, input);
        return result;
      }),
    );
  }),
);
router.post(
  "/trips/:id/status",
  wrap(async (req, res) => {
    permit(req, [...managers, "DRIVER"]);
    const input = z
      .object({
        status: z.enum(["IN_PROGRESS", "COMPLETED", "DELAYED", "CANCELLED"]),
        reason: optionalText,
      })
      .parse(req.body);
    ok(
      res,
      await transaction(async (tx) => {
        const t = await tx.trip.findUniqueOrThrow({
          where: { id: req.params.id },
          include: { manifest: true },
        });
        await tripScope(req, t);
        if (!transitions[t.tripStatus]?.includes(input.status))
          throw new ConflictError(
            `Cannot change ${t.tripStatus} to ${input.status}.`,
          );
        if (["DELAYED", "CANCELLED"].includes(input.status) && !input.reason)
          throw new ValidationError("Please enter a reason.");
        if (input.status === "IN_PROGRESS") {
          await ready(tx, t, t.id, true);
          const v = await tx.vehicle.findUniqueOrThrow({
            where: { id: t.vehicleId },
          });
          if (
            t.manifest.filter((m) => m.status !== "CANCELLED").length >
            v.capacity
          )
            throw new ConflictError("Passenger count exceeds capacity.");
        }
        if (
          input.status === "COMPLETED" &&
          t.manifest.some((m) => m.status === "EXPECTED")
        )
          throw new ValidationError(
            "Record attendance for every passenger before completing the trip.",
          );
        const result = await tx.trip.update({
          where: { id: t.id },
          data: {
            tripStatus: input.status,
            ...(input.status === "IN_PROGRESS"
              ? { actualDeparture: t.actualDeparture || new Date() }
              : {}),
            ...(input.status === "COMPLETED"
              ? { actualArrival: new Date() }
              : {}),
            events: {
              create: {
                type: input.status,
                description: input.reason || input.status,
                actorId: req.user.userId,
              },
            },
          },
        });
        if (input.status === "IN_PROGRESS" || t.tripStatus === "IN_PROGRESS") {
          const maintenance = await tx.maintenanceRecord.count({
            where: {
              vehicleId: t.vehicleId,
              status: { in: ["SCHEDULED", "IN_PROGRESS"] },
              serviceDate: { lte: new Date() },
            },
          });
          await tx.vehicle.update({
            where: { id: t.vehicleId },
            data: {
              status:
                input.status === "IN_PROGRESS"
                  ? "ON_TRIP"
                  : maintenance
                    ? "UNDER_MAINTENANCE"
                    : "AVAILABLE",
            },
          });
          await tx.driver.update({
            where: { id: t.driverId },
            data: {
              dutyStatus:
                input.status === "IN_PROGRESS" ? "ON_DUTY" : "AVAILABLE",
            },
          });
        }
        if (input.status === "COMPLETED") {
          await AccountingService.syncTripToFinancials(t.id, tx);
        } else if (input.status === "CANCELLED") {
          await AccountingService.removeTripFromFinancials(t.id, tx);
        }
        await audit(tx, req, "STATUS", "trip", t.id, input);
        return result;
      }),
    );
  }),
);
router.post(
  "/trips/:id/replace",
  wrap(async (req, res) => {
    permit(req, managers);
    const input = z
      .object({
        vehicleId: id,
        driverId: id,
        supplierId: optionalId,
        costAmount: amount,
        reason: text,
      })
      .parse(req.body);
    ok(
      res,
      await transaction(async (tx) => {
        const t = await tx.trip.findUniqueOrThrow({
          where: { id: req.params.id },
          include: { manifest: true },
        });
        if (!["SCHEDULED", "DELAYED"].includes(t.tripStatus))
          throw new ConflictError(
            "Only scheduled or delayed trips can be reassigned.",
          );
        const v = await ready(tx, { ...t, ...input }, t.id);
        if (t.manifest.filter((m) => m.status !== "CANCELLED").length > v.capacity)
          throw new ConflictError(
            "Replacement vehicle has insufficient seats.",
          );
        const d = await tx.driver.findUniqueOrThrow({
          where: { id: input.driverId },
        });
        if (
          (v.supplierId && v.supplierId !== input.supplierId) ||
          (d.supplierId && d.supplierId !== input.supplierId)
        )
          throw new ValidationError(
            "Replacement resources must match the supplier.",
          );
        if (input.supplierId) {
          const p = await tx.partner.findUnique({
            where: { id: input.supplierId },
          });
          if (!p?.active || !["TRANSPORT", "BOTH"].includes(p.kind))
            throw new ValidationError("Select an active transport supplier.");
        }
        if (!input.supplierId && input.costAmount > 0)
          throw new ValidationError(
            "Select a supplier for this payable amount.",
          );
        const { reason, ...data } = input;
        const result = await tx.trip.update({
          where: { id: t.id },
          data: {
            ...data,
            events: {
              create: {
                type: "REPLACEMENT",
                description: JSON.stringify({
                  reason,
                  previousVehicle: t.vehicleId,
                  previousDriver: t.driverId,
                  previousSupplier: t.supplierId,
                  ...data,
                }),
                actorId: req.user.userId,
              },
            },
          },
        });
        await audit(tx, req, "REPLACE", "trip", t.id, input);
        return result;
      }),
    );
  }),
);
router.post(
  "/trips/:id/incident",
  wrap(async (req, res) => {
    permit(req, [...managers, "DRIVER"]);
    const { description } = z.object({ description: text }).parse(req.body);
    const t = await prisma.trip.findUnique({ where: { id: req.params.id } });
    await tripScope(req, t);
    ok(
      res,
      await transaction(async (tx) => {
        const event = await tx.tripEvent.create({
          data: {
            tripId: t!.id,
            type: "INCIDENT",
            description,
            actorId: req.user.userId,
          },
        });
        await audit(tx, req, "INCIDENT", "trip", t!.id, { description });
        return event;
      }),
    );
  }),
);

router.get(
  "/billing/parties-summary",
  wrap(async (req, res) => {
    permit(req, internal);
    const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(req.query.period || new Date().toISOString().slice(0, 7));
    const kind = (req.query.kind as string) || "ALL";
    const start = dateOnly(period + "-01");
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const [year, month] = period.split("-").map(Number);

    const [clients, suppliers, trips, dailyOps, billedLines] = await Promise.all([
      prisma.client.findMany({ where: { status: "ACTIVE" }, orderBy: { companyName: "asc" } }),
      prisma.partner.findMany({ where: { active: true, kind: { in: ["TRANSPORT", "BOTH"] } }, orderBy: { name: "asc" } }),
      prisma.trip.findMany({
        where: { tripStatus: "COMPLETED", tripDate: { gte: start, lt: end } },
        include: { route: true, vehicle: true, driver: true },
      }),
      prisma.dailyOperation.findMany({
        where: {
          year,
          month,
          NOT: { notes: { contains: "[Trip#" } },
        },
      }),
      prisma.financeLine.findMany({
        where: { document: { status: { not: "VOID" } } },
        select: { sourceKey: true, tripId: true, amount: true, document: { select: { id: true, number: true, kind: true, status: true } } },
      }),
    ]);

    const billedSourceKeys = new Set(billedLines.map((l) => l.sourceKey));
    const billedTripIds = new Set(billedLines.map((l) => l.tripId).filter(Boolean));

    const result: any[] = [];

    // 1. Process Clients
    if (kind === "ALL" || kind === "CLIENT" || kind === "INVOICE") {
      for (const client of clients) {
        const clientTrips = trips.filter((t) => t.clientId === client.id || t.billToClientId === client.id);
        const clientOps = dailyOps.filter((o) => (o.companyName || "").toLowerCase().includes(client.companyName.toLowerCase()));

        let totalTrips = 0;
        let totalAmount = 0;
        let billedAmount = 0;
        let unbilledTripsCount = 0;

        for (const t of clientTrips) {
          totalTrips++;
          const val = Number(t.billingModel === "MONTHLY_FIXED" ? t.monthlyAmount : t.saleAmount) || 0;
          totalAmount += val;
          const isBilled = billedTripIds.has(t.id) || billedSourceKeys.has(`INVOICE:TRIP:${t.id}`) || billedSourceKeys.has(`INVOICE:MONTH:${t.contractId}:${period}`);
          if (isBilled) billedAmount += val;
          else unbilledTripsCount++;
        }

        for (const o of clientOps) {
          const tripsCount = Number(o.tripCount || 1);
          totalTrips += tripsCount;
          const val = Number(o.totalAmount || (Number(o.dailyRate || 0) * tripsCount));
          totalAmount += val;
          const isBilled = billedSourceKeys.has(`INVOICE:DAILY:${o.id}`);
          if (isBilled) billedAmount += val;
          else unbilledTripsCount += tripsCount;
        }

        result.push({
          id: client.id,
          name: client.companyName,
          contactPerson: client.contactPerson,
          phone: client.phone,
          kind: "CLIENT",
          documentKind: "INVOICE",
          period,
          totalTrips,
          totalAmount: Math.round(totalAmount * 100) / 100,
          billedAmount: Math.round(billedAmount * 100) / 100,
          unbilledAmount: Math.round(Math.max(0, totalAmount - billedAmount) * 100) / 100,
          unbilledTripsCount,
        });
      }
    }

    // 2. Process Suppliers
    if (kind === "ALL" || kind === "SUPPLIER" || kind === "SETTLEMENT") {
      for (const supplier of suppliers) {
        const supplierTrips = trips.filter((t) => t.supplierId === supplier.id);
        const supplierOps = dailyOps.filter(
          (o) =>
            (o.driverName || "").toLowerCase().includes(supplier.name.toLowerCase()) ||
            (o.companyName || "").toLowerCase().includes(supplier.name.toLowerCase())
        );

        let totalTrips = 0;
        let totalAmount = 0;
        let billedAmount = 0;
        let unbilledTripsCount = 0;

        for (const t of supplierTrips) {
          totalTrips++;
          const val = Number(t.costAmount) || 0;
          totalAmount += val;
          const isBilled = billedTripIds.has(t.id) || billedSourceKeys.has(`SETTLEMENT:TRIP:${t.id}`);
          if (isBilled) billedAmount += val;
          else unbilledTripsCount++;
        }

        for (const o of supplierOps) {
          const tripsCount = Number(o.tripCount || 1);
          totalTrips += tripsCount;
          const val = Number(o.netDriverPay || (Number(o.driverDailyRate || 0) * tripsCount));
          totalAmount += val;
          const isBilled = billedSourceKeys.has(`SETTLEMENT:DAILY:${o.id}`);
          if (isBilled) billedAmount += val;
          else unbilledTripsCount += tripsCount;
        }

        result.push({
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contactName || "-",
          phone: supplier.phone || "-",
          kind: "SUPPLIER",
          documentKind: "SETTLEMENT",
          period,
          totalTrips,
          totalAmount: Math.round(totalAmount * 100) / 100,
          billedAmount: Math.round(billedAmount * 100) / 100,
          unbilledAmount: Math.round(Math.max(0, totalAmount - billedAmount) * 100) / 100,
          unbilledTripsCount,
        });
      }
    }

    ok(res, result);
  }),
);

router.get(
  "/billing/party-trips",
  wrap(async (req, res) => {
    permit(req, internal);
    const partyId = z.string().uuid().parse(req.query.partyId);
    const kind = z.enum(["INVOICE", "SETTLEMENT"]).parse(req.query.kind);
    const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(req.query.period || new Date().toISOString().slice(0, 7));
    const start = dateOnly(period + "-01");
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const [year, month] = period.split("-").map(Number);
    const isInvoice = kind === "INVOICE";

    let partyName = "";
    if (isInvoice) {
      const c = await prisma.client.findUniqueOrThrow({ where: { id: partyId } });
      partyName = c.companyName;
    } else {
      const p = await prisma.partner.findUniqueOrThrow({ where: { id: partyId } });
      partyName = p.name;
    }

    const [trips, dailyOps, billedLines] = await Promise.all([
      prisma.trip.findMany({
        where: {
          tripStatus: "COMPLETED",
          tripDate: { gte: start, lt: end },
          ...(isInvoice
            ? { OR: [{ clientId: partyId }, { billToClientId: partyId }] }
            : { supplierId: partyId }),
        },
        include: { route: true, vehicle: true, driver: true, contract: true },
        orderBy: { tripDate: "asc" },
      }),
      prisma.dailyOperation.findMany({
        where: {
          year,
          month,
          NOT: { notes: { contains: "[Trip#" } },
          ...(isInvoice
            ? { companyName: { contains: partyName, mode: "insensitive" } }
            : {
                OR: [
                  { driverName: { contains: partyName, mode: "insensitive" } },
                  { companyName: { contains: partyName, mode: "insensitive" } },
                ],
              }),
        },
        orderBy: { day: "asc" },
      }),
      prisma.financeLine.findMany({
        where: { document: { status: { not: "VOID" } } },
        include: { document: { select: { id: true, number: true, kind: true, status: true } } },
      }),
    ]);

    const billedMap = new Map<string, any>();
    for (const bl of billedLines) {
      if (bl.sourceKey) billedMap.set(bl.sourceKey, bl.document);
      if (bl.tripId) billedMap.set(`TRIP:${bl.tripId}`, bl.document);
    }

    const items: any[] = [];

    for (const t of trips) {
      const sourceKey = isInvoice
        ? t.billingModel === "MONTHLY_FIXED"
          ? `INVOICE:MONTH:${t.contractId}:${period}`
          : `INVOICE:TRIP:${t.id}`
        : `SETTLEMENT:TRIP:${t.id}`;

      const doc = billedMap.get(sourceKey) || billedMap.get(`TRIP:${t.id}`);
      const rate = Number(isInvoice ? (t.billingModel === "MONTHLY_FIXED" ? t.monthlyAmount : t.saleAmount) : t.costAmount) || 0;

      items.push({
        id: t.id,
        tripNumber: t.tripNumber,
        date: t.tripDate.toISOString().slice(0, 10),
        routeName: t.route?.routeName || "مسار رحلة",
        vehiclePlate: t.vehicle?.plateNumber || "—",
        driverName: t.driver?.fullName || "—",
        tripCount: 1,
        rate,
        isBilled: !!doc,
        documentNumber: doc?.number || null,
        documentId: doc?.id || null,
        sourceType: "TRIP",
        sourceKey,
      });
    }

    for (const o of dailyOps) {
      const sourceKey = isInvoice ? `INVOICE:DAILY:${o.id}` : `SETTLEMENT:DAILY:${o.id}`;
      const doc = billedMap.get(sourceKey);
      const rate = Number(isInvoice ? o.totalAmount || (Number(o.dailyRate || 0) * Number(o.tripCount || 1)) : o.netDriverPay || (Number(o.driverDailyRate || 0) * Number(o.tripCount || 1))) || 0;

      items.push({
        id: `daily:${o.id}`,
        tripNumber: `OP-${o.day}/${o.month}`,
        date: `${year}-${String(month).padStart(2, "0")}-${String(o.day).padStart(2, "0")}`,
        routeName: o.routeName || "تشغيل يومية",
        vehiclePlate: o.vehiclePlate || o.vehicleType || "—",
        driverName: o.driverName || "—",
        tripCount: Number(o.tripCount || 1),
        rate,
        isBilled: !!doc,
        documentNumber: doc?.number || null,
        documentId: doc?.id || null,
        sourceType: "DAILY_OP",
        sourceKey,
      });
    }

    ok(res, { partyName, partyId, kind, period, items });
  }),
);

router.get(
  "/documents",
  wrap(async (req, res) => {
    const u = await prisma.user.findUniqueOrThrow({
      where: { id: req.user.userId },
    });
    const where: any = {};
    if (u.role === "CLIENT") {
      where.clientId = u.clientScopeId || "unassigned";
      where.status = { not: "DRAFT" };
    } else if (u.role === "SUPPLIER") {
      where.partnerId = u.partnerScopeId || "unassigned";
      where.status = { not: "DRAFT" };
    } else permit(req, internal);
    ok(
      res,
      await prisma.financeDocument.findMany({
        where,
        include: {
          client: true,
          partner: true,
          lines: true,
          payments: {
            include: {
              treasuryEntry: {
                include: { account: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  }),
);

router.post(
  "/documents/generate-batch",
  wrap(async (req, res) => {
    permit(req, finance);
    const input = z
      .object({
        period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        dueDate: day,
        notes: optionalText,
      })
      .parse(req.body);

    ok(
      res,
      await transaction(async (tx) => {
        const start = dateOnly(input.period + "-01");
        const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
        const [year, month] = input.period.split("-").map(Number);

        const clients = await tx.client.findMany({ where: { status: "ACTIVE" } });
        const suppliers = await tx.partner.findMany({ where: { active: true, kind: { in: ["TRANSPORT", "BOTH"] } } });

        const createdDocs: any[] = [];

        // 1. Process Client Invoices
        for (const client of clients) {
          const trips = await tx.trip.findMany({
            where: {
              tripStatus: "COMPLETED",
              tripDate: { gte: start, lt: end },
              OR: [
                { billToClientId: client.id },
                { billToClientId: null, clientId: client.id },
              ],
            },
            include: { contract: true, route: true },
          });

          const dailyOps = await tx.dailyOperation.findMany({
            where: {
              year,
              month,
              NOT: { notes: { contains: "[Trip#" } },
              companyName: { contains: client.companyName, mode: "insensitive" },
            },
          });

          const lines: any[] = [];
          const handled = new Set<string>();

          for (const t of trips) {
            const monthly = t.billingModel === "MONTHLY_FIXED";
            const sourceKey = monthly
              ? `INVOICE:MONTH:${t.contractId}:${input.period}`
              : `INVOICE:TRIP:${t.id}`;
            if (handled.has(sourceKey) || (await tx.financeLine.findUnique({ where: { sourceKey } })))
              continue;
            handled.add(sourceKey);
            const value = new Prisma.Decimal(monthly ? t.monthlyAmount : t.saleAmount);
            if (value.lte(0)) continue;
            lines.push({
              sourceKey,
              tripId: monthly ? null : t.id,
              description: monthly
                ? `${t.contract?.contractNumber || 'Contract'} · ${input.period} (monthly fixed)`
                : `${t.tripNumber} · ${t.route?.routeName || 'مسار رحلة'}`,
              amount: value,
            });
          }

          for (const op of dailyOps) {
            const sourceKey = `INVOICE:DAILY:${op.id}`;
            if (handled.has(sourceKey) || (await tx.financeLine.findUnique({ where: { sourceKey } })))
              continue;
            handled.add(sourceKey);
            const amt = Number(op.totalAmount || (Number(op.dailyRate || 0) * Number(op.tripCount || 1)));
            if (amt <= 0) continue;
            lines.push({
              sourceKey,
              tripId: null,
              description: `يومية ${op.day}/${op.month} · ${op.routeName} (${op.driverName || 'سائق'}) · ${op.tripCount || 1} رحلة`,
              amount: new Prisma.Decimal(amt),
            });
          }

          if (lines.length > 0) {
            const total = lines.reduce((s, l) => s.plus(l.amount), new Prisma.Decimal(0));
            const doc = await tx.financeDocument.create({
              data: {
                number: `INV-${input.period.replace("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
                kind: "INVOICE",
                clientId: client.id,
                period: input.period,
                dueDate: input.dueDate,
                notes: input.notes || `فاتورة خدمات مجمعة لشهر ${input.period}`,
                total,
                lines: { create: lines },
              },
              include: { lines: true, client: true },
            });
            createdDocs.push(doc);
          }
        }

        // 2. Process Supplier Settlements
        for (const supplier of suppliers) {
          const trips = await tx.trip.findMany({
            where: {
              tripStatus: "COMPLETED",
              tripDate: { gte: start, lt: end },
              supplierId: supplier.id,
            },
            include: { contract: true, route: true },
          });

          const dailyOps = await tx.dailyOperation.findMany({
            where: {
              year,
              month,
              NOT: { notes: { contains: "[Trip#" } },
              OR: [
                { driverName: { contains: supplier.name, mode: "insensitive" } },
                { companyName: { contains: supplier.name, mode: "insensitive" } },
              ],
            },
          });

          const lines: any[] = [];
          const handled = new Set<string>();

          for (const t of trips) {
            const sourceKey = `SETTLEMENT:TRIP:${t.id}`;
            if (handled.has(sourceKey) || (await tx.financeLine.findUnique({ where: { sourceKey } })))
              continue;
            handled.add(sourceKey);
            const value = new Prisma.Decimal(t.costAmount);
            if (value.lte(0)) continue;
            lines.push({
              sourceKey,
              tripId: t.id,
              description: `${t.tripNumber} · ${t.route?.routeName || 'مسار رحلة'} (تكلفة مورد)`,
              amount: value,
            });
          }

          for (const op of dailyOps) {
            const sourceKey = `SETTLEMENT:DAILY:${op.id}`;
            if (handled.has(sourceKey) || (await tx.financeLine.findUnique({ where: { sourceKey } })))
              continue;
            handled.add(sourceKey);
            const amt = Number(op.netDriverPay || (Number(op.driverDailyRate || 0) * Number(op.tripCount || 1)));
            if (amt <= 0) continue;
            lines.push({
              sourceKey,
              tripId: null,
              description: `مستحق تشغيل ${op.day}/${op.month} · ${op.routeName} (${op.driverName}) · ${op.tripCount || 1} رحلة`,
              amount: new Prisma.Decimal(amt),
            });
          }

          if (lines.length > 0) {
            const total = lines.reduce((s, l) => s.plus(l.amount), new Prisma.Decimal(0));
            const doc = await tx.financeDocument.create({
              data: {
                number: `SET-${input.period.replace("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
                kind: "SETTLEMENT",
                partnerId: supplier.id,
                period: input.period,
                dueDate: input.dueDate,
                notes: input.notes || `كشف مستحقات مجمع لشهر ${input.period}`,
                total,
                lines: { create: lines },
              },
              include: { lines: true, partner: true },
            });
            createdDocs.push(doc);
          }
        }

        await audit(tx, req, "BATCH_DOCUMENTS", "document", "batch", { count: createdDocs.length, period: input.period });
        return { count: createdDocs.length, documents: createdDocs };
      }),
    );
  }),
);

router.post(
  "/documents",
  wrap(async (req, res) => {
    permit(req, finance);
    const input = z
      .object({
        kind: z.enum(["INVOICE", "SETTLEMENT"]),
        partyId: id,
        period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        dueDate: day,
        notes: optionalText,
        customLines: z
          .array(
            z.object({
              description: z.string().trim().min(1),
              amount: z.coerce.number().positive(),
            }),
          )
          .optional(),
      })
      .parse(req.body);

    ok(
      res,
      await transaction(async (tx) => {
        const start = dateOnly(input.period + "-01"),
          end = new Date(
            Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
          );
        const [year, month] = input.period.split("-").map(Number);
        const isInvoice = input.kind === "INVOICE";
        let partyName = "";

        if (isInvoice) {
          const client = await tx.client.findUniqueOrThrow({ where: { id: input.partyId } });
          partyName = client.companyName;
        } else {
          const partner = await tx.partner.findUniqueOrThrow({ where: { id: input.partyId } });
          partyName = partner.name;
        }

        const lines: any[] = [];
        const handled = new Set<string>();

        // 1. Process custom lines if provided
        if (input.customLines && input.customLines.length > 0) {
          for (const cl of input.customLines) {
            const sourceKey = `CUSTOM:${randomUUID()}`;
            lines.push({
              sourceKey,
              tripId: null,
              description: cl.description,
              amount: new Prisma.Decimal(cl.amount),
            });
          }
        } else {
          // 2. Automatically extract from Trips
          const trips = await tx.trip.findMany({
            where: {
              tripStatus: "COMPLETED",
              tripDate: { gte: start, lt: end },
              ...(isInvoice
                ? {
                    OR: [
                      { billToClientId: input.partyId },
                      { billToClientId: null, clientId: input.partyId },
                    ],
                  }
                : { supplierId: input.partyId }),
            },
            include: { contract: true, route: true },
          });

          for (const t of trips) {
            const monthly = isInvoice && t.billingModel === "MONTHLY_FIXED";
            if (monthly) {
              const snapshots = await tx.trip.findMany({
                where: {
                  contractId: t.contractId,
                  billingModel: "MONTHLY_FIXED",
                  tripDate: { gte: start, lt: end },
                  tripStatus: { not: "CANCELLED" },
                },
                select: {
                  monthlyAmount: true,
                  billToClientId: true,
                  clientId: true,
                },
              });
              if (
                snapshots.some(
                  (s) =>
                    !s.monthlyAmount.equals(t.monthlyAmount) ||
                    (s.billToClientId || s.clientId) !==
                      (t.billToClientId || t.clientId),
                )
              )
                throw new ValidationError(
                  "Monthly rate or payer differs within this service month. Resolve the contract snapshots before billing.",
                );
            }
            const sourceKey = monthly
              ? `INVOICE:MONTH:${t.contractId}:${input.period}`
              : `${input.kind}:TRIP:${t.id}`;
            if (
              handled.has(sourceKey) ||
              (await tx.financeLine.findUnique({ where: { sourceKey } }))
            )
              continue;
            handled.add(sourceKey);
            const value = new Prisma.Decimal(
              monthly ? t.monthlyAmount : isInvoice ? t.saleAmount : t.costAmount,
            );
            if (value.lte(0)) continue;
            lines.push({
              sourceKey,
              tripId: monthly ? null : t.id,
              description: monthly
                ? `${t.contract?.contractNumber || 'Contract'} · ${input.period} (monthly fixed)`
                : `${t.tripNumber} · ${t.route?.routeName || 'مسار رحلة'}`,
              amount: value,
            });
          }

          // 3. Automatically extract from DailyOperation
          if (isInvoice) {
            const ops = await tx.dailyOperation.findMany({
              where: {
                year,
                month,
                NOT: { notes: { contains: "[Trip#" } },
                companyName: { contains: partyName, mode: "insensitive" },
              },
            });
            for (const op of ops) {
              const sourceKey = `INVOICE:DAILY:${op.id}`;
              if (handled.has(sourceKey) || (await tx.financeLine.findUnique({ where: { sourceKey } })))
                continue;
              handled.add(sourceKey);
              const amt = Number(op.totalAmount || (Number(op.dailyRate || 0) * Number(op.tripCount || 1)));
              if (amt <= 0) continue;
              lines.push({
                sourceKey,
                tripId: null,
                description: `يومية ${op.day}/${op.month} · ${op.routeName} (${op.driverName || 'سائق'}) · ${op.tripCount || 1} رحلة`,
                amount: new Prisma.Decimal(amt),
              });
            }
          } else {
            const ops = await tx.dailyOperation.findMany({
              where: {
                year,
                month,
                NOT: { notes: { contains: "[Trip#" } },
                OR: [
                  { driverName: { contains: partyName, mode: "insensitive" } },
                  { companyName: { contains: partyName, mode: "insensitive" } },
                ],
              },
            });
            for (const op of ops) {
              const sourceKey = `SETTLEMENT:DAILY:${op.id}`;
              if (handled.has(sourceKey) || (await tx.financeLine.findUnique({ where: { sourceKey } })))
                continue;
              handled.add(sourceKey);
              const amt = Number(op.netDriverPay || (Number(op.driverDailyRate || 0) * Number(op.tripCount || 1)));
              if (amt <= 0) continue;
              lines.push({
                sourceKey,
                tripId: null,
                description: `مستحق تشغيل ${op.day}/${op.month} · ${op.routeName} (${op.driverName}) · ${op.tripCount || 1} رحلة`,
                amount: new Prisma.Decimal(amt),
              });
            }
          }
        }

        if (!lines.length)
          throw new ValidationError(
            "لم يتم العثور على خدمات أو تشغيلات مكتملة غير مفوترة لهذا الطرف في هذا الشهر. يمكنك إضافة سطور مخصصة يدوياً.",
          );
        const total = lines.reduce(
          (s: Prisma.Decimal, l: any) => s.plus(l.amount),
          new Prisma.Decimal(0),
        );
        const doc = await tx.financeDocument.create({
          data: {
            number: `${isInvoice ? "INV" : "SET"}-${input.period.replace("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
            kind: input.kind,
            clientId: isInvoice ? input.partyId : null,
            partnerId: isInvoice ? null : input.partyId,
            period: input.period,
            dueDate: input.dueDate,
            notes: input.notes,
            total,
            lines: { create: lines },
          },
          include: { lines: true, client: true, partner: true },
        });
        await audit(tx, req, "DRAFT", "document", doc.id, {
          input,
          total: total.toString(),
        });
        return doc;
      }),
    );
  }),
);

router.post(
  "/documents/:id/issue",
  wrap(async (req, res) => {
    permit(req, finance);
    ok(
      res,
      await transaction(async (tx) => {
        const d = await tx.financeDocument.findUniqueOrThrow({
          where: { id: req.params.id },
          include: { client: true, partner: true },
        });
        if (d.status !== "DRAFT")
          throw new ConflictError("Only draft documents can be issued.");
        const row = await tx.financeDocument.update({
          where: { id: d.id },
          data: { status: "ISSUED" },
        });

        // Synchronize with Client / Supplier Ledger Statements
        if (d.kind === "INVOICE" && d.client) {
          const lastTx = await tx.clientTransaction.findFirst({
            where: { companyName: d.client.companyName },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          });
          const prevBal = lastTx ? Number(lastTx.balance || 0) : 0;
          const amt = Number(d.total);
          await tx.clientTransaction.create({
            data: {
              companyName: d.client.companyName,
              date: d.dueDate || new Date(),
              documentNumber: d.number,
              description: `إصدار فاتورة خدمات شهرية (${d.period}) - فاتورة #${d.number}`,
              debit: amt,
              credit: 0,
              balance: prevBal + amt,
              notes: `[Invoice#${d.id}]`,
            },
          });
        } else if (d.kind === "SETTLEMENT" && d.partner) {
          const lastTx = await tx.supplierTransaction.findFirst({
            where: { supplierName: d.partner.name },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          });
          const prevBal = lastTx ? Number(lastTx.balance || 0) : 0;
          const amt = Number(d.total);
          await tx.supplierTransaction.create({
            data: {
              supplierName: d.partner.name,
              supplierId: d.partner.id,
              date: d.dueDate || new Date(),
              documentNumber: d.number,
              description: `اعتماد كشف مستحقات مورد (${d.period}) - مستند #${d.number}`,
              debit: 0,
              credit: amt,
              balance: prevBal + amt,
              notes: `[Settlement#${d.id}]`,
            },
          });
        }

        await audit(tx, req, "ISSUE", "document", d.id, {});
        return row;
      }),
    );
  }),
);

router.post(
  "/documents/:id/discard",
  wrap(async (req, res) => {
    permit(req, finance);
    ok(
      res,
      await transaction(async (tx) => {
        const d = await tx.financeDocument.findUniqueOrThrow({
          where: { id: req.params.id },
        });
        if (d.status !== "DRAFT")
          throw new ConflictError("Issued documents cannot be deleted.");
        await tx.financeLine.deleteMany({ where: { documentId: d.id } });
        await tx.financeDocument.update({
          where: { id: d.id },
          data: { status: "VOID" },
        });
        await audit(tx, req, "DISCARD", "document", d.id, {});
        return { id: d.id };
      }),
    );
  }),
);

router.post(
  "/documents/:id/payments",
  wrap(async (req, res) => {
    permit(req, finance);
    const input = z
      .object({
        amount: amount.refine((v) => v > 0, "Payment must be positive."),
        date: day,
        reference: text,
        requestKey: id,
        accountId: id,
      })
      .parse(req.body);
    ok(
      res,
      await transaction(async (tx) => {
        const existing = await tx.payment.findUnique({
          where: { requestKey: input.requestKey },
          include: { treasuryEntry: true },
        });
        if (existing) {
          if (
            existing.documentId !== req.params.id ||
            !existing.amount.equals(input.amount) ||
            existing.reference !== input.reference ||
            existing.date.getTime() !== input.date.getTime() ||
            existing.treasuryEntry?.accountId !== input.accountId
          )
            throw new ConflictError(
              "Payment key was already used for another request.",
            );
          return existing;
        }
        const doc = await tx.financeDocument.findUniqueOrThrow({
          where: { id: req.params.id },
          include: { payments: true, client: true, partner: true },
        });
        if (doc.status !== "ISSUED")
          throw new ConflictError(
            "Payments require an issued, unpaid document.",
          );
        const paid = doc.payments.reduce(
          (s, p) => s.plus(p.amount),
          new Prisma.Decimal(0),
        );
        const value = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
        if (value.gt(doc.total.minus(paid)))
          throw new ValidationError("Payment exceeds the outstanding balance.");
        const payment = await tx.payment.create({
          data: { amount: value, date: input.date, reference: input.reference, requestKey: input.requestKey, documentId: doc.id },
        });

        // 1. Post into Treasury Safe / Bank Account
        const treasuryEntry = await postDocumentPayment(tx, payment, doc, input.accountId, req.user.userId);

        // 2. Synchronize with Client Statement / Supplier Statement
        const valNum = Number(value);
        if (doc.kind === "INVOICE" && doc.client) {
          const lastTx = await tx.clientTransaction.findFirst({
            where: { companyName: doc.client.companyName },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          });
          const prevBal = lastTx ? Number(lastTx.balance || 0) : 0;
          await tx.clientTransaction.create({
            data: {
              companyName: doc.client.companyName,
              date: input.date,
              documentNumber: input.reference || doc.number,
              description: `تحصيل وتوريد للخزينة - فاتورة ${doc.number}`,
              debit: 0,
              credit: valNum,
              balance: prevBal - valNum,
              notes: `[TreasuryEntry#${treasuryEntry.id}][Payment#${payment.id}]`,
            },
          });
        } else if (doc.kind === "SETTLEMENT" && doc.partner) {
          const lastTx = await tx.supplierTransaction.findFirst({
            where: { supplierName: doc.partner.name },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          });
          const prevBal = lastTx ? Number(lastTx.balance || 0) : 0;
          await tx.supplierTransaction.create({
            data: {
              supplierName: doc.partner.name,
              supplierId: doc.partner.id,
              date: input.date,
              documentNumber: input.reference || doc.number,
              description: `سداد وصرف من الخزينة - مستند ${doc.number}`,
              debit: valNum,
              credit: 0,
              balance: prevBal - valNum,
              notes: `[TreasuryEntry#${treasuryEntry.id}][Payment#${payment.id}]`,
            },
          });
        }

        if (paid.plus(value).equals(doc.total))
          await tx.financeDocument.update({
            where: { id: doc.id },
            data: { status: "PAID" },
          });
        await audit(tx, req, "PAYMENT", "document", doc.id, input);
        return payment;
      }),
    );
  }),
);

router.post(
  "/users/scope",
  wrap(async (req, res) => {
    permit(req, ["ADMIN"]);
    const data = z
      .object({
        userId: id,
        role: z.enum([
          "ADMIN",
          "OPERATIONS_MANAGER",
          "VIEWER",
          "ACCOUNTANT",
          "DRIVER",
          "CLIENT",
          "SUPPLIER",
        ]),
        clientScopeId: optionalId,
        partnerScopeId: optionalId,
        driverScopeId: optionalId,
      })
      .parse(req.body);
    if (['ADMIN','ACCOUNTANT','OPERATIONS_MANAGER','VIEWER'].includes(data.role)) {
      if(data.userId === req.user.userId) throw new ValidationError('Ask another administrator to change your own access.');
      await ensureDefaultRoles();
      return ok(res, await UserService.assignRole(data.userId, {roleId:data.role}, req.user));
    }
    if (data.userId === req.user.userId)
      throw new ValidationError(
        "Ask another administrator to change your own access.",
      );
    ok(
      res,
      await transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7632902)`;
        const originalUser=await tx.user.findUniqueOrThrow({where:{id:data.userId}});
        assertCanGrant(req.user,(await accessFor(originalUser,tx)).permissions);

        if (data.role === "CLIENT") {
          if (!data.clientScopeId)
            throw new ValidationError("Choose a client scope.");
          await tx.client.findUniqueOrThrow({
            where: { id: data.clientScopeId },
          });
        }
        if (data.role === "SUPPLIER") {
          if (!data.partnerScopeId)
            throw new ValidationError("Choose a supplier scope.");
          await tx.partner.findUniqueOrThrow({
            where: { id: data.partnerScopeId },
          });
        }
        if (data.role === "DRIVER") {
          if (!data.driverScopeId)
            throw new ValidationError("Choose a driver scope.");
          await tx.driver.findUniqueOrThrow({
            where: { id: data.driverScopeId },
          });
        }
        const row = await tx.user.update({
          where: { id: data.userId },
          data: {
            role: data.role,
            roleId: null,
            companyScopeEnabled: false,
            companyIds: [],
            clientScopeId: data.role === "CLIENT" ? data.clientScopeId : null,
            partnerScopeId:
              data.role === "SUPPLIER" ? data.partnerScopeId : null,
            driverScopeId: data.role === "DRIVER" ? data.driverScopeId : null,
            sessionVersion: { increment: 1 },
          },
          select: { id: true, email: true, role: true },
        });
        await preserveRoleAdministrators(tx);
        await audit(tx, req, "ACCESS", "user", row.id, data);
        return row;
      }),
    );
  }),
);
export default router;
