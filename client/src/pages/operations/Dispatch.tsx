import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users,
  Bus,
  CalendarDays,
  CalendarCheck,
  ArrowUpRight,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  useWords,
  useData,
  useAction,
  Page,
  Panel,
  Dialog,
  Field,
  Button,
  Status,
  Loading,
  DataTable,
  Empty,
  today,
} from "./ui";
import { RecordFields } from "./Records";

export function Dispatch() {
  const w = useWords();
  const { user, canManage } = useAuth();
  const [params, setParams] = useSearchParams();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") || "") ? params.get("date")! : today();
  const status = params.get("status") || "ALL";
  const setDate = (value: string) => { const next = new URLSearchParams(params); if (value) next.set("date", value); else next.delete("date"); next.delete("trip"); setParams(next); };
  const setStatus = (value: string) => { const next = new URLSearchParams(params); if (value === "ALL") next.delete("status"); else next.set("status", value); setParams(next); };
  const q = useData("/trips" + (date ? "?date=" + date : ""));
  const clientsQ = useData("/clients", canManage);
  const genAction = useAction();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genForm, setGenForm] = useState({
    date: date || today(),
    clientId: "",
    shift: "MORNING",
    departureTime: "",
  });
  const [genResult, setGenResult] = useState<any>(null);

  const selected = params.get("trip");
  const setSelected = (value: string | null) => { const next = new URLSearchParams(params); if (value) next.set("trip", value); else next.delete("trip"); setParams(next); };
  const canOperate = canManage || user?.role === "DRIVER";
  const rows = (q.data || []).filter(
    (t: any) => status === "ALL" || t.tripStatus === status,
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await genAction.run("/trips/generate-daily-from-templates", {
        date: genForm.date,
        clientId: genForm.clientId || undefined,
        shift: genForm.shift,
        departureTime: genForm.departureTime || undefined,
      });
      setGenResult(res);
      q.refetch();
    } catch {}
  }

  return (
    <Page
      title={w("Dispatch board", "لوحة التشغيل")}
      description={w(
        "Follow each trip from departure to attendance and completion. Times are shown in Cairo time.",
        "تابع كل رحلة من الانطلاق إلى تسجيل الحضور وإتمام الخدمة. الأوقات بتوقيت القاهرة.",
      )}
      actions={
        <>
          {canManage && (
            <>
              <Button
                onClick={() => {
                  setGenForm({ date: date || today(), clientId: "", shift: "MORNING", departureTime: "" });
                  setGenResult(null);
                  setShowGenerateModal(true);
                }}
              >
                <CalendarCheck size={18} />
                {w("Generate daily trips", "توليد رحلات اليوم")}
              </Button>
              <Link className="ops-button" to="/schedules">
                <CalendarDays size={18} />
                {w("Plan trips", "تخطيط الرحلات")}
              </Link>
            </>
          )}
          <Button
            secondary
            onClick={() => q.refetch()}
            aria-label={w("Refresh trips", "تحديث الرحلات")}
          >
            <RefreshCw size={18} />
          </Button>
        </>
      }
    >
      <Panel>
        <div className="ops-filters">
          <Field label={w("Service date", "تاريخ التشغيل")}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label={w("Trip status", "حالة الرحلة")}>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {[
                "ALL",
                "SCHEDULED",
                "IN_PROGRESS",
                "COMPLETED",
                "DELAYED",
                "CANCELLED",
              ].map((v) => (
                <option key={v} value={v}>
                  {w(
                    v.replaceAll("_", " "),
                    (
                      {
                        ALL: "كل الحالات",
                        SCHEDULED: "مجدولة",
                        IN_PROGRESS: "قيد التنفيذ",
                        COMPLETED: "مكتملة",
                        DELAYED: "متأخرة",
                        CANCELLED: "ملغاة",
                      } as any
                    )[v],
                  )}
                </option>
              ))}
            </select>
          </Field>
          <div className="ops-filter-count">
            <strong>{rows.length}</strong>
            <span>{w("trips", "رحلات")}</span>
          </div>
        </div>
      </Panel>
      {q.isLoading || q.isError ? (
        <Loading query={q} />
      ) : !rows.length ? (
        <Panel>
          <Empty>
            {w(
              "No trips match this date and status. Choose another date or generate trips from a schedule.",
              "لا توجد رحلات لهذا التاريخ والحالة. اختر تاريخًا آخر أو أنشئ رحلات من جدول التشغيل.",
            )}
          </Empty>
        </Panel>
      ) : (
        <div className="ops-dispatch-grid">
          {rows.map((t: any) => (
            <article className="ops-trip-card" key={t.id}>
              <div className="ops-trip-card-top">
                <Status value={t.tripStatus} />
                <span>
                  {new Date(t.scheduledDeparture).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Cairo",
                  })}
                </span>
              </div>
              <h2>{t.route.routeName}</h2>
              <p>
                {t.client.companyName} · <Status value={t.direction} />
              </p>
              <div className="ops-trip-resources">
                <div>
                  <Bus size={17} />
                  <span>
                    {t.vehicle.plateNumber}
                    <small>
                      {t.supplier?.name || w("Company fleet", "أسطول الشركة")}
                    </small>
                  </span>
                </div>
                <div>
                  <Users size={17} />
                  <span>
                    {t.driver.fullName}
                    <small>
                      {t.manifest.length} / {t.vehicle.capacity}{" "}
                      {w("seats", "مقعد")}
                    </small>
                  </span>
                </div>
              </div>
              <div className="ops-trip-card-bottom">
                <span className="ops-muted">{t.tripNumber}</span>
                <Button secondary onClick={() => setSelected(t.id)}>
                  {canOperate
                    ? w("Manage trip", "إدارة الرحلة")
                    : w("View details", "عرض التفاصيل")}
                  <ArrowUpRight size={16} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <TripDetails tripId={selected} onClose={() => setSelected(null)} />
      )}
      {showGenerateModal && (
        <Dialog
          title={w("Generate Daily Trips from Route Templates", "توليد رحلات اليوم من قوالب الخطوط")}
          onClose={() => setShowGenerateModal(false)}
        >
          {genAction.feedback}
          {genResult && (
            <div className="ops-alert ops-alert-success" style={{ marginBottom: "1rem" }}>
              <strong>
                {w(
                  `Generated ${genResult.generatedCount || genResult.data?.generatedCount || 0} trips (${genResult.skippedCount || genResult.data?.skippedCount || 0} skipped).`,
                  `تم بنجاح توليد ${genResult.generatedCount || genResult.data?.generatedCount || 0} رحلة (${genResult.skippedCount || genResult.data?.skippedCount || 0} تم تخطيها).`
                )}
              </strong>
            </div>
          )}
          <form onSubmit={handleGenerate} className="ops-form">
            <Field label={w("Target Date", "تاريخ التشغيل المطلوب")}>
              <input
                type="date"
                required
                value={genForm.date}
                onChange={(e) => setGenForm({ ...genForm, date: e.target.value })}
              />
            </Field>
            <Field label={w("Client Company (Optional / All)", "الشركة العميل (اختياري / الكل)")}>
              <select
                value={genForm.clientId}
                onChange={(e) => setGenForm({ ...genForm, clientId: e.target.value })}
              >
                <option value="">{w("All Companies & Active Routes", "جميع الشركات والخطوط النشطة")}</option>
                {(clientsQ.data || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={w("Shift", "الوردية")}>
              <select
                value={genForm.shift}
                onChange={(e) => setGenForm({ ...genForm, shift: e.target.value })}
              >
                <option value="MORNING">{w("Morning", "صباحية (Morning)")}</option>
                <option value="AFTERNOON">{w("Afternoon", "مسائية (Afternoon)")}</option>
                <option value="NIGHT">{w("Night", "ليلية (Night)")}</option>
              </select>
            </Field>
            <Field label={w("Departure Time (Optional)", "وقت المغادرة (اختياري)")}>
              <input
                type="time"
                value={genForm.departureTime}
                onChange={(e) => setGenForm({ ...genForm, departureTime: e.target.value })}
              />
            </Field>
            <div className="ops-actions ops-spaced" style={{ marginTop: "1rem" }}>
              <Button secondary type="button" onClick={() => setShowGenerateModal(false)}>
                {w("Close", "إغلاق")}
              </Button>
              <Button disabled={genAction.busy}>
                {w("Generate Now", "توليد الرحلات الآن")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </Page>
  );
}
function TripDetails({ tripId, onClose }: any) {
  const w = useWords();
  const { user, canManage } = useAuth();
  const q = useData("/trips/" + tripId);
  const lookup = useData("/bootstrap", canManage);
  const a = useAction();
  const [confirmBoarding, setConfirmBoarding] = useState(false);
  const [reason, setReason] = useState("");
  const [replacement, setReplacement] = useState<any>(null);
  const [pendingStatus, setPendingStatus] = useState("");
  const t = q.data;
  const canOperate = canManage || user?.role === "DRIVER";
  async function run(path: string, body: any) {
    try {
      await a.run(`/trips/${tripId}/` + path, body);
      setPendingStatus("");
      if (path === "incident") setReason("");
      if (path === "replace") setReplacement(null);
    } catch {}
  }
  return (
    <Dialog
      title={t?.route.routeName || w("Trip details", "تفاصيل الرحلة")}
      onClose={onClose}
    >
      {!t ? (
        <Loading query={q} />
      ) : (
        <>
          {a.feedback}
          <div className="ops-detail-meta">
            <Status value={t.tripStatus} />
            <Status value={t.direction} />
            <span>{t.tripNumber}</span>
          </div>
          <p className="ops-help">
            {t.client.companyName} · {t.vehicle.plateNumber} ·{" "}
            {t.driver.fullName}
          </p>
          {canOperate && (
            <div className="ops-actions ops-spaced">
              {["SCHEDULED", "DELAYED"].includes(t.tripStatus) && (
                <>
                  <Button
                    disabled={a.busy}
                    onClick={() => setPendingStatus("IN_PROGRESS")}
                  >
                    <ArrowRight size={17} />
                    {w("Start trip", "بدء الرحلة")}
                  </Button>
                  {t.tripStatus === "SCHEDULED" && (
                    <Button
                      secondary
                      onClick={() => setPendingStatus("DELAYED")}
                    >
                      {w("Mark delayed", "تسجيل تأخير")}
                    </Button>
                  )}
                  <Button
                    secondary
                    onClick={() => setPendingStatus("CANCELLED")}
                  >
                    {w("Cancel trip", "إلغاء الرحلة")}
                  </Button>
                </>
              )}
              {t.tripStatus === "IN_PROGRESS" && (
                <>
                  <Button
                    secondary
                    disabled={a.busy}
                    onClick={() => setPendingStatus("DELAYED")}
                  >
                    {w("Pause / breakdown", "توقف / عطل")}
                  </Button>
                  <Button
                    disabled={a.busy}
                    onClick={() => setPendingStatus("COMPLETED")}
                  >
                    <CheckCircle2 size={17} />
                    {w("Complete trip", "إتمام الرحلة")}
                  </Button>
                </>
              )}
              {canManage && ["SCHEDULED", "DELAYED"].includes(t.tripStatus) && (
                <>
                  <Button
                    secondary
                    disabled={a.busy || !!t.actualDeparture}
                    title={t.actualDeparture ? w("Attendance is preserved after departure", "يتم الاحتفاظ بالحضور بعد بدء الرحلة") : undefined}
                    onClick={() => run("manifest", {})}
                  >
                    {w("Refresh passenger list", "تحديث قائمة الركاب")}
                  </Button>
                  <Button
                    secondary
                    onClick={() =>
                      setReplacement({
                        vehicleId: t.vehicleId,
                        driverId: t.driverId,
                        supplierId: t.supplierId || "",
                        costAmount: Number(t.costAmount),
                        reason: "",
                      })
                    }
                  >
                    {w("Replace resources", "تبديل المركبة أو السائق")}
                  </Button>
                </>
              )}
            </div>
          )}
          {pendingStatus && (
            <Panel title={w("Confirm trip update", "تأكيد تحديث الرحلة")}>
              <p className="ops-help">
                {w("New status: ", "الحالة الجديدة: ")}
                <Status value={pendingStatus} />
              </p>
              {["DELAYED", "CANCELLED"].includes(pendingStatus) && (
                <Field label={w("Reason", "السبب")}>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </Field>
              )}
              <div className="ops-form-footer">
                <Button secondary onClick={() => setPendingStatus("")}>
                  {w("Back", "رجوع")}
                </Button>
                <Button
                  disabled={a.busy}
                  onClick={() =>
                    run("status", { status: pendingStatus, reason })
                  }
                >
                  {w("Confirm", "تأكيد")}
                </Button>
              </div>
            </Panel>
          )}
          {replacement && lookup.data && (
            <Panel title={w("Replacement assignment", "تعيين بديل")}>
              <RecordFields
                lookup={lookup.data}
                form={replacement}
                setForm={setReplacement}
                fields={[
                  {
                    key: "vehicleId",
                    en: "Vehicle",
                    ar: "المركبة",
                    source: "vehicles",
                  },
                  {
                    key: "driverId",
                    en: "Driver",
                    ar: "السائق",
                    source: "drivers",
                  },
                  {
                    key: "supplierId",
                    en: "Supplier",
                    ar: "المورد",
                    source: "transport",
                  },
                  {
                    key: "costAmount",
                    en: "Supplier cost for this trip",
                    ar: "تكلفة المورد لهذه الرحلة",
                    type: "number",
                  },
                  { key: "reason", en: "Reason for change", ar: "سبب التغيير" },
                ]}
              />
              <div className="ops-form-footer">
                <Button secondary onClick={() => setReplacement(null)}>
                  {w("Cancel", "إلغاء")}
                </Button>
                <Button
                  disabled={a.busy}
                  onClick={() => run("replace", replacement)}
                >
                  {w("Apply replacement", "اعتماد البديل")}
                </Button>
              </div>
            </Panel>
          )}
          <div className="attendance-progress">
            <div><strong dir="ltr">{t.manifest.filter((m: any) => m.status !== "EXPECTED").length} / {t.manifest.length}</strong><span>{w("attendance recorded", "تم تسجيل حالتهم")}</span></div>
            {canOperate && t.tripStatus === "IN_PROGRESS" && t.manifest.some((m: any) => m.status === "EXPECTED") && <Button secondary disabled={a.busy} onClick={() => setConfirmBoarding(!confirmBoarding)}>{w("Mark remaining as boarded", "تسجيل حضور المتبقين")}</Button>}
          </div>
          {confirmBoarding && <div className="attendance-confirm"><p>{w("Confirm that every remaining passenger is physically on board. Existing attendance will be preserved.", "أكد أن كل الركاب المتبقين داخل المركبة فعلياً. لن يتغير الحضور المسجل سابقاً.")}</p><div className="ops-actions"><Button disabled={a.busy} onClick={async () => { await run("attendance-batch", { confirmed: true, manifestIds: t.manifest.filter((m: any) => m.status === "EXPECTED").map((m: any) => m.id) }); setConfirmBoarding(false); }}>{w("Confirm boarding", "تأكيد الركوب")}</Button><Button secondary onClick={() => setConfirmBoarding(false)}>{w("Cancel", "إلغاء")}</Button></div></div>}
          <DataTable
            rows={t.manifest}
            columns={[
              { key: "passengerName", label: w("Passenger", "الموظف") },
              { key: "employerName", label: w("Employer", "جهة العمل") },
              { key: "stopName", label: w("Stop", "المحطة") },
              {
                key: "status",
                label: w("Attendance", "الحضور"),
                render: (m: any) =>
                  canOperate && t.tripStatus === "IN_PROGRESS" ? (
                    <select
                      aria-label={
                        w("Attendance for ", "حضور ") + m.passengerName
                      }
                      value={m.status}
                      disabled={a.busy}
                      onChange={(e) =>
                        run("attendance", {
                          manifestId: m.id,
                          status: e.target.value,
                        })
                      }
                    >
                      {["EXPECTED", "BOARDED", "NO_SHOW", "CANCELLED"].map(
                        (v) => (
                          <option value={v} key={v}>
                            {w(
                              v,
                              (
                                {
                                  EXPECTED: "منتظر",
                                  BOARDED: "حضر",
                                  NO_SHOW: "غائب",
                                  CANCELLED: "ملغى",
                                } as any
                              )[v],
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  ) : (
                    <Status value={m.status} />
                  ),
              },
            ]}
            empty={w(
              "No passengers enrolled for this service. Enroll passengers, then refresh the list before departure.",
              "لا يوجد ركاب مسجلون لهذه الرحلة. سجل الموظفين ثم حدث القائمة قبل الانطلاق.",
            )}
          />
          {canOperate && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run("incident", { description: reason });
              }}
              className="ops-incident"
            >
              <Field
                label={w("Incident / service note", "بلاغ أو ملاحظة تشغيل")}
              >
                <textarea
                  required
                  maxLength={250}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={w("Describe what happened…", "اكتب ما حدث…")}
                />
              </Field>
              <Button secondary disabled={a.busy || !reason.trim()}>
                {w("Record note", "تسجيل الملاحظة")}
              </Button>
            </form>
          )}
          <Panel title={w("Trip history", "سجل الرحلة")}>
            <div className="ops-timeline">
              {t.events.map((e: any) => (
                <div key={e.id}>
                  <Clock size={15} />
                  <div>
                    <strong>{e.type}</strong>
                    <small>
                      {new Date(e.createdAt).toLocaleString()} · {e.description}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </Dialog>
  );
}
