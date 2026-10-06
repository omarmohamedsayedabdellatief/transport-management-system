import { treasuryAccountLabel } from '../treasury-label';
import { useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import type { InstallmentItem } from "../../../services/accounting.service";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const inputClass = "w-full border rounded-xl p-2 mt-1";

export function AddInstallmentModal({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  isAr,
  dbVehicles = [],
  dbDrivers = [],
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  isAr: boolean;
  dbVehicles?: any[];
  dbDrivers?: any[];
  error?: string;
}) {
  const [form, setForm] = useState({
    category: "VEHICLE",
    assetName: "",
    vehiclePlate: "",
    bankName: "",
    chequeNumber: "",
    installmentNumber: 1,
    bankDueDate: today(),
    bankAmount: "",
    driverId: "",
    driverDueDate: today(),
    driverAmount: "",
    notes: "",
  });
  const set = (key: string, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));
  const vehicle = form.category === "VEHICLE";
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isAr ? "إضافة قسط السيارة والبنك" : "Add vehicle / bank installment"
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...form,
            bankAmount: Number(form.bankAmount),
            driverAmount: vehicle ? Number(form.driverAmount) : 0,
            driverId:
              vehicle && Number(form.driverAmount) > 0
                ? form.driverId
                : undefined,
            driverDueDate:
              vehicle && Number(form.driverAmount) > 0
                ? form.driverDueDate
                : undefined,
            vehiclePlate: vehicle ? form.vehiclePlate : undefined,
          });
        }}
      >
        <p className="text-sm text-slate-600">
          {isAr
            ? "استحقاقان مستقلان: قسط نحصّله من السائق وقسط ندفعه للبنك. الحفظ لا يسجّل تحصيلًا أو صرفًا."
            : "Separate driver receivable and bank payable. Saving does not move money."}
        </p>
        <label className="block">
          {isAr ? "فئة الأصل" : "Asset category"}
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            <option value="VEHICLE">{isAr ? "سيارة" : "Vehicle"}</option>
            <option value="PROPERTY_OFFICE">
              {isAr ? "مقر / عقار" : "Property / office"}
            </option>
          </select>
        </label>
        {vehicle && (
          <label className="block">
            {isAr ? "السيارة" : "Vehicle"}
            <select
              required
              className={inputClass}
              value={form.vehiclePlate}
              onChange={(e) => {
                const v = dbVehicles.find(
                  (v) => v.plateNumber === e.target.value,
                );
                setForm((f) => ({
                  ...f,
                  vehiclePlate: e.target.value,
                  assetName: f.assetName || `قسط سيارة ${e.target.value}`,
                  driverId: dbDrivers.find(d => !d.supplierId && d.id === v?.assignedDriver?.id)?.id || "",
                }));
              }}
            >
              <option value="">
                {isAr ? "اختر السيارة" : "Choose vehicle"}
              </option>
              {dbVehicles.map((v) => (
                <option key={v.id} value={v.plateNumber}>
                  {v.plateNumber} — {v.make} {v.model}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          {isAr ? "بيان القسط" : "Description"}
          <input
            required
            maxLength={250}
            className={inputClass}
            value={form.assetName}
            onChange={(e) => set("assetName", e.target.value)}
          />
        </label>
        <label className="block">
          {isAr ? "رقم القسط" : "Installment number"}
          <input
            required
            type="number"
            min={1}
            step={1}
            className={inputClass}
            value={form.installmentNumber}
            onChange={(e) => set("installmentNumber", Number(e.target.value))}
          />
        </label>
        {vehicle && (
          <fieldset className="border border-emerald-200 rounded-xl p-4 space-y-3">
            <legend className="font-bold text-emerald-800">
              {isAr ? "قسط السائق — لنا" : "Driver installment — receivable"}
            </legend>
            <label className="block">
              {isAr ? "السائق" : "Driver"}
              <select
                required={Number(form.driverAmount) > 0}
                className={inputClass}
                value={form.driverId}
                onChange={(e) => set("driverId", e.target.value)}
              >
                <option value="">
                  {isAr ? "اختر السائق" : "Choose driver"}
                </option>
                {dbDrivers
                  .filter((d) => !d.supplierId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              {isAr ? "قيمة قسط السائق (ج.م)" : "Driver amount (EGP)"}
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={form.driverAmount}
                onChange={(e) => set("driverAmount", e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="block">
              {isAr ? "تاريخ استحقاق السائق" : "Driver due date"}
              <input
                required={Number(form.driverAmount) > 0}
                type="date"
                className={inputClass}
                value={form.driverDueDate}
                onChange={(e) => set("driverDueDate", e.target.value)}
              />
            </label>
            <p className="text-xs text-slate-500">
              {isAr
                ? "يمكن ترك المبلغ صفرًا إذا كان القسط للبنك فقط."
                : "Leave zero for a bank-only installment."}
            </p>
          </fieldset>
        )}
        <fieldset className="border border-rose-200 rounded-xl p-4 space-y-3">
          <legend className="font-bold text-rose-800">
            {isAr ? "قسط البنك — علينا" : "Bank installment — payable"}
          </legend>
          <label className="block">
            {isAr ? "اسم البنك" : "Bank name"}
            <input
              required
              maxLength={250}
              className={inputClass}
              value={form.bankName}
              onChange={(e) => set("bankName", e.target.value)}
            />
          </label>
          <label className="block">
            {isAr ? "قيمة قسط البنك (ج.م)" : "Bank amount (EGP)"}
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              className={inputClass}
              value={form.bankAmount}
              onChange={(e) => set("bankAmount", e.target.value)}
            />
          </label>
          <label className="block">
            {isAr ? "تاريخ استحقاق البنك" : "Bank due date"}
            <input
              required
              type="date"
              className={inputClass}
              value={form.bankDueDate}
              onChange={(e) => set("bankDueDate", e.target.value)}
            />
          </label>
          <label className="block">
            {isAr ? "رقم الشيك (اختياري)" : "Cheque number (optional)"}
            <input
              maxLength={100}
              className={inputClass}
              value={form.chequeNumber}
              onChange={(e) => set("chequeNumber", e.target.value)}
            />
          </label>
        </fieldset>
        <label className="block">
          {isAr ? "ملاحظات" : "Notes"}
          <textarea
            maxLength={2000}
            className={inputClass}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ops-btn"
            disabled={isPending}
            onClick={onClose}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button className="ops-btn primary" disabled={isPending}>
            {isPending ? "…" : isAr ? "حفظ الاستحقاقين" : "Save installments"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function InstallmentPaymentModal({
  installment,
  bank,
  accounts,
  isAr,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  installment: InstallmentItem;
  bank: boolean;
  accounts: any[];
  isAr: boolean;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [requestKey] = useState(() => crypto.randomUUID());
  const [method, setMethod] = useState("CASH");
  const [amount, setAmount] = useState(
    String(bank ? installment.bankRemaining : installment.driverRemaining),
  );
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState(today().slice(0, 7));
  const [reference, setReference] = useState("");
  const offset = !bank && method === "OFFSET";
  const remaining = bank
    ? installment.bankRemaining
    : installment.driverRemaining;
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={
        bank
          ? isAr
            ? "سداد قسط البنك"
            : "Pay bank installment"
          : isAr
            ? "تحصيل قسط السائق"
            : "Collect driver installment"
      }
      subtitle={`${installment.vehiclePlate || installment.assetName} — ${bank ? installment.bankName : installment.driverName}`}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            id: installment.id,
            bank,
            amount: Number(amount),
            date,
            requestKey,
            reference,
            ...(offset
              ? {
                  method,
                  year: Number(period.slice(0, 4)),
                  month: Number(period.slice(5, 7)),
                }
              : { method: "CASH", accountId }),
          });
        }}
      >
        <p className="font-bold">
          {isAr ? "المتبقي" : "Remaining"}: {Number(remaining).toLocaleString()}{" "}
          {isAr ? "ج.م" : "EGP"}
        </p>
        {!bank && (
          <label className="block">
            {isAr ? "طريقة التحصيل" : "Collection method"}
            <select
              className={inputClass}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="CASH">
                {isAr
                  ? "تحصيل نقدي / تحويل إلى الخزينة"
                  : "Cash / bank receipt"}
              </option>
              <option value="OFFSET">
                {isAr ? "خصم من مستحقات السائق" : "Offset driver earnings"}
              </option>
            </select>
          </label>
        )}
        <p className="text-sm text-slate-600">
          {offset
            ? isAr
              ? "يخصم المبلغ من المستحق للسائق دون حركة خزينة، ولا يتجاوز المستحقات المتاحة."
              : "Reduces available driver earnings without a cash movement."
            : bank
              ? isAr
                ? "يخرج المبلغ من الخزينة؛ تحصيل قسط السائق يظل مستقلًا."
                : "Debits treasury; driver collection remains independent."
              : isAr
                ? "يدخل المبلغ للخزينة دون خصمه مرة أخرى من أجر السائق."
                : "Credits treasury without deducting wages again."}
        </p>
        <label className="block">
          {isAr ? "المبلغ (ج.م)" : "Amount (EGP)"}
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            max={remaining}
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        {offset ? (
          <label className="block">
            {isAr
              ? "شهر المستحقات التي يُخصم منها"
              : "Earnings month to offset"}
            <input
              required
              type="month"
              className={inputClass}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
        ) : (
          <label className="block">
            {isAr ? "الخزينة / الحساب البنكي" : "Treasury / bank account"}
            <select
              required
              className={inputClass}
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
        <label className="block">
          {isAr ? "تاريخ الحركة" : "Transaction date"}
          <input
            required
            type="date"
            max={today()}
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block">
          {isAr ? "البيان / المرجع (اختياري)" : "Reference (optional)"}
          <input
            maxLength={500}
            className={inputClass}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            className="ops-btn"
            onClick={onClose}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            disabled={
              pending ||
              Number(amount) <= 0 ||
              Number(amount) > Number(remaining)
            }
            className="ops-btn primary"
          >
            {pending ? "…" : isAr ? "تأكيد التسجيل" : "Confirm"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
