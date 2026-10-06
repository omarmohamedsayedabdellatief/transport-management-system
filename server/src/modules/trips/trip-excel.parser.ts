import XLSX from "xlsx";
import { ValidationError } from "../../types/index.js";
import { dateOnly } from "../operations/operations.logic.js";

export const MAX_ROWS = 1000;
export const fields = {
  tripId: ["معرف الرحلة", "trip id", "id"],
  tripNumber: ["رقم الرحلة", "trip number"],
  date: ["التاريخ", "تاريخ الرحلة", "date", "trip date"],
  company: ["الشركة", "اسم الشركة", "العميل", "company", "client"],
  route: ["الخط", "اسم الخط", "route", "line"],
  from: ["من", "نقطة البداية", "from", "origin"],
  to: ["إلى", "الى", "الوجهة", "to", "destination"],
  direction: ["ذهاب/عودة", "الاتجاه", "نوع الرحلة", "direction"],
  departure: ["وقت البداية", "وقت المغادرة", "departure", "start time", "س"],
  arrival: ["وقت الوصول", "arrival", "end time"],
  arrivalDate: ["تاريخ الوصول", "arrival date"],
  driver: ["أسم السائق", "اسم السائق", "السائق", "driver", "driver name"],
  plate: [
    "رقم السيارة",
    "رقم اللوحة",
    "رقم لوحة المركبة",
    "plate",
    "vehicle plate",
  ],
  vehicleType: ["نوع السيارة", "نوع المركبة", "vehicle type"],
  billingType: ["نوع الفوترة", "billing type"],
  status: ["حالة الرحلة", "status"],
  shift: ["الوردية", "shift"],
  saleAmount: ["سعر العميل", "سعر الرحلة", "sale amount", "client price"],
  costAmount: ["تكلفة المورد", "supplier cost"],
  driverAllowance: ["أجر الدورة", "اجر الدورة", "driver allowance"],
  vehicleCost: ["تكلفة السيارة", "vehicle cost"],
  notes: ["ملاحظات", "notes"],
  count: ["عدد", "عدد الرحلات", "count"],
  period: ["ص/م", "am/pm"],
} as const;
export type Field = keyof typeof fields;
export const moneyFields = [
  "saleAmount",
  "costAmount",
  "driverAllowance",
  "vehicleCost",
] as const;
export const digits = (v: unknown) =>
  String(v ?? "").replace(/[٠-٩۰-۹]/g, (c) =>
    String(
      "٠١٢٣٤٥٦٧٨٩".includes(c)
        ? "٠١٢٣٤٥٦٧٨٩".indexOf(c)
        : "۰۱۲۳۴۵۶۷۸۹".indexOf(c),
    ),
  );
export const normalize = (v: unknown) =>
  digits(v)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640\u200e\u200f\ufeff]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\s_\-/():]+/g, "");
export const text = (v: unknown) => String(v ?? "").trim();

// Bound inflated XLSX size before SheetJS decompresses XML entries.
function guardZip(buffer: Buffer) {
  if (buffer.readUInt16LE(0) !== 0x4b50) return;
  let eocd = -1;
  for (
    let i = buffer.length - 22;
    i >= Math.max(0, buffer.length - 65557);
    i--
  ) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ValidationError("ملف Excel تالف.");
  const count = buffer.readUInt16LE(eocd + 10);
  let pos = buffer.readUInt32LE(eocd + 16),
    total = 0;
  if (count > 3000)
    throw new ValidationError(
      "الملف يحتوي أوراقًا أو عناصر أكثر من الحد المسموح.",
    );
  for (let i = 0; i < count; i++) {
    if (pos + 46 > buffer.length || buffer.readUInt32LE(pos) !== 0x02014b50)
      throw new ValidationError("ملف Excel تالف.");
    total += buffer.readUInt32LE(pos + 24);
    if (total > 20 * 1024 * 1024)
      throw new ValidationError("حجم محتوى Excel بعد فك الضغط يتجاوز 20 MB.");
    pos +=
      46 +
      buffer.readUInt16LE(pos + 28) +
      buffer.readUInt16LE(pos + 30) +
      buffer.readUInt16LE(pos + 32);
  }
}
export function readFile(
  fileContent: string,
  sheetName?: string,
  headerRow?: number,
  mapping?: Record<string, string>,
) {
  const buffer = Buffer.from(fileContent, "base64");
  if (buffer.length < 4 || buffer.length > 1024 * 1024)
    throw new ValidationError("اختر ملف XLSX أو CSV بحجم لا يتجاوز 1 MB.");
  guardZip(buffer);
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,
      sheetRows: MAX_ROWS + 52,
      raw: true,
    });
  } catch {
    throw new ValidationError(
      "تعذر قراءة الملف. احفظ نسخة XLSX أو CSV غير مشفرة.",
    );
  }
  if (wb.SheetNames.length > 30)
    throw new ValidationError("الحد الأقصى 30 ورقة.");
  const name = sheetName || wb.SheetNames[0],
    ws = wb.Sheets[name];
  if (!ws) throw new ValidationError("اختر ورقة موجودة في الملف.");
  const range = XLSX.utils.decode_range(ws["!fullref"] || ws["!ref"] || "A1");
  if (range.e.c >= 100 || range.e.r >= MAX_ROWS + 50)
    throw new ValidationError(
      `الحد الأقصى ${MAX_ROWS} رحلة و100 عمود؛ قسّم الملف إلى دفعات.`,
    );
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, {
    header: 1,
    range: 0,
    defval: "",
    raw: true,
    blankrows: true,
  });
  const headerIndex = headerRow
    ? headerRow - 1
    : Math.max(
        0,
        rows
          .slice(0, 30)
          .findIndex(
            (r) =>
              r.some((v) =>
                fields.date.some((a) => normalize(a) === normalize(v)),
              ) &&
              r.some((v) =>
                fields.route.some((a) => normalize(a) === normalize(v)),
              ),
          ),
      );
  const headers = (rows[headerIndex] || []).map(text);
  if (!headers.some(Boolean)) throw new ValidationError("صف العناوين فارغ.");
  const nonempty = headers.filter(Boolean).map(normalize);
  if (new Set(nonempty).size !== nonempty.length)
    throw new ValidationError(
      "توجد أسماء أعمدة مكررة؛ أعطِ كل عمود اسمًا مختلفًا.",
    );
  const resolved: Record<string, string> = {};
  for (const [key, aliases] of Object.entries(fields)) {
    if (mapping && Object.hasOwn(mapping, key)) {
      if (mapping[key]) resolved[key] = mapping[key];
    } else {
      const header = aliases
        .map((a) => headers.find((h) => normalize(h) === normalize(a)))
        .find(Boolean);
      if (header) resolved[key] = header;
    }
  }
  for (const h of Object.values(resolved))
    if (!headers.includes(h))
      throw new ValidationError("ربط الأعمدة يشير إلى عمود غير موجود.");
  if (new Set(Object.values(resolved)).size !== Object.values(resolved).length)
    throw new ValidationError("لا تربط نفس العمود بأكثر من حقل.");
  const data = rows
    .slice(headerIndex + 1)
    .flatMap((r, i) =>
      r.some((v) => text(v) !== "")
        ? [
            {
              row: i + headerIndex + 2,
              cells: Object.fromEntries(
                headers.flatMap((h, j) => (h ? [[h, r[j] ?? ""]] : [])),
              ),
            },
          ]
        : [],
    );
  if (data.length > MAX_ROWS)
    throw new ValidationError(`الحد الأقصى ${MAX_ROWS} رحلة.`);
  const formulas = Object.values(ws).some((cell: any) => cell?.f);
  if (formulas)
    throw new ValidationError(
      "الملف يحتوي معادلات. انسخ النتائج والصقها كقيم قبل الرفع لتجنب نتائج قديمة أو غير محسوبة.",
    );
  return {
    sheets: wb.SheetNames,
    sheet: name,
    headerRow: headerIndex + 1,
    headers,
    mapping: resolved,
    data,
    date1904: !!wb.Workbook?.WBProps?.date1904,
  };
}
export function excelDate(
  value: unknown,
  order: "DMY" | "MDY" = "DMY",
  date1904 = false,
): string {
  if (typeof value === "number") {
    const parts = XLSX.SSF.parse_date_code(value, { date1904 });
    if (!parts) throw new ValidationError("تاريخ Excel غير صالح.");
    return dateOnly(
      `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}`,
    )
      .toISOString()
      .slice(0, 10);
  }
  const v = digits(value).trim();
  let out = v;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(v)) {
    const [y, m, d] = v.split(/[-/]/);
    out = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  } else if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(v)) {
    const [a, b, y] = v.split(/[-/.]/);
    out = `${y}-${(order === "DMY" ? b : a).padStart(2, "0")}-${(order === "DMY" ? a : b).padStart(2, "0")}`;
  }
  return dateOnly(out).toISOString().slice(0, 10);
}
export function excelTime(value: unknown, period?: unknown): string {
  if (typeof value === "number" && value >= 0 && value < 1) {
    const mins = Math.round(value * 1440);
    if (mins < 1440)
      return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  }
  const match = digits(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::00)?\s*(AM|PM|ص|م)?$/i);
  if (!match)
    throw new ValidationError("الوقت يجب أن يكون HH:mm أو وقت Excel صحيحًا.");
  let hour = Number(match[1]);
  const min = Number(match[2]),
    part = text(match[3] || period).toUpperCase();
  if (part) {
    if (!["AM", "PM", "ص", "م"].includes(part) || hour < 1 || hour > 12)
      throw new ValidationError("وقت 12 ساعة غير صالح.");
    hour = (hour % 12) + (["PM", "م"].includes(part) ? 12 : 0);
  }
  if (hour > 23 || min > 59) throw new ValidationError("وقت غير صالح.");
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
export function money(value: unknown): number | undefined {
  if (text(value) === "") return undefined;
  const v = digits(value)
    .replace(/[٬,\s]/g, "")
    .replace("٫", ".");
  if (
    !/^\d+(\.\d{1,2})?$/.test(v) ||
    !Number.isFinite(Number(v)) ||
    Number(v) > 9999999999.99
  )
    throw new ValidationError(
      "السعر يجب أن يكون مبلغًا موجبًا أو صفرًا وبحد أقصى منزلتين عشريتين.",
    );
  return Number(v);
}
