"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { all, one, run, tx } from "@/lib/db";
import { audit, canModerate, requireUser } from "@/lib/auth";
import { BARRIOS, REQUEST_CATEGORIES } from "@/lib/constants";
import { nowUtc } from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { activeRequestsOf } from "@/lib/pedidos";
import { saveImages, UploadError } from "@/lib/uploads";
import { text, type FormState } from "@/lib/types";
const MAX_ACTIVE = 5;
const MAX_RESPONSES_DAY = 10;
const schema = z.object({
    kind: z.enum(["producto", "servicio"], { message: "Elegí si buscás un producto o un servicio." }),
    title: z.string().min(5, "El título necesita al menos 5 letras.").max(100, "El título es muy largo (máximo 100)."),
    body: z.string().min(10, "Contá un poco más: al menos 10 letras.").max(800, "El texto es muy largo (máximo 800)."),
    category: z.string().refine((c) => REQUEST_CATEGORIES.includes(c), "Elegí un rubro de la lista."),
    days: z.coerce.number().int().min(1, "El plazo mínimo es 1 día.").max(30, "El plazo máximo es 30 días."),
});
export async function createRequest(_: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser("/necesito/nuevo");
    const parsed = schema.safeParse({ kind: text(fd, "kind"), title: text(fd, "title"), body: text(fd, "body"), category: text(fd, "category"), days: text(fd, "days") || 7 });
    if (!parsed.success)
        return { error: parsed.error.issues[0].message };
    const zone = text(fd, "zone") || null;
    if (zone && !(BARRIOS as readonly string[]).includes(zone))
        return { error: "Elegí una zona de la lista." };
    if (await activeRequestsOf(user.id) >= MAX_ACTIVE)
        return { error: `Ya tenés ${MAX_ACTIVE} pedidos abiertos. Cerrá alguno para publicar otro.` };
    let photos: string[] = [];
    try {
        photos = await saveImages(fd.getAll("photos"), "p", 3);
    }
    catch (e) {
        if (e instanceof UploadError)
            return { error: e.message };
        throw e;
    }
    const d = parsed.data;
    const id = await tx(async () => {
        const r = await run("INSERT INTO community_requests (author_id,kind,title,body,category,zone,photos,expires_at) VALUES (?,?,?,?,?,?,?,?)", user.id, d.kind, d.title, d.body, d.category, zone, JSON.stringify(photos), nowUtc(d.days * 864e5));
        // Avisar a quienes siguen los pedidos o ese rubro (sin duplicar si coinciden por ambas vías).
        for (const f of await all<{
            user_id: number;
            target_id: string;
        }>("SELECT f.user_id, f.target_id FROM follows f JOIN users u ON u.id = f.user_id WHERE f.target_type='tema' AND f.target_id IN ('pedidos', ?) AND u.suspended = 0 AND f.user_id != ?", `rubro:${d.category}`, user.id)) {
            await notifyUser(f.user_id, { class: "pedidos", eventKey: `req:${r.id}`, title: `Alguien busca: ${d.title}`, body: d.body.slice(0, 140), href: `/necesito/${r.id}`, reason: f.target_id === "pedidos" ? "Seguís los pedidos" : `Seguís el rubro ${d.category}` });
        }
        return r.id;
    });
    revalidatePath("/necesito");
    redirect(`/necesito/${id}`);
}
/** Responder con una ficha propia. Una respuesta por ficha y pedido; volver a enviar la edita. */
export async function respondRequest(requestId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser(`/necesito/${requestId}`);
    const req = await one<{
        author_id: number;
        status: string;
        expired: number;
        hidden: number;
        title: string;
    }>("SELECT author_id,status,(expires_at <= datetime('now')) AS expired,hidden,title FROM community_requests WHERE id = ?", requestId);
    if (!req || req.hidden)
        return { error: "Ese pedido ya no existe." };
    if (req.status !== "abierto" || req.expired)
        return { error: "Este pedido ya no acepta respuestas." };
    if (req.author_id === user.id)
        return { error: "No podés responder a tu propio pedido." };
    const listingId = Number(text(fd, "listing_id"));
    // La ficha tiene que ser propia, activa y existente: nunca se confía en el valor del formulario.
    const l = await one<{
        id: number;
    }>("SELECT id FROM listings WHERE id = ? AND owner_id = ? AND deleted = 0", listingId, user.id);
    if (!l)
        return { error: "Elegí una de tus fichas activas para responder." };
    const body = text(fd, "body");
    if (body.length < 5 || body.length > 500)
        return { error: "Escribí tu propuesta o disponibilidad (entre 5 y 500 letras)." };
    const today = (await one<{
        n: number;
    }>("SELECT COUNT(*) n FROM request_responses WHERE user_id = ? AND created_at > datetime('now','-1 day')", user.id))?.n ?? 0;
    const existing = await one<{
        id: number;
    }>("SELECT id FROM request_responses WHERE request_id = ? AND listing_id = ?", requestId, listingId);
    if (!existing && today >= MAX_RESPONSES_DAY)
        return { error: `Llegaste al máximo de ${MAX_RESPONSES_DAY} respuestas por día.` };
    const responseError = await tx(async () => {
        const current = await one<{status:string;hidden:number;expires_at:string}>("SELECT status,hidden,expires_at FROM community_requests WHERE id=? FOR UPDATE", requestId);
        if (!current || current.status !== "abierto" || current.hidden || current.expires_at <= nowUtc()) return "El pedido ya no recibe respuestas.";
        // UNIQUE(request_id, listing_id): dos envíos simultáneos no crean dos respuestas.
        await run(`INSERT INTO request_responses (request_id,listing_id,user_id,body) VALUES (?,?,?,?)
       ON CONFLICT(request_id,listing_id) DO UPDATE SET body = excluded.body, status = 'activa', version = request_responses.version + 1, updated_at = datetime('now')`, requestId, listingId, user.id, body);
        await notifyUser(req.author_id, { class: "pedidos", eventKey: `req:${requestId}:resp:${listingId}`, title: "Respondieron a tu pedido", body: req.title, href: `/necesito/${requestId}`, reason: "Es un pedido tuyo" }, { transactional: true });
        return null;
    });
    if (responseError) return {error:responseError};
    revalidatePath(`/necesito/${requestId}`);
    return { ok: existing ? "Actualizamos tu respuesta." : "Enviamos tu respuesta. Se muestra con el contacto de tu ficha." };
}
export async function withdrawResponse(responseId: number) {
    const user = await requireUser();
    const r = await one<{
        request_id: number;
    }>("SELECT request_id FROM request_responses WHERE id = ? AND user_id = ?", responseId, user.id);
    if (!r)
        return;
    await run("UPDATE request_responses SET status='retirada', version = version + 1, updated_at = datetime('now') WHERE id = ?", responseId);
    revalidatePath(`/necesito/${r.request_id}`);
}
/**
 * Resolver o cancelar. La condición `status='abierto' AND version=?` hace que un doble cierre
 * (o un cierre que compite con otro cambio) confirme una sola vez y el resto reciba un conflicto.
 */
export async function closeRequest(requestId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser(`/necesito/${requestId}`);
    const action = text(fd, "action");
    if (!["resolver", "cancelar"].includes(action))
        return { error: "Elegí cómo cerrar el pedido." };
    const version = Number(text(fd, "version"));
    const chosen = Number(text(fd, "chosen")) || null;
    const publish = fd.get("publish") === "on";
    const note = text(fd, "outcome");
    if (publish && action === "resolver" && note.length < 5)
        return { error: "Escribí unas líneas para el agradecimiento, o elegí “Solo cerrar”." };
    if (note.length > 600)
        return { error: "El texto es muy largo (máximo 600)." };
    const req = await one<{
        author_id: number;
        status: string;
        title: string;
    }>("SELECT author_id,status,title FROM community_requests WHERE id = ?", requestId);
    if (!req || req.author_id !== user.id)
        return { error: "Solo quien hizo el pedido puede cerrarlo." };
    if (chosen && !await one("SELECT 1 FROM request_responses WHERE id = ? AND request_id = ? AND status = 'activa'", chosen, requestId))
        return { error: "Esa respuesta no pertenece a este pedido." };
    let photos: string[] = [];
    if (publish && action === "resolver") {
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
        const r = await run("UPDATE community_requests SET status = ?, chosen_response_id = ?, closed_at = datetime('now'), version = version + 1 WHERE id = ? AND status = 'abierto' AND version = ?", action === "resolver" ? "resuelto" : "cancelado", action === "resolver" ? chosen : null, requestId, version);
        if (r.changes === 0)
            return false;
        if (publish && action === "resolver")
            await run("INSERT OR IGNORE INTO community_outcomes (source_type,source_id,author_id,body,photos) VALUES ('pedido',?,?,?,?)", requestId, user.id, note, JSON.stringify(photos));
        await audit(user.id, `request.${action}`, String(requestId));
        return true;
    });
    if (!done)
        return { error: "Este pedido cambió o ya estaba cerrado. Recargá la página para ver su estado." };
    revalidatePath(`/necesito/${requestId}`);
    revalidatePath("/necesito");
    revalidatePath("/resultados");
    revalidatePath("/");
    return { ok: action === "resolver" ? (publish ? "Pedido resuelto. Publicamos tu agradecimiento." : "Pedido marcado como resuelto.") : "Pedido cancelado." };
}
/** Renovar un pedido vencido (vuelve a estar abierto por 7 días). */
export async function renewRequest(requestId: number) {
    const user = await requireUser();
    await run("UPDATE community_requests SET expires_at = ?, version = version + 1 WHERE id = ? AND author_id = ? AND status = 'abierto' AND expires_at <= datetime('now')", nowUtc(7 * 864e5), requestId, user.id);
    revalidatePath(`/necesito/${requestId}`);
    revalidatePath("/necesito");
}
export async function hideRequest(requestId: number) {
    const user = await requireUser();
    const r = await one<{
        author_id: number;
    }>("SELECT author_id FROM community_requests WHERE id = ?", requestId);
    if (!r || (r.author_id !== user.id && !canModerate(user)))
        return;
    await run("UPDATE community_requests SET hidden = 1 WHERE id = ?", requestId);
    if (r.author_id !== user.id)
        await audit(user.id, "request.hide", String(requestId));
    revalidatePath("/necesito");
    redirect("/necesito");
}
