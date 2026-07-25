const { app, BrowserWindow, ipcMain, Tray, Menu, powerMonitor, screen } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const koffi = require('koffi');
let controlWindow, lockWindow, noticeWindow, emergencyWindow, tray;
let quitting = false, idleLockEnabled = true, idleNoticeTimer = null, noticeMode = null, idleIgnoreUntil = 0;
let readerSdk = null, readerPoll = null, readerState = { connected: false, sdk: false, model: 'Imprivata HDW-IMP-80-MINI', detail: 'Reader not detected' };
let lastReaderScan = '', lastReaderScanAt = 0;
const iconPath = path.join(__dirname, 'assets', 'mavion-lock.ico');
const defaultCards = [
  { id: '3689635517', name: 'Alexander' },
  { id: '3687763661', name: 'Andre' },
  { id: '3289073650', name: 'Guest' },
  { id: '3331995442', name: 'Guest' }
];
const normalizeCard = value => String(value || '').replace(/\s+/g, '').toUpperCase().slice(0, 128);
const cardFile = () => path.join(app.getPath('userData'), 'nfc-cards.json');
function loadCards() {
  try {
    const parsed = JSON.parse(fs.readFileSync(cardFile(), 'utf8'));
    if (Array.isArray(parsed.cards)) return parsed.cards.filter(card => normalizeCard(card.id)).map(card => ({ id: normalizeCard(card.id), name: String(card.name || 'Guest').trim().slice(0, 40) || 'Guest' }));
  } catch (_) {}
  return defaultCards.slice();
}
function saveCards(cards) {
  const clean = cards.slice(0, 50).map(card => ({ id: normalizeCard(card.id), name: String(card.name || 'Guest').trim().slice(0, 40) || 'Guest' })).filter(card => card.id);
  const target = cardFile();
  const temp = target + '.tmp';
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(temp, JSON.stringify({ version: 1, cards: clean }, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temp, target);
  return clean;
}
function detectImprivataReader() {
  return new Promise(resolve => {
    const script = "$d=Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue|Where-Object{$_.InstanceId -match 'VID_0C27&PID_3BFA'}|Select-Object -First 1; if($d){'connected|'+$d.InstanceId}else{'disconnected|'}";
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.on('error', () => resolve({ connected: false, model: 'Imprivata HDW-IMP-80-MINI', detail: 'Detection unavailable' }));
    child.on('close', () => {
      const connected = output.trim().startsWith('connected|');
      resolve({ connected, model: 'Imprivata HDW-IMP-80-MINI', detail: connected ? 'rf IDEAS USB reader · VID 0C27 / PID 3BFA' : 'Reader not detected' });
    });
  });
}
function cardCandidates(bytes) {
  const used = Buffer.from(bytes);
  if (!used.length) return [];
  const toDecimal = source => {
    let value = 0n;
    for (const byte of source) value = (value << 8n) | BigInt(byte);
    return value.toString(10);
  };
  return [...new Set([toDecimal([...used].reverse()), toDecimal(used), used.toString('hex').toUpperCase()])];
}
function emitReaderScan(candidates) {
  const known = new Set(loadCards().map(card => card.id));
  const id = candidates.find(value => known.has(normalizeCard(value))) || candidates[0];
  if (!id || (id === lastReaderScan && Date.now() - lastReaderScanAt < 1800)) return;
  lastReaderScan = id;
  lastReaderScanAt = Date.now();
  for (const win of [controlWindow, lockWindow]) {
    if (win && !win.isDestroyed()) win.webContents.send('nfc-scan', id);
  }
}
function stopReaderSdk() {
  if (readerPoll) clearInterval(readerPoll);
  readerPoll = null;
  if (readerSdk) {
    try { readerSdk.disconnect(); } catch {}
  }
  readerSdk = null;
}
function startReaderSdk() {
  stopReaderSdk();
  const dll = 'C:\\Program Files (x86)\\rfIDEAS Configuration Utility 6.14.1\\app-6.14.1\\resources\\app\\lib\\win32\\x64\\pcProxAPI.dll';
  if (!fs.existsSync(dll)) {
    readerState = { connected: false, sdk: false, model: 'Imprivata HDW-IMP-80-MINI', detail: 'rf IDEAS SDK is not installed' };
    return;
  }
  try {
    const lib = koffi.load(dll);
    const connect = lib.func('short usbConnect()');
    const disconnect = lib.func('short USBDisconnect()');
    const getDevices = lib.func('short GetDevCnt()');
    const setDevice = lib.func('short SetActDev(short)');
    const getQueued = lib.func('short GetQueuedID(short, short)');
    const getQueuedIndex = lib.func('long GetQueuedID_index(short)');
    connect();
    const count = Number(getDevices());
    if (count < 1) throw new Error('No compatible reader');
    setDevice(0);
    readerSdk = { disconnect };
    readerState = { connected: true, sdk: true, model: 'Imprivata HDW-IMP-80-MINI', detail: 'Connected directly through rf IDEAS SDK' };
    readerPoll = setInterval(() => {
      try {
        if (!getQueued(1, 1)) return;
        const bits = Number(getQueuedIndex(32));
        const byteCount = Math.ceil(bits / 8);
        if (byteCount < 1 || byteCount > 32) return;
        const bytes = [];
        for (let index = 0; index < byteCount; index += 1) bytes.push(Number(getQueuedIndex(index)) & 0xff);
        emitReaderScan(cardCandidates(bytes));
      } catch {
        readerState = { connected: false, sdk: false, model: 'Imprivata HDW-IMP-80-MINI', detail: 'Reader connection was interrupted' };
        stopReaderSdk();
      }
    }, 120);
  } catch (error) {
    readerState = { connected: false, sdk: false, model: 'Imprivata HDW-IMP-80-MINI', detail: `SDK reader unavailable: ${error.message}` };
  }
}
const pos = (width, height, top = false) => { const area = screen.getPrimaryDisplay().workArea; return { x: area.x + area.width - width - 18, y: top ? area.y + 12 : area.y + area.height - height - 18 }; };
function showControl() { controlWindow.show(); controlWindow.focus(); }
function showLock() { hideNotice(); lockWindow.webContents.send('reset-lock'); lockWindow.show(); lockWindow.focus(); lockWindow.webContents.send('play-lock-animation'); }
function hideLock() { lockWindow.hide(); }
function sendMediaKey(command) {
  const keys = { previous: 0xB1, playpause: 0xB3, next: 0xB0 };
  const key = keys[command];
  if (!key) return;
  const script = "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class MavionMedia { [DllImport(\"user32.dll\")] public static extern void keybd_event(byte k, byte s, uint f, UIntPtr x); public static void Send(byte k) { keybd_event(k,0,0,UIntPtr.Zero); keybd_event(k,0,2,UIntPtr.Zero); } }'; [MavionMedia]::Send(" + key + ")";
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true });
  child.on('error', () => {});
}
function showNotice(mode) { if (noticeWindow.isVisible()) return; noticeMode = mode; const p = pos(370, mode === 'idle' ? 158 : 112); noticeWindow.setBounds({ x:p.x,y:p.y,width:370,height:mode === 'idle' ? 158 : 112 }); noticeWindow.webContents.send('show-notice', mode); noticeWindow.showInactive(); if (mode === 'standard') setTimeout(() => { if (noticeMode === 'standard') hideNotice(); }, 5000); if (mode === 'idle') idleNoticeTimer = setTimeout(() => { hideNotice(); showLock(); }, 30000); }
function hideNotice() { clearTimeout(idleNoticeTimer); idleNoticeTimer = null; noticeMode = null; if (noticeWindow) noticeWindow.hide(); }
function showEmergency() { hideNotice(); hideLock(); emergencyWindow.webContents.send('reset-emergency'); emergencyWindow.show(); emergencyWindow.focus(); }
function checkSystemIdle() { if (!idleLockEnabled || lockWindow.isVisible() || emergencyWindow.isVisible() || Date.now() < idleIgnoreUntil) return; if (noticeWindow.isVisible()) { if (powerMonitor.getSystemIdleTime() < 2) { hideNotice(); idleIgnoreUntil = Date.now() + 300000; } return; } if (powerMonitor.getSystemIdleTime() >= 300) showNotice('idle'); }
function securedWindow(options) { return new BrowserWindow({ ...options, frame:false, transparent:true, skipTaskbar:true, resizable:false, movable:false, webPreferences:{ contextIsolation:true,nodeIntegration:false,sandbox:true,preload:path.join(__dirname,'preload.cjs') } }); }
function createLockWindow() { lockWindow = securedWindow({ fullscreen:true, backgroundColor:'#00000000', show:false }); lockWindow.setAlwaysOnTop(true,'screen-saver'); lockWindow.loadFile(path.join(__dirname,'renderer','lock.html')); }
function createNoticeWindow() { noticeWindow = securedWindow({ width:370,height:158,backgroundColor:'#00000000',show:false,focusable:true }); noticeWindow.setAlwaysOnTop(true,'screen-saver'); noticeWindow.loadFile(path.join(__dirname,'renderer','notice.html')); }
function createEmergencyWindow() { const area=screen.getPrimaryDisplay().workArea; emergencyWindow = securedWindow({ x:area.x,y:area.y,width:area.width,height:64,backgroundColor:'#00000000',show:false,focusable:true }); emergencyWindow.setAlwaysOnTop(true,'screen-saver'); emergencyWindow.loadFile(path.join(__dirname,'renderer','emergency.html')); }
function createControlWindow() { controlWindow = new BrowserWindow({ width:1060,height:710,minWidth:860,minHeight:570,backgroundColor:'#111318',autoHideMenuBar:true,title:'Mavion Go',icon:iconPath,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,preload:path.join(__dirname,'preload.cjs')} }); controlWindow.loadFile(path.join(__dirname,'renderer','control.html')); controlWindow.on('close',e=>{if(!quitting){e.preventDefault();controlWindow.hide()}}); if(app.getLoginItemSettings().wasOpenedAtLogin)controlWindow.once('ready-to-show',()=>controlWindow.hide()); }
function createTray() { tray = new Tray(iconPath); tray.setToolTip('Mavion Go Lock'); tray.setContextMenu(Menu.buildFromTemplate([{label:'Lock desktop',click:showLock},{label:'Open Mavion Go',click:showControl},{type:'separator'},{label:'Quit',click:()=>{quitting=true;app.quit()}}])); tray.on('click',showControl); }
ipcMain.handle('activate-lock',showLock); ipcMain.handle('release-lock',hideLock); ipcMain.handle('media-command',(_,command)=>sendMediaKey(command)); ipcMain.handle('show-notification',()=>showNotice('standard')); ipcMain.handle('show-inactivity',()=>showNotice('idle')); ipcMain.handle('notice-stay',()=>{hideNotice();idleIgnoreUntil=Date.now()+300000}); ipcMain.handle('notice-lock',()=>{hideNotice();showLock()}); ipcMain.handle('emergency-override',showEmergency); ipcMain.handle('end-emergency',(_,code)=>{if(String(code||'').trim()==='Mavion'){emergencyWindow.hide();return true}return false}); ipcMain.handle('get-startup',()=>app.getLoginItemSettings().openAtLogin); ipcMain.handle('set-startup',(_,enabled)=>app.setLoginItemSettings({openAtLogin:Boolean(enabled)})); ipcMain.handle('get-idle-lock',()=>idleLockEnabled); ipcMain.handle('set-idle-lock',(_,enabled)=>{idleLockEnabled=Boolean(enabled)});
ipcMain.handle('get-nfc-config', async () => {
  if (!readerSdk) startReaderSdk();
  if (readerState.sdk) return { cards: loadCards(), reader: readerState };
  const detected = await detectImprivataReader();
  return { cards: loadCards(), reader: detected.connected ? { ...detected, detail: `${detected.detail} · SDK connection unavailable` } : readerState };
});
ipcMain.handle('validate-nfc-card', (_, raw) => {
  const id = normalizeCard(raw);
  const card = loadCards().find(item => item.id === id);
  return card ? { ok: true, name: card.name } : { ok: false };
});
ipcMain.handle('save-nfc-card', (_, card) => {
  const id = normalizeCard(card && card.id);
  if (!id) return { ok: false, error: 'invalid_card' };
  const cards = loadCards().filter(item => item.id !== id);
  cards.push({ id, name: String(card.name || 'Guest').trim().slice(0, 40) || 'Guest' });
  return { ok: true, cards: saveCards(cards) };
});
ipcMain.handle('remove-nfc-card', (_, id) => ({ ok: true, cards: saveCards(loadCards().filter(item => item.id !== normalizeCard(id))) }));
app.whenReady().then(()=>{createControlWindow();createLockWindow();createNoticeWindow();createEmergencyWindow();createTray();startReaderSdk();setInterval(checkSystemIdle,2000);app.on('activate',showControl)}); app.on('before-quit',stopReaderSdk); app.on('window-all-closed',e=>{if(!quitting)e.preventDefault()});
