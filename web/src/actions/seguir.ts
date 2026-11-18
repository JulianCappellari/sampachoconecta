"use server";
import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { getUser, requireUser } from "@/lib/auth";
import { BARRIOS, POST_CATEGORIES, REQUEST_CATEGORIES } from "@/lib/constants";
import { text, type FormState } from "@/lib/types";
const TEMAS = new Set<string>([...POST_CATEGORIES.map((c) => c.id), "pedidos", "residuos", "trabajo", "encuestas", ...REQUEST_CATEGORIES.map((c) => `rubro:${c}`)]);
async function validTarget(type: string, id: string): Promise<boolean> {
    if (type === "tema")
        return TEMAS.has(id);
    if (type === "zona")
        return (BARRIOS as readonly string[]).includes(id);
    if (type === "ficha")
        return !!await one("SELECT 1 FROM listings WHERE id = ? AND deleted = 0", Number(id));
    return false;
}
/**
 * Guarda el estado deseado (seguir o no), no alterna: repetir la misma orden no cambia nada.
 * Seguir es una preferencia informativa; no revela quién sigue a quién.
 */
export async function setFollow(type: string, id: string, want: boolean): Promise<{
    following: boolean;
} | {
    error: string;
}> {
    const user = await getUser();
    if (!user)
        return { error: "Ingresá para seguir." };
    if (!await validTarget(type, id))
        return { error: "Eso no se puede seguir." };
    if (want)
        await run("INSERT OR IGNORE INTO follows (user_id,target_type,target_id) VALUES (?,?,?)", user.id, type, id);
    else
        await run("DELETE FROM follows WHERE user_id = ? AND target_type = ? AND target_id = ?", user.id, type, id);
    revalidatePath("/siguiendo");
    return { following: want };
}
const FREQ = ["inmediata", "diaria", "semanal", "desactivada"];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export async function savePrefs(_: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser("/siguiendo");
    const rows = (["avisos", "novedades", "pedidos"] as const).map((c) => [c, text(fd, `freq_${c}`)] as const);
    if (rows.some(([, f]) => !FREQ.includes(f)))
        return { error: "Elegí una frecuencia para cada tipo de aviso." };
    const qs = text(fd, "quiet_start");
    const qe = text(fd, "quiet_end");
    if (!HHMM.test(qs) || !HHMM.test(qe))
        return { error: "Revisá el horario de descanso." };
    await tx(async () => {
        for (const [c, f] of rows)
            await run("INSERT INTO notification_prefs (user_id,class,frequency) VALUES (?,?,?) ON CONFLICT(user_id,class) DO UPDATE SET frequency = excluded.frequency", user.id, c, f);
        await run("INSERT INTO user_settings (user_id,quiet_start,quiet_end,urgent_override) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET quiet_start=excluded.quiet_start, quiet_end=excluded.quiet_end, urgent_override=excluded.urgent_override", user.id, qs, qe, fd.get("urgent_override") === "on" ? 1 : 0);
    });
    revalidatePath("/siguiendo");
    return { ok: "Guardamos tus preferencias." };
}
/** Solo el dueño puede marcar como leída su notificación; el WHERE lo garantiza en la propia consulta. */
export async function markRead(id: number) {
    const user = await requireUser();
    await run("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ? AND read_at IS NULL", id, user.id);
    revalidatePath("/notificaciones", "layout");
}
export async function markAllRead() {
    const user = await requireUser();
    await run("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL AND deliver_after <= datetime('now')", user.id);
    revalidatePath("/notificaciones", "layout");
}
