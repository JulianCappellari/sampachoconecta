/** Lógica sin dependencias de Next para validar y probar la síntesis meteorológica. */
export const WEATHER_MODELS = [
  { id: "ecmwf_ifs025", name: "ECMWF · IFS", origin: "Centro Europeo", url: "https://open-meteo.com/en/docs/ecmwf-api" },
  { id: "gfs_global", name: "NOAA · GFS", origin: "Estados Unidos", url: "https://open-meteo.com/en/docs/gfs-api" },
  { id: "icon_global", name: "DWD · ICON", origin: "Alemania", url: "https://open-meteo.com/en/docs/dwd-api" },
] as const;

export type WeatherModel = (typeof WEATHER_MODELS)[number];
type Hour = { time: number; temperature: number; precipitation: number; wind: number };
export type ModelForecast = { model: WeatherModel; hours: Hour[] };
export type ModelSummary = { id: string; name: string; url: string; temperature: number; rain: number; wind: number; low: number; high: number };
export type WeatherReport = {
  status: "fresh" | "partial" | "stale" | "unavailable";
  retrievedAt: string | null;
  validAt: string | null;
  temperature: number | null;
  low: number | null;
  high: number | null;
  wind: number | null;
  agreement: string;
  conclusion: string;
  models: ModelSummary[];
  missing: string[];
};

const HOUR = 3_600_000;
export const WEATHER_TTL = 10 * 60_000;
export const WEATHER_MAX_STALE = 2 * HOUR;
const RETRY_DELAY = 60_000;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Respuesta meteorológica inválida");
  return value as Record<string, unknown>;
}

function numeric(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function parseForecast(value: unknown, model: WeatherModel): ModelForecast {
  const data = object(value);
  const hourly = object(data.hourly);
  const units = object(data.hourly_units);
  if (units.time !== "unixtime" || units.temperature_2m !== "°C" || units.precipitation !== "mm" || units.wind_speed_10m !== "km/h") throw new Error("Unidades meteorológicas inesperadas");
  const { time, temperature_2m: temperatures, precipitation, wind_speed_10m: wind } = hourly;
  if (!Array.isArray(time) || !Array.isArray(temperatures) || !Array.isArray(precipitation) || !Array.isArray(wind) || time.length > 200 || time.length !== temperatures.length || time.length !== precipitation.length || time.length !== wind.length) throw new Error("Series meteorológicas incompletas");
  const hours: Hour[] = [];
  for (let i = 0; i < time.length; i++) {
    if (!numeric(time[i], 1_577_836_800, 4_102_444_800)) throw new Error("Fecha meteorológica inválida");
    const stamp = time[i] * 1000;
    if (i && stamp !== time[i - 1] * 1000 + HOUR) throw new Error("Horas duplicadas o no consecutivas");
    // null no significa cero lluvia. Una hora incompleta no sirve para el consenso.
    if (numeric(temperatures[i], -90, 65) && numeric(precipitation[i], 0, 1000) && numeric(wind[i], 0, 500)) {
      hours.push({ time: stamp, temperature: temperatures[i], precipitation: precipitation[i], wind: wind[i] });
    }
  }
  return { model, hours };
}

function summarize(forecast: ModelForecast, now: number): ModelSummary | null {
  const currentHour = Math.floor(now / HOUR) * HOUR;
  const current = forecast.hours.find((hour) => hour.time === currentHour);
  const next = forecast.hours.filter((hour) => hour.time > currentHour && hour.time <= currentHour + 12 * HOUR);
  if (!current || next.length !== 12) return null;
  return {
    id: forecast.model.id, name: forecast.model.name, url: forecast.model.url,
    temperature: current.temperature,
    rain: Math.round(next.reduce((sum, hour) => sum + hour.precipitation, 0) * 10) / 10,
    wind: Math.round(Math.max(...next.map((hour) => hour.wind))),
    low: Math.min(...next.map((hour) => hour.temperature)),
    high: Math.max(...next.map((hour) => hour.temperature)),
  };
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildWeatherReport(forecasts: ModelForecast[], retrievedAt: number | null, now: number): WeatherReport {
  // El caller nunca puede dar peso doble a una misma fuente.
  const unique = [...new Map(forecasts.map((forecast) => [forecast.model.id, forecast])).values()];
  const withinAge = retrievedAt !== null && retrievedAt <= now && now - retrievedAt <= WEATHER_MAX_STALE;
  const models = withinAge ? unique.map((forecast) => summarize(forecast, now)).filter((model): model is ModelSummary => model !== null) : [];
  const missing = WEATHER_MODELS.filter((model) => !models.some((sample) => sample.id === model.id)).map((model) => model.name);
  const base = { retrievedAt: withinAge ? new Date(retrievedAt!).toISOString() : null, validAt: models.length ? new Date(Math.floor(now / HOUR) * HOUR).toISOString() : null, models, missing };
  if (!models.length) return { ...base, status: "unavailable", temperature: null, low: null, high: null, wind: null, agreement: "Sin datos disponibles", conclusion: "No pudimos consultar el clima. Vamos a volver a intentarlo; podés consultar el pronóstico oficial del SMN." };

  const temperatures = models.map((model) => model.temperature);
  const spread = Math.max(...temperatures) - Math.min(...temperatures);
  const wet = models.filter((model) => model.rain >= 0.5).length;
  const sameRain = wet === 0 || wet === models.length;
  const rainLow = Math.min(...models.map((model) => model.rain));
  const rainHigh = Math.max(...models.map((model) => model.rain));
  const rainDiffers = wet === models.length && models.length >= 2 && rainHigh - rainLow >= 5 && rainHigh >= rainLow * 2;
  let agreement = models.length < 2 ? "Una sola fuente disponible" : sameRain && spread <= 3 ? "Coincidencia alta" : sameRain && spread <= 5 ? "Coincidencia moderada" : "Los modelos difieren";
  if (rainDiffers) agreement = "Coinciden en lluvia, difieren en cantidad";
  let conclusion: string;
  if (models.length === 1) conclusion = `Solo ${models[0].name} está disponible: ${wet ? "prevé lluvia" : "prevé poca o ninguna lluvia"} en las próximas 12 horas. Falta contrastar con otros modelos.`;
  else if (wet === models.length) conclusion = `Los ${models.length} modelos prevén lluvia en las próximas 12 horas.`;
  else if (wet === 0) conclusion = `Los ${models.length} modelos prevén poca o ninguna lluvia en las próximas 12 horas.`;
  else conclusion = `${wet} de ${models.length} modelos prevén lluvia en las próximas 12 horas; los demás prevén poca o ninguna. El pronóstico es variable.`;
  if (rainDiffers) conclusion += ` La cantidad prevista varía entre ${rainLow.toLocaleString("es-AR")} y ${rainHigh.toLocaleString("es-AR")} mm.`;
  if (spread > 5) conclusion += " También hay diferencias importantes en la temperatura estimada.";
  const stale = now - retrievedAt! >= WEATHER_TTL;
  if (stale) { agreement = "Última consulta disponible"; conclusion = "No se pudo actualizar. " + conclusion; }
  return {
    ...base, status: stale ? "stale" : models.length < WEATHER_MODELS.length ? "partial" : "fresh",
    temperature: Math.round(median(temperatures) * 10) / 10,
    low: Math.round(median(models.map((model) => model.low))),
    high: Math.round(median(models.map((model) => model.high))),
    wind: Math.round(median(models.map((model) => model.wind))),
    agreement, conclusion,
  };
}

/** Caché pública de una sola localidad, sin datos ni estado de sesión de usuarios. */
export function createWeatherService(load: (model: WeatherModel) => Promise<ModelForecast>, clock = Date.now) {
  let forecasts: ModelForecast[] = [];
  let retrievedAt: number | null = null;
  let nextAttempt = 0;
  let pending: Promise<void> | null = null;

  return async function getWeather(): Promise<WeatherReport> {
    const started = clock();
    if (started >= nextAttempt && !pending) {
      pending = (async () => {
        const results = await Promise.allSettled(WEATHER_MODELS.map((model) => load(model)));
        const successful = results.flatMap((result) => result.status === "fulfilled" && summarize(result.value, clock()) ? [result.value] : []);
        if (successful.length) {
          forecasts = successful;
          retrievedAt = clock();
        }
        nextAttempt = clock() + (successful.length === WEATHER_MODELS.length ? WEATHER_TTL : RETRY_DELAY);
      })().finally(() => { pending = null; });
    }
    if (pending) await pending;
    return buildWeatherReport(forecasts, retrievedAt, clock());
  };
}
