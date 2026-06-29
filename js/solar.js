/*!
 * Hélion — Scène Spatiale Réaliste v4.0
 * Textures procédurales · Corona rays · Planètes photo-réalistes
 */
(function () {
  'use strict';

  const canvas = document.getElementById('solarCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let W = 0, H = 0, minD = 0;
  let sunX = 0, sunY = 0, sunR = 0;
  let t = 0, lastTs = 0, raf = null;
  let bgCanvas = null;
  let textures = {};

  const SUN_RX = 0.72;
  const SUN_RY = 0.48;

  function sunRFactor() {
    if (W < 600) return 0.17;
    if (W < 900) return 0.22;
    return 0.27;
  }

  function buildPlanets() {
    const all = [
      {
        id: 'mercury',
        orbit: 0.30, size: 0.020, speed: 0.95, phase: 0.8,
        atmo: [180, 162, 142], atmoStr: 0.10,
        hasRings: false,
      },
      {
        id: 'earth',
        orbit: 0.48, size: 0.036, speed: 0.40, phase: 2.2,
        atmo: [95, 160, 255], atmoStr: 0.30,
        hasRings: false,
      },
      {
        id: 'saturn',
        orbit: 0.70, size: 0.055, speed: 0.16, phase: 4.1,
        atmo: [225, 192, 125], atmoStr: 0.12,
        hasRings: true,
      },
    ];
    return W < 600 ? all.slice(0, 2) : all;
  }

  let PLANETS = [], fieldStars = [], mwStars = [], dustParts = [], coronaRayData = [];

  function init() {
    measure();
    buildTextures();
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
    const sec = canvas.parentElement;
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

  function buildTextures() {
    const mr = Math.max(18, Math.round(minD * 0.020));
    const er = Math.max(28, Math.round(minD * 0.036));
    const sr = Math.max(38, Math.round(minD * 0.055));
    textures.mercury = buildMercuryCanvas(mr);
    textures.earth   = buildEarthCanvas(er);
    textures.saturn  = buildSaturnCanvas(sr);
  }

  function rebuildData() {
    PLANETS      = buildPlanets();
    fieldStars   = buildFieldStars();
    mwStars      = buildMWStars();
    dustParts    = buildDust();
    coronaRayData = buildCoronaRayData();
    bgCanvas     = null;
  }

  const ro = new ResizeObserver(debounce(() => {
    measure(); buildTextures(); rebuildData(); preRender();
  }, 300));
  ro.observe(canvas.parentElement);

  /* ── Textures procédurales ──────────────────────────────────────── */

  function buildEarthCanvas(r) {
    const sz = Math.ceil(r * 2) + 6;
    const oc = document.createElement('canvas');
    oc.width = oc.height = sz;
    const c = oc.getContext('2d');
    const cx = sz / 2, cy = sz / 2;

    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip();

    // Océan profond
    const og = c.createRadialGradient(cx - r*0.22, cy - r*0.28, 0, cx, cy, r);
    og.addColorStop(0,   '#1C74C2');
    og.addColorStop(0.5, '#0D4E92');
    og.addColorStop(1,   '#052E60');
    c.fillStyle = og;
    c.fillRect(0, 0, sz, sz);

    // Eurasie
    c.fillStyle = '#2E6E38';
    c.beginPath();
    c.moveTo(cx + r*0.06, cy - r*0.12);
    c.bezierCurveTo(cx + r*0.40, cy - r*0.29, cx + r*0.58, cy - r*0.08, cx + r*0.43, cy + r*0.10);
    c.bezierCurveTo(cx + r*0.22, cy + r*0.24, cx - r*0.06, cy + r*0.15, cx + r*0.06, cy - r*0.12);
    c.fill();

    // Amériques
    c.fillStyle = '#377840';
    c.beginPath();
    c.ellipse(cx - r*0.45, cy - r*0.04, r*0.11, r*0.30, -0.18, 0, Math.PI * 2);
    c.fill();

    // Afrique
    c.fillStyle = '#2E6E38';
    c.beginPath();
    c.ellipse(cx + r*0.12, cy + r*0.25, r*0.13, r*0.22, 0.08, 0, Math.PI * 2);
    c.fill();

    // Australie
    c.fillStyle = '#4A8050';
    c.beginPath();
    c.ellipse(cx + r*0.50, cy + r*0.32, r*0.10, r*0.07, 0.30, 0, Math.PI * 2);
    c.fill();

    // Zone désertique (Sahara)
    c.fillStyle = 'rgba(190, 158, 85, 0.48)';
    c.beginPath();
    c.ellipse(cx + r*0.18, cy + r*0.07, r*0.10, r*0.06, 0.40, 0, Math.PI * 2);
    c.fill();

    // Calotte nord
    c.fillStyle = 'rgba(218, 232, 250, 0.92)';
    c.beginPath();
    c.ellipse(cx, cy - r*0.86, r*0.60, r*0.15, 0, 0, Math.PI * 2);
    c.fill();

    // Calotte sud
    c.fillStyle = 'rgba(224, 236, 252, 0.88)';
    c.beginPath();
    c.ellipse(cx, cy + r*0.87, r*0.50, r*0.12, 0, 0, Math.PI * 2);
    c.fill();

    // Nuages
    c.fillStyle = 'rgba(255, 255, 255, 0.58)';
    [
      [cx - r*0.28, cy - r*0.33, r*0.22, r*0.032, 0.28],
      [cx + r*0.12, cy + r*0.06, r*0.26, r*0.029, -0.18],
      [cx - r*0.52, cy + r*0.23, r*0.17, r*0.026, 0.10],
      [cx + r*0.40, cy - r*0.43, r*0.23, r*0.031, -0.12],
      [cx + r*0.60, cy + r*0.09, r*0.14, r*0.024, 0.38],
    ].forEach(([x, y, rx, ry, rot]) => {
      c.save(); c.translate(x, y); c.rotate(rot);
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    });

    c.restore();
    return oc;
  }

  function buildMercuryCanvas(r) {
    const sz = Math.ceil(r * 2) + 6;
    const oc = document.createElement('canvas');
    oc.width = oc.height = sz;
    const c = oc.getContext('2d');
    const cx = sz / 2, cy = sz / 2;

    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip();

    const bg = c.createRadialGradient(cx - r*0.18, cy - r*0.18, 0, cx, cy, r);
    bg.addColorStop(0,   '#C4B2A2');
    bg.addColorStop(0.5, '#907A68');
    bg.addColorStop(1,   '#5C4A38');
    c.fillStyle = bg;
    c.fillRect(0, 0, sz, sz);

    [
      [cx - r*0.22, cy + r*0.17, r*0.11],
      [cx + r*0.36, cy - r*0.27, r*0.08],
      [cx - r*0.42, cy - r*0.30, r*0.07],
      [cx + r*0.17, cy + r*0.43, r*0.09],
      [cx - r*0.08, cy - r*0.08, r*0.05],
      [cx + r*0.46, cy + r*0.22, r*0.05],
      [cx + r*0.08, cy - r*0.48, r*0.06],
    ].forEach(([x, y, cr]) => {
      const cg = c.createRadialGradient(x, y, 0, x, y, cr);
      cg.addColorStop(0,    'rgba(42, 32, 22, 0.52)');
      cg.addColorStop(0.60, 'rgba(42, 32, 22, 0.22)');
      cg.addColorStop(0.85, 'rgba(165, 148, 130, 0.42)');
      cg.addColorStop(1,    'rgba(165, 148, 130, 0)');
      c.fillStyle = cg;
      c.beginPath(); c.arc(x, y, cr, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(192, 178, 162, 0.55)';
      c.beginPath(); c.arc(x, y, cr * 0.11, 0, Math.PI * 2); c.fill();
    });

    c.restore();
    return oc;
  }

  function buildSaturnCanvas(r) {
    const sz = Math.ceil(r * 2) + 6;
    const oc = document.createElement('canvas');
    oc.width = oc.height = sz;
    const c = oc.getContext('2d');
    const cx = sz / 2, cy = sz / 2;

    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip();

    const ag = c.createLinearGradient(cx, cy - r, cx, cy + r);
    ag.addColorStop(0,    '#B89050');
    ag.addColorStop(0.18, '#CCAA6A');
    ag.addColorStop(0.33, '#D8BA78');
    ag.addColorStop(0.50, '#C8A860');
    ag.addColorStop(0.68, '#B89050');
    ag.addColorStop(0.82, '#A87838');
    ag.addColorStop(1,    '#906828');
    c.fillStyle = ag;
    c.fillRect(0, 0, sz, sz);

    [ { y: -0.33, h: 0.06, a: 0.24 },
      { y: -0.09, h: 0.05, a: 0.18 },
      { y:  0.20, h: 0.06, a: 0.20 },
      { y:  0.44, h: 0.04, a: 0.15 },
    ].forEach(b => {
      c.fillStyle = `rgba(80,58,20,${b.a})`;
      c.beginPath(); c.ellipse(cx, cy + r*b.y, r, r*b.h, 0, 0, Math.PI*2); c.fill();
    });

    [ { y: -0.20, h: 0.03, a: 0.14 },
      { y:  0.08, h: 0.04, a: 0.12 },
    ].forEach(b => {
      c.fillStyle = `rgba(245,222,178,${b.a})`;
      c.beginPath(); c.ellipse(cx, cy + r*b.y, r, r*b.h, 0, 0, Math.PI*2); c.fill();
    });

    c.restore();
    return oc;
  }

  /* ── Données ────────────────────────────────────────────────────── */

  function buildCoronaRayData() {
    return Array.from({ length: 30 }, (_, i) => ({
      angle: (i / 30) * Math.PI * 2,
      len:   0.85 + 0.90 * Math.abs(Math.sin(i * 2.3 + 0.7)),
      width: 0.013 + 0.009 * Math.abs(Math.sin(i * 1.7)),
      speed: (i % 2 === 0 ? 1 : -1) * (0.006 + 0.003 * ((i % 5) / 5)),
    }));
  }

  function buildFieldStars() {
    const n = W < 600 ? 520 : W < 900 ? 780 : 1150;
    return Array.from({ length: n }, () => {
      const r = Math.random();
      const col = r < 0.10 ? [178, 212, 255]
                : r < 0.22 ? [255, 252, 215]
                : r < 0.28 ? [255, 192, 108]
                : [235, 238, 255];
      return {
        x: Math.random(), y: Math.random(),
        r: Math.pow(Math.random(), 2.0) * 1.85 + 0.15,
        b: Math.random() * 0.52 + 0.28,
        sp: Math.random() * 0.016 + 0.004,
        ph: Math.random() * Math.PI * 2,
        col,
      };
    });
  }

  function buildMWStars() {
    const n = W < 600 ? 950 : 2400;
    return Array.from({ length: n }, () => {
      const along = Math.random();
      const perp  = (Math.random() - 0.5) * 2;
      const g     = Math.exp(-perp * perp * 5.0);
      return {
        x: 0.04 + along * 0.96,
        y: 0.02 + along * 0.66 + perp * 0.30,
        r: Math.random() * 0.55 + 0.06,
        b: g * (Math.random() * 0.30 + 0.04),
        col: Math.random() > 0.42 ? [188, 202, 255] : [255, 244, 208],
      };
    });
  }

  function buildDust() {
    const n = W < 600 ? 38 : 72;
    return Array.from({ length: n }, () => ({
      x:  Math.random() * (W || 800),
      y:  Math.random() * (H || 600),
      r:  Math.random() * 1.10 + 0.12,
      o:  Math.random() * 0.16 + 0.03,
      vx: (Math.random() - 0.5) * 0.055,
      vy: (Math.random() - 0.5) * 0.055,
      sp: Math.random() * 0.028 + 0.006,
      ph: Math.random() * Math.PI * 2,
      col: Math.random() > 0.5 ? [198, 144, 56] : [175, 188, 255],
    }));
  }

  /* ── Pré-rendu fond statique ────────────────────────────────────── */

  function preRender() {
    if (!W || !H) return;
    const oc = document.createElement('canvas');
    oc.width  = Math.round(W * dpr);
    oc.height = Math.round(H * dpr);
    const c = oc.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const skyG = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(W, H) * 1.35);
    skyG.addColorStop(0,    '#0E080C');
    skyG.addColorStop(0.14, '#080810');
    skyG.addColorStop(0.44, '#050610');
    skyG.addColorStop(1,    '#020208');
    c.fillStyle = skyG;
    c.fillRect(0, 0, W, H);

    const dirG = c.createLinearGradient(W * 0.92, H * 0.18, 0, H * 0.82);
    dirG.addColorStop(0,   'rgba(22, 10, 2, 0.52)');
    dirG.addColorStop(0.5, 'rgba(6, 6, 12, 0.38)');
    dirG.addColorStop(1,   'rgba(2, 3, 10, 0.52)');
    c.fillStyle = dirG;
    c.fillRect(0, 0, W, H);

    drawNebulae(c);

    mwStars.forEach(s => {
      c.beginPath();
      c.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      c.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${s.b.toFixed(2)})`;
      c.fill();
    });

    bgCanvas = oc;
  }

  function drawNebulae(c) {
    [
      { x:.85, y:.06, rx:.56, ry:.17, col:'rgba(42,52,130,',  o:.14 },
      { x:.66, y:.22, rx:.44, ry:.14, col:'rgba(52,44,120,',  o:.11 },
      { x:.52, y:.36, rx:.34, ry:.11, col:'rgba(70,62,140,',  o:.09 },
      { x:.36, y:.50, rx:.28, ry:.10, col:'rgba(48,62,148,',  o:.08 },
      { x:.20, y:.66, rx:.24, ry:.09, col:'rgba(42,56,138,',  o:.06 },
      { x:.74, y:.16, rx:.25, ry:.08, col:'rgba(155,130,95,', o:.08 },
      { x:.69, y:.28, rx:.18, ry:.06, col:'rgba(182,154,108,',o:.10 },
      { x:.62, y:.40, rx:.14, ry:.05, col:'rgba(195,162,115,',o:.08 },
      { x:.90, y:.14, rx:.20, ry:.07, col:'rgba(65,78,165,',  o:.09 },
      { x:.46, y:.74, rx:.22, ry:.08, col:'rgba(46,60,145,',  o:.07 },
      { x:.08, y:.42, rx:.20, ry:.08, col:'rgba(32,48,130,',  o:.05 },
      { x:.94, y:.58, rx:.14, ry:.06, col:'rgba(55,70,158,',  o:.07 },
    ].forEach(n => {
      c.save();
      c.scale(1, n.ry / n.rx);
      const sy = n.y * H * (n.rx / n.ry);
      const g  = c.createRadialGradient(n.x * W, sy, 0, n.x * W, sy, n.rx * W);
      g.addColorStop(0,    n.col + n.o + ')');
      g.addColorStop(0.40, n.col + (n.o * 0.36).toFixed(3) + ')');
      g.addColorStop(1,    n.col + '0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(n.x * W, sy, n.rx * W, 0, Math.PI * 2); c.fill();
      c.restore();
    });
  }

  /* ── RAF ────────────────────────────────────────────────────────── */

  function startLoop() { lastTs = 0; raf = requestAnimationFrame(tick); }
  function stopLoop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  function tick(ts) {
    const dt = lastTs ? Math.min(ts - lastTs, 50) : 16;
    lastTs = ts;
    t += dt * 0.001;
    draw(t);
    raf = requestAnimationFrame(tick);
  }

  /* ── Rendu principal ────────────────────────────────────────────── */

  function draw(time) {
    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, W, H);
    else { ctx.fillStyle = '#030508'; ctx.fillRect(0, 0, W, H); }

    drawFieldStars(time);
    drawAmbientGlow(time);
    drawOrbits();

    PLANETS
      .map(p => {
        const a = p.phase + time * p.speed * (Math.PI * 2 / 60);
        return { p, a, yOff: Math.sin(a) };
      })
      .sort((a, b) => a.yOff - b.yOff)
      .forEach(({ p, a }) => drawPlanet(p, a, time));

    drawSun(time);
    drawDust(time);
  }

  /* ── Étoiles ────────────────────────────────────────────────────── */

  function drawFieldStars(time) {
    fieldStars.forEach(s => {
      const a = s.b * (0.42 + 0.58 * Math.sin(time * s.sp * 55 + s.ph));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${a.toFixed(2)})`;
      ctx.fill();
    });
  }

  /* ── Halo ambiant solaire ───────────────────────────────────────── */

  function drawAmbientGlow(time) {
    const p = 1 + 0.020 * Math.sin(time * 0.46);
    const g = ctx.createRadialGradient(sunX, sunY, sunR * 1.6, sunX, sunY, Math.max(W, H) * 1.35 * p);
    g.addColorStop(0,    'rgba(225, 120, 30, 0.108)');
    g.addColorStop(0.20, 'rgba(182, 82, 20, 0.050)');
    g.addColorStop(0.50, 'rgba(140, 52, 8, 0.020)');
    g.addColorStop(1,    'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── Orbites ────────────────────────────────────────────────────── */

  function drawOrbits() {
    ctx.save();
    ctx.setLineDash([2, 15]);
    ctx.lineWidth = 0.5;
    PLANETS.forEach(p => {
      ctx.beginPath();
      ctx.arc(sunX, sunY, p.orbit * minD, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 152, 65, 0.055)';
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* ── Planètes ───────────────────────────────────────────────────── */

  function drawPlanet(p, ang, time) {
    const pr  = p.size  * minD;
    const orR = p.orbit * minD;
    const px  = sunX + Math.cos(ang) * orR;
    const py  = sunY + Math.sin(ang) * orR;
    const isFront = Math.sin(ang) > 0;

    if (p.hasRings && !isFront) drawSaturnRings(px, py, pr);

    // Atmosphère
    const ag = ctx.createRadialGradient(px, py, pr * 0.72, px, py, pr * 2.30);
    ag.addColorStop(0,   `rgba(${p.atmo[0]},${p.atmo[1]},${p.atmo[2]},${p.atmoStr})`);
    ag.addColorStop(0.5, `rgba(${p.atmo[0]},${p.atmo[1]},${p.atmo[2]},${(p.atmoStr * 0.22).toFixed(3)})`);
    ag.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(px, py, pr * 2.30, 0, Math.PI * 2); ctx.fill();

    // Texture planète avec rotation
    const rotAngle = time * (p.id === 'earth' ? 0.11 : p.id === 'mercury' ? 0.07 : 0.05);
    drawPlanetBody(px, py, pr, textures[p.id], rotAngle);

    // Ombre (côté opposé au soleil)
    const lightAng  = Math.atan2(sunY - py, sunX - px);
    const shadowAng = lightAng + Math.PI;
    const shg = ctx.createRadialGradient(
      px + Math.cos(shadowAng) * pr * 0.28, py + Math.sin(shadowAng) * pr * 0.28, 0,
      px, py, pr * 1.12
    );
    shg.addColorStop(0,    'rgba(0, 1, 14, 0.90)');
    shg.addColorStop(0.28, 'rgba(0, 1, 8, 0.62)');
    shg.addColorStop(0.60, 'rgba(0, 0, 4, 0.22)');
    shg.addColorStop(1,    'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shg;
    ctx.beginPath(); ctx.arc(px, py, pr * 1.12, 0, Math.PI * 2); ctx.fill();

    // Reflet spéculaire
    const hlg = ctx.createRadialGradient(
      px + Math.cos(lightAng) * pr * 0.52, py + Math.sin(lightAng) * pr * 0.52, 0,
      px + Math.cos(lightAng) * pr * 0.32, py + Math.sin(lightAng) * pr * 0.32, pr * 0.52
    );
    hlg.addColorStop(0, 'rgba(255,255,255,0.24)');
    hlg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlg;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();

    // Atmosphère Earth (halo bleu)
    if (p.id === 'earth') {
      const eg = ctx.createRadialGradient(px, py, pr * 0.96, px, py, pr * 1.18);
      eg.addColorStop(0,   'rgba(80, 148, 255, 0.22)');
      eg.addColorStop(0.5, 'rgba(60, 120, 220, 0.08)');
      eg.addColorStop(1,   'rgba(0, 0, 0, 0)');
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.arc(px, py, pr * 1.18, 0, Math.PI * 2); ctx.fill();
    }

    if (p.hasRings && isFront) drawSaturnRings(px, py, pr);
  }

  function drawPlanetBody(px, py, pr, tex, rotAngle) {
    if (!tex) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.clip();
    ctx.translate(px, py); ctx.rotate(rotAngle);
    const sz = tex.width;
    ctx.drawImage(tex, -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  }

  function drawSaturnRings(px, py, pr) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, 0.28);

    [
      { r: 2.44, lw: pr * 0.07, col: 'rgba(185,152,78,0.18)' },
      { r: 2.20, lw: pr * 0.13, col: 'rgba(205,170,100,0.30)' },
      { r: 1.96, lw: pr * 0.09, col: 'rgba(195,162,90,0.24)' },
      { r: 1.72, lw: pr * 0.18, col: 'rgba(212,178,108,0.38)' },
      { r: 1.44, lw: pr * 0.09, col: 'rgba(182,148,76,0.20)' },
    ].forEach(b => {
      ctx.beginPath(); ctx.arc(0, 0, pr * b.r, 0, Math.PI * 2);
      ctx.strokeStyle = b.col; ctx.lineWidth = b.lw; ctx.stroke();
    });

    // Division de Cassini
    ctx.beginPath(); ctx.arc(0, 0, pr * 1.82, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = pr * 0.05; ctx.stroke();

    ctx.restore();
  }

  /* ── Soleil ─────────────────────────────────────────────────────── */

  function drawSun(time) {
    const sr  = sunR;
    const pls = 1 + 0.013 * Math.sin(time * 1.62);

    // Couronnes (4 couches)
    [
      [10.5, 0.040],
      [6.8,  0.078],
      [3.6,  0.155],
      [2.1,  0.295],
    ].forEach(([rm, base], i) => {
      const pr = 1 + 0.026 * Math.sin(time * (0.56 + i * 0.12));
      const g  = ctx.createRadialGradient(sunX, sunY, sr * 0.66, sunX, sunY, sr * rm * pr);
      g.addColorStop(0,    `rgba(230, 125, 30, ${base})`);
      g.addColorStop(0.27, `rgba(195, 88, 20, ${(base * 0.34).toFixed(3)})`);
      g.addColorStop(1,    'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sunX, sunY, sr * rm * pr, 0, Math.PI * 2); ctx.fill();
    });

    // Rayons de corona (screen blend — effet photo-réaliste)
    drawCoronaRays(time, sr);

    // Protubérances
    drawProminences(time, sr);

    // Photosphère
    const sg = ctx.createRadialGradient(
      sunX - sr * 0.26, sunY - sr * 0.26, 0,
      sunX, sunY, sr * pls
    );
    sg.addColorStop(0,    '#FFFCEE');
    sg.addColorStop(0.06, '#FFF082');
    sg.addColorStop(0.22, '#FAC42A');
    sg.addColorStop(0.50, '#E88218');
    sg.addColorStop(0.76, '#C45A15');
    sg.addColorStop(1,    '#8E320C');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sunX, sunY, sr * pls, 0, Math.PI * 2); ctx.fill();

    // Plasma surface
    drawPlasma(time, sr * pls);

    // Assombrissement au limbe
    const ld = ctx.createRadialGradient(sunX, sunY, sr * 0.50 * pls, sunX, sunY, sr * pls);
    ld.addColorStop(0, 'rgba(0, 0, 0, 0)');
    ld.addColorStop(1, 'rgba(45, 6, 2, 0.52)');
    ctx.fillStyle = ld;
    ctx.beginPath(); ctx.arc(sunX, sunY, sr * pls, 0, Math.PI * 2); ctx.fill();

    // Reflet spéculaire
    const hl = ctx.createRadialGradient(
      sunX - sr * 0.28, sunY - sr * 0.28, 0,
      sunX - sr * 0.14, sunY - sr * 0.14, sr * 0.56
    );
    hl.addColorStop(0,   'rgba(255, 254, 240, 0.38)');
    hl.addColorStop(0.5, 'rgba(255, 245, 205, 0.06)');
    hl.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = hl;
    ctx.beginPath(); ctx.arc(sunX, sunY, sr * pls, 0, Math.PI * 2); ctx.fill();
  }

  function drawCoronaRays(time, sr) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    coronaRayData.forEach((ray, i) => {
      const angle = ray.angle + time * ray.speed;
      const len   = sr * (ray.len * 2.0 + 0.28 * Math.sin(time * 0.22 + i));
      const w     = sr * (ray.width * (0.8 + 0.4 * Math.sin(time * 0.30 + i)));

      ctx.save();
      ctx.translate(sunX, sunY);
      ctx.rotate(angle);

      const rayG = ctx.createLinearGradient(sr * 0.92, 0, sr + len, 0);
      rayG.addColorStop(0,    'rgba(255, 188, 72, 0.15)');
      rayG.addColorStop(0.22, 'rgba(255, 152, 48, 0.062)');
      rayG.addColorStop(0.55, 'rgba(255, 120, 28, 0.020)');
      rayG.addColorStop(1,    'rgba(0, 0, 0, 0)');

      ctx.fillStyle = rayG;
      ctx.beginPath();
      ctx.moveTo(sr * 0.90, -w * 0.52);
      ctx.lineTo(sr + len,  -w * 0.04);
      ctx.lineTo(sr + len,   w * 0.04);
      ctx.lineTo(sr * 0.90,  w * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawPlasma(time, sr) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.062;
    ctx.beginPath(); ctx.arc(sunX, sunY, sr, 0, Math.PI * 2); ctx.clip();
    for (let i = 0; i < 7; i++) {
      const ang  = (i / 7) * Math.PI * 2 + time * (0.10 + 0.030 * (i % 2 ? 1 : -1));
      const dist = sr * (0.18 + 0.36 * Math.abs(Math.sin(time * 0.24 + i)));
      const px   = sunX + Math.cos(ang) * dist;
      const py   = sunY + Math.sin(ang) * dist;
      const sz   = sr  * (0.10 + 0.08 * Math.sin(time * 0.48 + i * 1.4));
      const g    = ctx.createRadialGradient(px, py, 0, px, py, sz);
      g.addColorStop(0, 'rgba(255,248,95,0.90)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  const PROMS = [
    { a: 0.40, s: 0.044, len: 0.42 },
    { a: 2.05, s: 0.036, len: 0.34 },
    { a: 3.60, s: 0.048, len: 0.44 },
    { a: 5.15, s: 0.040, len: 0.36 },
  ];

  function drawProminences(time, sr) {
    PROMS.forEach((p, i) => {
      const ang = p.a + time * p.s;
      const ext = sr * p.len * (0.78 + 0.22 * Math.sin(time * 0.65 + i));
      const bx  = sunX + Math.cos(ang) * sr * 0.90;
      const by  = sunY + Math.sin(ang) * sr * 0.90;
      const tx  = sunX + Math.cos(ang) * (sr + ext);
      const ty  = sunY + Math.sin(ang) * (sr + ext);
      const ca  = ang + 0.50;
      const cpx = sunX + Math.cos(ca) * (sr * 0.96 + ext * 0.50);
      const cpy = sunY + Math.sin(ca) * (sr * 0.96 + ext * 0.50);
      const g   = ctx.createLinearGradient(bx, by, tx, ty);
      g.addColorStop(0,    'rgba(255, 158, 32, 0.68)');
      g.addColorStop(0.35, 'rgba(255, 90, 18, 0.32)');
      g.addColorStop(1,    'rgba(255, 48, 10, 0)');
      ctx.strokeStyle = g;
      ctx.lineWidth   = sr * 0.040 * (0.65 + 0.35 * Math.sin(time * 0.80 + i));
      ctx.lineCap     = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cpx, cpy, tx, ty); ctx.stroke();
    });
  }

  /* ── Poussière cosmique ─────────────────────────────────────────── */

  function drawDust(time) {
    dustParts.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      const a = d.o * (0.48 + 0.52 * Math.sin(time * d.sp * 55 + d.ph));
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.col[0]},${d.col[1]},${d.col[2]},${a.toFixed(2)})`;
      ctx.fill();
    });
  }

  /* ── Utilitaire ─────────────────────────────────────────────────── */

  function debounce(fn, ms) {
    let id;
    return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
  }

  init();
})();
