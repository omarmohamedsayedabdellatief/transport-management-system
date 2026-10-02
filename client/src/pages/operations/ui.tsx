import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useWords = () => {
  const { lang } = useLanguage();
  return (en: string, ar: string) => (lang === "ar" ? ar : en);
};
export const money = (v: any) =>
  new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dateText = (v: any) => (v ? String(v).slice(0, 10) : "—");
export function useData(path: string, enabled = true) {
  return useQuery<any>({
    queryKey: ["operations", path],
    queryFn: async () => (await api.get("/operations" + path)).data.data,
    enabled,
  });
}
export function useAction() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const w = useWords();
  async function run(path: string, body: any = {}, method = "post") {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const r = await api.request({
        url: "/operations" + path,
        method,
        data: body,
      });
      await qc.invalidateQueries({ queryKey: ["operations"] });
      await qc.invalidateQueries({ queryKey: ["trips"] });
      setSuccess(w("Saved successfully", "تم الحفظ بنجاح"));
      return r.data.data;
    } catch (e: any) {
      setError(
        e.response?.data?.error?.message ||
          w(
            "Could not save. Check your connection and try again.",
            "تعذر الحفظ. تحقق من الاتصال وحاول مرة أخرى.",
          ),
      );
      throw e;
    } finally {
      setBusy(false);
    }
  }
  return {
    run,
    busy,
    error,
    success,
    clear: () => {
      setError("");
      setSuccess("");
    },
    feedback: (
      <>
        {error && <Notice error>{error}</Notice>}
        {success && <Notice>{success}</Notice>}
      </>
    ),
  };
}
export function Notice({ error = false, children }: any) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`ops-notice ${error ? "error" : "success"}`}
    >
      {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{children}</span>
    </div>
  );
}
export function Button({
  children,
  secondary = false,
  danger = false,
  ...props
}: any) {
  return (
    <button
      {...props}
      className={`ops-button ${secondary ? "secondary" : ""} ${danger ? "danger" : ""} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}
export function Page({ title, description, actions, children }: any) {
  return (
    <div className="ops-page">
      <div className="ops-heading">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        <div className="ops-actions">{actions}</div>
      </div>
      {children}
    </div>
  );
}
export function Panel({ title, children, actions }: any) {
  return (
    <section className="ops-panel">
      {title && (
        <div className="ops-panel-heading">
          <h2>{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({ label, children, hint }: any) {
  return (
    <label className="ops-field">
      <span>{label}</span>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            "aria-label": label,
          })
        : children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({ children }: any) {
  return (
    <div className="ops-empty">
      <Inbox size={32} />
      <p>{children}</p>
    </div>
  );
}
export function Loading({ query }: any) {
  const w = useWords();
  if (query.isError)
    return (
      <Notice error>
        {w("Unable to load this workspace.", "تعذر تحميل هذه الصفحة.")}{" "}
        <button onClick={() => query.refetch()}>
          {w("Try again", "حاول مرة أخرى")}
        </button>
      </Notice>
    );
  return (
    <div className="ops-loading" role="status">
      {w("Loading workspace…", "جاري تحميل البيانات…")}
    </div>
  );
}
export function Status({ value }: any) {
  const w = useWords();
  const labels: Record<string, string> = {
    PENDING: "مستحق",
    ACTIVE: "نشط",
    INACTIVE: "غير نشط",
    SCHEDULED: "مجدولة",
    IN_PROGRESS: "قيد التنفيذ",
    COMPLETED: "مكتملة",
    CANCELLED: "ملغاة",
    DELAYED: "متأخرة",
    EXPECTED: "منتظر",
    BOARDED: "حضر",
    NO_SHOW: "غائب",
    DRAFT: "مسودة",
    ISSUED: "معتمدة",
    PAID: "مدفوعة",
    VOID: "ملغاة",
    OUTBOUND: "ذهاب",
    RETURN: "عودة",
    BOTH: "ذهاب وعودة",
    TRANSPORT: "نقل",
    STAFFING: "توظيف",
    READY: "جاهزة",
    CREATED: "تم الإنشاء",
    BLOCKED: "تحتاج مراجعة",
    EXISTS: "موجودة",
    MORNING: "صباحي",
    AFTERNOON: "مسائي",
    NIGHT: "ليلي",
    CUSTOM: "مخصص",
  };
  return (
    <span className={`ops-status ${String(value).toLowerCase()}`}>
      {w(String(value).toLowerCase().replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()), labels[value] || value)}
    </span>
  );
}
export function Dialog({ title, children, onClose }: any) {
  const ref = useRef<HTMLDialogElement>(null);
  const w = useWords();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      className="ops-dialog"
      ref={ref}
      onCancel={onClose}
      aria-label={title}
    >
      <div className="ops-panel-heading">
        <h2>{title}</h2>
        <button
          className="ops-icon"
          aria-label={w("Close", "إغلاق")}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="ops-dialog-body">{children}</div>
    </dialog>
  );
}
export function DataTable({
  rows,
  columns,
  searchPlaceholder,
  printAll = false,
  actions,
  empty,
}: any) {
  const w = useWords();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const selected = (rows || []).filter((r: any) =>
    JSON.stringify(r).toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const pageCount = Math.ceil(selected.length / 15);
  const current = Math.min(page, Math.max(0, pageCount - 1));
  return (
    <Panel>
      <div className="ops-toolbar">
        <div className="ops-search">
          <Search size={18} />
          <input
            aria-label={w("Search records", "البحث في السجلات")}
            placeholder={
              searchPlaceholder || w("Search records…", "ابحث في السجلات…")
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <span className="ops-muted">
          {selected.length} {w("records", "سجل")}
        </span>
      </div>
      {!selected.length ? (
        <Empty>
          {search ? w("No matching records. Try another search.", "لا توجد نتائج مطابقة. جرّب كلمة أخرى.") : empty ||
            w(
              "No records yet. Add your first record to get started.",
              "لا توجد سجلات. أضف أول سجل للبدء.",
            )}
        </Empty>
      ) : (
        <div className={"ops-table-wrap" + (printAll ? " ops-screen-table" : "")}>
          <table className="ops-table ops-responsive-table" role="table">
            <thead>
              <tr>
                {columns.map((c: any) => (
                  <th scope="col" key={c.key}>{c.label}</th>
                ))}
                {actions && <th>{w("Actions", "الإجراءات")}</th>}
              </tr>
            </thead>
            <tbody>
              {selected
                .slice(current * 15, current * 15 + 15)
                .map((row: any) => (
                  <tr key={row.id || row.date}>
                    {columns.map((c: any) => (
                      <td key={c.key} data-label={c.label}>
                        <div className="ops-cell-value">{c.render ? c.render(row) : (row[c.key] ?? "—")}</div>
                      </td>
                    ))}
                    {actions && (
                      <td data-label={w("Actions", "الإجراءات")}>
                        <div className="ops-actions">{actions(row)}</div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {printAll && <table className="ops-table ops-print-all"><thead><tr>{columns.map((c: any)=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{(rows || []).map((r: any,i: number)=><tr key={r.id || i}>{columns.map((c: any)=><td key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? "—")}</td>)}</tr>)}</tbody></table>}
      {pageCount > 1 && (
        <div className="ops-pagination">
          <Button
            secondary
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label={w("Previous page", "الصفحة السابقة")}
          >
            <ChevronLeft size={18} />
          </Button>
          <span>
            {current + 1} / {pageCount}
          </span>
          <Button
            secondary
            disabled={current + 1 >= pageCount}
            onClick={() => setPage(current + 1)}
            aria-label={w("Next page", "الصفحة التالية")}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      )}
    </Panel>
  );
}
export function AddButton({ onClick, children }: any) {
  const w = useWords();
  return (
    <Button onClick={onClick}>
      <Plus size={18} />
      {children || w("Add new", "إضافة جديد")}
    </Button>
  );
}
export function exportCsv(
  name: string,
  rows: any[],
  columns: { key: string; label: string }[],
) {
  const cell = (v: any) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const csv =
    "\ufeff" +
    [
      columns.map((c) => cell(c.label)).join(","),
      ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(",")),
    ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}
