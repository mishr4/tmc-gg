/**
 * RBSC Voting API
 * Handles performance uploads, voting, and results
 *
 * Demo implementation with in-memory storage
 * (would use database in production)
 */

// In-memory storage (replace with DB in production)
let performances = [
  {
    id: 'nl-001',
    country: 'Netherlands',
    artist: 'Joost Klein',
    song: 'EUROPAPA',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    votes: 234,
    uploadedAt: new Date().toISOString(),
    status: 'live'
  },
  {
    id: 'ch-001',
    country: 'Switzerland',
    artist: 'Nemo',
    song: 'The Code',
    videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    votes: 189,
    uploadedAt: new Date().toISOString(),
    status: 'live'
  },
  {
    id: 'se-001',
    country: 'Sweden',
    artist: 'Marcus & Martinus',
    song: 'Unforgettable',
    videoUrl: 'https://www.youtube.com/watch?v=jAckzxUXcPQ',
    votes: 156,
    uploadedAt: new Date().toISOString(),
    status: 'live'
  },
];

let votes = {
  'nl-001': 234,
  'ch-001': 189,
  'se-001': 156,
};

let votingConfig = {
  status: 'open',
  endTime: null,
  hostCountry: 'Switzerland',
  apiKey: null,
};

// Helper: validate admin request
function isAdmin(req) {
  const key = req.headers['x-rbsc-admin-key'] || req.query?.admin_key;
  return key === process.env.RBSC_ADMIN_KEY || key === 'demo-key-12345';
}

// GET /api/rbsc/performances - List all performances
export async function getPerformances(req, res) {
  try {
    return res.status(200).json(performances);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// POST /api/rbsc/upload - Upload new performance
export async function uploadPerformance(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { country, artist, song, videoUrl, description } = req.body;

    if (!country || !artist || !song || !videoUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `${country.toLowerCase().slice(0, 2)}-${Date.now()}`;
    const performance = {
      id,
      country,
      artist,
      song,
      videoUrl,
      description: description || '',
      votes: 0,
      uploadedAt: new Date().toISOString(),
      status: 'live'
    };

    performances.push(performance);
    votes[id] = 0;

    return res.status(201).json(performance);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// DELETE /api/rbsc/performances/:id - Delete performance
export async function deletePerformance(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { id } = req.query;
    const idx = performances.findIndex(p => p.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Performance not found' });
    }

    performances.splice(idx, 1);
    delete votes[id];

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// GET /api/rbsc/votes - Get vote counts
export async function getVotes(req, res) {
  try {
    return res.status(200).json(votes);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// POST /api/rbsc/vote - Submit a vote
export async function submitVote(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { country_id } = req.body;

    if (!country_id) {
      return res.status(400).json({ error: 'country_id required' });
    }

    // Check voting status
    if (votingConfig.status !== 'open') {
      return res.status(403).json({ error: 'Voting is not open' });
    }

    // Check if performance exists
    if (!votes.hasOwnProperty(country_id)) {
      return res.status(404).json({ error: 'Country not found' });
    }

    // Increment vote
    votes[country_id]++;
    const perf = performances.find(p => p.id === country_id);
    if (perf) perf.votes++;

    return res.status(200).json({
      ok: true,
      votes: votes[country_id],
      message: 'Vote recorded'
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// GET /api/rbsc/config - Get voting config
export async function getConfig(req, res) {
  try {
    return res.status(200).json(votingConfig);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// PUT /api/rbsc/config - Update voting config
export async function updateConfig(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { status, endTime, hostCountry, apiKey } = req.body;

    if (status) votingConfig.status = status;
    if (endTime) votingConfig.endTime = endTime;
    if (hostCountry) votingConfig.hostCountry = hostCountry;
    if (apiKey) votingConfig.apiKey = apiKey;

    return res.status(200).json(votingConfig);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// Main router
export default function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const path = pathname.replace('/api/rbsc', '');

  // Route handling
  if (path === '/performances' && req.method === 'GET') {
    return getPerformances(req, res);
  }
  if (path === '/upload' && req.method === 'POST') {
    return uploadPerformance(req, res);
  }
  if (path.match(/^\/performances\/[^/]+$/) && req.method === 'DELETE') {
    const id = path.split('/')[2];
    req.query.id = id;
    return deletePerformance(req, res);
  }
  if (path === '/votes' && req.method === 'GET') {
    return getVotes(req, res);
  }
  if (path === '/vote' && req.method === 'POST') {
    return submitVote(req, res);
  }
  if (path === '/config' && req.method === 'GET') {
    return getConfig(req, res);
  }
  if (path === '/config' && req.method === 'PUT') {
    return updateConfig(req, res);
  }

  return res.status(404).json({ error: 'Endpoint not found' });
}
