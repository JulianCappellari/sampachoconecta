import "server-only";
import { all, one } from "./db";

export type Job = {
  id: number;
  author_id: number;
  kind: "oferta" | "busco";
  title: string;
  body: string;
  category: string;
  zone: string | null;
  contact_phone: string;
  expires_at: string;
  status: "abierta" | "cubierta";
  created_at: string;
  author_name: string;
  effective: "abierta" | "cubierta" | "vencida";
};
type Raw = Omit<Job, "effective"> & { expired: number };

const SEL = `SELECT j.*, u.name AS author_name, (j.expires_at <= datetime('now')) AS expired FROM jobs j JOIN users u ON u.id = j.author_id WHERE j.hidden = 0`;
const map = (r: Raw): Job => ({ ...r, effective: r.status === "abierta" && r.expired ? "vencida" : r.status });

export function listJobs(o: { kind: "oferta" | "busco"; category?: string; zone?: string; q?: string }) {
  const where: string[] = ["j.kind = ?", "j.status = 'abierta'", "j.expires_at > datetime('now')"];
  const p: string[] = [o.kind];
  if (o.category) {
    where.push("j.category = ?");
    p.push(o.category);
  }
  if (o.zone) {
    where.push("j.zone = ?");
    p.push(o.zone);
  }
  if (o.q) {
    where.push("(j.title LIKE ? OR j.body LIKE ?)");
    p.push(`%${o.q}%`, `%${o.q}%`);
  }
  return all<Raw>(`${SEL} AND ${where.join(" AND ")} ORDER BY j.created_at DESC LIMIT 60`, ...p).map(map);
}
export const getJob = (id: number) => {
  const r = one<Raw>(`${SEL} AND j.id = ?`, id);
  return r ? map(r) : undefined;
};
export const activeJobsOf = (userId: number) => one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE author_id = ? AND hidden = 0 AND status = 'abierta' AND expires_at > datetime('now')", userId)?.n ?? 0;
