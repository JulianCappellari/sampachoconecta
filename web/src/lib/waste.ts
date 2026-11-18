import "server-only";
import { all, one, run, tx } from "./db";
import { todayKey } from "./format";
import { notifyUser } from "./notify";
export type Slot = {
    id: number;
    zone: string;
    weekday: number;
    kind: string;
    note: string | null;
};
export const allSlots = async () => await all<Slot>("SELECT id,zone,weekday,kind,note FROM waste_schedule ORDER BY zone, weekday, kind");
export const slotsForZone = async (zone: string) => await all<Slot>("SELECT id,zone,weekday,kind,note FROM waste_schedule WHERE zone = ? ORDER BY weekday, kind", zone);
/** Día de la semana en Argentina (0 = domingo) dentro de `offset` días. */
export const localWeekday = (offset = 0) => new Date(Date.now() - 3 * 3600000 + offset * 864e5).getUTCDay();
/** Cuántos días faltan para la próxima recolección de este turno (0 = hoy). */
export const daysUntil = (weekday: number) => (weekday - localWeekday(0) + 7) % 7;
export { kindLabel } from "./waste-labels";
import { kindLabel } from "./waste-labels";
export async function collectionsOn(zones: string[], offset: number): Promise<Slot[]> {
    if (zones.length === 0)
        return [];
    return await all<Slot>(`SELECT id,zone,weekday,kind,note FROM waste_schedule WHERE weekday = ? AND zone IN (${zones.map(() => "?").join(",")}) ORDER BY zone, kind`, localWeekday(offset), ...zones);
}
/**
 * Recordatorio «mañana pasa el camión» para quien sigue la recolección en esa zona. No hay tarea programada: se
 * genera, una vez por día, la primera vez que alguien abre la app. La clave de cada aviso evita duplicados.
 */
export async function ensureWasteReminders() {
  await tx(async () => {
    const today = todayKey();
    if ((await one<{
        value: string;
    }>("SELECT value FROM kv WHERE key = 'waste_reminder_day'"))?.value === today)
        return;
    for (const s of await collectionsOn((await all<{
        zone: string;
    }>("SELECT DISTINCT zone FROM waste_schedule")).map((z) => z.zone), 1)) {
        const people = await all<{
            id: number;
        }>(`SELECT u.id FROM users u WHERE u.suspended = 0
         AND EXISTS (SELECT 1 FROM follows f WHERE f.user_id = u.id AND f.target_type = 'tema' AND f.target_id = 'residuos')
         AND (u.barrio = ? OR EXISTS (SELECT 1 FROM follows f WHERE f.user_id = u.id AND f.target_type = 'zona' AND f.target_id = ?))`, s.zone, s.zone);
        for (const p of people)
            await notifyUser(p.id, { class: "novedades", eventKey: `waste:${today}:${s.zone}:${s.kind}`, title: `Mañana pasa la recolección: ${kindLabel(s.kind).toLowerCase()}`, body: `${s.zone}${s.note ? ` · ${s.note}` : ""}. Sacá los residuos a la hora indicada.`, href: "/residuos", reason: "Seguís la recolección de residuos" });
    }
    await run("INSERT INTO kv (key,value) VALUES ('waste_reminder_day',?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", today);
  });
}
