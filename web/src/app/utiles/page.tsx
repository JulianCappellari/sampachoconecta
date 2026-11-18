import type { Metadata } from "next";
import { MapPin, Phone, Pill as PillIcon } from "lucide-react";
import { PHONE_CATEGORIES } from "@/lib/constants";
import { listPhones, pharmacyToday, pharmacyUpcoming } from "@/lib/data";
import { eventParts, telLink } from "@/lib/format";
import { ExtLink } from "@/components/ui/Button";
import { Container, PageHeader } from "@/components/ui/bits";
export const metadata: Metadata = { title: "Teléfonos útiles" };
export const dynamic = "force-dynamic";
export default async function Page() {
    const phones = await listPhones();
    const today = await pharmacyToday();
    const next = (await pharmacyUpcoming(8)).filter((p) => p.date !== today?.date);
    const groups = PHONE_CATEGORIES.map((c) => ({ c, items: phones.filter((p) => p.category === c) })).filter((g) => g.items.length);
    return (<Container className="pb-8">
      <PageHeader title="Teléfonos útiles" intro="Lo importante a mano, con llamada en un toque."/>

      <section aria-labelledby="farmacia" className="grid gap-4 py-8">
        <h2 id="farmacia" className="text-3xl font-bold">Farmacia de turno</h2>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <article data-reveal className="grid content-start gap-3 rounded-3xl bg-[#0B4F43] p-6 text-white sm:p-8">
            <p className="inline-flex items-center gap-2 font-bold text-[#F2B02A]"><PillIcon className="size-5" aria-hidden/> Hoy</p>
            {today ? (<>
                <p className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">{today.name}</p>
                {today.address && <p className="flex items-center gap-2 text-lg text-white/85"><MapPin className="size-5" aria-hidden/> {today.address}</p>}
                {today.phone && <ExtLink href={telLink(today.phone)} variant="sun" size="lg" className="mt-2 w-fit"><Phone className="size-5" aria-hidden/> Llamar · {today.phone}</ExtLink>}
              </>) : (<p className="text-lg">Todavía no se cargó la farmacia de turno de hoy. Consultá en la municipalidad.</p>)}
          </article>
          <div data-reveal className="rounded-3xl border border-line bg-surface p-5">
            <h3 className="mb-2 text-xl font-bold">Próximos días</h3>
            {next.length === 0 ? <p className="text-ink-2">Sin turnos cargados.</p> : (<ul className="divide-y divide-line">
                {next.map((p) => {
                const d = eventParts(p.date);
                return (<li key={p.date} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="capitalize text-ink-2">{d.weekday} {d.day}</span>
                      <b className="text-right">{p.name}</b>
                    </li>);
            })}
              </ul>)}
          </div>
        </div>
      </section>

      {groups.map((g) => (<section key={g.c} aria-labelledby={`g-${g.c}`} className="grid gap-4 py-6">
          <h2 id={`g-${g.c}`} className="text-3xl font-bold">{g.c}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((p) => (<li key={p.id} data-reveal>
                <ExtLink href={telLink(p.number)} variant="secondary" size="lg" className="h-full w-full justify-between rounded-2xl py-4 hover:border-monte" aria-label={`Llamar a ${p.name}, ${p.number}`}>
                  <span className="text-left text-lg">{p.name}</span>
                  <span className="inline-flex items-center gap-2 font-display text-2xl font-extrabold text-monte"><Phone className="size-5" aria-hidden/> {p.number}</span>
                </ExtLink>
              </li>))}
          </ul>
        </section>))}
    </Container>);
}
