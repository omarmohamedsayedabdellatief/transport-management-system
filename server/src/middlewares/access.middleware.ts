import {
  isInternal,
  isTreasuryOwner,
  hasPermission,
  requiredPermission,
} from "../modules/roles/permissions.js";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest, ForbiddenError } from "../types/index.js";

// Applied to serialized JSON, including nested route/contract/vehicle relations.
const financialKey =
  /importMetadata|amount|price|cost|allowance|salary|revenue|profit|margin|receivable|payable|balance|payment|invoice|settlement|expense|payroll|deduction|advance|penalt|commission|tax|monthlyValue|saleRate|supplierRate|bank|cheque|treasury|financial|financials/i;
export function withoutFinancials(value: any): any {
  if (Array.isArray(value)) return value.map(withoutFinancials);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !financialKey.test(key))
      .map(([key, item]) => [key, withoutFinancials(item)]),
  );
}
const moneyInputs = new Set([
  "clientPricePerTrip",
  "supplierCostPerTrip",
  "driverTripAllowance",
  "vehicleRentalCost",
  "saleAmount",
  "costAmount",
  "driverAllowance",
  "vehicleCost",
  "saleRate",
  "supplierRate",
  "monthlyAmount",
  "billingModel",
  "billToClientId",
]);
function hasMoneyInput(value: any): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, v]) => moneyInputs.has(key) || hasMoneyInput(v),
  );
}
export function enforceAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!isInternal(req.user)) {
    if (req.path.startsWith("/operations/") || req.path.startsWith("/auth/"))
      return next();
    return next(new ForbiddenError("Use your assigned portal."));
  }
  if (!hasPermission(req.user, "finance.view")) {
    const json = res.json.bind(res);
    res.json = (body: any) =>
      json(withoutFinancials(JSON.parse(JSON.stringify(body))));
  }
  if (
    req.user?.companyScopeEnabled &&
    /^\/(accounting|users|roles|operations\/(billing|documents|treasury|analytics|audit|users|records\/(expenses|payroll|installments)))(\/|$)/i.test(
      req.path,
    )
  )
    return next(
      new ForbiddenError("الحسابات والإدارة العامة تحتاج نطاق كل الشركات."),
    );
  if (
    !isTreasuryOwner(req.user) &&
    (/^\/accounting\/treasury\/(accounts|transfers|adjustments)(\/|$)/i.test(
      req.path,
    ) ||
      /^\/operations\/treasury(\/|$)/i.test(req.path))
  )
    return next(
      new ForbiddenError(
        "أرصدة الخزينة وكشوفها وإدارة حساباتها متاحة للمالك فقط.",
      ),
    );
  const required = requiredPermission(req.path, req.method);
  if (!required.some((p) => hasPermission(req.user, p)))
    return next(new ForbiddenError("ليس لديك صلاحية تنفيذ هذا الإجراء."));
  const path = req.path.toLowerCase().replace(/\/+$/, "");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (
      /^\/vehicles\/[^/]+$/.test(path) &&
      !hasPermission(req.user, "vehicles.edit") &&
      Object.keys(req.body).some((k) => k !== "vehicleType")
    )
      return next(new ForbiddenError("صلاحيتك تسمح بتعديل نوع السيارة فقط."));
    if (
      /^\/(trips|routes)(\/|$)/.test(path) &&
      !hasPermission(req.user, "pricing.manage") &&
      hasMoneyInput(req.body)
    )
      return next(
        new ForbiddenError("تعديل الأسعار يحتاج صلاحية تعديل الأسعار."),
      );
    if (
      path === "/operations/resources/supplier" &&
      !hasPermission(
        req.user,
        req.body.resource === "vehicle" ? "vehicles.edit" : "drivers.edit",
      )
    )
      return next(new ForbiddenError());
  }
  req.permissionAuthorized = true;
  next();
}
