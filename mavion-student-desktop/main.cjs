const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');

let overlay;
function createWindow() {
  overlay = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    title: 'Mavion Go Lock',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') }
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('open-desktop', () => { if (overlay) overlay.hide(); });
ipcMain.handle('show-overlay', () => { if (overlay) { overlay.show(); overlay.focus(); } });
ipcMain.handle('test-notification', () => {
  new Notification({ title: 'Mavion Go Lock', body: 'Test notification: your lock overlay is active.' }).show();
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (overlay) { overlay.show(); overlay.focus(); } else createWindow(); });
});
app.on('window-all-closed', event => { event.preventDefault(); });
