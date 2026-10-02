const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');
const cloudflared = path.join(rootDir, 'bin', 'cloudflared.exe');
const logFile = path.join(rootDir, 'tunnel.log');

if (fs.existsSync(logFile)) {
  try { fs.unlinkSync(logFile); } catch (e) {}
}

console.log('🚀 [1/3] جاري تشغيل سيرفر الـ API (Port 5000)...');
const serverProc = spawn('npm.cmd', ['run', 'dev'], {
  cwd: serverDir,
  stdio: 'ignore',
  detached: true,
  shell: true,
});
serverProc.unref();

console.log('💻 [2/3] جاري تشغيل واجهة الـ Frontend (Port 5173)...');
const clientProc = spawn('npm.cmd', ['run', 'dev'], {
  cwd: clientDir,
  stdio: 'ignore',
  detached: true,
  shell: true,
});
clientProc.unref();

console.log('🌐 [3/3] جاري تشغيل نفق Cloudflare للدومين السحابي العام...');
const out = fs.openSync(logFile, 'w');
const tunnelProc = spawn(cloudflared, ['tunnel', '--url', 'http://localhost:5173'], {
  stdio: ['ignore', out, out],
  detached: true,
});
tunnelProc.unref();

// Capture and display tunnel URL
let attempts = 0;
const interval = setInterval(() => {
  attempts++;
  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, 'utf8');
    const match = content.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      clearInterval(interval);
      const publicUrl = match[0];

      // Copy to clipboard
      try {
        execSync(`powershell -Command "Set-Clipboard -Value '${publicUrl}'"`);
      } catch (e) {}

      const os = require('os');
      const ifaces = os.networkInterfaces();
      let localIp = '127.0.0.1';
      for (const dev in ifaces) {
        for (const details of ifaces[dev]) {
          if (details.family === 'IPv4' && !details.internal && !details.address.startsWith('169.254')) {
            localIp = details.address;
            break;
          }
        }
        if (localIp !== '127.0.0.1') break;
      }

      console.log('\n====================================================================');
      console.log('  🎉 السيستم يعمل الآن بنجاح! جاهز للديمو');
      console.log('====================================================================');
      console.log('\n🌐 رابط الدومين العام (Public Domain HTTPS) للواتساب:');
      console.log(`   👉 ${publicUrl}`);
      console.log('   📋 (تم نسخ هذا الرابط تلقائياً للحافظة - افتح الواتساب واضغط Ctrl + V)');
      console.log('   💡 يفتح من أي موبايل أو كمبيوتر في العالم من باقة الموبايل 4G/5G.');
      console.log('\n📱 رابط الشبكة المحلية (إذا كان الموبايل واللابتوب على نفس الـ Wi-Fi):');
      console.log(`   http://${localIp}:5173`);
      console.log('\n💻 رابط اللابتوب المحلي:');
      console.log('   http://localhost:5173');
      console.log('\n🔑 بيانات الدخول للديمو:');
      console.log('   البريد: admin@tms.com');
      console.log('   كلمة المرور: password123');
      console.log('====================================================================\n');
      process.exit(0);
    }
  }

  if (attempts >= 20) {
    clearInterval(interval);
    console.log('\n⚠️ تعذر التقاط رابط الدومين السحابي تلقائياً.');
    process.exit(0);
  }
}, 1000);
