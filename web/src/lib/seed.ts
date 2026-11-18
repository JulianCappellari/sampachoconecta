import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";

/**
 * Datos de ejemplo para el prototipo local. Se cargan una sola vez, cuando la base está vacía.
 * Todas las personas, comercios y publicaciones son inventados para poder ver la app funcionando.
 * Contraseña de las cuentas de ejemplo: variable SEED_PASSWORD o "sampacho2026".
 */
export function seed(db: DatabaseSync) {
  const pass = hashPassword(process.env.SEED_PASSWORD ?? "sampacho2026");
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  const daysAgo = (n: number, h = 0) => iso(new Date(now.getTime() - n * 864e5 - h * 36e5));
  const localDay = (offset: number, time: string) => {
    const d = new Date(now.getTime() + offset * 864e5);
    return `${d.toISOString().slice(0, 10)}T${time}`;
  };

  const user = db.prepare(
    "INSERT INTO users (name,email,phone,barrio,role,pass_hash,verified_at) VALUES (?,?,?,?,?,?,datetime('now'))",
  );
  const ins = (name: string, email: string, phone: string, barrio: string, role: string) =>
    Number(user.run(name, email, phone, barrio, role, pass).lastInsertRowid);

  const muni = ins("Municipalidad de Sampacho", "municipio@sampacho.test", "", "Centro", "municipio");
  const mod = ins("Rosa Ledesma", "moderacion@sampacho.test", "3584000001", "Centro", "moderador");
  const marta = ins("Marta Gómez", "marta@sampacho.test", "3584000002", "Estación", "vecino");
  const luis = ins("Luis Ferrero", "luis@sampacho.test", "3584000003", "Norte", "vecino");
  const carla = ins("Carla Bustos", "carla@sampacho.test", "3584000004", "Sur", "vecino");
  const pedro = ins("Pedro Aguirre", "pedro@sampacho.test", "3584000005", "Centro", "vecino");
  void mod;

  // Teléfonos útiles nacionales. El municipio carga los locales desde el panel.
  const ph = db.prepare("INSERT INTO phones (name,number,category,sort) VALUES (?,?,?,?)");
  [
    ["Emergencias", "911", "Emergencias"],
    ["Policía", "101", "Emergencias"],
    ["Bomberos", "100", "Emergencias"],
    ["Emergencias médicas", "107", "Salud"],
    ["Defensa Civil", "103", "Emergencias"],
    ["Violencia de género", "144", "Salud"],
    ["Niñez y adolescencia", "102", "Salud"],
  ].forEach(([n, num, c], i) => ph.run(n, num, c, i));

  // Farmacias de turno para los próximos 30 días.
  const farm = [
    ["Farmacia del Centro", "San Martín 450", "3584000101"],
    ["Farmacia Belgrano", "Belgrano 120", "3584000102"],
    ["Farmacia Sampacho", "Mitre 890", "3584000103"],
  ];
  const duty = db.prepare("INSERT INTO pharmacy_duty (date,name,address,phone) VALUES (?,?,?,?)");
  for (let i = -1; i < 30; i++) {
    const day = new Date(now.getTime() + i * 864e5).toISOString().slice(0, 10);
    const f = farm[(i + 1 + 3) % 3];
    duty.run(day, f[0], f[1], f[2]);
  }

  // Comercios y oficios
  const lst = db.prepare(
    `INSERT INTO listings (kind,owner_id,category,name,description,address,zone,lat,lng,phone,whatsapp,open_time,close_time,open_days,license,emergency,verified,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const L = (...a: (string | number | null)[]) => Number(lst.run(...a).lastInsertRowid);
  const alm = L("comercio", pedro, "Almacén", "Almacén Don Pedro", "Fiambres, lácteos, verdura fresca y pan del día. Reparto sin cargo en el centro.", "Mitre 310", "Centro", -33.3828, -64.7176, "3584111001", "3584111001", "07:30", "21:00", "1,2,3,4,5,6", null, 0, 1, daysAgo(60));
  const pan = L("comercio", carla, "Panadería", "Panadería La Espiga", "Pan casero, facturas y tortas por encargo. Horno a leña.", "San Martín 640", "Centro", -33.3841, -64.7195, "3584111002", "3584111002", "06:30", "13:00", "1,2,3,4,5,6,0", null, 0, 1, daysAgo(50));
  const fer = L("comercio", luis, "Ferretería", "Ferretería El Tornillo", "Herramientas, pinturas, materiales eléctricos y de plomería.", "Belgrano 275", "Centro", -33.3849, -64.7168, "3584111003", "3584111003", "08:00", "18:30", "1,2,3,4,5", null, 0, 0, daysAgo(40));
  const rest = L("comercio", marta, "Gastronomía", "Rotisería Los Álamos", "Milanesas, empanadas y platos del día. Pedidos por WhatsApp hasta las 11.", "Sarmiento 90", "Estación", -33.3812, -64.7211, "3584111004", "3584111004", "11:00", "23:00", "2,3,4,5,6,0", null, 0, 0, daysAgo(30));
  const ele = L("oficio", luis, "Electricista", "Luis Ferrero · Electricidad", "Instalaciones domiciliarias, tableros, reparaciones y luminarias. Presupuesto sin cargo.", null, "Todo el pueblo", null, null, "3584222001", "3584222001", "08:00", "20:00", "1,2,3,4,5,6", "Mat. 1234-E", 1, 1, daysAgo(45));
  const gas = L("oficio", pedro, "Gasista", "Hugo Aguirre · Gas matriculado", "Instalaciones, reparación de artefactos y revisión de pérdidas.", null, "Todo el pueblo", null, null, "3584222002", "3584222002", "08:00", "19:00", "1,2,3,4,5", "Mat. 5678-G", 1, 1, daysAgo(35));
  const plo = L("oficio", carla, "Plomero", "Sergio Bustos · Plomería", "Destapes, cañerías, termotanques y cloacas.", null, "Todo el pueblo", null, null, "3584222003", "3584222003", "08:00", "19:00", "1,2,3,4,5,6", null, 1, 0, daysAgo(20));
  const jar = L("oficio", marta, "Jardinero", "Jardinería Estación", "Corte de pasto, poda y mantenimiento de jardines y quintas.", null, "Estación y Norte", null, null, "3584222004", "3584222004", "08:00", "17:00", "1,2,3,4,5", null, 0, 0, daysAgo(15));

  const rate = db.prepare("INSERT INTO ratings (listing_id,user_id,stars,review,created_at) VALUES (?,?,?,?,?)");
  const R = (l: number, u: number, s: number, r: string | null, d: number) => rate.run(l, u, s, r, daysAgo(d));
  R(alm, marta, 5, "Siempre atienden con una sonrisa y la verdura es fresquísima.", 12);
  R(alm, luis, 5, "Me llevaron el pedido a casa en veinte minutos.", 10);
  R(alm, carla, 4, "Muy bueno. A veces falta algún producto a la tarde.", 6);
  R(pan, marta, 5, "Las facturas son lo mejor del pueblo.", 14);
  R(pan, pedro, 5, null, 9);
  R(pan, luis, 5, "El pan sale calentito todas las mañanas.", 3);
  R(fer, carla, 4, "Tienen casi todo y te aconsejan bien.", 8);
  R(fer, marta, 4, null, 5);
  R(fer, pedro, 5, "Me resolvieron una urgencia un sábado a la mañana.", 2);
  R(ele, marta, 5, "Puntual, prolijo y explicó todo lo que hizo.", 20);
  R(ele, carla, 5, "Vino un domingo por una urgencia. Muy recomendable.", 11);
  R(ele, pedro, 4, "Buen trabajo, el presupuesto fue claro.", 4);
  R(gas, marta, 5, "Matriculado y muy cuidadoso con la revisión.", 18);
  R(gas, luis, 5, null, 7);
  R(gas, carla, 5, "Me explicó todo y dejó el certificado en regla.", 2);
  R(plo, marta, 4, "Resolvió el destape en una hora.", 9);
  R(plo, luis, 4, "Buen precio.", 4);
  R(plo, pedro, 3, "Llegó tarde pero el trabajo quedó bien.", 1);
  db.exec(`UPDATE listings SET
    avg = COALESCE((SELECT ROUND(AVG(stars),1) FROM ratings WHERE listing_id = listings.id),0),
    count = (SELECT COUNT(*) FROM ratings WHERE listing_id = listings.id)`);
  void rest; void jar;

  // Publicaciones
  const post = db.prepare(
    `INSERT INTO posts (author_id,category,title,body,price,condition,contact_phone,event_at,event_place,pinned_until,expires_at,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const P = (...a: (string | number | null)[]) => Number(post.run(...a).lastInsertRowid);
  P(muni, "aviso", "Corte de agua programado en barrio Centro", "Mañana se interrumpe el servicio de agua en barrio Centro de 8 a 12 h por tareas de mantenimiento en la red. Guardá agua para la mañana.", null, null, null, null, null, localDay(2, "12:00"), null, daysAgo(0, 3));
  const p2 = P(marta, "evento", "Cena a beneficio del club", "Cena de camaradería para juntar fondos para la cancha de bochas. Habrá música en vivo y sorteos. Tarjetas en la secretaría del club.", null, null, null, localDay(4, "21:00"), "Club Sportivo, Mitre 500", null, null, daysAgo(0, 6));
  P(pedro, "noticia", "Se reabre la biblioteca popular los sábados", "Desde este sábado la biblioteca atiende de 9 a 13 h. Hay talleres de lectura para chicos y se reciben donaciones de libros.", null, null, null, null, null, null, null, daysAgo(1));
  P(luis, "venta", "Bicicleta rodado 26 en buen estado", "Bicicleta mountain bike con luces y portaequipaje. Se entrega con inflador. Se puede ver en barrio Norte.", 85000, "usado", "3584000003", null, null, null, localDay(25, "00:00"), daysAgo(2));
  P(carla, "perdido", "Perrito perdido: collar rojo", "Se perdió el domingo por la zona de la plaza. Es chiquito, marrón, responde al nombre de Toto. Si lo ves, escribime por favor.", null, null, "3584000004", null, null, null, null, daysAgo(3));
  P(muni, "evento", "Feria de emprendedores en la plaza", "Primera feria de emprendedores locales: comidas, artesanías y plantas. Entrada libre y gratuita.", null, null, null, localDay(9, "10:00"), "Plaza principal", null, null, daysAgo(4));
  P(mod, "empleo", "Se busca ayudante de panadería", "Panadería La Espiga busca ayudante, turno mañana. Presentarse con CV en San Martín 640.", null, null, null, null, null, null, null, daysAgo(5));
  const cm = db.prepare("INSERT INTO comments (kind,target_id,user_id,body,created_at) VALUES ('post',?,?,?,?)");
  cm.run(p2, luis, "¡Ahí estaremos! ¿Hay menú para celíacos?", daysAgo(0, 4));
  cm.run(p2, marta, "Sí, Luis, avisá cuando saques la tarjeta y lo coordinamos.", daysAgo(0, 3));
  db.prepare("INSERT INTO likes (post_id,user_id) VALUES (?,?)").run(p2, luis);
  db.prepare("INSERT INTO likes (post_id,user_id) VALUES (?,?)").run(p2, carla);
  db.prepare("INSERT INTO likes (post_id,user_id) VALUES (?,?)").run(p2, pedro);

  // Ideas
  const idea = db.prepare(
    "INSERT INTO ideas (author_id,title,body,category,status,group_link,created_at) VALUES (?,?,?,?,?,?,?)",
  );
  const i1 = Number(idea.run(marta, "Huerta comunitaria en el predio del ferrocarril", "Armemos una huerta para que cada familia tenga su cantero. Los chicos de la escuela pueden aprender a sembrar y lo que se coseche va a la copa de leche.", "Espacios verdes", "en_marcha", "https://chat.whatsapp.com/EjemploHuertaSampacho", daysAgo(10)).lastInsertRowid);
  const i2 = Number(idea.run(luis, "Torneo de fútbol mixto de verano", "Torneo entre barrios, equipos mixtos, en la cancha del polideportivo. Lo recaudado va para las camisetas de las inferiores.", "Deporte", "propuesta", null, daysAgo(4)).lastInsertRowid);
  const i3 = Number(idea.run(carla, "Bicisendas hasta la escuela", "Marcar una bicisenda segura desde barrio Sur hasta la escuela primaria para que los chicos puedan ir en bici.", "Seguridad vial", "propuesta", null, daysAgo(2)).lastInsertRowid);
  db.prepare("UPDATE ideas SET municipal = 1 WHERE id = ?").run(i3);
  const sup = db.prepare("INSERT INTO idea_supports (idea_id,user_id) VALUES (?,?)");
  [marta, luis, carla, pedro].forEach((u) => sup.run(i1, u));
  [luis, marta].forEach((u) => sup.run(i2, u));
  [carla, pedro, marta].forEach((u) => sup.run(i3, u));

  // Reclamos de ejemplo
  const cl = db.prepare(
    "INSERT INTO claims (number,user_id,category,description,address,lat,lng,status,area,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
  );
  const ev = db.prepare("INSERT INTO claim_events (claim_id,user_id,status,comment,created_at) VALUES (?,?,?,?,?)");
  const year = now.getFullYear();
  const c1 = Number(cl.run(`R-${year}-0001`, carla, "Alumbrado", "La luminaria de la esquina de Belgrano y Mitre está apagada hace una semana. De noche queda muy oscuro.", "Belgrano y Mitre", -33.3846, -64.7173, "en_proceso", "Servicios Públicos", daysAgo(5)).lastInsertRowid);
  ev.run(c1, carla, "recibido", "Reclamo presentado.", daysAgo(5));
  ev.run(c1, muni, "en_revision", "Lo derivamos al área de Servicios Públicos.", daysAgo(4));
  ev.run(c1, muni, "en_proceso", "La cuadrilla pasa el jueves a cambiar la lámpara.", daysAgo(2));
  const c2 = Number(cl.run(`R-${year}-0002`, luis, "Calles y baches", "Bache profundo sobre calle Sarmiento al 200, se lleva puesta la rueda de los autos.", "Sarmiento 200", -33.3815, -64.7205, "recibido", null, daysAgo(1)).lastInsertRowid);
  ev.run(c2, luis, "recibido", "Reclamo presentado.", daysAgo(1));
  const c3 = Number(cl.run(`R-${year}-0003`, marta, "Residuos", "El contenedor de la esquina de la estación se desborda los fines de semana.", "Estación", -33.381, -64.7218, "resuelto", "Servicios Públicos", daysAgo(14)).lastInsertRowid);
  ev.run(c3, marta, "recibido", "Reclamo presentado.", daysAgo(14));
  ev.run(c3, muni, "en_proceso", "Se agregó un segundo contenedor.", daysAgo(10));
  ev.run(c3, muni, "resuelto", "Se aumentó la frecuencia de recolección en la zona.", daysAgo(7));
  db.prepare("UPDATE claims SET closed_at = ?, rating = 5 WHERE id = ?").run(daysAgo(7), c3);

  // ── Funciones comunitarias (datos de ejemplo) ──
  const inFuture = (h: number) => iso(new Date(now.getTime() + h * 36e5));
  db.prepare("UPDATE posts SET severity='importante', ends_at=?, zone='Centro', updated_at=datetime('now') WHERE category='aviso'").run(inFuture(40));
  db.prepare(
    "INSERT INTO posts (author_id,category,title,body,severity,starts_at,ends_at,zone,updated_at,created_at) VALUES (?,?,?,?,?,?,?,?,datetime('now'),?)",
  ).run(muni, "aviso", "Corte de energía programado en barrio Norte", "La cooperativa realiza trabajos en la red. El servicio se interrumpe durante el horario indicado.", "urgente", inFuture(1), inFuture(4), "Norte", daysAgo(0, 1));
  db.prepare("UPDATE claims SET next_update_at = ?, version = version + 1 WHERE id = ?").run(inFuture(24 * 5), c1);
  db.prepare("UPDATE claims SET next_update_at = ? WHERE id = ?").run(inFuture(-24), c2); // vencida a propósito, para ver el recordatorio

  const rq = db.prepare("INSERT INTO community_requests (author_id,kind,title,body,category,zone,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)");
  const r1 = Number(rq.run(marta, "servicio", "Busco electricista para cambiar el tablero", "Es una casa de barrio Estación, tablero viejo con térmicas que saltan. Necesito presupuesto esta semana.", "Electricista", "Estación", inFuture(24 * 5), daysAgo(1)).lastInsertRowid);
  rq.run(pedro, "producto", "¿Quién tiene un repuesto de canilla monocomando?", "Busco el cartucho de una canilla monocomando marca común. Puedo pasar a buscarlo.", "Ferretería", "Centro", inFuture(24 * 3), daysAgo(0, 5));
  const r3 = Number(rq.run(carla, "servicio", "Busco quien cuide a mi hijo los sábados", "Necesitaba alguien de confianza para los sábados a la mañana.", "Cuidado de personas", "Sur", inFuture(24 * 2), daysAgo(6)).lastInsertRowid);
  db.prepare("INSERT INTO request_responses (request_id,listing_id,user_id,body) VALUES (?,?,?,?)").run(r1, ele, luis, "Puedo ir el jueves a hacer el presupuesto sin cargo. Trabajo con materiales de primera marca.");
  db.prepare("UPDATE community_requests SET status='resuelto', closed_at=datetime('now') WHERE id = ?").run(r3);
  db.prepare("INSERT INTO community_outcomes (source_type,source_id,author_id,body) VALUES ('pedido',?,?,?)").run(r3, carla, "Encontré una niñera recomendada por una vecina. ¡Gracias a todos los que respondieron!");

  const need = db.prepare("INSERT INTO idea_needs (idea_id,kind,description,target,unit,deadline) VALUES (?,?,?,?,?,?)");
  const n1 = Number(need.run(i1, "personas", "Vecinos para la jornada de armado de canteros", 8, "personas", localDay(10, "00:00").slice(0, 10)).lastInsertRowid);
  const n2 = Number(need.run(i1, "herramientas", "Palas y carretillas", 4, "unidades", null).lastInsertRowid);
  const cmt = db.prepare("INSERT INTO idea_commitments (need_id,user_id,proposed,accepted,fulfilled,status,public_name) VALUES (?,?,?,?,?,?,?)");
  cmt.run(n1, luis, 3, 3, 0, "aceptada", 1);
  cmt.run(n1, carla, 2, 0, 0, "pendiente", 0);
  cmt.run(n2, pedro, 2, 2, 2, "cumplida", 1);
  db.prepare("INSERT INTO idea_permission_requests (idea_id,description,status) VALUES (?,?,'pendiente')").run(i1, "Autorización para usar el predio del ferrocarril");
  db.prepare("INSERT INTO idea_updates (idea_id,author_id,kind,body,created_at) VALUES (?,?,?,?,?)").run(i1, marta, "actividad", "Primera jornada de limpieza el sábado a la mañana, en el predio de la estación. Llevar guantes.", daysAgo(2));

  const fol = db.prepare("INSERT INTO follows (user_id,target_type,target_id) VALUES (?,?,?)");
  fol.run(marta, "tema", "evento");
  fol.run(marta, "zona", "Estación");
  fol.run(luis, "tema", "aviso");
  fol.run(luis, "tema", "rubro:Electricista");

  // ── Encuestas, residuos, empleo, turismo, destacado (datos de ejemplo) ──
  const poll = Number(db.prepare("INSERT INTO polls (author_id,question,body,closes_at) VALUES (?,?,?,?)").run(muni, "¿Qué obra querés que se priorice este año?", "Elegí la que más necesita tu barrio. La consulta no es vinculante: sirve para ordenar prioridades.", inFuture(24 * 6)).lastInsertRowid);
  const opt = db.prepare("INSERT INTO poll_options (poll_id,label,sort) VALUES (?,?,?)");
  ["Arreglo de calles", "Más luminarias", "Cordón cuneta", "Espacios verdes"].forEach((l, i) => opt.run(poll, l, i));
  db.prepare("INSERT INTO poll_votes (poll_id,user_id,option_id) VALUES (?,?,1)").run(poll, luis);

  const wst = db.prepare("INSERT INTO waste_schedule (zone,weekday,kind,note) VALUES (?,?,?,?)");
  for (const z of ["Centro", "Estación", "Norte"]) {
    wst.run(z, 1, "comun", "Sacar antes de las 7 h");
    wst.run(z, 3, "comun", "Sacar antes de las 7 h");
    wst.run(z, 5, "comun", "Sacar antes de las 7 h");
    wst.run(z, 2, "reciclables", null);
  }
  const todayWd = new Date(Date.now() - 3 * 36e5).getUTCDay();
  wst.run("Sur", todayWd, "verde", "Poda y residuos verdes");
  wst.run("Sur", (todayWd + 1) % 7, "comun", null);

  const job = db.prepare("INSERT INTO jobs (author_id,kind,title,body,category,zone,contact_phone,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)");
  job.run(carla, "oferta", "Ayudante de panadería, turno mañana", "Panadería La Espiga busca ayudante para el turno mañana, de lunes a sábado. Se valora experiencia, pero se enseña.", "Panadería", "Centro", "3584111002", inFuture(24 * 20), daysAgo(2));
  job.run(marta, "busco", "Busco trabajo de limpieza por horas", "Tengo referencias y disponibilidad por la tarde. Puedo ir a domicilios o comercios.", "Servicios", "Estación", "3584000002", inFuture(24 * 25), daysAgo(1));

  const plc = db.prepare("INSERT INTO tourist_places (kind,name,description,address,lat,lng,sort) VALUES (?,?,?,?,?,?,?)");
  plc.run("atractivo", "Plaza principal", "El corazón del pueblo: bancos, sombra y el movimiento de la tarde. Buen punto de partida para recorrer a pie.", "Centro", -33.3836, -64.7186, 0);
  plc.run("atractivo", "Predio de la estación", "Espacio histórico del ferrocarril donde hoy crece una huerta comunitaria.", "Barrio Estación", -33.3812, -64.7215, 1);
  plc.run("consejo", "Mejor momento para visitar", "Consultá la agenda antes de venir: en los días de fiestas y ferias el pueblo se llena de actividad.", null, null, null, 2);

  db.prepare("INSERT INTO listings (kind,owner_id,category,name,description,address,zone,lat,lng,phone,whatsapp,open_time,close_time,open_days) VALUES ('comercio',?,'Alojamiento','Cabañas El Algarrobo','Tres cabañas con cocina y parrilla, a pocas cuadras de la plaza. Ideal para familias.','Rivadavia 220','Centro',-33.3842,-64.7160,'3584111010','3584111010','09:00','20:00','0,1,2,3,4,5,6')").run(pedro);
  db.exec("UPDATE listings SET avg = COALESCE((SELECT ROUND(AVG(stars),1) FROM ratings WHERE listing_id = listings.id),0), count = (SELECT COUNT(*) FROM ratings WHERE listing_id = listings.id)");
  const wk = (n: number) => { const d = new Date(Date.now() - 3 * 36e5); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + n * 7); return d.toISOString().slice(0, 10); };
  db.prepare("INSERT INTO featured_listings (listing_id,week_start,pitch,status) VALUES (?,?,?,'elegido')").run(pan, wk(-1), "El horno a leña que se huele desde la plaza.");
  db.prepare("INSERT INTO featured_listings (listing_id,week_start,pitch) VALUES (?,?,?)").run(alm, wk(0), "Verdura fresca todos los días y reparto sin cargo en el centro.");
  db.prepare("INSERT INTO featured_listings (listing_id,week_start,pitch) VALUES (?,?,?)").run(fer, wk(0), "Te asesoramos para tu obra, sin vueltas.");
  fol.run(marta, "tema", "residuos");
}
