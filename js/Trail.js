export default class Trail {
  constructor(data) {
    Object.assign(this, data);
  }

  matches({ region = "All", difficulty = "All", maxDistance = Infinity } = {}) {
    const regionMatch = region === "All" || this.region === region;
    const difficultyMatch = difficulty === "All" || this.difficulty === difficulty;
    return regionMatch && difficultyMatch && this.distanceKm <= Number(maxDistance);
  }

  get metaLine() {
    return `${this.distanceKm} km · ${this.elevationGainM} m gain · starts in ${this.start}`;
  }
}
