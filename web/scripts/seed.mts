/**
 * Carga datos de prueba COMPLETOS (cuentas de todos los roles, y contenido de todos los módulos en todos sus estados).
 *
 *   npm run seed                          base vacía, desarrollo
 *   SEED_PASSWORD='…' npm run seed        elige la contraseña de las cuentas de prueba
 *   npm run seed -- --reset --yes         BORRA la base y las fotos de la carpeta de datos y vuelve a cargar
 *   npm run seed -- --no-photos           sin fotos de ejemplo
 *   npm run seed -- --reset --yes --no-seed  solo VACÍA la base y las fotos (para pasar al sitio real)
 *   npm run seed -- --allow-production    permite correrlo con NODE_ENV=production (staging / pruebas previas al lanzamiento)
 *
 * Protecciones: no corre en producción sin --allow-production; en producción exige SEED_PASSWORD (12+ caracteres);
 * no pisa una base con datos si no se pide --reset --yes. Detalle en docs/SEED_Y_PRODUCCION.md.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const args = new Set(process.argv.slice(2));
const production = process.env.NODE_ENV === "production";
function fail(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

if (production && !args.has("--allow-production")) {
  fail("Estás en NODE_ENV=production. Este comando carga cuentas de prueba con una contraseña que usted define. Si es un entorno de pruebas previo al lanzamiento, agregá --allow-production.");
}
const password = process.env.SEED_PASSWORD;
if (production && !args.has("--no-seed") && (!password || password.length < 12)) fail("En producción hace falta SEED_PASSWORD con al menos 12 caracteres.");
if (password && password.length < 8) fail("SEED_PASSWORD debe tener al menos 8 caracteres.");

// El seed automático del modo desarrollo no debe correr antes que este.
process.env.SEED_DISABLE_AUTO = "1";
const dataDir = process.env.SAMPACHO_DATA_DIR ?? path.join(process.cwd(), "data");
const uploadDir = path.join(dataDir, "uploads");

if (args.has("--reset")) {
  if (!args.has("--yes")) fail("--reset BORRA la base de datos y las fotos de " + dataDir + ". Repetí el comando agregando --yes para confirmar.");
  for (const f of ["sampacho.db", "sampacho.db-wal", "sampacho.db-shm"]) fs.rmSync(path.join(dataDir, f), { force: true });
  fs.rmSync(uploadDir, { recursive: true, force: true });
  console.log(`• Base y fotos de ${dataDir} borradas.`);
}

const { getDb } = await import("../src/lib/db");
const { seed, PHOTO_KEYS } = await import("../src/lib/seed");
const db = getDb();
if (args.has("--no-seed")) {
  if (!args.has("--reset")) fail("--no-seed se usa junto con --reset --yes.");
  console.log("\n✔ Base vacía y con el esquema al día. No se cargó ningún dato.\n");
  process.exit(0);
}
const existing = Number((db.prepare("SELECT COUNT(*) n FROM users").get() as { n: number }).n);
if (existing > 0) fail(`La base ya tiene ${existing} usuarios. Para empezar de cero: npm run seed -- --reset --yes`);

/* ── Fotos de ejemplo (placeholders generados, comprimidos a WebP como las reales) ── */
const files = new Map<string, string>();
if (!args.has("--no-photos")) {
  const { default: sharp } = await import("sharp");
  fs.mkdirSync(uploadDir, { recursive: true });
  const TITLES: Record<string, [string, string, string]> = {
    cena: ["Cena a beneficio", "#B83C78", "#5E1F40"], perro: ["Perrito perdido", "#C1571F", "#6B2E10"], "perro-encontrado": ["Perra encontrada", "#2D69C4", "#173768"],
    bici: ["Bicicleta rodado 26", "#8F6400", "#4A3300"], biblioteca: ["Biblioteca popular", "#2D69C4", "#173768"], feria: ["Feria de emprendedores", "#0E6B5A", "#07382F"],
    bache: ["Bache en la calle", "#4A5D56", "#1F2926"], luminaria: ["Luminaria apagada", "#2B3A4A", "#10161C"], contenedor: ["Contenedor desbordado", "#4A5D56", "#1F2926"],
    almacen: ["Almacén Don Pedro", "#0E6B5A", "#07382F"], panaderia: ["Panadería La Espiga", "#F2B02A", "#8A5A00"], cabanas: ["Cabañas El Algarrobo", "#2D8A4C", "#144625"],
    rotiseria: ["Rotisería Los Álamos", "#C1571F", "#6B2E10"], huerta: ["Huerta comunitaria", "#5E9A4B", "#2D4F23"], "pedido-ok": ["Pedido resuelto", "#0E6B5A", "#07382F"],
    jornada: ["Jornada de canteros", "#5E9A4B", "#2D4F23"], plaza: ["Plaza principal", "#7FB069", "#2F5A22"], estacion: ["Predio de la estación", "#8A6B4A", "#3E2E1C"],
  };
  const prefix = (k: string) => (["bache", "luminaria", "contenedor"].includes(k) ? "c" : ["almacen", "panaderia", "cabanas", "rotiseria"].includes(k) ? "l" : k === "huerta" ? "i" : "p");
  for (const k of PHOTO_KEYS) {
    const [label, a, b] = TITLES[k] ?? [k, "#0E6B5A", "#07382F"];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect width="1200" height="800" fill="url(#g)"/><circle cx="1010" cy="170" r="210" fill="#fff" opacity=".08"/><circle cx="170" cy="690" r="260" fill="#fff" opacity=".07"/>
      <g fill="#fff" font-family="Arial, Helvetica, sans-serif"><text x="70" y="690" font-size="84" font-weight="700">${label.replace(/&/g, "&amp;")}</text><text x="72" y="745" font-size="34" opacity=".8">Foto de ejemplo · Sampacho Conecta</text></g></svg>`;
    const name = `${prefix(k)}-${randomUUID()}.webp`;
    await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(path.join(uploadDir, name));
    files.set(k, name);
  }
  console.log(`• ${files.size} fotos de ejemplo generadas.`);
}

// Todo o nada: si algo falla, no queda una base a medio cargar.
let summary: ReturnType<typeof seed>;
db.exec("BEGIN");
try {
  summary = seed(db, { password, photo: (k) => files.get(k) ?? null });
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  fail("La carga falló y se revirtió: " + (e as Error).message);
}
const usedPassword = password ?? "(la de desarrollo, ver src/lib/seed.ts)";

console.log("\n✔ Datos de prueba cargados.\n");
console.log("Cuentas (todas con la misma contraseña):");
for (const a of summary.accounts) console.log(`  ${a.role.padEnd(10)} ${a.email.padEnd(34)} ${a.note}`);
console.log(`\nContraseña: ${password ? "la que definiste en SEED_PASSWORD" : usedPassword}`);
console.log("\nContenido cargado:");
for (const [t, n] of Object.entries(summary.counts)) console.log(`  ${t.padEnd(20)} ${n}`);
console.log("\nVer la guía de pruebas por rol: docs/SEED_Y_PRODUCCION.md\n");
