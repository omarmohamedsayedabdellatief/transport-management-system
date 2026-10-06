import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { auditDatabase } from "../prisma.js";
import { verifyAccessToken, verifyRefreshToken } from "../utils/jwt.js";

const secretKey =
  /password|passwd|token|secret|authorization|cookie|credential|api.?key|fileContent|base64/i;
export function safeAuditValue(value: any, depth = 0): any {
  if (depth > 12) return "[nested data omitted]";
  if (value === undefined) return null;
  if (value === null || typeof value === "number" || typeof value === "boolean")
    return value;
  if (typeof value === "string")
    return value.length > 12000
      ? value.slice(0, 12000) + "… [truncated]"
      : value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value.length > 200
      ? {
          items: value.slice(0, 200).map((v) => safeAuditValue(v, depth + 1)),
          omittedCount: value.length - 200,
        }
      : value.map((v) => safeAuditValue(v, depth + 1));
  if (typeof value === "object") {
    if (typeof value.toJSON === "function")
      return safeAuditValue(value.toJSON(), depth + 1);
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !secretKey.test(key))
        .map(([key, item]) => [key, safeAuditValue(item, depth + 1)]),
    );
  }
  return String(value);
}
const resources: Record<string, string> = {
  users: "user",
  roles: "appRole",
  clients: "client",
  contracts: "contract",
  routes: "route",
  vehicles: "vehicle",
  drivers: "driver",
  trips: "trip",
  partners: "partner",
  maintenance: "maintenanceRecord",
  sites: "site",
  passengers: "passenger",
  enrollments: "enrollment",
  plans: "servicePlan",
  documents: "financeDocument",
  operations: "dailyOperation",
  overtime: "driverOvertime",
  expenses: "expense",
  installments: "installment",
  "staff-payroll": "staffPayroll",
  payroll: "staffPayroll",
  "supplier-transactions": "supplierTransaction",
  "client-transactions": "clientTransaction",
  "billing-types": "tripBillingType",
  "vehicle-types": "vehicleCategory",
};
function identify(req: Request) {
  const path = req.path.replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  let index = 0;
  if (["accounting", "configuration", "operations"].includes(parts[0])) index++;
  if (parts[index] === "records") index++;
  const resource = parts[index] || parts[0] || "system";
  const rawId = parts[index + 1];
  const entityId =
    rawId && (/^[0-9a-f-]{36}$/i.test(rawId) || ["vehicle-types","roles"].includes(resource))
      ? rawId
      : null;
  let action =
    (
      {
        GET: "VIEW",
        HEAD: "VIEW",
        POST: "CREATE",
        PUT: "UPDATE",
        PATCH: "UPDATE",
        DELETE: "DELETE",
      } as any
    )[req.method] || req.method;
  if (path === "/auth/login") action = "LOGIN";
  else if (path === "/auth/logout") action = "LOGOUT";
  else if (path.includes("/export/")) action = "EXPORT";
  else if (path.includes("generate")) action = "GENERATE";
  else if (path.endsWith("/companies") || path.endsWith("/scope"))
    action = "ACCESS";
  else if (path.endsWith("/status")) action = "STATUS";
  else if (/\/(pay|payments|pay-supplier|record-receipt)$/.test(path))
    action = "PAYMENT";
  else if (path.endsWith("/deduct")) action = "DEDUCTION";
  else if (path.endsWith("/collect")) action = "PAYMENT";
  else if (path.endsWith("/transfers")) action = "TRANSFER";
  else if (path.endsWith("/close")) action = "CLOSE";
  else if (path.endsWith("/reopen")) action = "REOPEN";
  else if (path.endsWith("/import")) action = "IMPORT";
  else if (path.endsWith("/incident")) action = "INCIDENT";
  else if (/\/attendance(-batch)?$/.test(path)) action = "ATTENDANCE";
  else if (path.endsWith("/manifest")) action = "REFRESH_MANIFEST";
  else if (path.endsWith("/replace")) action = "REPLACE";
  else if (path.endsWith("/issue")) action = "ISSUE";
  else if (path.endsWith("/discard")) action = "DISCARD";
  else if (path.endsWith("/check-conflict")) action = "CHECK";
  return {
    path,
    action,
    entity: resource,
    entityId,
    model: resources[resource],
  };
}

// A durable pending entry exists before the handler runs. If the process stops,
// the owner can see the unfinished attempt instead of silently losing the action.
export async function recordActivity(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (
    req.method === "OPTIONS" ||
    ["/auth/me", "/auth/refresh"].includes(req.path)
  )
    return next();
  const target = identify(req),
    mutating = !["GET", "HEAD"].includes(req.method);
  let actor: any = null;
  try {
    const bearer =
      target.action === "LOGIN" ? undefined : req.headers.authorization;
    const payload = bearer?.startsWith("Bearer ")
      ? verifyAccessToken(bearer.slice(7))
      : req.path === "/auth/logout" && req.cookies?.refreshToken
        ? verifyRefreshToken(req.cookies.refreshToken)
        : null;
    if (payload) {
      const user = await auditDatabase.user.findUnique({
        where: { id: payload.userId },
      });
      if (
        user?.status === "ACTIVE" &&
        user.sessionVersion === (payload.sessionVersion ?? 0)
      )
        actor = { id: user.id, fullName: user.fullName, email: user.email };
    }
  } catch {
    /* Authentication middleware owns the access decision. */
  }
  let before: any = null;
  try {
    if (mutating && actor && target.model && target.entityId)
      before = await (auditDatabase as any)[target.model].findUnique({
        where: {
          [target.model === "vehicleCategory" ? "code" : "id"]: target.entityId,
        },
        ...(target.model === "route" && target.path.endsWith("/rates")
          ? { include: { rates: true } }
          : {}),
      });
    before = safeAuditValue(before);
    const request = {
      body: safeAuditValue(req.body),
      query: safeAuditValue(req.query),
    };
    const entry = await auditDatabase.activityLog.create({
      data: {
        id: randomUUID(),
        actorId: actor?.id || null,
        actorName: actor?.fullName || "غير مسجل الدخول",
        actorEmail:
          actor?.email ||
          (target.action === "LOGIN"
            ? String(req.body?.email || "").slice(0, 254)
            : null),
        action: target.action,
        entity: target.entity,
        entityId: target.entityId,
        method: req.method,
        path: target.path,
        detail: JSON.stringify({ request, before }),
      },
    });
    res.locals.activityId = entry.id;
    let responseBody: any;
    const json = res.json.bind(res),
      end = res.end.bind(res);
    res.json = ((body: any) => {
      responseBody = body;
      return json(body);
    }) as any;
    let ending = false;
    const finish = async (aborted = false) => {
      const user = (req as any).user;
      const loginUser =
        target.action === "LOGIN" && res.statusCode < 400
          ? responseBody?.data?.user
          : null;
      const who =
        loginUser ||
        (user
          ? { id: user.userId, fullName: user.fullName, email: user.email }
          : actor);
      const success = !aborted && res.statusCode < 400;
      await auditDatabase.activityLog.update({
        where: { id: entry.id },
        data: {
          actorId: who?.id || entry.actorId,
          actorName: who?.fullName || entry.actorName,
          actorEmail: who?.email || entry.actorEmail,
          entityId:
            target.entityId ||
            (success
              ? responseBody?.data?.id || responseBody?.data?.code || null
              : null),
          outcome: aborted ? "ABORTED" : success ? "SUCCESS" : "FAILED",
          statusCode: res.statusCode,
          completedAt: new Date(),
          detail: JSON.stringify({
            request,
            before,
            ...(mutating && success
              ? {
                  after:
                    target.action === "DELETE"
                      ? null
                      : safeAuditValue(responseBody?.data),
                }
              : {}),
            ...(!success
              ? {
                  error: safeAuditValue(
                    responseBody?.error || {
                      message: "Connection closed before completion.",
                    },
                  ),
                }
              : {}),
          }),
        },
      });
    };
    res.end = ((...args: any[]) => {
      if (ending) return res;
      ending = true;
      void finish()
        .catch((error) => {
          console.error(
            "Activity finalization failed; pending entry retained",
            entry.id,
            error?.code,
          );
        })
        .finally(() => (end as any)(...args));
      return res;
    }) as any;
    res.once("close", () => {
      if (!ending) {
        ending = true;
        void finish(true).catch(() => {});
      }
    });
    next();
  } catch (error) {
    next(error);
  }
}
