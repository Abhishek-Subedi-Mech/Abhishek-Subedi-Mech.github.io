import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── NAVIGATION ─────────────────────────────────────────────────────────────

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
  const scrollY  = window.scrollY + 80;
  let current    = '';
  sections.forEach(s => { if (scrollY >= s.offsetTop) current = s.id; });
  navLinks.querySelectorAll('a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
  });
}

// ─── TYPEWRITER ──────────────────────────────────────────────────────────────

const phrases = [
  'MS Candidate · University of Toledo · Dec 2026',
  'Supersonic Flow Researcher',
  'Schlieren Imaging & PIV',
  'SolidWorks CSWA Certified',
  'Open to Work',
];
let phraseIdx = 0, charIdx = 0, deleting = false;
const tw = document.getElementById('hero-typewriter');

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

// ─── SCROLL REVEAL ────────────────────────────────────────────────────────────

const observer = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }),
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ─── IMAGE SLIDERS ────────────────────────────────────────────────────────────

document.querySelectorAll('.img-slider').forEach(slider => {
  const slides = slider.querySelectorAll('.slide');
  const dots   = slider.querySelectorAll('.dot');
  let current  = 0;

  function go(idx) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
  }

  slider.querySelector('.slide-prev')?.addEventListener('click', () => go(current - 1));
  slider.querySelector('.slide-next')?.addEventListener('click', () => go(current + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));

  // Auto-advance
  let timer = setInterval(() => go(current + 1), 3500);
  slider.addEventListener('mouseenter', () => clearInterval(timer));
  slider.addEventListener('mouseleave', () => { timer = setInterval(() => go(current + 1), 3500); });
});

// ─── CAD TABS ─────────────────────────────────────────────────────────────────

const initializedViewers = new WeakSet();

document.querySelectorAll('.cad-card').forEach(card => {
  const tabs   = card.querySelectorAll('.tab-btn');
  const panels = card.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');

      const panelName = tab.dataset.tab;
      card.querySelector(`[data-panel="${panelName}"]`).classList.add('active');

      if (panelName === '3d' && !initializedViewers.has(card)) {
        initializedViewers.add(card);
        const modelPath = card.dataset.model;
        const canvas    = card.querySelector('.viewer-canvas');
        new ModelViewer(canvas, {
          modelPath,
          resetBtn:     card.querySelector('[data-action="reset"]'),
          wireframeBtn: card.querySelector('[data-action="wireframe"]'),
          loadingEl:    card.querySelector('.viewer-loading'),
          guideEl:      card.querySelector('.export-guide'),
          loadingPctEl: card.querySelector('.loading-pct'),
        });
      }
    });
  });
});

// ─── THREE.JS MODEL VIEWER ────────────────────────────────────────────────────

class ModelViewer {
  constructor(container, opts) {
    this.container    = container;
    this.modelPath    = opts.modelPath;
    this.loadingEl    = opts.loadingEl;
    this.guideEl      = opts.guideEl;
    this.loadingPctEl = opts.loadingPctEl;
    this.mesh         = null;
    this.wireframe    = false;

    this.initScene();
    this.loadModel();
    this.animate();
    this.bindResize();

    opts.resetBtn?.addEventListener('click', () => this.resetCamera());
    opts.wireframeBtn?.addEventListener('click', () => this.toggleWireframe());
  }

  initScene() {
    const w = this.container.clientWidth  || 400;
    const h = this.container.clientHeight || 300;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1828);

    // Grid
    const grid = new THREE.GridHelper(14, 24, 0x1e3a5f, 0x0d2140);
    this.scene.add(grid);

    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dl1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dl1.position.set(4, 8, 6);
    dl1.castShadow = true;
    this.scene.add(dl1);
    const dl2 = new THREE.DirectionalLight(0x4488ff, 0.35);
    dl2.position.set(-4, 2, -4);
    this.scene.add(dl2);
    const hl = new THREE.HemisphereLight(0x1a3a6e, 0x080c14, 0.4);
    this.scene.add(hl);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    this.camera.position.set(0, 6, 12);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.autoRotate    = true;
    this.controls.autoRotateSpeed = 0.8;
    this.controls.minDistance   = 2;
    this.controls.maxDistance   = 50;
  }

  loadModel() {
    const loader = new STLLoader();
    loader.load(
      this.modelPath,
      (geometry) => this.onLoad(geometry),
      (xhr)      => this.onProgress(xhr),
      ()         => this.onError(),
    );
  }

  onLoad(geometry) {
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const size = new THREE.Vector3();
    geometry.boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale  = 7 / maxDim;
    geometry.scale(scale, scale, scale);

    // Translate so model sits on the grid
    geometry.computeBoundingBox();
    const minY = geometry.boundingBox.min.y;
    geometry.translate(0, -minY, 0);

    this.material = new THREE.MeshStandardMaterial({
      color:      0x8fb8d8,
      metalness:  0.65,
      roughness:  0.35,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.castShadow    = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    this.loadingEl?.classList.add('hidden');
    this.loadingEl && (this.loadingEl.style.display = 'none');

    // Fit camera
    const dist = maxDim * scale * 1.6;
    this.camera.position.set(dist * 0.6, dist * 0.5, dist);
    this.controls.target.set(0, (size.y * scale) / 2, 0);
    this.controls.update();
  }

  onProgress(xhr) {
    if (xhr.total && this.loadingPctEl) {
      this.loadingPctEl.textContent = `Loading… ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
    }
  }

  onError() {
    this.loadingEl && (this.loadingEl.style.display = 'none');
    this.guideEl   && (this.guideEl.style.display = 'flex');
  }

  animate() {
    this._raf = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resetCamera() {
    this.controls.reset();
    this.controls.autoRotate = true;
  }

  toggleWireframe() {
    if (!this.material) return;
    this.wireframe = !this.wireframe;
    this.material.wireframe = this.wireframe;
  }

  bindResize() {
    new ResizeObserver(() => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }).observe(this.container);
  }
}
