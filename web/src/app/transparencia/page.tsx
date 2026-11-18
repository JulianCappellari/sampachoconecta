import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { MIN_CELL, transparency } from "@/lib/transparency";
import { Container, PageHeader } from "@/components/ui/bits";
import { CountUp } from "@/components/motion/CountUp";
export const metadata: Metadata = { title: "Transparencia" };
export const dynamic = "force-dynamic";
const days = (d: number | null) => (d == null ? "—" : d < 1 ? "menos de 1 día" : `${d.toFixed(1).replace(".", ",")} días`);
const monthLabel = (m: string) => new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`)).replace(".", "");
export default async function Page() {
    const t = await transparency();
    const max = Math.max(1, ...t.byMonth.map((m) => m.received));
    const card = "grid content-between gap-3 rounded-2xl border border-line bg-surface p-5";
    return (<Container className="pb-8">
      <PageHeader title="Transparencia" intro="Cómo viene la gestión de reclamos en Sampacho, con cifras agregadas y actualizadas. No se muestran textos, direcciones ni datos de ningún vecino."/>
      <div className="grid gap-10 py-8">
        {!t.enough ? (<p className="flex items-start gap-3 rounded-2xl bg-surface-2 p-5"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-monte" aria-hidden/> Todavía hay pocos reclamos para mostrar cifras sin riesgo de identificar a alguien. Se publican a partir de {MIN_CELL}.</p>) : (<>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <li className={card}><span className="font-bold text-ink-2">Reclamos recibidos</span><span className="font-display text-5xl font-extrabold"><CountUp value={t.total}/></span></li>
              <li className={card}><span className="font-bold text-ink-2">Resueltos</span><span className="font-display text-5xl font-extrabold text-monte">{t.resolvedPct ?? 0} %</span><span className="text-sm text-ink-2">{t.resolved} de {t.total}</span></li>
              <li className={card}><span className="font-bold text-ink-2">Demora promedio en resolver</span><span className="font-display text-3xl font-extrabold">{days(t.daysToResolve)}</span></li>
              <li className={card}><span className="font-bold text-ink-2">Primera respuesta del municipio</span><span className="font-display text-3xl font-extrabold">{days(t.daysToReply)}</span><span className="text-sm text-ink-2">promedio desde que se presenta</span></li>
            </ul>
            <ul className="grid gap-4 sm:grid-cols-3">
              <li className={card}><span className="font-bold text-ink-2">En trámite</span><span className="font-display text-4xl font-extrabold">{t.open}</span></li>
              <li className={card}><span className="font-bold text-ink-2">Con actualización vencida</span><span className="font-display text-4xl font-extrabold">{t.overdue}</span><span className="text-sm text-ink-2">pasó la fecha de novedad informada</span></li>
              <li className={card}><span className="font-bold text-ink-2">Satisfacción con la resolución</span><span className="font-display text-4xl font-extrabold">{t.satisfaction == null ? "—" : `${t.satisfaction.toFixed(1).replace(".", ",")} / 5`}</span><span className="text-sm text-ink-2">{t.rated} {t.rated === 1 ? "opinión" : "opiniones"}</span></li>
            </ul>

            <section aria-labelledby="meses" className="grid gap-3">
              <h2 id="meses" className="text-2xl font-bold">Últimos meses</h2>
              <ul className="grid gap-2.5">
                {t.byMonth.map((m) => (<li key={m.month} className="grid grid-cols-[4.5rem_1fr_7rem] items-center gap-3">
                    <span className="font-bold capitalize">{monthLabel(m.month)}</span>
                    <span className="relative h-3 overflow-hidden rounded-full bg-surface-2"><span className="absolute inset-y-0 left-0 rounded-full bg-monte/40" style={{ width: `${(m.received / max) * 100}%` }}/><span className="absolute inset-y-0 left-0 rounded-full bg-monte" style={{ width: `${(m.resolved / max) * 100}%` }}/></span>
                    <span className="text-right tabular-nums">{m.received} recib. · {m.resolved} resuel.</span>
                  </li>))}
              </ul>
            </section>

            <section aria-labelledby="cat" className="grid gap-3">
              <h2 id="cat" className="text-2xl font-bold">Por tipo de problema</h2>
              {t.byCategory.length === 0 ? <p className="text-ink-2">Ninguna categoría alcanza todavía el mínimo de {MIN_CELL} reclamos para mostrarse.</p> : (<ul className="grid gap-2">{t.byCategory.map((c) => <li key={c.category} className="flex justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3"><b>{c.category}</b><span>{c.total} recibidos · {c.resolved} resueltos</span></li>)}</ul>)}
              <p className="text-sm text-ink-2">Las categorías con menos de {MIN_CELL} reclamos no se muestran, para que nadie pueda ser identificado.</p>
            </section>
          </>)}

        <section aria-labelledby="com" className="grid gap-3">
          <h2 id="com" className="text-2xl font-bold">La comunidad en Sampacho Conecta</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {[["Vecinos con cuenta", t.community.users], ["Comercios y oficios", t.community.listings], ["Publicaciones en 30 días", t.community.posts30], ["Pedidos resueltos", t.community.requestsResolved], ["Ideas realizadas", t.community.ideasRealized], ["Consultas cerradas", t.community.pollsClosed]].map(([l, v]) => (<li key={l as string} className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3"><span>{l}</span><b className="font-display text-2xl">{v}</b></li>))}
          </ul>
        </section>
      </div>
    </Container>);
}
