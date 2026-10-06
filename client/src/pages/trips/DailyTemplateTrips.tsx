import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import type { Route } from "../../types";
import { Modal } from "../../components/ui/Modal";
import {
  MutationNotice,
  QueryNotice,
} from "../../components/ui/MutationNotice";
import { useLanguage } from "../../contexts/LanguageContext";
import { directionLabel } from "../../components/configuration/catalog";
import { cairoDay } from "./TripEditor";

export function DailyTemplateTrips({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { lang } = useLanguage(),
    ar = lang === "ar";
  const [date, setDate] = useState(cairoDay());
  const [shift, setShift] = useState("MORNING");
  const [overrides, setOverrides] = useState<
    Record<
      string,
      { selected: boolean; exclusionNote: string; billingTypeId?: string }
    >
  >({});
  const [prompt, setPrompt] = useState<{ route: Route; note: string } | null>(
    null,
  );
  const [result, setResult] = useState<any>(null);
  const routes = useQuery<Route[]>({
    queryKey: ["routes", "editor"],
    queryFn: async () => (await api.get("/routes")).data.data,
  });
  const history = useQuery<any[]>({
    queryKey: ["template-exclusions", date],
    queryFn: async () =>
      (await api.get("/trips/template-exclusions", { params: { date } })).data
        .data,
  });
  const activeRoutes = (routes.data || []).filter((r) => r.isActive);
  const availableRates = (route: Route) =>
    (route.rates || []).filter(
      (r) =>
        r.billingType?.active &&
        ["OUTBOUND", "RETURN"].includes(r.billingType.direction),
    );
  const selectedRate = (route: Route) =>
    availableRates(route).find(
      (r) => r.billingTypeId === overrides[route.id]?.billingTypeId,
    ) || availableRates(route)[0];
  const change = (id: string, value: Partial<(typeof overrides)[string]>) =>
    setOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { selected: true, exclusionNote: "" }),
        ...value,
      },
    }));
  const save = useMutation({
    mutationFn: async () =>
      (
        await api.post("/trips/generate-daily-from-templates", {
          date,
          shift,
          tripStatus: "SCHEDULED",
          routeOverrides: activeRoutes.map((route) => {
            const rate = selectedRate(route);
            return {
              routeId: route.id,
              selected: overrides[route.id]?.selected !== false,
              exclusionNote:
                overrides[route.id]?.selected === false
                  ? overrides[route.id]?.exclusionNote
                  : undefined,
              billingTypeId: rate?.billingTypeId,
              direction: rate?.billingType?.direction,
              departureTime: rate?.departureTime,
            };
          }),
        })
      ).data.data,
    onSuccess: (data) => {
      setResult(data);
      history.refetch();
      onSuccess();
    },
  });
  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={
          ar
            ? "تشغيل رحلات اليوم من قوالب الخطوط"
            : "Daily trips from route templates"
        }
      >
        <p className="ops-help">
          {ar
            ? "اختر خطوط اليوم. عند إلغاء الاختيار يمكنك كتابة سبب اختياري؛ تُحفظ الملاحظة عند تنفيذ الدفعة."
            : "Choose today's routes. Excluding a route offers an optional reason, saved when you run this batch."}
        </p>
        <MutationNotice mutations={[save]} />
        <QueryNotice failed={routes.isError} retry={routes.refetch} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="ops-form-grid">
            <label>
              {ar ? "تاريخ التشغيل" : "Service date"}
              <input
                required
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <label>
              {ar ? "الوردية" : "Shift"}
              <select value={shift} onChange={(e) => setShift(e.target.value)}>
                {["MORNING", "AFTERNOON", "NIGHT"].map((s, i) => (
                  <option key={s} value={s}>
                    {ar ? ["صباحية", "مسائية", "ليلية"][i] : s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {activeRoutes.map((route) => {
            const selected = overrides[route.id]?.selected !== false;
            return (
              <div key={route.id} className="border rounded-xl p-3 space-y-2">
                <label className="flex items-start gap-3 font-bold">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={save.isPending}
                    onChange={(e) =>
                      e.target.checked
                        ? change(route.id, {
                            selected: true,
                            exclusionNote: "",
                          })
                        : setPrompt({
                            route,
                            note: overrides[route.id]?.exclusionNote || "",
                          })
                    }
                  />
                  {route.routeName}
                </label>
                <p className="text-sm text-slate-500">
                  {route.client?.companyName}
                </p>
                {selected ? (
                  <label>
                    {ar ? "نوع الرحلة" : "Trip type"}
                    <select
                      required
                      value={selectedRate(route)?.billingTypeId || ""}
                      onChange={(e) =>
                        change(route.id, { billingTypeId: e.target.value })
                      }
                    >
                      <option value="">
                        {ar
                          ? "حدد أسعار الخط أولاً"
                          : "Configure route rates first"}
                      </option>
                      {availableRates(route).map((rate) => (
                        <option
                          key={rate.billingTypeId}
                          value={rate.billingTypeId}
                        >
                          {rate.billingType?.name} ·{" "}
                          {directionLabel(rate.billingType!.direction, ar)} ·{" "}
                          {rate.departureTime}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="text-sm text-amber-800">
                    <p className="whitespace-pre-wrap break-words">
                      {ar ? "مستبعد من تشغيل اليوم" : "Excluded from this run"}
                      {overrides[route.id]?.exclusionNote
                        ? ` — ${overrides[route.id].exclusionNote}`
                        : ""}
                    </p>
                    <button
                      type="button"
                      className="underline mt-2"
                      onClick={() =>
                        setPrompt({
                          route,
                          note: overrides[route.id]?.exclusionNote || "",
                        })
                      }
                    >
                      {ar ? "تعديل سبب الإلغاء" : "Edit reason"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {result && (
            <p role="status" className="text-emerald-800">
              {ar
                ? `تم إنشاء ${result.generatedCount} رحلة، واستبعاد ${result.excludedCount} خط، وتخطي ${result.skippedCount}.`
                : `Created ${result.generatedCount}; excluded ${result.excludedCount}; skipped ${result.skippedCount}.`}
            </p>
          )}
          {result?.skippedDetails?.map((item: any, i: number) => (
            <p key={i} className="text-sm text-amber-800">
              {item.routeName}: {item.reason}
            </p>
          ))}
          <button
            className="ops-button"
            disabled={
              save.isPending ||
              routes.isLoading ||
              !activeRoutes.length ||
              !!prompt
            }
          >
            {ar ? "تنفيذ الدفعة وحفظ الملاحظات" : "Run batch and save notes"}
          </button>
        </form>
        {!!history.data?.length && (
          <section className="mt-5 border-t pt-4">
            <h3 className="font-bold">
              {ar
                ? "سجل الاستبعادات لهذا اليوم"
                : "Exclusion history for this date"}
            </h3>
            {history.data.map((item) => (
              <p
                key={item.id}
                className="text-sm py-2 whitespace-pre-wrap break-words"
              >
                {item.routeName} —{" "}
                {item.note || (ar ? "بدون سبب" : "No reason supplied")}
              </p>
            ))}
          </section>
        )}
      </Modal>
      {prompt && (
        <Modal
          isOpen
          onClose={() => setPrompt(null)}
          title={ar ? "سبب إلغاء الاختيار" : "Reason for excluding route"}
          subtitle={prompt.route.routeName}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              change(prompt.route.id, {
                selected: false,
                exclusionNote: prompt.note.trim(),
              });
              setPrompt(null);
            }}
          >
            <label className="block">
              {ar ? "سبب الإلغاء (اختياري)" : "Reason (optional)"}
              <textarea
                autoFocus
                rows={4}
                maxLength={2000}
                value={prompt.note}
                onChange={(e) => setPrompt({ ...prompt, note: e.target.value })}
                placeholder={
                  ar ? "اكتب السبب ليُحفظ كملاحظة…" : "Enter a note…"
                }
                className="w-full"
              />
            </label>
            <p className="ops-help">
              {ar
                ? "يمكنك المتابعة بدون كتابة سبب."
                : "You can continue without entering a reason."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="ops-button" type="submit">
                {ar ? "تأكيد الاستبعاد" : "Confirm exclusion"}
              </button>
              <button
                className="ops-button secondary"
                type="button"
                onClick={() => setPrompt(null)}
              >
                {ar ? "تراجع" : "Go back"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
