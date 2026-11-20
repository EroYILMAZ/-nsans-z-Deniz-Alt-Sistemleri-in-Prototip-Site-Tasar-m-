/* Deniz6 — açılıştaki dalış filmi.
   Tek, kesintisiz bir dalış çekimi (Higgsfield ile üretildi) kare kare dört parçaya bölündü. Parçalar ardışık karelerden
   kesildiği için aralarında dikiş yoktur. Sayfa kaydıkça film ileri ya da geri oynar; kaydırma bitince film hemen durmaz,
   yavaşça yavaşlayarak durur (SMOOTH_MS). Kullanım: site.js içindeki Hero bileşeni D6Dive.mount(...) çağırır. */
(function () {
  'use strict';

  // Video ve kapak kareleri herkese açık bir CDN'de durur. Klasöre indirmek isterseniz tools/dalis-indir.bat dosyasını
  // çalıştırın ve aşağıdaki LOCAL değerini true yapın; site o zaman media/dalis/ klasöründeki kopyaları kullanır.
  var LOCAL = false;
  var CDN = 'https://d2ol7oe51mr4n9.cloudfront.net/user_35HNBDu3uKRRyb5p5xObPbRnVCj/';
  var REMOTE = [
    { clip: '4351f746-23f2-4e21-8921-21727ccdf337.mp4', mclip: '4dbe202e-f077-42a8-9dd5-462a49ea2025.mp4', poster: 'c8af4bcb-321a-4146-bb0e-a82ce1244669.jpg', mposter: '6b2ab504-774d-48ab-afcb-b4b22002c9a2.jpg' },
    { clip: '4bc3ae6d-1d8d-4536-bcf2-87841d1ded9d.mp4', mclip: 'b11491e2-1a79-4f17-9cde-83c0969b9415.mp4', poster: '5d1c6ce0-bd95-4970-8c8a-ddd80c4a055e.jpg', mposter: '66a720ab-1a6b-42f3-ba6e-be736930bc4b.jpg' },
    { clip: '0c22da4e-739f-4747-bbae-81b2390fe3e0.mp4', mclip: 'f62bc977-27c7-40ac-9818-91520237299d.mp4', poster: 'eb91cfe5-d078-4d66-bb90-200986b26833.jpg', mposter: 'aaf9438f-2543-43d2-a9ed-de60b4d6c276.jpg' },
    { clip: 'ef3e700e-fb26-4316-9fc9-6b21504ca909.mp4', mclip: '99da69b7-3785-444b-b83f-9d556c62f040.mp4', poster: '1606fbde-f29d-4f80-8d26-3602804c8818.jpg', mposter: '208af060-7127-4458-bfb3-ebad97d64ba1.jpg' }
  ];

  // Filmin kaydırmaya yetişme süresi (ms). Büyüdükçe kaydırma bitince film daha uzun süzülür.
  var SMOOTH_MS = 320;

  function src(i, kind) {
    var n = '0' + (i + 1);
    if (LOCAL) {
      return 'media/dalis/d6-dalis-' + n + (kind === 'mclip' ? '-m.mp4' : kind === 'clip' ? '.mp4' : kind === 'mposter' ? '-m.jpg' : '.jpg');
    }
    return CDN + REMOTE[i][kind];
  }

  var SEGMENTS = REMOTE.map(function (_, i) {
    return { clip: src(i, 'clip'), mclip: src(i, 'mclip'), poster: src(i, 'poster'), mposter: src(i, 'mposter') };
  });

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  function mount(section, stage) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var narrow = window.matchMedia('(max-width: 860px), (hover: none) and (pointer: coarse)').matches;
    var layers = Array.prototype.slice.call(stage.querySelectorAll('[data-dive-layer]'));
    var chapters = Array.prototype.slice.call(stage.querySelectorAll('[data-dive-chapter]'));
    var count = layers.length;
    var segs = layers.map(function (layer, i) {
      return { layer: layer, video: layer.querySelector('video'), url: narrow ? SEGMENTS[i].mclip : SEGMENTS[i].clip, ready: false, loading: false, blob: '' };
    });

    var target = 0, current = 0, last = 0, frame = 0, visible = true, destroyed = false, shown = -1;
    var aborts = [];

    function load(seg) {
      if (seg.loading || seg.ready || reduce) return;
      seg.loading = true;
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      if (ctrl) aborts.push(ctrl);
      // Video önce tamamen belleğe alınır; böylece ileri geri sarmak ağ beklemeden, akıcı olur.
      fetch(seg.url, ctrl ? { signal: ctrl.signal } : undefined)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(function (blob) {
          if (destroyed) return;
          seg.blob = URL.createObjectURL(blob);
          seg.video.src = seg.blob;
          seg.video.addEventListener('loadeddata', function () {
            seg.ready = true;
            seg.layer.setAttribute('data-ready', '');
            queue();
          }, { once: true });
          seg.video.load();
        })
        .catch(function () { seg.loading = false; });
    }

    function readTarget() {
      var rect = section.getBoundingClientRect();
      var travel = Math.max(1, section.offsetHeight - window.innerHeight);
      target = clamp(-rect.top / travel, 0, 1) * count;
    }

    function paint() {
      var idx = Math.min(count - 1, Math.floor(current));
      var local = clamp(current - idx, 0, 0.999);
      if (idx !== shown) {
        segs.forEach(function (s, i) { s.layer.toggleAttribute('data-on', i === idx); });
        shown = idx;
        // Bulunulan parçayla bir sonrakini hazırla.
        load(segs[idx]);
        if (segs[idx + 1]) load(segs[idx + 1]);
        if (segs[idx - 1]) load(segs[idx - 1]);
      }
      var seg = segs[idx];
      if (seg.ready && !seg.video.seeking && seg.video.duration) {
        var t = local * seg.video.duration;
        if (Math.abs(seg.video.currentTime - t) > (narrow ? 0.02 : 0.008)) {
          try { seg.video.currentTime = t; } catch (e) { /* bir sonraki karede yeniden denenir */ }
        }
      }
      // İlk parçada açılış kartı çerçevesinden ayrılır (site.css'teki --p).
      stage.style.setProperty('--p', clamp(current / 0.9, 0, 1).toFixed(3));
      stage.style.setProperty('--dive', (current / count).toFixed(4));
      // Bölüm yazıları: her biri kendi parçasında belirir ve bir sonrakine geçerken kaybolur.
      chapters.forEach(function (el) {
        var k = Number(el.getAttribute('data-dive-chapter'));
        var on = smooth((current - k + 0.25) / 0.3);
        var off = k === count - 1 ? 0 : smooth((current - k - 0.75) / 0.25);
        var o = on * (1 - off);
        el.style.opacity = o.toFixed(3);
        el.style.transform = 'translate3d(0,' + ((1 - on) * 28 - off * 28).toFixed(1) + 'px,0)';
        el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      });
    }

    function tick(now) {
      frame = 0;
      if (destroyed) return;
      var dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      if (reduce) current = target;
      else current += (target - current) * (1 - Math.exp(-dt / SMOOTH_MS));
      if (Math.abs(target - current) < 0.0004) current = target;
      paint();
      if (current !== target) queue(); else last = 0;
    }

    function queue() { if (!frame && visible && !destroyed) frame = requestAnimationFrame(tick); }
    function onScroll() { readTarget(); queue(); }

    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { readTarget(); queue(); } });
    io.observe(section);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // iOS Safari videoyu ilk dokunuşta hazırlamak ister.
    function prime() {
      segs.forEach(function (s) {
        var p = s.video.play();
        if (p && p.then) p.then(function () { s.video.pause(); }).catch(function () {});
        else s.video.pause();
      });
    }
    window.addEventListener('touchstart', prime, { once: true, passive: true });

    readTarget();
    current = target;
    paint();
    load(segs[0]);

    return {
      dispose: function () {
        destroyed = true;
        cancelAnimationFrame(frame);
        io.disconnect();
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        window.removeEventListener('touchstart', prime);
        aborts.forEach(function (c) { c.abort(); });
        segs.forEach(function (s) {
          s.video.removeAttribute('src');
          s.video.load();
          if (s.blob) URL.revokeObjectURL(s.blob);
        });
      }
    };
  }

  window.D6Dive = { segments: SEGMENTS, mount: mount };
})();
