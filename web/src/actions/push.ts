"use server";

import { z } from "zod";
import { one, run } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pushConfigured } from "@/lib/push";

const schema = z.object({
  endpoint: z.string().url().startsWith("https://").max(600),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
});

/** Guarda la suscripción del teléfono del vecino. Las claves quedan solo en el servidor y se pueden revocar. */
export async function savePush(sub: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/siguiendo");
  if (!pushConfigured()) return { ok: false, error: "Las notificaciones del teléfono todavía no están configuradas." };
  const p = schema.safeParse(sub);
  if (!p.success) return { ok: false, error: "No pudimos registrar este dispositivo." };
  const n = one<{ n: number }>("SELECT COUNT(*) n FROM push_subscriptions WHERE user_id = ?", user.id)?.n ?? 0;
  if (n >= 5) run("DELETE FROM push_subscriptions WHERE id = (SELECT MIN(id) FROM push_subscriptions WHERE user_id = ?)", user.id);
  run(
    "INSERT INTO push_subscriptions (user_id,endpoint,p256dh,auth) VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth",
    user.id, p.data.endpoint, p.data.keys.p256dh, p.data.keys.auth,
  );
  return { ok: true };
}

export async function removePush(endpoint: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  run("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?", endpoint, user.id);
  return { ok: true };
}
