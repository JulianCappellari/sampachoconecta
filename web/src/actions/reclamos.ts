"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { audit, requireRole, requireUser } from "@/lib/auth";
import { CLAIM_AREAS, CLAIM_CATEGORIES, CLAIM_NEXT, CLAIM_STATUS, claimStatus } from "@/lib/constants";
import { fmtDate, localToUtc, nowUtc } from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { saveImages, UploadError } from "@/lib/uploads";
import { text, type FormState } from "@/lib/types";

const claimSchema = z.object({
  category: z.enum(CLAIM_CATEGORIES, { message: "Elegí de qué se trata el reclamo." }),
  description: z.string().min(10, "Contanos un poco más: escribí al menos 10 letras.").max(1500, "La descripción es muy larga (máximo 1500)."),
  address: z.string().max(160).optional(),
});

export async function createClaim(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/reclamos/nuevo");
  const parsed = claimSchema.safeParse({
    category: text(fd, "category"),
    description: text(fd, "description"),
    address: text(fd, "address") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const lat = parseFloat(text(fd, "lat"));
  const lng = parseFloat(text(fd, "lng"));
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  if (!parsed.data.address && !hasPoint) return { error: "Marcá el lugar en el mapa o escribí la dirección." };

  let photos: string[] = [];
  try {
    photos = await saveImages(fd.getAll("photos"), "c", 3);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  const year = new Date().getFullYear();
  const id = tx(() => {
    const n = (one<{ n: number }>("SELECT COUNT(*) n FROM claims WHERE number LIKE ?", `R-${year}-%`)?.n ?? 0) + 1;
    const number = `R-${year}-${String(n).padStart(4, "0")}`;
    const r = run(
      "INSERT INTO claims (number,user_id,category,description,address,lat,lng,photos,updated_at) VALUES (?,?,?,?,?,?,?,?,datetime('now'))",
      number, user.id, parsed.data.category, parsed.data.description, parsed.data.address ?? null,
      hasPoint ? lat : null, hasPoint ? lng : null, JSON.stringify(photos),
    );
    run("INSERT INTO claim_events (claim_id,user_id,status,comment,visibility,kind) VALUES (?,?,?,?, 'author','status')", r.id, user.id, "recibido", "Reclamo presentado.");
    return r.id;
  });
  revalidatePath("/reclamos");
  revalidatePath("/panel");
  redirect(`/reclamos/${id}?nuevo=1`);
}

const NEXT = CLAIM_NEXT;
const MAX_DAYS = 30;

/**
 * Cambio de estado, responsable y próxima actualización. El cambio, su historial, la auditoría y el aviso al
 * vecino se confirman juntos o no se confirma nada. La versión evita que dos agentes se pisen.
 */
export async function updateClaim(claimId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole(["municipio"], `/reclamos/${claimId}`);
  const c = one<{ status: string; version: number; user_id: number; number: string; area: string | null; next_update_at: string | null }>(
    "SELECT status,version,user_id,number,area,next_update_at FROM claims WHERE id = ?",
    claimId,
  );
  if (!c) return { error: "Ese reclamo no existe." };
  if (c.status === "resuelto" || c.status === "rechazado") return { error: "Este reclamo ya está cerrado y no se puede reabrir." };
  // Conflicto de interés: un agente no gestiona sus propios reclamos.
  if (c.user_id === user.id) return { error: "No podés gestionar un reclamo que presentaste vos. Pedile a otra persona del municipio que lo revise." };

  const version = Number(text(fd, "version"));
  if (version !== c.version) return { error: "Otra persona actualizó este reclamo mientras lo editabas. Recargá la página y volvé a intentar." };

  const status = text(fd, "status") || c.status;
  if (!CLAIM_STATUS.some((s) => s.id === status)) return { error: "Elegí un estado." };
  if (status !== c.status && !NEXT[c.status]?.includes(status)) return { error: `Desde “${claimStatus(c.status).label}” no se puede pasar a “${claimStatus(status).label}”.` };

  const area = text(fd, "area") || c.area || "";
  if (area && !(CLAIM_AREAS as readonly string[]).includes(area)) return { error: "Elegí un área de la lista." };
  const reply = text(fd, "reply");
  const note = text(fd, "note");
  if (reply.length > 800 || note.length > 800) return { error: "El texto es muy largo (máximo 800)." };
  const closing = status === "resuelto" || status === "rechazado";
  const working = status === "en_revision" || status === "en_proceso";

  if (status === "rechazado" && reply.length < 5) return { error: "Para rechazar un reclamo explicá el motivo al vecino." };
  if (status === "resuelto" && reply.length < 5) return { error: "Para resolver, contale al vecino qué se hizo." };
  if (status === "resuelto" && c.status === "en_revision" && !note) return { error: "Cerrar directo desde “En revisión” es una excepción: dejá una nota interna con la evidencia de la solución." };

  // Próxima actualización: obligatoria al pasar a revisión o proceso, futura y dentro de 30 días (ampliable con motivo).
  let nextAt: string | null = c.next_update_at;
  const dateRaw = text(fd, "next_update");
  if (closing) nextAt = null;
  else if (dateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return { error: "Revisá la fecha de la próxima actualización." };
    nextAt = localToUtc(`${dateRaw}T23:59`);
    if (nextAt <= nowUtc()) return { error: "La próxima actualización tiene que ser una fecha futura." };
    if (nextAt > nowUtc(MAX_DAYS * 864e5) && text(fd, "extend_reason").length < 5) return { error: `Pasaste los ${MAX_DAYS} días: explicá el motivo de la demora en “Motivo de la ampliación”.` };
  }
  if (working && !area) return { error: "Asigná un área responsable antes de pasar a revisión o proceso." };
  // Una fecha ya vencida no sirve: hay que informar una nueva.
  if (working && nextAt && nextAt <= nowUtc()) return { error: "La fecha de próxima actualización ya pasó. Indicá una nueva fecha futura." };
  if (working && !nextAt) return { error: "Indicá la fecha de la próxima actualización. Es una fecha de novedad, no una promesa de reparación." };
  if (status === c.status && !reply && !note && nextAt === c.next_update_at && area === (c.area ?? "")) return { error: "No hay nada para guardar: cambiá el estado, el área, la fecha o escribí una respuesta." };

  const ok = tx(() => {
    const upd = run(
      `UPDATE claims SET status = ?, area = NULLIF(?, ''), next_update_at = ?, version = version + 1, updated_at = datetime('now'),
         closed_at = CASE WHEN ? THEN datetime('now') ELSE closed_at END WHERE id = ? AND version = ?`,
      status, area, nextAt, closing ? 1 : 0, claimId, version,
    );
    if (upd.changes === 0) return false;
    // Respuesta visible para el vecino y nota interna se guardan por separado.
    if (status !== c.status || reply || (nextAt !== c.next_update_at && !closing) || area !== (c.area ?? "")) {
      const parts = [reply];
      if (nextAt && nextAt !== c.next_update_at && !closing) parts.push(`Próxima novedad prevista: ${fmtDate(nextAt)}.`);
      if (area && area !== (c.area ?? "")) parts.push(`Lo atiende: ${area}.`);
      run("INSERT INTO claim_events (claim_id,user_id,status,comment,visibility,kind) VALUES (?,?,?,?, 'author','status')", claimId, user.id, status, parts.filter(Boolean).join(" ") || null);
    }
    if (note) run("INSERT INTO claim_events (claim_id,user_id,status,comment,visibility,kind) VALUES (?,?,?,?, 'municipal','note')", claimId, user.id, status, note);
    audit(user.id, "claim.update", `${claimId} ${c.status}→${status}; área ${c.area ?? "—"}→${area || "—"}; próxima ${c.next_update_at ?? "—"}→${nextAt ?? "—"}${text(fd, "extend_reason") ? `; motivo: ${text(fd, "extend_reason").slice(0, 120)}` : ""}`);
    // Aviso interno real al vecino, sin textos privados. Solo se crea si el cambio quedó confirmado.
    notifyUser(c.user_id, { class: "reclamo", eventKey: `claim:${claimId}:v${version + 1}`, title: `Novedades de tu reclamo ${c.number}`, body: claimStatus(status).label + (reply ? `: ${reply.slice(0, 100)}` : ""), href: `/reclamos/${claimId}`, reason: "Es un reclamo tuyo" }, { transactional: true });
    return true;
  });
  if (!ok) return { error: "Otra persona actualizó este reclamo mientras lo guardabas. Recargá la página y volvé a intentar." };
  revalidatePath(`/reclamos/${claimId}`);
  revalidatePath("/reclamos");
  revalidatePath("/panel", "layout");
  return { ok: "Guardamos el cambio y quedó registrado el aviso interno para el vecino. El email todavía no está disponible." };
}

export async function rateClaim(claimId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const c = one<{ user_id: number; status: string; rating: number | null }>("SELECT user_id,status,rating FROM claims WHERE id = ?", claimId);
  if (!c || c.user_id !== user.id) return { error: "No podés calificar este reclamo." };
  if (c.status !== "resuelto") return { error: "Podés calificar cuando el reclamo esté resuelto." };
  const stars = Number(text(fd, "stars"));
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Elegí de 1 a 5 estrellas." };
  run("UPDATE claims SET rating = ? WHERE id = ?", stars, claimId);
  revalidatePath(`/reclamos/${claimId}`);
  return { ok: "¡Gracias por tu opinión!" };
}
