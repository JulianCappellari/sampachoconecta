import "server-only";
import { all, one } from "./db";

const j = (s: string): string[] => {
  try {
    return JSON.parse(s) as string[];
  } catch {
    return [];
  }
};

export type RequestRow = {
  id: number;
  author_id: number;
  kind: "producto" | "servicio";
  title: string;
  body: string;
  category: string;
  zone: string | null;
  photos: string[];
  expires_at: string;
  status: "abierto" | "resuelto" | "cancelado";
  chosen_response_id: number | null;
  version: number;
  created_at: string;
  closed_at: string | null;
  author_name: string;
  responses: number;
  /** Se calcula al leer: un pedido vencido deja de aceptar respuestas sin depender de ningún cron. */
  effective: "abierto" | "vencido" | "resuelto" | "cancelado";
  days_left: number;
};
type Raw = Omit<RequestRow, "photos" | "effective" | "days_left"> & { photos: string; expired: number };

const SEL = `SELECT r.*, u.name AS author_name, (r.expires_at <= datetime('now')) AS expired,
  (SELECT COUNT(*) FROM request_responses x JOIN listings l ON l.id = x.listing_id
     WHERE x.request_id = r.id AND x.status = 'activa' AND l.deleted = 0) AS responses
  FROM community_requests r JOIN users u ON u.id = r.author_id`;

const map = (r: Raw): RequestRow => ({
  ...r,
  photos: j(r.photos),
  effective: r.status === "abierto" && r.expired ? "vencido" : r.status,
  days_left: Math.max(0, Math.ceil((new Date(r.expires_at.replace(" ", "T") + "Z").getTime() - Date.now()) / 864e5)),
});

export function listRequests(o: { category?: string; zone?: string; q?: string; closed?: boolean }) {
  const where = ["r.hidden = 0"];
  const params: (string | number)[] = [];
  if (o.closed) where.push("(r.status != 'abierto' OR r.expires_at <= datetime('now'))");
  else where.push("r.status = 'abierto' AND r.expires_at > datetime('now')");
  if (o.category) {
    where.push("r.category = ?");
    params.push(o.category);
  }
  if (o.zone) {
    where.push("r.zone = ?");
    params.push(o.zone);
  }
  if (o.q) {
    where.push("(r.title LIKE ? OR r.body LIKE ?)");
    params.push(`%${o.q}%`, `%${o.q}%`);
  }
  return all<Raw>(`${SEL} WHERE ${where.join(" AND ")} ORDER BY r.created_at DESC LIMIT 60`, ...params).map(map);
}

export function getRequest(id: number) {
  const r = one<Raw>(`${SEL} WHERE r.id = ?`, id);
  return r ? map(r) : undefined;
}

export type ResponseRow = {
  id: number;
  request_id: number;
  listing_id: number;
  user_id: number;
  body: string;
  status: string;
  created_at: string;
  listing_name: string;
  listing_category: string;
  /** Contacto comercial de la ficha; nulo si la ficha fue eliminada (se retira el dato de contacto). */
  phone: string | null;
  whatsapp: string | null;
};

/** Respuestas activas. Si la ficha se eliminó, se conserva la respuesta pero sin contacto. */
export function requestResponses(requestId: number) {
  return all<ResponseRow>(
    `SELECT x.id,x.request_id,x.listing_id,x.user_id,x.body,x.status,x.created_at,
       l.name AS listing_name, l.category AS listing_category,
       CASE WHEN l.deleted = 0 THEN l.phone END AS phone, CASE WHEN l.deleted = 0 THEN l.whatsapp END AS whatsapp
     FROM request_responses x JOIN listings l ON l.id = x.listing_id
     WHERE x.request_id = ? AND x.status = 'activa' ORDER BY x.created_at ASC`,
    requestId,
  );
}

export const eligibleListings = (userId: number) =>
  all<{ id: number; name: string; category: string }>("SELECT id,name,category FROM listings WHERE owner_id = ? AND deleted = 0 ORDER BY name", userId);

export const activeRequestsOf = (userId: number) =>
  one<{ n: number }>("SELECT COUNT(*) n FROM community_requests WHERE author_id = ? AND status='abierto' AND expires_at > datetime('now') AND hidden = 0", userId)?.n ?? 0;

export const myRequests = (userId: number) => all<Raw>(`${SEL} WHERE r.author_id = ? AND r.hidden = 0 ORDER BY r.created_at DESC LIMIT 20`, userId).map(map);
