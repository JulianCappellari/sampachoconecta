"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { SAMPACHO_CENTER } from "@/lib/constants";
import { cn } from "@/lib/cn";

export type MapMarker = {
  id: number | string;
  lat: number;
  lng: number;
  title: string;
  sub?: string;
  href?: string;
  color?: string;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export const pinHtml = (color = "#0E6B5A") =>
  `<svg width="34" height="42" viewBox="0 0 64 64" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"><path d="M32 3C18.7 3 8 13.6 8 26.8 8 44.2 32 61 32 61s24-16.8 24-34.2C56 13.6 45.3 3 32 3z" fill="${color}" stroke="#fff" stroke-width="3"/><circle cx="32" cy="27" r="9" fill="#fff"/></svg>`;

/** Mapa con pines. Se carga Leaflet recién en el navegador. */
export function MapView({ markers, className, zoom = 15 }: { markers: MapMarker[]; className?: string; zoom?: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, zoomControl: true }).setView(SAMPACHO_CENTER, zoom);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const pts: [number, number][] = [];
      for (const m of markers) {
        const icon = L.divIcon({ className: "sc-pin", html: pinHtml(m.color), iconSize: [34, 42], iconAnchor: [17, 40], popupAnchor: [0, -36] });
        const popup = `<strong>${esc(m.title)}</strong>${m.sub ? `<br>${esc(m.sub)}` : ""}${m.href ? `<br><a href="${esc(m.href)}">Ver ficha</a>` : ""}`;
        L.marker([m.lat, m.lng], { icon, title: m.title }).addTo(map).bindPopup(popup);
        pts.push([m.lat, m.lng]);
      }
      if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 17 });
      else if (pts.length === 1) map.setView(pts[0], 16);
    })();
    return () => {
      dead = true;
      map?.remove();
    };
  }, [markers, zoom]);

  return <div ref={el} className={cn("h-80 w-full overflow-hidden rounded-2xl border border-line", className)} role="region" aria-label="Mapa" />;
}
