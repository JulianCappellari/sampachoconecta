"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession, getUser, noteAttempt, tooManyAttempts } from "@/lib/auth";
import { BARRIOS } from "@/lib/constants";
import { PHONE_RE, safeNext, text, type FormState } from "@/lib/types";

const registerSchema = z.object({
  name: z.string().min(2, "Escribí tu nombre completo.").max(80),
  email: z.string().email("Revisá el email: parece incompleto."),
  phone: z.string().regex(PHONE_RE, "El celular debe tener entre 8 y 20 números.").or(z.literal("")),
  barrio: z.enum(BARRIOS, { message: "Elegí tu barrio." }),
  password: z.string().min(8, "La contraseña necesita al menos 8 caracteres.").max(100),
});

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: text(fd, "name"),
    email: text(fd, "email").toLowerCase(),
    phone: text(fd, "phone"),
    barrio: text(fd, "barrio"),
    password: String(fd.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (fd.get("terms") !== "on") return { error: "Para registrarte tenés que aceptar la política de privacidad." };
  const d = parsed.data;
  if (one("SELECT 1 FROM users WHERE email = ?", d.email)) return { error: "Ese email ya tiene una cuenta. Probá ingresar." };
  // En el prototipo local la cuenta se verifica al instante. En producción se envía un email de confirmación.
  const { id } = run(
    "INSERT INTO users (name,email,phone,barrio,pass_hash,verified_at) VALUES (?,?,?,?,?,datetime('now'))",
    d.name,
    d.email,
    d.phone || null,
    d.barrio,
    hashPassword(d.password),
  );
  await createSession(id);
  redirect(safeNext(text(fd, "next")));
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = text(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Escribí tu email y tu contraseña." };
  if (tooManyAttempts(email)) return { error: "Demasiados intentos. Esperá 10 minutos y probá de nuevo." };
  const u = one<{ id: number; pass_hash: string; suspended: number }>(
    "SELECT id, pass_hash, suspended FROM users WHERE email = ?",
    email,
  );
  const ok = u ? verifyPassword(password, u.pass_hash) : verifyPassword(password, "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AA==");
  noteAttempt(email, !!(u && ok));
  if (!u || !ok) return { error: "El email o la contraseña no coinciden." };
  if (u.suspended) return { error: "Esta cuenta está suspendida. Escribile a la municipalidad." };
  await createSession(u.id);
  redirect(safeNext(text(fd, "next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().min(2, "Escribí tu nombre.").max(80),
  phone: z.string().regex(PHONE_RE, "El celular debe tener entre 8 y 20 números.").or(z.literal("")),
  barrio: z.enum(BARRIOS, { message: "Elegí tu barrio." }),
});

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/ingresar");
  const parsed = profileSchema.safeParse({ name: text(fd, "name"), phone: text(fd, "phone"), barrio: text(fd, "barrio") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  run(
    "UPDATE users SET name=?, phone=?, barrio=?, big_text=? WHERE id=?",
    parsed.data.name,
    parsed.data.phone || null,
    parsed.data.barrio,
    fd.get("big_text") === "on" ? 1 : 0,
    user.id,
  );
  revalidatePath("/", "layout");
  return { ok: "Guardamos tus datos." };
}
