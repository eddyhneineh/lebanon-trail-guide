import TrailStore from "./TrailStore.js";
import TrailMap3D from "./TrailMap3D.js";
import FilterPanel from "./FilterPanel.js";
import WeatherService from "./WeatherService.js";

const store = new TrailStore();

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
  const filterForm = document.querySelector("#filter-panel");

  if (!mapContainer || !filterForm) {
    return;
  }

  const map = new TrailMap3D(mapContainer, document.querySelector("#trail-detail"));
  const summary = document.querySelector("#map-summary");
  const filters = new FilterPanel(filterForm, store, (criteria) => {
    const trails = store.filter(criteria);
    map.render(trails);

    if (summary) {
      summary.textContent = `${trails.length} trail${trails.length === 1 ? "" : "s"} shown`;
    }
  });

  filters.init();
  document.querySelector("#mapResetButton")?.addEventListener("click", () => map.resetView());
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

initHeroStats();
initMapPage();
initTrailList();
initWeatherPage();
