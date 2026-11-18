"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import { SAMPACHO_CENTER } from "@/lib/constants";
import { pinHtml } from "./MapView";
import { btn } from "@/components/ui/Button";

/** Elegir un punto tocando el mapa. Guarda lat y lng en campos ocultos del formulario. */
export function LocationPicker({ label = "Ubicación en el mapa", hint }: { label?: string; hint?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [msg, setMsg] = useState("");
  const api = useRef<{ set: (p: [number, number], fly?: boolean) => void } | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (dead || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false }).setView(SAMPACHO_CENTER, 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const icon = L.divIcon({ className: "sc-pin", html: pinHtml(), iconSize: [34, 42], iconAnchor: [17, 40] });
      let marker: import("leaflet").Marker | undefined;
      const set = (p: [number, number], fly = false) => {
        if (!map) return;
        if (marker) marker.setLatLng(p);
        else marker = L.marker(p, { icon, draggable: true }).addTo(map).on("dragend", () => {
          const ll = marker!.getLatLng();
          setPos([ll.lat, ll.lng]);
        });
        if (fly) map.setView(p, 17);
        setPos(p);
      };
      api.current = { set };
      map.on("click", (e) => set([e.latlng.lat, e.latlng.lng]));
    })();
    return () => {
      dead = true;
      map?.remove();
    };
  }, []);

  function locate() {
    if (!navigator.geolocation) return setMsg("Tu navegador no permite ubicarte. Tocá el mapa para marcar el lugar.");
    setMsg("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        api.current?.set([p.coords.latitude, p.coords.longitude], true);
        setMsg("Ubicación marcada. Podés mover el pin si hace falta.");
      },
      () => setMsg("No pudimos ubicarte. Tocá el mapa para marcar el lugar."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold">{label}</span>
        <button type="button" onClick={locate} className={btn("secondary", "sm")}>
          <LocateFixed className="size-4" aria-hidden /> Usar mi ubicación
        </button>
      </div>
      <div ref={el} className="h-72 w-full overflow-hidden rounded-xl border-[1.5px] border-line" role="application" aria-label="Mapa para marcar el lugar" />
      <input type="hidden" name="lat" value={pos?.[0] ?? ""} />
      <input type="hidden" name="lng" value={pos?.[1] ?? ""} />
      <p className="text-sm text-ink-2" aria-live="polite">
        {msg || (pos ? "Lugar marcado. Podés arrastrar el pin para ajustarlo." : hint ?? "Tocá el mapa para marcar el lugar.")}
      </p>
    </div>
  );
}
