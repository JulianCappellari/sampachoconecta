import "server-only";
import { all, one } from "./db";
export type Need = {
    id: number;
    idea_id: number;
    kind: string;
    description: string;
    target: number;
    unit: string;
    deadline: string | null;
    status: string;
    version: number;
    /** Aportes aceptados (reservan cupo) y cumplidos. Un apoyo («Me sumo») no suma acá. */
    reserved: number;
    fulfilled: number;
    pending: number;
};
export const ideaNeeds = async (ideaId: number) => await all<Need>(`SELECT n.*,
       COALESCE((SELECT SUM(accepted) FROM idea_commitments c WHERE c.need_id = n.id AND c.status IN ('aceptada','cumplida')), 0) AS reserved,
       COALESCE((SELECT SUM(fulfilled) FROM idea_commitments c WHERE c.need_id = n.id AND c.status IN ('aceptada','cumplida')), 0) AS fulfilled,
       COALESCE((SELECT COUNT(*) FROM idea_commitments c WHERE c.need_id = n.id AND c.status = 'pendiente'), 0) AS pending
     FROM idea_needs n WHERE n.idea_id = ? ORDER BY n.id`, ideaId);
export type Commitment = {
    id: number;
    need_id: number;
    user_id: number;
    proposed: number;
    accepted: number;
    fulfilled: number;
    status: string;
    note: string | null;
    reason: string | null;
    public_name: number;
    user_name: string;
    created_at: string;
};
/** Detalle de compromisos: solo para el organizador y para cada participante con los suyos. */
export const needCommitments = async (needIds: number[]) => needIds.length === 0
    ? []
    : await all<Commitment>(`SELECT c.id,c.need_id,c.user_id,c.proposed,c.accepted,c.fulfilled,c.status,c.note,c.reason,c.public_name,u.name AS user_name,c.created_at
         FROM idea_commitments c JOIN users u ON u.id = c.user_id WHERE c.need_id IN (${needIds.map(() => "?").join(",")}) ORDER BY c.created_at`, ...needIds);
/** Nombres que el participante eligió mostrar públicamente (consentimiento explícito). */
export const publicNames = async (needId: number) => (await all<{
    name: string;
}>("SELECT u.name FROM idea_commitments c JOIN users u ON u.id = c.user_id WHERE c.need_id = ? AND c.public_name = 1 AND c.status IN ('aceptada','cumplida')", needId)).map((r) => r.name.split(" ")[0]);
export const ideaUpdates = async (ideaId: number) => await all<{
    id: number;
    kind: string;
    body: string;
    created_at: string;
    author_name: string;
}>("SELECT x.id,x.kind,x.body,x.created_at,u.name AS author_name FROM idea_updates x JOIN users u ON u.id = x.author_id WHERE x.idea_id = ? ORDER BY x.id DESC", ideaId);
export type Permission = {
    id: number;
    description: string;
    status: string;
    reference: string | null;
    decided_at: string | null;
    created_at: string;
};
export const ideaPermissions = async (ideaId: number) => await all<Permission>("SELECT id,description,status,reference,decided_at,created_at FROM idea_permission_requests WHERE idea_id = ? ORDER BY id", ideaId);
export const ideaClosing = async (ideaId: number) => await one<{
    closing_note: string | null;
    status: string;
    version: number;
}>("SELECT closing_note,status,version FROM ideas WHERE id = ?", ideaId);
