const path = require('path');
const fs = require('fs');
const XLSX = require(path.join(__dirname, '../server/node_modules/xlsx'));

const rootDir = path.join(__dirname, '..');
const file1 = path.join(rootDir, 'الاضافى حساب السواقين اجمالى 7- 2026.xlsx');
const file2 = path.join(rootDir, 'ON TIME TRANSPORTAION.2026.xlsx');

function extractSheetInfo(wb, sheetName, maxRows = 10) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return null;
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const nonEmptyRows = data.filter(r => r && r.some(c => c !== null && c !== undefined && c !== ''));

  // Get some cell formulas
  const formulas = [];
  for (const cell in sheet) {
    if (cell[0] === '!') continue;
    if (sheet[cell].f) {
      formulas.push({ cell, f: sheet[cell].f, v: sheet[cell].v });
      if (formulas.length >= 10) break;
    }
  }

  return {
    sheetName,
    rowCount: data.length,
    nonEmptyCount: nonEmptyRows.length,
    headerOrFirstRows: nonEmptyRows.slice(0, maxRows),
    formulas
  };
}

console.log('Loading File 1...');
const wb1 = XLSX.readFile(file1);
const f1Results = wb1.SheetNames.map(s => extractSheetInfo(wb1, s, 15));

console.log('Loading File 2...');
const wb2 = XLSX.readFile(file2);
const keySheets = [
  'تشغيل اليومية ',
  'ايرادات ',
  'المصروفات',
  'مرتبات',
  'قايمة الدخل ',
  'مستحق السائقين',
  'سعودي',
  'لوجستيكا',
  'نجمة هليوبوليس',
  'FLITCH AND GRAIN',
  'FIRST START',
  'اقساط سيارات ',
  'اقساط المكتب & الشقة ',
  'mapping',
  'CIB',
  'سعودي المؤسسة-المخاذن',
  'البداية-قليوب'
];

const f2Results = keySheets.map(s => extractSheetInfo(wb2, s, 8));

fs.writeFileSync(
  path.join(__dirname, 'extracted_details.json'),
  JSON.stringify({ file1: f1Results, file2: f2Results }, null, 2),
  'utf8'
);

console.log('✅ Success! Extracted details written to scripts/extracted_details.json');
