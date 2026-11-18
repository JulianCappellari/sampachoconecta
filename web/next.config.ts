import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App con sesiones y base de datos: se renderiza por pedido (sin Cache Components).
  serverExternalPackages: ["sharp"],
  experimental: {
    // El cliente reduce las fotos antes del envío; el cuerpo queda debajo del límite de Vercel.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    // Páginas privadas o de formulario: nunca deben aparecer en buscadores, aunque alguien las enlace.
    const privatePaths = ["/panel/:path*", "/reclamos/:path*", "/perfil", "/notificaciones", "/siguiendo", "/ingresar", "/registro", "/offline", "/api/:path*", "/muro/nueva", "/guia/nuevo", "/ideas/nueva", "/necesito/nuevo", "/empleo/nuevo", "/encuestas/nueva"];
    const rules = privatePaths.map((source) => ({ source, headers: noindex }));
    // Sitio de ejemplo y previews: nada se indexa. Solo el real define SITE_INDEXING=on.
    if (process.env.SITE_INDEXING !== "on") rules.push({ source: "/:path*", headers: noindex });
    return rules;
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
