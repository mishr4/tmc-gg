const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('mavion', {
  activateLock: () => ipcRenderer.invoke('activate-lock'),
  releaseLock: () => ipcRenderer.invoke('release-lock'),
  testNotification: () => ipcRenderer.invoke('test-notification')
});
