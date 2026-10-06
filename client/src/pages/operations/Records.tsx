import React, { useState, useRef } from "react";
import { Edit3, Download, Upload, CalendarRange } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import {
  useWords,
  useData,
  useAction,
  Page,
  DataTable,
  Dialog,
  Field,
  Button,
  AddButton,
  Status,
  Loading,
  dateText,
  today,
  money,
  exportCsv,
  Notice,
} from "./ui";

type F = {
  key: string;
  en: string;
  ar: string;
  type?: string;
  source?: string;
  options?: string[];
  required?: boolean;
  default?: any;
  hint?: string;
};
const configs: Record<
  string,
  { en: string; ar: string; description: [string, string]; fields: F[] }
> = {
  partners: {
    en: "Partners & suppliers",
    ar: "الشركاء والموردون",
    description: [
      "Transport suppliers and staffing employers, kept separate from your clients.",
      "موردو النقل وشركات التوظيف مع فصل واضح عن الشركات العميلة.",
    ],
    fields: [
      { key: "name", en: "Company name", ar: "اسم الشركة", required: true },
      {
        key: "kind",
        en: "Partner type",
        ar: "نوع الشريك",
        options: ["TRANSPORT", "STAFFING", "BOTH"],
        default: "TRANSPORT",
      },
      { key: "contactName", en: "Contact person", ar: "مسؤول التواصل" },
      { key: "phone", en: "Phone", ar: "الهاتف", type: "tel" },
      { key: "email", en: "Email", ar: "البريد الإلكتروني", type: "email" },
      {
        key: "notes",
        en: "Agreement / notes",
        ar: "الاتفاق والملاحظات",
        type: "textarea",
      },
      {
        key: "active",
        en: "Active",
        ar: "نشط",
        type: "checkbox",
        default: true,
      },
    ],
  },
  sites: {
    en: "Client sites",
    ar: "مواقع العملاء",
    description: [
      "Factories, offices, and destinations served by your transport team.",
      "المصانع والمكاتب والوجهات التي تخدمها الشركة.",
    ],
    fields: [
      { key: "name", en: "Site name", ar: "اسم الموقع", required: true },
      {
        key: "clientId",
        en: "Client company",
        ar: "الشركة العميلة",
        source: "clients",
        required: true,
      },
      { key: "address", en: "Address", ar: "العنوان" },
      {
        key: "active",
        en: "Active",
        ar: "نشط",
        type: "checkbox",
        default: true,
      },
    ],
  },
  passengers: {
    en: "Passengers",
    ar: "الموظفون والركاب",
    description: [
      "Manage direct employees and staffing-company passengers in one place.",
      "إدارة موظفي العملاء وموظفي شركات التوظيف في مكان واحد.",
    ],
    fields: [
      { key: "fullName", en: "Full name", ar: "الاسم الكامل", required: true },
      {
        key: "employeeCode",
        en: "Employee number",
        ar: "الرقم الوظيفي",
        required: true,
      },
      {
        key: "clientId",
        en: "Client receiving transport",
        ar: "العميل المستفيد من النقل",
        source: "clients",
        required: true,
      },
      { key: "siteId", en: "Work site", ar: "موقع العمل", source: "sites" },
      {
        key: "employerId",
        en: "Staffing employer (optional)",
        ar: "شركة التوظيف (اختياري)",
        source: "staffing",
      },
      { key: "phone", en: "Phone", ar: "الهاتف", type: "tel" },
      { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
      {
        key: "active",
        en: "Transport eligible",
        ar: "مؤهل لخدمة النقل",
        type: "checkbox",
        default: true,
      },
    ],
  },
  enrollments: {
    en: "Route enrollments",
    ar: "اشتراكات الخطوط",
    description: [
      "Assign each passenger to a route, pickup stop, shift, and service period.",
      "تحديد خط السير ومحطة الركوب والوردية وفترة الخدمة لكل موظف.",
    ],
    fields: [
      {
        key: "passengerId",
        en: "Passenger",
        ar: "الموظف",
        source: "passengers",
        required: true,
      },
      {
        key: "routeId",
        en: "Route",
        ar: "خط السير",
        source: "routes",
        required: true,
      },
      {
        key: "stopName",
        en: "Pickup / drop-off stop",
        ar: "محطة الركوب أو النزول",
        source: "stops",
        required: true,
      },
      {
        key: "direction",
        en: "Direction",
        ar: "الاتجاه",
        options: ["BOTH", "OUTBOUND", "RETURN"],
        default: "BOTH",
      },
      {
        key: "shift",
        en: "Shift",
        ar: "الوردية",
        options: ["MORNING", "AFTERNOON", "NIGHT", "CUSTOM"],
        default: "MORNING",
      },
      {
        key: "startDate",
        en: "Valid from",
        ar: "من تاريخ",
        type: "date",
        default: today(),
        required: true,
      },
      {
        key: "endDate",
        en: "Valid until (optional)",
        ar: "حتى تاريخ (اختياري)",
        type: "date",
      },
      {
        key: "active",
        en: "Active",
        ar: "نشط",
        type: "checkbox",
        default: true,
      },
    ],
  },
  plans: {
    en: "Service schedules",
    ar: "جداول التشغيل",
    description: [
      "Set the operating days, resources, and agreed rates, then preview trips before creating them.",
      "حدد أيام التشغيل والموارد والأسعار المتفق عليها ثم راجع الرحلات قبل إنشائها.",
    ],
    fields: [
      { key: "name", en: "Schedule name", ar: "اسم الجدول", required: true },
      {
        key: "contractId",
        en: "Client contract",
        ar: "عقد العميل",
        source: "contracts",
        required: true,
      },
      {
        key: "routeId",
        en: "Route",
        ar: "خط السير",
        source: "routes",
        required: true,
      },
      {
        key: "direction",
        en: "Direction",
        ar: "الاتجاه",
        options: ["OUTBOUND", "RETURN"],
        default: "OUTBOUND",
      },
      {
        key: "shift",
        en: "Shift",
        ar: "الوردية",
        options: ["MORNING", "AFTERNOON", "NIGHT", "CUSTOM"],
        default: "MORNING",
      },
      {
        key: "vehicleId",
        en: "Vehicle",
        ar: "المركبة",
        source: "vehicles",
        required: true,
      },
      {
        key: "driverId",
        en: "Driver",
        ar: "السائق",
        source: "drivers",
        required: true,
      },
      {
        key: "supplierId",
        en: "Transport supplier (optional)",
        ar: "مورد النقل (اختياري)",
        source: "transport",
      },
      {
        key: "departureTime",
        en: "Departure time",
        ar: "موعد الانطلاق",
        type: "time",
        default: "06:00",
        required: true,
      },
      {
        key: "durationMinutes",
        en: "Duration (minutes)",
        ar: "المدة بالدقائق",
        type: "number",
        default: 60,
        required: true,
      },
      {
        key: "timezone",
        en: "Time zone",
        ar: "المنطقة الزمنية",
        default: "Africa/Cairo",
        required: true,
      },
      {
        key: "weekdays",
        en: "Operating days",
        ar: "أيام التشغيل",
        type: "weekdays",
        default: [0, 1, 2, 3, 4],
      },
      {
        key: "excludedDates",
        en: "Excluded dates (comma-separated YYYY-MM-DD)",
        ar: "تواريخ الاستثناء (YYYY-MM-DD بفاصلة)",
        type: "dates",
        default: [],
      },
      {
        key: "startDate",
        en: "Start date",
        ar: "تاريخ البداية",
        type: "date",
        default: today(),
        required: true,
      },
      {
        key: "endDate",
        en: "End date",
        ar: "تاريخ النهاية",
        type: "date",
        required: true,
      },
      {
        key: "saleRate",
        en: "Client rate per trip (monthly contracts use contract value)",
        ar: "سعر الرحلة للعميل (العقد الشهري يستخدم قيمة العقد)",
        type: "number",
        default: 0,
      },
      {
        key: "supplierRate",
        en: "Supplier cost per trip",
        ar: "تكلفة المورد لكل رحلة",
        type: "number",
        default: 0,
      },
      {
        key: "active",
        en: "Active",
        ar: "نشط",
        type: "checkbox",
        default: true,
      },
    ],
  },
};
export const recordLabel = (r: any) =>
  r.name ||
  r.fullName ||
  r.companyName ||
  r.routeName ||
  r.contractNumber ||
  (r.plateNumber ? `${r.plateNumber} · ${r.capacity} seats` : r.id);
export function RecordFields({ fields, form, setForm, lookup }: any) {
  const w = useWords();
  const weekdays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    daysAr = [
      "الأحد",
      "الاثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ];
  return (
    <div className="ops-form-grid">
      {fields.map((f: F) => {
        const value = form[f.key] ?? "";
        let options = lookup?.[f.source || ""] || [];
        if (f.source === "staffing")
          options = (lookup.partners || []).filter(
            (p: any) => p.kind !== "TRANSPORT" && p.active,
          );
        if (f.source === "transport")
          options = (lookup.partners || []).filter(
            (p: any) => p.kind !== "STAFFING" && p.active,
          );
        if (f.source === "sites" && form.clientId)
          options = options.filter((p: any) => p.clientId === form.clientId);
        if (f.source === "routes") {
          const clientId =
            (lookup.passengers || []).find(
              (p: any) => p.id === form.passengerId,
            )?.clientId ||
            (lookup.contracts || []).find((p: any) => p.id === form.contractId)
              ?.clientId;
          if (clientId)
            options = options.filter((p: any) => p.clientId === clientId);
        }
        if (f.source === "stops") {
          const r = (lookup.routes || []).find(
            (r: any) => r.id === form.routeId,
          );
          options = r
            ? [
                ...new Set([
                  r.startLocation,
                  ...r.stops.map((s: any) => s.stopName),
                  r.finalDestination,
                ]),
              ].map((name) => ({ id: name, name }))
            : [];
        }
        const set = (v: any) =>
          setForm((prev: any) => {
            const next = {
              ...prev,
              [f.key]: v,
              ...(f.key === "clientId" ? { siteId: "" } : {}),
              ...(f.key === "routeId" ? { stopName: "" } : {}),
            };
            if (f.key === "contractId") {
              const c = lookup.contracts.find((c: any) => c.id === v);
              if (c) {
                next.endDate = dateText(c.endDate);
                if (c.pricingModel === "PER_TRIP") next.saleRate = Number(c.monthlyValue);
                next.startDate =
                  today() > dateText(c.startDate)
                    ? today()
                    : dateText(c.startDate);
              }
            }
            if (f.key === "vehicleId") {
              const vehicle = lookup.vehicles.find((r: any) => r.id === v);
              if (vehicle) next.supplierId = vehicle.supplierId || "";
              const driver = lookup.drivers.find(
                (r: any) => r.assignedVehicleId === v,
              );
              if (driver) next.driverId = driver.id;
            }
            return next;
          });
        if (f.type === "weekdays")
          return (
            <fieldset className="ops-field ops-wide" key={f.key}>
              <legend>{w(f.en, f.ar)}</legend>
              <div className="ops-day-picker">
                {weekdays.map((d, i) => (
                  <label key={d}>
                    <input
                      type="checkbox"
                      checked={(value || []).includes(i)}
                      onChange={(e) =>
                        set(
                          e.target.checked
                            ? [...value, i]
                            : value.filter((n: number) => n !== i),
                        )
                      }
                    />
                    {w(d, daysAr[i])}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        return (
          <Field key={f.key} label={w(f.en, f.ar)}>
            {f.source || f.options ? (
              <select
                required={f.required}
                value={value}
                onChange={(e) => set(e.target.value)}
              >
                <option value="">{w("Select…", "اختر…")}</option>
                {f.options
                  ? f.options.map((o) => (
                      <option value={o} key={o}>
                        {w(
                          o,
                          (
                            {
                              VEHICLE: "مركبة",
                              PROPERTY_OFFICE: "عقار أو مكتب",
                              PENDING: "مستحق",
                              PAID: "مدفوع",
                              TRANSPORT: "مورد نقل",
                              STAFFING: "شركة توظيف",
                              BOTH: "كلاهما",
                              OUTBOUND: "ذهاب",
                              RETURN: "عودة",
                              MORNING: "صباحي",
                              AFTERNOON: "مسائي",
                              NIGHT: "ليلي",
                              CUSTOM: "مخصص",
                            } as any
                          )[o] || o,
                        )}
                      </option>
                    ))
                  : options.map((o: any) => (
                      <option value={o.id} key={o.id}>
                        {recordLabel(o)}
                      </option>
                    ))}
              </select>
            ) : f.type === "checkbox" ? (
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => set(e.target.checked)}
              />
            ) : f.type === "textarea" ? (
              <textarea
                rows={3}
                value={value}
                onChange={(e) => set(e.target.value)}
              />
            ) : f.type === "dates" ? (
              <input
                value={Array.isArray(value) ? value.join(", ") : value}
                placeholder="2026-12-25, 2027-01-01"
                onChange={(e) => set(e.target.value)}
              />
            ) : (
              <input
                type={f.type || "text"}
                required={f.required}
                min={f.type === "number" ? 0 : undefined}
                step={f.type === "number" ? "any" : undefined}
                value={
                  f.type === "date"
                    ? dateText(value) === "—"
                      ? ""
                      : dateText(value)
                    : value
                }
                onChange={(e) =>
                  set(
                    f.type === "number"
                      ? e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                      : e.target.value,
                  )
                }
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

export function Records({ resource }: { resource: string }) {
  const queryClient = useQueryClient();
  const w = useWords();
  const { can, canManage, canFinance } = useAuth();
  const config = configs[resource];
  const query = useData("/records/" + resource);
  const lookup = useData("/bootstrap");
  const action = useAction();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [generate, setGenerate] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const open = (r?: any) => {
    action.clear();
    setStep(0);
    setEditing(r || {});
    setForm(
      Object.fromEntries(
        config.fields.map((f) => [
          f.key,
          f.type === "date" && r?.[f.key]
            ? dateText(r[f.key])
            : (r?.[f.key] ?? f.default ?? ""),
        ]),
      ),
    );
  };
  const columns: any[] =
    resource === "passengers"
      ? [
          { key: "fullName", label: w("Passenger", "الموظف") },
          { key: "employeeCode", label: w("Employee #", "الرقم الوظيفي") },
          {
            key: "client",
            label: w("Client / site", "العميل / الموقع"),
            render: (r: any) => (
              <>
                {r.client.companyName}
                <small>{r.site?.name}</small>
              </>
            ),
          },
          {
            key: "employer",
            label: w("Employer", "جهة العمل"),
            render: (r: any) =>
              r.employer?.name || w("Direct employee", "موظف مباشر"),
          },
          {
            key: "enrollments",
            label: w("Routes", "الخطوط"),
            render: (r: any) =>
              r.enrollments
                .filter((e: any) => e.active)
                .map((e: any) => e.route.routeName)
                .join("، ") || "—",
          },
        ]
      : resource === "enrollments"
        ? [
            {
              key: "passenger",
              label: w("Passenger", "الموظف"),
              render: (r: any) => r.passenger.fullName,
            },
            {
              key: "route",
              label: w("Route", "الخط"),
              render: (r: any) => r.route.routeName,
            },
            { key: "stopName", label: w("Stop", "المحطة") },
            {
              key: "direction",
              label: w("Direction", "الاتجاه"),
              render: (r: any) => <Status value={r.direction} />,
            },
            {
              key: "shift",
              label: w("Shift", "الوردية"),
              render: (r: any) => <Status value={r.shift} />,
            },
            {
              key: "startDate",
              label: w("From", "من"),
              render: (r: any) => dateText(r.startDate),
            },
          ]
        : resource === "plans"
          ? [
              {
                key: "name",
                label: w("Schedule", "الجدول"),
                render: (r: any) => (
                  <>
                    <strong>{r.name}</strong>
                    <small>
                      {r.route.routeName} · {r.departureTime}
                    </small>
                  </>
                ),
              },
              {
                key: "vehicle",
                label: w("Vehicle / driver", "المركبة / السائق"),
                render: (r: any) => (
                  <>
                    {r.vehicle.plateNumber}
                    <small>{r.driver.fullName}</small>
                  </>
                ),
              },
              {
                key: "direction",
                label: w("Direction", "الاتجاه"),
                render: (r: any) => <Status value={r.direction} />,
              },
              {
                key: "supplier",
                label: w("Provider", "المورد"),
                render: (r: any) =>
                  r.supplier?.name || w("Own fleet", "أسطول الشركة"),
              },
              {
                key: "saleRate",
                label: w("Trip rate", "سعر الرحلة"),
                render: (r: any) =>
                  r.contract.pricingModel === "MONTHLY_FIXED"
                    ? w("Monthly contract", "عقد شهري")
                    : money(r.saleRate),
              },
            ]
          : resource === "partners"
            ? [
                { key: "name", label: w("Company", "الشركة") },
                {
                  key: "kind",
                  label: w("Type", "النوع"),
                  render: (r: any) => <Status value={r.kind} />,
                },
                { key: "contactName", label: w("Contact", "المسؤول") },
                { key: "phone", label: w("Phone", "الهاتف") },
                { key: "email", label: w("Email", "البريد") },
              ]
            : [
                { key: "name", label: w("Site", "الموقع") },
                {
                  key: "client",
                  label: w("Client", "العميل"),
                  render: (r: any) => r.client.companyName,
                },
                { key: "address", label: w("Address", "العنوان") },
              ];
  columns.push({
    key: "active",
    label: w("Status", "الحالة"),
    render: (r: any) => <Status value={r.active ? "ACTIVE" : "INACTIVE"} />,
  });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resource === "plans" && step < 2) {
      setStep(step + 1);
      return;
    }
    const body = { ...form };
    if (resource === "plans")
      body.excludedDates = Array.isArray(body.excludedDates)
        ? body.excludedDates
        : String(body.excludedDates)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    try {
      await action.run(
        "/records/" + resource + (editing.id ? "/" + editing.id : ""),
        body,
        editing.id ? "put" : "post",
      );
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setEditing(null);
    } catch {}
  };
  const scheduleSteps = [
    ["name", "contractId", "routeId", "direction", "shift"],
    ["vehicleId", "driverId", "supplierId"],
    [
      "departureTime",
      "durationMinutes",
      "timezone",
      "weekdays",
      "excludedDates",
      "startDate",
      "endDate",
      "saleRate",
      "supplierRate",
      "active",
    ],
  ];
  const displayedFields =
    resource === "plans"
      ? config.fields.filter((f) => scheduleSteps[step].includes(f.key))
      : config.fields;
  return (
    <Page
      title={w(config.en, config.ar)}
      description={w(...config.description)}
      actions={
        <>
          {resource === "passengers" && canManage && (
            <Button secondary onClick={() => setImporting(true)}>
              <Upload size={16} />
              {w("Import CSV", "استيراد CSV")}
            </Button>
          )}
          <Button
            secondary
            onClick={() =>
              exportCsv(
                resource,
                query.data || [],
                config.fields
                  .filter((f) => !f.source && f.type !== "textarea")
                  .map((f) => ({ key: f.key, label: w(f.en, f.ar) })),
              )
            }
          >
            <Download size={16} />
            {w("Export", "تصدير")}
          </Button>
          {canManage && <AddButton onClick={() => open()} />}
        </>
      }
    >
      <div className="record-next-step"><span>{w("Next step", "الخطوة التالية")}</span><a href={resource === "passengers" ? "/enrollments" : resource === "enrollments" ? "/schedules" : resource === "plans" ? "/trips" : resource === "sites" ? "/routes" : "/settings"}>{resource === "passengers" ? w("Assign passengers to routes →", "سجّل اشتراكات الموظفين ←") : resource === "enrollments" ? w("Create the service schedule →", "أنشئ جدول التشغيل ←") : resource === "plans" ? w("Run your generated trips →", "تابع الرحلات التي أنشأتها ←") : resource === "sites" ? w("Define routes and stops →", "حدد الخطوط والمحطات ←") : w("Link supplier resources →", "اربط موارد الموردين ←")}</a></div>
      <details className="ops-context-help">
        <summary>{w("How to use this page", "كيف تستخدم هذه الصفحة؟")}</summary>
        <p>
          {w(...config.description)}{" "}
          {w(
            "Add a record, fill in the labeled fields, and save. Use search to find records and the edit button to update them. Archive a record by clearing its Active checkbox.",
            "أضف سجلًا واملأ الحقول ثم احفظ. استخدم البحث للوصول إلى السجلات وزر التعديل لتحديثها. لإيقاف سجل أزل علامة نشط.",
          )}
        </p>
        <a className="ops-text-link" href="/guide">
          {w("Open the user manual", "فتح دليل الاستخدام")}
        </a>
      </details>
      {!editing && action.feedback}
      {query.isLoading || query.isError ? (
        <Loading query={query} />
      ) : (
        <DataTable
          rows={query.data}
          columns={canFinance ? columns : columns.filter(c=>!["saleRate","supplierRate"].includes(c.key))}
          actions={
            (canManage || (resource === 'plans' && can('trips.create')))
              ? (r: any) => (
                  <>
                    <Button
                      disabled={!canManage}
                      secondary
                      onClick={() => open(r)}
                      aria-label={w("Edit", "تعديل")}
                    >
                      <Edit3 size={15} />
                    </Button>
                    {resource === "plans" && can('trips.create') && r.active && (
                      <Button secondary onClick={() => setGenerate(r)}>
                        <CalendarRange size={15} />
                        {w("Generate", "إنشاء الرحلات")}
                      </Button>
                    )}
                  </>
                )
              : undefined
          }
        />
      )}
      {editing && (
        <Dialog
          title={w(
            editing.id ? "Edit record" : "New record",
            editing.id ? "تعديل سجل" : "سجل جديد",
          )}
          onClose={() => {
            if (!action.busy) setEditing(null);
          }}
        >
          <form ref={formRef} onSubmit={save}>
            {resource === "plans" && (
              <div className="ops-wizard-steps">
                {[
                  w("Service", "الخدمة"),
                  w("Resources", "الموارد"),
                  w("Calendar & rates", "الأيام والأسعار"),
                ].map((label, i) => (
                  <div
                    key={label}
                    className={
                      "ops-wizard-step " + (step === i ? "active" : "")
                    }
                  >
                    <span>{i + 1}</span>
                    {label}
                  </div>
                ))}
              </div>
            )}
            {action.feedback}
            {lookup.data ? (
              <RecordFields
                fields={displayedFields}
                form={form}
                setForm={setForm}
                lookup={lookup.data}
              />
            ) : (
              <Loading query={lookup} />
            )}
            <div className="ops-form-footer">
              <Button
                type="button"
                secondary
                disabled={action.busy}
                onClick={() => setEditing(null)}
              >
                {w("Cancel", "إلغاء")}
              </Button>
              <>
                {resource === "plans" && step > 0 && (
                  <Button
                    type="button"
                    secondary
                    onClick={() => setStep(step - 1)}
                  >
                    {w("Back", "السابق")}
                  </Button>
                )}
              </>
              <Button type="submit" disabled={action.busy || !lookup.data}>
                {resource === "plans" && step < 2
                  ? w("Next step", "الخطوة التالية")
                  : action.busy
                    ? w("Saving…", "جاري الحفظ…")
                    : w("Save record", "حفظ السجل")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {generate && (
        <Generate plan={generate} onClose={() => setGenerate(null)} />
      )}
      {importing && (
        <PassengerImport
          lookup={lookup.data}
          onClose={() => setImporting(false)}
        />
      )}
    </Page>
  );
}
function Generate({ plan, onClose }: any) {
  const w = useWords();
  const action = useAction();
  const [start, setStart] = useState(
    today() > dateText(plan.startDate) ? today() : dateText(plan.startDate),
  );
  const [end, setEnd] = useState(() => {
    const endOfWeek = new Date(
      Date.parse(
        (today() > dateText(plan.startDate)
          ? today()
          : dateText(plan.startDate)) + "T00:00:00Z",
      ) +
        6 * 86400000,
    )
      .toISOString()
      .slice(0, 10);
    return endOfWeek < dateText(plan.endDate)
      ? endOfWeek
      : dateText(plan.endDate);
  });
  const [result, setResult] = useState<any>(null);
  const [previewed, setPreviewed] = useState("");
  const signature = start + end;
  async function run(preview: boolean) {
    try {
      const r = await action.run(`/plans/${plan.id}/generate`, {
        startDate: start,
        endDate: end,
        preview,
      });
      setResult(r);
      setPreviewed(preview ? signature : "");
    } catch {
      setResult(null);
    }
  }
  return (
    <Dialog
      title={w("Generate trips: ", "إنشاء الرحلات: ") + plan.name}
      onClose={onClose}
    >
      {action.error && <Notice error>{action.error}</Notice>}
      {result && (
        <Notice>
          {result.preview
            ? w(
                "Preview ready. No trips have been created yet.",
                "المعاينة جاهزة. لم يتم إنشاء رحلات بعد.",
              )
            : w(
                "Generation complete. See the result for each day below.",
                "اكتمل إنشاء الرحلات. راجع نتيجة كل يوم أدناه.",
              )}
        </Notice>
      )}
      <p className="ops-help">
        {w(
          "Preview a period of up to 91 days. Existing trips are never duplicated. Blocked days are listed below.",
          "راجع فترة حتى ٩١ يومًا. لن تتكرر الرحلات الموجودة. تظهر الأيام المتعارضة أدناه.",
        )}
      </p>
      <div className="ops-form-grid">
        <Field label={w("From", "من")}>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label={w("Until", "حتى")}>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
      </div>
      <div className="ops-form-footer">
        <Button secondary disabled={action.busy} onClick={() => run(true)}>
          {w("Preview", "معاينة")}
        </Button>
        <Button
          disabled={
            action.busy ||
            previewed !== signature ||
            !result?.results.some((r: any) => r.status === "READY")
          }
          onClick={() => run(false)}
        >
          {w("Create ready trips", "إنشاء الرحلات الجاهزة")}
        </Button>
      </div>
      {result && (
        <DataTable
          rows={result.results}
          columns={[
            { key: "date", label: w("Date", "التاريخ") },
            {
              key: "status",
              label: w("Result", "النتيجة"),
              render: (r: any) => <Status value={r.status} />,
            },
            { key: "passengers", label: w("Passengers", "الركاب") },
            { key: "reason", label: w("Details", "التفاصيل") },
          ]}
          empty={w(
            "No service days in this period.",
            "لا توجد أيام تشغيل في هذه الفترة.",
          )}
        />
      )}
    </Dialog>
  );
}
function PassengerImport({ lookup, onClose }: any) {
  const w = useWords();
  const a = useAction();
  const [clientId, setClientId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<any>(null);
  const [signature, setSignature] = useState("");
  const key = clientId + employerId + csv;
  async function submit(preview: boolean) {
    try {
      const r = await a.run("/passengers/import", {
        clientId,
        employerId,
        csv,
        preview,
      });
      setResult(r);
      setSignature(preview ? key : "");
    } catch {}
  }
  return (
    <Dialog
      title={w("Import passengers", "استيراد الموظفين")}
      onClose={onClose}
    >
      {a.feedback}
      <p className="ops-help">
        {w(
          "CSV columns: employeeCode, fullName, phone. Existing employee numbers are skipped; no records are replaced.",
          "أعمدة الملف: employeeCode, fullName, phone. يتم تخطي الأرقام الوظيفية الموجودة دون استبدال السجلات.",
        )}
      </p>
      <Button
        secondary
        onClick={() =>
          exportCsv(
            "passenger-template",
            [{ employeeCode: "EMP-001", fullName: "اسم الموظف", phone: "" }],
            [
              { key: "employeeCode", label: "employeeCode" },
              { key: "fullName", label: "fullName" },
              { key: "phone", label: "phone" },
            ],
          )
        }
      >
        {w("Download template", "تحميل نموذج")}
      </Button>
      <div className="ops-form-grid">
        <Field label={w("Client", "العميل")}>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">{w("Select", "اختر")}</option>
            {lookup?.clients.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.companyName}
              </option>
            ))}
          </select>
        </Field>
        <Field label={w("Staffing employer", "شركة التوظيف")}>
          <select
            value={employerId}
            onChange={(e) => setEmployerId(e.target.value)}
          >
            <option value="">{w("Direct employees", "موظفون مباشرون")}</option>
            {lookup?.partners
              .filter((p: any) => p.kind !== "TRANSPORT")
              .map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </Field>
        <Field
          label={w("CSV file (maximum 1 MB)", "ملف CSV (بحد أقصى ١ ميجابايت)")}
        >
          <input
            type="file"
            accept=".csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f && f.size <= 1000000) {
                setCsv(await f.text());
                setResult(null);
              } else {
                setCsv("");
                setResult({
                  error: w("File is too large.", "حجم الملف كبير."),
                });
              }
            }}
          />
        </Field>
      </div>
      {result?.error && <Notice error>{result.error}</Notice>}
      <div className="ops-form-footer">
        <Button
          secondary
          disabled={!clientId || !csv || a.busy}
          onClick={() => submit(true)}
        >
          {w("Validate file", "فحص الملف")}
        </Button>
        <Button
          disabled={
            signature !== key ||
            !result?.validCount ||
            a.busy ||
            result?.errors?.length
          }
          onClick={() => submit(false)}
        >
          {w("Import valid rows", "استيراد الصفوف")}
        </Button>
      </div>
      {result && !result.error && (
        <>
          <p>
            {w("Ready", "جاهز")}: {result.validCount} ·{" "}
            {w("Skipped", "تم تخطيه")}: {result.skippedCount} ·{" "}
            {w("Imported", "تم استيراده")}: {result.importedCount || 0}
          </p>
          {result.errors?.map((r: any, i: number) => (
            <Notice key={i} error>
              {r}
            </Notice>
          ))}
        </>
      )}
    </Dialog>
  );
}
