/*!
 * Hélion — Scène Solaire Immersive (v3.0 · plein-fond)
 * Canvas plein-section · Soleil à droite · Voie Lactée complète
 */
(function () {
  'use strict';

  const canvas = document.getElementById('solarCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── État global ────────────────────────────────────────────────
  let W = 0, H = 0, minD = 0;
  let sunX = 0, sunY = 0, sunR = 0;
  let t = 0, lastTs = 0, raf = null;
  let bg = null;

  // DPR plafonné pour les performances
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // ─── Position et taille du soleil ───────────────────────────────
  // Le soleil occupe le côté droit de la section — pas une boîte, pas un rectangle
  const SUN_RX = 0.70;  // 70% de la largeur → côté droit
  const SUN_RY = 0.50;  // 50% de la hauteur → vertical centré

  function sunRFactor() {
    if (W < 600) return 0.14;
    if (W < 900) return 0.17;
    return 0.20;
  }

  // ─── Planètes ───────────────────────────────────────────────────
  function buildPlanets() {
    const cfg = [
      { orbit:.28, size:.028, speed:.78,  phase:.50,  cr:185,cg:118,cb:65,  atmo:[255,158,82],  atmoStr:.22, hasRings:false },
      { orbit:.44, size:.040, speed:.34,  phase:2.10, cr:52, cg:108,cb:196, atmo:[100,158,255], atmoStr:.24, hasRings:false, clouds:true },
      { orbit:.63, size:.054, speed:.155, phase:3.80, cr:210,cg:170,cb:108, atmo:[228,188,130], atmoStr:.15, hasRings:true  },
    ];
    return W < 600 ? cfg.slice(0, 2) : cfg;
  }

  let PLANETS = [], fieldStars = [], mwStars = [], dustParts = [];

  // ─── Initialisation ─────────────────────────────────────────────
  function init() {
    measure();
    rebuildData();
    preRender();

    if (reduced) {
      draw(0);
    } else {
      startLoop();
      document.addEventListener('visibilitychange', () => {
        document.hidden ? stopLoop() : startLoop();
      });
    }
  }

  function measure() {
    const sec = canvas.parentElement; // <section class="hero">
    W = sec.offsetWidth  || window.innerWidth;
    H = sec.offsetHeight || window.innerHeight;
    minD = Math.min(W, H);

    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    sunX = W * SUN_RX;
    sunY = H * SUN_RY;
    sunR = minD * sunRFactor();
  }

  function rebuildData() {
    PLANETS    = buildPlanets();
    fieldStars = buildFieldStars();
    mwStars    = buildMWStars();
    dustParts  = buildDust();
    bg         = null;
  }

  // Resize avec debounce
  const ro = new ResizeObserver(debounce(() => {
    measure();
    rebuildData();
    preRender();
  }, 250));
  ro.observe(canvas.parentElement);

  // ─── Données : étoiles scintillantes ────────────────────────────
  function buildFieldStars() {
    const n = W < 600 ? 450 : W < 900 ? 700 : 1000;
    return Array.from({ length: n }, () => {
      const r = Math.random();
      const col = r < .10 ? [180,215,255]
                : r < .22 ? [255,252,215]
                : r < .28 ? [255,188,100]
                : [238,240,255];
      return {
        x:  Math.random(),
        y:  Math.random(),
        r:  Math.pow(Math.random(), 2.2) * 1.6 + .10,
        b:  Math.random() * .55 + .28,
        sp: Math.random() * .018 + .004,
        ph: Math.random() * Math.PI * 2,
        col,
      };
    });
  }

  // ─── Données : bande galactique ─────────────────────────────────
  function buildMWStars() {
    const n = W < 600 ? 800 : 2000;
    return Array.from({ length: n }, () => {
      const along = Math.random();
      const perp  = (Math.random() - .5) * 2;
      const g     = Math.exp(-perp * perp * 4.8);
      return {
        x: .04 + along * .96,
        y: .02 + along * .66 + perp * .30,
        r: Math.random() * .50 + .06,
        b: g * (Math.random() * .28 + .04),
        col: Math.random() > .45 ? [188,200,255] : [255,244,208],
      };
    });
  }

  // ─── Données : poussière cosmique ───────────────────────────────
  function buildDust() {
    const n = W < 600 ? 40 : 80;
    return Array.from({ length: n }, () => ({
      x:  Math.random() * (W || 800),
      y:  Math.random() * (H || 600),
      r:  Math.random() * 1.2 + .14,
      o:  Math.random() * .20 + .03,
      vx: (Math.random() - .5) * .06,
      vy: (Math.random() - .5) * .06,
      sp: Math.random() * .030 + .006,
      ph: Math.random() * Math.PI * 2,
      col: Math.random() > .5 ? [198,144,56] : [178,190,255],
    }));
  }

  // ─── Pré-rendu du fond statique ─────────────────────────────────
  // (ciel profond + nébuleuses + micro-étoiles galactiques)
  function preRender() {
    if (!W || !H) return;
    const oc = document.createElement('canvas');
    oc.width  = Math.round(W * dpr);
    oc.height = Math.round(H * dpr);
    const c = oc.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Ciel profond — dégradé radial centré sur le soleil
    const skyG = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(W, H) * 1.2);
    skyG.addColorStop(0,   '#0C0910');
    skyG.addColorStop(.18, '#080810');
    skyG.addColorStop(.52, '#050610');
    skyG.addColorStop(1,   '#020308');
    c.fillStyle = skyG;
    c.fillRect(0, 0, W, H);

    // Teinte directionnelle chaud (droite) → froid (gauche)
    const dirG = c.createLinearGradient(W, H * .3, 0, H * .7);
    dirG.addColorStop(0,   'rgba(18,10,4,0.45)');
    dirG.addColorStop(.5,  'rgba(6,6,12,0.35)');
    dirG.addColorStop(1,   'rgba(2,3,10,0.45)');
    c.fillStyle = dirG;
    c.fillRect(0, 0, W, H);

    // Nébuleuses de la Voie Lactée
    drawNebulae(c);

    // Micro-étoiles galactiques (statiques — pré-rendues)
    mwStars.forEach(s => {
      c.beginPath();
      c.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      c.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${s.b.toFixed(2)})`;
      c.fill();
    });

    bg = oc;
  }

  // Nébuleuses : bande diagonale + halos autour de la région solaire
  function drawNebulae(c) {
    const NEB = [
      // Bande galactique (haut-droit → bas-gauche)
      { x:.82, y:.08, rx:.52, ry:.18, col:'rgba(48,58,135,',  o:.13 },
      { x:.64, y:.23, rx:.42, ry:.14, col:'rgba(58,50,125,',  o:.10 },
      { x:.50, y:.37, rx:.32, ry:.10, col:'rgba(75,68,145,',  o:.08 },
      { x:.34, y:.52, rx:.26, ry:.09, col:'rgba(52,68,152,',  o:.07 },
      { x:.18, y:.68, rx:.22, ry:.08, col:'rgba(46,60,142,',  o:.05 },
      // Halo chaud autour de la région solaire
      { x:.72, y:.18, rx:.22, ry:.07, col:'rgba(162,138,102,',o:.07 },
      { x:.67, y:.30, rx:.16, ry:.05, col:'rgba(188,158,115,',o:.09 },
      { x:.60, y:.40, rx:.12, ry:.04, col:'rgba(198,165,122,',o:.07 },
      // Nébuleuses secondaires
      { x:.88, y:.15, rx:.18, ry:.06, col:'rgba(70,82,168,',  o:.08 },
      { x:.44, y:.72, rx:.20, ry:.07, col:'rgba(50,65,150,',  o:.06 },
      { x:.10, y:.40, rx:.18, ry:.07, col:'rgba(36,52,135,',  o:.04 },
      { x:.92, y:.56, rx:.13, ry:.05, col:'rgba(58,75,162,',  o:.06 },
    ];
    NEB.forEach(n => {
      c.save();
      c.scale(1, n.ry / n.rx);
      const sy = n.y * H * (n.rx / n.ry);
      const g  = c.createRadialGradient(n.x * W, sy, 0, n.x * W, sy, n.rx * W);
      g.addColorStop(0,   n.col + n.o + ')');
      g.addColorStop(.40, n.col + (n.o * .38).toFixed(3) + ')');
      g.addColorStop(1,   n.col + '0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(n.x * W, sy, n.rx * W, 0, Math.PI * 2);
      c.fill();
      c.restore();
    });
  }

  // ─── Boucle RAF ─────────────────────────────────────────────────
  function startLoop() { lastTs = 0; raf = requestAnimationFrame(tick); }
  function stopLoop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  function tick(ts) {
    const dt = lastTs ? Math.min(ts - lastTs, 50) : 16;
    lastTs = ts;
    t += dt * .001;
    draw(t);
    raf = requestAnimationFrame(tick);
  }

  // ─── Rendu complet ──────────────────────────────────────────────
  function draw(time) {
    // 1. Fond pré-rendu (ciel + nébuleuses + micro-étoiles)
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    else { ctx.fillStyle = '#030508'; ctx.fillRect(0, 0, W, H); }

    // 2. Étoiles scintillantes
    drawFieldStars(time);

    // 3. Halo ambiant du soleil (couvre tout le canvas)
    drawAmbientGlow(time);

    // 4. Lignes d'orbite
    drawOrbits();

    // 5. Planètes triées par profondeur (z-order)
    PLANETS
      .map(p => {
        const a = p.phase + time * p.speed * (Math.PI * 2 / 60);
        return { p, a, yOff: Math.sin(a) };
      })
      .sort((a, b) => a.yOff - b.yOff)
      .forEach(({ p, a }) => drawPlanet(p, a, time));

    // 6. Soleil (toujours au premier plan visuel)
    drawSun(time);

    // 7. Poussière cosmique
    drawDust(time);
  }

  // ─── Étoiles scintillantes (dynamiques) ─────────────────────────
  function drawFieldStars(time) {
    fieldStars.forEach(s => {
      const a = s.b * (.45 + .55 * Math.sin(time * s.sp * 55 + s.ph));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${a.toFixed(2)})`;
      ctx.fill();
    });
  }

  // ─── Halo du soleil (s'étend sur tout le canvas) ────────────────
  function drawAmbientGlow(time) {
    const p = 1 + .022 * Math.sin(time * .48);
    const g = ctx.createRadialGradient(sunX, sunY, sunR * 1.8, sunX, sunY, Math.max(W, H) * 1.2 * p);
    g.addColorStop(0,   'rgba(215,115,25,0.09)');
    g.addColorStop(.22, 'rgba(175,78,18,0.045)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ─── Orbites ────────────────────────────────────────────────────
  function drawOrbits() {
    ctx.save();
    ctx.setLineDash([3, 12]);
    PLANETS.forEach(p => {
      ctx.beginPath();
      ctx.arc(sunX, sunY, p.orbit * minD, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,148,60,0.065)';
      ctx.lineWidth   = .6;
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ─── Soleil ─────────────────────────────────────────────────────
  function drawSun(time) {
    const sr  = sunR;
    const pls = 1 + .016 * Math.sin(time * 1.68);

    // Couronnes (de la plus grande à la plus petite)
    [
      [9.0, .050],
      [5.0, .10 ],
      [2.8, .20 ],
    ].forEach(([rm, base], i) => {
      const pr = 1 + .032 * Math.sin(time * (.60 + i * .14));
      const g  = ctx.createRadialGradient(sunX, sunY, sr * .70, sunX, sunY, sr * rm * pr);
      g.addColorStop(0,   `rgba(222,118,22,${base})`);
      g.addColorStop(.30, `rgba(188,82,14,${(base * .38).toFixed(3)})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sr * rm * pr, 0, Math.PI * 2);
      ctx.fill();
    });

    // Protubérances solaires
    drawProminences(time, sr);

    // Sphère solaire
    const sg = ctx.createRadialGradient(
      sunX - sr * .28, sunY - sr * .28, 0,
      sunX, sunY, sr * pls
    );
    sg.addColorStop(0,   '#FFFBE8');
    sg.addColorStop(.08, '#FFEE78');
    sg.addColorStop(.28, '#F5AE1E');
    sg.addColorStop(.58, '#E27016');
    sg.addColorStop(.82, '#C35212');
    sg.addColorStop(1,   '#8A2E0A');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr * pls, 0, Math.PI * 2);
    ctx.fill();

    // Cellules de plasma en surface
    drawPlasma(time, sr * pls);

    // Assombrissement au limbe
    const ld = ctx.createRadialGradient(sunX, sunY, sr * .52 * pls, sunX, sunY, sr * pls);
    ld.addColorStop(0, 'rgba(0,0,0,0)');
    ld.addColorStop(1, 'rgba(50,6,2,0.55)');
    ctx.fillStyle = ld;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr * pls, 0, Math.PI * 2);
    ctx.fill();

    // Reflet spéculaire
    const hl = ctx.createRadialGradient(
      sunX - sr * .30, sunY - sr * .30, 0,
      sunX - sr * .16, sunY - sr * .16, sr * .58
    );
    hl.addColorStop(0,   'rgba(255,254,235,0.42)');
    hl.addColorStop(.55, 'rgba(255,242,200,0.07)');
    hl.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr * pls, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cellules de plasma animées
  function drawPlasma(time, sr) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = .07;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < 7; i++) {
      const ang  = i / 7 * Math.PI * 2 + time * (.11 + .035 * (i % 2 ? 1 : -1));
      const dist = sr * (.20 + .38 * Math.abs(Math.sin(time * .26 + i)));
      const px   = sunX + Math.cos(ang) * dist;
      const py   = sunY + Math.sin(ang) * dist;
      const sz   = sr  * (.11 + .08 * Math.sin(time * .50 + i * 1.4));
      const g    = ctx.createRadialGradient(px, py, 0, px, py, sz);
      g.addColorStop(0, 'rgba(255,245,90,0.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Protubérances solaires (arcs de Bézier)
  const PROMS = [
    { a: .42,  s: .048, len: .44 },
    { a: 1.98, s: .040, len: .36 },
    { a: 3.55, s: .052, len: .46 },
    { a: 5.12, s: .044, len: .38 },
  ];

  function drawProminences(time, sr) {
    PROMS.forEach((p, i) => {
      const ang = p.a + time * p.s;
      const ext = sr * p.len * (.80 + .20 * Math.sin(time * .68 + i));
      const bx  = sunX + Math.cos(ang) * sr * .88;
      const by  = sunY + Math.sin(ang) * sr * .88;
      const tx  = sunX + Math.cos(ang) * (sr + ext);
      const ty  = sunY + Math.sin(ang) * (sr + ext);
      const ca  = ang + .52;
      const cpx = sunX + Math.cos(ca) * (sr * .94 + ext * .52);
      const cpy = sunY + Math.sin(ca) * (sr * .94 + ext * .52);
      const g   = ctx.createLinearGradient(bx, by, tx, ty);
      g.addColorStop(0,   'rgba(255,155,28,0.70)');
      g.addColorStop(.38, 'rgba(255,88,16,0.36)');
      g.addColorStop(1,   'rgba(255,45,8,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth   = sr * .046 * (.68 + .32 * Math.sin(time * .85 + i));
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      ctx.stroke();
    });
  }

  // ─── Planètes ───────────────────────────────────────────────────
  function drawPlanet(p, ang, time) {
    const pr    = p.size  * minD;
    const orR   = p.orbit * minD;
    const px    = sunX + Math.cos(ang) * orR;
    const py    = sunY + Math.sin(ang) * orR;
    const front = Math.sin(ang) > 0;

    if (p.hasRings && !front) drawRings(px, py, pr);

    // Atmosphère (halo)
    const ag = ctx.createRadialGradient(px, py, pr * .70, px, py, pr * 1.90);
    ag.addColorStop(0, `rgba(${p.atmo[0]},${p.atmo[1]},${p.atmo[2]},${p.atmoStr})`);
    ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.90, 0, Math.PI * 2);
    ctx.fill();

    // Sphère éclairée depuis le soleil
    const la = Math.atan2(sunY - py, sunX - px);
    const {cr, cg, cb} = p;
    const sg = ctx.createRadialGradient(
      px + Math.cos(la) * pr * .36, py + Math.sin(la) * pr * .36, 0,
      px, py, pr
    );
    sg.addColorStop(0,   `rgb(${Math.min(cr+72,255)},${Math.min(cg+72,255)},${Math.min(cb+72,255)})`);
    sg.addColorStop(.32, `rgb(${cr},${cg},${cb})`);
    sg.addColorStop(.70, `rgb(${Math.max(cr-48,0)},${Math.max(cg-48,0)},${Math.max(cb-48,0)})`);
    sg.addColorStop(1,   `rgb(${Math.max(cr-95,0)},${Math.max(cg-95,0)},${Math.max(cb-95,0)})`);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    if (p.clouds) drawCloudBands(px, py, pr, time);

    // Ombre (côté opposé au soleil)
    const sha = la + Math.PI;
    const shg = ctx.createRadialGradient(
      px + Math.cos(sha) * pr * .26, py + Math.sin(sha) * pr * .26, 0,
      px, py, pr * 1.08
    );
    shg.addColorStop(0,   'rgba(0,2,14,0.82)');
    shg.addColorStop(.34, 'rgba(0,1,8,0.55)');
    shg.addColorStop(.68, 'rgba(0,0,4,0.16)');
    shg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = shg;
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.08, 0, Math.PI * 2);
    ctx.fill();

    // Reflet spéculaire
    const hlg = ctx.createRadialGradient(
      px + Math.cos(la) * pr * .50, py + Math.sin(la) * pr * .50, 0,
      px + Math.cos(la) * pr * .30, py + Math.sin(la) * pr * .30, pr * .48
    );
    hlg.addColorStop(0, 'rgba(255,255,255,0.28)');
    hlg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    if (p.hasRings && front) drawRings(px, py, pr);
  }

  function drawCloudBands(px, py, pr, time) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = .12;
    for (let i = 0; i < 3; i++) {
      const oy = pr * (-.42 + i * .38 + .06 * Math.sin(time * .16 + i));
      ctx.fillStyle = 'rgba(210,226,255,0.65)';
      ctx.beginPath();
      ctx.ellipse(px, py + oy, pr * .86, pr * .09, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRings(px, py, pr) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, .26);
    ctx.beginPath();
    ctx.arc(0, 0, pr * 2.38, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(202,160,86,0.30)';
    ctx.lineWidth   = pr * .72;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, pr * 1.62, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(215,172,98,0.18)';
    ctx.lineWidth   = pr * .28;
    ctx.stroke();
    ctx.restore();
  }

  // ─── Poussière cosmique ──────────────────────────────────────────
  function drawDust(time) {
    dustParts.forEach(d => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0) d.x = W;  if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H;  if (d.y > H) d.y = 0;
      const a = d.o * (.50 + .50 * Math.sin(time * d.sp * 58 + d.ph));
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.col[0]},${d.col[1]},${d.col[2]},${a.toFixed(2)})`;
      ctx.fill();
    });
  }

  // ─── Utilitaire debounce ─────────────────────────────────────────
  function debounce(fn, ms) {
    let id;
    return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
  }

  init();
})();
