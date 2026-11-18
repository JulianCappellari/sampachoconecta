import "server-only";
import { all, one } from "./db";
import { todayKey, isOpenNow } from "./format";

const j = (s: string | null | undefined): string[] => {
  try {
    return s ? (JSON.parse(s) as string[]) : [];
  } catch {
    return [];
  }
};

/* ───────────── Muro ───────────── */
export type Post = {
  id: number;
  author_id: number;
  category: string;
  title: string;
  body: string;
  photos: string[];
  price: number | null;
  condition: string | null;
  contact_phone: string | null;
  event_at: string | null;
  event_place: string | null;
  pinned_until: string | null;
  status: string;
  expires_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  severity: string;
  lifecycle: string;
  zone: string | null;
  event_end_at: string | null;
  alert_kind: string | null;
  updated_at: string | null;
  created_at: string;
  author_name: string;
  author_role: string;
  likes: number;
  comments: number;
  liked: number;
};
type PostRow = Omit<Post, "photos"> & { photos: string };

const POST_SELECT = `
  SELECT p.*, u.name AS author_name, u.role AS author_role,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes,
    (SELECT COUNT(*) FROM comments c WHERE c.kind='post' AND c.target_id = p.id AND c.hidden = 0) AS comments,
    EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked
  FROM posts p JOIN users u ON u.id = p.author_id`;
const POST_VISIBLE = `p.deleted = 0 AND p.hidden = 0 AND (p.expires_at IS NULL OR p.expires_at > datetime('now') OR p.category = 'aviso')`;
const mapPost = (r: PostRow): Post => ({ ...r, photos: j(r.photos) });

export function listPosts(o: { category?: string; q?: string; viewerId?: number; limit?: number; offset?: number }) {
  const where = [POST_VISIBLE];
  const params: (string | number)[] = [o.viewerId ?? 0];
  if (o.category) {
    where.push("p.category = ?");
    params.push(o.category);
  }
  if (o.q) {
    where.push("(p.title LIKE ? OR p.body LIKE ?)");
    params.push(`%${o.q}%`, `%${o.q}%`);
  }
  const rows = all<PostRow>(
    `${POST_SELECT} WHERE ${where.join(" AND ")}
     ORDER BY (p.category = 'aviso' AND p.lifecycle = 'active' AND (p.ends_at IS NULL OR p.ends_at > datetime('now'))) DESC, p.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params,
    o.limit ?? 12,
    o.offset ?? 0,
  );
  return rows.map(mapPost);
}

export function getPost(id: number, viewerId?: number) {
  const r = one<PostRow>(`${POST_SELECT} WHERE p.id = ? AND p.deleted = 0`, viewerId ?? 0, id);
  return r ? mapPost(r) : undefined;
}

export type Comment = { id: number; user_id: number; body: string; created_at: string; author_name: string; author_role: string };
export function listComments(kind: "post" | "idea", targetId: number) {
  return all<Comment>(
    `SELECT c.id,c.user_id,c.body,c.created_at,u.name AS author_name,u.role AS author_role
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.kind = ? AND c.target_id = ? AND c.hidden = 0 ORDER BY c.created_at ASC`,
    kind,
    targetId,
  );
}

export function upcomingEvents(limit = 20) {
  const rows = all<PostRow>(
    `${POST_SELECT} WHERE ${POST_VISIBLE} AND p.category = 'evento' AND p.event_at >= ?
     ORDER BY p.event_at ASC LIMIT ?`,
    0,
    todayKey(),
    limit,
  );
  return rows.map(mapPost);
}

export function pinnedNotices() {
  return all<PostRow>(
    `${POST_SELECT} WHERE ${POST_VISIBLE} AND p.category = 'aviso' AND p.lifecycle = 'active'
       AND (p.starts_at IS NULL OR p.starts_at <= datetime('now')) AND (p.ends_at IS NULL OR p.ends_at > datetime('now'))
     ORDER BY p.created_at DESC LIMIT 3`,
    0,
  ).map(mapPost);
}

/* ───────────── Reclamos ───────────── */
export type Claim = {
  id: number;
  number: string;
  user_id: number;
  category: string;
  description: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  photos: string[];
  status: string;
  area: string | null;
  rating: number | null;
  next_update_at: string | null;
  version: number;
  incident_id: number | null;
  updated_at: string | null;
  created_at: string;
  closed_at: string | null;
  author_name?: string;
  author_barrio?: string | null;
  author_phone?: string | null;
};
type ClaimRow = Omit<Claim, "photos"> & { photos: string };
const mapClaim = (r: ClaimRow): Claim => ({ ...r, photos: j(r.photos) });

export function claimsByUser(userId: number) {
  return all<ClaimRow>("SELECT * FROM claims WHERE user_id = ? ORDER BY created_at DESC", userId).map(mapClaim);
}
export function getClaim(id: number) {
  const r = one<ClaimRow>(
    `SELECT c.*, u.name AS author_name, u.barrio AS author_barrio, u.phone AS author_phone
     FROM claims c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    id,
  );
  return r ? mapClaim(r) : undefined;
}
export type ClaimEvent = { id: number; status: string; comment: string | null; created_at: string; author_name: string; author_role: string; visibility: string; kind: string };
/** El autor solo recibe los eventos visibles para él; las notas internas del municipio nunca salen de acá. */
export function claimEvents(claimId: number, forAuthor: boolean) {
  return all<ClaimEvent>(
    `SELECT e.id,e.status,e.comment,e.created_at,e.visibility,e.kind,u.name AS author_name,u.role AS author_role
     FROM claim_events e JOIN users u ON u.id = e.user_id WHERE e.claim_id = ? ${forAuthor ? "AND e.visibility = 'author'" : ""} ORDER BY e.id ASC`,
    claimId,
  );
}
export function staffClaims(o: { status?: string; category?: string; q?: string }) {
  const where = ["1=1"];
  const params: string[] = [];
  if (o.status) {
    where.push("c.status = ?");
    params.push(o.status);
  }
  if (o.category) {
    where.push("c.category = ?");
    params.push(o.category);
  }
  if (o.q) {
    where.push("(c.number LIKE ? OR c.description LIKE ? OR c.address LIKE ?)");
    params.push(`%${o.q}%`, `%${o.q}%`, `%${o.q}%`);
  }
  return all<ClaimRow>(
    `SELECT c.*, u.name AS author_name, u.barrio AS author_barrio FROM claims c JOIN users u ON u.id = c.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY CASE c.status WHEN 'recibido' THEN 0 WHEN 'en_revision' THEN 1 WHEN 'en_proceso' THEN 2 ELSE 3 END, c.created_at ASC`,
    ...params,
  ).map(mapClaim);
}

/* ───────────── Guía y oficios ───────────── */
export type Listing = {
  id: number;
  kind: "comercio" | "oficio";
  owner_id: number;
  category: string;
  name: string;
  description: string;
  address: string | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  phone: string;
  whatsapp: string | null;
  open_time: string | null;
  close_time: string | null;
  open_days: string | null;
  license: string | null;
  emergency: number;
  photos: string[];
  verified: number;
  avg: number;
  count: number;
  created_at: string;
  owner_name?: string;
  open?: boolean;
};
type ListingRow = Omit<Listing, "photos"> & { photos: string };
const mapListing = (r: ListingRow): Listing => ({ ...r, photos: j(r.photos), open: isOpenNow(r) });

export function listListings(o: {
  kind: "comercio" | "oficio";
  category?: string;
  q?: string;
  open?: boolean;
  emergency?: boolean;
  sort?: string;
}) {
  const where = ["l.deleted = 0", "l.kind = ?"];
  const params: (string | number)[] = [o.kind];
  if (o.category) {
    where.push("l.category = ?");
    params.push(o.category);
  }
  if (o.emergency) where.push("l.emergency = 1");
  if (o.q) {
    where.push("(l.name LIKE ? OR l.description LIKE ? OR l.category LIKE ?)");
    params.push(`%${o.q}%`, `%${o.q}%`, `%${o.q}%`);
  }
  const order =
    o.sort === "nuevos"
      ? "l.created_at DESC"
      : o.sort === "nombre"
        ? "l.name COLLATE NOCASE ASC"
        : "(l.count >= 3) DESC, l.avg DESC, l.count DESC";
  let rows = all<ListingRow>(
    `SELECT l.*, u.name AS owner_name FROM listings l JOIN users u ON u.id = l.owner_id WHERE ${where.join(" AND ")} ORDER BY ${order}`,
    ...params,
  ).map(mapListing);
  if (o.open) rows = rows.filter((r) => r.open);
  return rows;
}
export function getListing(id: number) {
  const r = one<ListingRow>(
    `SELECT l.*, u.name AS owner_name FROM listings l JOIN users u ON u.id = l.owner_id WHERE l.id = ? AND l.deleted = 0`,
    id,
  );
  return r ? mapListing(r) : undefined;
}
export type Rating = { user_id: number; stars: number; review: string | null; reply: string | null; created_at: string; author_name: string };
export function listRatings(listingId: number) {
  return all<Rating>(
    `SELECT r.user_id,r.stars,r.review,r.reply,r.created_at,u.name AS author_name
     FROM ratings r JOIN users u ON u.id = r.user_id WHERE r.listing_id = ? ORDER BY r.created_at DESC`,
    listingId,
  );
}
export const myListings = (userId: number) =>
  all<ListingRow>("SELECT * FROM listings WHERE owner_id = ? AND deleted = 0 ORDER BY created_at DESC", userId).map(mapListing);

/* ───────────── Ideas ───────────── */
export type Idea = {
  id: number;
  author_id: number;
  title: string;
  body: string;
  category: string;
  status: string;
  group_link: string | null;
  photo: string | null;
  municipal: number;
  created_at: string;
  author_name: string;
  supports: number;
  comments: number;
  joined: number;
};
export function listIdeas(viewerId?: number, status?: string) {
  const where = ["i.hidden = 0"];
  const params: (string | number)[] = [viewerId ?? 0];
  if (status) {
    where.push("i.status = ?");
    params.push(status);
  }
  return all<Idea>(
    `SELECT i.*, u.name AS author_name,
       (SELECT COUNT(*) FROM idea_supports s WHERE s.idea_id = i.id) AS supports,
       (SELECT COUNT(*) FROM comments c WHERE c.kind='idea' AND c.target_id = i.id AND c.hidden = 0) AS comments,
       EXISTS(SELECT 1 FROM idea_supports s WHERE s.idea_id = i.id AND s.user_id = ?) AS joined
     FROM ideas i JOIN users u ON u.id = i.author_id WHERE ${where.join(" AND ")}
     ORDER BY supports DESC, i.created_at DESC`,
    ...params,
  );
}
export function getIdea(id: number, viewerId?: number) {
  return one<Idea>(
    `SELECT i.*, u.name AS author_name,
       (SELECT COUNT(*) FROM idea_supports s WHERE s.idea_id = i.id) AS supports,
       (SELECT COUNT(*) FROM comments c WHERE c.kind='idea' AND c.target_id = i.id AND c.hidden = 0) AS comments,
       EXISTS(SELECT 1 FROM idea_supports s WHERE s.idea_id = i.id AND s.user_id = ?) AS joined
     FROM ideas i JOIN users u ON u.id = i.author_id WHERE i.id = ? AND i.hidden = 0`,
    viewerId ?? 0,
    id,
  );
}

/* ───────────── Útiles ───────────── */
export type Phone = { id: number; name: string; number: string; category: string; sort: number };
export const listPhones = () => all<Phone>("SELECT * FROM phones ORDER BY sort, name");
export type Pharmacy = { date: string; name: string; address: string | null; phone: string | null };
export const pharmacyToday = () => one<Pharmacy>("SELECT * FROM pharmacy_duty WHERE date = ?", todayKey());
export const pharmacyUpcoming = (n = 7) =>
  all<Pharmacy>("SELECT * FROM pharmacy_duty WHERE date >= ? ORDER BY date LIMIT ?", todayKey(), n);

/* ───────────── Estadísticas y panel ───────────── */
export function siteStats() {
  const n = (sql: string) => one<{ n: number }>(sql)?.n ?? 0;
  return {
    users: n("SELECT COUNT(*) n FROM users WHERE suspended = 0"),
    listings: n("SELECT COUNT(*) n FROM listings WHERE deleted = 0"),
    claimsResolved: n("SELECT COUNT(*) n FROM claims WHERE status = 'resuelto'"),
    ideas: n("SELECT COUNT(*) n FROM ideas WHERE hidden = 0"),
    posts: n("SELECT COUNT(*) n FROM posts WHERE deleted = 0 AND hidden = 0"),
  };
}

export function panelStats() {
  const n = (sql: string) => one<{ n: number }>(sql)?.n ?? 0;
  const byStatus = all<{ status: string; n: number }>("SELECT status, COUNT(*) n FROM claims GROUP BY status");
  const byCategory = all<{ category: string; n: number }>("SELECT category, COUNT(*) n FROM claims GROUP BY category ORDER BY n DESC");
  const byBarrio = all<{ barrio: string; n: number }>(
    "SELECT COALESCE(u.barrio,'Sin dato') barrio, COUNT(*) n FROM claims c JOIN users u ON u.id = c.user_id GROUP BY 1 ORDER BY n DESC",
  );
  const avgDays = one<{ d: number | null }>(
    "SELECT AVG(julianday(closed_at) - julianday(created_at)) d FROM claims WHERE closed_at IS NOT NULL",
  )?.d;
  return {
    users: n("SELECT COUNT(*) n FROM users"),
    newUsers7: n("SELECT COUNT(*) n FROM users WHERE created_at > datetime('now','-7 days')"),
    openClaims: n("SELECT COUNT(*) n FROM claims WHERE status NOT IN ('resuelto','rechazado')"),
    openReports: n("SELECT COUNT(*) n FROM reports WHERE status = 'open'"),
    byStatus,
    byCategory,
    byBarrio,
    avgDays: avgDays ?? null,
  };
}

export type ReportRow = {
  id: number;
  kind: string;
  target_id: number;
  reason: string;
  created_at: string;
  reporter: string;
  preview: string | null;
  target_hidden: number;
  reports: number;
};
export function openReports() {
  return all<ReportRow>(
    `SELECT r.id, r.kind, r.target_id, r.reason, r.created_at, u.name AS reporter,
       CASE r.kind WHEN 'post' THEN (SELECT title || ' — ' || body FROM posts WHERE id = r.target_id)
                   WHEN 'request' THEN (SELECT title || ' — ' || body FROM community_requests WHERE id = r.target_id)
                   ELSE (SELECT body FROM comments WHERE id = r.target_id) END AS preview,
       CASE r.kind WHEN 'post' THEN (SELECT hidden FROM posts WHERE id = r.target_id)
                   WHEN 'request' THEN (SELECT hidden FROM community_requests WHERE id = r.target_id)
                   ELSE (SELECT hidden FROM comments WHERE id = r.target_id) END AS target_hidden,
       (SELECT COUNT(*) FROM reports r2 WHERE r2.kind = r.kind AND r2.target_id = r.target_id) AS reports
     FROM reports r JOIN users u ON u.id = r.user_id
     WHERE r.id IN (SELECT MAX(id) FROM reports WHERE status = 'open' GROUP BY kind, target_id)
     ORDER BY r.created_at DESC`,
  );
}

export type UserRow = { id: number; name: string; email: string; barrio: string | null; role: string; suspended: number; created_at: string };
export const listUsers = (q?: string) =>
  all<UserRow>(
    `SELECT id,name,email,barrio,role,suspended,created_at FROM users
     WHERE (? IS NULL OR name LIKE ? OR email LIKE ?) ORDER BY created_at DESC LIMIT 100`,
    q ?? null,
    `%${q ?? ""}%`,
    `%${q ?? ""}%`,
  );

/* ───────────── Seguimientos y notificaciones ───────────── */
export function followedTargets(userId: number) {
  const rows = all<{ target_type: string; target_id: string }>("SELECT target_type,target_id FROM follows WHERE user_id = ?", userId);
  const set = (t: string) => new Set(rows.filter((r) => r.target_type === t).map((r) => r.target_id));
  return { tema: set("tema"), zona: set("zona"), ficha: set("ficha") };
}
export const isFollowing = (userId: number, type: string, id: string) =>
  !!one("SELECT 1 FROM follows WHERE user_id = ? AND target_type = ? AND target_id = ?", userId, type, id);

/** Feed personalizado por consulta: solo contenido público visible, según lo que el vecino eligió seguir. */
export function followedPosts(userId: number, limit = 8) {
  return all<PostRow>(
    `${POST_SELECT} WHERE ${POST_VISIBLE} AND p.lifecycle = 'active' AND (
       p.category IN (SELECT target_id FROM follows WHERE user_id = ?2 AND target_type = 'tema')
       OR (p.zone IS NOT NULL AND p.zone IN (SELECT target_id FROM follows WHERE user_id = ?2 AND target_type = 'zona'))
       OR p.author_id IN (SELECT l.owner_id FROM follows f JOIN listings l ON CAST(l.id AS TEXT) = f.target_id WHERE f.user_id = ?2 AND f.target_type = 'ficha' AND l.deleted = 0)
     ) ORDER BY p.created_at DESC LIMIT ?3`,
    userId, userId, limit,
  ).map(mapPost);
}

export type Notification = { id: number; class: string; title: string; body: string | null; href: string | null; reason: string | null; urgent: number; read_at: string | null; created_at: string };
export const listNotifications = (userId: number, limit = 60) =>
  all<Notification>(
    `SELECT id,class,title,body,href,reason,urgent,read_at,created_at FROM notifications
     WHERE user_id = ? AND deliver_after <= datetime('now') ORDER BY created_at DESC LIMIT ?`,
    userId, limit,
  );
export const pendingDigest = (userId: number) =>
  one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND deliver_after > datetime('now')", userId)?.n ?? 0;

/* ───────────── Moderación de contenido (sin reclamos, a propósito) ───────────── */
export const CONTENT_KINDS = [
  { id: "post", label: "Publicaciones" },
  { id: "comment", label: "Comentarios" },
  { id: "request", label: "Pedidos" },
  { id: "response", label: "Respuestas a pedidos" },
  { id: "listing", label: "Comercios y oficios" },
  { id: "rating", label: "Opiniones" },
  { id: "idea", label: "Ideas" },
  { id: "outcome", label: "Resultados" },
  { id: "job", label: "Bolsa de trabajo" },
  { id: "poll", label: "Encuestas" },
] as const;

export type ContentRow = { id: number; extra: number | null; title: string; preview: string; author: string; created_at: string; href: string | null; protectedItem: boolean };

export function contentList(kind: string, q?: string, limit = 60): ContentRow[] {
  const like = `%${q ?? ""}%`;
  const rows = (sql: string, ...p: (string | number)[]) => all<Omit<ContentRow, "protectedItem"> & { protectedItem?: number }>(sql, ...p).map((r) => ({ ...r, protectedItem: !!r.protectedItem }));
  switch (kind) {
    case "post":
      return rows(`SELECT p.id, NULL AS extra, p.title, substr(p.body,1,160) AS preview, u.name AS author, p.created_at, '/muro/' || p.id AS href, (p.category = 'aviso') AS protectedItem
        FROM posts p JOIN users u ON u.id = p.author_id WHERE p.deleted = 0 AND (p.title LIKE ? OR p.body LIKE ?) ORDER BY p.created_at DESC LIMIT ?`, like, like, limit);
    case "comment":
      return rows(`SELECT c.id, NULL AS extra, CASE c.kind WHEN 'post' THEN 'Comentario en una publicación' ELSE 'Comentario en una idea' END AS title, substr(c.body,1,160) AS preview, u.name AS author, c.created_at,
        CASE c.kind WHEN 'post' THEN '/muro/' ELSE '/ideas/' END || c.target_id AS href, 0 AS protectedItem
        FROM comments c JOIN users u ON u.id = c.user_id WHERE c.hidden = 0 AND c.body LIKE ? ORDER BY c.created_at DESC LIMIT ?`, like, limit);
    case "request":
      return rows(`SELECT r.id, NULL AS extra, r.title, substr(r.body,1,160) AS preview, u.name AS author, r.created_at, '/necesito/' || r.id AS href, 0 AS protectedItem
        FROM community_requests r JOIN users u ON u.id = r.author_id WHERE r.hidden = 0 AND (r.title LIKE ? OR r.body LIKE ?) ORDER BY r.created_at DESC LIMIT ?`, like, like, limit);
    case "response":
      return rows(`SELECT x.id, NULL AS extra, 'Respuesta de ' || l.name AS title, substr(x.body,1,160) AS preview, u.name AS author, x.created_at, '/necesito/' || x.request_id AS href, 0 AS protectedItem
        FROM request_responses x JOIN listings l ON l.id = x.listing_id JOIN users u ON u.id = x.user_id WHERE x.status = 'activa' AND x.body LIKE ? ORDER BY x.created_at DESC LIMIT ?`, like, limit);
    case "listing":
      return rows(`SELECT l.id, NULL AS extra, l.name AS title, l.category || ' · ' || substr(l.description,1,140) AS preview, u.name AS author, l.created_at, '/guia/' || l.id AS href, 0 AS protectedItem
        FROM listings l JOIN users u ON u.id = l.owner_id WHERE l.deleted = 0 AND (l.name LIKE ? OR l.description LIKE ?) ORDER BY l.created_at DESC LIMIT ?`, like, like, limit);
    case "rating":
      return rows(`SELECT r.listing_id AS id, r.user_id AS extra, l.name || ' · ' || r.stars || ' estrellas' AS title, COALESCE(substr(r.review,1,160),'(sin texto)') AS preview, u.name AS author, r.created_at, '/guia/' || r.listing_id AS href, 0 AS protectedItem
        FROM ratings r JOIN listings l ON l.id = r.listing_id JOIN users u ON u.id = r.user_id WHERE l.deleted = 0 AND COALESCE(r.review,'') LIKE ? ORDER BY r.created_at DESC LIMIT ?`, like, limit);
    case "idea":
      return rows(`SELECT i.id, NULL AS extra, i.title, substr(i.body,1,160) AS preview, u.name AS author, i.created_at, '/ideas/' || i.id AS href, 0 AS protectedItem
        FROM ideas i JOIN users u ON u.id = i.author_id WHERE i.hidden = 0 AND (i.title LIKE ? OR i.body LIKE ?) ORDER BY i.created_at DESC LIMIT ?`, like, like, limit);
    case "outcome":
      return rows(`SELECT o.id, NULL AS extra, 'Resultado de ' || o.source_type AS title, substr(o.body,1,160) AS preview, u.name AS author, o.created_at, '/resultados' AS href, 0 AS protectedItem
        FROM community_outcomes o JOIN users u ON u.id = o.author_id WHERE o.status = 'publicado' AND o.body LIKE ? ORDER BY o.created_at DESC LIMIT ?`, like, limit);
    case "job":
      return rows(`SELECT j.id, NULL AS extra, j.title, substr(j.body,1,160) AS preview, u.name AS author, j.created_at, '/empleo/' || j.id AS href, 0 AS protectedItem
        FROM jobs j JOIN users u ON u.id = j.author_id WHERE j.hidden = 0 AND (j.title LIKE ? OR j.body LIKE ?) ORDER BY j.created_at DESC LIMIT ?`, like, like, limit);
    case "poll":
      return rows(`SELECT p.id, NULL AS extra, p.question AS title, COALESCE(substr(p.body,1,160),'') AS preview, u.name AS author, p.created_at, '/encuestas/' || p.id AS href, 1 AS protectedItem
        FROM polls p JOIN users u ON u.id = p.author_id WHERE p.hidden = 0 AND p.question LIKE ? ORDER BY p.created_at DESC LIMIT ?`, like, limit);
    default:
      return [];
  }
}
