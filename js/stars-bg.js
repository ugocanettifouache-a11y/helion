/*!
 * Hélion — Champ d'étoiles pleine page (canvas fixe, z-index:-1)
 */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  /* ── Créer le canvas fixe ── */
  const canvas = document.createElement('canvas');
  canvas.id = 'starsCanvas';
  canvas.style.cssText = [
    'position:fixed',
    'top:0', 'left:0',
    'width:100vw', 'height:100vh',
    'pointer-events:none',
    'z-index:0',
  ].join(';');
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ── Étoiles ── */
  let stars = [], nebulas = [];
  let W = 0, H = 0, dpr = 1;

  function build(w, h) {
    const n = isMobile ? 140 : 280;
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.08 ? rand(1.2, 1.9) : rand(0.3, 0.85),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.2, 0.8),
        hue: Math.random() < 0.15 ? rand(200, 230) : 220, // mostly blue-white, quelques colorées
      });
    }

    /* Quelques nuages nébuleux subtils */
    nebulas = [];
    const nb = isMobile ? 3 : 5;
    for (let i = 0; i < nb; i++) {
      nebulas.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(80, 200),
        col: Math.random() < 0.5 ? '80,100,180' : '120,60,140',
        a: rand(0.015, 0.04),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function resize() {
    W = window.innerWidth  || 1280;
    H = window.innerHeight || 800;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build(W, H);
  }
  window.addEventListener('resize', resize);

  /* ── Parallax ── */
  let mouseX = 0, mouseY = 0, camX = 0, camY = 0;
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / W - 0.5) * 2;
    mouseY = (e.clientY / H - 0.5) * 2;
  });

  /* ── Boucle ── */
  let animId = null, lastTs = performance.now();

  function tick(ts) {
    animId = requestAnimationFrame(tick);
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;
    const time = ts * 0.001;

    ctx.clearRect(0, 0, W, H);

    /* Fond dégradé profond */
    const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
    bg.addColorStop(0,   '#03050e');
    bg.addColorStop(0.5, '#04071a');
    bg.addColorStop(1,   '#02040c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (!reduced) {
      camX += (mouseX - camX) * 0.015;
      camY += (mouseY - camY) * 0.015;
    }

    const px = camX * 8, py = camY * 5;

    /* Nébuleuses */
    nebulas.forEach(n => {
      const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(time * 0.3 + n.phase);
      const g = ctx.createRadialGradient(
        n.x + px * 0.4, n.y + py * 0.4, 0,
        n.x + px * 0.4, n.y + py * 0.4, n.r * pulse
      );
      g.addColorStop(0, `rgba(${n.col},${n.a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x + px * 0.4, n.y + py * 0.4, n.r * pulse, 0, Math.PI * 2);
      ctx.fill();
    });

    /* Étoiles scintillantes */
    stars.forEach(s => {
      const twinkle = reduced ? 0.75 : 0.3 + 0.7 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = twinkle * (s.r > 1 ? 0.95 : 0.7);
      ctx.fillStyle = s.hue === 220
        ? `hsl(${s.hue},30%,92%)`
        : `hsl(${s.hue},60%,85%)`;
      ctx.beginPath();
      ctx.arc(s.x + px, s.y + py, s.r, 0, Math.PI * 2);
      ctx.fill();

      /* Petite croix de diffraction sur les étoiles les plus brillantes */
      if (s.r > 1.1 && !reduced) {
        ctx.globalAlpha = twinkle * 0.25;
        ctx.strokeStyle = `hsl(${s.hue},40%,90%)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.x + px - s.r * 3, s.y + py);
        ctx.lineTo(s.x + px + s.r * 3, s.y + py);
        ctx.moveTo(s.x + px, s.y + py - s.r * 3);
        ctx.lineTo(s.x + px, s.y + py + s.r * 3);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId); animId = null;
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
