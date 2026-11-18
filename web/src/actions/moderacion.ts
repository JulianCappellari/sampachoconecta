"use server";

import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { audit, requireRole } from "@/lib/auth";

/**
 * Contenido que moderación y municipio pueden retirar. LISTA CERRADA: los reclamos (y su historial, fotos o
 * incidentes) no figuran acá a propósito y además la base impide borrarlos (migración «reclamos-inborrables»).
 */
const REMOVABLE = ["post", "comment", "request", "response", "listing", "idea", "outcome", "rating", "job", "poll"] as const;
type Kind = (typeof REMOVABLE)[number];

/** Retira contenido: se oculta o marca como eliminado (queda para auditoría), salvo las opiniones, que se quitan. */
export async function removeContent(kind: string, id: number, extra?: number) {
  const user = await requireRole(["moderador", "municipio"], "/panel/contenido");
  if (!(REMOVABLE as readonly string[]).includes(kind) || !Number.isInteger(id)) return;
  const k = kind as Kind;
  // Las consultas las gestiona solo el municipio.
  if (k === "poll" && user.role !== "municipio") return;

  if (k === "post") {
    const p = one<{ category: string }>("SELECT category FROM posts WHERE id = ? AND deleted = 0", id);
    if (!p) return;
    // Los avisos oficiales los gestiona solo el municipio.
    if (p.category === "aviso" && user.role !== "municipio") return;
    tx(() => {
      run("UPDATE posts SET deleted = 1 WHERE id = ?", id);
      run("UPDATE community_outcomes SET status = 'oculto' WHERE source_type = 'publicacion' AND source_id = ?", id);
    });
  } else if (k === "comment") run("UPDATE comments SET hidden = 1 WHERE id = ?", id);
  else if (k === "request") {
    tx(() => {
      run("UPDATE community_requests SET hidden = 1 WHERE id = ?", id);
      run("UPDATE community_outcomes SET status = 'oculto' WHERE source_type = 'pedido' AND source_id = ?", id);
    });
  } else if (k === "response") run("UPDATE request_responses SET status = 'oculta', version = version + 1 WHERE id = ?", id);
  else if (k === "listing") run("UPDATE listings SET deleted = 1 WHERE id = ?", id);
  else if (k === "idea") {
    tx(() => {
      run("UPDATE ideas SET hidden = 1 WHERE id = ?", id);
      run("UPDATE community_outcomes SET status = 'oculto' WHERE source_type = 'idea' AND source_id = ?", id);
    });
  } else if (k === "job") run("UPDATE jobs SET hidden = 1 WHERE id = ?", id);
  else if (k === "poll") {
    // Ocultar una consulta no borra los votos ya emitidos; solo deja de mostrarse.
    run("UPDATE polls SET hidden = 1 WHERE id = ?", id);
  } else if (k === "outcome") run("UPDATE community_outcomes SET status = 'oculto', version = version + 1 WHERE id = ?", id);
  else if (k === "rating" && extra) {
    // Se quita la opinión y se recalcula el promedio en la misma transacción.
    tx(() => {
      run("DELETE FROM ratings WHERE listing_id = ? AND user_id = ?", id, extra);
      run(
        `UPDATE listings SET avg = COALESCE((SELECT ROUND(AVG(stars),1) FROM ratings WHERE listing_id = ?),0),
         count = (SELECT COUNT(*) FROM ratings WHERE listing_id = ?) WHERE id = ?`,
        id, id, id,
      );
    });
  } else return;

  audit(user.id, `content.remove.${k}`, extra ? `${id}:${extra}` : String(id));
  for (const p of ["/muro", "/necesito", "/guia", "/oficios", "/ideas", "/resultados", "/panel/contenido", "/"]) revalidatePath(p);
}
