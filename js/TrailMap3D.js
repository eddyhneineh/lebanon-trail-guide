import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default class TrailMap3D {
  constructor(container, detailTarget, { onTrailSelect, onTrailClear } = {}) {
    this.container = container;
    this.detailTarget = detailTarget;
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
    this.bounds = {
      minLat: 33.05,
      maxLat: 34.65,
      minLon: 35.1,
      maxLon: 36.35
    };

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerClick = this.handlePointerClick.bind(this);
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
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 86;
    this.controls.target.set(0, 0.4, 0);

    this.scene.add(this.createTerrain());
    this.scene.add(this.createLebanonOutline());
    this.scene.add(this.createRidgeLine());
    this.scene.add(this.markerGroup);
    this.addLights();
    this.updateDebugState();

    window.addEventListener("resize", this.handleResize);
    this.renderer.domElement.addEventListener("pointermove", this.handlePointerMove);
    this.renderer.domElement.addEventListener("click", this.handlePointerClick);
    this.animate();
  }

  render(trails) {
    if (!this.renderer) {
      this.init();
    }

    this.visibleTrails = trails;
    this.markerGroup.clear();
    this.markersByTrailId.clear();
    this.selectedMarker = null;
    trails.forEach((trail) => this.markerGroup.add(this.createMarker(trail)));
    this.updateDebugState();

    if (trails.length) {
      this.selectMarker(this.markersByTrailId.get(trails[0].id));
    } else if (this.detailTarget) {
      this.detailTarget.textContent = "No trails match the selected filters.";
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
      this.selectMarker(firstVisibleMarker);
    } else if (!this.selectedMarker && firstVisibleMarker) {
      this.selectMarker(firstVisibleMarker);
    } else if (!firstVisibleMarker) {
      this.clearSelection();
      if (this.detailTarget) {
        this.detailTarget.innerHTML = `
          <div class="trail-info-empty">
            <strong>No matching trails</strong>
            <p class="mb-0">Try widening the region or difficulty filters.</p>
          </div>
        `;
      }
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
    const geometry = new THREE.PlaneGeometry(26, 64, 46, 110);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const coastalFalloff = THREE.MathUtils.smoothstep(Math.abs(x), 5, 13);
      const centralRidge = Math.exp(-Math.pow((x - 1.6) / 4.8, 2)) * 4.2;
      const northernHighlands = Math.exp(-Math.pow((z + 18) / 11, 2)) * 1.7;
      const southernHills = Math.sin((z + 10) * 0.18) * 0.45;
      const texture = Math.sin(x * 0.75) * Math.cos(z * 0.22) * 0.55;
      const elevation = centralRidge + northernHighlands + southernHills + texture - coastalFalloff * 1.1;
      positions.setY(index, Math.max(-0.45, elevation));
    }

    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: 0x7da66d,
      roughness: 0.88,
      metalness: 0.02,
      flatShading: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  createLebanonOutline() {
    const shape = new THREE.Shape();
    const points = [
      [-8, -31], [-3.6, -28], [-1.5, -20], [2.5, -12], [4.4, -4],
      [6.8, 7], [7.4, 18], [5.4, 29], [1.5, 32], [-2.7, 27],
      [-4.2, 14], [-6.5, 3], [-7.3, -9], [-9, -22]
    ];
    points.forEach(([x, z], index) => {
      if (index === 0) {
        shape.moveTo(x, z);
      } else {
        shape.lineTo(x, z);
      }
    });
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0.08, 0);
    const material = new THREE.MeshBasicMaterial({
      color: 0xd8b25a,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    return new THREE.Mesh(geometry, material);
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
    const width = 24;
    const depth = 60;
    const xRatio = (lon - this.bounds.minLon) / (this.bounds.maxLon - this.bounds.minLon);
    const zRatio = (lat - this.bounds.minLat) / (this.bounds.maxLat - this.bounds.minLat);
    const x = THREE.MathUtils.clamp((xRatio - 0.5) * width, -11.4, 11.4);
    const z = THREE.MathUtils.clamp((zRatio - 0.5) * -depth, -28.8, 28.8);
    const y = this.getElevationAt(x, z);

    return { x, y, z };
  }

  getElevationAt(x, z) {
    const centralRidge = Math.exp(-Math.pow((x - 1.6) / 4.8, 2)) * 4.2;
    const northernHighlands = Math.exp(-Math.pow((z + 18) / 11, 2)) * 1.7;
    const southernHills = Math.sin((z + 10) * 0.18) * 0.45;
    const texture = Math.sin(x * 0.75) * Math.cos(z * 0.22) * 0.55;
    return Math.max(-0.2, centralRidge + northernHighlands + southernHills + texture) + 0.18;
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
    const marker = this.pickMarker(event);
    this.renderer.domElement.style.cursor = marker ? "pointer" : "grab";
  }

  handlePointerClick(event) {
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

    this.detailTarget.innerHTML = `
      <article class="trail-info-card card border-0">
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
    this.onTrailClear?.();
    this.updateDebugState();
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
    this.container.dataset.visibleMarkerCount = String(window.__trailMapDebug.visibleMarkerCount);
    this.container.dataset.renderFrame = String(window.__trailMapDebug.renderFrame);
    this.container.dataset.sampledColors = colors.join("|");
    this.container.dataset.uniqueSampledColors = String(window.__trailMapDebug.uniqueSampledColors);
  }
}
