/* Deniz6 — açılış sayfası. İçerik js/content.js'ten, bileşenler js/bundle.js'ten (window.Deniz6) gelir. */
(function () {
  'use strict';
  var D = window.Deniz6, h = React.createElement, C = window.DENIZ6_CONTENT || {};
  var reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mailto = C.email ? 'mailto:' + C.email : '#iletisim';

  var LINKS = [
    { id: 'hakkimizda', label: 'Hakkımızda', href: '#hakkimizda' },
    { id: 'arac', label: 'Araç', href: '#arac' },
    { id: 'takim', label: 'Takım', href: '#takim' },
    { id: 'yol', label: 'Yol Haritası', href: '#yol' },
    { id: 'sponsor', label: 'Sponsorlar', href: '#sponsor' }
  ];
  var SOCIAL = (C.social || []).filter(function (s) { return s && s.href; });

  function goTo(id, e) {
    var el = document.getElementById(id);
    if (!el) return;
    if (e) e.preventDefault();
    // Mobil menü aynı tıklamada kapanır; kaydırma, menü kapandıktan sonraki karede başlar ki yarıda kesilmesin.
    requestAnimationFrame(function () { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
    if (window.history && history.replaceState) history.replaceState(null, '', '#' + id);
  }
  function jump(id) { return function (e) { goTo(id, e); }; }

  // Gerçek zamanlı 3B sahneler (js/auv/, Three.js r160). Büyük sahne, ziyaretçi Araç bölümüne yaklaşınca kurulur.
  var AUV = window.D6AUV || null;

  // Giriş bölümü: D6-AUV'nin kendini çizen teknik çizimi (yalnızca SVG + CSS; WebGL ve JS döngüsü yok).
  // Çizgiler sırayla çizilir, sonar tarama çizgisi geçer, iticiler döner, DVL ışınları ve fener yanıp söner.
  var BLUEPRINT = [
    '<svg class="bp-svg" viewBox="0 0 560 360" xmlns="http://www.w3.org/2000/svg">',
    '<defs>',
    '<pattern id="bpGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" class="bp-grid"/></pattern>',
    '<linearGradient id="bpScan" x1="0" x2="1"><stop offset="0" stop-color="#34e7d4" stop-opacity="0"/><stop offset=".85" stop-color="#34e7d4" stop-opacity=".22"/><stop offset="1" stop-color="#bdf3ff" stop-opacity=".9"/></linearGradient>',
    '<linearGradient id="bpBeam" x1="0" x2="1"><stop offset="0" stop-color="#fff1d6" stop-opacity=".55"/><stop offset="1" stop-color="#fff1d6" stop-opacity="0"/></linearGradient>',
    '<marker id="bpArrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" class="bp-arrow"/></marker>',
    '</defs>',
    '<rect width="560" height="360" fill="url(#bpGrid)" class="bp-gridbox"/>',
    '<g class="bp-body">',
    // light cone from the front lamp
    '<path class="bp-beam" d="M470 244 L560 214 L560 278 Z" fill="url(#bpBeam)"/>',
    // pressure hull (hidden lines), dome, flanges
    '<rect class="bp-l bp-hidden" pathLength="1" x="150" y="165" width="270" height="60" rx="8" style="--d:.5s"/>',
    '<path class="bp-l bp-acc" pathLength="1" d="M420 165 A30 30 0 0 1 420 225" style="--d:.7s"/>',
    '<path class="bp-l" pathLength="1" d="M150 160 V230 M420 160 V230" style="--d:.8s"/>',
    // frame plate with pockets
    '<path class="bp-l bp-main" pathLength="1" d="M120 270 L430 270 Q445 270 452 258 L465 230 L465 140 Q465 120 445 120 L120 120 Q100 120 100 140 L100 250 Q100 270 120 270 Z" style="--d:0s"/>',
    '<rect class="bp-l" pathLength="1" x="120" y="150" width="68" height="96" rx="12" style="--d:.25s"/>',
    '<rect class="bp-l" pathLength="1" x="208" y="150" width="114" height="34" rx="10" style="--d:.3s"/>',
    '<rect class="bp-l" pathLength="1" x="208" y="196" width="114" height="50" rx="10" style="--d:.35s"/>',
    '<rect class="bp-l" pathLength="1" x="342" y="150" width="68" height="96" rx="12" style="--d:.4s"/>',
    // buoyancy foam, decal, torpedo tubes, antenna
    '<rect class="bp-l bp-foam" pathLength="1" x="118" y="92" width="324" height="28" rx="10" style="--d:.9s"/>',
    '<text class="bp-decal" x="140" y="111">DENİZ6</text>',
    '<rect class="bp-l" pathLength="1" x="300" y="78" width="84" height="10" rx="5" style="--d:1.1s"/>',
    '<path class="bp-l" pathLength="1" d="M134 92 V58" style="--d:1.15s"/>',
    '<circle class="bp-led" cx="134" cy="55" r="3.5"/>',
    // battery tube, DVL, down camera, gripper, lamp
    '<rect class="bp-l" pathLength="1" x="172" y="234" width="226" height="24" rx="12" style="--d:1s"/>',
    '<rect class="bp-l bp-acc" pathLength="1" x="300" y="270" width="36" height="18" rx="4" style="--d:1.2s"/>',
    '<path class="bp-sonar" d="M308 288 L272 352 M328 288 L364 352"/>',
    '<rect class="bp-l" pathLength="1" x="380" y="270" width="16" height="14" rx="3" style="--d:1.25s"/>',
    '<path class="bp-l" pathLength="1" d="M440 270 V282 Q440 292 452 292 L466 292 M466 292 Q474 292 474 284" style="--d:1.3s"/>',
    '<rect class="bp-l" pathLength="1" x="455" y="238" width="15" height="12" rx="3" style="--d:1.3s"/>',
    // thrusters: vertical (top corners) and vectored (side, seen as ellipses)
    '<g class="bp-thr" style="--d:1.35s"><rect class="bp-l" pathLength="1" x="126" y="124" width="48" height="22" rx="6"/><path class="bp-prop" d="M150 124 V146"/></g>',
    '<g class="bp-thr" style="--d:1.4s"><rect class="bp-l" pathLength="1" x="386" y="124" width="48" height="22" rx="6"/><path class="bp-prop" d="M410 124 V146"/></g>',
    '<g class="bp-thr" style="--d:1.45s"><ellipse class="bp-l" pathLength="1" cx="86" cy="236" rx="13" ry="24"/><path class="bp-prop bp-prop-h" d="M74 236 H98"/></g>',
    '<g class="bp-thr" style="--d:1.5s"><ellipse class="bp-l" pathLength="1" cx="480" cy="236" rx="13" ry="24"/><path class="bp-prop bp-prop-h" d="M468 236 H492"/></g>',
    '</g>',
    // dimensions
    '<g class="bp-dim"><path d="M100 306 H465" marker-start="url(#bpArrow)" marker-end="url(#bpArrow)"/><path d="M100 296 V314 M465 296 V314"/><text x="282" y="300" text-anchor="middle">≈ 900 mm</text>',
    '<path d="M522 58 V290" marker-start="url(#bpArrow)" marker-end="url(#bpArrow)"/><text x="532" y="178" transform="rotate(90 532 178)" text-anchor="middle">≈ 450 mm</text></g>',
    // callouts
    '<g class="bp-call" style="--c:2.1s"><path d="M150 124 L118 52 H24"/><circle cx="150" cy="124" r="3"/><text x="24" y="46">8 × T200 İTİCİ</text></g>',
    '<g class="bp-call" style="--c:2.35s"><path d="M444 190 L476 40 H548"/><circle cx="444" cy="190" r="3"/><text x="548" y="34" text-anchor="end">STEREO KAMERA</text></g>',
    '<g class="bp-call" style="--c:2.6s"><path d="M318 288 L300 336 H200"/><circle cx="318" cy="288" r="3"/><text x="200" y="350">DVL · 4 AKUSTİK IŞIN</text></g>',
    '<g class="bp-call" style="--c:2.85s"><path d="M240 200 L220 160"/><circle cx="240" cy="200" r="3"/><text x="160" y="154">AKRİLİK TÜP</text></g>',
    // sonar scan sweep
    '<g class="bp-scan"><rect x="-90" y="0" width="90" height="360" fill="url(#bpScan)"/></g>',
    '</svg>'
  ].join('');
  function HeroBlueprint() {
    return h('figure', { className: 'bp', role: 'img', 'aria-label': 'D6-AUV su altı aracının ölçülü teknik çizimi: karbon şasi, akrilik tüp, sekiz itici, DVL ve stereo kamera' },
      h('div', { className: 'bp-frame', dangerouslySetInnerHTML: { __html: BLUEPRINT } }),
      h('figcaption', { className: 'bp-cap' },
        h('span', null, h('b', null, 'D6-AUV'), ' · TEKNİK ÇİZİM'),
        h('span', { className: 'bp-cap-r' }, 'REV 0.3 · ÖLÇEK 1:5')));
  }

  // Kaydırmayla ilerleyen tam ekran 3B deneyim: içerik ve sahne js/auv/auv-scene.js'te kurulur.
  function AUVExperience() {
    var ref = React.useRef(null);
    React.useEffect(function () {
      if (!AUV || !AUV.mountExperience) return undefined;
      var api = AUV.mountExperience(ref.current, { cta: [
        { label: 'Sponsor olun', href: '#sponsor', variant: 'signal', onClick: jump('sponsor') },
        { label: 'Bize yazın', href: mailto, variant: 'secondary' }
      ] });
      return function () { if (api) api.dispose(); };
    }, []);
    return h('div', { ref: ref, id: 'deneyim', role: 'region', 'aria-label': 'D6-AUV aracının bölüm bölüm anlatıldığı kaydırmalı 3B deneyim' });
  }

  // Kaydırma hızına göre akan büyük yazı bandı (hareket js/fx.js'te).
  function KineticBand() {
    var words = [['OTONOM', ''], ['8 İTİCİ', 'is-hl'], ['6 DOF', ''], ['DERİNLİĞE HAZIR', 'is-fill'], ['OTONOM SEYİR', ''], ['DENİZ6', 'is-hl']];
    function row(k) {
      var items = [];
      for (var r = 0; r < 2; r++) words.forEach(function (w, i) { items.push(h('span', { key: k + r + 'w' + i, className: w[1] }, w[0])); items.push(h('em', { key: k + r + 'e' + i })); });
      return h('div', { className: 'fx-band-row', key: k }, items);
    }
    return h('div', { className: 'fx-band', 'data-fx-band': '', 'aria-hidden': true }, row('a'), row('b'));
  }

  // Tanıtım filmi: tools/film/ ile önceden render edilmiş MP4 (oynatıcı js/film-player.js).
  var FILM = {
    src: 'media/d6-auv-film-1080.mp4', srcSmall: 'media/d6-auv-film-720.mp4', poster: 'media/d6-auv-film-poster.jpg', duration: 30,
    label: 'D6-AUV tanıtım filmi: araç karanlıkta fenerlerini yakıyor, deniz tabanında süzülüyor, yana kayıp yerinde dönüyor, kapıdan geçiyor, torpido atıyor ve yüzeye doğru yükseliyor',
    chapters: [[0, 'UYANIŞ'], [4.5, 'SÜZÜLÜŞ'], [9, 'İTKİ'], [13, 'ÇEVİKLİK'], [17, 'KAPI'], [22, 'ATIŞ'], [26.5, 'YÜKSELİŞ']]
  };
  // A section whose inner DOM and behaviour belong to a vanilla module in js/cine/ (mounted once, disposed on unmount).
  function useMount(ref, fnName, opts) {
    React.useEffect(function () {
      var C6 = window.D6Cine, api = C6 && C6[fnName] ? C6[fnName](ref.current, opts) : null;
      return function () { if (api && api.dispose) api.dispose(); };
    }, []);
  }

  // Sinema penceresi: kaydırdıkça bir lumboz açılır ve filme geçer (js/cine/window.js).
  var WINDOW = {
    film: FILM, still: 'img/renders/kapiya-yaklasma.webp', still800: 'img/renders/kapiya-yaklasma-800.webp', lq: 'img/renders/kapiya-yaklasma-lq.webp',
    glow: 'img/renders/cine-glow.webp', ambientStrip: 'media/d6-ambient.webp', sprite: 'media/d6-chapters.webp'
  };
  function CineWindow() {
    var ref = React.useRef(null);
    useMount(ref, 'mountWindow', WINDOW);
    return h('section', { id: 'film', 'data-section': 'arac', ref: ref });
  }

  // Görev anları: filmden yazısız kareler (img/renders/), genişleyen paneller ve ışık kutusu (js/cine/kareler.js).
  function still(id, label, cap, t, cv) {
    var b = 'img/renders/' + id;
    return { id: id, src: b + '.webp', src800: b + '-800.webp', lq: b + '-lq.webp', label: label, cap: cap, t: t, frame: Math.round(t * 30), cv: cv };
  }
  var STILLS = [
    still('fenerler', 'UYANIŞ', 'Fenerler yanıyor.', 3.9),
    still('kum-ustu', 'SÜZÜLÜŞ', 'Kumun hemen üstünde.', 6.8),
    still('itici-makro', 'İTKİ', 'Karbon fiber şasi, yakından.', 10.4),
    still('yandan-gecis', 'ÇEVİKLİK', 'Yana kayar, yerinde döner.', 14.4),
    still('kapiya-yaklasma', 'YAKLAŞMA', 'Kapıya yaklaşırken.', 20.7),
    still('kapi', 'KAPI', 'Rengi tanır, kapıdan geçer.', 18.3, { x: 224, y: 165, w: 1016, h: 727, tag: 'KAPI · 0,97' }),
    still('lancer', 'ATIŞ', 'Nişan alır.', 23.1),
    still('hedef', 'İSABET', 'Hedefin tam ortası.', 24.6, { x: 524, y: 71, w: 698, h: 755, tag: 'HEDEF · 0,91' }),
    still('siluet', 'YÜKSELİŞ', 'Işığa karşı siluet.', 27.2),
    still('yuzeye-dogru', 'YÜZEY', 'Yüzeye doğru.', 28.4)
  ];
  STILLS.sort(function (a, b) { return a.t - b.t; });
  var KARELER = { stills: STILLS, strip: ['kum-ustu', 'itici-makro', 'yandan-gecis', 'kapi', 'lancer', 'hedef'] };
  function Kareler() {
    var ref = React.useRef(null);
    useMount(ref, 'mountKareler', KARELER);
    return h('div', { ref: ref });
  }

  // Yüzeye çıkış: kaydırmayla oynayan gerçekçi kare dizisi (img/ascent/, js/cine/ascent.js).
  var ASCENT = {
    d: { n: 65, w: 1280, h: 720, path: 'img/ascent/d/', ext: '.webp' },
    m: { n: 32, w: 480, h: 854, path: 'img/ascent/m/', ext: '.webp' },
    stills: ['img/ascent/d/000.webp', 'img/renders/siluet.webp', 'img/renders/yuzeye-dogru.webp'], gaugeMax: 30
  };
  function Ascent() {
    var ref = React.useRef(null);
    useMount(ref, 'mountAscent', ASCENT);
    return h('section', { id: 'yuzey', 'data-section': 'yuzey', ref: ref });
  }

  // Rakamlarla araç: farklı boyutlu kutular ("bento"), her birinde küçük bir CSS animasyonu.
  function Bento() {
    function cell(cls, delay, kids) { return h(D.Reveal, { className: 'bx ' + cls, delay: delay }, kids); }
    function prop() { return h('span', { className: 'bx-prop', 'aria-hidden': true }, h('i'), h('i'), h('i')); }
    return h('div', { className: 'wrap' },
      h('div', { className: 'bento' },
        cell('bx-big', 0, [h('div', { key: 'v', className: 'bx-v bx-props', 'aria-hidden': true }, prop(), prop(), prop(), prop()),
          h('p', { key: 'n', className: 'bx-num' }, '8'), h('p', { key: 'l', className: 'bx-lbl' }, 'İTİCİ'), h('p', { key: 'd', className: 'bx-desc' }, 'Dört dikey itici derinlik ve duruşu, 45° açılı dört vektörel itici ileri, yanal ve dönüş hareketini sağlar.')]),
        cell('bx-wide', 80, [h('div', { key: 'v', className: 'bx-v bx-axes', 'aria-hidden': true }, h('i', { className: 'ax-x' }), h('i', { className: 'ax-y' }), h('i', { className: 'ax-z' }), h('b')),
          h('p', { key: 'n', className: 'bx-num' }, '6', h('small', null, 'DOF')), h('p', { key: 'l', className: 'bx-lbl' }, 'SERBESTLİK DERECESİ'), h('p', { key: 'd', className: 'bx-desc' }, 'İleri, yanal, dikey; yuvarlanma, yunuslama, dönüş.')]),
        cell('', 160, [h('div', { key: 'v', className: 'bx-v bx-depth', 'aria-hidden': true }, h('i')), h('p', { key: 'n', className: 'bx-num' }, '10', h('small', null, 'm')), h('p', { key: 'l', className: 'bx-lbl' }, 'DERİNLİK HEDEFİ')]),
        cell('', 220, [h('div', { key: 'v', className: 'bx-v bx-ping', 'aria-hidden': true }, h('i'), h('i'), h('b')), h('p', { key: 'n', className: 'bx-num' }, '4'), h('p', { key: 'l', className: 'bx-lbl' }, 'HİDROFON')]),
        cell('bx-wide bx-camcell', 120, [h('div', { key: 'v', className: 'bx-v bx-cam', 'aria-hidden': true }, h('i', { className: 'bx-scan' }), h('span', { className: 'bx-box' }, h('em', null, 'KAPI 0.97'))),
          h('p', { key: 'n', className: 'bx-num bx-num-sm' }, 'Stereo + alt kamera'), h('p', { key: 'l', className: 'bx-lbl' }, 'GÖRÜNTÜ İŞLEME'), h('p', { key: 'd', className: 'bx-desc' }, 'Kapı, renk ve kablo tespiti; derinlik için stereo eşleştirme.')]),
        cell('', 200, [h('p', { key: 'n', className: 'bx-num' }, '≈18', h('small', null, 'kg')), h('p', { key: 'l', className: 'bx-lbl' }, 'HEDEF KÜTLE'), h('p', { key: 'd', className: 'bx-desc' }, 'İki kişiyle taşınabilir.')]),
        cell('bx-accent', 260, [h('p', { key: 'n', className: 'bx-num' }, '0'), h('p', { key: 'l', className: 'bx-lbl' }, 'İNSAN MÜDAHALESİ'), h('p', { key: 'd', className: 'bx-desc' }, 'Görev başladıktan sonra her karar araçta.')])));
  }

  function teamCard(m, i) {
    var links = [];
    if (m.email) links.push({ label: (m.name || 'Üye') + ' e-posta', icon: 'eposta', href: 'mailto:' + m.email });
    if (m.profile) links.push({ label: (m.name || 'Üye') + ' profil', icon: 'baglanti', href: m.profile });
    return h(D.Reveal, { key: i, delay: (i % 3) * 100 },
      h(D.TeamCard, {
        name: m.name || 'Ad Soyad', initials: m.name ? undefined : ('0' + (i + 1)).slice(-2),
        photo: m.photo || undefined, role: m.role, unit: m.unit, tone: m.tone, links: links
      }));
  }

  function Site() {
    var s = React.useState('hero'), active = s[0], setActive = s[1];
    var f = React.useState(false), footerIn = f[0], setFooterIn = f[1];
    var sonarSize = Math.min(340, Math.max(240, window.innerWidth - 40));

    React.useEffect(function () {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) setActive(e.target.getAttribute('data-section')); });
      }, { root: null, rootMargin: '-45% 0px -50% 0px' });
      document.querySelectorAll('[data-section]').forEach(function (el) { io.observe(el); });
      // Footer görünür olunca derinlik göstergesi çekilir, footer sütunlarının üstüne binmez.
      var fo = new IntersectionObserver(function (es) { setFooterIn(es[0].isIntersecting); }, { root: null, rootMargin: '0px 0px -25% 0px' });
      var footer = document.querySelector('.dz-footer');
      if (footer) fo.observe(footer);
      if (location.hash.length > 1) {
        try { var el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) el.scrollIntoView({ block: 'start' }); } catch (err) { /* bozuk adres parçası */ }
      }
      return function () { io.disconnect(); fo.disconnect(); };
    }, []);

    var footerCols = [
      { title: 'SİTE', links: LINKS.slice(0, 4).map(function (l) { return { label: l.label, href: l.href, onClick: jump(l.id) }; }) },
      { title: 'DESTEK', links: [{ label: 'Sponsor olun', href: '#sponsor', onClick: jump('sponsor') }, { label: 'İletişim', href: '#iletisim', onClick: jump('iletisim') }] }
    ];
    if (SOCIAL.length) footerCols.push({ title: 'TAKİP EDİN', links: SOCIAL.map(function (l) { return { label: l.label, href: l.href }; }) });
    var contact = [];
    if (C.email) contact.push({ icon: 'eposta', label: C.email, href: mailto });
    if (C.location) contact.push({ icon: 'konum', label: C.location });

    return h('div', { className: 'site' },
      h('a', { className: 'skip-link', href: '#hakkimizda', onClick: jump('hakkimizda') }, 'İçeriğe geç'),
      h(D.NavBar, { links: LINKS, active: active, logo: C.logo || undefined, cta: { id: 'iletisim', label: 'Bize ulaşın', href: '#iletisim' }, onNavigate: function (l, e) { goTo(l.id, e); }, brandHref: '#' }),
      h('main', null,
        h('div', { 'data-section': 'hero', className: 'hero-slot' },
          h(D.Hero, {
            eyebrow: 'OTONOM SU ALTI ARACI · D6-AUV',
            title: 'Derinliğe hazır bir takım.', highlight: 'derinliğe',
            lead: 'Deniz6, kendi otonom su altı aracını tasarlayan, üreten ve havuzda test eden bir mühendislik takımı. Karanlıkta görebilen, kendi kararını veren bir araç yapıyoruz.',
            actions: h(React.Fragment, null,
              h(D.Button, { size: 'lg', icon: 'ok-asagi', href: '#arac', onClick: jump('arac') }, 'Aracı keşfet'),
              h(D.Button, { size: 'lg', variant: 'secondary', href: '#sponsor', onClick: jump('sponsor') }, 'Sponsor olun')),
            meta: h(React.Fragment, null, h(D.Badge, { tone: 'biolume', pulse: true }, 'TASARIM SÜRÜYOR'), h(D.Badge, null, 'TÜRKİYE')),
            aside: h(HeroBlueprint),
            minHeight: '100svh', cueHref: '#hakkimizda', onCue: jump('hakkimizda')
          })),
        h(D.DepthGauge, { fixed: true, max: 30, height: 260, className: active === 'hero' || active === 'yuzey' || footerIn ? 'gauge-hidden' : '' }),
        h('div', { className: 'depth-bg' },

          h('section', { id: 'hakkimizda', 'data-section': 'hakkimizda', className: 'block' },
            h('div', { className: 'wrap split' },
              h('div', { className: 'prose' },
                h(D.SectionHeader, { index: '01', eyebrow: 'HAKKIMIZDA', title: 'Denizin altını merak eden bir takım.', lead: 'Kendi tasarladığımız ve ürettiğimiz otonom bir su altı aracıyla derinliğe iniyoruz.' }),
                h(D.Reveal, { as: 'p', delay: 240 }, 'Mekanik, elektronik ve yazılımı aynı masada buluşturuyoruz. Amacımız; havuzdaki görevleri kamerayla algılayan, kararlı manevra yapan ve güvenle yüzeye dönen bir araç ortaya koymak. İlk büyük hedefimiz TEKNOFEST 2027 İnsansız Su Altı Sistemleri Yarışması.'),
                h('div', { className: 'stats' }, (C.stats || []).map(function (st, i) { return h(D.StatCounter, Object.assign({ key: i }, st)); }))),
              h(D.Reveal, { effect: 'scale', delay: 150, className: 'sonar-slot' },
                h(D.SonarRadar, { size: sonarSize, blips: [{ angle: 40, distance: 0.55, label: 'KAPI' }, { angle: 135, distance: 0.72, label: 'HEDEF', tone: 'signal' }, { angle: 250, distance: 0.42, label: 'ENGEL' }, { angle: 312, distance: 0.82 }] })))),

          h('section', { id: 'arac', 'data-section': 'arac', className: 'block' },
            h('div', { className: 'wrap' },
              h(D.SectionHeader, { index: '02', eyebrow: 'ARAÇ', title: 'Su altında görmek, karar vermek, ilerlemek.', lead: 'Aşağı kaydırın: D6-AUV karanlıktan yaklaşıyor, gövdesini ve iticilerini gösteriyor, parçalarına ayrılıyor, sensörlerini açıyor, kapıdan geçip hedefe torpido atıyor. Dört alt sistemin her biri ayrı bir ekip tarafından geliştiriliyor.' })),
            h(AUVExperience),
            h(KineticBand),
            h('div', { className: 'wrap' },
              h('div', { className: 'grid4' },
                h(D.Reveal, { delay: 0 }, h(D.SubsystemCard, { icon: 'disli', index: '01', title: 'Mekanik', description: 'Su geçirmez gövde, yüzerlik dengesi ve itici yerleşimi.', specs: [{ label: 'ODAK', value: 'Sızdırmazlık' }, { label: 'ARAÇ', value: 'CAD · CFD' }] })),
                h(D.Reveal, { delay: 100 }, h(D.SubsystemCard, { icon: 'cip', index: '02', title: 'Elektronik', description: 'Güç dağıtımı, sensörler ve itici sürücüleri.', specs: [{ label: 'ODAK', value: 'Güç, sensör' }, { label: 'BAĞLANTI', value: 'Göbek kablosu' }] })),
                h(D.Reveal, { delay: 200 }, h(D.SubsystemCard, { icon: 'kod', index: '03', title: 'Yazılım', description: 'Kontrol döngüleri, görev planlama ve telemetri.', specs: [{ label: 'ODAK', value: 'Kontrol' }, { label: 'ARAYÜZ', value: 'Yer istasyonu' }] })),
                h(D.Reveal, { delay: 300 }, h(D.SubsystemCard, { icon: 'kamera', index: '04', title: 'Görüntü İşleme', description: 'Kamerayla kapı, şekil ve renk tespiti.', specs: [{ label: 'ODAK', value: 'Tespit' }, { label: 'ARAÇ', value: 'OpenCV' }] })))),
            h(Bento)),

          h(CineWindow),

          h('section', { id: 'kareler', 'data-section': 'arac', className: 'block kareler-block' },
            h('div', { className: 'wrap' },
              h(D.SectionHeader, { eyebrow: 'KARELER', title: 'Görev anları.' }),
              h(Kareler))),

          h('section', { id: 'takim', 'data-section': 'takim', className: 'block' },
            h('div', { className: 'wrap' },
              h(D.SectionHeader, { index: '03', eyebrow: 'TAKIM', title: 'Aynı derinlikte, aynı hedefte.', lead: 'Her üye bir alt sistemden sorumlu; kararları birlikte alıyoruz.' }),
              h('div', { className: 'grid3' }, (C.team || []).map(teamCard)))),

          h('section', { id: 'yol', 'data-section': 'yol', className: 'block' },
            h('div', { className: 'wrap' },
              h(D.SectionHeader, { index: '04', eyebrow: 'YOL HARİTASI', title: 'Derinliğe giden rota.', lead: 'Takvimdeki her aşama, aracımızı bir adım daha derine taşıyor.' }),
              h('div', { className: 'tl-wrap' },
                h(D.Timeline, { items: [
                  { date: 'AŞAMA 01', title: 'Takımın kurulması', description: 'Ekip, roller ve çalışma düzeni belirlendi.', status: 'done' },
                  { date: 'AŞAMA 02', title: 'Başvuru', description: 'Başvuru ve kategori seçimi.', status: 'active' },
                  { date: 'AŞAMA 03', title: 'Ön Tasarım Raporu', description: 'Kavramsal tasarım, bütçe ve iş planı.' },
                  { date: 'AŞAMA 04', title: 'Kritik Tasarım Raporu', description: 'Detaylı tasarım, analizler ve test planı.' },
                  { date: 'AŞAMA 05', title: 'Üretim ve testler', description: 'Havuz testleri ve yeterlilik videosu.' },
                  { date: 'AŞAMA 06', title: 'Final', description: 'TEKNOFEST 2027 · havuzda tam otonom görev.' }
                ] })))),

          h('section', { id: 'sponsor', 'data-section': 'sponsor', className: 'block' },
            h('div', { className: 'wrap' },
              h('div', { className: 'sponsor-head' },
                h(D.SectionHeader, { index: '05', eyebrow: 'SPONSORLAR', title: 'Derine birlikte inelim.', lead: 'Desteğiniz malzeme, üretim ve havuz testi giderlerimizi karşılıyor. Logonuz aracımızda ve tüm iletişimimizde yer alır.' }),
                h(D.Reveal, { delay: 200 }, h(D.Button, { variant: 'signal', size: 'lg', iconLeft: 'odul', href: '#iletisim', onClick: jump('iletisim') }, 'Sponsorluk dosyasını isteyin')))),
            h('div', { className: 'mq-wrap' },
              h(D.SponsorMarquee, { items: C.sponsors || [] }))),

          h('section', { id: 'iletisim', 'data-section': 'iletisim', className: 'block' },
            h('div', { className: 'wrap' },
              h(D.Reveal, { effect: 'scale', className: 'cta' },
                h(D.Bubbles, { count: 14, seed: 21 }),
                h('p', { className: 'eyebrow' }, '06 — İLETİŞİM'),
                h('h2', null, 'Geri sayım başladı.'),
                h('p', null, 'Sponsorluk, iş birliği veya sadece merhaba demek için bize yazın. Her mesaj takımın tamamına ulaşır.'),
                h('div', { className: 'cta-row' },
                  C.countdown ? h(D.Countdown, C.countdown) : null,
                  h('div', { className: 'cta-actions' },
                    h(D.Button, { size: 'lg', iconLeft: 'eposta', href: mailto }, 'Bize yazın'),
                    h(D.Button, { size: 'lg', variant: 'secondary', icon: 'ok-sag', href: '#sponsor', onClick: jump('sponsor') }, 'Sponsor olun')))))),

          h(Ascent))),

      h(D.Footer, {
        logo: C.logo || undefined,
        tagline: 'Kendi otonom su altı aracını tasarlayan, üreten ve test eden mühendislik takımı.',
        contact: contact, columns: footerCols,
        bottomRight: 'DENİZ6 · OTONOM SU ALTI ARACI'
      }),
      // the last frame of the page: the name, lit by the surface light from the film's final shot
      h('div', { className: 'surface-mark', 'aria-hidden': true },
        h('p', { className: 'surface-mark__k' }, '0 m · YÜZEY · D6-AUV'),
        h('span', { className: 'surface-mark__w' }, 'DENİZ6')));
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(Site));
})();
