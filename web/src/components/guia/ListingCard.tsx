import Link from "next/link";
import { BadgeCheck, MapPin, MessageCircle, Phone, Siren } from "lucide-react";
import type { Listing } from "@/lib/data";
import { hoursLabel, telLink, waLink } from "@/lib/format";
import { ExtLink } from "@/components/ui/Button";
import { Pill } from "@/components/ui/bits";
import { Stars } from "@/components/ui/Stars";
import { Photo } from "@/components/ui/Photo";

export function RatingSummary({ avg, count }: { avg: number; count: number }) {
  // RN-04: el promedio se muestra desde 3 calificaciones.
  if (count < 3)
    return (
      <span className="inline-flex items-center gap-2 text-ink-2">
        <Pill>Nuevo</Pill> {count} {count === 1 ? "opinión" : "opiniones"}
      </span>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Stars value={avg} />
      <b>{avg.toFixed(1).replace(".", ",")}</b>
      <span className="text-ink-2">({count})</span>
    </span>
  );
}

export function ListingCard({ l }: { l: Listing }) {
  const trade = l.kind === "oficio";
  return (
    <article data-reveal className="group relative grid gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-monte sm:p-5">
      <div className="flex gap-4">
        {l.photos[0] && (
          <div className="hidden size-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:block">
            <Photo name={l.photos[0]} alt={`Foto de ${l.name}`} />
          </div>
        )}
        <div className="min-w-0 flex-1 grid gap-1.5">
          <p className="flex flex-wrap items-center gap-x-2 text-sm font-bold text-ink-2">
            {l.category}
            {l.verified ? (
              <span className="inline-flex items-center gap-1 text-monte"><BadgeCheck className="size-4" aria-hidden /> Verificado</span>
            ) : null}
          </p>
          <h3 className="text-xl font-bold leading-snug sm:text-2xl">
            <Link href={`/guia/${l.id}`} className="after:absolute after:inset-0 after:content-['']">{l.name}</Link>
          </h3>
          <RatingSummary avg={l.avg} count={l.count} />
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
            {!trade && l.address && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> {l.address}</span>}
            {trade && l.zone && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> {l.zone}</span>}
            {l.open_time && <span>{hoursLabel(l)}</span>}
          </p>
        </div>
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-2">
        {l.open_time && (l.open ? <Pill tone="ok">Abierto ahora</Pill> : <Pill>Cerrado ahora</Pill>)}
        {l.emergency ? <Pill tone="warn"><Siren className="size-4" aria-hidden /> Atiende urgencias</Pill> : null}
        <span className="ml-auto flex gap-2">
          <ExtLink href={telLink(l.phone)} variant="secondary" size="sm" aria-label={`Llamar a ${l.name}`}>
            <Phone className="size-4" aria-hidden /> Llamar
          </ExtLink>
          {l.whatsapp && (
            <ExtLink href={waLink(l.whatsapp, `Hola, te encontré en Sampacho Conecta.`)} variant="wa" size="sm" aria-label={`Escribir por WhatsApp a ${l.name}`}>
              <MessageCircle className="size-4" aria-hidden /> WhatsApp
            </ExtLink>
          )}
        </span>
      </div>
    </article>
  );
}
