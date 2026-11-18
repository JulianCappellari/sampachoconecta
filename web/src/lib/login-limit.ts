import "server-only";
import { createHash } from "node:crypto";
import { one, run } from "./db";
const keyFor = (email: string) => 'login:' + createHash('sha256').update(email.toLowerCase()).digest('hex');
/** Reserva un intento antes de verificar: límite compartido entre instancias y resistente a envíos paralelos. */
export async function tooManyAttempts(email: string): Promise<boolean> {
  const key = keyFor(email);
  const now = Date.now();
  // Un único upsert bloquea la fila y reserva de forma atómica, sin leer un contador obsoleto.
  const row = await one<{value:string}>(`INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value =
    CASE WHEN (kv.value::jsonb->>'t')::bigint <= ? THEN excluded.value
    ELSE jsonb_build_object('n',LEAST((kv.value::jsonb->>'n')::integer+1,9),'t',(kv.value::jsonb->>'t')::bigint)::text END
    RETURNING value`,key,JSON.stringify({n:1,t:now}),now-600_000);
  return (JSON.parse(row!.value) as {n:number}).n > 8;
}
export async function noteAttempt(email: string, success: boolean): Promise<void> {
  if (success) await run("DELETE FROM kv WHERE key=?",keyFor(email));
}
