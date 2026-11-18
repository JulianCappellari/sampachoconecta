import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { openReports } from "@/lib/data";
import { resolveReport } from "@/actions/panel";
import { timeAgo } from "@/lib/format";
import { clamp } from "@/lib/format";
import { EmptyState, Pill } from "@/components/ui/bits";
import { btn } from "@/components/ui/Button";
export const metadata: Metadata = { title: "Panel · Moderación" };
export const dynamic = "force-dynamic";
export default async function Page() {
    await requireRole(["moderador", "municipio"], "/panel/moderacion");
    const reports = await openReports();
    return (<div className="grid gap-6 py-8">
      <h1 className="text-4xl font-extrabold">Denuncias</h1>
      <p className="max-w-2xl text-ink-2">Una publicación con 3 denuncias de vecinos distintos se oculta sola hasta que alguien la revise acá.</p>
      {reports.length === 0 ? (<EmptyState title="No hay denuncias pendientes" text="Cuando un vecino denuncie una publicación o un comentario, aparece en esta lista."/>) : (<ul className="grid gap-4">
          {reports.map((r) => (<li key={r.id} className="grid gap-3 rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={r.target_hidden ? "err" : "warn"}>{r.target_hidden ? "Oculto" : "Visible"}</Pill>
                <b>{r.kind === "post" ? "Publicación" : "Comentario"} #{r.target_id}</b>
                <span className="text-ink-2">· {r.reports} {r.reports === 1 ? "denuncia" : "denuncias"} · última por {r.reporter} {timeAgo(r.created_at)}</span>
              </div>
              <p className="rounded-xl bg-surface-2 p-3">{r.preview ? clamp(r.preview, 280) : "El contenido ya no existe."}</p>
              <p><b>Motivo:</b> {r.reason}</p>
              <div className="flex flex-wrap gap-2">
                {r.kind === "post" && <Link href={`/muro/${r.target_id}`} className={btn("secondary", "sm")} target="_blank">Ver publicación</Link>}
                <form action={resolveReport.bind(null, r.id, "hide")}><button className={btn("danger", "sm")}>Ocultar contenido</button></form>
                <form action={resolveReport.bind(null, r.id, "dismiss")}><button className={btn("secondary", "sm")}>Descartar y mantener</button></form>
              </div>
            </li>))}
        </ul>)}
    </div>);
}
