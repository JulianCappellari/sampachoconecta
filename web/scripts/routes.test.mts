import "./env.mts";
import { randomBytes, createHash } from "node:crypto";
import assert from "node:assert/strict";
const url = process.env.TEST_DATABASE_URL;
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3138";
if (!url || !new URL(url).pathname.endsWith("_test") || !["127.0.0.1","localhost"].includes(new URL(url).hostname) || !["127.0.0.1","localhost"].includes(new URL(base).hostname)) throw new Error("Este recorrido solo admite la base y servidor locales de prueba.");
process.env.DATABASE_URL = url;
process.env.SEED_DISABLE_AUTO = "1";
const { all, one, run, closeDb } = await import("../src/lib/db");
const hashes: string[] = [];
const errors: string[] = [];
const publicRoutes = ["/","/muro","/guia","/oficios","/ideas","/agenda","/utiles","/mas","/privacidad","/necesito","/empleo","/encuestas","/residuos","/visitar","/transparencia","/resultados","/offline","/ingresar","/registro","/api/salud","/muro?cat=venta&q=bici&p=2","/guia?q=ALMACEN","/necesito?cerrados=1","/empleo?tipo=busco","/ideas?estado=realizada"];
const privateRoutes = ["/reclamos","/perfil","/siguiendo","/notificaciones","/muro/nueva","/guia/nuevo","/ideas/nueva","/reclamos/nuevo","/necesito/nuevo","/empleo/nuevo","/encuestas/nueva","/panel","/panel/alertas","/panel/contenido","/panel/destacados","/panel/incidentes","/panel/moderacion","/panel/reclamos","/panel/residuos","/panel/turismo","/panel/usuarios","/panel/utiles"];
try {
  const fixtures: string[] = [];
  for (const [table,path] of [["posts","muro"],["listings","guia"],["ideas","ideas"],["community_requests","necesito"],["jobs","empleo"],["polls","encuestas"],["incidents","panel/incidentes"]]) {
    for (const row of await all<{id:number}>(`SELECT id FROM ${table} ORDER BY id LIMIT 3`)) fixtures.push(`/${path}/${row.id}`);
  }
  const claim = await one<{id:number;user_id:number;photos:string}>("SELECT id,user_id,photos FROM claims WHERE photos <> '[]' ORDER BY id LIMIT 1");
  assert.ok(claim);
  fixtures.push(`/reclamos/${claim.id}`);
  const photo = JSON.parse(claim.photos)[0] as string;
  const owner=(await one<{email:string}>("SELECT email FROM users WHERE id=?",claim.user_id))!.email;
  const roles = [null,"marta@sampacho.test","moderacion@sampacho.test","municipio@sampacho.test","suspendido@sampacho.test"];
  if (!roles.includes(owner)) roles.push(owner);
  for (const type of ['comment','request','response','listing','rating','idea','outcome','job','poll']) fixtures.push(`/panel/contenido?tipo=${type}`);
  fixtures.push('/panel/usuarios?q=MAR','/panel/reclamos?estado=resuelto');
  const event=await one<{id:number}>("SELECT id FROM posts WHERE category='evento' AND deleted=0 AND hidden=0 LIMIT 1");
  if (event) fixtures.push(`/api/ics/${event.id}`);
  let requests = 0;
  for (const email of roles) {
    let cookie = "";
    const user = email ? await one<{id:number;role:string;suspended:number}>("SELECT id,role,suspended FROM users WHERE email=?",email) : null;
    if (email) {
      assert.ok(user);
      const token = randomBytes(32).toString("base64url");
      const hash = createHash("sha256").update(token).digest("hex");
      hashes.push(hash);
      await run("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+1 day'))",hash,user.id);
      cookie = `sc_session=${token}`;
    }
    for (const path of [...publicRoutes,...privateRoutes,...fixtures,`/api/fotos/${photo}`]) {
      const response = await fetch(base+path,{headers:cookie ? {Cookie:cookie}:undefined,redirect:"manual",signal:AbortSignal.timeout(20000)});
      const body = await response.text(); requests++;
      const role = email?.split('@')[0] ?? "visitante";
      if (response.status >= 500 || (response.status===200 && /Application error:|Internal Server Error/.test(body))) errors.push(`${role} ${path}: ${response.status}`);
      if (['/utiles','/agenda','/residuos','/visitar','/transparencia','/privacidad'].includes(path) && response.headers.get('x-sampacho-offline-public') !== (cookie ? '0' : '1')) errors.push(`${role}: autorización de caché offline incorrecta`);
      if (path===`/reclamos/${claim.id}` && user && !user.suspended && user.role!=="municipio" && user.id!==claim.user_id && response.status!==404) errors.push(`${role}: reclamo ajeno no devolvió 404`);
      if (path.startsWith('/api/fotos/')) {
        const allowed=user && !user.suspended && (user.id===claim.user_id || user.role==='municipio');
        if (allowed && response.status!==200) errors.push(`${role}: foto propia no disponible`);
        if (!allowed && ![401,403,404].includes(response.status)) errors.push(`${role}: foto privada accesible`);
        if (allowed && response.headers.get('cache-control')!=='private, no-store') errors.push(`${role}: caché privada incorrecta`);
        if (!allowed && response.headers.get('cache-control')!=='private, no-store') errors.push(`${role}: error de foto privada sin no-store`);
      }
    }
  }
  console.log(`Recorrido HTTP: ${requests} lecturas, cinco roles y autor de la foto privada, ${errors.length} errores.`);
  assert.deepEqual(errors,[]);
} finally {
  for (const hash of hashes) await run("DELETE FROM sessions WHERE token_hash=?",hash);
  await closeDb();
}
