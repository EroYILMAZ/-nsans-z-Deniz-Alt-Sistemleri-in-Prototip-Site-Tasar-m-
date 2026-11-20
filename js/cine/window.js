/*
 * Deniz6 — "Sinema Penceresi" (cinema window) for the film section.
 *
 * The lead renders an empty <section id="film" data-section="arac"> and calls D6Cine.mountWindow(section, opts)
 * in an effect. This module builds the whole stage inside it:
 *
 *   section.cine-win[data-cine=win]
 *     .cine-win__stage                 sticky, one viewport tall, size container for the geometry
 *       .cine-win__dark                black layer: the page darkens into a cinema
 *       .cine-win__amb                 ambient light: blurred still + the film player's two canvases
 *       .cine-win__head                eyebrow + split title that slides away from the porthole
 *       .cine-win__box                 true 16:9 box: four viewfinder brackets, caption, centre crosshair
 *         .cine-win__frame             the porthole (inset() clip-path): zooming still, cut layer, film player
 *
 * D6Cine.scrub (js/cine/core.js) writes --p on the section. Every visual is derived from --p in
 * css/cine/window.css, so the scroll path costs one custom-property write and no layout reads.
 * JS only reacts to thresholds: the film is armed at p >= .62 and disarmed below .52 (hysteresis), and the
 * fixed page chrome (depth gauge, sound and back-to-top buttons) steps aside while the window is open.
 * Reduced motion and low-memory / save-data devices get a static block with the ordinary, ungated player.
 */
(function () {
  'use strict';
  var C = window.D6Cine = window.D6Cine || {};

  var ARM_AT = 0.62;       // the film goes live here...
  var DISARM_BELOW = 0.52; // ...and stops below here, so no scroll position flickers between the two states
  var CHROME_FROM = 0.3;   // from here until the pin ends, the fixed page chrome hides (html.cine-win-in)
  var FOCUS_TO = 0.7;      // where a keyboard focus inside the (still hidden) player scrolls the page to
  var LOCK_RATIO = 0.34;   // viewfinder lock when about a third of the box is visible (fallback for core)

  function el(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function hidden(e) { e.setAttribute('aria-hidden', 'true'); return e; }
  function matches(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  function readFlags() {
    var f = C.flags;
    if (f && typeof f === 'object') return { reduce: !!f.reduce, lite: !!f.lite };
    var conn = navigator.connection;
    return {
      reduce: matches('(prefers-reduced-motion: reduce)'),
      lite: (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4) || !!(conn && conn.saveData)
    };
  }
  function cssUrl(u) { return 'url("' + String(u).replace(/["\\]/g, '\\$&') + '")'; }
  function fullscreenEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function scrollToY(y) {
    try { window.scrollTo({ top: y, behavior: 'smooth' }); } catch (err) { window.scrollTo(0, y); }
  }
  function warn(what, err) { if (window.console && console.warn) console.warn('D6Cine.mountWindow: ' + what, err); }

  function mountWindow(section, opts) {
    if (!section || section.nodeType !== 1) return { dispose: function () {} };
    if (section.d6CineWin) section.d6CineWin.dispose();
    opts = opts || {};

    var flags = readFlags();
    var pinned = !opts.static && !flags.reduce && !flags.lite && typeof C.scrub === 'function'; // opts.static: no opening animation, plain player
    var root = document.documentElement;
    var Film = window.D6Film;

    section.classList.add('cine-win');
    section.classList.toggle('is-static', !pinned);
    section.setAttribute('data-cine', 'win');

    /* ---------- DOM ---------- */
    var stage = el('div', 'cine-win__stage', section);
    hidden(el('div', 'cine-win__dark', stage));
    var amb = hidden(el('div', 'cine-win__amb', stage));
    if (opts.glow) {
      var glow = el('img', 'cine-win__amb-still', amb);
      glow.alt = ''; glow.decoding = 'async'; glow.loading = 'lazy';
      glow.src = opts.glow;
    }
    var ambHost = el('div', 'cine-win__amb-cv', amb);

    var head = el('div', 'cine-win__head', stage);
    el('p', 'eyebrow cine-win__kick', head, 'TANITIM FİLMİ · 30 SN');
    var title = el('h2', 'cine-win__title', head);
    title.id = (section.id || 'cine-win') + '-baslik';
    el('span', 'l', title, 'D6-ROV');
    title.appendChild(document.createTextNode(' '));
    el('span', 'r', title, 'iş başında.');
    section.setAttribute('aria-labelledby', title.id);

    var box = el('div', 'cine-win__box', stage);
    var frame = el('div', 'cine-win__frame', box);
    var img = null;
    if (pinned) {
      // the lens carries the scroll zoom; its background is the tiny blurred placeholder (focus pull)
      var lens = el('div', 'cine-win__lens', frame);
      if (opts.lq) lens.style.backgroundImage = cssUrl(opts.lq);
      if (opts.still) {
        img = el('img', 'cine-win__still', lens);
        img.alt = 'D6-ROV kapıya yaklaşıyor';
        img.decoding = 'async';
        img.loading = 'lazy'; // set before the source so the fetch waits for the viewport
        if (opts.still800) { img.sizes = '100vw'; img.srcset = opts.still800 + ' 800w, ' + opts.still + ' 1600w'; }
        img.src = opts.still;
      }
      hidden(el('div', 'cine-win__cut', frame));
    }
    var slot = el('div', 'cine-win__player', frame);
    if (pinned) {
      ['tl', 'tr', 'bl', 'br'].forEach(function (c) {
        el('i', null, hidden(el('span', 'cine-win__br cine-win__br--' + c, box)));
      });
      var cap = el('span', null, hidden(el('div', 'cine-win__cap', box)));
      cap.appendChild(document.createTextNode('KAM-01 · 1920×1080 · '));
      el('i', 'cine-win__rec', cap);
      cap.appendChild(document.createTextNode('KAYIT'));
    }

    /* ---------- film player ---------- */
    var api = null;
    if (Film && typeof Film.mount === 'function' && opts.film) {
      var extra = { gated: pinned };
      if (pinned && opts.ambientStrip) extra.ambient = { host: ambHost, strip: opts.ambientStrip, fps: 6, rows: 180 };
      if (opts.sprite) extra.previews = { sprite: opts.sprite, w: 192, h: 108 };
      try { api = Film.mount(slot, Object.assign({}, opts.film, extra)); } catch (err) { api = null; warn('film player', err); }
    }
    if (!api) section.classList.add('no-film');

    /* ---------- state ---------- */
    var live = false, chrome = false, disposed = false, sharp = false;
    var unliveT = 0, decT = 0, scrub = null, io = null, lock = null;

    function arm(on) {
      if (!api || typeof api.arm !== 'function') return;
      try { api.arm(on); } catch (err) { warn('arm', err); }
    }
    function setLive(on) {
      if (on === live) return;
      live = on;
      clearTimeout(unliveT);
      if (on) {
        section.classList.remove('is-unlive');
        section.classList.toggle('has-amb', !!ambHost.querySelector('canvas'));
        section.classList.add('is-live');
      } else {
        // While live the frame has clip-path: none, which cannot be interpolated. Pin it at the open inset()
        // for one style pass, so the way back to the scroll-driven porthole is a short transition, not a jump.
        section.classList.add('is-unlive-a');
        section.classList.remove('is-live');
        if (window.getComputedStyle) window.getComputedStyle(frame).getPropertyValue('clip-path');
        section.classList.remove('is-unlive-a');
        section.classList.add('is-unlive');
        unliveT = setTimeout(function () { section.classList.remove('is-unlive'); }, 500);
      }
      arm(on);
    }
    function setChrome(on) {
      if (on === chrome) return;
      chrome = on;
      root.classList.toggle('cine-win-in', on);
    }
    function onProgress(p) {
      if (disposed) return;
      p = +p || 0;
      // in fullscreen the viewport changes size; that must neither pause the film nor bring the chrome back
      var fs = fullscreenEl();
      if (fs && section.contains(fs)) return;
      setChrome(p > CHROME_FROM && p < 1);
      if (!api) return;
      // p === 1 arms too: p stays 1 for the whole last viewport of scroll, while the stage is still on screen, so an
      // instant jump there (Space, Page Down, an anchor) must not leave a black porthole. Arming far past the section
      // is harmless: the player only plays while its frame is in view.
      if (!live && p >= ARM_AT) setLive(true);
      else if (live && p < DISARM_BELOW) setLive(false);
    }

    // Keyboard users who tab into the player before it is live are taken to the point where it plays. The player
    // ignores the pointer until it is live, so a click it gets before then comes from a keyboard or a screen reader
    // (some activate a button without moving focus to it): that one is taken there too, so a film started that way
    // does not play unseen behind the closed porthole.
    function onFocusIn() {
      if (live || disposed) return;
      requestAnimationFrame(function () {
        if (live || disposed) return;
        var span = section.offsetHeight - window.innerHeight;
        if (span <= 0) return;
        scrollToY(section.getBoundingClientRect().top + window.pageYOffset + span * FOCUS_TO);
      });
    }

    // Focus pull: the blurred placeholder sits behind the still until the sharp file is loaded, decoded and in view.
    function sharpen() {
      if (sharp || disposed || !img) return;
      sharp = true;
      clearTimeout(decT);
      img.removeEventListener('load', onImgLoad);
      img.classList.add('is-sharp');
    }
    function onImgLoad() {
      if (sharp || disposed || !img || !img.naturalWidth) return;
      if (typeof img.decode !== 'function') { sharpen(); return; }
      // some engines leave decode() pending forever (older WebKit with lazy images): never keep a loaded still hidden
      clearTimeout(decT);
      decT = setTimeout(sharpen, 1500);
      // the file is loaded here, so even a rejected decode leaves a picture to show
      img.decode().then(sharpen, sharpen);
    }
    function develop() {
      if (!img || sharp) return;
      img.addEventListener('load', onImgLoad);
      if (img.complete && img.naturalWidth) onImgLoad();
    }
    // Viewfinder lock-on (.is-locked on the box) through core's shared observer when present, plus the focus pull.
    function watchBox() {
      var coreLock = typeof C.lockWhenVisible === 'function';
      if (coreLock) lock = C.lockWhenVisible(box);
      if (typeof IntersectionObserver !== 'function') {
        develop();
        if (!coreLock) box.classList.add('is-locked');
        return;
      }
      var developing = !img, locked = coreLock;
      io = new IntersectionObserver(function (es) {
        var e = es[es.length - 1];
        if (!e.isIntersecting) return;
        if (!developing) { developing = true; develop(); }
        if (!locked && e.intersectionRatio >= LOCK_RATIO) { locked = true; box.classList.add('is-locked'); }
        if (developing && locked && io) { io.disconnect(); io = null; }
      }, { threshold: [0, LOCK_RATIO] });
      io.observe(box);
    }

    // core caches the offsets and re-measures on resize, body resize and load; the first onProgress comes in a microtask
    if (pinned) {
      slot.addEventListener('focusin', onFocusIn);
      // capture: the chapter ticks stop their clicks from bubbling
      slot.addEventListener('click', onFocusIn, true);
      watchBox();
      scrub = C.scrub(section, onProgress);
    }

    /* ---------- dispose ---------- */
    function dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(unliveT);
      clearTimeout(decT);
      slot.removeEventListener('focusin', onFocusIn);
      slot.removeEventListener('click', onFocusIn, true);
      if (io) { io.disconnect(); io = null; }
      if (lock && typeof lock.dispose === 'function') lock.dispose();
      lock = null;
      if (img) img.removeEventListener('load', onImgLoad);
      if (scrub && typeof scrub.dispose === 'function') { try { scrub.dispose(); } catch (err) { warn('scrub', err); } }
      scrub = null;
      if (api && typeof api.dispose === 'function') { try { api.dispose(); } catch (err) { warn('dispose', err); } }
      api = null;
      if (chrome) { chrome = false; root.classList.remove('cine-win-in'); }
      if (stage.parentNode) stage.parentNode.removeChild(stage);
      section.classList.remove('cine-win', 'is-static', 'is-live', 'is-unlive', 'is-unlive-a', 'has-amb', 'no-film');
      section.removeAttribute('data-cine');
      section.removeAttribute('aria-labelledby');
      section.style.removeProperty('--p');
      if (section.d6CineWin === handle) section.d6CineWin = null;
      img = null;
    }
    var handle = { dispose: dispose };
    section.d6CineWin = handle;
    return handle;
  }

  C.mountWindow = mountWindow;
})();
