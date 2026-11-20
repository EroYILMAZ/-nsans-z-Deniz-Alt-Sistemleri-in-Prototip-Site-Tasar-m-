/*
 * Deniz6 — D6-ROV kaydırmalı 3B deneyimi (Three.js r160).
 * D6AUV.mountExperience(section): bölüm ekrana yapışır; ziyaretçi kaydırdıkça araç yaklaşır, döner,
 * iticilerini çalıştırır, parçalarına ayrılır, sensörlerini gösterir ve torpido atar.
 * Hafif tutuldu: arka plan CSS'tir (şeffaf tuval), ortam/zemin/parçacık/post-processing/gölge yoktur,
 * modelin sabit parçaları birleştirilmiştir ve kare hızı düşerse çözünürlük kendiliğinden azalır.
 */
(function () {
  'use strict';
  var A = window.D6AUV = window.D6AUV || {};
  var PI = Math.PI, HALF = PI / 2;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function easeOut(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }
  function fade(t, a, b, c, d) { return Math.min(ease((t - a) / (b - a)), 1 - ease((t - c) / (d - c))); }
  function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function isMobile(w) { return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || w < 760; }
  function el(tag, cls, text, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
  A.webglOk = function () {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  };

  /* image-based lighting, baked once: soft "studio" windows so metal and carbon read correctly */
  function makeEnv(THREE, renderer) {
    var s = new THREE.Scene();
    var sky = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uTop: { value: new THREE.Color(0xc8f2ff) }, uMid: { value: new THREE.Color(0x12536d) }, uBot: { value: new THREE.Color(0x020a10) } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uTop, uMid, uBot; varying vec3 vDir; void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(uMid, uTop, pow(y, 0.9)) : mix(uMid, uBot, pow(-y, 0.45)); gl_FragColor = vec4(c, 1.0); }'
    });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), sky));
    function panel(w, h, c, x, y, z) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
    }
    panel(6, 2.2, new THREE.Color(3.2, 3.6, 3.8), 0, 7, 2.5);
    panel(2.5, 5, new THREE.Color(1.3, 2.4, 2.6), -7, 2.5, -1);
    panel(2.2, 4, new THREE.Color(2.4, 1.5, 0.8), 7, 0.5, -3);
    panel(4, 1.2, new THREE.Color(1.6, 1.9, 2.1), 0, 3, -8);
    var pm = new THREE.PMREMGenerator(renderer);
    var rt = pm.fromScene(s, 0.035);
    pm.dispose();
    s.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return rt;
  }
  function canvasTex(THREE, w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  var CHAPTERS = [
    { s: 0, e: 0.14, side: 'left', kick: '01 · YAKLAŞMA', title: 'Karanlıktan gelen: D6-ROV.',
      body: 'Göbek kablosuyla bağlı, sekiz iticili bir su altı aracı. Mimarisi, kendini kanıtlamış su altı robotlarının ortak düzenine dayanıyor: açık şasi, merkezi basınç tüpü, vektörel itki.',
      specs: [['TİP', 'Uzaktan kumandalı (ROV)'], ['BOY', '≈ 0,9 m'], ['HEDEF KÜTLE', '≈ 18 kg']] },
    { s: 0.14, e: 0.28, side: 'left', kick: '02 · GÖVDE', title: 'Hafif şasi, sızdırmaz kalp.',
      body: 'CNC kesim karbon fiber yan plakalar alüminyum profillerle birleşir. Elektronik, çift O-ring’li flanşlarla kapanan akrilik tüpte; turuncu köpükler aracı nötr yüzerliğe getirir.',
      specs: [['ŞASİ', 'Karbon fiber + Al'], ['TÜP', 'Akrilik Ø200 mm'], ['SIZDIRMAZLIK', 'Çift O-ring']] },
    { s: 0.28, e: 0.42, side: 'right', kick: '03 · İTKİ', title: 'Sekiz itici, altı eksen.',
      body: 'Dört dikey itici derinlik, yuvarlanma ve yunuslamayı; 45° açılı dört vektörel itici ileri, yanal ve dönüş hareketini sağlar. Her eksen kendi PID döngüsüyle denetlenir.',
      specs: [['İTİCİ', '8 × T200 sınıfı'], ['SERBESTLİK', '6 DOF'], ['KONTROL', 'Kaskad PID']] },
    { s: 0.42, e: 0.6, side: 'left', kick: '04 · MODÜLER YAPI', title: 'Parça parça mühendislik.',
      body: 'Her modül tek başına sökülür: arka kapaktaki ıslak konnektörler açılır, elektronik kızak tüpten kayarak çıkar. Havuz kenarında bakım dakikalar sürer.',
      specs: [['KONNEKTÖR', '12 penetratör'], ['KIZAK', 'Kayar tepsi'], ['BAKIM', '< 10 dk']] },
    { s: 0.6, e: 0.74, side: 'right', kick: '05 · ALGILAMA', title: 'Görmek, duymak, konumlanmak.',
      body: 'Stereo ön kamera ve alt kamera görüntü işlemeyi besler. DVL dört akustik ışınla tabana göre hızı ölçer; hidrofon dizisi pingerin yönünü varış zamanı farkıyla bulur.',
      specs: [['GÖRÜŞ', 'Stereo + alt kamera'], ['SEYİR', 'DVL + IMU'], ['AKUSTİK', '4 hidrofon']] },
    { s: 0.74, e: 0.88, side: 'left', kick: '06 · GÖREV', title: 'Kapı, kablo, torpido.',
      body: 'Görev parkuru: renkleri tanıyıp kapıdan geçmek, tabandaki kabloyu izleyip anomalileri işaretlemek ve hedefe torpido fırlatmak. Pilot, yer istasyonundan canlı görüntüyle yönetir.',
      specs: [['TESPİT', 'Derin öğrenme'], ['TAKİP', 'Kablo + anomali'], ['ATIŞ', '2 × pnömatik']] },
    { s: 0.88, e: 1.0, side: 'right', kick: '07 · DERİNLİĞE', title: 'Yolculuk yeni başlıyor.',
      body: 'Bu model temsilidir; takımın kendi aracı tasarlandıkça burada güncellenecek. Yolculuğa ortak olmak ister misiniz?',
      specs: [['SINIF', 'Uzaktan kumandalı (ROV)'], ['DURUM', 'Tasarım sürüyor']], cta: true }
  ];
  var LABELS = [
    { id: 'plate', a: 'plate', t: 'KARBON FİBER ŞASİ', s: 0.16, e: 0.275 },
    { id: 'hull', a: 'hull', t: 'AKRİLİK BASINÇ TÜPÜ', s: 0.17, e: 0.275 },
    { id: 'foam', a: 'foam', t: 'YÜZERLİK KÖPÜĞÜ', s: 0.18, e: 0.275 },
    { id: 'battery', a: 'battery', t: 'BATARYA TÜPÜ ×2', s: 0.19, e: 0.275 },
    { id: 'vthr', a: 'vthr', t: 'DİKEY İTİCİ ×4', s: 0.3, e: 0.415 },
    { id: 'hthr', a: 'hthr', t: 'VEKTÖREL İTİCİ ×4 · 45°', s: 0.31, e: 0.415 },
    { id: 'dome', a: 'dome', t: 'ÖN KUBBE', s: 0.5, e: 0.585 },
    { id: 'cap', a: 'cap', t: 'ARKA KAPAK · KONNEKTÖRLER', s: 0.505, e: 0.585 },
    { id: 'tray', a: 'tray', t: 'ELEKTRONİK KIZAK', s: 0.51, e: 0.585 },
    { id: 'dvl', a: 'dvl', t: 'DVL', s: 0.515, e: 0.585 },
    { id: 'torp', a: 'torp', t: 'TORPİDO LANÇERİ', s: 0.52, e: 0.585 },
    { id: 'gripper', a: 'gripper', t: 'TUTUCU KOL', s: 0.525, e: 0.585 },
    { id: 'hydro', a: 'hydro', t: 'HİDROFON DİZİSİ', s: 0.53, e: 0.585 },
    { id: 'stereo', a: 'stereo', t: 'STEREO KAMERA', s: 0.63, e: 0.735 },
    { id: 'downcam', a: 'downcam', t: 'ALT KAMERA', s: 0.64, e: 0.735 },
    { id: 'dvl2', a: 'dvl', t: 'DVL · 4 AKUSTİK IŞIN', s: 0.645, e: 0.735 },
    { id: 'hydro2', a: 'hydro', t: 'HİDROFON · TDOA', s: 0.65, e: 0.735 },
    { id: 'torp2', a: 'torp', t: 'PNÖMATİK TORPİDO', s: 0.76, e: 0.875 },
    { id: 'gripper2', a: 'gripper', t: 'TUTUCU KOL', s: 0.77, e: 0.875 }
  ];
  var MODES = ['SEYİR', 'STABİL', 'İTKİ TESTİ', 'BAKIM', 'ALGILAMA', 'GÖREV', 'BEKLEME'];
  var P_FIRE = 0.79, P_GONE = 0.85;

  // camera keys: [p, azimuth, polar, distance, target y, target z]
  var CAM = [
    [0.0, 0.35, 1.36, 2.4, 0.0, 0],
    [0.07, 0.55, 1.33, 2.2, 0.0, 0],
    [0.14, 0.95, 1.25, 2.05, 0, 0],
    [0.2, 1.57, 1.47, 1.9, -0.01, 0],
    [0.27, 2.2, 1.15, 1.95, 0, 0],
    [0.34, 2.75, 0.8, 2.05, 0, 0],
    [0.41, 3.55, 0.95, 2.05, 0, 0],
    [0.48, 4.15, 1.08, 3.35, -0.02, 0],
    [0.56, 4.9, 1.16, 3.45, -0.02, -0.02],
    [0.64, 6.0, 1.5, 2.7, -0.2, 0.05],
    [0.71, 6.45, 1.56, 2.85, -0.24, 0.1],
    [0.79, 6.95, 1.22, 2.05, 0.02, 0.35],
    [0.87, 7.25, 1.28, 2.25, 0.02, 0.5],
    [0.94, 7.6, 1.3, 2.3, 0, 0.1],
    [1.0, 7.95, 1.33, 2.35, 0, 0]
  ];
  function camAt(p) {
    var n = CAM.length, i = 0;
    while (i < n - 2 && p >= CAM[i + 1][0]) i++;
    var k0 = CAM[Math.max(0, i - 1)], k1 = CAM[i], k2 = CAM[i + 1], k3 = CAM[Math.min(n - 1, i + 2)];
    var u = clamp01((p - k1[0]) / (k2[0] - k1[0])), u2 = u * u, u3 = u2 * u, out = [];
    for (var j = 1; j < 6; j++) {
      var p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j];
      out.push(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3));
    }
    return out;
  }

  function createExperience(THREE, host, ui) {
    var V3 = THREE.Vector3;
    var mobile = isMobile(host.clientWidth);
    var still = reduceMotion();
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false });
    var maxDpr = Math.min(window.devicePixelRatio || 1, 1.5), dpr = maxDpr;
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = 'auvx-canvas';
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
    var disposables = [];
    function keep(x) { disposables.push(x); return x; }
    var envRT = makeEnv(THREE, renderer);
    scene.environment = envRT.texture;
    scene.add(new THREE.HemisphereLight(0xbdf3ff, 0x06202e, 0.9));
    var key = new THREE.DirectionalLight(0xeaf8ff, 2.6); scene.add(key);
    var rim = new THREE.DirectionalLight(0x34e7d4, 2.2); scene.add(rim);
    var kick = new THREE.DirectionalLight(0xff9a4a, 0.45); scene.add(kick);

    var auv = A.build(THREE, { anisotropy: Math.min(4, renderer.capabilities.getMaxAnisotropy()) });
    var sub = new THREE.Group(); sub.add(auv.root); scene.add(sub);
    disposables.push(auv);

    // glow sprites on the lamp faces
    var glowTex = keep(canvasTex(THREE, 128, 128, function (g, w) {
      var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,245,225,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }));
    var glowMat = keep(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1d6, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
    auv.lampSockets.forEach(function (s) { var sp = new THREE.Sprite(glowMat); sp.scale.set(0.16, 0.16, 1); s.add(sp); });

    // soft contact shadow that travels with the vehicle
    var shadowTex = keep(canvasTex(THREE, 128, 128, function (g, w) {
      var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(0,8,14,.65)'); gr.addColorStop(1, 'rgba(0,8,14,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }));
    var shadowMat = keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    var shadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), shadowMat);
    shadow.rotation.x = -HALF; shadow.scale.set(1.3, 1.45, 1); shadow.renderOrder = -1; scene.add(shadow);

    // DVL beams (additive cones, part of the sensing animation)
    var beamMat = keep(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uAmt: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(0.2, 0.9, 0.83) } },
      vertexShader: 'varying float vAlong; varying vec3 vN; varying vec3 vV; void main(){ vAlong = clamp(position.z / 0.9, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uAmt, uTime; uniform vec3 uColor; varying float vAlong; varying vec3 vN; varying vec3 vV;\n' +
        'void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.8); float fall = pow(1.0 - vAlong, 1.5) * smoothstep(0.0, 0.05, vAlong);\n' +
        '  float pulse = 0.3 + 0.7 * smoothstep(0.55, 1.0, sin(vAlong * 22.0 - uTime * 8.0)); gl_FragColor = vec4(uColor, clamp(f * fall * pulse * uAmt, 0.0, 1.0)); }' // alpha carries the intensity: the canvas is transparent
    }));
    var beamGeo = new THREE.ConeGeometry(Math.tan(0.05) * 0.9, 0.9, 24, 1, true);
    beamGeo.translate(0, -0.45, 0); beamGeo.rotateX(-HALF); keep(beamGeo);
    auv.dvlFaces.forEach(function (f) {
      var b = new THREE.Mesh(beamGeo, beamMat);
      b.position.copy(auv.dvlCenter);
      b.quaternion.setFromUnitVectors(new V3(0, 0, 1), new V3(f.x * Math.sin(0.44), -Math.cos(0.44), f.z * Math.sin(0.44)).normalize());
      b.renderOrder = 5; auv.dvl.add(b);
    });

    var W = 1, H = 1;
    function resize() {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      mobile = isMobile(W);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.fov = W / H < 0.85 ? 44 : 32;
      camera.updateProjectionMatrix();
    }
    var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host); else window.addEventListener('resize', resize);
    resize();

    var time = 0, last = performance.now(), p = ui.progress(), chapter = -1, lastHud = 0;
    var viewX = 0, viewY = 0;
    var tgt = new V3(), tmp = new V3();
    var torpedo = auv.torpedoes[1], torpHome = torpedo.position.clone();
    var fpsT = 0, fpsN = 0, slow = 0, fast = 0, running = false, raf = 0;

    var idleFor = 0, skip = false;
    function frame(now) {
      raf = 0;
      if (!running) return;
      // when the visitor is not scrolling, only the propellers move: draw every other frame (≈30 fps)
      if (idleFor > 0.6 && !still) { skip = !skip; if (skip) { raf = requestAnimationFrame(frame); return; } }
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!still) time += dt;
      var goal = ui.progress();
      p += (goal - p) * (still ? 1 : 1 - Math.exp(-dt * 6));
      if (Math.abs(goal - p) < 0.00005) p = goal;
      idleFor = p === goal ? idleFor + dt : 0;

      /* vehicle */
      var approach = 1 - easeOut(p / 0.12);
      var bob = still ? 0 : Math.sin(time * 0.8) * 0.015;
      sub.position.set(0, bob, -2.4 * approach);
      sub.rotation.set(0.05 * approach + (still ? 0 : Math.sin(time * 0.55) * 0.012), -0.5 * approach * approach + (p > 0.9 ? (p - 0.9) * 2.2 : 0), still ? 0 : Math.sin(time * 0.7 + 1) * 0.012);
      var ex = fade(p, 0.425, 0.505, 0.575, 0.615);
      auv.explode(ex);
      auv.grip(0.2 + 0.55 * Math.max(fade(p, 0.5, 0.53, 0.56, 0.6), fade(p, 0.8, 0.83, 0.86, 0.88)));
      var thrust = 0.15 + 0.85 * fade(p, 0.29, 0.32, 0.4, 0.43) + 0.6 * fade(p, 0.0, 0.0001, 0.08, 0.13) + 0.5 * fade(p, 0.74, 0.78, 0.86, 0.9);
      if (ex > 0.05) thrust *= 0.2;
      auv.spin(dt, Math.min(1, thrust), time);
      shadow.position.set(sub.position.x, -0.42, sub.position.z);
      shadowMat.opacity = 1 - ex * 0.6;

      // torpedo leaves its tube and runs forward out of frame
      var tf = clamp01((p - P_FIRE) / (P_GONE - P_FIRE));
      torpedo.position.set(torpHome.x, torpHome.y, torpHome.z + tf * tf * 3.2);
      torpedo.rotation.z = tf > 0 ? time * 6 : 0;
      torpedo.visible = tf < 1;

      var sense = fade(p, 0.605, 0.64, 0.72, 0.75);
      beamMat.uniforms.uAmt.value = sense; beamMat.uniforms.uTime.value = time;

      /* camera */
      var c = camAt(p);
      tgt.set(0, c[3], c[4]);
      var dist = c[2] * (camera.aspect < 1 ? Math.min(2.1, 1.05 / camera.aspect) : 1);
      var az = c[0] + (p > 0.94 && !still ? Math.sin(time * 0.25) * 0.15 : 0), pol = c[1];
      camera.position.set(tgt.x + dist * Math.sin(pol) * Math.sin(az), tgt.y + dist * Math.cos(pol), tgt.z + dist * Math.sin(pol) * Math.cos(az));
      camera.lookAt(tgt);
      key.position.copy(camera.position).add(tmp.set(1.5, 3, 0.5));
      rim.position.set(-camera.position.x * 1.2, 1.5, -camera.position.z * 1.2);
      kick.position.set(camera.position.z, -2, -camera.position.x);
      var ch = 0; for (var k = 0; k < CHAPTERS.length; k++) if (p >= CHAPTERS[k].s) ch = k;
      var side = CHAPTERS[ch].side === 'left' ? 1 : -1;
      var wantX = mobile ? 0 : side * Math.min(0.12 * W, 230), wantY = mobile ? 0.17 * H : 0;
      var kk = still ? 1 : 1 - Math.exp(-dt * 3);
      viewX += (wantX - viewX) * kk; viewY += (wantY - viewY) * kk;
      camera.setViewOffset(W, H, -viewX, viewY, W, H);

      renderer.render(scene, camera);

      /* labels */
      LABELS.forEach(function (l) {
        var lab = ui.labels[l.id]; if (!lab) return;
        var a = fade(p, l.s, l.s + 0.015, l.e - 0.015, l.e);
        if (a <= 0.001) { if (lab.dzOn) { lab.style.opacity = '0'; lab.dzOn = false; } return; }
        var an = auv.anchors[l.a]; tmp.copy(an[1]); an[0].localToWorld(tmp); tmp.project(camera);
        var x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
        if (!lab.dzW) lab.dzW = lab.firstChild ? lab.firstChild.offsetWidth : 140;
        var inside = clamp01(Math.min(x, W - x, y - 60, H - y) / 30);
        lab.style.opacity = (a * inside).toFixed(3); lab.dzOn = true;
        lab.classList.toggle('is-flip', x > W - lab.dzW - 24);
        lab.classList.toggle('is-below', y < 140);
        lab.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      });
      if (ch !== chapter) { chapter = ch; ui.onChapter(ch); }
      ui.onProgress(p);
      if (now - lastHud > 250) {
        lastHud = now;
        ui.hud({
          mode: MODES[ch], depth: (8.6 + (still ? 0 : Math.sin(time * 0.4) * 0.03)).toFixed(2),
          speed: (approach > 0.01 ? 0.6 * approach + 0.1 : (ch === 5 ? 0.35 : 0)).toFixed(2),
          heading: Math.round((360 + sub.rotation.y * 180 / PI) % 360), thrust: Math.round(Math.min(1, thrust) * 100),
          battery: Math.round(98 - p * 9)
        });
      }

      // adapt resolution to the device: drop quickly when slow, recover slowly when there is headroom
      fpsT += dt; fpsN++;
      if (fpsT > 0.5) {
        var fps = fpsN / fpsT;
        if (idleFor > 0.6) fps *= 2;
        if (fps < 45) { slow++; fast = 0; if (slow >= 2 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); slow = 0; } }
        else if (fps > 57) { fast++; slow = 0; if (fast >= 8 && dpr < maxDpr) { dpr = Math.min(maxDpr, dpr + 0.25); renderer.setPixelRatio(dpr); resize(); fast = 0; } }
        fpsT = 0; fpsN = 0;
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; last = performance.now(); fpsT = 0; fpsN = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { auv.redrawDecal(); });

    return {
      start: start, stop: stop,
      warm: function () {
        camera.position.set(0, 0.5, 3); camera.lookAt(0, 0, 0);
        var done = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera));
        var timeout = new Promise(function (r) { setTimeout(r, 4000); });
        return Promise.race([Promise.resolve(done), timeout]).catch(function () { /* first frame compiles instead */ });
      },
      dispose: function () {
        stop();
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        scene.traverse(function (o) { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); });
        disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
        envRT.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }

  /* Builds the sticky stage, text panels, HUD and chapter rail inside `section`, then the WebGL scene when it gets near. */
  A.mountExperience = function (section, opts) {
    opts = opts || {};
    var THREE = window.THREE;
    section.classList.add('auvx');
    var sticky = el('div', 'auvx-sticky', null, section);
    var stage = el('div', 'auvx-stage', null, sticky);
    stage.setAttribute('aria-hidden', 'true');
    var labelsEl = el('div', 'auvx-labels', null, sticky); labelsEl.setAttribute('aria-hidden', 'true');
    var labels = {};
    LABELS.forEach(function (l) { var s = el('span', 'auvx-label', null, labelsEl); el('b', null, l.t, s); labels[l.id] = s; });

    var hud = el('div', 'auvx-hud', null, sticky); hud.setAttribute('aria-hidden', 'true');
    var hudHead = el('div', 'auvx-hud-head', null, hud);
    el('span', 'auvx-hud-dot', null, hudHead); el('span', null, 'D6-ROV · TELEMETRİ', hudHead);
    var hv = {};
    [['mode', 'MOD'], ['depth', 'DERİNLİK', 'm'], ['speed', 'HIZ', 'm/s'], ['heading', 'YÖN', '°'], ['thrust', 'İTKİ', '%'], ['battery', 'BATARYA', '%']].forEach(function (r) {
      var row = el('div', 'auvx-hud-row', null, hud);
      el('span', 'auvx-hud-k', r[1], row);
      var v = el('span', 'auvx-hud-v', '—', row);
      if (r[2]) el('small', null, r[2], row);
      hv[r[0]] = v;
    });

    var panelsEl = el('div', 'auvx-panels', null, sticky);
    var panels = CHAPTERS.map(function (c) {
      var a = el('article', 'auvx-panel is-' + c.side, null, panelsEl);
      el('p', 'auvx-kick', c.kick, a);
      el('h3', 'auvx-title', c.title, a);
      el('p', 'auvx-body', c.body, a);
      var dl = el('dl', 'auvx-specs', null, a);
      c.specs.forEach(function (s) { var d = el('div', null, null, dl); el('dt', null, s[0], d); el('dd', null, s[1], d); });
      if (c.cta && opts.cta) {
        var row = el('div', 'auvx-cta', null, a);
        opts.cta.forEach(function (b) {
          var link = el('a', 'dz-btn dz-btn-' + (b.variant || 'primary') + ' dz-btn-md', b.label, row);
          link.href = b.href; if (b.onClick) link.addEventListener('click', b.onClick);
        });
      }
      return a;
    });

    var rail = el('nav', 'auvx-rail', null, sticky); rail.setAttribute('aria-label', 'Deneyim bölümleri');
    var bar = el('span', 'auvx-rail-bar', null, rail), fill = el('i', null, null, bar);
    var dots = CHAPTERS.map(function (c, i) {
      var b = el('button', 'auvx-dot', null, rail); b.type = 'button';
      b.style.left = (c.s * 100) + '%';
      b.setAttribute('aria-label', c.kick + ': ' + c.title);
      el('span', null, c.kick.replace(/^\d+ · /, ''), b);
      b.addEventListener('click', function () { scrollToP(c.s + (i ? 0.035 : 0)); });
      return b;
    });
    var hint = el('div', 'auvx-hint', null, sticky); hint.setAttribute('aria-hidden', 'true');
    el('i', null, null, hint); el('span', null, 'KAYDIRARAK KEŞFET', hint);
    var counter = el('div', 'auvx-count', null, sticky); counter.setAttribute('aria-hidden', 'true');
    var loading = el('div', 'auvx-loading', null, sticky);
    el('span', 'dz-o3d-loader', null, loading); el('span', null, '3B MODEL HAZIRLANIYOR', loading);

    function progress() {
      var r = section.getBoundingClientRect(), span = r.height - window.innerHeight;
      return span > 0 ? clamp01(-r.top / span) : 0;
    }
    function scrollToP(pp) {
      var r = section.getBoundingClientRect(), top = window.pageYOffset + r.top;
      window.scrollTo({ top: top + pp * (r.height - window.innerHeight) + 2, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
    var current = -1;
    function setChapter(i) {
      if (i === current) return; current = i;
      panels.forEach(function (pn, k) { pn.classList.toggle('is-on', k === i); });
      dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); d.classList.toggle('is-past', k < i); });
      counter.textContent = ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + CHAPTERS.length).slice(-2);
      section.setAttribute('data-chapter', String(i));
    }
    var lastFill = -1;
    function setProgress(pp) {
      if (Math.abs(pp - lastFill) < 0.0005) return; lastFill = pp;
      fill.style.transform = 'scaleX(' + pp.toFixed(4) + ')';
      hint.classList.toggle('is-gone', pp > 0.02);
    }
    function setHud(v) { Object.keys(hv).forEach(function (k) { if (v[k] != null && hv[k].textContent !== String(v[k])) hv[k].textContent = v[k]; }); }

    var gl = THREE && A.webglOk();
    if (!gl) {
      section.classList.add('is-static'); loading.remove();
      setChapter(0);
      return { dispose: function () { section.innerHTML = ''; } };
    }
    var exp = null, inView = false, disposed = false, warmed = false, near = false;
    function chapterFromScroll() { var pp = progress(), ch = 0; CHAPTERS.forEach(function (c, k) { if (pp >= c.s) ch = k; }); setChapter(ch); setProgress(pp); }
    function onScroll() {
      var r = section.getBoundingClientRect(), vh = window.innerHeight;
      document.documentElement.classList.toggle('auvx-in', r.top < vh * 0.5 && r.bottom > vh * 0.5);
      inView = r.top < vh && r.bottom > 0;
      if (!near && r.top < vh + 1400 && r.bottom > -1400) { near = true; setTimeout(build, 30); }
      if (!exp || !warmed) { chapterFromScroll(); return; }
      if (inView && !document.hidden) exp.start(); else exp.stop();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    setChapter(0);
    function build() {
      if (exp || disposed) return;
      try {
        exp = createExperience(THREE, stage, { labels: labels, progress: progress, onChapter: setChapter, onProgress: setProgress, hud: setHud });
        exp.warm().then(function () {
          if (disposed) return;
          warmed = true;
          onScroll();
          setTimeout(function () { section.classList.add('is-ready'); setTimeout(function () { loading.remove(); }, 900); }, 120);
        });
      } catch (err) {
        if (window.console) console.warn('D6-ROV', err);
        section.classList.add('is-static'); loading.remove();
      }
    }
    function onVisChange() { if (exp && warmed) { if (document.hidden) exp.stop(); else if (inView) exp.start(); } }
    document.addEventListener('visibilitychange', onVisChange);
    onScroll();
    return {
      dispose: function () {
        disposed = true;
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        document.removeEventListener('visibilitychange', onVisChange);
        document.documentElement.classList.remove('auvx-in');
        if (exp) exp.dispose();
        section.innerHTML = '';
      }
    };
  };
})();
