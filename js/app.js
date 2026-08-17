/* Abhishek Subedi: portfolio interactions
   Nav, scroll reveal, galleries, and CAD card tabs. */

document.documentElement.classList.add('js-ready');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ─── NAVIGATION ─────────────────────────────────────────────────────────── */

const navbar   = document.getElementById('navbar');
const navLinks = document.getElementById('nav-links');
const toggle   = document.getElementById('nav-toggle');

// navbar background: one cheap observer instead of a scroll handler
const sentinel = document.createElement('div');
sentinel.style.cssText = 'position:absolute;top:0;height:24px;width:1px;pointer-events:none';
document.body.prepend(sentinel);
new IntersectionObserver(
  ([e]) => navbar.classList.toggle('scrolled', !e.isIntersecting)
).observe(sentinel);

toggle.addEventListener('click', () => {
  const open = toggle.classList.toggle('open');
  navLinks.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
});

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    toggle.classList.remove('open');
    navLinks.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) {
    toggle.classList.remove('open');
    navLinks.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
});

// active section: replaces the per-scroll-event offsetTop reads
const linkFor = new Map();
navLinks.querySelectorAll('a').forEach(a => linkFor.set(a.getAttribute('href').slice(1), a));

const visible = new Set();
const sectionOrder = [...document.querySelectorAll('main section[id]')].map(s => s.id);

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(e => e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id));
  // the topmost section currently in the band wins
  const current = sectionOrder.find(id => visible.has(id));
  linkFor.forEach((a, id) => a.classList.toggle('active', id === current));
}, { rootMargin: '-25% 0px -60% 0px' });

document.querySelectorAll('main section[id]').forEach(s => {
  if (linkFor.has(s.id)) sectionObserver.observe(s);
});

/* ─── SCROLL REVEAL ──────────────────────────────────────────────────────── */

const revealObserver = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('visible');
    revealObserver.unobserve(e.target);
  }),
  { threshold: 0.08 }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ─── IMAGE GALLERIES ────────────────────────────────────────────────────── */

document.querySelectorAll('.img-slider').forEach(slider => {
  const slides  = [...slider.querySelectorAll('.slide')];
  const dotsBox = slider.querySelector('.slide-dots');
  if (slides.length < 2) return;

  let current = 0;
  let timer   = null;
  let paused  = reduceMotion.matches;   // never auto-advance under reduced motion

  // dots are generated so the markup can't drift out of sync with the slides
  const dots = slides.map((_, i) => {
    const d = document.createElement('button');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.type = 'button';
    d.setAttribute('aria-label', `Show image ${i + 1} of ${slides.length}`);
    d.addEventListener('click', () => { go(i); restart(); });
    dotsBox && dotsBox.appendChild(d);
    return d;
  });

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'slide-pause';
  slider.appendChild(pauseBtn);
  syncPauseBtn();

  function syncPauseBtn() {
    pauseBtn.textContent = paused ? '▶' : '❚❚';
    pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
  }

  function go(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function start() { if (!paused && !timer) timer = setInterval(() => go(current + 1), 4200); }
  function stop()  { clearInterval(timer); timer = null; }
  function restart() { stop(); start(); }

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    syncPauseBtn();
    paused ? stop() : start();
  });

  slider.querySelector('.slide-prev')?.addEventListener('click', () => { go(current - 1); restart(); });
  slider.querySelector('.slide-next')?.addEventListener('click', () => { go(current + 1); restart(); });

  // hold while the pointer is over it, and while a control inside has focus
  slider.addEventListener('mouseenter', stop);
  slider.addEventListener('mouseleave', start);
  slider.addEventListener('focusin',  stop);
  slider.addEventListener('focusout', start);

  // swipe, so touch users get the control that hover gives everyone else
  let x0 = null;
  slider.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  slider.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
    x0 = null;
    start();
  }, { passive: true });

  // don't animate offscreen
  new IntersectionObserver(([e]) => e.isIntersecting ? start() : stop(), { threshold: 0.2 }).observe(slider);

  reduceMotion.addEventListener('change', e => {
    paused = e.matches;
    syncPauseBtn();
    paused ? stop() : start();
  });
});

/* ─── CAD CARD TABS ──────────────────────────────────────────────────────── */

document.querySelectorAll('.cad-card').forEach(card => {
  const tabs   = [...card.querySelectorAll('.tab-btn')];
  const panels = [...card.querySelectorAll('.tab-panel')];

  function select(tab) {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    panels.forEach(p => p.classList.remove('active'));

    const name  = tab.dataset.tab;
    const panel = card.querySelector(`[data-panel="${name}"]`);
    if (panel) panel.classList.add('active');

    if (name === 'video') {
      const vid = panel?.querySelector('video');
      if (vid && !reduceMotion.matches) vid.play().catch(() => {});
    } else {
      card.querySelectorAll('video').forEach(v => v.pause());
    }

    if (name === '3d') card.dispatchEvent(new CustomEvent('open3d', { bubbles: true }));
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    // arrow-key traversal, per the tablist pattern
    tab.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const next = tabs[(i + d + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });
});
