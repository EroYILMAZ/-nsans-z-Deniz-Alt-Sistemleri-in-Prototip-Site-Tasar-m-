/*
 * Deniz6 — D6-AUV tanıtım filmi (çevrimdışı render, Three.js r160). Site bu dosyayı yüklemez.
 *
 * Gerçekçilik için fiziksel tabanlı bir su altı hattı:
 *  - Güneş ışığı yüzeyden kırılarak gelir: kostikler (renk ayrışmalı) doğrudan güneş ışığının bir parçasıdır,
 *    bu yüzden gölgelere ve yüzey açısına uyar. Ortam ışığı saçılmış mavi-yeşil ışıktır.
 *  - Su, her renk kanalını farklı söndürür (kırmızı ilk kaybolur); uzak nesneler suyun saçtığı ışığa karışır.
 *  - Hacimsel ışık: yüzeyden inen ışık huzmeleri ve fener ışınları derinlik tamponuna kadar raymarch edilir,
 *    yani nesnelerin arkasında kesilir; ileri saçılım (Henyey–Greenstein) ile karşıdan bakınca parlar.
 *  - Asılı parçacıklar fener ışığında parlar ve gerçek derinlik testiyle (yumuşak) çizilir.
 *  - Kamera: alan derinliği (bokeh), hafif el kamerası titremesi, alt karelerle gerçek hareket bulanıklığı.
 *  - Kum dalgacıkları normal haritasıyla, çakıllar, pürüzsüz kayalar; iticilerde kabarcık yok (gerçekte olmaz).
 * Kareler server.py'ye gönderilir, ffmpeg ile MP4 yapılır (README).
 */
(function () {
  'use strict';
  var THREE = window.THREE, A = window.D6AUV;
  var PI = Math.PI, HALF = PI / 2, TAU = PI * 2;
  var W = 1920, H = 1080, FPS = 30, DURATION = 30, SUB = 5, SHUTTER = 0.5;
  var FLOOR = -1.55, GATE_Z = 5.0, TARGET_Z = 11.0, SURFACE_Y = 7.5;
  var SUN = new THREE.Vector3(0.22, 1, 0.3).normalize();
  var SIGMA = new THREE.Vector3(0.40, 0.105, 0.078);       // extinction per metre (r, g, b)
  var DEEP = new THREE.Color(0.0035, 0.024, 0.036), UP = new THREE.Color(0.03, 0.15, 0.2); // in-scattered water radiance

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(x) { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function hash3(x, y, z) { var s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
  function noise3(x, y, z) {
    var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    function c(a, b, d) { return hash3(ix + a, iy + b, iz + d); }
    return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
  }
  function fbm3(x, y, z) { return 0.5 * noise3(x, y, z) + 0.25 * noise3(x * 2.03, y * 2.03, z * 2.03) + 0.125 * noise3(x * 4.1, y * 4.1, z * 4.1) + 0.0625 * noise3(x * 8.3, y * 8.3, z * 8.3); }
  // smooth handheld drift (sum of incommensurate sines)
  function shake(t, seed, amp) {
    return new THREE.Vector3(
      (Math.sin(t * 1.31 + seed) * 0.6 + Math.sin(t * 2.71 + seed * 2.1) * 0.3 + Math.sin(t * 5.3 + seed * 3.7) * 0.1) * amp,
      (Math.sin(t * 1.07 + seed * 1.7) * 0.6 + Math.sin(t * 2.33 + seed * 0.7) * 0.3 + Math.sin(t * 4.9 + seed) * 0.1) * amp,
      (Math.sin(t * 0.93 + seed * 2.9) * 0.6 + Math.sin(t * 1.91 + seed * 1.3) * 0.4) * amp * 0.6);
  }
  var rr = A.rng(31);

  var GLSL = [
    'vec2 dzHash(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }',
    'float dzH1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float dzNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(dzH1(i), dzH1(i + vec2(1.0, 0.0)), f.x), mix(dzH1(i + vec2(0.0, 1.0)), dzH1(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float dzFbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * dzNoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }',
    'float dzVoro(vec2 x, float t){ vec2 n = floor(x), f = fract(x); float m1 = 8.0, m2 = 8.0;',
    '  for (int j = -1; j <= 1; j++) { for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 o = dzHash(n + g);',
    '    o = 0.5 + 0.42 * sin(t + 6.2831 * o); vec2 r = g + o - f; float d = dot(r, r);',
    '    if (d < m1) { m2 = m1; m1 = d; } else if (d < m2) { m2 = d; } } }',
    '  return sqrt(m2) - sqrt(m1); }',
    // refracted-sunlight network: domain-warped, two layers, thin bright filaments
    'float dzCau(vec2 p, float t){ vec2 w = p + 0.45 * vec2(dzNoise(p * 0.6 + t * 0.11), dzNoise(p * 0.6 - t * 0.09 + 5.2));',
    '  float a = dzVoro(w, t * 0.8), b = dzVoro(w * 1.41 + vec2(4.1, 1.3), t * 1.05 + 2.0);',
    '  return pow(1.0 - smoothstep(0.0, 0.11, a), 2.2) * 0.75 + pow(1.0 - smoothstep(0.0, 0.08, b), 2.2) * 0.55; }',
    'vec3 dzCau3(vec2 p, float t){ return vec3(dzCau(p * 1.012, t), dzCau(p, t), dzCau(p * 0.988, t)); }', // dispersion
    'float dzHG(float c, float g){ float g2 = g * g; return (1.0 - g2) / (12.566 * pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5)); }'
  ].join('\n');

  /* ---------- renderer ---------- */
  var renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap; renderer.shadowMap.autoUpdate = false; // refreshed once per sub-frame, not for the depth and particle passes
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 1);
  var out = document.getElementById('out'), ctx = out.getContext('2d');
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, W / H, 0.03, 120);
  var U = { uTime: { value: 0 }, uSunDir: { value: SUN }, uSurf: { value: SURFACE_Y }, uCauAmt: { value: 1 } };

  /* Patch for every lit material: world position + normal varyings, sunlight caustics on the directional light,
     optional colour and normal-perturbation snippets. */
  var LIGHTS_BEGIN = THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );',
    'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= dzSunCaustic( vW );');
  function patch(mat, a, b, c) {
    var WEAR = '  roughnessFactor = clamp(roughnessFactor * (0.72 + 0.6 * dzFbm(vW.xz * 22.0 + vW.y * 17.0)), 0.04, 1.0);\n';
    var DIRT = '  diffuseColor.rgb *= 0.86 + 0.24 * dzFbm(vW.xz * 9.0 + vW.y * 13.0);\n';
    var o = typeof a === 'number' ? { k: a * 2.2, color: DIRT + (b || ''), normal: c, rough: WEAR } : (a || {});
    if (o.k == null) o.k = 1;
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uSunDir = U.uSunDir; sh.uniforms.uSurf = U.uSurf; sh.uniforms.uCauAmt = U.uCauAmt; sh.uniforms.uCauK = { value: o.k };
      sh.vertexShader = 'uniform float uTime;\nvarying vec3 vW; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' +
        '  vec4 dzW = vec4(transformed, 1.0); vec3 dzN = objectNormal;\n#ifdef USE_INSTANCING\n  dzW = instanceMatrix * dzW; dzN = mat3(instanceMatrix) * dzN;\n#endif\n' +
        '  vW = (modelMatrix * dzW).xyz; vWN = normalize(mat3(modelMatrix) * dzN);');
      sh.fragmentShader = 'varying vec3 vW; varying vec3 vWN;\nuniform float uTime; uniform vec3 uSunDir; uniform float uSurf; uniform float uCauK; uniform float uCauAmt;\n' + GLSL + '\n' +
        (o.defs || '') +
        'vec3 dzSunCaustic(vec3 w){ float below = max(uSurf - w.y, 0.0); vec2 q = w.xz + uSunDir.xz / uSunDir.y * below;\n' +
        '  vec3 c = dzCau3(q * 3.1, uTime * 0.9); float k = uCauK * uCauAmt * exp(-below * 0.035);\n' +
        '  return mix(vec3(1.0), vec3(0.3) + c * 2.1, clamp(k, 0.0, 1.0)); }\n' +
        sh.fragmentShader
          .replace('#include <color_fragment>', '#include <color_fragment>\n' + (o.color || ''))
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + (o.normal || ''))
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + (o.rough || ''))
          .replace('#include <lights_fragment_begin>', LIGHTS_BEGIN);
    };
    mat.customProgramCacheKey = function () { return 'filmw' + o.k + (o.color ? o.color.length : 0) + (o.normal ? o.normal.length : 0) + (o.rough ? 'r' : ''); };
    return mat;
  }

  /* ---------- image-based light: what a polished part reflects underwater ---------- */
  (function () {
    var s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uSun: { value: SUN } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uSun; varying vec3 vDir; void main(){ float y = vDir.y;\n' +
        '  vec3 c = mix(vec3(0.004, 0.025, 0.035), vec3(0.05, 0.22, 0.3), smoothstep(-0.6, 1.0, y));\n' +
        '  c += vec3(0.9, 1.2, 1.3) * smoothstep(0.72, 0.8, y) * 2.0; c += vec3(1.4, 1.8, 1.9) * pow(max(dot(vDir, uSun), 0.0), 60.0) * 6.0;\n' +
        '  gl_FragColor = vec4(c, 1.0); }'
    })));
    var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(s, 0.02).texture; pm.dispose();
  })();

  /* ---------- light ---------- */
  var hemi = new THREE.HemisphereLight(new THREE.Color(0.2, 0.46, 0.55), new THREE.Color(0.02, 0.045, 0.045), 1.0); scene.add(hemi);
  var sun = new THREE.DirectionalLight(new THREE.Color(0.72, 0.95, 1.0), 3.2);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  var sc = sun.shadow.camera; sc.left = -2.6; sc.right = 2.6; sc.top = 2.6; sc.bottom = -2.6; sc.near = 0.5; sc.far = 20;
  sun.shadow.radius = 9; sun.shadow.blurSamples = 20; sun.shadow.bias = -0.0002;
  scene.add(sun); scene.add(sun.target);

  /* ---------- vehicle ---------- */
  var auv = A.build(THREE, { film: true, patch: patch, anisotropy: renderer.capabilities.getMaxAnisotropy() });
  var sub = new THREE.Group(); sub.add(auv.root); scene.add(sub); sub.rotation.order = 'YXZ';
  auv.root.traverse(function (o) {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    if (o.material && o.material.envMapIntensity !== undefined) o.material.envMapIntensity = Math.min(o.material.envMapIntensity, 0.85);
  });
  var spots = [];
  auv.lampSockets.forEach(function (sock) {
    var s = new THREE.SpotLight(new THREE.Color(1.0, 0.93, 0.82), 70, 0, 0.5, 0.75, 2);
    var t = new THREE.Object3D(); t.position.set(0, -0.12, 1); sock.add(t); s.target = t;
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.camera.near = 0.05; s.shadow.camera.far = 14; s.shadow.radius = 4; s.shadow.bias = -0.0005;
    sock.add(s); spots.push(s);
  });

  /* ---------- sea floor: dunes in the mesh, ripples in the normals, mottled sand ---------- */
  function duneY(x, z) {
    var y = 0.06 * Math.sin(x * 1.05 + z * 0.33) + 0.045 * Math.sin(z * 1.7 + x * 0.25) + 0.42 * (fbm3(x * 0.12, 0, z * 0.12) - 0.47) + 0.03 * (noise3(x * 2.4, 1, z * 2.4) - 0.5);
    return y * (0.3 + 0.7 * Math.min(1, Math.abs(x) / 3.2));
  }
  var floorGeo = new THREE.PlaneGeometry(120, 120, 420, 420); floorGeo.rotateX(-HALF);
  (function () { var p = floorGeo.attributes.position; for (var i = 0; i < p.count; i++) p.setY(i, duneY(p.getX(i), p.getZ(i) + 6)); floorGeo.computeVertexNormals(); })();
  var floorMat = patch(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.25 }), {
    k: 1.0,
    defs: 'float dzRip(vec2 p){ float warp = dzFbm(p * 0.55) * 7.0; float ph = dot(p, vec2(0.94, 0.33)) * 34.0 + warp;\n' +
      '  return pow(0.5 + 0.5 * sin(ph), 1.7) * 0.0075 * (0.45 + 0.55 * dzNoise(p * 0.8)) + (dzNoise(p * 70.0) - 0.5) * 0.0009; }\n',
    color: '  float n1 = dzFbm(vW.xz * 0.38), n2 = dzFbm(vW.xz * 2.7 + 7.0), gr = dzNoise(vW.xz * 140.0);\n' +
      '  vec3 sa = vec3(0.50, 0.455, 0.365), sb = vec3(0.34, 0.33, 0.29), dk = vec3(0.17, 0.18, 0.15);\n' +
      '  vec3 col = mix(sa, sb, smoothstep(0.3, 0.72, n1)); col = mix(col, dk, smoothstep(0.6, 0.88, n2) * 0.45);\n' +
      '  float rip = pow(0.5 + 0.5 * sin(dot(vW.xz, vec2(0.94, 0.33)) * 34.0 + dzFbm(vW.xz * 0.55) * 7.0), 1.7);\n' +
      '  col *= (0.86 + 0.24 * gr) * (0.88 + 0.16 * rip); diffuseColor.rgb = col;\n',
    normal: '  { vec2 e = vec2(0.003, 0.0); float h0 = dzRip(vW.xz), hx = dzRip(vW.xz + e.xy), hz = dzRip(vW.xz + e.yx);\n' +
      '    vec3 gw = vec3(-(hx - h0) / e.x, 0.0, -(hz - h0) / e.x); normal = normalize(normal + (viewMatrix * vec4(gw, 0.0)).xyz * 0.9); }\n'
  });
  var floor = new THREE.Mesh(floorGeo, floorMat); floor.position.set(0, FLOOR, 6); floor.receiveShadow = true; scene.add(floor);

  // rocks: smooth, layered noise, algae and silt on their tops
  var rockMat = patch(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, envMapIntensity: 0.3 }), {
    k: 1.0,
    color: '  float rn = dzFbm(vW.xz * 3.0 + vW.y * 2.0), rf = dzNoise(vW.xz * 40.0 + vW.y * 30.0);\n' +
      '  vec3 rc = mix(vec3(0.25, 0.24, 0.22), vec3(0.4, 0.38, 0.34), rn) * (0.85 + 0.3 * rf);\n' +
      '  float top = smoothstep(0.35, 0.9, vWN.y);\n' +
      '  rc = mix(rc, vec3(0.16, 0.2, 0.11) * (0.8 + 0.5 * rn), top * smoothstep(0.4, 0.7, dzFbm(vW.xz * 5.0)) * 0.85);\n' +
      '  rc = mix(rc, vec3(0.45, 0.42, 0.34), top * smoothstep(0.55, 0.8, dzFbm(vW.xz * 2.0 + 3.0)) * 0.6);\n' +
      '  diffuseColor.rgb = rc;\n'
  });
  for (var ri = 0; ri < 30; ri++) {
    var rg = new THREE.IcosahedronGeometry(1, 5), rp = rg.attributes.position, seed = ri * 9.1;
    for (var vi = 0; vi < rp.count; vi++) {
      var vx = rp.getX(vi), vy = rp.getY(vi), vz = rp.getZ(vi);
      var d = 1 + 0.55 * (fbm3(vx * 1.1 + seed, vy * 1.1, vz * 1.1) - 0.47) + 0.08 * (noise3(vx * 6 + seed, vy * 6, vz * 6) - 0.5);
      rp.setXYZ(vi, vx * d, vy * d * (vy < -0.2 ? 0.35 : 0.68), vz * d);
    }
    rg.computeVertexNormals();
    var rock = new THREE.Mesh(rg, rockMat), side = rr() < 0.5 ? -1 : 1, s = 0.12 + rr() * rr() * 1.1;
    var rx = side * (1.9 + rr() * 8), rz = -8 + rr() * 30;
    rock.position.set(rx, FLOOR + duneY(rx, rz) - s * 0.12, rz);
    rock.scale.set(s * (0.8 + rr() * 0.7), s, s * (0.8 + rr() * 0.7)); rock.rotation.y = rr() * 6.28;
    rock.castShadow = true; rock.receiveShadow = true; scene.add(rock);
  }
  // pebbles and shell fragments (instanced, per-instance tint)
  (function () {
    var g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position;
    for (var i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i), z = p.getZ(i), dd = 1 + 0.25 * (noise3(x * 2, y * 2, z * 2) - 0.5); p.setXYZ(i, x * dd, y * dd * 0.55, z * dd); }
    g.computeVertexNormals();
    var n = 2600, im = new THREE.InstancedMesh(g, patch(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, envMapIntensity: 0.3 }), { k: 1.0 }), n);
    var m = new THREE.Matrix4(), q2 = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc2 = new THREE.Vector3(), col = new THREE.Color();
    for (var k = 0; k < n; k++) {
      var x2 = (rr() - 0.5) * 14, z2 = -6 + rr() * 26;
      if (Math.abs(x2) < 0.7 && rr() < 0.6) x2 += x2 < 0 ? -0.7 : 0.7;
      var s2 = 0.006 + Math.pow(rr(), 3) * 0.05;
      pos.set(x2, FLOOR + duneY(x2, z2) + s2 * 0.15, z2);
      e.set(rr() * 0.4, rr() * 6.28, rr() * 0.4); q2.setFromEuler(e); sc2.set(s2 * (0.7 + rr() * 0.6), s2, s2 * (0.7 + rr() * 0.6));
      m.compose(pos, q2, sc2); im.setMatrixAt(k, m);
      var v = 0.22 + rr() * 0.4; col.setRGB(v * (0.95 + rr() * 0.1), v * 0.95, v * (0.85 + rr() * 0.1)); if (rr() < 0.12) col.setRGB(0.62, 0.58, 0.5);
      im.setColorAt(k, col);
    }
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  })();

  /* ---------- course: cable, gate, target ---------- */
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  var stripe = canvasTex(64, 256, function (g, w, h) { for (var i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#141517' : '#d8661c'; g.fillRect(0, i * h / 8, w, h / 8); } });
  stripe.wrapS = stripe.wrapT = THREE.RepeatWrapping; stripe.repeat.set(1, 2);
  var GRIME = '  diffuseColor.rgb *= 0.78 + 0.3 * dzFbm(vW.xy * 9.0 + vW.z * 4.0); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.24, 0.16), smoothstep(0.62, 0.85, dzFbm(vW.xz * 6.0 + vW.y * 5.0)) * 0.35);\n';
  var pvc = patch(new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.5, envMapIntensity: 0.5 }), { k: 1.0, color: GRIME });
  var concrete = patch(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), { k: 1.0, color: '  diffuseColor.rgb = vec3(0.36, 0.36, 0.33) * (0.75 + 0.4 * dzFbm(vW.xz * 10.0 + vW.y * 7.0));\n' + GRIME });
  function mesh(geo, mat, parent, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
  var gate = new THREE.Group(); gate.position.set(0, 0, GATE_Z); scene.add(gate);
  var postH = 0.5 - FLOOR;
  [-1.15, 1.15].forEach(function (x) {
    mesh(new THREE.CylinderGeometry(0.032, 0.032, postH, 32), pvc, gate, x, FLOOR + postH / 2, 0);
    mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34, 4, 2, 4), concrete, gate, x, FLOOR + 0.04, 0);
  });
  var bar = new THREE.CylinderGeometry(0.032, 0.032, 2.36, 32); bar.rotateZ(HALF); mesh(bar, pvc, gate, 0, 0.5, 0);
  var flags = [[-0.62, 0xb32a22], [0.62, 0x1d7d48]].map(function (f) {
    var piv = new THREE.Group(); piv.position.set(f[0], 0.47, 0); gate.add(piv);
    var g = new THREE.PlaneGeometry(0.26, 0.36, 6, 8); g.translate(0, -0.18, 0);
    mesh(g, patch(new THREE.MeshStandardMaterial({ color: f[1], roughness: 0.75, side: THREE.DoubleSide }), { k: 1.0, color: GRIME }), piv, 0, 0, 0);
    return piv;
  });
  var cablePts = []; for (var ci = 0; ci <= 50; ci++) { var cz = -8 + ci * 0.6, cx = 0.45 + Math.sin(cz * 0.35) * 0.35; cablePts.push(new THREE.Vector3(cx, FLOOR + duneY(cx, cz) + 0.012, cz)); }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 500, 0.026, 12, false), patch(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), { k: 1.0, color: '  diffuseColor.rgb = vec3(0.5, 0.4, 0.05) * (0.7 + 0.4 * dzFbm(vW.xz * 6.0));\n' + GRIME }), scene, 0, 0, 0);
  var target = new THREE.Group(); target.position.set(0, 0, TARGET_Z); scene.add(target);
  var boardTex = canvasTex(512, 512, function (g, w) {
    g.fillStyle = '#9c7f24'; g.fillRect(0, 0, w, w); g.fillStyle = '#121212';
    g.fillRect(0, 0, w, 24); g.fillRect(0, w - 24, w, 24); g.fillRect(0, 0, 24, w); g.fillRect(w - 24, 0, 24, w);
  });
  var bs = new THREE.Shape(); bs.moveTo(-0.38, -0.38); bs.lineTo(0.38, -0.38); bs.lineTo(0.38, 0.38); bs.lineTo(-0.38, 0.38); bs.lineTo(-0.38, -0.38);
  [[0.103, 0.0, 0.085], [-0.17, 0.02, 0.12]].forEach(function (hh) { var hp = new THREE.Path(); hp.absarc(hh[0], hh[1], hh[2], 0, TAU, true); bs.holes.push(hp); });
  var bgeo = new THREE.ExtrudeGeometry(bs, { depth: 0.02, bevelEnabled: false, curveSegments: 48 });
  (function () { var uv = bgeo.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.38) / 0.76, (uv.getY(i) + 0.38) / 0.76); })();
  mesh(bgeo, patch(new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.75 }), { k: 1.0, color: GRIME }), target, 0, 0.15, 0);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15 - 0.38 - FLOOR, 16), pvc, target, 0, FLOOR + (0.15 - 0.38 - FLOOR) / 2, 0.03);
  mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), concrete, target, 0, FLOOR + 0.04, 0.03);

  /* ---------- particles (own layer, drawn after the water pass with a soft depth test) ---------- */
  var tDepthU = { value: null }, lampPosU = { value: [new THREE.Vector3(), new THREE.Vector3()] }, lampDirU = { value: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1)] };
  var lampAmtU = { value: 1 }, ambU = { value: 1 }, projU = { value: H / (2 * Math.tan(15 * PI / 180)) }, focusU = { value: 2 };
  var PART_COMMON = 'uniform vec3 uSigma; uniform vec3 uLampPos[2]; uniform vec3 uLampDir[2]; uniform float uLamp; uniform float uAmb; uniform float uProj; uniform float uFocus;\n' +
    'float dzLampAt(vec3 p){ float L = 0.0; for (int k = 0; k < 2; k++){ vec3 v = p - uLampPos[k]; float r = length(v); float cs = dot(v / max(r, 1e-3), uLampDir[k]); L += smoothstep(0.82, 0.94, cs) / (0.08 + r * r); } return L * uLamp; }\n';
  var snowN = 16000, snowGeo = new THREE.BufferGeometry(), sp = new Float32Array(snowN * 3), sd = new Float32Array(snowN);
  for (var si = 0; si < snowN; si++) { sp[si * 3] = (rr() - 0.5) * 12; sp[si * 3 + 1] = FLOOR + rr() * 5.5; sp[si * 3 + 2] = -5 + rr() * 23; sd[si] = rr(); }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); snowGeo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  var partUniforms = function (extra) {
    return Object.assign({ uTime: U.uTime, tDepth: tDepthU, uRes: { value: new THREE.Vector2(W, H) }, uSigma: { value: SIGMA }, uLampPos: lampPosU, uLampDir: lampDirU, uLamp: lampAmtU, uAmb: ambU, uProj: projU, uFocus: focusU }, extra || {});
  };
  var snowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: partUniforms(),
    vertexShader: 'attribute float aSeed; uniform float uTime; ' + PART_COMMON + 'varying vec3 vC; varying float vDist; varying float vR;\n' +
      'void main(){ vec3 p = position; p.y = mod(p.y - uTime * (0.008 + aSeed * 0.02) - (' + FLOOR.toFixed(2) + '), 5.5) + (' + FLOOR.toFixed(2) + ');\n' +
      '  p.x += sin(uTime * 0.21 + aSeed * 30.0) * 0.06 + uTime * 0.012; p.z += cos(uTime * 0.17 + aSeed * 20.0) * 0.06;\n' +
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = length(mv.xyz); vDist = d; float z = max(-mv.z, 0.05);\n' +
      '  float size = (0.0007 + aSeed * aSeed * 0.0035) * uProj / z;\n' +
      '  float bokeh = abs(z - uFocus) / z * 22.0;\n' + // out-of-focus specks open into soft discs
      '  vR = clamp(max(size, bokeh), 1.5, 80.0); gl_PointSize = vR;\n' +
      '  vec3 T = exp(-uSigma * d); float lit = 0.03 * uAmb + dzLampAt(p) * 0.9;\n' +
      '  vC = vec3(0.75, 0.9, 0.95) * lit * T * (0.4 + aSeed) * clamp(max(size, 1.5) * max(size, 1.5) / (vR * vR), 0.003, 1.0) * 5.0;\n' +
      '  gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D tDepth; uniform vec2 uRes; varying vec3 vC; varying float vDist; varying float vR;\n' +
      'void main(){ float dn = texture2D(tDepth, gl_FragCoord.xy / uRes).r; float sd = dn > 0.0 ? 1.0 / dn - 1.0 : 1e4;\n' +
      '  float vis = smoothstep(0.0, 0.08, sd - vDist); float r = length(gl_PointCoord - 0.5) * 2.0;\n' +
      '  float a = vR > 6.0 ? smoothstep(1.0, 0.82, r) * (0.75 + 0.25 * smoothstep(0.5, 0.95, r)) : smoothstep(1.0, 0.0, r);\n' +
      '  gl_FragColor = vec4(vC * a * vis, 1.0); }'
  });
  var snow = new THREE.Points(snowGeo, snowMat); snow.frustumCulled = false; snow.layers.set(1); scene.add(snow);
  // air bubbles from the pneumatic torpedo launch only (0: trail behind the torpedo, 1: puff at the muzzle)
  var PER = 140, emO = [new THREE.Vector3(), new THREE.Vector3()], emD = [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1)], emA = [0, 0], emT = [0, 0];
  var bubGeo = new THREE.BufferGeometry(), bn = 2 * PER, bi = new Float32Array(bn), bsd = new Float32Array(bn);
  for (var k = 0; k < bn; k++) { bi[k] = Math.floor(k / PER); bsd[k] = rr(); }
  bubGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bn * 3), 3)); bubGeo.setAttribute('aIdx', new THREE.BufferAttribute(bi, 1)); bubGeo.setAttribute('aSeed', new THREE.BufferAttribute(bsd, 1));
  var bubMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: partUniforms({ uO: { value: emO }, uD: { value: emD }, uA: { value: emA }, uT: { value: emT } }),
    vertexShader: 'attribute float aIdx; attribute float aSeed; uniform float uTime; uniform vec3 uO[2]; uniform vec3 uD[2]; uniform float uA[2]; uniform float uT[2]; ' + PART_COMMON +
      'varying vec3 vC; varying float vDist; varying float vR;\n' +
      'void main(){ int i = int(aIdx + 0.5); float age = uT[i] - aSeed * (i == 0 ? 1.2 : 0.25); float a = uA[i] * step(0.0, age) * (1.0 - smoothstep(1.2, 2.6, age));\n' +
      '  vec3 s1 = normalize(cross(uD[i], vec3(0.31, 0.93, 0.17))); vec3 s2 = cross(uD[i], s1); float ang = aSeed * 61.0;\n' +
      '  float spread = (i == 0 ? 0.01 : 0.03) + age * (i == 0 ? 0.03 : 0.12);\n' +
      '  vec3 p = uO[i] + uD[i] * (i == 0 ? 0.0 : (1.0 - exp(-age * 4.0)) * 0.25) + (s1 * cos(ang) + s2 * sin(ang)) * spread * (0.3 + aSeed);\n' +
      '  p.y += age * age * 0.18 + age * (0.05 + aSeed * 0.1); p.x += sin(age * 9.0 + aSeed * 40.0) * 0.008;\n' +
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = length(mv.xyz); vDist = d;\n' +
      '  float size = (0.0015 + aSeed * aSeed * 0.005) * uProj / max(-mv.z, 0.05); vR = clamp(size, 1.5, 60.0); gl_PointSize = vR;\n' +
      '  vC = vec3(0.8, 0.95, 1.0) * (0.12 * uAmb + dzLampAt(p) * 0.6 + 0.05) * exp(-uSigma * d) * a * 2.2; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D tDepth; uniform vec2 uRes; varying vec3 vC; varying float vDist; varying float vR;\n' +
      'void main(){ float dn = texture2D(tDepth, gl_FragCoord.xy / uRes).r; float sd = dn > 0.0 ? 1.0 / dn - 1.0 : 1e4; float vis = smoothstep(0.0, 0.05, sd - vDist);\n' +
      '  vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.0; float rim = smoothstep(1.0, 0.86, r) * smoothstep(0.55, 0.95, r); float hi = smoothstep(0.35, 0.0, length(q - vec2(-0.16, -0.16)) * 2.0);\n' +
      '  gl_FragColor = vec4(vC * (rim * 0.9 + hi * 1.6 + 0.08 * smoothstep(1.0, 0.0, r)) * vis, 1.0); }'
  });
  var bubbles = new THREE.Points(bubGeo, bubMat); bubbles.frustumCulled = false; bubbles.layers.set(1); scene.add(bubbles);

  /* ---------- post: depth, water, volumetrics, accumulation, depth of field, bloom, grade ---------- */
  var rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  var rtDepth = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  var rtDepthMid = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  var rtWater = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
  var rtAO = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
  var rtAcc = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
  var rtDof = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
  var rtA = new THREE.WebGLRenderTarget(W / 4, H / 4, { type: THREE.HalfFloatType, depthBuffer: false });
  var rtB = new THREE.WebGLRenderTarget(W / 4, H / 4, { type: THREE.HalfFloatType, depthBuffer: false });
  var fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsScene = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; fsScene.add(quad);
  var VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  var depthMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide,
    vertexShader: '#include <common>\nvarying float vD; void main(){\n#include <begin_vertex>\n#include <project_vertex>\n vD = length(mvPosition.xyz); }',
    fragmentShader: 'varying float vD; void main(){ gl_FragColor = vec4(1.0 / (1.0 + vD), 0.0, 0.0, 1.0); }' });
  // screen-space ambient occlusion from the distance buffer: contact shadows in crevices and where parts meet the sand
  var aoMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { tScene: { value: rtScene.texture }, tDepth: { value: rtDepth.texture }, uProjInv: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2(W, H) }, uProj: projU, uJit: { value: 0 } },
    vertexShader: VS,
    fragmentShader: 'uniform sampler2D tScene, tDepth; uniform mat4 uProjInv; uniform vec2 uRes; uniform float uProj, uJit; varying vec2 vUv;\n' +
      'vec3 vpos(vec2 uv){ float dn = texture2D(tDepth, uv).r; float d = dn > 0.0 ? 1.0 / dn - 1.0 : 1e4; vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0); v /= v.w; return normalize(v.xyz) * d; }\n' +
      'void main(){ vec3 c = texture2D(tScene, vUv).rgb; if (texture2D(tDepth, vUv).r <= 0.0) { gl_FragColor = vec4(c, 1.0); return; }\n' +
      '  vec2 px = 1.0 / uRes; vec3 P = vpos(vUv); vec3 dx1 = vpos(vUv + vec2(px.x, 0.0)) - P, dx2 = P - vpos(vUv - vec2(px.x, 0.0));\n' +
      '  vec3 dy1 = vpos(vUv + vec2(0.0, px.y)) - P, dy2 = P - vpos(vUv - vec2(0.0, px.y));\n' +
      '  vec3 N = normalize(cross(dot(dx1, dx1) < dot(dx2, dx2) ? dx1 : dx2, dot(dy1, dy1) < dot(dy2, dy2) ? dy1 : dy2)); if (dot(N, P) > 0.0) N = -N;\n' +
      '  float R = 0.16, rpx = min(R * uProj / max(-P.z, 0.05), 80.0); float rot = fract(sin(dot(gl_FragCoord.xy + uJit * 7.13, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;\n' +
      '  float occ = 0.0; for (int i = 0; i < 16; i++) { float fi = float(i); float r = sqrt((fi + 0.5) / 16.0) * rpx; float a = fi * 2.39996 + rot;\n' +
      '    vec3 v = vpos(vUv + vec2(cos(a), sin(a)) * r * px) - P; float dist = length(v);\n' +
      '    occ += max(dot(N, v / max(dist, 1e-4)) - 0.08, 0.0) * (1.0 - smoothstep(R * 0.6, R * 1.8, dist)); }\n' +
      '  float ao = clamp(1.0 - occ / 16.0 * 2.0, 0.0, 1.0); gl_FragColor = vec4(c * mix(1.0, ao, 0.92), 1.0); }' });
  var copyMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tDiffuse: { value: null } }, vertexShader: VS, fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }' });
  var waterMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { tScene: { value: rtAO.texture }, tDepth: { value: rtDepth.texture }, uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
      uSun: { value: SUN }, uSigma: { value: SIGMA }, uDeep: { value: DEEP }, uUp: { value: UP }, uTime: U.uTime, uAmb: ambU, uSurf: U.uSurf, uJit: { value: 0 },
      uLampPos: lampPosU, uLampDir: lampDirU, uLamp: lampAmtU, uShaft: { value: 1 }, uFloor: { value: FLOOR }, uVol: { value: 0.032 }, uLampVol: { value: 3.6 } },
    vertexShader: VS,
    fragmentShader: 'uniform sampler2D tScene, tDepth; uniform mat4 uProjInv, uCamWorld; uniform vec3 uCamPos, uSun, uSigma, uDeep, uUp; uniform float uTime, uAmb, uSurf, uJit, uLamp, uShaft, uVol, uLampVol, uFloor;\n' +
      'uniform vec3 uLampPos[2]; uniform vec3 uLampDir[2]; varying vec2 vUv;\n' + GLSL + '\n' +
      'vec3 inscat(vec3 d){ return mix(uDeep, uUp, smoothstep(-0.75, 1.0, d.y)) * uAmb; }\n' +
      'float shaft(vec3 p){ float below = max(uSurf - p.y, 0.0); vec2 q = p.xz + uSun.xz / uSun.y * below;\n' +
      '  float n = dzFbm(q * 0.42 + vec2(uTime * 0.035, -uTime * 0.027)); float c = dzCau(q * 0.35, uTime * 0.45);\n' +
      '  return (0.25 + 1.6 * pow(smoothstep(0.3, 0.82, n), 2.2) + 0.5 * c) * exp(-below * 0.06); }\n' +
      'void main(){ float dn = texture2D(tDepth, vUv).r; float dist = dn > 0.0 ? 1.0 / dn - 1.0 : 1e4;\n' +
      '  vec4 vp = uProjInv * vec4(vUv * 2.0 - 1.0, 1.0, 1.0); vp /= vp.w; vec3 dir = normalize((uCamWorld * vec4(vp.xyz, 0.0)).xyz);\n' +
      '  vec3 col = texture2D(tScene, vUv).rgb;\n' +
      '  if (dn <= 0.0) { float y = dir.y; vec2 q = dir.xz / max(y, 0.15) * 1.4;\n' + // Snell's window and the wavy surface seen from below
      '    float win = smoothstep(0.66, 0.74, y); vec3 sky = vec3(0.65, 0.88, 1.0) * (0.75 + 0.45 * dzCau(q * 7.0 + dzNoise(q * 3.0) * 0.6, uTime * 1.4) + 0.25 * dzNoise(q * 2.2 + uTime * 0.1)) * (1.0 + 6.0 * pow(max(dot(dir, uSun), 0.0), 30.0)) + vec3(0.5, 0.8, 0.9) * smoothstep(0.62, 0.69, y) * (1.0 - smoothstep(0.69, 0.78, y));\n' +
      '    float tir = smoothstep(0.5, 0.66, y) * (1.0 - win);\n' +
      '    col = sky * win * 2.4 * uAmb * exp(-uSigma * (uSurf - uCamPos.y) / max(y, 0.3)) + uUp * 0.6 * tir * uAmb; }\n' +
      '  vec3 T = dn > 0.0 ? exp(-uSigma * dist) : vec3(0.0); col = (dn > 0.0 ? col * T : col) + inscat(dir) * (1.0 - T);\n' +
      '  float tMax = min(dist, 18.0); const int N = 56; float stepL = tMax / float(N);\n' +
      '  float j = fract(sin(dot(gl_FragCoord.xy + uJit * 17.31, vec2(12.9898, 78.233))) * 43758.5453);\n' +
      '  float phS = dzHG(dot(dir, uSun), 0.72) * 3.0 + 0.05; vec3 acc = vec3(0.0);\n' +
      '  for (int i = 0; i < N; i++) { float s = (float(i) + j) * stepL; vec3 p = uCamPos + dir * s; vec3 Tr = exp(-uSigma * s);\n' +
      '    float below = max(uSurf - p.y, 0.0); vec3 L = vec3(0.6, 0.86, 0.95) * exp(-uSigma * below) * shaft(p) * phS * uAmb * uShaft;\n' +
      '    for (int k = 0; k < 2; k++) { vec3 v = p - uLampPos[k]; float r = length(v); vec3 vn = v / max(r, 1e-3); float cs = dot(vn, uLampDir[k]);\n' +
      '      float cone = smoothstep(0.84, 0.95, cs) * smoothstep(0.02, 0.12, r); L += vec3(1.0, 0.92, 0.8) * uLamp * cone * exp(-uSigma * r) / (0.25 + r * r) * dzHG(dot(vn, -dir), 0.6) * uLampVol; }\n' +
      '    float dens = 0.6 + 0.8 * dzNoise(p.xz * 0.33 + vec2(p.y * 0.21, uTime * 0.02)) + 1.6 * exp(-(p.y - uFloor) / 0.22) * (0.4 + 0.6 * dzNoise(p.xz * 1.7 + uTime * 0.05));\n' +
      '    acc += L * Tr * stepL * dens; }\n' +
      '  col += acc * uVol; gl_FragColor = vec4(col, 1.0); }' });
  var accMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    uniforms: { tDiffuse: { value: null }, uW: { value: 1 } }, vertexShader: VS,
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float uW; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = c.r + c.g + c.b; if (!(l < 1.0e5) || !(l >= 0.0)) c = vec3(0.0); gl_FragColor = vec4(min(c, vec3(60.0)) * uW, 1.0); }' });
  var dofMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: rtAcc.texture }, tDepth: { value: rtDepthMid.texture }, uRes: { value: new THREE.Vector2(W, H) }, uFocus: { value: 2 }, uAp: { value: 12 }, uMaxR: { value: 22 } }, vertexShader: VS,
    fragmentShader: 'uniform sampler2D tColor, tDepth; uniform vec2 uRes; uniform float uFocus, uAp, uMaxR; varying vec2 vUv;\n' +
      'float dep(vec2 uv){ float dn = texture2D(tDepth, uv).r; return dn > 0.0 ? 1.0 / dn - 1.0 : 1000.0; }\n' +
      'float coc(float d){ return clamp(abs(d - uFocus) / max(d, 0.05) * uAp, 0.0, uMaxR); }\n' +
      'void main(){ float d0 = dep(vUv), c0 = coc(d0); vec3 sum = texture2D(tColor, vUv).rgb; float ws = 1.0;\n' +
      '  for (int i = 1; i < 96; i++) { float fi = float(i); float r = sqrt(fi / 96.0) * uMaxR; float a = fi * 2.39996323; vec2 uv = vUv + vec2(cos(a), sin(a)) * r / uRes;\n' +
      '    float d = dep(uv), c = coc(d); float cc = d > d0 ? min(c, c0) : c; float w = smoothstep(r - 1.2, r + 1.2, cc);\n' +
      '    sum += texture2D(tColor, uv).rgb * w; ws += w; }\n' +
      '  gl_FragColor = vec4(sum / ws, 1.0); }' });
  var brightMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tDiffuse: { value: null } }, vertexShader: VS,
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.8, 3.0, l), 1.0); }' });
  var blurMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VS,
    fragmentShader: 'uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227027; s += texture2D(tDiffuse, vUv + uDir * 1.3846).rgb * 0.3162162; s += texture2D(tDiffuse, vUv - uDir * 1.3846).rgb * 0.3162162; s += texture2D(tDiffuse, vUv + uDir * 3.2308).rgb * 0.0702703; s += texture2D(tDiffuse, vUv - uDir * 3.2308).rgb * 0.0702703; gl_FragColor = vec4(s, 1.0); }' });
  var compMat = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
    uniforms: { tScene: { value: rtDof.texture }, tBloom: { value: rtA.texture }, uTime: { value: 0 }, uExposure: { value: 1.0 }, uFade: { value: 1 } }, vertexShader: VS,
    fragmentShader: 'uniform sampler2D tScene, tBloom; uniform float uTime, uExposure, uFade; varying vec2 vUv;\n' +
      'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }\n' +
      'vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }\n' +
      'void main(){ vec2 dc = vUv - 0.5; float r2 = dot(dc, dc); vec2 uv = 0.5 + dc * (1.0 - 0.035 * r2);\n' + // gentle barrel distortion of an underwater housing
      '  vec3 c; c.r = texture2D(tScene, uv + dc * 0.0035 * r2).r; c.g = texture2D(tScene, uv).g; c.b = texture2D(tScene, uv - dc * 0.0035 * r2).b;\n' +
      '  c += texture2D(tBloom, uv).rgb * 0.35;\n' +
      '  c = aces(max(c, vec3(0.0)) * uExposure); c = mix(c, c * c * (3.0 - 2.0 * c), 0.22);\n' +
      '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, 0.93);\n' +
      '  c *= 1.0 - smoothstep(0.18, 0.75, r2 * 1.3) * 0.5;\n' +
      '  c = srgb(c) * 0.975 + 0.008; c *= uFade;\n' +
      '  float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 7.31) * 91.7, vec2(12.9898, 78.233))) * 43758.5453); c += (n - 0.5) * 0.009;\n' +
      '  gl_FragColor = vec4(c, 1.0); }' });
  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }

  /* ---------- the edit ---------- */
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  function orbit(target, az, pol, d) { return V(target.x + d * Math.sin(pol) * Math.sin(az), target.y + d * Math.cos(pol), target.z + d * Math.sin(pol) * Math.cos(az)); }
  var SHOTS = [
    { a: 0, b: 4.5, f: function (t) { // awakening: lamps flicker on in the dark
      var u = t / 4.5, lamp = t < 1.2 ? 0 : t < 1.55 ? (Math.sin(t * 90) > 0.2 ? 1 : 0.15) : 1;
      return { sub: V(0, 0.012 * Math.sin(t * 0.8), 0), rot: [0, 0.32, 0], thrust: 0.2 + 0.15 * u, lamp: lamp, amb: 0.05 + 0.95 * smooth((t - 1.8) / 2.4), shaft: 0.7,
        cam: V(lerp(0.95, 0.62, ease(u)), lerp(-0.14, -0.06, u), lerp(2.45, 1.75, ease(u))), look: V(0, -0.03, 0.15), fov: 28, ap: 14, shake: 0.006 };
    } },
    { a: 4.5, b: 9, f: function (t) { // glide over the sea floor
      var u = (t - 4.5) / 4.5, p = V(0.15 * Math.sin(u * PI), 0.04 * Math.sin(u * TAU), -3.0 + u * 4.4);
      return { sub: p, rot: [0.035, -0.06 + 0.08 * u, -0.06 * Math.cos(u * PI)], thrust: 0.85, lamp: 1, amb: 1,
        cam: V(1.25, -1.18, 2.35 + 0.35 * u), look: V(p.x, p.y - 0.05, p.z + 0.1), fov: 34, ap: 9, shake: 0.012 };
    } },
    { a: 9, b: 13, f: function (t) { // macro slide along the flank while the thrusters spool up
      var u = (t - 9) / 4, p = V(0, 0.008 * Math.sin(t), 1.4 + (t - 9) * 0.1);
      return { sub: p, rot: [0, 0, 0], thrust: 0.25 + 0.75 * smooth(u * 1.3), lamp: 1, amb: 1,
        cam: V(p.x + 1.05, p.y + 0.16, p.z - 0.55 + u * 1.0), look: V(p.x + 0.1, p.y - 0.02, p.z - 0.3 + u * 0.95), fov: 22, ap: 30, shake: 0.004, focusOn: V(p.x + 0.27, p.y + 0.02, p.z - 0.3 + u * 0.95) };
    } },
    { a: 13, b: 17, f: function (t) { // agility: strafe sideways and pirouette
      var u = (t - 13) / 4, p = V(-0.7 + 1.4 * ease(u), 0.02 * Math.sin(t * 2), 2.2);
      return { sub: p, rot: [0.02 * Math.sin(u * TAU), ease((u - 0.22) / 0.56) * TAU, -0.12 * Math.sin(u * PI)], thrust: 1, lamp: 1, amb: 1,
        cam: orbit(V(0, 0, 2.2), -0.55 + u * 0.25, 1.33, 2.3), look: V(p.x * 0.6, -0.05, 2.2), fov: 32, ap: 11, shake: 0.01 };
    } },
    { a: 17, b: 22, f: function (t) { // through the gate, fly-by past the camera
      var u = (t - 17) / 5, p = V(0, 0.02 * Math.sin(t * 1.5), 2.6 + 6.0 * (0.35 * u + 0.65 * u * u));
      var look = V(0, -0.05, GATE_Z).lerp(p, 0.75);
      return { sub: p, rot: [0.03, 0, 0.03 * Math.sin(t * 1.3)], thrust: 1, lamp: 1, amb: 1, cam: V(0.9, -0.2, 8.3), look: look, fov: 34, ap: 10, shake: 0.008, cv: t < 19.4 };
    } },
    { a: 22, b: 26.5, f: function (t) { // slow-motion torpedo run
      var p = V(0, 0.006 * Math.sin(t), 8.2), launch = V(0.103, 0.15 + p.y, p.z + 0.15);
      var u = clamp01((t - 22.8) / 3.0), travel = (TARGET_Z + 1.0) - launch.z, tz = launch.z + travel * (u * 0.82 + 0.18 * u * u);
      var torp = t >= 22.8 ? V(launch.x, launch.y, tz) : null, cam, look, focus;
      if (t < 23.25) { cam = V(launch.x + 0.05, launch.y + 0.22, launch.z - 0.5); look = V(launch.x, launch.y + 0.02, launch.z + 0.4); focus = V(launch.x, launch.y, launch.z + 0.1); }
      else { cam = V(torp.x + 0.42, torp.y + 0.1, Math.min(torp.z - 0.6, TARGET_Z - 1.7)); look = V(torp.x, torp.y, Math.min(torp.z + 0.6, TARGET_Z + 0.3)); focus = torp; }
      return { sub: p, rot: [0, 0, 0], thrust: 0.4, lamp: 1, amb: 1, cam: cam, look: look, fov: 30, ap: 16, shake: 0.006, torp: torp, focusOn: focus, launchAt: t >= 22.8 ? t - 22.8 : -1, launch: launch };
    } },
    { a: 26.5, b: 30, f: function (t) { // rise toward the light, hero silhouette, end card
      var u = (t - 26.5) / 3.5, p = V(0, -0.15 + 1.25 * ease(u), 14.4 + 0.9 * u);
      return { sub: p, rot: [-0.32 * smooth(u * 1.5), 0.25 - 0.25 * u, 0], thrust: 0.9, lamp: 1, amb: 1, shaft: 2.6, cam: V(0.85, -1.25, 16.3), look: V(p.x, p.y + 0.35, p.z), fov: 36, ap: 8, shake: 0.008,
        fade: 1 - smooth((t - 29.2) / 0.8) };
    } }
  ];
  var TITLES = [
    { a: 2.5, b: 4.4, k: 'DENİZ6 SUNAR', m: 'D6-AUV' },
    { a: 6.0, b: 8.7, k: 'OTONOM SU ALTI ARACI', m: 'Karanlıkta yol bulur.' },
    { a: 10.0, b: 12.8, k: 'İTKİ', m: '8 itici. 6 eksen.' },
    { a: 14.0, b: 16.8, k: 'ÇEVİKLİK', m: 'Yana kayar, yerinde döner.' },
    { a: 20.2, b: 21.9, k: 'GÖRÜNTÜ İŞLEME', m: 'Rengi tanır, kapıdan geçer.' },
    { a: 23.6, b: 26.3, k: 'HASSASİYET', m: 'Hedefin tam ortası.' }
  ];
  function shotAt(t) { for (var i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].a) return i; return 0; }

  var torpedo = auv.torpedoes[1], torpHome = torpedo.position.clone(), torpOut = false;
  var tmp = new THREE.Vector3(), q = new THREE.Quaternion();
  function apply(t, st) {
    U.uTime.value = t;
    // a real vehicle never sits perfectly still: tiny attitude and position wander on top of the choreography
    sub.position.copy(st.sub).add(V(Math.sin(t * 0.6) * 0.006, Math.sin(t * 0.83) * 0.005, 0));
    sub.rotation.set(st.rot[0] + Math.sin(t * 1.3) * 0.008 + Math.sin(t * 3.1) * 0.003, st.rot[1] + Math.sin(t * 0.7) * 0.006, st.rot[2] + Math.sin(t * 0.9 + 1) * 0.01 + Math.sin(t * 2.3) * 0.003);
    auv.explode(0); auv.grip(0.2);
    auv.thrusters.forEach(function (th, i) { th.prop.rotation.y = (i % 2 ? -1 : 1) * t * (6 + st.thrust * 46); });
    var amb = st.amb; ambU.value = amb;
    hemi.intensity = 1.0 * amb; sun.intensity = 3.2 * amb; U.uCauAmt.value = amb;
    sun.position.copy(st.sub).addScaledVector(SUN, 9); sun.target.position.copy(st.sub);
    spots.forEach(function (s) { s.intensity = 70 * st.lamp; });
    lampAmtU.value = st.lamp;
    sub.updateMatrixWorld(true);
    auv.lampSockets.forEach(function (sock, i) {
      sock.getWorldPosition(lampPosU.value[i]);
      lampDirU.value[i].set(0, -0.12, 1).normalize().applyQuaternion(sock.getWorldQuaternion(q));
    });
    var sh = shake(t, 1.7, st.shake || 0), sh2 = shake(t + 4.0, 5.3, (st.shake || 0) * 0.6);
    camera.position.copy(st.cam).add(sh); camera.fov = st.fov; camera.updateProjectionMatrix(); camera.lookAt(tmp.copy(st.look).add(sh2));
    projU.value = H / (2 * Math.tan(st.fov * PI / 360));
    focusU.value = Math.max(0.2, st.cam.distanceTo(st.focusOn || st.sub));
    flags.forEach(function (f, i) { f.rotation.x = Math.sin(t * 0.9 + i * 2) * 0.1; f.rotation.z = Math.sin(t * 0.6 + i) * 0.04; });
    if (st.torp) {
      if (!torpOut) { scene.attach(torpedo); torpOut = true; }
      torpedo.position.copy(st.torp); torpedo.rotation.set(0, 0, t * 5);
    } else if (torpOut) { auv.parts.torp.g.attach(torpedo); torpOut = false; torpedo.position.copy(torpHome); torpedo.rotation.set(0, 0, 0); }
    // pneumatic launch: an air puff at the muzzle, then a thin trail behind the torpedo
    if (st.launchAt != null && st.launchAt >= 0) {
      emO[0].copy(st.torp); emO[0].z -= 0.06; emA[0] = 1; emT[0] = Math.min(st.launchAt * 3, 3);
      emO[1].copy(st.launch); emO[1].z += 0.12; emD[1].set(0, 0.15, 1).normalize(); emA[1] = 1; emT[1] = st.launchAt;
    } else { emA[0] = 0; emA[1] = 0; }
  }

  /* ---------- overlay: titles, computer-vision box, end card, watermark ---------- */
  function overlay(t, st) {
    ctx.save();
    TITLES.forEach(function (ti) {
      if (t < ti.a || t > ti.b) return;
      var a = Math.min(smooth((t - ti.a) / 0.5), 1 - smooth((t - ti.b + 0.5) / 0.5)), y = 900 + (1 - a) * 14;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#34e7d4'; ctx.font = '600 22px "JetBrains Mono", monospace';
      ctx.fillText(ti.k.split('').join(String.fromCharCode(8202)), 120, y - 64);
      ctx.fillRect(120, y - 46, 60 * a, 2);
      ctx.fillStyle = '#eef8fb'; ctx.font = '600 56px Unbounded, "Arial Black", sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 28;
      ctx.fillText(ti.m, 116, y + 16); ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
    if (st.cv) {
      var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, ok = true;
      [[-1.2, FLOOR + 0.5], [1.2, FLOOR + 0.5], [-1.2, 0.56], [1.2, 0.56]].forEach(function (c) {
        tmp.set(c[0], c[1], GATE_Z).project(camera); if (tmp.z > 1) ok = false;
        var x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
      if (ok) {
        var a2 = smooth((t - 17.4) / 0.4) * (1 - smooth((t - 19.0) / 0.4));
        minX = Math.max(minX, 24); minY = Math.max(minY, 60); maxX = Math.min(maxX, W - 24); maxY = Math.min(maxY, H - 24);
        ctx.globalAlpha = a2 * 0.9; ctx.strokeStyle = '#34e7d4'; ctx.lineWidth = 2; ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.fillStyle = '#34e7d4'; ctx.fillRect(minX - 1, minY - 30, 150, 28);
        ctx.fillStyle = '#03201d'; ctx.font = '700 17px "JetBrains Mono", monospace'; ctx.fillText('KAPI  0.97', minX + 10, minY - 10);
        ctx.globalAlpha = 1;
      }
    }
    if (t > 27.4) {
      var e = smooth((t - 27.4) / 0.8) * (st.fade == null ? 1 : st.fade);
      var scrim = ctx.createRadialGradient(W / 2, 530, 60, W / 2, 530, 900);
      scrim.addColorStop(0, 'rgba(2,12,22,.62)'); scrim.addColorStop(1, 'rgba(2,12,22,.2)');
      ctx.globalAlpha = e; ctx.fillStyle = scrim; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eef8fb'; ctx.font = '700 120px Unbounded, "Arial Black", sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40;
      ctx.fillText('DENİZ6', W / 2, 470); ctx.shadowBlur = 0;
      ctx.fillStyle = '#34e7d4'; ctx.font = '600 40px Unbounded, "Arial Black", sans-serif'; ctx.fillText('Derinliğe hazır.', W / 2, 545);
      ctx.fillStyle = 'rgba(232,246,251,.8)'; ctx.font = '600 20px "JetBrains Mono", monospace'; ctx.fillText('OTONOM SU ALTI ARACI  ·  D6-AUV', W / 2, 610);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.5 * (st.fade == null ? 1 : st.fade); ctx.fillStyle = '#e8f6fb'; ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'right'; ctx.fillText('D6-AUV  ·  TEMSİLİ ANİMASYON', W - 60, 64); ctx.textAlign = 'left';
    ctx.restore();
  }

  var frameNo = 0;
  function renderFrame(t) {
    var si = shotAt(t), shot = SHOTS[si], dtF = 1 / FPS, st0 = null, mid = SUB >> 1;
    renderer.autoClear = true;
    renderer.setRenderTarget(rtAcc); renderer.clear();
    for (var k = 0; k < SUB; k++) {
      var tk = t + ((k + 0.5) / SUB - 0.5) * dtF * SHUTTER;
      tk = Math.max(shot.a, Math.min(shot.b - 1e-4, tk)); // never blend across a cut
      var st = shot.f(tk); if (window.__filmShot) st = window.__filmShot(st, tk, sub); // stills hook (e.g. the empty hero plate)
      if (k === mid) st0 = st;
      apply(tk, st);
      camera.updateMatrixWorld();
      // 1. lit scene (layer 0)
      camera.layers.set(0);
      renderer.shadowMap.needsUpdate = true;
      renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
      // 2. linear distance
      scene.overrideMaterial = depthMat; var env = scene.environment; scene.environment = null;
      renderer.setRenderTarget(rtDepth); renderer.render(scene, camera);
      scene.overrideMaterial = null; scene.environment = env;
      if (k === mid) { copyMat.uniforms.tDiffuse.value = rtDepth.texture; pass(copyMat, rtDepthMid); }
      // 3. water: absorption, in-scattering, light shafts, lamp beams
      aoMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse); aoMat.uniforms.uJit.value = (frameNo * SUB + k) % 64;
      pass(aoMat, rtAO);
      waterMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
      waterMat.uniforms.uCamWorld.value.copy(camera.matrixWorld);
      waterMat.uniforms.uCamPos.value.copy(camera.position);
      waterMat.uniforms.uJit.value = (frameNo * SUB + k) % 64; waterMat.uniforms.uShaft.value = st.shaft == null ? 1 : st.shaft;
      pass(waterMat, rtWater);
      // 4. particles on top, depth-tested against the distance buffer
      tDepthU.value = rtDepth.texture;
      camera.layers.set(1); renderer.autoClear = false;
      renderer.setRenderTarget(rtWater); renderer.render(scene, camera);
      camera.layers.set(0);
      // 5. accumulate (motion blur)
      accMat.uniforms.tDiffuse.value = rtWater.texture; accMat.uniforms.uW.value = 1 / SUB;
      pass(accMat, rtAcc); renderer.autoClear = true;
    }
    frameNo++;
    dofMat.uniforms.uFocus.value = Math.max(0.2, st0.cam.distanceTo(st0.focusOn || st0.sub)); dofMat.uniforms.uAp.value = st0.ap || 10;
    pass(dofMat, rtDof);
    brightMat.uniforms.tDiffuse.value = rtDof.texture; pass(brightMat, rtA);
    for (var it = 0; it < 3; it++) {
      blurMat.uniforms.tDiffuse.value = rtA.texture; blurMat.uniforms.uDir.value.set((1 + it) / (W / 4), 0); pass(blurMat, rtB);
      blurMat.uniforms.tDiffuse.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, (1 + it) / (H / 4)); pass(blurMat, rtA);
    }
    compMat.uniforms.uTime.value = t; compMat.uniforms.uFade.value = smooth(t / 0.6) * (st0.fade == null ? 1 : st0.fade);
    compMat.uniforms.uExposure.value = window.__filmExposure || 0.92;
    pass(compMat, null);
    ctx.drawImage(renderer.domElement, 0, 0);
    if (!window.__filmClean) overlay(t, st0); // __filmClean: stills without titles or watermark
  }

  function blob(qu) { return new Promise(function (r) { out.toBlob(r, 'image/jpeg', qu || 0.94); }); }
  var status = document.getElementById('status');
  window.__film = { done: 0, total: Math.round(DURATION * FPS), running: false, error: null };
  async function renderAll(from, to) {
    var F = window.__film; F.running = true; F.error = null;
    try {
      await document.fonts.ready;
      var n0 = Math.round((from || 0) * FPS), n1 = Math.round((to || DURATION) * FPS);
      for (var i = n0; i < n1; i++) {
        renderFrame(i / FPS);
        await fetch('/frame?i=' + i, { method: 'POST', body: await blob() });
        F.done = i + 1; status.textContent = 'kare ' + (i + 1) + ' / ' + F.total;
      }
      status.textContent = 'bitti';
      await fetch('/log', { method: 'POST', body: 'DONE ' + n0 + '-' + n1 });
    } catch (e) { F.error = String(e && e.stack || e); status.textContent = 'hata: ' + e; }
    F.running = false;
  }
  async function snap(list) {
    await document.fonts.ready;
    for (var i = 0; i < list.length; i++) { renderFrame(list[i][1]); await fetch('/frame?i=' + list[i][0], { method: 'POST', body: await blob(0.8) }); }
    return 'ok';
  }
  window.__film.preview = function (t) { renderFrame(t); return true; };
  window.__film.snap = snap;
  window.__film.renderAll = renderAll;
  window.__film.scene = scene;
  window.__film.water = waterMat; window.__film.dbg = { renderer: renderer, rtDepth: rtDepth, camera: camera };
  document.getElementById('prev').onclick = function () { document.fonts.ready.then(function () { renderFrame(+document.getElementById('t').value); }); };
  document.getElementById('go').onclick = function () { renderAll(0, DURATION); };
})();
