/*!
 * Hélion — Système solaire cinématographique (Canvas 2D, scène originale)
 * Soleil enflammé (plasma + couronne), Terre, Mars, petite lune — éclairage cohérent
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
   * SOLEIL — plasma texturé + tendances de flammes + couronne
   * ════════════════════════════════════════════════════════════════ */
  const SS = isMobile ? 1300 : 1900;
  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = sunCanvas.height = SS;
  const sctx = sunCanvas.getContext('2d');
  const scx = SS / 2, scy = SS / 2;
  const SR = SS * 0.27;

  function buildSun() {
    sctx.clearRect(0, 0, SS, SS);

    /* Couche brute : plasma + tendances de flammes (sera légèrement adoucie) */
    const rawC = document.createElement('canvas');
    rawC.width = rawC.height = SS;
    const rctx = rawC.getContext('2d');

    rctx.globalCompositeOperation = 'lighter';

    // Disque de base
    const baseG = rctx.createRadialGradient(scx, scy, 0, scx, scy, SR);
    baseG.addColorStop(0,    '#FFF3C4');
    baseG.addColorStop(0.35, '#FFD15C');
    baseG.addColorStop(0.62, '#FF9A1F');
    baseG.addColorStop(0.85, '#FF5C1A');
    baseG.addColorStop(1,    '#C82F0A');
    rctx.fillStyle = baseG;
    rctx.beginPath(); rctx.arc(scx, scy, SR, 0, Math.PI * 2); rctx.fill();

    // Granulation / texture de plasma (taches denses, façon convection solaire)
    const grainN = isMobile ? 3200 : 5600;
    for (let i = 0; i < grainN; i++) {
      const ang = rand(0, Math.PI * 2), rr = Math.pow(Math.random(), 0.55) * SR * 0.98;
      const x = scx + Math.cos(ang) * rr, y = scy + Math.sin(ang) * rr;
      const hot = Math.random() < 0.5;
      const col = hot ? `rgba(255,235,160,${rand(0.10,0.30)})` : `rgba(200,50,10,${rand(0.10,0.28)})`;
      rctx.fillStyle = col;
      rctx.beginPath();
      rctx.arc(x, y, rand(SR*0.006, SR*0.022), 0, Math.PI * 2);
      rctx.fill();
    }

    // Taches/filaments plus sombres (régions actives)
    for (let i = 0; i < (isMobile ? 16 : 26); i++) {
      const ang = rand(0, Math.PI * 2), rr = rand(0, SR * 0.85);
      const x = scx + Math.cos(ang) * rr, y = scy + Math.sin(ang) * rr;
      const rad = rand(SR*0.04, SR*0.11);
      const g = rctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0,   'rgba(150,30,5,0.35)');
      g.addColorStop(0.7, 'rgba(150,30,5,0.14)');
      g.addColorStop(1,   'rgba(0,0,0,0)');
      rctx.fillStyle = g;
      rctx.beginPath(); rctx.arc(x, y, rad, 0, Math.PI * 2); rctx.fill();
    }

    rctx.globalCompositeOperation = 'source-over';

    // Composite adouci dans la texture finale (à l'intérieur du disque uniquement)
    sctx.save();
    sctx.beginPath(); sctx.arc(scx, scy, SR, 0, Math.PI * 2); sctx.clip();
    sctx.filter = `blur(${(SS*0.0014).toFixed(1)}px)`;
    sctx.drawImage(rawC, 0, 0);
    sctx.filter = 'none';
    sctx.globalAlpha = 0.6;
    sctx.drawImage(rawC, 0, 0);
    sctx.globalAlpha = 1;
    // assombrissement du limbe pour le volume
    const vg = sctx.createRadialGradient(scx, scy, SR*0.6, scx, scy, SR);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(90,10,0,0.35)');
    sctx.fillStyle = vg;
    sctx.beginPath(); sctx.arc(scx, scy, SR, 0, Math.PI * 2); sctx.fill();
    sctx.restore();

    /* Tendances de flammes débordant du disque (couronne irrégulière) */
    sctx.globalCompositeOperation = 'lighter';
    const flares = isMobile ? 22 : 32;
    for (let i = 0; i < flares; i++) {
      const ang = rand(0, Math.PI * 2);
      const len = SR * rand(0.10, 0.40);
      const baseX = scx + Math.cos(ang) * SR * rand(0.90, 0.99);
      const baseY = scy + Math.sin(ang) * SR * rand(0.90, 0.99);
      const segs = Math.floor(rand(6, 14));
      let px = baseX, py = baseY;
      let a = ang + rand(-0.15, 0.15);
      for (let s = 0; s < segs; s++) {
        a += rand(-0.12, 0.12);
        const step = (len / segs);
        px += Math.cos(a) * step;
        py += Math.sin(a) * step;
        const r = (1 - s/segs) * rand(SR*0.018, SR*0.045);
        const alpha = (1 - s/segs) * rand(0.18, 0.40);
        const col = Math.random() < 0.5 ? `rgba(255,140,40,${alpha})` : `rgba(255,200,90,${alpha})`;
        sctx.fillStyle = col;
        sctx.beginPath(); sctx.arc(px, py, Math.max(1, r), 0, Math.PI * 2); sctx.fill();
      }
    }
    sctx.globalCompositeOperation = 'source-over';

    /* Halo / couronne lumineuse (plusieurs couches, large bleed) */
    sctx.globalCompositeOperation = 'lighter';
    [
      { r: SR * 1.06, col: '255,210,120', a: 0.55 },
      { r: SR * 1.25, col: '255,170,70',  a: 0.30 },
      { r: SR * 1.6,  col: '255,130,40',  a: 0.16 },
      { r: SR * 2.2,  col: '255,100,30',  a: 0.08 },
      { r: SR * 3.0,  col: '255,80,20',   a: 0.04 },
    ].forEach(({ r, col, a }) => {
      const g = sctx.createRadialGradient(scx, scy, SR*0.85, scx, scy, r);
      g.addColorStop(0, `rgba(${col},${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = g;
      sctx.beginPath(); sctx.arc(scx, scy, r, 0, Math.PI * 2); sctx.fill();
    });

    /* Cœur très lumineux + aigrettes de diffraction */
    const coreG = sctx.createRadialGradient(scx, scy, 0, scx, scy, SR*0.5);
    coreG.addColorStop(0, 'rgba(255,250,235,0.55)');
    coreG.addColorStop(1, 'rgba(255,250,235,0)');
    sctx.fillStyle = coreG;
    sctx.beginPath(); sctx.arc(scx, scy, SR*0.5, 0, Math.PI * 2); sctx.fill();

    const spikeLen = SR * 1.9;
    [0, Math.PI/2, Math.PI*0.25, Math.PI*0.75].forEach((ang, i) => {
      const len = i < 2 ? spikeLen : spikeLen * 0.55;
      const w   = i < 2 ? SR*0.012 : SR*0.006;
      const g = sctx.createLinearGradient(
        scx - Math.cos(ang)*len, scy - Math.sin(ang)*len,
        scx + Math.cos(ang)*len, scy + Math.sin(ang)*len
      );
      g.addColorStop(0,   'rgba(255,220,160,0)');
      g.addColorStop(0.46,'rgba(255,220,160,0.10)');
      g.addColorStop(0.5, 'rgba(255,245,220,0.45)');
      g.addColorStop(0.54,'rgba(255,220,160,0.10)');
      g.addColorStop(1,   'rgba(255,220,160,0)');
      sctx.strokeStyle = g;
      sctx.lineWidth = w;
      sctx.beginPath();
      sctx.moveTo(scx - Math.cos(ang)*len, scy - Math.sin(ang)*len);
      sctx.lineTo(scx + Math.cos(ang)*len, scy + Math.sin(ang)*len);
      sctx.stroke();
    });
    sctx.globalCompositeOperation = 'source-over';
  }

  buildSun();

  /* ════════════════════════════════════════════════════════════════
   * Générateur générique de planète/lune (sphère éclairée + cratères)
   * ════════════════════════════════════════════════════════════════ */
  function buildPlanetTexture(size, R, dayDir, palette) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const pctx = c.getContext('2d');
    const cx = size/2, cy = size/2;

    pctx.save();
    pctx.beginPath(); pctx.arc(cx, cy, R, 0, Math.PI*2); pctx.clip();

    const dGrad = pctx.createLinearGradient(
      cx + dayDir.x*R, cy + dayDir.y*R,
      cx - dayDir.x*R, cy - dayDir.y*R
    );
    palette.stops.forEach(([pos, col]) => dGrad.addColorStop(pos, col));
    pctx.fillStyle = dGrad;
    pctx.fillRect(0, 0, size, size);

    function dayFactor(x, y) { return (x-cx)*dayDir.x + (y-cy)*dayDir.y; }

    if (palette.craters) {
      const n = isMobile ? 60 : 95;
      for (let i = 0; i < n; i++) {
        const ang = rand(0, Math.PI*2), rr = rand(0, R*0.96);
        const x = cx + Math.cos(ang)*rr, y = cy + Math.sin(ang)*rr;
        const rad = rand(R*0.02, R*0.10);
        const lit = dayFactor(x,y) > 0;
        const shade = lit ? 0.30 : 0.12;
        const g = pctx.createRadialGradient(x - rad*0.25, y - rad*0.25, 0, x, y, rad);
        g.addColorStop(0,   `rgba(255,255,255,${lit ? rand(0.08,0.18) : 0.03})`);
        g.addColorStop(0.5, `rgba(0,0,0,${shade*0.4})`);
        g.addColorStop(1,   `rgba(0,0,0,${shade})`);
        pctx.fillStyle = g;
        pctx.beginPath(); pctx.arc(x, y, rad, 0, Math.PI*2); pctx.fill();
      }
    }

    if (palette.clouds) {
      const cloudC = document.createElement('canvas');
      cloudC.width = cloudC.height = size;
      const cctx = cloudC.getContext('2d');
      const hazeN = isMobile ? 3000 : 5500;
      for (let i = 0; i < hazeN; i++) {
        const ang = rand(0, Math.PI*2), rr = Math.pow(Math.random(),0.5) * R * 0.98;
        const x = cx + Math.cos(ang)*rr, y = cy + Math.sin(ang)*rr;
        if (dayFactor(x,y) < R*0.03) continue;
        cctx.fillStyle = `rgba(255,255,255,${rand(0.07,0.22)})`;
        cctx.beginPath(); cctx.arc(x, y, rand(R*0.005,R*0.014), 0, Math.PI*2); cctx.fill();
      }
      const bands = 70;
      for (let i = 0; i < bands; i++) {
        const ang = rand(0, Math.PI*2), rr = rand(0, R*0.97);
        let bx = cx + Math.cos(ang)*rr, by = cy + Math.sin(ang)*rr;
        if (dayFactor(bx,by) < R*0.04) continue;
        const dir = rand(0, Math.PI*2);
        const segs = Math.floor(rand(16,30));
        const stepLen = rand(R*0.006, R*0.012);
        const curve = rand(-0.015,0.015);
        const bandAlpha = rand(0.40,0.75);
        let px = bx, py = by;
        for (let s = 0; s < segs; s++) {
          const ndx = Math.cos(dir+curve*s), ndy = Math.sin(dir+curve*s);
          px += ndx*stepLen; py += ndy*stepLen;
          if (dayFactor(px,py) < 0) continue;
          const dabs = Math.floor(rand(5,9));
          for (let d = 0; d < dabs; d++) {
            const ox = px + gauss()*stepLen*2.6, oy = py + gauss()*stepLen*2.6;
            const r = rand(R*0.008, R*0.020);
            const alpha = bandAlpha * rand(0.5,1) * (0.6+0.4*Math.sin(s*1.3+i));
            cctx.fillStyle = `rgba(255,255,255,${Math.max(0.05,alpha).toFixed(3)})`;
            cctx.beginPath(); cctx.arc(ox, oy, r, 0, Math.PI*2); cctx.fill();
          }
        }
      }
      pctx.save();
      pctx.filter = `blur(${(size*0.0016).toFixed(1)}px)`;
      pctx.drawImage(cloudC, 0, 0);
      pctx.filter = 'none';
      pctx.globalAlpha = 0.45;
      pctx.drawImage(cloudC, 0, 0);
      pctx.globalAlpha = 1;
      pctx.restore();
    }

    if (palette.cityLights) {
      const clusters = isMobile ? 26 : 42;
      pctx.globalCompositeOperation = 'lighter';
      for (let c2 = 0; c2 < clusters; c2++) {
        const ang = rand(0, Math.PI*2), rr = rand(R*0.10, R*0.94);
        const cx2 = cx + Math.cos(ang)*rr, cy2 = cy + Math.sin(ang)*rr;
        if (dayFactor(cx2,cy2) > -R*0.03) continue;
        const n = Math.floor(rand(14,34));
        const spread = rand(R*0.025, R*0.08);
        for (let i = 0; i < n; i++) {
          const x = cx2+gauss()*spread, y = cy2+gauss()*spread;
          if (dayFactor(x,y) > -R*0.01) continue;
          ectxFill(pctx, x, y, Math.random()<0.12);
        }
      }
      pctx.globalCompositeOperation = 'source-over';
    }
    function ectxFill(c2, x, y, big) {
      c2.fillStyle = Math.random()<0.7 ? `rgba(255,200,120,${rand(0.5,0.95)})` : `rgba(255,235,190,${rand(0.4,0.8)})`;
      c2.beginPath(); c2.arc(x, y, big?rand(1.2,2.0):rand(0.45,0.95), 0, Math.PI*2); c2.fill();
    }

    if (palette.polarCap) {
      [-1, 1].forEach(sign => {
        const px = cx - dayDir.y*R*0.9*sign, py = cy + dayDir.x*R*0.9*sign;
        const g = pctx.createRadialGradient(px,py,0,px,py,R*0.32);
        g.addColorStop(0, 'rgba(255,250,245,0.85)');
        g.addColorStop(0.6, 'rgba(255,250,245,0.30)');
        g.addColorStop(1, 'rgba(255,250,245,0)');
        pctx.fillStyle = g;
        pctx.beginPath(); pctx.arc(px,py,R*0.32,0,Math.PI*2); pctx.fill();
      });
    }

    // vignette de rondeur
    const vg = pctx.createRadialGradient(cx,cy,R*0.6,cx,cy,R);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,`rgba(0,0,0,${palette.vignette ?? 0.45})`);
    pctx.fillStyle = vg;
    pctx.beginPath(); pctx.arc(cx,cy,R,0,Math.PI*2); pctx.fill();

    pctx.restore();

    if (palette.atmosphere) {
      pctx.globalCompositeOperation = 'lighter';
      [
        { r: R*1.015, w: R*0.018, col: palette.atmosphere, a: 0.5 },
        { r: R*1.05,  w: R*0.05,  col: palette.atmosphere, a: 0.18 },
      ].forEach(({r,w,col,a}) => {
        pctx.strokeStyle = `rgba(${col},${a})`;
        pctx.lineWidth = w;
        pctx.beginPath(); pctx.arc(cx,cy,r,0,Math.PI*2); pctx.stroke();
      });
      pctx.globalCompositeOperation = 'source-over';
    }

    return c;
  }

  /* ════════════════════════════════════════════════════════════════
   * Champ d'étoiles d'arrière-plan
   * ════════════════════════════════════════════════════════════════ */
  let bgStars = [];
  let dustMotes = [];
  function buildBgStars(W, H) {
    const n = isMobile ? 280 : 520;
    bgStars = [];
    for (let i = 0; i < n; i++) {
      bgStars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() < 0.12 ? rand(1.0, 1.8) : rand(0.4, 0.9),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.4, 1.1),
        warm: Math.random() < 0.2,
      });
    }
    const dn = isMobile ? 30 : 60;
    dustMotes = [];
    for (let i = 0; i < dn; i++) {
      dustMotes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(40, 140),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.08, 0.2),
        warm: Math.random() < 0.6,
      });
    }
  }

  /* ── Dimensionnement & disposition de la scène ───────────────────── */
  let W = 0, H = 0, dpr = 1;
  let bodies = []; // {tex, R(texture), screenR, cx, cy, parallax}

  function viewH() { return Math.min(H, window.innerHeight || H); }

  function layoutScene() {
    const vh = viewH();
    // Position du soleil : grand et dominant, déborde du cadre en haut/à droite
    const sunPos = { x: W * (isMobile ? 0.68 : 0.78), y: vh * 0.22 };

    const earthPos = { x: W * (isMobile ? 0.52 : 0.60), y: vh * 0.86 };
    const marsPos  = { x: W * (isMobile ? 0.97 : 0.985), y: vh * 0.10 };
    const moonPos  = { x: W * (isMobile ? 0.96 : 0.97), y: vh * 0.98 };

    function dirTo(from, to) {
      const dx = to.x - from.x, dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx/len, y: dy/len };
    }

    const earthDay = dirTo(earthPos, sunPos);
    const marsDay  = dirTo(marsPos, sunPos);
    const moonDay  = dirTo(moonPos, sunPos);

    const ES = isMobile ? 900 : 1300;
    const earthR = ES * 0.36;
    const earthTex = buildPlanetTexture(ES, earthR, earthDay, {
      stops: [
        [0.00,'#3F8CD4'],[0.30,'#1E6FB8'],[0.46,'#0C3F73'],
        [0.495,'#FFD9A8'],[0.52,'#1A2233'],[0.62,'#070B14'],[1.00,'#020308'],
      ],
      clouds: true, cityLights: true, atmosphere: '120,180,255', vignette: 0.38,
    });

    const MS = isMobile ? 560 : 820;
    const marsR = MS * 0.36;
    const marsTex = buildPlanetTexture(MS, marsR, marsDay, {
      stops: [
        [0.00,'#E8956A'],[0.35,'#C9663B'],[0.55,'#9C4426'],
        [0.60,'#6B2D1A'],[0.75,'#3A1610'],[1.00,'#180806'],
      ],
      craters: true, polarCap: true, atmosphere: '255,150,100', vignette: 0.45,
    });

    const OS = isMobile ? 420 : 600;
    const moonR = OS * 0.36;
    const moonTex = buildPlanetTexture(OS, moonR, moonDay, {
      stops: [
        [0.00,'#D8C9A8'],[0.35,'#B3A07C'],[0.55,'#7C6E54'],
        [0.60,'#4A4234'],[1.00,'#16130E'],
      ],
      craters: true, vignette: 0.5,
    });

    bodies = [
      {
        tex: marsTex, R: marsR, basePos: marsPos, screenR: vh*(isMobile?0.080:0.090), parallax: 18,
        orbit: { angle: 0.9,  speed: 0.00006, rH: vh*0.020, rV: vh*0.014 },
      },
      {
        tex: moonTex, R: moonR, basePos: moonPos, screenR: vh*(isMobile?0.062:0.066), parallax: 24,
        orbit: { angle: 2.4,  speed: 0.00009, rH: vh*0.016, rV: vh*0.011 },
      },
      {
        tex: earthTex, R: earthR, basePos: earthPos, screenR: vh*(isMobile?0.215:0.235), parallax: 22,
        orbit: { angle: 4.1,  speed: 0.00004, rH: vh*0.026, rV: vh*0.018 },
      },
    ];

    return { sunPos, sunScreenR: vh * (isMobile ? 0.52 : 0.66) };
  }

  let sunPos = { x: 0, y: 0 }, sunScreenR = 0;

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
    const layout = layoutScene();
    sunPos = layout.sunPos;
    sunScreenR = layout.sunScreenR;
  }
  window.addEventListener('resize', resize);

  /* ── Parallax souris ─────────────────────────────────────────────── */
  let mouseX = 0, mouseY = 0, camX = 0, camY = 0;
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2.0;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2.0;
  });

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

    /* Poussière cosmique (très lente, derrière les étoiles, donne de la profondeur) */
    const dustPx = camX * 6, dustPy = camY * 4;
    dustMotes.forEach(d => {
      const drift = reduced ? 0 : Math.sin(time * d.speed + d.phase) * 18;
      const g = ctx.createRadialGradient(d.x+dustPx+drift, d.y+dustPy, 0, d.x+dustPx+drift, d.y+dustPy, d.r);
      const col = d.warm ? '120,90,60' : '60,80,140';
      g.addColorStop(0, `rgba(${col},0.05)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(d.x+dustPx+drift, d.y+dustPy, d.r, 0, Math.PI*2); ctx.fill();
    });

    /* Étoiles d'arrière-plan */
    const starPx = camX * 14, starPy = camY * 9;
    bgStars.forEach(s => {
      const tw = reduced ? 1 : 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = tw;
      ctx.fillStyle = s.warm ? '#FFE3B0' : '#EAF0FF';
      ctx.beginPath();
      ctx.arc(s.x + starPx, s.y + starPy, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    /* Soleil — légère dérive de position + rotation lente + pulsation vivante */
    const sunDriftX = reduced ? 0 : Math.sin(time * 0.05) * sunScreenR * 0.012;
    const sunDriftY = reduced ? 0 : Math.cos(time * 0.04) * sunScreenR * 0.010;
    const sunPx = camX * 10 + sunDriftX, sunPy = camY * 6 + sunDriftY;
    const sunScale = (sunScreenR * 2) / SS;
    const sunCx = sunPos.x + sunPx, sunCy = sunPos.y + sunPy;

    ctx.save();
    ctx.translate(sunCx, sunCy);
    ctx.rotate(reduced ? 0 : time * 0.0035);
    ctx.scale(sunScale, sunScale);
    ctx.drawImage(sunCanvas, -scx, -scy);
    ctx.restore();

    // pulsation douce de la couronne (respiration)
    if (!reduced) {
      const pulse = 0.92 + 0.08 * Math.sin(time * 0.55);
      const r = sunScreenR * 1.35 * pulse;
      const g = ctx.createRadialGradient(sunCx, sunCy, sunScreenR*0.7, sunCx, sunCy, r);
      g.addColorStop(0, 'rgba(255,160,60,0.12)');
      g.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sunCx, sunCy, r, 0, Math.PI*2); ctx.fill();

      // frémissement vivant : 3 jets de plasma scintillants au limbe, non figés dans la texture
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = time * 0.12 + i * 2.4;
        const flicker = 0.4 + 0.6 * Math.max(0, Math.sin(time * (1.3 + i*0.4) + i));
        const fx = sunCx + Math.cos(a) * sunScreenR * 0.96;
        const fy = sunCy + Math.sin(a) * sunScreenR * 0.96;
        const fr = sunScreenR * 0.14 * flicker;
        const g2 = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        g2.addColorStop(0, `rgba(255,190,90,${0.30*flicker})`);
        g2.addColorStop(1, 'rgba(255,120,30,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    /* Planètes — orbite lente autour du soleil + parallax (plus proches) */
    bodies.forEach(b => {
      if (!reduced) b.orbit.angle += b.orbit.speed * dt;
      const ox = Math.cos(b.orbit.angle) * b.orbit.rH;
      const oy = Math.sin(b.orbit.angle) * b.orbit.rV;
      const px = camX * b.parallax, py = camY * (b.parallax * 0.65);
      const scale = (b.screenR * 2) / (b.R * 2);
      ctx.save();
      ctx.translate(b.basePos.x + ox + px, b.basePos.y + oy + py);
      ctx.scale(scale, scale);
      ctx.drawImage(b.tex, -b.tex.width/2, -b.tex.height/2);
      ctx.restore();
    });
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
