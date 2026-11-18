import "./env.mts";
import { migrate, closeDb } from "../src/lib/db";
try {
  await migrate();
  console.log("Migraciones Postgres 1–4 aplicadas.");
} finally { await closeDb(); }
