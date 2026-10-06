import { treasuryAccountLabel } from '../treasury-label';
import { useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import type { DriverSettlementItem } from "../../../services/accounting.service";

export function DriverEntryModal({
  kind,
  initialName = "",
  month,
  year,
  rows,
  accounts,
  pending,
  error,
  onSubmit,
  onClose,
  isAr,
}: {
  kind: "PAYMENT" | "DEDUCTION";
  initialName?: string;
  month: number;
  year: number;
  rows: DriverSettlementItem[];
  accounts: any[];
  pending: boolean;
  error?: string;
  onSubmit: (data: any) => void;
  onClose: () => void;
  isAr: boolean;
}) {
  const payment = kind === "PAYMENT";
  const [requestKey] = useState(() => crypto.randomUUID());
  const [name, setName] = useState(initialName);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(
    accounts.find((a) => a.kind === "CASH")?.id || accounts[0]?.id || "",
  );
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" }),
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const selected = rows.find((r) => r.driverName === name);
  const due = Number(selected?.netPayable || 0);
  const balance = Number(
    accounts.find((a) => a.id === accountId)?.currentBalance ?? Infinity,
  );
  const invalid =
    Number(amount) <= 0 ||
    Number(amount) > due ||
    (payment && (!accountId || Number(amount) > balance));
  const title = payment
    ? isAr
      ? "صرف دفعة للسائق"
      : "Pay driver installment"
    : isAr
      ? "إضافة خصم للسائق"
      : "Add driver deduction";
  return (
    <Modal
      isOpen
      title={title}
      onClose={onClose}
      subtitle={`${isAr ? "فترة الاستحقاق" : "Earnings period"}: ${month}/${year}`}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            driverName: name,
            month,
            year,
            amount: Number(amount),
            ...(payment ? { accountId } : {}),
            date,
            reference,
            notes,
            requestKey,
          });
        }}
      >
        <label className="block text-sm font-bold">
          {isAr ? "السائق" : "Driver"}
          <select
            aria-label={isAr ? "السائق" : "Driver"}
            required
            className="w-full rounded-xl border p-3 mt-1"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setAmount("");
            }}
          >
            <option value="">{isAr ? "اختر السائق" : "Choose driver"}</option>
            {rows.map((r) => (
              <option key={r.driverName} value={r.driverName}>
                {r.driverName}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
          <span>{isAr ? "المتبقي للسائق" : "Remaining due"}</span>
          <strong className="block text-xl">
            {due.toLocaleString()} {isAr ? "ج.م" : "EGP"}
          </strong>
          <p className="text-xs mt-1">
            {payment
              ? isAr
                ? "يمكن صرف جزء من المستحق، ويظل الباقي ظاهرًا حتى السداد."
                : "Pay part of the balance and leave the remainder outstanding."
              : isAr
                ? "الخصم يقلل مستحقات السائق دون حركة نقدية في الخزينة."
                : "A deduction reduces driver earnings without a cash movement."}
          </p>
        </div>
        <label className="block text-sm font-bold">
          {isAr ? "المبلغ (ج.م)" : "Amount (EGP)"}
          <input
            aria-label={isAr ? "المبلغ (ج.م)" : "Amount (EGP)"}
            type="number"
            required
            min="0.01"
            step="0.01"
            max={payment ? Math.min(due, balance) : due}
            className="w-full rounded-xl border p-3 mt-1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        {payment && (
          <label className="block text-sm font-bold">
            {isAr ? "الصرف من خزينة / بنك" : "Treasury / bank"}
            <select
              aria-label={isAr ? "الصرف من خزينة / بنك" : "Treasury / bank"}
              required
              className="w-full rounded-xl border p-3 mt-1"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">
                {isAr ? "اختر الحساب" : "Choose account"}
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {treasuryAccountLabel(a)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm font-bold">
          {isAr ? "التاريخ" : "Date"}
          <input
            aria-label={isAr ? "التاريخ" : "Date"}
            type="date"
            required
            className="w-full rounded-xl border p-3 mt-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block text-sm font-bold">
          {payment
            ? isAr
              ? "البيان / المرجع"
              : "Reference"
            : isAr
              ? "سبب الخصم"
              : "Deduction reason"}
          <input
            aria-label={
              payment
                ? isAr
                  ? "البيان / المرجع"
                  : "Reference"
                : isAr
                  ? "سبب الخصم"
                  : "Deduction reason"
            }
            required={!payment}
            maxLength={500}
            className="w-full rounded-xl border p-3 mt-1"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <label className="block text-sm font-bold">
          {isAr ? "ملاحظات" : "Notes"}
          <textarea
            aria-label={isAr ? "ملاحظات" : "Notes"}
            maxLength={2000}
            className="w-full rounded-xl border p-3 mt-1"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-red-700 bg-red-50 rounded-xl p-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ops-btn"
            onClick={onClose}
            disabled={pending}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            className="ops-btn primary"
            disabled={
              pending ||
              !name ||
              !amount ||
              invalid ||
              (!payment && !reference.trim())
            }
          >
            {pending
              ? isAr
                ? "جاري الحفظ…"
                : "Saving…"
              : isAr
                ? "تأكيد التسجيل"
                : "Confirm"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
