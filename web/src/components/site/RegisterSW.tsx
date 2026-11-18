"use client";

import { useEffect } from "react";

/**
 * Registra el service worker (solo en producción) y, si cambia el usuario de este navegador (cierre de sesión o
 * cuenta distinta), pide borrar las páginas guardadas para que no queden restos en equipos compartidos.
 */
export function RegisterSW({ userId }: { userId: number | null }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const prev = localStorage.getItem("sc_uid");
      const now = userId == null ? "" : String(userId);
      if (prev !== null && prev !== now) navigator.serviceWorker.controller?.postMessage({ type: "clear-pages" });
      localStorage.setItem("sc_uid", now);
    } catch {
      /* almacenamiento bloqueado: se sigue sin esa limpieza */
    }
    if (process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [userId]);
  return null;
}
