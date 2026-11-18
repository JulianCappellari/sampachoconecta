import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, MessageCircle, Plus, Users } from "lucide-react";
import { getUser } from "@/lib/auth";
import { IDEA_STATUS, ideaStatus } from "@/lib/constants";
import { listIdeas } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LinkButton } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader, Pill } from "@/components/ui/bits";
import { SupportButton } from "@/components/ideas/SupportButton";
import { Photo } from "@/components/ui/Photo";
export const metadata: Metadata = { title: "Ideas vecinales" };
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        estado?: string;
    }>;
}) {
    const { estado } = await searchParams;
    const user = await getUser();
    const st = IDEA_STATUS.some((s) => s.id === estado) ? estado : undefined;
    const ideas = await listIdeas(user?.id, st);
    const chip = "inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 font-bold transition";
    return (<Container className="pb-8">
      <PageHeader title="Ideas vecinales" intro="Propuestas de los vecinos para mejorar Sampacho. Sumate a las que te gusten y armá el grupo de WhatsApp para hacerlas realidad." actions={<LinkButton href="/ideas/nueva"><Plus className="size-5" aria-hidden/> Proponer una idea</LinkButton>}/>
      <nav aria-label="Estado" className="flex flex-wrap gap-2 py-6">
        <Link href="/ideas" className={cn(chip, !st ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-monte")}>Todas</Link>
        {IDEA_STATUS.map((s) => (<Link key={s.id} href={`/ideas?estado=${s.id}`} className={cn(chip, st === s.id ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-monte")}>{s.label}</Link>))}
      </nav>
      {ideas.length === 0 ? (<EmptyState title="Todavía no hay ideas" text="Proponé la primera: una huerta, un torneo, una mejora para tu barrio." action={<LinkButton href="/ideas/nueva">Proponer una idea</LinkButton>}/>) : (<div className="grid gap-5 md:grid-cols-2">
          {ideas.map((i) => (<article key={i.id} data-reveal className="group relative grid content-start gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-5 transition hover:border-monte">
              {i.photo && <div className="-mx-5 -mt-5 aspect-[16/8] overflow-hidden bg-surface-2"><Photo name={i.photo} alt=""/></div>}
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={i.status === "realizada" ? "ok" : i.status === "en_marcha" ? "info" : "neutral"}>{ideaStatus(i.status).label}</Pill>
                {i.municipal ? <Pill tone="warn"><Landmark className="size-4" aria-hidden/> En estudio municipal</Pill> : null}
                <span className="text-sm font-bold text-ink-2">{i.category}</span>
              </div>
              <h2 className="text-2xl font-bold leading-snug">
                <Link href={`/ideas/${i.id}`} className="after:absolute after:inset-0 after:content-['']">{i.title}</Link>
              </h2>
              <p className="line-clamp-3 text-ink-2">{i.body}</p>
              <p className="text-sm text-ink-2">Propuesta por <b className="text-ink">{i.author_name}</b> · {timeAgo(i.created_at)}</p>
              <div className="flex flex-wrap items-center gap-3">
                <SupportButton ideaId={i.id} joined={!!i.joined} supports={i.supports} size="sm"/>
                <span className="inline-flex items-center gap-1.5 text-ink-2"><MessageCircle className="size-5" aria-hidden/> {i.comments}</span>
                {i.group_link && <span className="inline-flex items-center gap-1.5 text-sm font-bold text-wa"><Users className="size-4" aria-hidden/> Tiene grupo</span>}
              </div>
            </article>))}
        </div>)}
    </Container>);
}
