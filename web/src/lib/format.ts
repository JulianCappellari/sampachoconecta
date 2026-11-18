export const TZ = "America/Argentina/Buenos_Aires";

/** Ahora en UTC con el formato de SQLite ('YYYY-MM-DD HH:MM:SS'). */
export const nowUtc = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString().slice(0, 19).replace("T", " ");

/** 'YYYY-MM-DDTHH:mm' escrito en hora de Argentina (UTC−3, sin horario de verano) → UTC de SQLite. */
export function localToUtc(local: string): string {
  const d = new Date(local + ":00Z");
  d.setUTCHours(d.getUTCHours() + 3);
  return d.toISOString().slice(0, 19).replace("T", " ");
}
/** UTC de SQLite → valor para <input type="datetime-local"> en hora argentina. */
export function utcToLocalInput(utc: string): string {
  const d = parseDb(utc);
  d.setUTCHours(d.getUTCHours() - 3);
  return d.toISOString().slice(0, 16);
}
/** Fecha y hora actuales de Argentina como 'YYYY-MM-DDTHH:mm'. */
export function nowLocal(): string {
  const d = new Date(Date.now() - 3 * 3600_000);
  return d.toISOString().slice(0, 16);
}
export function todayLabel(): string {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date());
}
export function fmtTime(utc: string): string {
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(parseDb(utc));
}

/** SQLite guarda 'YYYY-MM-DD HH:MM:SS' en UTC. */
export function parseDb(s: string): Date {
  return new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
}

export function timeAgo(s: string): string {
  const diff = Math.max(0, Date.now() - parseDb(s).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "recién";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? "ayer" : `hace ${d} días`;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: TZ }).format(parseDb(s));
}

export function fmtDateTime(s: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
    hour12: false,
  }).format(parseDb(s));
}

export function fmtDate(s: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }).format(
    parseDb(s),
  );
}

/** Fechas de eventos: 'YYYY-MM-DDTHH:mm' en hora local de Argentina, se muestran tal cual. */
export function eventParts(s: string) {
  const d = new Date(s.length === 16 ? s + ":00Z" : s.length === 10 ? s + "T00:00:00Z" : s);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-AR", { ...o, timeZone: "UTC" }).format(d);
  return {
    day: f({ day: "numeric" }),
    month: f({ month: "short" }).replace(".", ""),
    weekday: f({ weekday: "long" }),
    long: f({ weekday: "long", day: "numeric", month: "long" }),
    time: s.length >= 16 ? f({ hour: "2-digit", minute: "2-digit", hour12: false }) : "",
    key: s.slice(0, 10),
  };
}

export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export const money = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/** Normaliza un teléfono argentino para wa.me (sin 0 ni 15 iniciales). */
export function waNumber(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("549")) return d;
  if (d.startsWith("54")) d = d.slice(2);
  d = d.replace(/^0/, "");
  return "549" + d;
}
export const waLink = (phone: string, text?: string) =>
  `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function isOpenNow(l: { open_time: string | null; close_time: string | null; open_days: string | null }): boolean {
  if (!l.open_time || !l.close_time || !l.open_days) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const hh = get("hour") === "24" ? "00" : get("hour");
  const now = `${hh}:${get("minute")}`;
  const days = l.open_days.split(",").map(Number);
  if (!days.includes(wd)) return false;
  return l.open_time <= l.close_time ? now >= l.open_time && now < l.close_time : now >= l.open_time || now < l.close_time;
}

export function hoursLabel(l: { open_time: string | null; close_time: string | null; open_days: string | null }): string {
  if (!l.open_time || !l.close_time || !l.open_days) return "Horario a consultar";
  const days = l.open_days.split(",").map(Number).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  let dayTxt: string;
  const order = days.map((d) => (d + 6) % 7);
  const contiguous = order.every((v, i) => i === 0 || v === order[i - 1] + 1);
  if (days.length === 7) dayTxt = "Todos los días";
  else if (contiguous && days.length > 2) dayTxt = `${DAY_NAMES[days[0]]} a ${DAY_NAMES[days[days.length - 1]]}`;
  else dayTxt = days.map((d) => DAY_NAMES[d]).join(", ");
  return `${dayTxt} · ${l.open_time} a ${l.close_time} h`;
}

export const clamp = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
