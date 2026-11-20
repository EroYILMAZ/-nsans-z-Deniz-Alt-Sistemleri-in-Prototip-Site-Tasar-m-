/*
 * Deniz6 — site geneli hareketli efektler. React'tan bağımsız çalışır; DOM hazır olduktan sonra elemanları bulur.
 *  - Üstte kaydırma ilerleme çizgisi.
 *  - Butonlarda mıknatıs etkisi, kartlarda 3B eğilme.
 *  - Bölüm etiketlerinde "sonar çözme" (harf karıştırma) efekti.
 * Hareket azaltma tercihinde hepsi kapanır ya da sade hâle döner.
 */
(function () {
  'use strict';
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; (parent || document.body).appendChild(e); return e; }

  /* ---------- scroll progress ---------- */
  var prog = el('div', 'fx-progress'); prog.setAttribute('aria-hidden', 'true');
  var ticking = false;
  // back to top, with the same progress drawn as a ring
  var top = el('button', 'fx-top'); top.type = 'button'; top.setAttribute('aria-label', 'Sayfanın başına dön');
  top.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle class="fx-top-bg" cx="24" cy="24" r="21"/><circle class="fx-top-ring" cx="24" cy="24" r="21" pathLength="1"/><path d="M24 31V17M17.5 23.5L24 17l6.5 6.5"/></svg>';
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  var ring = top.querySelector('.fx-top-ring'), topOn = false;

  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight), k = Math.min(1, window.pageYOffset / max);
      prog.style.transform = 'scaleX(' + k.toFixed(4) + ')';
      ring.style.strokeDashoffset = (1 - k).toFixed(4);
      var on = window.pageYOffset > window.innerHeight * 0.9;
      if (on !== topOn) { topOn = on; top.classList.toggle('is-on', on); }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- optional underwater soundscape (synthesised; off until the visitor turns it on) ---------- */
  (function sound() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var btn = el('button', 'fx-sound'); btn.type = 'button'; btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = '<span class="fx-sound-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="fx-sound-txt">SU SESİ</span>';
    btn.setAttribute('aria-label', 'Su altı sesini aç');
    var ac = null, master = null, timers = [], on = false;
    function build() {
      ac = new AC(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      // deep rumble: brown noise through a slowly breathing low-pass
      var len = ac.sampleRate * 3, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
      var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.6;
      var lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 180; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
      var ng = ac.createGain(); ng.gain.value = 0.55; src.connect(lp); lp.connect(ng); ng.connect(master); src.start();
      // echo for pings
      var dl = ac.createDelay(2), fb = ac.createGain(), wet = ac.createGain(); dl.delayTime.value = 0.42; fb.gain.value = 0.38; wet.gain.value = 0.5;
      dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
      btn.dzEcho = dl;
    }
    function ping() {
      if (!on) return;
      var t = ac.currentTime, o = ac.createOscillator(), gn = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1350, t); o.frequency.exponentialRampToValueAtTime(1180, t + 0.9);
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(0.09, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(gn); gn.connect(master); gn.connect(btn.dzEcho); o.start(t); o.stop(t + 1.3);
      timers.push(setTimeout(ping, 6500 + Math.random() * 3000));
    }
    function bubble() {
      if (!on) return;
      var n = 1 + Math.floor(Math.random() * 4);
      for (var k = 0; k < n; k++) {
        var t = ac.currentTime + k * (0.04 + Math.random() * 0.08), o = ac.createOscillator(), gn = ac.createGain(), f = 300 + Math.random() * 700;
        o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (2 + Math.random()), t + 0.05);
        gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(0.025, t + 0.005); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        o.connect(gn); gn.connect(master); o.start(t); o.stop(t + 0.09);
      }
      timers.push(setTimeout(bubble, 600 + Math.random() * 2600));
    }
    function setOn(v) {
      on = v;
      if (v && !ac) build();
      if (!ac) return;
      if (v) { ac.resume(); master.gain.setTargetAtTime(0.5, ac.currentTime, 0.8); timers.push(setTimeout(ping, 1200)); timers.push(setTimeout(bubble, 800)); }
      else { master.gain.setTargetAtTime(0, ac.currentTime, 0.25); timers.forEach(clearTimeout); timers = []; setTimeout(function () { if (!on) ac.suspend(); }, 900); }
      btn.classList.toggle('is-on', v); btn.setAttribute('aria-pressed', String(v)); btn.setAttribute('aria-label', v ? 'Su altı sesini kapat' : 'Su altı sesini aç');
    }
    btn.addEventListener('click', function () { setOn(!on); });
    document.addEventListener('visibilitychange', function () { if (ac && on) { if (document.hidden) ac.suspend(); else ac.resume(); } });
  })();

  if (reduce) return;

  /* ---------- easter egg: type "deniz6" and the vehicle swims across the bottom of the screen ---------- */
  (function () {
    var word = 'deniz6', buf = '', busy = false;
    window.addEventListener('keydown', function (e) {
      var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!e.key || e.key.length !== 1) return;
      buf = (buf + e.key.toLocaleLowerCase('tr-TR')).slice(-word.length);
      if (buf !== word || busy) return;
      busy = true; buf = '';
      var s = el('div', 'fx-swim'); s.setAttribute('aria-hidden', 'true');
      s.innerHTML = '<svg viewBox="0 0 120 50" width="120" height="50"><path d="M108 25 L128 12 L128 38 Z" fill="#fff1d6" opacity=".25"/>' +
        '<rect x="14" y="10" width="86" height="30" rx="5" fill="none" stroke="#34e7d4" stroke-width="2"/><rect x="18" y="4" width="78" height="7" rx="3" fill="#ff8a2a"/>' +
        '<rect x="30" y="18" width="52" height="14" rx="7" fill="none" stroke="#9fe8f2" stroke-width="1.5"/><ellipse cx="9" cy="32" rx="4" ry="7" fill="#15181c" stroke="#34e7d4"/>' +
        '<ellipse cx="105" cy="32" rx="4" ry="7" fill="#15181c" stroke="#34e7d4"/><circle cx="102" cy="22" r="2.2" fill="#fff1d6"/></svg>' +
        '<span class="fx-swim-tag">D6-ROV · MERHABA</span>';
      for (var i = 0; i < 9; i++) { var bb = el('i', null, s); bb.style.animationDelay = (i * 0.45).toFixed(2) + 's'; }
      setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); busy = false; }, 7200);
    });
  })();

  /* ---------- magnetic buttons, tilting cards ---------- */
  if (fine) {
    document.addEventListener('pointermove', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('.dz-btn, .dz-sub, .dz-team') : null;
      if (!t) return;
      var r = t.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      if (t.classList.contains('dz-btn')) {
        t.style.transform = 'translate3d(' + (dx * 10).toFixed(1) + 'px,' + (dy * 8 - 2).toFixed(1) + 'px,0)';
      } else {
        t.classList.add('fx-tilt', 'is-tilting');
        t.style.transform = 'perspective(900px) rotateX(' + (-dy * 7).toFixed(2) + 'deg) rotateY(' + (dx * 9).toFixed(2) + 'deg) translateZ(0)';
        t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }
      if (!t.dzFxLeave) {
        t.dzFxLeave = true;
        t.addEventListener('pointerleave', function () { t.style.transform = ''; t.classList.remove('is-tilting'); });
      }
    }, { passive: true });
  }

  /* ---------- sonar decode on section eyebrows ---------- */
  var GLYPHS = 'ABCDEFGHİJKLMNOPRSŞTUÜVYZ0123456789#/<>≈';
  function scramble(node) {
    var text = node.nodeValue, len = text.length, start = performance.now(), dur = 380 + len * 28;
    function step(now) {
      var t = (now - start) / dur, out = '';
      for (var i = 0; i < len; i++) {
        var ch = text[i];
        if (ch === ' ' || ch === '·' || t * len * 1.2 > i + 2) out += ch;
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      node.nodeValue = out;
      if (t < 1) requestAnimationFrame(step); else node.nodeValue = text;
    }
    requestAnimationFrame(step);
  }
  var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
  var io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      var tn = e.target.lastChild && e.target.lastChild.nodeType === 3 ? e.target.lastChild : null;
      if (!tn) { var s = e.target.querySelector('span:last-child'); tn = s && s.firstChild && s.firstChild.nodeType === 3 ? s.firstChild : null; }
      if (tn && tn.nodeValue.trim().length > 1) scramble(tn);
    });
  }, { rootMargin: '0px 0px -12% 0px' }) : null;
  function watch() {
    if (!io) return;
    document.querySelectorAll('.dz-sh-eyebrow, .eyebrow, .auvx-kick').forEach(function (n) {
      if (seen) { if (seen.has(n)) return; seen.add(n); }
      io.observe(n);
    });
  }

  // React renders asynchronously; look again shortly after start and whenever the DOM grows.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(watch, 60); });
  else setTimeout(watch, 60);
  if (typeof MutationObserver === 'function') {
    var mt = 0;
    // live widgets (telemetry, film timer, eyebrow decoding) change text constantly; only real layout changes matter
    var LIVE = '.auvx, .film, .dz-cd-digits, .dz-stat, .cine-live, .cine-win, .asc, .cine-lb';
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var t = list[i].target, n = t.nodeType === 1 ? t : t.parentElement;
        if (!n || !n.closest || !n.closest(LIVE)) { clearTimeout(mt); mt = setTimeout(watch, 200); return; }
      }
    }).observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  }
})();
