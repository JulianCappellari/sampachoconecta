import "./env.mts";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash,randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import ts from "typescript";
const url=process.env.TEST_DATABASE_URL;
const base=process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3138';
if (!url || !new URL(url).pathname.endsWith('_test') || !['localhost','127.0.0.1'].includes(new URL(url).hostname) || !['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Solo servidor y Postgres locales de prueba terminados en _test.');
process.env.DATABASE_URL=url; process.env.SEED_DISABLE_AUTO='1';
const {one,all,run,closeDb}=await import('../src/lib/db');
// Contrato de integración Next 16: usa el manifiesto de SU build y el codificador oficial de Flight.
const {encodeReply}=createRequire(import.meta.url)('next/dist/compiled/react-server-dom-turbopack/client.node') as {encodeReply:(args:unknown[])=>Promise<FormData|string>};
const manifest=JSON.parse(await fs.readFile('.next/server/server-reference-manifest.json','utf8')).node as Record<string,{filename:string;exportedName:string;workers:Record<string,unknown>}>;
const entries=Object.entries(manifest);
const hashes:string[]=[];
const cookies=new Map<string,string>();
const covered=new Set<string>(),successful=new Set<string>(); let calls=0;
const fd=(values:Record<string,string|string[]>)=>{const f=new FormData();for(const [k,v] of Object.entries(values)) for(const x of Array.isArray(v)?v:[v]) f.append(k,x);return f;};
async function cookie(email:string) {
  if(cookies.has(email)) return cookies.get(email)!;
  const user=await one<{id:number}>('SELECT id FROM users WHERE email=?',email); assert.ok(user);
  const token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');hashes.push(hash);
  await run("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+1 day'))",hash,user.id);
  const value=`sc_session=${token}`;cookies.set(email,value);return value;
}
async function call(name:string,args:unknown[],email:string|null=null,allowError=false) {
  const matches=entries.filter(([,m])=>m.exportedName===name); assert.equal(matches.length,1,`${name}: exportación ambigua o ausente`);
  const [id,m]=matches[0];
  const worker=Object.keys(m.workers).find(w=>!w.includes('[')) ?? Object.keys(m.workers)[0];
  const route=worker.replace(/^app/,'').replace(/\/page$/,'').replace(/\[id\]/g,'1') || '/';
  const body=await encodeReply(args);
  const response=await fetch(base+route,{method:'POST',redirect:'manual',headers:{Origin:base,'Next-Action':id,Accept:'text/x-component',...(typeof body==='string'?{'Content-Type':'text/plain;charset=UTF-8'}:{}),...(email?{Cookie:await cookie(email)}:{})},body,signal:AbortSignal.timeout(20000)});
  const text=await response.text();calls++;covered.add(name);
  assert.ok(response.status<500,`${name}: HTTP ${response.status}`);
  assert.ok(!/:E\{/.test(text) || text.includes('NEXT_REDIRECT'),`${name}: excepción de servidor`);
  const state=text.split('\n').map(line=>/^\w+:(\{.*\})$/.exec(line)?.[1]).filter(Boolean).map(value=>{try{return JSON.parse(value!) as {error?:string;ok?:string};}catch{return {};}}).find(value=>value.error||value.ok);
  if(!allowError) assert.ok(!state?.error,`${name}: ${state?.error}`);
  if(!allowError && (email || ['register','login','setZone'].includes(name))) successful.add(name);
  return {response,text,state};
}
const neighbor='marta@sampacho.test', helper='luis@sampacho.test', muni='municipio@sampacho.test', mod='moderacion@sampacho.test';
try {
  // Cada exportación prueba su entrada HTTP sin sesión. No llama a funciones del servidor directamente.
  for(const [,m] of entries) {
    const source=ts.createSourceFile(m.filename,await fs.readFile(m.filename,'utf8'),ts.ScriptTarget.Latest,true);
    const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===m.exportedName) as ts.FunctionDeclaration|undefined;
    assert.ok(fn,`No se encontró firma de ${m.exportedName}`);
    const args=fn.parameters.map(p=>{const t=p.type?.getText(source)??'';return t.includes('FormData')?new FormData():t.includes('FormState')?null:t==='number'?-1:t==='boolean'?false:t==='unknown'?{}:'';});
    await call(m.exportedName,args,null,true);
  }
  await call('savePrefs',[null,fd({freq_avisos:'inmediata',freq_novedades:'diaria',freq_pedidos:'semanal',quiet_start:'22:00',quiet_end:'08:00'})],neighbor);
  await call('setFollow',['tema','encuestas',true],neighbor);
  await call('setFollow',['zona','Centro',true],neighbor);
  await call('markAllRead',[],neighbor);
  await call('createPost',[null,fd({category:'noticia',title:'QA HTTP noticia',body:'Contenido sintético de integración contra Postgres.'})],neighbor);
  const post=(await one<{id:number}>("SELECT id FROM posts WHERE title='QA HTTP noticia' ORDER BY id DESC LIMIT 1"))!.id;
  await call('toggleLike',[post],helper); await call('addComment',['post',post,null,fd({body:'Comentario QA HTTP'})],helper);
  await call('reportContent',['post',post,null,fd({reason:'Es spam o publicidad'})],helper);
  await call('createIdea',[null,fd({title:'QA HTTP idea',body:'Idea ficticia de integración para validar necesidades y permisos locales.',category:'Espacios verdes'})],neighbor);
  const idea=(await one<{id:number}>("SELECT id FROM ideas WHERE title='QA HTTP idea' ORDER BY id DESC LIMIT 1"))!.id;
  await call('addNeed',[idea,null,fd({kind:'personas',description:'QA HTTP personas',target:'2',unit:'personas'})],neighbor);
  const need=(await one<{id:number}>("SELECT id FROM idea_needs WHERE idea_id=?",idea))!.id;
  await call('proposeCommitment',[need,null,fd({qty:'2',note:'Propuesta QA HTTP'})],helper);
  const commitment=(await one<{id:number}>("SELECT id FROM idea_commitments WHERE need_id=?",need))!.id;
  await call('decideCommitment',[commitment,'accept',null,fd({qty:'2'})],neighbor);
  await call('confirmFulfillment',[commitment,null,fd({qty:'1'})],neighbor);
  await call('addPermission',[idea,null,fd({description:'Permiso sintético QA HTTP'})],neighbor);
  const permission=(await one<{id:number}>("SELECT id FROM idea_permission_requests WHERE idea_id=?",idea))!.id;
  await call('reviewPermission',[permission,null,fd({status:'aprobado',reference:'EXP-QA-LOCAL'})],muni);
  await call('postIdeaUpdate',[idea,null,fd({kind:'novedad',body:'Actualización sintética QA HTTP'})],neighbor);
  await call('setGroupLink',[idea,null,fd({group_link:'https://chat.whatsapp.com/QAHttpSyntheticGroup2026'})],neighbor);
  await call('toggleSupport',[idea],helper);
  await call('createPoll',[null,fd({question:'¿Consulta sintética de QA HTTP?',days:'2',option:['Primera','Segunda']})],muni);
  const poll=(await one<{id:number}>("SELECT id FROM polls WHERE question='¿Consulta sintética de QA HTTP?' ORDER BY id DESC LIMIT 1"))!.id;
  const option=(await one<{id:number}>('SELECT id FROM poll_options WHERE poll_id=? ORDER BY id LIMIT 1',poll))!.id;
  await call('vote',[poll,null,fd({option:String(option)})],neighbor);
  await call('vote',[poll,null,fd({option:String(option)})],neighbor,true);
  assert.equal((await one<{n:number}>('SELECT COUNT(*) n FROM poll_votes WHERE poll_id=?',poll))?.n,1);
  await call('closePoll',[poll],muni);
  await call('addSlot',[null,fd({zone:'Centro',weekday:'0',kind:'comun',note:'QA HTTP'})],muni);
  await call('addPlace',[null,fd({kind:'atractivo',name:'QA HTTP lugar',description:'Lugar ficticio para verificar gestión municipal.'})],muni);
  await call('addPhone',[null,fd({name:'QA HTTP servicio',number:'3584000999',category:'Servicios'})],muni);
  await call('savePharmacy',[null,fd({from:'2026-12-28',days:'2',name:'Farmacia QA HTTP',address:'Dirección ficticia',phone:'3584000999'})],muni);
  await call('removeContent',['post',post],mod);
  assert.equal((await one<{deleted:number}>('SELECT deleted FROM posts WHERE id=?',post))?.deleted,1);

  // Cuenta nueva por corrida: registro/ingreso reales por HTTP, sin almacenar su contraseña en archivos.
  const actor=`http-${randomBytes(6).toString('hex')}@sampacho.test`, password=randomBytes(24).toString('base64url');
  await call('register',[null,fd({name:'QA HTTP vecino',email:actor,password,phone:'',barrio:'Centro',terms:'on'})]);
  const actorId=(await one<{id:number}>('SELECT id FROM users WHERE email=?',actor))!.id;
  for (const limited of [helper,mod]) {
    const denied=await call('setUserRole',[actorId,fd({role:'municipio'})],limited,true);
    assert.ok(denied.text.includes('NEXT_REDIRECT') || denied.response.headers.has('x-action-redirect') || denied.response.headers.has('location'));
  }
  assert.equal((await one<{role:string}>('SELECT role FROM users WHERE id=?',actorId))?.role,'vecino');
  await call('login',[null,fd({email:actor,password:'incorrecta-de-prueba'})],null,true);
  await call('login',[null,fd({email:actor,password})]);
  await call('updateProfile',[null,fd({name:'QA HTTP vecino actualizado',phone:'',barrio:'Centro',big_text:'on'})],actor);
  assert.equal((await one<{big_text:number}>('SELECT big_text FROM users WHERE id=?',actorId))?.big_text,1);
  await call('setZone',['Centro']);

  await call('createListing',['comercio',null,fd({name:'QA HTTP comercio',description:'Comercio ficticio con descripción completa para verificar toda la guía.',phone:'3584000999',category:'Servicios',address:'Dirección ficticia QA',lat:'-33.38',lng:'-64.72',open_time:'08:00',close_time:'18:00',days:['1','2','3','4','5']})],actor);
  const listing=(await one<{id:number}>('SELECT id FROM listings WHERE owner_id=? ORDER BY id DESC LIMIT 1',actorId))!.id;
  const helperId=(await one<{id:number}>('SELECT id FROM users WHERE email=?',helper))!.id;
  await call('rateListing',[listing,null,fd({stars:'5',review:'Opinión sintética QA HTTP'})],helper);
  await call('rateListing',[listing,null,fd({stars:'4',review:'Opinión sintética actualizada'})],helper);
  assert.deepEqual(await one('SELECT avg,count FROM listings WHERE id=?',listing),{avg:4,count:1});
  await call('rateListing',[listing,null,fd({stars:'5'})],actor,true);
  assert.equal((await one<{count:number}>('SELECT count FROM listings WHERE id=?',listing))?.count,1);
  await call('replyRating',[listing,helperId,null,fd({reply:'Respuesta sintética del titular'})],actor);
  await call('verifyListing',[listing],mod);
  await call('applyFeatured',[listing,null,fd({week:'proxima',pitch:'Postulación sintética para verificar la elección municipal.'})],actor);
  const application=(await one<{id:number}>('SELECT id FROM featured_listings WHERE listing_id=? ORDER BY id DESC LIMIT 1',listing))!.id;
  await call('chooseFeatured',[application],muni);
  assert.equal((await one<{status:string}>('SELECT status FROM featured_listings WHERE id=?',application))?.status,'elegido');

  await call('createClaim',[null,fd({category:'Alumbrado',description:'QA HTTP reclamo sintético principal',address:'Dirección inventada QA'})],actor);
  const claim=(await one<{id:number}>('SELECT id FROM claims WHERE user_id=? ORDER BY id DESC LIMIT 1',actorId))!.id;
  const {CLAIM_AREAS,ALERT_KINDS}=await import('../src/lib/constants');
  const tomorrow=new Date(Date.now()+864e5).toISOString().slice(0,10);
  const claimForm=(version:number,status:string,reply='Respuesta sintética para el vecino')=>fd({version:String(version),status,area:CLAIM_AREAS[0],next_update:tomorrow,reply,note:'Nota interna QA que no debe ver el vecino'});
  await call('updateClaim',[claim,null,claimForm(1,'en_revision')],muni);
  const stale=await call('updateClaim',[claim,null,claimForm(1,'en_proceso')],muni,true);assert.ok(stale.state?.error);
  const concurrent=await Promise.all([call('updateClaim',[claim,null,claimForm(2,'en_proceso','Respuesta A')],muni,true),call('updateClaim',[claim,null,claimForm(2,'en_proceso','Respuesta B')],muni,true)]);
  assert.equal(concurrent.filter(r=>!!r.state?.error).length,1);
  assert.equal((await one<{version:number}>('SELECT version FROM claims WHERE id=?',claim))?.version,3);
  await call('updateClaim',[claim,null,claimForm(3,'resuelto')],muni);
  await call('rateClaim',[claim,null,fd({stars:'5'})],actor);
  assert.equal((await one<{rating:number}>('SELECT rating FROM claims WHERE id=?',claim))?.rating,5);
  const ownClaim=await fetch(`${base}/reclamos/${claim}`,{headers:{Cookie:await cookie(actor)}});
  assert.ok(!(await ownClaim.text()).includes('Nota interna QA que no debe ver el vecino'));
  const claimCount=(await one<{n:number}>('SELECT COUNT(*) n FROM claims'))!.n;
  await Promise.all(Array.from({length:3},(_,i)=>call('createClaim',[null,fd({category:'Otro',description:`QA HTTP reclamo concurrente ${i}`,address:'Referencia sintética de prueba'})],actor)));
  assert.equal((await one<{n:number}>('SELECT COUNT(*) n FROM claims'))?.n,claimCount+3);

  const grouped:number[]=[];
  for(let i=0;i<2;i++) {
    await call('createClaim',[null,fd({category:'Alumbrado',description:`QA HTTP reclamo agrupable ${i}`,address:'Dirección inventada QA'})],actor);
    grouped.push((await one<{id:number}>('SELECT id FROM claims WHERE user_id=? ORDER BY id DESC LIMIT 1',actorId))!.id);
  }
  await call('createIncident',[null,fd({title:'QA HTTP incidente',reason:'Agrupación sintética para verificar actualización común.',area:CLAIM_AREAS[0],claims:grouped.map(String)})],muni);
  const incident=(await one<{id:number}>("SELECT id FROM incidents WHERE title='QA HTTP incidente' ORDER BY id DESC LIMIT 1"))!.id;
  await call('incidentExists',[incident],muni);
  const batch=async(message:string)=>{const f=fd({confirm:'on',message,note:'Nota municipal privada QA',next_update:tomorrow,claims:grouped.map(String)});for(const c of await all<{id:number;version:number}>(`SELECT id,version FROM claims WHERE incident_id=?`,incident))f.set(`v_${c.id}`,String(c.version));return f;};
  await call('bulkIncident',[incident,'update',null,await batch('Actualización común sintética')],muni);
  await call('bulkIncident',[incident,'resolve',null,await batch('Resolución común sintética')],muni);
  assert.equal((await one<{n:number}>("SELECT COUNT(*) n FROM claims WHERE incident_id=? AND status='resuelto'",incident))?.n,2);
  await call('unlinkClaim',[incident,grouped[0],null,fd({reason:'Separación sintética para comprobar historial'})],muni);
  await call('closeIncident',[incident],muni);

  await call('issueAlert',[null,fd({kind:ALERT_KINDS[0].id,hours:'1',message:'Alerta ficticia exclusiva de QA local.'})],muni);
  const notice=(await one<{id:number;updated_at:string;created_at:string}>("SELECT id,updated_at,created_at FROM posts WHERE category='aviso' ORDER BY id DESC LIMIT 1"))!;
  const noticeForm=()=>fd({v:notice.updated_at??notice.created_at,title:'QA HTTP aviso corregido',body:'Texto ficticio corregido durante la prueba.',severity:'importante'});
  const edited=await Promise.all([call('updateNotice',[notice.id,null,noticeForm()],muni,true),call('updateNotice',[notice.id,null,noticeForm()],muni,true)]);
  assert.equal(edited.filter(r=>!!r.state?.error).length,1);
  successful.add('updateNotice');
  await call('cancelPost',[notice.id],muni);
  assert.equal((await one<{lifecycle:string}>('SELECT lifecycle FROM posts WHERE id=?',notice.id))?.lifecycle,'cancelled');

  await call('setNeedTarget',[need,null,fd({target:'3',reason:'Ampliación sintética QA HTTP'})],neighbor);
  await call('setNeedTarget',[need,null,fd({target:'1'})],neighbor,true);
  assert.equal((await one<{target:number}>('SELECT target FROM idea_needs WHERE id=?',need))?.target,3);
  await call('confirmFulfillment',[commitment,null,fd({qty:'2'})],neighbor);
  await call('withdrawCommitment',[commitment],helper);
  assert.equal((await one<{status:string}>('SELECT status FROM idea_commitments WHERE id=?',commitment))?.status,'cumplida');
  await call('addNeed',[idea,null,fd({kind:'herramientas',description:'QA HTTP retiro de propuesta',target:'2',unit:'unidades'})],neighbor);
  const otherNeed=(await one<{id:number}>('SELECT id FROM idea_needs WHERE idea_id=? ORDER BY id DESC LIMIT 1',idea))!.id;
  await call('proposeCommitment',[otherNeed,null,fd({qty:'1'})],helper);
  const otherCommitment=(await one<{id:number}>('SELECT id FROM idea_commitments WHERE need_id=?',otherNeed))!.id;
  await call('withdrawCommitment',[otherCommitment],helper);
  assert.equal((await one<{status:string}>('SELECT status FROM idea_commitments WHERE id=?',otherCommitment))?.status,'retirada');
  await call('proposeCommitment',[otherNeed,null,fd({qty:'1'})],helper);
  await call('decideCommitment',[otherCommitment,'reject',null,fd({reason:'Motivo sintético de rechazo'})],neighbor);
  await call('setIdeaStatus',[idea,null,fd({status:'en_marcha'})],neighbor);
  await call('toggleMunicipal',[idea],muni);
  await call('closeIdea',[idea,null,fd({action:'realizada',closing:'Cierre sintético con agradecimiento de prueba.',publish:'on'})],neighbor);
  await call('setIdeaStatus',[idea,null,fd({status:'propuesta'})],neighbor,true);
  assert.equal((await one<{status:string}>('SELECT status FROM ideas WHERE id=?',idea))?.status,'realizada');
  const outcome=(await one<{id:number}>("SELECT id FROM community_outcomes WHERE source_type='idea' AND source_id=?",idea))!.id;
  await call('editOutcome',[outcome,null,fd({outcome:'Agradecimiento sintético corregido por su autor.'})],neighbor);
  await call('setOutcomeVisibility',[outcome,false],neighbor);await call('setOutcomeVisibility',[outcome,true],neighbor);

  await call('createIdea',[null,fd({title:'QA HTTP cupo simultáneo',body:'Idea ficticia para comprobar que dos aceptaciones no exceden un único cupo.',category:'Solidaridad'})],actor);
  const concurrentIdea=(await one<{id:number}>('SELECT id FROM ideas WHERE author_id=? ORDER BY id DESC LIMIT 1',actorId))!.id;
  await call('addNeed',[concurrentIdea,null,fd({kind:'personas',description:'Un único lugar de prueba',target:'1',unit:'personas'})],actor);
  const lastNeed=(await one<{id:number}>('SELECT id FROM idea_needs WHERE idea_id=?',concurrentIdea))!.id;
  for(const person of [helper,'pedro@sampacho.test']) await call('proposeCommitment',[lastNeed,null,fd({qty:'1'})],person);
  const candidates=await all<{id:number}>('SELECT id FROM idea_commitments WHERE need_id=?',lastNeed);
  const decisions=await Promise.all(candidates.map(c=>call('decideCommitment',[c.id,'accept',null,fd({qty:'1'})],actor,true)));
  assert.equal(decisions.filter(r=>!!r.state?.error).length,1);
  assert.equal((await one<{n:number}>("SELECT SUM(accepted) n FROM idea_commitments WHERE need_id=? AND status='aceptada'",lastNeed))?.n,1);
  await call('closeIdea',[concurrentIdea,null,fd({action:'cancelada',closing:'Cancelación sintética para comprobar liberación de reservas.'})],actor);

  await call('createRequest',[null,fd({kind:'servicio',title:'QA HTTP pedido',body:'Pedido ficticio para verificar respuestas y cierre completo.',category:'Electricista',days:'7'})],actor);
  const request=(await one<{id:number}>('SELECT id FROM community_requests WHERE author_id=? ORDER BY id DESC LIMIT 1',actorId))!.id;
  const trade=(await one<{id:number}>('SELECT id FROM listings WHERE owner_id=? AND deleted=0 ORDER BY id LIMIT 1',helperId))!.id;
  await call('respondRequest',[request,null,fd({listing_id:String(trade),body:'Propuesta ficticia QA HTTP'})],helper);
  const answer=(await one<{id:number}>('SELECT id FROM request_responses WHERE request_id=?',request))!.id;
  await call('withdrawResponse',[answer],helper);
  await call('respondRequest',[request,null,fd({listing_id:String(trade),body:'Propuesta ficticia actualizada QA HTTP'})],helper);
  assert.equal((await one<{n:number}>('SELECT COUNT(*) n FROM request_responses WHERE request_id=?',request))?.n,1);
  await call('closeRequest',[request,null,fd({action:'resolver',version:'1',chosen:String(answer),publish:'on',outcome:'Resultado sintético del pedido, sin contratación real.'})],actor);
  await call('closeRequest',[request,null,fd({action:'resolver',version:'1'})],actor,true);
  assert.equal((await one<{n:number}>("SELECT COUNT(*) n FROM community_outcomes WHERE source_type='pedido' AND source_id=?",request))?.n,1);
  await call('hideRequest',[request],actor);
  await call('createRequest',[null,fd({kind:'servicio',title:'QA HTTP pedido vencido',body:'Pedido ficticio para verificar renovación de vencidos.',category:'Electricista',days:'1'})],actor);
  const expired=(await one<{id:number}>('SELECT id FROM community_requests WHERE author_id=? ORDER BY id DESC LIMIT 1',actorId))!.id;
  await run("UPDATE community_requests SET expires_at=datetime('now','-1 day') WHERE id=?",expired);
  await call('renewRequest',[expired],actor);
  assert.equal((await one<{live:boolean}>("SELECT expires_at>datetime('now') AS live FROM community_requests WHERE id=?",expired))?.live,true);

  await call('createJob',[null,fd({kind:'oferta',title:'QA HTTP empleo',body:'Oferta ficticia para verificar todo el circuito laboral.',category:'Electricista',phone:'3584000999',days:'1'})],actor);
  const job=(await one<{id:number}>('SELECT id FROM jobs WHERE author_id=? ORDER BY id DESC LIMIT 1',actorId))!.id;
  await call('toggleJobFilled',[job],actor); await call('toggleJobFilled',[job],actor); await call('renewJob',[job],actor); await call('hideJob',[job],actor);
  assert.equal((await one<{hidden:number}>('SELECT hidden FROM jobs WHERE id=?',job))?.hidden,1);
  await call('createPost',[null,fd({category:'venta',title:'QA HTTP venta',body:'Venta inventada para verificar cierre con resultado.',price:'5000',condition:'usado',contact_phone:'3584000999'})],actor);
  const sale=(await one<{id:number}>('SELECT id FROM posts WHERE author_id=? ORDER BY id DESC LIMIT 1',actorId))!.id;
  await call('renewPost',[sale],actor); await call('markSold',[sale],actor); await call('markSold',[sale],actor);
  await call('closePost',[sale,null,fd({publish:'on',outcome:'Venta ficticia resuelta durante la verificación local.'})],actor);
  await call('deletePost',[sale],actor);
  const comment=(await one<{id:number}>("SELECT id FROM comments WHERE body='Comentario QA HTTP' ORDER BY id DESC LIMIT 1"))!.id;
  await call('deleteComment',[comment,`/muro/${post}`],helper);
  assert.equal((await one<{hidden:number}>('SELECT hidden FROM comments WHERE id=?',comment))?.hidden,1);
  const report=(await one<{id:number}>('SELECT id FROM reports WHERE target_id=? AND kind=\'post\' ORDER BY id DESC LIMIT 1',post))!.id;
  await call('resolveReport',[report,'dismiss'],mod);
  const notification=await one<{id:number}>('SELECT id FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 1',actorId);
  assert.ok(notification); await call('markRead',[notification.id],actor);

  const place=(await one<{id:number}>("SELECT id FROM tourist_places WHERE name='QA HTTP lugar' ORDER BY id DESC LIMIT 1"))!.id;
  await call('removePlace',[place],muni);
  const phone=(await one<{id:number}>("SELECT id FROM phones WHERE name='QA HTTP servicio' ORDER BY id DESC LIMIT 1"))!.id;
  await call('deletePhone',[phone],muni);
  const slot=(await one<{id:number}>("SELECT id FROM waste_schedule WHERE zone='Centro' AND weekday=0 AND kind='comun'"))!.id;
  await call('removeSlot',[slot],muni);
  await call('deleteListing',[listing],actor);
  await call('savePush',[{}],actor,true); // Sin crear suscripciones ni contactar proveedores reales.
  await call('removePush',['https://example.invalid/qa-local'],actor);
  await call('setUserRole',[actorId,fd({role:'moderador'})],muni);assert.equal((await one<{role:string}>('SELECT role FROM users WHERE id=?',actorId))?.role,'moderador');
  await call('setUserRole',[actorId,fd({role:'vecino'})],muni);
  await call('toggleSuspend',[actorId],muni);
  assert.equal((await one<{n:number}>('SELECT COUNT(*) n FROM sessions WHERE user_id=?',actorId))?.n,0);
  await call('toggleSuspend',[actorId],muni); cookies.delete(actor);
  await call('logout',[],actor);cookies.delete(actor);
  console.log(`Acciones HTTP: ${calls} llamadas; ${covered.size}/${entries.length} exportaciones sin sesión y ${successful.size} con circuito válido; sin excepciones. Push real no se crea ni se envía.`);
} finally { for(const hash of hashes) await run('DELETE FROM sessions WHERE token_hash=?',hash); await closeDb(); }
