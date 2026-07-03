export default class FilterPanel {
  constructor(form, store, onChange) {
    this.form = form;
    this.store = store;
    this.onChange = onChange;
  }

  init() {
    if (!this.form) {
      return;
    }

    this.populateSelect("region", this.store.getRegions());
    this.populateSelect("difficulty", this.store.getDifficulties());
    this.bindEvents();
    this.emitChange();
  }

  populateSelect(name, values) {
    const select = this.form.elements[name];
    select.innerHTML = `<option value="All">All</option>${values.map((value) => `<option value="${value}">${value}</option>`).join("")}`;
  }

  bindEvents() {
    this.form.addEventListener("input", () => this.emitChange());
    this.form.addEventListener("reset", () => {
      window.setTimeout(() => this.emitChange(), 0);
    });
  }

  getCriteria() {
    return {
      region: this.form.elements.region.value,
      difficulty: this.form.elements.difficulty.value,
      maxDistance: this.form.elements.distance.value
    };
  }

  emitChange() {
    const criteria = this.getCriteria();
    const distanceValue = document.querySelector("#distanceValue");

    if (distanceValue) {
      distanceValue.textContent = `${criteria.maxDistance} km`;
    }

    this.onChange(criteria);
  }
}
