import type { Metadata } from "next";
import Link from "next/link";
import { Recycle } from "lucide-react";
import { getUser } from "@/lib/auth";
import { BARRIOS, WEEKDAYS } from "@/lib/constants";
import { isFollowing } from "@/lib/data";
import { currentZones } from "@/lib/hoy";
import { daysUntil, kindLabel, slotsForZone } from "@/lib/waste";
import { cn } from "@/lib/cn";
import { FollowButton } from "@/components/ui/FollowButton";
import { Container, EmptyState, PageHeader } from "@/components/ui/bits";
export const metadata: Metadata = { title: "Recolección de residuos en Sampacho: días y zonas", description: "Qué día pasa el camión de residuos por tu zona en Sampacho: común, reciclables, residuos verdes y voluminosos.", alternates: { canonical: "/residuos" } };
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        zona?: string;
    }>;
}) {
    const sp = await searchParams;
    const user = await getUser();
    const zones = await currentZones(user);
    const zone = (BARRIOS as readonly string[]).includes(sp.zona ?? "") ? sp.zona! : (zones[0] ?? user?.barrio ?? "");
    const slots = zone ? await slotsForZone(zone) : [];
    const upcoming = [...slots].map((s) => ({ ...s, in: daysUntil(s.weekday) })).sort((a, b) => a.in - b.in);
    const chip = "inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 font-bold";
    const when = (n: number) => (n === 0 ? "Hoy" : n === 1 ? "Mañana" : `En ${n} días`);
    return (<Container className="pb-8">
      <PageHeader title="Recolección de residuos" intro="Qué día pasa el camión en tu zona. Si seguís la recolección, te avisamos el día anterior."/>
      <div className="grid gap-6 py-8">
        <nav aria-label="Zona" className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-ink-2">Zona:</span>
          {BARRIOS.map((z) => <Link key={z} href={`/residuos?zona=${z}`} aria-current={zone === z ? "page" : undefined} className={cn(chip, zone === z ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-monte")}>{z}</Link>)}
        </nav>
        {!zone ? (<EmptyState icon={Recycle} title="Elegí tu zona" text="Tocá tu barrio para ver los días de recolección."/>) : slots.length === 0 ? (<EmptyState icon={Recycle} title={`Todavía no hay datos para ${zone}`} text="La municipalidad todavía no cargó el cronograma de esta zona. Cuando lo haga, aparece acá."/>) : (<>
            <section aria-labelledby="prox" className="grid gap-3">
              <h2 id="prox" className="text-3xl font-bold">Próximas recolecciones en {zone}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((s) => (<li key={s.id} data-reveal className={cn("grid gap-1 rounded-2xl border p-4", s.in <= 1 ? "border-monte bg-monte-soft" : "border-line bg-surface")}>
                    <span className="font-display text-3xl font-extrabold">{when(s.in)}</span>
                    <span className="font-bold">{WEEKDAYS[s.weekday]} · {kindLabel(s.kind)}</span>
                    {s.note && <span className="text-ink-2">{s.note}</span>}
                  </li>))}
              </ul>
            </section>
            <section aria-labelledby="sem" className="grid gap-3">
              <h2 id="sem" className="text-2xl font-bold">Semana completa</h2>
              <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
                <table className="w-full min-w-[32rem] border-collapse">
                  <tbody>
                    {WEEKDAYS.map((d, i) => {
                const day = slots.filter((s) => s.weekday === i);
                return <tr key={d} className="border-b border-line last:border-0"><th scope="row" className="w-36 bg-surface-2 px-4 py-3 text-left">{d}</th><td className="px-4 py-3">{day.length ? day.map((s) => kindLabel(s.kind)).join(" · ") : <span className="text-ink-2">No pasa</span>}</td></tr>;
            })}
                  </tbody>
                </table>
              </div>
            </section>
          </>)}
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <FollowButton type="tema" id="residuos" following={user ? await isFollowing(user.id, "tema", "residuos") : false} loggedIn={!!user} label="Avisarme el día anterior"/>
          <p className="text-sm text-ink-2">El aviso llega a vecinos con ese barrio en su perfil o que siguen esa zona. Se genera al abrir la app, sin tarea programada.</p>
        </div>
      </div>
    </Container>);
}
