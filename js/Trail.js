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
    return `${this.distanceKm} km - ${this.elevationGainM} m gain - ${this.durationHours} hr`;
  }

  get mapPoint() {
    const bounds = {
      minLat: 33.0,
      maxLat: 34.75,
      minLon: 35.1,
      maxLon: 36.35
    };
    const x = ((this.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
    const y = ((bounds.maxLat - this.lat) / (bounds.maxLat - bounds.minLat)) * 100;

    return {
      x: Math.min(92, Math.max(8, x)),
      y: Math.min(92, Math.max(8, y))
    };
  }
}
