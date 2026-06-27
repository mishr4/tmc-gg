/* TMC Staff SSO — front-end gate (Supabase Auth).
   Usage:  StaffAuth.guard({ adminOnly:false, onReady(user){ ... } })

   Signs in with your existing Supabase project (Google OAuth + Google One Tap),
   then checks the signed-in email against the tmc_staff allowlist (enforced by RLS).
   Only authorised, non-disabled staff reach onReady(). Admin pages pass adminOnly:true.
   StaffAuth.client() returns the shared Supabase client for the admin console. */
(function () {
  const ACCENT = '#7C4DFF';
  const cfg = window.TMC_SUPABASE || {};
  let opts = {};
  let user = null;
  let supa = null;

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
      .sa-provider{width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(0,0,0,.14);background:#fff;color:#0a0a14;
        font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:10px;transition:background .15s,border-color .15s}
      .sa-provider:hover{background:#fafafa;border-color:rgba(0,0,0,.28)}
      .sa-provider svg{width:18px;height:18px;flex:none}
      .sa-google{display:flex;justify-content:center;min-height:42px;margin-bottom:10px}
      .sa-btn{width:100%;padding:13px;border:none;border-radius:12px;background:${ACCENT};color:#fff;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s}
      .sa-btn:hover{opacity:.9}
      .sa-err{font-size:13px;color:#E5484D;margin-top:14px;min-height:16px;font-weight:500}
      .sa-muted{font-size:12px;color:#999;margin-top:16px;word-break:break-all}
    `;
    document.head.appendChild(s);
  }

  function overlay() {
    let o = document.getElementById('sa-overlay');
    if (!o) { o = el('<div id="sa-overlay"></div>'); document.body.appendChild(o); }
    return o;
  }
  function logo() { return '<img src="/mavion-logo.png" alt="TMC" onerror="this.style.display=\'none\'">'; }

  function loadScript(src, id) {
    return new Promise((resolve, reject) => {
      let s = id && document.getElementById(id);
      if (s) { if (s.dataset.loaded) return resolve(); s.addEventListener('load', () => resolve()); s.addEventListener('error', reject); return; }
      s = document.createElement('script'); if (id) s.id = id; s.src = src; s.async = true;
      s.onload = () => { s.dataset.loaded = '1'; resolve(); }; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function client() {
    if (supa) return supa;
    if (!cfg.url || !cfg.anonKey || cfg.anonKey.indexOf('PASTE_') === 0) throw new Error('Supabase is not configured (edit supabase-config.js).');
    if (!(window.supabase && window.supabase.createClient)) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'supabase-js');
    supa = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return supa;
  }

  const GOOGLE_ICON = '<svg viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24c0-1.6-.1-3.1-.4-4.6H24v9h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7C42.6 36.7 45 30.9 45 24z"/><path fill="#34A853" d="M24 46c5.8 0 10.7-1.9 14.3-5.2l-7-5.5c-1.9 1.3-4.4 2.1-7.3 2.1-5.6 0-10.4-3.8-12.1-8.9H4.7v5.6C8.3 41.3 15.6 46 24 46z"/><path fill="#FBBC05" d="M11.9 28.5c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.6H4.7C3.2 17.6 2.4 20.7 2.4 24s.8 6.4 2.3 9.3l7.2-5.6z"/><path fill="#EA4335" d="M24 11.1c3.2 0 6 1.1 8.2 3.2l6.1-6.1C34.7 4.7 29.8 2.8 24 2.8 15.6 2.8 8.3 7.5 4.7 14.7l7.2 5.6C13.6 14.9 18.4 11.1 24 11.1z"/></svg>';

  function showLogin(msg) {
    injectStyles();
    const o = overlay(); o.classList.remove('hide');
    const googleBtn = cfg.googleClientId
      ? '<div class="sa-google" id="sa-google"></div>'
      : `<button class="sa-provider" id="sa-google-redirect">${GOOGLE_ICON}Continue with Google</button>`;
    o.innerHTML = `<div class="sa-card">
      ${logo()}
      <h2>Staff sign-in</h2>
      <p>Authorised staff only.</p>
      ${googleBtn}
      <div class="sa-err" id="sa-err">${msg || ''}</div>
    </div>`;
    const gr = document.getElementById('sa-google-redirect'); if (gr) gr.onclick = () => oauth('google');
    if (cfg.googleClientId) renderOneTap();
  }

  async function oauth(provider) {
    try {
      const c = await client();
      const { error } = await c.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } });
      if (error) { const e = document.getElementById('sa-err'); if (e) e.textContent = error.message; }
    } catch (err) { const e = document.getElementById('sa-err'); if (e) e.textContent = err.message; }
  }

  // Google One Tap → Supabase signInWithIdToken (with a hashed nonce).
  async function renderOneTap() {
    const host = document.getElementById('sa-google'); if (!host || !cfg.googleClientId) return;
    const rawNonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
    const hashedNonce = await sha256hex(rawNonce);
    async function onCred(resp) {
      const err = document.getElementById('sa-err'); if (err) err.textContent = '';
      try {
        const c = await client();
        const { error } = await c.auth.signInWithIdToken({ provider: 'google', token: resp.credential, nonce: rawNonce });
        if (error) { if (err) err.textContent = error.message; return; }
        check();
      } catch (e) { if (err) err.textContent = e.message; }
    }
    function init() {
      if (!(window.google && google.accounts && google.accounts.id)) return;
      try {
        google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: onCred, nonce: hashedNonce, use_fedcm_for_prompt: true, cancel_on_tap_outside: false });
        google.accounts.id.renderButton(host, { theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', shape: 'pill', width: 300 });
        google.accounts.id.prompt(); // One Tap
      } catch (e) {}
    }
    try { await loadScript('https://accounts.google.com/gsi/client', 'gis-script'); init(); } catch (e) {}
  }

  function b64url(bytes) { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  async function sha256hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function showDenied(email, roleProblem) {
    injectStyles();
    const o = overlay(); o.classList.remove('hide');
    o.innerHTML = `<div class="sa-card">${logo()}
      <h2>${roleProblem ? 'No access' : 'Not authorised'}</h2>
      <p>${roleProblem ? 'Your account doesn’t have permission for this area.' : 'This account isn’t on the staff list. Ask an admin to add it.'}</p>
      ${email ? `<div class="sa-muted">${email}</div>` : ''}
      <button class="sa-btn" style="margin-top:16px" onclick="StaffAuth.logout()">Sign out</button></div>`;
  }

  function done() {
    const o = document.getElementById('sa-overlay'); if (o) o.classList.add('hide');
    if (typeof opts.onReady === 'function') opts.onReady(user);
  }

  async function check() {
    injectStyles();
    let c;
    try { c = await client(); } catch (e) { return showLogin(e.message); }
    const { data: { session } } = await c.auth.getSession();
    if (!session) return showLogin();
    const email = (session.user && session.user.email) || '';
    // allowlist check (RLS returns only the caller's own row unless they're an admin)
    const { data: rows, error } = await c.from('tmc_staff').select('email,name,role,disabled').ilike('email', email).limit(1);
    if (error) return showLogin('Could not verify access: ' + error.message);
    const me = rows && rows[0];
    if (!me || me.disabled) { await c.auth.signOut(); return showDenied(email, false); }
    user = { email: me.email, name: me.name || (session.user.user_metadata && session.user.user_metadata.full_name) || me.email, role: me.role };
    if (opts.adminOnly && me.role !== 'admin') return showDenied(email, true);
    done();
  }

  window.StaffAuth = {
    guard(o) { opts = o || {}; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check(); },
    async logout() { try { const c = await client(); await c.auth.signOut(); } catch (e) {} location.reload(); },
    user() { return user; },
    async client() { return client(); }
  };
})();
