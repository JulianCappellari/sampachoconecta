import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App con sesiones y base de datos: se renderiza por pedido (sin Cache Components).
  serverExternalPackages: ["sharp"],
  experimental: {
    // El cliente reduce las fotos antes del envío; el cuerpo queda debajo del límite de Vercel.
    serverActions: { bodySizeLimit: "4mb" },
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
