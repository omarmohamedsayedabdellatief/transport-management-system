import { createHash, randomUUID } from "node:crypto";
import XLSX from "xlsx";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "../../types/index.js";
import { hasPermission } from "../roles/permissions.js";
import { dateOnly, zonedDeparture } from "../operations/operations.logic.js";
import { prepareTrip } from "./trip-pricing.js";
import { TripConflictEngine } from "./trip.conflict-engine.js";
import { AccountingService } from "../accounting/accounting.service.js";
import { driverSettlements } from "../accounting/driver-settlements.js";
import {
  readFile,
  normalize,
  digits,
  text,
  excelDate,
  excelTime,
  money,
  moneyFields,
  fields,
} from "./trip-excel.parser.js";

export const importSchema = z.object({
  fileContent: z.string().min(4).max(1400000),
  fileName: z.string().max(200),
  sheet: z.string().max(100).optional(),
  headerRow: z.number().int().min(1).max(50).optional(),
  mapping: z.record(z.string()).optional(),
  startDate: z.string(),
  endDate: z.string(),
  companyIds: z.array(z.string()).max(100).default([]),
  newCompanies: z.array(z.string().min(1).max(200)).max(100).default([]),
  mode: z.enum(["MERGE", "REPLACE"]).default("MERGE"),
  dateOrder: z.enum(["DMY", "MDY"]).default("DMY"),
  allowEmpty: z.boolean().default(false),
  overrides: z
    .record(
      z.object({
        driverId: z.string().optional(),
        vehicleId: z.string().optional(),
        companyId: z.string().optional(),
        routeId: z.string().optional(),
        saleAmount: z.number().nonnegative().max(9999999999.99).optional(),
        costAmount: z.number().nonnegative().max(9999999999.99).optional(),
        driverAllowance: z.number().nonnegative().max(9999999999.99).optional(),
        vehicleCost: z.number().nonnegative().max(9999999999.99).optional(),
      }),
    )
    .default({}),
});
export type ImportInput = z.infer<typeof importSchema>;
export const canImport = (user: any) =>
  !user?.companyScopeEnabled &&
  [
    "trips.view",
    "trips.create",
    "trips.edit",
    "trips.delete",
    "finance.view",
    "pricing.manage",
    "accounting.manage",
  ].every((p) => hasPermission(user, p));
export function assertImport(user: any) {
  if (!canImport(user))
    throw new ForbiddenError(
      "استيراد واستبدال Excel يحتاج صلاحيات إدارة الرحلات والأسعار والحسابات ونطاق كل الشركات.",
    );
}
const json = (v: any) => JSON.parse(JSON.stringify(v));
const hash = (v: any) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const day = (d: Date) => d.toISOString().slice(0, 10);
const clock = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
const cairoDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
function range(input: { startDate: string; endDate: string }) {
  const start = dateOnly(input.startDate),
    end = dateOnly(input.endDate);
  if (end < start || (Number(end) - Number(start)) / 86400000 > 366)
    throw new ValidationError("اختر نطاقًا صحيحًا لا يتجاوز 367 يومًا.");
  return { gte: start, lte: end };
}
function unique(items: any[], value: string, label: string, key: string) {
  const found = items.filter((x) => normalize(x[key]) === normalize(value));
  if (found.length > 1)
    throw new ValidationError(
      `${label} «${value}» مكرر؛ اختر السجل الصحيح في ربط الصف.`,
    );
  return found[0];
}
function checkPermission(user: any, p: string) {
  if (!hasPermission(user, p))
    throw new ForbiddenError(`إنشاء البيانات الناقصة يحتاج صلاحية ${p}.`);
}

export async function inspectExcel(input: any) {
  const parsed = readFile(
    input.fileContent,
    input.sheet,
    input.headerRow,
    input.mapping,
  );
  return {
    ...parsed,
    fields: Object.entries(fields).map(([key, aliases]) => ({
      key,
      label: aliases[0],
    })),
    rows: parsed.data.length,
  };
}

async function snapshot(db: any, input: ImportInput) {
  const trips = await db.trip.findMany({
    where: { clientId: { in: input.companyIds }, tripDate: range(input) },
    include: { financeLines: true, manifest: true, events: true },
    orderBy: { id: "asc" },
  });
  if (trips.length > 1000)
    throw new ValidationError(
      "نطاق الاستبدال يحتوي أكثر من 1000 رحلة؛ استخدم نطاقًا أصغر.",
    );
  const tags = trips.map((t: any) => ({
    notes: { contains: `[Trip#${t.id}]` },
  }));
  const [
    operations,
    clientsLedger,
    suppliersLedger,
    clients,
    routes,
    drivers,
    vehicles,
    types,
    categories,
  ] = await Promise.all([
    tags.length
      ? db.dailyOperation.findMany({
          where: { OR: tags },
          orderBy: { id: "asc" },
        })
      : [],
    tags.length
      ? db.clientTransaction.findMany({
          where: { OR: tags },
          orderBy: { id: "asc" },
        })
      : [],
    tags.length
      ? db.supplierTransaction.findMany({
          where: { OR: tags },
          orderBy: { id: "asc" },
        })
      : [],
    db.client.findMany({ orderBy: { id: "asc" } }),
    db.route.findMany({
      include: { rates: { orderBy: { id: "asc" } } },
      orderBy: { id: "asc" },
    }),
    db.driver.findMany({ orderBy: { id: "asc" } }),
    db.vehicle.findMany({ orderBy: { id: "asc" } }),
    db.tripBillingType.findMany({ orderBy: { id: "asc" } }),
    db.vehicleCategory.findMany({ orderBy: { code: "asc" } }),
  ]);
  return json({
    trips,
    operations,
    clientsLedger,
    suppliersLedger,
    clients,
    routes,
    drivers,
    vehicles,
    types,
    categories,
  });
}
class PreviewRollback extends Error {
  constructor(public preview: any) {
    super("PREVIEW_ROLLBACK");
  }
}

async function run(
  db: any,
  input: ImportInput,
  user: any,
  expectedFingerprint?: string,
) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
  const before = await snapshot(db, input),
    fingerprint = hash(before);
  if (expectedFingerprint && fingerprint !== expectedFingerprint)
    throw new ConflictError(
      "تغيرت الرحلات أو بيانات الربط بعد المعاينة. أعد المعاينة قبل الحفظ.",
    );
  const parsed = readFile(
    input.fileContent,
    input.sheet,
    input.headerRow,
    input.mapping,
  );
  for (const key of ["date", "company", "route", "direction", "departure"])
    if (!parsed.mapping[key])
      throw new ValidationError(
        `اربط عمود ${fields[key as keyof typeof fields][0]}.`,
      );
  if (!input.companyIds.length && !input.newCompanies.length)
    throw new ValidationError("اختر الشركات التي ستتأثر بالاستيراد.");
  if (
    input.companyIds.some((id) => !before.clients.some((c: any) => c.id === id))
  )
    throw new ValidationError("شركة مختارة غير موجودة.");
  const creations: { companies: string[]; routes: string[]; rates: string[] } =
    { companies: [], routes: [], rates: [] };
  const warnings: string[] = [],
    plans: any[] = [],
    used = new Set<string>(),
    identities = new Set<string>();
  const clients = [...before.clients],
    routes = [...before.routes];
  let skipped = 0;
  for (const source of parsed.data) {
    try {
      const v = (key: string) => source.cells[parsed.mapping[key]],
        override = input.overrides[String(source.row)] || {};
      const date = excelDate(v("date"), input.dateOrder, parsed.date1904);
      if (date < input.startDate || date > input.endDate) {
        skipped++;
        continue;
      }
      if (text(v("count")) && Number(digits(v("count"))) !== 1)
        throw new ValidationError(
          "كل صف يمثل رحلة واحدة؛ افصل الرحلات إذا كان العدد أكبر من 1.",
        );
      const company = text(v("company")),
        routeName = text(v("route"));
      if (!company || !routeName)
        throw new ValidationError("اسم الشركة والخط مطلوبان.");
      let client = override.companyId
        ? clients.find((c) => c.id === override.companyId)
        : unique(clients, company, "الشركة", "companyName");
      if (!client) {
        if (
          !input.newCompanies.some((n) => normalize(n) === normalize(company))
        )
          throw new ValidationError(
            `الشركة «${company}» غير موجودة. فعّل إنشاءها أو اربطها بشركة موجودة.`,
          );
        checkPermission(user, "clients.create");
        client = await db.client.create({
          data: {
            companyName: company,
            contactPerson: "",
            phone: "",
            email: "",
            address: "",
            notes: "أُنشئت من Excel؛ بيانات الاتصال غير مكتملة.",
          },
        });
        clients.push(client);
        creations.companies.push(company);
      } else if (
        !input.companyIds.includes(client.id) &&
        !creations.companies.includes(client.companyName)
      )
        throw new ValidationError(
          `الشركة «${client.companyName}» خارج النطاق المختار.`,
        );
      if (client.status !== "ACTIVE")
        throw new ValidationError("الشركة غير نشطة.");
      const directionMap: Record<string, string> = {
        outbound: "OUTBOUND",
        return: "RETURN",
        ذهاب: "OUTBOUND",
        عوده: "RETURN",
      };
      const direction = directionMap[normalize(v("direction"))];
      if (!direction)
        throw new ValidationError("الاتجاه يجب أن يكون ذهاب أو عودة.");
      const departure = excelTime(
        v("departure"),
        normalize(parsed.mapping.departure) === "س" ? v("period") : undefined,
      );
      const typeName = text(v("billingType"));
      const type = typeName
        ? unique(before.types, typeName, "نوع الفوترة", "name")
        : before.types.find((t: any) => t.active && t.direction === direction);
      if (!type || !type.active || type.direction !== direction)
        throw new ValidationError(
          "نوع الفوترة غير موجود أو لا يطابق الاتجاه؛ اضبطه في الإعدادات.",
        );
      let route = override.routeId
        ? routes.find((r) => r.id === override.routeId)
        : unique(
            routes.filter((r) => r.clientId === client.id),
            routeName,
            "الخط",
            "routeName",
          );
      if (override.routeId && !route)
        throw new ValidationError("الخط المختار غير موجود.");
      if (route && (route.clientId !== client.id || !route.isActive))
        throw new ValidationError("الخط غير نشط أو تابع لشركة أخرى.");
      let driver = override.driverId
        ? before.drivers.find((d: any) => d.id === override.driverId)
        : text(v("driver"))
          ? unique(before.drivers, text(v("driver")), "السائق", "fullName")
          : before.drivers.find((d: any) => d.id === route?.defaultDriverId);
      let vehicle = override.vehicleId
        ? before.vehicles.find((x: any) => x.id === override.vehicleId)
        : text(v("plate"))
          ? unique(before.vehicles, text(v("plate")), "اللوحة", "plateNumber")
          : before.vehicles.find(
              (x: any) =>
                x.id === (driver?.assignedVehicleId || route?.defaultVehicleId),
            );
      if (!driver && vehicle && !text(v("driver")))
        driver = before.drivers.find(
          (d: any) => d.assignedVehicleId === vehicle.id,
        );
      if (!driver || !vehicle)
        throw new ValidationError(
          "اختر سائقًا وسيارة موجودين. لا يمكن إنشاء بيانات الرخص والهويات من أسماء فقط.",
        );
      if (driver.employmentStatus !== "ACTIVE")
        throw new ValidationError("السائق غير نشط.");
      const category = text(v("vehicleType"));
      if (category) {
        const known = before.categories.find(
          (c: any) =>
            normalize(c.name) === normalize(category) ||
            normalize(c.code) === normalize(category),
        );
        if (!known || known.code !== vehicle.vehicleType)
          warnings.push(
            `صف ${source.row}: نوع السيارة في الملف «${category}»؛ سيتم استخدام نوع السيارة المختارة «${vehicle.vehicleType}».`,
          );
      }
      let arrivalDate = text(v("arrivalDate"))
        ? excelDate(v("arrivalDate"), input.dateOrder, parsed.date1904)
        : date;
      let arrival: string;
      if (text(v("arrival"))) arrival = excelTime(v("arrival"));
      else if (route) {
        const end = new Date(
          zonedDeparture(date, departure, "Africa/Cairo").getTime() +
            route.estimatedDurationMin * 60000,
        );
        arrival = clock(end);
        arrivalDate = cairoDate(end);
        warnings.push(`صف ${source.row}: وقت الوصول من مدة الخط.`);
      } else throw new ValidationError("وقت الوصول مطلوب لإنشاء خط جديد.");
      if (!text(v("arrivalDate")) && arrival <= departure)
        arrivalDate = day(new Date(Number(dateOnly(date)) + 86400000));
      const start = zonedDeparture(date, departure, "Africa/Cairo"),
        end = zonedDeparture(arrivalDate, arrival, "Africa/Cairo");
      const duration = (Number(end) - Number(start)) / 60000;
      if (duration <= 0 || duration > 1440)
        throw new ValidationError(
          "مدة الرحلة يجب أن تكون أكبر من صفر ولا تتجاوز 24 ساعة.",
        );
      const prices: any = {};
      for (const key of moneyFields)
        prices[key] = money(override[key] ?? v(key));
      if (!route) {
        checkPermission(user, "routes.create");
        if (!text(v("from")) || !text(v("to")))
          throw new ValidationError("من وإلى مطلوبان لإنشاء الخط.");
        if (moneyFields.some((k) => prices[k] === undefined))
          throw new ValidationError(
            "أدخل أسعار الخط الجديد الأربعة صراحةً، بما فيها الصفر إن لم توجد تكلفة.",
          );
        route = await db.route.create({
          data: {
            clientId: client.id,
            routeName,
            startLocation: text(v("from")),
            finalDestination: text(v("to")),
            estimatedDistanceKm: 0,
            estimatedDurationMin: duration,
            clientPricePerTrip: prices.saleAmount,
            supplierCostPerTrip: prices.costAmount,
            driverTripAllowance: prices.driverAllowance,
            vehicleRentalCost: prices.vehicleCost,
            executionType: vehicle.supplierId ? "SUPPLIER" : "COMPANY",
            supplierId: vehicle.supplierId,
            defaultDriverId: driver.id,
            defaultVehicleId: vehicle.id,
          },
        });
        route.rates = [];
        routes.push(route);
        creations.routes.push(`${client.companyName} / ${routeName}`);
      } else if (
        (text(v("from")) &&
          normalize(v("from")) !== normalize(route.startLocation)) ||
        (text(v("to")) &&
          normalize(v("to")) !== normalize(route.finalDestination))
      )
        warnings.push(
          `صف ${source.row}: نقاط الخط الحالية محفوظة؛ عدّل الخط من شاشة الخطوط لتغييرها.`,
        );
      if (!route.rates.some((r: any) => r.billingTypeId === type.id)) {
        checkPermission(user, "pricing.manage");
        if (moneyFields.some((k) => prices[k] === undefined))
          throw new ValidationError(
            "هذا الاتجاه ليس له تسعير على الخط؛ أدخل الأسعار الأربعة لإنشائه.",
          );
        const rate = await db.routeRate.create({
          data: {
            routeId: route.id,
            billingTypeId: type.id,
            departureTime: departure,
            ...prices,
          },
        });
        route.rates.push(rate);
        creations.rates.push(`${routeName} / ${type.name}`);
      }
      const key = [
        client.id,
        route.id,
        date,
        start.toISOString(),
        direction,
        vehicle.id,
        driver.id,
      ].join("|");
      if (identities.has(key))
        throw new ValidationError(
          "رحلة مكررة داخل الملف (نفس الخط والمواعيد والسيارة والسائق).",
        );
      identities.add(key);
      let old: any;
      if (text(v("tripId"))) {
        old = before.trips.find((t: any) => t.id === text(v("tripId")));
        if (!old)
          throw new ValidationError(
            "معرف الرحلة غير موجود داخل الشركة ونطاق التاريخ المختارين.",
          );
      } else if (text(v("tripNumber"))) {
        old = before.trips.find(
          (t: any) => t.tripNumber === text(v("tripNumber")),
        );
        if (!old)
          throw new ValidationError(
            "رقم الرحلة غير موجود داخل النطاق. اتركه فارغًا للرحلات الجديدة.",
          );
      } else
        old = before.trips.find(
          (t: any) =>
            [
              t.clientId,
              t.routeId,
              t.tripDate.slice(0, 10),
              t.scheduledDeparture,
              t.direction,
              t.vehicleId,
              t.driverId,
            ].join("|") === key,
        );
      if (old && used.has(old.id))
        throw new ValidationError("نفس معرف الرحلة مستخدم في أكثر من صف.");
      if (old) used.add(old.id);
      const statuses: Record<string, string> = {
        scheduled: "SCHEDULED",
        مجدوله: "SCHEDULED",
        completed: "COMPLETED",
        مكتمله: "COMPLETED",
        cancelled: "CANCELLED",
        ملغاه: "CANCELLED",
        delayed: "DELAYED",
        متاخره: "DELAYED",
      };
      const status = text(v("status"))
        ? statuses[normalize(v("status"))]
        : old?.tripStatus || "SCHEDULED";
      if (!status || status === "IN_PROGRESS")
        throw new ValidationError(
          "استخدم حالة مجدولة أو مكتملة أو ملغاة أو متأخرة. لا يمكن استيراد رحلة جارية.",
        );
      const shiftMap: Record<string, string> = {
        morning: "MORNING",
        afternoon: "AFTERNOON",
        night: "NIGHT",
        صباحي: "MORNING",
        مسائي: "AFTERNOON",
        ليلي: "NIGHT",
      };
      const shift = text(v("shift"))
        ? shiftMap[normalize(v("shift"))]
        : old?.shift ||
          (Number(departure.slice(0, 2)) < 12
            ? "MORNING"
            : Number(departure.slice(0, 2)) < 20
              ? "AFTERNOON"
              : "NIGHT");
      if (!shift) throw new ValidationError("الوردية غير صالحة.");
      const prepared = await prepareTrip(
        {
          clientId: client.id,
          routeId: route.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          tripDate: date,
          billingTypeId: type.id,
          direction,
          scheduledDeparture: start,
          expectedArrival: end,
          executionType: vehicle.supplierId ? "SUPPLIER" : "COMPANY",
          supplierId: vehicle.supplierId || null,
          ...Object.fromEntries(
            Object.entries(prices).filter(([, v]) => v !== undefined),
          ),
        },
        old ? { ...old, tripDate: new Date(old.tripDate) } : undefined,
        db,
      );
      const data = {
        ...prepared,
        tripStatus: status,
        shift,
        notes: parsed.mapping.notes ? text(v("notes")) : old?.notes || null,
      };
      const changed =
        !old ||
        Object.entries(json(data)).some(
          ([k, v]) => String(old[k] ?? "") !== String(v ?? ""),
        );
      plans.push({
        row: source.row,
        old,
        data,
        changed,
        metadata: {
          cells: Object.fromEntries(
            Object.entries(source.cells).filter(
              ([header]) => !Object.values(parsed.mapping).includes(header),
            ),
          ),
        },
        label: `${date} · ${client.companyName} · ${routeName}`,
        driverName: driver.fullName,
        plate: vehicle.plateNumber,
      });
    } catch (error: any) {
      throw new ValidationError(`صف ${source.row}: ${error.message}`, {
        row: source.row,
      });
    }
  }
  if (!plans.length && !(input.mode === "REPLACE" && input.allowEmpty))
    throw new ValidationError(
      "لا توجد رحلات داخل النطاق المختار. للحذف الكامل فعّل خيار النطاق الفارغ صراحةً.",
    );
  const deleted =
    input.mode === "REPLACE"
      ? before.trips.filter((t: any) => !used.has(t.id))
      : [];
  const changing = [
    ...deleted,
    ...plans.filter((p) => p.old && p.changed).map((p) => p.old),
  ];
  for (const trip of changing) {
    if (
      trip.tripStatus === "IN_PROGRESS" ||
      trip.financeLines.length ||
      trip.manifest.length ||
      trip.events.length
    )
      throw new ValidationError(
        `الرحلة ${trip.tripNumber} مرتبطة بفاتورة أو حضور أو سجل تشغيل أو جارية؛ لا يمكن استبدالها من Excel.`,
      );
    const ops = before.operations.filter((o: any) =>
      o.notes?.includes(`[Trip#${trip.id}]`),
    );
    if (
      ops.some(
        (o: any) =>
          Number(o.advancePayment) || Number(o.deduction) || Number(o.overtime),
      )
    )
      throw new ValidationError(
        `الرحلة ${trip.tripNumber} بها تسويات يدوية؛ راجع الحسابات أولًا.`,
      );
  }
  const changedDates = [
    ...changing.map((t) => t.tripDate.slice(0, 10)),
    ...plans.filter((p) => p.changed).map((p) => day(p.data.tripDate)),
  ];
  const closed = await db.financialPeriod.findMany({
    where: { status: "CLOSED" },
  });
  if (
    changedDates.some((d) =>
      closed.some(
        (p: any) =>
          p.year === Number(d.slice(0, 4)) && p.month === Number(d.slice(5, 7)),
      ),
    )
  )
    throw new ValidationError(
      "نطاق التعديل يتضمن فترة مالية مقفلة؛ أعد فتحها من الحسابات أولًا.",
    );
  const affectedDrivers = new Set([
    ...changing.map((t) => t.driverId),
    ...plans.filter((p) => p.changed).map((p) => p.data.driverId),
  ]);
  const periods = [...new Set(changedDates.map((d) => d.slice(0, 7)))];
  const settlementsBefore = new Map<string, any[]>();
  for (const period of periods)
    settlementsBefore.set(
      period,
      await driverSettlements(
        { year: Number(period.slice(0, 4)), month: Number(period.slice(5, 7)) },
        db,
      ),
    );
  // Temporarily exclude only changed trips from overlap checks; unchanged trips still block conflicts.
  if (changing.length)
    await db.trip.updateMany({
      where: { id: { in: changing.map((t) => t.id) } },
      data: { tripStatus: "CANCELLED" },
    });
  const touchedClients = new Set<string>(),
    touchedSuppliers = new Set<string>();
  for (const t of changing) {
    before.clientsLedger
      .filter((l: any) => l.notes?.includes(`[Trip#${t.id}]`))
      .forEach((l: any) => touchedClients.add(l.companyName));
    before.suppliersLedger
      .filter((l: any) => l.notes?.includes(`[Trip#${t.id}]`))
      .forEach((l: any) => touchedSuppliers.add(l.supplierName));
    await AccountingService.removeTripFromFinancials(t.id, db);
  }
  for (const t of deleted) await db.trip.delete({ where: { id: t.id } });
  for (const p of plans) {
    try {
      if (!p.changed) {
        await db.trip.update({
          where: { id: p.old.id },
          data: { importMetadata: p.metadata },
        });
        continue;
      }
      if (p.data.tripStatus !== "CANCELLED")
        await TripConflictEngine.validateTripAssignment(
          { ...p.data, excludeTripId: p.old?.id },
          db,
        );
      const trip = p.old
        ? await db.trip.update({
            where: { id: p.old.id },
            data: { ...p.data, importMetadata: p.metadata },
          })
        : await db.trip.create({
            data: {
              ...p.data,
              tripNumber: `TRIP-${input.startDate.replace(/-/g, "")}-${randomUUID().slice(0, 8)}`,
              importMetadata: p.metadata,
            },
          });
      if (trip.tripStatus === "COMPLETED") {
        await AccountingService.syncTripToFinancials(trip.id, db);
        const ct = await db.clientTransaction.findFirst({
          where: { notes: { contains: `[Trip#${trip.id}]` } },
        });
        if (ct) touchedClients.add(ct.companyName);
        const st = await db.supplierTransaction.findFirst({
          where: { notes: { contains: `[Trip#${trip.id}]` } },
        });
        if (st) touchedSuppliers.add(st.supplierName);
      }
    } catch (error: any) {
      throw new ValidationError(`صف ${p.row}: ${error.message}`, {
        row: p.row,
      });
    }
  }
  // Historical replacements must repair subsequent running balances, preserving all cash entries.
  for (const period of periods) {
    const after = await driverSettlements(
      { year: Number(period.slice(0, 4)), month: Number(period.slice(5, 7)) },
      db,
    );
    for (const balance of after) {
      const previous = settlementsBefore
        .get(period)
        ?.find((s) => s.driverName === balance.driverName);
      if (
        affectedDrivers.has(balance.driverId) &&
        balance.totalPaid + balance.totalInstallmentOffsets > 0 &&
        balance.netPayable < 0 &&
        balance.netPayable < (previous?.netPayable || 0)
      )
        throw new ValidationError(
          `التعديل يخفض أجر ${balance.driverName} عن المبالغ المصروفة أو أقساطه المسوّاة في ${period}. راجع تسويات السائق أولًا.`,
        );
    }
  }
  for (const companyName of touchedClients) {
    let balance = 0;
    for (const tx of await db.clientTransaction.findMany({
      where: { companyName },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    })) {
      balance =
        Math.round((balance + Number(tx.debit) - Number(tx.credit)) * 100) /
        100;
      await db.clientTransaction.update({
        where: { id: tx.id },
        data: { balance },
      });
    }
  }
  for (const supplierName of touchedSuppliers) {
    let balance = 0;
    for (const tx of await db.supplierTransaction.findMany({
      where: { supplierName },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    })) {
      balance =
        Math.round((balance + Number(tx.credit) - Number(tx.debit)) * 100) /
        100;
      await db.supplierTransaction.update({
        where: { id: tx.id },
        data: { balance },
      });
    }
  }
  const summary = {
    created: plans.filter((p) => !p.old).length,
    updated: plans.filter((p) => p.old && p.changed).length,
    unchanged: plans.filter((p) => !p.changed).length,
    deleted: deleted.length,
    skipped,
    creations,
    warnings: [...new Set(warnings)],
    rows: plans.map((p) => ({
      row: p.row,
      label: p.label,
      driver: p.driverName,
      plate: p.plate,
      action: !p.old ? "CREATE" : p.changed ? "UPDATE" : "KEEP",
      saleAmount: Number(p.data.saleAmount),
      driverAllowance: Number(p.data.driverAllowance),
      costAmount: Number(p.data.costAmount),
      vehicleCost: Number(p.data.vehicleCost),
      status: p.data.tripStatus,
    })),
    deletedTrips: deleted.map((t: any) => ({
      id: t.id,
      tripNumber: t.tripNumber,
      date: t.tripDate.slice(0, 10),
    })),
  };
  return { summary, before, fingerprint };
}
export async function previewExcel(raw: any, user: any) {
  assertImport(user);
  const input = importSchema.parse(raw);
  range(input);
  let preview: any;
  try {
    await prisma.$transaction(
      async (db) => {
        throw new PreviewRollback(await run(db, input, user));
      },
      { timeout: 90000, maxWait: 10000, isolationLevel: "Serializable" },
    );
  } catch (e) {
    if (e instanceof PreviewRollback) preview = e.preview;
    else throw e;
  }
  const batch = await prisma.tripImportBatch.create({
    data: {
      actorId: user.userId,
      payload: json(input),
      summary: json(preview.summary),
      beforeSnapshot: preview.before,
      fingerprint: preview.fingerprint,
      expiresAt: new Date(Date.now() + 30 * 60000),
    },
  });
  return { batchId: batch.id, expiresAt: batch.expiresAt, ...preview.summary };
}
export async function commitExcel(id: string, user: any) {
  assertImport(user);
  return prisma.$transaction(
    async (db) => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(7632901)`;
      const batch = await db.tripImportBatch.findUnique({ where: { id } });
      if (!batch || batch.actorId !== user.userId)
        throw new ForbiddenError("المعاينة تخص مستخدمًا آخر أو غير موجودة.");
      if (batch.status === "COMMITTED") return batch.result;
      if (batch.expiresAt < new Date())
        throw new ConflictError("انتهت المعاينة. أعد المعاينة.");
      const output = await run(
        db,
        importSchema.parse(batch.payload),
        user,
        batch.fingerprint,
      );
      const result = json({ batchId: id, ...output.summary });
      await db.tripImportBatch.update({
        where: { id },
        data: { status: "COMMITTED", committedAt: new Date(), result },
      });
      await db.auditEvent.create({
        data: {
          actorId: user.userId,
          action: "IMPORT_TRIPS_EXCEL",
          entity: "tripImportBatch",
          entityId: id,
          detail: JSON.stringify({
            fileName: (batch.payload as any).fileName,
            startDate: (batch.payload as any).startDate,
            endDate: (batch.payload as any).endDate,
            companyIds: (batch.payload as any).companyIds,
            created: result.created,
            updated: result.updated,
            deleted: result.deleted,
          }),
        },
      });
      return result;
    },
    { timeout: 90000, maxWait: 10000, isolationLevel: "Serializable" },
  );
}

export async function exportExcel(
  input: { startDate: string; endDate: string; companyIds: string[] },
  user: any,
) {
  const trips = await prisma.trip.findMany({
    where: { tripDate: range(input), clientId: { in: input.companyIds } },
    include: {
      client: true,
      route: true,
      driver: true,
      vehicle: true,
      billingType: true,
    },
    orderBy: [
      { tripDate: "asc" },
      { scheduledDeparture: "asc" },
      { id: "asc" },
    ],
    take: 1001,
  });
  if (trips.length > 1000)
    throw new ValidationError("التصدير بحد أقصى 1000 رحلة؛ اختر نطاقًا أصغر.");
  const financial = hasPermission(user, "finance.view");
  const headers = [
    "ملاحظات",
    "أسم السائق",
    "ذهاب/عودة",
    "إلى",
    "من",
    "نوع السيارة",
    "التاريخ",
    "الخط",
    "وقت البداية",
    "وقت الوصول",
    "تاريخ الوصول",
    "الشركة",
    "رقم اللوحة",
    "نوع الفوترة",
    "حالة الرحلة",
    "الوردية",
    "عدد",
    ...(financial
      ? ["سعر العميل", "تكلفة المورد", "أجر الدورة", "تكلفة السيارة"]
      : []),
    "معرف الرحلة",
    "رقم الرحلة",
  ];
  const records = trips.map((t) => {
    const extra = (t.importMetadata as any)?.cells || {};
    // Only finance-authorized exports retain arbitrary source columns, which may contain prices.
    const record: any = financial ? { ...extra } : {};
    Object.assign(record, {
      ملاحظات: t.notes || "",
      "أسم السائق": t.driver.fullName,
      "ذهاب/عودة": t.direction === "RETURN" ? "عودة" : "ذهاب",
      إلى: t.route.finalDestination,
      من: t.route.startLocation,
      "نوع السيارة": t.vehicle.vehicleType,
      التاريخ: day(t.tripDate),
      الخط: t.route.routeName,
      "وقت البداية": clock(t.scheduledDeparture),
      "وقت الوصول": clock(t.expectedArrival),
      "تاريخ الوصول": cairoDate(t.expectedArrival),
      الشركة: t.client.companyName,
      "رقم اللوحة": t.vehicle.plateNumber,
      "نوع الفوترة": t.billingTypeName || t.billingType?.name || "",
      "حالة الرحلة": t.tripStatus,
      الوردية: t.shift,
      عدد: 1,
      "معرف الرحلة": t.id,
      "رقم الرحلة": t.tripNumber,
    });
    if (financial)
      Object.assign(record, {
        "سعر العميل": Number(t.saleAmount),
        "تكلفة المورد": Number(t.costAmount),
        "أجر الدورة": Number(t.driverAllowance),
        "تكلفة السيارة": Number(t.vehicleCost),
      });
    return record;
  });
  const ws = XLSX.utils.json_to_sheet(records, { header: headers });
  ws["!cols"] = Array.from(
    { length: XLSX.utils.decode_range(ws["!ref"] || "A1").e.c + 1 },
    () => ({ wch: 23 }),
  );
  ws["!autofilter"] = { ref: ws["!ref"] || "A1" };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الرحلات");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["تعليمات التعديل وإعادة الرفع"],
      ["التواريخ YYYY-MM-DD والمواعيد بتوقيت القاهرة؛ كل صف رحلة واحدة."],
      [
        "احتفظ بمعرف الرحلة ورقمها عند التعديل. اتركهما فارغين لإضافة رحلة جديدة.",
      ],
      [
        "الحذف يتم فقط في وضع استبدال النطاق، للشركات والتواريخ المحددة وبعد المعاينة.",
      ],
      [
        "الرحلات المرتبطة بفواتير أو حضور لا تُحذف. تحصيلات وصرف الخزينة لا تتغير.",
      ],
      [
        "أسماء الأعمدة قابلة للربط أثناء الرفع. الصفر سعر صريح، والخانة الفارغة تستخدم تسعير الخط.",
      ],
    ]),
    "تعليمات",
  );
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
