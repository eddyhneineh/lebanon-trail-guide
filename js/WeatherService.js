export default class WeatherService {
  constructor() {
    this.conditions = [
      "Clear morning skies with stronger afternoon sun.",
      "Cool ridge winds; pack a shell above 1,500 m.",
      "Clouds building after noon with possible mist.",
      "Dry trail surface with warm valley temperatures."
    ];
  }

  async lookup(location) {
    const normalizedLocation = location.trim() || "Lebanon";
    const index = normalizedLocation.length % this.conditions.length;

    return {
      location: normalizedLocation,
      summary: this.conditions[index],
      temperatureC: 14 + index * 3,
      windKph: 8 + index * 5
    };
  }
}
