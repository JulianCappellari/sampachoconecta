import "server-only";
import { all, one, run, tx } from "./db";
import { getListing, type Listing } from "./data";
/** Lunes de la semana (hora de Argentina) como 'YYYY-MM-DD', desplazado `offset` semanas. */
export function weekStart(offset = 0): string {
    const d = new Date(Date.now() - 3 * 3600000);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offset * 7);
    return d.toISOString().slice(0, 10);
}
/** Para postularse, la ficha tiene que estar completa. Devuelve lo que falta. */
export function missingForFeatured(l: Listing): string[] {
    const m: string[] = [];
    if (l.description.trim().length < 30)
        m.push("una descripción de al menos 30 letras");
    if (!l.open_time || !l.close_time || !l.open_days)
        m.push("el horario de atención");
    if (!l.phone)
        m.push("un teléfono");
    return m;
}
export type Application = {
    id: number;
    listing_id: number;
    week_start: string;
    pitch: string;
    status: "postulado" | "elegido";
    created_at: string;
    listing_name: string;
    last_featured: string | null;
};
const APP_SEL = `SELECT f.id,f.listing_id,f.week_start,f.pitch,f.status,f.created_at,l.name AS listing_name,
  (SELECT MAX(x.week_start) FROM featured_listings x WHERE x.listing_id = f.listing_id AND x.status = 'elegido' AND x.week_start < f.week_start) AS last_featured
  FROM featured_listings f JOIN listings l ON l.id = f.listing_id WHERE l.deleted = 0`;
export const applicationsFor = async (week: string) => await all<Application>(`SELECT * FROM (${APP_SEL} AND f.week_start = ?) applications ORDER BY (last_featured IS NOT NULL), last_featured, created_at`, week);
export const recentlyFeatured = async (listingId: number) => !!await one("SELECT 1 FROM featured_listings WHERE listing_id = ? AND status = 'elegido' AND week_start >= ?", listingId, weekStart(-3));
export const myApplication = async (listingId: number) => await one<{
    week_start: string;
    status: string;
}>("SELECT week_start,status FROM featured_listings WHERE listing_id = ? AND week_start >= ? ORDER BY week_start LIMIT 1", listingId, weekStart());
/**
 * Destacado de la semana. Si todavía no hay uno elegido, se elige entre quienes se postularon al que hace más tiempo
 * no fue destacado (los nunca destacados primero), para que la vitrina rote y sea pareja. El municipio puede cambiarlo.
 * La elección se hace al leer, sin tarea programada.
 */
export async function currentFeatured(): Promise<{
    listing: Listing;
    pitch: string;
    week: string;
} | null> {
    const week = weekStart();
    const pick = async () => await one<{
        id: number;
        listing_id: number;
        pitch: string;
    }>("SELECT id,listing_id,pitch FROM featured_listings WHERE week_start = ? AND status = 'elegido' LIMIT 1", week);
    let row = await pick();
    if (!row) {
        const cand = (await applicationsFor(week))[0];
        if (cand) {
            await tx(async () => {
                if (!await pick())
                    await run("UPDATE featured_listings SET status = 'elegido' WHERE id = ?", cand.id);
            });
            row = await pick();
        }
    }
    const listing = row ? await getListing(row.listing_id) : undefined;
    return row && listing ? { listing, pitch: row.pitch, week } : null;
}
