import "./env.mts";
import path from "node:path";
import fs from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { MIGRATIONS } from "../src/lib/schema";

// Herramienta de transición ejecutada en la PC, nunca importada por la aplicación.
const args = process.argv.slice(2);
const source = args.find(arg => arg.startsWith("--source="))?.slice(9);
if (!source || !args.includes("--yes")) throw new Error("Usá --source=ruta/sampacho.db --yes; destino Postgres vacío en DATABASE_URL.");
if (process.env.NODE_ENV === "production" && !args.includes("--allow-production")) throw new Error("Para importar en producción agregá --allow-production.");
process.env.SEED_DISABLE_AUTO = "1";
const { all, run, tx, closeDb } = await import("../src/lib/db");
const { IMAGE_NAME_RE, storeImage, deleteImages } = await import("../src/lib/uploads");
const tables = [...new Set(MIGRATIONS.flatMap(m => [...m.sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(match => match[1])))];
const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
const old = new DatabaseSync(path.resolve(source), { readOnly: true });
const copied: string[] = [];
try {
  old.exec("BEGIN"); // Snapshot estable; cerrá antes la app SQLite para incluir todas sus últimas escrituras.
  const existing = old.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name:string}[];
  const unknown = existing.filter(t => t.name !== "schema_migrations" && !tables.includes(t.name));
  if (unknown.length) throw new Error("El origen tiene tablas desconocidas. Revisá su versión antes de importar.");
  for (const table of tables) {
    const count = await all<{n:number}>(`SELECT COUNT(*) n FROM ${quote(table)}`);
    if (count[0].n) throw new Error("El destino tiene datos: la importación solo admite un Postgres vacío.");
  }
  const sourceUploads = path.join(path.dirname(path.resolve(source)), "uploads");
  const destUploads = path.resolve(process.env.SAMPACHO_DATA_DIR ?? path.join(process.cwd(), "data"), "uploads");
  const names = (await fs.readdir(sourceUploads).catch((e: NodeJS.ErrnoException) => { if (e.code === "ENOENT") return []; throw e; })).filter(n => IMAGE_NAME_RE.test(n));
  const available = new Set(names);
  for (const table of existing.filter(t => tables.includes(t.name))) {
    const columns = old.prepare(`PRAGMA table_info(${quote(table.name)})`).all();
    if (!columns.some(c => c.name === 'photos')) continue;
    for (const row of old.prepare(`SELECT photos FROM ${quote(table.name)}`).all()) {
      const references: unknown = row.photos ? JSON.parse(String(row.photos)) : [];
      if (!Array.isArray(references) || references.some(n => typeof n !== 'string' || !available.has(n))) throw new Error('Faltan fotos referenciadas por el origen. Completá la copia de uploads antes de importar.');
    }
  }
  if (process.env.BLOB_READ_WRITE_TOKEN || sourceUploads !== destUploads) {
    for (const name of names) { await storeImage(name, await fs.readFile(path.join(sourceUploads,name))); copied.push(name); }
  }
  let total = 0;
  await tx(async () => {
    await run(`LOCK TABLE ${tables.map(quote).join(',')} IN ACCESS EXCLUSIVE MODE`);
    for (const table of tables) {
      if ((await all<{n:number}>(`SELECT COUNT(*) n FROM ${quote(table)}`))[0].n) throw new Error('El destino recibió datos durante la preparación. Importación cancelada sin mezclar entornos.');
    }
    total = 0;
    for (const table of tables) {
      if (!existing.some(t => t.name === table)) continue;
      const rows = old.prepare(`SELECT * FROM ${quote(table)}`).all();
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]);
      const allowed = new Set((await all<{column_name:string}>("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=?",table)).map(c=>c.column_name));
      if (columns.some(c => !allowed.has(c))) throw new Error("El origen contiene columnas desconocidas; no se omitirán datos.");
      for (const row of rows) {
        await run(`INSERT INTO ${quote(table)} (${columns.map(quote).join(',')}) VALUES (${columns.map(()=>'?').join(',')})`, ...columns.map(c => {
          const value = row[c];
          return typeof value === "bigint" ? String(value) : value instanceof Uint8Array ? Buffer.from(value) : value;
        }));
        total++;
      }
      if (columns.includes('id')) await run(`SELECT setval(pg_get_serial_sequence(?, 'id'), COALESCE((SELECT MAX(id) FROM ${quote(table)}),1), EXISTS(SELECT 1 FROM ${quote(table)}))`,table);
    }
  });
  old.exec("COMMIT");
  console.log(`Importación confirmada: ${total} registros y ${names.length} fotos. Origen intacto. No se borró ningún dato.`);
} catch (error) {
  await deleteImages(copied).catch(() => undefined);
  throw error;
} finally { old.close(); await closeDb(); }
