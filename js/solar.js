/*!
 * Hélion — Scène orbitale (Canvas 2D)
 * Halo solaire, anneaux orbitaux, trajectoires, champ d'étoiles — ambiance premium, non figurative.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('solarCanvas');
  const hero   = canvas && canvas.parentElement;
  if (!canvas || !hero) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  function rand(min, max) { return min + Math.random() * (max - min); }

  /* ── Étoiles ─────────────────────────────────────────────────────── */
  let stars = [];
  function buildStars(W, H) {
    const n = isMobile ? 90 : 170;
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() < 0.12 ? rand(1.0, 1.6) : rand(0.4, 0.9),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.3, 0.9),
      });
    }
  }

  /* ── Orbites (anneaux elliptiques + corps lumineux qui y voyagent) ── */
  let orbits = [];
  function buildOrbits(sunX, sunY, baseR) {
    orbits = [
      { rH: baseR * 1.55, rV: baseR * 0.95, tilt: -0.22, speed: 0.00018, angle: rand(0, Math.PI*2), dotR: 3.4, trail: true  },
      { rH: baseR * 2.15, rV: baseR * 1.30, tilt: -0.16, speed: 0.00011, angle: rand(0, Math.PI*2), dotR: 2.6, trail: true  },
      { rH: baseR * 2.85, rV: baseR * 1.70, tilt: -0.10, speed: 0.00007, angle: rand(0, Math.PI*2), dotR: 2.0, trail: false },
    ].map(o => ({ ...o, cx: sunX, cy: sunY }));
  }

  /* ── Dimensionnement ─────────────────────────────────────────────── */
  let W = 0, H = 0, dpr = 1;
  let sunX = 0, sunY = 0, sunR = 0;

  function viewH() { return Math.min(H, window.innerHeight || H); }

  function layout() {
    const vh = viewH();
    sunX = W * (isMobile ? 0.78 : 0.80);
    sunY = vh * (isMobile ? 0.30 : 0.42);
    sunR = vh * (isMobile ? 0.20 : 0.26);
    buildOrbits(sunX, sunY, sunR);
  }

  function resize() {
    W = hero.offsetWidth  || window.innerWidth  || 1280;
    H = hero.offsetHeight || window.innerHeight || 800;
    if (W < 1) W = 1280;
    if (H < 1) H = 800;
    dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStars(W, H);
    layout();
  }
  window.addEventListener('resize', resize);

  /* ── Parallax souris ─────────────────────────────────────────────── */
  let mouseX = 0, mouseY = 0, camX = 0, camY = 0;
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2.0;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2.0;
  });

  /* ── Dessine une ellipse en orbite (anneau fin) ─────────────────── */
  function strokeOrbitRing(o, alpha) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.tilt);
    ctx.strokeStyle = `rgba(196,145,58,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, o.rH, o.rV, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /* ── Boucle de rendu ─────────────────────────────────────────────── */
  let animId = null;
  let lastTs = performance.now();

  function tick(ts) {
    animId = requestAnimationFrame(tick);
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;
    const time = ts * 0.001;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, W, H);

    if (!reduced) {
      camX += (mouseX - camX) * 0.025;
      camY += (mouseY - camY) * 0.025;
    }

    /* Étoiles scintillantes */
    const stPx = camX * 10, stPy = camY * 6;
    stars.forEach(s => {
      const tw = reduced ? 0.8 : 0.45 + 0.55 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#EAF0FF';
      ctx.beginPath();
      ctx.arc(s.x + stPx, s.y + stPy, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const sx = sunX + camX * 14, sy = sunY + camY * 8;

    /* Halo solaire — larges couches douces, pulsation lente */
    const pulse = reduced ? 1 : 0.94 + 0.06 * Math.sin(time * 0.35);
    ctx.globalCompositeOperation = 'lighter';
    [
      { r: sunR * 0.55, col: '255,238,205', a: 0.95 },
      { r: sunR * 1.00, col: '255,205,120', a: 0.55 },
      { r: sunR * 1.55, col: '230,150,70',  a: 0.28 },
      { r: sunR * 2.30, col: '196,110,50',  a: 0.14 },
      { r: sunR * 3.40, col: '160,80,40',   a: 0.06 },
    ].forEach(({ r, col, a }) => {
      const rr = r * pulse;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr);
      g.addColorStop(0, `rgba(${col},${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, rr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    /* Anneaux orbitaux */
    orbits.forEach((o, i) => {
      o.cx = sx; o.cy = sy;
      strokeOrbitRing(o, isMobile ? 0.10 : 0.14);
    });

    /* Corps lumineux voyageant sur les orbites + traînée de trajectoire */
    ctx.globalCompositeOperation = 'lighter';
    orbits.forEach(o => {
      if (!reduced) o.angle += o.speed * dt;
      const cosT = Math.cos(o.tilt), sinT = Math.sin(o.tilt);
      const ex = Math.cos(o.angle) * o.rH, ey = Math.sin(o.angle) * o.rV;
      const px = o.cx + ex * cosT - ey * sinT;
      const py = o.cy + ex * sinT + ey * cosT;

      if (o.trail) {
        // traînée : quelques points en arrière sur l'orbite
        for (let k = 1; k <= 10; k++) {
          const a2 = o.angle - k * 0.035;
          const ex2 = Math.cos(a2) * o.rH, ey2 = Math.sin(a2) * o.rV;
          const px2 = o.cx + ex2 * cosT - ey2 * sinT;
          const py2 = o.cy + ex2 * sinT + ey2 * cosT;
          const a = (1 - k / 10) * 0.35;
          ctx.fillStyle = `rgba(255,205,130,${a})`;
          ctx.beginPath();
          ctx.arc(px2, py2, o.dotR * (1 - k/14), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const glow = ctx.createRadialGradient(px, py, 0, px, py, o.dotR * 4);
      glow.addColorStop(0, 'rgba(255,225,180,0.9)');
      glow.addColorStop(1, 'rgba(255,225,180,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(px, py, o.dotR * 4, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#FFF6E8';
      ctx.beginPath(); ctx.arc(px, py, o.dotR, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';

    /* Cœur du soleil — disque net légèrement texturé, pas une sphère "réaliste" */
    const coreR = sunR * 0.42 * pulse;
    const coreG = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreR);
    coreG.addColorStop(0,   '#FFF8E8');
    coreG.addColorStop(0.5, '#FFD9A0');
    coreG.addColorStop(1,   '#F2A655');
    ctx.fillStyle = coreG;
    ctx.beginPath(); ctx.arc(sx, sy, coreR, 0, Math.PI * 2); ctx.fill();
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

  requestAnimationFrame(function init() {
    resize();
    animId = requestAnimationFrame(tick);
  });
})();
