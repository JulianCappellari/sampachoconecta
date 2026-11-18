"use client";

import { useEffect, useState } from "react";
import { ChevronDown, CloudOff, CloudRain, CloudSun, ExternalLink, Moon, RefreshCw, Sun, Umbrella, Wind } from "lucide-react";
import type { WeatherReport } from "@/lib/weather-core";

const REFRESH = 10 * 60_000;
const TZ = "America/Argentina/Buenos_Aires";
const time = (value: string) => new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(value));

export function WeatherWidget() {
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [checkedAt, setCheckedAt] = useState(() => Date.now());

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    let busy = false;
    async function load() {
      if (busy) return;
      busy = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 12_000);
      try {
        const response = await fetch("/api/clima", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Clima no disponible");
        const data: WeatherReport = await response.json();
        if (!disposed) { setReport(data); setError(false); }
      } catch {
        if (!disposed) setError(true);
      } finally {
        window.clearTimeout(timeout);
        busy = false;
        if (!disposed) { setLoading(false); setCheckedAt(Date.now()); }
      }
    }
    function visible() { if (document.visibilityState === "visible") void load(); }
    void load();
    const interval = window.setInterval(visible, REFRESH);
    document.addEventListener("visibilitychange", visible);
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval); document.removeEventListener("visibilitychange", visible); };
  }, [attempt]);

  const tooOld = report?.retrievedAt ? checkedAt - Date.parse(report.retrievedAt) > 2 * 60 * 60_000 : true;
  const usable = report && report.temperature !== null && !tooOld;
  const stale = error || report?.status === "stale";
  const total = report?.models.length ?? 0;
  const wetModels = report?.models.filter((model) => model.rain >= 0.5).length ?? 0;
  const brief = !usable ? "Pronóstico no disponible" : total === 1 ? "Una sola fuente" : wetModels === 0 ? "Sin lluvia en 12 h" : wetModels === total ? "Lluvia en las próximas 12 h" : "Pronóstico variable";

  // El ícono sigue el momento y el pronóstico: luna de noche, sol de día, lluvia si los modelos la prevén.
  const hour = Number(new Intl.DateTimeFormat("es-AR", { hour: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(checkedAt)));
  const night = hour < 6 || hour >= 20;
  const Icon = !usable ? CloudOff : wetModels > 0 && wetModels === total ? CloudRain : wetModels > 0 ? CloudSun : night ? Moon : Sun;
  const tone = !usable ? "bg-surface-2 text-ink-2" : wetModels > 0 || night ? "bg-cielo-soft text-cielo" : "bg-girasol-soft text-warn";
  const range = usable && report.low != null && report.high != null ? `${Math.round(report.low)}° a ${Math.round(report.high)}°` : null;

  return (
    <section aria-labelledby="weather-title" className="relative w-full rounded-2xl border border-line bg-surface sm:w-72">
      <h3 id="weather-title" className="sr-only">Clima en Sampacho</h3>

      {loading && !report ? (
        <div className="flex items-center gap-3 p-3" role="status" aria-label="Consultando pronósticos">
          <span className="size-12 animate-pulse rounded-xl bg-surface-2" />
          <span className="grid flex-1 gap-2"><span className="h-6 w-16 animate-pulse rounded bg-surface-2" /><span className="h-3.5 w-32 animate-pulse rounded bg-surface-2" /></span>
        </div>
      ) : usable ? (
        <details
          className="group"
          onKeyDown={(event) => {
            if (event.key === "Escape" && window.matchMedia("(min-width: 1024px)").matches) {
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
          onBlur={(event) => {
            if (window.matchMedia("(min-width: 1024px)").matches && !event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false;
          }}
        >
          <summary
            className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl p-3 transition hover:bg-surface-2/60 [&::-webkit-details-marker]:hidden"
            aria-label={`Clima: ${Math.round(report.temperature!)} grados, ${brief}. Ver pronóstico`}
          >
            <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="size-6" aria-hidden /></span>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="font-display text-3xl font-extrabold tabular-nums">{Math.round(report.temperature!)}°</span>
              <span className="truncate text-sm text-ink-2">{brief}{range ? ` · ${range}` : ""}</span>
            </span>
            <ChevronDown className="size-5 shrink-0 text-ink-2 transition-transform group-open:rotate-180" aria-hidden />
          </summary>

          {stale && <p className="mx-3 mb-2 rounded-lg bg-girasol-soft px-3 py-1.5 text-sm text-warn" role="status">Sin actualizar · datos anteriores</p>}

          <div
            className="weather-detail border-t border-line p-4 lg:absolute lg:right-0 lg:top-[calc(100%+0.5rem)] lg:z-30 lg:max-h-[min(50dvh,36rem)] lg:w-[26rem] lg:overflow-y-auto lg:overscroll-contain lg:rounded-2xl lg:border lg:bg-surface lg:p-5 lg:shadow-[0_12px_36px_-12px_rgba(0,0,0,.35)]"
            data-lenis-prevent
          >
            <p className="text-sm text-ink-2">{report.low}° a {report.high}° en las próximas 12 h · Estimación{report.validAt ? ` para las ${time(report.validAt)} h` : " actual"}.</p>
            <p className="mt-2 text-sm font-bold">{stale ? "Última consulta disponible" : report.agreement}</p>
            <p className="mt-1 text-sm">{report.conclusion}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2"><Wind className="size-4 shrink-0" aria-hidden /> Viento máximo: {report.wind} km/h</p>
            <ul className="mt-2 grid gap-2 text-sm">
              {report.models.map((model) => (
                <li key={model.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line py-2 last:border-0">
                  <a href={model.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-bold text-cielo underline underline-offset-4">{model.name}<ExternalLink className="size-3.5" aria-label="abre en otra pestaña" /></a>
                  <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums text-ink-2">{Math.round(model.temperature)} °C estimados <span className="inline-flex items-center gap-1"><Umbrella className="size-4" aria-hidden />{model.rain.toLocaleString("es-AR")} mm / 12 h</span></span>
                </li>
              ))}
            </ul>
            {report.missing.length > 0 && <p className="mt-2 text-sm text-warn">Sin datos utilizables de: {report.missing.join(", ")}.</p>}
            <p className="mt-3 text-sm text-ink-2">Comparamos ECMWF, GFS e ICON. Usamos la mediana de las temperaturas y del viento, y contrastamos si cada modelo prevé al menos 0,5 mm de lluvia en 12 horas. La coincidencia no es una probabilidad de acierto.</p>
            <p className="mt-2 text-sm text-ink-2">Son pronósticos de modelos, no mediciones locales. Consulta cada 10 minutos. <a href="https://www.smn.gob.ar/" target="_blank" rel="noopener noreferrer" className="text-cielo underline underline-offset-4">Pronóstico y alertas oficiales: SMN</a>.</p>
          </div>
        </details>
      ) : (
        <div className="flex items-center gap-3 p-3" role="status">
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${tone}`}><CloudOff className="size-6" aria-hidden /></span>
          <p className="text-sm text-ink-2">Clima no disponible. <a href="https://www.smn.gob.ar/" target="_blank" rel="noopener noreferrer" className="text-cielo underline underline-offset-4">Consultar SMN</a></p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 px-3 pb-2 text-xs text-ink-2">
        <p>{usable && report.retrievedAt ? <>Actualizado {time(report.retrievedAt)} h<span aria-hidden> · </span></> : null}<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Open-Meteo</a></p>
        {(error || report?.status === "unavailable") && (
          <button type="button" disabled={loading} onClick={() => { setLoading(true); setAttempt((value) => value + 1); }} className="inline-flex min-h-11 items-center gap-1.5 font-bold text-monte disabled:opacity-60">
            <RefreshCw className="size-4" aria-hidden />{loading ? "Consultando…" : "Reintentar"}
          </button>
        )}
      </div>
    </section>
  );
}
