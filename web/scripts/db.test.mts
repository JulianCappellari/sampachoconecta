import "./env.mts";
import test from "node:test";
import assert from "node:assert/strict";
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith("_test") || !["127.0.0.1", "localhost"].includes(new URL(testUrl).hostname)) throw new Error("Definí TEST_DATABASE_URL hacia una base local cuyo nombre termine en _test. Nunca ejecutar contra producción.");
process.env.DATABASE_URL = testUrl;
process.env.SEED_DISABLE_AUTO = "1";
const { all, one, run, tx, migrate, closeDb, translate } = await import("../src/lib/db");
const { notifyUser } = await import("../src/lib/notify");
const { tooManyAttempts, noteAttempt } = await import("../src/lib/login-limit");
await test("Postgres y reglas de persistencia", async (suite) => {
suite.after(async () => { await closeDb(); });

await suite.test("migraciones repetibles, identidad, citext y UTC", async () => {
  await migrate(); await migrate();
  assert.deepEqual((await all<{id:number}>("SELECT id FROM schema_migrations ORDER BY id")).map(row => row.id), [1,2,3,4]);
  assert.equal((await one<{zone:string}>("SHOW timezone"))?.zone ?? (await one<{TimeZone:string}>("SHOW timezone"))?.TimeZone, "UTC");
});

await suite.test("placeholders no modifican literales/comentarios, LIKE o conflictos preexistentes", () => {
  assert.equal(translate("SELECT '?', ? -- ?\n, ? /* ? */ WHERE 'LIKE' LIKE ?;"), "SELECT '?', $1 -- ?\n, $2 /* ? */ WHERE 'LIKE' ILIKE $3");
  assert.equal(translate("INSERT OR IGNORE INTO kv (key,value) VALUES (?,?);"), "INSERT INTO kv (key,value) VALUES ($1,$2) ON CONFLICT DO NOTHING");
  assert.equal(translate("SELECT $$? LIKE$$, ?"), "SELECT $$? LIKE$$, $1");
  assert.equal(translate("SELECT ?, ?2, ?2, ?3"), "SELECT $1, $2, $2, $3");
  assert.match(translate("INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"), /ON CONFLICT\(key\)/);
});

await suite.test("datetime y julianday equivalen a los valores UTC conocidos", async () => {
  const row = await one<{a:string;b:string;c:string;d:number;e:number;f:string}>("SELECT datetime('2026-11-18 12:00:00','+24 hours') a, datetime('2026-11-18 12:00:00',?) b, datetime('2026-11-18T12:00:00-03:00') c, julianday('1970-01-01 00:00:00') d, julianday('2026-11-19')-julianday('2026-11-18') e, datetime('2026-11-18','-30 days') f", "+30 days");
  assert.deepEqual(row, {a:"2026-11-19 12:00:00", b:"2026-12-18 12:00:00", c:"2026-11-18 15:00:00", d:2440587.5, e:1, f:"2026-10-19 00:00:00"});
  await tx(async()=>{
    await run("SET LOCAL TimeZone='America/New_York'");
    assert.deepEqual(await one("SELECT datetime('1970-01-01 00:00:00') a,julianday('1970-01-01 00:00:00') b"),{a:'1970-01-01 00:00:00',b:2440587.5});
  });
});

await suite.test("tx comparte cliente, revierte y permite savepoints anidados", async () => {
  await assert.rejects(tx(async () => {
    await run("INSERT INTO kv(key,value) VALUES('test:rollback','outer')");
    await tx(async () => { assert.equal((await one<{value:string}>("SELECT value FROM kv WHERE key='test:rollback'"))?.value, "outer"); });
    await assert.rejects(tx(async () => { await run("UPDATE kv SET value='nested' WHERE key='test:rollback'"); throw new Error("savepoint"); }), /savepoint/);
    assert.equal((await one<{value:string}>("SELECT value FROM kv WHERE key='test:rollback'"))?.value, "outer");
    throw new Error("rollback final");
  }), /rollback final/);
  assert.equal(await one("SELECT 1 FROM kv WHERE key='test:rollback'"), undefined);
});

await suite.test("run devuelve identidad y OR IGNORE informa cero cambios", async () => {
  await assert.rejects(tx(async () => {
    const result = await run("INSERT INTO users(name,email,pass_hash) VALUES('Prueba','pg-test@sampacho.test','hash-no-real')");
    assert.ok(result.id > 0); assert.equal(result.changes, 1);
    assert.equal((await one<{id:number}>("SELECT id FROM users WHERE email = ?", "PG-TEST@SAMPACHO.TEST"))?.id, result.id);
    assert.equal((await run("INSERT OR IGNORE INTO users(name,email,pass_hash) VALUES('Prueba','pg-test@sampacho.test','x')")).changes, 0);
    throw new Error("rollback test");
  }), /rollback test/);
});

await suite.test("triggers impiden DELETE y TRUNCATE de reclamos e historial; reset solo transaccional", async () => {
  await assert.rejects(tx(async () => {
    const uid = (await run("INSERT INTO users(name,email,pass_hash) VALUES('Prueba','claim-test@sampacho.test','x')")).id;
    const cid = (await run("INSERT INTO claims(number,user_id,category,description) VALUES('R-TEST',?,'Otro','Prueba')", uid)).id;
    const eid = (await run("INSERT INTO claim_events(claim_id,user_id,status) VALUES(?,?,'recibido')", cid, uid)).id;
    await assert.rejects(tx(async () => { await run("DELETE FROM claims WHERE id=?", cid); }), /reclamos enviados/);
    await assert.rejects(tx(async () => { await run("DELETE FROM claim_events WHERE id=?", eid); }), /historial/);
    await assert.rejects(tx(async () => { await run("TRUNCATE claims CASCADE"); }), /reclamos enviados|historial/);
    await assert.rejects(tx(async () => { await run("TRUNCATE claim_events"); }), /historial/);
    await tx(async () => { await run("SET LOCAL sampacho.allow_reset='on'"); await run("DELETE FROM claim_events WHERE id=?", eid); await run("DELETE FROM claims WHERE id=?", cid); });
    throw new Error("rollback test");
  }), /rollback test/);
  assert.notEqual((await one<{v:string}>("SELECT current_setting('sampacho.allow_reset',true) v"))?.v, "on");
});

await suite.test("notificaciones simultáneas de un mismo hecho son idempotentes", async () => {
  const user = await one<{id:number}>("SELECT id FROM users WHERE email='marta@sampacho.test'");
  assert.ok(user, "Cargá el seed de prueba primero");
  const key = `test:notify:${Date.now()}`;
  try {
    await Promise.all(Array.from({length:8}, () => notifyUser(user.id, {class:"reclamo",eventKey:key,title:"Prueba"},{transactional:true})));
    assert.equal((await one<{n:number}>("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND event_key=?",user.id,key))?.n,1);
  } finally { await run("DELETE FROM notifications WHERE event_key=?",key); }
});

await suite.test("transacciones concurrentes conservan un incremento sin actualizaciones perdidas", async () => {
  await run("INSERT INTO kv(key,value) VALUES('test:counter','0') ON CONFLICT(key) DO UPDATE SET value='0'");
  try {
    await Promise.all(Array.from({length:4}, () => tx(async () => {
      const row = await one<{value:string}>("SELECT value FROM kv WHERE key='test:counter'");
      await run("UPDATE kv SET value=? WHERE key='test:counter'",String(Number(row!.value)+1));
    })));
    assert.equal((await one<{value:string}>("SELECT value FROM kv WHERE key='test:counter'"))?.value,"4");
  } finally { await run("DELETE FROM kv WHERE key='test:counter'"); }
});

await suite.test("límite de ingreso persistente: ocho intentos, bloqueo y limpieza al acertar", async () => {
  const email = 'limit-test@sampacho.test';
  await noteAttempt(email,true);
  try {
    for (let i=0;i<8;i++) assert.equal(await tooManyAttempts(email),false);
    assert.equal(await tooManyAttempts(email),true);
    await noteAttempt(email,true);
    assert.equal(await tooManyAttempts(email),false);
    await noteAttempt(email,true);
    const concurrent = await Promise.all(Array.from({length:12},()=>tooManyAttempts(email)));
    assert.equal(concurrent.filter(blocked=>!blocked).length,8);
  } finally { await noteAttempt(email,true); }
});

await suite.test("un upsert de respuesta conserva una sola fila e incrementa su versión",async()=>{
  await assert.rejects(tx(async()=>{
    const req=await one<{id:number;author_id:number}>("SELECT id,author_id FROM community_requests LIMIT 1");
    const listing=await one<{id:number;owner_id:number}>("SELECT id,owner_id FROM listings WHERE owner_id <> ? LIMIT 1",req!.author_id);
    const sql="INSERT INTO request_responses(request_id,listing_id,user_id,body) VALUES(?,?,?,'Prueba') ON CONFLICT(request_id,listing_id) DO UPDATE SET body=excluded.body,version=request_responses.version+1";
    const a=await run(sql,req!.id,listing!.id,listing!.owner_id);
    const before=await one<{version:number}>("SELECT version FROM request_responses WHERE id=?",a.id);
    const b=await run(sql,req!.id,listing!.id,listing!.owner_id);
    assert.equal(a.id,b.id);
    assert.equal((await one<{version:number}>("SELECT version FROM request_responses WHERE id=?",a.id))?.version,before!.version+1);
    throw new Error('rollback upsert');
  }),/rollback upsert/);
});

});
