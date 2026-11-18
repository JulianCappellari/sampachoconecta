import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sampacho Conecta",
    short_name: "Sampacho",
    description: "Novedades, comercios, oficios, reclamos e ideas vecinales de Sampacho.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F7F5",
    theme_color: "#0E6B5A",
    lang: "es-AR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
