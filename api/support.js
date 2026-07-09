// api/support.js — deliver Seehed "Get more help" escalations to the team via Resend.
// Set RESEND_API_KEY in the Vercel env to enable. Optional: SUPPORT_TO (inbox, default
// tagnz@tmc.gg) and SUPPORT_FROM (verified sender; default is Resend's shared test sender,
// which only delivers to your Resend account's own email — set a verified-domain address
// like "Seehed <support@tmc.gg>" for production).
//   GET  → { ok, ready }
//   POST { email, message } → { ok }   (visitor's email becomes the reply-to)

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const key = process.env.RESEND_API_KEY;
  const TO = process.env.SUPPORT_TO || 'tagnz@tmc.gg';
  const FROM = process.env.SUPPORT_FROM || 'Seehed CustomerSupport <onboarding@resend.dev>';

  if (req.method === 'GET') return res.end(JSON.stringify({ ok: true, ready: !!key }));
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'method_not_allowed' })); }
  if (!key) { res.statusCode = 501; return res.end(JSON.stringify({ error: 'not_configured' })); }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};

    const email = String(body.email || '').trim().slice(0, 200);
    const message = String(body.message || '').trim().slice(0, 4000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'bad_email' })); }
    if (!message) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'no_message' })); }

    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const resend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: 'Seehed support request — ' + email,
        text: 'From: ' + email + '\n\n' + message + '\n\n— sent via Seehed CustomerSupport (tmc.gg). Reply to this email to reach them.',
        html: '<p><strong>From:</strong> ' + esc(email) + '</p><p style="white-space:pre-wrap">' + esc(message) + '</p>'
          + '<hr><p style="color:#888;font-size:12px">Sent via Seehed CustomerSupport · tmc.gg — reply directly to reach them.</p>',
      }),
    });

    if (!resend.ok) {
      const detail = await resend.text().catch(() => '');
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'send_failed', status: resend.status, detail: detail.slice(0, 300) }));
    }
    return res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'server_error' }));
  }
};
