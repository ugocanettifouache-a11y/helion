/*!
 * Hélio — Solar System Canvas Renderer
 * Optimized 2D canvas · No external dependencies
 */
(function () {
  'use strict';

  const canvas = document.getElementById('solarCanvas');
  if (!canvas) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d', { alpha: true });

  // Cap pixel ratio for performance
  const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);

  let W = 0, H = 0, sunX = 0, sunY = 0, minD = 0;
  let t = 0, lastTs = 0, raf = null;
  let bg = null; // pre-rendered static background

  // ─── Scene configuration ─────────────────────────────────────────
  const SUN = {
    rx: 0.5,      // sun position, relative to canvas
    ry: 0.48,
    rFactor: 0.11, // radius = rFactor * min(W,H)
  };

  const PLANETS = [
    // Rocky inner planet (Mercury/Mars-like)
    {
      orbit: 0.225, size: 0.022, speed: 0.78, phase: 0.7,
      cr: 188, cg: 125, cb: 72,
      atmoColor: [255, 160, 90], atmoStr: 0.18,
      hasRings: false,
    },
    // Oceanic planet (Earth-like)
    {
      orbit: 0.365, size: 0.032, speed: 0.34, phase: 2.3,
      cr: 52, cg: 108, cb: 196,
      atmoColor: [100, 160, 255], atmoStr: 0.22,
      hasRings: false, cloudBands: true,
    },
    // Gas giant (Saturn-like) with rings
    {
      orbit: 0.525, size: 0.044, speed: 0.155, phase: 4.2,
      cr: 208, cg: 172, cb: 112,
      atmoColor: [228, 188, 132], atmoStr: 0.14,
      hasRings: true,
    },
  ];

  let stars = [], mwStars = [], dust = [];

  // ─── Boot ────────────────────────────────────────────────────────
  function boot() {
    onResize();
    buildStars();
    buildDust();
    prerender();

    if (!prefersReduced) {
      startLoop();
      document.addEventListener('visibilitychange', () => {
        document.hidden ? stopLoop() : startLoop();
      });
    } else {
      renderFrame(0);
    }
  }

  function startLoop() { lastTs = 0; raf = requestAnimationFrame(tick); }
  function stopLoop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  // ─── Resize (ResizeObserver) ──────────────────────────────────────
  function onResize() {
    const parent = canvas.parentElement;
    W = parent.offsetWidth  || 520;
    H = parent.offsetHeight || 520;
    if (W < 10 || H < 10) return;

    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    sunX = W * SUN.rx;
    sunY = H * SUN.ry;
    minD = Math.min(W, H);

    bg = null;
    buildDust(); // reposition dust to new dimensions
    prerender();
  }

  const ro = new ResizeObserver(debounce(onResize, 150));
  ro.observe(canvas.parentElement);

  // ─── Stars ────────────────────────────────────────────────────────
  function buildStars() {
    const isMobile = window.innerWidth < 600;
    const n  = isMobile ? 380 : 780;
    const mw = isMobile ? 700 : 1500;

    stars = Array.from({ length: n }, () => {
      const r = Math.random();
      const col = r < .12 ? [180,210,255] : r < .24 ? [255,248,210] : r < .31 ? [255,185,100] : [235,238,255];
      return {
        x: Math.random(), y: Math.random(),
        r: Math.pow(Math.random(), 2.4) * 1.7 + 0.12,
        b: Math.random() * .6 + .32,
        ts: Math.random() * .024 + .004,
        tp: Math.random() * Math.PI * 2,
        col,
      };
    });

    // Milky Way diagonal band (top-right → bottom-left)
    mwStars = Array.from({ length: mw }, () => {
      const along = Math.random();
      const perp  = (Math.random() - .5) * 2;
      const gauss = Math.exp(-perp * perp * 6);
      return {
        x: 0.06 + along * .92,
        y: 0.03 + along * .65 + perp * .24,
        r: Math.random() * .52 + .08,
        b: gauss * (Math.random() * .32 + .04),
        col: Math.random() > .38 ? [188,200,255] : [255,242,205],
      };
    });
  }

  // ─── Cosmic dust ──────────────────────────────────────────────────
  function buildDust() {
    dust = Array.from({ length: 68 }, () => ({
      x: Math.random() * (W || 500),
      y: Math.random() * (H || 500),
      r: Math.random() * 1.25 + .18,
      o: Math.random() * .25 + .04,
      vx: (Math.random() - .5) * .08,
      vy: (Math.random() - .5) * .08,
      tp: Math.random() * Math.PI * 2,
      ts: Math.random() * .038 + .008,
      col: Math.random() > .52 ? [200,147,58] : [175,188,255],
    }));
  }

  // ─── Pre-render static background (offscreen canvas) ─────────────
  function prerender() {
    if (!W || !H) return;
    const oc = document.createElement('canvas');
    oc.width  = Math.round(W * dpr);
    oc.height = Math.round(H * dpr);
    const c = oc.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Deep space gradient
    const grd = c.createLinearGradient(0, 0, W * .85, H);
    grd.addColorStop(0,    '#020408');
    grd.addColorStop(0.35, '#040710');
    grd.addColorStop(0.65, '#05091A');
    grd.addColorStop(1,    '#030508');
    c.fillStyle = grd;
    c.fillRect(0, 0, W, H);

    // Milky Way nebula colour clouds
    [
      { x:.78, y:.13, rx:.42, ry:.14, col:'rgba(52,62,138,',  o:.095 },
      { x:.60, y:.27, rx:.30, ry:.09, col:'rgba(65,52,128,',  o:.085 },
      { x:.45, y:.41, rx:.24, ry:.08, col:'rgba(85,72,148,',  o:.07  },
      { x:.62, y:.21, rx:.15, ry:.05, col:'rgba(165,145,110,',o:.055 }, // warm core
      { x:.69, y:.17, rx:.24, ry:.09, col:'rgba(108,88,178,', o:.08  },
      { x:.30, y:.63, rx:.20, ry:.07, col:'rgba(52,72,155,',  o:.06  },
      { x:.86, y:.07, rx:.16, ry:.05, col:'rgba(75,88,172,',  o:.07  },
      { x:.58, y:.31, rx:.09, ry:.03, col:'rgba(200,178,142,',o:.065 }, // bright core
    ].forEach(n => {
      c.save();
      c.scale(1, n.ry / n.rx);
      const scaledY = n.y * H * (n.rx / n.ry);
      const g = c.createRadialGradient(n.x*W, scaledY, 0, n.x*W, scaledY, n.rx*W);
      g.addColorStop(0,    n.col + n.o + ')');
      g.addColorStop(0.45, n.col + (n.o*.45).toFixed(3) + ')');
      g.addColorStop(1,    n.col + '0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(n.x*W, scaledY, n.rx*W, 0, Math.PI*2);
      c.fill();
      c.restore();
    });

    // Milky Way micro-stars (static)
    mwStars.forEach(s => {
      c.beginPath();
      c.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
      c.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${s.b.toFixed(2)})`;
      c.fill();
    });

    // Field stars dim base (will twinkle dynamically)
    stars.forEach(s => {
      c.beginPath();
      c.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
      c.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${(s.b*.45).toFixed(2)})`;
      c.fill();
    });

    bg = oc;
  }

  // ─── Main loop ────────────────────────────────────────────────────
  function tick(ts) {
    const dt = Math.min(lastTs ? ts - lastTs : 16, 50);
    lastTs = ts;
    t += dt / 1000;
    renderFrame(t);
    raf = requestAnimationFrame(tick);
  }

  function renderFrame(time) {
    ctx.clearRect(0, 0, W, H);

    // Static background
    if (bg) ctx.drawImage(bg, 0, 0, W, H);

    // Twinkling stars
    drawStars(time);

    // Warm ambient glow from sun
    drawAmbientGlow(time);

    // Orbit dotted rings
    drawOrbits();

    // Planets sorted by depth (back → front)
    PLANETS
      .map(p => ({ p, y: Math.sin(p.phase + time * p.speed * Math.PI * 2 / 60) }))
      .sort((a, b) => a.y - b.y)
      .forEach(({ p }) => drawPlanet(p, time));

    // Sun (always on top)
    drawSun(time);

    // Cosmic dust
    drawDust(time);
  }

  // ─── Twinkling stars ──────────────────────────────────────────────
  function drawStars(time) {
    stars.forEach(s => {
      const a = s.b * (.48 + .52 * Math.sin(time * s.ts * 58 + s.tp));
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${a.toFixed(2)})`;
      ctx.fill();
    });
  }

  // ─── Ambient warm glow ─────────────────────────────────────────────
  function drawAmbientGlow(time) {
    const pulse = 1 + .028 * Math.sin(time * .55);
    const ag = ctx.createRadialGradient(sunX, sunY, minD * .06, sunX, sunY, Math.max(W, H) * .88 * pulse);
    ag.addColorStop(0,    'rgba(205,115,25,0.07)');
    ag.addColorStop(0.22, 'rgba(165,78,15,0.04)');
    ag.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = ag;
    ctx.fillRect(0, 0, W, H);
  }

  // ─── Orbit rings ──────────────────────────────────────────────────
  function drawOrbits() {
    PLANETS.forEach(p => {
      ctx.beginPath();
      ctx.arc(sunX, sunY, p.orbit * minD, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,147,58,0.07)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  // ─── Sun ──────────────────────────────────────────────────────────
  function drawSun(time) {
    const sr     = minD * SUN.rFactor;
    const pulse  = 1 + .022 * Math.sin(time * 1.75);

    // Layer 1 — vast outer corona haze
    const og = ctx.createRadialGradient(sunX, sunY, sr * .7, sunX, sunY, sr * 6.2);
    og.addColorStop(0,   'rgba(215,110,22,0.068)');
    og.addColorStop(.35, 'rgba(175,78,12,0.032)');
    og.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr * 6.2, 0, Math.PI * 2);
    ctx.fill();

    // Layer 2 — mid corona, animated
    const mc = 1 + .04 * Math.sin(time * .68);
    const mg = ctx.createRadialGradient(sunX, sunY, sr * .75, sunX, sunY, sr * 3.8 * mc);
    mg.addColorStop(0,   'rgba(248,165,40,0.20)');
    mg.addColorStop(.32, 'rgba(225,130,28,0.09)');
    mg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr * 3.8 * mc, 0, Math.PI * 2);
    ctx.fill();

    // Layer 3 — inner corona, brighter pulse
    const ic = 1 + .055 * Math.sin(time * 1.12 + .6);
    const ig = ctx.createRadialGradient(sunX, sunY, sr * .65, sunX, sunY, sr * 2.0 * ic);
    ig.addColorStop(0,   'rgba(255,205,75,0.34)');
    ig.addColorStop(.42, 'rgba(245,165,42,0.14)');
    ig.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr * 2.0 * ic, 0, Math.PI * 2);
    ctx.fill();

    // Solar prominences (looping arcs)
    drawProminences(time, sr);

    // Sun sphere
    const sg = ctx.createRadialGradient(sunX - sr * .28, sunY - sr * .28, 0, sunX, sunY, sr * pulse);
    sg.addColorStop(0,    '#FFFDD0');
    sg.addColorStop(.11,  '#FFE96A');
    sg.addColorStop(.34,  '#F5AF22');
    sg.addColorStop(.62,  '#E07215');
    sg.addColorStop(.85,  '#C25412');
    sg.addColorStop(1,    '#8C3008');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Plasma surface cells (clipped inside sun)
    drawSolarCells(time, sr * pulse);

    // Limb darkening
    const ld = ctx.createRadialGradient(sunX, sunY, sr * .58 * pulse, sunX, sunY, sr * pulse);
    ld.addColorStop(0, 'rgba(0,0,0,0)');
    ld.addColorStop(1, 'rgba(55,10,2,0.52)');
    ctx.fillStyle = ld;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    const hlg = ctx.createRadialGradient(sunX - sr * .30, sunY - sr * .30, 0, sunX - sr * .18, sunY - sr * .18, sr * .58);
    hlg.addColorStop(0,   'rgba(255,254,230,0.40)');
    hlg.addColorStop(.48, 'rgba(255,242,195,0.08)');
    hlg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = hlg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Animated plasma granulation
  function drawSolarCells(time, sr) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.09;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sr, 0, Math.PI * 2);
    ctx.clip();

    for (let i = 0; i < 7; i++) {
      const ang  = (i / 7) * Math.PI * 2 + time * (.12 + .04 * (i % 2 ? 1 : -1));
      const dist = sr * (.18 + .40 * Math.abs(Math.sin(time * .28 + i)));
      const px   = sunX + Math.cos(ang) * dist;
      const py   = sunY + Math.sin(ang) * dist;
      const sz   = sr * (.12 + .09 * Math.sin(time * .52 + i * 1.5));

      const g = ctx.createRadialGradient(px, py, 0, px, py, sz);
      g.addColorStop(0, 'rgba(255,242,88,0.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Solar prominences — looping bezier arcs
  const PROM = [
    { a: 0.40, s: .048, len: .44 },
    { a: 1.95, s: .040, len: .36 },
    { a: 3.50, s: .054, len: .48 },
    { a: 5.10, s: .043, len: .38 },
  ];

  function drawProminences(time, sr) {
    PROM.forEach((p, i) => {
      const ang  = p.a + time * p.s;
      const ext  = sr * p.len * (.82 + .18 * Math.sin(time * .72 + i));
      const bx   = sunX + Math.cos(ang) * sr * .88;
      const by   = sunY + Math.sin(ang) * sr * .88;
      const tx   = sunX + Math.cos(ang) * (sr + ext);
      const ty   = sunY + Math.sin(ang) * (sr + ext);
      const ca   = ang + .55;
      const cpx  = sunX + Math.cos(ca) * (sr * .95 + ext * .5);
      const cpy  = sunY + Math.sin(ca) * (sr * .95 + ext * .5);

      const g = ctx.createLinearGradient(bx, by, tx, ty);
      g.addColorStop(0,   'rgba(255,158,30,0.68)');
      g.addColorStop(.38, 'rgba(255,92,18,0.38)');
      g.addColorStop(1,   'rgba(255,50,8,0)');

      ctx.strokeStyle = g;
      ctx.lineWidth   = sr * .048 * (.68 + .32 * Math.sin(time * .88 + i));
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      ctx.stroke();
    });
  }

  // ─── Planets ──────────────────────────────────────────────────────
  function drawPlanet(p, time) {
    const orbitR = p.orbit * minD;
    const pr     = p.size  * minD;
    const ang    = p.phase + time * p.speed * Math.PI * 2 / 60;
    const px     = sunX + Math.cos(ang) * orbitR;
    const py     = sunY + Math.sin(ang) * orbitR;
    const front  = Math.sin(ang) > 0;

    // Rings: back half
    if (p.hasRings && !front) drawRings(px, py, pr);

    // Atmosphere halo
    const ac = p.atmoColor;
    const ag = ctx.createRadialGradient(px, py, pr * .72, px, py, pr * 1.8);
    ag.addColorStop(0, `rgba(${ac[0]},${ac[1]},${ac[2]},${p.atmoStr})`);
    ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Light angle from sun
    const la = Math.atan2(sunY - py, sunX - px);
    const { cr, cg, cb } = p;

    // Sphere base
    const sg = ctx.createRadialGradient(
      px + Math.cos(la) * pr * .38, py + Math.sin(la) * pr * .38, 0,
      px, py, pr
    );
    sg.addColorStop(0,   `rgb(${Math.min(cr+68,255)},${Math.min(cg+68,255)},${Math.min(cb+68,255)})`);
    sg.addColorStop(.34, `rgb(${cr},${cg},${cb})`);
    sg.addColorStop(.72, `rgb(${Math.max(cr-46,0)},${Math.max(cg-46,0)},${Math.max(cb-46,0)})`);
    sg.addColorStop(1,   `rgb(${Math.max(cr-92,0)},${Math.max(cg-92,0)},${Math.max(cb-92,0)})`);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    // Cloud bands on oceanic planet
    if (p.cloudBands) drawClouds(px, py, pr, time);

    // Shadow (dark side)
    const sha = la + Math.PI;
    const shg = ctx.createRadialGradient(
      px + Math.cos(sha) * pr * .28, py + Math.sin(sha) * pr * .28, 0,
      px, py, pr * 1.1
    );
    shg.addColorStop(0,   'rgba(0,2,15,0.80)');
    shg.addColorStop(.36, 'rgba(0,1,8,0.50)');
    shg.addColorStop(.68, 'rgba(0,0,4,0.15)');
    shg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = shg;
    ctx.beginPath();
    ctx.arc(px, py, pr * 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    const hlg = ctx.createRadialGradient(
      px + Math.cos(la) * pr * .52, py + Math.sin(la) * pr * .52, 0,
      px + Math.cos(la) * pr * .3,  py + Math.sin(la) * pr * .3, pr * .48
    );
    hlg.addColorStop(0, 'rgba(255,255,255,0.30)');
    hlg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    // Rings: front half
    if (p.hasRings && front) drawRings(px, py, pr);
  }

  // Atmospheric cloud wisps (oceanic planet)
  function drawClouds(px, py, pr, time) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.14;
    for (let i = 0; i < 3; i++) {
      const offY = pr * (-.44 + i * .39 + .08 * Math.sin(time * .18 + i));
      ctx.fillStyle = 'rgba(210,228,255,0.65)';
      ctx.beginPath();
      ctx.ellipse(px, py + offY, pr * .88, pr * .10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Saturn-like rings
  function drawRings(px, py, pr) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, 0.27);

    ctx.beginPath();
    ctx.arc(0, 0, pr * 2.35, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(205,162,88,0.28)';
    ctx.lineWidth = pr * .68;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, pr * 1.60, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(215,172,98,0.18)';
    ctx.lineWidth = pr * .30;
    ctx.stroke();

    ctx.restore();
  }

  // ─── Cosmic dust ──────────────────────────────────────────────────
  function drawDust(time) {
    dust.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      const a = d.o * (.52 + .48 * Math.sin(time * d.ts * 58 + d.tp));
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.col[0]},${d.col[1]},${d.col[2]},${a.toFixed(2)})`;
      ctx.fill();
    });
  }

  // ─── Utilities ────────────────────────────────────────────────────
  function debounce(fn, ms) {
    let id;
    return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
  }

  boot();
})();
