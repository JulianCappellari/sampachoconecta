import "server-only";
import { all, one } from "./db";
import { notifyUser } from "./notify";
import { nowUtc } from "./format";
export type OpenClaim = {
    id: number;
    number: string;
    category: string;
    description: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    status: string;
    version: number;
    incident_id: number | null;
    author_name: string;
    next_update_at: string | null;
    created_at: string;
};
export const openClaims = async () => await all<OpenClaim>(`SELECT c.id,c.number,c.category,c.description,c.address,c.lat,c.lng,c.status,c.version,c.incident_id,c.next_update_at,c.created_at,u.name AS author_name
     FROM claims c JOIN users u ON u.id = c.user_id WHERE c.status NOT IN ('resuelto','rechazado') ORDER BY c.created_at ASC`);
const dist = (a: OpenClaim, b: OpenClaim) => {
    if (a.lat == null || a.lng == null || b.lat == null || b.lng == null)
        return Infinity;
    const R = 6371000;
    const rad = (d: number) => (d * Math.PI) / 180;
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
};
/**
 * Sugerencias de posibles incidentes: misma categoría y cercanía (≤ 250 m) o misma dirección escrita.
 * Solo sugiere; nunca fusiona ni agrupa por su cuenta.
 */
export function suggestGroups(claims: OpenClaim[]): OpenClaim[][] {
    const free = claims.filter((c) => !c.incident_id);
    const used = new Set<number>();
    const groups: OpenClaim[][] = [];
    for (const c of free) {
        if (used.has(c.id))
            continue;
        const g = free.filter((o) => o.category === c.category && (o.id === c.id || dist(c, o) <= 250 || (!!c.address && !!o.address && c.address.trim().toLowerCase() === o.address.trim().toLowerCase())));
        if (g.length >= 2) {
            g.forEach((x) => used.add(x.id));
            groups.push(g);
        }
    }
    return groups;
}
export type IncidentRow = {
    id: number;
    title: string;
    category: string;
    place: string | null;
    area: string | null;
    status: string;
    summary: string | null;
    created_at: string;
    members: number;
    open_members: number;
};
export const listIncidents = async () => await all<IncidentRow>(`SELECT i.*, (SELECT COUNT(*) FROM claims c WHERE c.incident_id = i.id) AS members,
       (SELECT COUNT(*) FROM claims c WHERE c.incident_id = i.id AND c.status NOT IN ('resuelto','rechazado')) AS open_members
     FROM incidents i ORDER BY (i.status = 'activo') DESC, i.created_at DESC`);
export const getIncident = async (id: number) => await one<IncidentRow>(`SELECT i.*, 0 AS members, 0 AS open_members FROM incidents i WHERE i.id = ?`, id);
export const incidentClaims = async (id: number) => await all<OpenClaim & {
    closed: number;
}>(`SELECT c.id,c.number,c.category,c.description,c.address,c.lat,c.lng,c.status,c.version,c.incident_id,c.next_update_at,c.created_at,u.name AS author_name,
       (c.status IN ('resuelto','rechazado')) AS closed
     FROM claims c JOIN users u ON u.id = c.user_id WHERE c.incident_id = ? ORDER BY c.created_at ASC`, id);
export const incidentEvents = async (id: number) => await all<{
    id: number;
    kind: string;
    note: string | null;
    created_at: string;
    author_name: string;
    number: string | null;
}>(`SELECT e.id,e.kind,e.note,e.created_at,u.name AS author_name,c.number FROM incident_events e JOIN users u ON u.id = e.user_id LEFT JOIN claims c ON c.id = e.claim_id
     WHERE e.incident_id = ? ORDER BY e.id DESC`, id);
export const overdueClaims = async () => await all<{
    id: number;
    number: string;
    category: string;
    next_update_at: string;
    area: string | null;
}>("SELECT id,number,category,next_update_at,area FROM claims WHERE status NOT IN ('resuelto','rechazado') AND next_update_at IS NOT NULL AND next_update_at <= datetime('now') ORDER BY next_update_at ASC");
/**
 * Recordatorio interno de actualización vencida para el municipio. Se genera al abrir el panel (no hay cron
 * todavía); la clave incluye la fecha, así que cambiar la fecha invalida el recordatorio anterior y nunca se
 * repite. No modifica el estado del reclamo.
 */
export async function ensureOverdueReminders() {
    const muni = await all<{
        id: number;
    }>("SELECT id FROM users WHERE role = 'municipio' AND suspended = 0");
    for (const c of await overdueClaims())
        for (const u of muni)
            await notifyUser(u.id, { class: "reclamo", eventKey: `due:${c.id}:${c.next_update_at}`, title: `Actualización pendiente: ${c.number}`, body: `${c.category}. Venció la fecha de próxima actualización.`, href: `/reclamos/${c.id}`, reason: "Recordatorio interno" }, { transactional: true });
    void nowUtc;
}
