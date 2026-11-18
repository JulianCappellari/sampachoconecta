"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { all, run, tx } from "@/lib/db";
import { audit, requireRole } from "@/lib/auth";
import { ALERT_KINDS, BARRIOS, SMN_URL } from "@/lib/constants";
import { nowUtc } from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { text, type FormState } from "@/lib/types";
/**
 * Alerta del municipio por clima severo u otros cortes. Se publica como aviso urgente y llega a todos los vecinos de la
 * zona (o de todo el pueblo) a la bandeja y, si lo activaron, al teléfono. NO es una alerta oficial del Servicio
 * Meteorológico Nacional: el texto lo aclara y remite a sus canales.
 */
export async function issueAlert(_: FormState, fd: FormData): Promise<FormState> {
    const user = await requireRole(["municipio"], "/panel/alertas");
    const kind = ALERT_KINDS.find((k) => k.id === text(fd, "kind"));
    if (!kind)
        return { error: "Elegí el tipo de alerta." };
    const zone = text(fd, "zone") || null;
    if (zone && !(BARRIOS as readonly string[]).includes(zone))
        return { error: "Elegí una zona de la lista." };
    const hours = Number(text(fd, "hours") || 12);
    if (!Number.isInteger(hours) || hours < 1 || hours > 72)
        return { error: "La duración va de 1 a 72 horas." };
    const extra = text(fd, "message");
    if (extra.length > 300)
        return { error: "El mensaje adicional es muy largo (máximo 300)." };
    const title = zone ? `${kind.label} en ${zone}` : kind.label;
    const body = `${kind.text}${extra ? `\n\n${extra}` : ""}\n\nMensaje de la Municipalidad de Sampacho. Para información oficial sobre el tiempo, consultá el Servicio Meteorológico Nacional (${SMN_URL}).`;
    const id = await tx(async () => {
        const r = await run("INSERT INTO posts (author_id,category,title,body,severity,alert_kind,zone,ends_at,updated_at) VALUES (?,'aviso',?,?,'urgente',?,?,?,datetime('now'))", user.id, title, body, kind.id, zone, nowUtc(hours * 3600000));
        const people = await all<{
            id: number;
        }>(`SELECT u.id FROM users u WHERE u.suspended = 0 AND u.id != ?
         AND (?::text IS NULL OR u.barrio = ? OR EXISTS (SELECT 1 FROM follows f WHERE f.user_id = u.id AND f.target_type='zona' AND f.target_id = ?))`, user.id, zone, zone, zone);
        for (const p of people)
            await notifyUser(p.id, { class: "avisos", eventKey: `alert:${r.id}`, title: `Alerta: ${title}`, body: kind.text, href: `/muro/${r.id}`, reason: zone ? `Alerta para ${zone}` : "Alerta para todo el pueblo", urgent: true });
        await audit(user.id, "alert.issue", `${r.id}:${kind.id}:${zone ?? "todo"}:${hours}h`);
        return r.id;
    });
    for (const p of ["/", "/muro", "/panel/alertas"])
        revalidatePath(p);
    redirect(`/muro/${id}`);
}
