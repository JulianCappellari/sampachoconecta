import "server-only";
import { all, one } from "./db";
export type Poll = {
    id: number;
    question: string;
    body: string | null;
    zone: string | null;
    closes_at: string;
    status: "abierta" | "cerrada";
    created_at: string;
    /** Se calcula al leer: una consulta vencida está cerrada aunque nadie la haya cerrado a mano. */
    effective: "abierta" | "cerrada";
    total: number;
    my_option: number | null;
};
const SEL = `SELECT p.id,p.question,p.body,p.zone,p.closes_at,p.status,p.created_at,
  CASE WHEN p.status = 'abierta' AND p.closes_at > datetime('now') THEN 'abierta' ELSE 'cerrada' END AS effective,
  (SELECT COUNT(*) FROM poll_votes v WHERE v.poll_id = p.id) AS total,
  (SELECT option_id FROM poll_votes v WHERE v.poll_id = p.id AND v.user_id = ?) AS my_option
  FROM polls p WHERE p.hidden = 0`;
export const listPolls = async (userId?: number) => await all<Poll>(`SELECT * FROM (${SEL}) polls_visible ORDER BY (effective = 'abierta') DESC, created_at DESC LIMIT 40`, userId ?? 0);
export const getPoll = async (id: number, userId?: number) => await one<Poll>(`${SEL} AND p.id = ?`, userId ?? 0, id);
export type PollOption = {
    id: number;
    label: string;
    votes: number;
};
/** Los resultados se muestran al cerrar la consulta (para no sesgar el voto) o al municipio, que los ve en vivo. */
export const pollOptions = async (pollId: number) => await all<PollOption>("SELECT o.id,o.label,(SELECT COUNT(*) FROM poll_votes v WHERE v.option_id = o.id) AS votes FROM poll_options o WHERE o.poll_id = ? ORDER BY o.sort,o.id", pollId);
export const openPollsFor = async (userId: number, barrio: string | null) => await all<{
    id: number;
    question: string;
}>(`SELECT p.id,p.question FROM polls p WHERE p.hidden = 0 AND p.status = 'abierta' AND p.closes_at > datetime('now')
       AND (p.zone IS NULL OR p.zone = ?) AND NOT EXISTS (SELECT 1 FROM poll_votes v WHERE v.poll_id = p.id AND v.user_id = ?) ORDER BY p.closes_at LIMIT 3`, barrio ?? "", userId);
