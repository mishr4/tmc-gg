/* TMC Staff SSO — front-end gate.
   Usage:  StaffAuth.guard({ adminOnly:false, onReady(user){ ... } })
   Renders a login / forced-password-change overlay over the page, talks to /api/auth,
   and only calls onReady() once the user is authenticated (and an admin, if adminOnly).
   Session is a HttpOnly cookie set by the API; nothing sensitive is stored in JS. */
(function () {
  const ACCENT = '#7C4DFF';
  let opts = {};
  let user = null;
  let googleClientId = null;
  let configLoaded = false;

  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  function injectStyles() {
    if (document.getElementById('sa-styles')) return;
    const s = document.createElement('style'); s.id = 'sa-styles';
    s.textContent = `
      #sa-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;
        background:linear-gradient(90deg,#fef6f0,#fdf2fd);font-family:'Instrument Sans','Inter',system-ui,sans-serif}
      #sa-overlay.hide{display:none}
      .sa-card{background:#fff;border-radius:18px;box-shadow:0 12px 50px -20px rgba(0,0,0,.25);border:1px solid rgba(0,0,0,.06);
        width:100%;max-width:380px;padding:32px 30px;text-align:center}
      .sa-card img{height:30px;width:auto;margin:0 auto 18px;display:block}
      .sa-card h2{font-family:'Lexend',sans-serif;font-size:21px;font-weight:700;color:#0a0a14;margin-bottom:4px}
      .sa-card p{font-size:13px;color:#777;margin-bottom:22px}
      .sa-field{text-align:left;margin-bottom:14px}
      .sa-field label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;margin-bottom:6px}
      .sa-field input{width:100%;padding:12px 14px;border:1px solid rgba(0,0,0,.12);border-radius:11px;font-size:14px;font-family:inherit;color:#0a0a14;outline:none;transition:border-color .15s,box-shadow .15s}
      .sa-field input:focus{border-color:${ACCENT};box-shadow:0 0 0 3px rgba(124,77,255,.12)}
      .sa-btn{width:100%;padding:13px;border:none;border-radius:12px;background:${ACCENT};color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s}
      .sa-btn:hover{opacity:.9} .sa-btn:disabled{opacity:.55;cursor:progress}
      .sa-err{font-size:13px;color:#E5484D;margin-top:14px;min-height:16px;font-weight:500}
      .sa-note{font-size:12px;color:#999;margin-top:16px}
      .sa-hint{font-size:12px;color:#0a9d6c;background:rgba(16,185,129,.1);border-radius:8px;padding:8px 10px;margin-bottom:16px;text-align:left}
      .sa-or{display:flex;align-items:center;gap:10px;margin:18px 0;color:#bbb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
      .sa-or::before,.sa-or::after{content:'';flex:1;height:1px;background:rgba(0,0,0,.1)}
      .sa-google{display:flex;justify-content:center;min-height:42px}
    `;
    document.head.appendChild(s);
  }

  function overlay() {
    let o = document.getElementById('sa-overlay');
    if (!o) { o = el('<div id="sa-overlay"></div>'); document.body.appendChild(o); }
    return o;
  }
  function logo() { return '<img src="/mavion-logo.png" alt="TMC" onerror="this.style.display=\'none\'">'; }

  async function api(path, body) {
    const r = await fetch('/api/auth' + path, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    let data = {}; try { data = await r.json(); } catch {}
    return { status: r.status, data };
  }

  function showLogin(msg) {
    injectStyles();
    const o = overlay(); o.classList.remove('hide');
    o.innerHTML = `<form class="sa-card" id="sa-login">
      ${logo()}
      <h2>Staff sign-in</h2>
      <p>Authorised staff only. Use the email an admin added.</p>
      ${googleClientId ? '<div class="sa-google" id="sa-google"></div><div class="sa-or">or</div>' : ''}
      <div class="sa-field"><label>Email</label><input type="email" id="sa-email" autocomplete="username" required></div>
      <div class="sa-field"><label>Password</label><input type="password" id="sa-password" autocomplete="current-password" required></div>
      <button class="sa-btn" type="submit">Sign in</button>
      <div class="sa-err" id="sa-err">${msg || ''}</div>
    </form>`;
    if (googleClientId) renderGoogle();
    const f = document.getElementById('sa-login');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = f.querySelector('.sa-btn'); const err = document.getElementById('sa-err');
      btn.disabled = true; err.textContent = '';
      const { status, data } = await api('/login', { email: document.getElementById('sa-email').value, password: document.getElementById('sa-password').value });
      btn.disabled = false;
      if (status === 200 && data.ok) { if (data.mustChange) return showChange('Set a new password to finish signing in.'); return done(); }
      err.textContent = data.error || 'Sign-in failed.';
    });
  }

  function showChange(msg) {
    injectStyles();
    const o = overlay(); o.classList.remove('hide');
    o.innerHTML = `<form class="sa-card" id="sa-change">
      ${logo()}
      <h2>Set a new password</h2>
      <p>First-time sign-in — choose a password to continue.</p>
      ${msg ? `<div class="sa-hint">${msg}</div>` : ''}
      <div class="sa-field"><label>New password</label><input type="password" id="sa-new" autocomplete="new-password" minlength="8" required></div>
      <div class="sa-field"><label>Confirm password</label><input type="password" id="sa-new2" autocomplete="new-password" minlength="8" required></div>
      <button class="sa-btn" type="submit">Save &amp; continue</button>
      <div class="sa-err" id="sa-err"></div>
    </form>`;
    const f = document.getElementById('sa-change');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('sa-err');
      const p1 = document.getElementById('sa-new').value, p2 = document.getElementById('sa-new2').value;
      if (p1.length < 8) { err.textContent = 'Password must be at least 8 characters.'; return; }
      if (p1 !== p2) { err.textContent = 'Passwords do not match.'; return; }
      const btn = f.querySelector('.sa-btn'); btn.disabled = true; err.textContent = '';
      const { status, data } = await api('/change-password', { newPassword: p1 });
      btn.disabled = false;
      if (status === 200 && data.ok) return done();
      err.textContent = data.error || 'Could not set password.';
    });
  }

  function showDenied() {
    injectStyles();
    const o = overlay(); o.classList.remove('hide');
    o.innerHTML = `<div class="sa-card">${logo()}<h2>No access</h2>
      <p>Your account doesn’t have permission for this area.</p>
      <button class="sa-btn" onclick="StaffAuth.logout()">Sign out</button></div>`;
  }

  function done() {
    const o = document.getElementById('sa-overlay'); if (o) o.classList.add('hide');
    if (typeof opts.onReady === 'function') opts.onReady(user);
  }

  async function loadConfig() {
    if (configLoaded) return; configLoaded = true;
    try { const { data } = await api('/config'); googleClientId = data.googleClientId || null; } catch {}
  }

  async function check() {
    await loadConfig();
    const { data } = await api('/me');
    if (!data.authenticated) return showLogin();
    if (data.mustChange) return showChange();
    user = data;
    if (opts.adminOnly && data.role !== 'admin') return showDenied();
    done();
  }

  function renderGoogle() {
    const host = document.getElementById('sa-google');
    if (!host || !googleClientId) return;
    function init() {
      if (!(window.google && google.accounts && google.accounts.id)) return;
      try {
        google.accounts.id.initialize({ client_id: googleClientId, callback: onGoogleCred, auto_select: false, cancel_on_tap_outside: false, use_fedcm_for_prompt: true });
        google.accounts.id.renderButton(host, { theme: 'outline', size: 'large', type: 'standard', text: 'signin_with', shape: 'pill', width: 300 });
        google.accounts.id.prompt(); // Google One Tap
      } catch (e) {}
    }
    if (window.google && window.google.accounts) return init();
    let s = document.getElementById('gis-script');
    if (s) { s.addEventListener('load', init); return; }
    s = document.createElement('script'); s.id = 'gis-script'; s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true; s.onload = init;
    document.head.appendChild(s);
  }
  async function onGoogleCred(resp) {
    const err = document.getElementById('sa-err'); if (err) err.textContent = '';
    const { status, data } = await api('/google', { credential: resp.credential });
    if (status === 200 && data.ok) return done();
    if (err) err.textContent = data.error || 'Google sign-in failed.';
  }

  window.StaffAuth = {
    guard(o) { opts = o || {}; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check(); },
    async logout() { try { await api('/logout', {}); } catch {} location.reload(); },
    user() { return user; }
  };
})();
