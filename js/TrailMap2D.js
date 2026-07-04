export default class TrailMap2D {
  constructor(container) {
    this.container = container;
    this.map = null;
    this.markerLayer = null;
    this.borderLayer = null;
    this.cityLayer = null;
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
    this.borderLayer = this.createBorderLayer().addTo(this.map);
    this.cityLayer = this.createCityLayer().addTo(this.map);

    L.control.layers({
      "Satellite imagery": satellite,
      "Terrain": terrain
    }, {
      "Lebanon border": this.borderLayer,
      "City labels": this.cityLayer
    }, {
      collapsed: false,
      position: "bottomright"
    }).addTo(this.map);
    L.control.scale({
      imperial: false,
      maxWidth: 140,
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

  createBorderLayer() {
    return L.geoJSON(this.getLebanonBorderGeoJson(), {
      interactive: false,
      pane: "overlayPane",
      style: {
        color: "#f0c96b",
        dashArray: "8 5",
        fill: false,
        opacity: 0.96,
        weight: 4
      }
    });
  }

  createCityLayer() {
    const cities = [
      { name: "Beirut", lat: 33.8938, lon: 35.5018 },
      { name: "Tripoli", lat: 34.4367, lon: 35.8497 },
      { name: "Sidon", lat: 33.5571, lon: 35.3715 },
      { name: "Tyre", lat: 33.2705, lon: 35.2038 },
      { name: "Zahle", lat: 33.8468, lon: 35.9020 },
      { name: "Byblos", lat: 34.1230, lon: 35.6519 }
    ];
    const layer = L.layerGroup();

    cities.forEach((city) => {
      L.marker([city.lat, city.lon], {
        icon: L.divIcon({
          className: "city-label-marker",
          html: `<span>${this.escapeHtml(city.name)}</span>`,
          iconAnchor: [0, 14]
        }),
        interactive: false,
        keyboard: false,
        title: city.name
      }).addTo(layer);
    });

    return layer;
  }

  getLebanonBorderGeoJson() {
    return {
      type: "Feature",
      properties: {
        name: "Lebanon"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [35.12, 33.08], [35.22, 33.23], [35.29, 33.42], [35.36, 33.62],
          [35.43, 33.82], [35.50, 34.02], [35.61, 34.22], [35.72, 34.42],
          [35.88, 34.60], [36.08, 34.63], [36.24, 34.51], [36.32, 34.32],
          [36.25, 34.13], [36.29, 33.94], [36.19, 33.76], [36.11, 33.58],
          [35.99, 33.41], [35.86, 33.26], [35.70, 33.15], [35.50, 33.07],
          [35.31, 33.05], [35.12, 33.08]
        ]]
      }
    };
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
