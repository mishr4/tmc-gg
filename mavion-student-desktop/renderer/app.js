(() => {
  const accessCode = 'Mavion';
  const form = document.getElementById('loginForm');
  const input = document.getElementById('accessCode');
  const error = document.getElementById('error');
  const settings = document.getElementById('settingsPanel');
  const idlePrompt = document.getElementById('idlePrompt');
  const countdown = document.getElementById('countdown');
  const emergency = document.getElementById('emergencyOverride');
  const idleEnabled = document.getElementById('idleEnabled');
  let idleTimer; let countdownTimer; let seconds = 30;
  function clearIdle(){ window.clearTimeout(idleTimer); window.clearInterval(countdownTimer); idlePrompt.hidden = true; seconds = 30; countdown.textContent = seconds; }
  function armIdle(){ clearIdle(); if (!idleEnabled.checked) return; idleTimer = window.setTimeout(showIdle, 5 * 60 * 1000); }
  function showIdle(){ idlePrompt.hidden = false; countdownTimer = window.setInterval(() => { seconds--; countdown.textContent = seconds; if(seconds <= 0) showLock(); }, 1000); }
  function showLock(){ clearIdle(); settings.hidden = true; input.value = ''; input.focus(); }
  function openDesktop(){ clearIdle(); window.mavionLock.openDesktop(); }
  form.addEventListener('submit', event => { event.preventDefault(); if(input.value.trim() === accessCode){ error.hidden = true; openDesktop(); } else { error.hidden = false; input.select(); } });
  document.getElementById('openDesktop').addEventListener('click', openDesktop);
  document.getElementById('settingsButton').addEventListener('click', () => { settings.hidden = false; });
  document.getElementById('closeSettings').addEventListener('click', () => { settings.hidden = true; });
  document.getElementById('testNotification').addEventListener('click', () => window.mavionLock.testNotification());
  document.getElementById('staySignedIn').addEventListener('click', openDesktop);
  document.getElementById('closeSession').addEventListener('click', showLock);
  document.getElementById('emergencyYes').addEventListener('click', () => { emergency.hidden = true; openDesktop(); });
  document.getElementById('emergencyNo').addEventListener('click', () => { emergency.hidden = true; input.focus(); });
  window.addEventListener('keydown', event => { if(event.key === 'F6'){ event.preventDefault(); emergency.hidden = false; } });
  idleEnabled.addEventListener('change', armIdle);
  ['mousemove','mousedown','keydown','touchstart','scroll'].forEach(name => window.addEventListener(name, armIdle, { passive:true }));
  input.focus(); armIdle();
})();
