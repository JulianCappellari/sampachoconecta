import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { MIGRATIONS } from "./schema";
import { COMPATIBILITY_SQL, translate } from "./sql";

export { translate } from "./sql";
export type Param = string | number | boolean | Buffer | null | undefined;
types.setTypeParser(20, Number);
types.setTypeParser(1700, Number);

type Context = { client: PoolClient; savepoint: number };
const scope = new AsyncLocalStorage<Context>();
const state = globalThis as unknown as { scPg?: Pool; scPgReady?: Promise<void> };

function pool(): Pool {
  if (!state.scPg) {
    if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL para conectar Postgres.");
    state.scPg = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000, options: "-c TimeZone=UTC" });
    state.scPg.on("error", () => console.error("Se perdió una conexión inactiva a Postgres."));
  }
  return state.scPg;
}

/** Migraciones atómicas; el advisory lock también coordina procesos/instancias distintos. */
export async function migrate(): Promise<void> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(783184260)");
    await client.query(COMPATIBILITY_SQL);
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT datetime('now'))");
    const done = new Set((await client.query<{ id: number }>("SELECT id FROM schema_migrations")).rows.map(row => row.id));
    for (const migration of MIGRATIONS) {
      if (done.has(migration.id)) continue;
      await client.query(migration.sql);
      await client.query("INSERT INTO schema_migrations(id,name) VALUES($1,$2)", [migration.id, migration.name]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function initialize(): Promise<void> {
  // En un arranque con esquema actualizado alcanza una lectura; no recrear funciones/DDL.
  let applied: number[] = [];
  try { applied = (await pool().query<{id:number}>("SELECT id FROM schema_migrations")).rows.map(row => row.id); }
  catch (error) { if ((error as {code?:string}).code !== "42P01") throw error; }
  if (MIGRATIONS.some(m => !applied.includes(m.id))) await migrate();
  // Una aplicación en producción jamás crea cuentas conocidas automáticamente.
  if (process.env.NODE_ENV === "production" || process.env.SEED_DISABLE_AUTO === "1") return;
  await transaction(async () => {
    await scope.getStore()!.client.query("SELECT pg_advisory_xact_lock(783184261)");
    const existing = await scope.getStore()!.client.query<{ n: number }>("SELECT COUNT(*) n FROM users");
    if (existing.rows[0].n === 0) {
      const { seed } = await import("./seed");
      await seed();
    }
  });
}

async function ready(): Promise<void> {
  if (scope.getStore()) return;
  if (!state.scPgReady) state.scPgReady = initialize().catch(error => { state.scPgReady = undefined; throw error; });
  await state.scPgReady;
}

export async function getDb(): Promise<Pool> { await ready(); return pool(); }
export async function closeDb(): Promise<void> {
  if (state.scPg) await state.scPg.end();
  state.scPg = undefined;
  state.scPgReady = undefined;
}

/** Trabajo posterior a la respuesta: nunca hereda un cliente transaccional ya liberado. */
export function withoutTransaction<T>(fn: () => Promise<T>): Promise<T> { return scope.exit(fn); }

async function query<T extends QueryResultRow>(sql: string, params: Param[]) {
  await ready();
  const connection = scope.getStore()?.client ?? pool();
  return connection.query<T>(translate(sql), params.map(value => value === undefined ? null : value));
}

export async function all<T>(sql: string, ...params: Param[]): Promise<T[]> {
  return (await query(sql, params)).rows as T[];
}
export async function one<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
  return (await all<T>(sql, ...params))[0];
}

const TABLES_WITH_ID = new Set(MIGRATIONS.flatMap(migration => [...migration.sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(\s*id INTEGER/g)].map(match => match[1])));
export async function run(sql: string, ...params: Param[]): Promise<{ changes: number; id: number }> {
  const translated = translate(sql);
  const table = /^INSERT\s+INTO\s+(\w+)/i.exec(translated)?.[1];
  const returning = table && TABLES_WITH_ID.has(table) && !/\bRETURNING\b/i.test(translated);
  const result = await query(returning ? `${translated} RETURNING id` : translated, params);
  return { changes: result.rowCount ?? 0, id: Number(result.rows[0]?.id ?? 0) };
}

async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const parent = scope.getStore();
  if (parent) {
    const name = `nested_${++parent.savepoint}`;
    await parent.client.query(`SAVEPOINT ${name}`);
    try { const result = await fn(); await parent.client.query(`RELEASE SAVEPOINT ${name}`); return result; }
    catch (error) { await parent.client.query(`ROLLBACK TO SAVEPOINT ${name}`); await parent.client.query(`RELEASE SAVEPOINT ${name}`); throw error; }
  }
  // SQLite serializaba escrituras. SERIALIZABLE + reintento conserva las invariantes de cupos/versiones.
  for (let attempt = 0; ; attempt++) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const result = await scope.run({ client, savepoint: 0 }, fn);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      if (attempt < 3 && ["40001", "40P01"].includes((error as { code?: string }).code ?? "")) continue;
      throw error;
    } finally { client.release(); }
  }
}

export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  await ready();
  return transaction(fn);
}
