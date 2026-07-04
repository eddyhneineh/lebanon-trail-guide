import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default class TrailMap3D {
  constructor(container, detailTarget, {
    frame = container?.closest(".map-frame"),
    navigationToggle,
    onTrailSelect,
    onTrailClear
  } = {}) {
    this.container = container;
    this.detailTarget = detailTarget;
    this.frame = frame;
    this.navigationToggle = navigationToggle;
    this.onTrailSelect = onTrailSelect;
    this.onTrailClear = onTrailClear;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.markerGroup = new THREE.Group();
    this.markersByTrailId = new Map();
    this.selectedMarker = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.animationFrame = null;
    this.visibleTrails = [];
    this.isNavigationMode = false;
    this.bounds = {
      minLat: 33.05,
      maxLat: 34.65,
      minLon: 35.1,
      maxLon: 36.35
    };

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerClick = this.handlePointerClick.bind(this);
    this.handleDetailClick = this.handleDetailClick.bind(this);
    this.handleDocumentPointerDown = this.handleDocumentPointerDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.animate = this.animate.bind(this);
  }

  init() {
    if (!this.container || this.renderer) {
      return;
    }

    this.container.innerHTML = "";
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10332a);
    this.scene.fog = new THREE.Fog(0x10332a, 42, 118);

    this.camera = new THREE.PerspectiveCamera(48, this.aspectRatio, 0.1, 180);
    this.camera.position.set(0, 34, 52);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.container.append(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.enablePan = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 86;
    this.controls.screenSpacePanning = true;
    this.controls.target.set(0, 0.4, 0);
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    this.scene.add(this.createTerrain());
    this.scene.add(this.createLebanonOutline());
    this.scene.add(this.createRidgeLine());
    this.scene.add(this.markerGroup);
    this.addLights();
    this.updateDebugState();

    window.addEventListener("resize", this.handleResize);
    document.addEventListener("pointerdown", this.handleDocumentPointerDown);
    document.addEventListener("keydown", this.handleKeyDown);
    this.renderer.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.renderer.domElement.addEventListener("click", this.handlePointerClick);
    this.detailTarget?.addEventListener("click", this.handleDetailClick);
    this.navigationToggle?.addEventListener("click", () => this.toggleNavigationMode());
    this.setNavigationMode(false);
    this.animate();
  }

  render(trails) {
    if (!this.renderer) {
      this.init();
    }

    this.visibleTrails = trails;
    this.markerGroup.clear();
    this.markersByTrailId.clear();
    this.clearSelection();
    trails.forEach((trail) => this.markerGroup.add(this.createMarker(trail)));
    this.updateDebugState();

    if (!trails.length) {
      this.clearSelection();
    }
  }

  applyFilters(criteria) {
    let visibleCount = 0;
    let firstVisibleMarker = null;

    this.markerGroup.children.forEach((marker) => {
      const isVisible = this.matchesCriteria(marker.userData.trail, criteria);
      marker.visible = isVisible;

      if (isVisible) {
        visibleCount += 1;
        firstVisibleMarker ||= marker;
      }
    });

    if (this.selectedMarker && !this.selectedMarker.visible) {
      this.clearSelection();
    } else if (!firstVisibleMarker) {
      this.clearSelection();
    }

    this.updateDebugState();
    return visibleCount;
  }

  matchesCriteria(trail, { difficulties = [], region = "All" } = {}) {
    const difficultyMatch = difficulties.length === 0 || difficulties.includes(trail.difficulty);
    const regionMatch = region === "All" || trail.region === region;
    return difficultyMatch && regionMatch;
  }

  getVisibleMarkerCount() {
    return this.markerGroup.children.filter((marker) => marker.visible).length;
  }

  createTerrain() {
    const group = new THREE.Group();
    group.add(this.createLebanonBase());
    group.add(this.createElevationMesh());
    return group;
  }

  createLebanonBase() {
    const shape = this.createLebanonShape();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      bevelEnabled: false,
      depth: 0.8
    });
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, 0.02, 0);

    const material = new THREE.MeshStandardMaterial({
      color: 0x7c6b4f,
      roughness: 0.9,
      metalness: 0.02
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  createElevationMesh() {
    const outline = this.getLebanonOutlinePoints();
    const xs = outline.map(([x]) => x);
    const zs = outline.map(([, z]) => z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const columns = 54;
    const rows = 136;
    const stepX = (maxX - minX) / columns;
    const stepZ = (maxZ - minZ) / rows;
    const vertices = [];
    const colors = [];

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const x0 = minX + column * stepX;
        const x1 = x0 + stepX;
        const z0 = minZ + row * stepZ;
        const z1 = z0 + stepZ;
        const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

        if (!corners.every((point) => this.isPointInPolygon(point, outline))) {
          continue;
        }

        this.addTerrainTriangle(vertices, colors, corners[0], corners[1], corners[2]);
        this.addTerrainTriangle(vertices, colors, corners[0], corners[2], corners[3]);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      roughness: 0.86,
      metalness: 0.01,
      vertexColors: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = "lebanon-elevation-terrain";
    return mesh;
  }

  createLebanonOutline() {
    const outline = this.getLebanonOutlinePoints();
    const points = outline.map(([x, z]) => new THREE.Vector3(x, this.getElevationAt(x, z) + 0.08, z));
    points.push(points[0].clone());

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffdd85,
      transparent: true,
      opacity: 0.86
    });
    return new THREE.Line(geometry, material);
  }

  createLebanonShape() {
    const shape = new THREE.Shape();
    this.getLebanonOutlinePoints().forEach(([x, z], index) => {
      if (index === 0) {
        shape.moveTo(x, z);
      } else {
        shape.lineTo(x, z);
      }
    });
    shape.closePath();
    return shape;
  }

  getLebanonOutlinePoints() {
    return [
      [35.12, 33.08], [35.22, 33.23], [35.29, 33.42], [35.36, 33.62],
      [35.43, 33.82], [35.50, 34.02], [35.61, 34.22], [35.72, 34.42],
      [35.88, 34.60], [36.08, 34.63], [36.24, 34.51], [36.32, 34.32],
      [36.25, 34.13], [36.29, 33.94], [36.19, 33.76], [36.11, 33.58],
      [35.99, 33.41], [35.86, 33.26], [35.70, 33.15], [35.50, 33.07],
      [35.31, 33.05]
    ].map(([lon, lat]) => {
      const { x, z } = this.latLonToFlatPosition(lat, lon);
      return [x, z];
    });
  }

  addTerrainTriangle(vertices, colors, ...points) {
    points.forEach(([x, z]) => {
      const elevation = this.getElevationAt(x, z);
      const color = this.getElevationColor(elevation);
      vertices.push(x, elevation, z);
      colors.push(color.r, color.g, color.b);
    });
  }

  getElevationColor(elevation) {
    const bands = [
      { max: 0.55, color: new THREE.Color(0x87a66d) },
      { max: 1.65, color: new THREE.Color(0x4f7c55) },
      { max: 2.85, color: new THREE.Color(0x8a774f) },
      { max: 4.2, color: new THREE.Color(0x9b927e) },
      { max: Infinity, color: new THREE.Color(0xe8e6dc) }
    ];

    return bands.find((band) => elevation <= band.max).color;
  }

  isPointInPolygon([x, z], polygon) {
    let isInside = false;

    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const [xi, zi] = polygon[current];
      const [xj, zj] = polygon[previous];
      const intersects = ((zi > z) !== (zj > z))
        && (x < ((xj - xi) * (z - zi)) / (zj - zi) + xi);

      if (intersects) {
        isInside = !isInside;
      }
    }

    return isInside;
  }

  createRidgeLine() {
    const points = [];
    for (let z = -28; z <= 29; z += 4) {
      points.push(new THREE.Vector3(1.5 + Math.sin(z * 0.22) * 1.1, 3.4, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 72, 0.08, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf4d27a,
      emissive: 0x4f3512,
      roughness: 0.6
    });
    const ridge = new THREE.Mesh(geometry, material);
    ridge.castShadow = true;
    return ridge;
  }

  addLights() {
    const ambient = new THREE.HemisphereLight(0xe8f6ff, 0x26451f, 1.8);
    const sun = new THREE.DirectionalLight(0xfff1c6, 3);
    sun.position.set(-22, 42, 26);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);

    const fill = new THREE.DirectionalLight(0x9fc6ff, 0.9);
    fill.position.set(22, 20, -18);

    this.scene.add(ambient, sun, fill);
  }

  createMarker(trail) {
    const position = this.latLonToPosition(trail.lat, trail.lon);
    const group = new THREE.Group();
    const color = this.getDifficultyColor(trail.difficulty);
    const coneGeometry = new THREE.ConeGeometry(0.55, 1.9, 24);
    const coneMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      emissive: color,
      emissiveIntensity: 0.08
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.name = "marker-cone";
    cone.position.y = position.y + 1.2;
    cone.castShadow = true;

    const baseGeometry = new THREE.SphereGeometry(0.42, 24, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.name = "marker-base";
    base.position.y = position.y + 0.22;
    base.castShadow = true;

    const hitGeometry = new THREE.SphereGeometry(1.25, 16, 12);
    const hitMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0,
      transparent: true,
      depthWrite: false
    });
    const hitTarget = new THREE.Mesh(hitGeometry, hitMaterial);
    hitTarget.name = "marker-hit-target";
    hitTarget.position.y = position.y + 1.1;

    group.position.set(position.x, 0, position.z);
    group.userData = {
      base,
      cone,
      hitTarget,
      originalColor: color,
      trail
    };
    group.add(cone, base, hitTarget);
    this.markersByTrailId.set(trail.id, group);
    return group;
  }

  latLonToPosition(lat, lon) {
    const { x, z } = this.latLonToFlatPosition(lat, lon);
    const y = this.getElevationAt(x, z);

    return { x, y, z };
  }

  latLonToFlatPosition(lat, lon) {
    const width = 24;
    const depth = 60;
    const xRatio = (lon - this.bounds.minLon) / (this.bounds.maxLon - this.bounds.minLon);
    const zRatio = (lat - this.bounds.minLat) / (this.bounds.maxLat - this.bounds.minLat);
    const x = THREE.MathUtils.clamp((xRatio - 0.5) * width, -11.4, 11.4);
    const z = THREE.MathUtils.clamp((zRatio - 0.5) * -depth, -28.8, 28.8);

    return { x, z };
  }

  getElevationAt(x, z) {
    const coastalPlain = 1 - THREE.MathUtils.smoothstep(x, -9.4, -5.5);
    const centralRidge = Math.exp(-Math.pow((x + 1.6) / 3.25, 2)) * 3.6;
    const antiLebanonRidge = Math.exp(-Math.pow((x - 8.2) / 2.2, 2)) * 1.9;
    const bekaaValley = Math.exp(-Math.pow((x - 5.0) / 1.7, 2)) * 1.2;
    const northernPeak = Math.exp(-Math.pow((z + 18) / 7.6, 2)) * 1.55;
    const sanninePeak = Math.exp(-Math.pow((z + 4.8) / 6.2, 2)) * 1.3;
    const choufPeak = Math.exp(-Math.pow((z - 7.2) / 7.2, 2)) * 0.9;
    const ridgeModulation = 0.78 + northernPeak + sanninePeak + choufPeak;
    const texture = (Math.sin(x * 1.2) * Math.cos(z * 0.32) + Math.sin((x + z) * 0.34)) * 0.18;
    const elevation = 0.22 + centralRidge * ridgeModulation + antiLebanonRidge - bekaaValley + texture - coastalPlain * 0.28;

    return Math.max(0.08, elevation);
  }

  getDifficultyColor(difficulty) {
    const colors = {
      Easy: 0x42c47f,
      Moderate: 0xf0b74f,
      Hard: 0xdc5f4e
    };
    return colors[difficulty] || 0xf0b74f;
  }

  handlePointerMove(event) {
    if (this.isNavigationMode) {
      this.renderer.domElement.style.cursor = "grab";
      return;
    }

    const marker = this.pickMarker(event);
    this.renderer.domElement.style.cursor = marker ? "pointer" : "default";
  }

  handlePointerClick(event) {
    if (this.isNavigationMode) {
      return;
    }

    const marker = this.pickMarker(event);
    if (marker?.userData.trail) {
      this.selectMarker(marker);
    }
  }

  pickMarker(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const visibleMarkers = this.markerGroup.children.filter((marker) => marker.visible);
    const hits = this.raycaster.intersectObjects(visibleMarkers, true);
    return hits.length ? this.findMarkerRoot(hits[0].object) : null;
  }

  findMarkerRoot(object) {
    let current = object;
    while (current && current.parent !== this.markerGroup) {
      current = current.parent;
    }
    return current;
  }

  showTrail(trail) {
    if (!this.detailTarget) {
      return;
    }

    this.detailTarget.hidden = false;
    this.detailTarget.classList.add("is-open");
    this.detailTarget.innerHTML = `
      <article class="trail-info-card card border-0">
        <button class="trail-info-close btn btn-light btn-sm" type="button" data-trail-detail-close aria-label="Close trail details">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
        <img src="${trail.imageUrl}" class="card-img-top" alt="${trail.name}" loading="lazy">
        <div class="card-body">
          <div class="d-flex flex-wrap gap-2 mb-2">
            <span class="badge text-bg-success">${trail.region}</span>
            <span class="badge text-bg-warning">${trail.difficulty}</span>
          </div>
          <h3 class="card-title">${trail.name}</h3>
          <p class="card-text">${trail.description}</p>
          <dl class="trail-info-list">
            <div><dt>Distance</dt><dd>${trail.distanceKm} km</dd></div>
            <div><dt>Elevation</dt><dd>${trail.elevationGainM} m</dd></div>
            <div><dt>Duration</dt><dd>${trail.durationHours} hr</dd></div>
          </dl>
        </div>
      </article>
    `;
  }

  selectMarker(marker) {
    if (!marker) {
      this.clearSelection();
      return;
    }

    if (this.selectedMarker && this.selectedMarker !== marker) {
      this.setMarkerHighlight(this.selectedMarker, false);
    }

    this.selectedMarker = marker;
    this.setMarkerHighlight(marker, true);
    this.showTrail(marker.userData.trail);
    this.onTrailSelect?.(marker.userData.trail);
    this.updateDebugState();
  }

  clearSelection() {
    if (this.selectedMarker) {
      this.setMarkerHighlight(this.selectedMarker, false);
    }

    this.selectedMarker = null;
    this.hideTrailPanel();
    this.onTrailClear?.();
    this.updateDebugState();
  }

  hideTrailPanel() {
    if (!this.detailTarget) {
      return;
    }

    this.detailTarget.hidden = true;
    this.detailTarget.classList.remove("is-open");
    this.detailTarget.innerHTML = "";
  }

  handleDetailClick(event) {
    if (event.target.closest("[data-trail-detail-close]")) {
      this.clearSelection();
    }
  }

  toggleNavigationMode() {
    this.setNavigationMode(!this.isNavigationMode);
  }

  setNavigationMode(isEnabled) {
    this.isNavigationMode = isEnabled;

    if (this.controls) {
      this.controls.enabled = isEnabled;
    }

    if (this.renderer?.domElement) {
      this.renderer.domElement.style.touchAction = isEnabled ? "none" : "pan-y";
      this.renderer.domElement.style.cursor = isEnabled ? "grab" : "default";
    }

    this.frame?.classList.toggle("is-navigating", isEnabled);

    if (this.navigationToggle) {
      this.navigationToggle.classList.toggle("btn-primary", isEnabled);
      this.navigationToggle.classList.toggle("btn-light", !isEnabled);
      this.navigationToggle.setAttribute("aria-pressed", String(isEnabled));
      const label = this.navigationToggle.querySelector("[data-navigation-label]");
      if (label) {
        label.textContent = isEnabled ? "Exit Navigation" : "Navigate Map";
      }
    }

    this.updateDebugState();
  }

  handleDocumentPointerDown(event) {
    if (!this.isNavigationMode || !this.frame || this.frame.contains(event.target)) {
      return;
    }

    this.setNavigationMode(false);
  }

  handleKeyDown(event) {
    if (event.key === "Escape" && this.isNavigationMode) {
      this.setNavigationMode(false);
    }
  }

  setMarkerHighlight(marker, isSelected) {
    const { base, cone, originalColor } = marker.userData;
    marker.scale.setScalar(isSelected ? 1.45 : 1);
    cone.material.color.setHex(isSelected ? 0x3fb6ff : originalColor);
    cone.material.emissive.setHex(isSelected ? 0x0d6efd : originalColor);
    cone.material.emissiveIntensity = isSelected ? 0.34 : 0.08;
    base.material.color.setHex(isSelected ? 0xffffff : 0xffffff);
    marker.userData.isSelected = isSelected;
  }

  resetView() {
    if (!this.camera || !this.controls) {
      return;
    }

    this.camera.position.set(0, 34, 52);
    this.controls.target.set(0, 0.4, 0);
    this.controls.update();
  }

  handleResize() {
    if (!this.renderer || !this.camera || !this.container) {
      return;
    }

    this.camera.aspect = this.aspectRatio;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  animate() {
    this.animationFrame = window.requestAnimationFrame(this.animate);
    this.controls.update();
    this.markerGroup.children.forEach((marker, index) => {
      marker.rotation.y += 0.006 + index * 0.00012;
    });
    this.renderer.render(this.scene, this.camera);
    this.updateDebugState();
  }

  get aspectRatio() {
    return this.container.clientWidth / this.container.clientHeight;
  }

  updateDebugState() {
    if (!this.renderer) {
      return;
    }

    const canvas = this.renderer.domElement;
    const gl = this.renderer.getContext();
    const sample = new Uint8Array(16);
    const points = [
      [Math.floor(canvas.width * 0.3), Math.floor(canvas.height * 0.32)],
      [Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.5)],
      [Math.floor(canvas.width * 0.7), Math.floor(canvas.height * 0.68)],
      [Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.78)]
    ];

    points.forEach(([x, y], index) => {
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, sample, index * 4);
    });

    const colors = [];
    for (let index = 0; index < sample.length; index += 4) {
      colors.push(Array.from(sample.slice(index, index + 4)).join(","));
    }
    const rect = canvas.getBoundingClientRect();
    const markerScreenPositions = this.markerGroup.children
      .filter((marker) => marker.visible)
      .map((marker) => {
        const projected = new THREE.Vector3();
        marker.userData.hitTarget.getWorldPosition(projected);
        projected.project(this.camera);

        return {
          id: marker.userData.trail.id,
          x: Math.round(((projected.x + 1) / 2) * rect.width + rect.left),
          y: Math.round(((-projected.y + 1) / 2) * rect.height + rect.top)
        };
      });

    window.__trailMapDebug = {
      canvasHeight: canvas.height,
      canvasWidth: canvas.width,
      markerScreenPositions,
      markerCount: this.markerGroup.children.length,
      selectedTrailId: this.selectedMarker?.userData.trail.id || "",
      infoPanelOpen: Boolean(this.detailTarget && !this.detailTarget.hidden),
      navigationMode: this.isNavigationMode,
      visibleMarkerCount: this.getVisibleMarkerCount(),
      renderFrame: (window.__trailMapDebug?.renderFrame || 0) + 1,
      sampledColors: colors,
      uniqueSampledColors: new Set(colors).size
    };

    this.container.dataset.canvasHeight = String(canvas.height);
    this.container.dataset.canvasWidth = String(canvas.width);
    this.container.dataset.markerCount = String(this.markerGroup.children.length);
    this.container.dataset.markerScreenPositions = JSON.stringify(markerScreenPositions);
    this.container.dataset.selectedTrailId = window.__trailMapDebug.selectedTrailId;
    this.container.dataset.infoPanelOpen = String(window.__trailMapDebug.infoPanelOpen);
    this.container.dataset.navigationMode = String(window.__trailMapDebug.navigationMode);
    this.container.dataset.visibleMarkerCount = String(window.__trailMapDebug.visibleMarkerCount);
    this.container.dataset.renderFrame = String(window.__trailMapDebug.renderFrame);
    this.container.dataset.sampledColors = colors.join("|");
    this.container.dataset.uniqueSampledColors = String(window.__trailMapDebug.uniqueSampledColors);
  }
}
