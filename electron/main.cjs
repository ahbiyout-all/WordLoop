const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Allow local file access for ES modules loaded via file:// protocol
app.commandLine.appendSwitch('allow-file-access-from-files');
app.commandLine.appendSwitch('disable-site-isolation-trials');

function resolveDistIndexPath() {
  const candidates = [
    // 1. Packaged app inside asar
    path.join(app.getAppPath(), 'dist', 'index.html'),
    // 2. Relative from electron directory (unpacked / dev)
    path.join(__dirname, '..', 'dist', 'index.html'),
    // 3. Current working directory
    path.join(process.cwd(), 'dist', 'index.html'),
    // 4. Resources path
    path.join(process.resourcesPath || '', 'app.asar', 'dist', 'index.html'),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(__dirname, '..', 'dist', 'index.html');
}

function resolveAppIcon() {
  const iconCandidates = [
    path.join(__dirname, '../public/favicon.ico'),
    path.join(__dirname, '../public/favicon.svg'),
    path.join(app.getAppPath(), 'public', 'favicon.ico'),
    path.join(app.getAppPath(), 'dist', 'favicon.svg'),
  ];
  for (const icon of iconCandidates) {
    if (fs.existsSync(icon)) return icon;
  }
  return undefined;
}

function createWindow() {
  const appIcon = resolveAppIcon();

  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'WordLoop - 나만의 영단어 & 자기계발',
    icon: appIcon,
    backgroundColor: '#0f172a', // Sleek dark slate - prevents blank white flashes
    show: false, // Show once ready-to-show to prevent blank screen
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false, // Ensures local file:// ES modules & assets load reliably
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Smooth appearance: display window only when first frame is ready
  win.once('ready-to-show', () => {
    win.show();
  });

  // Block unauthorized popups and external window spawns
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl.startsWith('http://localhost:3000') || navigationUrl.startsWith('file://')) {
      return;
    }
    event.preventDefault();
  });

  // Developer shortcuts (F12 or Ctrl+Shift+I) for easy debugging
  win.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Friendly failure fallback screen instead of a blank white void
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ [Electron did-fail-load]', errorCode, errorDescription, validatedURL);
    // Ignore aborted loads (e.g. reload or redirect)
    if (errorCode === -3) return;

    win.show();
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>WordLoop - 로드 오류</title>
        <style>
          body {
            margin: 0;
            padding: 40px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
            text-align: center;
          }
          .card {
            background-color: #1e293b;
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: 20px;
            padding: 32px;
            max-width: 520px;
            width: 100%;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          }
          h2 { color: #f87171; margin-top: 0; font-size: 22px; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 12px 0; }
          .error-box {
            background: #090d16;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 10px 14px;
            font-family: monospace;
            font-size: 12px;
            color: #fb7185;
            text-align: left;
            word-break: break-all;
            margin: 16px 0;
          }
          .btn-group { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
          button {
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-primary { background: #6366f1; color: white; }
          .btn-primary:hover { background: #4f46e5; }
          .btn-secondary { background: #334155; color: #cbd5e1; }
          .btn-secondary:hover { background: #475569; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚠️ 화면을 불러오지 못했습니다</h2>
          <p>애플리케이션 진입 파일(dist/index.html)을 로드하는 중 오류가 발생했습니다.<br>웹 빌드가 완료되었는지 확인해 주세요.</p>
          <div class="error-box">
            오류 코드: ${errorCode} (${errorDescription})<br>
            대상 주소: ${validatedURL}
          </div>
          <div class="btn-group">
            <button class="btn-primary" onclick="location.reload()">다시 시도 (Reload)</button>
            <button class="btn-secondary" onclick="window.close()">프로그램 종료</button>
          </div>
        </div>
      </body>
      </html>
    `)}`);
  });

  Menu.setApplicationMenu(null);

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    win.loadURL('http://localhost:3000').catch(() => {
      const fallbackPath = resolveDistIndexPath();
      win.loadFile(fallbackPath);
    });
  } else {
    const targetFile = resolveDistIndexPath();
    console.log('📦 [Electron] Loading production file:', targetFile);
    win.loadFile(targetFile);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
