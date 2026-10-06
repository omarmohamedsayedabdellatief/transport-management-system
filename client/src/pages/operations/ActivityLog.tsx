import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { Modal } from "../../components/ui/Modal";
import { QueryNotice } from "../../components/ui/MutationNotice";

const actions: Record<string, string> = {
  CHANGES: "التغييرات والدخول والخروج",
  VIEW: "عرض البيانات",
  CREATE: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
  LOGIN: "تسجيل دخول",
  LOGOUT: "تسجيل خروج",
  EXPORT: "تصدير",
  GENERATE: "توليد رحلات",
  ACCESS: "تغيير الصلاحيات والشركات",
  STATUS: "تغيير الحالة",
  PAYMENT: "سداد / تحصيل",
  DEDUCTION: "خصم",
  TRANSFER: "تحويل",
  CLOSE: "إقفال",
  REOPEN: "إعادة فتح",
  EXCLUDE_DAILY_TEMPLATE: "استبعاد خط",
  IMPORT: "استيراد",
  INCIDENT: "ملاحظة تشغيل",
  ATTENDANCE: "تسجيل الحضور",
  REFRESH_MANIFEST: "تحديث كشف الركاب",
  REPLACE: "تغيير السيارة والسائق",
  ISSUE: "إصدار مستند",
  DISCARD: "إلغاء مستند",
  CHECK: "فحص التعارض",
};
const entities: Record<string, string> = {
  auth: "الدخول والخروج",
  dashboard: "لوحة التحكم",
  documents: "المستندات المالية",
  passengers: "الركاب",
  enrollments: "تسجيل الركاب على الخطوط",
  plans: "قوالب التشغيل",
  sites: "المواقع",
  billing: "الفوترة",
  resources: "الموارد",
  users: "المستخدمون",
  user: "مستخدم",
  vehicles: "السيارات",
  vehicle: "سيارة",
  drivers: "السائقون",
  clients: "الشركات",
  routes: "الخطوط",
  route: "خط",
  trips: "الرحلات",
  trip: "رحلة",
  contracts: "العقود",
  partners: "الموردون",
  expenses: "المصروفات",
  operations: "التشغيل",
  overtime: "أجر الدورات الإضافية",
  settlements: "مستحقات السائقين",
  treasury: "الخزينة",
  "staff-payroll": "رواتب الموظفين",
  installments: "الأقساط",
  "supplier-transactions": "حساب المورد",
  "client-transactions": "حساب العميل",
  "billing-types": "أنواع الرحلات",
  "vehicle-types": "أنواع السيارات",
  login: "الدخول",
  logout: "الخروج",
  periods: "الفترات المالية",
  maintenance: "الصيانة",
  audit: "سجل النشاط",
  bootstrap: "بيانات التشغيل",
};
const fields: Record<string, string> = {
  bankAmount: "قسط البنك",
  driverAmount: "قسط السائق",
  bankDueDate: "استحقاق البنك",
  driverDueDate: "استحقاق السائق",
  driverName: "السائق",
  fullName: "الاسم",
  email: "البريد الإلكتروني",
  phone: "الهاتف",
  companyName: "الشركة",
  companyIds: "الشركات المعيّنة",
  companyScopeEnabled: "تقييد الشركات",
  role: "الدور",
  status: "الحالة",
  tripStatus: "حالة الرحلة",
  plateNumber: "رقم اللوحة",
  vehicleType: "نوع السيارة",
  currentMileage: "عداد السيارة",
  amount: "المبلغ",
  category: "البيان",
  expenseType: "نوع المصروف",
  date: "التاريخ",
  notes: "ملاحظات",
  name: "الاسم",
  routeName: "الخط",
  direction: "الاتجاه",
  saleAmount: "سعر العميل",
  costAmount: "التكلفة",
  driverAllowance: "أجر السائق",
  vehicleCost: "تكلفة السيارة",
  scheduledDeparture: "الانطلاق",
  expectedArrival: "الوصول",
  balance: "الرصيد",
  active: "نشط",
  capacity: "السعة",
  make: "الماركة",
  model: "الموديل",
};
const outcomes: Record<string, string> = {
  SUCCESS: "نجحت",
  FAILED: "فشلت / رُفضت",
  PENDING: "لم يتأكد اكتمالها",
  ABORTED: "انقطع الاتصال",
};
const formatValue = (value: any) =>
  value == null
    ? "—"
    : typeof value === "object"
      ? JSON.stringify(value, null, 2)
      : String(value);
const recordName = (row: any) => {
  const data = row.detail?.after || row.detail?.before || {};
  return (
    data.tripNumber ||
    data.plateNumber ||
    data.companyName ||
    data.routeName ||
    data.fullName ||
    data.name ||
    data.category ||
    row.entityId ||
    "—"
  );
};

export function ActivityLog() {
  const { lang } = useLanguage(),
    ar = lang === "ar";
  const [filters, setFilters] = useState({
    search: "",
    actorId: "",
    action: "CHANGES",
    outcome: "",
    from: "",
    to: "",
  });
  const [applied, setApplied] = useState(filters),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<any>(null);
  const q = useQuery<any>({
    queryKey: ["activity-log", applied, page],
    queryFn: async () =>
      (
        await api.get("/operations/audit", {
          params: {
            page,
            pageSize: 30,
            search: applied.search || undefined,
            actorId: applied.actorId || undefined,
            action: applied.action || undefined,
            outcome: applied.outcome || undefined,
            from: applied.from
              ? new Date(applied.from).toISOString()
              : undefined,
            to: applied.to ? new Date(applied.to).toISOString() : undefined,
          },
        })
      ).data.data,
  });
  const stamp = (value: string) =>
    new Date(value).toLocaleString(ar ? "ar-EG" : "en-GB", {
      timeZone: "Africa/Cairo",
      dateStyle: "medium",
      timeStyle: "short",
    });
  const rows = q.data?.rows || [];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {ar ? "سجل النشاط" : "Activity log"}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {ar
              ? "من قام بالإجراء، وما الذي تغيّر، ونتيجته. الأوقات بتوقيت القاهرة."
              : "Who acted, what changed, and the outcome. Times are in Cairo time."}
          </p>
        </div>
        <button className="ops-button secondary" onClick={() => q.refetch()}>
          {ar ? "تحديث" : "Refresh"}
        </button>
      </div>
      <form
        className="ops-panel ops-padded space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
          setPage(1);
        }}
      >
        <div className="ops-form-grid">
          <label>
            {ar ? "بحث" : "Search"}
            <input
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              placeholder={
                ar
                  ? "اسم المستخدم أو السجل أو تفاصيل الإجراء"
                  : "Person, record, or action details"
              }
            />
          </label>
          <label>
            {ar ? "المستخدم" : "User"}
            <select
              value={filters.actorId}
              onChange={(e) =>
                setFilters({ ...filters, actorId: e.target.value })
              }
            >
              <option value="">{ar ? "كل المستخدمين" : "All users"}</option>
              {q.data?.people?.map((p: any) => (
                <option key={p.actorId} value={p.actorId}>
                  {p.actorName} · {p.actorEmail}
                </option>
              ))}
            </select>
          </label>
          <label>
            {ar ? "الإجراء" : "Action"}
            <select
              value={filters.action}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value })
              }
            >
              <option value="">
                {ar
                  ? "كل الإجراءات بما فيها عرض البيانات"
                  : "All actions including views"}
              </option>
              {Object.entries(actions).map(([key, label]) => (
                <option key={key} value={key}>
                  {ar ? label : key.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            {ar ? "النتيجة" : "Outcome"}
            <select
              value={filters.outcome}
              onChange={(e) =>
                setFilters({ ...filters, outcome: e.target.value })
              }
            >
              <option value="">{ar ? "كل النتائج" : "All outcomes"}</option>
              {Object.entries(outcomes).map(([key, label]) => (
                <option key={key} value={key}>
                  {ar ? label : key}
                </option>
              ))}
            </select>
          </label>
          <label>
            {ar ? "من تاريخ ووقت" : "From"}
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label>
            {ar ? "إلى تاريخ ووقت" : "To"}
            <input
              type="datetime-local"
              min={filters.from || undefined}
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
        </div>
        <button className="ops-button">
          {ar ? "تطبيق الفلاتر" : "Apply filters"}
        </button>
      </form>
      <QueryNotice failed={q.isError} retry={q.refetch} />
      <p className="text-sm text-slate-500">
        {ar
          ? `${q.data?.total || 0} إجراء مطابق`
          : `${q.data?.total || 0} matching actions`}
      </p>
      <div className="space-y-3">
        {rows.map((row: any) => (
          <article key={row.id} className="ops-panel ops-padded space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{row.actorName}</strong>
              <time className="text-sm text-slate-500">
                {stamp(row.createdAt)}
              </time>
            </div>
            <p className="text-xs text-slate-500 break-all">
              {row.actorEmail || (ar ? "مستخدم غير مسجل" : "Unauthenticated")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">
                {ar ? actions[row.action] || row.action : row.action}
              </span>
              <span>
                · {ar ? entities[row.entity] || row.entity : row.entity}
              </span>
              <span
                className={`text-xs rounded-full px-3 py-1 ${row.outcome === "SUCCESS" ? "bg-emerald-50 text-emerald-800" : row.outcome === "FAILED" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}
              >
                {ar ? outcomes[row.outcome] || row.outcome : row.outcome}
              </span>
            </div>
            <p className="text-sm break-words">{recordName(row)}</p>
            <button
              className="ops-button secondary"
              onClick={() => setSelected(row)}
            >
              {ar ? "عرض التفاصيل والتغييرات" : "View details and changes"}
            </button>
          </article>
        ))}
      </div>
      {q.isLoading && <p>{ar ? "جاري تحميل السجل…" : "Loading…"}</p>}
      {!q.isLoading && !q.isError && !rows.length && (
        <p className="ops-panel ops-padded">
          {ar ? "لا توجد إجراءات مطابقة للفلاتر." : "No matching actions."}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          className="ops-button secondary"
          disabled={page === 1 || q.isFetching}
          onClick={() => setPage(page - 1)}
        >
          {ar ? "السابق" : "Previous"}
        </button>
        <span>
          {page} / {Math.max(1, Math.ceil((q.data?.total || 0) / 30))}
        </span>
        <button
          className="ops-button secondary"
          disabled={page * 30 >= (q.data?.total || 0) || q.isFetching}
          onClick={() => setPage(page + 1)}
        >
          {ar ? "التالي" : "Next"}
        </button>
      </div>
      {selected && (
        <Modal
          isOpen
          onClose={() => setSelected(null)}
          title={ar ? "تفاصيل الإجراء" : "Action details"}
          subtitle={`${selected.actorName} · ${stamp(selected.createdAt)}`}
        >
          <p className="font-bold">
            {ar ? actions[selected.action] || selected.action : selected.action}{" "}
            · {recordName(selected)}
          </p>
          {selected.outcome !== "SUCCESS" && (
            <p className="text-amber-800 mt-3">
              {ar
                ? "هذه محاولة لم يتأكد نجاحها. البيانات المرسلة لا تعني أن التغيير تم حفظه."
                : "This action was not confirmed successful. Submitted data does not prove a change was saved."}
            </p>
          )}
          <ChangeDetails row={selected} ar={ar} />
          {selected.detail?.error && (
            <p className="text-rose-800 mt-3 whitespace-pre-wrap">
              {formatValue(
                selected.detail.error.message || selected.detail.error,
              )}
            </p>
          )}
          <details className="mt-4">
            <summary>
              {ar
                ? "البيانات المرسلة والتفاصيل الكاملة"
                : "Submitted data and full details"}
            </summary>
            <pre className="ops-json whitespace-pre-wrap break-words" dir="ltr">
              {JSON.stringify(selected.detail, null, 2)}
            </pre>
          </details>
          <p className="text-xs text-slate-500 mt-4 break-all" dir="ltr">
            {selected.method} {selected.path} · {selected.statusCode || "—"} ·{" "}
            {selected.id}
          </p>
        </Modal>
      )}
    </div>
  );
}

function ChangeDetails({ row, ar }: { row: any; ar: boolean }) {
  const before = row.detail?.before || {},
    after = row.action === "DELETE" ? {} : row.detail?.after || {};
  const keys = (
    row.action === "DELETE" ? Object.keys(before) : Object.keys(after)
  ).filter(
    (key) =>
      !["id", "createdAt", "updatedAt"].includes(key) &&
      JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
  if (row.outcome !== "SUCCESS" || !keys.length || ["LOGIN", "LOGOUT"].includes(row.action)) return null;
  return (
    <div className="mt-4 space-y-3">
      {keys.map((key) => (
        <div key={key} className="border rounded-lg p-3">
          <strong>{ar ? fields[key] || key : key}</strong>
          <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
            <div>
              <p className="text-slate-500">{ar ? "قبل" : "Before"}</p>
              <pre className="whitespace-pre-wrap break-all font-sans">
                {formatValue(before[key])}
              </pre>
            </div>
            <div>
              <p className="text-slate-500">{ar ? "بعد" : "After"}</p>
              <pre className="whitespace-pre-wrap break-all font-sans">
                {formatValue(after[key])}
              </pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
