/* ==========================================================================
   SIPAH Corporation · galeria.js
   Página de galería: cada imagen con su historia, agrupadas por capítulos.
   Vanilla JS, sin librerías.

   01. Datos (capítulos + historias)   04. Índice de capítulos activo
   02. Render                          05. Visor (FLIP desde la miniatura)
   03. Navbar + drawer + revelados     06. Init

   Las historias se redactaron con la información publicada en el sitio y en
   corporacionsipah.org. Para corregir o ampliar una historia, edita su objeto
   en STORIES: el texto se pinta tal cual (cada elemento de "text" = un párrafo).
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  motionQuery.addEventListener('change', (e) => { reduced = e.matches; });
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const IMG = 'img-original/';

  /* 01. DATOS ------------------------------------------------------------ */
  const CHAPTERS = [
    { id: 'arqueologia', title: 'Bajo la tierra', label: 'Arqueología',
      intro: 'Hallazgos que reescriben la historia del Valle de Aburrá: tumbas, vasijas y el trabajo minucioso que viene después de excavar.' },
    { id: 'petroglifos', title: 'Tallado en roca', label: 'Petroglifos',
      intro: 'Las rocas grabadas de Itagüí son uno de los legados más antiguos del territorio. Estudiarlas también es conversar sobre ellas.' },
    { id: 'museo', title: 'Un museo de la comunidad', label: 'Museo',
      intro: 'El Museo Comunitario Graciliano Arcila Vélez y sus programas llevan el patrimonio fuera de las vitrinas.' },
    { id: 'comunidad', title: 'Con la gente', label: 'Comunidad',
      intro: 'El patrimonio solo se cuida si se conoce. Por eso buena parte del trabajo ocurre en parques, colegios y barrios.' },
    { id: 'equipo', title: 'Quienes lo hacen posible', label: 'Equipo',
      intro: 'Investigadores, gestores culturales y vigías que sostienen el trabajo de SIPAH año tras año.' },
    { id: 'publicaciones', title: 'Conversaciones abiertas', label: 'Eventos',
      intro: 'Conversatorios, círculos de palabra y piezas de divulgación que abren la investigación al público.' },
  ];

  const STORIES = [
    // Arqueología
    { id: 'tumbas-sur-medellin', cat: 'arqueologia', src: 'colombia4_0d9ebaf0.jpg', w: 1280, h: 960,
      alt: 'Excavación de las tumbas prehispánicas de 2.000 años halladas al sur de Medellín',
      title: 'Tres tumbas de 2.000 años al sur de Medellín', place: 'Itagüí, Antioquia', date: 'Mayo de 2016',
      text: [
        'El 16 de mayo de 2016 apareció en Itagüí la primera de tres tumbas prehispánicas con más de 2.000 años de antigüedad. Le siguieron otras dos en el área metropolitana de Medellín.',
        'Las tumbas alcanzaban hasta dos metros de profundidad y cada una guardaba dos vasijas de cerámica. En la foto se ve el método: cuadrícula, perfil estratigráfico y registro capa por capa, para que el contexto no se pierda al retirar cada pieza.',
      ],
      link: { href: 'index.html#proyectos', label: 'Ver el proyecto' } },
    { id: 'vasijas-telemedellin', cat: 'arqueologia', src: 'hallazgo-vasijas-telemedellin.jpg', w: 580, h: 365,
      alt: 'Vasijas cerámicas precolombinas halladas en la sede de Telemedellín',
      title: 'Las vasijas del canal de Telemedellín', place: 'El Poblado, Medellín', date: '2015',
      text: [
        'Durante las obras del canal del parque Gabriel García Márquez, en la sede de Telemedellín, apareció un sitio con más de 2.500 años de antigüedad.',
        'Las vasijas recuperadas tendrían entre 2.500 y 3.000 años. Son evidencia de comunidades sedentarias que ya fabricaban cerámica en el valle mucho antes de la Colonia. El trabajo arqueológico estuvo a cargo de SIPAH, con el arqueólogo Juan Pablo Díez.',
      ],
      link: { href: 'index.html#proyectos', label: 'Ver el proyecto' } },
    { id: 'parque-de-las-luces', cat: 'arqueologia', src: 'noticia-caracol.jpg', w: 1000, h: 562,
      alt: 'Reportaje de Noticias Caracol sobre el hallazgo arqueológico de hace dos mil años en Itagüí',
      title: 'Una retroexcavadora y una tumba indígena', place: 'Parque de las Luces, Itagüí', date: 'Mayo de 2016',
      text: [
        'En el terreno donde se construía el Centro Integral Parque de las Luces, el movimiento de tierra de una retroexcavadora dejó al descubierto una tumba con dos vasijas de cerámica de unos 2.000 años.',
        'La obra se detuvo y SIPAH asumió el estudio. El hallazgo llegó a los noticieros nacionales y mostró por qué la arqueología preventiva tiene que acompañar las obras desde el principio.',
      ],
      link: { href: 'index.html#proyectos', label: 'Ver el proyecto' } },
    { id: 'laboratorio', cat: 'arqueologia', src: 'investigador-768x1024.jpg', w: 768, h: 1024,
      alt: 'Investigador analizando muestras al microscopio en el laboratorio',
      title: 'Lo que pasa después de excavar', place: 'Laboratorio', date: null,
      text: [
        'Una excavación termina en campo, pero la investigación sigue en el laboratorio. Cada fragmento se limpia, se observa y se analiza para saber de qué está hecho, cómo se fabricó y de cuándo es.',
        'Ese trabajo lento es el que convierte un hallazgo en conocimiento, y el que alimenta los informes y publicaciones de SIPAH.',
      ],
      link: { href: 'index.html#servicios', label: 'Ver servicios' } },
    { id: 'registro-inventario', cat: 'arqueologia', src: 'registro-inventario.jpg', w: 1272, h: 508,
      alt: 'Registro e inventario de piezas patrimoniales en el museo',
      title: 'Registrar para proteger', place: 'Museo Comunitario G.A.V.', date: null,
      text: [
        'Ninguna pieza se puede proteger si no está registrada. El inventario documenta cada objeto con fotografía, medidas, procedencia y estado de conservación.',
        'Así las colecciones quedan disponibles para la investigación y, si alguna pieza se pierde o se daña, existe un registro de ella.',
      ],
      link: { href: 'index.html#servicios', label: 'Ver servicios' } },

    // Petroglifos
    { id: 'petroglifo', cat: 'petroglifos', src: 'petroglifo.jpeg', w: 720, h: 540,
      alt: 'Petroglifo con figuras talladas en roca en Itagüí',
      title: 'Espirales en la ladera', place: 'El Rosario, Itagüí', date: 'Prehispánico',
      text: [
        'En las laderas de Itagüí sobreviven rocas grabadas por manos prehispánicas: espirales y figuras que marcaban el paisaje mucho antes de que existiera la ciudad.',
        'SIPAH las registra y las estudia, y las acerca a la comunidad. La exposición «Los Petroglifos: una historia tallada en roca» del Museo Comunitario nació de ese trabajo.',
      ],
      link: { href: 'index.html#petroglifos', label: 'Conocer los petroglifos' } },
    { id: 'circulos-arte-rupestre', cat: 'petroglifos', src: 'Circulos-de-la-palabra-Petros-724x1024.jpg', w: 724, h: 1024,
      alt: 'Afiche Círculos de Palabra: arte rupestre en el Valle de Aburrá',
      title: 'Círculos de Palabra: arte rupestre', place: 'Valle de Aburrá', date: null,
      text: [
        'Los Círculos de Palabra reúnen a investigadores, vecinos y escuelas alrededor de un tema. En esta edición, el tema fue el arte rupestre del Valle de Aburrá.',
        'La idea es sencilla: lo que se sabe de los petroglifos no se queda en un informe técnico, se conversa con quienes viven junto a ellos.',
      ] },

    // Museo
    { id: 'fachada-museo', cat: 'museo', src: 'Foto-Museo-1024x768.jpeg', w: 1024, h: 768,
      alt: 'Fachada del Museo Comunitario con la exposición Los Petroglifos, una historia tallada en roca',
      title: 'La casa del Museo Comunitario', place: 'El Rosario, Itagüí', date: null,
      text: [
        'El Museo Comunitario Graciliano Arcila Vélez lleva el nombre de uno de los pioneros de la antropología en Antioquia. Es un museo hecho con y para la comunidad de Itagüí: colecciones arqueológicas, exposiciones temporales y programas educativos.',
        'En la fachada se anuncia la exposición «Los Petroglifos: una historia tallada en roca». Abre los viernes y sábados, de 9:00 a. m. a 4:30 p. m.',
      ],
      link: { href: 'index.html#museo', label: 'Visitar el museo' } },
    { id: 'motomuseo', cat: 'museo', src: '4-1-1024x1024.jpeg', w: 1024, h: 1024,
      alt: 'Motomuseo itinerante de SIPAH, triciclo rojo adaptado como museo móvil',
      title: 'El museo sobre ruedas', place: 'Barrios, escuelas y veredas', date: null,
      text: [
        'No todo el mundo puede ir al museo, así que el museo va a ellos. El Motomuseo es un triciclo rojo adaptado como vitrina móvil.',
        'Lleva réplicas, piezas didácticas y relatos del patrimonio local a barrios, colegios y veredas donde casi nunca llega una exposición.',
      ],
      link: { href: 'index.html#museo', label: 'Ver programas del museo' } },
    { id: 'dia-museos-2023', cat: 'museo', src: 'poster-icom.jpg', w: 900, h: 1348,
      alt: 'Afiche del Día Internacional de los Museos 2023: Historias, mitos y patrimonio arqueológico de La Loma y El Rosario',
      title: 'Historias y mitos de La Loma y El Rosario', place: 'Museo Comunitario G.A.V.', date: 'Mayo de 2023',
      text: [
        'Para el Día Internacional de los Museos de 2023, el museo reunió historias, mitos y patrimonio arqueológico de La Loma y El Rosario, dos sectores de Itagüí.',
        'La memoria oral de los vecinos se presentó junto a la evidencia arqueológica. Las dos cuentan la historia del mismo territorio.',
      ] },
    { id: 'valor-agregado', cat: 'museo', src: 'valor-agregado.jpg', w: 768, h: 1086,
      alt: 'Afiche de la exposición temporal Valor Agregado en el Museo Comunitario G.A.V.',
      title: 'Valor Agregado', place: 'Museo Comunitario G.A.V.', date: '2022',
      text: [
        '«Valor Agregado» fue una exposición temporal del Museo Comunitario y una de las experiencias ganadoras de la convocatoria de estímulos del Ministerio de Cultura en 2022.',
        'El reconocimiento confirmó que un museo de barrio también puede proponer contenidos de alcance nacional.',
      ] },

    // Comunidad
    { id: 'museos-y-comunidad', cat: 'comunidad', src: '2-1-1024x1024.jpeg', w: 1024, h: 1024,
      alt: 'Charla Museos y comunidad: estudiantes frente al Museo Comunitario',
      title: 'Museos y comunidad', place: 'Museo Comunitario G.A.V.', date: null,
      text: [
        'Estudiantes frente al Museo Comunitario durante la charla «Museos y comunidad», un espacio para pensar qué significa que un museo pertenezca a su barrio.',
        'Muchos de los visitantes más constantes del museo llegaron así, en una visita escolar.',
      ] },
    { id: 'familias-verdes', cat: 'comunidad', src: 'familias-verdes.jpg', w: 1600, h: 1067,
      alt: 'Actividad de siembra Familias Verdes con la comunidad de El Rosario en el parque de los Petroglifos',
      title: 'Familias Verdes', place: 'Parque de los Petroglifos, El Rosario', date: null,
      text: [
        'En el parque de los Petroglifos, familias de El Rosario sembraron árboles en la jornada Familias Verdes.',
        'Para SIPAH el patrimonio es cultural y natural a la vez. Cuidar el entorno de las rocas grabadas también es cuidarlas a ellas.',
      ] },
    { id: 'practicas-de-campo', cat: 'comunidad', src: 'practicas.jpg', w: 1000, h: 563,
      alt: 'Recorrido de campo con estudiantes junto a un muro durante un estudio arqueológico',
      title: 'Aprender en el terreno', place: 'Recorrido de campo', date: null,
      text: [
        'Estudiantes recorren un sitio de estudio junto a un muro antiguo. Las prácticas de campo muestran lo que no cabe en un aula: leer un paisaje, identificar huellas de ocupación y entender por qué algo merece protegerse.',
        'Muchos futuros gestores del patrimonio empiezan en recorridos como este.',
      ] },
    { id: 'ludoteca', cat: 'comunidad', src: 'tallerista.jpg', w: 789, h: 618,
      alt: 'Tallerista con niñas en una actividad de la ludoteca patrimonial',
      title: 'La ludoteca patrimonial', place: 'Museo Comunitario G.A.V.', date: null,
      text: [
        'Una tallerista acompaña a un grupo de niñas en la ludoteca patrimonial, el programa del museo que enseña historia a través del juego.',
        'Rompecabezas, réplicas y relatos sirven para que las niñas y los niños descubran que el pasado de su barrio también es suyo.',
      ],
      link: { href: 'index.html#museo', label: 'Ver programas del museo' } },
    { id: 'plan-padrino', cat: 'comunidad', src: 'plan-padrino-1024x538.jpg', w: 1024, h: 538,
      alt: 'Ilustración en tiza de un apretón de manos: Plan Padrino',
      title: 'Plan Padrino', place: null, date: null,
      text: [
        'Un apretón de manos dibujado en tiza resume la idea del Plan Padrino: personas e instituciones que apoyan la labor de SIPAH y del Museo Comunitario.',
        'Ese apoyo sostiene programas educativos y de divulgación que de otra forma no llegarían a la comunidad.',
      ],
      link: { href: 'index.html#contacto', label: 'Quiero apoyar' } },

    // Equipo
    { id: 'juan-pablo-diez', cat: 'equipo', src: '3-1-1024x1024.jpeg', w: 1024, h: 1024,
      alt: 'Juan Pablo Díez Ramírez, director de la Corporación SIPAH',
      title: 'Juan Pablo Díez Ramírez', place: 'Director, Corporación SIPAH', date: null,
      text: [
        'Antropólogo y arqueólogo, Juan Pablo Díez Ramírez dirige la Corporación SIPAH. Ha estado a cargo de hallazgos como las tumbas del Parque de las Luces y las vasijas de Telemedellín.',
        'También ha escrito sobre la historia de la antropología en Antioquia, entre otras cosas una semblanza de Graciliano Arcila Vélez, quien da nombre al museo.',
      ],
      link: { href: 'index.html#nosotros', label: 'Conocer a SIPAH' } },
    { id: 'lucy-tobon', cat: 'equipo', src: '5-1024x1024.jpeg', w: 1024, h: 1024,
      alt: 'Lucy Tobón Ospina, directora del Museo Comunitario Graciliano Arcila Vélez',
      title: 'Lucy Tobón Ospina', place: 'Directora, Museo Comunitario G.A.V.', date: null,
      text: [
        'Lucy Tobón Ospina dirige el Museo Comunitario Graciliano Arcila Vélez, desde donde coordina las exposiciones, la ludoteca, el Motomuseo y el trabajo con los colegios.',
        'Bajo su dirección el museo es sobre todo un lugar de encuentro con los vecinos.',
      ],
      link: { href: 'index.html#nosotros', label: 'Conocer a SIPAH' } },
    { id: 'equipo-2018', cat: 'equipo', src: 'grupo-sipah-2018-ok-1024x683.jpg', w: 1024, h: 683,
      alt: 'Equipo de SIPAH y Vigías del Patrimonio reunidos en 2018',
      title: 'SIPAH y los Vigías, 2018', place: 'Itagüí', date: '2018',
      text: [
        'El equipo de SIPAH y el grupo de Vigías del Patrimonio de Itagüí en 2018.',
        'Los Vigías son ciudadanos voluntarios, acreditados por el Ministerio de Cultura, que identifican, protegen y divulgan el patrimonio local. Gran parte del trabajo comunitario depende de ellos.',
      ],
      link: { href: 'index.html#vigias', label: 'Conocer a los Vigías' } },
    { id: 'collage-encuentros', cat: 'equipo', src: 'collage-sipah-1024x475.jpg', w: 1024, h: 475,
      alt: 'Collage de encuentros del equipo SIPAH con comunidades',
      title: 'Años de encuentros', place: null, date: null,
      text: [
        'Talleres, recorridos y reuniones con comunidades: este collage reúne algunos de los encuentros que el equipo de SIPAH ha tenido a lo largo de los años.',
      ] },

    // Publicaciones y eventos
    { id: 'dialogos-identidad', cat: 'publicaciones', src: '1-1024x1024.jpeg', w: 1024, h: 1024,
      alt: 'Afiche del Mes del Patrimonio: conversatorio Diálogos de identidad cultural y riqueza patrimonial',
      title: 'Diálogos de identidad cultural', place: 'Mes del Patrimonio', date: 'Septiembre',
      text: [
        'Durante el Mes del Patrimonio, el conversatorio «Diálogos de identidad cultural y riqueza patrimonial» abrió la pregunta de qué nos identifica como territorio y qué vale la pena conservar.',
      ] },
    { id: 'ronda-latinoamericana', cat: 'publicaciones', src: '19_05_21_conversa_internacional.jpeg', w: 861, h: 843,
      alt: 'Afiche del Conversatorio Internacional Ronda Latinoamericana de museos, 19 de mayo',
      title: 'Ronda Latinoamericana de museos', place: 'Conversatorio internacional', date: '19 de mayo de 2021',
      text: [
        'Un conversatorio internacional que reunió experiencias de museos de distintos países de América Latina.',
        'Sirvió para comparar cómo trabajan los museos comunitarios de la región y para poner el trabajo de Itagüí en ese contexto.',
      ] },
    { id: 'arqueologia-vs-urbanismo', cat: 'publicaciones', src: '6-1024x1024.jpeg', w: 1024, h: 1024,
      alt: 'Afiche del conversatorio Arqueología vs. urbanismo: miradas complementarias',
      title: 'Arqueología vs. urbanismo', place: 'Conversatorio', date: null,
      text: [
        'La ciudad crece sobre sitios arqueológicos. Este conversatorio, con el subtítulo «miradas complementarias», propuso pensar la arqueología y el urbanismo como aliados.',
        'Los hallazgos de Telemedellín y el Parque de las Luces muestran que se puede construir sin borrar el pasado.',
      ] },
    { id: 'cerro-el-picacho', cat: 'publicaciones', src: '7-1024x791.jpeg', w: 1024, h: 791,
      alt: 'Afiche del conversatorio Cerro El Picacho, patrimonio cultural y natural de Medellín',
      title: 'Cerro El Picacho', place: 'Medellín', date: null,
      text: [
        'El Cerro El Picacho es patrimonio cultural y natural de Medellín. Este conversatorio reunió su valor ecológico, su historia y la relación de los barrios vecinos con la montaña.',
      ] },
    { id: 'mes-patrimonio-2021', cat: 'publicaciones', src: '8-1024x1024.jpeg', w: 1024, h: 1024,
      alt: 'Afiche Septiembre, Mes del Patrimonio 2021: retos y desafíos del patrimonio',
      title: 'Mes del Patrimonio 2021', place: 'Septiembre', date: '2021',
      text: [
        'En septiembre de 2021 la programación del Mes del Patrimonio giró en torno a los retos y desafíos de cuidar el patrimonio en ciudades que cambian rápido.',
      ] },
    { id: 'circulos-patrimonio-ambiental', cat: 'publicaciones', src: 'circulo_de_la_palabra-724x1024.jpg', w: 724, h: 1024,
      alt: 'Afiche Círculos de Palabra: patrimonio ambiental y los petroglifos de Itagüí',
      title: 'Círculos de Palabra: patrimonio ambiental', place: 'Itagüí', date: null,
      text: [
        'Otra edición de los Círculos de Palabra, esta vez sobre el patrimonio ambiental y los petroglifos de Itagüí: las rocas grabadas y el paisaje que las rodea se protegen juntos.',
      ],
      link: { href: 'index.html#petroglifos', label: 'Conocer los petroglifos' } },
    { id: 'mar-y-selva', cat: 'publicaciones', src: 'mar-y-selva.jpg', w: 1600, h: 568,
      alt: 'Ilustración Naturaleza, mar y cultura: el origen de lo que somos, Arboletes',
      title: 'Naturaleza, mar y cultura', place: 'Arboletes, Antioquia', date: null,
      text: [
        '«Naturaleza, mar y cultura: el origen de lo que somos» es una publicación de SIPAH ilustrada con el paisaje de Arboletes, en el Urabá antioqueño.',
        'Muestra que el trabajo de la corporación va más allá del Valle de Aburrá y une el patrimonio natural con el cultural.',
      ],
      link: { href: 'index.html#publicaciones', label: 'Ver publicaciones' } },
  ];

  /* 02. RENDER ------------------------------------------------------------ */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderIndex() {
    const list = $('[data-chapter-index]');
    list.innerHTML = CHAPTERS.map((c) => {
      const n = STORIES.filter((s) => s.cat === c.id).length;
      return `<li><a href="#${c.id}" data-chapter-link="${c.id}">${esc(c.label)}<span aria-hidden="true">${n}</span></a></li>`;
    }).join('');
  }

  function renderStories() {
    const root = $('[data-stories]');
    let html = '';
    CHAPTERS.forEach((c, ci) => {
      const items = STORIES.filter((s) => s.cat === c.id);
      if (!items.length) return;
      html += `
      <section class="chapter" id="${c.id}" aria-labelledby="${c.id}-title" data-chapter>
        <header class="chapter__head container" data-reveal>
          <span class="chapter__num" aria-hidden="true">${String(ci + 1).padStart(2, '0')}</span>
          <div>
            <p class="eyebrow">${esc(c.label)} · ${items.length} ${items.length === 1 ? 'historia' : 'historias'}</p>
            <h2 class="h2" id="${c.id}-title">${esc(c.title)}</h2>
            <p class="chapter__intro">${esc(c.intro)}</p>
          </div>
        </header>
        <div class="container">
          ${items.map(storyHTML).join('')}
        </div>
      </section>`;
    });
    root.innerHTML = html;
  }

  function storyHTML(s) {
    const shape = s.w / s.h > 1.6 ? 'wide' : s.h > s.w * 1.15 ? 'tall' : 'std';
    const meta = [s.place, s.date].filter(Boolean).map(esc).join(' · ');
    return `
    <article class="story story--${shape}" id="${s.id}" data-reveal>
      <figure class="story__media">
        <button class="story__zoom" type="button" data-zoom="${s.id}" aria-label="Ampliar imagen: ${esc(s.alt)}">
          <img src="${IMG + s.src}" alt="${esc(s.alt)}" width="${s.w}" height="${s.h}" loading="lazy" decoding="async">
        </button>
      </figure>
      <div class="story__body">
        ${meta ? `<p class="story__meta">${meta}</p>` : ''}
        <h3 class="story__title"><a href="#${s.id}">${esc(s.title)}</a></h3>
        ${s.text.map((p) => `<p>${esc(p)}</p>`).join('')}
        ${s.link ? `<a class="story__link" href="${s.link.href}">${esc(s.link.label)} <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>` : ''}
      </div>
    </article>`;
  }

  /* 03. NAVBAR + DRAWER + REVELADOS -------------------------------------- */
  const nav = $('[data-nav]');
  const progressBar = $('.scroll-progress span');
  let lastY = window.scrollY, ticking = false, drawerOpen = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      // Página clara desde arriba: la barra siempre en modo compacto; el vidrio se espesa al bajar
      nav.style.setProperty('--nav-t', clamp(0.4 + y / 300, 0, 1).toFixed(3));
      const delta = y - lastY;
      const locked = drawerOpen || nav.contains(document.activeElement);
      if (!locked && delta > 6 && y > vh * 0.6) nav.classList.add('is-hidden');
      else if (delta < -6 || y < vh * 0.6 || locked) nav.classList.remove('is-hidden');
      if (Math.abs(delta) > 6) lastY = y;
    });
  }

  function initDrawer() {
    const drawer = $('[data-drawer]');
    const overlay = $('[data-drawer-overlay]');
    const btn = $('[data-drawer-open]');
    const open = () => {
      if (drawerOpen) return;
      drawerOpen = true;
      drawer.hidden = overlay.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      const d = reduced ? 0 : 350;
      drawer.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: d, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' });
      overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d, fill: 'forwards' });
      $('a', drawer).focus({ preventScroll: true });
    };
    const close = (restore = true) => {
      if (!drawerOpen) return;
      drawerOpen = false;
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      const d = reduced ? 0 : 280;
      drawer.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: d, easing: EASE_OUT, fill: 'forwards' });
      overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d, fill: 'forwards' })
        .finished.then(() => { if (!drawerOpen) drawer.hidden = overlay.hidden = true; });
      if (restore) btn.focus({ preventScroll: true });
    };
    btn.addEventListener('click', open);
    overlay.addEventListener('click', () => close());
    $('[data-drawer-close]', drawer).addEventListener('click', () => close());
    $$('a', drawer).forEach((a) => a.addEventListener('click', () => close(false)));
    drawer.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) close(false); });
  }

  function initReveals() {
    const els = $$('[data-reveal]');
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.removeAttribute('data-reveal'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        io.unobserve(el);
        el.classList.add('is-in');
        // Al terminar, quita el atributo para que el hover recupere sus transiciones
        setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); }, 700);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* 04. ÍNDICE DE CAPÍTULOS ACTIVO --------------------------------------- */
  function initChapterIndex() {
    const links = new Map($$('[data-chapter-link]').map((a) => [a.dataset.chapterLink, a]));
    const bar = $('.chapters');
    const setActive = (id) => {
      links.forEach((a, key) => {
        const on = key === id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        // Mantiene visible el capítulo activo en la tira horizontal (móvil)
        if (on && bar.scrollWidth > bar.clientWidth) {
          const left = a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2;
          bar.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
        }
      });
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('[data-chapter]').forEach((s) => io.observe(s));
  }

  /* 05. VISOR -------------------------------------------------------------
     La imagen crece desde la miniatura (FLIP) y vuelve a ella al cerrar,
     así se entiende de dónde sale. Con movimiento reducido: fundido. */
  const lb = $('[data-lightbox]');
  const lbImg = $('[data-lb-img]', lb);
  const lbCaption = $('[data-lb-caption]', lb);
  const lbBackdrop = $('.lightbox__backdrop', lb);
  let lbIndex = -1, lbOpen = false, lbLastFocus = null;

  const thumbOf = (i) => $(`[data-zoom="${STORIES[i].id}"] img`);

  function fit(s) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const maxW = vw * (vw < 768 ? 0.94 : 0.86), maxH = vh * 0.76;
    let w = maxW, h = w / (s.w / s.h);
    if (h > maxH) { h = maxH; w = h * (s.w / s.h); }
    return { w, h, x: (vw - w) / 2, y: (vh - h) / 2 - 20 };
  }

  function place(i) {
    const s = STORIES[i];
    const r = fit(s);
    lbImg.src = IMG + s.src;
    lbImg.alt = s.alt;
    Object.assign(lbImg.style, { width: `${r.w}px`, height: `${r.h}px`, left: `${r.x}px`, top: `${r.y}px` });
    lbCaption.textContent = s.title;
    return r;
  }

  function flipFrom(thumb, r) {
    const t = thumb.getBoundingClientRect();
    return `translate(${t.left - r.x}px, ${t.top - r.y}px) scale(${t.width / r.w}, ${t.height / r.h})`;
  }

  function openLb(i) {
    lbIndex = i; lbOpen = true;
    lbLastFocus = document.activeElement;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    const r = place(i);
    const thumb = thumbOf(i);
    lb.classList.add('is-open');
    if (reduced || !thumb) {
      lb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    } else {
      lbImg.style.transformOrigin = '0 0';
      lbBackdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease' });
      lbImg.animate([{ transform: flipFrom(thumb, r) }, { transform: 'none' }], { duration: 420, easing: EASE_OUT });
    }
    $('.lightbox__close', lb).focus({ preventScroll: true });
  }

  function closeLb() {
    if (!lbOpen) return;
    lbOpen = false;
    const thumb = thumbOf(lbIndex);
    const r = lbImg.getBoundingClientRect();
    const done = () => {
      lb.hidden = true;
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lbLastFocus) lbLastFocus.focus({ preventScroll: true });
    };
    const visible = thumb && (() => { const t = thumb.getBoundingClientRect(); return t.bottom > 0 && t.top < window.innerHeight; })();
    if (reduced || !visible) {
      lb.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).finished.then(done);
      return;
    }
    lbBackdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease', fill: 'forwards' });
    lbImg.animate([{ transform: 'none' }, { transform: flipFrom(thumb, { x: r.left, y: r.top, w: r.width, h: r.height }) }],
      { duration: 320, easing: EASE_OUT, fill: 'forwards' })
      .finished.then(() => { done(); lbImg.getAnimations().forEach((a) => a.cancel()); lbBackdrop.getAnimations().forEach((a) => a.cancel()); });
  }

  function step(d) {
    if (!lbOpen) return;
    lbIndex = (lbIndex + d + STORIES.length) % STORIES.length;
    place(lbIndex);
    if (!reduced) lbImg.animate([{ opacity: 0, transform: `translateX(${d * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE_OUT });
  }

  function initLightbox() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-zoom]');
      if (!b) return;
      openLb(STORIES.findIndex((s) => s.id === b.dataset.zoom));
    });
    $$('[data-lb-close]', lb).forEach((el) => el.addEventListener('click', closeLb));
    $('[data-lb-prev]', lb).addEventListener('click', () => step(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => step(1));
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb);
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', () => { if (lbOpen) place(lbIndex); }, { passive: true });
  }

  /* 06. INIT --------------------------------------------------------------- */
  renderIndex();
  renderStories();
  initReveals();
  initChapterIndex();
  initDrawer();
  initLightbox();
  const year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Si se llega con #historia en la URL, el contenido ya existe tras el render: re-salta al ancla
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
})();
