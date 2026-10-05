import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Find vite entry file
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

if (!fs.existsSync(viteBin)) {
  console.error('\n❌ [오류] vite 패키지를 찾을 수 없습니다. npm install을 먼저 실행해주세요.');
  process.exit(1);
}

console.log('📦 [Vite Build] 빌드를 시작합니다 (경로 공백/특수문자 보호 모드)...');

const result = spawnSync(process.execPath, [viteBin, 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error('❌ [Vite Build 에러]', result.error);
  process.exit(1);
}

if (result.status === 0) {
  const distIndex = path.join(rootDir, 'dist', 'index.html');
  const dist404 = path.join(rootDir, 'dist', '404.html');

  if (fs.existsSync(distIndex)) {
    try {
      // 1. Post-process dist/index.html for Electron file:// and offline compatibility
      // Removing 'crossorigin' prevents Chromium from blocking module scripts on file://
      let html = fs.readFileSync(distIndex, 'utf8');
      const sanitized = html.replace(/\s+crossorigin(?:="[^"]*")?/gi, '');
      fs.writeFileSync(distIndex, sanitized, 'utf8');
      console.log('🛡️ [Build Post-process] Electron file:// CORS 방지 패치 완료 (crossorigin 속성 정돈)');

      // 2. Ensure GitHub Pages SPA fallback routing works by creating dist/404.html
      fs.copyFileSync(distIndex, dist404);
      console.log('📄 [GitHub Pages] 404.html SPA 라우팅 폴백 생성 완료');
    } catch (e) {
      console.warn('⚠️ [Post-process 경고]', e);
    }
  }
}

process.exit(result.status ?? 0);
