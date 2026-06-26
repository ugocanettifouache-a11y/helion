'use strict';

/* ── Sticky header ── */
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ── Hamburger / mobile nav ── */
const hamburger = document.querySelector('.hamburger');
const mobileNav = document.querySelector('.mobile-nav');

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ── Scroll reveal ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal, .stagger').forEach(el => revealObserver.observe(el));

/* ── Compteurs animés ── */
function animateCounter(el) {
  const raw = el.dataset.target;
  const isX   = raw.startsWith('x');
  const hasPct = raw.includes('%');
  const hasPlus = raw.includes('+');
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  const duration = 1800;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const ease = 1 - Math.pow(1 - Math.min(elapsed / duration, 1), 3);
    const current = Math.round(ease * num);
    el.textContent = (hasPlus ? '+' : '') + (isX ? 'x' : '') + current + (hasPct ? '%' : '');
    if (elapsed < duration) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

/* ── Active nav link ── */
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('nav a, .mobile-nav a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

/* ── Validation formulaire contact ── */
const form = document.getElementById('contactForm');
if (form) {
  const successMsg = document.getElementById('formSuccess');

  function validateField(group, input) {
    const val = input.value.trim();
    let valid = true;
    const errorEl = group.querySelector('.form-error');

    if (input.required && !val) {
      valid = false;
      if (errorEl) errorEl.textContent = 'Ce champ est obligatoire.';
    } else if (input.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      valid = false;
      if (errorEl) errorEl.textContent = 'Adresse email invalide.';
    } else if (input.name === 'phone' && val && !/^[\d\s\+\-\(\)]{7,20}$/.test(val)) {
      valid = false;
      if (errorEl) errorEl.textContent = 'Numéro invalide.';
    }

    group.classList.toggle('error', !valid);
    return valid;
  }

  form.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('blur', () => validateField(input.closest('.form-group'), input));
    input.addEventListener('input', () => {
      if (input.closest('.form-group').classList.contains('error'))
        validateField(input.closest('.form-group'), input);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let allValid = true;
    form.querySelectorAll('input, select, textarea').forEach(input => {
      if (!validateField(input.closest('.form-group'), input)) allValid = false;
    });
    if (allValid) {
      form.style.display = 'none';
      if (successMsg) successMsg.style.display = 'block';
    }
  });
}

/* ── Particules canvas (hero) ── */
function initHeroParticles() {
  const canvas = document.getElementById('heroParticles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles = [], raf;

  const GOLD  = [200, 147, 58];
  const WHITE = [255, 255, 255];
  const COUNT = 90;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function makeParticle() {
    const isGold = Math.random() > .55;
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 1.4 + .2,
      o:  Math.random() * .45 + .05,
      vx: (Math.random() - .5) * .12,
      vy: (Math.random() - .5) * .12,
      c:  isGold ? GOLD : WHITE,
      twinkleSpeed: Math.random() * .015 + .005,
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  resize();
  window.addEventListener('resize', () => { resize(); }, { passive: true });

  for (let i = 0; i < COUNT; i++) particles.push(makeParticle());

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 1;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      /* scintillement doux */
      const alpha = p.o * (.6 + .4 * Math.sin(t * p.twinkleSpeed + p.twinklePhase));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${alpha.toFixed(2)})`;
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  /* Respecter prefers-reduced-motion */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw();
  } else {
    /* Dessiner une fois statique */
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.o.toFixed(2)})`;
      ctx.fill();
    });
  }
}

initHeroParticles();
