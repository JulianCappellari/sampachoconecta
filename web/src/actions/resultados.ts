"use server";
import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { audit, canModerate, requireUser } from "@/lib/auth";
import { saveImages, UploadError } from "@/lib/uploads";
import { text, type FormState } from "@/lib/types";
/**
 * Cerrar una publicación propia: objeto/mascota encontrada o venta concretada. «Solo cerrar» cambia
 * el estado sin publicar nada; «Publicar resultado» crea además un agradecimiento ligado al origen.
 * Un segundo cierre no crea otro: la condición status='active' y UNIQUE(source) lo impiden.
 */
export async function closePost(postId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser(`/muro/${postId}`);
    const p = await one<{
        author_id: number;
        category: string;
        status: string;
    }>("SELECT author_id,category,status FROM posts WHERE id = ? AND deleted = 0", postId);
    if (!p || p.author_id !== user.id)
        return { error: "Solo quien publicó puede cerrarla." };
    if (!["perdido", "venta"].includes(p.category))
        return { error: "Este tipo de publicación no se cierra con un resultado." };
    const publish = fd.get("publish") === "on";
    const note = text(fd, "outcome");
    if (publish && note.length < 5)
        return { error: "Escribí unas líneas para el agradecimiento, o dejá “Solo cerrar”." };
    if (note.length > 600)
        return { error: "El texto es muy largo (máximo 600)." };
    let photos: string[] = [];
    if (publish) {
        try {
            photos = await saveImages(fd.getAll("photos"), "p", 3);
        }
        catch (e) {
            if (e instanceof UploadError)
                return { error: e.message };
            throw e;
        }
    }
    const done = await tx(async () => {
        const r = await run("UPDATE posts SET status = ? WHERE id = ? AND status = 'active'", p.category === "venta" ? "sold" : "resolved", postId);
        if (r.changes === 0)
            return false;
        if (publish)
            await run("INSERT OR IGNORE INTO community_outcomes (source_type,source_id,author_id,body,photos) VALUES ('publicacion',?,?,?,?)", postId, user.id, note, JSON.stringify(photos));
        return true;
    });
    if (!done)
        return { error: "Esta publicación ya estaba cerrada." };
    revalidatePath(`/muro/${postId}`);
    revalidatePath("/muro");
    revalidatePath("/resultados");
    revalidatePath("/");
    return { ok: publish ? "Listo. Cerramos la publicación y publicamos tu agradecimiento." : "Listo. Cerramos la publicación." };
}
/** El autor corrige su propio texto. Un moderador solo puede ocultar, nunca reescribir ni atribuir texto. */
export async function editOutcome(outcomeId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser();
    const o = await one<{
        author_id: number;
        source_type: string;
        source_id: number;
    }>("SELECT author_id,source_type,source_id FROM community_outcomes WHERE id = ?", outcomeId);
    if (!o || o.author_id !== user.id)
        return { error: "Solo quien lo escribió puede corregirlo." };
    const body = text(fd, "outcome");
    if (body.length < 5 || body.length > 600)
        return { error: "El texto debe tener entre 5 y 600 letras." };
    await run("UPDATE community_outcomes SET body = ?, version = version + 1 WHERE id = ?", body, outcomeId);
    revalidatePath("/resultados");
    return { ok: "Corregimos el texto." };
}
export async function setOutcomeVisibility(outcomeId: number, visible: boolean) {
    const user = await requireUser();
    const o = await one<{
        author_id: number;
    }>("SELECT author_id FROM community_outcomes WHERE id = ?", outcomeId);
    if (!o || (o.author_id !== user.id && !canModerate(user)))
        return;
    await run("UPDATE community_outcomes SET status = ?, version = version + 1 WHERE id = ?", visible ? "publicado" : "oculto", outcomeId);
    if (o.author_id !== user.id)
        await audit(user.id, visible ? "outcome.show" : "outcome.hide", String(outcomeId));
    revalidatePath("/resultados");
    revalidatePath("/");
}
