// Mark JS as running - enables scroll-reveal animations in CSS
document.documentElement.classList.add('js-ready');

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

const navbar   = document.getElementById('navbar');
const navLinks = document.getElementById('nav-links');
const toggle   = document.getElementById('nav-toggle');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
  updateActiveLink();
}, { passive: true });

toggle.addEventListener('click', () => {
  toggle.classList.toggle('open');
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    toggle.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

function updateActiveLink() {
  const sections = document.querySelectorAll('section[id]');
  const scrollY  = window.scrollY + 100;
  let current    = '';
  sections.forEach(s => { if (scrollY >= s.offsetTop) current = s.id; });
  navLinks.querySelectorAll('a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}

// ─── TYPEWRITER ───────────────────────────────────────────────────────────────

const phrases = [
  'MS Candidate · University of Toledo · Dec 2026',
  'Supersonic Flow Researcher',
  'Schlieren Imaging & PIV',
  'SolidWorks CSWA Certified',
  'Open to Work · Toledo, OH',
];
let phraseIdx = 0, charIdx = 0, deleting = false;
const tw = document.getElementById('hero-typewriter');

if (tw) {
  function typewriter() {
    const phrase = phrases[phraseIdx];
    if (!deleting) {
      tw.textContent = phrase.slice(0, ++charIdx);
      if (charIdx === phrase.length) { deleting = true; setTimeout(typewriter, 2200); return; }
    } else {
      tw.textContent = phrase.slice(0, --charIdx);
      if (charIdx === 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; }
    }
    setTimeout(typewriter, deleting ? 38 : 72);
  }
  typewriter();
}

// ─── SCROLL REVEAL ────────────────────────────────────────────────────────────

const revealObserver = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  }),
  { threshold: 0.1 }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─── IMAGE SLIDERS ────────────────────────────────────────────────────────────

document.querySelectorAll('.img-slider').forEach(slider => {
  const slides  = slider.querySelectorAll('.slide');
  const dots    = slider.querySelectorAll('.dot');
  let current   = 0;
  let autoTimer = null;

  function go(idx) {
    slides[current].classList.remove('active');
    dots[current] && dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current] && dots[current].classList.add('active');
  }

  function startAuto() { autoTimer = setInterval(() => go(current + 1), 3500); }
  function stopAuto()  { clearInterval(autoTimer); }

  slider.querySelector('.slide-prev') && slider.querySelector('.slide-prev').addEventListener('click', () => { stopAuto(); go(current - 1); startAuto(); });
  slider.querySelector('.slide-next') && slider.querySelector('.slide-next').addEventListener('click', () => { stopAuto(); go(current + 1); startAuto(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { stopAuto(); go(i); startAuto(); }));
  slider.addEventListener('mouseenter', stopAuto);
  slider.addEventListener('mouseleave', startAuto);
  startAuto();
});

// ─── CAD TABS ─────────────────────────────────────────────────────────────────

document.querySelectorAll('.cad-card').forEach(card => {
  const tabs   = card.querySelectorAll('.tab-btn');
  const panels = card.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');

      const panelName = tab.dataset.tab;
      const panel = card.querySelector('[data-panel="' + panelName + '"]');
      if (panel) panel.classList.add('active');

      // Autoplay video when switching to that tab
      if (panelName === 'video') {
        const vid = panel && panel.querySelector('video');
        vid && vid.play();
      }

      // Dispatch event so viewer.js can initialize lazily
      if (panelName === '3d') {
        card.dispatchEvent(new CustomEvent('open3d', { bubbles: true }));
      }
    });
  });
});
