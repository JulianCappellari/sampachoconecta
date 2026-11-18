import "server-only";
import { all, one } from "./db";
/**
 * Cifras públicas y agregadas sobre los reclamos. Nunca incluyen textos, direcciones, nombres ni barrios de los
 * autores. Las categorías con menos de MIN_CELL reclamos se ocultan para que no se pueda identificar a nadie.
 */
export const MIN_CELL = 3;
export async function transparency() {
    const n = async (sql: string, ...p: (string | number)[]) => (await one<{
        n: number;
    }>(sql, ...p))?.n ?? 0;
    const total = await n("SELECT COUNT(*) n FROM claims");
    const resolved = await n("SELECT COUNT(*) n FROM claims WHERE status = 'resuelto'");
    const rejected = await n("SELECT COUNT(*) n FROM claims WHERE status = 'rechazado'");
    const open = total - resolved - rejected;
    const avg = async (sql: string) => (await one<{
        d: number | null;
    }>(sql))?.d ?? null;
    const daysToResolve = await avg("SELECT AVG(julianday(closed_at) - julianday(created_at)) d FROM claims WHERE status = 'resuelto' AND closed_at IS NOT NULL");
    const daysToReply = await avg(`SELECT AVG(julianday(first) - julianday(created_at)) d FROM (
       SELECT c.created_at, (SELECT MIN(e.created_at) FROM claim_events e JOIN users u ON u.id = e.user_id WHERE e.claim_id = c.id AND u.role = 'municipio' AND e.visibility = 'author') AS first FROM claims c) replies WHERE first IS NOT NULL`);
    const overdue = await n("SELECT COUNT(*) n FROM claims WHERE status NOT IN ('resuelto','rechazado') AND next_update_at IS NOT NULL AND next_update_at <= datetime('now')");
    const satisfaction = await avg("SELECT AVG(rating) d FROM claims WHERE rating IS NOT NULL");
    const rated = await n("SELECT COUNT(*) n FROM claims WHERE rating IS NOT NULL");
    const byCategory = await all<{
        category: string;
        total: number;
        resolved: number;
    }>("SELECT category, COUNT(*) total, SUM(CASE WHEN status = 'resuelto' THEN 1 ELSE 0 END) resolved FROM claims GROUP BY category HAVING COUNT(*) >= ? ORDER BY total DESC", MIN_CELL);
    const byMonth = await all<{
        month: string;
        received: number;
        resolved: number;
    }>(`SELECT substring(created_at, 1, 7) AS "month", COUNT(*) received, SUM(CASE WHEN status = 'resuelto' THEN 1 ELSE 0 END) resolved FROM claims
     WHERE created_at >= to_char(date_trunc('month', statement_timestamp() AT TIME ZONE 'UTC') - interval '5 months', 'YYYY-MM-DD') GROUP BY "month" ORDER BY "month"`);
    return {
        total, resolved, rejected, open, overdue,
        resolvedPct: total ? Math.round((resolved / total) * 100) : null,
        daysToResolve, daysToReply, satisfaction, rated,
        byCategory, byMonth,
        enough: total >= MIN_CELL,
        community: {
            users: await n("SELECT COUNT(*) n FROM users WHERE suspended = 0"),
            listings: await n("SELECT COUNT(*) n FROM listings WHERE deleted = 0"),
            posts30: await n("SELECT COUNT(*) n FROM posts WHERE deleted = 0 AND hidden = 0 AND created_at > datetime('now','-30 days')"),
            requestsResolved: await n("SELECT COUNT(*) n FROM community_requests WHERE status = 'resuelto'"),
            ideasRealized: await n("SELECT COUNT(*) n FROM ideas WHERE status = 'realizada'"),
            pollsClosed: await n("SELECT COUNT(*) n FROM polls WHERE hidden = 0 AND (status = 'cerrada' OR closes_at <= datetime('now'))"),
        },
    };
}
