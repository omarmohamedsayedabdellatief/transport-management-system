const path = require('path');
const XLSX = require(path.join(__dirname, '../server/node_modules/xlsx'));
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const file1 = path.join(rootDir, 'الاضافى حساب السواقين اجمالى 7- 2026.xlsx');
const file2 = path.join(rootDir, 'ON TIME TRANSPORTAION.2026.xlsx');

function inspectWorkbook(filePath, label) {
  console.log('====================================================================');
  console.log(`📊 FILE: ${label}`);
  console.log(`Path: ${filePath}`);
  console.log('====================================================================');
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ File does not exist!');
    return;
  }

  const wb = XLSX.readFile(filePath);
  console.log(`Sheet Names (${wb.SheetNames.length}):`, wb.SheetNames);

  wb.SheetNames.forEach((sheetName) => {
    console.log(`\n--- SHEET: [${sheetName}] ---`);
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Total Rows: ${data.length}`);
    
    // Print first 15 non-empty rows
    const preview = data.slice(0, 20);
    preview.forEach((row, i) => {
      if (row && row.length > 0) {
        console.log(`Row ${i + 1}:`, JSON.stringify(row));
      }
    });
  });
}

inspectWorkbook(file1, 'الاضافى حساب السواقين اجمالى 7- 2026.xlsx');
console.log('\n\n');
inspectWorkbook(file2, 'ON TIME TRANSPORTAION.2026.xlsx');
