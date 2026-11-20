/*
 * Deniz6 — tanıtım filmi oynatıcısı. Film önceden render edilmiş bir MP4'tür (tools/film/), bu yüzden
 * tarayıcının donanım video çözücüsüyle neredeyse hiç yük getirmeden oynar.
 * Davranış: bölüme yaklaşınca dosya bağlanır, ekranın yarısı görününce sessiz oynar, çıkınca durur.
 * Ziyaretçi durdurursa kendiliğinden yeniden başlamaz. "Hareketi azalt" tercihinde otomatik oynatmaz.
 * Sinema penceresinde (cfg.gated) film, pencere açılıp api.arm(true) çağrılana kadar kendiliğinden başlamaz.
 * cfg.ambient filmin renklerini çevresine ortam ışığı olarak yayar (küçük bir kare şeridinden; videodan okuma yok).
 * cfg.previews bölüm işaretlerinin üzerinde, YouTube'daki gibi, o bölümden küçük bir kare gösterir.
 */
(function () {
  'use strict';
  function el(tag, cls, parent, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
  function drop(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  // the duration in words for screen readers: "30 saniye", "1 dakika 5 saniye"
  function spoken(s) { s = Math.max(0, Math.round(s || 0)); var m = Math.floor(s / 60), r = s % 60; return (m ? m + ' dakika' : '') + (m && r ? ' ' : '') + (r || !m ? r + ' saniye' : ''); }
  // true when n has focus that came from the keyboard (where :focus-visible is unknown, false)
  function kbFocus(n) { try { return document.activeElement === n && n.matches(':focus-visible'); } catch (err) { return false; } }
  function mq(q) { return !!(window.matchMedia && window.matchMedia(q).matches); }
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  // Ambient canvases are tiny on purpose: the browser's upscale to the stage size is the blur.
  var AMB_W = 32, AMB_H = 18;
  // Minimum time between two ambient frames. It outlasts the .45s CSS crossfade on canvas.film-amb, so every
  // fade has finished before the canvas it covered is redrawn (see the film-player block in css/sections.css).
  // It stays a little under 500ms: 'timeupdate' comes every ~250ms, and a 500ms gap would miss every other
  // second tick by a millisecond of jitter, turning the steady 2 Hz into an uneven 500/750ms rhythm.
  var AMB_GAP = 480;
  // Chapter previews load with the video only where the labels are shown (they are hidden at <= 700px), and only
  // where a mouse hovers: touch tablets would never show them, so there the first mouse hover or keyboard focus on
  // the timeline fetches the sprite instead (see the 'pointerenter' / 'focusin' listeners below).
  var PREV_MQ = '(min-width: 701px)';
  var PREV_EAGER = PREV_MQ + ' and (hover: hover)';

  function mount(root, cfg) {
    cfg = cfg || {};
    var reduce = mq('(prefers-reduced-motion: reduce)');
    var dur = cfg.duration || 30;
    var chapters = cfg.chapters || [];
    var pv = cfg.previews && cfg.previews.sprite && chapters.length ? cfg.previews : null;
    var amb = cfg.ambient && cfg.ambient.host && cfg.ambient.strip && !reduce ? cfg.ambient : null;
    var loaded = false, userPaused = false, visible = false, raf = 0, curCh = -1, disposed = false;
    var armed = !cfg.gated;
    var sprite = null;
    var ambC = [], ambX = [], ambImg = null, ambReady = false, ambIdx = -1, ambCur = -1, ambAt = 0;

    // the time text changes constantly: .cine-live tells fx.js not to re-scan on those mutations
    root.classList.add('film', 'cine-live');
    var frame = el('div', 'film-frame', root);
    var video = el('video', 'film-video', frame);
    video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
    video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
    if (cfg.poster) video.poster = cfg.poster;
    video.setAttribute('aria-label', cfg.label || 'Tanıtım filmi');
    el('div', 'film-shade', frame);
    // the accessible name starts with the visible words (WCAG 2.5.3), so "Filmi izle" also works for voice control
    var big = el('button', 'film-play', frame); big.type = 'button'; big.setAttribute('aria-label', 'Filmi izle, ' + spoken(dur));
    big.innerHTML = '<span class="film-play-ring">' + ICON.play + '</span><span class="film-play-txt">FİLMİ İZLE · ' + fmt(dur) + '</span>';
    var tag = el('div', 'film-tag', frame);
    el('i', null, tag); el('span', null, tag, cfg.tag || 'D6-ROV · TANITIM FİLMİ');

    var ui = el('div', 'film-ui', frame);
    var toggle = el('button', 'film-btn', ui); toggle.type = 'button'; toggle.innerHTML = ICON.play; toggle.setAttribute('aria-label', 'Oynat');
    var track = el('div', 'film-track', ui);
    var fill = el('i', 'film-fill', track);
    if (pv) {
      // preview size for the CSS: --film-pw is the frame width, --film-pk its height / width ratio
      root.style.setProperty('--film-pw', (pv.w || 192) + 'px');
      root.style.setProperty('--film-pk', ((pv.h || 108) / (pv.w || 192)).toFixed(4));
    }
    var ticks = chapters.map(function (c) {
      var b = el('button', 'film-tick', track); b.type = 'button';
      b.style.left = (c[0] / dur * 100) + '%';
      b.setAttribute('aria-label', c[1] + ' bölümüne git');
      var p = null;
      if (pv) {
        // --f: the tick's place on the track (0-1); the preview slides from left- to right-aligned with it
        b.style.setProperty('--f', Math.max(0, Math.min(1, c[0] / dur)).toFixed(4));
        p = el('i', 'film-prev', b); p.setAttribute('aria-hidden', 'true');
      }
      el('span', null, b, c[1]);
      b.addEventListener('click', function (e) { e.stopPropagation(); load(); video.currentTime = c[0]; play(true); });
      return { b: b, t: c[0], p: p };
    });
    var time = el('span', 'film-time', ui, '0:00 / ' + fmt(dur));
    var fs = el('button', 'film-btn', ui); fs.type = 'button'; fs.innerHTML = ICON.full; fs.setAttribute('aria-label', 'Tam ekran');

    /* ---------- ambient light canvases (cfg.ambient) ---------- */
    if (amb) {
      for (var a = 0; a < 2; a++) {
        var cv = el('canvas', 'film-amb', amb.host);
        cv.width = AMB_W; cv.height = AMB_H; cv.setAttribute('aria-hidden', 'true');
        var cx = cv.getContext('2d', { alpha: false });
        if (cx) {
          cx.imageSmoothingEnabled = true;
          // a 1px blur at 32x18 softens the creases of the large bilinear upscale; ignored where unsupported
          if ('filter' in cx) cx.filter = 'blur(1px)';
        }
        ambC.push(cv); ambX.push(cx);
      }
      if (!ambX[0] || !ambX[1]) { ambC.forEach(drop); ambC = []; ambX = []; amb = null; }
    }

    function load() {
      // an observer entry queued before dispose() must not attach the file to the detached video
      if (loaded || disposed) return; loaded = true;
      var small = window.innerWidth < 900 || (navigator.connection && navigator.connection.saveData);
      video.src = small && cfg.srcSmall ? cfg.srcSmall : cfg.src;
      video.preload = 'auto';
      // the small extras travel with the video: the ambient strip and (where previews can show) the preview sprite
      loadAmb();
      if (mq(PREV_EAGER)) loadSprite();
    }
    function loadAmb() {
      if (!amb || ambImg) return;
      ambImg = new Image();
      ambImg.decoding = 'async';
      ambImg.onload = function () {
        if (disposed || !ambImg || !ambImg.naturalWidth) return;
        ambReady = true; ambDraw();
      };
      // a missing strip takes the (still dark) canvases out again, so the host's other light shows instead
      ambImg.onerror = function () {
        if (disposed || !ambImg) return;
        ambImg.onload = ambImg.onerror = null; ambImg = null;
        ambC.forEach(drop); ambC = []; ambX = []; amb = null;
      };
      ambImg.src = amb.strip;
    }
    function loadSprite() {
      if (!pv || sprite || disposed) return;
      sprite = new Image();
      sprite.decoding = 'async';
      sprite.onload = function () {
        if (disposed || !sprite.naturalWidth) return;
        // one frame per chapter, left to right: percentages keep the crop right at any displayed size
        // (identical to background-position: -i*w px 0 at the native w x h)
        var n = Math.max(1, Math.round(sprite.naturalWidth / (pv.w || 192)));
        var url = 'url("' + sprite.src + '")';
        ticks.forEach(function (k, i) {
          k.p.style.backgroundImage = url;
          k.p.style.backgroundSize = (n * 100) + '% 100%';
          k.p.style.backgroundPosition = (n > 1 ? Math.min(i, n - 1) / (n - 1) * 100 : 0) + '% 0';
        });
        root.classList.add('has-prev');
      };
      sprite.src = pv.sprite;
    }
    function canAuto() { return armed && !userPaused && !reduce; }
    function play(byUser) {
      if (disposed) return;
      load();
      if (byUser) userPaused = false;
      var pr = video.play();
      // a quick pause + play rejects the older promise while the newer one already plays: leave that one alone
      if (pr && pr.catch) pr.catch(function () { if (!disposed && video.paused) root.classList.remove('is-playing'); });
    }
    function pause(byUser) { if (byUser) userPaused = true; video.pause(); }
    function step() {
      raf = 0;
      if (disposed) return;
      var t = video.currentTime || 0;
      fill.style.transform = 'scaleX(' + (t / (video.duration || dur)).toFixed(4) + ')';
      var ch = 0; ticks.forEach(function (k, i) { if (t >= k.t) ch = i; });
      if (ch !== curCh) { curCh = ch; ticks.forEach(function (k, i) { k.b.classList.toggle('is-on', i === ch); }); }
      var txt = fmt(t) + ' / ' + fmt(video.duration || dur); if (time.textContent !== txt) time.textContent = txt;
      if (!video.paused) raf = requestAnimationFrame(step);
    }
    // Redraws the controls right away (after a pause or a seek). A pending frame is cancelled first, so a quick
    // pause + play can never leave two step() loops running.
    function sync() { if (raf) { cancelAnimationFrame(raf); raf = 0; } step(); }

    // Draws the strip row for the current time into the hidden canvas and crossfades to it. Runs from
    // 'timeupdate' (about 4 Hz) and 'seeked' only, never per frame, and only while the film plays on screen.
    function ambDraw() {
      if (!amb || !ambReady || disposed) return;
      if (video.paused || video.ended || !visible || document.hidden || fsEl()) return;
      var now = performance.now();
      if (ambCur >= 0 && now - ambAt < AMB_GAP) return;
      var rows = amb.rows || 180, fps = amb.fps || 6;
      var idx = Math.min(rows - 1, Math.max(0, Math.floor((video.currentTime || 0) * fps)));
      if (idx === ambIdx) return;
      // the first frame goes to the top canvas so the light fades in; after that the two alternate
      var next = ambCur === 1 ? 0 : 1;
      var rh = ambImg.naturalHeight / rows;
      // each row is a 16x9 frame; drawn 1px past every edge so the blur does not darken the rim
      ambX[next].drawImage(ambImg, 0, idx * rh, ambImg.naturalWidth, rh, -1, -1, AMB_W + 2, AMB_H + 2);
      ambC[next].classList.add('on');
      if (ambCur >= 0) ambC[ambCur].classList.remove('on');
      ambCur = next; ambIdx = idx; ambAt = now;
    }

    // Gate for the cinema window: on=true goes live (rewinds a finished film, then plays muted unless the
    // visitor paused it); on=false pauses without counting as a visitor pause. Ungated players start armed.
    function arm(on) {
      if (disposed) return;
      on = !!on;
      root.classList.toggle('is-live', on);
      if (on === armed) return;
      armed = on;
      if (on) {
        if (loaded && (video.ended || (video.currentTime || 0) > (video.duration || dur) - 2)) video.currentTime = 0;
        // when the 'vis' observer has not reported yet, it starts the film itself as soon as it does
        if (visible && !document.hidden && canAuto()) play(false);
      } else if (!video.paused) pause(false);
    }

    video.addEventListener('play', function () {
      if (disposed) return;
      // the big button fades out of the tab order once the film has started (CSS: visibility): keyboard focus on it
      // moves on to the pause button instead of being dropped (also when the cinema window starts the film)
      if (kbFocus(big)) { try { toggle.focus({ preventScroll: true }); } catch (err) { toggle.focus(); } }
      root.classList.add('is-playing', 'is-started'); toggle.innerHTML = ICON.pause; toggle.setAttribute('aria-label', 'Duraklat');
      if (!raf) raf = requestAnimationFrame(step);
    });
    video.addEventListener('pause', function () { if (disposed) return; root.classList.remove('is-playing'); toggle.innerHTML = ICON.play; toggle.setAttribute('aria-label', 'Oynat'); sync(); });
    // keeps the bar and time right after a seek while paused (e.g. arm(true) rewinding a film the visitor paused)
    video.addEventListener('seeked', function () { if (!disposed) sync(); });
    video.addEventListener('waiting', function () { if (!disposed) root.classList.add('is-buffering'); });
    video.addEventListener('playing', function () { if (!disposed) root.classList.remove('is-buffering'); });
    // a missing or broken file leaves the element "playing" with no frames (paused stays false): pause it, so the
    // controls show the play state again and the rAF loop above stops instead of running for as long as it is on screen
    video.addEventListener('error', function () { if (!disposed && !video.paused) video.pause(); });
    if (amb) {
      video.addEventListener('timeupdate', ambDraw);
      video.addEventListener('seeked', ambDraw);
    }
    big.addEventListener('click', function () { play(true); });
    toggle.addEventListener('click', function () { if (video.paused) play(true); else pause(true); });
    video.addEventListener('click', function () { if (video.paused) play(true); else pause(true); });
    track.addEventListener('click', function (e) {
      if (e.target !== track && e.target !== fill) return;
      var r = track.getBoundingClientRect(); load();
      video.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (video.duration || dur); play(true);
    });
    if (pv) {
      // when the window was narrow at load time, or the device is touch-first, the sprite waits for the first mouse
      // hover or keyboard focus on the timeline once the previews can show (they are hidden at <= 700px)
      track.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch' && mq(PREV_MQ)) loadSprite(); });
      track.addEventListener('focusin', function () { if (mq(PREV_MQ)) loadSprite(); });
    }
    fs.addEventListener('click', function () {
      // prefixed Safari has no document.fullscreenElement; a refused request must not surface as an unhandled rejection
      var r = null;
      if (fsEl()) {
        var x = document.exitFullscreen || document.webkitExitFullscreen;
        if (x) r = x.call(document);
      } else {
        var f = frame.requestFullscreen || frame.webkitRequestFullscreen;
        if (f) r = f.call(frame); else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      }
      if (r && r.catch) r.catch(function () {});
    });
    // the fullscreen button names what it will do next, also after leaving with Esc (the events fire on the frame)
    function onFsChange() { if (!disposed) fs.setAttribute('aria-label', fsEl() === frame ? 'Tam ekrandan çık' : 'Tam ekran'); }
    frame.addEventListener('fullscreenchange', onFsChange);
    frame.addEventListener('webkitfullscreenchange', onFsChange);

    var near = new IntersectionObserver(function (es) { if (es[es.length - 1].isIntersecting) { near.disconnect(); load(); } }, { rootMargin: '600px 0px' });
    near.observe(root);
    var vis = new IntersectionObserver(function (es) {
      if (disposed) return;
      visible = es[es.length - 1].isIntersecting;
      if (visible) { if (!document.hidden && canAuto()) play(false); }
      else if (!video.paused) pause(false);
    }, { threshold: 0.5 });
    vis.observe(frame);
    function onHide() { if (document.hidden && !video.paused) pause(false); else if (!document.hidden && visible && canAuto()) play(false); }
    document.addEventListener('visibilitychange', onHide);

    return {
      arm: arm,
      dispose: function () {
        if (disposed) return;
        disposed = true;
        near.disconnect(); vis.disconnect(); document.removeEventListener('visibilitychange', onHide);
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (ambImg) { ambImg.onload = ambImg.onerror = null; ambImg = null; }
        if (sprite) sprite.onload = null;
        ambC.forEach(drop); ambC = []; ambX = [];
        video.pause(); video.removeAttribute('src'); video.load();
        root.innerHTML = '';
        root.classList.remove('film', 'cine-live', 'is-live', 'is-playing', 'is-started', 'is-buffering', 'has-prev');
        root.style.removeProperty('--film-pw'); root.style.removeProperty('--film-pk');
      }
    };
  }
  window.D6Film = { mount: mount };
})();
