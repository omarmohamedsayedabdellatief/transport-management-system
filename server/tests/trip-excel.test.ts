import { test } from "node:test";
import assert from "node:assert/strict";
import XLSX from "xlsx";
import {
  excelDate,
  excelTime,
  money,
  readFile,
  normalize,
} from "../src/modules/trips/trip-excel.parser.js";
const workbook = (rows: any[][]) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Worksheet");
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
};
test("Excel parser: Arabic sample headers, title rows, reordered columns and midnight", () => {
  const parsed = readFile(
    workbook([
      ["عنوان"],
      [
        "ملاحظات",
        "أسم السائق",
        "ذهاب/عودة",
        "إلى",
        "من",
        "نوع السيارة",
        "س",
        "ص/م",
        "الحضور/إنصراف",
        "ترتيب 2",
        "ترتيب 1",
        "التاريخ",
        "الخط",
        "وقت البداية",
        "وقت الوصول",
        "الشركة",
        "عدد",
        "تم التأكيد",
      ],
      [
        "1",
        "1",
        "عودة",
        "A",
        "B",
        "ميكرو",
        "12:00 AM",
        "ص",
        "01:00",
        0,
        24,
        "2026-09-27",
        "Line",
        "00:00",
        "01:00",
        "Company",
        1,
        false,
      ],
    ]),
  );
  assert.equal(parsed.headerRow, 2);
  assert.equal(parsed.mapping.departure, "وقت البداية");
  assert.equal(parsed.mapping.driver, "أسم السائق");
  assert.equal(parsed.data[0].row, 3);
  assert.equal(excelTime(parsed.data[0].cells["وقت البداية"]), "00:00");
  assert.equal(normalize("أسم السائق"), normalize("اسم السائق"));
});
test("dates and times validate calendar, 1904 workbooks, Arabic digits and AM/PM", () => {
  assert.equal(excelDate("٢٧/٠٩/٢٠٢٦"), "2026-09-27");
  assert.equal(excelDate("09/27/2026", "MDY"), "2026-09-27");
  assert.equal(excelDate(1, "DMY", true), "1904-01-02");
  assert.equal(excelTime(0), "00:00");
  assert.equal(excelTime(0.5), "12:00");
  assert.equal(excelTime("12:00 AM"), "00:00");
  assert.equal(excelTime("١٢:٣٠", "م"), "12:30");
  assert.equal(excelTime("1:00 PM"), "13:00");
  assert.throws(() => excelDate("2026-02-30"));
  assert.throws(() => excelTime("24:00"));
  assert.equal(money("١٬٢٣٤٫٥٠"), 1234.5);
  assert.equal(money(""), undefined);
  assert.equal(money(0), 0);
  assert.throws(() => money("-1"));
  assert.throws(() => money("1.999"));
});
test("ambiguous duplicate headers and formulas are rejected", () => {
  assert.throws(() =>
    readFile(
      workbook([
        ["التاريخ", "التاريخ"],
        ["2026-01-01", "2026-01-01"],
      ]),
    ),
  );
  const wb = XLSX.utils.book_new(),
    ws = XLSX.utils.aoa_to_sheet([
      ["التاريخ", "الخط"],
      ["2026-01-01", "Line"],
    ]);
  ws.C2 = { t: "n", v: 2, f: "1+1" };
  ws["!ref"] = "A1:C2";
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  assert.throws(
    () => readFile(XLSX.write(wb, { type: "base64", bookType: "xlsx" })),
    /معادلات/,
  );
});
