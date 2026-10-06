import { TripExcel } from "./TripExcel";
import { DailyTemplateTrips } from "./DailyTemplateTrips";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import type { Trip, Route } from "../../types";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import {
  MutationNotice,
  QueryNotice,
} from "../../components/ui/MutationNotice";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  useCatalog,
  directionLabel,
} from "../../components/configuration/catalog";
import { TripEditor, cairoDay } from "./TripEditor";
const clock = (s?: string) =>
  s
    ? new Date(s).toLocaleTimeString("en-GB", {
        timeZone: "Africa/Cairo",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export function TripsPage() {
  const { lang } = useLanguage(),
    ar = lang === "ar",
    { can, canFinance, user } = useAuth(),
    cache = useQueryClient(),
    catalog = useCatalog();
  const [excel, setExcel] = useState(false);
  const canExcel = !user?.companyScopeEnabled && ["trips.view", "trips.create", "trips.edit", "trips.delete", "finance.view", "pricing.manage", "accounting.manage"].every(can);
  const [date, setDate] = useState(""),
    [status, setStatus] = useState(""),
    [direction, setDirection] = useState(""),
    [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Trip | "new" | null>(null),
    [removing, setRemoving] = useState<Trip | null>(null),
    [bulk, setBulk] = useState(false),
    [daily, setDaily] = useState(false);
  const q = useQuery<Trip[]>({
    queryKey: ["trips", date, status],
    queryFn: async () =>
      (
        await api.get("/trips", {
          params: { date: date || undefined, status: status || undefined },
        })
      ).data.data,
  });
  const refresh = () => {
    cache.invalidateQueries({ queryKey: ["trips"] });
    cache.invalidateQueries({ queryKey: ["dashboard-kpis"] });
  };
  const action = useMutation({
    mutationFn: ({ id, tripStatus }: { id: string; tripStatus: string }) =>
      api.patch(`/trips/${id}/status`, { tripStatus }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/trips/${id}`),
    onSuccess: () => {
      refresh();
      setRemoving(null);
    },
  });
  const rows = (q.data || []).filter(
    (t) =>
      (!direction || t.direction === direction) &&
      (!search ||
        `${t.tripNumber} ${t.route?.routeName} ${t.client?.companyName} ${t.driver?.fullName} ${t.vehicle?.plateNumber}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {ar ? "تشغيل ورحلات اليوم" : "Trips and dispatch"}
          </h1>
          <p className="text-sm text-slate-500">
            {ar
              ? "الاتجاه ونوع الرحلة والسيارة والمواعيد بتوقيت القاهرة"
              : "Direction, trip type, vehicle, and Cairo departure times"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExcel && <button className="ops-button secondary" onClick={() => setExcel(true)}>{ar ? "استيراد / تصدير Excel" : "Import / export Excel"}</button>}
          <button className="ops-button secondary" onClick={refresh}>
            {ar ? "تحديث" : "Refresh"}
          </button>
          {can('trips.create') && (
            <>
              <button className="ops-button secondary" onClick={() => setDaily(true)}>{ar ? "تشغيل رحلات اليوم" : "Run daily templates"}</button>
              <button
                className="ops-button secondary"
                onClick={() => setBulk(true)}
              >
                {ar ? "توليد رحلات" : "Generate trips"}
              </button>
              <button className="ops-button" onClick={() => setEditor("new")}>
                {ar ? "إضافة رحلة" : "Add trip"}
              </button>
            </>
          )}
        </div>
      </div>
      <MutationNotice mutations={[action, remove]} />
      <QueryNotice failed={q.isError} retry={q.refetch} />
      <div className="ops-panel ops-padded ops-form-grid">
        <label>
          {ar ? "بحث" : "Search"}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              ar ? "الخط أو الشركة أو السيارة" : "Route, client or vehicle"
            }
          />
        </label>
        <label>
          {ar ? "التاريخ" : "Date"}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          {ar ? "الاتجاه" : "Direction"}
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="">{ar ? "الكل" : "All"}</option>
            {["OUTBOUND", "RETURN"].map((d) => (
              <option key={d} value={d}>
                {directionLabel(d, ar)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ar ? "الحالة" : "Status"}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{ar ? "الكل" : "All"}</option>
            {[
              ["SCHEDULED", "مجدولة"],
              ["IN_PROGRESS", "جارية"],
              ["COMPLETED", "مكتملة"],
              ["DELAYED", "متأخرة"],
              ["CANCELLED", "ملغاة"],
            ].map(([v, a]) => (
              <option key={v} value={v}>
                {ar ? a : v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="ops-panel overflow-x-auto">
        <table className="w-full text-sm text-start">
          <thead>
            <tr className="bg-slate-50">
              {[
                ar ? "الرحلة / التاريخ" : "Trip / date",
                ar ? "العميل / الخط" : "Client / route",
                ar ? "نوع الرحلة / الاتجاه" : "Trip type / direction",
                ar ? "السائق / السيارة" : "Driver / vehicle",
                ar ? "المواعيد" : "Times",
                ...(canFinance ? [ar ? "الأسعار" : "Prices"] : []),
                ar ? "الحالة" : "Status",
                ...((can('trips.edit') || can('trips.delete')) ? [ar ? "الإجراءات" : "Actions"] : []),
              ].map((h) => (
                <th key={h} className="p-3 text-start whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t align-top">
                <td className="p-3">
                  <strong>{t.tripNumber}</strong>
                  <div>{t.tripDate.slice(0, 10)}</div>
                  <div className="text-xs text-slate-500">
                    {ar
                      ? (
                          {
                            MORNING: "صباحية",
                            EVENING: "مسائية",
                            NIGHT: "ليلية",
                          } as Record<string, string>
                        )[t.shift] || t.shift
                      : t.shift}
                  </div>
                </td>
                <td className="p-3">
                  <strong>{t.client?.companyName}</strong>
                  <div>{t.route?.routeName}</div>
                  <div className="text-xs text-slate-500">
                    {t.direction === "RETURN"
                      ? `${t.route?.finalDestination} ← ${t.route?.startLocation}`
                      : `${t.route?.startLocation} ${t.direction === "BOTH" ? "↔" : "→"} ${t.route?.finalDestination}`}
                  </div>
                </td>
                <td className="p-3">
                  <strong>
                    {t.billingTypeName ||
                      directionLabel(t.direction || "OUTBOUND", ar)}
                  </strong>
                  {t.billingTypeName &&
                    t.billingTypeName !==
                      directionLabel(t.direction || "OUTBOUND", ar) && (
                      <div>{directionLabel(t.direction || "OUTBOUND", ar)}</div>
                    )}
                </td>
                <td className="p-3">
                  <strong>{t.driver?.fullName}</strong>
                  <div>{t.vehicle?.plateNumber}</div>
                  <div className="text-xs">
                    {
                      catalog.data?.vehicleTypes.find(
                        (c) => c.code === (t.vehicle as any)?.vehicleType,
                      )?.name
                    }
                  </div>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div>
                    {ar ? "انطلاق" : "Departure"} {clock(t.scheduledDeparture)}
                  </div>
                  {t.returnDeparture && (
                    <div>
                      {ar ? "عودة" : "Return"} {clock(t.returnDeparture)}
                    </div>
                  )}
                  <div>
                    {ar ? "وصول" : "Arrival"} {clock(t.expectedArrival)}
                  </div>
                </td>
                {canFinance && (
                  <td className="p-3 whitespace-nowrap">
                    <div>
                      {ar ? "عميل" : "Client"}:{" "}
                      {Number(t.saleAmount).toLocaleString()} EGP
                    </div>
                    <div>
                      {ar ? "تكلفة" : "Cost"}:{" "}
                      {(t.executionType === "SUPPLIER"
                        ? Number(t.costAmount)
                        : Number(t.driverAllowance) + Number(t.vehicleCost)
                      ).toLocaleString()}{" "}
                      EGP
                    </div>
                  </td>
                )}
                <td className="p-3">
                  <Badge status={t.tripStatus} />
                </td>
                {(can('trips.edit') || can('trips.delete')) && (
                  <td className="p-3">
                    <div className="flex flex-col gap-2">
                      {can('trips.edit') && ["SCHEDULED", "DELAYED"].includes(t.tripStatus) && (
                        <>
                          <button
                            className="text-blue-700"
                            onClick={() => setEditor(t)}
                          >
                            {ar ? "تعديل" : "Edit"}
                          </button>
                          <button
                            disabled={action.isPending}
                            onClick={() =>
                              action.mutate({
                                id: t.id,
                                tripStatus: "IN_PROGRESS",
                              })
                            }
                          >
                            {ar ? "بدء الرحلة" : "Start"}
                          </button>
                          <button
                            disabled={action.isPending}
                            onClick={() =>
                              action.mutate({
                                id: t.id,
                                tripStatus: "CANCELLED",
                              })
                            }
                          >
                            {ar ? "إلغاء الرحلة" : "Cancel trip"}
                          </button>
                        </>
                      )}
                      {can('trips.edit') && t.tripStatus === "IN_PROGRESS" && (
                        <button
                          disabled={action.isPending}
                          onClick={() =>
                            action.mutate({ id: t.id, tripStatus: "COMPLETED" })
                          }
                        >
                          {ar ? "إتمام الرحلة" : "Complete"}
                        </button>
                      )}
                      {can('trips.delete') && (
                        <button
                          className="text-red-700"
                          onClick={() => setRemoving(t)}
                        >
                          {ar ? "حذف" : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {q.isLoading ? (
          <p className="p-6">{ar ? "جاري التحميل…" : "Loading…"}</p>
        ) : (
          !rows.length && (
            <p className="p-6">
              {ar ? "لا توجد رحلات مطابقة" : "No matching trips"}
            </p>
          )
        )}
      </div>
      {editor && (
        <TripEditor
          trip={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
      {removing && (
        <Modal
          isOpen
          onClose={() => setRemoving(null)}
          title={ar ? "حذف الرحلة" : "Delete trip"}
        >
          <p>{removing.tripNumber}</p>
          <MutationNotice mutations={[remove]} />
          <button
            className="ops-button"
            disabled={remove.isPending}
            onClick={() => remove.mutate(removing.id)}
          >
            {ar ? "تأكيد الحذف" : "Confirm delete"}
          </button>
        </Modal>
      )}
      {excel && <TripExcel onClose={() => setExcel(false)} />}
      {daily && <DailyTemplateTrips onClose={() => setDaily(false)} onSuccess={refresh} />}
      {bulk && (
        <GenerateTrips onClose={() => setBulk(false)} onSuccess={refresh} />
      )}
    </div>
  );
}
function GenerateTrips({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { lang } = useLanguage(),
    ar = lang === "ar";
  const routes = useQuery<Route[]>({
    queryKey: ["routes", "editor"],
    queryFn: async () => (await api.get("/routes")).data.data,
  });
  const [form, setForm] = useState({
    routeId: "",
    billingTypeId: "",
    startDate: cairoDay(),
    endDate: cairoDay(),
    shift: "MORNING",
  });
  const route = routes.data?.find((r) => r.id === form.routeId),
    rate = route?.rates?.find((r) => r.billingTypeId === form.billingTypeId);
  const [result, setResult] = useState<any>(null);
  const save = useMutation({
    mutationFn: async () =>
      (
        await api.post("/trips/batch-generate", {
          routeId: form.routeId,
          billingTypeId: form.billingTypeId,
          direction: rate?.billingType?.direction,
          startDate: form.startDate,
          endDate: form.endDate,
          shifts: [form.shift],
          departureTime: rate?.departureTime,
          durationMinutes: Number(route?.estimatedDurationMin) || 60,
        })
      ).data.data,
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
    },
  });
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={ar ? "توليد رحلات من الخط" : "Generate route trips"}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <MutationNotice mutations={[save]} />
        <div className="ops-form-grid">
          <label>
            {ar ? "الخط" : "Route"}
            <select
              required
              value={form.routeId}
              onChange={(e) =>
                setForm({ ...form, routeId: e.target.value, billingTypeId: "" })
              }
            >
              <option value="">—</option>
              {routes.data
                ?.filter((r) => r.isActive)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.routeName}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {ar ? "نوع الرحلة" : "Trip type"}
            <select
              required
              value={form.billingTypeId}
              onChange={(e) =>
                setForm({ ...form, billingTypeId: e.target.value })
              }
            >
              <option value="">—</option>
              {route?.rates
                ?.filter((r) => r.billingType?.active)
                .map((r) => (
                  <option key={r.billingTypeId} value={r.billingTypeId}>
                    {r.billingType?.name} · {r.departureTime}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {ar ? "من" : "From"}
            <input
              required
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </label>
          <label>
            {ar ? "إلى" : "To"}
            <input
              required
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </label>
          <label>
            {ar ? "الوردية" : "Shift"}
            <select
              value={form.shift}
              onChange={(e) => setForm({ ...form, shift: e.target.value })}
            >
              {["MORNING", "AFTERNOON", "NIGHT", "CUSTOM"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-sm text-slate-500">
          {ar
            ? "سيتم استخدام السائق والسيارة والموعد والسعر المحفوظين على الخط، مع فحص تعارض الرحلات."
            : "Uses the route’s assigned driver, vehicle, saved time and price, with conflict checks."}
        </p>
        {result && (
          <div role="status">
            <p>
              {ar ? "تم إنشاء" : "Created"} {result.generatedCount} ·{" "}
              {ar ? "تم تخطي" : "Skipped"} {result.skippedCount}
            </p>
            {result.skippedDetails?.map((s: any, i: number) => (
              <p key={i}>
                {s.date}: {s.reason}
              </p>
            ))}
          </div>
        )}
        <button className="ops-button" disabled={save.isPending || !rate}>
          {ar ? "توليد" : "Generate"}
        </button>
      </form>
    </Modal>
  );
}
