import * as THREE from 'three';
import { STLLoader }     from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const initialized = new WeakSet();

document.addEventListener('open3d', e => {
  const card = e.target;
  if (initialized.has(card)) return;
  initialized.add(card);

  // Wait one frame so the tab panel is painted and has real dimensions
  requestAnimationFrame(() => {
    new ModelViewer(card.querySelector('.viewer-canvas'), {
      modelPath:    card.dataset.model,
      loadingEl:    card.querySelector('.viewer-loading'),
      guideEl:      card.querySelector('.export-guide'),
      loadingPctEl: card.querySelector('.loading-pct'),
      resetBtn:     card.querySelector('[data-action="reset"]'),
      wireframeBtn: card.querySelector('[data-action="wireframe"]'),
    });
  });
});

class ModelViewer {
  constructor(container, opts) {
    this.container    = container;
    this.modelPath    = opts.modelPath;
    this.loadingEl    = opts.loadingEl;
    this.guideEl      = opts.guideEl;
    this.loadingPctEl = opts.loadingPctEl;
    this.mesh         = null;
    this.material     = null;
    this.wireframe    = false;

    this.initScene();
    this.loadModel();
    this.animate();
    this.bindResize();

    opts.resetBtn     && opts.resetBtn.addEventListener('click',     () => this.resetCamera());
    opts.wireframeBtn && opts.wireframeBtn.addEventListener('click', () => this.toggleWireframe());
  }

  initScene() {
    const w = this.container.clientWidth  || 400;
    const h = this.container.clientHeight || 300;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1828);

    const grid = new THREE.GridHelper(14, 24, 0x1e3a5f, 0x0d2140);
    this.scene.add(grid);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dl1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dl1.position.set(4, 8, 6);
    dl1.castShadow = true;
    this.scene.add(dl1);
    const dl2 = new THREE.DirectionalLight(0x4488ff, 0.35);
    dl2.position.set(-4, 2, -4);
    this.scene.add(dl2);
    this.scene.add(new THREE.HemisphereLight(0x1a3a6e, 0x080c14, 0.4));

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    this.camera.position.set(0, 6, 12);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping    = true;
    this.controls.dampingFactor    = 0.06;
    this.controls.autoRotate       = true;
    this.controls.autoRotateSpeed  = 0.8;
    this.controls.minDistance      = 2;
    this.controls.maxDistance      = 50;
  }

  loadModel() {
    new STLLoader().load(
      this.modelPath,
      geo  => this.onLoad(geo),
      xhr  => this.onProgress(xhr),
      err  => this.onError(err),
    );
  }

  onLoad(geometry) {
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const size   = new THREE.Vector3();
    geometry.boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale  = 7 / maxDim;
    geometry.scale(scale, scale, scale);

    geometry.computeBoundingBox();
    geometry.translate(0, -geometry.boundingBox.min.y, 0);

    this.material = new THREE.MeshStandardMaterial({ color: 0x8fb8d8, metalness: 0.65, roughness: 0.35 });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    this.loadingEl && (this.loadingEl.style.display = 'none');

    const dist = maxDim * scale * 1.6;
    this.camera.position.set(dist * 0.6, dist * 0.5, dist);
    this.controls.target.set(0, (size.y * scale) / 2, 0);
    this.controls.update();
  }

  onProgress(xhr) {
    if (xhr.total && this.loadingPctEl) {
      this.loadingPctEl.textContent = 'Loading… ' + Math.round((xhr.loaded / xhr.total) * 100) + '%';
    }
  }

  onError() {
    this.loadingEl && (this.loadingEl.style.display = 'none');
    this.guideEl   && (this.guideEl.style.display   = 'flex');
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resetCamera()     { this.controls.reset(); this.controls.autoRotate = true; }
  toggleWireframe() { if (this.material) { this.wireframe = !this.wireframe; this.material.wireframe = this.wireframe; } }

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
