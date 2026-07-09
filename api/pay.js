// api/pay.js — TMC Pay: create Stripe Checkout sessions for invoices + fixed services.
// Set STRIPE_SECRET_KEY in the Vercel env to enable (sk_live_... or sk_test_...).
// Prices for catalog items live HERE (server-side) so the client can't tamper with them.
//   GET  → { ok, ready }   (ready = key set AND the Stripe account can actually charge)
//   POST { kind: "item", item: "<catalog id>", email? }            → { url }
//   POST { kind: "invoice", invoice, amount (USD cents), email? }  → { url }

const CATALOG = {
  'tmcast-hosting':         { name: 'TMCast Station Hosting — 1 Month', amount: 1000 },
  'tmcast-hosting-monthly': { name: 'TMCast Station Hosting', amount: 1000, interval: 'month' },
  'tmcast-setup':           { name: 'TMCast Station Setup & Onboarding', amount: 2500 },
  'ndc-deposit':            { name: 'NDC Project Deposit', amount: 5000 },
  'priority-pass':          { name: 'Priority Support Pass', amount: 500 },
};

const MIN_CENTS = 100;      // $1.00
const MAX_CENTS = 500000;   // $5,000.00

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const key = process.env.STRIPE_SECRET_KEY;

  if (req.method === 'GET') {
    if (!key) return res.end(JSON.stringify({ ok: true, ready: false }));
    try {
      const acct = await fetch('https://api.stripe.com/v1/account', {
        headers: { Authorization: 'Bearer ' + key },
      });
      const data = await acct.json().catch(() => ({}));
      return res.end(JSON.stringify({ ok: true, ready: acct.ok && !!data.charges_enabled }));
    } catch (e) {
      return res.end(JSON.stringify({ ok: true, ready: false }));
    }
  }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'method_not_allowed' })); }
  if (!key) { res.statusCode = 501; return res.end(JSON.stringify({ error: 'not_configured' })); }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};

    const email = String(body.email || '').trim().slice(0, 200);
    let name, amount, ref, interval = null;

    if (body.kind === 'item') {
      const item = CATALOG[String(body.item || '')];
      if (!item) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'unknown_item' })); }
      name = item.name; amount = item.amount; ref = String(body.item); interval = item.interval || null;
    } else if (body.kind === 'invoice') {
      ref = String(body.invoice || '').trim().slice(0, 60);
      amount = Math.round(Number(body.amount));
      if (!ref) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'no_invoice' })); }
      if (!Number.isFinite(amount) || amount < MIN_CENTS || amount > MAX_CENTS) {
        res.statusCode = 400; return res.end(JSON.stringify({ error: 'bad_amount' }));
      }
      name = 'TMC Invoice ' + ref;
    } else {
      res.statusCode = 400; return res.end(JSON.stringify({ error: 'bad_kind' }));
    }

    const form = new URLSearchParams();
    form.set('mode', interval ? 'subscription' : 'payment');
    form.set('success_url', 'https://tmc.gg/pay?status=success');
    form.set('cancel_url', 'https://tmc.gg/pay?status=canceled');
    form.set('line_items[0][price_data][currency]', 'usd');
    form.set('line_items[0][price_data][product_data][name]', name);
    form.set('line_items[0][price_data][unit_amount]', String(amount));
    form.set('line_items[0][quantity]', '1');
    form.set('metadata[ref]', ref);
    if (interval) {
      form.set('line_items[0][price_data][recurring][interval]', interval);
      // carry the ref onto the subscription itself so a future auth API can look it up
      form.set('subscription_data[metadata][ref]', ref);
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) form.set('customer_email', email);

    const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const data = await stripe.json().catch(() => ({}));
    if (!stripe.ok || !data.url) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'gateway_error', detail: (data.error && data.error.message || '').slice(0, 300) }));
    }
    return res.end(JSON.stringify({ url: data.url }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'server_error' }));
  }
};
