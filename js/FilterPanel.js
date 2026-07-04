export default class FilterPanel {
  constructor({ store, onChange, mount = document.body }) {
    this.store = store;
    this.onChange = onChange;
    this.mount = mount;
    this.panel = null;
    this.button = null;
  }

  init() {
    if (!this.store || !this.mount || this.panel) {
      return;
    }

    this.render();
    this.bindEvents();
    this.emitChange();
  }

  render() {
    this.button = document.createElement("button");
    this.button.className = "filter-toggle btn btn-primary";
    this.button.type = "button";
    this.button.setAttribute("aria-controls", "trail-filter-panel");
    this.button.setAttribute("aria-expanded", "false");
    this.button.innerHTML = '<i class="bi bi-funnel-fill" aria-hidden="true"></i><span class="visually-hidden">Open trail filters</span>';

    this.panel = document.createElement("aside");
    this.panel.className = "trail-filter-drawer";
    this.panel.id = "trail-filter-panel";
    this.panel.setAttribute("aria-label", "Trail filters");
    this.panel.innerHTML = `
      <div class="trail-filter-header">
        <div>
          <p class="eyebrow mb-1">Map filters</p>
          <h2>Find a route</h2>
        </div>
        <button class="btn btn-outline-light btn-sm" type="button" data-filter-close aria-label="Close trail filters">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
      <form class="trail-filter-form">
        <fieldset>
          <legend>Difficulty</legend>
          ${this.renderDifficultyOptions()}
        </fieldset>
        <div>
          <label class="form-label" for="regionFilter">Region</label>
          <select class="form-select" id="regionFilter" name="region">
            <option value="All">All regions</option>
            ${this.store.getRegions().map((region) => `<option value="${region}">${region}</option>`).join("")}
          </select>
        </div>
        <button class="btn btn-light w-100" type="reset">Reset filters</button>
      </form>
    `;

    this.mount.append(this.button, this.panel);
  }

  renderDifficultyOptions() {
    return ["Easy", "Moderate", "Hard"].map((difficulty) => `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" name="difficulty" value="${difficulty}" id="difficulty${difficulty}" checked>
        <label class="form-check-label" for="difficulty${difficulty}">${difficulty}</label>
      </div>
    `).join("");
  }

  bindEvents() {
    const form = this.panel.querySelector(".trail-filter-form");
    this.button.addEventListener("click", () => this.togglePanel());
    this.panel.querySelector("[data-filter-close]").addEventListener("click", () => this.closePanel());
    form.addEventListener("change", () => this.emitChange());
    form.addEventListener("reset", () => {
      window.setTimeout(() => this.emitChange(), 0);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closePanel();
      }
    });
  }

  togglePanel() {
    const isOpen = this.panel.classList.toggle("is-open");
    this.button.classList.toggle("is-open", isOpen);
    this.button.setAttribute("aria-expanded", String(isOpen));
  }

  closePanel() {
    this.panel.classList.remove("is-open");
    this.button.classList.remove("is-open");
    this.button.setAttribute("aria-expanded", "false");
  }

  getCriteria() {
    const form = this.panel.querySelector(".trail-filter-form");
    const difficulties = Array.from(form.querySelectorAll("input[name='difficulty']:checked")).map((input) => input.value);

    return {
      difficulties,
      region: form.elements.region.value
    };
  }

  emitChange() {
    this.onChange(this.getCriteria());
  }
}
