"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { removePush, savePush } from "@/actions/push";
import { btn } from "@/components/ui/Button";

const b64 = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Activa o desactiva los avisos en este teléfono. Si el administrador no configuró el servicio, lo dice. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<"cargando" | "no-soportado" | "no-configurado" | "bloqueado" | "apagado" | "activo">("cargando");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!publicKey) return setState("no-configurado");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("no-soportado");
      if (Notification.permission === "denied") return setState("bloqueado");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "activo" : "apagado");
    })().catch(() => setState("no-soportado"));
  }, [publicKey]);

  async function enable() {
    setMsg("");
    try {
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "bloqueado" : "apagado");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
      const r = await savePush(sub.toJSON());
      if (!r.ok) return setMsg(r.error ?? "No se pudo activar.");
      setState("activo");
    } catch {
      setMsg("No pudimos activar los avisos en este dispositivo.");
    }
  }
  async function disable() {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removePush(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("apagado");
  }

  const text: Record<string, string> = {
    cargando: "Comprobando este dispositivo…",
    "no-soportado": "Este navegador no permite avisos al teléfono. En iPhone hace falta instalar la app en la pantalla de inicio.",
    "no-configurado": "Los avisos al teléfono todavía no están configurados por el administrador del sitio. Mientras tanto llegan a la bandeja de la app.",
    bloqueado: "Bloqueaste las notificaciones de este sitio. Podés habilitarlas desde los ajustes del navegador.",
    apagado: "Recibí los avisos importantes en tu teléfono, aunque no tengas la app abierta.",
    activo: "Los avisos al teléfono están activados en este dispositivo.",
  };
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4">
      <h3 className="flex items-center gap-2 text-xl font-bold">{state === "activo" ? <BellRing className="size-5 text-monte" aria-hidden /> : <BellOff className="size-5 text-ink-2" aria-hidden />} Avisos en este teléfono</h3>
      <p className="text-ink-2" aria-live="polite">{text[state]}</p>
      {state === "apagado" && <button type="button" onClick={enable} className={btn("primary", "md", "w-fit")}>Activar avisos</button>}
      {state === "activo" && <button type="button" onClick={disable} className={btn("secondary", "md", "w-fit")}>Desactivar en este dispositivo</button>}
      {msg && <p role="alert" className="font-bold text-err">{msg}</p>}
    </div>
  );
}
