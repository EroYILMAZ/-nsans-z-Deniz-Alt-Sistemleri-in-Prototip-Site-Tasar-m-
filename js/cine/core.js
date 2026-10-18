/*
 * Deniz6 — sinema katmanının çekirdeği (js/cine/*.js modüllerinin ortak motoru).
 *  - D6Cine.flags: { reduce, lite } ve html.cine-reduce / html.cine-lite sınıfları.
 *  - D6Cine.scrub(section, onProgress): sabitlenen bölümler için tek kaydırma dinleyicisi + tek rAF; bölüme --p yazar.
 *  - D6Cine.lockWhenVisible(el): vizör kilidi; öğe %35 görününce .is-locked.
 *  - D6Cine.focusPull(img): bulanık önizlemeden keskin kareye "lens odak çekme" geçişi.
 *  - <meta name="theme-color">: mobil tarayıcı çubuğu sayfayla birlikte dalar, yüzeyde yeniden aydınlanır.
 *  - D6Cine.ready(fn)
 * Layout is read only on register, resize, body/section resize and refresh; the scroll path reads scrollY only.
 */
(function () {
  'use strict';
  var C = window.D6Cine = window.D6Cine || {};
  if (C.__core) return;
  C.__core = true;

  var root = document.documentElement;
  var hasIO = typeof window.IntersectionObserver === 'function';
  var hasRO = typeof window.ResizeObserver === 'function';
  var raf = typeof window.requestAnimationFrame === 'function'
    ? function (f) { return window.requestAnimationFrame(f); }
    : function (f) { return setTimeout(f, 16); };
  var microtask = typeof Promise === 'function'
    ? function (f) { Promise.resolve().then(f); }
    : function (f) { setTimeout(f, 0); };
  function noop() {}
  // A failing module callback must not break the shared loop; rethrow later so it still shows in the console.
  function report(err) { setTimeout(function () { throw err; }, 0); }
  function safeCall(fn, arg) { try { fn(arg); } catch (err) { report(err); } }
  function scrollTop() { return window.pageYOffset || 0; }
  function viewH() { return window.innerHeight || root.clientHeight || 1; }

  /* ---------- flags ---------- */
  var mqReduce = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var nav = window.navigator || {};
  var conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  var flags = C.flags = C.flags || {};
  function applyFlags() {
    flags.reduce = !!(mqReduce && mqReduce.matches);
    flags.lite = (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) || !!(conn && conn.saveData);
    root.classList.toggle('cine-reduce', flags.reduce);
    root.classList.toggle('cine-lite', flags.lite);
  }
  applyFlags();
  if (mqReduce) {
    if (typeof mqReduce.addEventListener === 'function') mqReduce.addEventListener('change', applyFlags);
    else if (typeof mqReduce.addListener === 'function') mqReduce.addListener(applyFlags);
  }
  if (conn && typeof conn.addEventListener === 'function') conn.addEventListener('change', applyFlags);

  /* ---------- scrub: pinned / scroll-scrubbed sections ---------- */
  // p = clamp((scrollY - sectionTop) / (sectionHeight - innerHeight), 0, 1), from offsets cached off the scroll path.
  var EPS = 0.0005;
  var entries = [];
  var dirty = true, forceAll = false, frameId = 0, microQueued = false;
  var scrollOn = false, listenOn = false;
  var nearIO = null, sizeRO = null;

  function schedule() { if (!frameId) frameId = raf(onFrame); }
  function onFrame() { frameId = 0; run(); }
  function onScroll() { schedule(); }
  function markDirty() { dirty = true; schedule(); }
  function onResize() { dirty = true; forceAll = true; schedule(); }
  function onPageShow(e) { if (e && e.persisted) onResize(); } // back/forward cache restore

  function measureAll() {
    dirty = false;
    var y = scrollTop(), vh = viewH(), all = forceAll;
    forceAll = false;
    for (var i = 0; i < entries.length; i++) {
      var en = entries[i];
      if (en.dead) continue;
      var r = en.el.getBoundingClientRect();
      var top = r.top + y, range = Math.max(1, r.height - vh);
      if (all || Math.abs(top - en.top) > 0.5 || Math.abs(range - en.range) > 0.5) {
        en.top = top; en.range = range; en.force = true;
      }
    }
  }

  function update(en, y) {
    var p = (y - en.top) / en.range;
    p = p < 0 ? 0 : (p > 1 ? 1 : p);
    if (!en.force) {
      if (p === en.p) return;
      // small moves are skipped, but the exact ends 0 and 1 are always written
      if (Math.abs(p - en.p) <= EPS && p !== 0 && p !== 1) return;
    }
    en.force = false;
    en.p = p;
    en.el.style.setProperty('--p', p.toFixed(4));
    safeCall(en.fn, p);
  }

  function run() {
    if (!entries.length) return;
    if (dirty) measureAll();
    // entries is copy-on-write (register/dispose swap in a new array), so a callback that registers or
    // disposes cannot disturb this loop, and the scroll path allocates nothing per frame
    var y = scrollTop(), list = entries;
    for (var i = 0; i < list.length; i++) {
      var en = list[i];
      if (en.dead) continue;
      if (en.near || en.force || en.once) { en.once = false; update(en, y); }
    }
  }

  function queueRun() {
    if (microQueued) return;
    microQueued = true;
    microtask(function () { microQueued = false; run(); });
  }

  function syncScroll() {
    var any = false;
    for (var i = 0; i < entries.length; i++) { if (entries[i].near) { any = true; break; } }
    if (any === scrollOn) return;
    scrollOn = any;
    if (any) window.addEventListener('scroll', onScroll, { passive: true });
    else window.removeEventListener('scroll', onScroll, { passive: true });
  }

  function onNear(list) {
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      for (var j = 0; j < entries.length; j++) {
        var en = entries[j];
        if (en.el !== e.target) continue;
        // leaving the near zone: compute once more so a fast jump still lands on 0 or 1
        if (en.near && !e.isIntersecting) en.once = true;
        en.near = e.isIntersecting;
      }
    }
    syncScroll();
    schedule();
  }

  function ensureEngine() {
    if (hasIO && !nearIO) nearIO = new IntersectionObserver(onNear, { rootMargin: '50% 0px' });
    if (hasRO && !sizeRO) {
      // the body is watched too: content above a section (images, fonts, lazy blocks) moves its top without resizing it
      sizeRO = new ResizeObserver(markDirty);
      sizeRO.observe(document.body || root);
    }
    if (!listenOn) {
      listenOn = true;
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
      window.addEventListener('pageshow', onPageShow);
      window.addEventListener('load', markDirty);
    }
  }

  function teardownEngine() {
    if (sizeRO) { sizeRO.disconnect(); sizeRO = null; }
    if (listenOn) {
      listenOn = false;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('load', markDirty);
    }
    syncScroll();
  }

  function elInUse(el) {
    for (var i = 0; i < entries.length; i++) { if (entries[i].el === el) return true; }
    return false;
  }

  function scrub(section, onProgress) {
    if (!section || section.nodeType !== 1) return { dispose: noop, refresh: noop };
    var en = {
      el: section, fn: typeof onProgress === 'function' ? onProgress : noop,
      top: 0, range: 1, p: -1, near: !hasIO, force: true, once: false, dead: false
    };
    // a second registration on an element the observer already watches gets no fresh IO entry: inherit its state
    for (var k = 0; k < entries.length; k++) { if (entries[k].el === section) { en.near = entries[k].near; break; } }
    entries = entries.concat([en]);
    ensureEngine();
    if (nearIO) nearIO.observe(section);
    if (sizeRO) sizeRO.observe(section);
    dirty = true;
    syncScroll();
    // first measure + onProgress run in a microtask: after the caller has its handle, before the next paint
    queueRun();
    return {
      dispose: function () {
        if (en.dead) return;
        en.dead = true;
        en.fn = noop;
        var i = entries.indexOf(en);
        if (i >= 0) entries = entries.slice(0, i).concat(entries.slice(i + 1));
        if (!elInUse(section)) {
          if (nearIO) nearIO.unobserve(section);
          if (sizeRO) sizeRO.unobserve(section);
        }
        if (entries.length) syncScroll();
        else teardownEngine();
      },
      refresh: function () {
        if (en.dead) return;
        en.force = true;
        dirty = true;
        schedule();
      }
    };
  }

  // Re-measure every registered section and call each onProgress once (e.g. after fonts or a layout change).
  function refreshAll() {
    if (!entries.length) return;
    dirty = true;
    forceAll = true;
    schedule();
  }

  /* ---------- viewfinder lock-on ---------- */
  var lockIO = null;
  function onLock(list) {
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e.isIntersecting) continue;
      var rootH = e.rootBounds ? e.rootBounds.height : viewH();
      var b = e.boundingClientRect, ir = e.intersectionRect;
      // very tall elements can never reach a 35% ratio: lock them once they fill 35% of the viewport instead
      var tall = b.height > rootH && ir.height >= rootH * 0.35 && b.width > 0 && ir.width >= b.width * 0.35;
      // small tolerance: browsers keep thresholds in single precision, so the crossing entry can report
      // 0.3499999 and no further callback would come while the ratio keeps growing
      if (e.intersectionRatio >= 0.349 || tall) {
        lockIO.unobserve(e.target);
        e.target.classList.add('is-locked');
      }
    }
  }
  function lockWhenVisible(el) {
    if (!el || el.nodeType !== 1 || el.classList.contains('is-locked')) return { dispose: noop };
    if (!hasIO) { el.classList.add('is-locked'); return { dispose: noop }; }
    if (!lockIO) lockIO = new IntersectionObserver(onLock, { threshold: [0.1, 0.2, 0.35] });
    lockIO.observe(el);
    return { dispose: function () { if (lockIO) lockIO.unobserve(el); } };
  }

  /* ---------- lens focus pull ---------- */
  // The wrapper shows the tiny blurred still (data-lq) as its background; the sharp img fades in over it
  // once it is in view and decoded. Changing src/srcset and calling focusPull again pulls focus again.
  var fpIO = null;
  function cssUrl(s) { return 'url("' + String(s).replace(/["\\]/g, '\\$&').replace(/[\r\n]/g, '') + '")'; }
  function srcKey(img) { return (img.getAttribute('src') || '') + '|' + (img.getAttribute('srcset') || ''); }
  function prepWrap(img) {
    var w = img.parentElement;
    if (!w) return;
    if (!w.classList.contains('fp')) w.classList.add('fp');
    var lq = w.getAttribute('data-lq');
    if (lq && w.__d6lq !== lq) { w.__d6lq = lq; w.style.backgroundImage = cssUrl(lq); }
  }
  function setSharp(img, on) {
    img.classList.toggle('is-sharp', on);
    if (img.parentElement) img.parentElement.classList.toggle('is-sharp', on);
  }
  function sharpen(img, st) {
    if (st.sharp || st.dead) return;
    st.sharp = true;
    st.key = srcKey(img);
    setSharp(img, true);
    if (fpIO) fpIO.unobserve(img);
  }
  function reveal(img, st) {
    if (st.sharp || st.busy || st.dead || !st.inView) return;
    if (!(img.complete && img.naturalWidth > 0)) return; // not loaded yet: the load listener calls back
    st.busy = true;
    var tok = ++st.tok, guard = 0;
    function ok() { if (tok !== st.tok) return; clearTimeout(guard); st.busy = false; sharpen(img, st); }
    function fail() {
      if (tok !== st.tok) return;
      clearTimeout(guard);
      st.busy = false;
      // decode() can reject for reasons that do not matter here; a loaded image is still shown
      if (img.complete && img.naturalWidth > 0) sharpen(img, st);
    }
    if (typeof img.decode === 'function') {
      // some engines leave decode() pending forever (e.g. lazy or SVG images in older WebKit):
      // never keep a loaded picture hidden behind the placeholder because of that
      guard = setTimeout(fail, 1500);
      img.decode().then(ok, fail);
    } else ok();
  }
  function onFp(list) {
    for (var i = 0; i < list.length; i++) {
      var e = list[i], img = e.target, st = img.__d6fp;
      if (!st || st.dead) { fpIO.unobserve(img); continue; }
      st.inView = e.isIntersecting;
      if (st.inView) reveal(img, st);
    }
  }
  function watchFp(img, st) {
    if (!hasIO) { st.inView = true; reveal(img, st); return; }
    if (!fpIO) fpIO = new IntersectionObserver(onFp, { rootMargin: '0px 0px -6% 0px' });
    fpIO.observe(img);
  }
  function focusPull(img) {
    // only an <img> can be loaded/decoded; anything else would leave its wrapper marked .fp for nothing
    if (!img || img.nodeType !== 1 || String(img.tagName).toUpperCase() !== 'IMG') return { dispose: noop };
    prepWrap(img);
    var st = img.__d6fp;
    if (st && !st.dead) {
      if (st.sharp && srcKey(img) !== st.key) {
        // a new picture in the same element: back to the placeholder, then pull focus again
        st.sharp = false; st.busy = false; st.tok++;
        st.inView = false;
        setSharp(img, false);
        watchFp(img, st);
      } else if (!st.sharp) {
        reveal(img, st);
      }
      return st.handle;
    }
    st = img.__d6fp = { sharp: false, busy: false, dead: false, inView: false, tok: 0, key: '' };
    // already sharp (e.g. after a dispose and a new call): keep it, and mark the (possibly new) wrapper too
    if (img.classList.contains('is-sharp')) { st.sharp = true; st.key = srcKey(img); setSharp(img, true); }
    st.onLoad = function () { reveal(img, st); };
    img.addEventListener('load', st.onLoad);
    st.handle = {
      dispose: function () {
        if (st.dead) return;
        st.dead = true;
        st.tok++;
        img.removeEventListener('load', st.onLoad);
        if (fpIO) fpIO.unobserve(img);
        if (img.__d6fp === st) img.__d6fp = null;
      }
    };
    if (!st.sharp) watchFp(img, st);
    return st.handle;
  }

  /* ---------- browser bar colour that dives with the page ---------- */
  var THEME = {
    hero: '#0c3b57', hakkimizda: '#082c45', arac: '#05253a', takim: '#041d30',
    yol: '#031726', sponsor: '#02111d', iletisim: '#020a12', yuzey: '#0e5a6e'
  };
  var themeIO = null, themeMeta = null, themeNow = '', themeEls = [], band = [];
  function setThemeColor(c) {
    if (!c || c === themeNow) return;
    themeNow = c;
    if (!themeMeta || !themeMeta.parentNode) {
      themeMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.setAttribute('name', 'theme-color');
        (document.head || root).appendChild(themeMeta);
      }
    }
    themeMeta.setAttribute('content', c);
  }
  function onTheme(list) {
    for (var i = 0; i < list.length; i++) {
      var t = list[i].target, k = band.indexOf(t);
      if (k >= 0) band.splice(k, 1);
      if (list[i].isIntersecting) band.push(t);
    }
    // the most recently entered section owns the band (same rootMargin as site.js)
    var cur = band[band.length - 1];
    if (cur) setThemeColor(THEME[cur.getAttribute('data-section')]);
  }
  function themeScan() {
    if (!themeIO) return;
    var kept = [], i;
    for (i = 0; i < themeEls.length; i++) {
      if (root.contains(themeEls[i])) kept.push(themeEls[i]);
      else {
        themeIO.unobserve(themeEls[i]);
        themeEls[i].__d6tc = false;
        var k = band.indexOf(themeEls[i]);
        if (k >= 0) band.splice(k, 1);
      }
    }
    themeEls = kept;
    var els = document.querySelectorAll('[data-section]');
    for (i = 0; i < els.length; i++) {
      if (els[i].__d6tc) continue;
      els[i].__d6tc = true;
      themeEls.push(els[i]);
      themeIO.observe(els[i]);
    }
  }
  function themeInit() {
    if (!hasIO || themeIO) return;
    themeIO = new IntersectionObserver(onTheme, { rootMargin: '-45% 0px -50% 0px' });
    themeScan();
    // React renders after this script; sections such as #yuzey also arrive later
    // throttled, not debounced: React subtrees that keep adding nodes (HUDs, marquees) must not postpone the scan forever
    var t = 0;
    function later() { if (!t) t = setTimeout(function () { t = 0; themeScan(); }, 250); }
    if (typeof MutationObserver === 'function') {
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var a = list[i].addedNodes, r = list[i].removedNodes, j;
          for (j = 0; j < a.length; j++) { if (a[j].nodeType === 1) { later(); return; } }
          for (j = 0; j < r.length; j++) { if (r[j].nodeType === 1) { later(); return; } }
        }
      }).observe(document.getElementById('root') || document.body || root, { childList: true, subtree: true });
    }
    setTimeout(themeScan, 60);
    window.addEventListener('load', themeScan);
  }

  /* ---------- ready ---------- */
  var readyQ = [], isReady = false;
  function ready(fn) {
    if (typeof fn !== 'function') return;
    if (isReady) safeCall(fn, C);
    else readyQ.push(fn);
  }
  function boot() {
    if (isReady) return;
    isReady = true;
    themeInit();
    var q = readyQ;
    readyQ = [];
    for (var i = 0; i < q.length; i++) safeCall(q[i], C);
  }

  C.scrub = scrub;
  C.refresh = refreshAll;
  C.lockWhenVisible = lockWhenVisible;
  C.focusPull = focusPull;
  C.ready = ready;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
