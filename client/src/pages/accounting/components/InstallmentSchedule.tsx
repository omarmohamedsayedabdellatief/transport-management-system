import { AccountingActionButton } from './AccountingActionButton';
import type { InstallmentItem } from "../../../services/accounting.service";
export function InstallmentSchedule({
  rows,
  loading,
  isAr,
  onPay,
}: {
  rows: InstallmentItem[];
  loading?: boolean;
  isAr: boolean;
  onPay: (row: InstallmentItem, bank: boolean) => void;
}) {
  const money = (n: any) =>
    `${Number(n || 0).toLocaleString()} ${isAr ? "ج.م" : "EGP"}`;
  const status = (s: string, late: boolean) =>
    s === "PAID"
      ? isAr
        ? "مسدد"
        : "Paid"
      : late
        ? isAr
          ? "متأخر"
          : "Overdue"
        : s === "PARTIAL"
          ? isAr
            ? "جزئي"
            : "Partial"
          : isAr
            ? "مستحق"
            : "Pending";
  return (
    <section className="space-y-4">
      <h3 className="font-bold text-lg">
        {isAr
          ? "استحقاقات أقساط السائقين والبنوك"
          : "Driver and bank installment dues"}
      </h3>
      <p className="text-sm text-slate-500">
        {isAr
          ? "لكل قسط رصيد مستقل للسائق والبنك. التحصيل أو الخصم لا يسدد البنك تلقائيًا."
          : "Driver collection and bank payment have independent balances."}
      </p>
      {loading ? (
        <p>{isAr ? "جاري التحميل…" : "Loading…"}</p>
      ) : !rows.length ? (
        <p>{isAr ? "لا توجد أقساط مسجلة." : "No installments."}</p>
      ) : (
        rows.map((row) => (
          <article
            key={row.id}
            className="border rounded-2xl bg-white p-4 space-y-3"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <strong>
                #{row.installmentNumber} — {row.assetName}
              </strong>
              <span>{row.vehiclePlate}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="border border-emerald-200 rounded-xl p-3 space-y-2">
                <h4 className="font-bold text-emerald-800">
                  {isAr ? "قسط السائق — لنا" : "Driver — receivable"}
                </h4>
                {Number(row.driverAmount) > 0 ? (
                  <>
                    <p>
                      {row.driverName} · {row.driverDueDate?.slice(0, 10)}
                    </p>
                    <p>
                      {isAr ? "القسط" : "Due"}: {money(row.driverAmount)} ·{" "}
                      {status(row.driverStatus, row.driverOverdue)}
                    </p>
                    <p>
                      {isAr ? "محصّل بالخزينة" : "Cash collected"}:{" "}
                      {money(row.driverCash)}
                    </p>
                    <p>
                      {isAr ? "مخصوم من المستحقات" : "Wage offsets"}:{" "}
                      {money(row.driverOffset)}
                    </p>
                    <p className="font-bold">
                      {isAr ? "المتبقي على السائق" : "Driver remaining"}:{" "}
                      {money(row.driverRemaining)}
                    </p>
                    <AccountingActionButton
                      className="ops-btn primary"
                      disabled={row.driverRemaining <= 0}
                      onClick={() => onPay(row, false)}
                    >
                      {isAr
                        ? "تحصيل / خصم قسط السائق"
                        : "Collect / offset driver installment"}
                    </AccountingActionButton>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    {isAr
                      ? "لا يوجد قسط مرتبط بسائق."
                      : "No driver installment."}
                  </p>
                )}
                {Number(row.clientAmount) > 0 && (
                  <p className="text-xs text-amber-800">
                    {isAr
                      ? "مبلغ عميل قديم غير مربوط بسائق أو حركة تحصيل"
                      : "Legacy customer amount without a driver or receipt"}
                    : {money(row.clientAmount)}
                  </p>
                )}
              </div>
              <div className="border border-rose-200 rounded-xl p-3 space-y-2">
                <h4 className="font-bold text-rose-800">
                  {isAr ? "قسط البنك — علينا" : "Bank — payable"}
                </h4>
                <p>
                  {row.bankName || "—"} · {row.bankDueDate.slice(0, 10)}
                </p>
                <p>
                  {isAr ? "القسط" : "Due"}: {money(row.bankAmount)} ·{" "}
                  {status(row.bankStatus, row.bankOverdue)}
                </p>
                <p>
                  {isAr ? "المدفوع للبنك" : "Paid to bank"}:{" "}
                  {money(row.bankPaid)}
                </p>
                <p className="font-bold">
                  {isAr ? "المتبقي للبنك" : "Bank remaining"}:{" "}
                  {money(row.bankRemaining)}
                </p>
                <AccountingActionButton
                  className="ops-btn primary"
                  disabled={row.bankRemaining <= 0}
                  onClick={() => onPay(row, true)}
                >
                  {isAr ? "سداد البنك من الخزينة" : "Pay bank from treasury"}
                </AccountingActionButton>
              </div>
            </div>
            {row.notes && <p className="text-sm">{row.notes}</p>}
            <details>
              <summary className="cursor-pointer font-semibold">
                {isAr
                  ? "سجل التحصيل والخصم والسداد"
                  : "Collection and payment history"}{" "}
                ({row.payments?.length || 0})
              </summary>
              {!row.payments?.length ? (
                <p className="text-sm mt-2">
                  {isAr
                    ? "لا توجد حركات جديدة مسجلة لهذا القسط."
                    : "No new transactions recorded."}
                </p>
              ) : (
                <ul className="space-y-2 mt-3">
                  {row.payments.map((p) => (
                    <li key={p.id} className="border-b pb-2 text-sm">
                      <strong>
                        {p.kind === "BANK"
                          ? isAr
                            ? "سداد البنك"
                            : "Bank payment"
                          : p.kind === "DRIVER_CASH"
                            ? isAr
                              ? "تحصيل من السائق"
                              : "Driver receipt"
                            : isAr
                              ? "خصم من المستحقات"
                              : "Wage offset"}
                      </strong>{" "}
                      · {p.date.slice(0, 10)} · {money(p.amount)}
                      <p>{p.reference}</p>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </article>
        ))
      )}
    </section>
  );
}
