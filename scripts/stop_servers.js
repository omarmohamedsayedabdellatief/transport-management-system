const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🛑 جاري إغلاق خوادم النظام ونفق الدومين العام...');

try {
  execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore' });
  console.log('✅ تم إغلاق نفق Cloudflare Tunnel');
} catch (e) {}

try {
  execSync(
    'powershell -NoProfile -Command "$ports = @(5000, 5173, 5174); foreach ($p in $ports) { $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($conns) { $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } } }"',
    { stdio: 'ignore' }
  );
  console.log('✅ تم إغلاق خوادم الـ API والـ Frontend (Ports 5000, 5173, 5174)');
} catch (e) {}

const log1 = path.join(__dirname, '..', 'tunnel.log');
const log2 = path.join(__dirname, '..', 'tunnel_test.log');
if (fs.existsSync(log1)) {
  try { fs.unlinkSync(log1); } catch (e) {}
}
if (fs.existsSync(log2)) {
  try { fs.unlinkSync(log2); } catch (e) {}
}

console.log('\n====================================================================');
console.log('  ✨ تم إغلاق كافة خدمات النظام بنجاح!');
console.log('====================================================================\n');
