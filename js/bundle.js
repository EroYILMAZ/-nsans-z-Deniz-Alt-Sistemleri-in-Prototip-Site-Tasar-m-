/* @ds-bundle: {"format":4,"namespace":"Deniz6","components":[{"name":"Wordmark"},{"name":"Icon"},{"name":"Button"},{"name":"Badge"},{"name":"NavBar"},{"name":"Hero"},{"name":"RovIllustration"},{"name":"Bubbles"},{"name":"Reveal"},{"name":"SectionHeader"},{"name":"SonarRadar"},{"name":"DepthGauge"},{"name":"StatCounter"},{"name":"SubsystemCard"},{"name":"TeamCard"},{"name":"Timeline"},{"name":"Countdown"},{"name":"SponsorMarquee"},{"name":"Footer"},{"name":"Ocean3D"}]} */
(function () {
  'use strict';
  var React = window.React;
  var h = React.createElement;
  var Fragment = React.Fragment;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo;
  var uid = 0;
  function useUid(prefix) {
    var r = useRef(null);
    if (r.current === null) { uid += 1; r.current = prefix + uid; }
    return r.current;
  }

  /* ---------- helpers ---------- */
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function omit(obj, keys) { var o = {}; for (var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) o[k] = obj[k]; } return o; }
  function reduceMotion() { return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function fmt(n, dec, grouping) { return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0, useGrouping: grouping !== false }); }
  function initials(name) { return String(name || '').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toLocaleUpperCase('tr-TR'); }

  function useInView(opts) {
    opts = opts || {};
    var ref = useRef(null);
    var st = useState(false), seen = st[0], setSeen = st[1];
    useEffect(function () {
      var el = ref.current;
      if (!el) return undefined;
      if (typeof IntersectionObserver !== 'function') { setSeen(true); return undefined; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { setSeen(true); if (!opts.repeat) io.disconnect(); }
          else if (opts.repeat) setSeen(false);
        });
      }, { threshold: opts.threshold == null ? 0.15 : opts.threshold, rootMargin: opts.rootMargin || '0px 0px -6% 0px' });
      io.observe(el);
      return function () { io.disconnect(); };
    }, []);
    return [ref, seen];
  }

  /* Listens to scrolling on the window OR any large scroll container (scroll events are caught in the capture phase). */
  function readScroll(t) {
    var el = (!t || t === document || t === window || t.nodeType === 9) ? (document.scrollingElement || document.documentElement) : t;
    var max = el.scrollHeight - el.clientHeight;
    return { top: el.scrollTop, progress: max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0, el: el };
  }
  function useScroll(handler) {
    var cb = useRef(handler);
    cb.current = handler;
    useEffect(function () {
      var raf = 0, last = null;
      function on(e) {
        var t = e.target;
        if (t && t.nodeType === 1 && t.clientHeight < window.innerHeight * 0.5) return;
        last = t;
        if (raf) return;
        raf = requestAnimationFrame(function () { raf = 0; cb.current(readScroll(last)); });
      }
      document.addEventListener('scroll', on, { capture: true, passive: true });
      return function () { document.removeEventListener('scroll', on, { capture: true }); if (raf) cancelAnimationFrame(raf); };
    }, []);
  }

  /* ---------- Icon ---------- */
  var F = { fill: 'currentColor', stroke: 'none' };
  function P(d, extra) { return ['path', extra ? Object.assign({ d: d }, extra) : { d: d }]; }
  function C(cx_, cy, r, extra) { return ['circle', Object.assign({ cx: cx_, cy: cy, r: r }, extra || {})]; }
  function R(x, y, w, hh, rx) { return ['rect', { x: x, y: y, width: w, height: hh, rx: rx }]; }
  var BLADE = 'M12 10.2c-.9-2.9.1-5.6 2.7-6.7 1 2.7.1 5.1-2.7 6.7z';
  var WAVE = function (y) { return 'M3 ' + y + 'c1.5 0 1.5-1.5 3-1.5s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5'; };
  var ICONS = {
    pervane: [C(12, 12, 9.5), C(12, 12, 1.8), P(BLADE), P(BLADE, { transform: 'rotate(120 12 12)' }), P(BLADE, { transform: 'rotate(240 12 12)' })],
    kamera: [R(3, 6.5, 18, 13, 3), C(12, 13, 3.6), P('M8.5 6.5 10 4h4l1.5 2.5'), C(17.5, 9.5, 0.6, F)],
    cip: [R(6, 6, 12, 12, 2), R(9.5, 9.5, 5, 5, 1), P('M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3')],
    disli: [C(12, 12, 3), C(12, 12, 6.5), P('M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1')],
    sonar: [C(6, 18, 1.6, F), P('M6 13.5A4.5 4.5 0 0 1 10.5 18'), P('M6 9a9 9 0 0 1 9 9'), P('M6 4.5A13.5 13.5 0 0 1 19.5 18')],
    batarya: [R(2.5, 7, 17, 10, 2), P('M21.5 10.5v3'), P('M11.5 9 9.5 12.2h3L10.5 15')],
    derinlik: [P('M12 3v12'), P('M7.5 10.5 12 15l4.5-4.5'), P(WAVE(20))],
    dalga: [P(WAVE(8)), P(WAVE(13)), P(WAVE(18))],
    pusula: [C(12, 12, 9), P('m15.5 8.5-2 5-5 2 2-5z')],
    kod: [P('M8.5 7 3.5 12l5 5'), P('m15.5 7 5 5-5 5'), P('m13.5 4.5-3 15')],
    'ok-sag': [P('M5 12h14'), P('m13 6 6 6-6 6')],
    'ok-asagi': [P('M12 5v14'), P('m6 13 6 6 6-6')],
    menu: [P('M4 7h16M4 12h16M4 17h16')],
    kapat: [P('m6 6 12 12M18 6 6 18')],
    eposta: [R(3, 5, 18, 14, 2.5), P('m3.5 7 8.5 6 8.5-6')],
    konum: [P('M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z'), C(12, 10, 2.4)],
    baglanti: [P('M14 4h6v6'), P('m20 4-9 9'), P('M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10')],
    takim: [C(9, 8, 3.2), P('M3 19.5c.6-3.2 3.1-5 6-5s5.4 1.8 6 5'), C(17, 9, 2.5), P('M16.5 14.6c2.3.2 4 1.7 4.5 4.4')],
    hedef: [C(12, 12, 8.5), C(12, 12, 4.5), C(12, 12, 1.2, F), P('M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3')],
    odul: [P('M8 4h8v5a4 4 0 0 1-8 0z'), P('M8 6H5a3 3 0 0 0 3 4'), P('M16 6h3a3 3 0 0 1-3 4'), P('M12 13v4'), P('M8.5 20h7'), P('M10 17h4')],
    onay: [P('M5 12.5 9.5 17 19 7.5')],
    oynat: [C(12, 12, 9), P('M10 8.5v7l5.5-3.5z')],
    arti: [P('M12 5v14M5 12h14')],
    eksi: [P('M5 12h14')],
    isik: [P('M9 18h6'), P('M10 21h4'), P('M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1V16h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z')],
    durdur: [P('M9 6v12M15 6v12')],
    yenile: [P('M20 11a8 8 0 1 0-2.3 5.7'), P('M20 4v7h-7')],
    kup3d: [P('M12 2.5 20.5 7v10L12 21.5 3.5 17V7z'), P('M3.5 7 12 11.5 20.5 7'), P('M12 11.5v10')]
  };

  function Icon(p) {
    var size = p.size || 24;
    var parts = ICONS[p.name] || [];
    return h('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      strokeWidth: p.strokeWidth || 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
      className: cx('dz-icon', p.className), style: p.style,
      role: p.label ? 'img' : undefined, 'aria-label': p.label, 'aria-hidden': p.label ? undefined : true, focusable: 'false'
    }, parts.map(function (d, i) { return h(d[0], Object.assign({ key: i }, d[1])); }));
  }
  Icon.names = Object.keys(ICONS);

  /* ---------- Wordmark ---------- */
  function Wordmark(p) {
    var brand = p.brand || 'Deniz6';
    var m = /^(.*?)(\d+)$/.exec(brand);
    var word = m ? m[1] : brand, num = m ? m[2] : '';
    var Tag = p.href ? 'a' : 'span';
    return h(Tag, { href: p.href, className: cx('dz-wordmark', 'dz-wordmark-' + (p.size || 'md'), p.className), 'aria-label': p.href ? brand + ' ana sayfa' : undefined },
      p.logo ? h('img', { className: 'dz-wm-logo', src: p.logo, alt: '' }) : null,
      h('span', { className: 'dz-wm-text' }, word),
      num ? h('span', { className: 'dz-wm-num' }, num, p.ping === false ? null : h('i', { className: 'dz-wm-ping', 'aria-hidden': true })) : null);
  }

  /* ---------- Button ---------- */
  function Button(p) {
    var variant = p.variant || 'primary', size = p.size || 'md';
    var st = useState([]), ripples = st[0], setRipples = st[1];
    var rest = omit(p, ['variant', 'size', 'icon', 'iconLeft', 'children', 'className', 'href', 'onPointerDown']);
    function down(e) {
      if (p.onPointerDown) p.onPointerDown(e);
      if (reduceMotion()) return;
      var r = e.currentTarget.getBoundingClientRect();
      var d = Math.max(r.width, r.height) * 2.2;
      var id = Date.now() + Math.random();
      setRipples(function (l) { return l.concat([{ id: id, x: e.clientX - r.left - d / 2, y: e.clientY - r.top - d / 2, d: d }]); });
      setTimeout(function () { setRipples(function (l) { return l.filter(function (q) { return q.id !== id; }); }); }, 700);
    }
    function ico(v, cls) {
      if (!v) return null;
      return h('span', { className: cls, 'data-dir': v === 'ok-asagi' ? 'down' : undefined }, typeof v === 'string' ? h(Icon, { name: v, size: size === 'lg' ? 20 : 18 }) : v);
    }
    var kids = [
      h(Fragment, { key: 'a' }, ico(p.iconLeft, 'dz-btn-icon-l')),
      h('span', { key: 'b', className: 'dz-btn-label' }, p.children),
      h(Fragment, { key: 'c' }, ico(p.icon, 'dz-btn-icon')),
      h(Fragment, { key: 'd' }, ripples.map(function (q) { return h('span', { key: q.id, className: 'dz-ripple', style: { left: q.x, top: q.y, width: q.d, height: q.d } }); }))
    ];
    var cls = cx('dz-btn', 'dz-btn-' + variant, 'dz-btn-' + size, p.className);
    if (p.href) return h('a', Object.assign({}, rest, { href: p.href, className: cls, onPointerDown: down }), kids);
    return h('button', Object.assign({ type: 'button' }, rest, { className: cls, onPointerDown: down }), kids);
  }

  /* ---------- Badge ---------- */
  function Badge(p) {
    return h('span', { className: cx('dz-badge', 'dz-badge-' + (p.tone || 'neutral'), p.className) },
      p.pulse ? h('span', { className: 'dz-badge-dot', 'aria-hidden': true }) : null,
      p.icon ? h(Icon, { name: p.icon, size: 14, strokeWidth: 2 }) : null,
      p.children);
  }

  /* ---------- NavBar ---------- */
  function NavBar(p) {
    var links = p.links || [];
    var s1 = useState(false), scrolled = s1[0], setScrolled = s1[1];
    var s2 = useState(false), open = s2[0], setOpen = s2[1];
    useScroll(function (s) { setScrolled(s.top > 12); });
    function go(l, e) { setOpen(false); if (p.onNavigate) p.onNavigate(l, e); }
    return h('nav', { className: cx('dz-nav', (scrolled || p.solid) && 'is-scrolled', open && 'is-open', p.className), 'aria-label': p.label || 'Ana gezinme' },
      h('div', { className: 'dz-nav-inner' },
        h(Wordmark, { brand: p.brand, logo: p.logo, href: p.brandHref || '#' }),
        h('ul', { className: 'dz-nav-links', id: 'dz-nav-links' }, links.map(function (l, i) {
          var key = l.id || l.href || l.label;
          return h('li', { key: i }, h('a', {
            href: l.href || '#', className: cx('dz-nav-link', p.active === key && 'is-active'),
            'aria-current': p.active === key ? 'page' : undefined,
            onClick: function (e) { go(l, e); }
          }, l.label));
        })),
        h('div', { className: 'dz-nav-end' },
          p.cta ? h(Button, { size: 'sm', href: p.cta.href, icon: 'ok-sag', className: 'dz-nav-cta', onClick: function (e) { go(p.cta, e); } }, p.cta.label) : null,
          links.length ? h('button', { type: 'button', className: 'dz-nav-toggle', 'aria-expanded': open, 'aria-controls': 'dz-nav-links', 'aria-label': open ? 'Menüyü kapat' : 'Menüyü aç', onClick: function () { setOpen(!open); } },
            h(Icon, { name: open ? 'kapat' : 'menu', size: 22 })) : null)));
  }

  /* ---------- Bubbles ---------- */
  function Bubbles(p) {
    var count = p.count == null ? 18 : p.count, seed = p.seed || 7, speed = p.speed || 1;
    var items = useMemo(function () {
      var r = rng(seed), out = [];
      for (var i = 0; i < count; i++) {
        out.push({
          left: (r() * 100).toFixed(2) + '%', size: 3 + Math.round(r() * 11),
          dur: ((9 + r() * 10) / speed).toFixed(2) + 's', delay: (-r() * 19).toFixed(2) + 's',
          sway: (5 + r() * 16).toFixed(1) + 'px', swayDur: (2.2 + r() * 2.8).toFixed(2) + 's', o: (0.35 + r() * 0.5).toFixed(2)
        });
      }
      return out;
    }, [count, seed, speed]);
    return h('div', { className: cx('dz-bubbles', p.className), 'aria-hidden': true }, items.map(function (b, i) {
      return h('span', { key: i, className: 'dz-bubble', style: { left: b.left, width: b.size, height: b.size, animationDuration: b.dur, animationDelay: b.delay, '--dz-o': b.o, '--dz-sway': b.sway, '--dz-sway-dur': b.swayDur } }, h('i'));
    }));
  }

  /* ---------- Reveal ---------- */
  function Reveal(p) {
    var iv = useInView({ threshold: p.threshold, repeat: p.repeat });
    var rest = omit(p, ['as', 'effect', 'delay', 'threshold', 'repeat', 'className', 'style', 'children']);
    return h(p.as || 'div', Object.assign({}, rest, {
      ref: iv[0],
      className: cx('dz-reveal', 'dz-reveal-' + (p.effect || 'up'), iv[1] && 'is-in', p.className),
      style: Object.assign({ transitionDelay: (p.delay || 0) + 'ms' }, p.style)
    }), p.children);
  }

  /* ---------- SectionHeader ---------- */
  function SectionHeader(p) {
    return h('header', { className: cx('dz-sh', 'dz-sh-' + (p.align || 'left'), p.className) },
      h(Reveal, { className: 'dz-sh-eyebrow' },
        p.index ? h('span', { className: 'dz-sh-index' }, p.index) : null,
        h('span', { className: 'dz-sh-line', 'aria-hidden': true }),
        h('span', null, p.eyebrow)),
      h(Reveal, { as: 'h2', className: 'dz-sh-title', delay: 90 }, p.title),
      p.lead ? h(Reveal, { as: 'p', className: 'dz-sh-lead', delay: 180 }, p.lead) : null);
  }

  /* ---------- RovIllustration ---------- */
  function RovIllustration(p) {
    var id = useUid('dzrov');
    var labels = p.labels !== false;
    var prop = function (cx_, cy) {
      return h('g', { transform: 'translate(' + cx_ + ' ' + cy + ')' },
        h('circle', { r: 33, className: 'dz-f-sunken dz-s-line', strokeWidth: 6 }),
        h('g', { className: 'dz-rov-prop' },
          [0, 120, 240].map(function (a) { return h('path', { key: a, d: 'M0 -3 C 6 -10 6 -22 0 -27 C -6 -22 -6 -10 0 -3 Z', transform: 'rotate(' + a + ')', className: 'dz-f-muted' }); }),
          h('circle', { r: 6, className: 'dz-f-line' })));
    };
    var callout = function (x1, y1, x2, y2, tx, ty, anchor, text, delay) {
      return h('g', { className: 'dz-rov-callout', style: { animationDelay: delay + 'ms' } },
        h('path', { d: 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + ' L' + tx + ' ' + y2, className: 'dz-rov-leader', pathLength: 1 }),
        h('circle', { cx: x1, cy: y1, r: 3, className: 'dz-f-bio' }),
        h('text', { x: tx, y: y2 - 7, textAnchor: anchor, className: 'dz-rov-label' }, text));
    };
    return h('svg', { viewBox: '0 0 520 400', className: cx('dz-rov', p.className), role: 'img', 'aria-label': p.label || 'Deniz6 su altı aracı çizimi' },
      h('defs', null,
        h('linearGradient', { id: id + 'beam', x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: 0, className: 'dz-stop-caustic', stopOpacity: 0.55 }),
          h('stop', { offset: 1, className: 'dz-stop-caustic', stopOpacity: 0 }))),
      h('path', { d: 'M330 -10 C 330 50, 260 40, 260 104', className: 'dz-s-line', strokeWidth: 3, fill: 'none' }),
      h('path', { d: 'M330 -10 C 330 50, 260 40, 260 104', className: 'dz-s-bio dz-rov-data', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }),
      h('g', { className: 'dz-rov-bob' },
        h('polygon', { points: '178,262 118,400 238,400', fill: 'url(#' + id + 'beam)', className: 'dz-rov-beam' }),
        h('polygon', { points: '342,262 282,400 402,400', fill: 'url(#' + id + 'beam)', className: 'dz-rov-beam', style: { animationDelay: '-1.6s' } }),
        h('rect', { x: 156, y: 90, width: 30, height: 16, rx: 5, className: 'dz-f-line' }),
        h('rect', { x: 334, y: 90, width: 30, height: 16, rx: 5, className: 'dz-f-line' }),
        h('rect', { x: 140, y: 102, width: 240, height: 52, rx: 16, className: 'dz-f-signal' }),
        h('rect', { x: 140, y: 140, width: 240, height: 14, rx: 7, className: 'dz-f-onsig', opacity: 0.18 }),
        h('text', { x: 260, y: 134, textAnchor: 'middle', className: 'dz-rov-name' }, 'DENİZ6'),
        h('circle', { cx: 362, cy: 118, r: 4, className: 'dz-f-success dz-rov-led' }),
        h('rect', { x: 120, y: 150, width: 18, height: 112, rx: 9, className: 'dz-f-line' }),
        h('rect', { x: 382, y: 150, width: 18, height: 112, rx: 9, className: 'dz-f-line' }),
        h('rect', { x: 128, y: 148, width: 264, height: 120, rx: 20, className: 'dz-f-raised dz-s-line', strokeWidth: 2 }),
        h('rect', { x: 110, y: 204, width: 22, height: 12, rx: 4, className: 'dz-f-line' }),
        h('rect', { x: 388, y: 204, width: 22, height: 12, rx: 4, className: 'dz-f-line' }),
        prop(80, 210), prop(440, 210),
        h('circle', { cx: 260, cy: 210, r: 42, className: 'dz-f-sunken dz-s-bio', strokeWidth: 2 }),
        h('circle', { cx: 260, cy: 210, r: 20, className: 'dz-f-mid' }),
        h('circle', { cx: 260, cy: 210, r: 8, className: 'dz-f-bio dz-rov-lens' }),
        h('ellipse', { cx: 247, cy: 196, rx: 9, ry: 5, className: 'dz-f-caustic', opacity: 0.5, transform: 'rotate(-30 247 196)' }),
        h('rect', { x: 164, y: 246, width: 28, height: 14, rx: 7, className: 'dz-f-caustic' }),
        h('rect', { x: 328, y: 246, width: 28, height: 14, rx: 7, className: 'dz-f-caustic' }),
        h('path', { d: 'M156 268 v24 h208 v-24', className: 'dz-s-line', strokeWidth: 6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
        h('path', { d: 'M260 268 v14 M248 296 l12 -14 12 14', className: 'dz-s-line', strokeWidth: 4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' })),
      labels ? h('g', null,
        callout(150, 112, 96, 56, 30, 56, 'start', p.labelBuoy || 'YÜZERLİK BLOĞU', 900),
        callout(318, 40, 384, 40, 492, 40, 'end', p.labelTether || 'GÖBEK KABLOSU', 1100),
        callout(64, 240, 52, 342, 30, 342, 'start', p.labelThruster || 'İTİCİ', 1300),
        callout(292, 236, 404, 342, 492, 342, 'end', p.labelCamera || 'KAMERA', 1500)) : null);
  }

  /* ---------- Hero ---------- */
  function Hero(p) {
    var words = String(p.title || '').split(/\s+/).filter(Boolean);
    var norm = function (w) { return w.toLocaleLowerCase('tr-TR').replace(/[.,!?;:]/g, ''); };
    var hl = String(p.highlight || '').split(/\s+/).filter(Boolean).map(norm);
    var step = 70, base = 120;
    var after = base + words.length * step;
    return h('section', { id: p.id, className: cx('dz-hero', p.className), style: p.minHeight ? { minHeight: p.minHeight } : undefined },
      h('div', { className: 'dz-hero-bg', 'aria-hidden': true },
        h('svg', { className: 'dz-hero-surface', viewBox: '0 0 2880 40', preserveAspectRatio: 'none' },
          h('path', { d: 'M0 22 Q 90 8 180 22 T 360 22 T 540 22 T 720 22 T 900 22 T 1080 22 T 1260 22 T 1440 22 T 1620 22 T 1800 22 T 1980 22 T 2160 22 T 2340 22 T 2520 22 T 2700 22 T 2880 22' })),
        [0, 1, 2, 3, 4, 5].map(function (i) { return h('span', { key: i, className: 'dz-ray dz-ray-' + i }); }),
        p.bubbles === 0 ? null : h(Bubbles, { count: p.bubbles || 22, seed: 11 })),
      h('div', { className: cx('dz-hero-inner', p.aside && 'has-aside') },
        h('div', { className: 'dz-hero-copy' },
          p.eyebrow ? h('p', { className: 'dz-hero-eyebrow' }, h('span', { className: 'dz-hero-eyebrow-dot', 'aria-hidden': true }), p.eyebrow) : null,
          h('h1', { className: 'dz-hero-title', 'aria-label': p.title }, words.map(function (w, i) {
            return h(Fragment, { key: i },
              h('span', { className: 'dz-word', 'aria-hidden': true },
                h('span', { className: cx('dz-word-in', hl.indexOf(norm(w)) >= 0 && 'is-hl'), style: { animationDelay: (base + i * step) + 'ms' } }, w)),
              i < words.length - 1 ? ' ' : null);
          })),
          p.lead ? h('p', { className: 'dz-hero-lead', style: { animationDelay: (after + 80) + 'ms' } }, p.lead) : null,
          p.actions ? h('div', { className: 'dz-hero-actions', style: { animationDelay: (after + 200) + 'ms' } }, p.actions) : null,
          p.meta ? h('div', { className: 'dz-hero-meta', style: { animationDelay: (after + 320) + 'ms' } }, p.meta) : null),
        p.aside ? h('div', { className: 'dz-hero-aside' }, p.aside) : null),
      p.cue === false ? null : h('a', { className: 'dz-hero-cue', href: p.cueHref || '#', onClick: p.onCue },
        h('span', { className: 'dz-hero-cue-mouse', 'aria-hidden': true }, h('i')),
        h('span', null, p.cueLabel || 'DAHA DERİNE İN')));
  }

  /* ---------- SonarRadar ---------- */
  function SonarRadar(p) {
    var size = p.size || 280, period = p.period || 4, blips = p.blips || [];
    return h('figure', { className: cx('dz-sonar-wrap', p.className), style: { width: size } },
      h('div', { className: 'dz-sonar', role: 'img', 'aria-label': p.label || 'Sonar taraması', style: { width: size, height: size, '--dz-sonar-period': period + 's', '--dz-step': (size / 8) + 'px' } },
        h('div', { className: 'dz-sonar-grid' }),
        h('div', { className: 'dz-sonar-sweep' }),
        h('div', { className: 'dz-sonar-ping' }),
        ['000', '090', '180', '270'].map(function (b, i) { return h('span', { key: b, className: 'dz-sonar-bearing dz-sonar-b' + i }, b); }),
        blips.map(function (b, i) {
          var ang = b.angle || 0, dist = b.distance == null ? 0.6 : b.distance;
          var a = ang * Math.PI / 180, r = dist * 50;
          return h('div', { key: i, className: cx('dz-sonar-blip', b.tone && 'is-' + b.tone), style: { left: (50 + r * Math.sin(a)) + '%', top: (50 - r * Math.cos(a)) + '%' } },
            h('i', { style: { animationDelay: (ang / 360 * period - period).toFixed(3) + 's' } }),
            b.label ? h('span', null, b.label) : null);
        })),
      p.caption === false ? null : h('figcaption', { className: 'dz-sonar-caption' },
        h(Badge, { tone: 'biolume', pulse: true }, p.status || 'TARANIYOR'),
        h('span', null, p.title || 'SONAR · 360°')));
  }

  /* ---------- DepthGauge ---------- */
  function DepthGauge(p) {
    var max = p.max || 30, height = p.height || 280, ticks = p.ticks || 5;
    var s1 = useState(p.value == null ? 0 : p.value), target = s1[0], setTarget = s1[1];
    var s2 = useState(target), shown = s2[0], setShown = s2[1];
    var cur = useRef(target);
    useEffect(function () { if (p.value != null) setTarget(p.value); }, [p.value]);
    useScroll(function (s) { if (p.value == null) setTarget(s.progress * max); });
    useEffect(function () {
      var raf = 0;
      if (reduceMotion()) { cur.current = target; setShown(target); return undefined; }
      function step() {
        var c = cur.current + (target - cur.current) * 0.12;
        if (Math.abs(target - c) < 0.01) c = target;
        cur.current = c; setShown(c);
        if (c !== target) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
      return function () { cancelAnimationFrame(raf); };
    }, [target]);
    var pct = Math.min(1, Math.max(0, shown / max));
    var bar = 1.01325 + 0.0980665 * shown;
    var tickEls = [];
    for (var i = 0; i <= ticks; i++) {
      tickEls.push(h('span', { key: i, className: 'dz-depth-tick', style: { top: (i / ticks * 100) + '%' } }, h('em', null, fmt(max * i / ticks) )));
    }
    return h('aside', { className: cx('dz-depth', p.fixed && 'is-fixed', p.className), 'aria-label': 'Derinlik göstergesi' },
      h('div', { className: 'dz-depth-head' }, 'DERİNLİK', h('b', { 'aria-live': 'off' }, '−' + fmt(shown, 1) + ' m')),
      h('div', { className: 'dz-depth-track', style: { height: height } },
        h('div', { className: 'dz-depth-fill', style: { height: (pct * 100) + '%' } }),
        tickEls,
        h('div', { className: 'dz-depth-marker', style: { top: (pct * 100) + '%' } })),
      p.pressure === false ? null : h('div', { className: 'dz-depth-foot' }, 'BASINÇ', h('b', null, fmt(bar, 2) + ' bar')));
  }

  /* ---------- StatCounter ---------- */
  function StatCounter(p) {
    var iv = useInView({ threshold: 0.4 });
    var st = useState(reduceMotion() ? p.value : 0), v = st[0], setV = st[1];
    var dec = p.decimals || 0, dur = p.duration || 1600;
    useEffect(function () {
      if (!iv[1]) return undefined;
      if (reduceMotion()) { setV(p.value); return undefined; }
      var t0 = performance.now(), raf = 0;
      function step(t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        setV(p.value * e);
        if (k < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
      return function () { cancelAnimationFrame(raf); };
    }, [iv[1], p.value]);
    return h('div', { ref: iv[0], className: cx('dz-stat', iv[1] && 'is-in', p.className) },
      h('div', { className: 'dz-stat-value', 'aria-label': p.label ? fmt(p.value, dec, p.grouping) + (p.unit ? ' ' + p.unit : '') + ' ' + p.label : undefined },
        p.prefix ? h('span', { className: 'dz-stat-unit' }, p.prefix) : null,
        h('span', null, fmt(v, dec, p.grouping)),
        p.unit ? h('span', { className: 'dz-stat-unit' }, p.unit) : null),
      h('span', { className: 'dz-stat-bar', 'aria-hidden': true }),
      p.label ? h('div', { className: 'dz-stat-label' }, p.label) : null);
  }

  /* ---------- SubsystemCard ---------- */
  function SubsystemCard(p) {
    var ref = useRef(null);
    function move(e) {
      var el = ref.current; if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
    return h('article', { ref: ref, className: cx('dz-sub', p.className), onPointerMove: move },
      h('div', { className: 'dz-sub-top' },
        h('span', { className: 'dz-sub-icon' }, h(Icon, { name: p.icon || 'cip', size: 26 }), h('i', { className: 'dz-sub-ring', 'aria-hidden': true })),
        p.index ? h('span', { className: 'dz-sub-index' }, p.index) : null),
      h('h3', { className: 'dz-sub-title' }, p.title),
      p.description ? h('p', { className: 'dz-sub-desc' }, p.description) : null,
      p.specs && p.specs.length ? h('dl', { className: 'dz-sub-specs' }, p.specs.map(function (s, i) {
        return h('div', { key: i }, h('dt', null, s.label), h('dd', null, s.value));
      })) : null,
      p.children);
  }

  /* ---------- TeamCard ---------- */
  function TeamCard(p) {
    var mark = p.photo ? h('img', { src: p.photo, alt: '' }) : h('span', null, p.initials || initials(p.name));
    return h('article', { className: cx('dz-team', p.className) },
      h('div', { className: 'dz-team-avatar' },
        h('i', { className: 'dz-team-ring', 'aria-hidden': true }),
        h('div', { className: 'dz-team-face' }, mark)),
      h('h3', { className: 'dz-team-name' }, p.name),
      p.role ? h('p', { className: 'dz-team-role' }, p.role) : null,
      p.unit ? h(Badge, { tone: p.tone || 'neutral' }, p.unit) : null,
      p.links && p.links.length ? h('div', { className: 'dz-team-links' }, p.links.map(function (l, i) {
        return h('a', { key: i, href: l.href, className: 'dz-team-link', 'aria-label': l.label }, h(Icon, { name: l.icon || 'baglanti', size: 18 }));
      })) : null);
  }

  /* ---------- Timeline ---------- */
  function Timeline(p) {
    var items = p.items || [];
    var iv = useInView({ threshold: 0.15 });
    var s = useState(0), fill = s[0], setFill = s[1];
    var lastDone = -1, activeIdx = -1;
    items.forEach(function (it, i) { if (it.status === 'done') lastDone = i; if (it.status === 'active' && activeIdx < 0) activeIdx = i; });
    var upto = activeIdx >= 0 ? activeIdx : lastDone;
    useEffect(function () {
      var ol = iv[0].current; if (!ol) return undefined;
      function measure() {
        var nodes = ol.querySelectorAll('.dz-tl-node');
        var rail = ol.querySelector('.dz-tl-rail');
        if (upto < 0 || !nodes[upto] || !rail) { setFill(0); return; }
        var n = nodes[upto];
        setFill(Math.max(0, n.offsetTop + n.offsetHeight / 2 - rail.offsetTop));
      }
      measure();
      var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
      if (ro) ro.observe(ol);
      return function () { if (ro) ro.disconnect(); };
    }, [upto, items.length]);
    return h('ol', { ref: iv[0], className: cx('dz-tl', iv[1] && 'is-in', p.className), style: { '--dz-tl-fill': fill + 'px' } },
      h('span', { className: 'dz-tl-rail', 'aria-hidden': true }, h('span', { className: 'dz-tl-fill' })),
      items.map(function (it, i) {
        var st = it.status || 'next';
        return h('li', { key: i, className: cx('dz-tl-item', 'is-' + st), style: { transitionDelay: (i * 110) + 'ms' }, 'aria-current': st === 'active' ? 'step' : undefined },
          h('span', { className: 'dz-tl-node', 'aria-hidden': true }, st === 'done' ? h(Icon, { name: 'onay', size: 14, strokeWidth: 2.6 }) : null),
          h('div', { className: 'dz-tl-when' }, it.date),
          h('div', { className: 'dz-tl-body' },
            h('h3', null, it.title, st === 'active' ? h(Badge, { tone: 'biolume', pulse: true }, p.activeLabel || 'ŞU AN') : null, st === 'done' ? h('span', { className: 'dz-sr' }, ' (tamamlandı)') : null),
            it.description ? h('p', null, it.description) : null));
      }));
  }

  /* ---------- Countdown ---------- */
  function Countdown(p) {
    var target = useMemo(function () { return new Date(p.target).getTime(); }, [p.target]);
    var st = useState(Date.now()), now = st[0], setNow = st[1];
    useEffect(function () { var t = setInterval(function () { setNow(Date.now()); }, 1000); return function () { clearInterval(t); }; }, []);
    if (isNaN(target)) return null;
    var diff = Math.max(0, target - now);
    if (diff === 0 && p.doneLabel !== null) {
      return h('div', { className: cx('dz-cd', p.className) }, h('p', { className: 'dz-cd-label' }, p.doneLabel || 'YARIŞMA BAŞLADI'));
    }
    var parts = [[Math.floor(diff / 864e5), 'GÜN'], [Math.floor(diff / 36e5) % 24, 'SAAT'], [Math.floor(diff / 6e4) % 60, 'DAKİKA'], [Math.floor(diff / 1e3) % 60, 'SANİYE']];
    var row = [];
    parts.forEach(function (pt, i) {
      if (i) row.push(h('span', { key: 's' + i, className: 'dz-cd-sep', 'aria-hidden': true }, ':'));
      var s = String(pt[0]); if (s.length < 2) s = '0' + s;
      row.push(h('div', { key: 'u' + i, className: 'dz-cd-unit' },
        h('div', { className: 'dz-cd-digits' }, s.split('').map(function (ch, j) { return h('span', { key: j + '-' + ch, className: 'dz-cd-digit' }, ch); })),
        h('span', { className: 'dz-cd-name' }, pt[1])));
    });
    return h('div', { className: cx('dz-cd', p.className), role: 'timer', 'aria-label': (p.label || 'Kalan süre') + ': ' + parts[0][0] + ' gün' },
      p.label ? h('p', { className: 'dz-cd-label' }, p.label) : null,
      h('div', { className: 'dz-cd-row', 'aria-hidden': true }, row),
      p.note ? h('p', { className: 'dz-cd-note' }, p.note) : null);
  }

  /* ---------- SponsorMarquee ---------- */
  function SponsorMarquee(p) {
    var items = p.items || [];
    function row(hidden) {
      return items.map(function (it, i) {
        var name = typeof it === 'string' ? it : it.name;
        var logo = typeof it === 'object' && it ? it.logo : null;
        return h('li', { key: (hidden ? 'b' : 'a') + i, className: 'dz-mq-item', 'aria-hidden': hidden || undefined },
          logo ? h('img', { src: logo, alt: hidden ? '' : name }) : h('span', null, name));
      });
    }
    return h('div', { className: cx('dz-mq', p.className), style: { '--dz-mq-dur': (p.speed || 36) + 's' } },
      h('ul', { className: 'dz-mq-track' }, row(false), row(true)));
  }

  /* ---------- Footer ---------- */
  function Footer(p) {
    var cols = p.columns || [];
    return h('footer', { className: cx('dz-footer', p.className), id: p.id },
      h('svg', { className: 'dz-footer-wave', viewBox: '0 0 2880 60', preserveAspectRatio: 'none', 'aria-hidden': true },
        h('path', { className: 'dz-f-sunken', d: 'M0 30 Q 120 6 240 30 T 480 30 T 720 30 T 960 30 T 1200 30 T 1440 30 T 1680 30 T 1920 30 T 2160 30 T 2400 30 T 2640 30 T 2880 30 V 60 H 0 Z' })),
      h('div', { className: 'dz-footer-inner' },
        h('div', { className: 'dz-footer-brand' },
          h(Wordmark, { brand: p.brand, logo: p.logo, size: 'lg' }),
          p.tagline ? h('p', null, p.tagline) : null,
          p.contact && p.contact.length ? h('ul', { className: 'dz-footer-contact' }, p.contact.map(function (c, i) {
            return h('li', { key: i }, h(Icon, { name: c.icon || 'eposta', size: 18 }), c.href ? h('a', { href: c.href }, c.label) : h('span', null, c.label));
          })) : null),
        cols.map(function (col, i) {
          return h('div', { key: i, className: 'dz-footer-col' },
            h('h4', null, col.title),
            h('ul', null, (col.links || []).map(function (l, j) { return h('li', { key: j }, h('a', { href: l.href || '#', onClick: l.onClick }, l.label)); })));
        })),
      h('div', { className: 'dz-footer-bottom' },
        h('span', null, p.note || ('© ' + new Date().getFullYear() + ' ' + (p.brand || 'Deniz6'))),
        p.bottomRight ? h('span', null, p.bottomRight) : null));
  }

  /* ---------- Ocean3D: a cinematic, non-interactive WebGL submarine (needs THREE r160 as window.THREE or the `three` prop) ---------- */
  var SHOW_LABELS = [
    { id: 'sail', text: 'KULE · ANTEN' },
    { id: 'pcb', text: 'KONTROL KARTI' },
    { id: 'battery', text: 'BATARYA' },
    { id: 'dome', text: 'ÖN KUBBE · KAMERA' },
    { id: 'stern', text: 'PERVANE' },
    { id: 'pods', text: 'BALAST TANKLARI' }
  ];
  var SHOW_PHASES = ['01 · DENİZALTI', '02 · PARÇALARINA AYRILIYOR', '03 · KONTROL KARTI', '04 · YENİDEN BİRLEŞİYOR'];

  var GLSL_CAUSTIC = [
    'vec2 dzHash(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }',
    'float dzVoro(vec2 x, float t){',
    '  vec2 n = floor(x), f = fract(x); float m1 = 8.0, m2 = 8.0;',
    '  for (int j = -1; j <= 1; j++) { for (int i = -1; i <= 1; i++) {',
    '    vec2 g = vec2(float(i), float(j)); vec2 o = dzHash(n + g);',
    '    o = 0.5 + 0.45 * sin(t + 6.2831 * o);',
    '    vec2 r = g + o - f; float d = dot(r, r);',
    '    if (d < m1) { m2 = m1; m1 = d; } else if (d < m2) { m2 = d; }',
    '  } }',
    '  return sqrt(m2) - sqrt(m1);',
    '}',
    'float dzCaustic(vec2 p, float t){',
    '  float a = dzVoro(p + vec2(t * 0.05, 0.0), t * 0.6);',
    '  float b = dzVoro(p * 1.7 + vec2(3.1, 1.7 - t * 0.07), t * 0.8);',
    '  float c = (1.0 - smoothstep(0.0, 0.13, a)) * 0.6 + (1.0 - smoothstep(0.0, 0.1, b)) * 0.45;',
    '  return c * c;',
    '}'
  ].join('\n');

  function webglOk() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  }

  /* Cyclic Catmull-Rom over keyframes [{t, v: [...]}]; the last key must equal the first. */
  function track(keys) {
    var n = keys.length, out = [];
    return function (t) {
      var i = 0;
      while (i < n - 2 && t >= keys[i + 1].t) i++;
      var k0 = keys[i === 0 ? n - 2 : i - 1], k1 = keys[i], k2 = keys[i + 1], k3 = keys[i + 2 > n - 1 ? 1 : i + 2];
      var u = Math.min(1, Math.max(0, (t - k1.t) / (k2.t - k1.t))), u2 = u * u, u3 = u2 * u;
      for (var j = 0; j < k1.v.length; j++) {
        var p0 = k0.v[j], p1 = k1.v[j], p2 = k2.v[j], p3 = k3.v[j];
        out[j] = 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
      }
      return out;
    };
  }
  function ease(x) { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function fade(t, a, b, c, d) { return Math.min(ease((t - a) / (b - a)), 1 - ease((t - c) / (d - c))); }

  function createOcean(THREE, host, o) {
    var V3 = THREE.Vector3;
    var hero = !!o.hero;
    var D = o.duration || 18, K = D / 18;
    var mobile = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || host.clientWidth < 720;
    var still = reduceMotion();
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.className = 'dz-o3d-canvas';
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(hero ? 32 : 34, 1, 0.05, 80);
    var U = { uTime: { value: 0 }, uCaustic: { value: new THREE.Color('#bdf3ff') } };
    var disposables = [];
    function keep(x) { disposables.push(x); return x; }

    /* --- environment map for reflections on acrylic and metal --- */
    var envScene = new THREE.Scene();
    var envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, uniforms: { uTop: { value: new THREE.Color(0xd8f6ff) }, uMid: { value: new THREE.Color(0x1b5f7d) }, uBot: { value: new THREE.Color(0x03111c) } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uTop, uMid, uBot; varying vec3 vDir; void main(){ float hgt = vDir.y; vec3 c = hgt > 0.0 ? mix(uMid, uTop, pow(hgt, 0.7)) : mix(uMid, uBot, pow(-hgt, 0.5)); gl_FragColor = vec4(c, 1.0); }'
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), envMat));
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose(); envMat.dispose();

    /* --- studio lighting under water: cool key, biolume rim, warm buoy-orange kicker --- */
    var hemi = new THREE.HemisphereLight(0xbdf3ff, 0x06202e, 1.25);
    scene.add(hemi);
    var key = new THREE.DirectionalLight(0xeaf8ff, 2.8); key.position.set(3, 6, 4); scene.add(key);
    var rim = new THREE.DirectionalLight(0x34e7d4, 2.4); rim.position.set(-4, 2.5, -4.5); scene.add(rim);
    var kicker = new THREE.DirectionalLight(0xff9a4a, 1.1); kicker.position.set(4, -2.5, -3); scene.add(kicker);

    /* --- shader patch: caustic light rippling over the parts --- */
    function patch(mat, caustic) {
      mat.onBeforeCompile = function (sh) {
        sh.uniforms.uTime = U.uTime; sh.uniforms.uCaustic = U.uCaustic; sh.uniforms.uCausticK = { value: caustic };
        sh.vertexShader = 'varying vec3 vDzWorld; varying float vDzUp;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' +
          '  vDzWorld = (modelMatrix * vec4(transformed, 1.0)).xyz; vDzUp = normalize(mat3(modelMatrix) * objectNormal).y;');
        sh.fragmentShader = 'varying vec3 vDzWorld; varying float vDzUp;\nuniform float uTime; uniform vec3 uCaustic; uniform float uCausticK;\n' + GLSL_CAUSTIC + '\n' +
          sh.fragmentShader.replace('#include <tonemapping_fragment>',
            '  gl_FragColor.rgb += uCaustic * dzCaustic(vDzWorld.xz * 2.4, uTime) * uCausticK * smoothstep(-0.1, 0.9, vDzUp);\n#include <tonemapping_fragment>');
      };
      mat.customProgramCacheKey = function () { return 'dz' + caustic; };
      return keep(mat);
    }
    function canvasTex(w, hh, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = hh;
      draw(c.getContext('2d'), w, hh);
      var t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return keep(t);
    }
    var glowTex = canvasTex(128, 128, function (g, w) {
      var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    var pcbTex = canvasTex(256, 512, function (g, w, hh) {
      var r = rng(77);
      g.fillStyle = '#0d3a2b'; g.fillRect(0, 0, w, hh);
      g.strokeStyle = 'rgba(214,178,92,.75)'; g.lineWidth = 2;
      for (var i = 0; i < 46; i++) {
        var x = 12 + r() * (w - 24), y = 12 + r() * (hh - 24);
        g.beginPath(); g.moveTo(x, y);
        for (var s = 0; s < 3; s++) { if (s % 2) x = 12 + r() * (w - 24); else y = 12 + r() * (hh - 24); g.lineTo(x, y); }
        g.stroke();
        g.fillStyle = 'rgba(226,190,104,.9)'; g.beginPath(); g.arc(x, y, 3, 0, 6.29); g.fill();
      }
      g.strokeStyle = 'rgba(232,246,251,.55)'; g.lineWidth = 1.5; g.strokeRect(6, 6, w - 12, hh - 12);
      g.fillStyle = 'rgba(232,246,251,.7)'; g.font = '600 15px "JetBrains Mono", monospace';
      g.save(); g.translate(w - 18, hh - 16); g.rotate(-Math.PI / 2); g.fillText('DENİZ6 · KONTROL v1', 0, 0); g.restore();
    });

    /* --- the vehicle: a small representative submarine built in separable parts (bow towards +z) --- */
    var M = {
      hull: patch(new THREE.MeshStandardMaterial({ color: 0xff7f22, roughness: 0.38, metalness: 0.08 }), 0.28),
      inner: keep(new THREE.MeshStandardMaterial({ color: 0x0f2232, roughness: 0.7, side: THREE.BackSide })),
      navy: patch(new THREE.MeshStandardMaterial({ color: 0x14304a, roughness: 0.46, metalness: 0.12 }), 0.22),
      metal: keep(new THREE.MeshStandardMaterial({ color: 0xb4c4cf, roughness: 0.26, metalness: 0.95 })),
      black: keep(new THREE.MeshStandardMaterial({ color: 0x0b1117, roughness: 0.5, metalness: 0.1 })),
      white: keep(new THREE.MeshStandardMaterial({ color: 0xe6eef2, roughness: 0.5 })),
      duct: keep(new THREE.MeshStandardMaterial({ color: 0x14304a, roughness: 0.46, metalness: 0.12, side: THREE.DoubleSide })),
      pcb: keep(new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.55, metalness: 0.15 })),
      acrylic: keep(new THREE.MeshPhysicalMaterial({ color: 0xd6eef5, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 })),
      lens: keep(new THREE.MeshStandardMaterial({ color: 0x02060a, roughness: 0.05, metalness: 0.4 })),
      glow: keep(new THREE.MeshBasicMaterial({ color: 0x34e7d4, toneMapped: false })),
      port: keep(new THREE.MeshBasicMaterial({ color: 0x7fe9de, toneMapped: false, transparent: true, opacity: 0.8 })),
      lamp: keep(new THREE.MeshBasicMaterial({ color: 0xfff1d0, toneMapped: false })),
      red: keep(new THREE.MeshBasicMaterial({ color: 0xff5a4f, toneMapped: false })),
      green: keep(new THREE.MeshBasicMaterial({ color: 0x6fe39a, toneMapped: false })),
      wireO: keep(new THREE.MeshStandardMaterial({ color: 0xff7f22, roughness: 0.5 })),
      wireB: keep(new THREE.MeshStandardMaterial({ color: 0x1a1f25, roughness: 0.6 })),
      wireC: keep(new THREE.MeshStandardMaterial({ color: 0x34e7d4, roughness: 0.5, emissive: 0x0b3a36 }))
    };
    var sub = new THREE.Group();
    scene.add(sub);
    function group(name) { var g = new THREE.Group(); g.name = name; sub.add(g); return g; }
    var P = { sail: group('sail'), top: group('top'), bottom: group('bottom'), bow: group('bow'), stern: group('stern'), podL: group('podL'), podR: group('podR'), core: group('core') };
    function add(geo, mat, x, y, z, rx, ry, rz, parent) {
      var mesh = new THREE.Mesh(keep(geo), mat);
      mesh.position.set(x || 0, y || 0, z || 0);
      mesh.rotation.set(rx || 0, ry || 0, rz || 0);
      (parent || P.core).add(mesh);
      return mesh;
    }
    var PI = Math.PI, HALF = PI / 2, HR = 0.28;
    function rrect(s, x, y, w, hh, r) {
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + hh - r); s.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
      s.lineTo(x + r, y + hh); s.quadraticCurveTo(x, y + hh, x, y + hh - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    }
    function hullR(y) {
      if (y > 0.35) { var t = (y - 0.35) / 0.7; return HR * Math.sqrt(Math.max(0, 1 - t * t)); }
      if (y < -0.3) { var u = Math.min(1, (-0.3 - y) / 0.75); return 0.05 + (HR - 0.05) * (1 - Math.pow(u, 1.8)); }
      return HR;
    }
    function lathe(y0, y1, n, mat, inset, phi0, phiLen, parent) {
      var pts = [];
      for (var i = 0; i <= n; i++) { var y = y0 + (y1 - y0) * i / n; pts.push(new THREE.Vector2(Math.max(0.0005, hullR(y) - inset), y)); }
      var g = new THREE.LatheGeometry(pts, 48, phi0, phiLen); g.rotateX(HALF);
      return add(g, mat, 0, 0, 0, 0, 0, 0, parent);
    }
    // hull split into an upper and a lower shell (outer orange skin, dark inner face)
    lathe(-1.05, 0.62, 48, M.hull, 0, HALF, PI, P.top);
    lathe(-1.05, 0.62, 48, M.inner, 0.012, HALF, PI, P.top);
    lathe(-1.05, 0.62, 48, M.hull, 0, -HALF, PI, P.bottom);
    lathe(-1.05, 0.62, 48, M.inner, 0.012, -HALF, PI, P.bottom);
    [0.22, -0.4].forEach(function (z) {
      add(new THREE.TorusGeometry(hullR(z) + 0.003, 0.012, 8, 48, PI), M.navy, 0, 0, z, 0, 0, 0, P.top);
      add(new THREE.TorusGeometry(hullR(z) + 0.003, 0.012, 8, 48, PI), M.navy, 0, 0, z, 0, 0, PI, P.bottom);
    });
    [0.05, -0.17].forEach(function (z) {
      [1, -1].forEach(function (s) {
        var nrm = new V3(s * Math.sin(1.05), Math.cos(1.05), 0);
        var q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), nrm);
        add(new THREE.TorusGeometry(0.042, 0.009, 10, 32), M.metal, nrm.x * HR, nrm.y * HR, z, 0, 0, 0, P.top).quaternion.copy(q);
        add(new THREE.CircleGeometry(0.036, 28), M.port, nrm.x * (HR + 0.002), nrm.y * (HR + 0.002), z, 0, 0, 0, P.top).quaternion.copy(q);
      });
    });
    [1, -1].forEach(function (s) {
      var x = s * hullR(0.45);
      add(new THREE.TorusGeometry(0.055, 0.009, 10, 32), M.glow, x, -0.04, 0.45, 0, HALF, 0, P.bottom);
      add(new THREE.CircleGeometry(0.05, 28), M.black, x * 1.003, -0.04, 0.45, 0, s * HALF, 0, P.bottom);
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 28), M.black, s * 0.14, -0.23, 0.5, HALF, 0, 0, P.bottom);
      add(new THREE.CircleGeometry(0.032, 28), M.lamp, s * 0.14, -0.23, 0.536, 0, 0, 0, P.bottom);
      var lg = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1c9, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })));
      lg.position.set(s * 0.14, -0.23, 0.55); lg.scale.set(0.3, 0.3, 1); P.bottom.add(lg);
    });
    // bow: viewport ring and clear dome
    add(new THREE.TorusGeometry(hullR(0.62) + 0.004, 0.016, 12, 64), M.metal, 0, 0, 0.62, 0, 0, 0, P.bow);
    var dome = lathe(0.62, 1.05, 20, M.acrylic, 0, 0, PI * 2, P.bow);
    dome.renderOrder = 2;
    // sail with the team name, periscope, antenna and navigation lights
    var sailShape = new THREE.Shape(); rrect(sailShape, -0.075, -0.26, 0.15, 0.52, 0.075);
    var sailGeo = new THREE.ExtrudeGeometry(sailShape, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 16 });
    sailGeo.rotateX(-HALF);
    add(sailGeo, M.navy, 0, HR - 0.04, 0.12, 0, 0, 0, P.sail);
    function drawName(g, w, hh) {
      g.clearRect(0, 0, w, hh);
      g.fillStyle = 'rgba(232,246,251,.92)';
      g.font = '700 74px Unbounded, "Arial Black", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('DENİZ6', w / 2, hh / 2 + 4);
    }
    var nameTex = canvasTex(512, 128, drawName);
    var nameMat = keep(new THREE.MeshStandardMaterial({ map: nameTex, transparent: true, roughness: 0.6, depthWrite: false }));
    add(new THREE.PlaneGeometry(0.42, 0.105), nameMat, 0.0965, HR + 0.1, 0.1, 0, HALF, 0, P.sail);
    add(new THREE.PlaneGeometry(0.42, 0.105), nameMat, -0.0965, HR + 0.1, 0.1, 0, -HALF, 0, P.sail);
    add(new THREE.BoxGeometry(0.3, 0.012, 0.09), M.navy, 0, HR + 0.13, 0.26, 0, 0, 0, P.sail);
    add(new THREE.CylinderGeometry(0.013, 0.013, 0.2, 12), M.metal, 0.025, HR + 0.32, 0.2, 0, 0, 0, P.sail);
    add(new THREE.BoxGeometry(0.03, 0.035, 0.06), M.metal, 0.025, HR + 0.43, 0.215, 0, 0, 0, P.sail);
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 8), M.metal, -0.03, HR + 0.35, 0.02, 0, 0, 0, P.sail);
    var navLights = [
      add(new THREE.SphereGeometry(0.016, 12, 10), M.red, 0.098, HR + 0.16, 0.33, 0, 0, 0, P.sail),
      add(new THREE.SphereGeometry(0.016, 12, 10), M.green, -0.098, HR + 0.16, 0.33, 0, 0, 0, P.sail),
      add(new THREE.SphereGeometry(0.012, 12, 10), M.glow, -0.03, HR + 0.49, 0.02, 0, 0, 0, P.sail)
    ];
    // ballast / battery pods
    [[P.podL, 1], [P.podR, -1]].forEach(function (pp) {
      var g = pp[0], x = pp[1] * 0.2;
      add(new THREE.CylinderGeometry(0.065, 0.065, 0.86, 32), M.navy, x, -0.23, -0.05, HALF, 0, 0, g);
      add(new THREE.SphereGeometry(0.065, 24, 16), M.navy, x, -0.23, 0.38, 0, 0, 0, g);
      add(new THREE.SphereGeometry(0.065, 24, 16), M.navy, x, -0.23, -0.48, 0, 0, 0, g);
      add(new THREE.BoxGeometry(0.05, 0.08, 0.05), M.metal, x * 0.72, -0.18, 0.2, 0, 0, 0, g);
      add(new THREE.BoxGeometry(0.05, 0.08, 0.05), M.metal, x * 0.72, -0.18, -0.3, 0, 0, 0, g);
    });
    // stern: cruciform planes, ducted propeller and its shaft
    add(new THREE.BoxGeometry(0.62, 0.016, 0.17), M.navy, 0, 0, -0.8, 0, 0, 0, P.stern);
    add(new THREE.BoxGeometry(0.016, 0.62, 0.17), M.navy, 0, 0, -0.8, 0, 0, 0, P.stern);
    [[0.31, 0], [-0.31, 0], [0, 0.31], [0, -0.31]].forEach(function (c) { add(new THREE.BoxGeometry(0.03, 0.03, 0.17), M.hull, c[0], c[1], -0.8, 0, 0, 0, P.stern); });
    [[0.15, 0, 0.09, 0.012], [-0.15, 0, 0.09, 0.012], [0, 0.15, 0.012, 0.09], [0, -0.15, 0.012, 0.09]].forEach(function (c) { add(new THREE.BoxGeometry(c[2], c[3], 0.05), M.navy, c[0], c[1], -0.99, 0, 0, 0, P.stern); });
    add(new THREE.CylinderGeometry(0.19, 0.16, 0.16, 48, 1, true), M.duct, 0, 0, -1.0, HALF, 0, 0, P.stern);
    add(new THREE.TorusGeometry(0.19, 0.008, 10, 48), M.glow, 0, 0, -0.92, 0, 0, 0, P.stern);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 12), M.metal, 0, 0, -0.9, HALF, 0, 0, P.stern);
    var prop = new THREE.Group(); prop.position.z = -1.03; P.stern.add(prop);
    add(new THREE.ConeGeometry(0.05, 0.13, 24), M.metal, 0, 0, -0.06, -HALF, 0, 0, prop);
    for (var b5 = 0; b5 < 5; b5++) {
      var ba = b5 / 5 * PI * 2;
      add(new THREE.BoxGeometry(0.15, 0.007, 0.05), M.metal, Math.cos(ba) * 0.075, Math.sin(ba) * 0.075, 0, 0, 0, 0, prop).rotation.set(0.55, 0, ba, 'ZYX');
    }
    // core (stays put): rails, control board with parts, battery pack, motor, camera module, wiring
    [0.13, -0.13].forEach(function (x) { add(new THREE.BoxGeometry(0.014, 0.014, 1.3), M.metal, x, -0.035, -0.05); });
    var pcb = add(new THREE.BoxGeometry(0.32, 0.014, 0.6), M.pcb, 0, 0.0, 0.1);
    [[0, 0.1, 0.07, 0.07, M.black], [-0.09, -0.08, 0.05, 0.06, M.black], [0.09, -0.1, 0.05, 0.05, M.black], [-0.09, 0.28, 0.06, 0.04, M.black], [0.1, 0.3, 0.04, 0.03, M.white], [-0.11, 0.0, 0.03, 0.06, M.white]].forEach(function (c) {
      add(new THREE.BoxGeometry(c[2], 0.012, c[3]), c[4], c[0], 0.013, c[1]);
    });
    add(new THREE.BoxGeometry(0.08, 0.035, 0.08), M.metal, 0.08, 0.025, 0.2);
    for (var fi = 0; fi < 5; fi++) add(new THREE.BoxGeometry(0.004, 0.03, 0.08), M.metal, 0.048 + fi * 0.016, 0.055, 0.2);
    [[0.11, 0.06], [0.12, -0.02], [-0.12, 0.14], [-0.04, -0.17]].forEach(function (c) { add(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 14), M.black, c[0], 0.024, c[1]); });
    var leds = [[0.03, -0.18, M.glow], [0.05, -0.18, M.green], [0.07, -0.18, M.red], [-0.02, 0.33, M.glow]].map(function (c) { return add(new THREE.BoxGeometry(0.012, 0.008, 0.012), c[2], c[0], 0.012, c[1]); });
    add(new THREE.BoxGeometry(0.24, 0.1, 0.3), M.navy, 0, -0.1, -0.32);
    add(new THREE.BoxGeometry(0.242, 0.03, 0.302), M.hull, 0, -0.08, -0.32);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12), M.metal, 0.06, -0.04, -0.2);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12), M.red, -0.06, -0.04, -0.2);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 28), M.metal, 0, 0, -0.74, HALF);
    add(new THREE.CylinderGeometry(0.062, 0.062, 0.03, 28), M.navy, 0, 0, -0.68, HALF);
    add(new THREE.CylinderGeometry(0.065, 0.065, 0.1, 32), M.black, 0, 0, 0.66, HALF);
    add(new THREE.TorusGeometry(0.042, 0.008, 12, 40), M.glow, 0, 0, 0.712);
    add(new THREE.SphereGeometry(0.034, 24, 16), M.lens, 0, 0, 0.705);
    function wire(pts, mat) { add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(function (p) { return new V3(p[0], p[1], p[2]); })), 40, 0.009, 8, false), mat); }
    wire([[0.05, -0.05, -0.2], [0.09, -0.02, -0.12], [0.1, 0.012, -0.12]], M.wireO);
    wire([[-0.05, -0.05, -0.2], [-0.07, -0.04, -0.45], [-0.03, -0.02, -0.62], [0, 0, -0.66]], M.wireB);
    wire([[0.06, -0.06, -0.47], [0.05, -0.03, -0.58], [0.03, -0.01, -0.66]], M.wireO);
    wire([[-0.02, 0.012, 0.38], [-0.02, -0.01, 0.5], [0, 0, 0.6]], M.wireC);
    var cabin = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glowTex, color: 0x34e7d4, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.25 })));
    cabin.position.set(0, 0, 0.78); cabin.scale.set(0.45, 0.45, 1); P.core.add(cabin);

    // how each part travels when the vehicle opens up, and when it starts (s, of the 18 s loop)
    var OPEN = {
      sail: { d: new V3(0, 0.62, 0), far: new V3(0, 0.7, -1.9), at: 0 }, top: { d: new V3(0, 0.36, 0), far: new V3(0, 0.9, -1.7), at: 0.3, rx: -0.05 }, bottom: { d: new V3(0, -0.34, 0), at: 0.3, rx: 0.04 },
      bow: { d: new V3(0, 0, 0.5), at: 0.55 }, stern: { d: new V3(0, 0, -0.55), at: 0.55 },
      podL: { d: new V3(0.16, -0.5, 0), at: 0.8 }, podR: { d: new V3(-0.16, -0.5, 0), at: 0.8 }, core: { d: new V3(0, 0, 0), at: 0 }
    };
    var anchors = {
      sail: [P.sail, new V3(0.1, HR + 0.12, 0.12)], pcb: [P.core, new V3(-0.05, 0.03, 0.12)], battery: [P.core, new V3(0.12, -0.12, -0.32)],
      dome: [P.bow, new V3(0, 0.2, 0.9)], stern: [P.stern, new V3(0, 0.22, -1.02)], pods: [P.podL, new V3(0.26, -0.24, 0.25)]
    };

    /* --- soft shadow on an unseen floor, marine snow, bubbles --- */
    var shadowTex = canvasTex(128, 128, function (g, w) {
      var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(0,6,12,.75)'); gr.addColorStop(1, 'rgba(0,6,12,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    var shadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
    shadow.rotation.x = -HALF; shadow.position.y = hero ? -0.75 : -1.15; shadow.scale.set(2.6, 1.4, 1); shadow.renderOrder = -1;
    scene.add(shadow);
    function points(count, spread, vert, frag) {
      var g = keep(new THREE.BufferGeometry());
      var pos = new Float32Array(count * 3), seed = new Float32Array(count), r = rng(count + 3);
      for (var i = 0; i < count; i++) {
        pos[i * 3] = (r() - 0.5) * spread[0]; pos[i * 3 + 1] = r() * spread[1]; pos[i * 3 + 2] = (r() - 0.5) * spread[2];
        seed[i] = r();
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      var mat = keep(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: U.uTime, uColor: U.uCaustic, uPx: { value: dpr } },
        vertexShader: vert, fragmentShader: frag
      }));
      var p = new THREE.Points(g, mat); p.frustumCulled = false;
      return p;
    }
    var snow = points(mobile ? 220 : 420, [9, 8, 9],
      'attribute float aSeed; uniform float uTime; uniform float uPx; varying float vA;\n' +
      'void main(){ vec3 p = position; p.y = mod(p.y - uTime * (0.04 + aSeed * 0.06), 8.0) - 1.5;\n' +
      '  p.x += sin(uTime * 0.3 + aSeed * 30.0) * 0.18; p.z += cos(uTime * 0.25 + aSeed * 20.0) * 0.18;\n' +
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z;\n' +
      '  gl_PointSize = (1.2 + aSeed * 2.6) * uPx * 9.0 / max(d, 0.5); vA = smoothstep(12.0, 2.0, d) * smoothstep(0.3, 1.4, d) * (0.3 + aSeed * 0.45);\n' +
      '  gl_Position = projectionMatrix * mv; }',
      'uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA; gl_FragColor = vec4(uColor * a, a); }');
    snow.position.y = -3;
    scene.add(snow);
    var bubbles = points(mobile ? 40 : 70, [0.22, 1, 0.22],
      'attribute float aSeed; uniform float uTime; uniform float uPx; varying float vA;\n' +
      'void main(){ vec3 p = position; float t = fract(uTime * (0.14 + aSeed * 0.1) + aSeed); p.y = t * 5.0;\n' +
      '  p.z -= t * 0.8; p.x += sin(uTime * 2.2 + aSeed * 40.0) * 0.05 * (1.0 + t * 3.0);\n' +
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z;\n' +
      '  gl_PointSize = (2.0 + aSeed * 5.0) * (1.0 + t) * uPx * 9.0 / max(d, 0.5); vA = smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.55, t);\n' +
      '  gl_Position = projectionMatrix * mv; }',
      'uniform vec3 uColor; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); float ring = smoothstep(0.5, 0.42, d) * (0.35 + 0.65 * smoothstep(0.25, 0.45, d)); float hi = smoothstep(0.14, 0.0, length(q - vec2(-0.14, -0.14))); float a = (ring + hi) * vA * 0.8; gl_FragColor = vec4(uColor * a, a); }');
    scene.add(bubbles);

    /* --- the camera path (azimuth, polar, distance, target x/y/z), one 18 s loop --- */
    var cam = hero ? function (t) { // a steady turntable orbit that loops without a seam
      var a = t / 18 * PI * 2;
      return [0.9 + a, 1.26 + 0.07 * Math.cos(a), 4.45 + 0.12 * Math.sin(a), 0, 0.02, 0];
    } : track([
      { t: 0, v: [0.55, 0.78, 4.7, 0, 0.02, 0] },
      { t: 3, v: [1.0, 1.02, 4.4, 0, 0.02, 0] },
      { t: 6, v: [1.5, 1.3, 4.1, 0, 0.0, 0] },
      { t: 9, v: [1.85, 1.22, 5.1, 0, -0.02, -0.05] },
      { t: 11.6, v: [1.45, 0.42, 2.25, 0, 0.0, 0.08] },
      { t: 13.4, v: [1.15, 0.72, 3.2, 0, 0.0, 0.02] },
      { t: 15.6, v: [0.8, 1.08, 4.5, 0, 0.02, 0] },
      { t: 18, v: [0.55, 0.78, 4.7, 0, 0.02, 0] }
    ]);

    /* --- size, visibility --- */
    function resize() {
      var w = host.clientWidth, hh = host.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh;
      camera.fov = w / hh < 0.9 ? (hero ? 42 : 46) : (hero ? 32 : 34);
      camera.updateProjectionMatrix();
      needs = true;
    }
    var needs = true, visible = true, raf = 0, last = performance.now();
    var time = still ? (hero ? 2 : 9.8) * K : 0, phase = -1;
    var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(function () { resize(); kick(); }) : null;
    if (ro) ro.observe(host); else window.addEventListener('resize', resize);
    var io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '120px' }) : null;
    if (io) io.observe(host);
    function onVis() { if (!document.hidden) kick(); }
    document.addEventListener('visibilitychange', onVis);

    /* --- frame loop --- */
    var tmp = new V3(), stern = new V3(), fpsT = 0, fpsN = 0, slow = 0;
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!still) time += dt;
      var lt = (time % D) / K; // position in the 18 s choreography
      U.uTime.value = time;

      var c = cam(lt), sp = Math.sin(c[1]);
      var R = c[2] * (camera.aspect < 1 ? Math.min(1.7, 0.85 / camera.aspect) : 1);
      camera.position.set(c[3] + R * sp * Math.sin(c[0]), c[4] + R * Math.cos(c[1]), c[5] + R * sp * Math.cos(c[0]));
      camera.lookAt(c[3], c[4], c[5]);

      // the vehicle floats; when it opens, every part travels along its own path, staggered
      sub.position.y = Math.sin(time * 0.9) * 0.04;
      sub.rotation.set(Math.sin(time * 0.6) * 0.03, 0, Math.sin(time * 0.8 + 1) * 0.025);
      if (!hero) {
        Object.keys(OPEN).forEach(function (k) {
          var m = OPEN[k], e = fade(lt, 6 + m.at, 8.6 + m.at, 12.8 + (0.8 - m.at), 15.2 + (0.8 - m.at));
          P[k].position.copy(m.d).multiplyScalar(e);
          if (m.far) P[k].position.addScaledVector(m.far, fade(lt, 9.4, 10.9, 12.2, 13.5)); // out of the way for the close-up on the board
          P[k].rotation.x = (m.rx || 0) * e;
        });
      }
      prop.rotation.z += dt * -9;
      var blink = still || Math.floor(time * 1.4) % 2 === 0;
      navLights.forEach(function (l, i) { l.visible = i === 2 ? !blink : blink; });
      leds.forEach(function (l, i) { l.visible = still || Math.floor(time * 3 + i * 1.7) % 3 !== 0; });
      stern.set(0, 0, -1.1); P.stern.localToWorld(stern);
      bubbles.position.copy(stern);

      renderer.render(scene, camera);
      needs = false;

      // labels and caption in the DOM (the full scene only)
      if (!hero) {
        var w = host.clientWidth, hh = host.clientHeight;
        var all = fade(lt, 8.8, 9.6, 10.6, 11.2), board = fade(lt, 8.8, 9.6, 12.4, 12.9);
        SHOW_LABELS.forEach(function (l) {
          var el = o.ui.labels[l.id]; if (!el) return;
          var a = anchors[l.id];
          tmp.copy(a[1]); a[0].localToWorld(tmp); tmp.project(camera);
          var x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * hh;
          if (!el.dzW) el.dzW = el.firstChild ? el.firstChild.offsetWidth : 120;
          var inside = Math.min(1, Math.max(0, Math.min(x, w - x, y, hh - y) / 24)); // fades out at the frame edge
          el.style.opacity = ((l.id === 'pcb' ? board : all) * inside).toFixed(3);
          el.classList.toggle('is-flip', x > w - el.dzW - 20);
          el.classList.toggle('is-below', y < 70);
          el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        });
        var ph = lt < 6 || lt >= 15.6 ? 0 : lt < 10.2 ? 1 : lt < 12.9 ? 2 : 3;
        if (ph !== phase && o.ui.phase) {
          phase = ph; o.ui.phase.textContent = SHOW_PHASES[ph];
          o.ui.phase.classList.remove('is-in'); void o.ui.phase.offsetWidth; o.ui.phase.classList.add('is-in');
        }
        if (o.ui.bar) o.ui.bar.style.transform = 'scaleX(' + (lt / 18).toFixed(4) + ')';
      }
      fpsT += dt; fpsN++;
      if (fpsT > 0.5) {
        var fps = fpsN / fpsT;
        if (fps < 38 && !still) { slow++; if (slow > 3 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); slow = 0; } } else slow = 0;
        fpsT = 0; fpsN = 0;
      }
      if (!still || needs) kick();
    }
    function kick() { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    resize();
    kick();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
      drawName(nameTex.image.getContext('2d'), 512, 128); nameTex.needsUpdate = true; needs = true; kick();
    });

    return {
      dispose: function () {
        if (raf) cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        scene.traverse(function (x) { if (x.geometry) x.geometry.dispose(); });
        disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
        envRT.dispose();
        renderer.dispose();
        var cv = renderer.domElement; if (cv.parentNode) cv.parentNode.removeChild(cv);
      }
    };
  }

  function Ocean3D(p) {
    var stageRef = useRef(null), ui = useRef({ labels: {} });
    var hero = p.variant === 'hero';
    var T = p.three || window.THREE;
    var s1 = useState('loading'), status = s1[0], setStatus = s1[1];
    useEffect(function () {
      if (!T) { if (!p.pending) setStatus('fallback'); return undefined; }
      if (!webglOk()) { setStatus('fallback'); return undefined; }
      var api;
      try { api = createOcean(T, stageRef.current, { hero: hero, ui: ui.current, duration: p.duration }); }
      catch (err) { if (window.console) console.warn('Ocean3D', err); setStatus('fallback'); return undefined; }
      setStatus('ready');
      return function () { api.dispose(); };
    }, [T, p.pending]);
    var ready = status === 'ready';
    return h('div', {
      className: cx('dz-o3d', hero ? 'dz-o3d-hero' : 'dz-o3d-show', 'is-' + status, p.className),
      'data-theme': p.theme || (hero ? undefined : 'derin'), style: p.height ? { height: p.height } : undefined,
      role: 'img', 'aria-label': p.label || (hero ? 'Deniz6 denizaltısının dönen 3B modeli' : 'Deniz6 denizaltısının parçalarına ayrılıp yeniden birleştiği 3B animasyon: kule, gövde, ön kubbe, pervane, balast tankları, kontrol kartı ve batarya')
    },
      h('div', { ref: stageRef, className: 'dz-o3d-stage', 'aria-hidden': true }),
      hero ? null : h('div', { className: 'dz-o3d-hud dz-o3d-tl', 'aria-hidden': true },
        h(Badge, { tone: 'biolume', pulse: ready }, ready ? 'CANLI 3B' : status === 'fallback' ? 'ÇİZİM' : 'YÜKLENİYOR'),
        h(Badge, null, 'TEMSİLİ MODEL')),
      !hero && ready ? h('div', { className: 'dz-o3d-labels', 'aria-hidden': true }, SHOW_LABELS.map(function (l) {
        return h('span', { key: l.id, className: 'dz-o3d-label', ref: function (el) { ui.current.labels[l.id] = el; } }, h('b', null, l.text));
      })) : null,
      !hero && ready ? h('div', { className: 'dz-o3d-caption', 'aria-hidden': true },
        h('span', { className: 'dz-o3d-phase', ref: function (el) { ui.current.phase = el; } }, SHOW_PHASES[0]),
        h('span', { className: 'dz-o3d-progress' }, h('i', { ref: function (el) { ui.current.bar = el; } }))) : null,
      status === 'loading' ? h('div', { className: 'dz-o3d-loading', role: 'status' }, h('span', { className: 'dz-o3d-loader', 'aria-hidden': true }), hero ? null : h('span', null, '3B sahne hazırlanıyor')) : null,
      status === 'fallback' ? h('div', { className: 'dz-o3d-fallback' },
        p.fallback || h(RovIllustration, { labels: false }),
        hero ? null : h('p', null, 'Bu tarayıcıda 3B sahne açılamadı; aracın çizimini gösteriyoruz.')) : null);
  }

  var api = {
    Wordmark: Wordmark, Icon: Icon, Button: Button, Badge: Badge, NavBar: NavBar, Hero: Hero, RovIllustration: RovIllustration,
    Bubbles: Bubbles, Reveal: Reveal, SectionHeader: SectionHeader, SonarRadar: SonarRadar, DepthGauge: DepthGauge,
    StatCounter: StatCounter, SubsystemCard: SubsystemCard, TeamCard: TeamCard, Timeline: Timeline, Countdown: Countdown,
    SponsorMarquee: SponsorMarquee, Footer: Footer, Ocean3D: Ocean3D
  };
  window.Deniz6 = window.Deniz6 || {};
  Object.assign(window.Deniz6, api);
})();
