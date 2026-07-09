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
