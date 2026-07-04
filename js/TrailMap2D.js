export default class TrailMap2D {
  constructor(container) {
    this.container = container;
    this.map = null;
    this.markerLayer = null;
    this.markersByTrailId = new Map();
    this.trails = [];
  }

  init() {
    if (!this.container || this.map || !window.L) {
      return;
    }

    const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri"
    });
    const terrain = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      maxZoom: 17,
      attribution: "Map data &copy; OpenStreetMap contributors, SRTM | Tiles &copy; OpenTopoMap"
    });

    this.map = L.map(this.container, {
      center: [33.93, 35.86],
      layers: [satellite],
      scrollWheelZoom: false,
      zoom: 8
    });
    L.control.layers({
      "Satellite imagery": satellite,
      "Terrain": terrain
    }, null, {
      collapsed: false,
      position: "bottomright"
    }).addTo(this.map);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.updateDebugState();
  }

  render(trails) {
    if (!this.map) {
      this.init();
    }

    if (!this.map) {
      return;
    }

    this.trails = trails;
    this.markerLayer.clearLayers();
    this.markersByTrailId.clear();
    trails.forEach((trail) => this.addMarker(trail));
    this.fitLebanon();
    this.updateDebugState();
  }

  addMarker(trail) {
    const marker = L.marker([trail.lat, trail.lon], {
      title: trail.name
    });
    marker.bindPopup(this.renderPopup(trail), {
      maxWidth: 280
    });
    marker.trail = trail;
    marker.addTo(this.markerLayer);
    this.markersByTrailId.set(trail.id, marker);
  }

  renderPopup(trail) {
    return `
      <article class="leaflet-trail-popup">
        <strong>${this.escapeHtml(trail.name)}</strong>
        <p>${this.escapeHtml(trail.description)}</p>
        <dl>
          <div><dt>Region</dt><dd>${this.escapeHtml(trail.region)}</dd></div>
          <div><dt>Difficulty</dt><dd>${this.escapeHtml(trail.difficulty)}</dd></div>
          <div><dt>Distance</dt><dd>${trail.distanceKm} km</dd></div>
          <div><dt>Duration</dt><dd>${trail.durationHours} hr</dd></div>
        </dl>
      </article>
    `;
  }

  applyFilters(criteria) {
    if (!this.map) {
      return 0;
    }

    let visibleCount = 0;
    this.markersByTrailId.forEach((marker) => {
      const isVisible = this.matchesCriteria(marker.trail, criteria);

      if (isVisible) {
        visibleCount += 1;
        if (!this.markerLayer.hasLayer(marker)) {
          this.markerLayer.addLayer(marker);
        }
      } else {
        this.markerLayer.removeLayer(marker);
      }
    });

    this.updateDebugState();
    return visibleCount;
  }

  matchesCriteria(trail, { difficulties = [], region = "All" } = {}) {
    const difficultyMatch = difficulties.length === 0 || difficulties.includes(trail.difficulty);
    const regionMatch = region === "All" || trail.region === region;
    return difficultyMatch && regionMatch;
  }

  setActive(isActive) {
    if (!this.container) {
      return;
    }

    this.container.hidden = !isActive;
    this.container.classList.toggle("is-active", isActive);

    if (isActive && this.map) {
      window.setTimeout(() => {
        this.map.invalidateSize();
        this.fitLebanon();
      }, 0);
    }
  }

  fitLebanon() {
    if (!this.map) {
      return;
    }

    this.map.fitBounds([
      [33.05, 35.1],
      [34.65, 36.35]
    ], {
      padding: [28, 28]
    });
  }

  getVisibleMarkerCount() {
    if (!this.markerLayer) {
      return 0;
    }

    return this.markerLayer.getLayers().length;
  }

  updateDebugState() {
    if (!this.container) {
      return;
    }

    this.container.dataset.markerCount = String(this.markersByTrailId.size);
    this.container.dataset.visibleMarkerCount = String(this.getVisibleMarkerCount());
  }

  escapeHtml(value) {
    const escapeTarget = document.createElement("div");
    escapeTarget.textContent = String(value);
    return escapeTarget.innerHTML;
  }
}
