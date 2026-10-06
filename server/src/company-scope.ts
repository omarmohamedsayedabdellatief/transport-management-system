import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";
import { auditDatabase } from "./prisma.js";
import { ForbiddenError } from "./types/index.js";

// Request-local scope: never mutate a shared Prisma client or a global company filter.
export const companyScope = new AsyncLocalStorage<{
  companyIds: string[];
  routeIds: string[];
}>();
export function companyFilter(model: string): any {
  const scope = companyScope.getStore();
  if (!scope) return undefined;
  const client = { clientId: { in: scope.companyIds } };
  const vehicle = {
    OR: [
      { routes: { some: client } },
      { trips: { some: client } },
      { servicePlans: { some: { route: client } } },
      { contractVehicles: { some: { contract: client, isActive: true } } },
    ],
  };
  const driver = {
    OR: [
      { routes: { some: client } },
      { trips: { some: client } },
      { servicePlans: { some: { route: client } } },
      { assignedVehicle: vehicle },
    ],
  };
  const filters: Record<string, any> = {
    Client: { id: { in: scope.companyIds } },
    Route: client,
    Contract: client,
    Trip: client,
    Site: client,
    Passenger: client,
    ServicePlan: { route: client },
    Enrollment: { route: client, passenger: client },
    RouteRate: { route: client },
    RouteStop: { route: client },
    ContractVehicle: { contract: client },
    Vehicle: vehicle,
    Driver: driver,
    DriverDocument: { driver },
    MaintenanceRecord: { vehicle },
    Partner: {
      OR: [
        { routes: { some: client } },
        { trips: { some: client } },
        { passengers: { some: client } },
        { vehicles: { some: vehicle } },
        { drivers: { some: driver } },
      ],
    },
    TripPassenger: { trip: client },
    TripEvent: { trip: client },
    AuditEvent: {
      action: "EXCLUDE_DAILY_TEMPLATE",
      entityId: { in: scope.routeIds },
    },
    FinanceDocument: { id: { in: [] } },
    Payment: { id: { in: [] } },
  };
  return filters[model];
}
const models = new Map(
  Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
);
function scopeSelection(model: string, args: any) {
  for (const key of ["include", "select"]) {
    if (!args[key]) continue;
    const selection = { ...args[key] };
    args[key] = selection;
    for (const field of models.get(model)?.fields || []) {
      if (field.kind !== "object" || !selection[field.name]) continue;
      const child =
        selection[field.name] === true ? {} : { ...selection[field.name] };
      const filter = companyFilter(field.type);
      if (field.isList && filter)
        child.where = { AND: [child.where || {}, filter] };
      scopeSelection(field.type, child);
      selection[field.name] = child;
    }
    if (selection._count) {
      const count =
        selection._count === true
          ? { select: {} }
          : { ...selection._count, select: { ...selection._count.select } };
      for (const field of models.get(model)?.fields || []) {
        if (!field.isList || field.kind !== "object") continue;
        if (selection._count !== true && !count.select[field.name]) continue;
        const filter = companyFilter(field.type);
        count.select[field.name] = filter
          ? { where: { AND: [count.select[field.name]?.where || {}, filter] } }
          : true;
      }
      selection._count = count;
    }
  }
}
function hideForeignClients(model: string, result: any): any {
  if (Array.isArray(result))
    return result.map((row) => hideForeignClients(model, row)).filter(Boolean);
  if (!result || typeof result !== "object") return result;
  if (
    model === "Client" &&
    result.id &&
    !companyScope.getStore()!.companyIds.includes(result.id)
  )
    return null;
  for (const field of models.get(model)?.fields || []) {
    if (field.kind === "object" && result[field.name])
      result[field.name] = hideForeignClients(field.type, result[field.name]);
  }
  return result;
}
const reads = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);
// Scope constrains the rows and their references; endpoint permissions decide which actions are allowed.
const createParents: Record<string, string[]> = {
  Trip: ["clientId", "routeId"],
  Route: ["clientId"],
  Contract: ["clientId"],
  Site: ["clientId"],
  Passenger: ["clientId"],
  ServicePlan: ["routeId"],
  Enrollment: ["routeId", "passengerId"],
  RouteRate: ["routeId"],
  RouteStop: ["routeId"],
  ContractVehicle: ["contractId"],
  DriverDocument: ["driverId"],
  MaintenanceRecord: ["vehicleId"],
  TripPassenger: ["tripId"],
  TripEvent: ["tripId"],
};
async function validateWrite(model: string, operation: string, data: any) {
  if (model === "AuditEvent" && operation === "create") return; // Server-generated event, never a public CRUD endpoint.
  if (!companyFilter(model) || ["FinanceDocument", "Payment"].includes(model))
    throw new ForbiddenError("هذا الإجراء يحتاج نطاق كل الشركات.");
  if (
    ![
      "create",
      "createMany",
      "update",
      "updateMany",
      "delete",
      "deleteMany",
    ].includes(operation)
  )
    throw new ForbiddenError();
  for (const row of Array.isArray(data) ? data : [data || {}]) {
    if (
      operation.startsWith("create") &&
      (!createParents[model] || createParents[model].some((k) => !row[k]))
    )
      throw new ForbiddenError("يجب ربط السجل بإحدى الشركات المعينة لك.");
    for (const field of models.get(model)?.fields || []) {
      if (field.kind !== "object") continue;
      if (row[field.name]) {
        // A route's stops are children of that already-scoped route. Other nested writes must use their own endpoint.
        if (!(
          model === "Route" &&
          field.name === "stops" &&
          Object.keys(row[field.name]).every((k) =>
            ["create", "createMany", "deleteMany"].includes(k),
          )
        ))
          throw new ForbiddenError(
            "استخدم الحقول المباشرة لربط السجلات داخل نطاق شركاتك.",
          );
      }
      for (const key of field.relationFromFields || []) {
        if (row[key] == null) continue;
        const id = typeof row[key] === "object" ? row[key].set : row[key];
        const filter = companyFilter(field.type);
        if (!filter) continue;
        const delegate = (auditDatabase as any)[
          field.type[0].toLowerCase() + field.type.slice(1)
        ];
        if (
          !id ||
          !(await delegate.findFirst({
            where: { AND: [{ id }, filter] },
            select: { id: true },
          }))
        )
          throw new ForbiddenError(
            "السجل المرتبط خارج نطاق الشركات المعينة لك.",
          );
      }
    }
  }
}
export const companyScopeExtension = Prisma.defineExtension({
  name: "regular-user-companies",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!companyScope.getStore()) return query(args);
        const filter = companyFilter(model);
        if (!reads.has(operation))
          await validateWrite(model, operation, (args as any).data);
        const scoped: any = { ...args };
        if (filter && !operation.startsWith("create"))
          scoped.where = {
            ...(scoped.where || {}),
            AND: [scoped.where || {}, filter],
          };
        if (scoped.include) scoped.include = { ...scoped.include };
        if (scoped.select) scoped.select = { ...scoped.select };
        scopeSelection(model, scoped);
        return hideForeignClients(model, await query(scoped));
      },
    },
  },
});
