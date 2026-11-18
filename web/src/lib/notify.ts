import "server-only";
import { all, one, run } from "./db";
import { after } from "next/server";
import { nowUtc } from "./format";

export type NotifClass = "avisos" | "novedades" | "pedidos" | "reclamo" | "idea";

type Notif = {
  class: NotifClass;
  /** Identifica el hecho: (usuario, event_key) es único, así un mismo evento nunca se duplica. */
  eventKey: string;
  title: string;
  body?: string | null;
  href?: string | null;
  reason?: string | null;
  urgent?: boolean;
};

/** Próximas 08:00 de Argentina (11:00 UTC); semanal = próximo lunes. */
function nextDigest(weekly: boolean): string {
  const now = new Date();
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 11, 0, 0));
  if (t <= now) t.setUTCDate(t.getUTCDate() + 1);
  if (weekly) while (new Date(t.getTime() - 3 * 3600_000).getUTCDay() !== 1) t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Crea una notificación interna respetando la preferencia del vecino (salvo que sea transaccional,
 * como el cambio de un reclamo propio). Devuelve true si quedó registrada. No hace llamadas de red.
 */
export function notifyUser(userId: number, n: Notif, opts: { transactional?: boolean } = {}): boolean {
  let deliver = nowUtc();
  if (!opts.transactional) {
    const freq = one<{ frequency: string }>("SELECT frequency FROM notification_prefs WHERE user_id = ? AND class = ?", userId, n.class)?.frequency ?? "inmediata";
    if (freq === "desactivada") return false;
    // Lo urgente (alertas) nunca se demora en un resumen, salvo que el vecino haya desactivado ese tipo de aviso.
    if (!n.urgent && freq === "diaria") deliver = nextDigest(false);
    if (!n.urgent && freq === "semanal") deliver = nextDigest(true);
  }
  const r = run(
    `INSERT OR IGNORE INTO notifications (user_id,class,event_key,title,body,href,reason,urgent,deliver_after)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    userId, n.class, n.eventKey, n.title, n.body ?? null, n.href ?? null, n.reason ?? null, n.urgent ? 1 : 0, deliver,
  );
  if (r.changes > 0) schedulePush();
  return r.changes > 0;
}

let pushScheduled = false;
/** Programa el envío al teléfono para después de responder (fuera de la transacción). */
function schedulePush() {
  if (pushScheduled) return;
  pushScheduled = true;
  try {
    after(async () => {
      pushScheduled = false;
      const { flushPush } = await import("./push");
      await flushPush();
    });
  } catch {
    pushScheduled = false; // fuera de un pedido (por ejemplo, un script): se enviará en el próximo.
  }
}

/**
 * Avisa a quienes siguen el tema, la zona o el comercio del autor. Una cuenta que coincide por varias
 * vías recibe una sola notificación; el motivo prioriza comercio > zona > tema (RF-SEG-06/07).
 * Se usa solo con contenido público: nunca con reclamos.
 */
export function fanOutPost(postId: number, opts: { suffix?: string; prefix?: string } = {}) {
  const p = one<{ id: number; author_id: number; category: string; title: string; body: string; zone: string | null; severity: string; lifecycle: string; hidden: number }>(
    "SELECT id,author_id,category,title,body,zone,severity,lifecycle,hidden FROM posts WHERE id = ? AND deleted = 0",
    postId,
  );
  // Un aviso cancelado también se informa (con prefijo); el resto exige estar activo y visible.
  if (!p || p.hidden || (p.lifecycle !== "active" && !opts.prefix)) return;
  const reasons = new Map<number, string>();
  const add = (rows: { user_id: number }[], reason: string, over = false) => {
    for (const r of rows) if (r.user_id !== p.author_id && (over || !reasons.has(r.user_id))) reasons.set(r.user_id, reason);
  };
  const live = "AND u.suspended = 0";
  // Orden de prioridad inverso: lo más específico pisa a lo general.
  add(all(`SELECT f.user_id FROM follows f JOIN users u ON u.id = f.user_id WHERE f.target_type='tema' AND f.target_id = ? ${live}`, p.category), `Seguís el tema “${p.category}”`);
  if (p.zone) add(all(`SELECT f.user_id FROM follows f JOIN users u ON u.id = f.user_id WHERE f.target_type='zona' AND f.target_id = ? ${live}`, p.zone), "Elegiste avisos de esta zona", true);
  add(
    all(
      `SELECT f.user_id FROM follows f JOIN users u ON u.id = f.user_id JOIN listings l ON CAST(l.id AS TEXT) = f.target_id
       WHERE f.target_type='ficha' AND l.owner_id = ? AND l.deleted = 0 ${live}`,
      p.author_id,
    ),
    "Seguís a este comercio",
    true,
  );
  const cls: NotifClass = p.category === "aviso" ? "avisos" : "novedades";
  for (const [uid, reason] of reasons) {
    notifyUser(uid, {
      class: cls,
      eventKey: `post:${p.id}${opts.suffix ?? ""}`,
      title: `${opts.prefix ?? ""}${p.title}`,
      body: p.body.slice(0, 140),
      href: `/muro/${p.id}`,
      reason,
      urgent: p.severity === "urgente",
    });
  }
}

export const unreadCount = (userId: number) =>
  one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL AND deliver_after <= datetime('now')", userId)?.n ?? 0;
