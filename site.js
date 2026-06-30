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

  /* Mobile nav toggle */
  var toggle = document.querySelector('.nav-toggle');
  if (header && toggle) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    header.querySelectorAll('.nav-menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        header.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
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

  /* Current year */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
