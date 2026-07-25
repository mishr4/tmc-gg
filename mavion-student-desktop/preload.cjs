const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mavion', {
  activateLock: () => ipcRenderer.invoke('activate-lock'),
  releaseLock: () => ipcRenderer.invoke('release-lock'),
  media: command => ipcRenderer.invoke('media-command', command),
  showNotification: () => ipcRenderer.invoke('show-notification'),
  showInactivity: () => ipcRenderer.invoke('show-inactivity'),
  noticeStay: () => ipcRenderer.invoke('notice-stay'),
  noticeLock: () => ipcRenderer.invoke('notice-lock'),
  emergencyOverride: () => ipcRenderer.invoke('emergency-override'),
  endEmergency: code => ipcRenderer.invoke('end-emergency', code),
  getStartup: () => ipcRenderer.invoke('get-startup'),
  setStartup: enabled => ipcRenderer.invoke('set-startup', enabled),
  getIdleLock: () => ipcRenderer.invoke('get-idle-lock'),
  setIdleLock: enabled => ipcRenderer.invoke('set-idle-lock', enabled),
  getNfcConfig: () => ipcRenderer.invoke('get-nfc-config'),
  validateNfcCard: value => ipcRenderer.invoke('validate-nfc-card', value),
  saveNfcCard: card => ipcRenderer.invoke('save-nfc-card', card),
  removeNfcCard: id => ipcRenderer.invoke('remove-nfc-card', id),
  onNfcScan: fn => ipcRenderer.on('nfc-scan', (_, value) => fn(value)),
  onNfcAuthResult: fn => ipcRenderer.on('nfc-auth-result', (_, result) => fn(result)),
  onResetLock: fn => ipcRenderer.on('reset-lock', fn),
  onPlayLockAnimation: fn => ipcRenderer.on('play-lock-animation', fn),
  onShowNotice: fn => ipcRenderer.on('show-notice', (_, mode) => fn(mode)),
  onResetEmergency: fn => ipcRenderer.on('reset-emergency', fn)
});
