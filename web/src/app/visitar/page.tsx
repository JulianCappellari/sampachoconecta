import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Compass, MapPin } from "lucide-react";
import { listListings, upcomingEvents } from "@/lib/data";
import { listPlaces, placeKindLabel } from "@/lib/tourism";
import { eventParts } from "@/lib/format";
import { Container, PageHeader } from "@/components/ui/bits";
import { MapView, type MapMarker } from "@/components/maps/MapView";
import { RatingSummary } from "@/components/guia/ListingCard";
import { Spotlight } from "@/components/motion/Effects";

export const metadata: Metadata = { title: "Visitar Sampacho" };
export const dynamic = "force-dynamic";

export default function Page() {
  const places = listPlaces();
  const stay = listListings({ kind: "comercio", category: "Alojamiento" }).slice(0, 6);
  const eat = listListings({ kind: "comercio", category: "Gastronomía" }).slice(0, 6);
  const events = upcomingEvents(5);
  const markers: MapMarker[] = [
    ...places.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: `p${p.id}`, lat: p.lat!, lng: p.lng!, title: p.name, sub: placeKindLabel(p.kind), color: "#B83C78" })),
    ...[...stay, ...eat].filter((l) => l.lat != null && l.lng != null).map((l) => ({ id: `l${l.id}`, lat: l.lat!, lng: l.lng!, title: l.name, sub: l.category, href: `/guia/${l.id}`, color: "#0E6B5A" })),
  ];
  const groups = (["atractivo", "fiesta", "consejo"] as const).map((k) => ({ k, items: places.filter((p) => p.kind === k) })).filter((g) => g.items.length);
  const h = "text-3xl font-bold";
  return (
    <Container className="pb-8">
      <PageHeader title="Visitar Sampacho" intro="Una guía para quien llega: qué conocer, dónde comer y dónde quedarse, y qué se está haciendo en el pueblo. La arman la municipalidad y los comercios locales." />
      <div className="grid gap-12 py-8">
        {markers.length > 0 && <MapView markers={markers} className="h-80 sm:h-96" />}

        {groups.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-surface p-6 text-ink-2">La municipalidad todavía no cargó lugares para visitar. Mientras tanto, mirá dónde comer y dónde quedarte.</p>}
        {groups.map((g) => (
          <section key={g.k} aria-labelledby={`g-${g.k}`} className="grid gap-4">
            <h2 id={`g-${g.k}`} className={h}>{placeKindLabel(g.k)}</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {g.items.map((p) => (
                <li key={p.id} data-reveal>
                  <Spotlight className="h-full rounded-2xl border border-line bg-surface" color="rgba(184,60,120,.10)">
                    <article className="relative grid gap-2 p-5">
                      <h3 className="flex items-center gap-2 text-xl font-bold"><Compass className="size-5 text-[#B83C78]" aria-hidden /> {p.name}</h3>
                      <p className="text-ink-2">{p.description}</p>
                      {p.address && <p className="flex items-center gap-1.5 text-sm text-ink-2"><MapPin className="size-4" aria-hidden /> {p.address}</p>}
                    </article>
                  </Spotlight>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {[{ id: "dormir", title: "Dónde quedarte", list: stay, empty: "Todavía no hay alojamientos en la guía." }, { id: "comer", title: "Dónde comer", list: eat, empty: "Todavía no hay gastronomía en la guía." }].map((s) => (
          <section key={s.id} aria-labelledby={s.id} className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3"><h2 id={s.id} className={h}>{s.title}</h2><Link href={`/guia?cat=${s.id === "dormir" ? "Alojamiento" : "Gastronomía"}`} className="font-bold text-monte hover:underline">Ver en la guía</Link></div>
            {s.list.length === 0 ? <p className="text-ink-2">{s.empty}</p> : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {s.list.map((l) => <li key={l.id} data-reveal><Link href={`/guia/${l.id}`} className="grid h-full gap-1 rounded-2xl border border-line bg-surface p-4 transition hover:border-monte"><span className="text-lg font-bold">{l.name}</span><RatingSummary avg={l.avg} count={l.count} /><span className="text-ink-2">{l.address}</span></Link></li>)}
              </ul>
            )}
          </section>
        ))}

        <section aria-labelledby="agenda" className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="agenda" className={h}>Qué pasa pronto</h2><Link href="/agenda" className="font-bold text-monte hover:underline">Ver la agenda</Link></div>
          {events.length === 0 ? <p className="text-ink-2">No hay eventos publicados por ahora.</p> : (
            <ul className="grid gap-3">
              {events.map((e) => {
                const p = eventParts(e.event_at!);
                return <li key={e.id}><Link href={`/muro/${e.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-monte"><CalendarDays className="size-6 text-[#B83C78]" aria-hidden /><span><b>{e.title}</b><span className="block text-ink-2 capitalize">{p.long}{p.time && ` · ${p.time} h`}{e.event_place ? ` · ${e.event_place}` : ""}</span></span></Link></li>;
              })}
            </ul>
          )}
        </section>
      </div>
    </Container>
  );
}
