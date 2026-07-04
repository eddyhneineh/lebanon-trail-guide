// Replace this placeholder with a real OpenWeatherMap API key.
export const OPENWEATHER_API_KEY = "b137d0f6b9b22d90c99455bed00a813c";

export default class WeatherService {
  constructor({
    apiKey = OPENWEATHER_API_KEY,
    endpoint = "https://api.openweathermap.org/data/2.5/weather",
  } = {}) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async lookupTrail(trail) {
    if (!trail?.lat || !trail?.lon) {
      throw new Error("Select a trail with valid coordinates.");
    }

    const url = new URL(this.endpoint);
    url.searchParams.set("lat", trail.lat);
    url.searchParams.set("lon", trail.lon);
    url.searchParams.set("units", "metric");
    url.searchParams.set("appid", this.apiKey);

    const response = await fetch(url);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.message || "OpenWeatherMap request failed.";
      throw new Error(`Unable to fetch current weather: ${message}`);
    }

    const weather = payload.weather?.[0] || {};
    const normalized = {
      trailName: trail.name,
      region: trail.region,
      temperatureC: Math.round(payload.main?.temp),
      description: weather.description || "Current conditions unavailable",
      windSpeedMs: Number(payload.wind?.speed ?? 0),
      humidity: Number(payload.main?.humidity ?? 0),
      weatherId: Number(weather.id ?? 0),
      weatherMain: weather.main || "",
    };

    return {
      ...normalized,
      verdict: this.getVerdict(normalized),
    };
  }

  getVerdict(weather) {
    const isThunderstorm = weather.weatherId >= 200 && weather.weatherId < 300;
    const isHeavyRain = [502, 503, 504, 511, 522, 531].includes(
      weather.weatherId
    );
    const isSnow = weather.weatherId >= 600 && weather.weatherId < 700;
    const isExtremeTemp =
      weather.temperatureC <= 0 || weather.temperatureC >= 38;
    const isHighWind = weather.windSpeedMs >= 15;

    if (
      isThunderstorm ||
      isHeavyRain ||
      isSnow ||
      isExtremeTemp ||
      isHighWind
    ) {
      return {
        label: "Not recommended",
        tone: "danger",
        reason: "Conditions are severe enough to postpone the hike.",
      };
    }

    const isRain = weather.weatherId >= 500 && weather.weatherId < 600;
    const isHotOrCold = weather.temperatureC <= 5 || weather.temperatureC >= 32;
    const isWindy = weather.windSpeedMs >= 10;
    const isVeryHumid = weather.humidity >= 90;

    if (isRain || isHotOrCold || isWindy || isVeryHumid) {
      return {
        label: "Use caution",
        tone: "warning",
        reason:
          "Pack accordingly and reconsider exposed or difficult sections.",
      };
    }

    return {
      label: "Good to hike",
      tone: "success",
      reason: "Weather looks suitable for a prepared hiking day.",
    };
  }
}
