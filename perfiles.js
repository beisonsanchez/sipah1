/* ==========================================================================
   SIPAH · perfiles.js — script liviano para perfiles.html
   main.js está hecho para el inicio (hero, línea de tiempo, fichas, etc.);
   esta página solo necesita: barra de progreso, navbar que se oculta al bajar,
   menú móvil, revelados sobrios y el año del footer.
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';

  /* Barra de progreso + navbar (se oculta al bajar, vuelve al subir) */
  const bar = $('.scroll-progress span');
  const nav = $('[data-nav]');
  let lastY = window.scrollY, ticking = false, drawerOpen = false;
  function update() {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    const d = y - lastY;
    const locked = drawerOpen || nav.contains(document.activeElement);
    if (!locked && d > 6 && y > 200) nav.classList.add('is-hidden');
    else if (d < -6 || y < 200 || locked) nav.classList.remove('is-hidden');
    if (Math.abs(d) > 6) lastY = y;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });

  /* Revelados: fundido sobrio, una sola vez */
  const groups = $$('[data-reveal-group]');
  groups.forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--i', String(i))));
  const els = [...$$('[data-reveal]'), ...groups];
  const finish = (el) => { el.removeAttribute('data-reveal'); el.removeAttribute('data-reveal-group'); el.classList.remove('is-in'); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const enough = en.intersectionRatio >= 0.2 || en.intersectionRect.height > window.innerHeight * 0.3;
        if (!en.isIntersecting || !enough) return;
        io.unobserve(en.target);
        en.target.classList.add('is-in');
        setTimeout(() => finish(en.target), 600);
      });
    }, { threshold: [0, 0.1, 0.2] });
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach(finish);
  }

  /* Menú móvil: sube desde abajo con la curva de drawer y vuelve por el mismo camino */
  const drawer = $('[data-drawer]');
  const overlay = $('[data-drawer-overlay]');
  const openBtn = $('[data-drawer-open]');
  function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;
    drawer.hidden = false; overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    openBtn.setAttribute('aria-expanded', 'true');
    const dur = reduced ? 0 : 450;
    drawer.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: dur, easing: EASE_DRAWER, fill: 'forwards' });
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: 'ease', fill: 'forwards' });
    $('a', drawer).focus({ preventScroll: true });
  }
  function closeDrawer(restore = true) {
    if (!drawerOpen) return;
    drawerOpen = false;
    document.body.style.overflow = '';
    openBtn.setAttribute('aria-expanded', 'false');
    const dur = reduced ? 0 : 300;
    drawer.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: dur, easing: EASE_DRAWER, fill: 'forwards' });
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease', fill: 'forwards' })
      .finished.then(() => { if (!drawerOpen) { drawer.hidden = true; overlay.hidden = true; } });
    if (restore) openBtn.focus({ preventScroll: true });
  }
  if (drawer && openBtn) {
    openBtn.addEventListener('click', openDrawer);
    overlay.addEventListener('click', () => closeDrawer());
    $('[data-drawer-close]', drawer).addEventListener('click', () => closeDrawer());
    $$('a', drawer).forEach((a) => a.addEventListener('click', () => closeDrawer(false)));
    drawer.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  }

  const year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
  update();
})();
