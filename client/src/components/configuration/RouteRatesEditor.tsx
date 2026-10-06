import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import type { Route, RouteRate } from "../../types";
import { useCatalog, directionLabel } from "./catalog";
import { useLanguage } from "../../contexts/LanguageContext";
import { Modal } from "../ui/Modal";
import { MutationNotice } from "../ui/MutationNotice";
export function RouteRatesEditor({
  route,
  onClose,
}: {
  route: Route;
  onClose: () => void;
}) {
  const { lang } = useLanguage(),
    ar = lang === "ar",
    q = useCatalog(),
    cache = useQueryClient();
  const [rates, setRates] = useState<Record<string, RouteRate>>(
    Object.fromEntries(
      (route.rates || []).map((r) => [
        r.billingTypeId,
        {
          ...r,
          saleAmount: Number(r.saleAmount),
          costAmount: Number(r.costAmount),
          driverAllowance: Number(r.driverAllowance),
          vehicleCost: Number(r.vehicleCost),
        },
      ]),
    ),
  );
  const save = useMutation({
    mutationFn: () =>
      api.put(`/routes/${route.id}/rates`, {
        rates: Object.values(rates).filter((r) =>
          q.data?.billingTypes.some(
            (t) => t.id === r.billingTypeId && t.active,
          ),
        ),
      }),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["routes"] });
      onClose();
    },
  });
  const change = (id: string, data: Partial<RouteRate>) =>
    setRates((prev) => ({ ...prev, [id]: { ...prev[id], ...data } }));
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={ar ? "مواعيد وأسعار الرحلات" : "Trip times and prices"}
      subtitle={route.routeName}
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
        <p className="text-sm text-slate-600">
          {ar
            ? "لكل نوع سعر مستقل بالجنيه المصري. سعر الذهاب والعودة هو إجمالي الرحلة كاملة ويُسجل مرة واحدة. الأوقات بتوقيت القاهرة، والعودة في نفس اليوم."
            : "Each type has its own EGP price. Round-trip pricing is the total for both legs, charged once. Times use Cairo time; return is on the same day."}
        </p>
        {q.data?.billingTypes
          .filter((t) => t.active)
          .map((t) => {
            const r = rates[t.id];
            return (
              <section key={t.id} className="rounded-xl border p-3 space-y-3">
                <div className="flex justify-between">
                  <h3 className="font-bold">
                    {t.name} · {directionLabel(t.direction, ar)}
                  </h3>
                  {!r && (
                    <button
                      type="button"
                      className="text-blue-700"
                      onClick={() =>
                        change(t.id, {
                          billingTypeId: t.id,
                          departureTime:
                            t.direction === "RETURN" ? "17:00" : "07:00",
                          returnDepartureTime:
                            t.direction === "BOTH" ? "17:00" : null,
                          saleAmount: 0,
                          costAmount: 0,
                          driverAllowance: 0,
                          vehicleCost: 0,
                        })
                      }
                    >
                      {ar ? "تحديد الوقت والسعر" : "Set time and price"}
                    </button>
                  )}
                </div>
                {r && (
                  <div className="grid sm:grid-cols-2 gap-3 ops-form-grid">
                    <label>
                      {ar ? "موعد الانطلاق" : "Departure"}
                      <input
                        type="time"
                        required
                        value={r.departureTime}
                        onChange={(e) =>
                          change(t.id, { departureTime: e.target.value })
                        }
                      />
                    </label>
                    {t.direction === "BOTH" && (
                      <label>
                        {ar ? "موعد انطلاق العودة" : "Return departure"}
                        <input
                          type="time"
                          required
                          value={r.returnDepartureTime || ""}
                          onChange={(e) =>
                            change(t.id, {
                              returnDepartureTime: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                    {(
                      [
                        ["saleAmount", ar ? "سعر العميل" : "Client price"],
                        ...(route.executionType === "SUPPLIER"
                          ? [
                              [
                                "costAmount",
                                ar ? "سعر المورد" : "Supplier price",
                              ],
                            ]
                          : [
                              [
                                "driverAllowance",
                                ar ? "بدل السائق" : "Driver allowance",
                              ],
                              [
                                "vehicleCost",
                                ar ? "تكلفة السيارة" : "Vehicle cost",
                              ],
                            ]),
                      ] as [keyof RouteRate, string][]
                    ).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={String(r[key] ?? 0)}
                          onChange={(e) =>
                            change(t.id, { [key]: Number(e.target.value) })
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        <button className="ops-button" disabled={save.isPending}>
          {ar ? "حفظ المواعيد والأسعار" : "Save times and prices"}
        </button>
      </form>
    </Modal>
  );
}
