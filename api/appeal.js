// Delivers a ban appeal (from /appeal) to staff — by DM (preferred) and/or a webhook.
// Env on Vercel:
//   DISCORD_TOKEN       — your bot token (needed to DM staff)
//   APPEAL_DM_USER_IDS  — comma-separated staff Discord user IDs to DM (e.g. your own ID)
//   APPEAL_WEBHOOK_URL  — (optional) a webhook in a staff channel
// At least one of {DISCORD_TOKEN + APPEAL_DM_USER_IDS} or {APPEAL_WEBHOOK_URL} must be set.

const API = 'https://discord.com/api/v10';

function readRaw(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 4500000) req.destroy(); });
    req.on('end', () => resolve(d));
    req.on('error', () => resolve(''));
  });
}

async function send(url, headers, payloadJson, pngBuf) {
  if (pngBuf) {
    const fd = new FormData();
    fd.append('payload_json', JSON.stringify(payloadJson));
    fd.append('files[0]', new Blob([pngBuf], { type: 'image/png' }), 'appeal.png');
    return fetch(url, { method: 'POST', headers, body: fd });
  }
  return fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payloadJson) });
}

async function dmUser(token, userId, payloadJson, pngBuf) {
  const ch = await fetch(`${API}/users/@me/channels`, {
    method: 'POST', headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: userId })
  });
  if (!ch.ok) return false;
  const dm = await ch.json();
  const r = await send(`${API}/channels/${dm.id}/messages`, { Authorization: `Bot ${token}` }, payloadJson, pngBuf);
  return r.ok;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const token = process.env.DISCORD_TOKEN;
  const dmIds = (process.env.APPEAL_DM_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const webhook = process.env.APPEAL_WEBHOOK_URL;
  if (!webhook && !(token && dmIds.length)) return res.status(503).json({ error: 'Appeals aren’t configured yet.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') { try { body = JSON.parse((await readRaw(req)) || '{}'); } catch { body = {}; } }

  if (body.website) return res.status(200).json({ ok: true }); // honeypot

  const clean = (v, n) => (v == null ? '' : String(v).slice(0, n).trim());
  const username = clean(body.username, 100);
  const userId = clean(body.userId, 40);
  const reason = clean(body.reason, 300);
  const appeal = clean(body.appeal, 1800);
  if (!username || !appeal) return res.status(400).json({ error: 'Username and appeal are required.' });
  if (userId && !/^\d{5,25}$/.test(userId)) return res.status(400).json({ error: 'That Discord user ID doesn’t look right.' });

  let pngBuf = null;
  const img = typeof body.image === 'string' ? body.image : '';
  if (img.startsWith('data:image/png;base64,')) {
    try { const b = Buffer.from(img.slice(img.indexOf(',') + 1), 'base64'); if (b.length > 0 && b.length < 6000000) pngBuf = b; } catch (e) {}
  }

  const embed = {
    title: '📩 New Ban Appeal',
    color: 0x7c4dff,
    fields: [
      { name: 'Discord', value: username + (userId ? `  (\`${userId}\`)` : ''), inline: false },
      { name: 'Stated ban reason', value: reason || '—', inline: false },
      { name: 'Appeal', value: appeal, inline: false }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Mavion appeals · tmc.gg/appeal' }
  };
  if (pngBuf) embed.image = { url: 'attachment://appeal.png' };

  let delivered = false;
  if (token && dmIds.length) {
    for (const id of dmIds) {
      try { if (await dmUser(token, id, { embeds: [embed] }, pngBuf)) delivered = true; } catch (e) {}
    }
  }
  if (webhook) {
    try {
      const r = await send(webhook, {}, { username: 'Mavion Appeals', embeds: [embed] }, pngBuf);
      if (r.ok) delivered = true;
    } catch (e) {}
  }

  if (!delivered) return res.status(502).json({ error: 'Couldn’t submit right now. Try again later.' });
  return res.status(200).json({ ok: true });
};
