/*  Seehed CustomerSupport — a self-contained FAQ chat widget for tmc.gg.
 *  Injects its own styles + DOM; no dependencies. Add with:
 *    <script src="/seehed-support.js" defer></script>
 *  Canned FAQ (no server) with a "typing…" beat for a human feel.
 */
(function () {
  if (window.__seehedLoaded) return;
  window.__seehedLoaded = true;

  var AVATAR = '/seehedcustomer.png';

  // ── FAQ (answers are small HTML; links are real tmc.gg destinations) ──
  var FAQ = [
    { q: 'What is The Mavion Corporation?', k: ['what', 'tmc', 'mavion', 'company', 'who', 'about'],
      a: "The Mavion Corporation (TMC) is a California-based media &amp; technology company. We build and operate media brands, publishing platforms and broadcast technology — including Mavion News, TMCast and UnoNoticias. <a href=\"/about\">More about us →</a>" },
    { q: 'What brands do you operate?', k: ['brand', 'brands', 'companies', 'portfolio', 'subsidiaries', 'own'],
      a: "Our portfolio includes <b>Mavion News</b>, <b>TMCast</b> (radio), <b>UnoNoticias</b> and more. See them all at <a href=\"/companies\">tmc.gg/companies →</a>" },
    { q: 'How do I listen to TMCast radio?', k: ['listen', 'radio', 'tmcast', 'tune', 'stream', 'station'],
      a: "Tune in live at the <a href=\"https://cast.tmc.gg\" target=\"_blank\" rel=\"noopener\">TMCast portal</a>, or head to <a href=\"/radio\">tmc.gg/radio</a>." },
    { q: 'How do I contact support?', k: ['contact', 'support', 'help', 'email', 'reach', 'phone', 'call', 'human', 'person', 'agent'],
      a: "Email <a href=\"mailto:tagnz@tmc.gg\">tagnz@tmc.gg</a>, join our <a href=\"https://discord.gg/cirya\" target=\"_blank\" rel=\"noopener\">Discord</a>, or call <a href=\"tel:+12023500343,806\">+1 (202) 350-0343 ext. 806</a>. We usually reply within a day." },
    { q: 'Are you hiring?', k: ['hiring', 'job', 'jobs', 'career', 'careers', 'work', 'apply', 'role', 'roles'],
      a: "Often, yes — open roles are posted at <a href=\"/careers\">tmc.gg/careers →</a>" },
    { q: 'I need to appeal a decision.', k: ['appeal', 'ban', 'banned', 'suspend', 'suspended', 'dispute', 'blocked'],
      a: "Submit an appeal at <a href=\"/appeal\">tmc.gg/appeal →</a> and our team will review it." },
    { q: 'Partnerships & licensing', k: ['partner', 'partnership', 'license', 'licensing', 'ascap', 'music', 'sponsor'],
      a: "For partnerships, see <a href=\"/partners\">tmc.gg/partners</a>. For music / ASCAP licensing, visit <a href=\"https://mavion.tmc.gg/licensing\" target=\"_blank\" rel=\"noopener\">Mavion licensing →</a>." },
    { q: 'Where are you located?', k: ['where', 'located', 'location', 'office', 'address', 'headquarters'],
      a: "We're based in California, USA, and operate online worldwide." }
  ];

  // ── On-device AI (no API): WebLLM runs a small model in the browser via WebGPU. ──
  // Opt-in: nothing downloads until the visitor turns it on. Swap the model id for a
  // bigger/smaller one from WebLLM's prebuilt list. q4f16_1 0.5B ≈ ~500MB, cached after first load.
  var AI_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

  var SYSTEM_PROMPT = [
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
    "- Keep replies short: a direct answer plus at most one relevant link. When unsure, say: \"I'm not certain — the fastest way is to email tagnz@tmc.gg and a person will help.\""
  ].join('\n');

  var SUPPORT_EMAIL = 'tagnz@tmc.gg';
  // Optional Web3Forms access key → escalations land in the inbox directly (else falls back
  // to opening the visitor's mail app). Grab a free key at web3forms.com (enter tagnz@tmc.gg).
  var SUPPORT_FORM_KEY = '';
  // Optional server-side AI (Groq via the Vercel /api/seehed function — key stays secret,
  // no big download). Set GROQ_API_KEY in Vercel to enable; otherwise the widget falls back
  // to the in-browser model, then the canned FAQ.
  var AI_ENDPOINT = '/api/seehed';

  // ── Styles ──
  var css = ''
    + '#seehed-support,#seehed-support *{box-sizing:border-box}'
    + '#seehed-support{position:fixed;right:20px;bottom:20px;z-index:2147483000;'
    + 'font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}'
    + '#seehed-support a{color:#6ba0ff;text-decoration:none}'
    + '#seehed-support a:hover{text-decoration:underline}'

    /* launcher */
    + '.sh-launch{position:relative;width:60px;height:60px;border-radius:999px;border:1px solid rgba(255,255,255,.14);'
    + 'padding:0;cursor:pointer;background:#131419;box-shadow:0 10px 30px rgba(0,0,0,.5);overflow:visible;display:block}'
    + '.sh-launch img{width:100%;height:100%;border-radius:999px;object-fit:cover;display:block}'
    + '.sh-launch:hover{border-color:rgba(76,141,255,.6)}'
    + '.sh-launch:focus-visible{outline:2px solid #4c8dff;outline-offset:3px}'
    + '.sh-launch .sh-on{position:absolute;right:2px;bottom:2px;width:14px;height:14px;border-radius:999px;background:#3ecf8e;border:2.5px solid #08090b}'
    + '.sh-nudge{position:absolute;right:72px;bottom:14px;white-space:nowrap;background:#131419;color:#fafafa;'
    + 'border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:9px 14px;font-size:13.5px;font-weight:500;'
    + 'box-shadow:0 10px 30px rgba(0,0,0,.45);opacity:0;transform:translateX(8px);transition:.28s cubic-bezier(.16,1,.3,1);pointer-events:none}'
    + '.sh-nudge.show{opacity:1;transform:translateX(0)}'
    + '#seehed-support[data-open="true"] .sh-launch,#seehed-support[data-open="true"] .sh-nudge{display:none}'

    /* panel */
    + '.sh-panel{position:absolute;right:0;bottom:0;width:min(384px,calc(100vw - 32px));height:min(560px,calc(100vh - 96px));'
    + 'background:#0e0f12;border:1px solid rgba(255,255,255,.09);border-radius:20px;overflow:hidden;'
    + 'display:none;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.62);color:#fafafa}'
    + '#seehed-support[data-open="true"] .sh-panel{display:flex;animation:sh-in .26s cubic-bezier(.16,1,.3,1)}'
    + '@keyframes sh-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}'

    /* header */
    + '.sh-head{display:flex;align-items:center;gap:12px;padding:15px 16px;background:#131419;border-bottom:1px solid rgba(255,255,255,.07);flex:none}'
    + '.sh-head .sh-av{width:44px;height:44px;border-radius:999px;object-fit:cover;border:1px solid rgba(255,255,255,.14);flex:none}'
    + '.sh-id{flex:1;min-width:0}'
    + '.sh-name{font-size:16.5px;font-weight:800;letter-spacing:-.01em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.sh-status{font-size:12.5px;color:#9a9ca2;display:flex;align-items:center;gap:6px;margin-top:1px}'
    + '.sh-status .sh-live{width:7px;height:7px;border-radius:999px;background:#3ecf8e}'
    + '.sh-status.typing{color:#c9cbd2}'
    + '.sh-close{background:none;border:0;color:#9a9ca2;font-size:24px;line-height:1;cursor:pointer;padding:2px 4px;border-radius:8px}'
    + '.sh-close:hover{color:#fafafa}'
    + '.sh-close:focus-visible{outline:2px solid #4c8dff;outline-offset:2px}'

    /* log */
    + '.sh-log{flex:1;overflow-y:auto;padding:16px 14px 6px;display:flex;flex-direction:column;gap:12px;background:#08090b}'
    + '.sh-log::-webkit-scrollbar{width:8px}.sh-log::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:8px}'
    + '.sh-row{display:flex;gap:9px;align-items:flex-end;max-width:100%}'
    + '.sh-row.user{justify-content:flex-end}'
    + '.sh-row .sh-mav{width:26px;height:26px;border-radius:999px;object-fit:cover;flex:none;border:1px solid rgba(255,255,255,.12)}'
    + '.sh-bubble{font-size:14px;padding:10px 13px;border-radius:15px;max-width:255px;word-wrap:break-word}'
    + '.sh-row.bot .sh-bubble{background:#171921;color:#e6e7ea;border:1px solid rgba(255,255,255,.06);border-bottom-left-radius:5px}'
    + '.sh-row.user .sh-bubble{background:#254a8f;color:#fff;border-bottom-right-radius:5px}'
    + '.sh-bubble b{color:#fff;font-weight:600}'
    + '.sh-typing{display:inline-flex;gap:4px;align-items:center;padding:13px 14px}'
    + '.sh-typing span{width:6px;height:6px;border-radius:999px;background:#9a9ca2;animation:sh-b 1.2s infinite}'
    + '.sh-typing span:nth-child(2){animation-delay:.18s}.sh-typing span:nth-child(3){animation-delay:.36s}'
    + '@keyframes sh-b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'

    /* chips */
    + '.sh-chips{display:flex;flex-wrap:wrap;gap:7px;padding:10px 14px;border-top:1px solid rgba(255,255,255,.06);background:#0e0f12;flex:none;max-height:132px;overflow-y:auto}'
    + '.sh-chip{font:inherit;font-size:12.5px;color:#cdd0d8;background:#171921;border:1px solid rgba(255,255,255,.1);'
    + 'border-radius:999px;padding:7px 12px;cursor:pointer;text-align:left;transition:.14s}'
    + '.sh-chip:hover{border-color:#4c8dff;color:#fff}'
    + '.sh-chip:focus-visible{outline:2px solid #4c8dff;outline-offset:1px}'

    /* AI opt-in button (inside a bot bubble) */
    + '.sh-ai-load{font:inherit;font-size:12.5px;font-weight:600;color:#06122b;background:#4c8dff;border:0;border-radius:9px;padding:6px 12px;margin:6px 4px 2px 0;cursor:pointer}'
    + '.sh-ai-load:hover{background:#6ba0ff}.sh-ai-load[disabled]{opacity:.6;cursor:default}'
    + '.sh-ai-load:focus-visible{outline:2px solid #fafafa;outline-offset:2px}'

    /* "Get more help" chip + escalation email form */
    + '.sh-help-chip{border-color:rgba(76,141,255,.5);color:#8fb4ff}'
    + '.sh-help-chip:hover{background:#14203a;color:#cfe0ff;border-color:#4c8dff}'
    + '.sh-bubble.sh-form{max-width:288px;width:100%}'
    + '.sh-form-t{font-size:13px;color:#cdd0d8;margin-bottom:9px}'
    + '.sh-form input,.sh-form textarea{width:100%;background:#08090b;border:1px solid rgba(255,255,255,.12);border-radius:9px;color:#fafafa;font:inherit;font-size:13.5px;padding:8px 10px;margin-bottom:7px;outline:none;resize:vertical;display:block}'
    + '.sh-form input:focus,.sh-form textarea:focus{border-color:#4c8dff}'
    + '.sh-f-err{color:#ff6b5e;font-size:12px;margin:-2px 0 7px}'
    + '.sh-f-send{width:100%;background:#4c8dff;color:#06122b;border:0;border-radius:9px;font:inherit;font-weight:600;font-size:13.5px;padding:9px;cursor:pointer}'
    + '.sh-f-send:hover{background:#6ba0ff}.sh-f-send[disabled]{opacity:.6;cursor:default}'

    /* input */
    + '.sh-input{display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.06);background:#0e0f12;flex:none}'
    + '.sh-input input{flex:1;background:#08090b;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#fafafa;'
    + 'font:inherit;font-size:14px;padding:10px 14px;outline:none}'
    + '.sh-input input:focus{border-color:#4c8dff}'
    + '.sh-input button{width:40px;height:40px;flex:none;border-radius:999px;border:0;background:#4c8dff;color:#06122b;'
    + 'font-size:17px;font-weight:700;cursor:pointer}'
    + '.sh-input button:hover{background:#6ba0ff}'
    + '.sh-input button:focus-visible{outline:2px solid #fafafa;outline-offset:2px}'
    + '.sh-foot{text-align:center;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#5a5c63;padding:7px 0 9px;background:#0e0f12;flex:none}'

    + '@media(max-width:480px){#seehed-support{right:12px;bottom:12px}.sh-panel{width:calc(100vw - 24px);height:calc(100vh - 84px)}}'
    + '@media(prefers-reduced-motion:reduce){#seehed-support *{animation:none!important;transition:none!important}}';

  // ── Build DOM ──
  var root = document.createElement('div');
  root.id = 'seehed-support';
  root.setAttribute('data-open', 'false');
  root.innerHTML =
    '<span class="sh-nudge" id="sh-nudge">Need a hand? Chat with us.</span>'
    + '<button class="sh-launch" id="sh-launch" aria-label="Open Seehed CustomerSupport">'
    + '<img src="' + AVATAR + '" alt=""><span class="sh-on"></span></button>'
    + '<div class="sh-panel" role="dialog" aria-label="Seehed CustomerSupport">'
    + '<div class="sh-head">'
    + '<img class="sh-av" src="' + AVATAR + '" alt="">'
    + '<div class="sh-id"><div class="sh-name">Seehed CustomerSupport</div>'
    + '<div class="sh-status" id="sh-status"><span class="sh-live"></span>Online</div></div>'
    + '<button class="sh-close" id="sh-close" aria-label="Close support">×</button></div>'
    + '<div class="sh-log" id="sh-log" role="log" aria-live="polite"></div>'
    + '<div class="sh-chips" id="sh-chips"></div>'
    + '<form class="sh-input" id="sh-form"><input id="sh-in" type="text" placeholder="Ask a question…" autocomplete="off" aria-label="Ask a question"><button type="submit" aria-label="Send">→</button></form>'
    + '<div class="sh-foot">Seehed CustomerSupport · TMC</div>'
    + '</div>';

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    document.body.appendChild(root);
    wire();
  }

  function wire() {
    var log = root.querySelector('#sh-log');
    var chips = root.querySelector('#sh-chips');
    var status = root.querySelector('#sh-status');
    var launch = root.querySelector('#sh-launch');
    var nudge = root.querySelector('#sh-nudge');
    var greeted = false;

    function scrollDown() { log.scrollTop = log.scrollHeight; }
    function setStatus(t) {
      if (t === 'typing') { status.className = 'sh-status typing'; status.innerHTML = 'is typing….'; }
      else { status.className = 'sh-status'; status.innerHTML = '<span class="sh-live"></span>Online'; }
    }
    function row(kind, inner) {
      var r = document.createElement('div');
      r.className = 'sh-row ' + kind;
      r.innerHTML = (kind === 'bot' ? '<img class="sh-mav" src="' + AVATAR + '" alt="">' : '') + inner;
      log.appendChild(r); scrollDown(); return r;
    }
    function userMsg(text) { row('user', '<div class="sh-bubble"></div>').querySelector('.sh-bubble').textContent = text; }
    function botMsg(html) { var r = row('bot', '<div class="sh-bubble"></div>'); r.querySelector('.sh-bubble').innerHTML = html; }

    function botSay(html) {
      setStatus('typing');
      var typing = row('bot', '<div class="sh-bubble sh-typing"><span></span><span></span><span></span></div>');
      var delay = 650 + Math.min(String(html).length * 7, 950);
      setTimeout(function () {
        typing.remove();
        botMsg(html);
        setStatus('online');
      }, delay);
    }

    function renderChips() {
      chips.innerHTML = '';
      FAQ.forEach(function (f) {
        var b = document.createElement('button');
        b.className = 'sh-chip'; b.type = 'button'; b.textContent = f.q;
        b.addEventListener('click', function () { ask(f); });
        chips.appendChild(b);
      });
      var help = document.createElement('button');
      help.className = 'sh-chip sh-help-chip'; help.type = 'button'; help.textContent = 'Get more help';
      help.addEventListener('click', function () { userMsg('I need more help'); escalate(''); });
      chips.appendChild(help);
    }
    function ask(f) { userMsg(f.q); botSay(f.a); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function match(text) {
      var t = text.toLowerCase(), best = null, score = 0;
      FAQ.forEach(function (f) {
        var s = 0; f.k.forEach(function (k) { if (t.indexOf(k) !== -1) s++; });
        if (s > score) { score = s; best = f; }
      });
      return score ? best : null;
    }

    function open() {
      root.setAttribute('data-open', 'true');
      nudge.classList.remove('show');
      probeHosted();
      if (!greeted) {
        greeted = true;
        botSay("Hi — I'm <b>Seehed CustomerSupport</b>, TMC's support assistant. Pick a question below, or type your own.");
        renderChips();
      }
      setTimeout(function () { root.querySelector('#sh-in').focus(); }, 60);
    }
    function close() { root.setAttribute('data-open', 'false'); launch.focus(); }

    launch.addEventListener('click', open);
    root.querySelector('#sh-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.getAttribute('data-open') === 'true') close(); });

    // ── On-device AI (WebLLM, no API) — opt-in, WebGPU only, graceful fallback ──
    var ai = { status: (window.isSecureContext && navigator.gpu) ? 'idle' : 'unsupported', engine: null, history: [] };

    function loadAI() {
      ai.status = 'loading';
      setStatus('typing');
      var r = row('bot', '<div class="sh-bubble"></div>').querySelector('.sh-bubble');
      r.innerHTML = 'Waking up — loading a small model into your browser (one-time, runs privately). <b>0%</b>';
      return import('https://esm.run/@mlc-ai/web-llm').then(function (webllm) {
        return webllm.CreateMLCEngine(AI_MODEL, { initProgressCallback: function (p) {
          r.innerHTML = 'Waking up — loading a small model into your browser (one-time, runs privately). <b>' + Math.round((p.progress || 0) * 100) + '%</b>';
          scrollDown();
        }});
      }).then(function (engine) {
        ai.engine = engine; ai.status = 'ready';
        r.textContent = 'Ready — ask me anything about TMC.';
        setStatus('online'); return true;
      }).catch(function () {
        ai.status = 'error';
        r.innerHTML = "I couldn't load the on-device AI here (it needs a WebGPU browser). I can still help — try a question below, or email <a href=\"mailto:tagnz@tmc.gg\">tagnz@tmc.gg</a>.";
        setStatus('online'); return false;
      });
    }

    async function aiAnswer(text) {
      ai.history.push({ role: 'user', content: text });
      if (ai.history.length > 8) ai.history = ai.history.slice(-8);
      setStatus('typing');
      var typing = row('bot', '<div class="sh-bubble sh-typing"><span></span><span></span><span></span></div>');
      var bubble = null, acc = '';
      try {
        var stream = await ai.engine.chat.completions.create({
          messages: [{ role: 'system', content: SYSTEM_PROMPT }].concat(ai.history),
          temperature: 0.3, max_tokens: 320, stream: true
        });
        for await (var chunk of stream) {
          var d = (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) ? (chunk.choices[0].delta.content || '') : '';
          if (d) { acc += d; if (!bubble) { typing.remove(); bubble = row('bot', '<div class="sh-bubble"></div>').querySelector('.sh-bubble'); } bubble.textContent = acc; scrollDown(); }
        }
        if (bubble) ai.history.push({ role: 'assistant', content: acc });
        else { typing.remove(); botMsg('Sorry — could you rephrase that?'); }
        setStatus('online');
      } catch (err) {
        if (typing && typing.parentNode) typing.remove();
        botMsg("Sorry — I hit a snag. Email <a href=\"mailto:tagnz@tmc.gg\">tagnz@tmc.gg</a> and a person will help.");
        setStatus('online');
      }
    }

    function offerAI(pending) {
      var r = row('bot', '<div class="sh-bubble"></div>').querySelector('.sh-bubble');
      r.innerHTML = 'I can answer that with on-device AI — it loads a small model once and runs privately in your browser, no servers. <button class="sh-ai-load" type="button">Turn on SeehedAI</button>&nbsp;or just <a href="mailto:tagnz@tmc.gg">email support</a>.';
      r.querySelector('.sh-ai-load').addEventListener('click', function () {
        this.disabled = true; this.textContent = 'Loading…';
        loadAI().then(function (ok) { if (ok) aiAnswer(pending); });
      });
    }

    // ── Server-side AI (Groq via /api/seehed) — preferred: light + fast, key stays secret ──
    var hosted = { ready: false, checked: false, history: [] };
    function probeHosted() {
      if (hosted.checked) return;
      hosted.checked = true;
      fetch(AI_ENDPOINT, { method: 'GET' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { hosted.ready = !!(d && d.ready); })
        .catch(function () { hosted.ready = false; });
    }
    function hostedAI(text) {
      hosted.history.push({ role: 'user', content: text });
      if (hosted.history.length > 8) hosted.history = hosted.history.slice(-8);
      setStatus('typing');
      var typing = row('bot', '<div class="sh-bubble sh-typing"><span></span><span></span><span></span></div>');
      fetch(AI_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: hosted.history }) })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (d) {
          typing.remove(); setStatus('online');
          if (d && d.reply) { row('bot', '<div class="sh-bubble"></div>').querySelector('.sh-bubble').textContent = d.reply; hosted.history.push({ role: 'assistant', content: d.reply }); }
          else faqFallback(text);
        })
        .catch(function () { typing.remove(); setStatus('online'); hosted.ready = false; if (ai.status === 'idle') offerAI(text); else faqFallback(text); });
    }

    function faqFallback(text) {
      var f = match(text);
      if (f) return botSay(f.a);
      botSay("I'm not sure about that one — tap <b>Get more help</b> below to reach a person, or email <a href=\"mailto:tagnz@tmc.gg\">tagnz@tmc.gg</a>.");
    }

    // ── Escalation: validated email + message → delivered to the team (Web3Forms or mailto) ──
    function escalate(prefill) {
      setStatus('online');
      var wrap = row('bot', '<div class="sh-bubble sh-form"></div>').querySelector('.sh-bubble');
      wrap.innerHTML =
        '<div class="sh-form-t">Send it to our team — we\'ll email you back.</div>'
        + '<input class="sh-f-email" type="email" placeholder="Your email" autocomplete="email">'
        + '<textarea class="sh-f-msg" rows="3" placeholder="What do you need help with?"></textarea>'
        + '<div class="sh-f-err" hidden></div>'
        + '<button class="sh-f-send" type="button">Send to support</button>';
      var email = wrap.querySelector('.sh-f-email'), msg = wrap.querySelector('.sh-f-msg'),
          err = wrap.querySelector('.sh-f-err'), send = wrap.querySelector('.sh-f-send');
      if (prefill) msg.value = prefill;
      setTimeout(function () { email.focus(); }, 40);
      send.addEventListener('click', function () {
        var e = email.value.trim(), m = msg.value.trim();
        err.hidden = true;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { err.textContent = 'Please enter a valid email address.'; err.hidden = false; email.focus(); return; }
        if (!m) { err.textContent = 'Add a short message so we know how to help.'; err.hidden = false; msg.focus(); return; }
        send.disabled = true; send.textContent = 'Sending…';
        sendSupport(e, m).then(function (ok) {
          wrap.innerHTML = ok
            ? "Thanks — your message is on its way to our team. We'll reply to <b>" + esc(e) + "</b>."
            : "Opening your email app to send it. If nothing happened, email <a href=\"mailto:" + SUPPORT_EMAIL + "\">" + SUPPORT_EMAIL + "</a> directly.";
          scrollDown();
        });
      });
    }
    function sendSupport(email, message) {
      var subject = 'Seehed support request — ' + email;
      if (SUPPORT_FORM_KEY) {
        return fetch('https://api.web3forms.com/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ access_key: SUPPORT_FORM_KEY, subject: subject, from_name: 'Seehed CustomerSupport', email: email, message: message })
        }).then(function (r) { return r.ok; }).catch(function () { return false; });
      }
      var href = 'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent('Reply to: ' + email + '\n\n' + message);
      try { window.location.href = href; } catch (e2) {}
      return Promise.resolve(false);
    }

    function handleQuery(text) {
      if (ai.status === 'ready') return aiAnswer(text);            // in-browser model already loaded
      if (ai.status === 'loading') return botSay('One sec — still loading the model, then ask me again.');
      if (hosted.ready) return hostedAI(text);                     // server AI (Groq) — light + fast
      if (ai.status === 'idle') return offerAI(text);              // offer the in-browser model
      return faqFallback(text);                                    // no AI available → FAQ + escalation
    }

    root.querySelector('#sh-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = root.querySelector('#sh-in'), text = inp.value.trim();
      if (!text) return;
      inp.value = '';
      userMsg(text);
      handleQuery(text);
    });

    // gentle nudge a few seconds after load (once per session)
    try {
      if (!sessionStorage.getItem('sh-nudged')) {
        setTimeout(function () {
          if (root.getAttribute('data-open') !== 'true') { nudge.classList.add('show'); sessionStorage.setItem('sh-nudged', '1'); }
        }, 3500);
        setTimeout(function () { nudge.classList.remove('show'); }, 11000);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
