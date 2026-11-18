"use server";

import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { audit, requireRole } from "@/lib/auth";
import { PHONE_CATEGORIES } from "@/lib/constants";
import { PHONE_RE, text, type FormState } from "@/lib/types";

export async function setUserRole(userId: number, fd: FormData) {
  const admin = await requireRole(["municipio"]);
  const role = text(fd, "role");
  if (!["vecino", "moderador", "municipio"].includes(role) || userId === admin.id) return;
  run("UPDATE users SET role = ? WHERE id = ?", role, userId);
  audit(admin.id, "user.role", `${userId}:${role}`);
  revalidatePath("/panel/usuarios");
}

export async function toggleSuspend(userId: number) {
  const admin = await requireRole(["moderador", "municipio"]);
  const target = one<{ role: string; suspended: number }>("SELECT role, suspended FROM users WHERE id = ?", userId);
  if (!target || userId === admin.id || target.role !== "vecino") return;
  run("UPDATE users SET suspended = 1 - suspended WHERE id = ?", userId);
  if (!target.suspended) run("DELETE FROM sessions WHERE user_id = ?", userId);
  audit(admin.id, target.suspended ? "user.unsuspend" : "user.suspend", String(userId));
  revalidatePath("/panel/usuarios");
}

/** Resuelve una denuncia: oculta el contenido o la descarta (y lo restituye si estaba oculto). */
export async function resolveReport(reportId: number, decision: "hide" | "dismiss") {
  const mod = await requireRole(["moderador", "municipio"]);
  const r = one<{ kind: string; target_id: number }>("SELECT kind, target_id FROM reports WHERE id = ?", reportId);
  if (!r) return;
  const table = r.kind === "post" ? "posts" : r.kind === "request" ? "community_requests" : "comments";
  tx(() => {
    run(`UPDATE ${table} SET hidden = ? WHERE id = ?`, decision === "hide" ? 1 : 0, r.target_id);
    run("UPDATE reports SET status = 'resolved' WHERE kind = ? AND target_id = ?", r.kind, r.target_id);
    audit(mod.id, `report.${decision}`, `${r.kind}:${r.target_id}`);
  });
  revalidatePath("/panel/moderacion");
  revalidatePath("/muro");
}

export async function addPhone(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole(["municipio"]);
  const name = text(fd, "name");
  const number = text(fd, "number");
  const category = text(fd, "category");
  if (name.length < 2) return { error: "Escribí el nombre del servicio." };
  if (!PHONE_RE.test(number) && !/^\d{3}$/.test(number)) return { error: "Revisá el número." };
  if (!(PHONE_CATEGORIES as readonly string[]).includes(category)) return { error: "Elegí una categoría." };
  run("INSERT INTO phones (name,number,category,sort) VALUES (?,?,?,(SELECT COALESCE(MAX(sort),0)+1 FROM phones))", name, number, category);
  audit(admin.id, "phone.add", name);
  revalidatePath("/utiles");
  revalidatePath("/panel/utiles");
  return { ok: "Teléfono agregado." };
}

export async function deletePhone(phoneId: number) {
  const admin = await requireRole(["municipio"]);
  run("DELETE FROM phones WHERE id = ?", phoneId);
  audit(admin.id, "phone.delete", String(phoneId));
  revalidatePath("/utiles");
  revalidatePath("/panel/utiles");
}

export async function savePharmacy(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireRole(["municipio"]);
  const from = text(fd, "from");
  const days = Math.min(31, Math.max(1, Number(text(fd, "days")) || 1));
  const name = text(fd, "name");
  const address = text(fd, "address");
  const phone = text(fd, "phone");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return { error: "Elegí la fecha de inicio." };
  if (name.length < 3) return { error: "Escribí el nombre de la farmacia." };
  tx(() => {
    for (let i = 0; i < days; i++) {
      const d = new Date(from + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + i);
      run(
        "INSERT INTO pharmacy_duty (date,name,address,phone) VALUES (?,?,?,?) ON CONFLICT(date) DO UPDATE SET name=excluded.name,address=excluded.address,phone=excluded.phone",
        d.toISOString().slice(0, 10), name, address || null, phone || null,
      );
    }
  });
  audit(admin.id, "pharmacy.save", `${from}+${days}`);
  revalidatePath("/utiles");
  revalidatePath("/");
  revalidatePath("/panel/utiles");
  return { ok: `Cargamos ${days} ${days === 1 ? "día" : "días"} de turno.` };
}
