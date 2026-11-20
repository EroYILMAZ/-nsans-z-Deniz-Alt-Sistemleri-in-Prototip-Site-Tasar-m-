/*
 * Deniz6 — yüzeye çıkış (#yuzey): sayfanın kapanış sahnesi.
 * Araç, filmin son saniyelerinden alınmış gerçekçi bir kare dizisiyle, kaydırdıkça yüzeydeki ışığa doğru yükselir.
 *  - Kareler bölüme 1,5 ekran kala, önce kaba sonra ince sırayla, sıkıştırılmış hâlde (Blob) indirilir.
 *  - Çözme ana iş parçacığının dışında yapılır (createImageBitmap); bellekte en çok 12 kare (mobilde 8) tutulur.
 *  - Tuvale yalnızca kare numarası değişince çizilir; bölüm çok uzaktayken çözülmüş kareler bırakılır.
 *  - HUD derinliği, genel derinlik göstergesinin kaldığı yerden sıfıra sayar; yüzeyde vizör kilitlenir.
 *  - Hareketi azalt, düşük bellek ve veri tasarrufu: tuval yok, kısa bir sabit kare geçişi.
 * API: D6Cine.mountAscent(section, opts) → { dispose }
 */
(function () {
  'use strict';
  var C = window.D6Cine = window.D6Cine || {};
  if (typeof C.mountAscent === 'function') return;

  var root = document.documentElement;
  var hasIO = typeof window.IntersectionObserver === 'function';
  var hasRO = typeof window.ResizeObserver === 'function';
  var hasPromise = typeof window.Promise === 'function';
  var hasRaf = typeof window.requestAnimationFrame === 'function';
  var canFetch = typeof window.fetch === 'function' && typeof window.Blob === 'function';
  // flips to false the first time an engine refuses to turn a frame Blob into a bitmap
  var cibOK = typeof window.createImageBitmap === 'function';

  // The frame index runs over the first 90% of the scroll; the last 10% holds the surface shot.
  var SCRUB_END = 0.9;
  var END_ON = 0.88, END_OFF = 0.84;   // end text (with hysteresis so it never flickers at the edge)
  var LOCK_ON = 0.9, LOCK_OFF = 0.86;  // viewfinder lock-on + surface HUD
  var EASE = 0.35;                     // share of the remaining distance covered per 60 Hz frame (film-like inertia)
  var FETCHES = 4, DECODES = 3;
  var LRU_D = 12, LRU_M = 8;
  var DPR_MAX = 1.5, BACK_MAX = 1600;
  var SET_MQ = '(max-width: 760px), (orientation: portrait)';
  var COPY = {
    kick: 'YÜKSELİŞ',
    surface: '0,0 m · YÜZEY',
    surfaceStatic: '0 m · YÜZEY',
    title: 'Yüzeye çıktık.',
    sub: 'Bir sonraki dalışta görüşmek üzere.',
    media: 'D6-ROV derinlikten yüzeydeki ışığa doğru yükseliyor.'
  };

  /* ---------- helpers ---------- */
  function noop() {}
  function now() { return window.performance && typeof performance.now === 'function' ? performance.now() : Date.now(); }
  function raf(f) { return hasRaf ? window.requestAnimationFrame(f) : setTimeout(function () { f(now()); }, 16); }
  function caf(id) { if (hasRaf) window.cancelAnimationFrame(id); else clearTimeout(id); }
  var idle = typeof window.requestIdleCallback === 'function'
    ? function (f) { var id = window.requestIdleCallback(f, { timeout: 300 }); return function () { window.cancelIdleCallback(id); }; }
    : function (f) { var id = setTimeout(f, 24); return function () { clearTimeout(id); }; };
  function media(q) { return typeof window.matchMedia === 'function' ? window.matchMedia(q) : null; }
  function listenMq(m, fn) {
    if (!m) return noop;
    if (typeof m.addEventListener === 'function') {
      m.addEventListener('change', fn);
      return function () { m.removeEventListener('change', fn); };
    }
    if (typeof m.addListener === 'function') {
      m.addListener(fn);
      return function () { m.removeListener(fn); };
    }
    return noop;
  }
  function el(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function hide(e) { e.setAttribute('aria-hidden', 'true'); return e; }
  function drop(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function pad3(i) { var s = String(i); return s.length >= 3 ? s : ('00' + s).slice(-3); }
  // Turkish decimal comma: 7.4 -> '7,4'
  function decimalTr(v) { return v.toFixed(1).replace('.', ','); }
  function closeBitmap(b) {
    if (b && typeof b.close === 'function') { try { b.close(); } catch (err) { /* already closed */ } }
  }

  function normSet(s) {
    if (!s || !(s.n >= 1)) return null;
    // blobs / fails live on the set, so a rebuild (e.g. a reduced-motion toggle) never downloads twice
    return { n: Math.floor(s.n), w: +s.w || 0, h: +s.h || 0, path: String(s.path || ''), ext: String(s.ext || '.webp'), blobs: [], fails: [] };
  }
  function frameUrl(set, i) { return set.path + pad3(i) + set.ext; }

  // Coarse to fine: the first and last frame, then every 8th, every 4th, every 2nd, then the rest.
  function coarseOrder(n) {
    var out = [], seen = {}, steps = [8, 4, 2, 1], s, i;
    function add(k) { if (k >= 0 && k < n && !seen[k]) { seen[k] = true; out.push(k); } }
    add(0);
    add(n - 1);
    for (s = 0; s < steps.length; s++) { for (i = 0; i < n; i += steps[s]) add(i); }
    return out;
  }

  // Source rect that fills the canvas like object-fit: cover, centred.
  function coverRect(iw, ih, cw, ch) {
    var s = Math.max(cw / iw, ch / ih), sw = cw / s, sh = ch / s;
    return { iw: iw, ih: ih, cw: cw, ch: ch, sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw: sw, sh: sh };
  }

  // The renders ship as name.webp (1600w) with name-800.webp and a 32px name-lq.webp beside them.
  function isRender(src) { return /(^|\/)img\/renders\/[^\/]+\.webp$/.test(src) && !/-(lq|800)\.webp$/.test(src); }
  // Tiny blurred twin of a still for the focus pull: opts.lq[j], or the render's own name-lq.webp.
  function lqFor(opts, j, src) {
    if (opts.lq && opts.lq[j]) return String(opts.lq[j]);
    return isRender(src) ? src.replace(/\.webp$/, '-lq.webp') : '';
  }
  // Small screens (and save-data browsers) take the 800w render; a cover-fit 16:9 shot is 178vh wide in tall viewports.
  var RENDER_SIZES = '(max-aspect-ratio: 16/9) 178vh, 100vw';
  function srcsetFor(src) {
    return isRender(src) ? src.replace(/\.webp$/, '-800.webp') + ' 800w, ' + src + ' 1600w' : '';
  }

  function liteNow() {
    var f = C.flags;
    if (f && typeof f.lite === 'boolean') return f.lite;
    var nav = window.navigator || {}, conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
    return (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) || !!(conn && conn.saveData);
  }

  /* ---------- frame decoding ---------- */
  // Fallback decoder: <img> + decode(). A Blob goes in through an object URL, otherwise the frame URL itself.
  function viaImage(blob, url) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), obj = '';
      if (blob && window.URL && typeof window.URL.createObjectURL === 'function') obj = window.URL.createObjectURL(blob);
      function free() { if (obj) { window.URL.revokeObjectURL(obj); obj = ''; } }
      img.decoding = 'async';
      img.onload = function () {
        img.onload = img.onerror = null;
        function ok() { free(); resolve(img); }
        if (typeof img.decode === 'function') img.decode().then(ok, ok);
        else ok();
      };
      img.onerror = function () {
        img.onload = img.onerror = null;
        free();
        reject(new Error('ascent frame failed: ' + url));
      };
      img.src = obj || url;
    });
  }
  function decodeFrame(blob, url) {
    if (blob && cibOK) {
      // createImageBitmap decodes off the main thread
      return window.createImageBitmap(blob).then(null, function () {
        cibOK = false;
        return viaImage(blob, url);
      });
    }
    return viaImage(blob, url);
  }

  /* ---------- shared DOM ---------- */
  // section#yuzey.asc[data-cine=ascent] > div.asc-stage[data-vf] > media, vignette, fades, HUD, end text
  function buildShell(section) {
    section.classList.add('asc');
    section.setAttribute('data-cine', 'ascent');

    var stage = el('div', 'asc-stage');
    stage.setAttribute('data-vf', '');
    var frame = el('div', 'asc-media', stage);
    frame.setAttribute('role', 'img');
    frame.setAttribute('aria-label', COPY.media);
    hide(el('span', 'cine-vignette asc-vig', stage));
    hide(el('span', 'asc-fade', stage));
    hide(el('span', 'asc-scrim', stage));

    // depth readout; it changes constantly, so it stays out of the accessibility tree (.cine-live: fx.js ignores it)
    var hud = hide(el('div', 'asc-hud cine-live', stage));
    var kick = el('span', 'asc-hud-k', hud);
    el('i', 'asc-pulse', kick);
    kick.appendChild(document.createTextNode(COPY.kick));
    var depth = el('span', 'asc-depth', hud);

    var end = el('div', 'asc-end', stage);
    var title = el('h2', 'asc-end__t', end, COPY.title);
    el('p', 'asc-end__s', end, COPY.sub);

    var labelled = false;
    if (!section.hasAttribute('aria-label') && !section.hasAttribute('aria-labelledby')) {
      var id = 'yuzey-baslik', u = 1;
      while (document.getElementById(id)) id = 'yuzey-baslik-' + (++u);
      title.id = id;
      section.setAttribute('aria-labelledby', id);
      labelled = true;
    }
    section.appendChild(stage);

    return {
      stage: stage, frame: frame, hud: hud, depth: depth, end: end,
      remove: function () {
        drop(stage);
        section.classList.remove('asc', 'asc--static', 'asc--rm', 'is-drawn', 'is-end');
        section.removeAttribute('data-cine');
        if (labelled) section.removeAttribute('aria-labelledby');
      }
    };
  }

  /* ---------- full path: sticky stage + scroll-scrubbed canvas ---------- */
  function buildScrub(section, opts, sets) {
    var cv = document.createElement('canvas');
    var ctx = null;
    try { ctx = cv.getContext ? cv.getContext('2d', { alpha: false }) : null; } catch (err) { ctx = null; }
    if (!ctx) return null;

    var shell = buildShell(section);
    var stage = shell.stage, frame = shell.frame;
    var poster = el('img', 'asc-still', frame);
    poster.alt = '';
    poster.decoding = 'async';
    poster.setAttribute('loading', 'lazy');
    poster.setAttribute('draggable', 'false');
    cv.className = 'asc-cv';
    hide(cv);
    frame.appendChild(cv);

    var gaugeMax = opts.gaugeMax > 0 ? +opts.gaugeMax : 30;
    var mqSet = media(SET_MQ);
    var set = pickSet(), n = set.n, cap = set === sets.m ? LRU_M : LRU_D;

    // scrub state
    var p = 0, target = 0, cur = 0, dir = 1, snapNext = true, loop = 0, lastT = 0;
    // drawing state
    var wantIdx = -1, drawn = -1, isDrawn = false, rect = null, cssW = 0, cssH = 0;
    // decoded bitmaps: an LRU keyed by frame index; gen invalidates decodes that resolve after a release
    var cache = {}, cacheN = 0, clock = 0, decoding = {}, decN = 0, decFails = {}, gen = 0;
    // downloads: compressed Blobs, coarse to fine; fgen invalidates callbacks after a set switch or teardown
    var near = false, fetchOn = false, useFetch = canFetch, gotBlob = false;
    var queue = [], inflight = 0, fgen = 0, ctrls = [], idles = [];
    // HUD / classes
    var d0 = gaugeMax, hudText = '', endOn = false, lockOn = false;
    var torn = false, fpH = null, scrubH = null, nearIO = null, farIO = null, ro = null, onWinResize = null;

    function pickSet() {
      var mob = !!(mqSet && mqSet.matches);
      return (mob ? sets.m : sets.d) || sets.d || sets.m;
    }
    function hasSrc(k) { return !useFetch || !!set.blobs[k]; }
    function isCached(k) { return !!cache[k]; }
    function nearest(i, test) {
      for (var d = 0; d < n; d++) {
        if (i - d >= 0 && test(i - d)) return i - d;
        if (d && i + d < n && test(i + d)) return i + d;
      }
      return -1;
    }

    function setPoster() {
      var src = frameUrl(set, 0);
      if (poster.getAttribute('src') !== src) poster.setAttribute('src', src);
      if (typeof C.focusPull === 'function') {
        var h = C.focusPull(poster);
        if (!fpH) fpH = h;
      }
    }

    /* downloads */
    function later(fn) {
      var cancel = null, fired = false;
      cancel = idle(function () {
        fired = true;
        var at = idles.indexOf(cancel);
        if (at >= 0) idles.splice(at, 1);
        fn();
      });
      if (!fired) idles.push(cancel);
    }
    function untrack(ac) {
      var at = ac ? ctrls.indexOf(ac) : -1;
      if (at >= 0) ctrls.splice(at, 1);
    }
    function abortAll() {
      var list = ctrls;
      ctrls = [];
      for (var j = 0; j < list.length; j++) { try { list[j].abort(); } catch (err) { /* already settled */ } }
    }
    function startFetch() {
      if (fetchOn || torn) return;
      fetchOn = true;
      if (!useFetch) return;
      var order = coarseOrder(n);
      queue = [];
      for (var j = 0; j < order.length; j++) { if (!set.blobs[order[j]]) queue.push(order[j]); }
      for (j = 0; j < FETCHES; j++) fetchNext();
    }
    function fetchNext() {
      if (torn || !useFetch || inflight >= FETCHES || !queue.length) return;
      var k = queue.shift(), s = set, g = fgen;
      if (s.blobs[k]) { fetchNext(); return; }
      inflight++;
      var ac = typeof window.AbortController === 'function' ? new window.AbortController() : null;
      if (ac) ctrls.push(ac);
      window.fetch(frameUrl(s, k), ac ? { signal: ac.signal } : undefined).then(function (r) {
        if (!r.ok) {
          var er = new Error('HTTP ' + r.status);
          er.http = true;
          throw er;
        }
        return r.blob();
      }).then(function (b) {
        untrack(ac);
        if (torn) return;
        s.blobs[k] = b;
        gotBlob = true;
        if (g !== fgen) return;
        inflight--;
        if (near) pump();
        later(fetchNext);
      }, function (err) {
        untrack(ac);
        if (torn || g !== fgen) return;
        inflight--;
        if (!(err && err.http) && !gotBlob) {
          // fetch cannot reach the frames here (e.g. a page opened from file://): decode straight from the URLs
          useFetch = false;
          queue = [];
          if (near) pump();
          return;
        }
        s.fails[k] = (s.fails[k] || 0) + 1;
        if (s.fails[k] < 2) queue.push(k);
        later(fetchNext);
      });
    }
    // move frames the visitor is waiting for to the front of the download queue
    function prioritize(list) {
      if (!useFetch || !fetchOn) return;
      for (var j = list.length - 1; j >= 0; j--) {
        var at = queue.indexOf(list[j]);
        if (at > 0) { queue.splice(at, 1); queue.unshift(list[j]); }
      }
    }

    /* decoding + LRU */
    function decode(k) {
      var s = set, g = gen;
      decoding[k] = true;
      decN++;
      decodeFrame(s.blobs[k] || null, frameUrl(s, k)).then(function (b) {
        if (torn || g !== gen) { closeBitmap(b); return; }
        delete decoding[k];
        decN--;
        cache[k] = { b: b, t: ++clock };
        cacheN++;
        evict();
        if (!s.w || !s.h) {
          // the manifest had no size: take it from the first frame and size the canvas for it
          s.w = b.naturalWidth || b.width;
          s.h = b.naturalHeight || b.height;
          sizeCanvas(true);
        }
        // a decode that lands after the visitor left the near zone waits for the next approach: no loop off screen
        if (near) kick();
        pump();
      }, function () {
        if (torn || g !== gen) return;
        delete decoding[k];
        decN--;
        decFails[k] = (decFails[k] || 0) + 1;
        pump();
      });
    }
    function evict() {
      var k, i, worst, wt;
      while (cacheN > cap) {
        worst = -1;
        wt = Infinity;
        for (k in cache) {
          i = +k;
          if (Math.abs(i - wantIdx) <= 3) continue; // never drop the frames around the playhead
          if (cache[k].t < wt) { wt = cache[k].t; worst = i; }
        }
        if (worst < 0) {
          for (k in cache) { if (cache[k].t < wt) { wt = cache[k].t; worst = +k; } }
        }
        if (worst < 0) return;
        closeBitmap(cache[worst].b);
        delete cache[worst];
        cacheN--;
      }
    }
    // decode the playhead frame and up to 3 ahead in the scroll direction (plus one behind)
    function pump() {
      if (torn || !near || wantIdx < 0) return;
      var i = wantIdx, list = [i, i + dir, i + 2 * dir, i + 3 * dir, i - dir], miss = [], j, k;
      for (j = 0; j < list.length; j++) {
        k = list[j];
        if (k < 0 || k >= n || cache[k] || decoding[k] || decFails[k] >= 2) continue;
        if (hasSrc(k)) { if (decN < DECODES) decode(k); }
        else miss.push(k);
      }
      if (!miss.length) return;
      prioritize(miss);
      // until the exact frame has arrived, decode the closest downloaded one as a stand-in
      if (!cache[i] && !decoding[i] && decN < DECODES) {
        var s = nearest(i, function (x) { return !!cache[x] || !!decoding[x] || (hasSrc(x) && !(decFails[x] >= 2)); });
        if (s >= 0 && !cache[s] && !decoding[s]) decode(s);
      }
    }
    function releaseAll() {
      gen++;
      decoding = {};
      decN = 0;
      for (var k in cache) closeBitmap(cache[k].b);
      cache = {};
      cacheN = 0;
      // the canvas keeps its last picture; only the decoded copies are freed
    }

    /* drawing */
    function paint(k) {
      var e = cache[k], b = e.b;
      e.t = ++clock;
      var iw = b.naturalWidth || b.width, ih = b.naturalHeight || b.height, cw = cv.width, ch = cv.height;
      if (!iw || !ih) return false;
      if (!rect || rect.iw !== iw || rect.ih !== ih || rect.cw !== cw || rect.ch !== ch) rect = coverRect(iw, ih, cw, ch);
      try { ctx.drawImage(b, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, cw, ch); } catch (err) { return false; }
      drawn = k;
      if (!isDrawn) { isDrawn = true; section.classList.add('is-drawn'); }
      return true;
    }
    // drawImage runs only when the rounded frame index changes (or a closer frame has just been decoded)
    function render() {
      var i = Math.round(cur);
      if (i < 0) i = 0;
      else if (i > n - 1) i = n - 1;
      if (i !== wantIdx) { wantIdx = i; pump(); }
      if (drawn === i) return;
      if (cache[i]) { paint(i); return; }
      var k = nearest(i, isCached);
      if (k >= 0 && k !== drawn && (drawn < 0 || Math.abs(k - i) < Math.abs(drawn - i))) paint(k);
    }
    function writeHud() {
      var s;
      if (lockOn) s = COPY.surface;
      else {
        var d = d0 * (1 - (n > 1 ? cur / (n - 1) : 1));
        s = d < 0.05 ? '0,0 m' : '−' + decimalTr(d) + ' m';
      }
      if (s !== hudText) { hudText = s; shell.depth.textContent = s; }
    }
    function tick(t) {
      loop = 0;
      if (torn) return;
      var dt = lastT ? Math.min(100, Math.max(1, t - lastT)) : 16.7;
      lastT = t;
      var d = target - cur;
      if (d !== 0) {
        dir = d > 0 ? 1 : -1;
        // frame-rate independent version of cur += d * .35 per 60 Hz frame
        if (Math.abs(d) < 0.02) cur = target;
        else cur += d * (1 - Math.pow(1 - EASE, dt / 16.7));
      }
      render();
      writeHud();
      if (cur !== target) loop = raf(tick);
      else lastT = 0;
    }
    function kick() { if (!loop && !torn) loop = raf(tick); }

    /* measuring: only on mount, resize, load and when the section comes near; never in the scroll path */
    function measureDepth() {
      var se = document.scrollingElement || root;
      var vh = window.innerHeight || se.clientHeight || 1;
      var max = se.scrollHeight - vh;
      var top = section.getBoundingClientRect().top + (window.pageYOffset || se.scrollTop || 0);
      // the global gauge reads scrollTop / maxScroll × max; the HUD picks up where it stops
      var v = max > 0 ? top / max * gaugeMax : gaugeMax;
      v = v < 0 ? 0 : (v > gaugeMax ? gaugeMax : v);
      if (Math.abs(v - d0) > 0.001) { d0 = v; writeHud(); }
    }
    function sizeCanvas(force) {
      if (!cssW || !cssH) return;
      var dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
      var sw = set.w || 1280, sh = set.h || 720;
      // never wider than the part of the frame that cover-fit shows: past that the GPU's upscale looks identical and costs nothing
      var shown = Math.min(sw, sh * cssW / cssH);
      var bw = Math.max(1, Math.round(Math.min(cssW * dpr, BACK_MAX, shown)));
      var bh = Math.max(1, Math.round(bw * cssH / cssW));
      if (!force && bw === cv.width && bh === cv.height) return;
      if (bw !== cv.width || bh !== cv.height) {
        cv.width = bw; // resizing clears the canvas
        cv.height = bh;
      }
      rect = null;
      drawn = -1;
      render();
      // nothing decoded to repaint with: show the poster instead of a black canvas
      if (drawn < 0 && isDrawn) { isDrawn = false; section.classList.remove('is-drawn'); }
    }
    function measure() {
      if (torn) return;
      measureDepth();
      var w = stage.clientWidth, h = stage.clientHeight;
      if (w > 0 && h > 0 && (w !== cssW || h !== cssH)) {
        cssW = w;
        cssH = h;
        sizeCanvas(false);
      }
    }
    function onLoad() { measure(); }

    /* scroll progress from the shared core: target frame, end text, lock-on */
    function onProgress(v) {
      if (torn) return;
      p = v;
      target = clamp01(p / SCRUB_END) * (n - 1);
      if (!near) {
        // off screen (core's last call on leaving, or a resize): keep the state, run no loop, land on the frame later
        cur = target;
        snapNext = true;
      } else if (snapNext) {
        snapNext = false;
        cur = target;
      }
      var e = endOn ? p > END_OFF : p > END_ON;
      if (e !== endOn) { endOn = e; section.classList.toggle('is-end', e); }
      var l = lockOn ? p > LOCK_OFF : p > LOCK_ON;
      if (l !== lockOn) {
        lockOn = l;
        stage.classList.toggle('is-locked', l);
        shell.hud.classList.toggle('is-surface', l);
      }
      if (near) kick();
    }

    /* phone / portrait <-> desktop frames */
    function onSetChange() {
      var s = pickSet();
      if (torn || s === set) return;
      fgen++;
      abortAll(); // the other cut's downloads give way; whatever already arrived stays on its set
      inflight = 0;
      queue = [];
      releaseAll();
      set = s;
      n = s.n;
      cap = s === sets.m ? LRU_M : LRU_D;
      target = clamp01(p / SCRUB_END) * (n - 1);
      cur = target;
      wantIdx = -1;
      drawn = -1;
      rect = null;
      decFails = {};
      setPoster();
      cssW = cssH = 0; // the new frames have another size: re-measure the backing store
      measure();
      if (fetchOn) { fetchOn = false; startFetch(); }
      if (near) { pump(); kick(); }
    }
    var offSet = listenMq(mqSet, onSetChange);

    setPoster();
    writeHud();

    // within 1.5 viewports: download + decode; beyond 3 viewports: free every decoded bitmap (Blobs stay)
    nearIO = new IntersectionObserver(function (list) {
      var e = list[list.length - 1], was = near;
      near = !!e.isIntersecting;
      if (near && !was) {
        measure();
        snapNext = true; // a jump from far away lands on its frame without replaying the frames in between
        startFetch();
        kick();
      }
    }, { rootMargin: '150% 0px' });
    nearIO.observe(section);
    farIO = new IntersectionObserver(function (list) {
      if (!list[list.length - 1].isIntersecting) releaseAll();
    }, { rootMargin: '300% 0px' });
    farIO.observe(section);

    if (hasRO) {
      ro = new ResizeObserver(function () { measure(); });
      ro.observe(stage);
    } else {
      onWinResize = function () { measure(); };
      window.addEventListener('resize', onWinResize);
      measure();
    }
    if (document.readyState !== 'complete') window.addEventListener('load', onLoad);

    scrubH = C.scrub(section, onProgress);

    return function teardown() {
      if (torn) return;
      torn = true;
      fgen++;
      if (loop) { caf(loop); loop = 0; }
      for (var j = 0; j < idles.length; j++) idles[j]();
      idles = [];
      abortAll();
      if (scrubH) scrubH.dispose();
      if (nearIO) nearIO.disconnect();
      if (farIO) farIO.disconnect();
      if (ro) ro.disconnect();
      if (onWinResize) window.removeEventListener('resize', onWinResize);
      window.removeEventListener('load', onLoad);
      offSet();
      if (fpH) fpH.dispose();
      releaseAll();
      // free the backing store now instead of at the next GC
      cv.width = 0;
      cv.height = 0;
      section.style.removeProperty('--p');
      shell.remove();
    };
  }

  /* ---------- static path: reduced motion, low memory, save-data, or no canvas ---------- */
  // No sticky, no canvas. A 100svh stage crossfades the stills at visibility thresholds .2 / .5 / .8;
  // under reduced motion it shows only the last still and the closing line.
  function buildStatic(section, opts, sets, rm) {
    var shell = buildShell(section);
    var stage = shell.stage, frame = shell.frame;
    section.classList.add('asc--static');
    if (rm) section.classList.add('asc--rm');

    var first = sets.d || sets.m;
    var list = opts.stills && opts.stills.length ? opts.stills.slice(0, 3) : (first ? [frameUrl(first, 0)] : []);
    var mqSet = media(SET_MQ);
    var shots = [], idx = -1, io = null, lock = null, torn = false, j;

    for (j = rm ? Math.max(0, list.length - 1) : 0; j < list.length; j++) {
      var w = el('div', 'asc-shot', frame);
      var lq = lqFor(opts, j, String(list[j]));
      if (lq) w.setAttribute('data-lq', lq);
      var img = el('img', null, w);
      img.alt = '';
      img.decoding = 'async';
      img.setAttribute('loading', 'lazy');
      img.setAttribute('draggable', 'false');
      var srcset = srcsetFor(String(list[j]));
      if (srcset) {
        // sizes before srcset, both before src: the browser picks a candidate once
        img.setAttribute('sizes', RENDER_SIZES);
        img.setAttribute('srcset', srcset);
      }
      shots.push({ w: w, img: img, src: String(list[j]), fp: null });
    }

    // the deep frame has a portrait cut for phones
    function srcFor(sh) {
      if (sets.d && sets.m && sh.src === frameUrl(sets.d, 0) && mqSet && mqSet.matches) return frameUrl(sets.m, 0);
      return sh.src;
    }
    function setSrcs() {
      for (var k = 0; k < shots.length; k++) {
        var sh = shots[k], s = srcFor(sh);
        if (sh.img.getAttribute('src') !== s) sh.img.setAttribute('src', s);
        if (typeof C.focusPull === 'function') {
          var h = C.focusPull(sh.img);
          if (!sh.fp) sh.fp = h;
        }
      }
    }
    function show(k) {
      k = k < 0 ? 0 : (k > shots.length - 1 ? shots.length - 1 : k);
      if (k === idx) return;
      idx = k;
      // earlier stills stay on underneath, so each crossfade goes picture to picture without a dark dip
      for (var m = 0; m < shots.length; m++) shots[m].w.classList.toggle('is-on', m <= k);
      var last = k === shots.length - 1;
      section.classList.toggle('is-end', last);
      shell.hud.classList.toggle('is-surface', last);
    }

    shell.depth.textContent = COPY.surfaceStatic;
    setSrcs();
    var offSet = listenMq(mqSet, function () { if (!torn) setSrcs(); });

    if (!shots.length) {
      section.classList.add('is-end');
    } else if (rm || shots.length === 1 || !hasIO) {
      show(shots.length - 1);
    } else {
      show(0);
      io = new IntersectionObserver(function (es) {
        var e = es[es.length - 1];
        if (!e.isIntersecting) {
          // back above the stage: the sequence plays again next time
          if (e.boundingClientRect.top > 0) show(0);
          return;
        }
        var r = e.intersectionRatio, last = shots.length - 1;
        var k = r >= 0.8 ? last : (r >= 0.5 ? Math.min(1, last) : 0);
        if (k > idx) show(k);
      }, { threshold: [0, 0.2, 0.5, 0.8] });
      io.observe(stage);
    }
    if (typeof C.lockWhenVisible === 'function') lock = C.lockWhenVisible(stage);

    return function teardown() {
      if (torn) return;
      torn = true;
      if (io) io.disconnect();
      if (lock && lock.dispose) lock.dispose();
      offSet();
      for (var k = 0; k < shots.length; k++) { if (shots[k].fp && shots[k].fp.dispose) shots[k].fp.dispose(); }
      shell.remove();
    };
  }

  /* ---------- public ---------- */
  function mountAscent(section, opts) {
    if (!section || section.nodeType !== 1) return { dispose: noop };
    if (section.__d6asc && typeof section.__d6asc.dispose === 'function') section.__d6asc.dispose();
    opts = opts || {};
    var sets = { d: normSet(opts.d), m: normSet(opts.m) };
    var mqReduce = media('(prefers-reduced-motion: reduce)');
    var teardown = noop, disposed = false;

    function build() {
      var rm = !!(mqReduce && mqReduce.matches);
      var full = !rm && !liteNow() && hasIO && hasPromise && typeof C.scrub === 'function' && !!(sets.d || sets.m);
      teardown = (full && buildScrub(section, opts, sets)) || buildStatic(section, opts, sets, rm);
    }
    build();
    // switching the OS motion setting while the page is open swaps the scene for the matching path
    var offReduce = listenMq(mqReduce, function () {
      if (disposed) return;
      teardown();
      build();
    });

    var handle = {
      dispose: function () {
        if (disposed) return;
        disposed = true;
        offReduce();
        teardown();
        teardown = noop;
        if (section.__d6asc === handle) section.__d6asc = null;
      }
    };
    section.__d6asc = handle;
    return handle;
  }

  C.mountAscent = mountAscent;
})();
