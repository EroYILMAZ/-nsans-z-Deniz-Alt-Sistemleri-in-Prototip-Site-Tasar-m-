/* Deniz6 — yumuşak tekerlek kaydırması.
   Fare tekerleği bir hedef belirler, sayfa o hedefe doğru süzülür; tekerleği bırakınca sayfa birden durmaz, yavaşça durur.
   Dokunmatik cihazlar kendi doğal ivmesini, "hareketi azalt" tercihi olanlar düz kaydırmayı korur. Menü bağlantıları,
   klavye ve kaydırma çubuğuyla yapılan kaydırmalara karışmaz; kendi içinde kayan kutularda (ör. listeler) devreye girmez. */
(function () {
  'use strict';
  if (typeof window.matchMedia !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  // Süzülme süresi (ms). Büyüdükçe sayfa daha uzun süzülür.
  var GLIDE_MS = 190;

  var root = document.documentElement;
  var target = window.scrollY, current = window.scrollY, lastSet = window.scrollY;
  var frame = 0, last = 0;

  function maxScroll() { return root.scrollHeight - window.innerHeight; }
  function jumpTo(y) {
    // site.css'teki "scroll-behavior: smooth" her adımı ayrıca canlandırmasın diye anlık kaydırılır.
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
  }

  function step(now) {
    var dt = last ? Math.min(now - last, 64) : 16;
    last = now;
    current += (target - current) * (1 - Math.exp(-dt / GLIDE_MS));
    if (Math.abs(target - current) < 0.4) current = target;
    lastSet = Math.round(current);
    jumpTo(current);
    if (current !== target) frame = requestAnimationFrame(step);
    else { frame = 0; last = 0; }
  }

  function scrollsItself(el, dy) {
    for (; el && el !== document.body && el !== root; el = el.parentElement) {
      var s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        if (dy < 0 && el.scrollTop > 0) return true;
        if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
      }
    }
    return false;
  }

  function locked() {
    return getComputedStyle(document.body).overflowY === 'hidden' || getComputedStyle(root).overflowY === 'hidden';
  }

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.defaultPrevented) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (locked() || scrollsItself(e.target, e.deltaY)) return;
    var unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
    e.preventDefault();
    if (!frame) { current = window.scrollY; target = current; }
    target = Math.min(Math.max(target + e.deltaY * unit, 0), maxScroll());
    if (!frame) frame = requestAnimationFrame(step);
  }, { passive: false });

  // Başka bir yoldan kaydırıldıysa (bağlantı, klavye, çubuk) kendi hedefimizi bırakıp yeni konuma uyarız.
  window.addEventListener('scroll', function () {
    if (Math.abs(window.scrollY - lastSet) > 2) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; last = 0;
      target = current = lastSet = window.scrollY;
    }
  }, { passive: true });
})();
