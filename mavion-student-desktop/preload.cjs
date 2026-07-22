const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('mavionLock', {
  openDesktop: () => ipcRenderer.invoke('open-desktop'),
  testNotification: () => ipcRenderer.invoke('test-notification')
});
