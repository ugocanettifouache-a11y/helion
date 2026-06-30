/*!
 * Hélion — Terre vue de l'espace + Voie lactée (Canvas 2D, scène originale)
 * Limbe terrestre jour/nuit, lumières de villes, flare solaire, bande galactique
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
  function gauss() { return ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2; }

  /* ════════════════════════════════════════════════════════════════
   * TERRE — texture circulaire générée une fois (offscreen)
   * ════════════════════════════════════════════════════════════════ */
  const ES = isMobile ? 1500 : 2200;
  const earthCanvas = document.createElement('canvas');
  earthCanvas.width = earthCanvas.height = ES;
  const ectx = earthCanvas.getContext('2d');

  const ecx = ES / 2, ecy = ES / 2;
  const ER  = ES * 0.40; // rayon du globe dans la texture

  // Point du terminateur (où le soleil affleure) : sur le bord gauche du globe, sous le centre
  // (décalé pour laisser une large zone "jour" visible au-dessus, comme une vraie photo orbitale)
  const THETA0 = Math.PI - 0.38;
  const termX = ecx + Math.cos(THETA0) * ER;
  const termY = ecy + Math.sin(THETA0) * ER;
  // Direction "jour" perpendiculaire à l'axe centre→terminateur (jour = vers le haut)
  const dayDir = { x: -Math.sin(THETA0), y: Math.cos(THETA0) };

  function buildEarth() {
    ectx.clearRect(0, 0, ES, ES);

    ectx.save();
    ectx.beginPath();
    ectx.arc(ecx, ecy, ER, 0, Math.PI * 2);
    ectx.clip();

    /* Base jour/nuit : dégradé linéaire le long de l'axe jour↔nuit */
    const dGrad = ectx.createLinearGradient(
      ecx + dayDir.x * ER, ecy + dayDir.y * ER,
      ecx - dayDir.x * ER, ecy - dayDir.y * ER
    );
    dGrad.addColorStop(0.00, '#1E6FB8');
    dGrad.addColorStop(0.30, '#155A99');
    dGrad.addColorStop(0.46, '#0C3F73');
    dGrad.addColorStop(0.495,'#FFD9A8'); // fine bande chaude (diffusion atmosphérique au terminateur)
    dGrad.addColorStop(0.52, '#1A2233');
    dGrad.addColorStop(0.62, '#070B14');
    dGrad.addColorStop(1.00, '#020308');
    ectx.fillStyle = dGrad;
    ectx.fillRect(0, 0, ES, ES);

    function dayFactor(x, y) {
      return (x - ecx) * dayDir.x + (y - ecy) * dayDir.y; // >0 = jour, <0 = nuit
    }

    /* Continents flous sur la face jour (sous les nuages) */
    for (let i = 0; i < 26; i++) {
      const ang = rand(0, Math.PI * 2), rr = rand(ER * 0.15, ER * 0.85);
      const x = ecx + Math.cos(ang) * rr, y = ecy + Math.sin(ang) * rr;
      if (dayFactor(x, y) < ER * 0.08) continue;
      const rad = rand(ER * 0.10, ER * 0.26);
      const g = ectx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0,   'rgba(60,86,52,0.45)');
      g.addColorStop(0.7, 'rgba(50,72,46,0.18)');
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ectx.fillStyle = g;
      ectx.beginPath(); ectx.ellipse(x, y, rad, rad * rand(0.6, 0.9), ang, 0, Math.PI * 2); ectx.fill();
    }

    /* Nuages — uniquement face jour, traînées texturées (façon couverture nuageuse satellite).
       Dessinées sur une couche séparée très dense, puis légèrement adoucies (flou ciblé léger)
       pour fusionner les touches en voiles continus — sans retomber sur de grosses taches floues. */
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = cloudCanvas.height = ES;
    const cctx = cloudCanvas.getContext('2d');

    /* Voile de base : fine couverture nuageuse continue sur toute la face jour,
       pour qu'il n'y ait jamais de grand vide d'océan totalement dégagé. */
    const hazeN = isMobile ? 2200 : 4000;
    for (let i = 0; i < hazeN; i++) {
      const ang = rand(0, Math.PI * 2), rr = Math.pow(Math.random(), 0.5) * ER * 0.98;
      const x = ecx + Math.cos(ang) * rr, y = ecy + Math.sin(ang) * rr;
      if (dayFactor(x, y) < ER * 0.03) continue;
      cctx.fillStyle = `rgba(255,255,255,${rand(0.05, 0.16)})`;
      cctx.beginPath();
      cctx.arc(x, y, rand(ER * 0.004, ER * 0.011), 0, Math.PI * 2);
      cctx.fill();
    }

    const cloudBands = 60;
    for (let i = 0; i < cloudBands; i++) {
      const ang = rand(0, Math.PI * 2), rr = rand(0, ER * 0.97);
      let bx2 = ecx + Math.cos(ang) * rr, by2 = ecy + Math.sin(ang) * rr;
      if (dayFactor(bx2, by2) < ER * 0.04) continue;

      const dir = rand(0, Math.PI * 2);
      const segs = Math.floor(rand(22, 46));
      const stepLen = rand(ER * 0.005, ER * 0.011);
      let px2 = bx2, py2 = by2;
      const curve = rand(-0.04, 0.04);
      const bandAlpha = rand(0.35, 0.7);

      for (let s = 0; s < segs; s++) {
        const ndx = Math.cos(dir + curve * s), ndy = Math.sin(dir + curve * s);
        px2 += ndx * stepLen; py2 += ndy * stepLen;
        if (dayFactor(px2, py2) < ER * 0.0) continue;

        // touches nombreuses et très chevauchantes pour une texture dense continue
        const dabs = Math.floor(rand(4, 8));
        for (let d = 0; d < dabs; d++) {
          const ox = px2 + gauss() * stepLen * 2.2;
          const oy = py2 + gauss() * stepLen * 2.2;
          const r = rand(ER * 0.006, ER * 0.016);
          const alpha = bandAlpha * rand(0.5, 1) * (0.55 + 0.45 * Math.sin(s * 1.3 + i));
          cctx.fillStyle = `rgba(255,255,255,${Math.max(0.04, alpha).toFixed(3)})`;
          cctx.beginPath();
          cctx.arc(ox, oy, r, 0, Math.PI * 2);
          cctx.fill();
        }
      }
    }

    ectx.save();
    ectx.filter = `blur(${(ES * 0.0016).toFixed(1)}px)`;
    ectx.drawImage(cloudCanvas, 0, 0);
    ectx.restore();
    // seconde passe nette par-dessus pour garder un peu de relief texturé
    ectx.save();
    ectx.globalAlpha = 0.45;
    ectx.drawImage(cloudCanvas, 0, 0);
    ectx.restore();

    /* Lumières de villes — uniquement face nuit, en amas (façon côtes/métropoles) */
    const clusters = isMobile ? 34 : 56;
    ectx.globalCompositeOperation = 'lighter';
    for (let c = 0; c < clusters; c++) {
      const ang = rand(0, Math.PI * 2), rr = rand(ER * 0.10, ER * 0.94);
      const cx2 = ecx + Math.cos(ang) * rr, cy2 = ecy + Math.sin(ang) * rr;
      if (dayFactor(cx2, cy2) > -ER * 0.03) continue;
      const n = Math.floor(rand(16, 42));
      const spread = rand(ER * 0.025, ER * 0.085);
      for (let i = 0; i < n; i++) {
        const x = cx2 + gauss() * spread;
        const y = cy2 + gauss() * spread;
        if (dayFactor(x, y) > -ER * 0.01) continue;
        const big = Math.random() < 0.12;
        ectx.fillStyle = Math.random() < 0.7
          ? `rgba(255,200,120,${rand(0.5, 0.95)})`
          : `rgba(255,235,190,${rand(0.4, 0.8)})`;
        ectx.beginPath();
        ectx.arc(x, y, big ? rand(1.4, 2.4) : rand(0.5, 1.1), 0, Math.PI * 2);
        ectx.fill();
      }
    }
    ectx.globalCompositeOperation = 'source-over';

    /* Vignettage de rondeur (assombrit le limbe pour le volume sphérique) */
    const vg = ectx.createRadialGradient(ecx, ecy, ER * 0.68, ecx, ecy, ER);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.40)');
    ectx.fillStyle = vg;
    ectx.beginPath(); ectx.arc(ecx, ecy, ER, 0, Math.PI * 2); ectx.fill();

    ectx.restore(); // fin du clip circulaire

    /* Halo atmosphérique (hors du disque) */
    ectx.globalCompositeOperation = 'lighter';
    [
      { r: ER * 1.015, w: ER * 0.018, col: '120,180,255', a: 0.55 },
      { r: ER * 1.05,  w: ER * 0.05,  col: '90,150,255',  a: 0.22 },
      { r: ER * 1.12,  w: ER * 0.10,  col: '70,120,220',  a: 0.10 },
    ].forEach(({ r, w, col, a }) => {
      ectx.strokeStyle = `rgba(${col},${a})`;
      ectx.lineWidth = w;
      ectx.beginPath();
      ectx.arc(ecx, ecy, r, 0, Math.PI * 2);
      ectx.stroke();
    });

    /* Flare solaire au point du terminateur — cœur net + halos + aigrettes */
    [
      { r: ER * 0.018, col: '255,255,250', a: 1.00 },
      { r: ER * 0.045, col: '230,245,255', a: 0.85 },
      { r: ER * 0.095, col: '150,210,255', a: 0.45 },
      { r: ER * 0.18,  col: '90,170,255',  a: 0.22 },
      { r: ER * 0.32,  col: '60,130,230',  a: 0.10 },
    ].forEach(({ r, col, a }) => {
      const g = ectx.createRadialGradient(termX, termY, 0, termX, termY, r);
      g.addColorStop(0,   `rgba(${col},${a})`);
      g.addColorStop(0.5, `rgba(${col},${(a*0.35).toFixed(3)})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ectx.fillStyle = g;
      ectx.beginPath(); ectx.arc(termX, termY, r, 0, Math.PI * 2); ectx.fill();
    });

    const spikeLen = ER * 0.55;
    [0, Math.PI / 2, Math.PI * 0.5 + 0.5, Math.PI * 0.5 - 0.5].forEach((ang, i) => {
      const len = i < 2 ? spikeLen : spikeLen * 0.5;
      const w   = i < 2 ? 2.6 : 1.2;
      const g = ectx.createLinearGradient(
        termX - Math.cos(ang) * len, termY - Math.sin(ang) * len,
        termX + Math.cos(ang) * len, termY + Math.sin(ang) * len
      );
      g.addColorStop(0,   'rgba(200,225,255,0)');
      g.addColorStop(0.47,'rgba(200,225,255,0.12)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.65)');
      g.addColorStop(0.53,'rgba(200,225,255,0.12)');
      g.addColorStop(1,   'rgba(200,225,255,0)');
      ectx.strokeStyle = g;
      ectx.lineWidth = w;
      ectx.beginPath();
      ectx.moveTo(termX - Math.cos(ang) * len, termY - Math.sin(ang) * len);
      ectx.lineTo(termX + Math.cos(ang) * len, termY + Math.sin(ang) * len);
      ectx.stroke();
    });
    ectx.globalCompositeOperation = 'source-over';
  }

  buildEarth();

  /* ════════════════════════════════════════════════════════════════
   * VOIE LACTÉE — bande diagonale (couche brute + flou, comme une nébuleuse)
   * ════════════════════════════════════════════════════════════════ */
  let mwRaw, mwCtx, mwFinal, mwFctx, MW_W = 0, MW_H = 0;

  function buildMilkyWay(W, H) {
    MW_W = W; MW_H = H;
    mwRaw = document.createElement('canvas');
    mwRaw.width = W; mwRaw.height = H;
    mwCtx = mwRaw.getContext('2d');

    mwFinal = document.createElement('canvas');
    mwFinal.width = W; mwFinal.height = H;
    mwFctx = mwFinal.getContext('2d');

    // Ligne de bande : diagonale, ancrée dans le tiers gauche
    const bx = W * 0.30, by = H * 0.46;
    const bAngle = -1.22; // radians, quasi verticale, légère inclinaison
    const dirX = Math.cos(bAngle), dirY = Math.sin(bAngle);
    const bandLen = Math.max(W, H) * 1.7;

    mwCtx.globalCompositeOperation = 'lighter';

    const n = isMobile ? 4200 : 7800;
    for (let i = 0; i < n; i++) {
      const t = rand(-0.55, 0.55); // position le long de la bande
      const core = Math.exp(-Math.pow(t * 2.1, 2)); // densité plus forte au centre de bande
      const width = (18 + (1 - core) * 70) * (isMobile ? 0.8 : 1);
      const along = t * bandLen;
      const px = bx + dirX * along - dirY * (gauss() * width);
      const py = by + dirY * along + dirX * (gauss() * width);
      if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue;

      const hueRoll = Math.random();
      let col;
      if (hueRoll < 0.14) col = `rgba(255,200,150,${rand(0.10, 0.28) * (0.4+core)})`; // poussière chaude
      else if (hueRoll < 0.65) col = `rgba(${210+rand(-20,20)|0},${220+rand(-15,15)|0},255,${rand(0.15,0.45)*(0.4+core)})`;
      else col = `rgba(255,238,220,${rand(0.12,0.35)*(0.4+core)})`;

      mwCtx.fillStyle = col;
      mwCtx.beginPath();
      mwCtx.arc(px, py, rand(0.4, 1.4), 0, Math.PI * 2);
      mwCtx.fill();
    }

    // nuages de poussière le long de la bande
    const dustN = isMobile ? 30 : 55;
    for (let i = 0; i < dustN; i++) {
      const t = rand(-0.5, 0.5);
      const core = Math.exp(-Math.pow(t * 2.1, 2));
      const along = t * bandLen;
      const perp = gauss() * (20 + (1-core) * 60);
      const x = bx + dirX * along - dirY * perp;
      const y = by + dirY * along + dirX * perp;
      const rad = rand(40, 130) * (0.5 + core);
      const isWarm = Math.random() < 0.45;
      const c = isWarm ? '160,110,70' : '60,90,160';
      const g = mwCtx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0,   `rgba(${c},${rand(0.05,0.13)})`);
      g.addColorStop(0.6, `rgba(${c},${rand(0.02,0.05)})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      mwCtx.fillStyle = g;
      mwCtx.beginPath(); mwCtx.arc(x, y, rad, 0, Math.PI * 2); mwCtx.fill();
    }

    mwCtx.globalCompositeOperation = 'source-over';

    // composite flouté dans la couche finale
    mwFctx.save();
    mwFctx.filter = 'blur(2.2px)';
    mwFctx.drawImage(mwRaw, 0, 0);
    mwFctx.restore();
    mwFctx.save();
    mwFctx.globalAlpha = 0.5;
    mwFctx.filter = 'blur(0.6px)';
    mwFctx.drawImage(mwRaw, 0, 0);
    mwFctx.restore();
  }

  /* ════════════════════════════════════════════════════════════════
   * Champ d'étoiles d'arrière-plan
   * ════════════════════════════════════════════════════════════════ */
  let bgStars = [];
  function buildBgStars(W, H) {
    const n = isMobile ? 160 : 300;
    bgStars = [];
    for (let i = 0; i < n; i++) {
      bgStars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() < 0.15 ? rand(1.0, 1.7) : rand(0.4, 0.9),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.4, 1.1),
        warm: Math.random() < 0.2,
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
    buildMilkyWay(W, H);
  }
  window.addEventListener('resize', resize);

  /* ── Parallax souris ─────────────────────────────────────────────── */
  let mouseX = 0, mouseY = 0, camX = 0, camY = 0;
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2.0;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2.0;
  });

  /* ── Position de la Terre (bord droit, hors-champ, façon photo orbitale) ──
   * Échelle basée sur la hauteur de viewport VISIBLE, pas sur la hauteur totale
   * du hero (qui peut dépasser 100vh si le contenu textuel est long). ── */
  function viewH() {
    return Math.min(H, window.innerHeight || H);
  }
  function earthScale() {
    return (viewH() * (isMobile ? 0.70 : 0.80)) / ER;
  }
  function earthCenter() {
    return { x: W * (isMobile ? 1.16 : 1.06), y: viewH() * 0.50 };
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
    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, W, H);

    if (!reduced) {
      camX += (mouseX - camX) * 0.03;
      camY += (mouseY - camY) * 0.03;
    }

    /* Voie lactée (parallax léger, légère dérive) */
    if (mwFinal) {
      const mwPx = camX * 10, mwPy = camY * 7;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(mwFinal, mwPx, mwPy);
      ctx.globalAlpha = 1;
    }

    /* Étoiles d'arrière-plan (scintillement + parallax) */
    const starPx = camX * 16, starPy = camY * 10;
    bgStars.forEach(s => {
      const tw = reduced ? 1 : 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = tw;
      ctx.fillStyle = s.warm ? '#FFE3B0' : '#EAF0FF';
      ctx.beginPath();
      ctx.arc(s.x + starPx, s.y + starPy, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    /* Terre (parallax plus marqué = plus proche) */
    const { x: gx, y: gy } = earthCenter();
    const scale = earthScale();
    const ePx = camX * 22, ePy = camY * 14;

    ctx.save();
    ctx.translate(gx + ePx, gy + ePy);
    ctx.scale(scale, scale);
    ctx.drawImage(earthCanvas, -ecx, -ecy);
    ctx.restore();

    /* Pulsation douce du flare solaire */
    if (!reduced) {
      const pulse = 0.85 + 0.15 * Math.sin(time * 0.45);
      const fx = gx + ePx + (termX - ecx) * scale;
      const fy = gy + ePy + (termY - ecy) * scale;
      const r = ER * 0.10 * scale * pulse;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
      g.addColorStop(0, 'rgba(220,240,255,0.20)');
      g.addColorStop(1, 'rgba(220,240,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
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
