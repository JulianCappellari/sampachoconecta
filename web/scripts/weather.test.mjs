import test from "node:test";
import assert from "node:assert/strict";
import { WEATHER_MODELS, WEATHER_TTL, WEATHER_MAX_STALE, parseForecast, buildWeatherReport, createWeatherService } from "../src/lib/weather-core.ts";
import { EMERGENCY_CONTACTS } from "../src/lib/emergency.ts";

const NOW = Date.UTC(2026, 10, 18, 12, 35);
const START = Math.floor(NOW / 3_600_000) * 3600;
function payload(temperature = 22, rain = 0) {
  return {
    hourly_units: { time: "unixtime", temperature_2m: "°C", precipitation: "mm", wind_speed_10m: "km/h" },
    hourly: {
      time: Array.from({ length: 72 }, (_, i) => START + i * 3600),
      temperature_2m: Array(72).fill(temperature),
      precipitation: Array(72).fill(rain),
      wind_speed_10m: Array(72).fill(12),
    },
  };
}
function forecast(index, temperature = 22, rain = 0) { return parseForecast(payload(temperature, rain), WEATHER_MODELS[index]); }

test("los teléfonos verificados son líneas cortas, únicas y sin números de ejemplo", () => {
  assert.deepEqual(EMERGENCY_CONTACTS.map((c) => c.number), ["107", "100", "101"]);
  assert.equal(new Set(EMERGENCY_CONTACTS.map((c) => c.number)).size, 3);
});

test("la síntesis usa mediana y revela desacuerdo sobre lluvia sin inventar porcentajes", () => {
  const report = buildWeatherReport([forecast(0, 20, 0), forecast(1, 21, 0.2), forecast(2, 28, 0)], NOW, NOW);
  assert.equal(report.temperature, 21);
  assert.equal(report.status, "fresh");
  assert.equal(report.agreement, "Los modelos difieren");
  assert.match(report.conclusion, /1 de 3 modelos prevén lluvia/);
  assert.match(report.conclusion, /temperatura/);
  assert.doesNotMatch(report.conclusion, /%/);
});

test("solo compara las próximas doce horas y no lluvia pasada ni mañana", () => {
  const data = payload();
  data.hourly.precipitation[0] = 50;
  data.hourly.precipitation[13] = 50;
  const report = buildWeatherReport([parseForecast(data, WEATHER_MODELS[0]), forecast(1), forecast(2)], NOW, NOW);
  assert.equal(report.models[0].rain, 0);
  assert.equal(report.agreement, "Coincidencia alta");
});

test("coincidir en lluvia no oculta diferencias grandes en la cantidad", () => {
  const report = buildWeatherReport([forecast(0, 22, 0.5), forecast(1, 22, 0.5), forecast(2, 22, 2)], NOW, NOW);
  assert.match(report.agreement, /difieren en cantidad/);
  assert.match(report.conclusion, /6 y 24 mm/);
});

test("rechaza unidades incorrectas, horas duplicadas y longitudes desiguales", () => {
  const units = payload(); units.hourly_units.temperature_2m = "°F";
  assert.throws(() => parseForecast(units, WEATHER_MODELS[0]), /Unidades/);
  const times = payload(); times.hourly.time[2] = times.hourly.time[1];
  assert.throws(() => parseForecast(times, WEATHER_MODELS[0]), /consecutivas/);
  const lengths = payload(); lengths.hourly.precipitation.pop();
  assert.throws(() => parseForecast(lengths, WEATHER_MODELS[0]), /incompletas/);
});

test("datos nulos no se convierten en cero lluvia ni entran al consenso", () => {
  const data = payload(); data.hourly.precipitation[5] = null;
  const report = buildWeatherReport([parseForecast(data, WEATHER_MODELS[0]), forecast(1)], NOW, NOW);
  assert.equal(report.models.length, 1);
  assert.equal(report.status, "partial");
  assert.equal(report.agreement, "Una sola fuente disponible");
  assert.match(report.conclusion, /Falta contrastar/);
});

test("un modelo duplicado no pesa dos veces", () => {
  const model = forecast(0);
  assert.equal(buildWeatherReport([model, model], NOW, NOW).models.length, 1);
});

test("sin datos, serie sin la hora vigente o consulta demasiado antigua no muestra temperatura", () => {
  assert.equal(buildWeatherReport([], null, NOW).status, "unavailable");
  assert.equal(buildWeatherReport([forecast(0)], NOW, NOW - 3_600_000).temperature, null);
  assert.equal(buildWeatherReport([forecast(0)], NOW, NOW + WEATHER_MAX_STALE + 1).temperature, null);
});

test("última consulta entre diez minutos y dos horas se etiqueta sin actualizar", () => {
  const report = buildWeatherReport([forecast(0), forecast(1)], NOW, NOW + WEATHER_TTL);
  assert.equal(report.status, "stale");
  assert.match(report.conclusion, /No se pudo actualizar/);
  assert.equal(report.retrievedAt, new Date(NOW).toISOString());
});

test("peticiones simultáneas comparten tres consultas y la caché evita repetirlas", async () => {
  let calls = 0;
  const get = createWeatherService(async (model) => {
    calls++;
    await Promise.resolve();
    return parseForecast(payload(), model);
  }, () => NOW);
  const reports = await Promise.all([get(), get(), get()]);
  assert.equal(calls, 3);
  assert.ok(reports.every((report) => report.status === "fresh"));
  await get();
  assert.equal(calls, 3);
});

test("fallo de un proveedor conserva dos fuentes y no oculta el faltante", async () => {
  const get = createWeatherService(async (model) => {
    if (model.id === WEATHER_MODELS[0].id) throw new Error("timeout");
    return parseForecast(payload(), model);
  }, () => NOW);
  const report = await get();
  assert.equal(report.models.length, 2);
  assert.equal(report.status, "partial");
  assert.deepEqual(report.missing, [WEATHER_MODELS[0].name]);
});

test("caída total respeta cooldown, sirve caché antigua y la descarta al superar dos horas", async () => {
  let clock = NOW; let fail = false; let calls = 0;
  const get = createWeatherService(async (model) => {
    calls++;
    if (fail) throw new Error("sin red");
    return parseForecast(payload(), model);
  }, () => clock);
  await get();
  fail = true; clock += WEATHER_TTL;
  assert.equal((await get()).status, "stale");
  assert.equal(calls, 6);
  await get();
  assert.equal(calls, 6);
  clock = NOW + WEATHER_MAX_STALE + 1;
  assert.equal((await get()).status, "unavailable");
});
