"use server";
import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { audit, requireRole, requireUser } from "@/lib/auth";
import { BARRIOS, PLACE_KINDS, WASTE_KINDS } from "@/lib/constants";
import { missingForFeatured, recentlyFeatured, weekStart } from "@/lib/featured";
import { getListing } from "@/lib/data";
import { text, type FormState } from "@/lib/types";
/* ───────────── Residuos ───────────── */
export async function addSlot(_: FormState, fd: FormData): Promise<FormState> {
    const user = await requireRole(["municipio"], "/panel/residuos");
    const zone = text(fd, "zone");
    const weekday = Number(text(fd, "weekday"));
    const kind = text(fd, "kind");
    if (!(BARRIOS as readonly string[]).includes(zone))
        return { error: "Elegí una zona." };
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)
        return { error: "Elegí el día." };
    if (!WASTE_KINDS.some((k) => k.id === kind))
        return { error: "Elegí el tipo de recolección." };
    const note = text(fd, "note").slice(0, 120) || null;
    await run("INSERT INTO waste_schedule (zone,weekday,kind,note) VALUES (?,?,?,?) ON CONFLICT(zone,weekday,kind) DO UPDATE SET note = excluded.note", zone, weekday, kind, note);
    await audit(user.id, "waste.add", `${zone}:${weekday}:${kind}`);
    revalidatePath("/residuos");
    revalidatePath("/");
    return { ok: "Guardamos el turno de recolección." };
}
export async function removeSlot(id: number) {
    const user = await requireRole(["municipio"]);
    await run("DELETE FROM waste_schedule WHERE id = ?", id);
    await audit(user.id, "waste.remove", String(id));
    revalidatePath("/residuos");
    revalidatePath("/panel/residuos");
}
/* ───────────── Turismo ───────────── */
export async function addPlace(_: FormState, fd: FormData): Promise<FormState> {
    const user = await requireRole(["municipio"], "/panel/turismo");
    const kind = text(fd, "kind");
    const name = text(fd, "name");
    const description = text(fd, "description");
    if (!PLACE_KINDS.some((k) => k.id === kind))
        return { error: "Elegí el tipo." };
    if (name.length < 3 || name.length > 100)
        return { error: "El nombre debe tener entre 3 y 100 letras." };
    if (description.length < 10 || description.length > 600)
        return { error: "La descripción debe tener entre 10 y 600 letras." };
    const lat = parseFloat(text(fd, "lat"));
    const lng = parseFloat(text(fd, "lng"));
    const point = Number.isFinite(lat) && Number.isFinite(lng);
    await run("INSERT INTO tourist_places (kind,name,description,address,lat,lng,sort) VALUES (?,?,?,?,?,?,(SELECT COALESCE(MAX(sort),0)+1 FROM tourist_places))", kind, name, description, text(fd, "address") || null, point ? lat : null, point ? lng : null);
    await audit(user.id, "place.add", name);
    revalidatePath("/visitar");
    revalidatePath("/panel/turismo");
    return { ok: "Agregamos el lugar a la guía del visitante." };
}
export async function removePlace(id: number) {
    const user = await requireRole(["municipio"]);
    await run("DELETE FROM tourist_places WHERE id = ?", id);
    await audit(user.id, "place.remove", String(id));
    revalidatePath("/visitar");
    revalidatePath("/panel/turismo");
}
/* ───────────── Destacado de la semana ───────────── */
/** El dueño de una ficha se postula para esta semana (si aún no hay destacado) o para la próxima. */
export async function applyFeatured(listingId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser(`/guia/${listingId}`);
    const l = await getListing(listingId);
    if (!l || l.owner_id !== user.id)
        return { error: "Solo el dueño de la ficha puede postularla." };
    const missing = missingForFeatured(l);
    if (missing.length)
        return { error: `Completá antes tu ficha: falta ${missing.join(", ")}.` };
    if (await recentlyFeatured(listingId))
        return { error: "Tu ficha fue destacada en las últimas 4 semanas. Dejemos que roten otros comercios y volvé a postularte." };
    const which = text(fd, "week") === "actual" ? 0 : 1;
    const week = weekStart(which);
    if (which === 0 && await one("SELECT 1 FROM featured_listings WHERE week_start = ? AND status = 'elegido'", week))
        return { error: "Esta semana ya tiene un comercio destacado. Postulate para la próxima." };
    const pitch = text(fd, "pitch");
    if (pitch.length < 10 || pitch.length > 200)
        return { error: "Contá en 10 a 200 letras por qué tu comercio merece destacarse." };
    try {
        await run("INSERT INTO featured_listings (listing_id,week_start,pitch) VALUES (?,?,?)", listingId, week, pitch);
    }
    catch {
        return { error: "Ya te postulaste para esa semana." };
    }
    revalidatePath(`/guia/${listingId}`);
    revalidatePath("/panel/destacados");
    return { ok: which === 0 ? "Te postulaste para esta semana." : "Te postulaste para la semana próxima. Se elige entre quienes hace más tiempo no fueron destacados." };
}
/** El municipio puede elegir manualmente al destacado de una semana. */
export async function chooseFeatured(applicationId: number) {
    const user = await requireRole(["municipio"]);
    const a = await one<{
        week_start: string;
    }>("SELECT week_start FROM featured_listings WHERE id = ?", applicationId);
    if (!a)
        return;
    await tx(async () => {
        await run("UPDATE featured_listings SET status = 'postulado' WHERE week_start = ?", a.week_start);
        await run("UPDATE featured_listings SET status = 'elegido' WHERE id = ?", applicationId);
        await audit(user.id, "featured.choose", String(applicationId));
    });
    revalidatePath("/");
    revalidatePath("/panel/destacados");
}
