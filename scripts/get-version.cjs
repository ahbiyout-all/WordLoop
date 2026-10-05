/**
 * WordLoop - Dynamic Version Extractor
 * Extracts application version from Single Source of Truth (package.json / docs/PATCH_NOTES.md)
 */
const fs = require('fs');
const path = require('path');

function getVersion() {
  // 1st Priority: package.json
  try {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) return pkg.version.trim();
    }
  } catch (e) {}

  // 2nd Priority: docs/PATCH_NOTES.md
  try {
    const docPath = path.resolve(__dirname, '..', 'docs', 'PATCH_NOTES.md');
    if (fs.existsSync(docPath)) {
      const content = fs.readFileSync(docPath, 'utf8');
      const match = content.match(/##\s*🚀\s*Version\s*([0-9]+\.[0-9]+\.[0-9]+)/);
      if (match && match[1]) return match[1].trim();
    }
  } catch (e) {}

  // Default fallback
  return '3.12.0';
}

process.stdout.write(getVersion());
