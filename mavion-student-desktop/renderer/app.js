(() => {
  const code = 'Mavion';
  const form = document.getElementById('loginForm');
  const input = document.getElementById('accessCode');
  const error = document.getElementById('error');
  const lock = document.getElementById('lockScreen');
  const welcome = document.getElementById('welcome');
  const desktop = document.getElementById('desktop');
  const idlePrompt = document.getElementById('idlePrompt');
  const countdown = document.getElementById('countdown');
  const locking = document.getElementById('locking');
  let idleTimer;
  let countdownTimer;
  let seconds = 30;
  let signedIn = false;
  function clearIdle() { window.clearTimeout(idleTimer); window.clearInterval(countdownTimer); idlePrompt.hidden = true; seconds = 30; countdown.textContent = seconds; }
  function armIdle() { clearIdle(); if (!signedIn) return; idleTimer = window.setTimeout(showPrompt, 5 * 60 * 1000); }
  function finishLock() { clearIdle(); signedIn = false; locking.hidden = false; window.setTimeout(() => { locking.hidden = true; desktop.classList.remove('unlocked'); lock.hidden = false; input.value = ''; input.focus(); }, 850); }
  function showPrompt() { if (!signedIn) return; idlePrompt.hidden = false; countdownTimer = window.setInterval(() => { seconds -= 1; countdown.textContent = seconds; if (seconds <= 0) finishLock(); }, 1000); }
  function unlock() { error.hidden = true; lock.hidden = true; welcome.hidden = false; signedIn = true; window.setTimeout(() => { welcome.hidden = true; desktop.classList.add('unlocked'); armIdle(); }, 1600); }
  form.addEventListener('submit', event => { event.preventDefault(); if (input.value.trim() === code) unlock(); else { error.hidden = false; input.select(); } });
  document.getElementById('signOut').addEventListener('click', finishLock);
  document.getElementById('staySignedIn').addEventListener('click', armIdle);
  document.getElementById('closeSession').addEventListener('click', finishLock);
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(name => window.addEventListener(name, () => { if (signedIn && idlePrompt.hidden) armIdle(); }, { passive: true }));
  input.focus();
})();
