import type { MetadataRoute } from "next";
import { all } from "@/lib/db";
import { INDEXABLE, abs } from "@/lib/site";

// Depende de la base: se arma al pedirlo, nunca durante el build.
export const dynamic = "force-dynamic";

const STATIC: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/muro", priority: 0.9, changeFrequency: "daily" },
  { path: "/guia", priority: 0.9, changeFrequency: "weekly" },
  { path: "/oficios", priority: 0.9, changeFrequency: "weekly" },
  { path: "/utiles", priority: 0.8, changeFrequency: "daily" },
  { path: "/agenda", priority: 0.7, changeFrequency: "daily" },
  { path: "/residuos", priority: 0.7, changeFrequency: "monthly" },
  { path: "/visitar", priority: 0.7, changeFrequency: "monthly" },
  { path: "/empleo", priority: 0.6, changeFrequency: "daily" },
  { path: "/necesito", priority: 0.5, changeFrequency: "daily" },
  { path: "/ideas", priority: 0.6, changeFrequency: "weekly" },
  { path: "/encuestas", priority: 0.4, changeFrequency: "weekly" },
  { path: "/transparencia", priority: 0.5, changeFrequency: "weekly" },
  { path: "/resultados", priority: 0.4, changeFrequency: "weekly" },
  { path: "/privacidad", priority: 0.2, changeFrequency: "monthly" },
];

type Row = { id: number; at: string | null };
const when = (s: string | null) => (s ? new Date(`${s.replace(" ", "T")}Z`) : undefined);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!INDEXABLE) return [];
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC.map((s) => ({ url: abs(s.path), lastModified: now, changeFrequency: s.changeFrequency, priority: s.priority }));
  try {
    // Solo contenido público y vigente. Los reclamos NUNCA se listan.
    const [listings, posts, ideas, jobs] = await Promise.all([
      all<Row>("SELECT id, created_at AS at FROM listings WHERE deleted = 0 ORDER BY id LIMIT 5000"),
      all<Row>(`SELECT id, COALESCE(updated_at, created_at) AS at FROM posts
                WHERE deleted = 0 AND hidden = 0 AND (expires_at IS NULL OR expires_at > datetime('now') OR category = 'aviso')
                ORDER BY id DESC LIMIT 5000`),
      all<Row>("SELECT id, created_at AS at FROM ideas WHERE hidden = 0 ORDER BY id DESC LIMIT 2000"),
      all<Row>("SELECT id, created_at AS at FROM jobs WHERE hidden = 0 AND status = 'abierta' AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1000"),
    ]);
    for (const r of listings) entries.push({ url: abs(`/guia/${r.id}`), lastModified: when(r.at), changeFrequency: "weekly", priority: 0.8 });
    for (const r of posts) entries.push({ url: abs(`/muro/${r.id}`), lastModified: when(r.at), changeFrequency: "weekly", priority: 0.6 });
    for (const r of ideas) entries.push({ url: abs(`/ideas/${r.id}`), lastModified: when(r.at), changeFrequency: "weekly", priority: 0.5 });
    for (const r of jobs) entries.push({ url: abs(`/empleo/${r.id}`), lastModified: when(r.at), changeFrequency: "weekly", priority: 0.4 });
  } catch {
    // Si la base no responde, al menos se publican las páginas fijas.
  }
  return entries;
}
