const BASE_URL = 'https://spotisaver.net';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ALLOWED_ORIGINS = ['https://cast.tmc.gg', 'https://tmc.gg', 'http://localhost:3000', 'http://localhost:5173'];

// --- Cookie jar (persists across warm invocations) ---

let cookieJar = {};

function getCookieString() {
  return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeCookies(res) {
  const headers = res.headers.getSetCookie?.() || [];
  for (const header of headers) {
    const [pair] = header.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) cookieJar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
}

// --- Spotisaver helpers ---

function encodeCtx(ctx) {
  const json = JSON.stringify(ctx);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseSpotifyUrl(input) {
  const m = input.match(/spotify\.com\/(playlist|track|album|artist|show|episode)\/([a-zA-Z0-9]+)/);
  if (m) return { type: m[1], id: m[2] };
  if (/^[a-zA-Z0-9]{22}$/.test(input)) return { type: 'track', id: input };
  return null;
}

function fmtDuration(ms) {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

async function ensureSession() {
  if (getCookieString()) return;
  const res = await fetch(`${BASE_URL}/en1`, { headers: { 'User-Agent': USER_AGENT } });
  await res.text();
  mergeCookies(res);
}

async function getSignature(action, context, retry = true) {
  await ensureSession();
  const params = new URLSearchParams({ action, ctx: encodeCtx(context) });
  const res = await fetch(`${BASE_URL}/api/get_signature.php?${params}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT, 'Referer': `${BASE_URL}/en1`, 'Cookie': getCookieString() },
  });
  mergeCookies(res);
  const data = await res.json();
  if (!data.success || !data.token) {
    if (retry) { cookieJar = {}; return getSignature(action, context, false); }
    throw new Error(data.error || 'signature_failed');
  }
  return { token: data.token, exp: data.exp };
}

async function fetchPlaylist(spotifyUrl) {
  const parsed = parseSpotifyUrl(spotifyUrl);
  if (!parsed) throw new Error('Invalid Spotify URL');
  const sig = await getSignature('get_playlist', { id: parsed.id, type: parsed.type, lang: 'en' });
  const params = new URLSearchParams({ id: parsed.id, type: parsed.type, lang: 'en' });
  const res = await fetch(`${BASE_URL}/api/get_playlist.php?${params}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT, 'Referer': `${BASE_URL}/en/${parsed.type}/${parsed.id}/`, 'Cookie': getCookieString(), 'X-PT': String(sig.token), 'X-PE': String(sig.exp) },
  });
  mergeCookies(res);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function downloadTrack(track) {
  const ctx = { lang: 'en' };
  if (track.id) ctx.id = String(track.id);
  if (track.name) ctx.name = String(track.name);
  if (track.duration_ms != null) ctx.duration_ms = String(Math.trunc(Number(track.duration_ms)));
  const sig = await getSignature('download_track', ctx);
  const sigParam = encodeCtx({ token: sig.token, exp: sig.exp });
  const res = await fetch(`${BASE_URL}/api/download_track.php?sig=${sigParam}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT, 'Referer': `${BASE_URL}/en/track/${track.id}/`, 'Cookie': getCookieString() },
    body: JSON.stringify({ track, download_dir: 'downloads', filename_tag: 'SPOTISAVER', user_ip: '0.0.0.0', is_premium: false, lang: 'en' }),
  });
  mergeCookies(res);
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || ct.includes('application/json')) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `download_failed_${res.status}`);
  }
  return { body: res.body, contentType: ct, filename: `${track.artists?.[0] || 'Unknown'} - ${track.name || 'track'}.mp3` };
}

// --- CORS ---

function cors(req, res) {
  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || '';
  const allowed = ALLOWED_ORIGINS.find(o => origin.startsWith(o));
  res.setHeader('Access-Control-Allow-Origin', allowed || ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// --- Handler (auth handled by CiryaSSO on cast.tmc.gg) ---

module.exports = async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url, 'http://localhost');
  const action = url.searchParams.get('action');

  try {
    if (action === 'lookup' || action === 'search') {
      const spotifyUrl = url.searchParams.get('url');
      if (!spotifyUrl) return res.status(400).json({ error: 'Missing ?url= parameter' });
      const data = await fetchPlaylist(spotifyUrl);
      return res.json({
        info: data.playlist_info || {},
        tracks: (data.tracks || []).map(t => ({
          id: t.id, name: t.name, artists: t.artists || [], album: t.album || '',
          duration_ms: t.duration_ms, duration: fmtDuration(t.duration_ms),
          cover: t.image?.url || '', spotify_url: t.external_url || '',
          release_date: t.release_date || '', explicit: t.explicit || false,
        })),
      });
    }

    if (action === 'raw') {
      const spotifyUrl = url.searchParams.get('url');
      if (!spotifyUrl) return res.status(400).json({ error: 'Missing ?url= parameter' });
      const data = await fetchPlaylist(spotifyUrl);
      return res.json(data);
    }

    if (action === 'download') {
      const trackId = url.searchParams.get('id');
      if (!trackId) return res.status(400).json({ error: 'Missing ?id= parameter' });
      const spotifyUrl = `https://open.spotify.com/track/${trackId}`;
      const data = await fetchPlaylist(spotifyUrl);
      const track = data.tracks?.[0];
      if (!track) return res.status(404).json({ error: 'Track not found' });
      const result = await downloadTrack(track);
      res.setHeader('Content-Type', result.contentType || 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      const reader = result.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      return res.end();
    }

    // Default: show usage
    return res.json({
      api: 'Spotisaver API — TMC Staff',
      actions: {
        'lookup': 'GET ?action=lookup&url={spotify_url} — clean metadata',
        'raw': 'GET ?action=raw&url={spotify_url} — raw Spotisaver response',
        'download': 'GET ?action=download&id={spotify_track_id} — download MP3',
      },
      example: '/api/spotisaver?action=lookup&url=https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    });
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: err.message }));
  }
}
