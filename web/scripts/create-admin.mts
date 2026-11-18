/**
 * Crea (o promueve) una cuenta de la municipalidad. Es la forma de tener el primer administrador real en un entorno
 * nuevo, porque el registro público solo crea vecinos y los roles se asignan desde el panel.
 *
 *   ADMIN_PASSWORD='una contraseña larga' npm run create-admin -- --email=gestion@ejemplo.gob.ar --name="Municipalidad de Sampacho"
 *
 * Opciones: --role=municipio (por defecto) | moderador.
 * La contraseña viaja por variable de entorno para que no quede en el historial de la terminal ni en archivos.
 */
import { hashPassword } from "../src/lib/password";

const arg = (name: string) => process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim() ?? "Municipalidad de Sampacho";
const role = arg("role") ?? "municipio";
const password = process.env.ADMIN_PASSWORD;

if (!email || !/^\S+@\S+\.\S+$/.test(email)) fail("Indicá un email válido con --email=…");
if (!["municipio", "moderador"].includes(role)) fail("--role debe ser municipio o moderador.");
if (!password || password.length < 12) fail("Definí ADMIN_PASSWORD con al menos 12 caracteres.");

process.env.SEED_DISABLE_AUTO = "1"; // nunca cargar datos de ejemplo al crear un administrador
const { getDb } = await import("../src/lib/db");
const db = getDb();
const existing = db.prepare("SELECT id, role FROM users WHERE email = ?").get(email!) as { id: number; role: string } | undefined;

if (existing) {
  db.prepare("UPDATE users SET role = ?, pass_hash = ?, suspended = 0 WHERE id = ?").run(role, hashPassword(password!), existing.id);
  console.log(`\n✔ La cuenta ${email} ya existía: ahora es "${role}" y se actualizó su contraseña.\n`);
} else {
  db.prepare("INSERT INTO users (name,email,role,barrio,pass_hash,verified_at) VALUES (?,?,?,?,?,datetime('now'))").run(name, email!, role, "Centro", hashPassword(password!));
  console.log(`\n✔ Cuenta "${role}" creada: ${email}\n`);
}
