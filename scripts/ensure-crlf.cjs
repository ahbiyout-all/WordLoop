const fs = require('fs');
const path = require('path');

const batFiles = [
  'build-all.bat',
  'build-pc.bat',
  'build-android.bat',
  'build-ios.bat',
  'install-and-build-android.bat',
  'github-sync.bat',
  path.join('scripts', 'github-sync.bat'),
];

const rootDir = path.resolve(__dirname, '..');

batFiles.forEach((rel) => {
  const filePath = path.join(rootDir, rel);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Normalize newlines to \r\n (CRLF)
    const normalized = content.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    fs.writeFileSync(filePath, normalized, { encoding: 'utf8' });
    console.log(`[CRLF Converted] ${rel}`);
  } else {
    console.warn(`[Not Found] ${rel}`);
  }
});
