"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, one, run, tx } from "@/lib/db";
import { audit, requireRole } from "@/lib/auth";
import { CLAIM_AREAS } from "@/lib/constants";
import { fmtDate, localToUtc, nowUtc } from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { text, type FormState } from "@/lib/types";

const MAX_BATCH = 100;
const ids = (fd: FormData, name: string) => [...new Set(fd.getAll(name).map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))];

/** Agrupa reclamos en un incidente interno. Cada reclamo conserva su número, su historial y su acceso individual. */
export async function createIncident(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole(["municipio"], "/panel/incidentes");
  const title = text(fd, "title");
  const reason = text(fd, "reason");
  const place = text(fd, "place") || null;
  const area = text(fd, "area");
  const claimIds = ids(fd, "claims");
  if (title.length < 5 || title.length > 120) return { error: "El título del incidente debe tener entre 5 y 120 letras." };
  if (reason.length < 5) return { error: "Escribí el motivo de la agrupación." };
  if (claimIds.length < 1 || claimIds.length > MAX_BATCH) return { error: `Elegí entre 1 y ${MAX_BATCH} reclamos.` };
  if (area && !(CLAIM_AREAS as readonly string[]).includes(area)) return { error: "Elegí un área de la lista." };
  let id: number;
  try {
   id = tx(() => {
    const claims = all<{ id: number; category: string; incident_id: number | null; status: string }>(
      `SELECT id,category,incident_id,status FROM claims WHERE id IN (${claimIds.map(() => "?").join(",")})`,
      ...claimIds,
    );
    if (claims.length !== claimIds.length) throw new Error("Alguno de los reclamos no existe.");
    if (claims.some((c) => c.incident_id)) throw new Error("Alguno de los reclamos ya pertenece a un incidente activo.");
    if (claims.some((c) => c.status === "resuelto" || c.status === "rechazado")) throw new Error("No se pueden agrupar reclamos cerrados.");
    const r = run("INSERT INTO incidents (title,category,place,area,summary,created_by) VALUES (?,?,?,?,?,?)", title, claims[0].category, place, area || null, reason, user.id);
    for (const c of claims) {
      run("UPDATE claims SET incident_id = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?", r.id, c.id);
      run("INSERT INTO incident_events (incident_id,user_id,kind,claim_id,note) VALUES (?,?,'asociado',?,?)", r.id, user.id, c.id, reason);
    }
    audit(user.id, "incident.create", `${r.id}: ${claimIds.length} reclamos`);
    return r.id;
   });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/panel/incidentes");
  redirect(`/panel/incidentes/${id}`);
}

export async function unlinkClaim(incidentId: number, claimId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole(["municipio"]);
  const reason = text(fd, "reason");
  if (reason.length < 5) return { error: "Escribí el motivo de la desvinculación." };
  tx(() => {
    run("UPDATE claims SET incident_id = NULL, version = version + 1 WHERE id = ? AND incident_id = ?", claimId, incidentId);
    run("INSERT INTO incident_events (incident_id,user_id,kind,claim_id,note) VALUES (?,?,'desasociado',?,?)", incidentId, user.id, claimId, reason);
    audit(user.id, "incident.unlink", `${incidentId}:${claimId}`);
  });
  revalidatePath(`/panel/incidentes/${incidentId}`);
  return { ok: "Desvinculamos el reclamo. Su historial no se borra." };
}

export async function closeIncident(incidentId: number) {
  const user = await requireRole(["municipio"]);
  // Cerrar el incidente no cierra los reclamos vinculados.
  run("UPDATE incidents SET status = 'cerrado', version = version + 1 WHERE id = ?", incidentId);
  run("INSERT INTO incident_events (incident_id,user_id,kind,note) VALUES (?,?,'cerrado','Incidente cerrado. Los reclamos conservan su estado.')", incidentId, user.id);
  audit(user.id, "incident.close", String(incidentId));
  revalidatePath(`/panel/incidentes/${incidentId}`);
}

/**
 * Actualización común o resolución de los reclamos seleccionados. Se valida la versión y el permiso de todos y se
 * confirma todo junto o nada (hasta 100). Cada vecino recibe un evento propio con mensaje neutro, sin números ni
 * identidades ajenas. Los reclamos ya cerrados se omiten.
 */
export async function bulkIncident(incidentId: number, mode: "update" | "resolve", _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole(["municipio"]);
  if (fd.get("confirm") !== "on") return { error: "Confirmá que revisaste la vista previa." };
  const selected = ids(fd, "claims");
  const message = text(fd, "message");
  const note = text(fd, "note");
  if (selected.length < 1 || selected.length > MAX_BATCH) return { error: `Elegí entre 1 y ${MAX_BATCH} reclamos.` };
  if (message.length < 5 || message.length > 600) return { error: "Escribí el mensaje para los vecinos (entre 5 y 600 letras)." };
  const dateRaw = text(fd, "next_update");
  let nextAt: string | null = null;
  if (mode === "update" && dateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return { error: "Revisá la fecha." };
    nextAt = localToUtc(`${dateRaw}T23:59`);
    if (nextAt <= nowUtc()) return { error: "La próxima actualización tiene que ser futura." };
  }
  const result = tx(() => {
    const rows = all<{ id: number; user_id: number; number: string; status: string; version: number; incident_id: number | null }>(
      `SELECT id,user_id,number,status,version,incident_id FROM claims WHERE id IN (${selected.map(() => "?").join(",")})`,
      ...selected,
    );
    if (rows.length !== selected.length || rows.some((r) => r.incident_id !== incidentId)) return "Alguno de los reclamos ya no pertenece a este incidente.";
    const live = rows.filter((r) => r.status !== "resuelto" && r.status !== "rechazado");
    if (live.length === 0) return "Todos los reclamos elegidos ya están cerrados.";
    if (live.some((r) => r.user_id === user.id)) return "Entre los reclamos hay uno que presentaste vos: por conflicto de interés lo tiene que gestionar otra persona.";
    // Todo o nada: si alguna versión cambió, no se toca nada.
    for (const r of live) if (Number(text(fd, `v_${r.id}`)) !== r.version) return `El reclamo ${r.number} cambió mientras preparabas la acción. Recargá la página.`;
    if (mode === "resolve" && live.some((r) => r.status === "en_revision") && note.length < 5) return "Cerrar directo reclamos que están “En revisión” es una excepción: dejá una nota con la evidencia de la solución.";
    for (const r of live) {
      if (mode === "resolve") {
        run("UPDATE claims SET status='resuelto', closed_at = datetime('now'), next_update_at = NULL, version = version + 1, updated_at = datetime('now') WHERE id = ? AND version = ?", r.id, r.version);
        run("INSERT INTO claim_events (claim_id,user_id,status,comment,visibility,kind) VALUES (?,?,'resuelto',?, 'author','status')", r.id, user.id, message);
      } else {
        run("UPDATE claims SET next_update_at = COALESCE(?, next_update_at), version = version + 1, updated_at = datetime('now') WHERE id = ? AND version = ?", nextAt, r.id, r.version);
        run("INSERT INTO claim_events (claim_id,user_id,status,comment,visibility,kind) VALUES (?,?,?,?, 'author','update')", r.id, user.id, r.status, nextAt ? `${message} Próxima novedad prevista: ${fmtDate(nextAt)}.` : message);
      }
      if (note) run("INSERT INTO claim_events (claim_id,user_id,status,comment,visibility,kind) VALUES (?,?,?,?, 'municipal','note')", r.id, user.id, mode === "resolve" ? "resuelto" : r.status, note);
      notifyUser(r.user_id, { class: "reclamo", eventKey: `claim:${r.id}:v${r.version + 1}`, title: `Novedades de tu reclamo ${r.number}`, body: message.slice(0, 120), href: `/reclamos/${r.id}`, reason: "Es un reclamo tuyo" }, { transactional: true });
    }
    run("INSERT INTO incident_events (incident_id,user_id,kind,note) VALUES (?,?,?,?)", incidentId, user.id, mode === "resolve" ? "resolucion_comun" : "actualizacion_comun", `${live.length} reclamos. ${message.slice(0, 200)}`);
    audit(user.id, `incident.${mode}`, `${incidentId}: ${live.length} reclamos`);
    return live.length;
  });
  if (typeof result === "string") return { error: result };
  revalidatePath(`/panel/incidentes/${incidentId}`);
  revalidatePath("/panel", "layout");
  return { ok: `Listo: se registró el aviso para ${result} ${result === 1 ? "reclamo" : "reclamos"}. Cada vecino ve solo el suyo.` };
}

export async function incidentExists(id: number) {
  return !!one("SELECT 1 FROM incidents WHERE id = ?", id);
}
