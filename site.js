/* TMC public site — small, dependency-free progressive enhancement.
   FAQ uses native <details>; page transitions use the View Transitions
   API where supported, with a CSS entrance fallback elsewhere. */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');

  /* Sticky header: add shadow/solidity once scrolled */
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 8) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Nav menu — hamburger-driven full-screen overlay on every viewport */
  var toggle = document.querySelector('.nav-toggle');
  if (header && toggle) {
    // swap between a hamburger and a clean X icon (reliable across browsers,
    // unlike rotating individual SVG lines) — injected so page markup stays as-is
    toggle.innerHTML =
      '<svg class="ico-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
      + '<svg class="ico-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
    var navMenu = header.querySelector('.nav-menu');
    // enrich the overlay with quick actions + contact (markup stays minimal per page)
    if (navMenu && !navMenu.querySelector('.menu-foot')) {
      var foot = document.createElement('div');
      foot.className = 'menu-foot';
      foot.innerHTML = '<a class="mf-pay" href="/pay">Pay online <span aria-hidden="true">→</span></a>'
        + '<div class="mf-links"><a href="/developers">Developers</a>'
        + '<a href="https://cast.tmc.gg" target="_blank" rel="noopener">TMCast portal</a>'
        + '<a href="mailto:tagnz@tmc.gg">tagnz@tmc.gg</a></div>';
      navMenu.appendChild(foot);
    }
    var setNav = function (open) {
      header.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('menu-open', open);
    };
    toggle.addEventListener('click', function () {
      setNav(!header.classList.contains('open'));
    });
    header.querySelectorAll('.nav-menu a').forEach(function (a) {
      a.addEventListener('click', function () { setNav(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('open')) { setNav(false); toggle.focus(); }
    });
  }

  /* Dropdown menus — hover/focus handled in CSS; this adds click + keyboard
     for touch and accessibility. */
  document.querySelectorAll('.nav-item').forEach(function (item) {
    var trigger = item.querySelector('.nav-trigger');
    var menu = item.querySelector('.nav-dropdown');
    if (!trigger || !menu) return;
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    var setOpen = function (open) {
      menu.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(!menu.classList.contains('open'));
    });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setOpen(false); trigger.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!item.contains(e.target)) setOpen(false);
    });
  });

  /* Mark the current nav link */
  var path = location.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (path === '') path = '/';
  document.querySelectorAll('.nav-menu > a[href]').forEach(function (a) {
    var href = a.getAttribute('href').replace(/\.html$/, '');
    if (href === path && href !== '/') a.setAttribute('aria-current', 'page');
    if (href === '/' && path === '/') a.setAttribute('aria-current', 'page');
  });

  /* Page entrance (fallback for browsers without cross-document VT) */
  if (!('startViewTransition' in document) && document.querySelector('main')) {
    document.querySelector('main').classList.add('page-enter');
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto';

  /* Scroll reveal — respects reduced-motion */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* Pointer-reactive depth for the homepage product surfaces. */
  function wireDepthSurface(surface, strength) {
    if (!surface || reduce || !window.matchMedia('(pointer: fine)').matches) return;
    surface.addEventListener('pointermove', function (e) {
      var box = surface.getBoundingClientRect();
      var px = (e.clientX - box.left) / box.width;
      var py = (e.clientY - box.top) / box.height;
      surface.style.setProperty('--tilt-x', ((.5 - py) * strength).toFixed(2) + 'deg');
      surface.style.setProperty('--tilt-y', ((px - .5) * strength).toFixed(2) + 'deg');
      surface.style.setProperty('--mouse-x', (px * 100).toFixed(1) + '%');
      surface.style.setProperty('--mouse-y', (py * 100).toFixed(1) + '%');
    });
    surface.addEventListener('pointerleave', function () {
      surface.style.setProperty('--tilt-x', '0deg');
      surface.style.setProperty('--tilt-y', '0deg');
      surface.style.setProperty('--mouse-x', '50%');
      surface.style.setProperty('--mouse-y', '50%');
    });
  }
  wireDepthSurface(document.querySelector('.hero-product'), 7);
  wireDepthSurface(document.querySelector('.app-workbench'), 2.6);

  var globeScene = document.querySelector('[data-globe-scene]');
  var globe = globeScene ? globeScene.querySelector('.globe') : null;
  if (globeScene && globe && !reduce && window.matchMedia('(pointer: fine)').matches) {
    globeScene.addEventListener('pointermove', function (e) {
      var box = globeScene.getBoundingClientRect();
      var x = ((e.clientX - box.left) / box.width - .5) * 2;
      var y = ((e.clientY - box.top) / box.height - .5) * 2;
      globe.style.setProperty('--globe-rx', (-8 - y * 10).toFixed(2) + 'deg');
      globe.style.setProperty('--globe-ry', (x * 18).toFixed(2) + 'deg');
      globeScene.style.setProperty('--card-x', (x * 11).toFixed(1) + 'px');
      globeScene.style.setProperty('--card-x-neg', (-x * 11).toFixed(1) + 'px');
      globeScene.style.setProperty('--card-y', (y * 9).toFixed(1) + 'px');
      globeScene.style.setProperty('--card-y-neg', (-y * 9).toFixed(1) + 'px');
    });
    globeScene.addEventListener('pointerleave', function () {
      globe.style.setProperty('--globe-rx', '-8deg');
      globe.style.setProperty('--globe-ry', '0deg');
      globeScene.style.setProperty('--card-x', '0px');
      globeScene.style.setProperty('--card-x-neg', '0px');
      globeScene.style.setProperty('--card-y', '0px');
      globeScene.style.setProperty('--card-y-neg', '0px');
    });
  }

  /* Interactive homepage product previews. */
  function wireTabs(rootSelector, tabSelector, panelSelector, tabKey, panelKey) {
    document.querySelectorAll(rootSelector).forEach(function (root) {
      var tabs = root.querySelectorAll(tabSelector);
      var panels = root.querySelectorAll(panelSelector);
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var value = tab.getAttribute(tabKey);
          tabs.forEach(function (item) {
            var active = item === tab;
            item.classList.toggle('active', active);
            item.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          panels.forEach(function (panel) {
            panel.classList.toggle('active', panel.getAttribute(panelKey) === value);
          });
        });
      });
    });
  }
  wireTabs('[data-product-demo]', '[data-product-tab]', '[data-product-view]', 'data-product-tab', 'data-product-view');
  wireTabs('[data-app-workbench]', '[data-app-tab]', '[data-app-panel]', 'data-app-tab', 'data-app-panel');
  wireTabs('[data-audience-section]', '[data-audience-tab]', '[data-audience-panel]', 'data-audience-tab', 'data-audience-panel');

  /* Cycle the compact hero preview until the visitor takes control. */
  var productDemo = document.querySelector('[data-product-demo]');
  if (productDemo && !reduce) {
    var autoTabs = Array.prototype.slice.call(productDemo.querySelectorAll('[data-product-tab]'));
    var autoIndex = 0;
    var autoPaused = false;
    var autoTimer = setInterval(function () {
      if (autoPaused || document.hidden) return;
      autoIndex = (autoIndex + 1) % autoTabs.length;
      autoTabs[autoIndex].click();
    }, 6500);
    productDemo.addEventListener('pointerenter', function () { autoPaused = true; });
    productDemo.addEventListener('pointerleave', function () { autoPaused = false; });
    productDemo.addEventListener('focusin', function () { autoPaused = true; });
    window.addEventListener('pagehide', function () { clearInterval(autoTimer); }, { once: true });
  }

  document.querySelectorAll('.app-panel button,.go-grid button').forEach(function (button) {
    button.addEventListener('click', function () {
      button.classList.remove('ui-pulse');
      void button.offsetWidth;
      button.classList.add('ui-pulse');
    });
  });

  /* Editable newsroom demo with local draft and publish feedback. */
  var storyTitle = document.querySelector('[data-story-title]');
  var storyBody = document.querySelector('[data-story-body]');
  var publishButton = document.querySelector('[data-publish-story]');
  var publishStatus = document.querySelector('[data-publish-status]');
  if (storyTitle && storyBody && publishButton && publishStatus) {
    try {
      storyTitle.textContent = localStorage.getItem('tmc-demo-story-title') || storyTitle.textContent;
      storyBody.textContent = localStorage.getItem('tmc-demo-story-body') || storyBody.textContent;
    } catch (e) {}
    var saveDraft = function () {
      try {
        localStorage.setItem('tmc-demo-story-title', storyTitle.textContent.trim());
        localStorage.setItem('tmc-demo-story-body', storyBody.textContent.trim());
      } catch (e) {}
      publishStatus.textContent = 'Draft saved locally';
    };
    storyTitle.addEventListener('input', saveDraft);
    storyBody.addEventListener('input', saveDraft);
    publishButton.addEventListener('click', function () {
      if (!storyTitle.textContent.trim() || !storyBody.textContent.trim()) {
        publishStatus.textContent = 'Add a headline and story first';
        return;
      }
      publishStatus.textContent = 'Published in demo at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      publishButton.textContent = 'Published';
      setTimeout(function () { publishButton.textContent = 'Publish story'; }, 2200);
    });
  }

  /* Working TMCast transport demo. */
  var castTracks = ['Evening Rotation', 'Night Signal', 'Independent Air', 'Mavion After Dark'];
  var castTrack = document.querySelector('[data-cast-track]');
  var castStatus = document.querySelector('[data-cast-status]');
  var castWave = document.querySelector('[data-cast-wave]');
  var castIndex = 0;
  var castPlaying = true;
  document.querySelectorAll('[data-cast-action]').forEach(function (control) {
    control.addEventListener('click', function () {
      var action = control.getAttribute('data-cast-action');
      if (action === 'previous') castIndex = (castIndex - 1 + castTracks.length) % castTracks.length;
      if (action === 'next') castIndex = (castIndex + 1) % castTracks.length;
      if (action === 'play') {
        castPlaying = !castPlaying;
        control.textContent = castPlaying ? 'Ⅱ' : '▶';
        control.setAttribute('aria-label', castPlaying ? 'Pause broadcast' : 'Resume broadcast');
        if (castWave) castWave.classList.toggle('paused', !castPlaying);
        if (castStatus) castStatus.textContent = castPlaying ? 'On air' : 'Paused';
      }
      if (castTrack) castTrack.textContent = castTracks[castIndex];
    });
  });

  /* Searchable command palette for products and key pages. */
  var commandItems = [
    { icon: 'MN', title: 'Mavion News', desc: 'Publishing and media', url: 'https://mavion.tmc.gg', external: true },
    { icon: 'TC', title: 'TMCast', desc: 'Broadcast control and hosting', url: 'https://cast.tmc.gg', external: true },
    { icon: 'GO', title: 'Mavion Go', desc: 'Focused student workspace', url: '/go' },
    { icon: 'PL', title: 'Mavion Planner', desc: 'Classes, assignments, notes, and study plans', url: '/planner' },
    { icon: 'DR', title: 'Team Directory', desc: 'People inside Mavion', url: '#team' },
    { icon: 'PO', title: 'Staff POS', desc: 'Checkout and receipts', url: '/pay/pos' },
    { icon: 'API', title: 'Developers', desc: 'Documentation and integrations', url: '/developers' },
    { icon: 'CO', title: 'Companies', desc: 'The Mavion network', url: '/companies' },
    { icon: 'NW', title: 'Newsroom', desc: 'Corporate announcements', url: '/newsroom' },
    { icon: 'CA', title: 'Careers', desc: 'Work with Mavion', url: '/careers' },
    { icon: 'CT', title: 'Contact', desc: 'Reach the corporation', url: '/contact' }
  ];
  var commandOverlay = document.querySelector('[data-command-overlay]');
  var commandInput = document.querySelector('[data-command-input]');
  var commandResults = document.querySelector('[data-command-results]');
  var commandFiltered = commandItems.slice();
  var commandIndex = 0;
  function renderCommands() {
    if (!commandResults) return;
    if (!commandFiltered.length) {
      commandResults.innerHTML = '<p class="command-empty">No matching Mavion destination.</p>';
      return;
    }
    commandResults.innerHTML = commandFiltered.map(function (item, index) {
      return '<button class="command-result' + (index === commandIndex ? ' active' : '') + '" type="button" data-command-index="' + index + '"><span>' + item.icon + '</span><span><strong>' + item.title + '</strong><small>' + item.desc + '</small></span><b>' + (item.external ? '↗' : '→') + '</b></button>';
    }).join('');
  }
  function closeCommands() {
    if (!commandOverlay) return;
    commandOverlay.hidden = true;
    document.body.classList.remove('command-open');
  }
  function openCommands() {
    if (!commandOverlay || !commandInput) return;
    commandOverlay.hidden = false;
    document.body.classList.add('command-open');
    commandInput.value = '';
    commandFiltered = commandItems.slice();
    commandIndex = 0;
    renderCommands();
    setTimeout(function () { commandInput.focus(); }, 30);
  }
  function openCommandItem(item) {
    if (!item) return;
    if (item.external) window.open(item.url, '_blank', 'noopener');
    else window.location.href = item.url;
    closeCommands();
  }
  document.querySelectorAll('[data-command-open]').forEach(function (button) { button.addEventListener('click', openCommands); });
  if (commandOverlay && commandInput && commandResults) {
    commandInput.addEventListener('input', function () {
      var query = commandInput.value.trim().toLowerCase();
      commandFiltered = commandItems.filter(function (item) { return (item.title + ' ' + item.desc).toLowerCase().indexOf(query) !== -1; });
      commandIndex = 0;
      renderCommands();
    });
    commandResults.addEventListener('click', function (e) {
      var button = e.target.closest('[data-command-index]');
      if (button) openCommandItem(commandFiltered[Number(button.getAttribute('data-command-index'))]);
    });
    commandOverlay.addEventListener('click', function (e) { if (e.target === commandOverlay) closeCommands(); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); commandOverlay.hidden ? openCommands() : closeCommands(); return; }
      if (commandOverlay.hidden) return;
      if (e.key === 'Escape') { closeCommands(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); commandIndex = Math.min(commandIndex + 1, commandFiltered.length - 1); renderCommands(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); commandIndex = Math.max(commandIndex - 1, 0); renderCommands(); }
      if (e.key === 'Enter' && commandFiltered.length) { e.preventDefault(); openCommandItem(commandFiltered[commandIndex]); }
    });
  }

  /* Slim scroll progress indicator for long landing pages. */
  if (document.body.classList.contains('home-page')) {
    var progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
    var scrollCards = document.querySelectorAll('[data-scroll-card]');
    var globeSection = document.querySelector('[data-globe-section]');
    var dockLinks = document.querySelectorAll('.page-dock a[href^="#"]');
    var updateProgress = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      var heroProduct = document.querySelector('.hero-product');
      if (heroProduct && !reduce) heroProduct.style.setProperty('--scroll-y', Math.min(window.scrollY * .045, 24).toFixed(1) + 'px');
      if (!reduce) {
        scrollCards.forEach(function (card) {
          var rect = card.getBoundingClientRect();
          var passed = Math.max(0, Math.min(1, (110 - rect.top) / 260));
          card.style.setProperty('--scroll-rotate', (-passed * 3.4).toFixed(2) + 'deg');
          card.style.setProperty('--scroll-scale', (1 - passed * .035).toFixed(3));
        });
        if (globeSection && globe) {
          var globeRect = globeSection.getBoundingClientRect();
          var globeTravel = (window.innerHeight * .5 - globeRect.top) / Math.max(globeRect.height, 1);
          globe.style.setProperty('--globe-ry', (globeTravel * 42).toFixed(2) + 'deg');
        }
      }
      var closestDock = null;
      var closestDistance = Infinity;
      dockLinks.forEach(function (link) {
        var target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        var distance = Math.abs(target.getBoundingClientRect().top - window.innerHeight * .32);
        if (distance < closestDistance) { closestDistance = distance; closestDock = link; }
      });
      dockLinks.forEach(function (link) { link.classList.toggle('active', link === closestDock); });
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
  }

  /* Single-open FAQ */
  var faq = document.querySelector('.faq[data-single]');
  if (faq) {
    var all = faq.querySelectorAll('details');
    all.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) all.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  }

  /* Legal TOC — highlight the section currently in view */
  var toc = document.querySelector('.legal-toc');
  if (toc && 'IntersectionObserver' in window) {
    var links = {};
    toc.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var heads = document.querySelectorAll('.legal-body > h2[id]');
    if (heads.length) {
      var tio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && links[e.target.id]) {
            toc.querySelectorAll('a').forEach(function (l) { l.classList.remove('active'); });
            links[e.target.id].classList.add('active');
          }
        });
      }, { rootMargin: '-90px 0px -68% 0px', threshold: 0 });
      heads.forEach(function (h) { tio.observe(h); });
    }
  }

  /* Current year */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Cookie consent — granular categories, remembered in localStorage.
     A slim banner on first visit; a full preferences modal from the
     banner's "Customize" and any [data-cookie-edit] control. */
  (function () {
    var KEY = 'tmc-cookie-consent';
    var CATS = [
      { id: 'essential', name: 'Essential', locked: true, desc: 'Required for the site to work — security, delivery, and remembering this cookie choice.' },
      { id: 'functional', name: 'Functional', locked: false, desc: 'Remembers preferences beyond the basics. Not currently used — your choice is saved in case we add it.' },
      { id: 'analytics', name: 'Analytics', locked: false, desc: 'Anonymous usage statistics to help us improve. Not currently used — your choice is saved in case we add it.' }
    ];
    var bar = null, modal = null;

    function read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
    function save(prefs) { prefs.essential = true; prefs.v = 1; try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }

    function closeBar() {
      if (!bar) return;
      var b = bar; bar = null; b.classList.remove('in');
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 560);
    }
    function showBar() {
      if (bar || read()) return;
      bar = document.createElement('div');
      bar.className = 'cookie';
      bar.setAttribute('role', 'dialog');
      bar.setAttribute('aria-label', 'Cookie notice');
      bar.innerHTML =
        '<p>We use only essential cookies to run this site and remember your preferences — nothing that tracks you across the web. Read our <a href="/cookies">Cookie Policy</a>.</p>'
        + '<div class="cookie-actions">'
        + '<button class="btn btn-ghost" type="button" data-act="decline">Decline</button>'
        + '<button class="btn btn-ghost" type="button" data-act="customize">Customize</button>'
        + '<button class="btn btn-primary" type="button" data-act="accept">Accept all</button>'
        + '</div>';
      document.body.appendChild(bar);
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (bar) bar.classList.add('in'); }); });
      bar.addEventListener('click', function (e) {
        var a = e.target.closest('button[data-act]'); if (!a) return;
        var act = a.getAttribute('data-act');
        if (act === 'accept') { save({ functional: true, analytics: true }); closeBar(); }
        else if (act === 'decline') { save({ functional: false, analytics: false }); closeBar(); }
        else if (act === 'customize') { openModal(); }
      });
    }

    function onKey(e) { if (e.key === 'Escape') closeModal(); }
    function closeModal() {
      if (!modal) return;
      var m = modal; modal = null; m.classList.remove('in');
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 400);
    }
    function openModal() {
      if (modal) return;
      var current = read() || {};
      var rows = CATS.map(function (c) {
        var on = c.locked || current[c.id] === true;
        return '<div class="cm-row"><div><h3>' + c.name + (c.locked ? ' <span class="always">Always active</span>' : '') + '</h3><p>' + c.desc + '</p></div>'
          + '<label class="switch"><input type="checkbox" data-cat="' + c.id + '"' + (on ? ' checked' : '') + (c.locked ? ' disabled' : '') + ' aria-label="' + c.name + ' cookies"><span class="track"></span><span class="thumb"></span></label></div>';
      }).join('');
      modal = document.createElement('div');
      modal.className = 'cm-overlay';
      modal.innerHTML =
        '<div class="cm-card" role="dialog" aria-modal="true" aria-label="Cookie preferences">'
        + '<div class="cm-head"><h2>Cookie preferences</h2><button class="cm-close" type="button" data-act="close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
        + '<p class="cm-intro">We currently use only essential cookies. These options let you set your choice in case we ever add more — we\'ll always respect them. See our <a href="/cookies">Cookie Policy</a>.</p>'
        + rows
        + '<div class="cm-actions"><button class="btn btn-ghost" type="button" data-act="reject">Reject optional</button><button class="btn btn-ghost" type="button" data-act="save">Save choices</button><button class="btn btn-primary" type="button" data-act="accept">Accept all</button></div>'
        + '</div>';
      document.body.appendChild(modal);
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (modal) modal.classList.add('in'); }); });
      document.addEventListener('keydown', onKey);
      modal.addEventListener('click', function (e) {
        if (e.target === modal) { closeModal(); return; }
        var a = e.target.closest('button[data-act]'); if (!a) return;
        var act = a.getAttribute('data-act');
        if (act === 'close') { closeModal(); return; }
        var prefs = { functional: false, analytics: false };
        if (act === 'accept') { prefs = { functional: true, analytics: true }; }
        else if (act === 'save') {
          modal.querySelectorAll('input[data-cat]').forEach(function (i) {
            var id = i.getAttribute('data-cat');
            if (id !== 'essential') prefs[id] = i.checked;
          });
        }
        save(prefs); closeModal(); closeBar();
      });
    }

    if (!read()) showBar();
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-cookie-edit]') : null;
      if (t) { e.preventDefault(); openModal(); }
    });
  })();
})();
