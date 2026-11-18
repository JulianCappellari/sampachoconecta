import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, MapPin, Plus } from "lucide-react";
import { upcomingEvents } from "@/lib/data";
import { clamp, eventParts } from "@/lib/format";
import { LinkButton } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader } from "@/components/ui/bits";
import { btn } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default function Page() {
  const events = upcomingEvents(60);
  const months = new Map<string, typeof events>();
  for (const e of events) {
    const key = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(e.event_at!.slice(0, 10) + "T00:00:00Z"));
    months.set(key, [...(months.get(key) ?? []), e]);
  }
  return (
    <Container className="pb-8">
      <PageHeader
        title="Agenda del pueblo"
        intro="Fiestas, actos, partidos y ferias de Sampacho. Para sumar un evento, publicalo en el muro con la categoría Evento."
        actions={<LinkButton href="/muro/nueva?cat=evento"><Plus className="size-5" aria-hidden /> Publicar un evento</LinkButton>}
      />
      <div className="grid max-w-3xl gap-10 py-8">
        {events.length === 0 && <EmptyState title="No hay eventos próximos" text="Publicá el primero: una fiesta, un partido, una feria." action={<LinkButton href="/muro/nueva?cat=evento">Publicar un evento</LinkButton>} />}
        {[...months.entries()].map(([month, list]) => (
          <section key={month} aria-labelledby={`m-${month}`} className="grid gap-4">
            <h2 id={`m-${month}`} className="text-3xl font-bold capitalize">{month}</h2>
            <ul className="grid gap-3">
              {list.map((e) => {
                const p = eventParts(e.event_at!);
                return (
                  <li key={e.id} data-reveal className="group relative flex gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-monte sm:p-5">
                    <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-[#B83C78] text-center font-display leading-none text-white">
                      <span><span className="block text-3xl font-extrabold">{p.day}</span><span className="block text-sm font-bold capitalize">{p.month}</span></span>
                    </span>
                    <div className="grid min-w-0 flex-1 content-start gap-1">
                      <p className="font-bold capitalize text-ink-2">{p.weekday}{p.time && ` · ${p.time} h`}</p>
                      <h3 className="text-xl font-bold leading-snug sm:text-2xl">
                        <Link href={`/muro/${e.id}`} className="after:absolute after:inset-0 after:content-['']">{e.title}</Link>
                      </h3>
                      {e.event_place && <p className="flex items-center gap-1.5 text-ink-2"><MapPin className="size-4" aria-hidden /> {e.event_place}</p>}
                      <p className="text-ink-2">{clamp(e.body, 120)}</p>
                      <a href={`/api/ics/${e.id}`} className={btn("ghost", "sm", "relative z-10 mt-1 w-fit -ml-3")}><CalendarPlus className="size-4" aria-hidden /> Agregar a mi calendario</a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  );
}
