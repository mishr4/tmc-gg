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
    '<span class="sh-nudge" id="sh-nudge">Need a hand? Ask Seehed.</span>'
    + '<button class="sh-launch" id="sh-launch" aria-label="Open Seehed customer support">'
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
    }
    function ask(f) { userMsg(f.q); botSay(f.a); }

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
      if (!greeted) {
        greeted = true;
        botSay("Hi — I'm <b>Seehed</b>, TMC's support assistant. Pick a question below, or type your own.");
        renderChips();
      }
      setTimeout(function () { root.querySelector('#sh-in').focus(); }, 60);
    }
    function close() { root.setAttribute('data-open', 'false'); launch.focus(); }

    launch.addEventListener('click', open);
    root.querySelector('#sh-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.getAttribute('data-open') === 'true') close(); });

    root.querySelector('#sh-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = root.querySelector('#sh-in'), text = inp.value.trim();
      if (!text) return;
      inp.value = '';
      userMsg(text);
      var f = match(text);
      if (f) botSay(f.a);
      else botSay("I'm not sure about that one — try a question below, or email <a href=\"mailto:tagnz@tmc.gg\">tagnz@tmc.gg</a> and a person will help.");
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
