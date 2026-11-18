import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Sitio de ejemplo / previews: que ningún buscador lo recorra.
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas privadas o sin valor para buscar. Las demás páginas privadas llevan además "noindex".
      disallow: ["/api/", "/panel", "/perfil", "/notificaciones", "/siguiendo", "/ingresar", "/registro", "/offline"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
