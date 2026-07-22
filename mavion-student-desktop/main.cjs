const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, powerMonitor } = require('electron');
const path = require('path');

let controlWindow;
let lockWindow;
let tray;
let quitting = false;
let idleLockEnabled = true;
const iconPath = path.join(__dirname, 'assets', 'mavion-lock.ico');
function showControl() { controlWindow.show(); controlWindow.focus(); }
function showLock() { lockWindow.show(); lockWindow.focus(); }
function checkSystemIdle() {
  if (idleLockEnabled && !lockWindow.isVisible() && powerMonitor.getSystemIdleTime() >= 300) showLock();
}
function createTray() {
  tray = new Tray(iconPath);
  tray.setToolTip('Mavion Go Lock');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Lock desktop', click: showLock },
    { label: 'Open Mavion Go', click: showControl },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on('click', showControl);
}
function createLockWindow() {
  lockWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    skipTaskbar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') }
  });
  lockWindow.setAlwaysOnTop(true, 'screen-saver');
  lockWindow.loadFile(path.join(__dirname, 'renderer', 'lock.html'));
}
function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1060,
    height: 710,
    minWidth: 860,
    minHeight: 570,
    backgroundColor: '#111318',
    autoHideMenuBar: true,
    title: 'Mavion Go',
    icon: iconPath,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') }
  });
  controlWindow.loadFile(path.join(__dirname, 'renderer', 'control.html'));
  controlWindow.on('close', event => { if (!quitting) { event.preventDefault(); controlWindow.hide(); } });
  if (app.getLoginItemSettings().wasOpenedAtLogin) controlWindow.once('ready-to-show', () => controlWindow.hide());
}
ipcMain.handle('activate-lock', showLock);
ipcMain.handle('release-lock', () => { lockWindow.hide(); });
ipcMain.handle('test-notification', () => new Notification({ title: 'Mavion Go', body: 'Test notification from Mavion Go.' }).show());
ipcMain.handle('get-startup', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('set-startup', (_, enabled) => app.setLoginItemSettings({ openAtLogin: Boolean(enabled) }));
ipcMain.handle('get-idle-lock', () => idleLockEnabled);
ipcMain.handle('set-idle-lock', (_, enabled) => { idleLockEnabled = Boolean(enabled); });
app.whenReady().then(() => { createControlWindow(); createLockWindow(); createTray(); setInterval(checkSystemIdle, 10000); app.on('activate', showControl); });
app.on('window-all-closed', event => { if (!quitting) event.preventDefault(); });
