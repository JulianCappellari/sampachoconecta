// Copia consistente de la base de datos mientras la app sigue funcionando.
// Genera /data/snapshot.sqlite (se sobrescribe); el script del servidor lo empaqueta junto con las fotos.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dir = process.env.SAMPACHO_DATA_DIR ?? path.join(process.cwd(), "data");
const source = path.join(dir, "sampacho.db");
const target = path.join(dir, "snapshot.sqlite");

if (!fs.existsSync(source)) {
  console.error("No se encontró la base en " + source);
  process.exit(1);
}
fs.rmSync(target, { force: true });
const db = new DatabaseSync(source);
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
db.close();
console.log("Copia de la base lista: " + target + " (" + Math.round(fs.statSync(target).size / 1024) + " KB)");
