"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { audit, canModerate, requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { BARRIOS, REQUEST_CATEGORIES } from "@/lib/constants";
import { nowUtc } from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { activeJobsOf } from "@/lib/jobs";
import { PHONE_RE, text, type FormState } from "@/lib/types";
const schema = z.object({
    kind: z.enum(["oferta", "busco"], { message: "Elegí si ofrecés o buscás trabajo." }),
    title: z.string().min(5, "El título necesita al menos 5 letras.").max(100, "El título es muy largo (máximo 100)."),
    body: z.string().min(10, "Contá un poco más: al menos 10 letras.").max(800, "El texto es muy largo (máximo 800)."),
    category: z.string().refine((c) => REQUEST_CATEGORIES.includes(c) || c === "Otro", "Elegí un rubro de la lista."),
    phone: z.string().regex(PHONE_RE, "El celular debe tener entre 8 y 20 números."),
    days: z.coerce.number().int().min(1, "El plazo mínimo es 1 día.").max(60, "El plazo máximo es 60 días."),
});
/** El teléfono es de contacto y se publica a propósito: quien publica lo escribe, nunca se toma del perfil. */
export async function createJob(_: FormState, fd: FormData): Promise<FormState> {
    const user = await requireUser("/empleo/nuevo");
    const p = schema.safeParse({ kind: text(fd, "kind"), title: text(fd, "title"), body: text(fd, "body"), category: text(fd, "category"), phone: text(fd, "phone"), days: text(fd, "days") || 30 });
    if (!p.success)
        return { error: p.error.issues[0].message };
    const zone = text(fd, "zone") || null;
    if (zone && !(BARRIOS as readonly string[]).includes(zone))
        return { error: "Elegí una zona de la lista." };
    if (await activeJobsOf(user.id) >= 5)
        return { error: "Ya tenés 5 avisos abiertos. Cerrá alguno para publicar otro." };
    const d = p.data;
    const id = await tx(async () => {
        const r = await run("INSERT INTO jobs (author_id,kind,title,body,category,zone,contact_phone,expires_at) VALUES (?,?,?,?,?,?,?,?)", user.id, d.kind, d.title, d.body, d.category, zone, d.phone, nowUtc(d.days * 864e5));
        for (const f of await all<{
            user_id: number;
        }>("SELECT f.user_id FROM follows f JOIN users u ON u.id = f.user_id WHERE f.target_type='tema' AND f.target_id = 'trabajo' AND u.suspended = 0 AND f.user_id != ?", user.id))
            await notifyUser(f.user_id, { class: "novedades", eventKey: `job:${r.id}`, title: `${d.kind === "oferta" ? "Ofrecen trabajo" : "Buscan trabajo"}: ${d.title}`, body: d.category, href: `/empleo/${r.id}`, reason: "Seguís la bolsa de trabajo" });
        return r.id;
    });
    revalidatePath("/empleo");
    redirect(`/empleo/${id}`);
}
/** Marcar como cubierto (o volver a abrir). Solo el autor. */
export async function toggleJobFilled(jobId: number) {
    const user = await requireUser();
    await run("UPDATE jobs SET status = CASE status WHEN 'abierta' THEN 'cubierta' ELSE 'abierta' END WHERE id = ? AND author_id = ?", jobId, user.id);
    revalidatePath(`/empleo/${jobId}`);
    revalidatePath("/empleo");
}
export async function renewJob(jobId: number) {
    const user = await requireUser();
    await run("UPDATE jobs SET expires_at = ? WHERE id = ? AND author_id = ? AND status = 'abierta'", nowUtc(30 * 864e5), jobId, user.id);
    revalidatePath(`/empleo/${jobId}`);
}
export async function hideJob(jobId: number) {
    const user = await requireUser();
    const j = await one<{
        author_id: number;
    }>("SELECT author_id FROM jobs WHERE id = ?", jobId);
    if (!j || (j.author_id !== user.id && !canModerate(user)))
        return;
    await run("UPDATE jobs SET hidden = 1 WHERE id = ?", jobId);
    if (j.author_id !== user.id)
        await audit(user.id, "job.hide", String(jobId));
    revalidatePath("/empleo");
    redirect("/empleo");
}
