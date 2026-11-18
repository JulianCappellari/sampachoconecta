import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App con sesiones y base de datos: se renderiza por pedido (sin Cache Components).
  serverExternalPackages: ["sharp"],
  experimental: {
    // Las fotos se comprimen en el servidor; el formulario puede traer hasta 4 fotos de 8 MB.
    serverActions: { bodySizeLimit: "40mb" },
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
