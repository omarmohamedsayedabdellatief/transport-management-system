import { useAuth } from '../../contexts/AuthContext';
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { useCatalog, directionLabel } from "./catalog";
import { useLanguage } from "../../contexts/LanguageContext";
import { MutationNotice, QueryNotice } from "../ui/MutationNotice";
export function TypeSettings() {
  const {can}=useAuth();
  const { lang } = useLanguage(),
    ar = lang === "ar",
    q = useCatalog(),
    cache = useQueryClient();
  const [form, setForm] = useState({
    kind: "vehicle-types",
    id: "",
    name: "",
    direction: "OUTBOUND",
    active: true,
  });
  const save = useMutation({
    mutationFn: () =>
      form.id
        ? api.put(`/configuration/${form.kind}/${form.id}`, form)
        : api.post(`/configuration/${form.kind}`, form),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["configuration"] });
      setForm({ ...form, id: "", name: "", active: true });
    },
  });
  return (
    <section className="ops-panel ops-padded space-y-4">
      <h2 className="text-lg font-bold">
        {ar
          ? "أنواع السيارات وفوترة الرحلات"
          : "Vehicle and trip billing types"}
      </h2>
      <p className="text-sm text-slate-500">
        {ar
          ? "أضف الأنواع هنا، ثم حدد مواعيد وأسعار كل نوع من خطوط السير. تعطيل النوع يمنع اختياره للرحلات الجديدة ويحفظ السجلات السابقة."
          : "Add types here, then set their times and prices on each route. Deactivation preserves existing history."}
      </p>
      <QueryNotice failed={q.isError} retry={q.refetch} />
      <MutationNotice mutations={[save]} />
      <div className="grid md:grid-cols-2 gap-4">
        {(["vehicle-types", "billing-types"] as const).map((kind) => (
          <div key={kind}>
            <h3 className="font-bold mb-2">
              {kind === "vehicle-types"
                ? ar
                  ? "نوع السيارة"
                  : "Vehicle type"
                : ar
                  ? "نوع فوترة الرحلة"
                  : "Trip billing type"}
            </h3>
            {(kind === "vehicle-types"
              ? q.data?.vehicleTypes
              : q.data?.billingTypes
            )?.map((row: any) => (
              <div
                key={row.code || row.id}
                className="flex justify-between border-b py-2 gap-2 text-sm"
              >
                <span>
                  {row.name}{" "}
                  {row.direction && `· ${directionLabel(row.direction, ar)}`}{" "}
                  {!row.active && `(${ar ? "غير نشط" : "Inactive"})`}
                </span>
                <button disabled={!can('configuration.manage')}
                  className="text-blue-700"
                  onClick={() =>
                    setForm({
                      kind,
                      id: row.code || row.id,
                      name: row.name,
                      direction: row.direction || "OUTBOUND",
                      active: row.active,
                    })
                  }
                >
                  {ar ? "تعديل" : "Edit"}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <fieldset disabled={!can('configuration.manage')}><form
        className="ops-form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label>
          {ar ? "القائمة" : "Category"}
          <select
            value={form.kind}
            disabled={!!form.id}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
          >
            <option value="vehicle-types">
              {ar ? "نوع السيارة" : "Vehicle type"}
            </option>
            <option value="billing-types">
              {ar ? "نوع فوترة الرحلة" : "Trip billing type"}
            </option>
          </select>
        </label>
        <label>
          {ar ? "الاسم" : "Name"}
          <input
            required
            minLength={2}
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        {form.kind === "billing-types" && (
          <label>
            {ar ? "الاتجاه" : "Direction"}
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
            >
              {["OUTBOUND", "RETURN"].map((d) => (
                <option key={d} value={d}>
                  {directionLabel(d, ar)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          {ar ? "نشط" : "Active"}
        </label>
        <div className="flex gap-3">
          <button className="ops-button" disabled={save.isPending}>
            {form.id
              ? ar
                ? "حفظ التعديلات"
                : "Save changes"
              : ar
                ? "إضافة نوع"
                : "Add type"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, id: "", name: "", active: true })
              }
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
          )}
        </div>
      </form></fieldset>
    </section>
  );
}
