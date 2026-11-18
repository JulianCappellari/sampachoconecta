import "server-only";
import { all, one } from "./db";

/**
 * Cifras públicas y agregadas sobre los reclamos. Nunca incluyen textos, direcciones, nombres ni barrios de los
 * autores. Las categorías con menos de MIN_CELL reclamos se ocultan para que no se pueda identificar a nadie.
 */
export const MIN_CELL = 3;

export function transparency() {
  const n = (sql: string, ...p: (string | number)[]) => one<{ n: number }>(sql, ...p)?.n ?? 0;
  const total = n("SELECT COUNT(*) n FROM claims");
  const resolved = n("SELECT COUNT(*) n FROM claims WHERE status = 'resuelto'");
  const rejected = n("SELECT COUNT(*) n FROM claims WHERE status = 'rechazado'");
  const open = total - resolved - rejected;
  const avg = (sql: string) => one<{ d: number | null }>(sql)?.d ?? null;
  const daysToResolve = avg("SELECT AVG(julianday(closed_at) - julianday(created_at)) d FROM claims WHERE status = 'resuelto' AND closed_at IS NOT NULL");
  const daysToReply = avg(
    `SELECT AVG(julianday(first) - julianday(created_at)) d FROM (
       SELECT c.created_at, (SELECT MIN(e.created_at) FROM claim_events e JOIN users u ON u.id = e.user_id WHERE e.claim_id = c.id AND u.role = 'municipio' AND e.visibility = 'author') AS first FROM claims c) WHERE first IS NOT NULL`,
  );
  const overdue = n("SELECT COUNT(*) n FROM claims WHERE status NOT IN ('resuelto','rechazado') AND next_update_at IS NOT NULL AND next_update_at <= datetime('now')");
  const satisfaction = avg("SELECT AVG(rating) d FROM claims WHERE rating IS NOT NULL");
  const rated = n("SELECT COUNT(*) n FROM claims WHERE rating IS NOT NULL");
  const byCategory = all<{ category: string; total: number; resolved: number }>(
    "SELECT category, COUNT(*) total, SUM(status = 'resuelto') resolved FROM claims GROUP BY category HAVING COUNT(*) >= ? ORDER BY total DESC",
    MIN_CELL,
  );
  const byMonth = all<{ month: string; received: number; resolved: number }>(
    `SELECT strftime('%Y-%m', created_at) month, COUNT(*) received, SUM(status = 'resuelto') resolved FROM claims
     WHERE created_at >= date('now','-5 months','start of month') GROUP BY month ORDER BY month`,
  );
  return {
    total, resolved, rejected, open, overdue,
    resolvedPct: total ? Math.round((resolved / total) * 100) : null,
    daysToResolve, daysToReply, satisfaction, rated,
    byCategory, byMonth,
    enough: total >= MIN_CELL,
    community: {
      users: n("SELECT COUNT(*) n FROM users WHERE suspended = 0"),
      listings: n("SELECT COUNT(*) n FROM listings WHERE deleted = 0"),
      posts30: n("SELECT COUNT(*) n FROM posts WHERE deleted = 0 AND hidden = 0 AND created_at > datetime('now','-30 days')"),
      requestsResolved: n("SELECT COUNT(*) n FROM community_requests WHERE status = 'resuelto'"),
      ideasRealized: n("SELECT COUNT(*) n FROM ideas WHERE status = 'realizada'"),
      pollsClosed: n("SELECT COUNT(*) n FROM polls WHERE hidden = 0 AND (status = 'cerrada' OR closes_at <= datetime('now'))"),
    },
  };
}
