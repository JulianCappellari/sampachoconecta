import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getIncident, incidentClaims, incidentEvents } from "@/lib/incidents";
import { fmtDateTime } from "@/lib/format";
import { bulkIncident, closeIncident, unlinkClaim } from "@/actions/incidentes";
import { Form } from "@/components/ui/Form";
import { Check, Field, TextArea } from "@/components/ui/Fields";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Card, Pill, StatusPill } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Panel · Incidente" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["municipio"], "/panel/incidentes");
  const id = Number((await params).id);
  const inc = Number.isInteger(id) ? getIncident(id) : undefined;
  if (!inc) notFound();
  const members = incidentClaims(id);
  const live = members.filter((m) => !m.closed);
  const events = incidentEvents(id);

  const pick = (
    <fieldset className="grid gap-2">
      <legend className="font-bold">Reclamos incluidos</legend>
      <ul className="grid gap-1 rounded-xl border border-line p-2">
        {live.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-2">
              <input type="checkbox" name="claims" value={c.id} defaultChecked className="size-5 accent-[var(--monte)]" />
              <input type="hidden" name={`v_${c.id}`} value={c.version} />
              <span><b className="font-mono text-sm">{c.number}</b> <span className="text-ink-2">{c.category} · {c.address ?? "sin dirección"}</span></span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
  const preview = (
    <p className="rounded-xl bg-monte-soft p-3 text-sm"><b className="text-monte">Vista previa:</b> cada vecino va a ver el mensaje dentro de <b>su propio</b> reclamo, sin números ni datos de otros. Se registran {live.length} avisos internos; el email todavía no está disponible.</p>
  );

  return (
    <div className="grid gap-8 py-8">
      <div className="grid gap-2">
        <Link href="/panel/incidentes" className="w-fit font-bold text-monte hover:underline">← Incidentes</Link>
        <div className="flex flex-wrap items-center gap-3"><Pill tone={inc.status === "activo" ? "ok" : "neutral"}>{inc.status === "activo" ? "Activo" : "Cerrado"}</Pill><span className="text-ink-2">{inc.category}{inc.place ? ` · ${inc.place}` : ""}{inc.area ? ` · ${inc.area}` : ""}</span></div>
        <h1 className="text-4xl font-extrabold">{inc.title}</h1>
        {inc.summary && <p className="max-w-2xl text-ink-2">Motivo: {inc.summary}</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid content-start gap-6">
          <section aria-labelledby="miembros" className="grid gap-3">
            <h2 id="miembros" className="text-2xl font-bold">Reclamos ({members.length})</h2>
            <ul className="grid gap-3">
              {members.map((c) => (
                <li key={c.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2"><StatusPill status={c.status} /><Link href={`/reclamos/${c.id}`} className="font-mono font-bold hover:underline">{c.number}</Link><span className="text-ink-2">{c.author_name}</span></div>
                  <p className="text-ink-2">{c.address ?? c.description}</p>
                  <details>
                    <summary className="min-h-10 cursor-pointer text-sm font-bold text-ink-2">Desvincular del incidente</summary>
                    <div className="pt-2"><Form action={unlinkClaim.bind(null, id, c.id)} submit="Desvincular" variant="secondary"><Field label="Motivo" name="reason" required /></Form></div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="hist" className="grid gap-3">
            <h2 id="hist" className="text-2xl font-bold">Historial interno</h2>
            <ul className="grid gap-2">{events.map((e) => <li key={e.id} className="rounded-xl bg-surface-2 p-3"><b className="capitalize">{e.kind.replace("_", " ")}</b>{e.number ? ` · ${e.number}` : ""} <span className="text-sm text-ink-2">{fmtDateTime(e.created_at)} · {e.author_name}</span>{e.note && <p className="text-ink-2">{e.note}</p>}</li>)}</ul>
          </section>
        </div>

        {inc.status === "activo" && live.length > 0 && (
          <div className="grid content-start gap-6">
            <Card className="grid gap-3 border-monte">
              <h2 className="text-2xl font-bold">Actualización común</h2>
              <Form action={bulkIncident.bind(null, id, "update")} submit="Enviar actualización">
                {pick}
                <TextArea label="Mensaje para los vecinos" name="message" rows={3} required maxLength={600} hint="Neutro: sin números de otros reclamos ni identidades." />
                <Field label="Próxima actualización (opcional)" name="next_update" type="date" />
                <TextArea label="Nota interna (opcional)" name="note" rows={2} />
                {preview}
                <Check name="confirm">Revisé la vista previa y los reclamos elegidos</Check>
              </Form>
            </Card>
            <Card className="grid gap-3">
              <h2 className="text-2xl font-bold">Resolver reclamos vinculados</h2>
              <p className="text-ink-2">Cierra como resueltos solo los reclamos que marques. Los ya cerrados se omiten y el incidente no se cierra solo.</p>
              <Form action={bulkIncident.bind(null, id, "resolve")} submit="Resolver seleccionados" variant="secondary">
                {pick}
                <TextArea label="Qué se hizo (visible para cada vecino)" name="message" rows={3} required maxLength={600} />
                <TextArea label="Nota interna / evidencia" name="note" rows={2} hint="Obligatoria si alguno está “En revisión”." />
                {preview}
                <Check name="confirm">Revisé la vista previa y los reclamos elegidos</Check>
              </Form>
            </Card>
            <ConfirmForm action={closeIncident.bind(null, id)} message="¿Cerrar el incidente? Los reclamos vinculados conservan su estado." variant="secondary" size="md">Cerrar el incidente</ConfirmForm>
          </div>
        )}
      </div>
    </div>
  );
}
