import TrailStore from "./TrailStore.js";
import TrailMap3D from "./TrailMap3D.js";
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
    onTrailSelect: (trail) => reviewManager.showForTrail(trail),
    onTrailClear: () => reviewManager.clear()
  });
  const summary = document.querySelector("#map-summary");
  map.render(store.all());

  const filters = new FilterPanel({
    store,
    onChange: (criteria) => {
      const visibleCount = map.applyFilters(criteria);

      if (summary) {
        summary.textContent = `${visibleCount} trail${visibleCount === 1 ? "" : "s"} shown`;
      }
    }
  });

  if (summary) {
    const totalTrails = store.all().length;
    summary.textContent = `${totalTrails} trails shown`;
  }

  filters.init();
  document.querySelector("#mapResetButton")?.addEventListener("click", () => {
    map.resetView();
    if (summary) {
      summary.textContent = `${map.getVisibleMarkerCount()} trail${map.getVisibleMarkerCount() === 1 ? "" : "s"} shown`;
    }
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
