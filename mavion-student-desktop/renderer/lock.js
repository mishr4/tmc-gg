(() => {
  const form = document.getElementById('unlockForm');
  const input = document.getElementById('accessCode');
  const error = document.getElementById('error');
  const nfcInput = document.getElementById('nfcInput');
  const nfcError = document.getElementById('nfcError');
  const nfcReader = document.getElementById('nfcReader');
  const nfcTitle = document.getElementById('nfcTitle');
  const nfcStatus = document.getElementById('nfcStatus');
  const nfcPanel = document.getElementById('nfcPanel');
  const nfcTab = document.getElementById('nfcTab');
  const codeTab = document.getElementById('codeTab');
  const subcopy = document.getElementById('subcopy');
  const emergency = document.getElementById('emergency');
  const overlay = document.getElementById('overlay');
  const clock = document.getElementById('clock');
  let mode = 'nfc';
  let scanTimer;
  const focusCurrent = () => setTimeout(() => (mode === 'nfc' ? nfcInput : input).focus(), 0);
  const setMode = next => {
    mode = next;
    const nfc = mode === 'nfc';
    nfcTab.classList.toggle('active', nfc);
    codeTab.classList.toggle('active', !nfc);
    nfcTab.setAttribute('aria-selected', String(nfc));
    codeTab.setAttribute('aria-selected', String(!nfc));
    nfcPanel.classList.toggle('active', nfc);
    form.classList.toggle('active', !nfc);
    subcopy.textContent = nfc ? 'Tap your card to continue.' : 'Enter your access code to continue.';
    nfcError.hidden = true;
    error.hidden = true;
    nfcInput.value = '';
    input.value = '';
    focusCurrent();
  };
  const reset = () => {
    clearTimeout(scanTimer);
    emergency.hidden = true;
    nfcReader.classList.remove('reading', 'accepted', 'denied');
    nfcTitle.textContent = 'Ready to scan';
    nfcStatus.textContent = 'Tap your card on the connected reader.';
    setMode('nfc');
  };
  const animate = () => { overlay.classList.remove('locking'); void overlay.offsetWidth; overlay.classList.add('locking'); setTimeout(() => overlay.classList.remove('locking'), 650); };
  const updateClock = () => { clock.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date()); };
  form.addEventListener('submit', event => { event.preventDefault(); if (input.value.trim() === 'Mavion') window.mavion.releaseLock(); else { error.hidden = false; input.select(); } });
  const finishScan = () => {
    clearTimeout(scanTimer);
    const scanned = nfcInput.value.replace(/\s+/g, '').toUpperCase();
    nfcInput.value = '';
    if (!scanned) return;
    nfcReader.classList.add('reading');
    nfcTitle.textContent = 'Reading card';
    nfcStatus.textContent = 'Hold it near the reader…';
    setTimeout(async () => {
      const result = await window.mavion.validateNfcCard(scanned);
      if (result && result.ok) {
        const name = result.name;
        nfcReader.classList.remove('reading');
        nfcReader.classList.add('accepted');
        nfcTitle.textContent = `Welcome, ${name}.`;
        nfcStatus.textContent = 'Opening your desktop…';
        setTimeout(() => window.mavion.releaseLock(), 700);
      } else {
        nfcReader.classList.remove('reading');
        nfcReader.classList.add('denied');
        nfcTitle.textContent = 'Card not recognized';
        nfcStatus.textContent = 'Try again or choose Access code.';
        nfcError.hidden = false;
        setTimeout(() => {
          nfcReader.classList.remove('denied');
          nfcTitle.textContent = 'Ready to scan';
          nfcStatus.textContent = 'Tap your card on the connected reader.';
          focusCurrent();
        }, 1500);
      }
    }, 360);
  };
  nfcInput.addEventListener('input', () => {
    nfcError.hidden = true;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(finishScan, 350);
  });
  nfcInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishScan();
    }
  });
  nfcReader.addEventListener('click', focusCurrent);
  nfcTab.addEventListener('click', () => setMode('nfc'));
  codeTab.addEventListener('click', () => setMode('code'));
  document.querySelectorAll('[data-media]').forEach(button => button.addEventListener('click', () => window.mavion.media(button.dataset.media)));
  document.getElementById('overrideYes').addEventListener('click', () => window.mavion.emergencyOverride());
  document.getElementById('overrideNo').addEventListener('click', () => { emergency.hidden = true; focusCurrent(); });
  window.addEventListener('keydown', event => {
    if (event.key === 'F6') {
      event.preventDefault();
      emergency.hidden = false;
      return;
    }
    if (mode === 'nfc' && event.target !== nfcInput) {
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        nfcInput.value += event.key;
        nfcInput.dispatchEvent(new Event('input'));
      } else if (event.key === 'Enter' && nfcInput.value) {
        event.preventDefault();
        finishScan();
      }
    }
  });
  window.mavion.onResetLock(reset);
  window.mavion.onPlayLockAnimation(animate);
  updateClock(); setInterval(updateClock, 1000); reset();
})();
