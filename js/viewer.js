/* three.js is ~1.2 MB, and most visitors never open a 3D tab, so it is pulled in
   on first use rather than on page load. */
let THREE, STLLoader, OrbitControls, libsPromise;

function loadLibs() {
  libsPromise ??= Promise.all([
    import('three'),
    import('three/addons/loaders/STLLoader.js'),
    import('three/addons/controls/OrbitControls.js'),
  ]).then(([three, stl, orbit]) => {
    THREE         = three;
    STLLoader     = stl.STLLoader;
    OrbitControls = orbit.OrbitControls;
  });
  return libsPromise;
}

const initialized = new WeakSet();

document.addEventListener('open3d', async e => {
  const card = e.target;
  if (initialized.has(card)) return;
  initialized.add(card);

  try {
    await loadLibs();
  } catch {
    const err = card.querySelector('.viewer-error');
    const load = card.querySelector('.viewer-loading');
    load && (load.style.display = 'none');
    err  && (err.style.display  = 'flex');
    return;
  }

  // Wait one frame so the tab panel is painted and has real dimensions
  requestAnimationFrame(() => {
    new ModelViewer(card.querySelector('.viewer-canvas'), {
      modelPath:    card.dataset.model,
      loadingEl:    card.querySelector('.viewer-loading'),
      errorEl:      card.querySelector('.viewer-error'),
      loadingPctEl: card.querySelector('.loading-pct'),
      resetBtn:     card.querySelector('[data-action="reset"]'),
      wireframeBtn: card.querySelector('[data-action="wireframe"]'),
      panel:        card.querySelector('[data-panel="3d"]'),
    });
  });
});

class ModelViewer {
  constructor(container, opts) {
    this.container    = container;
    this.modelPath    = opts.modelPath;
    this.loadingEl    = opts.loadingEl;
    this.errorEl      = opts.errorEl;
    this.loadingPctEl = opts.loadingPctEl;
    this.panel        = opts.panel;
    this.mesh         = null;
    this.material     = null;
    this.wireframe    = false;
    this.onScreen     = true;

    this.initScene();
    this.loadModel();
    this.animate();
    this.bindResize();
    this.bindVisibility();

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
    this.scene.background = new THREE.Color(0x0d0f13);

    const grid = new THREE.GridHelper(14, 24, 0x333a44, 0x1c2027);
    this.scene.add(grid);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(4, 8, 6);
    key.castShadow = true;
    this.scene.add(key);
    // warm rim light, tying the viewer to the page's signal colour
    const rim = new THREE.DirectionalLight(0xff8b3d, 0.4);
    rim.position.set(-5, 2, -4);
    this.scene.add(rim);
    this.scene.add(new THREE.HemisphereLight(0x3a4048, 0x0a0b0d, 0.45));

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

    this.material = new THREE.MeshStandardMaterial({ color: 0xccd2d8, metalness: 0.25, roughness: 0.45 });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    this.loadingEl && (this.loadingEl.style.display = 'none');

    const dist = maxDim * scale * 1.3;
    this.camera.position.set(dist * 0.6, dist * 0.5, dist);
    this.controls.target.set(0, (size.y * scale) / 2, 0);
    this.controls.update();
  }

  onProgress(xhr) {
    if (xhr.total && this.loadingPctEl) {
      this.loadingPctEl.textContent = Math.round((xhr.loaded / xhr.total) * 100) + '%';
    }
  }

  onError() {
    this.loadingEl && (this.loadingEl.style.display = 'none');
    this.errorEl   && (this.errorEl.style.display   = 'flex');
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    // skip the draw entirely when the panel is hidden or scrolled away
    if (!this.onScreen || document.hidden) return;
    if (!this.panel?.classList.contains('active')) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  bindVisibility() {
    new IntersectionObserver(([e]) => { this.onScreen = e.isIntersecting; }, { threshold: 0 })
      .observe(this.container);
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
