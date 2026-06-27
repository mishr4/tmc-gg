/**
 * TMC Staff SSO  (CommonJS — Neon Postgres)
 *
 * Routes (via vercel.json rewrite /api/auth/:path* -> /api/auth):
 *   POST /api/auth/login            { email, password }            -> sets session cookie; { mustChange? }
 *   POST /api/auth/change-password  { newPassword }                (change-scope or full cookie)
 *   GET  /api/auth/me                                              -> { authenticated, email, role, mustChange }
 *   POST /api/auth/logout
 *   POST /api/auth/admin            { action, ... }                (admin cookie)  | action 'bootstrap' uses SETUP_KEY
 *       actions: list_users | add_user | reset_password | set_disabled | remove_user | list_audit | bootstrap
 *
 * Storage: Neon Postgres via DATABASE_URL. No self-registration: only admin-added emails can log in.
 * Passwords: scrypt (salted) — temp passwords are hashed too; the plaintext temp is returned to the admin ONCE.
 * Sessions: HMAC-signed cookie (HttpOnly, Secure, SameSite=Lax). Disabling a user blocks access immediately
 * because every protected call re-checks the row.
 *
 * Required env: DATABASE_URL (Neon), AUTH_SECRET (long random string), SETUP_KEY (one-time bootstrap secret).
 * Optional env: TEMP_PASSWORD_TTL_HOURS (default 72).
 */
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL_UNPOOLED;
const AUTH_SECRET = process.env.AUTH_SECRET || '';
const SETUP_KEY = process.env.SETUP_KEY || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const OWNER_EMAIL = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
const TEMP_TTL_HOURS = parseInt(process.env.TEMP_PASSWORD_TTL_HOURS || '72', 10);
const SESSION_HOURS = 8;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

const sql = DB_URL ? neon(DB_URL) : null;

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await sql`CREATE TABLE IF NOT EXISTS staff_users (
    id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, role TEXT NOT NULL DEFAULT 'staff',
    password_hash TEXT, must_change BOOLEAN NOT NULL DEFAULT TRUE, temp_expires TIMESTAMPTZ,
    disabled BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_login TIMESTAMPTZ)`;
  await sql`CREATE TABLE IF NOT EXISTS staff_audit (
    id SERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now(), actor TEXT, action TEXT NOT NULL, target TEXT, ip TEXT, detail TEXT)`;
  await sql`CREATE TABLE IF NOT EXISTS staff_attempts (
    k TEXT PRIMARY KEY, count INT NOT NULL DEFAULT 0, first_at TIMESTAMPTZ NOT NULL DEFAULT now(), locked_until TIMESTAMPTZ)`;
  schemaReady = true;
}

// ── helpers ──
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(pw), salt, 64);
  return `scrypt$${salt.toString('hex')}$${dk.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  try {
    const [alg, saltHex, hashHex] = String(stored || '').split('$');
    if (alg !== 'scrypt') return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const dk = crypto.scryptSync(String(pw), salt, expected.length);
    return expected.length === dk.length && crypto.timingSafeEqual(dk, expected);
  } catch { return false; }
}
function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function signToken(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', AUTH_SECRET).update(body).digest());
  return `${body}.${sig}`;
}
function verifyTokenStr(token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const exp = b64url(crypto.createHmac('sha256', AUTH_SECRET).update(body).digest());
    const a = Buffer.from(sig), b = Buffer.from(exp);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}
function genTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(14); let s = '';
  for (let i = 0; i < 14; i++) s += chars[bytes[i] % chars.length];
  return s;
}
function normEmail(e) { return String(e || '').trim().toLowerCase(); }
function getIp(req) { return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'; }
function getCookie(req, name) {
  const c = req.headers.cookie || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function setSessionCookie(res, token, hours) {
  const maxAge = Math.round(hours * 3600);
  res.setHeader('Set-Cookie', `tmc_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `tmc_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}
function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let d = ''; req.on('data', (c) => { d += c; }); req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } }); req.on('error', () => resolve({}));
  });
}
function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
async function audit(actor, action, target, ip, detail) {
  try { await sql`INSERT INTO staff_audit (actor, action, target, ip, detail) VALUES (${actor || 'system'}, ${action}, ${target || null}, ${ip || null}, ${detail || null})`; } catch {}
}
// resolve the caller from the session cookie; re-checks the DB row (so disable is instant)
async function currentUser(req, requireScope) {
  const tok = verifyTokenStr(getCookie(req, 'tmc_session'));
  if (!tok || !tok.email) return null;
  if (requireScope && tok.scope !== requireScope) return null;
  const rows = await sql`SELECT email, name, role, must_change, disabled FROM staff_users WHERE email = ${tok.email}`;
  const u = rows[0];
  if (!u || u.disabled) return null;
  return { ...u, scope: tok.scope };
}

module.exports = async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (!sql) return send(res, 500, { error: 'Auth storage not configured (set DATABASE_URL).' });
  if (!AUTH_SECRET) return send(res, 500, { error: 'Auth not configured (set AUTH_SECRET).' });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let path = url.pathname.replace(/^\/api\/auth/, '').replace(/\/+$/, '') || '/';
  const ip = getIp(req);

  try {
    await ensureSchema();

    // ── GET /me ──
    if (path === '/me' && method === 'GET') {
      const u = await currentUser(req);
      if (!u) return send(res, 200, { authenticated: false });
      return send(res, 200, { authenticated: true, email: u.email, name: u.name, role: u.role, mustChange: !!u.must_change });
    }

    // ── GET /config (public: which sign-in methods are available) ──
    if (path === '/config' && method === 'GET') {
      return send(res, 200, { googleClientId: GOOGLE_CLIENT_ID || null });
    }

    // ── POST /logout ──
    if (path === '/logout' && method === 'POST') { clearSessionCookie(res); return send(res, 200, { ok: true }); }

    // ── POST /login ──
    if (path === '/login' && method === 'POST') {
      const { email: rawEmail, password } = await readBody(req);
      const email = normEmail(rawEmail);
      if (!email || !password) return send(res, 400, { error: 'Email and password are required.' });
      const key = `${ip}|${email}`;

      const ar = await sql`SELECT count, locked_until FROM staff_attempts WHERE k = ${key}`;
      if (ar[0] && ar[0].locked_until && new Date(ar[0].locked_until) > new Date()) {
        await audit(email, 'login_locked', email, ip, null);
        return send(res, 429, { error: 'Too many attempts. Try again later.' });
      }

      const rows = await sql`SELECT email, role, password_hash, must_change, temp_expires, disabled FROM staff_users WHERE email = ${email}`;
      const u = rows[0];
      const ok = u && !u.disabled && verifyPassword(password, u.password_hash);

      if (!ok) {
        // record failed attempt + maybe lock
        const cnt = (ar[0] ? ar[0].count : 0) + 1;
        const locked = cnt >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null;
        await sql`INSERT INTO staff_attempts (k, count, locked_until) VALUES (${key}, ${cnt}, ${locked})
                  ON CONFLICT (k) DO UPDATE SET count = ${cnt}, locked_until = ${locked}`;
        await audit(email, 'login_fail', email, ip, null);
        return send(res, 401, { error: 'Invalid email or password.' });
      }

      // temp password expired?
      if (u.must_change && u.temp_expires && new Date(u.temp_expires) < new Date()) {
        await audit(email, 'login_temp_expired', email, ip, null);
        return send(res, 403, { error: 'Your temporary password has expired. Ask an admin to reset it.' });
      }

      await sql`DELETE FROM staff_attempts WHERE k = ${key}`;
      await sql`UPDATE staff_users SET last_login = now() WHERE email = ${email}`;
      await audit(email, u.must_change ? 'login_success_temp' : 'login_success', email, ip, null);

      if (u.must_change) {
        const token = signToken({ email, role: u.role, scope: 'change', exp: Date.now() + 30 * 60000 });
        setSessionCookie(res, token, 0.5);
        return send(res, 200, { ok: true, mustChange: true });
      }
      const token = signToken({ email, role: u.role, scope: 'full', exp: Date.now() + SESSION_HOURS * 3600000 });
      setSessionCookie(res, token, SESSION_HOURS);
      return send(res, 200, { ok: true, mustChange: false, role: u.role });
    }

    // ── POST /google (Sign in with Google — gated to OWNER_EMAIL + approved staff) ──
    if (path === '/google' && method === 'POST') {
      const { credential } = await readBody(req);
      if (!credential) return send(res, 400, { error: 'Missing Google credential.' });

      // verify the ID token with Google (validates signature + expiry; returns claims)
      let info;
      try {
        const gr = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
        if (!gr.ok) throw new Error('bad token');
        info = await gr.json();
      } catch { await audit(null, 'google_fail', null, ip, null); return send(res, 401, { error: 'Google sign-in failed. Try again.' }); }

      if (GOOGLE_CLIENT_ID && info.aud !== GOOGLE_CLIENT_ID) return send(res, 401, { error: 'Google sign-in is not allowed for this app.' });
      const verified = info.email_verified === true || info.email_verified === 'true';
      const email = normEmail(info.email);
      if (!email || !verified) return send(res, 401, { error: 'Your Google email is not verified.' });

      // rate-limit Google attempts per ip+email too (defends against a flood of denied accounts)
      const gkey = `g|${ip}|${email}`;
      const gar = await sql`SELECT count, locked_until FROM staff_attempts WHERE k = ${gkey}`;
      if (gar[0] && gar[0].locked_until && new Date(gar[0].locked_until) > new Date()) {
        return send(res, 429, { error: 'Too many attempts. Try again later.' });
      }

      let role;
      if (OWNER_EMAIL && email === OWNER_EMAIL) {
        // the owner is always allowed and is (re)provisioned as admin
        await sql`INSERT INTO staff_users (email, name, role, must_change, password_hash)
                  VALUES (${email}, ${info.name || 'Owner'}, 'admin', FALSE, NULL)
                  ON CONFLICT (email) DO UPDATE SET role = 'admin', disabled = FALSE`;
        role = 'admin';
      } else {
        const rows = await sql`SELECT role, disabled FROM staff_users WHERE email = ${email}`;
        if (!rows[0] || rows[0].disabled) {
          const cnt = (gar[0] ? gar[0].count : 0) + 1;
          const locked = cnt >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null;
          await sql`INSERT INTO staff_attempts (k, count, locked_until) VALUES (${gkey}, ${cnt}, ${locked})
                    ON CONFLICT (k) DO UPDATE SET count = ${cnt}, locked_until = ${locked}`;
          await audit(email, 'google_denied', email, ip, null);
          return send(res, 403, { error: 'This Google account isn’t authorised. Ask an admin to add it.' });
        }
        role = rows[0].role;
      }

      await sql`DELETE FROM staff_attempts WHERE k = ${gkey}`;
      await sql`UPDATE staff_users SET last_login = now() WHERE email = ${email}`;
      await audit(email, 'login_google', email, ip, null);
      const token = signToken({ email, role, scope: 'full', exp: Date.now() + SESSION_HOURS * 3600000 });
      setSessionCookie(res, token, SESSION_HOURS);
      return send(res, 200, { ok: true, role });
    }

    // ── POST /change-password (first-login forced change, or voluntary) ──
    if (path === '/change-password' && method === 'POST') {
      const tok = verifyTokenStr(getCookie(req, 'tmc_session'));
      if (!tok || !tok.email) return send(res, 401, { error: 'Not signed in.' });
      const { newPassword } = await readBody(req);
      if (!newPassword || String(newPassword).length < 8) return send(res, 400, { error: 'Password must be at least 8 characters.' });
      const rows = await sql`SELECT email, role, disabled FROM staff_users WHERE email = ${tok.email}`;
      const u = rows[0];
      if (!u || u.disabled) return send(res, 401, { error: 'Account unavailable.' });
      await sql`UPDATE staff_users SET password_hash = ${hashPassword(newPassword)}, must_change = FALSE, temp_expires = NULL WHERE email = ${u.email}`;
      await audit(u.email, 'password_changed', u.email, ip, null);
      const token = signToken({ email: u.email, role: u.role, scope: 'full', exp: Date.now() + SESSION_HOURS * 3600000 });
      setSessionCookie(res, token, SESSION_HOURS);
      return send(res, 200, { ok: true, role: u.role });
    }

    // ── POST /admin ──
    if (path === '/admin' && method === 'POST') {
      const body = await readBody(req);
      const action = body.action;

      // bootstrap the first admin (only when no admin exists yet) using SETUP_KEY
      if (action === 'bootstrap') {
        if (!SETUP_KEY || body.key !== SETUP_KEY) return send(res, 403, { error: 'Forbidden.' });
        const existing = await sql`SELECT count(*)::int AS n FROM staff_users WHERE role = 'admin'`;
        if (existing[0].n > 0) return send(res, 409, { error: 'Already bootstrapped.' });
        const email = normEmail(body.email);
        if (!email || !body.password || String(body.password).length < 8) return send(res, 400, { error: 'email and password (8+) required.' });
        await sql`INSERT INTO staff_users (email, name, role, password_hash, must_change)
                  VALUES (${email}, ${body.name || 'Administrator'}, 'admin', ${hashPassword(body.password)}, FALSE)
                  ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = ${hashPassword(body.password)}, must_change = FALSE, disabled = FALSE`;
        await audit(email, 'bootstrap_admin', email, ip, null);
        return send(res, 200, { ok: true });
      }

      // all other admin actions require an admin session
      const admin = await currentUser(req, 'full');
      if (!admin || admin.role !== 'admin') return send(res, 403, { error: 'Admin access required.' });

      if (action === 'list_users') {
        const users = await sql`SELECT email, name, role, must_change, disabled, created_at, last_login FROM staff_users ORDER BY created_at DESC`;
        return send(res, 200, { users });
      }
      if (action === 'list_audit') {
        const limit = Math.min(parseInt(body.limit || 50, 10), 200);
        const logs = await sql`SELECT at, actor, action, target, ip, detail FROM staff_audit ORDER BY at DESC LIMIT ${limit}`;
        return send(res, 200, { logs });
      }
      if (action === 'add_user') {
        const email = normEmail(body.email);
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 400, { error: 'Valid email required.' });
        const exists = await sql`SELECT 1 FROM staff_users WHERE email = ${email}`;
        if (exists[0]) return send(res, 409, { error: 'That user already exists.' });
        const temp = genTempPassword();
        const role = body.role === 'admin' ? 'admin' : 'staff';
        const exp = new Date(Date.now() + TEMP_TTL_HOURS * 3600000).toISOString();
        await sql`INSERT INTO staff_users (email, name, role, password_hash, must_change, temp_expires)
                  VALUES (${email}, ${body.name || null}, ${role}, ${hashPassword(temp)}, TRUE, ${exp})`;
        await audit(admin.email, 'user_added', email, ip, `role=${role}`);
        return send(res, 200, { ok: true, email, tempPassword: temp, expiresHours: TEMP_TTL_HOURS });
      }
      if (action === 'reset_password') {
        const email = normEmail(body.email);
        const exists = await sql`SELECT 1 FROM staff_users WHERE email = ${email}`;
        if (!exists[0]) return send(res, 404, { error: 'User not found.' });
        const temp = genTempPassword();
        const exp = new Date(Date.now() + TEMP_TTL_HOURS * 3600000).toISOString();
        await sql`UPDATE staff_users SET password_hash = ${hashPassword(temp)}, must_change = TRUE, temp_expires = ${exp} WHERE email = ${email}`;
        await audit(admin.email, 'password_reset', email, ip, null);
        return send(res, 200, { ok: true, email, tempPassword: temp, expiresHours: TEMP_TTL_HOURS });
      }
      if (action === 'set_disabled') {
        const email = normEmail(body.email);
        if (email === admin.email) return send(res, 400, { error: 'You cannot disable your own account.' });
        await sql`UPDATE staff_users SET disabled = ${!!body.disabled} WHERE email = ${email}`;
        await audit(admin.email, body.disabled ? 'user_disabled' : 'user_enabled', email, ip, null);
        return send(res, 200, { ok: true });
      }
      if (action === 'remove_user') {
        const email = normEmail(body.email);
        if (email === admin.email) return send(res, 400, { error: 'You cannot remove your own account.' });
        await sql`DELETE FROM staff_users WHERE email = ${email}`;
        await audit(admin.email, 'user_removed', email, ip, null);
        return send(res, 200, { ok: true });
      }
      return send(res, 400, { error: 'Unknown admin action.' });
    }

    return send(res, 404, { error: 'Unknown auth endpoint: ' + method + ' ' + path });
  } catch (err) {
    return send(res, 500, { error: 'Server error: ' + (err && err.message) });
  }
};
