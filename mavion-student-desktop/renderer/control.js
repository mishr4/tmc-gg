(() => {
  const $ = id => document.getElementById(id);
  const idle = $('idleEnabled');
  const startup = $('startupEnabled');
  const dialog = $('enrollDialog');
  let cards = [];
  let enrolling = false;
  let scanBuffer = '';
  let scanTimer;
  let scannedCard = '';

  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const maskCard = value => value.length > 6 ? value.slice(0, 3) + '••••' + value.slice(-3) : '••••••';
  const renderCards = () => {
    $('cardList').innerHTML = cards.length ? cards.map(card => `<article class="card-item"><span class="card-mark">${escapeHtml(card.name.slice(0, 1).toUpperCase())}</span><div><b>${escapeHtml(card.name)}</b><small>${escapeHtml(maskCard(card.id))}</small></div><button type="button" data-remove-card="${escapeHtml(card.id)}">Remove</button></article>`).join('') : '<p class="empty-cards">No cards enrolled.</p>';
  };
  const refreshReader = async () => {
    $('readerState').className = 'reader-state checking';
    $('readerState').innerHTML = '<i></i> Checking reader';
    const config = await window.mavion.getNfcConfig();
    cards = config.cards || [];
    renderCards();
    const reader = config.reader || {};
    $('readerDetail').textContent = reader.detail || reader.model || 'Reader status unavailable';
    $('readerState').className = 'reader-state ' + (reader.connected ? 'connected' : 'disconnected');
    $('readerState').innerHTML = `<i></i> ${reader.connected ? 'Connected' : 'Not detected'}`;
  };
  const stopEnroll = () => {
    enrolling = false;
    scanBuffer = '';
    scannedCard = '';
    clearTimeout(scanTimer);
    dialog.hidden = true;
  };
  const startEnroll = () => {
    enrolling = true;
    scanBuffer = '';
    scannedCard = '';
    $('enrollWave').className = 'enroll-wave listening';
    $('enrollTitle').textContent = 'Tap a card';
    $('enrollText').textContent = 'Hold the badge near your Imprivata reader.';
    $('enrollForm').hidden = true;
    $('enrollError').hidden = true;
    $('profileName').value = '';
    dialog.hidden = false;
  };
  const finishScan = () => {
    clearTimeout(scanTimer);
    const value = scanBuffer.replace(/\s+/g, '').toUpperCase();
    scanBuffer = '';
    if (!value) return;
    scannedCard = value;
    $('enrollWave').className = 'enroll-wave read';
    $('enrollTitle').textContent = 'Card detected';
    $('enrollText').textContent = 'Choose the name shown when this card unlocks.';
    $('enrollForm').hidden = false;
    $('profileName').focus();
  };

  const activate = () => window.mavion.activateLock();
  $('lockDesktop').addEventListener('click', activate);
  $('headerLock').addEventListener('click', activate);
  $('testNotification').addEventListener('click', () => window.mavion.showNotification());
  $('testInactivity').addEventListener('click', () => window.mavion.showInactivity());
  idle.addEventListener('change', () => window.mavion.setIdleLock(idle.checked));
  startup.addEventListener('change', () => window.mavion.setStartup(startup.checked));
  $('refreshReader').addEventListener('click', refreshReader);
  $('enrollCard').addEventListener('click', startEnroll);
  $('closeEnroll').addEventListener('click', stopEnroll);
  $('enrollForm').addEventListener('submit', async event => {
    event.preventDefault();
    const name = $('profileName').value.trim();
    if (!name || !scannedCard) return;
    const result = await window.mavion.saveNfcCard({ id: scannedCard, name });
    if (!result.ok) {
      $('enrollError').textContent = 'This card could not be saved.';
      $('enrollError').hidden = false;
      return;
    }
    cards = result.cards;
    renderCards();
    stopEnroll();
  });
  $('cardList').addEventListener('click', async event => {
    const button = event.target.closest('[data-remove-card]');
    if (!button || !confirm('Remove this unlock card?')) return;
    const result = await window.mavion.removeNfcCard(button.dataset.removeCard);
    cards = result.cards;
    renderCards();
  });
  window.addEventListener('keydown', event => {
    if (!enrolling || !$('enrollForm').hidden) return;
    if (event.key === 'Escape') return stopEnroll();
    if (event.key === 'Enter' && scanBuffer) {
      event.preventDefault();
      return finishScan();
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      scanBuffer += event.key;
      clearTimeout(scanTimer);
      scanTimer = setTimeout(finishScan, 350);
    }
  });
  window.mavion.getStartup().then(value => startup.checked = value);
  window.mavion.getIdleLock().then(value => idle.checked = value);
  document.querySelectorAll('.nav').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.nav,.page').forEach(element => element.classList.remove('active'));
    button.classList.add('active');
    $(button.dataset.page).classList.add('active');
  }));
  refreshReader();
})();
