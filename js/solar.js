/*!
 * Hélion — Scène Spatiale Cinématographique (Three.js r134)
 * Shaders GLSL · Bloom multi-couches · Planètes 3D réalistes
 */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  const canvas = document.getElementById('solarCanvas');
  const hero   = canvas && canvas.parentElement;
  if (!canvas || !hero) return;

  const reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  /* ── Renderer ────────────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x020308, 1);
  renderer.toneMapping      = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  let W = 0, H = 0;
  function resize() {
    W = hero.offsetWidth  || window.innerWidth;
    H = hero.offsetHeight || window.innerHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  /* ── Scene & Camera ──────────────────────────────────────────────── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.01, 5000);
  camera.position.set(0, 0, 11);
  camera.lookAt(1.8, 0, 0);

  resize();
  window.addEventListener('resize', resize);

  /* ── Lights ──────────────────────────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0x111122, 0.6));

  const SUN_POS = new THREE.Vector3(7.2, 0.6, -2.5);

  const sunPoint = new THREE.PointLight(0xFFAA50, 5.5, 0, 1.2);
  sunPoint.position.copy(SUN_POS);
  scene.add(sunPoint);

  const warmFill = new THREE.DirectionalLight(0xFF8822, 0.7);
  warmFill.position.set(1, 0.3, 0.8);
  scene.add(warmFill);

  /* ── Stars ───────────────────────────────────────────────────────── */
  (function buildStars() {
    const n   = isMobile ? 2000 : 3800;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz  = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 700 + Math.random() * 280;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);

      const t = Math.random();
      if      (t < 0.08) { col[i*3]=0.72; col[i*3+1]=0.82; col[i*3+2]=1.00; } // blue-white
      else if (t < 0.18) { col[i*3]=1.00; col[i*3+1]=0.98; col[i*3+2]=0.82; } // warm white
      else if (t < 0.24) { col[i*3]=1.00; col[i*3+1]=0.72; col[i*3+2]=0.38; } // orange
      else                { col[i*3]=0.90; col[i*3+1]=0.93; col[i*3+2]=1.00; } // white

      sz[i] = Math.random() < 0.12 ? 2.8 : (Math.random() < 0.28 ? 1.6 : 0.85);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sz,  1));

    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.4,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
    })));
  })();

  /* ── Nebula sphere (background) ──────────────────────────────────── */
  (function buildNebula() {
    const size = 1024;
    const oc   = document.createElement('canvas');
    oc.width = oc.height = size;
    const c  = oc.getContext('2d');

    c.fillStyle = '#000000';
    c.fillRect(0, 0, size, size);

    [
      { x:.62, y:.30, r:.44, col:'rgba(28,42,130,',  o:.26 },
      { x:.36, y:.62, r:.38, col:'rgba(22,35,110,',  o:.20 },
      { x:.78, y:.70, r:.28, col:'rgba(75,28,95,',   o:.14 },
      { x:.14, y:.42, r:.32, col:'rgba(20,40,115,',  o:.18 },
      { x:.52, y:.52, r:.22, col:'rgba(35,52,138,',  o:.16 },
      { x:.88, y:.25, r:.20, col:'rgba(60,40,120,',  o:.12 },
    ].forEach(n => {
      const g = c.createRadialGradient(n.x*size, n.y*size, 0, n.x*size, n.y*size, n.r*size);
      g.addColorStop(0,   n.col + n.o + ')');
      g.addColorStop(0.5, n.col + (n.o*.28).toFixed(3) + ')');
      g.addColorStop(1,   n.col + '0)');
      c.fillStyle = g;
      c.fillRect(0, 0, size, size);
    });

    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(600, 32, 32),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(oc),
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.90,
      })
    ));
  })();

  /* ── Sun shader ──────────────────────────────────────────────────── */
  const sunVert = /* glsl */`
    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vViewDir;
    void main() {
      vUv      = uv;
      vNormal  = normalize(normalMatrix * normal);
      vec4 mvp = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvp.xyz);
      gl_Position = projectionMatrix * mvp;
    }
  `;

  const sunFrag = /* glsl */`
    uniform float time;
    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vViewDir;

    float hash(vec2 p){
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }

    float fbm(vec2 p){
      float v=0.0, a=0.5;
      for(int i=0;i<5;i++){
        v += a*noise(p);
        p  = p*2.1 + vec2(float(i)*7.3, float(i)*3.1);
        a *= 0.5;
      }
      return v;
    }

    void main(){
      float t  = time * 0.038;
      vec2  uv = vUv;

      float n1 = fbm(uv*4.5  + vec2( t,       t*0.7));
      float n2 = fbm(uv*9.0  - vec2( t*0.9,   t*0.5) + vec2(3.1,1.7));
      float n3 = fbm(uv*2.8  + vec2(-t*0.4,   t*0.3) + vec2(1.2,2.8));
      float n4 = fbm(uv*18.0 + vec2( t*1.2,  -t*0.8) + vec2(5.4,0.6));

      float base  = n1*0.45 + n2*0.30 + n3*0.25;
      float fine  = n4*0.5 + 0.5;
      float grain = smoothstep(0.40, 0.75, n1*n2*3.8 + fine*0.2);
      float spot  = smoothstep(0.62, 0.48, n3*n1*1.9);

      vec3 c0 = vec3(0.88, 0.24, 0.03);   // dark / sunspot
      vec3 c1 = vec3(1.00, 0.62, 0.08);   // warm orange
      vec3 c2 = vec3(1.00, 0.88, 0.30);   // hot yellow
      vec3 c3 = vec3(1.00, 0.97, 0.88);   // white-hot

      vec3 color = mix(c0, c1, base);
      color = mix(color, c2, grain * 0.75);
      color = mix(color, c3, grain*grain * 0.55);
      color = mix(color, c0 * 0.45, spot * 0.40);

      // Limb darkening
      float cosA  = max(0.0, dot(vNormal, vViewDir));
      color *= mix(0.22, 1.0, pow(cosA, 0.38));

      // Surface emission boost
      gl_FragColor = vec4(color * 1.15, 1.0);
    }
  `;

  const sunUniforms = { time: { value: 0.0 } };

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, isMobile ? 48 : 80, isMobile ? 48 : 80),
    new THREE.ShaderMaterial({ vertexShader: sunVert, fragmentShader: sunFrag, uniforms: sunUniforms })
  );
  sunMesh.position.copy(SUN_POS);
  scene.add(sunMesh);

  /* ── Sun corona glow (multi-layer additive sprites) ─────────────── */
  function glowTex(innerA) {
    const s  = 256;
    const oc = document.createElement('canvas');
    oc.width = oc.height = s;
    const c  = oc.getContext('2d');
    const cx = s / 2;
    const g  = c.createRadialGradient(cx, cx, 0, cx, cx, cx);
    g.addColorStop(0,    `rgba(255,205,110,${innerA})`);
    g.addColorStop(0.12, `rgba(255,160,60,${(innerA*0.72).toFixed(3)})`);
    g.addColorStop(0.35, `rgba(255,110,25,${(innerA*0.28).toFixed(3)})`);
    g.addColorStop(0.65, `rgba(195,72,8,${(innerA*0.08).toFixed(3)})`);
    g.addColorStop(1,    'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(oc);
  }

  const CORONAS = [
    { scale: 4.2,  opacity: 1.00 },
    { scale: 6.8,  opacity: 0.72 },
    { scale: 11.0, opacity: 0.42 },
    { scale: 18.0, opacity: 0.22 },
    { scale: 30.0, opacity: 0.11 },
    { scale: 55.0, opacity: 0.055 },
  ];

  const coronaSprites = CORONAS.map(({ scale, opacity }) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex(1.0),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity,
    }));
    sp.scale.setScalar(scale);
    sp.position.copy(SUN_POS);
    scene.add(sp);
    return { sp, baseOpacity: opacity, baseScale: scale };
  });

  /* ── Planet texture builders ──────────────────────────────────────── */
  function earthTex() {
    const W = 1024, H = 512;
    const oc = document.createElement('canvas');
    oc.width = W; oc.height = H;
    const c  = oc.getContext('2d');

    // Ocean
    const og = c.createLinearGradient(0, 0, 0, H);
    og.addColorStop(0,   '#08305E');
    og.addColorStop(0.5, '#0C4A8C');
    og.addColorStop(1,   '#08305E');
    c.fillStyle = og;
    c.fillRect(0, 0, W, H);

    // Ocean highlights
    const olight = c.createRadialGradient(W*0.3, H*0.35, 0, W*0.5, H*0.5, W*0.6);
    olight.addColorStop(0,   'rgba(40,120,200,0.30)');
    olight.addColorStop(0.5, 'rgba(20,80,160,0.12)');
    olight.addColorStop(1,   'rgba(0,0,0,0)');
    c.fillStyle = olight;
    c.fillRect(0, 0, W, H);

    // Continents
    // Eurasie
    c.fillStyle = '#2A6832';
    c.beginPath();
    c.moveTo(W*.50, H*.28); c.bezierCurveTo(W*.56,H*.16, W*.76,H*.20, W*.80,H*.36);
    c.bezierCurveTo(W*.84,H*.46, W*.76,H*.54, W*.68,H*.52);
    c.bezierCurveTo(W*.58,H*.54, W*.52,H*.50, W*.50,H*.28);
    c.fill();

    // Asie orient / Japon
    c.beginPath();
    c.ellipse(W*.88, H*.34, W*.025, H*.06, 0.3, 0, Math.PI*2);
    c.fill();

    // Inde
    c.beginPath();
    c.moveTo(W*.63, H*.50); c.bezierCurveTo(W*.66,H*.52, W*.65,H*.64, W*.62,H*.66);
    c.bezierCurveTo(W*.59,H*.62, W*.60,H*.52, W*.63,H*.50);
    c.fill();

    // Afrique
    c.fillStyle = '#2A6832';
    c.beginPath();
    c.moveTo(W*.54, H*.46); c.bezierCurveTo(W*.58,H*.48, W*.60,H*.68, W*.56,H*.76);
    c.bezierCurveTo(W*.50,H*.80, W*.48,H*.66, W*.50,H*.50);
    c.bezierCurveTo(W*.52,H*.46, W*.54,H*.46);
    c.fill();

    // Madagascar
    c.beginPath();
    c.ellipse(W*.61, H*.68, W*.012, H*.05, 0.2, 0, Math.PI*2);
    c.fill();

    // Amériques
    c.fillStyle = '#337A3C';
    c.beginPath();
    c.moveTo(W*.20, H*.22); c.bezierCurveTo(W*.26,H*.18, W*.30,H*.25, W*.28,H*.44);
    c.bezierCurveTo(W*.26,H*.62, W*.22,H*.75, W*.18,H*.70);
    c.bezierCurveTo(W*.14,H*.60, W*.14,H*.38, W*.20,H*.22);
    c.fill();

    // Australie
    c.fillStyle = '#428050';
    c.beginPath();
    c.ellipse(W*.83, H*.66, W*.055, H*.085, 0.15, 0, Math.PI*2);
    c.fill();

    // Groenland
    c.fillStyle = '#358040';
    c.beginPath();
    c.ellipse(W*.35, H*.14, W*.04, H*.06, -0.2, 0, Math.PI*2);
    c.fill();

    // Désert (Sahara)
    c.fillStyle = 'rgba(188,155,80,0.52)';
    c.beginPath();
    c.ellipse(W*.54, H*.50, W*.04, H*.05, 0, 0, Math.PI*2);
    c.fill();

    // Glaces polaires
    c.fillStyle = 'rgba(212,230,250,0.94)';
    c.fillRect(0, 0, W, H*0.055);
    c.fillRect(0, H*0.935, W, H*0.065);

    // Nuages
    c.fillStyle = 'rgba(255,255,255,0.56)';
    [
      [W*.28, H*.36, W*.14, H*.028, 0.22],
      [W*.62, H*.38, W*.16, H*.026, -0.18],
      [W*.12, H*.55, W*.11, H*.022, 0.08],
      [W*.72, H*.24, W*.14, H*.025, -0.12],
      [W*.44, H*.65, W*.12, H*.020, 0.15],
      [W*.90, H*.50, W*.10, H*.020, 0.30],
    ].forEach(([x,y,rx,ry,rot]) => {
      c.save(); c.translate(x,y); c.rotate(rot);
      c.beginPath(); c.ellipse(0,0,rx,ry,0,0,Math.PI*2); c.fill();
      c.restore();
    });

    return new THREE.CanvasTexture(oc);
  }

  function saturnTex() {
    const W = 512, H = 256;
    const oc = document.createElement('canvas');
    oc.width = W; oc.height = H;
    const c  = oc.getContext('2d');

    const g = c.createLinearGradient(0,0,0,H);
    g.addColorStop(0,    '#9A7830');
    g.addColorStop(0.18, '#C09850');
    g.addColorStop(0.34, '#D4B268');
    g.addColorStop(0.50, '#C49850');
    g.addColorStop(0.66, '#B08640');
    g.addColorStop(0.82, '#9A7030');
    g.addColorStop(1,    '#846020');
    c.fillStyle = g; c.fillRect(0,0,W,H);

    [[H*.22, H*.042, 0.24], [H*.40, H*.038, 0.20], [H*.60, H*.040, 0.22], [H*.78, H*.032, 0.16]].forEach(([y,bh,a]) => {
      c.fillStyle = `rgba(65,45,12,${a})`; c.fillRect(0, y-bh/2, W, bh);
    });
    [[H*.30, H*.028, 0.14], [H*.52, H*.030, 0.12]].forEach(([y,bh,a]) => {
      c.fillStyle = `rgba(242,218,165,${a})`; c.fillRect(0, y-bh/2, W, bh);
    });

    return new THREE.CanvasTexture(oc);
  }

  function mercuryTex() {
    const S  = 256;
    const oc = document.createElement('canvas');
    oc.width = oc.height = S;
    const c  = oc.getContext('2d');

    const g = c.createRadialGradient(S*.38,S*.38,0, S*.5,S*.5,S*.5);
    g.addColorStop(0,   '#C4B2A2');
    g.addColorStop(0.6, '#908070');
    g.addColorStop(1,   '#5A4A3A');
    c.fillStyle = g; c.fillRect(0,0,S,S);

    [[S*.30,S*.34,S*.09],[S*.64,S*.27,S*.07],[S*.20,S*.66,S*.06],[S*.72,S*.66,S*.08],
     [S*.50,S*.55,S*.04],[S*.38,S*.80,S*.06],[S*.80,S*.42,S*.05]].forEach(([x,y,r]) => {
      const cg = c.createRadialGradient(x,y,0,x,y,r);
      cg.addColorStop(0,    'rgba(38,28,18,0.55)');
      cg.addColorStop(0.65, 'rgba(38,28,18,0.22)');
      cg.addColorStop(0.88, 'rgba(168,152,132,0.38)');
      cg.addColorStop(1,    'rgba(0,0,0,0)');
      c.fillStyle = cg; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
      c.fillStyle = 'rgba(195,180,162,0.55)';
      c.beginPath(); c.arc(x,y,r*.10,0,Math.PI*2); c.fill();
    });

    return new THREE.CanvasTexture(oc);
  }

  /* ── Earth ───────────────────────────────────────────────────────── */
  const earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.25, isMobile ? 40 : 64, isMobile ? 40 : 64),
    new THREE.MeshPhongMaterial({ map: earthTex(), shininess: 35, specular: new THREE.Color(0x224488) })
  );
  earthMesh.position.set(1.5, 0.9, 1.2);
  scene.add(earthMesh);

  // Atmosphere halo
  earthMesh.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.32, 32, 32),
    new THREE.MeshPhongMaterial({ color: 0x3366CC, transparent: true, opacity: 0.10, side: THREE.FrontSide, depthWrite: false })
  ));

  // Earth glow sprite
  const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex(0.4), blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.35, color: 0x3366FF,
  }));
  earthGlow.scale.setScalar(4.5);
  earthMesh.add(earthGlow);

  /* ── Saturn ──────────────────────────────────────────────────────── */
  const saturnMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.85, isMobile ? 40 : 64, isMobile ? 40 : 64),
    new THREE.MeshPhongMaterial({ map: saturnTex(), shininess: 8 })
  );
  saturnMesh.position.set(-4.2, -1.0, -1.5);
  scene.add(saturnMesh);

  // Saturn rings
  (function buildRings() {
    const rW = 512, rH = 64;
    const oc  = document.createElement('canvas');
    oc.width = rW; oc.height = rH;
    const c   = oc.getContext('2d');
    const g   = c.createLinearGradient(0,0,rW,0);
    g.addColorStop(0,     'rgba(0,0,0,0)');
    g.addColorStop(0.04,  'rgba(178,145,72,0.22)');
    g.addColorStop(0.12,  'rgba(200,165,90,0.48)');
    g.addColorStop(0.22,  'rgba(185,152,78,0.38)');
    g.addColorStop(0.31,  'rgba(168,138,62,0.20)'); // Cassini gap
    g.addColorStop(0.40,  'rgba(188,158,82,0.44)');
    g.addColorStop(0.58,  'rgba(205,172,95,0.52)');
    g.addColorStop(0.74,  'rgba(188,155,78,0.36)');
    g.addColorStop(0.88,  'rgba(172,140,65,0.18)');
    g.addColorStop(1,     'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0,0,rW,rH);

    const ringGeo = new THREE.RingGeometry(2.3, 5.0, 128);
    const pos = ringGeo.attributes.position;
    const uv  = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - 2.3) / (5.0 - 2.3), 0.5);
    }

    const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(oc),
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    }));
    ringMesh.rotation.x = -Math.PI / 3.2;
    saturnMesh.add(ringMesh);
  })();

  /* ── Mercury ─────────────────────────────────────────────────────── */
  const mercuryMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, isMobile ? 24 : 40, isMobile ? 24 : 40),
    new THREE.MeshPhongMaterial({ map: mercuryTex(), shininess: 5 })
  );
  mercuryMesh.position.set(5.2, -0.5, 2.0);
  scene.add(mercuryMesh);

  /* ── Cosmic dust ─────────────────────────────────────────────────── */
  (function buildDust() {
    const n   = isMobile ? 120 : 280;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i*3]   = (Math.random()-0.5)*22;
      pos[i*3+1] = (Math.random()-0.5)*16;
      pos[i*3+2] = (Math.random()-0.5)*12;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.038, color: 0xCCA060,
      transparent: true, opacity: 0.50,
      blending: THREE.AdditiveBlending,
    })));
  })();

  /* ── Orbit data ───────────────────────────────────────────────────── */
  const ORBITS = {
    earth:   { angle: 1.80, speed: 0.00055, rH: 5.8, rV: 0.28 },
    saturn:  { angle: 3.55, speed: 0.00018, rH: 10.2, rV: -0.18 },
    mercury: { angle: 0.65, speed: 0.00140, rH: 4.2, rV: 0.12 },
  };

  /* ── Camera parallax state ────────────────────────────────────────── */
  let mouseX = 0, mouseY = 0, camX = 0, camY = 0;
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2.0;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 1.0;
  });

  /* ── Render loop ─────────────────────────────────────────────────── */
  let animId = null;
  let lastTs = performance.now();

  function tick(ts) {
    animId = requestAnimationFrame(tick);
    const dt   = Math.min(ts - lastTs, 50);
    lastTs = ts;
    const time = ts * 0.001;

    if (!reduced) {
      // Sun surface animation
      sunUniforms.time.value = time;
      sunMesh.rotation.y     = time * 0.035;

      // Planet orbits (elliptical around sun)
      const updateOrbit = (mesh, key) => {
        const o = ORBITS[key];
        o.angle += o.speed;
        mesh.position.x = SUN_POS.x + Math.cos(o.angle) * o.rH;
        mesh.position.y = SUN_POS.y + Math.sin(o.angle * 1.4) * o.rV;
        mesh.position.z = SUN_POS.z + Math.sin(o.angle) * o.rH;
      };
      updateOrbit(earthMesh,   'earth');
      updateOrbit(saturnMesh,  'saturn');
      updateOrbit(mercuryMesh, 'mercury');

      // Self-rotation
      earthMesh.rotation.y   = time * 0.11;
      saturnMesh.rotation.y  = time * 0.08;
      mercuryMesh.rotation.y = time * 0.05;

      // Corona pulse
      coronaSprites.forEach(({ sp, baseOpacity, baseScale }, i) => {
        const pulse = 1 + 0.045 * Math.sin(time * 0.52 + i * 0.6);
        sp.material.opacity = baseOpacity * (0.82 + 0.18 * Math.sin(time * 0.38 + i * 0.4));
        sp.scale.setScalar(baseScale * pulse);
      });

      // Sun point light intensity pulse
      sunPoint.intensity = 5.5 + 0.4 * Math.sin(time * 0.68);

      // Camera parallax (smooth lerp)
      camX += (mouseX - camX) * 0.035;
      camY += (mouseY - camY) * 0.035;
      camera.position.x = camX * 1.2;
      camera.position.y = -camY * 0.8 + 0.18 * Math.sin(time * 0.16);
      camera.position.z = 11 + 0.25 * Math.sin(time * 0.10);
      camera.lookAt(1.8 + camX * 0.5, camY * 0.3, 0);
    }

    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
      animId = null;
    } else {
      lastTs = performance.now();
      if (!animId) animId = requestAnimationFrame(tick);
    }
  });

  animId = requestAnimationFrame(tick);
})();
