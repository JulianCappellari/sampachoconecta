import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Vote } from "lucide-react";
import { getUser } from "@/lib/auth";
import { listPolls } from "@/lib/polls";
import { fmtDate } from "@/lib/format";
import { LinkButton } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader, Pill } from "@/components/ui/bits";
export const metadata: Metadata = { title: "Encuestas vecinales de Sampacho", description: "Consultas abiertas a los vecinos de Sampacho: votá y mirá los resultados.", alternates: { canonical: "/encuestas" } };
export const dynamic = "force-dynamic";
export default async function Page() {
    const user = await getUser();
    const polls = await listPolls(user?.id);
    return (<Container className="pb-8">
      <PageHeader title="Encuestas vecinales" intro="La municipalidad consulta y cada vecino vota una vez. Los resultados se publican cuando la consulta cierra." actions={user?.role === "municipio" ? <LinkButton href="/encuestas/nueva"><Plus className="size-5" aria-hidden/> Nueva consulta</LinkButton> : undefined}/>
      <div className="grid max-w-3xl gap-4 py-8">
        {polls.length === 0 ? (<EmptyState icon={Vote} title="Todavía no hay consultas" text="Cuando la municipalidad abra una, la vas a ver acá y te avisamos si seguís las encuestas."/>) : (polls.map((p) => (<Link key={p.id} href={`/encuestas/${p.id}`} data-reveal className="grid gap-2 rounded-2xl border border-line bg-surface p-5 transition hover:border-monte">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={p.effective === "abierta" ? "ok" : "neutral"}>{p.effective === "abierta" ? "Abierta" : "Cerrada"}</Pill>
                {p.zone && <span className="font-bold text-ink-2">Solo {p.zone}</span>}
                {p.my_option && <Pill tone="info">Ya votaste</Pill>}
              </div>
              <h2 className="text-2xl font-bold leading-snug">{p.question}</h2>
              <p className="text-ink-2">{p.effective === "abierta" ? `Cierra el ${fmtDate(p.closes_at)}` : `Cerró el ${fmtDate(p.closes_at)}`} · {p.total} {p.total === 1 ? "voto" : "votos"}</p>
            </Link>)))}
      </div>
    </Container>);
}
