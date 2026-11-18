import "server-only";
import { all, one, run } from "./db";

/** El envío al teléfono solo se activa si el administrador configuró las claves VAPID (variables de entorno). */
export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? "";

type WebPush = typeof import("web-push");
let wp: WebPush | null = null;

/** La librería se carga solo al enviar: si faltara o fallara, el resto del sitio no se ve afectado. */
async function init(): Promise<WebPush | null> {
  if (!pushConfigured()) return null;
  if (!wp) {
    const mod = (await import("web-push")) as unknown as WebPush & { default?: WebPush };
    wp = mod.default ?? mod;
    wp.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contacto@sampacho.test", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  }
  return wp;
}

type Pending = { id: number; user_id: number; class: string; title: string; body: string | null; href: string | null; urgent: number };

/** Hora local de Argentina como minutos desde la medianoche (UTC−3). */
const localMinutes = () => {
  const d = new Date(Date.now() - 3 * 3600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const inQuiet = (start: string, end: string, now: number) => {
  const s = toMin(start);
  const e = toMin(end);
  return s <= e ? now >= s && now < e : now >= s || now < e;
};

/**
 * Envía al teléfono las notificaciones pendientes. Respeta el horario de descanso (lo urgente lo omite solo si el
 * vecino lo habilitó) y nunca incluye texto privado: los avisos de reclamos e ideas viajan con un mensaje genérico.
 * Es «al mejor esfuerzo»: un fallo del proveedor no afecta a la acción que lo originó y las suscripciones vencidas se
 * eliminan. No se puede prometer entrega exacta.
 */
export async function flushPush() {
  const webpush = await init().catch(() => null);
  if (!webpush) return;
  const pending = all<Pending>(
    `SELECT n.id,n.user_id,n.class,n.title,n.body,n.href,n.urgent FROM notifications n
     WHERE n.pushed_at IS NULL AND n.deliver_after <= datetime('now') AND n.created_at > datetime('now','-1 day')
       AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = n.user_id)
     ORDER BY n.id LIMIT 100`,
  );
  const now = localMinutes();
  for (const n of pending) {
    const st = one<{ quiet_start: string; quiet_end: string; urgent_override: number }>("SELECT quiet_start,quiet_end,urgent_override FROM user_settings WHERE user_id = ?", n.user_id);
    if (st && inQuiet(st.quiet_start, st.quiet_end, now) && !(n.urgent && st.urgent_override)) continue; // queda para el próximo envío fuera del descanso
    const isPrivate = n.class === "reclamo" || n.class === "idea";
    const payload = JSON.stringify({
      title: isPrivate ? "Sampacho Conecta" : n.title,
      body: isPrivate ? "Tenés novedades. Abrí la app para verlas." : (n.body ?? ""),
      url: n.href ?? "/notificaciones",
      urgent: !!n.urgent,
    });
    for (const s of all<{ id: number; endpoint: string; p256dh: string; auth: string }>("SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE user_id = ?", n.user_id)) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: n.urgent ? "high" : "normal" });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) run("DELETE FROM push_subscriptions WHERE id = ?", s.id);
      }
    }
    run("UPDATE notifications SET pushed_at = datetime('now') WHERE id = ?", n.id);
  }
}
