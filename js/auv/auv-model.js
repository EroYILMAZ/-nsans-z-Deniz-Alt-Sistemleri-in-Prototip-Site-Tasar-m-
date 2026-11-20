/*
 * Deniz6 — D6-ROV temsili modeli (Three.js r160, tamamen prosedürel; dış dosya gerektirmez).
 * Ölçek metre; burun +z, üst +y. Mimari, RoboSub ve TEKNOFEST'te derece alan araçların ortak düzenini izler:
 * açık karbon fiber şasi, merkezi akrilik basınç tüpü, 4 dikey + 4 vektörel (45°) itici, iki batarya tüpü,
 * DVL, stereo ön kamera, alt kamera, hidrofon dizisi, torpido lançeri, işaret bırakıcı ve tutucu kol.
 * Takımın kendi CAD modeli hazır olunca bu dosyanın yerine GLB yükleyici konabilir.
 */
(function () {
  'use strict';
  var PI = Math.PI, HALF = PI / 2;

  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function canvas(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }

  /* ---------- procedural textures ---------- */
  function makeTextures(THREE, aniso) {
    var list = [];
    function tex(c, srgb, rx, ry) {
      var t = new THREE.CanvasTexture(c);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx || 1, ry || 1);
      t.anisotropy = aniso;
      list.push(t);
      return t;
    }
    // brushed metal: long horizontal streaks, used as roughness
    var brushed = canvas(512, 512, function (g, w, h) {
      var r = rng(5);
      g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) {
        var v = 90 + Math.floor(r() * 110);
        g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.12 + r() * 0.25).toFixed(2) + ')';
        g.lineWidth = r() < 0.85 ? 1 : 2;
        var y = r() * h, x = r() * w, l = 40 + r() * 320;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (r() - 0.5) * 1.2); g.stroke();
      }
      for (var k = 0; k < 40; k++) { // a few scuffs
        g.fillStyle = 'rgba(200,200,200,' + (0.05 + r() * 0.1).toFixed(2) + ')';
        g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 10, 0, 6.3); g.fill();
      }
    });
    // 2x2 twill carbon fibre
    function carbonDraw(bump) {
      return function (g, w, h) {
        var n = 16, cs = w / n;
        for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
          var horiz = ((i + j) % 4) < 2, x = i * cs, y = j * cs;
          var gr = horiz ? g.createLinearGradient(x, y, x, y + cs) : g.createLinearGradient(x, y, x + cs, y);
          if (bump) { gr.addColorStop(0, '#202020'); gr.addColorStop(0.5, '#f0f0f0'); gr.addColorStop(1, '#202020'); }
          else { gr.addColorStop(0, '#0b0d10'); gr.addColorStop(0.45, horiz ? '#3a4048' : '#2a2f36'); gr.addColorStop(1, '#0b0d10'); }
          g.fillStyle = gr; g.fillRect(x, y, cs, cs);
          if (!bump) {
            g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1;
            for (var f = 1; f < 5; f++) {
              g.beginPath();
              if (horiz) { g.moveTo(x, y + f * cs / 5); g.lineTo(x + cs, y + f * cs / 5); }
              else { g.moveTo(x + f * cs / 5, y); g.lineTo(x + f * cs / 5, y + cs); }
              g.stroke();
            }
          }
        }
      };
    }
    var carbon = canvas(256, 256, carbonDraw(false)), carbonB = canvas(256, 256, carbonDraw(true));
    // open-cell foam
    var foamN = canvas(256, 256, function (g, w, h) {
      var r = rng(19);
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 3800; i++) {
        var v = Math.floor(r() * 255);
        g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.5)';
        g.beginPath(); g.arc(r() * w, r() * h, 0.6 + r() * 1.8, 0, 6.3); g.fill();
      }
    });
    function pcbDraw(base, trace, seed, label) {
      return function (g, w, h) {
        var r = rng(seed);
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        g.strokeStyle = trace; g.lineWidth = 2;
        for (var i = 0; i < 70; i++) {
          var x = 10 + r() * (w - 20), y = 10 + r() * (h - 20);
          g.beginPath(); g.moveTo(x, y);
          for (var s = 0; s < 3; s++) { if (s % 2) x = 10 + r() * (w - 20); else y = 10 + r() * (h - 20); g.lineTo(x, y); }
          g.stroke();
          g.fillStyle = 'rgba(220,186,110,.9)'; g.beginPath(); g.arc(x, y, 2.5, 0, 6.3); g.fill();
        }
        for (var k = 0; k < 26; k++) { // smd parts
          g.fillStyle = r() < 0.5 ? '#111' : '#2b2b2b';
          var pw = 6 + r() * 22, ph = 6 + r() * 14;
          g.fillRect(r() * (w - pw), r() * (h - ph), pw, ph);
        }
        g.fillStyle = 'rgba(240,240,240,.75)'; g.font = '600 13px "JetBrains Mono", monospace';
        if (label) g.fillText(label, 12, h - 12);
      };
    }
    var pcbG = canvas(256, 256, pcbDraw('#0f4a34', 'rgba(190,160,80,.55)', 7, 'D6-ESC'));
    var pcbK = canvas(256, 256, pcbDraw('#111417', 'rgba(150,160,170,.35)', 9, 'D6-CORE'));
    return {
      list: list,
      brushed: tex(brushed, false, 2, 2),
      brushedFine: tex(brushed, false, 6, 1),
      carbon: tex(carbon, true, 9, 9),
      carbonB: tex(carbonB, false, 9, 9),
      foam: tex(foamN, false, 6, 6),
      pcbG: tex(pcbG, true),
      pcbK: tex(pcbK, true)
    };
  }

  function drawDecal(g, w, h) {
    g.clearRect(0, 0, w, h);
    // Turkish flag
    var fx = 18, fy = 26, fw = 108, fh = 72;
    g.fillStyle = '#e30a17'; g.fillRect(fx, fy, fw, fh);
    var cx = fx + fh * 0.5, cy = fy + fh / 2;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, fh * 0.25, 0, 6.3); g.fill();
    g.fillStyle = '#e30a17'; g.beginPath(); g.arc(cx + fh * 0.0625, cy, fh * 0.2, 0, 6.3); g.fill();
    g.fillStyle = '#fff'; g.beginPath();
    var sx = cx + fh * 0.333 - fh * 0.05, sr = fh * 0.125;
    for (var i = 0; i < 10; i++) { var a = -HALF + i * PI / 5 + PI, rr = i % 2 ? sr * 0.4 : sr; g.lineTo(sx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(12,16,20,.92)';
    g.font = '700 70px Unbounded, "Arial Black", sans-serif'; g.textBaseline = 'middle';
    g.fillText('DENİZ6', 150, 64);
    g.font = '600 22px "JetBrains Mono", Consolas, monospace';
    g.fillText('D6-ROV · REV 0.3', 154, 112);
  }

  /* ---------- the vehicle ---------- */
  function build(THREE, opt) {
    opt = opt || {};
    var V3 = THREE.Vector3;
    var T = makeTextures(THREE, opt.anisotropy || 4);
    var disposables = T.list.slice();
    function keep(x) { disposables.push(x); return x; }
    var patch = opt.patch || function (m) { return m; };
    var film = !!opt.film;

    var M = {
      alu: patch(keep(new THREE.MeshStandardMaterial({ color: 0xc4ccd3, metalness: 1, roughness: 0.34, roughnessMap: T.brushed })), 0.35),
      aluFine: keep(new THREE.MeshStandardMaterial({ color: 0xd2d8de, metalness: 1, roughness: 0.28, roughnessMap: T.brushedFine })),
      anoBlack: patch(keep(new THREE.MeshStandardMaterial({ color: 0x1a1e23, metalness: 0.75, roughness: 0.4, roughnessMap: T.brushed })), 0.25),
      anoBlue: patch(keep(new THREE.MeshStandardMaterial({ color: 0x1f4f6e, metalness: 0.85, roughness: 0.3, roughnessMap: T.brushedFine })), 0.3),
      anoTeal: keep(new THREE.MeshStandardMaterial({ color: 0x0f6a66, metalness: 0.85, roughness: 0.3, roughnessMap: T.brushedFine })),
      // film: full physical shading (clearcoat, transmission, iridescence); site: the cheaper standard model for the big surfaces
      carbon: patch(keep(film ? new THREE.MeshPhysicalMaterial({ color: 0xdfe6ec, map: T.carbon, bumpMap: T.carbonB, bumpScale: 0.6, roughness: 0.42, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 })
        : new THREE.MeshStandardMaterial({ color: 0xc9d3db, map: T.carbon, bumpMap: T.carbonB, bumpScale: 0.6, roughness: 0.36, metalness: 0.3 })), 0.3),
      // plain alpha instead of transmission: transmission renders the whole scene a second time every frame
      acrylic: keep(film ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.008, ior: 1.49, envMapIntensity: 1.25, attenuationColor: new THREE.Color(0xdff8ff), attenuationDistance: 1.5, side: THREE.DoubleSide, transparent: true })
        : new THREE.MeshStandardMaterial({ color: 0xe4f6ff, metalness: 0.1, roughness: 0.04, envMapIntensity: 1.6, side: THREE.DoubleSide, transparent: true, opacity: 0.2, depthWrite: false })),
      clear: keep(new THREE.MeshStandardMaterial({ color: 0xeaf8ff, metalness: 0.1, roughness: 0.06, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })),
      plastic: patch(keep(new THREE.MeshStandardMaterial({ color: 0x121417, metalness: 0.05, roughness: 0.52, side: THREE.DoubleSide })), 0.2),
      plasticGrey: keep(new THREE.MeshStandardMaterial({ color: 0x3a4148, metalness: 0.1, roughness: 0.55 })),
      prop: keep(new THREE.MeshStandardMaterial({ color: 0x1a1d21, metalness: 0.1, roughness: 0.38, side: THREE.DoubleSide })),
      rubber: keep(new THREE.MeshStandardMaterial({ color: 0x0b0c0d, metalness: 0, roughness: 0.85 })),
      foam: patch(keep(new THREE.MeshStandardMaterial({ color: 0xff6d1f, metalness: 0, roughness: 0.88, bumpMap: T.foam, bumpScale: 1.2 })), 0.4),
      pcbG: keep(new THREE.MeshStandardMaterial({ map: T.pcbG, roughness: 0.5, metalness: 0.2 })),
      pcbK: keep(new THREE.MeshStandardMaterial({ map: T.pcbK, roughness: 0.45, metalness: 0.2 })),
      gold: keep(new THREE.MeshStandardMaterial({ color: 0xd2a656, metalness: 1, roughness: 0.3 })),
      steel: keep(new THREE.MeshStandardMaterial({ color: 0xe1e5e8, metalness: 1, roughness: 0.22 })),
      red: keep(new THREE.MeshStandardMaterial({ color: 0xc8231d, metalness: 0.1, roughness: 0.35 })),
      white: keep(new THREE.MeshStandardMaterial({ color: 0xe9edf0, metalness: 0, roughness: 0.45 })),
      torp: keep(new THREE.MeshStandardMaterial({ color: 0xff7a1c, metalness: 0.2, roughness: 0.32 })),
      lens: keep(film ? new THREE.MeshPhysicalMaterial({ color: 0x03060a, metalness: 0.3, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.6, iridescenceIOR: 1.6 })
        : new THREE.MeshStandardMaterial({ color: 0x03060a, metalness: 0.6, roughness: 0.05 })),
      cable: keep(new THREE.MeshStandardMaterial({ color: 0x101214, metalness: 0, roughness: 0.6 })),
      cableTeal: keep(new THREE.MeshStandardMaterial({ color: 0x0d4f4b, metalness: 0, roughness: 0.55 })),
      lamp: keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 4.6, 4.0), toneMapped: false })),
      ledTeal: keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 1.45), toneMapped: false })),
      ledRed: keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 0.4, 0.3), toneMapped: false })),
      ledGreen: keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 4.0, 1.0), toneMapped: false }))
    };
    var decalCanvas = canvas(1024, 140, drawDecal);
    var decalTex = keep(new THREE.CanvasTexture(decalCanvas));
    decalTex.colorSpace = THREE.SRGBColorSpace; decalTex.anisotropy = opt.anisotropy || 4;
    M.decal = keep(new THREE.MeshStandardMaterial({ map: decalTex, transparent: true, roughness: 0.6, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));

    var root = new THREE.Group(); root.name = 'D6-ROV';
    var parts = {}, order = [];
    function part(name, ex, delay) {
      var g = new THREE.Group(); g.name = name; root.add(g);
      parts[name] = { g: g, ex: ex || new V3(), delay: delay || 0 };
      order.push(name);
      return g;
    }
    function add(parent, geo, mat, x, y, z, rx, ry, rz) {
      var m = new THREE.Mesh(keep(geo), mat);
      m.position.set(x || 0, y || 0, z || 0);
      if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      return m;
    }
    // ring along z: rectangle lathed around the axis
    function ringZ(rIn, rOut, len, seg) {
      var pts = [new THREE.Vector2(rIn, -len / 2), new THREE.Vector2(rOut, -len / 2), new THREE.Vector2(rOut, len / 2), new THREE.Vector2(rIn, len / 2), new THREE.Vector2(rIn, -len / 2)];
      var g = new THREE.LatheGeometry(pts, seg || 64); g.rotateX(HALF); return g;
    }
    function cylZ(r, len, seg, open) { var g = new THREE.CylinderGeometry(r, r, len, seg || 32, 1, !!open); g.rotateX(HALF); return g; }
    function cylX(r, len, seg) { var g = new THREE.CylinderGeometry(r, r, len, seg || 24); g.rotateZ(HALF); return g; }
    function rrPath(p, x, y, w, h, r) {
      p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
      p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
      p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
      return p;
    }
    function bolts(parent, n, r, z, size, mat, y) {
      for (var i = 0; i < n; i++) {
        var a = (i + 0.5) / n * PI * 2;
        add(parent, new THREE.CylinderGeometry(size, size, size * 1.1, 6), mat || M.steel, Math.cos(a) * r, (y || 0) + Math.sin(a) * r, z, HALF, 0, 0);
      }
    }

    var HY = 0.03, HR = 0.095; // pressure hull axis height and radius

    /* --- pressure hull: acrylic tube, aluminium flanges --- */
    var hull = part('hull');
    var tube = add(hull, cylZ(HR, 0.47, 72, true), M.acrylic, 0, HY, 0);
    tube.castShadow = false; tube.renderOrder = 3;
    add(hull, ringZ(HR - 0.004, HR + 0.011, 0.034), M.alu, 0, HY, 0.243);
    add(hull, ringZ(HR - 0.004, HR + 0.011, 0.034), M.alu, 0, HY, -0.243);
    add(hull, ringZ(HR + 0.0005, HR + 0.004, 0.004), M.rubber, 0, HY, 0.222);
    add(hull, ringZ(HR + 0.0005, HR + 0.004, 0.004), M.rubber, 0, HY, -0.222);
    bolts(hull, 8, HR + 0.006, 0.262, 0.0042, M.steel, HY);

    var dome = part('dome', new V3(0, 0, 0.3), 0.2);
    var domeGeo = new THREE.SphereGeometry(HR - 0.002, 64, 32, 0, PI * 2, 0, HALF); domeGeo.rotateX(HALF);
    var domeMesh = add(dome, domeGeo, M.acrylic, 0, HY, 0.262); domeMesh.castShadow = false; domeMesh.renderOrder = 3;
    add(dome, ringZ(HR - 0.008, HR + 0.012, 0.012), M.anoBlack, 0, HY, 0.266);

    var cap = part('cap', new V3(0, 0, -0.45), 0.2);
    add(cap, cylZ(HR + 0.011, 0.018, 64), M.alu, 0, HY, -0.271);
    add(cap, ringZ(HR - 0.02, HR + 0.011, 0.004), M.anoBlack, 0, HY, -0.281);
    bolts(cap, 8, HR + 0.004, -0.282, 0.0042, M.steel, HY);
    var penetrators = [];
    for (var pi = 0; pi < 12; pi++) {
      var pa = pi / 12 * PI * 2, pr = pi % 2 ? 0.058 : 0.068, px = Math.cos(pa) * pr * 0.95, py = HY + Math.sin(pa) * pr * 0.95;
      add(cap, cylZ(0.0068, 0.014, 6), M.aluFine, px, py, -0.287);
      add(cap, cylZ(0.0048, 0.02, 12), M.rubber, px, py, -0.302);
      penetrators.push(new V3(px, py, -0.312));
    }
    add(cap, cylZ(0.012, 0.016, 20), M.anoBlack, 0, HY + 0.012, -0.288);   // vent / pressure test port
    add(cap, cylZ(0.006, 0.006, 12), M.red, 0, HY + 0.012, -0.298);

    /* --- electronics sled inside the hull (slides out of the rear) --- */
    var tray = part('tray', new V3(0, 0, -0.26), 0.32);
    add(tray, new THREE.BoxGeometry(0.15, 0.004, 0.42), M.aluFine, 0, HY - 0.03, -0.01);
    [0.06, -0.06].forEach(function (x) { add(tray, cylZ(0.004, 0.44, 10), M.steel, x, HY - 0.024, -0.01); });
    // compute module with heatsink and fan
    add(tray, new THREE.BoxGeometry(0.1, 0.004, 0.087), M.pcbK, 0, HY - 0.024, 0.08);
    add(tray, new THREE.BoxGeometry(0.09, 0.012, 0.075), M.anoBlack, 0, HY - 0.016, 0.08);
    for (var fi = 0; fi < 11; fi++) add(tray, new THREE.BoxGeometry(0.0016, 0.022, 0.075), M.anoBlack, -0.042 + fi * 0.0084, HY + 0.0, 0.08);
    add(tray, new THREE.CylinderGeometry(0.026, 0.026, 0.008, 32), M.plastic, 0, HY + 0.014, 0.08);
    var fan = new THREE.Group(); fan.position.set(0, HY + 0.019, 0.08); tray.add(fan);
    for (var fb = 0; fb < 7; fb++) { var fbm = add(fan, new THREE.BoxGeometry(0.022, 0.0012, 0.008), M.plasticGrey, 0, 0, 0); fbm.rotation.set(0.35, fb / 7 * PI * 2, 0, 'YXZ'); fbm.position.set(Math.cos(fb / 7 * PI * 2) * 0.0, 0, 0); fbm.geometry.translate(0.012, 0, 0); }
    // flight controller
    add(tray, new THREE.BoxGeometry(0.044, 0.016, 0.064), M.white, 0.0, HY - 0.02, -0.05);
    add(tray, new THREE.BoxGeometry(0.044, 0.004, 0.064), M.torp, 0.0, HY - 0.0105, -0.05);
    // ESC stack + power board under the sled
    for (var ei = 0; ei < 4; ei++) {
      add(tray, new THREE.BoxGeometry(0.03, 0.003, 0.05), M.pcbG, -0.048 + ei * 0.032, HY - 0.04, -0.13);
      add(tray, new THREE.BoxGeometry(0.022, 0.008, 0.03), M.aluFine, -0.048 + ei * 0.032, HY - 0.046, -0.13);
    }
    add(tray, new THREE.BoxGeometry(0.12, 0.003, 0.09), M.pcbG, 0, HY - 0.04, -0.03);
    [[-0.04, 0.0], [-0.02, 0.0], [0.03, -0.05]].forEach(function (c) { add(tray, new THREE.CylinderGeometry(0.007, 0.007, 0.02, 16), M.plastic, c[0], HY - 0.052, c[1]); });
    // network switch / sensor hub
    add(tray, new THREE.BoxGeometry(0.06, 0.012, 0.05), M.pcbK, 0.0, HY - 0.016, -0.15);
    // stereo camera behind the dome
    add(tray, new THREE.BoxGeometry(0.13, 0.03, 0.028), M.plasticGrey, 0, HY + 0.012, 0.205);
    [-0.045, 0.045].forEach(function (x) {
      add(tray, cylZ(0.0105, 0.006, 24), M.anoBlack, x, HY + 0.012, 0.221);
      add(tray, new THREE.SphereGeometry(0.0085, 20, 12, 0, PI * 2, 0, HALF).rotateX(HALF), M.lens, x, HY + 0.012, 0.222);
    });
    add(tray, new THREE.BoxGeometry(0.008, 0.06, 0.012), M.aluFine, 0, HY - 0.012, 0.2);
    // status LED strip
    var ledStrip = add(tray, new THREE.BoxGeometry(0.004, 0.003, 0.3), M.ledTeal, 0.072, HY - 0.026, 0.0);
    ledStrip.castShadow = false;
    var leds = [[0.02, M.ledGreen], [0.028, M.ledRed], [0.036, M.ledTeal]].map(function (c) {
      var m = add(tray, new THREE.BoxGeometry(0.004, 0.003, 0.004), c[1], c[0], HY - 0.008, -0.025); m.castShadow = false; return m;
    });
    // looms inside the tube
    function loom(parent, pts, r, mat) {
      var c = new THREE.CatmullRomCurve3(pts.map(function (p) { return new V3(p[0], p[1], p[2]); }));
      return add(parent, new THREE.TubeGeometry(c, 40, r, 8, false), mat);
    }
    loom(tray, [[0.03, HY - 0.015, 0.2], [0.04, HY + 0.01, 0.15], [0.03, HY + 0.012, 0.12]], 0.0025, M.cable);
    loom(tray, [[-0.03, HY - 0.015, 0.2], [-0.045, HY + 0.005, 0.15], [-0.03, HY + 0.012, 0.12]], 0.0025, M.cable);
    loom(tray, [[0.02, HY - 0.01, 0.04], [0.035, HY - 0.0, -0.02], [0.02, HY - 0.01, -0.05]], 0.002, M.cableTeal);
    loom(tray, [[-0.05, HY - 0.035, -0.12], [-0.06, HY - 0.02, -0.18], [-0.04, HY - 0.0, -0.22]], 0.003, M.red);
    loom(tray, [[0.05, HY - 0.035, -0.12], [0.06, HY - 0.02, -0.18], [0.04, HY - 0.0, -0.22]], 0.003, M.cable);

    /* --- frame: carbon side plates, aluminium cross members, hull clamps --- */
    var frame = part('frame');
    function plate(side) {
      var s = new THREE.Shape();
      s.moveTo(-0.37, -0.21); s.lineTo(0.33, -0.21); s.quadraticCurveTo(0.36, -0.21, 0.38, -0.18);
      s.lineTo(0.405, -0.13); s.lineTo(0.405, 0.11); s.quadraticCurveTo(0.405, 0.15, 0.37, 0.15);
      s.lineTo(-0.37, 0.15); s.quadraticCurveTo(-0.405, 0.15, -0.405, 0.115); s.lineTo(-0.405, -0.175); s.quadraticCurveTo(-0.405, -0.21, -0.37, -0.21);
      s.holes.push(rrPath(new THREE.Path(), -0.33, -0.15, 0.17, 0.22, 0.03));
      s.holes.push(rrPath(new THREE.Path(), -0.115, -0.15, 0.23, 0.08, 0.025));
      s.holes.push(rrPath(new THREE.Path(), -0.115, -0.03, 0.23, 0.12, 0.025));
      s.holes.push(rrPath(new THREE.Path(), 0.16, -0.15, 0.17, 0.22, 0.03));
      [[-0.37, -0.17], [-0.37, 0.11], [0.37, 0.09], [0.36, -0.15], [0.0, 0.12], [0.0, -0.18]].forEach(function (c) {
        var hp = new THREE.Path(); hp.absarc(c[0], c[1], 0.007, 0, PI * 2, false); s.holes.push(hp);
      });
      var g = new THREE.ExtrudeGeometry(s, { depth: 0.007, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 18 });
      g.translate(0, 0, -0.0035); g.rotateY(-HALF);
      var grp = part(side > 0 ? 'plateL' : 'plateR', new V3(side * 0.24, 0, 0), 0.08);
      add(grp, g, M.carbon, side * 0.2, 0, 0);
      return grp;
    }
    var plateL = plate(1), plateR = plate(-1);
    [[0.13, 0.34], [0.13, -0.34], [-0.19, 0.29], [-0.19, -0.29], [-0.19, 0.0], [-0.15, 0.37]].forEach(function (c) {
      add(frame, new THREE.BoxGeometry(0.393, 0.018, 0.018), M.alu, 0, c[0], c[1]);
      [1, -1].forEach(function (sx) { add(frame, cylX(0.0045, 0.012, 6), M.steel, sx * 0.207, c[0], c[1]); });
    });
    [0.15, -0.15].forEach(function (z) {
      add(frame, ringZ(HR + 0.0005, HR + 0.012, 0.026), M.anoBlack, 0, HY, z);
      [1, -1].forEach(function (sx) {
        add(frame, new THREE.BoxGeometry(0.096, 0.022, 0.014), M.anoBlack, sx * 0.152, HY, z);
        add(frame, new THREE.BoxGeometry(0.02, 0.03, 0.03), M.anoBlack, sx * 0.104, HY, z);
      });
    });
    add(frame, new THREE.BoxGeometry(0.13, 0.005, 0.34), M.carbon, 0, -0.2, 0.15); // sensor deck

    /* --- buoyancy foam on top of the plates, with decals --- */
    [1, -1].forEach(function (sx) {
      var grp = part(sx > 0 ? 'foamL' : 'foamR', new V3(sx * 0.14, 0.3, 0), 0);
      var fs = rrPath(new THREE.Shape(), -0.042, -0.026, 0.084, 0.052, 0.012);
      var fg = new THREE.ExtrudeGeometry(fs, { depth: 0.56, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 3, curveSegments: 8 });
      fg.translate(0, 0, -0.28);
      add(grp, fg, M.foam, sx * 0.2, 0.183, 0.02);
      var dg = new THREE.PlaneGeometry(0.4, 0.4 * 140 / 1024); dg.rotateY(sx * HALF);
      add(grp, dg, M.decal, sx * (0.2 + 0.0485), 0.183, sx > 0 ? -0.0 : 0.0).castShadow = false;
      [-0.2, 0.0, 0.2].forEach(function (z) { add(grp, new THREE.BoxGeometry(0.094, 0.006, 0.018), M.rubber, sx * 0.2, 0.155, z + 0.02); });
    });

    /* --- thrusters (T200 class), local axis +y --- */
    function bladeGeo() {
      var s = new THREE.Shape();
      s.moveTo(0.013, -0.006);
      s.bezierCurveTo(0.025, -0.014, 0.04, -0.012, 0.0425, -0.002);
      s.bezierCurveTo(0.044, 0.008, 0.032, 0.014, 0.013, 0.008);
      s.lineTo(0.013, -0.006);
      var g = new THREE.ExtrudeGeometry(s, { depth: 0.0014, bevelEnabled: false, curveSegments: 14 });
      g.translate(0, 0, -0.0007); g.rotateX(-HALF);
      var p = g.attributes.position, v = new V3();
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        var r = Math.hypot(v.x, v.z), a = 0.95 - (r - 0.013) * 11; // twist: steeper at the root
        var y = v.y, z = v.z;
        p.setXYZ(i, v.x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a));
      }
      g.computeVertexNormals();
      return g;
    }
    var BLADE = keep(bladeGeo());
    var nozzleProfile = [[0.046, -0.036], [0.05, -0.031], [0.0525, -0.014], [0.0525, 0.022], [0.0505, 0.034], [0.047, 0.0375], [0.0445, 0.034], [0.0435, 0.004], [0.0442, -0.03], [0.046, -0.036]]
      .map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var NOZZLE = keep(new THREE.LatheGeometry(nozzleProfile, 56));
    function thruster(name, ex, delay, pos, quat) {
      var grp = part(name, ex, delay);
      var t = new THREE.Group(); t.position.copy(pos); t.quaternion.copy(quat); grp.add(t);
      var nz = new THREE.Mesh(NOZZLE, M.plastic); nz.castShadow = nz.receiveShadow = true; t.add(nz);
      add(t, new THREE.CylinderGeometry(0.019, 0.022, 0.05, 32), M.plastic, 0, -0.012, 0);
      add(t, new THREE.CylinderGeometry(0.0225, 0.0225, 0.004, 32), M.anoTeal, 0, 0.012, 0);
      add(t, new THREE.ConeGeometry(0.013, 0.022, 24), M.plastic, 0, -0.047, 0, PI, 0, 0);
      for (var k = 0; k < 4; k++) { // stator vanes
        var a = k / 4 * PI * 2 + PI / 4;
        var vane = add(t, new THREE.BoxGeometry(0.023, 0.016, 0.0035), M.plastic, Math.cos(a) * 0.033, -0.026, Math.sin(a) * 0.033);
        vane.rotation.y = -a;
      }
      var prop = new THREE.Group(); prop.position.y = 0.017; t.add(prop);
      add(prop, new THREE.CylinderGeometry(0.0135, 0.0135, 0.016, 28), M.prop, 0, 0, 0);
      add(prop, new THREE.SphereGeometry(0.0135, 24, 12, 0, PI * 2, 0, HALF), M.prop, 0, 0.008, 0);
      for (var b = 0; b < 3; b++) { var bm = new THREE.Mesh(BLADE, M.prop); bm.rotation.y = b / 3 * PI * 2; bm.castShadow = true; prop.add(bm); }
      add(t, new THREE.BoxGeometry(0.018, 0.034, 0.03), M.anoBlack, 0.057, -0.004, 0); // mount lug
      add(t, cylX(0.005, 0.024, 12), M.rubber, 0, -0.06, 0).rotation.set(0, 0, 0); // cable gland
      return { grp: grp, t: t, prop: prop, cable: new V3(0, -0.07, 0) };
    }
    var thrusters = [], qv = new THREE.Quaternion(), up = new V3(0, 1, 0);
    // vertical: lugs face the plate
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c, i) {
      var q = new THREE.Quaternion().setFromAxisAngle(up, c[0] > 0 ? PI : 0);
      thrusters.push(thruster('vt' + i, new V3(c[0] * 0.2, 0.2, c[1] * 0.06), 0.14, new V3(c[0] * 0.27, 0.06, c[1] * 0.27), q));
    });
    // horizontal, vectored at 45°
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c, i) {
      var dir = new V3(c[0], 0, c[1]).normalize();
      var q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      var spin = new THREE.Quaternion().setFromAxisAngle(up, c[0] * c[1] > 0 ? -HALF : HALF);
      q.multiply(spin);
      thrusters.push(thruster('ht' + i, new V3(c[0] * 0.2, 0, c[1] * 0.22), 0.14, new V3(c[0] * 0.258, -0.1, c[1] * 0.455), q));
    });
    // brackets from the plate corners to the vectored thrusters
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c, i) {
      var b = add(parts['ht' + i].g, new THREE.BoxGeometry(0.008, 0.04, 0.07), M.anoBlack, c[0] * 0.212, -0.1, c[1] * 0.405);
      b.rotation.y = c[0] * c[1] * 0.5;
    });
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (c, i) { add(parts['vt' + i].g, new THREE.BoxGeometry(0.012, 0.05, 0.05), M.anoBlack, c[0] * 0.208, 0.058, c[1] * 0.27); });

    /* --- battery tubes --- */
    [1, -1].forEach(function (sx) {
      var grp = part(sx > 0 ? 'batL' : 'batR', new V3(sx * 0.1, -0.27, 0), 0.24);
      var x = sx * 0.085, y = -0.115, z = -0.03;
      add(grp, cylZ(0.042, 0.29, 48), M.anoBlue, x, y, z);
      add(grp, cylZ(0.045, 0.02, 48), M.anoBlack, x, y, z + 0.153);
      add(grp, cylZ(0.045, 0.02, 48), M.anoBlack, x, y, z - 0.153);
      add(grp, cylZ(0.03, 0.006, 32), M.alu, x, y, z + 0.166);
      add(grp, cylZ(0.005, 0.018, 12), M.rubber, x, y, z - 0.172);
      add(grp, ringZ(0.042, 0.0445, 0.01, 48), M.rubber, x, y, z + 0.06);
      add(grp, ringZ(0.042, 0.0445, 0.01, 48), M.rubber, x, y, z - 0.08);
    });

    /* --- DVL (four Janus beams) --- */
    var dvl = part('dvl', new V3(0, -0.42, 0.05), 0.3);
    add(dvl, new THREE.CylinderGeometry(0.045, 0.045, 0.05, 48), M.anoBlack, 0, -0.228, 0.12);
    add(dvl, new THREE.CylinderGeometry(0.047, 0.047, 0.008, 48), M.alu, 0, -0.205, 0.12);
    add(dvl, cylZ(0.006, 0.02, 12), M.rubber, 0, -0.215, 0.07);
    var dvlFaces = [];
    for (var di = 0; di < 4; di++) {
      var da = di / 4 * PI * 2 + PI / 4;
      var face = add(dvl, new THREE.CylinderGeometry(0.014, 0.014, 0.006, 28), M.plasticGrey, Math.cos(da) * 0.024, -0.254, 0.12 + Math.sin(da) * 0.024);
      face.rotation.set(Math.sin(da) * -0.4, 0, Math.cos(da) * 0.4);
      dvlFaces.push({ x: Math.cos(da), z: Math.sin(da) });
    }

    /* --- down camera --- */
    var downcam = part('downcam', new V3(0, -0.3, 0.1), 0.28);
    add(downcam, new THREE.CylinderGeometry(0.026, 0.026, 0.06, 36), M.anoBlack, -0.06, -0.225, 0.3);
    add(downcam, new THREE.CylinderGeometry(0.022, 0.022, 0.004, 36), M.lens, -0.06, -0.256, 0.3);
    add(downcam, new THREE.CylinderGeometry(0.009, 0.009, 0.004, 24), M.ledTeal, -0.06, -0.2585, 0.3).castShadow = false;

    /* --- gripper --- */
    var gripper = part('gripper', new V3(0, -0.12, 0.32), 0.26);
    add(gripper, new THREE.BoxGeometry(0.05, 0.034, 0.06), M.anoBlack, 0.05, -0.222, 0.36);
    add(gripper, cylX(0.012, 0.056, 24), M.alu, 0.05, -0.232, 0.395);
    var fingers = [];
    [1, -1].forEach(function (sx) {
      var pivot = new THREE.Group(); pivot.position.set(0.05 + sx * 0.016, -0.232, 0.4); gripper.add(pivot);
      var fsh = new THREE.Shape(); fsh.moveTo(0, 0); fsh.lineTo(0.008, 0.0); fsh.quadraticCurveTo(0.012, 0.05, -0.006, 0.075); fsh.lineTo(-0.012, 0.07); fsh.quadraticCurveTo(0.002, 0.045, -0.004, 0.0); fsh.lineTo(0, 0);
      var fgeo = new THREE.ExtrudeGeometry(fsh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1 });
      fgeo.translate(0, 0, -0.006); fgeo.rotateX(HALF); // finger length along +z, thickness along y
      var f = add(pivot, fgeo, M.alu, 0, 0, 0);
      f.scale.x = sx;
      fingers.push({ pivot: pivot, s: sx });
    });

    /* --- torpedo launcher (two pneumatic tubes on top) --- */
    var torp = part('torp', new V3(0.04, 0.26, 0.1), 0.04);
    add(torp, new THREE.BoxGeometry(0.06, 0.012, 0.06), M.anoBlack, 0.088, 0.128, 0.12);
    var torpedoes = [];
    var torpProfile = [[0, 0.06], [0.004, 0.058], [0.0085, 0.05], [0.0105, 0.038], [0.011, 0.02], [0.011, -0.03], [0.009, -0.045], [0.0055, -0.055], [0.002, -0.06], [0, -0.06]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var TORP = keep(new THREE.LatheGeometry(torpProfile, 32)); TORP.rotateX(HALF);
    [0.073, 0.103].forEach(function (x, i) {
      add(torp, cylZ(0.0145, 0.2, 32, true), M.clear, x, 0.15, 0.13).castShadow = false;
      add(torp, ringZ(0.0135, 0.0165, 0.012, 32), M.alu, x, 0.15, 0.226);
      add(torp, ringZ(0.0135, 0.0165, 0.012, 32), M.alu, x, 0.15, 0.034);
      add(torp, cylZ(0.0145, 0.016, 32), M.anoBlack, x, 0.15, 0.022);
      var tp = new THREE.Group(); tp.position.set(x, 0.15, 0.15); torp.add(tp);
      var body = new THREE.Mesh(TORP, M.torp); body.castShadow = true; tp.add(body);
      add(tp, cylZ(0.0111, 0.006, 24), M.rubber, 0, 0, 0.02);
      for (var tf = 0; tf < 4; tf++) { var fin = add(tp, new THREE.BoxGeometry(0.0012, 0.018, 0.016), M.anoBlack, 0, 0, -0.048); fin.rotation.z = tf * HALF; fin.geometry.translate(0, 0.006, 0); }
      torpedoes.push(tp);
    });
    add(torp, new THREE.BoxGeometry(0.03, 0.022, 0.034), M.plasticGrey, 0.088, 0.145, -0.0);
    add(torp, cylZ(0.009, 0.06, 20), M.aluFine, 0.088, 0.15, -0.045);

    /* --- marker dropper --- */
    var marker = part('marker', new V3(0, -0.3, -0.12), 0.3);
    add(marker, new THREE.CylinderGeometry(0.019, 0.019, 0.06, 28, 1, true), M.clear, -0.07, -0.228, -0.16).castShadow = false;
    add(marker, new THREE.BoxGeometry(0.05, 0.02, 0.05), M.anoBlack, -0.07, -0.193, -0.16);
    add(marker, new THREE.SphereGeometry(0.014, 20, 14), M.torp, -0.07, -0.215, -0.16);
    add(marker, new THREE.SphereGeometry(0.014, 20, 14), M.torp, -0.07, -0.244, -0.16);

    /* --- hydrophone array --- */
    var hydro = part('hydro', new V3(0, -0.32, -0.18), 0.32);
    add(hydro, new THREE.BoxGeometry(0.11, 0.006, 0.11), M.carbon, 0.05, -0.205, -0.3);
    add(hydro, new THREE.CylinderGeometry(0.02, 0.02, 0.04, 28), M.anoBlack, 0.05, -0.226, -0.3);
    var hydroTips = [];
    [[0.045, 0.045], [-0.045, 0.045], [0.045, -0.045], [-0.045, -0.045]].forEach(function (c) {
      add(hydro, new THREE.CylinderGeometry(0.0065, 0.0065, 0.035, 16), M.rubber, 0.05 + c[0], -0.225, -0.3 + c[1]);
      add(hydro, new THREE.SphereGeometry(0.0065, 16, 10), M.anoTeal, 0.05 + c[0], -0.243, -0.3 + c[1]);
      hydroTips.push(new V3(0.05 + c[0], -0.245, -0.3 + c[1]));
    });

    /* --- lights (Lumen class) --- */
    var lamps = part('lamps', new V3(0, 0.0, 0.26), 0.2);
    var lampSockets = [];
    [1, -1].forEach(function (sx) {
      var x = sx * 0.15, y = -0.125, z = 0.375;
      add(lamps, cylZ(0.016, 0.045, 32), M.anoBlack, x, y, z);
      for (var lf = 0; lf < 4; lf++) add(lamps, ringZ(0.016, 0.019, 0.003, 32), M.anoBlack, x, y, z - 0.015 + lf * 0.008);
      add(lamps, cylZ(0.0125, 0.002, 32), M.lamp, x, y, z + 0.0235).castShadow = false;
      add(lamps, ringZ(0.0125, 0.0165, 0.004, 32), M.alu, x, y, z + 0.0225);
      add(lamps, new THREE.BoxGeometry(0.012, 0.02, 0.02), M.anoBlack, x, y - 0.018, z);
      var sock = new THREE.Object3D(); sock.position.set(x, y, z + 0.03); lamps.add(sock);
      lampSockets.push(sock);
    });

    /* --- small top-side items --- */
    var mast = part('mast', new V3(0, 0.26, -0.08), 0.06);
    add(mast, new THREE.CylinderGeometry(0.004, 0.006, 0.12, 12), M.plastic, -0.08, 0.2, -0.34);
    add(mast, new THREE.CylinderGeometry(0.009, 0.009, 0.012, 16), M.anoBlack, -0.08, 0.145, -0.34);
    var mastTip = add(mast, new THREE.SphereGeometry(0.006, 14, 10), M.ledRed, -0.08, 0.262, -0.34); mastTip.castShadow = false;
    var kill = part('kill', new V3(0, 0.2, 0), 0.06);
    add(kill, new THREE.CylinderGeometry(0.014, 0.016, 0.02, 24), M.anoBlack, 0.08, 0.149, -0.34);
    add(kill, new THREE.CylinderGeometry(0.011, 0.011, 0.012, 24), M.red, 0.08, 0.165, -0.34);

    /* --- external cables from the rear end cap to every thruster --- */
    var cables = new THREE.Group(); cables.name = 'cables'; root.add(cables);
    root.updateMatrixWorld(true);
    thrusters.forEach(function (th, i) {
      var end = th.cable.clone(); th.t.localToWorld(end);
      var start = penetrators[i];
      var dirOut = new V3(0, -1, 0).applyQuaternion(th.t.quaternion).multiplyScalar(0.05);
      var mid = start.clone().lerp(end, 0.5); mid.y -= 0.03; mid.x *= 0.85;
      var c = new THREE.CatmullRomCurve3([start, start.clone().add(new V3(0, 0, -0.035)), mid, end.clone().add(dirOut), end], false, 'centripetal');
      add(cables, new THREE.TubeGeometry(c, 48, 0.0034, 6, false), M.cable);
    });
    [[penetrators[8], new V3(0.085, -0.115, -0.2)], [penetrators[9], new V3(-0.085, -0.115, -0.2)], [penetrators[10], new V3(0.0, -0.21, 0.07)], [penetrators[11], new V3(0.05, -0.2, -0.3)]].forEach(function (pr) {
      var s = pr[0], e = pr[1], m = s.clone().lerp(e, 0.5); m.z -= 0.05; m.y -= 0.02;
      add(cables, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([s, s.clone().add(new V3(0, 0, -0.03)), m, e]), 40, 0.004, 6, false), M.cableTeal);
    });

    /* ---------- runtime API ---------- */
    var explodeVal = 0;
    function explode(e) {
      explodeVal = e;
      order.forEach(function (k) {
        var p = parts[k];
        var local = smooth((e - p.delay * 0.6) / 0.62);
        p.g.position.copy(p.ex).multiplyScalar(local);
      });
      cables.visible = e < 0.02;
    }
    function spin(dt, thrust, time) {
      for (var i = 0; i < thrusters.length; i++) thrusters[i].prop.rotation.y += dt * (6 + thrust * 46) * (i % 2 ? -1 : 1);
      fan.rotation.y += dt * 30;
      var blink = Math.floor(time * 1.6) % 2 === 0;
      mastTip.visible = blink;
      leds.forEach(function (l, i) { l.visible = Math.floor(time * 3 + i * 1.7) % 3 !== 0; });
    }
    function grip(open) { fingers.forEach(function (f) { f.pivot.rotation.y = f.s * (-0.15 + open * 0.55); }); }
    /* ---------- merge static meshes: one draw call per material per moving part (≈900 → ≈90) ---------- */
    function concat(geos) {
      var n = 0;
      geos.forEach(function (g) { n += g.attributes.position.count; });
      var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), o = 0;
      geos.forEach(function (g) {
        if (!g.attributes.normal) g.computeVertexNormals();
        var c = g.attributes.position.count;
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        o += c;
      });
      var out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      out.computeBoundingSphere();
      return out;
    }
    function mergeStatic(group, skip) {
      group.updateMatrixWorld(true);
      var inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
      var buckets = {}, victims = [];
      group.traverse(function (o) {
        if (!o.isMesh || o === group) return;
        for (var a = o; a && a !== group; a = a.parent) if (skip.indexOf(a) >= 0) return;
        var g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        var mtx = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
        g.applyMatrix4(mtx);
        var key = o.material.uuid + ':' + (o.renderOrder || 0);
        (buckets[key] = buckets[key] || { mat: o.material, order: o.renderOrder || 0, geos: [] }).geos.push(g);
        victims.push(o);
      });
      victims.forEach(function (o) { o.parent.remove(o); });
      Object.keys(buckets).forEach(function (k) {
        var b = buckets[k], mesh = new THREE.Mesh(keep(concat(b.geos)), b.mat);
        mesh.renderOrder = b.order; group.add(mesh);
        b.geos.forEach(function (g) { g.dispose(); });
      });
    }
    var moving = [fan, mastTip].concat(leds, torpedoes, fingers.map(function (f) { return f.pivot; }), thrusters.map(function (t) { return t.prop; }));
    order.forEach(function (k) { mergeStatic(parts[k].g, moving); });
    thrusters.forEach(function (t) { mergeStatic(t.prop, []); });
    torpedoes.forEach(function (t) { mergeStatic(t, []); });
    mergeStatic(fan, []); mergeStatic(cables, []);

    grip(0.2);
    explode(0);

    var anchors = {
      plate: [plateL, new V3(0.205, 0.08, -0.2)],
      hull: [hull, new V3(0, HY + HR, 0.05)],
      foam: [parts.foamR.g, new V3(-0.2, 0.215, -0.15)],
      battery: [parts.batL.g, new V3(0.12, -0.13, -0.1)],
      vthr: [parts.vt0.g, new V3(0.27, 0.1, 0.27)],
      hthr: [parts.ht0.g, new V3(0.29, -0.08, 0.48)],
      dome: [dome, new V3(0, HY + 0.07, 0.31)],
      cap: [cap, new V3(0, HY + 0.08, -0.28)],
      tray: [tray, new V3(0, HY + 0.02, 0.06)],
      dvl: [dvl, new V3(0, -0.26, 0.12)],
      torp: [torp, new V3(0.09, 0.17, 0.2)],
      gripper: [gripper, new V3(0.05, -0.24, 0.43)],
      hydro: [hydro, new V3(0.05, -0.25, -0.3)],
      stereo: [tray, new V3(0, HY + 0.03, 0.22)],
      downcam: [downcam, new V3(-0.06, -0.26, 0.3)],
      lamps: [lamps, new V3(0.15, -0.11, 0.4)],
      marker: [marker, new V3(-0.07, -0.25, -0.16)]
    };

    function redrawDecal() { drawDecal(decalCanvas.getContext('2d'), decalCanvas.width, decalCanvas.height); decalTex.needsUpdate = true; }

    return {
      root: root, parts: parts, thrusters: thrusters, torpedoes: torpedoes, lampSockets: lampSockets,
      dvl: dvl, dvlCenter: new V3(0, -0.256, 0.12), dvlFaces: dvlFaces, stereo: new V3(0, HY + 0.012, 0.23), tray: tray,
      hydroTips: hydroTips, anchors: anchors, materials: M,
      explode: explode, spin: spin, grip: grip, redrawDecal: redrawDecal,
      get exploded() { return explodeVal; },
      dispose: function () {
        root.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
        disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
      }
    };
  }

  window.D6AUV = window.D6AUV || {};
  window.D6AUV.build = build;
  window.D6AUV.rng = rng;
})();
