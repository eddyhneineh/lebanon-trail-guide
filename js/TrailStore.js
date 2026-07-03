import Trail from "./Trail.js";
import { trails } from "../data/trails.js";

export default class TrailStore {
  constructor(source = trails) {
    this.trails = source.map((trail) => new Trail(trail));
  }

  all() {
    return [...this.trails];
  }

  filter(criteria) {
    return this.trails.filter((trail) => trail.matches(criteria));
  }

  getRegions() {
    return this.uniqueValues("region");
  }

  getDifficulties() {
    return this.uniqueValues("difficulty");
  }

  uniqueValues(key) {
    return [...new Set(this.trails.map((trail) => trail[key]))].sort();
  }
}
