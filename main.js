/* ==========================================================================
   SIPAH Corporation · main.js
   Vanilla JS: sin librerías. Movimiento con CSS transitions, Web Animations
   API, IntersectionObserver y requestAnimationFrame.

   01. Utilidades            07. Navbar activa       13. Toaster (Sonner)
   02. IMAGES (inventario)   08. Revelados (IO)      14. Formulario
   03. Galería + filtros     09. Proceso             15. Init
   04. Lightbox (FLIP)       10. Contadores
   05. Motor de scroll       11. Línea de tiempo
   06. Navbar                12. Drawer (Vaul)
   ========================================================================== */
(() => {
  'use strict';

  /* 01. UTILIDADES ------------------------------------------------------ */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;

  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

  /* Bloqueo de scroll que compensa el ancho de la barra (sin saltos de layout) */
  let lockCount = 0;
  function lockScroll() {
    if (lockCount++ > 0) return;
    const sw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('is-locked');
    if (sw > 0) document.body.style.paddingRight = `${sw}px`;
  }
  function unlockScroll() {
    if (--lockCount > 0) return;
    lockCount = 0;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.documentElement.classList.remove('is-locked');
  }

  /* 01a. ANALÍTICA sin cookies (Plausible) --------------------------------
     Desactivada mientras ANALYTICS_DOMAIN esté vacío: no se carga nada de
     terceros. Para activarla, crea el sitio en plausible.io (o en una
     instancia propia compatible) y escribe aquí el dominio definitivo,
     p. ej. 'sipah.org'. Sin cookies, así que no requiere banner.
     trackEvent('Nombre', { prop: 'valor' }) registra un evento personalizado. */
  const ANALYTICS_DOMAIN = ''; // TODO: dominio definitivo del sitio
  const ANALYTICS_SRC = 'https://plausible.io/js/script.outbound-links.js';
  function initAnalytics() {
    if (!ANALYTICS_DOMAIN) return;
    // Cola estándar: los eventos previos a la carga del script no se pierden
    window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
    const sc = document.createElement('script');
    sc.defer = true;
    sc.dataset.domain = ANALYTICS_DOMAIN;
    sc.src = ANALYTICS_SRC;
    document.head.appendChild(sc);
  }
  function trackEvent(name, props) {
    if (!ANALYTICS_DOMAIN || typeof window.plausible !== 'function') return;
    try { window.plausible(name, props ? { props } : undefined); } catch { /* la analítica nunca rompe la página */ }
  }
  /* Clics de conversión por delegación: WhatsApp, teléfono, correo y los
     enlaces marcados con data-track="Nombre del evento". */
  function initTrackedClicks() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a, button');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (a.dataset.track) trackEvent(a.dataset.track);
      else if (href.includes('wa.me/')) trackEvent('WhatsApp', { lugar: a.classList.contains('whatsapp') ? 'botón flotante' : 'enlace' });
      else if (href.startsWith('tel:')) trackEvent('Llamada', { numero: href.slice(4) });
      else if (href.startsWith('mailto:')) trackEvent('Correo');
    }, { capture: true, passive: true });
    // Preguntas frecuentes: qué dudas se abren más
    $$('.faq__item').forEach((d) => d.addEventListener('toggle', () => {
      if (d.open) trackEvent('Pregunta frecuente', { pregunta: $('.faq__q span', d).textContent });
    }));
  }

  /* Focus trap mínimo para diálogos */
  function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    const nodes = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', container)
      .filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* 01b. FÍSICA (Apple · Designing Fluid Interfaces) ------------------------
     Spring con los dos parámetros de Apple: damping ratio (1 = sin rebote,
     <1 = rebota) y response (segundos hasta llegar; no es una duración fija).
     Es interrumpible: .to() reapunta desde el valor y la velocidad actuales. */
  function createSpring({ value = 0, damping = 1, response = 0.4, precision = 0.001, onUpdate }) {
    let x = value, v = 0, target = value, raf = 0, last = 0, onRest = null;
    let k = 0, c = 0;
    const config = (d, r) => { k = Math.pow((2 * Math.PI) / r, 2); c = (4 * Math.PI * d) / r; };
    config(damping, response);
    function step(now) {
      const dt = Math.min(0.064, (now - last) / 1000);
      last = now;
      const n = Math.max(1, Math.ceil(dt / 0.004));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        const a = -k * (x - target) - c * v;
        v += a * h;
        x += v * h;
      }
      if (Math.abs(v) < precision * 10 && Math.abs(x - target) < precision) {
        x = target; v = 0; raf = 0;
        onUpdate(x, v);
        const cb = onRest; onRest = null;
        if (cb) cb();
        return;
      }
      onUpdate(x, v);
      raf = requestAnimationFrame(step);
    }
    return {
      to(t, opts = {}) {
        target = t;
        if (opts.velocity !== undefined) v = opts.velocity;
        config(opts.damping ?? damping, opts.response ?? response);
        onRest = opts.onRest || null;
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
      },
      set(val) { this.stop(); x = val; v = 0; target = val; onUpdate(x, v); },
      stop() { cancelAnimationFrame(raf); raf = 0; onRest = null; },
      get value() { return x; },
      get velocity() { return v; },
      get target() { return target; },
      get active() { return raf !== 0; },
    };
  }

  /* Proyección de impulso de Apple: dónde se detendría el gesto por inercia */
  const project = (velocityPxPerS, rate = 0.998) => ((velocityPxPerS / 1000) * rate) / (1 - rate);

  /* Rubber-band de Apple: cuanto más se pasa del límite, menos sigue al dedo */
  const rubberband = (overshoot, dimension, constant = 0.55) =>
    (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

  /* Historial corto de posiciones para medir la velocidad al soltar (px/s) */
  function velocityTracker() {
    let samples = [];
    return {
      reset() { samples = []; },
      add(x, y) {
        const t = performance.now();
        samples.push({ x, y, t });
        while (samples.length > 2 && t - samples[0].t > 100) samples.shift();
      },
      get() {
        if (samples.length < 2) return { x: 0, y: 0 };
        const a = samples[0], b = samples[samples.length - 1];
        const dt = Math.max(1, b.t - a.t) / 1000;
        return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
      },
    };
  }

  /* 02. IMAGES: inventario completo de /img-original (36 archivos) --------
     section = dónde se muestra como imagen principal.
     Todas las que no son logos aparecen además en la galería filtrable. */
  const IMG = 'img-original/';
  const IMAGES = [
    // Arqueología
    { src: IMG + 'colombia4_0d9ebaf0.jpg', category: 'arqueologia', w: 1280, h: 960, section: 'hero · proyectos · noticias', alt: 'Excavación de las tumbas prehispánicas de 2.000 años halladas al sur de Medellín' },
    { src: IMG + 'hallazgo-vasijas-telemedellin.jpg', category: 'arqueologia', w: 580, h: 365, section: 'proyectos · noticias', alt: 'Vasijas cerámicas precolombinas halladas en la sede de Telemedellín' },
    { src: IMG + 'investigador-768x1024.jpg', category: 'arqueologia', w: 768, h: 1024, section: 'servicios', alt: 'Investigador analizando muestras al microscopio en el laboratorio' },
    { src: IMG + 'registro-inventario.jpg', category: 'arqueologia', w: 1272, h: 508, section: 'servicios', alt: 'Registro e inventario de piezas patrimoniales en el museo' },
    { src: IMG + 'noticia-caracol.jpg', category: 'arqueologia', w: 1000, h: 562, section: 'proyectos · noticias', alt: 'Reportaje de Noticias Caracol sobre el hallazgo arqueológico de hace dos mil años en Itagüí' },
    // Petroglifos
    { src: IMG + 'petroglifo.jpeg', category: 'petroglifos', w: 720, h: 540, section: 'petroglifos · noticias', alt: 'Petroglifo con figuras talladas en roca en Itagüí' },
    { src: IMG + 'Circulos-de-la-palabra-Petros-724x1024.jpg', category: 'petroglifos', w: 724, h: 1024, section: 'galeria', alt: 'Afiche Círculos de Palabra: arte rupestre en el Valle de Aburrá' },
    // Museo
    { src: IMG + 'Foto-Museo-1024x768.jpeg', category: 'museo', w: 1024, h: 768, section: 'museo', alt: 'Fachada del Museo Comunitario con la exposición Los Petroglifos, una historia tallada en roca' },
    { src: IMG + '4-1-1024x1024.jpeg', category: 'museo', w: 1024, h: 1024, section: 'museo', alt: 'Motomuseo itinerante de SIPAH, triciclo rojo adaptado como museo móvil' },
    // Comunidad y educación
    { src: IMG + '2-1-1024x1024.jpeg', category: 'comunidad', w: 1024, h: 1024, section: 'museo', alt: 'Charla Museos y comunidad: estudiantes frente al Museo Comunitario' },
    { src: IMG + 'familias-verdes.jpg', category: 'comunidad', w: 1600, h: 1067, section: 'hero · noticias', alt: 'Actividad de siembra Familias Verdes con la comunidad de El Rosario en el parque de los Petroglifos' },
    { src: IMG + 'practicas.jpg', category: 'comunidad', w: 1000, h: 563, section: 'hero', alt: 'Recorrido de campo con estudiantes junto a un muro durante un estudio arqueológico' },
    { src: IMG + 'tallerista.jpg', category: 'comunidad', w: 789, h: 618, section: 'museo', alt: 'Tallerista con niñas en una actividad de la ludoteca patrimonial' },
    // Equipo
    { src: IMG + '3-1-1024x1024.jpeg', category: 'equipo', w: 1024, h: 1024, section: 'nosotros', alt: 'Juan Pablo Díez Ramírez, director de la Corporación SIPAH' },
    { src: IMG + '5-1024x1024.jpeg', category: 'equipo', w: 1024, h: 1024, section: 'nosotros', alt: 'Lucy Tobón Ospina, directora del Museo Comunitario Graciliano Arcila Vélez' },
    { src: IMG + 'grupo-sipah-2018-ok-1024x683.jpg', category: 'equipo', w: 1024, h: 683, section: 'nosotros', alt: 'Equipo de SIPAH y Vigías del Patrimonio reunidos en 2018' },
    { src: IMG + 'collage-sipah-1024x475.jpg', category: 'equipo', w: 1024, h: 475, section: 'galeria', alt: 'Collage de encuentros del equipo SIPAH con comunidades' },
    // Publicaciones y eventos
    { src: IMG + '1-1024x1024.jpeg', category: 'publicaciones', w: 1024, h: 1024, section: 'galeria', alt: 'Afiche del Mes del Patrimonio: conversatorio Diálogos de identidad cultural y riqueza patrimonial' },
    { src: IMG + '19_05_21_conversa_internacional.jpeg', category: 'publicaciones', w: 861, h: 843, section: 'galeria', alt: 'Afiche del Conversatorio Internacional Ronda Latinoamericana de museos, 19 de mayo' },
    { src: IMG + '6-1024x1024.jpeg', category: 'publicaciones', w: 1024, h: 1024, section: 'galeria', alt: 'Afiche del conversatorio Arqueología vs. urbanismo: miradas complementarias' },
    { src: IMG + '7-1024x791.jpeg', category: 'publicaciones', w: 1024, h: 791, section: 'galeria', alt: 'Afiche del conversatorio Cerro El Picacho, patrimonio cultural y natural de Medellín' },
    { src: IMG + '8-1024x1024.jpeg', category: 'publicaciones', w: 1024, h: 1024, section: 'galeria', alt: 'Afiche Septiembre, Mes del Patrimonio 2021: retos y desafíos del patrimonio' },
    { src: IMG + 'circulo_de_la_palabra-724x1024.jpg', category: 'publicaciones', w: 724, h: 1024, section: 'galeria', alt: 'Afiche Círculos de Palabra: patrimonio ambiental y los petroglifos de Itagüí' },
    { src: IMG + 'mar-y-selva.jpg', category: 'publicaciones', w: 1600, h: 568, section: 'publicaciones', alt: 'Ilustración Naturaleza, mar y cultura: el origen de lo que somos, Arboletes' },
    { src: IMG + 'poster-icom.jpg', category: 'publicaciones', w: 900, h: 1348, section: 'museo', alt: 'Afiche del Día Internacional de los Museos 2023: Historias, mitos y patrimonio arqueológico de La Loma y El Rosario' },
    { src: IMG + 'valor-agregado.jpg', category: 'publicaciones', w: 768, h: 1086, section: 'museo', alt: 'Afiche de la exposición temporal Valor Agregado en el Museo Comunitario G.A.V.' },
    // Vigías y reconocimientos
    { src: IMG + 'vigias-del-patrimonio-de-itagui-300x154.png', category: 'vigias', w: 300, h: 154, section: 'vigias', gallery: false, alt: 'Logo de los Vigías del Patrimonio de Itagüí' },
    // Otras
    { src: IMG + 'plan-padrino-1024x538.jpg', category: 'otras', w: 1024, h: 538, section: 'galeria', alt: 'Ilustración en tiza de un apretón de manos: Plan Padrino' },
    // Logos y aliados (solo marquee, navbar, footer y museo; nunca en la galería)
    { src: IMG + 'logo-sipah.png', category: 'logos', w: 148, h: 81, section: 'navbar', alt: 'Logo de SIPAH Corporation' },
    { src: IMG + 'cropped-logo-color.png', category: 'logos', w: 292, h: 160, section: 'footer', alt: 'Logo a color de SIPAH Corporation' },
    { src: IMG + 'logo-museo-gav-ok.png', category: 'logos', w: 179, h: 91, section: 'museo', alt: 'Logo del Museo Comunitario Graciliano Arcila Vélez' },
    { src: IMG + 'MinCultura-300x95.png', category: 'logos', w: 300, h: 95, section: 'aliados', alt: 'Ministerio de Cultura de Colombia' },
    { src: IMG + 'icanh.png', category: 'logos', w: 100, h: 38, section: 'aliados', alt: 'Instituto Colombiano de Antropología e Historia' },
    { src: IMG + 'udea.png', category: 'logos', w: 100, h: 28, section: 'aliados', alt: 'Universidad de Antioquia' },
    { src: IMG + 'RED-DE-MUSEOS.png', category: 'logos', w: 100, h: 40, section: 'aliados', alt: 'Red de Museos de Antioquia' },
    { src: IMG + 'confiar.png', category: 'logos', w: 100, h: 33, section: 'aliados', alt: 'Confiar Cooperativa Financiera' },
  ];
  window.SIPAH_IMAGES = IMAGES; // útil para auditar desde la consola

  const CATEGORY_LABELS = {
    all: 'Todo',
    arqueologia: 'Arqueología',
    petroglifos: 'Petroglifos',
    museo: 'Museo',
    comunidad: 'Comunidad',
    equipo: 'Equipo',
    publicaciones: 'Publicaciones y eventos',
    vigias: 'Vigías',
    otras: 'Otras',
  };

  /* 03. GALERÍA + FILTROS --------------------------------------------------
     Masonry con CSS columns. Al filtrar: FLIP de los ítems que se quedan
     (ease-in-out, se mueven en pantalla) y fade corto de los que entran.
     Es una acción repetida, así que el movimiento es breve (≤300ms). */
  const galleryImages = IMAGES.filter((img) => img.category !== 'logos' && img.gallery !== false);
  const galleryEl = $('[data-gallery]');
  const filtersEl = $('[data-filters]');
  const indicator = filtersEl && $('.filters__indicator', filtersEl);
  const statusEl = $('[data-gallery-status]');
  let activeFilter = 'all';

  function renderGallery() {
    if (!galleryEl) return; // la galería vive en galeria.html
    const frag = document.createDocumentFragment();
    galleryImages.forEach((img, i) => {
      const li = document.createElement('li');
      li.className = 'gallery__item';
      li.dataset.category = img.category;
      li.dataset.index = String(i);
      li.innerHTML = `
        <button class="gallery__btn" type="button" data-label="${CATEGORY_LABELS[img.category]}" aria-label="Ampliar imagen: ${img.alt}">
          <img src="${img.src}" alt="${img.alt}" width="${img.w}" height="${img.h}" loading="lazy" decoding="async">
        </button>`;
      frag.appendChild(li);
    });
    galleryEl.appendChild(frag);

    // Pills: solo categorías con imágenes
    const counts = galleryImages.reduce((acc, img) => ((acc[img.category] = (acc[img.category] || 0) + 1), acc), {});
    const cats = ['all', ...Object.keys(CATEGORY_LABELS).filter((c) => c !== 'all' && counts[c])];
    cats.forEach((cat, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter';
      b.dataset.filter = cat;
      b.setAttribute('aria-pressed', String(cat === 'all'));
      b.tabIndex = i === 0 ? 0 : -1;
      const n = cat === 'all' ? galleryImages.length : counts[cat];
      b.innerHTML = `${CATEGORY_LABELS[cat]}<span class="filter__count" aria-hidden="true">${n}</span>`;
      b.setAttribute('aria-label', `${CATEGORY_LABELS[cat]}, ${n} imágenes`);
      filtersEl.appendChild(b);
    });
  }

  function moveIndicator(animate = true) {
    const btn = $(`.filter[aria-pressed="true"]`, filtersEl);
    if (!btn) return;
    const total = filtersEl.scrollWidth;
    indicator.style.width = `${total}px`;
    const left = btn.offsetLeft;
    const right = total - (btn.offsetLeft + btn.offsetWidth);
    indicator.classList.toggle('no-anim', !animate);
    indicator.style.clipPath = `inset(0 ${right}px 0 ${left}px round 999px)`;
  }

  function applyFilter(cat) {
    if (cat === activeFilter) return;
    activeFilter = cat;
    const items = $$('.gallery__item', galleryEl);
    const first = new Map();
    if (!reduced) items.forEach((li) => { if (!li.hidden) first.set(li, li.getBoundingClientRect()); });

    let shown = 0;
    items.forEach((li) => {
      const match = cat === 'all' || li.dataset.category === cat;
      li.hidden = !match;
      if (match) shown++;
    });

    statusEl.textContent = `Mostrando ${shown} ${shown === 1 ? 'imagen' : 'imágenes'}${cat === 'all' ? '' : ' de ' + CATEGORY_LABELS[cat]}.`;
    if (reduced) return;

    items.forEach((li) => {
      if (li.hidden) return;
      const last = li.getBoundingClientRect();
      const prev = first.get(li);
      if (prev) {
        const dx = prev.left - last.left;
        const dy = prev.top - last.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        li.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          { duration: 300, easing: EASE_IN_OUT }
        );
      } else {
        li.animate(
          [{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'none' }],
          { duration: 220, easing: EASE_OUT, fill: 'backwards' }
        );
      }
    });
  }

  function initFilters() {
    if (!filtersEl) return;
    filtersEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter');
      if (!btn) return;
      $$('.filter', filtersEl).forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-pressed', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      moveIndicator(true);
      btn.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      applyFilter(btn.dataset.filter);
    });
    // Toolbar con roving tabindex: flechas para moverse entre filtros
    filtersEl.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const btns = $$('.filter', filtersEl);
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      let next = i;
      if (e.key === 'ArrowRight') next = (i + 1) % btns.length;
      if (e.key === 'ArrowLeft') next = (i - 1 + btns.length) % btns.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = btns.length - 1;
      btns[i].tabIndex = -1;
      btns[next].tabIndex = 0;
      btns[next].focus();
    });
    moveIndicator(false);
    // Recalcular cuando carguen las fuentes (cambian los anchos de las pills)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveIndicator(false));
    window.addEventListener('resize', () => moveIndicator(false), { passive: true });
  }

  /* 04. LIGHTBOX con transición de imagen compartida (FLIP) ---------------
     La miniatura crece hasta su tamaño final desde su posición exacta.
     Las miniaturas conservan su proporción (masonry), así que el escalado
     es uniforme y la imagen no se deforma. */
  const lb = $('[data-lightbox]');
  const lbImg = $('[data-lb-img]', lb);
  const lbCaption = $('[data-lb-caption]', lb);
  let lbList = [];      // índices de galleryImages visibles con el filtro activo
  let lbPos = 0;        // posición dentro de lbList
  let lbOpen = false;
  let lbBusy = false;
  let lbLastFocus = null;
  let lbSource = null;  // { index, el, strip } cuando se abre desde la tira del hero

  function thumbFor(index) {
    return $(`.gallery__item[data-index="${index}"] img`, galleryEl);
  }

  function fitRect(img) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = vw * (vw < 768 ? 0.94 : 0.86);
    const maxH = vh * 0.76;
    const ratio = img.w / img.h;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    return { left: (vw - w) / 2, top: (vh - h) / 2 - 12, width: w, height: h };
  }

  function placeImage(index) {
    const img = galleryImages[index];
    const r = fitRect(img);
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbImg.width = img.w;
    lbImg.height = img.h;
    Object.assign(lbImg.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    lbCaption.textContent = `${img.alt} · ${lbPos + 1} / ${lbList.length}`;
    // Precarga de vecinas para que la navegación sea instantánea
    [-1, 1].forEach((d) => {
      const n = galleryImages[lbList[(lbPos + d + lbList.length) % lbList.length]];
      if (n) { const p = new Image(); p.src = n.src; }
    });
    return r;
  }

  function flipFrom(rect, to) {
    const sx = rect.width / to.width;
    const sy = rect.height / to.height;
    return `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(${sx}, ${sy})`;
  }

  function openLightbox(index, sourceEl = null) {
    if (lbOpen || lbBusy) return;
    lbList = $$('.gallery__item:not([hidden])', galleryEl).map((li) => Number(li.dataset.index));
    // Si la imagen está oculta por el filtro activo (p. ej. desde la tira), navega por todo el archivo
    if (!lbList.includes(index)) lbList = galleryImages.map((_, i) => i);
    lbSource = sourceEl ? { index, el: sourceEl } : null;
    lbPos = Math.max(0, lbList.indexOf(index));
    lbLastFocus = document.activeElement;
    lbOpen = true;
    lbBusy = true;

    lb.hidden = false;
    lockScroll();
    const to = placeImage(index);
    const thumb = sourceEl || thumbFor(index);
    const from = thumb ? thumb.getBoundingClientRect() : null;

    requestAnimationFrame(() => lb.classList.add('is-open'));
    $('.lightbox__close', lb).focus({ preventScroll: true });

    if (reduced || !from) {
      lbImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' }).finished.then(() => (lbBusy = false));
      return;
    }
    if (thumb) thumb.style.visibility = 'hidden';
    lbImg.animate(
      [{ transform: flipFrom(from, to), borderRadius: '10px' }, { transform: 'none' }],
      { duration: 420, easing: EASE_OUT }
    ).finished.then(() => {
      if (thumb) thumb.style.visibility = '';
      lbBusy = false;
    });
  }

  /* Estado visual de la imagen del visor: desplazamiento del centro (cx, cy)
     y escala s alrededor del centro. transform-origin es 0 0 (por el FLIP),
     así que compensamos la escala para que encoja hacia su centro. */
  const lbBackdrop = $('.lightbox__backdrop', lb);
  const ID_STATE = { cx: 0, cy: 0, s: 1 };
  function applyLbState({ cx, cy, s }) {
    const W = lbImg.offsetWidth, H = lbImg.offsetHeight;
    lbImg.style.transform = `translate(${cx + ((1 - s) * W) / 2}px, ${cy + ((1 - s) * H) / 2}px) scale(${s})`;
  }
  const lerpState = (a, b, t) => ({ cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, s: a.s + (b.s - a.s) * t });

  /* Anima la imagen de un estado a otro con un spring (Apple: damping 1, response 0.35).
     velocityY (px/s) es la velocidad del dedo al soltar: se normaliza por la distancia
     que queda para que el resorte arranque exactamente a la velocidad del gesto. */
  function springLbState(from, to, { velocityY = 0, response = 0.35, onFrame, onRest }) {
    const dist = to.cy - from.cy;
    const v0 = Math.abs(dist) > 1 ? velocityY / dist : 0;
    const sp = createSpring({
      value: 0, damping: 1, response,
      onUpdate: (t) => { applyLbState(lerpState(from, to, t)); if (onFrame) onFrame(t); },
    });
    sp.to(1, { velocity: v0, onRest });
    return sp;
  }

  /* Cierre: vuelve a su miniatura desde donde esté (también a mitad de un arrastre) */
  function closeLightbox(fromState = ID_STATE, velocityY = 0) {
    if (!lbOpen || lbBusy) return;
    lbBusy = true;
    const index = lbList[lbPos];
    // Vuelve a su origen: la foto de la tira si no se navegó; si no, la miniatura de la galería
    const thumb = lbSource && lbSource.index === index ? lbSource.el : thumbFor(index);
    const from = thumb ? thumb.getBoundingClientRect() : null;
    const visible = from && from.bottom > 0 && from.top < window.innerHeight && from.width > 0;
    const startBackdrop = Number(lbBackdrop.style.opacity || 1);

    lb.classList.remove('is-open', 'is-dragging');
    lb.classList.add('is-closing');

    const finish = () => {
      if (thumb) thumb.style.visibility = '';
      lb.hidden = true;
      lb.classList.remove('is-closing');
      lbImg.removeAttribute('src');
      lbImg.style.transform = '';
      lbImg.style.opacity = '';
      lbBackdrop.style.opacity = '';
      lbBackdrop.style.transition = '';
      lbOpen = false;
      lbSource = null;
      lbBusy = false;
      unlockScroll();
      const btn = thumb && thumb.closest('button');
      (btn || lbLastFocus)?.focus({ preventScroll: true });
    };

    if (reduced) {
      lbImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease', fill: 'forwards' })
        .finished.then((a) => { a.cancel(); finish(); });
      return;
    }

    const base = { left: parseFloat(lbImg.style.left), top: parseFloat(lbImg.style.top), w: lbImg.offsetWidth, h: lbImg.offsetHeight };
    let target;
    if (visible) {
      thumb.style.visibility = 'hidden';
      target = {
        cx: from.left + from.width / 2 - (base.left + base.w / 2),
        cy: from.top + from.height / 2 - (base.top + base.h / 2),
        s: from.width / base.w,
      };
    } else {
      // Miniatura fuera de pantalla: sigue cayendo en la dirección del gesto y se desvanece
      target = { cx: fromState.cx, cy: fromState.cy + window.innerHeight * 0.5, s: fromState.s * 0.9 };
    }
    lbBackdrop.style.transition = 'none';
    springLbState(fromState, target, {
      velocityY,
      onFrame: (t) => {
        lbBackdrop.style.opacity = String(startBackdrop * (1 - t));
        if (!visible) lbImg.style.opacity = String(1 - t);
      },
      onRest: finish,
    });
  }

  /* source: 'key' → sin animación (acción de teclado, se repite mucho)
             'button' | 'swipe' → deslizamiento corto en la dirección del gesto */
  function navigate(dir, source = 'button', fromX = 0) {
    if (!lbOpen || lbBusy || lbList.length < 2) return;
    lbPos = (lbPos + dir + lbList.length) % lbList.length;
    placeImage(lbList[lbPos]);
    if (source === 'key' || reduced) { lbImg.style.transform = ''; return; }
    const startX = source === 'swipe' ? -dir * 40 : dir * 24;
    lbImg.animate(
      [{ transform: `translateX(${startX}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }],
      { duration: 220, easing: EASE_OUT }
    );
    lbImg.style.transform = '';
  }

  function initLightbox() {
    if (!galleryEl || !lb) return;
    galleryEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.gallery__btn');
      if (!btn) return;
      openLightbox(Number(btn.parentElement.dataset.index));
    });
    $$('[data-lb-close]', lb).forEach((el) => el.addEventListener('click', () => closeLightbox()));
    $('[data-lb-prev]', lb).addEventListener('click', () => navigate(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => navigate(1));

    lb.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1, 'key'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1, 'key'); }
      else trapFocus(lb, e);
    });

    /* Gestos sobre la imagen (como Fotos de iOS):
       · horizontal → pasar de foto (por distancia o velocidad)
       · hacia abajo → la foto sigue al dedo 1:1, encoge y el fondo se aclara;
         al soltar se proyecta el impulso: cierra o vuelve con un spring que
         hereda la velocidad del dedo. Hacia arriba: rubber-band.
       Se decide el eje tras 10px de histéresis. */
    const tracker = velocityTracker();
    let sx = 0, sy = 0, dx = 0, dy = 0, axis = null, pid = null, state = ID_STATE, backSpring = null;
    lbImg.addEventListener('pointerdown', (e) => {
      if (lbBusy || pid !== null) return; // ignora un segundo dedo
      if (backSpring) backSpring.stop(); // agarrar a mitad del regreso: continúa desde ahí
      pid = e.pointerId; sx = e.clientX - (state.cx || 0); sy = e.clientY - (state.cy > 0 ? state.cy : 0);
      dx = 0; dy = 0; axis = null;
      tracker.reset(); tracker.add(e.clientX, e.clientY);
      lbImg.setPointerCapture(e.pointerId);
    });
    lbImg.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      tracker.add(e.clientX, e.clientY);
      if (!axis) {
        if (Math.hypot(dx, dy) < 10) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'y') { lb.classList.add('is-dragging'); lbBackdrop.style.transition = 'none'; }
      }
      if (axis === 'x') {
        lbImg.style.transform = `translateX(${dx}px)`;
      } else {
        const vh = window.innerHeight;
        const down = Math.max(0, dy);
        const cy = dy >= 0 ? dy : rubberband(dy, vh);
        const s = 1 - clamp(down / vh) * 0.4;
        state = { cx: dx, cy, s };
        applyLbState(state);
        lbBackdrop.style.opacity = String(1 - clamp(down / (vh * 0.6)) * 0.85);
      }
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      const v = tracker.get();
      if (axis === 'x') {
        if (Math.abs(dx) > 60 || (Math.abs(v.x) > 400 && Math.abs(dx) > 10)) {
          navigate(dx < 0 ? 1 : -1, 'swipe');
        } else if (dx !== 0) {
          lbImg.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 200, easing: EASE_OUT });
          lbImg.style.transform = '';
        }
      } else if (axis === 'y') {
        // ¿Dónde acabaría por inercia? Si pasa del 18% de la pantalla, cierra
        const projected = state.cy + project(v.y, 0.99);
        if (dy > 0 && projected > window.innerHeight * 0.18) {
          const from = state; state = ID_STATE;
          closeLightbox(from, v.y);
        } else {
          lb.classList.remove('is-dragging');
          const from = state;
          const startOpacity = Number(lbBackdrop.style.opacity || 1);
          backSpring = springLbState(from, ID_STATE, {
            velocityY: v.y, response: 0.3,
            onFrame: (t) => {
              state = lerpState(from, ID_STATE, t);
              lbBackdrop.style.opacity = String(startOpacity + (1 - startOpacity) * t);
            },
            onRest: () => { state = ID_STATE; lbImg.style.transform = ''; lbBackdrop.style.opacity = ''; lbBackdrop.style.transition = ''; backSpring = null; },
          });
        }
      }
      axis = null;
    };
    lbImg.addEventListener('pointerup', end);
    lbImg.addEventListener('pointercancel', end);

    window.addEventListener('resize', () => { if (lbOpen && !lbBusy) placeImage(lbList[lbPos]); }, { passive: true });
  }

  /* 05. MOTOR DE SCROLL ----------------------------------------------------
     Un único listener pasivo + un rAF por frame para: barra de progreso,
     navbar, indicador de scroll del hero y línea de tiempo. */
  const progressBar = $('.scroll-progress span');
  const nav = $('[data-nav]');
  const heroEl = $('[data-hero]');
  const timeline = $('[data-timeline]');
  const track = $('[data-timeline-track]');
  const timelineBar = $('[data-timeline-bar]');
  let lastY = window.scrollY;
  let ticking = false;
  let timelineDist = 0;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let themeIsLight = null;
  const waBtn = $('.whatsapp');
  let tlOvershoot = 0;

  /* Tema: theme.js lo cambia; aquí solo se recalcula el theme-color del móvil */
  window.addEventListener('sipah:theme', () => { themeIsLight = null; onScroll(); });

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function update() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;

    // Barra de progreso (lineal, sin transición: sigue al scroll exacto)
    progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    // Navbar: transparente sobre el video del hero; toma fondo al empezar a bajar
    // y se compacta tras ~40px. Se oculta al bajar y vuelve al subir.
    const heroH = heroEl.offsetHeight;
    const navT = clamp(y / 240);
    nav.style.setProperty('--nav-t', navT.toFixed(3));
    const compact = navT > 0.15;
    nav.classList.toggle('is-compact', compact);
    // Móvil: la barra de estado toma el color de lo que hay arriba (foto oscura → arena)
    if (themeMeta && compact !== themeIsLight) {
      themeIsLight = compact;
      // En modo oscuro la arena es oscura: se lee del token, no de un hex fijo
      themeMeta.content = compact ? getComputedStyle(document.documentElement).getPropertyValue('--sand').trim() : '#17150F';
    }
    // WhatsApp aparece pasada la mitad del hero: no se superpone al botón de pausa
    if (waBtn) waBtn.classList.toggle('is-away', y < heroH * 0.5);
    // El indicador de scroll ya cumplió su función en cuanto se baja un poco
    heroEl.classList.toggle('is-scrolled', y > 24);
    // Testigo de perforación: aparece al empezar la "excavación"
    if (coreEl) coreEl.classList.toggle('is-away', y < heroH * 0.5);
    const delta = y - lastY;
    const navLocked = drawerOpen || nav.contains(document.activeElement);
    if (!navLocked && delta > 6 && y > vh * 0.6) nav.classList.add('is-hidden');
    else if (delta < -6 || y < vh * 0.6 || navLocked) nav.classList.remove('is-hidden');
    if (Math.abs(delta) > 6) lastY = y;
    // La barra inferior acompaña al nav: se va al bajar y vuelve al subir
    if (tabbar) tabbar.classList.toggle('is-hidden', nav.classList.contains('is-hidden') && !quoteOpen && !drawerOpen);
    updateCore(y, vh, max + vh);

    // Línea de tiempo horizontal
    if (timeline.classList.contains('is-pinned')) {
      const rect = timeline.getBoundingClientRect();
      const total = timeline.offsetHeight - vh;
      const p = clamp(-rect.top / total);
      // tlOvershoot: desplazamiento elástico extra cuando se arrastra más allá de los extremos
      track.style.transform = `translate3d(${-p * timelineDist + tlOvershoot}px, 0, 0)`;
      timelineBar.style.transform = `scaleX(${p})`;
    }
  }

  /* 05b. VIDEO DE FONDO DEL HERO -------------------------------------------
     · Solo se descarga si conviene: con ahorro de datos (saveData) o con
       movimiento reducido el hero queda estático con el póster.
     · Se pausa fuera de pantalla (IntersectionObserver) y con la pestaña oculta;
       se reanuda al volver, salvo que la persona lo haya pausado a mano.
     · Si el navegador bloquea el autoplay, la promesa de play() se rechaza en
       silencio: queda el póster y el botón ofrece reproducir. */
  function initHeroVideo() {
    const video = $('[data-hero-video]', heroEl);
    const toggle = $('[data-hero-toggle]', heroEl);
    if (!video) return;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    let userPaused = false;   // pausa elegida por la persona: manda sobre lo automático
    let inView = true;
    let loaded = false;

    const setStatic = (on) => heroEl.classList.toggle('is-static', on);
    const syncButton = () => {
      const paused = video.paused;
      toggle.classList.toggle('is-paused', paused);
      toggle.setAttribute('aria-label', paused ? 'Reproducir el video de fondo' : 'Pausar el video de fondo');
    };

    // play() devuelve una promesa que se rechaza si el autoplay está bloqueado
    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => syncButton());
    };
    const shouldPlay = () => loaded && !userPaused && inView && !document.hidden && !motionQuery.matches;
    const sync = () => { if (shouldPlay()) tryPlay(); else if (!video.paused) video.pause(); };

    function load() {
      if (loaded) return;
      loaded = true;
      $$('source[data-src]', video).forEach((s) => { s.src = s.dataset.src; });
      video.load();
      setStatic(false);
      toggle.hidden = false;
      sync();
    }
    function unload() {
      // Movimiento reducido activado en vivo: se detiene y se vuelve al póster
      video.pause();
      setStatic(true);
      toggle.hidden = true;
    }

    video.addEventListener('play', syncButton);
    video.addEventListener('pause', syncButton);
    // Si ninguna fuente se puede reproducir (p. ej. falta el MP4 en un Safari sin WebM).
    // El error de <source> no burbujea: se escucha en captura y solo cuenta el de la última.
    const lastSource = $$('source', video).pop();
    video.addEventListener('error', (e) => {
      if (e.target === lastSource || e.target === video) { setStatic(true); toggle.hidden = true; }
    }, true);

    toggle.addEventListener('click', () => {
      userPaused = !video.paused;
      trackEvent(userPaused ? 'Video pausado' : 'Video reanudado');
      if (userPaused) video.pause(); else { inView = true; tryPlay(); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { inView = en.isIntersecting; sync(); }, { threshold: 0 }).observe(heroEl);
    }
    document.addEventListener('visibilitychange', sync);
    motionQuery.addEventListener('change', (e) => {
      if (e.matches) unload();
      else if (!saveData) { if (loaded) { setStatic(false); toggle.hidden = false; sync(); } else load(); }
    });

    if (saveData || reduced) setStatic(true);
    else load();
  }

  /* 05c. MAPA EN DOS TIEMPOS -------------------------------------------------
     El iframe de Google Maps pesa ~1 MB de scripts de terceros. Se muestra un
     dibujo ligero y el mapa real se inserta solo al pulsar; el foco pasa al
     iframe para que el teclado siga donde estaba. */
  function initMap() {
    const map = $('[data-map]');
    if (!map) return;
    const btn = $('[data-map-load]', map);
    btn.addEventListener('click', () => {
      map.classList.add('is-loading');
      const f = document.createElement('iframe');
      f.title = 'Mapa: sede de SIPAH en El Rosario, Itagüí';
      f.src = map.dataset.mapSrc;
      f.width = '600';
      f.height = '360';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.allowFullscreen = true;
      f.style.opacity = '0';
      f.addEventListener('load', () => {
        map.classList.remove('is-loading');
        f.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 0 : 300, easing: 'ease', fill: 'forwards' })
          .finished.then(() => { f.style.opacity = ''; btn.hidden = true; });
      }, { once: true });
      map.appendChild(f);
      f.focus({ preventScroll: true });
      trackEvent('Mapa interactivo');
    }, { once: true });
  }

  /* 05d. TESTIGO DE PERFORACIÓN ---------------------------------------------
     Una columna de suelo en el borde derecho (móvil y tablet). Cada capa es una
     sección de <main> con su alto real y un color Munsell según su profundidad.
     · Al hacer scroll, el marcador baja y una etiqueta dice "−1,85 m · Hallazgos".
     · Arrastrar el dedo sobre la columna recorre las capas 1:1 (con un toque de
       vibración en Android al cambiar de capa) y al soltar salta a esa sección.
     · El mismo modelo de profundidad tiñe las secciones (--depth) y rotula el menú. */
  const coreEl = $('[data-core]');
  const coreCol = coreEl && $('[data-core-column]', coreEl);
  const coreMarker = coreEl && $('[data-core-marker]', coreEl);
  const coreDepthEl = coreEl && $('[data-core-depth]', coreEl);
  const coreNameEl = coreEl && $('[data-core-name]', coreEl);
  const CORE_DEPTH = 4.2; // metros simbólicos de toda la página
  const SOIL = ['#DDD3BD', '#C9AE84', '#A47B4F', '#7A5534', '#4A3728']; // Munsell, de arriba a abajo
  const fmtDepth = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let coreLayers = [], coreTotal = 1, coreColH = 0, coreIdx = -1, coreTimer = 0, coreScrubbing = false;

  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function soilAt(t, shade = 0) {
    const x = clamp(t) * (SOIL.length - 1);
    const i = Math.min(SOIL.length - 2, Math.floor(x));
    const f = x - i;
    const a = hexToRgb(SOIL[i]), b = hexToRgb(SOIL[i + 1]);
    return `rgb(${a.map((v, k) => Math.round((v + (b[k] - v) * f) * (1 - shade))).join(' ')})`;
  }
  // Nombre de la capa: el rótulo de la sección ("04 — Hallazgos" → "Hallazgos") o su título
  function layerName(sec) {
    if (sec === heroEl) return 'Inicio';
    const eb = $('.eyebrow', sec);
    const txt = eb ? eb.textContent.split('—').pop().trim() : '';
    if (txt) return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
    const h = $('h2', sec);
    return sec.getAttribute('aria-label') || (h ? h.textContent.trim() : '');
  }
  const depthLabel = (ratio) => `−${fmtDepth.format(ratio * CORE_DEPTH)} m`;

  function layoutCore() {
    const docH = document.documentElement.scrollHeight;
    const secs = $$('main > section');
    coreLayers = secs.map((el) => ({ el, id: el.id, name: layerName(el), top: el.getBoundingClientRect().top + window.scrollY, h: el.offsetHeight }));
    coreTotal = coreLayers.reduce((a, l) => a + l.h, 0) || 1;
    // Profundidad de cada sección: tiñe el fondo (CSS) y rotula el menú
    coreLayers.forEach((l) => l.el.style.setProperty('--depth', (l.top / docH).toFixed(3)));
    $$('[data-depth-for]').forEach((el) => {
      const l = coreLayers.find((x) => x.id === el.dataset.depthFor);
      if (l) el.textContent = depthLabel(l.top / docH);
    });
    if (!coreEl) return;
    $$('.core__seg', coreCol).forEach((n) => n.parentNode.removeChild(n));
    coreLayers.forEach((l, i) => {
      const seg = document.createElement('span');
      seg.className = 'core__seg';
      seg.style.flexGrow = String(l.h);
      // Capas alternas un poco más oscuras: se leen como estratos, no como degradado
      seg.style.background = soilAt(l.top / docH, i % 2 ? 0.07 : 0);
      coreCol.insertBefore(seg, coreMarker);
    });
    coreColH = coreCol.offsetHeight;
    coreIdx = -1;
  }

  // Posición en la columna (px) a partir de una capa y el avance dentro de ella
  function coreY(i, local) {
    let cum = 0;
    for (let j = 0; j < i; j++) cum += coreLayers[j].h;
    return ((cum + local * coreLayers[i].h) / coreTotal) * coreColH;
  }
  function setCoreLabel(i, ratio) {
    if (i !== coreIdx) { coreIdx = i; coreNameEl.textContent = coreLayers[i].name; }
    coreDepthEl.textContent = depthLabel(ratio);
  }

  function updateCore(y, vh, docH) {
    if (!coreEl || !coreLayers.length || coreScrubbing || !coreColH) return;
    const probe = y + vh * 0.4;
    let i = 0;
    while (i < coreLayers.length - 1 && coreLayers[i + 1].top <= probe) i++;
    const local = clamp((probe - coreLayers[i].top) / coreLayers[i].h);
    coreEl.style.setProperty('--y', `${coreY(i, local).toFixed(1)}px`);
    setCoreLabel(i, clamp(probe / docH));
    // La etiqueta solo acompaña mientras hay movimiento
    coreEl.classList.add('is-active');
    clearTimeout(coreTimer);
    coreTimer = setTimeout(() => coreEl.classList.remove('is-active'), 900);
  }

  function initCore() {
    if (!coreEl) return;
    coreEl.hidden = false;
    layoutCore();
    let rt = 0;
    const relayout = () => { clearTimeout(rt); rt = setTimeout(() => { layoutCore(); update(); }, 150); };
    window.addEventListener('resize', relayout, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    window.addEventListener('load', relayout);
    // Contenido que cambia de alto (equipo desplegado, imágenes): se recalcula
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe($('main'));

    // Arrastre sobre el testigo: 1:1 con el dedo, salto a la capa al soltar
    let pid = null, target = 0;
    const pick = (clientY) => {
      const r = coreCol.getBoundingClientRect();
      const pos = clamp((clientY - r.top) / r.height) * coreTotal;
      let i = 0, cum = 0;
      while (i < coreLayers.length - 1 && cum + coreLayers[i].h < pos) { cum += coreLayers[i].h; i++; }
      const local = clamp((pos - cum) / coreLayers[i].h);
      if (i !== target && navigator.vibrate) navigator.vibrate(6); // cada capa se "siente" al cruzarla
      target = i;
      coreEl.style.setProperty('--y', `${coreY(i, local).toFixed(1)}px`);
      setCoreLabel(i, coreLayers[i].top / document.documentElement.scrollHeight);
    };
    coreEl.addEventListener('pointerdown', (e) => {
      if (pid !== null || coreEl.classList.contains('is-away')) return;
      pid = e.pointerId;
      try { coreEl.setPointerCapture(pid); } catch { /* puntero ya liberado */ }
      coreScrubbing = true;
      target = -1;
      clearTimeout(coreTimer);
      coreEl.classList.add('is-active', 'is-scrubbing');
      pick(e.clientY); // respuesta en pointer-down, no al soltar
    });
    coreEl.addEventListener('pointermove', (e) => { if (e.pointerId === pid) pick(e.clientY); });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      coreScrubbing = false;
      coreEl.classList.remove('is-scrubbing');
      const l = coreLayers[Math.max(0, target)];
      window.scrollTo({ top: Math.max(0, l.top - 8), behavior: reduced ? 'auto' : 'smooth' });
      trackEvent('Testigo: salto', { seccion: l.name });
    };
    coreEl.addEventListener('pointerup', end);
    coreEl.addEventListener('pointercancel', end);
  }

  /* 05e. BARRA INFERIOR -------------------------------------------------------
     Pestaña activa según la sección visible; "Cotizar" abre un menú que nace
     del botón (formulario o WhatsApp) y se cierra al tocar fuera, con Escape
     o al elegir. */
  const tabbar = $('[data-tabbar]');
  let quoteOpen = false;
  let closeQuoteMenu = () => {}; // lo asigna initTabbar; el drawer lo usa al abrirse
  function initTabbar() {
    if (!tabbar) return;
    const tabs = $$('[data-tab]', tabbar);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const t = tabs.find((x) => x.dataset.tab === en.target.id);
        if (!t) return;
        if (en.isIntersecting) { tabs.forEach((x) => x.removeAttribute('aria-current')); t.setAttribute('aria-current', 'true'); }
        else t.removeAttribute('aria-current');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    tabs.forEach((t) => { const sec = document.getElementById(t.dataset.tab); if (sec) io.observe(sec); });

    const qBtn = $('[data-quote-toggle]', tabbar);
    const qMenu = $('[data-quote-menu]', tabbar);
    function openQuote() {
      if (quoteOpen) return;
      quoteOpen = true;
      qMenu.hidden = false;
      qBtn.setAttribute('aria-expanded', 'true');
      qMenu.getAnimations().forEach((a) => a.cancel());
      qMenu.animate(
        reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px) scale(0.92)' }, { opacity: 1, transform: 'none' }],
        { duration: reduced ? 120 : 240, easing: EASE_OUT }
      );
      $('a', qMenu).focus({ preventScroll: true });
      trackEvent('Barra: cotizar');
    }
    function closeQuote(restore = false) {
      if (!quoteOpen) return;
      quoteOpen = false;
      qBtn.setAttribute('aria-expanded', 'false');
      const a = qMenu.animate(
        reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(4px) scale(0.96)' }],
        { duration: 140, easing: 'ease-in' }
      );
      a.onfinish = () => { if (!quoteOpen) qMenu.hidden = true; };
      if (restore) qBtn.focus({ preventScroll: true });
    }
    qBtn.addEventListener('click', () => (quoteOpen ? closeQuote() : openQuote()));
    qMenu.addEventListener('click', (e) => { if (e.target.closest('a')) closeQuote(); });
    document.addEventListener('pointerdown', (e) => { if (quoteOpen && !(e.target.closest && e.target.closest('.tabbar__quote'))) closeQuote(); }, { passive: true });
    tabbar.addEventListener('keydown', (e) => { if (e.key === 'Escape' && quoteOpen) { e.preventDefault(); closeQuote(true); } });
    // Con teclado: salir del menú con Tab lo cierra (sin robar el foco)
    $('.tabbar__quote', tabbar).addEventListener('focusout', (e) => {
      if (quoteOpen && !(e.relatedTarget && e.relatedTarget.closest('.tabbar__quote'))) closeQuote();
    });
    closeQuoteMenu = () => closeQuote();
  }

  /* 05f. PETROGLIFOS EN LOS RÓTULOS -------------------------------------------
     Cada rótulo de sección lleva uno de los motivos grabados del video
     (espiral, círculos, zigzag, figura humana, estratos), que se "graba" con
     stroke-dashoffset la primera vez que entra en pantalla. */
  function initGlyphs() {
    const GLYPHS = ['spiral', 'rings', 'zigzag', 'human', 'strata'];
    const els = $$('main .eyebrow').filter((el) => !el.closest('.hero, .voice') && !el.classList.contains('has-glyph'));
    els.forEach((el, i) => {
      el.insertAdjacentHTML('afterbegin', `<svg class="icon glyph" aria-hidden="true" focusable="false"><use href="#i-p-${GLYPHS[i % GLYPHS.length]}"/></svg>`);
      el.classList.add('has-glyph');
      if (getComputedStyle(el).textAlign === 'center') el.classList.add('is-centered');
    });
    if (reduced || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-drawn')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-drawn'); io.unobserve(en.target); } });
    }, { threshold: 1 });
    els.forEach((el) => io.observe(el));
  }

  /* 06. NAVBAR (aria-current según la sección visible) -------------------- */
  function initActiveNav() {
    const links = $$('.nav__links a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const a = map.get(en.target.id);
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* 08. REVELADOS con IntersectionObserver (threshold 0.2, una sola vez) --- */
  function initReveals() {
    const groups = $$('[data-reveal-group]');
    groups.forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--i', String(i))));
    const els = [...$$('[data-reveal]'), ...groups];

    if (!('IntersectionObserver' in window)) { els.forEach(finish); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        // Elementos más altos que el viewport: basta con que ocupen un 30% de pantalla
        const enough = en.intersectionRatio >= 0.2 || en.intersectionRect.height > window.innerHeight * 0.3;
        if (!en.isIntersecting || !enough) return;
        const el = en.target;
        io.unobserve(el);
        el.classList.add('is-in');
        const n = el.hasAttribute('data-reveal-group') ? el.children.length : 1;
        setTimeout(() => finish(el), 450 + n * 50 + 60);
      });
    }, { threshold: [0, 0.1, 0.2] });
    els.forEach((el) => io.observe(el));

    // Al terminar, retiramos los atributos para que el componente recupere sus hover
    function finish(el) {
      el.removeAttribute('data-reveal');
      el.removeAttribute('data-reveal-group');
      el.classList.remove('is-in');
    }
  }

  /* 09. PROCESO: la línea se dibuja y los pasos se activan en secuencia ---- */
  function initProcess() {
    const el = $('[data-process]');
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
  }

  /* 10. CONTADORES ------------------------------------------------------ */
  /* Odómetro: cada dígito es una columna 0–9 que rueda hasta su valor, como un
     contador mecánico. Las cifras menos significativas dan más vueltas, y las
     columnas arrancan en cascada de izquierda a derecha. Solo transform. */
  function initCounters() {
    const nums = $$('[data-count]');
    const fmt = new Intl.NumberFormat('es-CO');
    nums.forEach((el) => {
      const text = fmt.format(Number(el.dataset.count));
      const digits = [...text].filter((ch) => /\d/.test(ch)).length;
      let fromRight = digits;
      el.setAttribute('aria-hidden', 'true');
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      el.before(sr);
      el.textContent = '';
      el.classList.add('odo');
      [...text].forEach((ch) => {
        if (!/\d/.test(ch)) {
          const sep = document.createElement('span');
          sep.className = 'odo__sep';
          sep.textContent = ch;
          el.appendChild(sep);
          return;
        }
        fromRight--;
        const cycles = fromRight === 0 ? 2 : 1; // la última cifra gira más
        const col = document.createElement('span');
        col.className = 'odo__col';
        const strip = document.createElement('span');
        strip.className = 'odo__strip';
        strip.textContent = '0123456789'.repeat(cycles + 1).split('').join('\n');
        strip.dataset.final = String(cycles * 10 + Number(ch));
        col.appendChild(strip);
        el.appendChild(col);
      });
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        $$('.odo__strip', en.target).forEach((strip, i) => {
          if (reduced) strip.style.transition = 'none';
          else strip.style.transitionDelay = `${i * 70}ms`;
          strip.style.transform = `translateY(${-Number(strip.dataset.final)}em)`;
        });
      });
    }, { threshold: 0.5 });
    nums.forEach((n) => io.observe(n));
  }

  /* 11. LÍNEA DE TIEMPO: activa el modo sticky cuando hay espacio ---------- */
  function setupTimeline() {
    const canPin = !reduced && CSS.supports('position', 'sticky');
    timeline.classList.toggle('is-pinned', canPin);
    if (!canPin) {
      timeline.style.height = '';
      track.style.transform = '';
      return;
    }
    timelineDist = Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    if (timelineDist === 0) {
      timeline.classList.remove('is-pinned');
      timeline.style.height = '';
      return;
    }
    timeline.style.height = `${timelineDist + window.innerHeight}px`;
    update();
  }

  /* 11b. LÍNEA DE TIEMPO ARRASTRABLE ---------------------------------------
     El arrastre horizontal mueve el scroll real de la página (fuente única de
     verdad), así gesto y scroll nunca se contradicen. Al soltar: proyección de
     impulso de Apple → se elige la era más cercana a donde "caería" → spring
     con la velocidad del dedo. Más allá de los extremos: rubber-band. */
  function initTimelineDrag() {
    const tracker = velocityTracker();
    let pid = null, startX = 0, startT = 0, dragging = false, spring = null;

    const geometry = () => {
      const top = timeline.getBoundingClientRect().top + window.scrollY;
      const total = timeline.offsetHeight - window.innerHeight;
      return { top, total };
    };
    const currentT = () => {
      const { top, total } = geometry();
      return clamp((window.scrollY - top) / total) * timelineDist;
    };
    // Lleva la línea a la posición T (px de desplazamiento horizontal)
    const setT = (T) => {
      const { top, total } = geometry();
      const inside = clamp(T, 0, timelineDist);
      const over = T - inside; // >0 pasado del final, <0 antes del inicio
      tlOvershoot = over === 0 ? 0 : -rubberband(over, window.innerWidth);
      window.scrollTo({ top: top + (inside / timelineDist) * total, behavior: 'instant' });
      update();
    };
    const stops = () => {
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      return $$('.era', track).map((el) => clamp(el.offsetLeft - pad, 0, timelineDist));
    };

    track.addEventListener('pointerdown', (e) => {
      if (!timeline.classList.contains('is-pinned') || pid !== null || e.button > 0) return;
      if (spring) spring.stop(); // agarrar a mitad del movimiento: sigue desde ahí
      pid = e.pointerId; startX = e.clientX; dragging = false;
      startT = currentT() - tlOvershoot;
      tracker.reset(); tracker.add(e.clientX, 0);
    });
    track.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - startX;
      tracker.add(e.clientX, 0);
      if (!dragging) {
        if (Math.abs(dx) < 10) return; // histéresis antes de comprometer el eje
        dragging = true;
        track.setPointerCapture(e.pointerId);
        timeline.classList.add('is-dragging');
      }
      setT(startT - dx);
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      if (!dragging) return;
      dragging = false;
      timeline.classList.remove('is-dragging');
      const v = -tracker.get().x; // velocidad del desplazamiento (px/s)
      const from = currentT() - tlOvershoot;
      const projected = from + project(v);
      const s = stops();
      const target = s.reduce((best, x) => (Math.abs(x - projected) < Math.abs(best - projected) ? x : best), s[0]);
      spring = createSpring({ value: from, damping: 1, response: 0.5, precision: 0.5, onUpdate: (T) => setT(T) });
      spring.to(target, { velocity: v, onRest: () => { tlOvershoot = 0; update(); } });
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    // Si el usuario vuelve a hacer scroll, cede el control de inmediato
    ['wheel', 'touchstart', 'keydown'].forEach((ev) =>
      window.addEventListener(ev, () => { if (spring && spring.active && pid === null) { spring.stop(); tlOvershoot = 0; update(); } }, { passive: true })
    );
  }

  /* 11c. FICHA DE PROYECTO: la tarjeta se expande ----------------------------
     Continuidad espacial (Apple): la ficha nace de la tarjeta y vuelve a ella.
     El panel final se escala de forma uniforme (sin deformar texto ni foto)
     desde el tamaño de la tarjeta, y un clip-path recorta lo que sobra, así la
     silueta coincide exactamente con la tarjeta al inicio. Todo lo mueve un
     único spring (t: 0 = tarjeta, 1 = ficha): cerrar a mitad de la apertura
     invierte el movimiento desde donde va, sin saltos.
     Datos reales: noticias de corporacionsipah.org y los artículos de prensa
     originales sobre cada hallazgo. "url" es el enlace directo al artículo del
     medio (no a la página de SIPAH) y "source" el nombre que se muestra. */
  const PROJECTS = {
    tumbas: {
      meta: 'Área metropolitana de Medellín · 2.000 años',
      title: 'Hallan 3 tumbas de 2.000 años de antigüedad al sur de Medellín',
      img: IMG + 'colombia4_0d9ebaf0.jpg',
      alt: 'Excavación de las tumbas prehispánicas halladas al sur de Medellín',
      text: [
        'Arqueólogos identificaron tres tumbas de más de 2.000 años de antigüedad en el área metropolitana de Medellín; el primer hallazgo se produjo el 16 de mayo de 2016 en Itagüí.',
        'Según la Corporación SIPAH, las tumbas tenían una profundidad de hasta dos metros y cada una contenía dos vasijas.',
      ],
      facts: [['Ubicación', 'Itagüí, sur del Valle de Aburrá'], ['Antigüedad', 'Más de 2.000 años'], ['Hallazgo', '3 tumbas'], ['Contenido', '2 vasijas por tumba · hasta 2 m de profundidad']],
      url: 'https://artdaily.com/news/87817/Pre-Hispanic-tombs-found-in-Colombia-are-over-2-000-ye',
      source: 'AFP (en inglés)',
    },
    telemedellin: {
      meta: 'Medellín · 2.500 años',
      title: 'Hallazgo de hace 2.500 años en sede de Telemedellín',
      img: IMG + 'hallazgo-vasijas-telemedellin.jpg',
      alt: 'Vasijas cerámicas precolombinas halladas en la sede de Telemedellín',
      text: [
        'En 2015, durante las excavaciones del canal del parque Gabriel García Márquez, en la sede de Telemedellín (El Poblado), se registró un hallazgo en un lugar con más de 2.500 años de antigüedad.',
        'Las piezas halladas tendrían entre 2.500 y 3.000 años. El trabajo arqueológico estuvo a cargo de la Corporación SIPAH, con el arqueólogo Juan Pablo Díez.',
      ],
      facts: [['Ubicación', 'Sede de Telemedellín, El Poblado'], ['Año', '2015'], ['Antigüedad', '2.500 – 3.000 años'], ['Hallazgo', 'Vasijas cerámicas']],
      url: 'https://www.medellin.gov.co/es/sala-de-prensa/noticias/hallados-yacimientos-arqueologicos-en-zona-del-canal-telemedellin/',
      source: 'Alcaldía de Medellín',
    },
    itagui: {
      meta: 'Itagüí · 2.000 años',
      title: 'Tumba indígena de más de 2.000 años fue encontrada en Itagüí',
      img: IMG + 'noticia-caracol.jpg',
      alt: 'Reportaje de Noticias Caracol sobre el hallazgo arqueológico de hace dos mil años en Itagüí',
      text: [
        'Una tumba con dos vasijas en cerámica hechas hace unos 2.000 años fue encontrada por arqueólogos en el terreno donde se construía el Centro Integral Parque de las Luces, en Itagüí.',
        'El hallazgo apareció tras el movimiento de tierra de una retroexcavadora. La Corporación SIPAH, dirigida por el arqueólogo Juan Pablo Díez Ramírez, quedó a cargo de su estudio.',
      ],
      facts: [['Ubicación', 'Parque de las Luces, Itagüí'], ['Fecha', 'Mayo de 2016'], ['Antigüedad', 'Unos 2.000 años'], ['Hallazgo', 'Tumba con dos vasijas de cerámica']],
      url: 'https://www.elcolombiano.com/antioquia/tumba-indigena-de-mas-de-2-000-anos-fue-encontrada-en-itagui-MF4171824',
      source: 'El Colombiano',
    },
  };

  function initProjectSheet() {
    const sheet = $('[data-sheet]');
    const panel = $('[data-sheet-panel]', sheet);
    const scrim = $('.sheet__scrim', sheet);
    const more = $('[data-sheet-more]', sheet);
    const closeBtn = $('.sheet__close', sheet);
    let card = null, opener = null, geo = null, isOpen = false, afterClose = null;

    const frame = (t) => {
      if (!geo) return;
      const s = geo.s0 + (1 - geo.s0) * t;
      const r = (10 + 6 * t) / s; // radio visual de 10px (tarjeta) a 16px (ficha)
      panel.style.transform = `translate(${geo.dx * (1 - t)}px, ${geo.dy * (1 - t)}px) scale(${s})`;
      panel.style.clipPath = `inset(0 ${geo.ir * (1 - t)}px ${geo.ib * (1 - t)}px 0 round ${r}px)`;
      scrim.style.opacity = String(clamp(t));
      // El contenido extra de la ficha aparece cuando ya casi tiene su tamaño
      const extra = String(clamp((t - 0.45) / 0.55));
      more.style.opacity = extra;
      closeBtn.style.opacity = extra;
    };
    const spring = createSpring({ value: 0, damping: 1, response: 0.42, precision: 0.0005, onUpdate: frame });

    function measure() {
      panel.style.transform = 'none';
      panel.style.clipPath = 'none';
      const p = panel.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      const s0 = Math.max(c.width / p.width, c.height / p.height);
      geo = { dx: c.left - p.left, dy: c.top - p.top, s0, ir: Math.max(0, p.width - c.width / s0), ib: Math.max(0, p.height - c.height / s0) };
    }

    function open(id, btn) {
      const data = PROJECTS[id];
      if (!data || isOpen) return;
      isOpen = true;
      trackEvent('Ficha de hallazgo', { hallazgo: id, origen: btn.closest('.project') ? 'tarjeta' : 'mapa' });
      opener = btn;
      // Origen de la ficha: la tarjeta, o el propio pin / fila del mapa de hallazgos
      card = btn.closest('.project') || btn;
      $('[data-sheet-img]', sheet).src = data.img;
      $('[data-sheet-img]', sheet).alt = data.alt;
      $('[data-sheet-meta]', sheet).textContent = data.meta;
      $('[data-sheet-title]', sheet).textContent = data.title;
      $('[data-sheet-text]', sheet).innerHTML = data.text.map((p) => `<p>${p}</p>`).join('');
      $('[data-sheet-facts]', sheet).innerHTML = data.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
      const srcLink = $('[data-sheet-source]', sheet);
      srcLink.href = data.url;
      srcLink.firstChild.textContent = `Leer en ${data.source} `;
      sheet.hidden = false;
      panel.scrollTop = 0;
      lockScroll();
      if (!spring.active) { measure(); frame(spring.value); } // pinta ya el estado inicial: sin parpadeo
      card.style.visibility = 'hidden';
      if (reduced) { geo = null; panel.style.transform = 'none'; panel.style.clipPath = 'none'; panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 }); scrim.style.opacity = '1'; more.style.opacity = '1'; closeBtn.style.opacity = '1'; }
      else spring.to(1, { response: 0.42 });
      closeBtn.focus({ preventScroll: true });
    }

    function close(then) {
      if (!isOpen) return;
      isOpen = false;
      afterClose = then || null;
      panel.scrollTop = 0;
      const done = () => {
        sheet.hidden = true;
        if (card) card.style.visibility = '';
        unlockScroll();
        if (afterClose) afterClose(); else opener?.focus({ preventScroll: true });
        afterClose = null;
      };
      if (reduced) { panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150 }).finished.then(done); return; }
      spring.to(0, { response: 0.36, onRest: done });
    }

    $$('[data-project-open]').forEach((btn) => btn.addEventListener('click', () => open(btn.dataset.projectOpen, btn)));
    $$('[data-sheet-close]', sheet).forEach((el) => el.addEventListener('click', () => close()));
    $('[data-sheet-cta]', sheet).addEventListener('click', (e) => {
      e.preventDefault();
      close(() => document.getElementById('contacto').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
    });
    sheet.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else trapFocus(panel, e);
    });
    window.addEventListener('resize', () => { if (isOpen && card && !spring.active) { measure(); frame(1); } }, { passive: true });
  }

  /* 11d. TÍTULOS QUE SE REVELAN POR LÍNEA -----------------------------------
     Cada palabra va en una máscara; las palabras suben desde abajo agrupadas
     por línea visual (stagger por línea, no por palabra), como en apple.com.
     Conserva <em> y el texto sigue siendo legible para lectores de pantalla. */
  function initSplitTitles() {
    // Solo el H1 del inicio: un único momento de movimiento tipográfico, no en cada sección
    const titles = $$('[data-split]');
    const wrapWords = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span');
            w.className = 'split-word';
            const i = document.createElement('span');
            i.className = 'split-word__i';
            i.textContent = part;
            w.appendChild(i);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          wrapWords(child);
        }
      });
    };
    const assignLines = (title) => {
      let line = -1, lastTop = null;
      $$('.split-word', title).forEach((w) => {
        const top = w.offsetTop;
        if (lastTop === null || Math.abs(top - lastTop) > 4) { line++; lastTop = top; }
        w.firstChild.style.setProperty('--line', String(line));
      });
    };
    titles.forEach((t) => { wrapWords(t); t.classList.add('split-title'); });
    const layout = () => titles.forEach((t) => { if (!t.classList.contains('is-in')) assignLines(t); });
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); }, { passive: true });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        en.target.classList.add('is-in');
      });
    }, { threshold: 0.3 });
    titles.forEach((t) => {
      if (t.hasAttribute('data-split')) requestAnimationFrame(() => t.classList.add('is-in')); // el H1 entra al cargar
      else io.observe(t);
    });
  }

  /* 11e. EQUIPO: perfiles profesionales ---------------------------------------
     · Fotos del sitio oficial con respaldo de iniciales si alguna no carga.
     · "Ver los 32 perfiles" despliega el resto con un fundido corto; al
       contraer se compensa el scroll para que el botón no salte bajo el dedo. */
  function initTeam() {
    const team = $('[data-team]');
    if (!team) return;
    $$('.leader__photo img, .member__photo img', team).forEach((img) => {
      const miss = () => img.parentElement.classList.add('is-missing');
      if (img.complete && img.naturalWidth === 0) miss();
      else img.addEventListener('error', miss, { once: true });
    });

    const btn = $('[data-team-toggle]', team);
    const label = $('[data-team-label]', btn);
    const total = $$('.leader, .member', team).length;
    btn.addEventListener('click', () => {
      const open = !team.classList.contains('is-open');
      const before = btn.getBoundingClientRect().top;
      team.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Mostrar menos' : `Ver los ${total} perfiles`;
      if (open) {
        if (!reduced) {
          $$('.is-extra', team).forEach((el, i) => {
            el.animate(
              [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
              { duration: 300, delay: Math.min(i, 10) * 25, easing: EASE_OUT, fill: 'backwards' }
            );
          });
        }
      } else {
        // Mantener el botón en el mismo lugar de la pantalla tras contraer
        window.scrollBy({ top: btn.getBoundingClientRect().top - before, behavior: 'instant' });
      }
    });
  }

  /* 11f. MAPA DE HALLAZGOS ---------------------------------------------------
     Pin y fila de la lista se iluminan juntos (mapping: el control muestra lo
     que afecta). Al entrar en pantalla los pines caen en cascada, una sola vez. */
  function initSites() {
    const root = $('[data-sites]');
    if (!root) return;
    const pins = $$('[data-pin]', root);
    const rows = $$('[data-site]', root);
    const hot = (key, on) => {
      pins.forEach((p) => p.classList.toggle('is-hot', on && p.dataset.pin === key));
      rows.forEach((r) => r.classList.toggle('is-hot', on && r.dataset.site === key));
    };
    [...pins.map((p) => [p, p.dataset.pin]), ...rows.map((r) => [r, r.dataset.site])].forEach(([el, key]) => {
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hot(key, true); });
      el.addEventListener('pointerleave', () => hot(key, false));
      el.addEventListener('focus', () => hot(key, true));
      el.addEventListener('blur', () => hot(key, false));
    });
    if (reduced || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      pins.forEach((p, i) => {
        $('.pin__n', p).animate(
          [{ opacity: 0, transform: 'translateY(-10px) scale(0.7)' }, { opacity: 1, transform: 'none' }],
          { duration: 420, delay: 250 + i * 90, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)', fill: 'backwards' }
        );
      });
    }, { threshold: 0.35 });
    io.observe($('.sites__map', root));
  }

  /* 11g. EXCAVACIÓN INTERACTIVA: raspar la tierra sobre el petroglifo ---------
     Un canvas pinta una capa de suelo con los colores Munsell del sitio. El
     dedo o el cursor la retiran 1:1 (pincel suave, trazo continuo entre
     eventos). Al despejar ~50% el resto se desvanece y el gesto se libera.
     "Descubrir todo" hace lo mismo para teclado y lectores de pantalla. */
  function initDig() {
    const fig = $('[data-dig]');
    if (!fig) return;
    const wrap = $('.dig', fig);
    const canvas = $('[data-dig-canvas]', fig);
    const allBtn = $('[data-dig-all]', fig);
    const ctx = canvas.getContext && canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    let w = 0, dpr = 1, done = false, started = false, last = null, pid = null, moves = 0;

    function paintSoil() {
      const r = wrap.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      const h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#8A6240'); g.addColorStop(0.5, '#A47B4F'); g.addColorStop(1, '#5C4430');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Grano y gravilla con semilla fija: la tierra es igual en cada visita
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const colors = ['#4A3728', '#C9AE84', '#DDD3BD', '#7A5534', '#A47B4F'];
      for (let i = 0, n = Math.round((w * h) / 70); i < n; i++) {
        ctx.globalAlpha = 0.2 + rnd() * 0.5;
        ctx.fillStyle = colors[i % colors.length];
        const s = 0.6 + rnd() * 2;
        ctx.fillRect(rnd() * w, rnd() * h, s, s);
      }
      for (let i = 0, n = Math.round((w * h) / 7000); i < n; i++) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = colors[1 + (i % 2)];
        ctx.beginPath();
        ctx.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function scratch(x, y) {
      ctx.globalCompositeOperation = 'destination-out';
      const r = Math.max(22, w * 0.065);
      const from = last || { x, y };
      const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (r * 0.3)));
      for (let i = 1; i <= steps; i++) {
        const px = from.x + ((x - from.x) * i) / steps;
        const py = from.y + ((y - from.y) * i) / steps;
        const grad = ctx.createRadialGradient(px, py, r * 0.3, px, py, r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      last = { x, y };
    }

    // Proporción despejada, muestreando 1 de cada 24 píxeles
    function cleared() {
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < d.length; i += 96) { total++; if (d[i] < 40) clear++; }
      return total ? clear / total : 0;
    }

    function finish() {
      if (done) return;
      done = true;
      wrap.classList.add('is-done');
      trackEvent('Petroglifo descubierto');
      if (navigator.vibrate) navigator.vibrate(12); // cierre del gesto: un toque, mismo frame que el fundido
      setTimeout(() => { allBtn.hidden = true; }, 300);
    }

    const point = (e) => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (done || pid !== null || e.button > 0) return;
      pid = e.pointerId;
      try { canvas.setPointerCapture(pid); } catch { /* puntero ya liberado */ }
      started = true;
      wrap.classList.add('is-digging');
      last = null;
      scratch(...point(e)); // respuesta inmediata en pointer-down
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      scratch(...point(e));
      if (++moves % 12 === 0 && cleared() > 0.5) finish();
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      last = null;
      if (!done && cleared() > 0.5) finish();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    allBtn.addEventListener('click', () => {
      finish();
      fig.tabIndex = -1;
      fig.focus({ preventScroll: true }); // el botón desaparece: el foco pasa a la figura
    });

    paintSoil();
    wrap.classList.add('is-ready');
    // Si cambia el ancho: se repinta si nadie ha raspado; si ya empezó, se descubre
    let lastW = w;
    new ResizeObserver(() => {
      if (done) return;
      const nw = wrap.getBoundingClientRect().width;
      if (Math.abs(nw - lastW) < 1) return;
      lastW = nw;
      if (started) finish(); else paintSoil();
    }).observe(wrap);
  }

  /* 11h. ASISTENTE ICANH: "¿Necesito arqueología preventiva?" ---------------
     Tres preguntas, una por pantalla. Con el puntero avanza al elegir; con
     teclado las flechas eligen (sin avanzar) y Enter avanza. Cada paso entra
     desde el lado hacia el que se avanza y vuelve por el mismo camino. Al
     final, "Solicitar cotización" rellena el formulario con las respuestas. */
  function initQuiz() {
    const quiz = $('[data-quiz]');
    if (!quiz) return;
    const steps = $$('[data-q]', quiz);
    const result = $('[data-quiz-result]', quiz);
    const panes = [...steps, result];
    const stepLabel = $('[data-quiz-step]', quiz);
    const bar = $('[data-quiz-bar]', quiz);
    const back = $('[data-quiz-back]', quiz);
    const cta = $('[data-quiz-cta]', quiz);
    const answers = {};
    let cur = 0, advanceT = 0;

    const LABEL = { si: 'Sí', no: 'No', nose: 'No lo sé' };
    function verdict(a) {
      if (a.licencia === 'si') return {
        title: 'Sí: necesitas un Programa de Arqueología Preventiva',
        detail: 'Los proyectos que requieren licencia ambiental deben tener un programa aprobado por el ICANH antes de intervenir el suelo. Lo formulamos, lo radicamos y lo ejecutamos con nuestro equipo y laboratorio.',
        tipo: /pública/.test(a.obra || '') ? 'Arqueología preventiva / obra pública' : 'Arqueología preventiva / obra privada',
      };
      if (a.suelo === 'no') return {
        title: 'Probablemente no lo necesites',
        detail: 'Si la obra no remueve suelo, el riesgo de afectar patrimonio arqueológico es bajo. Si el predio está en una zona de interés del POT, conviene confirmarlo.',
        tipo: 'Diagnóstico de potencial arqueológico',
      };
      if (a.licencia === 'nose') return {
        title: 'Revisémoslo juntos',
        detail: 'Depende de si la obra necesita licencia ambiental. Con la ubicación y el alcance te decimos qué aplica en tu caso.',
        tipo: 'Diagnóstico de potencial arqueológico',
      };
      return {
        title: 'Recomendable: un diagnóstico de potencial arqueológico',
        detail: 'Aunque no requiera licencia ambiental, una obra que remueve suelo puede encontrar evidencias. Si aparecen, hay que avisar al ICANH y la intervención puede tener que suspenderse; un diagnóstico previo evita esa sorpresa.',
        tipo: 'Diagnóstico de potencial arqueológico',
      };
    }

    function show(next) {
      if (next === cur) return;
      const dir = next > cur ? 1 : -1;
      const from = panes[cur], to = panes[next];
      cur = next;
      from.getAnimations().forEach((a) => a.cancel());
      from.hidden = true;
      to.hidden = false;
      to.animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: 'none' }],
        { duration: reduced ? 150 : 300, easing: EASE_OUT }
      );
      const total = steps.length;
      stepLabel.textContent = next < total ? `Paso ${next + 1} de ${total}` : 'Resultado';
      bar.style.transform = `scaleX(${Math.min(1, (next + 1) / total)})`;
      back.hidden = next === 0;
      if (next === total) {
        const v = verdict(answers);
        $('[data-quiz-verdict]', quiz).textContent = v.title;
        $('[data-quiz-detail]', quiz).textContent = v.detail;
        trackEvent('Asistente completado', { resultado: v.title, obra: answers.obra || '' });
        result.focus({ preventScroll: true });
      } else if (quiz.contains(document.activeElement) && document.activeElement.type === 'radio') {
        ($('input:checked', to) || $('input', to)).focus({ preventScroll: true });
      }
    }

    quiz.addEventListener('change', (e) => {
      if (e.target.type === 'radio') answers[e.target.name] = e.target.value;
    });
    // detail > 0 = clic real de puntero (las flechas del teclado también disparan click, con detail 0)
    quiz.addEventListener('click', (e) => {
      const input = e.target.closest('input[type="radio"]');
      if (!input || e.detail === 0) return;
      clearTimeout(advanceT);
      advanceT = setTimeout(() => show(cur + 1), reduced ? 0 : 220); // se ve la selección antes de avanzar
    });
    quiz.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.target.type !== 'radio') return;
      e.preventDefault();
      if (answers[e.target.name]) show(cur + 1);
    });
    quiz.addEventListener('submit', (e) => e.preventDefault());
    back.addEventListener('click', () => { clearTimeout(advanceT); show(Math.max(0, cur - 1)); });

    cta.addEventListener('click', () => {
      if (!answers.obra) return; // sin respuestas: solo lleva al formulario
      const v = verdict(answers);
      const tipo = $('#f-tipo');
      const msg = $('#f-mensaje');
      if (cur === steps.length && tipo) tipo.value = v.tipo;
      if (msg && !msg.value.trim()) {
        msg.value = [
          `Obra: ${answers.obra}.`,
          answers.licencia ? `Licencia ambiental: ${LABEL[answers.licencia]}.` : '',
          answers.suelo ? `Remueve suelo: ${LABEL[answers.suelo]}.` : '',
          'Ubicación del proyecto: ',
        ].filter(Boolean).join('\n');
      }
      toast({ title: 'Formulario adelantado', description: 'Pasamos tus respuestas a la solicitud. Completa tus datos y la ubicación.' });
    });
  }

  /* 12. DRAWER MÓVIL estilo Vaul -------------------------------------------
     Se arrastra hacia abajo para cerrar (1:1 con el dedo), cierra por
     distancia (30%) o por velocidad; hacia arriba aplica fricción. */
  const drawer = $('[data-drawer]');
  const overlay = $('[data-drawer-overlay]');
  const menuBtns = $$('[data-drawer-open]'); // botón del nav y "Más" de la barra inferior
  let drawerOpener = null;                     // el que lo abrió recupera el foco al cerrar
  let drawerOpen = false;
  let drawerTimer = 0;

  /* Física del drawer: y = 0 abierto, y = altura cerrado. Un único spring
     interrumpible mueve el panel y el fondo; abrir/cerrar/arrastrar solo cambian
     su objetivo, así nunca hay saltos aunque se toque a mitad de animación. */
  const drawerH = () => drawer.offsetHeight || window.innerHeight * 0.7;
  const drawerSpring = createSpring({
    value: 0, damping: 1, response: 0.35, precision: 0.5,
    onUpdate: (y) => {
      drawer.style.transform = `translateY(${y}px)`;
      overlay.style.opacity = String(1 - clamp(y / drawerH()));
    },
  });

  function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;
    clearTimeout(drawerTimer);
    const wasHidden = drawer.hidden;
    drawer.hidden = false;
    overlay.hidden = false;
    if (wasHidden) drawerSpring.set(drawerH()); // arranca justo fuera de pantalla
    menuBtns.forEach((b) => b.setAttribute('aria-expanded', 'true'));
    lockScroll();
    if (reduced) drawerSpring.set(0);
    else drawerSpring.to(0, { damping: 1, response: 0.35 }); // apertura por toque: sin rebote
    $('a', drawer).focus({ preventScroll: true });
  }

  function closeDrawer({ restoreFocus = true, velocity = 0 } = {}) {
    if (!drawerOpen) return;
    drawerOpen = false;
    menuBtns.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    unlockScroll();
    const hide = () => { drawer.hidden = true; overlay.hidden = true; };
    if (reduced) { drawerSpring.set(drawerH()); hide(); }
    else drawerSpring.to(drawerH(), { velocity, damping: 1, response: 0.3, onRest: hide });
    if (restoreFocus) (drawerOpener || menuBtns[0]).focus({ preventScroll: true });
  }

  function initDrawer() {
    menuBtns.forEach((b) => b.addEventListener('click', () => { drawerOpener = b; closeQuoteMenu(); openDrawer(); }));
    overlay.addEventListener('click', () => closeDrawer());
    $('[data-drawer-close]', drawer).addEventListener('click', () => closeDrawer());
    $$('a', drawer).forEach((a) => a.addEventListener('click', () => closeDrawer({ restoreFocus: false })));
    drawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
      else trapFocus(drawer, e);
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) closeDrawer({ restoreFocus: false }); });

    /* Arrastre 1:1 respetando el punto de agarre; al soltar se proyecta el
       impulso (Apple) y se decide abrir/cerrar según dónde "caería" el panel.
       La velocidad del dedo pasa al spring: sin costura entre gesto y animación. */
    const tracker = velocityTracker();
    let grabOffset = 0, startY = 0, dragging = false, pid = null, suppressClick = false;
    drawer.addEventListener('pointerdown', (e) => {
      if (pid !== null || !drawerOpen) return; // protección multi-touch
      pid = e.pointerId; startY = e.clientY; dragging = false;
      grabOffset = e.clientY - drawerSpring.value; // si estaba en movimiento, se agarra donde está
      tracker.reset(); tracker.add(0, e.clientY);
    });
    drawer.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      tracker.add(0, e.clientY);
      if (!dragging) {
        if (Math.abs(e.clientY - startY) < 10) return; // histéresis
        dragging = true;
        drawer.setPointerCapture(e.pointerId);
      }
      const raw = e.clientY - grabOffset;
      // Hacia arriba: rubber-band de Apple en vez de un tope seco
      drawerSpring.set(raw >= 0 ? raw : rubberband(raw, drawerH()));
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      if (!dragging) return;
      dragging = false;
      suppressClick = true;
      const v = tracker.get().y;
      const projected = drawerSpring.value + project(v, 0.99);
      if (projected > drawerH() * 0.5) {
        closeDrawer({ velocity: v });
      } else {
        // Vuelve a abierto con la inercia del gesto: un rebote sutil (damping 0.8) porque hubo impulso
        drawerSpring.to(0, { velocity: v, damping: 0.8, response: 0.3 });
      }
    };
    drawer.addEventListener('pointerup', end);
    drawer.addEventListener('pointercancel', end);
    // Evita que soltar tras arrastrar active un enlace
    drawer.addEventListener('click', (e) => {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
    }, true);
  }

  /* 13. TOASTER estilo Sonner ----------------------------------------------
     toast({ type, title, description, duration }).
     Apilado con escala, expansión al hover, timers pausados en hover y con la
     pestaña oculta, y swipe horizontal para cerrar (por distancia o velocidad). */
  const toasterList = $('[data-toaster]');
  const toasts = [];
  const GAP = 14;
  const VISIBLE = 3;
  let expanded = false;

  function layoutToasts() {
    let offset = 0;
    toasts.forEach((t, i) => {
      t.el.style.zIndex = String(toasts.length - i);
      let transform;
      let opacity = 1;
      if (!t.mounted) { transform = 'translateY(100%)'; opacity = 0; }
      else if (t.removed) { transform = t.exitTransform || 'translateY(100%)'; opacity = 0; }
      else if (expanded) { transform = `translateY(${-offset}px)`; }
      else {
        transform = `translateY(${-i * GAP}px) scale(${1 - i * 0.05})`;
        if (i >= VISIBLE) opacity = 0;
      }
      if (!t.removed) offset += t.height + GAP;
      t.base = transform;
      t.el.style.transform = transform;
      t.el.style.opacity = String(opacity);
    });
    const front = toasts.find((t) => !t.removed);
    toasterList.style.height = `${expanded ? Math.max(0, offset - GAP) : front ? front.height : 0}px`;
  }

  function startTimer(t) {
    if (t.remaining === Infinity) return;
    t.start = Date.now();
    t.timer = setTimeout(() => dismissToast(t), t.remaining);
  }
  function pauseTimer(t) {
    clearTimeout(t.timer);
    if (t.start) t.remaining -= Date.now() - t.start;
  }

  function dismissToast(t, exitTransform) {
    if (t.removed) return;
    clearTimeout(t.timer);
    t.removed = true;
    t.exitTransform = exitTransform;
    layoutToasts();
    setTimeout(() => {
      t.el.remove();
      toasts.splice(toasts.indexOf(t), 1);
      layoutToasts();
    }, 400);
  }

  function toast({ type = 'success', title, description = '', duration = 4500 }) {
    const el = document.createElement('li');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `
      <svg class="toast__icon" aria-hidden="true"><use href="#${type === 'error' ? 'i-alert' : 'i-check'}"/></svg>
      <div><p class="toast__title"></p>${description ? '<p class="toast__desc"></p>' : ''}</div>`;
    $('.toast__title', el).textContent = title;
    if (description) $('.toast__desc', el).textContent = description;
    toasterList.prepend(el);

    const t = { el, mounted: false, removed: false, height: el.offsetHeight, remaining: duration, base: '' };
    toasts.unshift(t);
    layoutToasts();
    requestAnimationFrame(() => requestAnimationFrame(() => { t.mounted = true; layoutToasts(); }));
    if (!expanded && !document.hidden) startTimer(t);

    // Swipe para cerrar
    let sx = 0, st = 0, dx = 0, pid = null;
    el.addEventListener('pointerdown', (e) => {
      if (pid !== null || t.removed) return;
      pid = e.pointerId; sx = e.clientX; st = performance.now(); dx = 0;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      dx = e.clientX - sx;
      el.style.transform = `${t.base} translateX(${dx}px)`;
      el.style.opacity = String(1 - clamp(Math.abs(dx) / 260));
    });
    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      el.classList.remove('is-dragging');
      const v = Math.abs(dx) / Math.max(1, performance.now() - st);
      if (Math.abs(dx) > 70 || (v > 0.11 && Math.abs(dx) > 8)) {
        dismissToast(t, `${t.base} translateX(${dx > 0 ? 110 : -110}%)`);
      } else {
        el.style.transform = t.base;
        el.style.opacity = '1';
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    return t;
  }

  function initToaster() {
    toasterList.addEventListener('pointerenter', () => {
      expanded = true;
      toasts.forEach(pauseTimer);
      layoutToasts();
    });
    toasterList.addEventListener('pointerleave', () => {
      expanded = false;
      toasts.forEach((t) => !t.removed && startTimer(t));
      layoutToasts();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) toasts.forEach(pauseTimer);
      else if (!expanded) toasts.forEach((t) => !t.removed && startTimer(t));
    });
  }

  /* 14. FORMULARIO con validación en línea -------------------------------
     Si FORM_ENDPOINT está vacío, se abre el cliente de correo con los datos
     (no hay backend). Para un servicio tipo Formspree, pega aquí su URL. */
  const FORM_ENDPOINT = ''; // TODO: p. ej. 'https://formspree.io/f/xxxxxx'
  const form = $('[data-form]');
  const RULES = {
    nombre: (v) => (v.trim().length >= 2 ? '' : 'Escribe tu nombre (mínimo 2 caracteres).'),
    correo: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Escribe un correo válido, por ejemplo nombre@empresa.com.'),
    telefono: (v) => {
      const digits = v.replace(/\D/g, '');
      if (!/^[\d\s+()-]*$/.test(v)) return 'Usa solo números, espacios, + o guiones.';
      return digits.length >= 7 && digits.length <= 15 ? '' : 'Escribe un teléfono de 7 a 15 dígitos.';
    },
    tipo: (v) => (v ? '' : 'Selecciona el tipo de proyecto.'),
    mensaje: (v) => (v.trim().length >= 10 ? '' : 'Cuéntanos un poco más (mínimo 10 caracteres).'),
  };

  function validateField(input) {
    const rule = RULES[input.name];
    if (!rule) return true;
    const msg = rule(input.value);
    const err = document.getElementById(`e-${input.name}`);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err.textContent !== msg) err.textContent = msg;
    return !msg;
  }

  function initForm() {
    const fields = $$('input, select, textarea', form).filter((f) => RULES[f.name]);
    fields.forEach((f) => {
      f.addEventListener('blur', () => { if (f.value || f.dataset.touched) { f.dataset.touched = '1'; validateField(f); } });
      f.addEventListener('input', () => { if (f.dataset.touched) validateField(f); });
      f.addEventListener('change', () => { if (f.tagName === 'SELECT') { f.dataset.touched = '1'; validateField(f); } });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      fields.forEach((f) => (f.dataset.touched = '1'));
      const invalid = fields.filter((f) => !validateField(f));
      if (invalid.length) {
        invalid[0].focus();
        toast({ type: 'error', title: 'Revisa los campos marcados', description: `${invalid.length} ${invalid.length === 1 ? 'campo necesita' : 'campos necesitan'} atención.` });
        return;
      }
      const data = Object.fromEntries(new FormData(form));
      const btn = $('button[type="submit"]', form);
      const label = $('.btn__label', btn);
      btn.disabled = true;
      btn.classList.add('is-loading');
      label.textContent = 'Enviando…';

      try {
        if (FORM_ENDPOINT) {
          const res = await fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          fields.forEach((f) => { delete f.dataset.touched; f.removeAttribute('aria-invalid'); });
          trackEvent('Cotización enviada', { tipo: data.tipo, via: 'formulario' });
          toast({ title: 'Solicitud enviada', description: `Gracias, ${data.nombre.split(' ')[0]}. Te responderemos en un máximo de 2 días hábiles.` });
        } else {
          const body = [
            `Nombre: ${data.nombre}`,
            `Empresa: ${data.empresa || '—'}`,
            `Correo: ${data.correo}`,
            `Teléfono: ${data.telefono}`,
            `Tipo de proyecto: ${data.tipo}`,
            '',
            data.mensaje,
          ].join('\n');
          const href = `mailto:sipahitagui@gmail.com?subject=${encodeURIComponent('Solicitud de cotización · ' + data.tipo)}&body=${encodeURIComponent(body)}`;
          trackEvent('Cotización enviada', { tipo: data.tipo, via: 'correo' });
          toast({ title: 'Solicitud lista', description: 'Abrimos tu aplicación de correo con los datos para que la envíes.' });
          window.location.href = href;
        }
      } catch (err) {
        toast({ type: 'error', title: 'No pudimos enviar la solicitud', description: 'Inténtalo de nuevo o escríbenos a sipahitagui@gmail.com.' });
      } finally {
        btn.disabled = false;
        btn.classList.remove('is-loading');
        label.textContent = 'Enviar solicitud';
      }
    });
  }

  /* 15. INIT ------------------------------------------------------------- */
  function init() {
    renderGallery();
    initFilters();
    initLightbox();
    initAnalytics();
    initTrackedClicks();
    initHeroVideo();
    initMap();
    initGlyphs();
    initTabbar();
    initCore();
    initActiveNav();
    initReveals();
    initProcess();
    initCounters();
    initDrawer();
    initTimelineDrag();
    initProjectSheet();
    initSplitTitles();
    initTeam();
    initSites();
    initDig();
    initQuiz();
    initToaster();
    initForm();
    setupTimeline();

    const year = $('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());

    window.addEventListener('scroll', onScroll, { passive: true });
    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(setupTimeline, 120);
    }, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setupTimeline);

    motionQuery.addEventListener('change', (e) => {
      reduced = e.matches;
      setupTimeline();
    });
    update();
  }

  init();
  window.toast = toast; // API pública tipo Sonner: toast({ title, description })
})();
