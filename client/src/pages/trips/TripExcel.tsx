import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { Dialog, Notice, today } from "../operations/ui";
import { useLanguage } from "../../contexts/LanguageContext";
import "./trip-excel.css";

const normalize = (v: any) =>
  String(v ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\s_\-/():]+/g, "");
const prices = [
  ["saleAmount", "سعر العميل", "Client price"],
  ["costAmount", "تكلفة المورد", "Supplier cost"],
  ["driverAllowance", "أجر الدورة", "Driver pay"],
  ["vehicleCost", "تكلفة السيارة", "Vehicle cost"],
];
export function TripExcel({ onClose }: { onClose: () => void }) {
  const { lang } = useLanguage(),
    ar = lang === "ar",
    w = (a: string, b: string) => (ar ? a : b),
    cache = useQueryClient();
  const [file, setFile] = useState({ fileName: "", fileContent: "" }),
    [inspection, setInspection] = useState<any>(null),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [headerRow, setHeaderRow] = useState(1);
  const [startDate, setStart] = useState(today()),
    [endDate, setEnd] = useState(today()),
    [companyIds, setCompanies] = useState<string[]>([]),
    [newCompanies, setNewCompanies] = useState<string[]>([]);
  const [mode, setMode] = useState("MERGE"),
    [dateOrder, setDateOrder] = useState("DMY"),
    [allowEmpty, setAllowEmpty] = useState(false),
    [overrides, setOverrides] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<any>(null),
    [confirmed, setConfirmed] = useState(false),
    [result, setResult] = useState<any>(null),
    [page, setPage] = useState(0);
  const lookups = useQuery({
    queryKey: ["trip-excel-lookups"],
    queryFn: async () => (await api.get("/trips/excel/lookups")).data.data,
  });
  const data = lookups.data || {
    companies: [],
    drivers: [],
    vehicles: [],
    routes: [],
  };
  const invalidate = () => {
    setPreview(null);
    setConfirmed(false);
    setResult(null);
  };
  const change = (fn: () => void) => {
    invalidate();
    fn();
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e: any) {
      setError(
        e.response?.data?.error?.message ||
          e.message ||
          w("تعذر إكمال العملية", "Could not complete the operation"),
      );
    } finally {
      setBusy(false);
    }
  };
  async function inspect(
    nextFile = file,
    sheet?: string,
    row?: number,
    reset = false,
  ) {
    const r = (
      await api.post("/trips/excel/inspect", {
        fileContent: nextFile.fileContent,
        sheet,
        headerRow: row,
      })
    ).data.data;
    setInspection(r);
    setMapping(r.mapping);
    setHeaderRow(r.headerRow);
    setPage(0);
    setOverrides({});
    invalidate();
    if (reset) {
      const values = r.data
        .map((x: any) => String(x.cells[r.mapping.date] || ""))
        .filter((v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v))
        .sort();
      if (values.length) {
        setStart(values[0]);
        setEnd(values[values.length - 1]);
      }
      const companies = r.data.map((x: any) =>
        normalize(x.cells[r.mapping.company]),
      );
      setCompanies(
        data.companies
          .filter((c: any) => companies.includes(normalize(c.companyName)))
          .map((c: any) => c.id),
      );
      setNewCompanies([]);
    }
  }
  const cell = (r: any, k: string) => String(r.cells[mapping[k]] ?? "");
  const companyNames = [
    ...new Set<string>(
      (inspection?.data || [])
        .map((r: any) => cell(r, "company"))
        .filter(Boolean),
    ),
  ];
  const unknownCompanies = companyNames.filter(
    (n) =>
      !data.companies.some(
        (c: any) => normalize(c.companyName) === normalize(n),
      ),
  );
  const patch = (row: number, key: string, value: any) =>
    change(() =>
      setOverrides((old) => ({ ...old, [row]: { ...old[row], [key]: value } })),
    );
  async function upload(fileToRead?: File) {
    if (!fileToRead) return;
    invalidate();
    setInspection(null);
    setFile({ fileName: "", fileContent: "" });
    if (fileToRead.size > 1024 * 1024)
      throw new Error(w("الحد الأقصى للملف 1 MB", "Maximum file size is 1 MB"));
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(fileToRead);
    });
    const next = { fileName: fileToRead.name, fileContent: content };
    setFile(next);
    await inspect(next, undefined, undefined, true);
  }
  async function download() {
    const r = await api.get("/trips/excel/export", {
      params: { startDate, endDate, companyIds: companyIds.join(",") },
      responseType: "blob",
    });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trips_${startDate}_${endDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Dialog
      title={w(
        "استيراد وتصدير الرحلات من Excel",
        "Import and export trips with Excel",
      )}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="trip-excel space-y-5" aria-busy={busy}>
        <p>
          {w(
            "نزّل رحلات الشركات والفترة المختارة، عدّل الملف ثم ارفعه. احتفظ بمعرف الرحلة للتعديل واتركه فارغًا للإضافة. حذف صف من الملف يحذف الرحلة فقط في وضع استبدال النطاق وبعد تأكيد المعاينة.",
            "Download the selected companies and dates, edit the workbook, then upload it. Keep trip IDs for edits; leave them blank for new trips. Removing rows deletes trips only in Replace mode after reviewing the preview.",
          )}
        </p>
        {error && <Notice error>{error}</Notice>}
        {lookups.isError && (
          <Notice error>
            {w("تعذر تحميل بيانات الربط.", "Could not load reference data.")}{" "}
            <button onClick={() => lookups.refetch()}>
              {w("إعادة المحاولة", "Retry")}
            </button>
          </Notice>
        )}
        <fieldset disabled={busy || !!result} className="space-y-4">
          <div className="ops-form-grid">
            <label>
              {w("من تاريخ", "From date")}
              <input
                type="date"
                value={startDate}
                onChange={(e) => change(() => setStart(e.target.value))}
              />
            </label>
            <label>
              {w("إلى تاريخ", "To date")}
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => change(() => setEnd(e.target.value))}
              />
            </label>
          </div>
          <fieldset className="excel-scope">
            <legend>
              {w(
                "الشركات التي ستتأثر فقط",
                "Only these companies will be affected",
              )}
            </legend>
            {data.companies.map((c: any) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={companyIds.includes(c.id)}
                  onChange={(e) =>
                    change(() =>
                      setCompanies((ids) =>
                        e.target.checked
                          ? [...ids, c.id]
                          : ids.filter((id) => id !== c.id),
                      ),
                    )
                  }
                />
                {c.companyName}
              </label>
            ))}
            {!data.companies.length && (
              <p>
                {w(
                  "لا توجد شركات مسجلة بعد. ارفع الملف لاختيار إنشاء شركاته.",
                  "No companies yet. Upload a file to create its companies.",
                )}
              </p>
            )}
          </fieldset>
          <button
            type="button"
            className="ops-button secondary"
            disabled={!companyIds.length || !startDate || !endDate}
            onClick={() => run(download)}
          >
            {w("تنزيل Excel قابل للتعديل", "Download editable Excel")}
          </button>
          <label className="excel-file">
            {w(
              "رفع ملف XLSX / XLS / CSV — حتى 1000 رحلة و1 MB",
              "Upload XLSX / XLS / CSV — up to 1,000 trips and 1 MB",
            )}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => run(() => upload(e.target.files?.[0]))}
            />
          </label>
          {inspection && (
            <>
              <div className="ops-form-grid">
                <label>
                  {w("ورقة العمل", "Worksheet")}
                  <select
                    value={inspection.sheet}
                    onChange={(e) => run(() => inspect(file, e.target.value))}
                  >
                    {inspection.sheets.map((s: string) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {w("رقم صف العناوين", "Header row")}
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={headerRow}
                    onChange={(e) =>
                      change(() => setHeaderRow(Number(e.target.value)))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="ops-button secondary"
                  onClick={() =>
                    run(() => inspect(file, inspection.sheet, headerRow))
                  }
                >
                  {w("إعادة قراءة العناوين", "Read headers again")}
                </button>
                <label>
                  {w(
                    "ترتيب التواريخ المكتوبة بشرطة /",
                    "Slash-separated date order",
                  )}
                  <select
                    value={dateOrder}
                    onChange={(e) => change(() => setDateOrder(e.target.value))}
                  >
                    <option value="DMY">DD/MM/YYYY</option>
                    <option value="MDY">MM/DD/YYYY</option>
                  </select>
                </label>
              </div>
              <details>
                <summary>
                  {w(
                    "ربط الأعمدة (لملفات مختلفة قليلًا)",
                    "Column mapping (for variations in spreadsheets)",
                  )}
                </summary>
                <div className="ops-form-grid mt-3">
                  {inspection.fields.map((f: any) => (
                    <label key={f.key}>
                      {ar ? f.label : f.key}
                      <select
                        value={mapping[f.key] || ""}
                        onChange={(e) =>
                          change(() =>
                            setMapping((m) => ({
                              ...m,
                              [f.key]: e.target.value,
                            })),
                          )
                        }
                      >
                        <option value="">
                          {w("غير موجود / تجاهل", "Not present / ignore")}
                        </option>
                        {inspection.headers.filter(Boolean).map((h: string) => (
                          <option key={h}>{h}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </details>
              {!!unknownCompanies.length && (
                <fieldset className="excel-scope">
                  <legend>
                    {w(
                      "السماح بإنشاء الشركات غير الموجودة (أو اربط الصف بشركة موجودة أدناه)",
                      "Allow creation of missing companies (or map rows below)",
                    )}
                  </legend>
                  {unknownCompanies.map((n) => (
                    <label key={n}>
                      <input
                        type="checkbox"
                        checked={newCompanies.includes(n)}
                        onChange={(e) =>
                          change(() =>
                            setNewCompanies((ids) =>
                              e.target.checked
                                ? [...ids, n]
                                : ids.filter((x) => x !== n),
                            ),
                          )
                        }
                      />
                      {n}
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="ops-form-grid">
                <label>
                  {w("طريقة الحفظ", "Save mode")}
                  <select
                    value={mode}
                    onChange={(e) =>
                      change(() => {
                        setMode(e.target.value);
                        setAllowEmpty(false);
                      })
                    }
                  >
                    <option value="MERGE">
                      {w(
                        "إضافة وتحديث فقط — بدون حذف",
                        "Add and update — no deletions",
                      )}
                    </option>
                    <option value="REPLACE">
                      {w(
                        "استبدال نطاق الشركات والتواريخ المختار",
                        "Replace selected companies and date range",
                      )}
                    </option>
                  </select>
                </label>
              </div>
              {mode === "REPLACE" && (
                <div className="excel-warning">
                  <p>
                    {w(
                      "كل رحلة داخل الشركات والتواريخ المختارة وغير موجودة في الملف ستُحذف، بما فيها الرحلات المدخلة يدويًا. الصفوف خارج الفترة تُتخطى. الفواتير والحضور يحميان الرحلات من الاستبدال.",
                      "Trips missing from the file in the selected companies and dates will be deleted, including manually entered trips. Rows outside the date range are skipped. Invoiced trips and attendance records are protected.",
                    )}
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={allowEmpty}
                      onChange={(e) =>
                        change(() => setAllowEmpty(e.target.checked))
                      }
                    />
                    {w(
                      "أسمح بمعاينة حذف النطاق بالكامل إذا لم توجد صفوف داخله",
                      "Allow previewing deletion of the entire range when no rows remain",
                    )}
                  </label>
                </div>
              )}
              <p>
                {w(
                  "كل صف رحلة واحدة. يتم استخدام السائق والسيارة والأسعار المطابقة أو إعدادات الخط. أكمل المفقود أدناه؛ اختيار سائق يحدد سيارته المرتبطة. للخط الجديد أدخل الأسعار الأربعة ولو صفرًا.",
                  "One trip per row. Matching resources and route prices are used. Fill missing information below; selecting a driver selects their assigned vehicle. New routes require all four prices, including explicit zeros.",
                )}
              </p>
              <div className="excel-rows">
                {inspection.data
                  .slice(page * 20, page * 20 + 20)
                  .map((r: any) => (
                    <details key={r.row} className="excel-row">
                      <summary>
                        {w("صف", "Row")} {r.row} · {cell(r, "date")} ·{" "}
                        {cell(r, "company")} · {cell(r, "route")} ·{" "}
                        {cell(r, "driver") || w("بدون سائق", "No driver")}
                      </summary>
                      <p className="text-slate-500">
                        {cell(r, "direction")} · {cell(r, "departure")} →{" "}
                        {cell(r, "arrival")} · {cell(r, "vehicleType")}
                      </p>
                      <div className="ops-form-grid">
                        <label>
                          {w("ربط الشركة", "Map company")}
                          <select
                            value={overrides[r.row]?.companyId || ""}
                            onChange={(e) =>
                              patch(
                                r.row,
                                "companyId",
                                e.target.value || undefined,
                              )
                            }
                          >
                            <option value="">
                              {w("مطابقة اسم الشركة", "Match company name")}
                            </option>
                            {data.companies.map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.companyName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {w("ربط الخط", "Map route")}
                          <select
                            value={overrides[r.row]?.routeId || ""}
                            onChange={(e) =>
                              patch(
                                r.row,
                                "routeId",
                                e.target.value || undefined,
                              )
                            }
                          >
                            <option value="">
                              {w(
                                "مطابقة الاسم أو إنشاء خط",
                                "Match name or create route",
                              )}
                            </option>
                            {data.routes.map((route: any) => (
                              <option key={route.id} value={route.id}>
                                {
                                  data.companies.find(
                                    (c: any) => c.id === route.clientId,
                                  )?.companyName
                                }{" "}
                                / {route.routeName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {w("السائق", "Driver")}
                          <select
                            value={overrides[r.row]?.driverId || ""}
                            onChange={(e) => {
                              const d = data.drivers.find(
                                (d: any) => d.id === e.target.value,
                              );
                              change(() =>
                                setOverrides((o) => ({
                                  ...o,
                                  [r.row]: {
                                    ...o[r.row],
                                    driverId: d?.id,
                                    vehicleId:
                                      d?.assignedVehicleId || undefined,
                                  },
                                })),
                              );
                            }}
                          >
                            <option value="">
                              {w(
                                "مطابقة الملف أو الخط",
                                "Match workbook or route",
                              )}
                            </option>
                            {data.drivers.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.fullName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {w("السيارة", "Vehicle")}
                          <select
                            value={overrides[r.row]?.vehicleId || ""}
                            onChange={(e) =>
                              patch(
                                r.row,
                                "vehicleId",
                                e.target.value || undefined,
                              )
                            }
                          >
                            <option value="">
                              {w(
                                "مطابقة الملف أو سيارة السائق",
                                "Match workbook or driver assignment",
                              )}
                            </option>
                            {data.vehicles.map((v: any) => (
                              <option key={v.id} value={v.id}>
                                {v.plateNumber} · {v.vehicleType}
                              </option>
                            ))}
                          </select>
                        </label>
                        {prices.map(([key, a, en]) => (
                          <label key={key}>
                            {w(a, en)}
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={overrides[r.row]?.[key] ?? ""}
                              placeholder={
                                cell(r, key) || w("سعر الخط", "Route price")
                              }
                              onChange={(e) =>
                                patch(
                                  r.row,
                                  key,
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </details>
                  ))}
              </div>
              {inspection.data.length > 20 && (
                <div className="ops-actions">
                  <button
                    type="button"
                    className="ops-button secondary"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {w("السابق", "Previous")}
                  </button>
                  <span>
                    {page + 1} / {Math.ceil(inspection.data.length / 20)}
                  </span>
                  <button
                    type="button"
                    className="ops-button secondary"
                    disabled={(page + 1) * 20 >= inspection.data.length}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {w("التالي", "Next")}
                  </button>
                </div>
              )}
              <button
                type="button"
                className="ops-button"
                disabled={!companyIds.length && !newCompanies.length}
                onClick={() =>
                  run(async () => {
                    setPreview(null);
                    setConfirmed(false);
                    setPreview(
                      (
                        await api.post("/trips/excel/preview", {
                          ...file,
                          sheet: inspection.sheet,
                          headerRow,
                          mapping,
                          startDate,
                          endDate,
                          companyIds,
                          newCompanies,
                          mode,
                          dateOrder,
                          allowEmpty,
                          overrides,
                        })
                      ).data.data,
                    );
                  })
                }
              >
                {w("فحص ومعاينة قبل الحفظ", "Validate and preview")}
              </button>
            </>
          )}
        </fieldset>
        {busy && (
          <p role="status">
            {w(
              "جارٍ فحص البيانات وتنفيذ العملية…",
              "Checking data and processing…",
            )}
          </p>
        )}
        {preview && !result && (
          <section
            className="excel-preview space-y-3"
            aria-label={w("معاينة الاستيراد", "Import preview")}
          >
            <h3>{w("نتيجة المعاينة", "Preview results")}</h3>
            <p>
              {startDate} → {endDate} ·{" "}
              {data.companies
                .filter((c: any) => companyIds.includes(c.id))
                .map((c: any) => c.companyName)
                .concat(newCompanies)
                .join("، ")}
            </p>
            <div className="excel-counts">
              {[
                ["created", "إضافة", "Add"],
                ["updated", "تحديث", "Update"],
                ["deleted", "حذف", "Delete"],
                ["unchanged", "بدون تغيير", "Unchanged"],
                ["skipped", "خارج الفترة", "Outside range"],
              ].map(([key, a, en]) => (
                <div key={key}>
                  <span>{w(a, en)}</span>
                  <strong>{preview[key]}</strong>
                </div>
              ))}
            </div>
            {["companies", "routes", "rates"].map(
              (k) =>
                preview.creations[k].length > 0 && (
                  <p key={k}>
                    {w(
                      (
                        {
                          companies: "شركات جديدة",
                          routes: "خطوط جديدة",
                          rates: "تسعير جديد",
                        } as any
                      )[k],
                      `New ${k}`,
                    )}
                    : {preview.creations[k].join("، ")}
                  </p>
                ),
            )}
            {preview.warnings.map((m: string, i: number) => (
              <p className="excel-warning" key={i}>
                {m}
              </p>
            ))}
            <div className="overflow-x-auto">
              <table className="ops-table">
                <thead>
                  <tr>
                    {[
                      w("الصف", "Row"),
                      w("الرحلة", "Trip"),
                      w("الإجراء", "Action"),
                      w("السائق / السيارة", "Driver / vehicle"),
                      w("سعر العميل", "Client price"),
                      w("تكلفة المورد", "Supplier cost"),
                      w("أجر الدورة", "Driver pay"),
                      w("تكلفة السيارة", "Vehicle cost"),
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r: any) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.label}</td>
                      <td>
                        {ar
                          ? (
                              {
                                CREATE: "إضافة",
                                UPDATE: "تحديث",
                                KEEP: "بدون تغيير",
                              } as any
                            )[r.action]
                          : r.action}
                      </td>
                      <td>
                        {r.driver} / {r.plate}
                      </td>
                      <td>{r.saleAmount}</td>
                      <td>{r.costAmount}</td>
                      <td>{r.driverAllowance}</td>
                      <td>{r.vehicleCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!!preview.deletedTrips.length && (
              <details>
                <summary>
                  {w("عرض الرحلات التي ستُحذف", "Show trips to be deleted")} (
                  {preview.deletedTrips.length})
                </summary>
                {preview.deletedTrips.map((t: any) => (
                  <p key={t.id}>
                    {t.date} · {t.tripNumber}
                  </p>
                ))}
              </details>
            )}
            <p>
              {w(
                "الحفظ يُحدّث التشغيل والاستحقاقات. التحصيلات والمدفوعات النقدية محفوظة. تنتهي المعاينة بعد 30 دقيقة وتُرفض إذا تغيرت البيانات.",
                "Saving updates dispatch and accruals, preserving cash receipts and payments. Preview expires after 30 minutes and is rejected if the source data changes.",
              )}
            </p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {w(
                `راجعت الشركات والفترة وأوافق على إضافة ${preview.created} وتحديث ${preview.updated} وحذف ${preview.deleted} رحلة.`,
                `I reviewed the scope and confirm ${preview.created} additions, ${preview.updated} updates and ${preview.deleted} deletions.`,
              )}
            </label>
            <button
              className="ops-button"
              disabled={!confirmed || busy}
              onClick={() =>
                run(async () => {
                  setResult(
                    (
                      await api.post("/trips/excel/commit", {
                        batchId: preview.batchId,
                        confirm: true,
                      })
                    ).data.data,
                  );
                  await cache.invalidateQueries();
                })
              }
            >
              {w("تأكيد وحفظ الاستيراد", "Confirm and save import")}
            </button>
          </section>
        )}
        {result && (
          <Notice>
            {w("تم الحفظ بنجاح. إضافة", "Saved. Added")} {result.created} ·{" "}
            {w("تحديث", "updated")} {result.updated} · {w("حذف", "deleted")}{" "}
            {result.deleted}
            <button className="ops-button secondary" onClick={onClose}>
              {w("العودة للتشغيل", "Back to trips")}
            </button>
          </Notice>
        )}
      </div>
    </Dialog>
  );
}
