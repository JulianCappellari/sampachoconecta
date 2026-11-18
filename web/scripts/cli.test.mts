import "./env.mts";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
const url=process.env.TEST_CLI_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_cli_test') || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Usá TEST_CLI_DATABASE_URL local, vacía y terminada en _cli_test. Esta prueba hace resets deliberados.');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sampacho-cli-test-'));
const secret=randomBytes(24).toString('base64url');
process.env.DATABASE_URL=url; process.env.SEED_DISABLE_AUTO='1';
const { all,one,run,closeDb,migrate }=await import('../src/lib/db');
const env={...process.env,DATABASE_URL:url,SEED_DISABLE_AUTO:'1',BLOB_READ_WRITE_TOKEN:'',ALLOW_LOCAL_UPLOADS:'1',SAMPACHO_DATA_DIR:dir,SEED_PASSWORD:secret,ADMIN_PASSWORD:secret,NODE_ENV:'production' as const};
async function command(script:string,args:string[]=[],success=true,extra:Record<string,string>={}) {
  let passed=true;
  try { await promisify(execFile)(process.execPath,['--conditions=react-server','--import=tsx',`scripts/${script}.mts`,...args],{env:{...env,...extra},timeout:60000}); }
  catch (error) {
    passed=false;
    if (success) throw new Error(`${script}: ${String((error as {stderr?:string}).stderr ?? 'falló el proceso').replace(/postgres(?:ql)?:\/\/\S+/g,'[conexión omitida]')}`);
  }
  assert.equal(passed,success,`${script} ${args.join(' ')}: resultado inesperado`);
}
const count=async()=> (await one<{n:number}>('SELECT COUNT(*) n FROM users'))!.n;
try {
  await migrate();
  assert.equal(await count(),0,'La base CLI de prueba debe empezar vacía. No se borrará una base previamente poblada.');
  await command('seed',[],false);
  await command('seed',['--allow-production'],false,{SEED_PASSWORD:'corta'});
  await command('seed',['--allow-production','--no-photos']); assert.equal(await count(),19);
  await command('seed',['--allow-production'],false);
  await command('seed',['--allow-production','--reset'],false); assert.equal(await count(),19);
  await command('seed',['--allow-production','--reset','--yes','--no-seed']); assert.equal(await count(),0);
  await command('create-admin',['--email=cli-test@sampacho.test','--name=Prueba CLI']);
  await command('create-admin',['--email=cli-test@sampacho.test','--name=Prueba CLI']); assert.equal(await count(),1);
  assert.equal((await one<{role:string}>("SELECT role FROM users"))?.role,'municipio');
  await command('seed',['--allow-production','--reset','--yes','--no-seed']);
  const source=path.join(dir,'source.db');
  const old=new DatabaseSync(source);
  old.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,email TEXT,pass_hash TEXT); INSERT INTO users VALUES(42,'Prueba','import-test@sampacho.test','hash-ficticio'); CREATE TABLE claims(id INTEGER PRIMARY KEY,number TEXT,user_id INTEGER,category TEXT,description TEXT); INSERT INTO claims VALUES(80,'R-IMPORT',42,'Otro','Prueba importada'); CREATE TABLE claim_events(id INTEGER PRIMARY KEY,claim_id INTEGER,user_id INTEGER,status TEXT); INSERT INTO claim_events VALUES(81,80,42,'recibido');");
  old.close();
  await command('import-sqlite',[`--source=${source}`,'--yes','--allow-production']);
  assert.equal(await count(),1); assert.equal((await one<{n:number}>('SELECT COUNT(*) n FROM claims'))?.n,1);
  assert.equal((await run("INSERT INTO users(name,email,pass_hash) VALUES('Prueba','sequence-test@sampacho.test','x')")).id,43);
  const verify=new DatabaseSync(source,{readOnly:true}); assert.equal(verify.prepare('SELECT COUNT(*) n FROM users').get()!.n,1); verify.close();
  await command('import-sqlite',[`--source=${source}`,'--yes','--allow-production'],false);
  await command('seed',['--allow-production','--reset','--yes','--no-seed']);
  await command('seed',['--allow-production']); assert.equal(await count(),19);
  assert.equal((await fs.readdir(path.join(dir,'uploads'))).length,18);
  console.log('PASS CLI: protecciones, seed completo, reset, create-admin idempotente, importación SQLite, origen intacto y secuencia de IDs.');
  // Deja el destino vacío para poder repetir la prueba.
  await command('seed',['--allow-production','--reset','--yes','--no-seed']);
  assert.equal((await all('SELECT * FROM claims')).length,0);
} finally {
  await closeDb();
  // Solo rutas directas dentro de la carpeta temporal creada por esta prueba; nunca borrado recursivo.
  for (const name of ['source.db','source.db-shm','source.db-wal']) await fs.unlink(path.join(dir,name)).catch(()=>undefined);
  const uploads=path.join(dir,'uploads');
  for (const name of await fs.readdir(uploads).catch(()=>[] as string[])) await fs.unlink(path.join(uploads,name));
  await fs.rmdir(uploads).catch(()=>undefined); await fs.rmdir(dir);
}
