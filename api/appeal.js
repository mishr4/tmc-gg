// Forwards a ban appeal (from /appeal) to a Discord webhook in the staff channel.
// Set APPEAL_WEBHOOK_URL on Vercel (a webhook created in your #appeals channel).

function readRaw(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 4500000) req.destroy(); });
    req.on('end', () => resolve(d));
    req.on('error', () => resolve(''));
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const webhook = process.env.APPEAL_WEBHOOK_URL;
  if (!webhook) return res.status(503).json({ error: 'Appeals aren’t configured yet.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') { try { body = JSON.parse((await readRaw(req)) || '{}'); } catch { body = {}; } }

  // honeypot — bots fill hidden fields; pretend success without forwarding
  if (body.website) return res.status(200).json({ ok: true });

  const clean = (v, n) => (v == null ? '' : String(v).slice(0, n).trim());
  const username = clean(body.username, 100);
  const userId = clean(body.userId, 40);
  const reason = clean(body.reason, 300);
  const appeal = clean(body.appeal, 1800);
  if (!username || !appeal) return res.status(400).json({ error: 'Username and appeal are required.' });
  if (userId && !/^\d{5,25}$/.test(userId)) return res.status(400).json({ error: 'That Discord user ID doesn’t look right.' });

  // optional pre-rendered card image (data URL from the browser)
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

  try {
    let r;
    if (pngBuf) {
      embed.image = { url: 'attachment://appeal.png' };
      const fd = new FormData();
      fd.append('payload_json', JSON.stringify({ username: 'Mavion Appeals', embeds: [embed] }));
      fd.append('files[0]', new Blob([pngBuf], { type: 'image/png' }), 'appeal.png');
      r = await fetch(webhook, { method: 'POST', body: fd });
    } else {
      r = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'Mavion Appeals', embeds: [embed] }) });
    }
    if (!r.ok) return res.status(502).json({ error: 'Couldn’t submit right now. Try again later.' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'Couldn’t submit right now. Try again later.' });
  }
};
