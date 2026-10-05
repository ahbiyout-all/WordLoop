import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const action = process.argv[2] || 'sync'; // 'add', 'sync', 'open', 'auto'

console.log(`🍎 [Capacitor iOS] Operation: ${action}...`);

const possibleCliPaths = [
  path.join(rootDir, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor'),
  path.join(rootDir, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor.js'),
  path.join(rootDir, 'node_modules', '.bin', 'cap.cmd'),
  path.join(rootDir, 'node_modules', '.bin', 'cap'),
];

let cliPath = possibleCliPaths.find((p) => fs.existsSync(p));

if (!cliPath) {
  console.log('📦 Installing Capacitor iOS dependencies...');
  const installRes = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['install', '@capacitor/core', '--save', '@capacitor/cli', '@capacitor/ios', '--save-dev'],
    {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    }
  );
  if (installRes.status !== 0) {
    console.error('❌ Failed to install Capacitor iOS');
    process.exit(installRes.status || 1);
  }
  cliPath = possibleCliPaths.find((p) => fs.existsSync(p));
}

if (!cliPath) {
  console.error('\n❌ Could not find capacitor CLI.');
  process.exit(1);
}

if (action === 'auto' || action === 'sync' || action === 'add') {
  const iosDir = path.join(rootDir, 'ios');
  if (!fs.existsSync(iosDir)) {
    console.log('📂 [1/2] Adding iOS platform (cap add ios)...');
    spawnSync(process.execPath, [cliPath, 'add', 'ios'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: false,
    });
  }

  console.log('🔄 [2/2] Syncing Web Assets to iOS (cap sync ios)...');
  const syncRes = spawnSync(process.execPath, [cliPath, 'sync', 'ios'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });

  if (syncRes.status === 0) {
    console.log('\n=========================================');
    console.log('🎉 [SUCCESS] iOS project successfully synced!');
    console.log('To run on macOS: npx cap open ios');
    console.log('=========================================\n');
  }
}
