import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { hashPassword } from "./password";
import { SAMPACHO_CENTER } from "./constants";

/**
 * Datos de prueba COMPLETOS para recorrer toda la aplicación. Todo es inventado: personas, comercios, teléfonos
 * (3584-0xx-xxx no corresponden a nadie) y hechos. Las fechas son relativas a «ahora», así «hoy», «mañana» y
 * «vencido» siempre tienen sentido al probar. Se usa de dos formas:
 *  - desarrollo: se carga solo cuando la base está vacía (sin fotos);
 *  - cualquier entorno: `npm run seed` (con fotos de ejemplo y protecciones; ver docs/SEED_Y_PRODUCCION.md).
 */
export type SeedOptions = {
  /** Contraseña de todas las cuentas de prueba. */
  password?: string;
  /** Devuelve el nombre de archivo de una foto de ejemplo (o null si no hay fotos). */
  photo?: (key: string) => string | null;
};

export type SeedSummary = { accounts: { name: string; email: string; role: string; note: string }[]; counts: Record<string, number> };

export const PHOTO_KEYS = [
  "cena", "perro", "perro-encontrado", "bici", "biblioteca", "feria", "bache", "luminaria", "contenedor",
  "almacen", "panaderia", "cabanas", "rotiseria", "huerta", "pedido-ok", "jornada", "plaza", "estacion",
] as const;

export function seed(db: DatabaseSync, opts: SeedOptions = {}): SeedSummary {
  const pass = hashPassword(opts.password ?? process.env.SEED_PASSWORD ?? "sampacho2026");
  const photo = (k: string) => opts.photo?.(k) ?? null;
  const photos = (...ks: string[]) => JSON.stringify(ks.map(photo).filter(Boolean));
  const now = Date.now();
  const sql = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  const ago = (days: number, hours = 0) => sql(new Date(now - days * 864e5 - hours * 36e5));
  const fut = (hours: number) => sql(new Date(now + hours * 36e5));
  const ymd = (offsetDays: number) => new Date(now - 3 * 36e5 + offsetDays * 864e5).toISOString().slice(0, 10);
  const local = (offsetDays: number, hhmm: string) => `${ymd(offsetDays)}T${hhmm}`;
  const run = (query: string, ...p: SQLInputValue[]) => Number(db.prepare(query).run(...p).lastInsertRowid);
  const year = new Date().getFullYear();
  const [lat0, lng0] = SAMPACHO_CENTER;
  const near = (dy: number, dx: number): [number, number] => [lat0 + dy * 0.0009, lng0 + dx * 0.0011];

  /* ───────────── Usuarios ───────────── */
  const accounts: SeedSummary["accounts"] = [];
  const U: Record<string, number> = {};
  const user = (key: string, name: string, email: string, role: string, barrio: string, phone: string, note: string, extra: { suspended?: number; big?: number } = {}) => {
    U[key] = run(
      "INSERT INTO users (name,email,phone,barrio,role,pass_hash,verified_at,suspended,big_text,created_at) VALUES (?,?,?,?,?,?,datetime('now'),?,?,?)",
      name, email, phone, barrio, role, pass, extra.suspended ?? 0, extra.big ?? 0, ago(60 + Object.keys(U).length),
    );
    accounts.push({ name, email, role, note });
  };
  user("muni", "Municipalidad de Sampacho", "municipio@sampacho.test", "municipio", "Centro", "", "Gestiona reclamos, avisos, alertas, encuestas y todo el panel");
  user("obras", "Obras y Servicios Públicos", "obras@sampacho.test", "municipio", "Centro", "", "Segundo agente municipal: sirve para probar conflictos de edición");
  user("rosa", "Rosa Ledesma", "moderacion@sampacho.test", "moderador", "Centro", "3584000001", "Modera contenido y denuncias; NO ve reclamos");
  user("tomas", "Tomás Quiroga", "moderador2@sampacho.test", "moderador", "Norte", "3584000002", "Segundo moderador");
  user("marta", "Marta Gómez", "marta@sampacho.test", "vecino", "Estación", "3584000010", "Vecina activa: organizó una idea, tiene reclamos y pedidos");
  user("luis", "Luis Ferrero", "luis@sampacho.test", "vecino", "Norte", "3584000011", "Electricista (oficio) y comprador");
  user("carla", "Carla Bustos", "carla@sampacho.test", "vecino", "Sur", "3584000012", "Dueña de una panadería; publica empleo y pedidos");
  user("pedro", "Pedro Aguirre", "pedro@sampacho.test", "vecino", "Centro", "3584000013", "Dueño de almacén y gasista");
  user("lucia", "Lucía Fernández", "lucia@sampacho.test", "vecino", "Este", "3584000014", "Dueña de cabañas (alojamiento)");
  user("diego", "Diego Romero", "diego@sampacho.test", "vecino", "Oeste", "3584000015", "Plomero y albañil");
  user("sofia", "Sofía Acosta", "sofia@sampacho.test", "vecino", "Centro", "3584000016", "Dueña de rotisería; propone ideas");
  user("bruno", "Bruno Cabrera", "bruno@sampacho.test", "vecino", "Zona rural", "3584000017", "Vecino de zona rural; fletero");
  user("valentina", "Valentina Ríos", "valentina@sampacho.test", "vecino", "Norte", "3584000018", "Busca trabajo; vota encuestas");
  user("hernan", "Hernán Molina", "hernan@sampacho.test", "vecino", "Estación", "3584000019", "Ferretero");
  user("elena", "Elena Paz", "elena@sampacho.test", "vecino", "Sur", "3584000020", "Cuida personas (oficio)");
  user("joaquin", "Joaquín Vera", "joaquin@sampacho.test", "vecino", "Este", "3584000021", "Vecino sin comercio: prueba flujos de vecino común");
  user("nelida", "Nélida Suárez", "nelida@sampacho.test", "vecino", "Oeste", "3584000022", "Usa letra grande (accesibilidad)", { big: 1 });
  user("ramiro", "Ramiro Castro", "ramiro@sampacho.test", "vecino", "Centro", "3584000023", "Vecino nuevo, sin actividad");
  user("susp", "Usuario Suspendido", "suspendido@sampacho.test", "vecino", "Sur", "3584000099", "Cuenta suspendida: no debería poder ingresar", { suspended: 1 });

  /* ───────────── Útiles ───────────── */
  const ph = db.prepare("INSERT INTO phones (name,number,category,sort) VALUES (?,?,?,?)");
  [
    ["Emergencias", "911", "Emergencias"], ["Policía", "101", "Emergencias"], ["Bomberos", "100", "Emergencias"], ["Defensa Civil", "103", "Emergencias"],
    ["Emergencias médicas", "107", "Salud"], ["Violencia de género", "144", "Salud"], ["Niñez y adolescencia", "102", "Salud"],
    ["Municipalidad (ejemplo)", "3584000200", "Municipio"], ["Guardia municipal (ejemplo)", "3584000201", "Municipio"],
    ["Hospital local (ejemplo)", "3584000210", "Salud"], ["Cooperativa eléctrica, reclamos (ejemplo)", "3584000220", "Servicios"], ["Cooperativa de agua (ejemplo)", "3584000221", "Servicios"],
  ].forEach(([n, num, c], i) => ph.run(n, num, c, i));

  const farm = [["Farmacia del Centro", "San Martín 450", "3584000301"], ["Farmacia Belgrano", "Belgrano 120", "3584000302"], ["Farmacia Sampacho", "Mitre 890", "3584000303"]];
  const duty = db.prepare("INSERT INTO pharmacy_duty (date,name,address,phone) VALUES (?,?,?,?)");
  for (let i = -3; i < 45; i++) {
    const f = farm[((i % 3) + 3) % 3];
    duty.run(ymd(i), f[0], f[1], f[2]);
  }

  /* ───────────── Residuos y turismo ───────────── */
  const ws = db.prepare("INSERT INTO waste_schedule (zone,weekday,kind,note) VALUES (?,?,?,?)");
  const zones = ["Centro", "Norte", "Sur", "Este", "Oeste", "Estación", "Zona rural"];
  zones.forEach((z, i) => {
    const base = (i % 2) + 1; // lunes/martes
    for (const d of [base, base + 2, base + 4]) ws.run(z, d, "comun", "Sacar antes de las 7 h");
    ws.run(z, 4, "reciclables", "Bolsa transparente, limpio y seco");
    ws.run(z, 6, "verde", "Poda atada en bolsones");
  });
  ws.run("Centro", 6, "voluminosos", "Primer sábado: avisar a la municipalidad");
  const wd = new Date(now - 3 * 36e5).getUTCDay();
  // Garantiza que en Estación haya recolección hoy y mañana (para ver el bloque de «Hoy» y el recordatorio).
  const wsUp = db.prepare("INSERT INTO waste_schedule (zone,weekday,kind,note) VALUES (?,?,?,?) ON CONFLICT(zone,weekday,kind) DO UPDATE SET note = excluded.note");
  wsUp.run("Estación", wd, "reciclables", "Hoy pasa el camión de reciclables");
  wsUp.run("Estación", (wd + 1) % 7, "comun", "Mañana: sacar antes de las 7 h");

  const tp = db.prepare("INSERT INTO tourist_places (kind,name,description,address,lat,lng,sort) VALUES (?,?,?,?,?,?,?)");
  const [pl, pg] = near(0, 0);
  const [el, eg] = near(-3, -3);
  tp.run("atractivo", "Plaza principal", "El corazón del pueblo: sombra, bancos y el movimiento de la tarde. Buen punto de partida para recorrer a pie.", "Centro", pl, pg, 0);
  tp.run("atractivo", "Predio de la estación", "Espacio del viejo ferrocarril, hoy con una huerta comunitaria impulsada por los vecinos.", "Barrio Estación", el, eg, 1);
  tp.run("atractivo", "Paseo costanera (ejemplo)", "Sendero para caminar o andar en bici al atardecer.", null, ...near(4, 5), 2);
  tp.run("fiesta", "Fiesta de la comunidad (ejemplo)", "Una vez al año el pueblo se reúne con comidas típicas, música y feria de emprendedores. Mirá la agenda para las fechas.", null, null, null, 3);
  tp.run("consejo", "Cuándo venir", "Consultá la agenda antes de viajar: en fiestas y ferias hay más movimiento y conviene reservar alojamiento con tiempo.", null, null, null, 4);
  tp.run("consejo", "Cómo moverte", "El centro se recorre a pie. Para ir a zonas más alejadas conviene consultar a los fleteros o remises de la guía.", null, null, null, 5);

  /* ───────────── Guía: comercios y oficios ───────────── */
  type L = { key: string; owner: string; kind: "comercio" | "oficio"; cat: string; name: string; desc: string; addr?: string; zone: string; pos?: [number, number]; phone: string; open?: [string, string, string]; license?: string; emergency?: number; verified?: number; ph?: string[]; age: number };
  const L_: L[] = [
    { key: "almacen", owner: "pedro", kind: "comercio", cat: "Almacén", name: "Almacén Don Pedro", desc: "Fiambres, lácteos, verdura fresca y pan del día. Reparto sin cargo en el centro.", addr: "Mitre 310", zone: "Centro", pos: near(1, 1), phone: "3584111001", open: ["07:30", "21:00", "1,2,3,4,5,6"], verified: 1, ph: ["almacen"], age: 90 },
    { key: "panaderia", owner: "carla", kind: "comercio", cat: "Panadería", name: "Panadería La Espiga", desc: "Pan casero, facturas y tortas por encargo. Horno a leña.", addr: "San Martín 640", zone: "Centro", pos: near(-1, -2), phone: "3584111002", open: ["06:30", "13:00", "0,1,2,3,4,5,6"], verified: 1, ph: ["panaderia"], age: 80 },
    { key: "ferreteria", owner: "hernan", kind: "comercio", cat: "Ferretería", name: "Ferretería El Tornillo", desc: "Herramientas, pinturas, materiales eléctricos y de plomería. Te asesoramos para tu obra.", addr: "Belgrano 275", zone: "Centro", pos: near(-2, 2), phone: "3584111003", open: ["08:00", "18:30", "1,2,3,4,5"], age: 70 },
    { key: "rotiseria", owner: "sofia", kind: "comercio", cat: "Gastronomía", name: "Rotisería Los Álamos", desc: "Milanesas, empanadas y platos del día. Pedidos por WhatsApp hasta las 11.", addr: "Sarmiento 90", zone: "Estación", pos: near(2, -4), phone: "3584111004", open: ["11:00", "23:00", "2,3,4,5,6,0"], ph: ["rotiseria"], age: 60 },
    { key: "cabanas", owner: "lucia", kind: "comercio", cat: "Alojamiento", name: "Cabañas El Algarrobo", desc: "Tres cabañas con cocina y parrilla, a pocas cuadras de la plaza. Ideal para familias.", addr: "Rivadavia 220", zone: "Este", pos: near(0, 4), phone: "3584111005", open: ["09:00", "20:00", "0,1,2,3,4,5,6"], verified: 1, ph: ["cabanas"], age: 55 },
    { key: "hostal", owner: "sofia", kind: "comercio", cat: "Alojamiento", name: "Hostal La Estación", desc: "Habitaciones simples y desayuno casero, frente al viejo ferrocarril.", addr: "Estación s/n", zone: "Estación", pos: near(3, -5), phone: "3584111006", open: ["08:00", "22:00", "0,1,2,3,4,5,6"], age: 20 },
    { key: "pizzeria", owner: "bruno", kind: "comercio", cat: "Gastronomía", name: "Pizzería Don Bruno", desc: "Pizzas a la piedra y cerveza artesanal. Mesas en la vereda.", addr: "Belgrano 540", zone: "Centro", pos: near(-3, 1), phone: "3584111007", open: ["19:30", "00:30", "3,4,5,6,0"], age: 40 },
    { key: "carniceria", owner: "joaquin", kind: "comercio", cat: "Carnicería", name: "Carnicería El Corral", desc: "Cortes frescos, achuras y embutidos caseros.", addr: "España 150", zone: "Oeste", pos: near(0, -5), phone: "3584111008", open: ["07:30", "13:00", "1,2,3,4,5,6"], age: 35 },
    { key: "farmacia", owner: "ramiro", kind: "comercio", cat: "Farmacia", name: "Farmacia del Centro", desc: "Medicamentos, perfumería y atención de obras sociales.", addr: "San Martín 450", zone: "Centro", pos: near(1, -1), phone: "3584000301", open: ["08:30", "20:30", "1,2,3,4,5,6"], verified: 1, age: 85 },
    { key: "ropa", owner: "valentina", kind: "comercio", cat: "Indumentaria", name: "Tienda Mimos", desc: "Ropa para toda la familia y talles especiales. Cambios hasta 15 días.", addr: "Mitre 400", zone: "Centro", pos: near(1, 2), phone: "3584111009", open: ["09:00", "20:00", "1,2,3,4,5,6"], age: 8 },
    { key: "cuidado", owner: "elena", kind: "comercio", cat: "Salud", name: "Consultorio Kinesiología Paz", desc: "Rehabilitación y masajes terapéuticos con turno previo.", addr: "Alvear 75", zone: "Sur", pos: near(-4, 3), phone: "3584111010", open: ["09:00", "19:00", "1,2,3,4,5", ], age: 5 },
    // Oficios
    { key: "electricista", owner: "luis", kind: "oficio", cat: "Electricista", name: "Luis Ferrero · Electricidad", desc: "Instalaciones domiciliarias, tableros, reparaciones y luminarias. Presupuesto sin cargo.", zone: "Todo el pueblo", phone: "3584222001", open: ["08:00", "20:00", "1,2,3,4,5,6"], license: "Mat. 1234-E", emergency: 1, verified: 1, age: 75 },
    { key: "electricista2", owner: "ramiro", kind: "oficio", cat: "Electricista", name: "Ramiro Castro · Electricista", desc: "Cambio de llaves y tomas, instalaciones de aire acondicionado.", zone: "Centro y Este", phone: "3584222002", open: ["09:00", "18:00", "1,2,3,4,5"], age: 3 },
    { key: "gasista", owner: "pedro", kind: "oficio", cat: "Gasista", name: "Hugo Aguirre · Gas matriculado", desc: "Instalaciones, reparación de artefactos y revisión de pérdidas.", zone: "Todo el pueblo", phone: "3584222003", open: ["08:00", "19:00", "1,2,3,4,5"], license: "Mat. 5678-G", emergency: 1, verified: 1, age: 65 },
    { key: "plomero", owner: "diego", kind: "oficio", cat: "Plomero", name: "Diego Romero · Plomería", desc: "Destapes, cañerías, termotanques y cloacas.", zone: "Todo el pueblo", phone: "3584222004", open: ["08:00", "19:00", "1,2,3,4,5,6"], emergency: 1, age: 45 },
    { key: "albanil", owner: "diego", kind: "oficio", cat: "Albañil", name: "Diego Romero · Albañilería", desc: "Refacciones, revoques, pisos y ampliaciones. Presupuesto detallado.", zone: "Todo el pueblo", phone: "3584222005", open: ["07:00", "17:00", "1,2,3,4,5"], age: 44 },
    { key: "pintor", owner: "joaquin", kind: "oficio", cat: "Pintor", name: "Joaquín Vera · Pintura", desc: "Pintura de interiores y exteriores, impermeabilizante y empapelado.", zone: "Este y Centro", phone: "3584222006", open: ["08:00", "17:00", "1,2,3,4,5"], age: 30 },
    { key: "jardinero", owner: "marta", kind: "oficio", cat: "Jardinero", name: "Jardinería Estación", desc: "Corte de pasto, poda y mantenimiento de jardines y quintas.", zone: "Estación y Norte", phone: "3584222007", open: ["08:00", "17:00", "1,2,3,4,5"], age: 25 },
    { key: "fletero", owner: "bruno", kind: "oficio", cat: "Fletero", name: "Fletes Cabrera", desc: "Mudanzas y fletes en el pueblo y la zona rural. Camioneta con lona.", zone: "Todo el pueblo y rural", phone: "3584222008", open: ["07:00", "20:00", "0,1,2,3,4,5,6"], age: 22 },
    { key: "cuidadora", owner: "elena", kind: "oficio", cat: "Cuidado de personas", name: "Elena Paz · Cuidado de personas", desc: "Acompañamiento de adultos mayores y cuidado de niños. Referencias disponibles.", zone: "Sur, Centro y Este", phone: "3584222009", age: 18 },
  ];
  const LID: Record<string, number> = {};
  for (const l of L_) {
    LID[l.key] = run(
      `INSERT INTO listings (kind,owner_id,category,name,description,address,zone,lat,lng,phone,whatsapp,open_time,close_time,open_days,license,emergency,verified,photos,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      l.kind, U[l.owner], l.cat, l.name, l.desc, l.addr ?? null, l.zone, l.pos?.[0] ?? null, l.pos?.[1] ?? null, l.phone, l.phone,
      l.open?.[0] ?? null, l.open?.[1] ?? null, l.open?.[2] ?? null, l.license ?? null, l.emergency ?? 0, l.verified ?? 0, photos(...(l.ph ?? [])), ago(l.age),
    );
  }
  const rate = db.prepare("INSERT INTO ratings (listing_id,user_id,stars,review,reply,created_at) VALUES (?,?,?,?,?,?)");
  const R = (l: string, u: string, s: number, text: string | null, d: number, reply: string | null = null) => rate.run(LID[l], U[u], s, text, reply, ago(d));
  R("almacen", "marta", 5, "Siempre atienden con una sonrisa y la verdura es fresquísima.", 22, "¡Gracias, Marta! Te esperamos.");
  R("almacen", "luis", 5, "Me llevaron el pedido a casa en veinte minutos.", 18);
  R("almacen", "carla", 4, "Muy bueno. A veces falta algún producto a la tarde.", 12, "Estamos reforzando el stock de la tarde, gracias por avisar.");
  R("almacen", "lucia", 5, null, 7);
  R("panaderia", "marta", 5, "Las facturas son lo mejor del pueblo.", 20);
  R("panaderia", "pedro", 5, null, 14);
  R("panaderia", "luis", 5, "El pan sale calentito todas las mañanas.", 6);
  R("ferreteria", "carla", 4, "Tienen casi todo y te aconsejan bien.", 15);
  R("ferreteria", "marta", 4, null, 9);
  R("ferreteria", "pedro", 5, "Me resolvieron una urgencia un sábado a la mañana.", 4);
  R("rotiseria", "luis", 3, "Rica comida, pero tardaron bastante el domingo.", 10, "Tenés razón, fue un día de mucha demanda. Ya sumamos personal.");
  R("rotiseria", "valentina", 4, "Las empanadas son buenísimas.", 5);
  R("cabanas", "joaquin", 5, "Impecable y muy cómodo. Volvería.", 16);
  R("cabanas", "marta", 5, "Las usó mi familia que vino de visita. Excelente atención.", 9);
  R("cabanas", "ramiro", 4, null, 4);
  R("pizzeria", "valentina", 5, "La mejor pizza a la piedra.", 11);
  R("pizzeria", "nelida", 4, "Muy rica, aunque el salón es algo ruidoso.", 6);
  R("farmacia", "nelida", 5, "Siempre me atienden con paciencia.", 25);
  R("farmacia", "marta", 5, null, 13);
  R("farmacia", "pedro", 4, "Buena atención.", 3);
  R("electricista", "marta", 5, "Puntual, prolijo y explicó todo lo que hizo.", 30, "¡Gracias! Cualquier cosa, avisame.");
  R("electricista", "carla", 5, "Vino un domingo por una urgencia. Muy recomendable.", 21);
  R("electricista", "pedro", 4, "Buen trabajo, el presupuesto fue claro.", 8);
  R("electricista", "sofia", 5, null, 3);
  R("gasista", "marta", 5, "Matriculado y muy cuidadoso con la revisión.", 28);
  R("gasista", "luis", 5, null, 17);
  R("gasista", "carla", 5, "Me explicó todo y dejó el certificado en regla.", 5);
  R("plomero", "marta", 4, "Resolvió el destape en una hora.", 19);
  R("plomero", "luis", 4, "Buen precio.", 12);
  R("plomero", "pedro", 3, "Llegó tarde pero el trabajo quedó bien.", 2);
  R("pintor", "lucia", 5, "Dejó las paredes perfectas.", 9);
  R("jardinero", "carla", 4, "Cumplido y ordenado.", 7); // solo 1-2 opiniones: se muestra como «Nuevo»
  R("jardinero", "sofia", 5, null, 4);
  R("fletero", "marta", 5, "Cuidó mis muebles como si fueran suyos.", 5);
  // electricista2, cuidadora, hostal, ropa, cuidado y albanil quedan sin opiniones a propósito (estado «Nuevo»)
  db.exec(`UPDATE listings SET
    avg = COALESCE((SELECT ROUND(AVG(stars),1) FROM ratings WHERE listing_id = listings.id),0),
    count = (SELECT COUNT(*) FROM ratings WHERE listing_id = listings.id)`);
  // Una ficha eliminada por moderación (no debe aparecer en ningún listado)
  run("INSERT INTO listings (kind,owner_id,category,name,description,address,zone,phone,deleted,created_at) VALUES ('comercio',?,'Otros','Oferta increíble 100% garantizada','Compre ya, solo hoy, transferí y te lo mandamos.','Sin dirección','Centro','3584000999',1,?)", U.ramiro, ago(2));

  /* ───────────── Muro ───────────── */
  const post = (author: string, category: string, title: string, body: string, o: { price?: number; cond?: string; phone?: string; at?: string; end?: string; place?: string; status?: string; hidden?: number; deleted?: number; photos?: string[]; expires?: string; starts?: string; endsAt?: string; sev?: string; life?: string; zone?: string; alert?: string; created: string }) =>
    run(
      `INSERT INTO posts (author_id,category,title,body,photos,price,condition,contact_phone,event_at,event_end_at,event_place,status,hidden,deleted,expires_at,starts_at,ends_at,severity,lifecycle,zone,alert_kind,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      U[author], category, title, body, photos(...(o.photos ?? [])), o.price ?? null, o.cond ?? null, o.phone ?? null, o.at ?? null, o.end ?? null, o.place ?? null,
      o.status ?? "active", o.hidden ?? 0, o.deleted ?? 0, o.expires ?? null, o.starts ?? null, o.endsAt ?? null, o.sev ?? "informativo", o.life ?? "active", o.zone ?? null, o.alert ?? null, o.created, o.created,
    );
  // Avisos oficiales en todos los estados
  const aviso1 = post("muni", "aviso", "Corte de agua programado en barrio Centro", "Mañana se interrumpe el servicio de agua en barrio Centro de 8 a 12 h por tareas de mantenimiento en la red. Guardá agua para la mañana.", { sev: "importante", zone: "Centro", endsAt: fut(40), created: ago(0, 3) });
  post("muni", "aviso", "Corte de energía programado en barrio Norte", "La cooperativa realiza trabajos en la red. El servicio se interrumpe durante el horario indicado.", { sev: "urgente", zone: "Norte", starts: fut(2), endsAt: fut(5), created: ago(0, 1) });
  post("muni", "aviso", "Cambio de horario de atención en la municipalidad", "Durante esta semana la atención al público será de 8 a 13 h.", { sev: "informativo", endsAt: fut(24 * 5), created: ago(1) });
  post("muni", "aviso", "Vacunación antigripal en el centro de salud", "Se aplican vacunas antigripales a mayores de 65 años y personas con factores de riesgo. Llevar DNI.", { sev: "importante", endsAt: fut(24 * 9), created: ago(2) });
  post("muni", "aviso", "Jornada de descacharrado", "Retiro de residuos voluminosos el sábado en barrio Sur.", { sev: "informativo", zone: "Sur", endsAt: ago(1), created: ago(8) }); // vencido: figura como finalizado
  post("muni", "aviso", "Corte de calle por obras en Belgrano", "La calle Belgrano estuvo cortada entre Mitre y Sarmiento.", { sev: "importante", life: "cancelled", endsAt: fut(30), created: ago(1, 5) }); // cancelado
  post("muni", "aviso", "Viento fuerte en la zona", "Se esperan vientos fuertes. Asegurá techos, chapas y objetos sueltos.\n\nMensaje de la Municipalidad de Sampacho. Para información oficial sobre el tiempo, consultá el Servicio Meteorológico Nacional (https://www.smn.gob.ar/).", { sev: "urgente", alert: "viento", zone: "Norte", endsAt: fut(7), created: ago(0, 1) }); // ALERTA vigente (banner rojo)
  // Eventos
  const evCena = post("marta", "evento", "Cena a beneficio del club", "Cena de camaradería para juntar fondos para la cancha de bochas. Habrá música en vivo y sorteos. Tarjetas en la secretaría del club.", { at: local(0, "21:00"), end: local(1, "01:00"), place: "Club Sportivo, Mitre 500", photos: ["cena"], created: ago(3) });
  post("muni", "evento", "Feria de emprendedores en la plaza", "Primera feria de emprendedores locales: comidas, artesanías y plantas. Entrada libre y gratuita.", { at: local(2, "10:00"), end: local(2, "18:00"), place: "Plaza principal", photos: ["feria", "plaza"], created: ago(5) });
  post("sofia", "evento", "Taller de panificación para chicos", "Los chicos aprenden a amasar y hornear. Cupos limitados, inscripción en la rotisería.", { at: local(4, "16:00"), place: "Rotisería Los Álamos", created: ago(2) });
  post("joaquin", "evento", "Torneo de fútbol mixto de verano", "Torneo entre barrios en el polideportivo. Inscripción de equipos hasta el jueves.", { at: local(9, "09:00"), place: "Polideportivo municipal", created: ago(4) });
  post("muni", "evento", "Acto por el aniversario del pueblo", "Acto oficial con desfile de instituciones y números artísticos.", { at: local(25, "11:00"), place: "Plaza principal", created: ago(6) });
  post("marta", "evento", "Muestra de fotografía (ya realizada)", "Muestra de fotos antiguas del pueblo en la biblioteca.", { at: local(-6, "18:00"), place: "Biblioteca popular", created: ago(14) }); // pasado
  post("pedro", "evento", "Peña folklórica (suspendida)", "Se suspende por mal tiempo. Avisaremos la nueva fecha.", { at: local(3, "21:30"), place: "Club social", life: "cancelled", created: ago(5) }); // cancelado
  // Noticias
  post("rosa", "noticia", "Se reabre la biblioteca popular los sábados", "Desde este sábado la biblioteca atiende de 9 a 13 h. Hay talleres de lectura para chicos y se reciben donaciones de libros.", { photos: ["biblioteca"], created: ago(1) });
  post("muni", "noticia", "Nuevo contenedor de reciclables en la plaza", "Se instaló un contenedor para plásticos, papel y vidrio frente a la plaza principal. Pedimos usarlo limpio y seco.", { created: ago(3) });
  post("marta", "noticia", "La huerta comunitaria ya tiene sus primeros canteros", "Gracias a los vecinos que se sumaron: ya están armados seis canteros en el predio de la estación.", { photos: ["jornada"], created: ago(4) });
  // Ventas
  post("luis", "venta", "Bicicleta rodado 26 en buen estado", "Bicicleta mountain bike con luces y portaequipaje. Se entrega con inflador. Se puede ver en barrio Norte.", { price: 85000, cond: "usado", phone: "3584000011", photos: ["bici"], expires: fut(24 * 25), created: ago(2) });
  post("carla", "venta", "Cuna de madera con colchón", "Cuna en muy buen estado, incluye colchón. Se retira por barrio Sur.", { price: 45000, cond: "usado", phone: "3584000012", expires: fut(24 * 20), created: ago(5) });
  post("hernan", "venta", "Taladro percutor nuevo, en caja", "Taladro percutor 800 W con maletín y juego de mechas. Sin uso.", { price: 62000, cond: "nuevo", phone: "3584000019", expires: fut(24 * 28), created: ago(1) });
  post("elena", "venta", "Heladera familiar (vendida)", "Heladera con freezer en funcionamiento.", { price: 150000, cond: "usado", phone: "3584000020", status: "sold", expires: fut(24 * 10), created: ago(12) });
  post("ramiro", "venta", "Silla de oficina ergonómica", "Poco uso. Retira por el centro.", { price: 38000, cond: "usado", phone: "3584000023", expires: ago(2), created: ago(33) }); // vencida (30 días)
  // Perdidos y encontrados
  const perro = post("carla", "perdido", "Perrito perdido: collar rojo", "Se perdió el domingo por la zona de la plaza. Es chiquito, marrón, responde al nombre de Toto. Si lo ves, escribime por favor.", { phone: "3584000012", photos: ["perro"], created: ago(3) });
  const perroOk = post("joaquin", "perdido", "Perra encontrada cerca del polideportivo", "Apareció una perra mansa, blanca con manchas. Está a resguardo, buscamos a su familia.", { phone: "3584000021", status: "resolved", photos: ["perro-encontrado"], created: ago(9) });
  // Empleo (categoría del muro)
  post("carla", "empleo", "Se busca ayudante de panadería", "Panadería La Espiga busca ayudante, turno mañana. Presentarse con CV en San Martín 640.", { phone: "3584111002", created: ago(5) });
  // Contenido moderado
  const spam = post("ramiro", "noticia", "GANÁ DINERO FÁCIL!!! entrá a este link", "Invertí hoy y duplicá tu dinero en 24 horas, escribime ya.", { created: ago(2) });
  post("ramiro", "venta", "Celular último modelo a mitad de precio", "Transferí primero y te lo mandamos por correo. Sin garantía.", { price: 20000, cond: "nuevo", phone: "3584000023", hidden: 1, expires: fut(24 * 20), created: ago(3) }); // oculto por 3 denuncias
  post("susp", "noticia", "Publicación eliminada por moderación", "Contenido que incumplía las reglas.", { deleted: 1, created: ago(6) });

  // Comentarios, me gusta y denuncias
  const cm = db.prepare("INSERT INTO comments (kind,target_id,user_id,body,hidden,created_at) VALUES (?,?,?,?,?,?)");
  cm.run("post", evCena, U.luis, "¡Ahí estaremos! ¿Hay menú para celíacos?", 0, ago(0, 4));
  cm.run("post", evCena, U.marta, "Sí, Luis, avisá cuando saques la tarjeta y lo coordinamos.", 0, ago(0, 3));
  cm.run("post", evCena, U.lucia, "¿Se puede pagar con transferencia?", 0, ago(0, 2));
  cm.run("post", evCena, U.ramiro, "Comprá en mi sitio: ofertas imperdibles www.ejemplo.test", 1, ago(0, 1)); // comentario oculto
  cm.run("post", perro, U.pedro, "Lo vi ayer por Mitre y Belgrano, iba hacia la plaza.", 0, ago(2));
  cm.run("post", perro, U.carla, "¡Gracias, Pedro! Salgo a buscarlo.", 0, ago(2));
  cm.run("post", perroOk, U.carla, "¡Qué alegría que esté a salvo! Espero que aparezca la familia.", 0, ago(8));
  cm.run("post", aviso1, U.sofia, "¿Hasta qué hora estará cortado el agua?", 0, ago(0, 2));
  cm.run("post", aviso1, U.muni, "Se restablece alrededor de las 12 h. Si se demora, lo informamos en este aviso.", 0, ago(0, 1));
  const lk = db.prepare("INSERT OR IGNORE INTO likes (post_id,user_id) VALUES (?,?)");
  for (const u of ["luis", "carla", "pedro", "lucia", "diego", "sofia"]) lk.run(evCena, U[u]);
  for (const u of ["marta", "pedro", "valentina"]) lk.run(perro, U[u]);
  lk.run(aviso1, U.marta);
  const rp = db.prepare("INSERT OR IGNORE INTO reports (kind,target_id,user_id,reason,status,created_at) VALUES (?,?,?,?,?,?)");
  rp.run("post", spam, U.marta, "Es spam o publicidad", "open", ago(1));
  rp.run("post", spam, U.luis, "Es una estafa", "open", ago(1)); // 2 denuncias abiertas: falta 1 para ocultarse solo
  const hiddenPost = Number(db.prepare("SELECT id FROM posts WHERE hidden = 1 LIMIT 1").get()!.id);
  for (const u of ["pedro", "carla", "sofia"]) rp.run("post", hiddenPost, U[u], "Es una estafa", "open", ago(2));
  rp.run("comment", Number(db.prepare("SELECT id FROM comments WHERE hidden = 1 LIMIT 1").get()!.id), U.marta, "Es spam o publicidad", "resolved", ago(0, 1));

  /* ───────────── Reclamos (todos los estados) ───────────── */
  let claimN = 0;
  const claim = (u: string, cat: string, desc: string, addr: string, pos: [number, number], status: string, o: { area?: string; next?: string | null; created: string; closed?: string; rating?: number; ph?: string[]; incident?: number } ) => {
    claimN += 1;
    return run(
      `INSERT INTO claims (number,user_id,category,description,address,lat,lng,photos,status,area,rating,created_at,closed_at,next_update_at,incident_id,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      `R-${year}-${String(claimN).padStart(4, "0")}`, U[u], cat, desc, addr, pos[0], pos[1], photos(...(o.ph ?? [])), status, o.area ?? null, o.rating ?? null, o.created, o.closed ?? null, o.next ?? null, o.incident ?? null, o.created,
    );
  };
  const ev = db.prepare("INSERT INTO claim_events (claim_id,user_id,status,comment,visibility,kind,created_at) VALUES (?,?,?,?,?,?,?)");
  const E = (c: number, who: string, status: string, text: string | null, d: number, h = 0, vis = "author", kind = "status") => ev.run(c, U[who], status, text, vis, kind, ago(d, h));

  const cLuz1 = claim("carla", "Alumbrado", "La luminaria de la esquina de Belgrano y Mitre está apagada hace una semana. De noche queda muy oscuro.", "Belgrano y Mitre", near(-2, 1), "en_proceso", { area: "Servicios Públicos", next: fut(24 * 4), created: ago(6), ph: ["luminaria"] });
  E(cLuz1, "carla", "recibido", "Reclamo presentado.", 6);
  E(cLuz1, "obras", "en_revision", "Lo derivamos al área de Servicios Públicos. Lo atiende: Servicios Públicos.", 5);
  E(cLuz1, "obras", "en_revision", "Posible falla en la lámpara; confirmar con cuadrilla.", 5, 0, "municipal", "note");
  E(cLuz1, "obras", "en_proceso", "La cuadrilla pasa el jueves a cambiar la lámpara. Próxima novedad prevista en 4 días.", 2);

  const cLuz2 = claim("lucia", "Alumbrado", "Hay dos luminarias apagadas en la cuadra de Belgrano 300. Se ve muy poco al caminar de noche.", "Belgrano 300", near(-2, 2), "en_revision", { area: "Servicios Públicos", next: fut(24 * 6), created: ago(4) });
  E(cLuz2, "lucia", "recibido", "Reclamo presentado.", 4);
  E(cLuz2, "obras", "en_revision", "Lo estamos revisando junto con otros reclamos de la misma zona. Lo atiende: Servicios Públicos.", 3);

  const cLuz3 = claim("hernan", "Alumbrado", "Luminaria intermitente frente a la ferretería, parpadea toda la noche.", "Belgrano 280", near(-2, 2), "recibido", { created: ago(1) });
  E(cLuz3, "hernan", "recibido", "Reclamo presentado.", 1);

  const cBache1 = claim("luis", "Calles y baches", "Bache profundo sobre calle Sarmiento al 200, se lleva puesta la rueda de los autos.", "Sarmiento 200", near(2, -3), "en_proceso", { area: "Obras Públicas", next: ago(0, 6), created: ago(9), ph: ["bache"] }); // actualización VENCIDA
  E(cBache1, "luis", "recibido", "Reclamo presentado.", 9);
  E(cBache1, "obras", "en_revision", "Derivado a Obras Públicas. Lo atiende: Obras Públicas.", 8);
  E(cBache1, "obras", "en_proceso", "Se programó el bacheo con el próximo lote de asfalto. Próxima novedad prevista en 5 días.", 6);
  E(cBache1, "obras", "en_proceso", "Falta confirmar el camión de asfalto con el proveedor.", 6, 0, "municipal", "note");

  const cBache2 = claim("diego", "Calles y baches", "Pozo en la bocacalle de Alvear y España, peligroso para motos.", "Alvear y España", near(-3, -5), "recibido", { created: ago(2) });
  E(cBache2, "diego", "recibido", "Reclamo presentado.", 2);

  const cResiduo = claim("marta", "Residuos", "El contenedor de la esquina de la estación se desborda los fines de semana.", "Estación", near(3, -5), "resuelto", { area: "Servicios Públicos", created: ago(18), closed: ago(10), rating: 5, ph: ["contenedor"] });
  E(cResiduo, "marta", "recibido", "Reclamo presentado.", 18);
  E(cResiduo, "obras", "en_revision", "Recibido. Lo atiende: Servicios Públicos.", 16);
  E(cResiduo, "obras", "en_proceso", "Se agregó un segundo contenedor. Próxima novedad prevista en 3 días.", 14);
  E(cResiduo, "obras", "resuelto", "Se aumentó la frecuencia de recolección en la zona y se sumó un contenedor.", 10);

  const cRuido = claim("nelida", "Ruidos molestos", "Música muy fuerte todas las noches en un local de la esquina.", "Esquina de Mitre y España", near(0, -4), "rechazado", { created: ago(15), closed: ago(12) });
  E(cRuido, "nelida", "recibido", "Reclamo presentado.", 15);
  E(cRuido, "obras", "rechazado", "Este reclamo corresponde a Inspección General y no a Obras Públicas. Te pedimos presentarlo en la mesa de entradas con el nombre del local para poder labrar el acta.", 12);

  const cArbol = claim("sofia", "Arbolado", "Un árbol de la vereda tiene ramas secas que pueden caer sobre los autos.", "Sarmiento 120", near(2, -4), "en_revision", { area: "Medio Ambiente", next: fut(24 * 7), created: ago(3) });
  E(cArbol, "sofia", "recibido", "Reclamo presentado.", 3);
  E(cArbol, "obras", "en_revision", "Un técnico visita la zona esta semana para evaluar la poda. Lo atiende: Medio Ambiente.", 2);

  const cAnimal = claim("bruno", "Animales sueltos", "Perros sueltos en el camino rural que asustan a los ciclistas.", "Camino rural km 3", near(8, 8), "recibido", { created: ago(0, 8) });
  E(cAnimal, "bruno", "recibido", "Reclamo presentado.", 0, 8);

  const cAgua = claim("joaquin", "Agua y cloacas", "Pérdida de agua en la vereda desde hace días.", "Rivadavia 200", near(0, 4), "resuelto", { area: "Servicios Públicos", created: ago(30), closed: ago(24) });
  E(cAgua, "joaquin", "recibido", "Reclamo presentado.", 30);
  E(cAgua, "obras", "en_revision", "Se derivó a la cooperativa de agua. Lo atiende: Servicios Públicos.", 29);
  E(cAgua, "obras", "resuelto", "La cooperativa reparó la pérdida.", 24); // resuelto sin calificar: permite probar «calificar»

  // Incidentes internos
  const incActivo = run("INSERT INTO incidents (title,category,place,area,summary,created_by,created_at) VALUES (?,?,?,?,?,?,?)", "Luminarias apagadas en Belgrano (Mitre a Alvear)", "Alumbrado", "Belgrano, entre Mitre y Alvear", "Servicios Públicos", "Mismo tramo y misma cuadrilla: conviene atender juntos.", U.obras, ago(3));
  for (const c of [cLuz1, cLuz2]) {
    db.prepare("UPDATE claims SET incident_id = ? WHERE id = ?").run(incActivo, c);
    db.prepare("INSERT INTO incident_events (incident_id,user_id,kind,claim_id,note,created_at) VALUES (?,?,?,?,?,?)").run(incActivo, U.obras, "asociado", c, "Mismo tramo y misma cuadrilla.", ago(3));
  }
  const incCerrado = run("INSERT INTO incidents (title,category,place,area,status,summary,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)", "Contenedores en zona estación", "Residuos", "Estación", "Servicios Públicos", "cerrado", "Ya resuelto.", U.obras, ago(15));
  db.prepare("UPDATE claims SET incident_id = ? WHERE id = ?").run(incCerrado, cResiduo);
  db.prepare("INSERT INTO incident_events (incident_id,user_id,kind,claim_id,note,created_at) VALUES (?,?,?,?,?,?)").run(incCerrado, U.obras, "asociado", cResiduo, "Reclamo del contenedor.", ago(15));
  db.prepare("INSERT INTO incident_events (incident_id,user_id,kind,note,created_at) VALUES (?,?,?,?,?)").run(incCerrado, U.obras, "cerrado", "Incidente cerrado. Los reclamos conservan su estado.", ago(9));
  // (cLuz3 y los baches quedan sin agrupar: el panel sugiere agruparlos)

  /* ───────────── Pedidos (Necesito) ───────────── */
  const rq = (u: string, kind: string, title: string, body: string, cat: string, zone: string | null, expires: string, created: string, o: { status?: string; hidden?: number; closed?: string; ph?: string[] } = {}) =>
    run("INSERT INTO community_requests (author_id,kind,title,body,category,zone,photos,expires_at,status,hidden,created_at,closed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", U[u], kind, title, body, cat, zone, photos(...(o.ph ?? [])), expires, o.status ?? "abierto", o.hidden ?? 0, created, o.closed ?? null);
  const resp = (req: number, l: string, u: string, text: string, d: number, status = "activa") => run("INSERT INTO request_responses (request_id,listing_id,user_id,body,status,created_at) VALUES (?,?,?,?,?,?)", req, LID[l], U[u], text, status, ago(d));
  const r1 = rq("marta", "servicio", "Busco electricista para cambiar el tablero", "Es una casa de barrio Estación, tablero viejo con térmicas que saltan. Necesito presupuesto esta semana.", "Electricista", "Estación", fut(24 * 5), ago(1));
  resp(r1, "electricista", "luis", "Puedo ir el jueves a hacer el presupuesto sin cargo. Trabajo con materiales de primera marca.", 0, "activa");
  resp(r1, "electricista2", "ramiro", "Estoy disponible esta semana. Pasame fotos del tablero por WhatsApp.", 0);
  const r2 = rq("pedro", "producto", "¿Quién tiene un repuesto de canilla monocomando?", "Busco el cartucho de una canilla monocomando marca común. Puedo pasar a buscarlo.", "Ferretería", "Centro", fut(24 * 3), ago(0, 5)); // sin respuestas todavía
  void r2;
  const r3 = rq("carla", "servicio", "Busco quien cuide a mi hijo los sábados", "Necesitaba alguien de confianza para los sábados a la mañana.", "Cuidado de personas", "Sur", fut(-24), ago(8), { status: "resuelto", closed: ago(6) });
  const r3a = resp(r3, "cuidadora", "elena", "Tengo los sábados libres y referencias. Podemos coordinar una entrevista.", 7);
  db.prepare("UPDATE community_requests SET chosen_response_id = ? WHERE id = ?").run(r3a, r3);
  run("INSERT INTO community_outcomes (source_type,source_id,author_id,body,photos,created_at) VALUES ('pedido',?,?,?,?,?)", r3, U.carla, "Encontré una niñera recomendada por una vecina. ¡Gracias a todos los que respondieron!", photos("pedido-ok"), ago(6));
  rq("sofia", "producto", "Busco horno industrial usado", "Para la rotisería. Que funcione bien y entre por una puerta estándar.", "Gastronomía", "Estación", fut(-48), ago(12)); // VENCIDO (renovable)
  const r5 = rq("joaquin", "servicio", "Necesito pintar una casa de dos pisos", "Pintura exterior e interior. Pido presupuesto de mano de obra.", "Pintor", "Este", fut(24 * 12), ago(2));
  resp(r5, "plomero", "diego", "Respuesta retirada por moderación (contenido de spam).", 1, "oculta");
  resp(r5, "albanil", "diego", "Puedo hacer los arreglos previos de revoque antes de pintar.", 1);
  rq("nelida", "servicio", "Busco quien arregle una persiana", "Persiana enrollable atascada en una ventana del primer piso.", "Albañil", "Oeste", fut(24 * 6), ago(3), { status: "cancelado", closed: ago(2) });
  rq("ramiro", "servicio", "OFERTA: te hago cualquier trabajo barato", "Escribime por privado, transferí un adelanto.", "Otro", null, fut(24 * 5), ago(2), { hidden: 1 }); // retirado por moderación

  /* ───────────── Empleo ───────────── */
  const job = db.prepare("INSERT INTO jobs (author_id,kind,title,body,category,zone,contact_phone,expires_at,status,hidden,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  job.run(U.carla, "oferta", "Ayudante de panadería, turno mañana", "Panadería La Espiga busca ayudante para el turno mañana, de lunes a sábado. Se valora experiencia, pero se enseña.", "Panadería", "Centro", "3584111002", fut(24 * 20), "abierta", 0, ago(2));
  job.run(U.sofia, "oferta", "Se busca repartidor con moto", "Reparto de pedidos por la tarde, de lunes a viernes. Moto propia y documentación al día.", "Gastronomía", "Estación", "3584111004", fut(24 * 25), "abierta", 0, ago(1));
  job.run(U.hernan, "oferta", "Ayudante de depósito (medio día)", "Carga y orden de mercadería. Disponibilidad para la mañana.", "Ferretería", "Centro", "3584111003", fut(24 * 15), "abierta", 0, ago(3));
  job.run(U.valentina, "busco", "Busco trabajo de limpieza por horas", "Tengo referencias y disponibilidad por la tarde. Puedo ir a domicilios o comercios.", "Servicios", "Norte", "3584000018", fut(24 * 25), "abierta", 0, ago(1));
  job.run(U.ramiro, "busco", "Electricista con experiencia busca changas", "Instalaciones simples, cambio de luminarias y tomas.", "Electricista", "Centro", "3584000023", fut(24 * 18), "abierta", 0, ago(4));
  job.run(U.pedro, "oferta", "Cajero/a para el almacén (cubierto)", "Ya se cubrió el puesto, gracias a todos.", "Almacén", "Centro", "3584111001", fut(24 * 10), "cubierta", 0, ago(12));
  job.run(U.diego, "oferta", "Peón de albañil (vencido)", "Obra en construcción durante dos semanas.", "Albañil", "Oeste", "3584000015", fut(-24 * 3), "abierta", 0, ago(35));

  /* ───────────── Ideas ───────────── */
  const idea = (u: string, title: string, body: string, cat: string, status: string, o: { link?: string; muni?: number; created: string; ph?: string; closing?: string; hidden?: number }) =>
    run("INSERT INTO ideas (author_id,title,body,category,status,group_link,photo,municipal,hidden,closing_note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      U[u], title, body, cat, status, o.link ?? null, o.ph ? photo(o.ph) : null, o.muni ?? 0, o.hidden ?? 0, o.closing ?? null, o.created);
  const iHuerta = idea("marta", "Huerta comunitaria en el predio del ferrocarril", "Armemos una huerta para que cada familia tenga su cantero. Los chicos de la escuela pueden aprender a sembrar y lo que se coseche va a la copa de leche.", "Espacios verdes", "en_marcha", { link: "https://chat.whatsapp.com/HuertaSampachoTest2026", ph: "huerta", created: ago(25) });
  const iTorneo = idea("joaquin", "Torneo de fútbol mixto de verano", "Torneo entre barrios, equipos mixtos, en la cancha del polideportivo. Lo recaudado va para las camisetas de las inferiores.", "Deporte", "propuesta", { created: ago(10) });
  const iBici = idea("carla", "Bicisendas hasta la escuela", "Marcar una bicisenda segura desde barrio Sur hasta la escuela primaria para que los chicos puedan ir en bici.", "Seguridad vial", "propuesta", { muni: 1, created: ago(7) });
  const iBib = idea("sofia", "Campaña de donación de libros", "Juntar libros para la biblioteca popular y armar una feria del libro usado.", "Cultura", "realizada", { link: "https://chat.whatsapp.com/LibrosSampachoTest2026", created: ago(40), closing: "Se juntaron más de 300 libros y se armó la feria en la plaza. ¡Gracias a todos!" });
  const iCine = idea("valentina", "Cine al aire libre en verano", "Proyectar películas en la plaza una vez por mes. Hace falta proyector, pantalla y permiso para usar el espacio.", "Cultura", "cancelada", { created: ago(30), closing: "No se consiguió el permiso del espacio ni el equipo a tiempo. Lo retomaremos el año que viene." });
  const iAlarma = idea("ramiro", "Idea de prueba para moderación", "Texto de una idea retirada por moderación.", "Otra", "propuesta", { created: ago(5), hidden: 1 });
  void iAlarma;
  const sup = db.prepare("INSERT OR IGNORE INTO idea_supports (idea_id,user_id) VALUES (?,?)");
  ["marta", "luis", "carla", "pedro", "lucia", "diego", "sofia", "bruno", "elena", "nelida"].forEach((u) => sup.run(iHuerta, U[u]));
  ["joaquin", "luis", "marta", "bruno", "hernan"].forEach((u) => sup.run(iTorneo, U[u]));
  ["carla", "pedro", "marta", "elena"].forEach((u) => sup.run(iBici, U[u]));
  ["sofia", "marta", "luis", "carla", "pedro", "lucia"].forEach((u) => sup.run(iBib, U[u]));
  ["valentina", "sofia"].forEach((u) => sup.run(iCine, U[u]));
  cm.run("idea", iHuerta, U.luis, "Puedo aportar herramientas y dos días de trabajo.", 0, ago(20));
  cm.run("idea", iHuerta, U.marta, "¡Genial, Luis! Sumate al grupo de WhatsApp.", 0, ago(19));
  cm.run("idea", iBici, U.pedro, "Muy buena idea. ¿Se podría pedir la pintura a la municipalidad?", 0, ago(6));
  // Necesidades y compromisos (todos los estados)
  const need = db.prepare("INSERT INTO idea_needs (idea_id,kind,description,target,unit,deadline,status) VALUES (?,?,?,?,?,?,?)");
  const nPers = Number(need.run(iHuerta, "personas", "Vecinos para la jornada de armado de canteros", 8, "personas", ymd(10), "abierta").lastInsertRowid);
  const nHerr = Number(need.run(iHuerta, "herramientas", "Palas y carretillas", 4, "unidades", null, "abierta").lastInsertRowid);
  const nMat = Number(need.run(iHuerta, "materiales", "Madera para los bordes de los canteros", 12, "unidades", ymd(14), "abierta").lastInsertRowid);
  const nPerm = Number(need.run(iHuerta, "permiso", "Autorización para usar el predio", 1, "trámite", null, "abierta").lastInsertRowid);
  void nPerm;
  const nLibros = Number(need.run(iBib, "materiales", "Libros para la feria", 300, "libros", null, "cerrada").lastInsertRowid);
  const cmt = db.prepare("INSERT INTO idea_commitments (need_id,user_id,proposed,accepted,fulfilled,status,note,reason,public_name) VALUES (?,?,?,?,?,?,?,?,?)");
  cmt.run(nPers, U.luis, 3, 3, 0, "aceptada", "Puedo los sábados.", null, 1);
  cmt.run(nPers, U.lucia, 2, 2, 2, "cumplida", null, null, 1);
  cmt.run(nPers, U.carla, 2, 0, 0, "pendiente", "Los chicos también ayudan.", null, 0);
  cmt.run(nPers, U.pedro, 2, 0, 0, "pendiente", null, null, 0); // con carla: 4 pendientes > cupo restante (3): sirve para probar «No hay cupo»
  cmt.run(nPers, U.bruno, 1, 0, 0, "rechazada", null, "Ya tenemos cubiertos los días de semana.", 0);
  cmt.run(nPers, U.nelida, 1, 0, 0, "retirada", null, null, 0);
  cmt.run(nHerr, U.pedro, 2, 2, 2, "cumplida", "Palas del almacén.", null, 1);
  cmt.run(nHerr, U.hernan, 2, 2, 1, "aceptada", "Carretillas, una ya entregada.", null, 1);
  cmt.run(nMat, U.diego, 6, 6, 0, "aceptada", "Tablas sobrantes de una obra.", null, 0);
  cmt.run(nLibros, U.marta, 120, 120, 120, "cumplida", null, null, 1);
  cmt.run(nLibros, U.luis, 180, 180, 180, "cumplida", null, null, 1);
  const perm = db.prepare("INSERT INTO idea_permission_requests (idea_id,description,status,reference,decided_by,decided_at) VALUES (?,?,?,?,?,?)");
  perm.run(iHuerta, "Autorización para usar el predio del ferrocarril", "en_revision", "Expediente 2026-0457", U.obras, null);
  perm.run(iHuerta, "Permiso para conectar una canilla de agua", "pendiente", null, null, null);
  perm.run(iBib, "Autorización para ocupar la plaza el día de la feria", "aprobado", "Resolución 118/2026", U.muni, ago(30));
  perm.run(iCine, "Permiso para usar la plaza en horario nocturno", "rechazado", "Resolución 131/2026", U.muni, ago(18));
  const up = db.prepare("INSERT INTO idea_updates (idea_id,author_id,kind,body,created_at) VALUES (?,?,?,?,?)");
  up.run(iHuerta, U.marta, "actividad", "Primera jornada de limpieza el sábado a la mañana, en el predio de la estación. Llevar guantes.", ago(2));
  up.run(iHuerta, U.marta, "novedad", "Ya hay permiso verbal para usar el predio; seguimos esperando el papel oficial.", ago(10));
  up.run(iBib, U.sofia, "cierre", "Idea realizada: Se juntaron más de 300 libros y se armó la feria en la plaza. ¡Gracias a todos!", ago(20));
  up.run(iCine, U.valentina, "cierre", "Idea cancelada: No se consiguió el permiso del espacio ni el equipo a tiempo.", ago(15));
  run("INSERT INTO community_outcomes (source_type,source_id,author_id,body,photos,created_at) VALUES ('idea',?,?,?,?,?)", iBib, U.sofia, "Se juntaron más de 300 libros y se armó la feria en la plaza. ¡Gracias a todos los que donaron!", photos("feria"), ago(20));
  run("INSERT INTO community_outcomes (source_type,source_id,author_id,body,photos,created_at) VALUES ('publicacion',?,?,?,?,?)", perroOk, U.joaquin, "La familia de la perrita la encontró gracias a la publicación. ¡Gracias por compartir!", photos("perro-encontrado"), ago(8));
  void iTorneo;

  /* ───────────── Encuestas ───────────── */
  const poll = (q: string, body: string | null, zone: string | null, closes: string, status: string, created: string, opts: string[]) => {
    const id = run("INSERT INTO polls (author_id,question,body,zone,closes_at,status,created_at) VALUES (?,?,?,?,?,?,?)", U.muni, q, body, zone, closes, status, created);
    return opts.map((l, i) => run("INSERT INTO poll_options (poll_id,label,sort) VALUES (?,?,?)", id, l, i)).concat([id]);
  };
  const vote = (pollId: number, option: number, who: string) => db.prepare("INSERT INTO poll_votes (poll_id,user_id,option_id,created_at) VALUES (?,?,?,?)").run(pollId, U[who], option, ago(1));
  const p1 = poll("¿Qué obra querés que se priorice este año?", "Elegí la que más necesita tu barrio. La consulta no es vinculante: sirve para ordenar prioridades.", null, fut(24 * 6), "abierta", ago(1), ["Arreglo de calles", "Más luminarias", "Cordón cuneta", "Espacios verdes"]);
  const pid1 = p1[4];
  [["luis", 0], ["marta", 1], ["carla", 1], ["pedro", 0]].forEach(([u, o]) => vote(pid1, p1[o as number], u as string));
  const p2 = poll("¿Dónde ubicamos el nuevo punto de reciclaje de la zona Norte?", "Solo vecinos de Norte. La decisión final la toma la municipalidad con los resultados.", "Norte", fut(24 * 10), "abierta", ago(2), ["Frente a la escuela", "En la plazoleta", "Cerca del dispensario"]);
  vote(p2[3], p2[0], "luis");
  const p3 = poll("¿En qué horario preferís la feria de emprendedores?", null, null, ago(3), "cerrada", ago(12), ["Mañana", "Tarde", "Noche"]);
  [["marta", 1], ["luis", 1], ["carla", 0], ["pedro", 1], ["lucia", 2], ["diego", 1], ["sofia", 0]].forEach(([u, o]) => vote(p3[3], p3[o as number], u as string));
  poll("¿Te interesa un taller de huerta en las escuelas? (sin votos aún)", "Consulta nueva, todavía sin votos: sirve para probar el primer voto.", null, fut(24 * 14), "abierta", ago(0, 2), ["Sí", "No", "No sé"]);

  /* ───────────── Destacado de la semana ───────────── */
  const monday = (offsetWeeks: number) => { const d = new Date(now - 3 * 36e5); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offsetWeeks * 7); return d.toISOString().slice(0, 10); };
  const ft = db.prepare("INSERT INTO featured_listings (listing_id,week_start,pitch,status) VALUES (?,?,?,?)");
  ft.run(LID.panaderia, monday(-3), "El horno a leña que se huele desde la plaza.", "elegido");
  ft.run(LID.cabanas, monday(-2), "Descanso en familia a pocas cuadras de todo.", "elegido");
  ft.run(LID.rotiseria, monday(-1), "Comida casera como en casa.", "elegido");
  ft.run(LID.almacen, monday(0), "Verdura fresca todos los días y reparto sin cargo en el centro.", "postulado"); // se elige solo al abrir la app
  ft.run(LID.ferreteria, monday(0), "Te asesoramos para tu obra, sin vueltas.", "postulado");
  ft.run(LID.pizzeria, monday(1), "Pizza a la piedra y cerveza artesanal en la vereda.", "postulado");

  /* ───────────── Seguimientos, preferencias y notificaciones ───────────── */
  const fol = db.prepare("INSERT OR IGNORE INTO follows (user_id,target_type,target_id) VALUES (?,?,?)");
  [["marta", "tema", "evento"], ["marta", "zona", "Estación"], ["marta", "tema", "residuos"], ["marta", "ficha", String(LID.panaderia)], ["marta", "tema", "encuestas"],
   ["luis", "tema", "aviso"], ["luis", "tema", "rubro:Electricista"], ["luis", "tema", "pedidos"], ["luis", "tema", "trabajo"],
   ["carla", "zona", "Sur"], ["carla", "tema", "residuos"], ["pedro", "tema", "aviso"], ["pedro", "ficha", String(LID.ferreteria)],
   ["lucia", "tema", "evento"], ["sofia", "tema", "venta"], ["valentina", "tema", "trabajo"]].forEach(([u, t, id]) => fol.run(U[u], t, id));
  const np = db.prepare("INSERT OR REPLACE INTO notification_prefs (user_id,class,frequency) VALUES (?,?,?)");
  np.run(U.marta, "avisos", "inmediata"); np.run(U.marta, "novedades", "diaria"); np.run(U.marta, "pedidos", "inmediata");
  np.run(U.luis, "avisos", "inmediata"); np.run(U.luis, "novedades", "semanal"); np.run(U.carla, "novedades", "desactivada");
  const us = db.prepare("INSERT OR REPLACE INTO user_settings (user_id,quiet_start,quiet_end,urgent_override) VALUES (?,?,?,?)");
  us.run(U.marta, "22:00", "08:00", 0); us.run(U.luis, "23:00", "07:00", 1);
  const nt = db.prepare("INSERT OR IGNORE INTO notifications (user_id,class,event_key,title,body,href,reason,urgent,deliver_after,read_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  nt.run(U.carla, "reclamo", `seed:claim:${cLuz1}:1`, `Novedades de tu reclamo R-${year}-0001`, "En proceso: La cuadrilla pasa el jueves a cambiar la lámpara.", `/reclamos/${cLuz1}`, "Es un reclamo tuyo", 0, ago(2), null, ago(2));
  nt.run(U.luis, "reclamo", `seed:claim:${cBache1}:1`, `Novedades de tu reclamo R-${year}-0004`, "En proceso: Se programó el bacheo con el próximo lote de asfalto.", `/reclamos/${cBache1}`, "Es un reclamo tuyo", 0, ago(6), ago(5), ago(6));
  nt.run(U.marta, "avisos", "seed:alert", "Alerta: Viento fuerte", "Se esperan vientos fuertes. Asegurá techos, chapas y objetos sueltos.", "/", "Alerta para Norte", 1, ago(0, 1), null, ago(0, 1));
  nt.run(U.marta, "novedades", "seed:digest", "Resumen diario de novedades", "Hay novedades de los temas que seguís.", "/muro", "Seguís el tema “evento”", 0, fut(10), null, ago(0, 1)); // se entrega en el resumen (futuro)
  nt.run(U.luis, "pedidos", "seed:req", "Alguien busca: Busco electricista para cambiar el tablero", "Es una casa de barrio Estación…", `/necesito/${r1}`, "Seguís el rubro Electricista", 0, ago(1), null, ago(1));
  nt.run(U.muni, "reclamo", `seed:due:${cBache1}`, `Actualización pendiente: R-${year}-0004`, "Calles y baches. Venció la fecha de próxima actualización.", `/reclamos/${cBache1}`, "Recordatorio interno", 0, ago(0, 5), null, ago(0, 5));

  /* ───────────── Auditoría ───────────── */
  const au = db.prepare("INSERT INTO audit (user_id,action,detail,created_at) VALUES (?,?,?,?)");
  au.run(U.obras, "claim.update", `${cBache1} recibido→en_revision`, ago(8));
  au.run(U.rosa, "content.remove.post", "Publicación eliminada por spam", ago(6));
  au.run(U.muni, "notice.update", "Aviso corregido: fin extendido", ago(1));
  au.run(U.muni, "poll.create", String(pid1), ago(1));

  const count = (t: string) => Number((db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as { n: number }).n);
  return {
    accounts,
    counts: Object.fromEntries(["users", "posts", "comments", "claims", "claim_events", "incidents", "listings", "ratings", "community_requests", "request_responses", "jobs", "ideas", "idea_needs", "idea_commitments", "polls", "poll_votes", "waste_schedule", "tourist_places", "featured_listings", "notifications", "follows"].map((t) => [t, count(t)])),
  };
}
