import "server-only";
import { cookies } from "next/headers";
import { all } from "./db";
import { BARRIOS } from "./constants";
import { nowLocal, todayKey } from "./format";
import { type Post, pharmacyToday, type Pharmacy } from "./data";
import type { User } from "./auth";
import { collectionsOn, type Slot } from "./waste";
import { currentFeatured } from "./featured";
import type { Listing } from "./data";
/** Un aviso está vigente por sus fechas al momento de la consulta, sin depender de ningún cron. */
export const NOTICE_ACTIVE = `p.category = 'aviso' AND p.deleted = 0 AND p.hidden = 0 AND p.lifecycle = 'active'
  AND (p.starts_at IS NULL OR p.starts_at <= datetime('now')) AND (p.ends_at IS NULL OR p.ends_at > datetime('now'))`;
export type Outcome = {
    id: number;
    source_type: string;
    source_id: number;
    body: string;
    photos: string[];
    created_at: string;
    author_name: string;
    source_title: string | null;
    source_href: string;
};
const j = (s: string): string[] => {
    try {
        return JSON.parse(s) as string[];
    }
    catch {
        return [];
    }
};
export const SOURCE_HREF = { pedido: "/necesito", publicacion: "/muro", idea: "/ideas" } as const;
/** Resultados públicos «Gracias, se resolvió»: se revalida la visibilidad del origen en cada lectura. */
export async function publicOutcomes(limit = 6): Promise<Outcome[]> {
    const rows = await all<Omit<Outcome, "photos" | "source_href"> & {
        photos: string;
    }>(`SELECT o.id,o.source_type,o.source_id,o.body,o.photos,o.created_at,u.name AS author_name,
       CASE o.source_type WHEN 'pedido' THEN (SELECT title FROM community_requests WHERE id=o.source_id AND hidden=0)
         WHEN 'publicacion' THEN (SELECT title FROM posts WHERE id=o.source_id AND deleted=0 AND hidden=0)
         ELSE (SELECT title FROM ideas WHERE id=o.source_id AND hidden=0) END AS source_title
     FROM community_outcomes o JOIN users u ON u.id = o.author_id
     WHERE o.status = 'publicado' ORDER BY o.created_at DESC LIMIT ?`, limit * 2);
    return rows
        .filter((r) => r.source_title)
        .slice(0, limit)
        .map((r) => ({ ...r, photos: j(r.photos), source_href: `${SOURCE_HREF[r.source_type as keyof typeof SOURCE_HREF]}/${r.source_id}` }));
}
export const ZONE_COOKIE = "sc_zone";
/** Zonas que aplican: la que eligió manualmente (sin GPS) y, con sesión, las que sigue. */
export async function currentZones(user: User | null): Promise<string[]> {
    const zones = new Set<string>();
    const c = (await cookies()).get(ZONE_COOKIE)?.value;
    if (c && (BARRIOS as readonly string[]).includes(c))
        zones.add(c);
    if (user)
        for (const r of await all<{
            target_id: string;
        }>("SELECT target_id FROM follows WHERE user_id = ? AND target_type = 'zona'", user.id))
            zones.add(r.target_id);
    return [...zones];
}
export type Hoy = {
    notices: Post[];
    pharmacy: Pharmacy | null;
    eventsToday: Post[];
    upcoming: Post[];
    changes: Post[];
    news: Post[];
    outcomes: Outcome[];
    waste: {
        today: Slot[];
        tomorrow: Slot[];
    };
    featured: {
        listing: Listing;
        pitch: string;
        week: string;
    } | null;
    polls: {
        id: number;
        question: string;
        closes_at: string;
        total: number;
    }[];
};
type Row = Omit<Post, "photos"> & {
    photos: string;
};
const SEL = `SELECT p.*, u.name AS author_name, u.role AS author_role,
  (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
  (SELECT COUNT(*) FROM comments c WHERE c.kind='post' AND c.target_id = p.id AND c.hidden = 0) AS comments, 0 AS liked
  FROM posts p JOIN users u ON u.id = p.author_id`;
const map = (r: Row): Post => ({ ...r, photos: j(r.photos) });
/** Compone «Hoy en Sampacho» solo con contenido público vigente; nada se duplica ni se infiere de ayer. */
export async function getHoy(zones: string[]): Promise<Hoy> {
    const zoneSql = zones.length ? `AND (p.zone IS NULL OR p.zone IN (${zones.map(() => "?").join(",")}))` : "";
    const sev = `CASE p.severity WHEN 'urgente' THEN 0 WHEN 'importante' THEN 1 ELSE 2 END`;
    const notices = (await all<Row>(`${SEL} WHERE ${NOTICE_ACTIVE} ${zoneSql} ORDER BY ${sev}, COALESCE(p.updated_at, p.created_at) DESC LIMIT 4`, ...zones)).map(map);
    // Cambios programados: arrancan en las próximas 24 h, o ya vigentes y terminan en las próximas 24 h.
    const changes = (await all<Row>(`${SEL} WHERE p.category='aviso' AND p.deleted=0 AND p.hidden=0 AND p.lifecycle='active' ${zoneSql}
       AND ((p.starts_at > datetime('now') AND p.starts_at <= datetime('now','+24 hours'))
         OR (p.ends_at > datetime('now') AND p.ends_at <= datetime('now','+24 hours')))
     ORDER BY COALESCE(p.starts_at, p.ends_at) ASC LIMIT 3`, ...zones)).map(map);
    const today = todayKey();
    const events = (await all<Row>(`${SEL} WHERE p.category='evento' AND p.deleted=0 AND p.hidden=0 AND p.lifecycle='active' ${zoneSql}
       AND p.event_at >= ? ORDER BY p.event_at ASC LIMIT 12`, ...zones, today)).map(map);
    const now = nowLocal();
    // Sin hora final se trata como evento de todo el día.
    const eventsToday = events.filter((e) => e.event_at!.slice(0, 10) === today && (!e.event_end_at || e.event_end_at > now));
    const upcoming = events.filter((e) => e.event_at!.slice(0, 10) > today).slice(0, 3);
    const news = (await all<Row>(`${SEL} WHERE p.category IN ('noticia','perdido','empleo') AND p.deleted=0 AND p.hidden=0 AND p.lifecycle='active' ${zoneSql}
     ORDER BY p.created_at DESC LIMIT 3`, ...zones)).map(map);
    const polls = await all<{
        id: number;
        question: string;
        closes_at: string;
        total: number;
    }>(`SELECT p.id,p.question,p.closes_at,(SELECT COUNT(*) FROM poll_votes v WHERE v.poll_id = p.id) AS total FROM polls p
     WHERE p.hidden = 0 AND p.status = 'abierta' AND p.closes_at > datetime('now') ${zones.length ? `AND (p.zone IS NULL OR p.zone IN (${zones.map(() => "?").join(",")}))` : ""} ORDER BY p.closes_at LIMIT 2`, ...zones);
    return {
        notices, pharmacy: await pharmacyToday() ?? null, eventsToday, upcoming, changes, news, outcomes: await publicOutcomes(3),
        waste: { today: await collectionsOn(zones, 0), tomorrow: await collectionsOn(zones, 1) },
        featured: await currentFeatured(),
        polls,
    };
}
