// api/seehed.js — server-side brain for Seehed CustomerSupport.
// Uses Groq (free, fast) so there's no big in-browser download and the key stays secret.
// Set GROQ_API_KEY in the Vercel project env to enable.
//   GET  → { ok, ready }           (widget checks readiness)
//   POST { messages:[{role,content}] } → { reply }
// Same-origin only (the widget calls /api/seehed on tmc.gg), so no CORS needed.

const MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = [
  "You are Seehed CustomerSupport, the AI support assistant for The Mavion Corporation (TMC) — a California-based media & technology company, on the website tmc.gg.",
  "Answer visitor questions about TMC and its services helpfully and briefly: 1–3 short sentences, warm and professional, plain-spoken, no emoji.",
  "",
  "About TMC: an independent media & technology company that builds and operates media brands, publishing platforms and broadcast technology. Main brands: Mavion News (journalism), TMCast (internet radio), UnoNoticias (Spanish-language news). Based in California, USA; operates online worldwide.",
  "",
  "Facts you may use (do not invent any others — no prices, dates, URLs, phone numbers or policies beyond these):",
  "- Support / contact: email tagnz@tmc.gg, Discord discord.gg/cirya, phone +1 (202) 350-0343 ext. 806. The team usually replies within a day.",
  "- Listen to TMCast: cast.tmc.gg, or tmc.gg/radio.",
  "- Careers: tmc.gg/careers.  Appeal a ban or decision: tmc.gg/appeal.",
  "- Partnerships: tmc.gg/partners.  Music / ASCAP licensing: mavion.tmc.gg/licensing.",
  "- Brands overview: tmc.gg/companies.  About us: tmc.gg/about.",
  "",
  "Rules:",
  "- Only discuss TMC and its services. If asked anything off-topic (general knowledge, coding, personal questions, other companies), politely decline and say you can only help with TMC.",
  "- Never invent facts. If you don't know, say so plainly.",
  "- For anything account-specific, private, legal, billing, press, or that needs a human, don't guess — tell them to email tagnz@tmc.gg or use the Discord.",
  "- You cannot change accounts, take payments, or access a user's data — never claim to.",
  "- Keep replies short: a direct answer plus at most one relevant link."
].join('\n');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const key = process.env.GROQ_API_KEY;

  if (req.method === 'GET') return res.end(JSON.stringify({ ok: true, ready: !!key }));
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'method_not_allowed' })); }
  if (!key) { res.statusCode = 501; return res.end(JSON.stringify({ error: 'not_configured' })); }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};

    const msgs = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-8)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1500) }));

    if (!msgs.length) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'no_message' })); }

    const groq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 320,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }].concat(msgs),
      }),
    });

    if (!groq.ok) { res.statusCode = 502; return res.end(JSON.stringify({ error: 'upstream_' + groq.status })); }
    const data = await groq.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '').trim()
      : '';
    return res.end(JSON.stringify({ reply: reply || "I'm not certain — the fastest way is to email tagnz@tmc.gg and a person will help." }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'server_error' }));
  }
};
