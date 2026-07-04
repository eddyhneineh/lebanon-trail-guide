import TrailStore from "./TrailStore.js";
import TrailMap3D from "./TrailMap3D.js";
import TrailMap2D from "./TrailMap2D.js";
import FilterPanel from "./FilterPanel.js";
import WeatherService from "./WeatherService.js";
import AuthManager from "./AuthManager.js";
import ReviewManager from "./ReviewManager.js";
import { auth, db } from "./firebaseApp.js";

const store = new TrailStore();
const authManager = new AuthManager({ auth });

function initHeroStats() {
  const trailCount = document.querySelector("[data-stat='trail-count']");
  const regionCount = document.querySelector("[data-stat='region-count']");

  if (trailCount) {
    trailCount.textContent = store.all().length;
  }

  if (regionCount) {
    regionCount.textContent = store.getRegions().length;
  }
}

function initMapPage() {
  const mapContainer = document.querySelector("#trail-map");
  const map2DContainer = document.querySelector("#trail-map-2d");

  if (!mapContainer) {
    return;
  }

  const reviewManager = new ReviewManager({
    db,
    authManager,
    container: document.querySelector("#trail-reviews")
  });
  reviewManager.init();

  const map = new TrailMap3D(mapContainer, document.querySelector("#trail-detail"), {
    frame: document.querySelector("#map-frame"),
    navigationToggle: document.querySelector("#mapNavigationToggle"),
    onTrailSelect: (trail) => reviewManager.showForTrail(trail),
    onTrailClear: () => reviewManager.clear()
  });
  const map2D = new TrailMap2D(map2DContainer);
  const summary = document.querySelector("#map-summary");
  const viewButtons = {
    threeD: document.querySelector("#mapView3DButton"),
    twoD: document.querySelector("#mapView2DButton")
  };
  const navigationToggle = document.querySelector("#mapNavigationToggle");
  const resetButton = document.querySelector("#mapResetButton");
  const mapFrame = document.querySelector("#map-frame");
  let activeMapView = "3d";

  map.render(store.all());
  map2D.render(store.all());
  map2D.setActive(false);

  function updateSummary(visibleCount) {
    if (summary) {
      summary.textContent = `${visibleCount} trail${visibleCount === 1 ? "" : "s"} shown`;
    }
  }

  function setMapView(view) {
    activeMapView = view;
    const is2D = view === "2d";

    map.setNavigationMode(false);
    mapContainer.hidden = is2D;
    mapContainer.classList.toggle("is-active", !is2D);
    map2D.setActive(is2D);
    mapFrame?.classList.toggle("is-2d", is2D);
    navigationToggle?.classList.toggle("d-none", is2D);

    viewButtons.threeD?.classList.toggle("active", !is2D);
    viewButtons.threeD?.classList.toggle("btn-light", !is2D);
    viewButtons.threeD?.classList.toggle("btn-outline-light", is2D);
    viewButtons.threeD?.setAttribute("aria-pressed", String(!is2D));
    viewButtons.twoD?.classList.toggle("active", is2D);
    viewButtons.twoD?.classList.toggle("btn-light", is2D);
    viewButtons.twoD?.classList.toggle("btn-outline-light", !is2D);
    viewButtons.twoD?.setAttribute("aria-pressed", String(is2D));

    if (!is2D) {
      map.handleResize();
    }

    updateSummary(is2D ? map2D.getVisibleMarkerCount() : map.getVisibleMarkerCount());
  }

  const filters = new FilterPanel({
    store,
    onChange: (criteria) => {
      const visibleCount = map.applyFilters(criteria);
      map2D.applyFilters(criteria);
      updateSummary(visibleCount);
    }
  });

  if (summary) {
    const totalTrails = store.all().length;
    updateSummary(totalTrails);
  }

  filters.init();
  viewButtons.threeD?.addEventListener("click", () => setMapView("3d"));
  viewButtons.twoD?.addEventListener("click", () => setMapView("2d"));
  resetButton?.addEventListener("click", () => {
    if (activeMapView === "2d") {
      map2D.fitLebanon();
    } else {
      map.resetView();
    }
    updateSummary(activeMapView === "2d" ? map2D.getVisibleMarkerCount() : map.getVisibleMarkerCount());
  });
}

function initTrailList() {
  const list = document.querySelector("#trail-list");

  if (!list) {
    return;
  }

  list.innerHTML = store.all().map((trail) => `
    <article class="trail-card">
      <img src="${trail.imageUrl}" alt="${trail.name}" loading="lazy">
      <h2>${trail.name}</h2>
      <p>${trail.description}</p>
      <div class="trail-meta">
        <span>${trail.region}</span>
        <span>${trail.difficulty}</span>
        <span>${trail.distanceKm} km</span>
        <span>${trail.durationHours} hr</span>
      </div>
      <small class="text-muted">${trail.metaLine}</small>
    </article>
  `).join("");
}

function initWeatherPage() {
  const form = document.querySelector("#weather-form");
  const result = document.querySelector("#weather-result");

  if (!form || !result) {
    return;
  }

  const service = new WeatherService();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const weather = await service.lookup(form.elements.location.value);
    result.innerHTML = `
      <h2>${weather.location}</h2>
      <p>${weather.summary}</p>
      <div class="trail-meta">
        <span>${weather.temperatureC}&deg;C</span>
        <span>${weather.windKph} kph wind</span>
      </div>
    `;
  });
}

authManager.init();
initHeroStats();
initMapPage();
initTrailList();
initWeatherPage();
