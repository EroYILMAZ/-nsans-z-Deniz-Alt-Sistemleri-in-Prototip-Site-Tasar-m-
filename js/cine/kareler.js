/*
 * Deniz6 — "Görev anları": stills from the film as expanding panels, plus a lightbox.
 *  - Desktop: six panels side by side; the open one is wide. A passive scroller sees every frame open in turn
 *    (index mapped from the strip's 'cover 30%-70%' window, applied only when it changes). A real pointer
 *    movement (120 ms intent) or keyboard focus takes over. Arrow keys / Home / End with a roving tabindex.
 *    Panels move with transform and open with clip-path (no layout animation); images keep a fixed size.
 *  - Phones / coarse pointers: a horizontal scroll-snap row; the snapped item is the open one.
 *  - CV lock-on: stills with `cv` draw a detection box (SVG, 1600x900 space, xMidYMid slice = object-fit: cover)
 *    and a confidence chip once their panel is open and on screen; the box is clipped to the visible crop.
 *  - Lightbox: one <dialog class="cine-lb"> on <body>. Opens from the open panel with a View Transition
 *    (shared element 'kare') when available; prev / next, ESC, swipe, backdrop click, focus return,
 *    neighbour preloading, 800w -> 1600w focus pull.
 * Scroll work runs only while the strip is on screen, coalesced to one rAF, from offsets cached on resize.
 * Reduced motion: no scroll-driven switching, no transitions, no view transitions.
 * API: D6Cine.mountKareler(host, opts) -> { dispose }.
 */
(function () {
  'use strict';
  var C = window.D6Cine = window.D6Cine || {};

  var ROW_QUERY = '(max-width: 760px), (pointer: coarse)';
  var GAP = 6;             // px between desktop panels (kareler.css: the 6px in the .cc-p transform)
  var GROW = 9;            // the open panel is GROW times as wide as a closed one
  var HYS = 0.12;          // scroll-index hysteresis, in panel units
  var INTENT_MS = 120;     // pointer dwell before a hover takes over from scrolling
  var CHIP_H = 20;         // rendered height of a CV chip (12px line + 2 x 4px padding)
  var CV_PAD = 18;         // px: a CV box is clamped this far inside the visible frame (clear of the viewfinder brackets)
  var MORPH_SETTLE = 650;  // ms a panel needs to finish opening before it can be a close-morph target
  var SIZES = '(max-width: 760px) 84vw, (max-width: 1100px) 60vw, 660px';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var ICON = {
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  var uid = 0;

  /* ---------- helpers ---------- */
  function noop() {}
  function el(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function sv(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }
  function iconBtn(cls, label, title, icon, parent) {
    var b = el('button', cls, parent);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = title;
    b.innerHTML = icon;
    return b;
  }
  function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
  function num(v) { v = +v; return isFinite(v) ? v : 0; }
  function pad(n, w) { var s = String(Math.max(0, Math.round(num(n)))); while (s.length < w) s = '0' + s; return s; }
  // seconds from a number or an 'mm:ss' string
  function secs(t) {
    if (typeof t === 'number') return t;
    var m = /^(\d+):(\d+(?:\.\d+)?)$/.exec(String(t == null ? '' : t).trim());
    return m ? (+m[1]) * 60 + (+m[2]) : num(t);
  }
  function fmtT(t) {
    if (typeof t === 'string' && t.indexOf(':') > -1) return t;
    var s = Math.floor(secs(t));
    return pad(Math.floor(s / 60), 2) + ':' + pad(s % 60, 2);
  }
  // 'KARE 0540': the explicit frame number, otherwise t x 30 fps
  function frameNo(s) {
    var f = s.frame;
    if (f != null && f !== '' && isFinite(+f)) return pad(+f, 4);
    if (typeof f === 'string' && f) return f;
    return pad(secs(s.t) * 30, 4);
  }
  function labelOf(s) { return s.label || ('KARE ' + frameNo(s)); }
  function chipW(tag) { return String(tag || '').length * 7.3 + 16; }
  function mq(q) { try { return window.matchMedia ? window.matchMedia(q) : null; } catch (e) { return null; } }
  function listen(m, fn) { if (!m) return; if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); }
  function unlisten(m, fn) { if (!m) return; if (m.removeEventListener) m.removeEventListener('change', fn); else if (m.removeListener) m.removeListener(fn); }
  function focusVisible(n) { try { return n.matches(':focus-visible'); } catch (e) { return true; } }
  function focusQuiet(n) { if (!n || !n.focus) return; try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } }
  function absUrl(u) { try { return new URL(u, document.baseURI).href; } catch (e) { return String(u); } }
  function cssUrl(u) { return 'url("' + String(u).replace(/["\\]/g, '\\$&').replace(/[\r\n]/g, '') + '")'; }
  function decodeOf(img) { try { return img.decode ? img.decode() : null; } catch (e) { return null; } }
  // resolves when p settles or after ms, whichever is first: a view transition must never wait on the network
  function settle(p, ms) {
    return new Promise(function (res) {
      var t = setTimeout(res, ms);
      function fin() { clearTimeout(t); res(); }
      if (p && typeof p.then === 'function') p.then(fin, fin);
      else fin();
    });
  }
  // CV overlay: an SVG box in the still's own 1600x900 space and an HTML chip with a constant text size
  function buildCv(parent, svgCls, chipCls) {
    var svg = sv('svg', { 'class': svgCls, viewBox: '0 0 1600 900', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', focusable: 'false' }, parent);
    var path = sv('path', { 'class': 'cc-cv-box', pathLength: '1', d: 'M0 0' }, svg);
    var chip = el('span', chipCls, parent);
    chip.setAttribute('aria-hidden', 'true');
    return { svg: svg, path: path, chip: chip, cv: null };
  }
  function setCvBox(o, cv) {
    o.cv = cv;
    o.chip.textContent = cv.tag || '';
    drawBox(o, num(cv.x), num(cv.y), num(cv.x) + num(cv.w), num(cv.y) + num(cv.h));
  }
  function r1(v) { return Math.round(v * 10) / 10; }
  function drawBox(o, x0, y0, x1, y1) {
    o.path.setAttribute('d', 'M' + r1(x0) + ' ' + r1(y0) + 'H' + r1(x1) + 'V' + r1(y1) + 'H' + r1(x0) + 'Z');
  }
  // the CV box in 1600x900 units, clamped to the part of the still that is on screen (vx0..vx1, vy0..vy1) minus a
  // pad, the way a detector clips its boxes to the frame; a box that would collapse keeps its own coordinates
  function clampBox(cv, vx0, vy0, vx1, vy1, pad) {
    var x0 = num(cv.x), y0 = num(cv.y), x1 = x0 + num(cv.w), y1 = y0 + num(cv.h);
    var cx0 = Math.max(x0, vx0 + pad), cy0 = Math.max(y0, vy0 + pad);
    var cx1 = Math.min(x1, vx1 - pad), cy1 = Math.min(y1, vy1 - pad);
    if (cx1 - cx0 < pad * 2 || cy1 - cy0 < pad * 2) return { x0: x0, y0: y0, x1: x1, y1: y1 };
    return { x0: cx0, y0: cy0, x1: cx1, y1: cy1 };
  }

  C.mountKareler = function mountKareler(host, opts) {
    opts = opts || {};
    var core = window.D6Cine || C;
    var flags = core.flags || {};
    var stills = (opts.stills || []).filter(function (s) { return s && s.src; });
    if (!host || host.nodeType !== 1 || !stills.length) return { dispose: noop };

    var mqReduce = mq('(prefers-reduced-motion: reduce)'), mqRow = mq(ROW_QUERY);
    var reduce = !!((mqReduce && mqReduce.matches) || flags.reduce);
    var lite = !!flags.lite;
    var canVT = typeof document.startViewTransition === 'function';
    var duration = num(opts.duration) || 30;
    var totalFrames = num(opts.totalFrames) || Math.round(duration * 30);
    var docEl = document.documentElement;
    var id = 'cc' + (++uid);

    // strip order: ids from opts.strip, else the first six stills; panelOf maps a still index to its panel (-1 if none)
    var byId = {}, order = [], panelOf = [], i;
    for (i = 0; i < stills.length; i++) { if (stills[i].id != null) byId[stills[i].id] = i; panelOf.push(-1); }
    (opts.strip || []).forEach(function (sid) {
      if (Object.prototype.hasOwnProperty.call(byId, sid) && order.indexOf(byId[sid]) < 0) order.push(byId[sid]);
    });
    if (!order.length) for (i = 0; i < Math.min(6, stills.length); i++) order.push(i);
    order.forEach(function (si, k) { panelOf[si] = k; });
    var n = order.length;

    /* ---------- state ---------- */
    var disposed = false, row = false, modeSet = false, visible = false, lockVis = false;
    var openIdx = -1, openedAt = 0, scrollIdx = 0;
    var stripTop = 0, stripH = 1, vh = window.innerHeight || 800;
    var pointerOwned = false, focusOwned = false, hoverK = -1, intentT = 0, lx = null, ly = null;
    var downPanel = null, downOpen = false;
    var raf = 0, measureRaf = 0, sizingRaf = 0, modeRaf = 0, lbResRaf = 0, lockRaf = 0;
    var rowIO = null, vio = null, ro = null;
    var lbOpen = false, lbIdx = 0, lbW = 1280, opener = null, busy = false, pendingDelta = 0, pendingClose = false, seq = 0, vtNow = null;
    var pre = {}, pulls = [];
    var sid = null, sx = 0, sy = 0, swallow = false;

    /* ---------- strip DOM ---------- */
    host.classList.add('cc-host');
    var strip = el('div', 'cc', host);
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', 'Film kareleri');
    var panels = [], thumbs = [], cvs = [];
    order.forEach(function (si, k) {
      var s = stills[si];
      var b = el('button', 'cc-p', strip);
      b.type = 'button';
      b.tabIndex = -1;
      b.setAttribute('data-i', String(k));
      b.setAttribute('data-vf', '');
      b.style.setProperty('--i', String(k));
      b.setAttribute('aria-label', 'Kareyi aç: ' + labelOf(s));

      var media = el('span', 'cc-media', b);
      if (s.lq) { media.setAttribute('data-lq', s.lq); media.style.backgroundImage = cssUrl(s.lq); }
      var img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.setAttribute('loading', 'lazy');
      img.decoding = 'async';
      if (s.src800 && s.src800 !== s.src) { img.sizes = SIZES; img.srcset = s.src800 + ' 800w, ' + s.src + ' 1600w'; }
      img.src = s.src800 || s.src;
      media.appendChild(img);

      el('span', 'cc-shade', b);
      el('span', 'cc-grad', b);
      if (s.cv) {
        var ov = el('span', 'cc-ov', b);
        var o = buildCv(ov, 'cc-cv', 'cc-chip');
        setCvBox(o, s.cv);
        cvs.push(o);
      }
      el('span', 'cc-label', b, labelOf(s)).setAttribute('aria-hidden', 'true');
      var cap = el('span', 'cc-cap', b);
      cap.id = id + '-cap' + k;
      el('span', 'cc-cap-t', cap, s.cap || '');
      el('span', 'cc-cap-m', cap, 'KARE ' + frameNo(s) + ' · ' + fmtT(s.t));
      b.setAttribute('aria-describedby', cap.id);
      el('span', 'cc-zoom', b, 'BÜYÜT ⤢').setAttribute('aria-hidden', 'true');

      panels.push(b);
      thumbs.push(img);
    });

    // film timeline under the strip: one tick per panel at its time in the film, an amber head on the open one
    var tl = el('div', 'cc-tl', host);
    tl.setAttribute('aria-hidden', 'true');
    var tlTrack = el('div', 'cc-tl-track', tl);
    order.forEach(function (si) { el('i', null, tlTrack).style.left = tlPct(stills[si].t) + '%'; });
    var tlHead = el('b', null, tlTrack);
    function tlPct(t) { return Math.max(0, Math.min(100, secs(t) / duration * 100)).toFixed(2); }

    /* ---------- lightbox DOM ---------- */
    var dlg = el('dialog', 'cine-lb', document.body);
    dlg.setAttribute('aria-label', 'Kare görüntüleyici');
    var inner = el('div', 'cine-lb__inner', dlg);
    var closeB = iconBtn('cine-lb__btn cine-lb__close', 'Kapat', 'Kapat (ESC)', ICON.close, inner);
    closeB.setAttribute('autofocus', '');
    var fig = el('figure', 'cine-lb__fig', inner);
    var frame = el('div', 'cine-lb__frame', fig);
    frame.setAttribute('data-vf', '');
    var pic = el('div', 'cine-lb__pic', frame);
    var lbImg = el('img', 'cine-lb__img', pic);
    lbImg.alt = '';
    lbImg.decoding = 'async';
    lbImg.draggable = false;
    var hi = el('img', 'cine-lb__hi', pic);
    hi.alt = '';
    hi.decoding = 'async';
    hi.draggable = false;
    hi.setAttribute('aria-hidden', 'true');
    var lbCv = buildCv(pic, 'cine-lb__cv', 'cc-chip cine-lb__chip');
    var capEl = el('figcaption', 'cine-lb__cap', fig);
    capEl.setAttribute('aria-live', 'polite');
    var capTxt = el('span', 'cine-lb__txt', capEl);
    var meta = el('span', 'cine-lb__meta', capTxt);
    var text = el('span', 'cine-lb__text', capTxt);
    var count = el('span', 'cine-lb__count', capEl);
    var nav = el('div', 'cine-lb__nav', inner);
    var prevB = iconBtn('cine-lb__btn cine-lb__prev', 'Önceki kare', 'Önceki kare (←)', ICON.prev, nav);
    el('span', 'cine-lb__hint', nav, 'ESC · ← →').setAttribute('aria-hidden', 'true');
    var nextB = iconBtn('cine-lb__btn cine-lb__next', 'Sonraki kare', 'Sonraki kare (→)', ICON.next, nav);
    if (stills.length < 2) { prevB.hidden = true; nextB.hidden = true; }

    /* ---------- panels ---------- */
    function panelFrom(t) {
      var p = t && t.closest ? t.closest('.cc-p') : null;
      return p && p.parentNode === strip ? p : null;
    }
    function setOpen(k) {
      if (disposed || k < 0 || k >= n || k === openIdx) return;
      if (openIdx >= 0) {
        var o = panels[openIdx];
        o.classList.remove('is-open', 'is-locked');
        o.tabIndex = -1;
      }
      openIdx = k;
      openedAt = now();
      var p = panels[k];
      p.classList.add('is-open');
      p.tabIndex = 0;
      if (lockVis) p.classList.add('is-locked');
      strip.style.setProperty('--o', String(k));
      tlHead.style.transform = 'translateX(' + tlPct(stills[order[k]].t) + '%)';
    }
    // the viewfinder (and the CV box) lock onto the open panel only while the strip is on screen
    function setLockVis(v) {
      if (v === lockVis) return;
      lockVis = v;
      if (openIdx >= 0) panels[openIdx].classList.toggle('is-locked', v);
    }

    /* ---------- geometry (read on resize / visibility only, never per frame) ---------- */
    function layout(W, H) {
      if (disposed) return;
      var mw, mh;
      if (row) {
        mw = panels[0].clientWidth;
        mh = panels[0].clientHeight;
      } else {
        var unit = Math.max(0, W - GAP * (n - 1)) / (GROW + n - 1);
        mw = unit * GROW;
        mh = H;
        // new sizes land without animating; transitions come back on the next frame
        strip.classList.add('is-sizing');
        strip.style.setProperty('--openW', mw.toFixed(2) + 'px');
        strip.style.setProperty('--closedW', unit.toFixed(2) + 'px');
        if (!sizingRaf) sizingRaf = requestAnimationFrame(function () { sizingRaf = 0; strip.classList.remove('is-sizing'); });
      }
      placeCv(mw, mh);
    }
    // every panel's media box is mw x mh, so one cover-fit scale serves all CV overlays
    function placeCv(mw, mh) {
      if (!(mw > 0 && mh > 0)) return;
      var s = Math.max(mw / 1600, mh / 900), ox = (mw - 1600 * s) / 2, oy = (mh - 900 * s) / 2;
      cvs.forEach(function (o) {
        var cv = o.cv, b = clampBox(cv, -ox / s, -oy / s, (mw - ox) / s, (mh - oy) / s, CV_PAD / s);
        var x = ox + b.x0 * s, y = oy + b.y0 * s, inside = false;
        var cy = y - CHIP_H - 6;
        if (cy < CV_PAD) { cy = y + 6; inside = true; } // no room above the box: tuck the chip inside its top edge
        var cx = Math.max(CV_PAD, Math.min(x + (inside ? 6 : 0), mw - chipW(cv.tag) - CV_PAD));
        drawBox(o, b.x0, b.y0, b.x1, b.y1);
        o.path.setAttribute('stroke-width', (1.6 / s).toFixed(2));
        o.chip.style.left = cx.toFixed(1) + 'px';
        o.chip.style.top = cy.toFixed(1) + 'px';
      });
    }
    function relayout() { layout(strip.clientWidth, strip.clientHeight); }
    function scheduleMeasure() { if (!measureRaf && !disposed) measureRaf = requestAnimationFrame(measure); }
    function measure() {
      measureRaf = 0;
      if (disposed) return;
      var r = strip.getBoundingClientRect();
      stripTop = r.top + (window.pageYOffset || 0);
      stripH = r.height || 1;
      vh = window.innerHeight || vh;
      update();
    }
    function onScroll() { if (!raf && !row && !reduce && !lbOpen) raf = requestAnimationFrame(tick); }
    function tick() { raf = 0; update(); }
    // the strip's progress over its 'cover 30%-70%' window, as a panel index; applied only when it changes
    function update() {
      if (disposed || row || reduce || lbOpen || n < 2) return;
      var top = stripTop - (window.pageYOffset || 0);
      var pc = (vh - top) / (vh + stripH);
      var p = (pc - 0.3) / 0.4;
      p = p < 0 ? 0 : (p > 1 ? 1 : p);
      var raw = Math.min(n - 0.001, p * n);
      if (raw < scrollIdx + 1 + HYS && raw > scrollIdx - HYS) return;
      var k = Math.floor(raw);
      if (k === scrollIdx) return;
      scrollIdx = k;
      if (!pointerOwned && !focusOwned) setOpen(k);
    }
    function onWinResize() {
      vh = window.innerHeight || vh;
      if (!ro) relayout();
      scheduleMeasure();
    }

    /* ---------- desktop panels or phone row ---------- */
    function applyMode() {
      var r = !!(mqRow && mqRow.matches);
      if (modeSet && r === row) return;
      modeSet = true;
      row = r;
      strip.classList.toggle('is-row', row);
      clearTimeout(intentT);
      intentT = 0;
      hoverK = -1;
      lx = ly = null;
      pointerOwned = false;
      if (rowIO) { rowIO.disconnect(); rowIO = null; }
      if (row && typeof IntersectionObserver === 'function') {
        rowIO = new IntersectionObserver(onRowIO, { root: strip, threshold: 0.6 });
        panels.forEach(function (p) { rowIO.observe(p); });
      }
      if (row && openIdx > 0) scrollRowTo(openIdx, false);
      if (!modeRaf) modeRaf = requestAnimationFrame(function () { modeRaf = 0; if (!disposed) { relayout(); scheduleMeasure(); } });
    }
    function onRowIO(es) {
      es.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio >= 0.59) setOpen(+e.target.getAttribute('data-i'));
      });
    }
    function scrollRowTo(k, smooth) {
      var p = panels[k];
      if (!p) return;
      var left = Math.max(0, p.offsetLeft - (window.innerWidth || 0) * 0.08);
      try { strip.scrollTo({ left: left, behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { strip.scrollLeft = left; }
    }

    /* ---------- pointer, keyboard, focus ---------- */
    function onMove(e) {
      if (row || e.pointerType === 'touch') return;
      var x = e.clientX, y = e.clientY;
      // a page scrolling under a still pointer fires synthetic moves with no movement: those never take over
      var moved = !!(e.movementX || e.movementY) || (lx !== null && (x !== lx || y !== ly));
      lx = x;
      ly = y;
      if (!moved) return;
      var p = panelFrom(e.target), k = p ? +p.getAttribute('data-i') : -1;
      if (k === hoverK) return;
      hoverK = k;
      clearTimeout(intentT);
      intentT = 0;
      if (k < 0) return;
      intentT = setTimeout(function () {
        intentT = 0;
        if (disposed || row || hoverK !== k) return;
        pointerOwned = true;
        setOpen(k);
      }, INTENT_MS);
    }
    function onLeave() {
      clearTimeout(intentT);
      intentT = 0;
      hoverK = -1;
      lx = ly = null;
      pointerOwned = false;
    }
    function onDown(e) {
      var p = panelFrom(e.target);
      downPanel = p;
      downOpen = !!(p && p.classList.contains('is-open'));
    }
    function onClick(e) {
      var p = panelFrom(e.target);
      if (!p) return;
      var k = +p.getAttribute('data-i');
      // pointer focus opens a panel on pointerdown, so "was it open" is read from before that
      var wasOpen = e.detail === 0 ? p.classList.contains('is-open') : (p === downPanel ? downOpen : p.classList.contains('is-open'));
      downPanel = null;
      if (row || wasOpen) { openLb(order[k], p); return; }
      if (e.detail !== 0) pointerOwned = true;
      setOpen(k);
    }
    function focusPanel(t) {
      var p = panels[t];
      setOpen(t);
      if (row) { scrollRowTo(t, !reduce); focusQuiet(p); } else p.focus();
    }
    function onKey(e) {
      var p = panelFrom(e.target);
      if (!p || e.altKey || e.ctrlKey || e.metaKey) return;
      var k = +p.getAttribute('data-i'), t;
      switch (e.key) {
        case 'ArrowRight': case 'Right': t = Math.min(n - 1, k + 1); break;
        case 'ArrowLeft': case 'Left': t = Math.max(0, k - 1); break;
        case 'Home': t = 0; break;
        case 'End': t = n - 1; break;
        default: return;
      }
      e.preventDefault();
      if (t !== k) focusPanel(t);
    }
    function onFocusIn(e) {
      var p = panelFrom(e.target);
      if (!p) return;
      focusOwned = focusVisible(p);
      setOpen(+p.getAttribute('data-i'));
    }
    function onFocusOut(e) {
      if (!e.relatedTarget || !strip.contains(e.relatedTarget)) focusOwned = false;
    }

    /* ---------- lightbox ---------- */
    function useVT() { return canVT && !reduce && !document.hidden; }
    function vtBegin(dir) {
      docEl.classList.add('cine-vt');
      if (dir) docEl.setAttribute('data-dir', dir);
      else docEl.removeAttribute('data-dir');
      dlg.classList.add('is-vt');
    }
    function vtEnd() {
      docEl.classList.remove('cine-vt');
      docEl.removeAttribute('data-dir');
      dlg.classList.remove('is-vt');
    }
    function lbFill(si) {
      var s = stills[si], cv = s.cv;
      lbIdx = si;
      lbImg.alt = 'D6-ROV film karesi: ' + (s.cap || labelOf(s));
      meta.textContent = 'KARE ' + frameNo(s) + ' / ' + pad(totalFrames, 4) + ' · ' + fmtT(s.t) + ' · ' + labelOf(s);
      text.textContent = s.cap || '';
      count.textContent = pad(si + 1, 2) + ' / ' + pad(stills.length, 2);
      hi.classList.remove('is-on');
      hi.removeAttribute('src');
      lbCv.svg.style.display = cv ? '' : 'none';
      lbCv.chip.style.display = cv ? '' : 'none';
      lbCv.cv = null;
      if (!cv) return;
      setCvBox(lbCv, cv);
      placeLbCv();
    }
    // the frame is exactly 16:9, so the whole 1600x900 still is on screen: box and chip sit in its own units,
    // the chip in percentages (it survives a resize until the next measure); lbW is the last measured frame width
    function placeLbCv() {
      var cv = lbCv.cv;
      if (!cv) return;
      var k = lbW / 1600, gap = CV_PAD / k, b = clampBox(cv, 0, 0, 1600, 900, gap);
      var tw = chipW(cv.tag) / k, th = CHIP_H / k, x = b.x0, y = b.y0 - th - 6 / k;
      if (y < gap) { y = b.y0 + 6 / k; x = b.x0 + 6 / k; } // no room above: tuck it inside the box's top edge
      x = Math.max(gap, Math.min(x, 1600 - tw - gap));
      drawBox(lbCv, b.x0, b.y0, b.x1, b.y1);
      lbCv.path.setAttribute('stroke-width', (1.6 / k).toFixed(2));
      lbCv.chip.style.left = (x / 16).toFixed(2) + '%';
      lbCv.chip.style.top = (y / 9).toFixed(2) + '%';
    }
    function sizeLbCv() {
      var w = frame.clientWidth;
      if (w > 0 && Math.abs(w - lbW) > 0.5) { lbW = w; placeLbCv(); }
    }
    function onLbResize() {
      if (!lbResRaf) lbResRaf = requestAnimationFrame(function () { lbResRaf = 0; if (lbOpen && !disposed) sizeLbCv(); });
    }
    function showDialog() {
      lbOpen = true;
      if (!dlg.open) {
        try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); focusQuiet(closeB); }
      }
      window.addEventListener('resize', onLbResize);
    }
    // after the image has landed: lock the viewfinder, draw the CV box, pull focus to 1600w, warm the neighbours
    function afterShow(token) {
      if (disposed || token !== seq || !lbOpen) return;
      pic.style.viewTransitionName = '';
      sizeLbCv();
      frame.classList.add('is-locked');
      loadHi(token);
      preload(lbIdx);
    }
    // without a view transition the unlocked state needs one painted frame before the lock can animate again
    function afterShowSoon(token) {
      if (reduce) { afterShow(token); return; }
      if (lockRaf) cancelAnimationFrame(lockRaf);
      lockRaf = requestAnimationFrame(function () {
        lockRaf = requestAnimationFrame(function () { lockRaf = 0; afterShow(token); });
      });
    }
    function loadHi(token) {
      var s = stills[lbIdx];
      if (!s.src || absUrl(s.src) === lbImg.currentSrc) return;
      hi.src = s.src;
      var d = decodeOf(hi) || new Promise(function (res, rej) { hi.onload = res; hi.onerror = rej; });
      d.then(function () { if (!disposed && token === seq && lbOpen) hi.classList.add('is-on'); }, noop);
    }
    function warm(u) {
      if (!u || pre[u]) return;
      var im = new Image();
      im.decoding = 'async';
      im.src = u;
      pre[u] = im;
    }
    function preload(si) {
      if (stills.length < 2) return;
      [-1, 1].forEach(function (d) {
        var s = stills[(si + d + stills.length) % stills.length];
        warm(s.src800 || s.src);
        if (!lite) warm(s.src);
      });
    }
    function baseFor(s) {
      var big = pre[s.src];
      return big && big.complete && big.naturalWidth > 0 ? s.src : (s.src800 || s.src);
    }
    function runPending() {
      if (pendingClose) { pendingClose = false; pendingDelta = 0; closeLb(); return; }
      if (pendingDelta) { var d = pendingDelta; pendingDelta = 0; go(d); }
    }

    function openLb(si, from) {
      if (disposed || lbOpen || busy) return;
      opener = from || null;
      var k = panelOf[si], thumb = k >= 0 ? thumbs[k] : null;
      var base = (thumb && thumb.currentSrc) || stills[si].src800 || stills[si].src;
      var token = ++seq;
      lbFill(si);
      frame.classList.remove('is-locked');
      if (useVT() && thumb && thumb.complete && thumb.naturalWidth > 0) {
        busy = true;
        vtBegin('');
        thumb.style.viewTransitionName = 'kare';
        var vt = null;
        try {
          vt = document.startViewTransition(function () {
            thumb.style.viewTransitionName = '';
            pic.style.viewTransitionName = 'kare';
            lbImg.src = base;
            showDialog();
            return settle(decodeOf(lbImg), 300);
          });
        } catch (err) { vt = null; }
        if (vt) {
          vtNow = vt;
          var done = function () {
            vtNow = null;
            busy = false;
            thumb.style.viewTransitionName = '';
            pic.style.viewTransitionName = '';
            vtEnd();
            if (disposed) return;
            afterShow(token);
            runPending();
          };
          vt.finished.then(done, done);
          return;
        }
        thumb.style.viewTransitionName = '';
        busy = false;
        vtEnd();
      }
      lbImg.src = base;
      showDialog();
      afterShowSoon(token);
    }

    function go(d) {
      if (disposed || !lbOpen || stills.length < 2) return;
      if (busy) { pendingDelta = d; return; }
      var si = (lbIdx + d + stills.length) % stills.length, s = stills[si], token = ++seq;
      var src = baseFor(s);
      // keep the strip in step behind the backdrop, so closing can land on the right panel
      var k = panelOf[si];
      if (k >= 0 && k !== openIdx) { setOpen(k); if (row) scrollRowTo(k, false); }
      if (useVT()) {
        busy = true;
        vtBegin(d > 0 ? 'next' : 'prev');
        pic.style.viewTransitionName = 'kare';
        var vt = null;
        try {
          vt = document.startViewTransition(function () {
            frame.classList.remove('is-locked');
            lbFill(si);
            lbImg.src = src;
            return settle(decodeOf(lbImg), 400);
          });
        } catch (err) { vt = null; }
        if (vt) {
          vtNow = vt;
          var done = function () {
            vtNow = null;
            busy = false;
            pic.style.viewTransitionName = '';
            vtEnd();
            if (disposed) return;
            afterShow(token);
            runPending();
          };
          vt.finished.then(done, done);
          return;
        }
        pic.style.viewTransitionName = '';
        busy = false;
        vtEnd();
      }
      frame.classList.remove('is-locked');
      lbFill(si);
      lbImg.src = src;
      slideIn(d);
      afterShowSoon(token);
    }
    // browsers without view transitions: the same short sideways fade, on the picture only (transform + opacity)
    function slideIn(d) {
      if (reduce || typeof pic.animate !== 'function') return;
      try {
        pic.animate([
          { opacity: 0, transform: 'translateX(' + (d > 0 ? 4 : -4) + '%)' },
          { opacity: 1, transform: 'none' }
        ], { duration: 380, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      } catch (e) { /* no animation, the swap is still correct */ }
    }

    function closeLb() {
      if (disposed || !lbOpen) return;
      if (busy) { pendingClose = true; return; }
      var k = panelOf[lbIdx];
      var target = (k >= 0 && k === openIdx && now() - openedAt > MORPH_SETTLE) ? thumbs[k] : null;
      if (target && !(target.complete && target.naturalWidth > 0)) target = null;
      if (useVT()) {
        busy = true;
        vtBegin('');
        if (target) pic.style.viewTransitionName = 'kare';
        var vt = null;
        try {
          vt = document.startViewTransition(function () {
            pic.style.viewTransitionName = '';
            try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); }
            finishClose();
            if (target) target.style.viewTransitionName = 'kare';
          });
        } catch (err) { vt = null; }
        if (vt) {
          vtNow = vt;
          var done = function () {
            if (target) target.style.viewTransitionName = '';
            vtNow = null;
            busy = false;
            vtEnd();
          };
          vt.finished.then(done, done);
          return;
        }
        pic.style.viewTransitionName = '';
        busy = false;
        vtEnd();
      }
      try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); }
      finishClose();
    }

    // runs once per close however it happened (button, ESC, backdrop, swipe, or the browser closing it itself)
    function finishClose() {
      if (!lbOpen) return;
      lbOpen = false;
      seq++;
      window.removeEventListener('resize', onLbResize);
      if (lockRaf) { cancelAnimationFrame(lockRaf); lockRaf = 0; }
      frame.classList.remove('is-locked');
      hi.classList.remove('is-on');
      pic.style.viewTransitionName = '';
      pendingDelta = 0;
      pendingClose = false;
      sid = null;
      if (disposed) return;
      var k = panelOf[lbIdx];
      var back = k >= 0 ? panels[k] : opener;
      if (!back || !back.isConnected) back = opener;
      opener = null;
      var bi = back ? panels.indexOf(back) : -1;
      if (bi >= 0) setOpen(bi);
      if (back && back.isConnected) focusQuiet(back);
      // the page did not move while the dialog was open, but the strip may have: measure again
      scheduleMeasure();
    }

    /* ---------- wiring ---------- */
    function onReduce() {
      reduce = !!(mqReduce && mqReduce.matches);
      host.classList.toggle('is-still', reduce);
      dlg.classList.toggle('is-still', reduce);
    }
    function onLoad() { scheduleMeasure(); }

    host.classList.toggle('is-still', reduce);
    dlg.classList.toggle('is-still', reduce);
    setOpen(0);

    if (typeof ResizeObserver === 'function') {
      // the strip's own size drives the panel geometry; the body's size only means content above may have moved
      ro = new ResizeObserver(function (es) {
        var own = null, j;
        for (j = 0; j < es.length; j++) { if (es[j].target !== document.body) own = es[j]; }
        if (own) layout(own.contentRect.width, own.contentRect.height);
        if (own || visible) scheduleMeasure();
      });
    }
    applyMode();
    if (ro) {
      ro.observe(strip);
      if (document.body) ro.observe(document.body);
    } else relayout();

    if (typeof IntersectionObserver === 'function') {
      vio = new IntersectionObserver(function (es) {
        var e = es[es.length - 1], on = e.isIntersecting;
        setLockVis(on && e.intersectionRatio >= 0.34);
        if (on === visible) return;
        visible = on;
        if (on) { window.addEventListener('scroll', onScroll, { passive: true }); scheduleMeasure(); }
        else window.removeEventListener('scroll', onScroll, { passive: true });
      }, { threshold: [0, 0.35] });
      vio.observe(strip);
    } else {
      visible = true;
      setLockVis(true);
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    strip.addEventListener('pointermove', onMove, { passive: true });
    strip.addEventListener('pointerleave', onLeave);
    strip.addEventListener('pointerdown', onDown);
    strip.addEventListener('click', onClick);
    strip.addEventListener('keydown', onKey);
    strip.addEventListener('focusin', onFocusIn);
    strip.addEventListener('focusout', onFocusOut);
    window.addEventListener('resize', onWinResize, { passive: true });
    if (document.readyState !== 'complete') window.addEventListener('load', onLoad);
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(onLoad, noop);
    listen(mqRow, applyMode);
    listen(mqReduce, onReduce);

    // ESC: our own (animated) close; when the browser will not let the cancel be prevented it closes the dialog
    // itself right after this event, and the 'close' listener below tidies up
    dlg.addEventListener('cancel', function (e) {
      if (e.cancelable === false) return;
      e.preventDefault();
      closeLb();
    });
    dlg.addEventListener('close', function () { if (!disposed) finishClose(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return; // Alt+Left stays the browser's "back"
      if (e.key === 'ArrowRight' || e.key === 'Right') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'Left') { e.preventDefault(); go(-1); }
    });
    // a click on empty space (the backdrop area) closes; a click on the picture, caption or buttons does not
    dlg.addEventListener('click', function (e) {
      if (swallow) { swallow = false; return; }
      var t = e.target;
      if (t === dlg || t === inner || t === fig || t === nav) closeLb();
    });
    prevB.addEventListener('click', function () { go(-1); });
    nextB.addEventListener('click', function () { go(1); });
    closeB.addEventListener('click', function () { closeLb(); });
    // swipe: left / right browses, a downward flick on touch closes
    inner.addEventListener('pointerdown', function (e) {
      swallow = false;
      sid = null;
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (e.target && e.target.closest && e.target.closest('button')) return;
      sid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
    });
    inner.addEventListener('pointerup', function (e) {
      if (sid === null || e.pointerId !== sid) return;
      sid = null;
      var dx = e.clientX - sx, dy = e.clientY - sy, ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax > 50 && ax > ay * 1.2) { swallow = true; go(dx < 0 ? 1 : -1); }
      else if (e.pointerType !== 'mouse' && dy > 90 && ay > ax * 1.2) { swallow = true; closeLb(); }
    });
    inner.addEventListener('pointercancel', function () { sid = null; });

    // images: lens focus pull from the tiny blurred still (core sets .fp and the placeholder background)
    if (typeof core.focusPull === 'function') {
      thumbs.forEach(function (img) {
        try { pulls.push(core.focusPull(img)); } catch (err) { /* the plain image still shows */ }
      });
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      if (vtNow && typeof vtNow.skipTransition === 'function') { try { vtNow.skipTransition(); } catch (e) { /* already done */ } }
      vtNow = null;
      vtEnd();
      clearTimeout(intentT);
      [raf, measureRaf, sizingRaf, modeRaf, lbResRaf, lockRaf].forEach(function (r) { if (r) cancelAnimationFrame(r); });
      raf = measureRaf = sizingRaf = modeRaf = lbResRaf = lockRaf = 0;
      window.removeEventListener('scroll', onScroll, { passive: true });
      window.removeEventListener('resize', onWinResize, { passive: true });
      window.removeEventListener('resize', onLbResize);
      window.removeEventListener('load', onLoad);
      unlisten(mqRow, applyMode);
      unlisten(mqReduce, onReduce);
      if (vio) vio.disconnect();
      if (ro) ro.disconnect();
      if (rowIO) rowIO.disconnect();
      vio = ro = rowIO = null;
      pulls.forEach(function (h) { if (h && typeof h.dispose === 'function') h.dispose(); });
      pulls = [];
      thumbs.forEach(function (img) { img.style.viewTransitionName = ''; });
      if (lbOpen || dlg.open) {
        lbOpen = false;
        try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); }
      }
      if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
      if (strip.parentNode) strip.parentNode.removeChild(strip);
      if (tl.parentNode) tl.parentNode.removeChild(tl);
      host.classList.remove('cc-host', 'is-still');
      pre = {};
      opener = downPanel = null;
    }

    return { dispose: dispose };
  };
})();
