import { useState } from "react";
import { Building2, Truck, ChevronDown, Check, Search } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";

type FleetVehicle = {
  id: string;
  plateNumber: string;
  make?: string;
  model?: string;
  supplierId?: string | null;
  supplier?: { name?: string } | null;
  assignedDriver?: { fullName: string } | null;
};

export function VehicleFleetPicker({
  vehicles,
  value,
  onChange,
  isAr,
}: {
  vehicles: FleetVehicle[];
  value: string;
  onChange: (plate: string) => void;
  isAr: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = vehicles.find((vehicle) => vehicle.plateNumber === value);
  const query = search.trim().toLocaleLowerCase();
  const groups = [
    {
      key: "company",
      label: isAr ? "سيارات الشركة" : "Company vehicles",
      Icon: Building2,
      supplier: false,
    },
    {
      key: "supplier",
      label: isAr ? "سيارات الموردين" : "Supplier vehicles",
      Icon: Truck,
      supplier: true,
    },
  ];
  function choose(plate: string) {
    onChange(plate);
    setOpen(false);
  }
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setSearch("");
          setOpen(true);
        }}
        className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-start text-xs font-bold text-purple-900 hover:bg-purple-100 focus-visible:outline-2 focus-visible:outline-purple-600"
      >
        <span className="min-w-0 break-words">
          {value
            ? `${selected?.plateNumber || value} · ${selected?.make || ""} ${selected?.model || ""}`
            : isAr
              ? "اختيار السيارة — جميع المركبات"
              : "Choose vehicle — all vehicles"}
        </span>
        <ChevronDown size={16} className="shrink-0" />
      </button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={isAr ? "اختيار السيارة" : "Choose a vehicle"}
      >
        <div dir={isAr ? "rtl" : "ltr"} className="space-y-4">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:ring-2 focus-within:ring-purple-500">
            <Search size={18} className="shrink-0 text-slate-400" />
            <input
              autoFocus
              aria-label={
                isAr ? "بحث عن سيارة أو مورد" : "Search vehicles or suppliers"
              }
              placeholder={
                isAr ? "اللوحة، السائق، المورد…" : "Plate, driver, supplier…"
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 w-full bg-transparent py-1 text-sm outline-none"
            />
          </label>
          <button
            type="button"
            aria-pressed={!value}
            onClick={() => choose("")}
            className={`flex w-full items-center justify-between rounded-xl border p-3 text-sm font-bold ${!value ? "border-purple-400 bg-purple-50 text-purple-900" : "border-slate-200 hover:bg-slate-50"}`}
          >
            <span>{isAr ? "عرض جميع المركبات" : "Show all vehicles"}</span>
            {!value && <Check size={18} />}
          </button>
          <div className="grid grid-cols-2 items-start gap-2 sm:gap-4">
            {groups.map(({ key, label, Icon, supplier }) => {
              const all = vehicles.filter(
                (vehicle) =>
                  Boolean(vehicle.supplierId || vehicle.supplier) === supplier,
              );
              const matching = all.filter((vehicle) =>
                [
                  vehicle.plateNumber,
                  vehicle.make,
                  vehicle.model,
                  vehicle.assignedDriver?.fullName,
                  vehicle.supplier?.name,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLocaleLowerCase()
                  .includes(query),
              );
              return (
                <section
                  key={key}
                  aria-label={label}
                  className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                >
                  <div
                    className={`flex flex-wrap items-center gap-1.5 border-b p-2 sm:p-3 ${supplier ? "border-amber-100 bg-amber-50 text-amber-950" : "border-blue-100 bg-blue-50 text-blue-950"}`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold">{label}</h3>
                    <span className="rounded-full bg-white/80 px-2 text-xs tabular-nums">
                      {matching.length}
                    </span>
                  </div>
                  <div className="max-h-[48vh] space-y-2 overflow-y-auto p-2">
                    {matching.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        type="button"
                        aria-pressed={value === vehicle.plateNumber}
                        onClick={() => choose(vehicle.plateNumber)}
                        className={`block w-full rounded-xl border p-2 sm:p-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-purple-600 ${value === vehicle.plateNumber ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500" : "border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50"}`}
                      >
                        <span className="flex flex-wrap items-center justify-between gap-1">
                          <strong
                            dir="auto"
                            className="break-all text-xs sm:text-sm text-slate-900"
                          >
                            {vehicle.plateNumber}
                          </strong>
                          {value === vehicle.plateNumber && (
                            <Check size={15} className="text-purple-700" />
                          )}
                        </span>
                        <span className="mt-1 block break-words text-[11px] sm:text-xs text-slate-600">
                          {[vehicle.make, vehicle.model]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                        {supplier && (
                          <span className="mt-2 block break-words text-[11px] sm:text-xs font-semibold text-amber-800">
                            {vehicle.supplier?.name ||
                              (isAr ? "مورد خارجي" : "External supplier")}
                          </span>
                        )}
                        {vehicle.assignedDriver && (
                          <span className="mt-1 block break-words text-[11px] sm:text-xs text-slate-500">
                            {vehicle.assignedDriver.fullName}
                          </span>
                        )}
                      </button>
                    ))}
                    {!matching.length && (
                      <p className="p-2 text-xs leading-relaxed text-slate-500">
                        {query
                          ? isAr
                            ? "لا توجد سيارات مطابقة للبحث"
                            : "No matching vehicles"
                          : isAr
                            ? "لا توجد سيارات في هذه المجموعة"
                            : "No vehicles in this group"}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </Modal>
    </>
  );
}
