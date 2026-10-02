const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logFile = path.join(__dirname, '..', 'tunnel.log');

console.log('⏳ جاري إنشاء الدومين السحابي من Cloudflare (قد يستغرق 3 إلى 5 ثوانٍ)...');

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
      console.log('  🎉 تم إنشاء الدومين العام بنجاح! جاهز للإرسال على الواتساب');
      console.log('====================================================================');
      console.log('\n🌐 رابط الدومين العام السحابي (Public HTTPS Domain):');
      console.log(`   👉 ${publicUrl}`);
      console.log('   📋 (تم نسخ هذا الرابط تلقائياً للحافظة - افتح الواتساب واضغط Ctrl + V)');
      console.log('   💡 يفتح من أي موبايل أو تابلت في العالم عبر باقة الموبايل 4G/5G.');
      console.log('\n📱 رابط الشبكة المحلية (Wi-Fi IP):');
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

  if (attempts >= 15) {
    clearInterval(interval);
    console.log('\n⚠️ تعذر التقاط رابط الدومين السحابي تلقائياً. يمكنك مراجعة ملف tunnel.log أو استخدام رابط الشبكة المحلية.');
    process.exit(0);
  }
}, 1000);
