import "server-only";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seed } from "./seed";

const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT,
  barrio TEXT,
  role TEXT NOT NULL DEFAULT 'vecino',
  pass_hash TEXT NOT NULL,
  verified_at TEXT,
  suspended INTEGER NOT NULL DEFAULT 0,
  big_text INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  photos TEXT NOT NULL DEFAULT '[]',
  price REAL,
  condition TEXT,
  contact_phone TEXT,
  event_at TEXT,
  event_place TEXT,
  pinned_until TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_cat ON posts(category, created_at);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(kind, target_id);

CREATE TABLE IF NOT EXISTS likes (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (kind, target_id, user_id)
);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT,
  lat REAL,
  lng REAL,
  photos TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'recibido',
  area TEXT,
  rating INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status, created_at);

CREATE TABLE IF NOT EXISTS claim_events (
  id INTEGER PRIMARY KEY,
  claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT,
  zone TEXT,
  lat REAL,
  lng REAL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  open_time TEXT,
  close_time TEXT,
  open_days TEXT,
  license TEXT,
  emergency INTEGER NOT NULL DEFAULT 0,
  photos TEXT NOT NULL DEFAULT '[]',
  verified INTEGER NOT NULL DEFAULT 0,
  avg REAL NOT NULL DEFAULT 0,
  count INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_listings_kind ON listings(kind, category);

CREATE TABLE IF NOT EXISTS ratings (
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review TEXT,
  reply TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (listing_id, user_id)
);

CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'propuesta',
  group_link TEXT,
  photo TEXT,
  municipal INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS idea_supports (
  idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE IF NOT EXISTS phones (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  category TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pharmacy_duty (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/* ───────────── Migraciones numeradas ─────────────
 * Cada una corre una sola vez, dentro de una transacción. Son aditivas: columnas nuevas con
 * valores por defecto seguros y tablas nuevas. Nunca se borran datos existentes.
 */
function addColumn(db: DatabaseSync, table: string, column: string, def: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
}

const MIGRATIONS: { id: number; name: string; up: (db: DatabaseSync) => void }[] = [
  { id: 1, name: "base", up: (db) => db.exec(SCHEMA) },
  {
    id: 2,
    name: "funciones-comunitarias",
    up: (db) => {
      // Hoy en Sampacho: vigencia y alcance de avisos, eventos con fin y cancelación.
      addColumn(db, "posts", "starts_at", "TEXT");
      addColumn(db, "posts", "ends_at", "TEXT");
      addColumn(db, "posts", "severity", "TEXT NOT NULL DEFAULT 'informativo'");
      addColumn(db, "posts", "lifecycle", "TEXT NOT NULL DEFAULT 'active'");
      addColumn(db, "posts", "zone", "TEXT");
      addColumn(db, "posts", "event_end_at", "TEXT");
      addColumn(db, "posts", "updated_at", "TEXT");
      // Reclamos: próxima actualización, versión (concurrencia) e incidente interno.
      addColumn(db, "claims", "next_update_at", "TEXT");
      addColumn(db, "claims", "version", "INTEGER NOT NULL DEFAULT 1");
      addColumn(db, "claims", "incident_id", "INTEGER");
      addColumn(db, "claims", "updated_at", "TEXT");
      // Los comentarios históricos que ya veía el autor quedan visibles para él.
      addColumn(db, "claim_events", "visibility", "TEXT NOT NULL DEFAULT 'author'");
      addColumn(db, "claim_events", "kind", "TEXT NOT NULL DEFAULT 'status'");
      // Ideas: cierre explicado y versión.
      addColumn(db, "ideas", "closing_note", "TEXT");
      addColumn(db, "ideas", "version", "INTEGER NOT NULL DEFAULT 1");
      db.exec(`
      CREATE TABLE IF NOT EXISTS follows (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL CHECK (target_type IN ('tema','ficha','zona')),
        target_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, target_type, target_id)
      );
      CREATE TABLE IF NOT EXISTS notification_prefs (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class TEXT NOT NULL CHECK (class IN ('avisos','novedades','pedidos')),
        frequency TEXT NOT NULL DEFAULT 'inmediata' CHECK (frequency IN ('inmediata','diaria','semanal','desactivada')),
        PRIMARY KEY (user_id, class)
      );
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        quiet_start TEXT NOT NULL DEFAULT '22:00',
        quiet_end TEXT NOT NULL DEFAULT '08:00',
        urgent_override INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class TEXT NOT NULL,
        event_key TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        href TEXT,
        reason TEXT,
        urgent INTEGER NOT NULL DEFAULT 0,
        deliver_after TEXT NOT NULL DEFAULT (datetime('now')),
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (user_id, event_key)
      );
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read_at, deliver_after);

      CREATE TABLE IF NOT EXISTS community_requests (
        id INTEGER PRIMARY KEY,
        author_id INTEGER NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL CHECK (kind IN ('producto','servicio')),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        category TEXT NOT NULL,
        zone TEXT,
        photos TEXT NOT NULL DEFAULT '[]',
        expires_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','resuelto','cancelado')),
        chosen_response_id INTEGER,
        hidden INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        closed_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_requests_open ON community_requests(status, expires_at, category);
      CREATE TABLE IF NOT EXISTS request_responses (
        id INTEGER PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES community_requests(id) ON DELETE CASCADE,
        listing_id INTEGER NOT NULL REFERENCES listings(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','retirada','oculta')),
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        UNIQUE (request_id, listing_id)
      );

      CREATE TABLE IF NOT EXISTS community_outcomes (
        id INTEGER PRIMARY KEY,
        source_type TEXT NOT NULL CHECK (source_type IN ('pedido','publicacion','idea')),
        source_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL REFERENCES users(id),
        body TEXT NOT NULL,
        photos TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado','oculto')),
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (source_type, source_id)
      );

      CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        place TEXT,
        area TEXT,
        status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','cerrado')),
        summary TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS incident_events (
        id INTEGER PRIMARY KEY,
        incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL,
        claim_id INTEGER,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS idea_needs (
        id INTEGER PRIMARY KEY,
        idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('personas','materiales','herramientas','espacio','permiso')),
        description TEXT NOT NULL,
        target INTEGER NOT NULL CHECK (target > 0),
        unit TEXT NOT NULL DEFAULT 'unidades',
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta','cerrada')),
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS idea_commitments (
        id INTEGER PRIMARY KEY,
        need_id INTEGER NOT NULL REFERENCES idea_needs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        proposed INTEGER NOT NULL CHECK (proposed > 0),
        accepted INTEGER NOT NULL DEFAULT 0,
        fulfilled INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aceptada','cumplida','retirada','rechazada')),
        note TEXT,
        reason TEXT,
        public_name INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        UNIQUE (need_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS idea_updates (
        id INTEGER PRIMARY KEY,
        idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL DEFAULT 'novedad',
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS idea_permission_requests (
        id INTEGER PRIMARY KEY,
        idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_revision','aprobado','rechazado')),
        reference TEXT,
        decided_by INTEGER REFERENCES users(id),
        decided_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_claims_next ON claims(status, next_update_at);
      `);
    },
  },
  {
    id: 3,
    name: "reclamos-inborrables",
    // Defensa en profundidad: ningún rol ni ruta de código puede eliminar un reclamo ni su historial.
    up: (db) =>
      db.exec(`
      CREATE TRIGGER IF NOT EXISTS claims_no_delete BEFORE DELETE ON claims
      BEGIN SELECT RAISE(ABORT, 'Los reclamos enviados a la municipalidad no se pueden eliminar'); END;
      CREATE TRIGGER IF NOT EXISTS claim_events_no_delete BEFORE DELETE ON claim_events
      BEGIN SELECT RAISE(ABORT, 'El historial de un reclamo no se puede eliminar'); END;
      `),
  },
  {
    id: 4,
    name: "encuestas-alertas-residuos-empleo-turismo-destacados-push",
    up: (db) => {
      addColumn(db, "posts", "alert_kind", "TEXT");
      addColumn(db, "notifications", "pushed_at", "TEXT");
      db.exec(`
      CREATE TABLE IF NOT EXISTS polls (
        id INTEGER PRIMARY KEY,
        author_id INTEGER NOT NULL REFERENCES users(id),
        question TEXT NOT NULL,
        body TEXT,
        zone TEXT,
        closes_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta','cerrada')),
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS poll_options (
        id INTEGER PRIMARY KEY,
        poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        sort INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS poll_votes (
        poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (poll_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS waste_schedule (
        id INTEGER PRIMARY KEY,
        zone TEXT NOT NULL,
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        kind TEXT NOT NULL CHECK (kind IN ('comun','reciclables','verde','voluminosos')),
        note TEXT,
        UNIQUE (zone, weekday, kind)
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY,
        author_id INTEGER NOT NULL REFERENCES users(id),
        kind TEXT NOT NULL CHECK (kind IN ('oferta','busco')),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        category TEXT NOT NULL,
        zone TEXT,
        contact_phone TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta','cubierta')),
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_open ON jobs(status, expires_at, kind);
      CREATE TABLE IF NOT EXISTS tourist_places (
        id INTEGER PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('atractivo','fiesta','consejo')),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        address TEXT,
        lat REAL,
        lng REAL,
        sort INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS featured_listings (
        id INTEGER PRIMARY KEY,
        listing_id INTEGER NOT NULL REFERENCES listings(id),
        week_start TEXT NOT NULL,
        pitch TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'postulado' CHECK (status IN ('postulado','elegido')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (listing_id, week_start)
      );
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      `);
    },
  },
];

function migrate(db: DatabaseSync) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
  const done = new Set((db.prepare("SELECT id FROM schema_migrations").all() as { id: number }[]).map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    db.exec("BEGIN");
    try {
      m.up(db);
      db.prepare("INSERT INTO schema_migrations (id,name) VALUES (?,?)").run(m.id, m.name);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw new Error(`La migración ${m.id} (${m.name}) falló y se revirtió: ${(e as Error).message}`);
    }
  }
}

const g = globalThis as unknown as { __scDb?: DatabaseSync };

function open(): DatabaseSync {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "sampacho.db"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(db);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (n === 0) seed(db);
  return db;
}

const gm = globalThis as unknown as { __scMigrated?: number };

export function getDb(): DatabaseSync {
  if (!g.__scDb) g.__scDb = open();
  // En desarrollo el módulo se recarga sin reabrir la base: aplicar migraciones nuevas si faltan.
  if (gm.__scMigrated !== MIGRATIONS.length) {
    migrate(g.__scDb);
    gm.__scMigrated = MIGRATIONS.length;
  }
  return g.__scDb;
}

type Param = SQLInputValue | undefined;
const norm = (params: Param[]): SQLInputValue[] =>
  params.map((p) => (p === undefined ? null : p));

/** Devuelve todas las filas. */
export function all<T>(sql: string, ...params: Param[]): T[] {
  return getDb().prepare(sql).all(...norm(params)) as unknown as T[];
}
/** Devuelve la primera fila o undefined. */
export function one<T>(sql: string, ...params: Param[]): T | undefined {
  return getDb().prepare(sql).get(...norm(params)) as unknown as T | undefined;
}
/** Ejecuta una escritura. */
export function run(sql: string, ...params: Param[]) {
  const r = getDb().prepare(sql).run(...norm(params));
  return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
}
/** Ejecuta varias escrituras en una transacción. */
export function tx<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
