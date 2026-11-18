/**
 * Identidad pública del sitio para buscadores y redes.
 * - SITE_URL: dirección canónica (ej. https://sampachoconecta.com.ar). Sin ella usa la de Vercel.
 * - SITE_INDEXING=on: SOLO el sitio real la define. Sin ella (sitio de ejemplo, previews, local) todo
 *   queda con noindex, para que los datos de prueba nunca aparezcan en Google.
 */
export const SITE_NAME = "Sampacho Conecta";
export const SITE_TAGLINE = "Noticias, comercios, oficios y servicios de Sampacho, Córdoba";
export const SITE_DESCRIPTION =
  "La plaza del pueblo en el celular: novedades, guía de comercios y oficios con calificaciones, farmacia de turno, recolección de residuos, reclamos al municipio e ideas vecinales de Sampacho, Córdoba.";

const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";
export const SITE_URL = (process.env.SITE_URL?.trim() || fromVercel).replace(/\/+$/, "");
export const INDEXABLE = process.env.SITE_INDEXING === "on";

export const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
