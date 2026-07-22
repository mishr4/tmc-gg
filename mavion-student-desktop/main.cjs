const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

let controlWindow;
let lockWindow;
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
    icon: path.join(__dirname, 'assets', 'mavion-lock.ico'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') }
  });
  controlWindow.loadFile(path.join(__dirname, 'renderer', 'control.html'));
}
ipcMain.handle('activate-lock', () => { lockWindow.show(); lockWindow.focus(); });
ipcMain.handle('release-lock', () => { lockWindow.hide(); controlWindow.show(); controlWindow.focus(); });
ipcMain.handle('test-notification', () => new Notification({ title: 'Mavion Go', body: 'Test notification from Mavion Go.' }).show());
app.whenReady().then(() => { createControlWindow(); createLockWindow(); app.on('activate', () => { controlWindow.show(); controlWindow.focus(); }); });
app.on('window-all-closed', event => event.preventDefault());
