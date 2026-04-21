const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDb, getDb } = require('../backend/db');
const { startServer, stopServer } = require('../backend/server');
const services = require('../backend/services');

let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch {}

const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let reminderTimer = null;

function getUserDataDir() {
  const dir = path.join(app.getPath('userData'));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureImageDirs() {
  const base = getUserDataDir();
  const originalDir = path.join(base, 'images', 'original');
  const thumbDir = path.join(base, 'images', 'thumb');
  fs.mkdirSync(originalDir, { recursive: true });
  fs.mkdirSync(thumbDir, { recursive: true });
  return { originalDir, thumbDir };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: '接单助手',
    backgroundColor: '#FFFBF3',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function scheduleDailyReminder() {
  if (reminderTimer) clearTimeout(reminderTimer);

  const now = new Date();
  const next = new Date();
  next.setHours(22, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const delay = next.getTime() - now.getTime();
  reminderTimer = setTimeout(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const reported = services.dayLog.isReported(today);
      if (!reported) {
        new Notification({
          title: '接单助手',
          body: '今天画得怎么样？来填一下今日完成吧～',
        }).show();
      }
    } catch (e) {
      console.error('reminder error:', e);
    } finally {
      scheduleDailyReminder();
    }
  }, delay);
}

// ============ 自动更新 ============
// 状态推给渲染进程，前端显示小徽章
function pushUpdateState(state) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:state', state);
  }
}

function setupAutoUpdater() {
  if (!autoUpdater || isDev) return; // 开发态不做检查
  autoUpdater.autoDownload = true; // 自动下载
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => pushUpdateState({ status: 'checking' }));
  autoUpdater.on('update-available', (info) => pushUpdateState({ status: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => pushUpdateState({ status: 'none' }));
  autoUpdater.on('download-progress', (p) => pushUpdateState({ status: 'downloading', percent: p.percent }));
  autoUpdater.on('update-downloaded', (info) => pushUpdateState({ status: 'downloaded', version: info.version }));
  autoUpdater.on('error', (err) => pushUpdateState({ status: 'error', message: String(err?.message || err) }));

  // 启动 30 秒后检查一次，之后每 4 小时一次
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 30 * 1000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}

function registerIpc() {
  ipcMain.handle('app:showUnreportedToday', () => {
    const today = new Date().toISOString().slice(0, 10);
    return !services.dayLog.isReported(today);
  });

  // updater IPC
  ipcMain.handle('updater:checkNow', async () => {
    if (!autoUpdater || isDev) return { ok: false, reason: 'not supported' };
    try {
      const r = await autoUpdater.checkForUpdates();
      return { ok: true, version: r?.updateInfo?.version };
    } catch (e) {
      return { ok: false, reason: String(e?.message || e) };
    }
  });
  ipcMain.handle('updater:quitAndInstall', () => {
    if (autoUpdater) autoUpdater.quitAndInstall();
  });
  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('file:pickImage', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('file:exportBackup', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `jiedan-backup-${Date.now()}.zip`,
      filters: [{ name: 'Zip', extensions: ['zip'] }],
    });
    if (result.canceled || !result.filePath) return null;
    return services.backup.exportTo(result.filePath);
  });

  ipcMain.handle('file:importBackup', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'Zip', extensions: ['zip'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return services.backup.importFrom(result.filePaths[0]);
  });
}

app.whenReady().then(() => {
  const userDataDir = getUserDataDir();
  ensureImageDirs();
  initDb(path.join(userDataDir, 'app.db'));
  // 启动时用当前算法对所有未完成本重排一次，确保老数据/算法升级后也刷新为最新计划
  try {
    const result = services.schedules.recomputeAll();
    console.log('[jiedan] startup recompute:', result);
  } catch (e) {
    console.error('[jiedan] startup recompute failed:', e.message);
  }
  startServer(3899);
  registerIpc();
  createWindow();
  scheduleDailyReminder();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopServer();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  stopServer();
  if (reminderTimer) clearTimeout(reminderTimer);
});
