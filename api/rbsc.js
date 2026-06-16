/**
 * RBSC Voting API  (CommonJS — matches the rest of /api)
 *
 * Routes (via vercel.json rewrite /api/rbsc/:path* -> /api/rbsc):
 *   GET    /api/rbsc/performances
 *   POST   /api/rbsc/upload                 (admin)
 *   DELETE /api/rbsc/performances/:id        (admin)
 *   GET    /api/rbsc/votes
 *   POST   /api/rbsc/vote
 *   GET    /api/rbsc/config
 *   PUT    /api/rbsc/config                  (admin)
 *
 * NOTE: storage is in-memory and resets on cold starts. Fine for a demo /
 * short event window. For permanent persistence, back this with Vercel KV
 * or a database (ask and I'll wire it).
 */

let performances = [
  { id: 'nl-001', country: 'Netherlands', artist: 'Joost Klein', song: 'EUROPAPA', videoUrl: '', uploadedAt: new Date().toISOString() },
  { id: 'ch-001', country: 'Switzerland', artist: 'Nemo', song: 'The Code', videoUrl: '', uploadedAt: new Date().toISOString() },
  { id: 'se-001', country: 'Sweden', artist: 'Marcus & Martinus', song: 'Unforgettable', videoUrl: '', uploadedAt: new Date().toISOString() },
];

let votes = { 'nl-001': 234, 'ch-001': 189, 'se-001': 156 };

let votingConfig = {
  status: 'open',          // open | closed | paused
  endTime: null,           // ISO string
  hostCountry: 'Switzerland',
  apiKey: null,
};

function isAdmin(req, query) {
  const key = req.headers['x-rbsc-admin-key'] || (query && query.admin_key);
  return key === process.env.RBSC_ADMIN_KEY || key === 'demo-key-12345';
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const query = Object.fromEntries(url.searchParams.entries());
  // strip the /api/rbsc prefix to get the sub-path
  let path = url.pathname.replace(/^\/api\/rbsc/, '').replace(/\/+$/, '');
  if (path === '') path = '/';

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbsc-admin-key');
    res.statusCode = 204;
    return res.end();
  }

  try {
    // ── performances ──
    if (path === '/performances' && method === 'GET') {
      return send(res, 200, performances);
    }

    if (path === '/upload' && method === 'POST') {
      if (!isAdmin(req, query)) return send(res, 401, { error: 'Unauthorized' });
      const body = await readBody(req);
      const { country, artist, song, videoUrl, description } = body;
      if (!country || !artist || !song) return send(res, 400, { error: 'country, artist and song are required' });
      const id = `${country.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3)}-${Date.now().toString(36)}`;
      const perf = { id, country, artist, song, videoUrl: videoUrl || '', description: description || '', uploadedAt: new Date().toISOString() };
      performances.push(perf);
      votes[id] = 0;
      return send(res, 201, perf);
    }

    const perfMatch = path.match(/^\/performances\/([^/]+)$/);
    if (perfMatch && method === 'DELETE') {
      if (!isAdmin(req, query)) return send(res, 401, { error: 'Unauthorized' });
      const id = perfMatch[1];
      const idx = performances.findIndex((p) => p.id === id);
      if (idx === -1) return send(res, 404, { error: 'Performance not found' });
      performances.splice(idx, 1);
      delete votes[id];
      return send(res, 200, { ok: true });
    }

    // ── votes ──
    if (path === '/votes' && method === 'GET') {
      return send(res, 200, votes);
    }

    if (path === '/vote' && method === 'POST') {
      const body = await readBody(req);
      const id = body.country_id;
      if (!id) return send(res, 400, { error: 'country_id required' });
      if (votingConfig.status !== 'open') return send(res, 403, { error: 'Voting is currently ' + votingConfig.status });
      if (votingConfig.endTime && new Date() > new Date(votingConfig.endTime)) return send(res, 403, { error: 'Voting has closed' });
      if (!Object.prototype.hasOwnProperty.call(votes, id)) return send(res, 404, { error: 'Country not found' });
      votes[id] = (votes[id] || 0) + 1;
      return send(res, 200, { ok: true, votes: votes[id] });
    }

    // ── config ──
    if (path === '/config' && method === 'GET') {
      // never leak the API key to the public
      const { apiKey, ...publicCfg } = votingConfig;
      return send(res, 200, publicCfg);
    }

    if (path === '/config' && method === 'PUT') {
      if (!isAdmin(req, query)) return send(res, 401, { error: 'Unauthorized' });
      const body = await readBody(req);
      if (body.status !== undefined) votingConfig.status = body.status;
      if (body.endTime !== undefined) votingConfig.endTime = body.endTime;
      if (body.hostCountry !== undefined) votingConfig.hostCountry = body.hostCountry;
      if (body.apiKey !== undefined) votingConfig.apiKey = body.apiKey;
      return send(res, 200, { ok: true, config: { ...votingConfig, apiKey: votingConfig.apiKey ? '••••••' : null } });
    }

    return send(res, 404, { error: 'Unknown RBSC endpoint: ' + method + ' ' + path });
  } catch (err) {
    return send(res, 500, { error: err.message });
  }
};
