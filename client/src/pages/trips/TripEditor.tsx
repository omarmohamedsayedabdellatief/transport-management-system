import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import type { Trip, Route, Driver, RouteRate } from "../../types";
import { Modal } from "../../components/ui/Modal";
import {
  MutationNotice,
  QueryNotice,
} from "../../components/ui/MutationNotice";
import {
  useCatalog,
  directionLabel,
} from "../../components/configuration/catalog";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
export const cairoDay = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const cairoInput = (s?: string) => {
  if (!s) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(s));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};
const plusMinutes = (s: string, n: number) =>
  new Date(new Date(s + "Z").getTime() + n * 60000).toISOString().slice(0, 16);
export function TripEditor({
  trip,
  onClose,
}: {
  trip?: Trip;
  onClose: () => void;
}) {
  const { lang } = useLanguage(),
    ar = lang === "ar",
    { can } = useAuth(),
    cache = useQueryClient(),
    catalog = useCatalog();
  const routes = useQuery<Route[]>({
    queryKey: ["routes", "editor"],
    queryFn: async () => (await api.get("/routes")).data.data,
  });
  const drivers = useQuery<Driver[]>({
    queryKey: ["drivers", "editor"],
    queryFn: async () => (await api.get("/drivers")).data.data,
  });
  const [form, setForm] = useState<any>({
    routeId: trip?.routeId || "",
    billingTypeId: trip?.billingTypeId || "",
    driverId: trip?.driverId || "",
    vehicleId: trip?.vehicleId || "",
    tripDate: trip?.tripDate.slice(0, 10) || cairoDay(),
    shift: trip?.shift || "MORNING",
    scheduledDeparture: cairoInput(trip?.scheduledDeparture),
    expectedArrival: cairoInput(trip?.expectedArrival),
    returnDeparture: cairoInput(trip?.returnDeparture),
    saleAmount: Number(trip?.saleAmount || 0),
    costAmount: Number(trip?.costAmount || 0),
    driverAllowance: Number(trip?.driverAllowance || 0),
    vehicleCost: Number(trip?.vehicleCost || 0),
    notes: trip?.notes || "",
  });
  const route = routes.data?.find((r) => r.id === form.routeId),
    type = catalog.data?.billingTypes.find((t) => t.id === form.billingTypeId);
  const applyRate = (r: Route, id: string, date = form.tripDate) => {
    const rate = r.rates?.find((x) => x.billingTypeId === id),
      bt = catalog.data?.billingTypes.find((t) => t.id === id);
    const dep = `${date}T${rate?.departureTime || "07:00"}`,
      ret =
        bt?.direction === "BOTH"
          ? `${date}T${rate?.returnDepartureTime || "17:00"}`
          : "";
    setForm((f: any) => ({
      ...f,
      routeId: r.id,
      billingTypeId: id,
      tripDate: date,
      driverId: r.id === f.routeId ? f.driverId : r.defaultDriverId || "",
      vehicleId: r.id === f.routeId ? f.vehicleId : r.defaultVehicleId || "",
      scheduledDeparture: dep,
      returnDeparture: ret,
      expectedArrival: plusMinutes(
        ret || dep,
        Number(r.estimatedDurationMin) || 60,
      ),
      ...Object.fromEntries(
        ["saleAmount", "costAmount", "driverAllowance", "vehicleCost"].map(
          (k) => [k, Number((rate as any)?.[k] || 0)],
        ),
      ),
    }));
  };
  const changeDate = (date: string) => {
    if (!date) return;
    setForm((f: any) => ({
      ...f,
      tripDate: date,
      scheduledDeparture: f.scheduledDeparture
        ? date + f.scheduledDeparture.slice(10)
        : "",
      returnDeparture: f.returnDeparture
        ? date + f.returnDeparture.slice(10)
        : "",
      expectedArrival: f.expectedArrival
        ? date + f.expectedArrival.slice(10)
        : "",
    }));
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!route || !type)
        throw new Error(
          ar ? "اختر الخط ونوع الرحلة" : "Choose a route and trip type",
        );
      const { saleAmount, costAmount, driverAllowance, vehicleCost, ...rest } =
        form;
      const data = {
        ...rest,
        returnDeparture: form.returnDeparture || null,
        clientId: route.clientId,
        direction: type.direction,
        ...(can('pricing.manage')
          ? { saleAmount, costAmount, driverAllowance, vehicleCost }
          : {}),
      };
      return trip
        ? api.put(`/trips/${trip.id}`, data)
        : api.post("/trips", data);
    },
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["trips"] });
      cache.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      onClose();
    },
  });
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={
        trip
          ? ar
            ? "تعديل الرحلة"
            : "Edit trip"
          : ar
            ? "إضافة رحلة"
            : "Add trip"
      }
      subtitle={
        ar
          ? "المواعيد بتوقيت القاهرة. يتم حفظ السعر مع الرحلة ولا يتغير بتعديل الخط لاحقاً."
          : "Times use Cairo time. Prices are saved with the trip."
      }
      maxWidth="2xl"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <MutationNotice mutations={[save]} />
        <QueryNotice
          failed={routes.isError || drivers.isError || catalog.isError}
          retry={() => {
            routes.refetch();
            drivers.refetch();
            catalog.refetch();
          }}
        />
        <div className="ops-form-grid">
          <label>
            {ar ? "خط السير / العميل" : "Route / client"}
            <select
              required
              value={form.routeId}
              onChange={(e) => {
                const r = routes.data?.find((r) => r.id === e.target.value);
                if (r)
                  applyRate(
                    r,
                    r.rates?.find((x) => x.billingType?.active)
                      ?.billingTypeId || "",
                  );
              }}
            >
              <option value="">{ar ? "اختر خط السير" : "Select route"}</option>
              {routes.data
                ?.filter((r) => r.isActive)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.routeName} · {r.client?.companyName}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {ar
              ? "نوع فوترة الرحلة / الاتجاه"
              : "Trip billing type / direction"}
            <select
              required
              value={form.billingTypeId}
              onChange={(e) => route && applyRate(route, e.target.value)}
            >
              <option value="">{ar ? "اختر النوع" : "Select type"}</option>
              {catalog.data?.billingTypes
                .filter(
                  (t) =>
                    (t.active &&
                      route?.rates?.some((r) => r.billingTypeId === t.id)) ||
                    t.id === trip?.billingTypeId,
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {directionLabel(t.direction, ar)}
                  </option>
                ))}
            </select>
          </label>
          {route && !route.rates?.length && (
            <p className="text-amber-700">
              {ar
                ? "يجب أن يحدد المالك أو المحاسب مواعيد وأسعار هذا الخط أولاً."
                : "Ask the owner or accountant to configure this route’s trip types first."}
            </p>
          )}
          <label>
            {ar ? "تاريخ الرحلة" : "Trip date"}
            <input
              type="date"
              required
              value={form.tripDate}
              onChange={(e) => changeDate(e.target.value)}
              onBlur={(e) => changeDate(e.currentTarget.value)}
            />
          </label>
          <label>
            {ar ? "الوردية" : "Shift"}
            <select
              value={form.shift}
              onChange={(e) => setForm({ ...form, shift: e.target.value })}
            >
              {[
                ["MORNING", "صباحية", "Morning"],
                ["AFTERNOON", "مسائية", "Afternoon"],
                ["NIGHT", "ليلية", "Night"],
                ["CUSTOM", "مخصصة", "Custom"],
              ].map(([v, a, en]) => (
                <option key={v} value={v}>
                  {ar ? a : en}
                </option>
              ))}
            </select>
          </label>
          <label>
            {ar ? "السائق والسيارة" : "Driver and vehicle"}
            <select
              required
              value={form.driverId}
              onChange={(e) => {
                const d = drivers.data?.find((d) => d.id === e.target.value);
                setForm({
                  ...form,
                  driverId: d?.id || "",
                  vehicleId: d?.assignedVehicleId || "",
                });
              }}
            >
              <option value="">{ar ? "اختر السائق" : "Choose driver"}</option>
              {drivers.data
                ?.filter((d) => d.assignedVehicleId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} · {d.assignedVehicle?.plateNumber}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {ar ? "موعد الانطلاق" : "Departure"}
            <input
              type="datetime-local"
              required
              value={form.scheduledDeparture}
              onChange={(e) =>
                setForm({
                  ...form,
                  scheduledDeparture: e.target.value,
                  ...(type?.direction !== "BOTH" && e.target.value
                    ? {
                        expectedArrival: plusMinutes(
                          e.target.value,
                          Number(route?.estimatedDurationMin) || 60,
                        ),
                      }
                    : {}),
                })
              }
            />
          </label>
          {type?.direction === "BOTH" && (
            <label>
              {ar ? "موعد انطلاق العودة" : "Return departure"}
              <input
                type="datetime-local"
                required
                value={form.returnDeparture}
                onChange={(e) =>
                  setForm({
                    ...form,
                    returnDeparture: e.target.value,
                    ...(e.target.value
                      ? {
                          expectedArrival: plusMinutes(
                            e.target.value,
                            Number(route?.estimatedDurationMin) || 60,
                          ),
                        }
                      : {}),
                  })
                }
              />
            </label>
          )}
          <label>
            {ar ? "الوصول النهائي" : "Final arrival"}
            <input
              type="datetime-local"
              required
              value={form.expectedArrival}
              onChange={(e) =>
                setForm({ ...form, expectedArrival: e.target.value })
              }
            />
          </label>
        </div>
        {can('pricing.manage') && (
          <fieldset className="border rounded-xl p-3 ops-form-grid">
            <legend>
              {ar ? "إجمالي سعر الرحلة — جنيه مصري" : "Total trip price — EGP"}
            </legend>
            {(
              [
                ["saleAmount", ar ? "سعر العميل" : "Client price"],
                ...(route?.executionType === "SUPPLIER"
                  ? [["costAmount", ar ? "سعر المورد" : "Supplier price"]]
                  : [
                      [
                        "driverAllowance",
                        ar ? "بدل السائق" : "Driver allowance",
                      ],
                      ["vehicleCost", ar ? "تكلفة السيارة" : "Vehicle cost"],
                    ]),
              ] as [keyof RouteRate, string][]
            ).map(([k, label]) => (
              <label key={k}>
                {label}
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form[k]}
                  onChange={(e) =>
                    setForm({ ...form, [k]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
            {type?.direction === "BOTH" && (
              <p>
                {ar
                  ? "هذا إجمالي الذهاب والعودة معاً، ويُحسب مرة واحدة."
                  : "This total covers both legs and is charged once."}
              </p>
            )}
          </fieldset>
        )}
        <label className="block">
          {ar ? "ملاحظات التشغيل" : "Operations notes"}
          <textarea
            className="w-full border rounded-lg p-2"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        <button
          className="ops-button"
          disabled={save.isPending || !form.vehicleId || !form.billingTypeId}
        >
          {ar ? "حفظ الرحلة" : "Save trip"}
        </button>
      </form>
    </Modal>
  );
}
