import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const action = process.argv[2] || 'sync'; // 'add', 'sync', 'open'

console.log(`📱 [Capacitor Android] 작업 시작: ${action} (경로 특수문자/공백 보호 모드)...`);

const possibleCliPaths = [
  path.join(rootDir, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor'),
  path.join(rootDir, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor.js'),
  path.join(rootDir, 'node_modules', '.bin', 'cap.cmd'),
  path.join(rootDir, 'node_modules', '.bin', 'cap'),
];

let cliPath = possibleCliPaths.find((p) => fs.existsSync(p));

if (!cliPath) {
  console.log('📦 Capacitor 패키지 설치 중...');
  const installRes = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '@capacitor/core', '--save-dev', '@capacitor/cli', '@capacitor/android'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });
  if (installRes.status !== 0) {
    console.error('❌ Capacitor 설치 실패');
    process.exit(installRes.status || 1);
  }
  cliPath = possibleCliPaths.find((p) => fs.existsSync(p));
}

if (!cliPath) {
  console.error('\n❌ [오류] @capacitor/cli를 찾을 수 없습니다. npm install @capacitor/cli 를 실행해주세요.');
  process.exit(1);
}

// If action is 'auto', it adds android if not exists, then syncs
if (action === 'auto' || action === 'sync') {
  const androidDir = path.join(rootDir, 'android');
  if (!fs.existsSync(androidDir)) {
    console.log('📂 [1/2] Android 플랫폼 추가 중 (cap add android)...');
    const addRes = spawnSync(process.execPath, [cliPath, 'add', 'android'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: false,
    });
    if (addRes.status !== 0) {
      console.error('❌ 안드로이드 플랫폼 추가 실패');
    }
  }

  console.log('🔄 [2/2] 웹 빌드 산출물 동기화 중 (cap sync android)...');
  const syncRes = spawnSync(process.execPath, [cliPath, 'sync', 'android'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });

  if (syncRes.status === 0) {
    console.log('\n=========================================');
    console.log('🎉 [성공] 안드로이드 프로젝트 동기화 완료!');
    console.log('👉 Android Studio에서 열기: npx cap open android (또는 node scripts/sync-android.js open)');
    console.log('👉 콘솔에서 바로 Debug APK 빌드: cd android && gradlew.bat assembleDebug');
    console.log('=========================================\n');
  }
  process.exit(syncRes.status ?? 0);
} else if (action === 'open') {
  console.log('🚀 Android Studio 실행 중...');
  const openRes = spawnSync(process.execPath, [cliPath, 'open', 'android'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });
  process.exit(openRes.status ?? 0);
} else {
  const customRes = spawnSync(process.execPath, [cliPath, action, 'android'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });
  process.exit(customRes.status ?? 0);
}
