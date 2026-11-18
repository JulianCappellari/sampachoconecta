"use server";
import { mapSequential } from "../lib/async";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, tx } from "@/lib/db";
import { audit, requireRole } from "@/lib/auth";
import { BARRIOS } from "@/lib/constants";
import { nowUtc } from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { text, type FormState } from "@/lib/types";
/** Solo el municipio crea consultas. 2 a 6 opciones, entre 1 y 30 días. */
export async function createPoll(_: FormState, fd: FormData): Promise<FormState> {
    const user = await requireRole(["municipio"], "/encuestas/nueva");
    const question = text(fd, "question");
    const body = text(fd, "body") || null;
    const zone = text(fd, "zone") || null;
    const days = Number(text(fd, "days") || 7);
    const options = [...new Set(fd.getAll("option").map((o) => String(o).trim()).filter(Boolean))];
    if (question.length < 8 || question.length > 160)
        return { error: "La pregunta debe tener entre 8 y 160 letras." };
    if (body && body.length > 800)
        return { error: "La explicación es muy larga (máximo 800)." };
    if (options.length < 2 || options.length > 6)
        return { error: "Cargá entre 2 y 6 opciones distintas." };
    if (options.some((o) => o.length > 80))
        return { error: "Cada opción puede tener hasta 80 letras." };
    if (zone && !(BARRIOS as readonly string[]).includes(zone))
        return { error: "Elegí una zona de la lista." };
    if (!Number.isInteger(days) || days < 1 || days > 30)
        return { error: "El plazo va de 1 a 30 días." };
    const id = await tx(async () => {
        const r = await run("INSERT INTO polls (author_id,question,body,zone,closes_at) VALUES (?,?,?,?,?)", user.id, question, body, zone, nowUtc(days * 864e5));
        await mapSequential(options, async (o, i) => await run("INSERT INTO poll_options (poll_id,label,sort) VALUES (?,?,?)", r.id, o, i));
        for (const f of await all<{
            user_id: number;
        }>("SELECT f.user_id FROM follows f JOIN users u ON u.id = f.user_id WHERE f.target_type='tema' AND f.target_id='encuestas' AND u.suspended = 0"))
            await notifyUser(f.user_id, { class: "novedades", eventKey: `poll:${r.id}`, title: "Nueva consulta vecinal", body: question, href: `/encuestas/${r.id}`, reason: "Seguís las encuestas vecinales" });
        await audit(user.id, "poll.create", String(r.id));
        return r.id;
    });
    revalidatePath("/encuestas");
    redirect(`/encuestas/${id}`);
}
/** Un voto por persona y consulta; no se puede cambiar. La restricción única lo garantiza aun con envíos simultáneos. */
export async function vote(pollId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireRole(["vecino", "moderador", "municipio"], `/encuestas/${pollId}`);
    const p = await one<{
        zone: string | null;
        open: number;
    }>("SELECT zone, (status='abierta' AND closes_at > datetime('now') AND hidden = 0) AS open FROM polls WHERE id = ?", pollId);
    if (!p)
        return { error: "Esa consulta no existe." };
    if (!p.open)
        return { error: "Esta consulta ya cerró." };
    if (p.zone && user.barrio !== p.zone)
        return { error: `Esta consulta es para vecinos de ${p.zone}. Podés cambiar tu barrio en tu perfil.` };
    const optionId = Number(text(fd, "option"));
    if (!await one("SELECT 1 FROM poll_options WHERE id = ? AND poll_id = ?", optionId, pollId))
        return { error: "Elegí una opción." };
    try {
        const result = await run("INSERT INTO poll_votes (poll_id,user_id,option_id) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM polls WHERE id=? AND status='abierta' AND hidden=0 AND closes_at > datetime('now')) ON CONFLICT(poll_id,user_id) DO NOTHING", pollId, user.id, optionId, pollId);
        if (!result.changes) return { error: "La consulta cerró o ya registramos tu voto." };
    }
    catch {
        return { error: "Ya votaste en esta consulta." };
    }
    revalidatePath(`/encuestas/${pollId}`);
    revalidatePath("/encuestas");
    return { ok: "Registramos tu voto. Los resultados se publican cuando cierra la consulta." };
}
export async function closePoll(pollId: number) {
    const user = await requireRole(["municipio"]);
    await run("UPDATE polls SET status = 'cerrada' WHERE id = ?", pollId);
    await audit(user.id, "poll.close", String(pollId));
    revalidatePath(`/encuestas/${pollId}`);
    revalidatePath("/encuestas");
}
