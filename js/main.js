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
  const map2D = new TrailMap2D(map2DContainer, {
    onTrailSelect: (trail) => reviewManager.showForTrail(trail)
  });
  const summary = document.querySelector("#map-summary");
  const viewButtons = {
    threeD: document.querySelector("#mapView3DButton"),
    twoD: document.querySelector("#mapView2DButton")
  };
  const navigationToggle = document.querySelector("#mapNavigationToggle");
  const resetButton = document.querySelector("#mapResetButton");
  const mapFrame = document.querySelector("#map-frame");
  const disclaimer3D = document.querySelector("#map3DDisclaimer");
  let activeMapView = "2d";

  map.render(store.all());
  map2D.render(store.all());
  mapContainer.hidden = true;
  map2D.setActive(true);
  mapFrame?.classList.add("is-2d");
  navigationToggle?.classList.add("d-none");
  if (disclaimer3D) {
    disclaimer3D.hidden = true;
  }

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
    if (disclaimer3D) {
      disclaimer3D.hidden = is2D;
    }

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
  const select = document.querySelector("#weather-trail");
  const result = document.querySelector("#weather-result");
  const submitButton = form?.querySelector("button[type='submit']");

  if (!form || !select || !result) {
    return;
  }

  const trails = store.all();
  const service = new WeatherService();

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderEmpty() {
    result.className = "weather-result weather-empty";
    result.innerHTML = `
      <div class="weather-state">
        <i class="bi bi-compass" aria-hidden="true"></i>
        <p class="mb-0">Select a trail to view current weather and hiking guidance.</p>
      </div>
    `;
  }

  function renderLoading(trail) {
    result.className = "weather-result weather-loading";
    result.innerHTML = `
      <div class="weather-state">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading</span>
        </div>
        <p class="mb-0">Fetching current conditions for ${escapeHtml(trail.name)}...</p>
      </div>
    `;
  }

  function renderError(message) {
    result.className = "weather-result weather-error";
    result.innerHTML = `
      <div class="alert alert-danger mb-0" role="alert">
        <strong>Weather unavailable.</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function renderWeather(weather) {
    result.className = "weather-result weather-ready";
    result.innerHTML = `
      <article class="card weather-card border-0">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-3">
            <div>
              <p class="eyebrow mb-1">${escapeHtml(weather.region)}</p>
              <h2 class="card-title h4 mb-1">${escapeHtml(weather.trailName)}</h2>
              <p class="text-capitalize text-muted mb-0">${escapeHtml(weather.description)}</p>
            </div>
            <span class="badge text-bg-${weather.verdict.tone} weather-verdict">${weather.verdict.label}</span>
          </div>
          <div class="weather-metrics">
            <div>
              <span>${weather.temperatureC}&deg;C</span>
              <small>Temperature</small>
            </div>
            <div>
              <span>${weather.windSpeedMs.toFixed(1)} m/s</span>
              <small>Wind speed</small>
            </div>
            <div>
              <span>${weather.humidity}%</span>
              <small>Humidity</small>
            </div>
          </div>
          <p class="mb-0">${escapeHtml(weather.verdict.reason)}</p>
        </div>
      </article>
    `;
  }

  async function fetchSelectedTrailWeather() {
    const trail = trails.find((item) => item.id === select.value);

    if (!trail) {
      renderEmpty();
      return;
    }

    renderLoading(trail);
    try {
      const weather = await service.lookupTrail(trail);
      renderWeather(weather);
    } catch (error) {
      renderError(error.message || "Check the API key, network connection, and OpenWeatherMap response.");
    }
  }

  select.insertAdjacentHTML("beforeend", trails.map((trail) => `
    <option value="${escapeHtml(trail.id)}">${escapeHtml(trail.name)}</option>
  `).join(""));

  select.addEventListener("change", () => {
    submitButton.disabled = !select.value;
    fetchSelectedTrailWeather();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    fetchSelectedTrailWeather();
  });

  renderEmpty();
}

authManager.init();
initHeroStats();
initMapPage();
initTrailList();
initWeatherPage();
