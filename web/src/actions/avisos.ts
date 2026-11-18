"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { audit, requireRole, requireUser } from "@/lib/auth";
import { BARRIOS } from "@/lib/constants";
import { localToUtc, nowUtc } from "@/lib/format";
import { fanOutPost } from "@/lib/notify";
import { ZONE_COOKIE } from "@/lib/hoy";
import { text, type FormState } from "@/lib/types";

/** Elegir zona sin compartir ubicación (funciona sin cuenta). */
export async function setZone(zone: string) {
  const jar = await cookies();
  if (!zone || !(BARRIOS as readonly string[]).includes(zone)) jar.delete(ZONE_COOKIE);
  else jar.set(ZONE_COOKIE, zone, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/");
}

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

type Notice = { id: number; title: string; severity: string; ends_at: string | null; zone: string | null; lifecycle: string; updated_at: string | null; created_at: string };

/** Corregir o extender un aviso. Detecta ediciones simultáneas con la marca de actualización. */
export async function updateNotice(postId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireRole(["municipio"], `/muro/${postId}`);
  const n = one<Notice>("SELECT id,title,severity,ends_at,zone,lifecycle,updated_at,created_at FROM posts WHERE id = ? AND category='aviso' AND deleted = 0", postId);
  if (!n) return { error: "Ese aviso ya no existe." };
  if ((n.updated_at ?? n.created_at) !== text(fd, "v")) return { error: "Otra persona modificó este aviso mientras lo editabas. Recargá la página y volvé a intentar." };
  const title = text(fd, "title");
  const body = text(fd, "body");
  const severity = text(fd, "severity");
  const zone = text(fd, "zone") || null;
  const endsRaw = text(fd, "ends_at");
  if (title.length < 3 || title.length > 120) return { error: "El título debe tener entre 3 y 120 letras." };
  if (body.length < 3 || body.length > 2000) return { error: "El texto debe tener entre 3 y 2000 letras." };
  if (!["informativo", "importante", "urgente"].includes(severity)) return { error: "Elegí el nivel del aviso." };
  if (zone && !(BARRIOS as readonly string[]).includes(zone)) return { error: "Elegí una zona de la lista." };
  if (endsRaw && !LOCAL_DT.test(endsRaw)) return { error: "Revisá la fecha de fin." };
  const endsAt = endsRaw ? localToUtc(endsRaw) : null;
  const material = severity !== n.severity || endsAt !== n.ends_at || zone !== n.zone || title !== n.title;
  const stamp = nowUtc();
  tx(() => {
    run("UPDATE posts SET title=?, body=?, severity=?, zone=?, ends_at=?, updated_at=? WHERE id=?", title, body, severity, zone, endsAt, stamp, postId);
    audit(user.id, "notice.update", `${postId}: ${n.severity}→${severity}, fin ${n.ends_at ?? "—"}→${endsAt ?? "—"}`);
    if (material) fanOutPost(postId, { suffix: `:u:${stamp}`, prefix: "Actualizado: " });
  });
  revalidatePath(`/muro/${postId}`);
  revalidatePath("/");
  return { ok: material ? "Guardamos la corrección y avisamos a quienes siguen este tema." : "Guardamos los cambios." };
}

/** Cancelar un aviso (queda archivado con fecha) o un evento (lo puede cancelar su autor). */
export async function cancelPost(postId: number) {
  const user = await requireUser();
  const p = one<{ author_id: number; category: string; lifecycle: string }>("SELECT author_id,category,lifecycle FROM posts WHERE id = ? AND deleted = 0", postId);
  if (!p || p.lifecycle !== "active") return;
  const allowed = (p.category === "aviso" && user.role === "municipio") || (p.category === "evento" && (p.author_id === user.id || user.role === "municipio"));
  if (!allowed) return;
  const stamp = nowUtc();
  tx(() => {
    run("UPDATE posts SET lifecycle='cancelled', updated_at=? WHERE id=?", stamp, postId);
    audit(user.id, `${p.category}.cancel`, String(postId));
    fanOutPost(postId, { suffix: ":cancel", prefix: "Cancelado: " });
  });
  revalidatePath(`/muro/${postId}`);
  revalidatePath("/");
  revalidatePath("/muro");
  revalidatePath("/agenda");
}
