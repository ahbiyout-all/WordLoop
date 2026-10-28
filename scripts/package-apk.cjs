const { spawnSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'package-apk.py');
console.log('📱 [Android APK Builder] 패키징 프로세스를 시작합니다...');

const res = spawnSync('python3', [scriptPath], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
});

if (res.status !== 0) {
  console.error('❌ APK 생성 중 오류가 발생했습니다.');
  process.exit(res.status || 1);
} else {
  console.log('✅ APK 생성이 정상 완료되었습니다.');
}
