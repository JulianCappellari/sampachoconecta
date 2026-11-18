import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CLAIM_AREAS, CLAIM_NEXT, CLAIM_STATUS, claimStatus } from "@/lib/constants";
import Link from "next/link";
import { claimEvents, getClaim } from "@/lib/data";
import { fmtDate, fmtDateTime, nowUtc, utcToLocalInput } from "@/lib/format";
import { rateClaim, updateClaim } from "@/actions/reclamos";
import { Card, Container, PageHeader, StatusPill } from "@/components/ui/bits";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { Photo } from "@/components/ui/Photo";
import { Stars, StarInput } from "@/components/ui/Stars";
import { MapView } from "@/components/maps/MapView";
import { cn } from "@/lib/cn";

type Ctx = { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> };
export const metadata: Metadata = { title: "Seguimiento de reclamo" };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: Ctx) {
  const id = Number((await params).id);
  const { nuevo } = await searchParams;
  const user = await requireUser(`/reclamos/${id}`);
  const claim = Number.isInteger(id) ? getClaim(id) : undefined;
  // RN-01: solo el autor y el municipio.
  if (!claim || (claim.user_id !== user.id && user.role !== "municipio")) notFound();
  const staff = user.role === "municipio";
  const events = claimEvents(id, !staff);
  const closed = claim.status === "resuelto" || claim.status === "rechazado";
  const lastReply = [...events].reverse().find((e) => e.author_role === "municipio" && e.visibility === "author" && e.kind !== "note");
  const flow = CLAIM_STATUS.filter((s) => s.id !== "rechazado");
  const idx = flow.findIndex((s) => s.id === claim.status);

  return (
    <Container className="pb-8">
      <PageHeader title={claim.category} back={{ href: staff ? "/panel/reclamos" : "/reclamos", label: staff ? "Bandeja de reclamos" : "Mis reclamos" }}
        intro={<span className="flex flex-wrap items-center gap-3"><StatusPill status={claim.status} /><span className="font-mono">{claim.number}</span></span>} />

      {nuevo && (
        <p role="status" className="mt-6 flex items-start gap-3 rounded-2xl bg-monte-soft p-4 font-bold text-monte">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          Recibimos tu reclamo. Guardá el número {claim.number}: con él podés seguirlo desde acá.
        </p>
      )}

      <div className="grid gap-8 py-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid content-start gap-6">
          <Card className="grid gap-4">
            <p className="whitespace-pre-line text-lg leading-relaxed">{claim.description}</p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
              {claim.address && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> {claim.address}</span>}
              <span>Presentado el {fmtDateTime(claim.created_at)}</span>
              {staff && <span>Vecino: <b className="text-ink">{claim.author_name}</b>{claim.author_barrio ? ` · ${claim.author_barrio}` : ""}{claim.author_phone ? ` · ${claim.author_phone}` : ""}</span>}
            </p>
            {claim.photos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {claim.photos.map((n, i) => (
                  <li key={n} className="aspect-square overflow-hidden rounded-xl bg-surface-2">
                    <a href={`/api/fotos/${n}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto ${i + 1}`}><Photo name={n} alt={`Foto ${i + 1} del reclamo`} /></a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {claim.lat != null && claim.lng != null && (
            <MapView markers={[{ id: claim.id, lat: claim.lat, lng: claim.lng, title: claim.category, sub: claim.address ?? undefined }]} className="h-72" />
          )}
          <p className="flex items-center gap-2 text-sm text-ink-2"><Lock className="size-4" aria-hidden /> Solo lo ven {staff ? "el vecino y el municipio" : "vos y la municipalidad"}.</p>
        </div>

        <div className="grid content-start gap-6">
          <section aria-labelledby="seguimiento" className="grid gap-4">
            <h2 id="seguimiento" className="text-2xl font-bold">Seguimiento</h2>
            <dl className="grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div><dt className="text-sm font-bold text-ink-2">Lo atiende</dt><dd className="font-bold">{claim.area ?? "Todavía sin asignar"}</dd></div>
              <div><dt className="text-sm font-bold text-ink-2">Última respuesta</dt><dd className="font-bold">{lastReply ? fmtDate(lastReply.created_at) : "Sin respuesta aún"}</dd></div>
              <div>
                <dt className="text-sm font-bold text-ink-2">Próxima actualización</dt>
                <dd className="font-bold">
                  {closed ? "Reclamo cerrado" : claim.next_update_at ? fmtDate(claim.next_update_at) : "Todavía no se informó una próxima actualización"}
                  {!closed && claim.next_update_at && claim.next_update_at <= nowUtc() && <span className="ml-2 inline-block rounded-full bg-girasol-soft px-2.5 py-0.5 text-sm text-warn">Actualización pendiente</span>}
                </dd>
              </div>
            </dl>
            {!closed && claim.next_update_at && <p className="text-sm text-ink-2">Es la fecha en que esperamos tener novedades, no una promesa de reparación.</p>}
            {claim.status !== "rechazado" && (
              <ol className="grid grid-cols-4 gap-1" aria-label="Etapas">
                {flow.map((s, i) => (
                  <li key={s.id} className="grid gap-1.5">
                    <span className={cn("h-2 rounded-full", i <= idx ? "bg-monte" : "bg-line")} />
                    <span className={cn("text-xs font-bold sm:text-sm", i === idx ? "text-monte" : "text-ink-2")}>{s.label}</span>
                  </li>
                ))}
              </ol>
            )}
            <ol className="grid">
              {[...events].reverse().map((e, i) => {
                const s = claimStatus(e.status);
                return (
                  <li key={e.id} className="group relative grid grid-cols-[1.5rem_1fr] gap-3 pb-6 last:pb-0">
                    <span aria-hidden className="relative z-10 mt-1.5 size-4 rounded-full border-4 border-bg" style={{ background: i === 0 ? "var(--girasol)" : "var(--monte)", boxShadow: "0 0 0 1.5px var(--line)" }} />
                    <span aria-hidden className="absolute left-[7px] top-6 -z-0 h-full w-0.5 bg-line group-last:hidden" />
                    <div>
                      <p className="flex flex-wrap items-center gap-2"><b>{e.kind === "note" ? "Nota interna" : e.kind === "update" ? "Novedad" : s.label}</b>{e.visibility === "municipal" && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold">Solo municipio</span>}<span className="text-sm text-ink-2">{fmtDateTime(e.created_at)}</span></p>
                      {e.comment && <p className="text-ink-2">{e.author_role === "municipio" ? <><b className="text-ink">Municipalidad:</b> “{e.comment}”</> : e.comment}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {!staff && claim.status === "resuelto" && (
            <Card>
              {claim.rating ? (
                <p className="flex items-center gap-3 font-bold">Tu calificación: <Stars value={claim.rating} size={22} /></p>
              ) : (
                <Form action={rateClaim.bind(null, id)} submit="Enviar calificación">
                  <p className="text-lg font-bold">¿Quedó resuelto como esperabas?</p>
                  <StarInput />
                </Form>
              )}
            </Card>
          )}

          {staff && !closed && (
            <Card className="grid gap-3 border-monte">
              <h2 className="text-xl font-bold">Gestionar reclamo</h2>
              {claim.user_id === user.id ? (
                <p className="rounded-xl bg-girasol-soft p-3 text-warn">Este reclamo lo presentaste vos: por conflicto de interés lo tiene que gestionar otra persona del municipio.</p>
              ) : (
                <Form action={updateClaim.bind(null, id)} submit="Guardar y registrar el aviso al vecino">
                  <input type="hidden" name="version" value={claim.version} />
                  <Select label="Estado" name="status" defaultValue={claim.status} options={[claim.status, ...(CLAIM_NEXT[claim.status] ?? [])].map((s) => ({ value: s, label: claimStatus(s).label }))} />
                  <Select label="Área responsable" name="area" defaultValue={claim.area ?? ""} placeholder="Sin asignar" options={CLAIM_AREAS} hint="Obligatoria para pasar a revisión o proceso." />
                  <Field label="Próxima actualización" name="next_update" type="date" defaultValue={claim.next_update_at && claim.next_update_at > nowUtc() ? utcToLocalInput(claim.next_update_at).slice(0, 10) : ""} hint="Fecha en que el vecino va a tener novedades. No es una promesa de reparación. Hasta 30 días." />
                  <Field label="Motivo de la ampliación" name="extend_reason" hint="Solo si la fecha pasa de 30 días." />
                  <TextArea label="Respuesta para el vecino (visible)" name="reply" rows={3} maxLength={800} hint="Obligatoria para resolver o rechazar. Sin datos de otros vecinos." />
                  <TextArea label="Nota interna (solo municipio)" name="note" rows={2} maxLength={800} hint="No la ve el vecino ni aparece en sus avisos." />
                </Form>
              )}
              {claim.incident_id && <p className="text-sm">Agrupado en el <Link href={`/panel/incidentes/${claim.incident_id}`} className="font-bold text-monte underline">incidente #{claim.incident_id}</Link>.</p>}
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
