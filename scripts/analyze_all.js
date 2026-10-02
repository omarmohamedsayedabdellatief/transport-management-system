const path = require('path');
const fs = require('fs');
const XLSX = require(path.join(__dirname, '../server/node_modules/xlsx'));

const rootDir = path.join(__dirname, '..');
const file1 = path.join(rootDir, 'الاضافى حساب السواقين اجمالى 7- 2026.xlsx');
const file2 = path.join(rootDir, 'ON TIME TRANSPORTAION.2026.xlsx');

function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const wb = XLSX.readFile(filePath);
  const result = {
    fileName: path.basename(filePath),
    sheets: []
  };

  wb.SheetNames.forEach(name => {
    const sheet = wb.Sheets[name];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    // filter non-empty rows
    const nonEmptyRows = rawData.filter(r => r && r.some(cell => cell !== null && cell !== undefined && cell !== ''));
    result.sheets.push({
      sheetName: name,
      totalRows: rawData.length,
      nonEmptyRowCount: nonEmptyRows.length,
      sampleRows: nonEmptyRows.slice(0, 10)
    });
  });

  return result;
}

const analysis1 = analyzeFile(file1);
const analysis2 = analyzeFile(file2);

fs.writeFileSync(path.join(__dirname, 'sheets_analysis.json'), JSON.stringify({ analysis1, analysis2 }, null, 2), 'utf8');
console.log('✅ Analysis written to scripts/sheets_analysis.json');
