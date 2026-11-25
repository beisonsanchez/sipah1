/* Tema claro / oscuro — compartido por todas las páginas.
   Se carga en el <head> sin defer: fija data-theme antes del primer pintado
   (sin destello). La elección guardada manda; si no hay, se sigue el sistema
   (y se sigue cambiando con él). El botón [data-theme-toggle] lo alterna con
   un fundido (View Transitions) y avisa con el evento "sipah:theme". */
(function () {
  var KEY = 'sipah-theme';
  var root = document.documentElement;
  var darkQuery = matchMedia('(prefers-color-scheme: dark)');
  var motionQuery = matchMedia('(prefers-reduced-motion: reduce)');

  function saved() {
    try { var t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : null; } catch (e) { return null; }
  }
  function current() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function syncButtons() {
    var label = current() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-label', label); });
  }
  function apply(t) {
    root.setAttribute('data-theme', t);
    syncButtons();
    window.dispatchEvent(new CustomEvent('sipah:theme', { detail: t }));
  }
  function set(t) {
    if (!motionQuery.matches && document.startViewTransition) document.startViewTransition(function () { apply(t); });
    else apply(t);
  }

  root.setAttribute('data-theme', saved() || (darkQuery.matches ? 'dark' : 'light'));

  document.addEventListener('DOMContentLoaded', syncButtons);
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    var next = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch (err) {}
    set(next);
  });
  darkQuery.addEventListener('change', function (e) {
    if (!saved()) set(e.matches ? 'dark' : 'light');
  });
})();
