import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getPoll, pollOptions } from "@/lib/polls";
import { closePoll, vote } from "@/actions/encuestas";
import { fmtDate } from "@/lib/format";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Form } from "@/components/ui/Form";
import { Container, PageHeader, Pill } from "@/components/ui/bits";
import { btn } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
type Ctx = {
    params: Promise<{
        id: string;
    }>;
};
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
    return { title: (await getPoll(Number((await params).id)))?.question ?? "Consulta" };
}
export default async function Page({ params }: Ctx) {
    const id = Number((await params).id);
    const user = await getUser();
    const poll = Number.isInteger(id) ? await getPoll(id, user?.id) : undefined;
    if (!poll)
        notFound();
    const options = await pollOptions(id);
    const open = poll.effective === "abierta";
    const muni = user?.role === "municipio";
    const showResults = !open || muni; // el municipio ve en vivo; los vecinos, al cierre
    const max = Math.max(1, ...options.map((o) => o.votes));
    const canVote = open && !poll.my_option && (!poll.zone || user?.barrio === poll.zone);
    return (<Container narrow className="pb-8">
      <PageHeader title={poll.question} back={{ href: "/encuestas", label: "Encuestas" }} intro={<span className="flex flex-wrap items-center gap-2"><Pill tone={open ? "ok" : "neutral"}>{open ? "Abierta" : "Cerrada"}</Pill><span>{open ? `Cierra el ${fmtDate(poll.closes_at)}` : `Cerró el ${fmtDate(poll.closes_at)}`}{poll.zone ? ` · Para vecinos de ${poll.zone}` : ""}</span></span>}/>
      <div className="grid gap-6 py-8">
        {poll.body && <p className="max-w-prose whitespace-pre-line text-lg">{poll.body}</p>}

        {poll.my_option && <p role="status" className="flex items-start gap-3 rounded-2xl bg-monte-soft p-4 font-bold text-monte"><CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden/> Ya votaste en esta consulta. {open && "Los resultados se publican al cierre."}</p>}

        {canVote && (<Form action={vote.bind(null, id)} submit="Votar" className="gap-4">
            <fieldset className="grid gap-2">
              <legend className="mb-1 font-bold">Elegí una opción (no se puede cambiar)</legend>
              {options.map((o) => (<label key={o.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-line bg-surface px-4 py-2 has-[:checked]:border-monte has-[:checked]:bg-monte-soft">
                  <input type="radio" name="option" value={o.id} required className="size-5 accent-[var(--monte)]"/> {o.label}
                </label>))}
            </fieldset>
          </Form>)}
        {open && !user && <p>Para votar, <Link className={btn("primary", "sm", "mx-1")} href={`/ingresar?next=${encodeURIComponent(`/encuestas/${id}`)}`}>ingresá a tu cuenta</Link></p>}
        {open && user && poll.zone && user.barrio !== poll.zone && <p className="rounded-xl bg-girasol-soft p-3 text-warn">Esta consulta es para vecinos de {poll.zone}. Tu barrio figura como {user.barrio ?? "sin definir"}; podés cambiarlo en tu perfil.</p>}

        {showResults ? (<section aria-labelledby="res" className="grid gap-3">
            <h2 id="res" className="text-2xl font-bold">{open ? "Resultados en vivo (solo municipio)" : "Resultados"}</h2>
            <ul className="grid gap-3">
              {options.map((o) => {
                const pct = poll.total ? Math.round((o.votes / poll.total) * 100) : 0;
                return (<li key={o.id} className="grid gap-1">
                    <p className="flex justify-between gap-3 font-bold"><span>{o.label}{poll.my_option === o.id && " · tu voto"}</span><span>{o.votes} · {pct} %</span></p>
                    <span className="h-3 overflow-hidden rounded-full bg-surface-2"><span className={cn("block h-full rounded-full", o.votes === max ? "bg-monte" : "bg-monte/45")} style={{ width: `${(o.votes / max) * 100}%` }}/></span>
                  </li>);
            })}
            </ul>
            <p className="text-ink-2">{poll.total} {poll.total === 1 ? "voto" : "votos"} en total. Es una consulta abierta a quienes tienen cuenta: no es una votación oficial ni representativa de todo el pueblo.</p>
          </section>) : (<p className="text-ink-2">{poll.total} {poll.total === 1 ? "voto" : "votos"} hasta ahora.</p>)}
        {muni && open && <ConfirmForm action={closePoll.bind(null, id)} message="¿Cerrar la consulta ahora? Se publican los resultados." variant="secondary" size="md">Cerrar la consulta</ConfirmForm>}
      </div>
    </Container>);
}
