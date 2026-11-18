import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { CLAIM_AREAS } from "@/lib/constants";
import { listIncidents, openClaims, suggestGroups } from "@/lib/incidents";
import { fmtDate } from "@/lib/format";
import { createIncident } from "@/actions/incidentes";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { Card, EmptyState, Pill, StatusPill } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Panel · Incidentes" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireRole(["municipio"], "/panel/incidentes");
  const incidents = listIncidents();
  const claims = openClaims();
  const free = claims.filter((c) => !c.incident_id);
  const suggestions = suggestGroups(claims);
  return (
    <div className="grid gap-8 py-8">
      <div className="grid gap-2">
        <h1 className="text-4xl font-extrabold">Incidentes</h1>
        <p className="max-w-2xl text-ink-2">Un incidente agrupa, solo para el municipio, reclamos del mismo problema. Cada vecino sigue viendo únicamente su reclamo: no ve a los demás ni a sus autores.</p>
      </div>

      {suggestions.length > 0 && (
        <section aria-labelledby="sug" className="grid gap-3 rounded-2xl bg-girasol-soft p-5">
          <h2 id="sug" className="text-2xl font-bold">Posibles incidentes</h2>
          <p className="text-ink-2">Sugerencias por categoría y cercanía. No se agrupa nada hasta que lo confirmes abajo.</p>
          <ul className="grid gap-2">{suggestions.map((g, i) => <li key={i} className="rounded-xl bg-surface p-3"><b>{g[0].category}</b>: {g.map((c) => c.number).join(", ")}{g[0].address ? ` · ${g[0].address}` : ""}</li>)}</ul>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section aria-labelledby="lista" className="grid content-start gap-3">
          <h2 id="lista" className="text-2xl font-bold">Incidentes ({incidents.length})</h2>
          {incidents.length === 0 ? <EmptyState title="Todavía no hay incidentes" text="Cuando varios vecinos reclamen por lo mismo, agrupalos desde el formulario." /> : (
            <ul className="grid gap-3">
              {incidents.map((i) => (
                <li key={i.id}><Link href={`/panel/incidentes/${i.id}`} className="grid gap-1 rounded-2xl border border-line bg-surface p-4 transition hover:border-monte">
                  <span className="flex flex-wrap items-center gap-2"><Pill tone={i.status === "activo" ? "ok" : "neutral"}>{i.status === "activo" ? "Activo" : "Cerrado"}</Pill><span className="text-sm text-ink-2">{i.category} · {fmtDate(i.created_at)}</span></span>
                  <span className="text-xl font-bold">{i.title}</span>
                  <span className="text-ink-2">{i.members} {i.members === 1 ? "reclamo" : "reclamos"} · {i.open_members} sin cerrar{i.area ? ` · ${i.area}` : ""}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </section>

        <Card className="grid content-start gap-4">
          <h2 className="text-2xl font-bold">Agrupar reclamos</h2>
          {free.length === 0 ? <p className="text-ink-2">No hay reclamos abiertos sin agrupar.</p> : (
            <Form action={createIncident} submit="Crear incidente">
              <Field label="Título interno" name="title" required placeholder="Luminarias apagadas en Belgrano" />
              <Field label="Lugar del hecho" name="place" hint="La zona del problema, no el barrio donde vive cada vecino." />
              <Select label="Área responsable" name="area" options={CLAIM_AREAS} placeholder="Sin asignar" />
              <TextArea label="Motivo de la agrupación" name="reason" rows={2} required />
              <fieldset className="grid gap-2">
                <legend className="font-bold">Reclamos a agrupar</legend>
                <ul className="grid max-h-80 gap-2 overflow-auto rounded-xl border border-line p-2">
                  {free.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-surface-2">
                        <input type="checkbox" name="claims" value={c.id} className="mt-1 size-5 accent-[var(--monte)]" />
                        <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><b className="font-mono text-sm">{c.number}</b><StatusPill status={c.status} /></span><span className="block font-bold">{c.category}</span><span className="block truncate text-ink-2">{c.address ?? c.description}</span></span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            </Form>
          )}
        </Card>
      </div>
    </div>
  );
}
