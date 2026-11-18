import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { one, run } from "./db";
import type { Role } from "./constants";
const COOKIE = "sc_session";
export { tooManyAttempts, noteAttempt } from "./login-limit";
const DAYS = 30;
export type User = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    barrio: string | null;
    role: Role;
    verified_at: string | null;
    big_text: number;
};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export async function createSession(userId: number) {
    const token = randomBytes(32).toString("base64url");
    await run("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now', ?))", sha(token), userId, `+${DAYS} days`);
    (await cookies()).set(COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: DAYS * 86400,
    });
}
export async function destroySession() {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (token)
        await run("DELETE FROM sessions WHERE token_hash = ?", sha(token));
    jar.delete(COOKIE);
}
/** Usuario de la sesión actual (o null). Se calcula una vez por pedido. */
export const getUser = cache(async (): Promise<User | null> => {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token)
        return null;
    const u = await one<User>(`SELECT u.id,u.name,u.email,u.phone,u.barrio,u.role,u.verified_at,u.big_text
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.suspended = 0`, sha(token));
    return u ?? null;
});
export async function requireUser(next?: string): Promise<User> {
    const u = await getUser();
    if (!u)
        redirect(`/ingresar${next ? `?next=${encodeURIComponent(next)}` : ""}`);
    return u;
}
export async function requireRole(roles: Role[], next?: string): Promise<User> {
    const u = await requireUser(next);
    if (!roles.includes(u.role))
        redirect("/");
    return u;
}
export const isStaff = (u: User | null) => u?.role === "municipio";
export const canModerate = (u: User | null) => u?.role === "moderador" || u?.role === "municipio";
export async function audit(userId: number | null, action: string, detail?: string) {
    await run("INSERT INTO audit (user_id,action,detail) VALUES (?,?,?)", userId, action, detail ?? null);
}
