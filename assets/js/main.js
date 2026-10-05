/* Maria Mospanova — Photography
   Vanilla JS, no dependencies. Every effect degrades gracefully. */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };

  /* ---------- 1. Intro: staggered collage reveal ---------- */
  var heroImgs = $$('.hc img');
  var revealed = false;
  function revealHero() {
    if (revealed) return;
    revealed = true;
    requestAnimationFrame(function () { document.body.classList.add('is-loaded'); });
  }
  // Wait for the first images (or 1.2s at most) so photos appear, not empty frames.
  var pending = Math.min(3, heroImgs.length);
  heroImgs.slice(0, 3).forEach(function (img) {
    if (img.complete) { if (--pending <= 0) revealHero(); }
    else img.addEventListener('load', function () { if (--pending <= 0) revealHero(); }, { once: true });
  });
  if (pending <= 0) revealHero();
  setTimeout(revealHero, 1200);

  /* ---------- 2. Scroll reveal ---------- */
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 3. Header: "where am I" label + counter ---------- */
  var nowEl = $('.header__now');
  var nowTitle = $('[data-now-title]');
  var nowCat = $('[data-now-cat]');
  var countCur = $('[data-count-cur]');
  var countTotal = $('[data-count-total]');
  var countEl = $('.header__count');
  var navLinks = $$('[data-nav]');
  var tiles = $$('.tile');
  var hoverLock = false;

  function setNow(title, cat, idx, total) {
    if (nowTitle.textContent === title && nowCat.textContent === cat) return;
    nowEl.classList.add('is-swapping');
    clearTimeout(setNow.t);
    setNow.t = setTimeout(function () {
      nowTitle.textContent = title;
      nowCat.textContent = cat;
      nowEl.classList.remove('is-swapping');
    }, 180);
    countCur.textContent = idx ? pad(idx) : '—';
    countEl.classList.toggle('is-off', !idx && !total);
    if (total) countTotal.textContent = pad(total);
  }

  var sectionLabels = {
    Index:    ['Photographer', 'Berlin'],
    Work:     ['Index', 'All work'],
    About:    ['About', 'Maria Mospanova'],
    Approach: ['Approach', 'Movement · Energy'],
    Selected: ['Selected work', 'Recent'],
    Contact:  ['Contact', 'Bookings']
  };
  var navFor = { Work: 'work', About: 'about', Approach: 'about', Contact: 'contact' };

  function visibleTiles() { return tiles.filter(function (t) { return !t.classList.contains('is-out'); }); }
  function tileInfo(t) {
    var spans = $$('.cap span', t);
    var vis = visibleTiles();
    return [spans[0].textContent, spans[1].textContent, vis.indexOf(t) + 1, vis.length];
  }

  if ('IntersectionObserver' in window) {
    var currentSection = 'Index';
    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        currentSection = e.target.dataset.section;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.dataset.nav === navFor[currentSection]); });
        if (currentSection !== 'Work' && !hoverLock) {
          var l = sectionLabels[currentSection] || ['', ''];
          setNow(l[0], l[1], 0);
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section').forEach(function (s) { secIO.observe(s); });

    // inside Work: the tile crossing the middle of the screen drives the header
    var tileIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !hoverLock) setNow.apply(null, tileInfo(e.target));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    tiles.forEach(function (t) { tileIO.observe(t); });
  }

  if (finePointer) {
    tiles.forEach(function (t) {
      t.addEventListener('mouseenter', function () { hoverLock = true; setNow.apply(null, tileInfo(t)); });
      t.addEventListener('mouseleave', function () { hoverLock = false; });
    });
  }

  // Hide header on fast scroll down, show on scroll up
  var header = $('.header');
  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (document.body.classList.contains('menu-open')) return;
    header.classList.toggle('is-hidden', y > lastY + 4 && y > window.innerHeight * 0.6);
    if (y < lastY - 4) header.classList.remove('is-hidden');
    lastY = y;
  }, { passive: true });

  /* ---------- 4. Work filter ---------- */
  var grid = $('.grid');
  var filterBtns = $$('[data-filter]');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.dataset.filter;
      filterBtns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      grid.classList.toggle('is-filtered', f !== 'all');
      tiles.forEach(function (t) {
        var out = f !== 'all' && t.dataset.cat !== f;
        t.classList.toggle('is-out', out);
        if (!out) { t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in'); }
      });
      var label = f === 'all' ? 'All work' : btn.firstChild.textContent.trim();
      setNow('Index', label, 0, visibleTiles().length);
      var bar = $('.work__bar');
      if (bar.getBoundingClientRect().top < 0) {
        window.scrollTo({ top: bar.getBoundingClientRect().top + window.scrollY - 90, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  });

  /* ---------- 5. Mobile menu ---------- */
  var menuBtn = $('.header__menu');
  var menu = $('#mobile-menu');
  function closeMenu() {
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.textContent = 'Menu';
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
    setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 500);
  }
  menuBtn.addEventListener('click', function () {
    if (menu.classList.contains('is-open')) return closeMenu();
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.textContent = 'Close';
    document.body.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { menu.classList.add('is-open'); });
  });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', closeMenu); });

  /* ---------- 6. Approach: drifting words + photo peek ---------- */
  var words = $$('.word');
  var approach = $('.approach');
  var peek = $('.word-peek');
  var peekImg = peek && $('img', peek);

  if (finePointer && peek) {
    // preload peek images
    words.forEach(function (w) {
      w.addEventListener('mouseenter', function () {
        delete peekImg.dataset.phUsed;
        delete peekImg.dataset.fallback;
        peekImg.dataset.ph = w.dataset.ph || '';
        peekImg.src = w.dataset.img;
        peek.classList.add('is-on');
      });
      w.addEventListener('mouseleave', function () { peek.classList.remove('is-on'); });
    });
    approach.addEventListener('mousemove', function (e) {
      var r = approach.getBoundingClientRect();
      peek.style.left = (e.clientX - r.left) + 'px';
      peek.style.top = (e.clientY - r.top) + 'px';
    });
  }

  /* ---------- 7. Horizontal reel ---------- */
  var reel = $('.reel');
  var track = $('.reel__track');
  var viewport = $('.reel__viewport');
  var reelItems = $$('.reel__item');
  var reelCur = $('[data-reel-current]');
  var progress = $('.reel__progress span');
  $('[data-reel-total]').textContent = pad(reelItems.length);
  var pinned = false;
  var reelDistance = 0;

  function setupReel() {
    pinned = !reduced && window.innerWidth > 760;
    reel.classList.toggle('is-pinned', pinned);
    track.style.transform = '';
    if (pinned) {
      reelDistance = Math.max(0, track.scrollWidth - window.innerWidth);
      reel.style.height = (window.innerHeight + reelDistance) + 'px';
    } else {
      reel.style.height = '';
    }
  }
  function reelProgress(p) {
    p = Math.min(1, Math.max(0, p));
    progress.style.transform = 'scaleX(' + p + ')';
    reelCur.textContent = pad(Math.min(reelItems.length, Math.round(p * (reelItems.length - 1)) + 1));
  }
  if (viewport) {
    viewport.addEventListener('scroll', function () {
      if (pinned) return;
      var max = viewport.scrollWidth - viewport.clientWidth;
      reelProgress(max > 0 ? viewport.scrollLeft / max : 0);
    }, { passive: true });
  }

  /* ---------- 8. One rAF loop for scroll-driven motion ---------- */
  var ticking = false;
  function onFrame() {
    ticking = false;
    var vh = window.innerHeight;

    if (pinned) {
      var r = reel.getBoundingClientRect();
      var p = reelDistance ? -r.top / reelDistance : 0;
      p = Math.min(1, Math.max(0, p));
      track.style.transform = 'translate3d(' + (-p * reelDistance) + 'px,0,0)';
      reelProgress(p);
    }

    if (!reduced) {
      var ar = approach.getBoundingClientRect();
      if (ar.bottom > 0 && ar.top < vh) {
        var t = (vh - ar.top) / (vh + ar.height) - 0.5; // -0.5 .. 0.5
        words.forEach(function (w) {
          w.firstElementChild.style.transform = 'translate3d(' + (t * 8 * (+w.dataset.drift || 0)) + 'vw,0,0)';
        });
      }
      var hy = window.scrollY;
      if (hy < vh) {
        $$('.hc').forEach(function (el, i) {
          el.style.translate = '0 ' + (-hy * (0.04 + (i % 3) * 0.05)) + 'px';
        });
      }
    }
  }
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', function () { setupReel(); requestTick(); });
  window.addEventListener('load', function () { setupReel(); requestTick(); });
  setupReel();
  requestTick();

  /* ---------- 9. Lightbox ---------- */
  var lb = $('.lightbox');
  var lbImg = $('.lightbox__frame img');
  var lbCur = $('[data-lb-current]');
  var lbTotal = $('[data-lb-total]');
  var group = [];
  var idx = 0;
  var lastFocus = null;

  function largeSrc(src) { return src.replace(/([?&])w=\d+/, '$1w=2000'); }
  function show(i) {
    idx = (i + group.length) % group.length;
    var img = group[idx];
    lbImg.classList.add('is-swapping');
    var next = new Image();
    next.onload = next.onerror = function () {
      lbImg.src = next.src;
      lbImg.alt = img.alt;
      lbImg.classList.remove('is-swapping');
    };
    next.src = img.dataset.fallback ? img.currentSrc || img.src : largeSrc(img.currentSrc || img.src);
    lbCur.textContent = idx + 1;
    lbTotal.textContent = group.length;
  }
  function openLb(container, img) {
    group = $$('img', container).filter(function (im) { return im.offsetParent !== null; });
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { lb.classList.add('is-open'); });
    show(group.indexOf(img));
    $('.lightbox__close').focus();
  }
  function closeLb() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(function () { lb.hidden = true; }, 400);
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-lightbox]').forEach(function (container) {
    container.addEventListener('click', function (e) {
      var img = e.target.closest('.ph') && $('img', e.target.closest('.ph'));
      if (img) openLb(container, img);
    });
  });
  $('.lightbox__close').addEventListener('click', closeLb);
  $('.lightbox__prev').addEventListener('click', function () { show(idx - 1); });
  $('.lightbox__next').addEventListener('click', function () { show(idx + 1); });
  lbImg.addEventListener('click', function () { show(idx + 1); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) { if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu(); return; }
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });
  var touchX = null;
  lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- 10. Cursor label ---------- */
  var cursor = $('.cursor');
  if (finePointer && cursor) {
    window.addEventListener('mousemove', function (e) {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      var over = e.target.closest && e.target.closest('[data-lightbox] .ph');
      cursor.classList.toggle('is-on', !!over && lb.hidden);
    }, { passive: true });
    window.addEventListener('scroll', function () { cursor.classList.remove('is-on'); }, { passive: true });
  }

  /* ---------- 11. Photo map: open index.html?map to see each photo's file name ---------- */
  if (/[?&]map\b/.test(location.search)) {
    document.body.classList.add('show-map');
    $$('img[src^="assets/img/"]').forEach(function (img) {
      var tag = document.createElement('span');
      tag.className = 'map-tag';
      tag.textContent = img.getAttribute('src').split('/').pop();
      (img.closest('.ph, .hc') || img.parentNode).appendChild(tag);
    });
    $$('.word[data-img]').forEach(function (w) {
      var tag = document.createElement('span');
      tag.className = 'map-tag map-tag--word';
      tag.textContent = w.dataset.img.split('/').pop();
      w.appendChild(tag);
    });
  }

  /* ---------- 12. Berlin local time ---------- */
  var clock = $('[data-clock]');
  if (clock && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 30000);
  }
})();
