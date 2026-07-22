(() => {
  const form = document.getElementById('unlockForm');
  const input = document.getElementById('accessCode');
  const error = document.getElementById('error');
  const emergency = document.getElementById('emergency');
  const overlay = document.getElementById('overlay');
  const clock = document.getElementById('clock');
  const reset = () => { input.value = ''; error.hidden = true; emergency.hidden = true; input.focus(); };
  const animate = () => { overlay.classList.remove('locking'); void overlay.offsetWidth; overlay.classList.add('locking'); setTimeout(() => overlay.classList.remove('locking'), 650); };
  const updateClock = () => { clock.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date()); };
  form.addEventListener('submit', event => { event.preventDefault(); if (input.value.trim() === 'Mavion') window.mavion.releaseLock(); else { error.hidden = false; input.select(); } });
  document.querySelectorAll('[data-media]').forEach(button => button.addEventListener('click', () => window.mavion.media(button.dataset.media)));
  document.getElementById('overrideYes').addEventListener('click', () => window.mavion.emergencyOverride());
  document.getElementById('overrideNo').addEventListener('click', () => { emergency.hidden = true; input.focus(); });
  window.addEventListener('keydown', event => { if (event.key === 'F6') { event.preventDefault(); emergency.hidden = false; } });
  window.mavion.onResetLock(reset);
  window.mavion.onPlayLockAnimation(animate);
  updateClock(); setInterval(updateClock, 1000); reset();
})();
