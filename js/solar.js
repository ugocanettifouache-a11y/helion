/*!
 * Hélion — Galaxie spirale cinématographique (Canvas 2D)
 * Cœur lumineux doré · Bras spiraux étoilés · Poussière cosmique
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

  /* ── Galaxie offscreen (générée une fois, redessinée au resize majeur) ── */
  const GS = isMobile ? 1100 : 1700; // taille de la texture galaxie

  // Couche "brute" (bras + poussière + halo) — sera adoucie par un flou,
  // pour un rendu nébuleux/photographique plutôt que des points nets.
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = rawCanvas.height = GS;
  const rctx = rawCanvas.getContext('2d');

  // Couche finale composée (brute floutée + cœur net + aigrettes nettes)
  const galaxyCanvas = document.createElement('canvas');
  galaxyCanvas.width = galaxyCanvas.height = GS;
  const gctx = galaxyCanvas.getContext('2d');

  function rand(min, max) { return min + Math.random() * (max - min); }
  // Approximation gaussienne (somme de 3 uniformes) : queue plus naturelle qu'un random() plat
  function gauss() { return ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2; }

  function buildGalaxy() {
    rctx.clearRect(0, 0, GS, GS);
    gctx.clearRect(0, 0, GS, GS);
    const cx = GS / 2, cy = GS / 2;
    const ellipse = 0.58; // aplatissement vertical (vue en angle)

    rctx.globalCompositeOperation = 'lighter';

    /* Voile de disque diffus (sous les bras) — évite l'effet "rubans" trop nets */
    rctx.save();
    rctx.translate(cx, cy);
    rctx.scale(1, ellipse);
    const diskLayers = [
      { r: GS * 0.46, col: '120,140,210', a: 0.07 },
      { r: GS * 0.34, col: '160,150,200', a: 0.09 },
      { r: GS * 0.20, col: '230,190,140', a: 0.13 },
    ];
    diskLayers.forEach(({ r, col, a }) => {
      const g = rctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0,   `rgba(${col},${a})`);
      g.addColorStop(0.7, `rgba(${col},${(a*0.4).toFixed(3)})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      rctx.fillStyle = g;
      rctx.beginPath();
      rctx.arc(0, 0, r, 0, Math.PI * 2);
      rctx.fill();
    });
    rctx.restore();

    /* Bras spiraux : poussière + étoiles */
    const ARMS = 4;
    const turns = 1.85;
    const maxR  = GS * 0.47;
    const starsPerArm = isMobile ? 3400 : 6000;

    /* Poussière fine éparpillée dans tout le disque (comble les vides entre bras) */
    const haze = isMobile ? 3200 : 6000;
    for (let i = 0; i < haze; i++) {
      const t = Math.pow(Math.random(), 0.5);
      const theta = Math.random() * Math.PI * 2;
      const r = 20 + t * maxR;
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r * ellipse;
      if (x < 0 || x > GS || y < 0 || y > GS) continue;
      const b = rand(0.05, 0.20) * (1 - t * 0.5);
      rctx.fillStyle = `rgba(${rand(150,255)|0},${rand(160,230)|0},${rand(190,255)|0},${b})`;
      rctx.beginPath();
      rctx.arc(x, y, rand(0.4, 1.3), 0, Math.PI * 2);
      rctx.fill();
    }

    for (let a = 0; a < ARMS; a++) {
      const phase = (a / ARMS) * Math.PI * 2 + rand(-0.1, 0.1);
      for (let i = 0; i < starsPerArm; i++) {
        const t = Math.pow(Math.random(), 0.62); // densité plus forte près du centre
        const theta = phase + t * turns * Math.PI * 2;
        const baseR = 18 + t * maxR;

        const x0 = cx + Math.cos(theta) * baseR;
        const y0 = cy + Math.sin(theta) * baseR * ellipse;

        // dispersion 2D isotrope autour de l'axe du bras (largeur croît avec le rayon)
        const armWidth = 14 + t * 95;
        const x = x0 + gauss() * armWidth;
        const y = y0 + gauss() * armWidth * ellipse;

        if (x < 0 || x > GS || y < 0 || y > GS) continue;

        // couleur : centre doré → bras bleu/blanc, quelques poches roses (régions HII)
        const distFactor = Math.min(1, baseR / maxR);
        const hueRoll = Math.random();
        let col;
        if (hueRoll < 0.10 && distFactor > 0.25) {
          col = `rgba(255,170,190,${rand(0.10, 0.30)})`;   // rose nébuleuse
        } else if (hueRoll < 0.55) {
          col = `rgba(${190 + Math.floor(distFactor*60)},${205 + Math.floor(distFactor*40)},255,${rand(0.18, 0.55)})`; // bleu-blanc
        } else {
          col = `rgba(255,${235 - Math.floor(distFactor*40)},${200 - Math.floor(distFactor*80)},${rand(0.15, 0.45)})`; // blanc-doré
        }

        const size = (1 - distFactor) * rand(0.6, 1.6) + rand(0.35, 1.1);
        rctx.fillStyle = col;
        rctx.beginPath();
        rctx.arc(x, y, Math.max(0.35, size), 0, Math.PI * 2);
        rctx.fill();
      }
    }

    /* Nuages de poussière diffuse le long des bras */
    const dustClouds = isMobile ? 40 : 70;
    for (let i = 0; i < dustClouds; i++) {
      const t = Math.pow(Math.random(), 0.7);
      const arm = Math.floor(Math.random() * ARMS);
      const phase = (arm / ARMS) * Math.PI * 2;
      const theta = phase + t * turns * Math.PI * 2 + rand(-0.3, 0.3);
      const r = 60 + t * maxR;
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r * ellipse;
      const rad = rand(50, 160) * (0.4 + t);

      const g = rctx.createRadialGradient(x, y, 0, x, y, rad);
      const isPink = Math.random() < 0.3;
      const c = isPink ? '200,90,120' : '70,100,190';
      g.addColorStop(0,   `rgba(${c},${rand(0.06, 0.16)})`);
      g.addColorStop(0.6, `rgba(${c},${rand(0.03, 0.07)})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      rctx.fillStyle = g;
      rctx.beginPath();
      rctx.arc(x, y, rad, 0, Math.PI * 2);
      rctx.fill();
    }

    rctx.globalCompositeOperation = 'source-over';

    /* Composite : couche brute adoucie (nébuleuse) dans la texture finale */
    gctx.save();
    gctx.filter = `blur(${(GS * 0.0034).toFixed(1)}px)`;
    gctx.drawImage(rawCanvas, 0, 0);
    gctx.restore();
    // seconde passe plus fine pour garder un peu de texture stellaire (moins lissée)
    gctx.save();
    gctx.globalAlpha = 0.55;
    gctx.filter = `blur(${(GS * 0.0009).toFixed(1)}px)`;
    gctx.drawImage(rawCanvas, 0, 0);
    gctx.restore();

    /* Cœur galactique lumineux (par-dessus, en mode lighter pour le glow) */
    gctx.globalCompositeOperation = 'lighter';
    const coreLayers = [
      { r: GS * 0.018, col: '255,252,240', a: 1.00 },
      { r: GS * 0.045, col: '255,236,190', a: 0.95 },
      { r: GS * 0.090, col: '255,205,120', a: 0.55 },
      { r: GS * 0.165, col: '255,180,90',  a: 0.30 },
      { r: GS * 0.260, col: '255,160,70',  a: 0.14 },
      { r: GS * 0.380, col: '230,150,90',  a: 0.06 },
    ];
    coreLayers.forEach(({ r, col, a }) => {
      const g = gctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,   `rgba(${col},${a})`);
      g.addColorStop(0.5, `rgba(${col},${(a*0.35).toFixed(3)})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      gctx.fillStyle = g;
      gctx.beginPath();
      gctx.arc(cx, cy, r, 0, Math.PI * 2);
      gctx.fill();
    });

    /* Aigrettes de diffraction — signature optique des photos d'étoiles réelles */
    const spikeLen = GS * 0.30;
    [0, Math.PI/2, Math.PI*0.78, Math.PI*1.28].forEach((ang, i) => {
      const len = i < 2 ? spikeLen : spikeLen * 0.55;
      const w   = i < 2 ? 2.4 : 1.3;
      const g = gctx.createLinearGradient(
        cx - Math.cos(ang) * len, cy - Math.sin(ang) * len,
        cx + Math.cos(ang) * len, cy + Math.sin(ang) * len
      );
      g.addColorStop(0,   'rgba(255,235,200,0)');
      g.addColorStop(0.46,'rgba(255,235,200,0.10)');
      g.addColorStop(0.5, 'rgba(255,248,230,0.55)');
      g.addColorStop(0.54,'rgba(255,235,200,0.10)');
      g.addColorStop(1,   'rgba(255,235,200,0)');
      gctx.strokeStyle = g;
      gctx.lineWidth = w;
      gctx.beginPath();
      gctx.moveTo(cx - Math.cos(ang) * len, cy - Math.sin(ang) * len);
      gctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      gctx.stroke();
    });

    gctx.globalCompositeOperation = 'source-over';
  }

  buildGalaxy();

  /* ── Champ d'étoiles d'arrière-plan (couche séparée, parallax + scintillement) ── */
  let bgStars = [];
  function buildBgStars(W, H) {
    const n = isMobile ? 180 : 340;
    bgStars = [];
    for (let i = 0; i < n; i++) {
      bgStars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() < 0.15 ? rand(1.1, 1.8) : rand(0.4, 0.9),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.4, 1.1),
        warm: Math.random() < 0.25,
      });
    }
  }

  /* ── Dimensionnement ─────────────────────────────────────────────── */
  let W = 0, H = 0, dpr = 1;
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
    buildBgStars(W, H);
  }
  window.addEventListener('resize', resize);

  /* ── Parallax souris ─────────────────────────────────────────────── */
  let mouseX = 0, mouseY = 0, camX = 0, camY = 0;
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2.0;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2.0;
  });

  /* ── Position de la galaxie dans la scène (composition façon hero) ── */
  // Centre placé à droite, légèrement en hauteur — bleed hors cadre comme une vraie photo.
  function galaxyCenter() {
    return { x: W * 0.74, y: H * 0.46 };
  }
  function galaxyScale() {
    // La texture doit couvrir largement le viewport (effet immersif, recadré)
    const base = Math.max(W, H) * (isMobile ? 1.55 : 1.35);
    return base / GS;
  }

  /* ── Boucle de rendu ─────────────────────────────────────────────── */
  let angle = 0;
  let animId = null;
  let lastTs = performance.now();

  function tick(ts) {
    animId = requestAnimationFrame(tick);
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;
    const time = ts * 0.001;

    ctx.clearRect(0, 0, W, H);

    // fond nuit profonde
    ctx.fillStyle = '#020308';
    ctx.fillRect(0, 0, W, H);

    if (!reduced) {
      camX += (mouseX - camX) * 0.03;
      camY += (mouseY - camY) * 0.03;
      angle += dt * 0.000018; // rotation lente mais perceptible
    }

    // étoiles d'arrière-plan (parallax léger + scintillement)
    const starParallaxX = camX * 14;
    const starParallaxY = camY * 9;
    bgStars.forEach(s => {
      const tw = reduced ? 1 : 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = tw;
      ctx.fillStyle = s.warm ? '#FFE3B0' : '#EAF0FF';
      ctx.beginPath();
      ctx.arc(s.x + starParallaxX, s.y + starParallaxY, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // galaxie (rotation lente + parallax plus prononcé que les étoiles lointaines)
    const { x: gx, y: gy } = galaxyCenter();
    const scale = galaxyScale();
    const galParallaxX = camX * 26;
    const galParallaxY = camY * 16;

    ctx.save();
    ctx.translate(gx + galParallaxX, gy + galParallaxY);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.drawImage(galaxyCanvas, -GS / 2, -GS / 2);
    ctx.restore();

    // pulsation douce du cœur (halo additionnel, repère l'œil)
    if (!reduced) {
      const pulse = 0.85 + 0.15 * Math.sin(time * 0.5);
      const coreR = GS * 0.07 * scale * pulse;
      const g = ctx.createRadialGradient(gx + galParallaxX, gy + galParallaxY, 0, gx + galParallaxX, gy + galParallaxY, coreR);
      g.addColorStop(0, 'rgba(255,225,170,0.18)');
      g.addColorStop(1, 'rgba(255,225,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx + galParallaxX, gy + galParallaxY, coreR, 0, Math.PI * 2);
      ctx.fill();
    }
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
