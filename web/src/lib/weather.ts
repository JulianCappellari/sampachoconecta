import "server-only";
import { createWeatherService, parseForecast } from "./weather-core";
import { SAMPACHO_CENTER } from "./constants";

/** Tres modelos globales distintos; un único distribuidor (Open-Meteo). */
export const getWeather = createWeatherService(async (model) => {
  // URL fija: el endpoint público no acepta destino, ubicación ni modelo del visitante.
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  const params = {
    latitude: String(SAMPACHO_CENTER[0]), longitude: String(SAMPACHO_CENTER[1]),
    models: model.id, hourly: "temperature_2m,precipitation,wind_speed_10m",
    forecast_days: "3", timeformat: "unixtime", timezone: "GMT",
    temperature_unit: "celsius", wind_speed_unit: "kmh", precipitation_unit: "mm",
  };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { signal: AbortSignal.timeout(7000), cache: "no-store" });
  if (!response.ok) throw new Error(`Proveedor de clima: HTTP ${response.status}`);
  return parseForecast(await response.json(), model);
});
