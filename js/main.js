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

// Rendu solaire géré par js/solar.js
