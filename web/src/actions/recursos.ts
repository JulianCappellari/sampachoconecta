"use server";
import { revalidatePath } from "next/cache";
import { all, one, run, tx } from "@/lib/db";
import { audit, requireRole, requireUser } from "@/lib/auth";
import { NEED_KINDS } from "@/lib/constants";
import { notifyUser } from "@/lib/notify";
import { saveImages, UploadError } from "@/lib/uploads";
import { text, type FormState } from "@/lib/types";
type IdeaRow = {
    id: number;
    author_id: number;
    status: string;
    title: string;
    version: number;
};
const idea = async (id: number) => await one<IdeaRow>("SELECT id,author_id,status,title,version FROM ideas WHERE id = ? AND hidden = 0", id);
const isOpen = (i: IdeaRow) => i.status !== "realizada" && i.status !== "cancelada";
const int = (v: string) => (/^\d{1,5}$/.test(v) ? Number(v) : NaN);
const refresh = (ideaId: number) => {
    revalidatePath(`/ideas/${ideaId}`);
    revalidatePath("/ideas");
};
/** El organizador define qué hace falta: personas, materiales, herramientas, espacio o un permiso. */
export async function addNeed(ideaId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser();
    const i = await idea(ideaId);
    if (!i || i.author_id !== user.id)
        return { error: "Solo quien propuso la idea define qué hace falta." };
    if (!isOpen(i))
        return { error: "Esta idea ya está cerrada." };
    const kind = NEED_KINDS.find((k) => k.id === text(fd, "kind"));
    if (!kind)
        return { error: "Elegí el tipo de necesidad." };
    const description = text(fd, "description");
    const target = int(text(fd, "target"));
    if (description.length < 3 || description.length > 200)
        return { error: "Describí la necesidad en 3 a 200 letras." };
    if (!Number.isInteger(target) || target < 1)
        return { error: "La cantidad tiene que ser un número entero mayor que cero." };
    const deadline = text(fd, "deadline") || null;
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline))
        return { error: "Revisá el plazo." };
    const added = await run("INSERT INTO idea_needs (idea_id,kind,description,target,unit,deadline) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM ideas WHERE id=? AND status NOT IN ('realizada','cancelada'))", ideaId, kind.id, description, target, text(fd, "unit") || kind.unit, deadline, ideaId);
    if (!added.changes) return {error:"La idea ya está cerrada."};
    refresh(ideaId);
    return { ok: "Agregamos la necesidad." };
}
/** Cambiar el objetivo: no puede quedar por debajo de lo ya reservado o cumplido. Ampliarlo exige un motivo. */
export async function setNeedTarget(needId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser();
    const n = await one<{
        idea_id: number;
        target: number;
        version: number;
    }>("SELECT idea_id,target,version FROM idea_needs WHERE id = ?", needId);
    const i = n && await idea(n.idea_id);
    if (!n || !i || i.author_id !== user.id)
        return { error: "Solo el organizador puede cambiar el objetivo." };
    const target = int(text(fd, "target"));
    const reason = text(fd, "reason");
    if (!Number.isInteger(target) || target < 1)
        return { error: "La cantidad tiene que ser un número entero mayor que cero." };
    const ok = await tx(async () => {
        const reserved = (await one<{
            s: number;
        }>("SELECT COALESCE(SUM(accepted),0) s FROM idea_commitments WHERE need_id = ? AND status IN ('aceptada','cumplida')", needId))?.s ?? 0;
        if (target < reserved)
            return `Ya hay ${reserved} reservados o cumplidos. Resolvé esos compromisos antes de bajar el objetivo.`;
        if (target > n.target && reason.length < 5)
            return "Para ampliar el objetivo escribí el motivo.";
        const r = await run("UPDATE idea_needs SET target = ?, version = version + 1 WHERE id = ? AND version = ?", target, needId, n.version);
        if (r.changes === 0)
            return "Otra persona cambió esta necesidad. Recargá la página.";
        if (target > n.target)
            await run("INSERT INTO idea_updates (idea_id,author_id,kind,body) VALUES (?,?,'novedad',?)", n.idea_id, user.id, `Se amplió un objetivo de ${n.target} a ${target}. Motivo: ${reason}`);
        return null;
    });
    if (ok)
        return { error: ok };
    refresh(n.idea_id);
    return { ok: "Guardamos el nuevo objetivo." };
}
/** Un vecino propone su aporte. Una propuesta pendiente no reserva cupo. Un compromiso por persona y necesidad. */
export async function proposeCommitment(needId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser();
    const n = await one<{
        idea_id: number;
        target: number;
        status: string;
        description: string;
    }>("SELECT idea_id,target,status,description FROM idea_needs WHERE id = ?", needId);
    const i = n && await idea(n.idea_id);
    if (!n || !i)
        return { error: "Esa necesidad ya no existe." };
    if (!isOpen(i) || n.status !== "abierta")
        return { error: "Esta necesidad ya no recibe propuestas." };
    const qty = int(text(fd, "qty"));
    if (!Number.isInteger(qty) || qty < 1 || qty > n.target)
        return { error: `Escribí una cantidad entera entre 1 y ${n.target}.` };
    const note = text(fd, "note").slice(0, 200) || null;
    const publicName = fd.get("public_name") === "on" ? 1 : 0;
    const msg = await tx(async () => {
        const current = await one<{target:number;status:string;idea_status:string}>("SELECT n.target,n.status,i.status AS idea_status FROM idea_needs n JOIN ideas i ON i.id=n.idea_id WHERE n.id=? FOR UPDATE OF n,i",needId);
        if (!current || current.status !== 'abierta' || ['realizada','cancelada'].includes(current.idea_status)) return "Esta necesidad ya no recibe propuestas.";
        if (qty > current.target) return "El objetivo cambió. Recargá la página y revisá la cantidad.";
        const ex = await one<{
            id: number;
            status: string;
            accepted: number;
            fulfilled: number;
        }>("SELECT id,status,accepted,fulfilled FROM idea_commitments WHERE need_id = ? AND user_id = ? FOR UPDATE", needId, user.id);
        if (!ex) {
            await run("INSERT INTO idea_commitments (need_id,user_id,proposed,note,public_name) VALUES (?,?,?,?,?)", needId, user.id, qty, note, publicName);
        }
        else if (ex.status === "cumplida") {
            return "Tu aporte ya figura como cumplido. Si hace falta corregirlo, escribile al organizador.";
        }
        else if (ex.status === "aceptada") {
            // Una propuesta aceptada solo puede bajar; para aumentar hay que volver a proponer, así se vuelve a validar el cupo.
            if (qty > ex.accepted)
                return "Tu aporte ya fue aceptado. Para ofrecer más, retiralo y proponelo de nuevo.";
            if (qty < ex.fulfilled) return "La cantidad no puede quedar por debajo de lo ya recibido.";
            await run("UPDATE idea_commitments SET proposed = ?, accepted = ?, note = ?, public_name = ?, updated_at = datetime('now') WHERE id = ?", qty, qty, note, publicName, ex.id);
        }
        else {
            await run("UPDATE idea_commitments SET proposed = ?, accepted = 0, status = 'pendiente', note = ?, reason = NULL, public_name = ?, updated_at = datetime('now') WHERE id = ?", qty, note, publicName, ex.id);
        }
        if (!ex || ex.status !== "aceptada")
            await notifyUser(i.author_id, { class: "idea", eventKey: `commit:${needId}:${user.id}:${qty}`, title: "Alguien ofreció ayuda para tu idea", body: `${i.title}: ${n.description}`, href: `/ideas/${i.id}`, reason: "Es una idea tuya" }, { transactional: true });
        return null;
    });
    if (msg)
        return { error: msg };
    refresh(n.idea_id);
    return { ok: "Enviamos tu propuesta. El organizador la revisa y te avisa. Todavía no reserva cupo." };
}
export async function withdrawCommitment(commitmentId: number) {
    const user = await requireUser();
    const c = await one<{
        need_id: number;
        status: string;
    }>("SELECT need_id,status FROM idea_commitments WHERE id = ? AND user_id = ?", commitmentId, user.id);
    if (!c || c.status === "cumplida")
        return;
    const n = await one<{
        idea_id: number;
    }>("SELECT idea_id FROM idea_needs WHERE id = ?", c.need_id);
    await tx(async () => {
        const updated = await run("UPDATE idea_commitments SET status = 'retirada', accepted = 0, updated_at = datetime('now') WHERE id = ? AND user_id = ? AND status <> 'cumplida' AND fulfilled = 0", commitmentId, user.id);
        if (!updated.changes) return;
        const i = n && await idea(n.idea_id);
        if (i)
            await notifyUser(i.author_id, { class: "idea", eventKey: `withdraw:${commitmentId}:${Date.now()}`, title: "Alguien retiró su ayuda", body: i.title, href: `/ideas/${i.id}`, reason: "Es una idea tuya" }, { transactional: true });
    });
    if (n)
        refresh(n.idea_id);
}
/**
 * Aceptar reserva cupo dentro de la transacción: no puede superar lo que queda del objetivo.
 * Con dos aceptaciones simultáneas para un solo cupo, solo confirma la que cabe.
 */
export async function decideCommitment(commitmentId: number, decision: "accept" | "reject", _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser();
    const c = await one<{
        need_id: number;
        user_id: number;
        proposed: number;
        status: string;
    }>("SELECT need_id,user_id,proposed,status FROM idea_commitments WHERE id = ?", commitmentId);
    const n = c && await one<{
        idea_id: number;
        target: number;
    }>("SELECT idea_id,target FROM idea_needs WHERE id = ?", c.need_id);
    const i = n && await idea(n.idea_id);
    if (!c || !n || !i || i.author_id !== user.id)
        return { error: "Solo el organizador decide sobre las propuestas." };
    if (c.status !== "pendiente")
        return { error: "Esta propuesta ya fue resuelta." };
    const reason = text(fd, "reason");
    if (decision === "reject" && reason.length < 3)
        return { error: "Escribí el motivo del rechazo." };
    const qty = decision === "accept" ? int(text(fd, "qty") || String(c.proposed)) : 0;
    if (decision === "accept" && (!Number.isInteger(qty) || qty < 1 || qty > c.proposed))
        return { error: `La cantidad aceptada va de 1 a ${c.proposed}.` };
    const msg = await tx(async () => {
        if (decision === "accept") {
            const currentNeed = await one<{target:number;status:string}>("SELECT target,status FROM idea_needs WHERE id=? FOR UPDATE", c.need_id);
            if (!currentNeed || currentNeed.status !== "abierta") return "La necesidad ya no acepta aportes.";
            const reserved = (await one<{
                s: number;
            }>("SELECT COALESCE(SUM(accepted),0) s FROM idea_commitments WHERE need_id = ? AND status IN ('aceptada','cumplida')", c.need_id))?.s ?? 0;
            if (reserved + qty > currentNeed.target)
                return `No hay cupo: quedan ${Math.max(0, currentNeed.target - reserved)}. Ampliá el objetivo con un motivo o aceptá menos.`;
            const r = await run("UPDATE idea_commitments SET status='aceptada', accepted = ?, reason = NULL, updated_at = datetime('now') WHERE id = ? AND status = 'pendiente' AND proposed >= ?", qty, commitmentId, qty);
            if (r.changes === 0)
                return "Esta propuesta ya fue resuelta.";
        }
        else {
            const r = await run("UPDATE idea_commitments SET status='rechazada', accepted = 0, reason = ?, updated_at = datetime('now') WHERE id = ? AND status = 'pendiente'", reason, commitmentId);
            if (r.changes === 0)
                return "Esta propuesta ya fue resuelta.";
        }
        await notifyUser(c.user_id, { class: "idea", eventKey: `decide:${commitmentId}:${decision}`, title: decision === "accept" ? "Aceptaron tu aporte" : "No pudieron aceptar tu aporte", body: decision === "accept" ? i.title : `${i.title}: ${reason}`, href: `/ideas/${i.id}`, reason: "Ofreciste ayuda" }, { transactional: true });
        return null;
    });
    if (msg)
        return { error: msg };
    refresh(n.idea_id);
    return { ok: decision === "accept" ? "Aceptamos el aporte y reservamos el cupo." : "Rechazamos la propuesta y avisamos con el motivo." };
}
/** El organizador confirma lo realmente recibido. Parcial permitido, nunca más que lo aceptado ni menos que lo ya confirmado. */
export async function confirmFulfillment(commitmentId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser();
    const c = await one<{
        need_id: number;
        accepted: number;
        fulfilled: number;
        status: string;
    }>("SELECT need_id,accepted,fulfilled,status FROM idea_commitments WHERE id = ?", commitmentId);
    const n = c && await one<{
        idea_id: number;
    }>("SELECT idea_id FROM idea_needs WHERE id = ?", c.need_id);
    const i = n && await idea(n.idea_id);
    if (!c || !n || !i || i.author_id !== user.id)
        return { error: "Solo el organizador confirma los aportes." };
    if (c.status !== "aceptada")
        return { error: "Solo se confirman aportes aceptados." };
    const qty = int(text(fd, "qty"));
    if (!Number.isInteger(qty) || qty < c.fulfilled || qty > c.accepted)
        return { error: `Indicá cuánto se recibió en total: entre ${c.fulfilled} y ${c.accepted}.` };
    const updated = await run("UPDATE idea_commitments SET fulfilled = ?, status = CASE WHEN ? = accepted THEN 'cumplida' ELSE status END, updated_at = datetime('now') WHERE id = ? AND status='aceptada' AND fulfilled <= ? AND accepted >= ?", qty, qty, commitmentId, qty, qty);
    if (!updated.changes) return {error:"El aporte cambió mientras lo confirmabas. Recargá la página."};
    await audit(user.id, "commitment.fulfill", `${commitmentId}:${qty}/${c.accepted}`);
    refresh(n.idea_id);
    return { ok: "Registramos lo recibido." };
}
export async function postIdeaUpdate(ideaId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser();
    const i = await idea(ideaId);
    if (!i || i.author_id !== user.id)
        return { error: "Solo el organizador publica novedades." };
    const body = text(fd, "body");
    if (body.length < 5 || body.length > 600)
        return { error: "La novedad debe tener entre 5 y 600 letras." };
    await tx(async () => {
        const r = await run("INSERT INTO idea_updates (idea_id,author_id,kind,body) VALUES (?,?,?,?)", ideaId, user.id, text(fd, "kind") === "actividad" ? "actividad" : "novedad", body);
        for (const s of await all<{
            user_id: number;
        }>("SELECT user_id FROM idea_supports WHERE idea_id = ? AND user_id != ?", ideaId, user.id))
            await notifyUser(s.user_id, { class: "idea", eventKey: `ideaupd:${r.id}`, title: `Novedad en “${i.title}”`, body: body.slice(0, 120), href: `/ideas/${ideaId}`, reason: "Te sumaste a esta idea" });
    });
    refresh(ideaId);
    return { ok: "Publicamos la novedad y avisamos a quienes se sumaron." };
}
/** El organizador registra que hace falta un permiso. Solo personal municipal puede aprobarlo o rechazarlo. */
export async function addPermission(ideaId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser();
    const i = await idea(ideaId);
    if (!i || i.author_id !== user.id)
        return { error: "Solo el organizador registra permisos." };
    const description = text(fd, "description");
    if (description.length < 5 || description.length > 300)
        return { error: "Describí el permiso en 5 a 300 letras." };
    await run("INSERT INTO idea_permission_requests (idea_id,description) VALUES (?,?)", ideaId, description);
    refresh(ideaId);
    return { ok: "Registramos el pedido de permiso. Queda pendiente de revisión municipal; esto no reemplaza el trámite real." };
}
export async function reviewPermission(permissionId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireRole(["municipio"]);
    const p = await one<{
        idea_id: number;
    }>("SELECT idea_id FROM idea_permission_requests WHERE id = ?", permissionId);
    if (!p)
        return { error: "Ese pedido no existe." };
    const status = text(fd, "status");
    const reference = text(fd, "reference");
    if (!["en_revision", "aprobado", "rechazado"].includes(status))
        return { error: "Elegí un estado." };
    if (status !== "en_revision" && reference.length < 3)
        return { error: "Para aprobar o rechazar, cargá la referencia del expediente o resolución." };
    await run("UPDATE idea_permission_requests SET status = ?, reference = ?, decided_by = ?, decided_at = CASE WHEN ? != 'en_revision' THEN datetime('now') END WHERE id = ?", status, reference || null, user.id, status, permissionId);
    await audit(user.id, "permission.review", `${permissionId}:${status}`);
    refresh(p.idea_id);
    return { ok: "Guardamos la decisión." };
}
/**
 * Cerrar la idea con explicación: realizada (el creador confirma la ejecución) o cancelada (sin fingir realización).
 * Al cancelar se liberan reservas sin cumplir y se conservan los aportes ya cumplidos.
 */
export async function closeIdea(ideaId: number, _: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser();
    const i = await idea(ideaId);
    if (!i || i.author_id !== user.id)
        return { error: "Solo el organizador cierra la idea." };
    const action = text(fd, "action");
    if (!["realizada", "cancelada"].includes(action))
        return { error: "Elegí cómo cerrar la idea." };
    const note = text(fd, "closing");
    if (note.length < 5 || note.length > 600)
        return { error: "Explicá el cierre en 5 a 600 letras." };
    const publish = action === "realizada" && fd.get("publish") === "on";
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
        const r = await run("UPDATE ideas SET status = ?, closing_note = ?, version = version + 1 WHERE id = ? AND status NOT IN ('realizada','cancelada')", action, note, ideaId);
        if (r.changes === 0)
            return false;
        if (action === "cancelada") {
            const people = await all<{
                user_id: number;
            }>("SELECT DISTINCT c.user_id FROM idea_commitments c JOIN idea_needs n ON n.id = c.need_id WHERE n.idea_id = ? AND c.status IN ('pendiente','aceptada')", ideaId);
            await run("UPDATE idea_needs SET status = 'cerrada' WHERE idea_id = ?", ideaId);
            await run("UPDATE idea_commitments SET status = 'retirada', accepted = fulfilled, reason = 'La idea fue cancelada' WHERE status IN ('pendiente') AND need_id IN (SELECT id FROM idea_needs WHERE idea_id = ?)", ideaId);
            await run("UPDATE idea_commitments SET status = CASE WHEN fulfilled > 0 THEN 'cumplida' ELSE 'retirada' END, accepted = fulfilled, reason = 'La idea fue cancelada' WHERE status = 'aceptada' AND need_id IN (SELECT id FROM idea_needs WHERE idea_id = ?)", ideaId);
            for (const p of people)
                await notifyUser(p.user_id, { class: "idea", eventKey: `idea-cancel:${ideaId}`, title: `Se canceló “${i.title}”`, body: note.slice(0, 120), href: `/ideas/${ideaId}`, reason: "Ofreciste ayuda" }, { transactional: true });
        }
        else {
            await run("UPDATE idea_needs SET status = 'cerrada' WHERE idea_id = ?", ideaId);
        }
        if (publish)
            await run("INSERT OR IGNORE INTO community_outcomes (source_type,source_id,author_id,body,photos) VALUES ('idea',?,?,?,?)", ideaId, user.id, note, JSON.stringify(photos));
        await run("INSERT INTO idea_updates (idea_id,author_id,kind,body) VALUES (?,?,'cierre',?)", ideaId, user.id, `${action === "realizada" ? "Idea realizada" : "Idea cancelada"}: ${note}`);
        return true;
    });
    if (!done)
        return { error: "Esta idea ya estaba cerrada." };
    refresh(ideaId);
    revalidatePath("/resultados");
    revalidatePath("/");
    return { ok: action === "realizada" ? "Cerramos la idea como realizada." : "Cerramos la idea como cancelada. Los aportes ya cumplidos quedan registrados." };
}
