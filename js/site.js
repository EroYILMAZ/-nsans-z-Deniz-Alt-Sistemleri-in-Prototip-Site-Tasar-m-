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

  // Açılış: kaydırmayla oynayan dalış filmi (js/dive-hero.js). Açılış kartı ilk parçada çerçevesinden ayrılır; başlık sol üste,
  // bölüm listesi sol alta yerleşir. Sonraki üç parçada sağda kısa bölüm yazıları belirir. Film kaydırma bitince yavaşça durur.
  var HERO_IDX = [['hakkimizda', 'Hakkımızda'], ['arac', 'Araç'], ['film', 'Film'], ['takim', 'Takım'], ['yol', 'Yol Haritası'], ['sponsor', 'Sponsorlar'], ['iletisim', 'İletişim']];
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  var BUBBLES = [[8, 9, 14, 0, 18], [17, 5, 11, 4, -10], [29, 12, 16, 2, 30], [41, 6, 12, 7, -20], [58, 10, 15, 1, 24], [66, 4, 10, 5, -14], [77, 14, 18, 3, 16], [88, 7, 13, 8, -26], [94, 5, 9, 2, 10], [50, 8, 17, 9, 0]];
  var BOKEH = [[6, 18, 34, 0], [21, 72, 22, 3], [47, 12, 16, 5], [71, 64, 44, 2], [86, 22, 26, 6], [93, 80, 18, 1], [36, 88, 30, 4]];
  var DIVE_CHAPTERS = [
    { k: 1, kick: 'İNİŞ', title: 'Yüzeyden derine.', text: 'Işık azaldıkça iş zorlaşır. D6-ROV, karanlık suda da yönünü kaybetmeden ilerlemek için tasarlanıyor.' },
    { k: 2, kick: 'ARAÇ', title: 'Su altında görmek.', text: 'Kamerasıyla kapıları, şekilleri ve renkleri tanıyor; kararlı manevralarla görevine odaklanıyor.' },
    { k: 3, kick: 'HEDEF', title: 'Derinliğe hazır bir takım.', text: 'İlk büyük hedefimiz TEKNOFEST 2027 İnsansız Su Altı Sistemleri Yarışması.', cta: true }
  ];
  function Hero() {
    var track = React.useRef(null), stage = React.useRef(null);
    React.useEffect(function () {
      var section = track.current, scene = stage.current;
      var card = scene.querySelector('.lay-card'), title = scene.querySelector('.lay-title'), idx = scene.querySelector('.lay-idx');
      function measure() {
        // where the title and the index end up once the card has let go (top-left / bottom-left, aligned with .wrap)
        var cx = card.offsetLeft - card.offsetWidth / 2, cy = card.offsetTop - card.offsetHeight / 2;
        var left = Math.max(20, (window.innerWidth - 1100) / 2 + 32);
        scene.style.setProperty('--tx', (left - cx - title.offsetLeft) + 'px');
        scene.style.setProperty('--ty', (92 - cy - title.offsetTop) + 'px');
        scene.style.setProperty('--lx', (left - cx - idx.offsetLeft) + 'px');
        scene.style.setProperty('--ly', (scene.offsetHeight - idx.offsetHeight - 92 - cy - idx.offsetTop) + 'px');
      }
      measure();
      window.addEventListener('resize', measure);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
      var api = window.D6Dive ? window.D6Dive.mount(section, scene) : null;
      return function () {
        window.removeEventListener('resize', measure);
        if (api) api.dispose();
      };
    }, []);

    var segs = (window.D6Dive && window.D6Dive.segments) || [];
    function layer(cls, kids) { return h('div', { className: 'lay-l ' + cls, 'aria-hidden': true }, kids); }
    return h('section', { className: 'lay dive', ref: track, 'data-section': 'hero', 'aria-labelledby': 'dive-title' },
      h('div', { className: 'lay-stage', ref: stage },
        h('div', { className: 'dive-media', 'aria-hidden': true }, segs.map(function (sg, i) {
          return h('figure', { key: i, className: 'dive-layer', 'data-dive-layer': '', 'data-on': i === 0 ? '' : undefined },
            h('picture', null,
              h('source', { media: '(max-width: 860px)', srcSet: sg.mposter }),
              h('img', { src: sg.poster, alt: '', width: 1280, height: 720, decoding: 'async', loading: i === 0 ? 'eager' : 'lazy', fetchPriority: i === 0 ? 'high' : 'low' })),
            h('video', { muted: true, playsInline: true, preload: 'auto', disablePictureInPicture: true, tabIndex: -1 }));
        })),
        layer('lay-bub', BUBBLES.map(function (b, i) {
          return h('i', { key: i, style: { left: b[0] + '%', '--s': b[1] + 'px', '--t': b[2] + 's', '--d': -b[3] + 's', '--w': b[4] + 'px' } });
        })),
        layer('lay-bokeh', BOKEH.map(function (b, i) {
          return h('i', { key: i, style: { left: b[0] + '%', top: b[1] + '%', '--s': b[2] + 'px', '--d': -b[3] + 's' } });
        })),
        layer('lay-shade'),
        h('div', { className: 'lay-card' },
          h('div', { className: 'lay-title' },
            h('p', { className: 'lay-kick' }, 'D6-ROV · SU ALTI ROBOTİĞİ'),
            h('h1', { id: 'dive-title' }, 'Deniz', h('em', null, '6')),
            h('p', null, 'Uzaktan kumandalı su altı aracımızı tasarlıyor, üretiyor ve havuzda test ediyoruz.')),
          h('ul', { className: 'lay-idx' }, HERO_IDX.map(function (it, i) {
            return h('li', { key: it[0] }, h('a', { href: '#' + it[0], onClick: jump(it[0]) }, it[1], h('span', null, ROMAN[i])));
          }))),
        h('div', { className: 'dive-chapters' }, DIVE_CHAPTERS.map(function (c) {
          return h('article', { key: c.k, className: 'dive-ch', 'data-dive-chapter': c.k },
            h('p', { className: 'dive-ch-kick' }, c.kick),
            h('h2', null, c.title),
            h('p', null, c.text),
            c.cta ? h('div', { className: 'dive-ch-actions' },
              h('a', { className: 'dive-cta', href: '#arac', onClick: jump('arac') }, 'Aracı keşfet'),
              h('a', { className: 'dive-link', href: '#iletisim', onClick: jump('iletisim') }, 'Bize ulaşın', h('span', { 'aria-hidden': true }, '→'))) : null);
        })),
        h('div', { className: 'dive-meter', 'aria-hidden': true }, h('span'))));
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
    return h('div', { ref: ref, id: 'deneyim', role: 'region', 'aria-label': 'D6-ROV aracının bölüm bölüm anlatıldığı kaydırmalı 3B deneyim' });
  }

  // Tanıtım filmi: Higgsfield ile üretilmiş gerçekçi 30 saniyelik su altı filmi (oynatıcı js/film-player.js).
  // Dosyalar herkese açık bir CDN'de durur; klasöre indirmek için tools/dalis-indir.bat çalıştırıp FILM_LOCAL = true yapın.
  // Eski, kodla çizilmiş film media/d6-auv-film-*.mp4 olarak klasörde duruyor.
  var FILM_LOCAL = false;
  var FILM_CDN = 'https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/';
  function filmFile(local, remote) { return FILM_LOCAL ? 'media/film/' + local : FILM_CDN + remote; }
  var FILM = {
    src: filmFile('d6-rov-film-720.mp4', '6b7fe4e1-4939-4f4a-b215-2e952506beae.mp4'),
    srcSmall: filmFile('d6-rov-film-540.mp4', 'd657493a-c550-4b74-8e91-5d80c9898e46.mp4'),
    poster: filmFile('d6-rov-film-poster.jpg', 'ee98faf6-db64-4b82-ab01-7ff82cd7c65c.jpg'), duration: 30,
    label: 'D6-ROV tanıtım filmi: araç karanlıkta fenerlerini yakıyor, havuz tabanında süzülüyor, iticilerini çalıştırıyor, yana kayıp yerinde dönüyor, kapıdan geçiyor, torpido atıyor ve yüzeye doğru yükseliyor',
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
    glow: 'img/renders/cine-glow.webp', ambientStrip: filmFile('d6-rov-ambient.webp', '1654dda9-8e6a-4a44-b915-9ac1e8f1a53c.webp'), sprite: filmFile('d6-rov-chapters.webp', '3b436e29-e996-4500-844a-7e718a0eb831.webp'), static: true
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
        cell('bx-accent', 260, [h('p', { key: 'n', className: 'bx-num' }, '1'), h('p', { key: 'l', className: 'bx-lbl' }, 'GÖBEK KABLOSU'), h('p', { key: 'd', className: 'bx-desc' }, 'Güç ve veri tek kabloda; pilot yer istasyonundan yönetir.')])));
  }

  // Bölümler arası derinlik işareti: göründüğünde sonar çizgisi çizilir ve derinlik etiketi belirir.
  function DepthMark(p) {
    return h(D.Reveal, { className: 'dm', 'aria-hidden': true },
      h('span', { className: 'dm-line' }, h('i')),
      h('span', { className: 'dm-val' }, '−' + p.d + ' m'),
      h('span', { className: 'dm-line dm-line-r' }, h('i')));
  }

  function teamCard(m, i) {
    var links = [];
    if (m.email) links.push({ label: (m.name || 'Üye') + ' e-posta', icon: 'eposta', href: 'mailto:' + m.email });
    if (m.profile) links.push({ label: (m.name || 'Üye') + ' profil', icon: 'baglanti', href: m.profile });
    return h(D.Reveal, { key: i, delay: (i % 3) * 100 },
      h(D.TeamCard, {
        name: m.name || m.role,
        photo: m.photo || undefined, role: m.name ? m.role : undefined, unit: m.unit, tone: m.tone, links: links
      }));
  }

  function Site() {
    var s = React.useState('hero'), active = s[0], setActive = s[1];
    var f = React.useState(false), footerIn = f[0], setFooterIn = f[1];
    var sonarSize = Math.min(340, Math.max(240, window.innerWidth - 40));

    React.useEffect(function () {
      var sections = document.querySelectorAll('[data-section]'), io;
      function observeSections() {
        if (io) io.disconnect();
        var midpoint = Math.floor(window.innerHeight / 2);
        io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) setActive(e.target.getAttribute('data-section')); });
        }, { rootMargin: '-' + midpoint + 'px 0px -' + Math.max(0, window.innerHeight - midpoint - 1) + 'px 0px' });
        sections.forEach(function (el) { io.observe(el); });
      }
      observeSections();
      window.addEventListener('resize', observeSections);
      // Footer görünür olunca derinlik göstergesi çekilir, footer sütunlarının üstüne binmez.
      var fo = new IntersectionObserver(function (es) { setFooterIn(es[0].isIntersecting); }, { root: null, rootMargin: '0px 0px -25% 0px' });
      var footer = document.querySelector('.dz-footer');
      if (footer) fo.observe(footer);
      if (location.hash.length > 1) {
        try { var el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) el.scrollIntoView({ block: 'start' }); } catch (err) { /* bozuk adres parçası */ }
      }
      return function () { window.removeEventListener('resize', observeSections); io.disconnect(); fo.disconnect(); };
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
        h(Hero),
        h('div', { className: 'depth-bg' },

          h('section', { id: 'hakkimizda', 'data-section': 'hakkimizda', className: 'block' },
            h('div', { className: 'wrap split' },
              h('div', { className: 'prose' },
                h(D.SectionHeader, { index: '01', eyebrow: 'HAKKIMIZDA', title: 'Denizin altını merak eden bir takım.', lead: 'Kendi tasarladığımız ve ürettiğimiz uzaktan kumandalı bir su altı aracıyla derinliğe iniyoruz.' }),
                h(D.Reveal, { as: 'p', delay: 240 }, 'Mekanik, elektronik ve yazılımı aynı masada buluşturuyoruz. Amacımız; havuzdaki görevleri kamerayla algılayan, kararlı manevra yapan ve güvenle yüzeye dönen bir araç ortaya koymak. İlk büyük hedefimiz TEKNOFEST 2027 İnsansız Su Altı Sistemleri Yarışması.'),
                h('div', { className: 'stats' }, (C.stats || []).map(function (st, i) { return h(D.StatCounter, Object.assign({ key: i }, st)); }))),
              h(D.Reveal, { effect: 'scale', delay: 150, className: 'sonar-slot' },
                h(D.SonarRadar, { size: sonarSize, blips: [{ angle: 40, distance: 0.55, label: 'KAPI' }, { angle: 135, distance: 0.72, label: 'HEDEF', tone: 'signal' }, { angle: 250, distance: 0.42, label: 'ENGEL' }, { angle: 312, distance: 0.82 }] })))),

          h(DepthMark, { d: 6 }),
          h('section', { id: 'arac', 'data-section': 'arac', className: 'block' },
            h('div', { className: 'wrap' },
              h(D.SectionHeader, { index: '02', eyebrow: 'ARAÇ', title: 'Su altında görmek, yönlendirmek, ilerlemek.', lead: 'Aşağı kaydırın; D6-ROV bölüm bölüm açılıyor.' })),
            h(AUVExperience),
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

          h(DepthMark, { d: 12 }),
          h('section', { id: 'takim', 'data-section': 'takim', className: 'block' },
            h('div', { className: 'wrap' },
              h(D.SectionHeader, { index: '03', eyebrow: 'TAKIM', title: 'Aynı derinlikte, aynı hedefte.', lead: 'Her üye bir alt sistemden sorumlu; kararları birlikte alıyoruz.' }),
              h('div', { className: 'grid3' }, (C.team || []).map(teamCard)))),

          h(DepthMark, { d: 18 }),
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
                  { date: 'AŞAMA 06', title: 'Final', description: 'TEKNOFEST 2027 · havuzda pilotlu görev.' }
                ] })))),

          h(DepthMark, { d: 24 }),
          h('section', { id: 'sponsor', 'data-section': 'sponsor', className: 'block' },
            h('div', { className: 'wrap' },
              h('div', { className: 'sponsor-head' },
                h(D.SectionHeader, { index: '05', eyebrow: 'SPONSORLAR', title: 'Derine birlikte inelim.', lead: 'Desteğiniz malzeme, üretim ve havuz testi giderlerimizi karşılıyor. Logonuz aracımızda ve tüm iletişimimizde yer alır.' }),
                h(D.Reveal, { delay: 200 }, h(D.Button, { variant: 'signal', size: 'lg', iconLeft: 'odul', href: '#iletisim', onClick: jump('iletisim') }, 'Sponsorluk dosyasını isteyin')))),
            C.sponsors && C.sponsors.length ? h('div', { className: 'mq-wrap' },
              h(D.SponsorMarquee, { items: C.sponsors })) : null),

          h(DepthMark, { d: 28 }),
          h('section', { id: 'iletisim', 'data-section': 'iletisim', className: 'block' },
            h('div', { className: 'wrap' },
              h(D.Reveal, { effect: 'scale', className: 'cta' },
                h(D.Bubbles, { count: 14, seed: 21 }),
                h('p', { className: 'eyebrow' }, '06 — İLETİŞİM'),
                h('h2', null, 'Haberleşelim.'),
                h('p', null, 'Sponsorluk, iş birliği veya sadece merhaba demek için bize yazın. Her mesaj takımın tamamına ulaşır.'),
                h('div', { className: 'cta-row' },
                  h('div', { className: 'cta-actions' },
                    h(D.Button, { size: 'lg', iconLeft: 'eposta', href: mailto }, 'Bize yazın'),
                    h(D.Button, { size: 'lg', variant: 'secondary', icon: 'ok-sag', href: '#sponsor', onClick: jump('sponsor') }, 'Sponsor olun')))))),

          h(Ascent))),

      h(D.Footer, {
        logo: C.logo || undefined,
        tagline: 'Kendi uzaktan kumandalı su altı aracını (ROV) tasarlayan, üreten ve test eden mühendislik takımı.',
        contact: contact, columns: footerCols,
        bottomRight: 'DENİZ6 · UZAKTAN KUMANDALI SU ALTI ARACI'
      }),
      // the last frame of the page: the name, lit by the surface light from the film's final shot
      h('div', { className: 'surface-mark', 'aria-hidden': true },
        h('p', { className: 'surface-mark__k' }, '0 m · YÜZEY · D6-ROV'),
        h('span', { className: 'surface-mark__w' }, 'DENİZ6')));
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(Site));
})();
