import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🖥️ [Electron Builder] PC 데스크톱 앱 패키징을 시작합니다 (특수문자/공백 경로 보호 모드)...');

// Candidates for electron-builder CLI entry
const possibleCliPaths = [
  path.join(rootDir, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js'),
  path.join(rootDir, 'node_modules', 'electron-builder', 'cli.js'),
  path.join(rootDir, 'node_modules', '.bin', 'electron-builder.cmd'),
  path.join(rootDir, 'node_modules', '.bin', 'electron-builder'),
];

let cliPath = possibleCliPaths.find((p) => fs.existsSync(p));

if (!cliPath) {
  console.log('📦 electron-builder 패키지를 로컬에 설치 중...');
  const installRes = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--save-dev', 'electron', 'electron-builder'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });
  if (installRes.status !== 0) {
    console.error('❌ electron 및 electron-builder 설치 실패');
    process.exit(installRes.status || 1);
  }
  cliPath = possibleCliPaths.find((p) => fs.existsSync(p));
}

if (!cliPath) {
  console.error('\n❌ [오류] electron-builder CLI 파일을 찾을 수 없습니다. npm install --save-dev electron-builder를 수동 실행해주세요.');
  process.exit(1);
}

// Ensure web build is complete before packaging
const distIndex = path.join(rootDir, 'dist', 'index.html');
if (!fs.existsSync(distIndex)) {
  console.log('🏗️ [Web Build] dist/index.html이 없습니다. 웹 빌드를 먼저 실행합니다...');
  const buildRes = spawnSync(process.execPath, [path.join(rootDir, 'scripts', 'build-web.js')], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });
  if (buildRes.status !== 0) {
    console.error('❌ 웹 빌드 실패. Electron 패키징을 중단합니다.');
    process.exit(buildRes.status || 1);
  }
}

const args = [
  cliPath,
  '--config.files=dist/**/*',
  '--config.files=electron/**/*',
  '--config.files=package.json',
  '--config.extraMetadata.main=electron/main.cjs',
  '--win',
  '--x64',
  ...process.argv.slice(2),
];

console.log(`🚀 [실행] Node.js 직결 CLI: ${cliPath}`);

const result = spawnSync(process.execPath, args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES: 'true',
  },
});

if (result.error) {
  console.error('❌ [Electron 빌드 에러]', result.error);
  process.exit(1);
}

if (result.status === 0) {
  console.log('\n=========================================');
  console.log('🎉 [성공] PC 데스크톱 앱 패키징이 완료되었습니다!');
  console.log(`📁 생성 위치: ${path.join(rootDir, 'dist_electron')}`);
  console.log('=========================================\n');
}

process.exit(result.status ?? 0);
