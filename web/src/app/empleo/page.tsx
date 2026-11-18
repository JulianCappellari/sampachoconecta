import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus, Search } from "lucide-react";
import { BARRIOS, REQUEST_CATEGORIES } from "@/lib/constants";
import { listJobs } from "@/lib/jobs";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { inputCls } from "@/components/ui/Fields";
import { LinkButton } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader, Pill } from "@/components/ui/bits";
export const metadata: Metadata = { title: "Bolsa de trabajo de Sampacho", description: "Ofertas de empleo y personas que buscan trabajo en Sampacho, Córdoba. Publicá o respondé de forma gratuita.", alternates: { canonical: "/empleo" } };
export const dynamic = "force-dynamic";
type SP = {
    tipo?: string;
    cat?: string;
    zona?: string;
    q?: string;
};
export default async function Page({ searchParams }: {
    searchParams: Promise<SP>;
}) {
    const sp = await searchParams;
    const kind = sp.tipo === "busco" ? "busco" : "oferta";
    const cat = REQUEST_CATEGORIES.includes(sp.cat ?? "") ? sp.cat : undefined;
    const zone = (BARRIOS as readonly string[]).includes(sp.zona ?? "") ? sp.zona : undefined;
    const q = sp.q?.trim().slice(0, 80) || undefined;
    const jobs = await listJobs({ kind, category: cat, zone, q });
    const href = (o: Partial<Record<keyof SP, string | null>>) => {
        const cur: SP = { tipo: kind, cat, zona: zone, q };
        const u = new URLSearchParams();
        for (const [k, v] of Object.entries({ ...cur, ...o }))
            if (v)
                u.set(k, v);
        return `/empleo?${u}`;
    };
    const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] px-4 font-bold transition";
    return (<Container className="pb-8">
      <PageHeader title="Bolsa de trabajo" intro="Trabajos y changas en Sampacho: quienes ofrecen y quienes buscan. Cada aviso trae su teléfono de contacto; la app no intermedia ni cobra." actions={<LinkButton href={`/empleo/nuevo?tipo=${kind}`}><Plus className="size-5" aria-hidden/> {kind === "oferta" ? "Ofrecer trabajo" : "Ofrecerme"}</LinkButton>}/>
      <div className="grid gap-4 py-6">
        <div className="flex gap-1 rounded-full border border-line bg-surface p-1 w-fit" role="group" aria-label="Tipo de aviso">
          <Link href={href({ tipo: "oferta" })} aria-pressed={kind === "oferta"} className={cn("inline-flex min-h-10 items-center rounded-full px-4 font-bold", kind === "oferta" ? "bg-ink text-bg" : "text-ink-2")}>Ofrecen trabajo</Link>
          <Link href={href({ tipo: "busco" })} aria-pressed={kind === "busco"} className={cn("inline-flex min-h-10 items-center rounded-full px-4 font-bold", kind === "busco" ? "bg-ink text-bg" : "text-ink-2")}>Buscan trabajo</Link>
        </div>
        <form action="/empleo" role="search" className="relative max-w-2xl">
          <input type="hidden" name="tipo" value={kind}/>
          {cat && <input type="hidden" name="cat" value={cat}/>}
          {zone && <input type="hidden" name="zona" value={zone}/>}
          <label htmlFor="q" className="sr-only">Buscar</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" aria-hidden/>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar un trabajo" className={cn(inputCls, "pl-12")}/>
        </form>
        <nav aria-label="Rubros" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
          <Link href={href({ cat: null })} className={cn(chip, !cat ? "border-ink bg-ink text-bg" : "border-line bg-surface")}>Todos</Link>
          {REQUEST_CATEGORIES.map((c) => <Link key={c} href={href({ cat: c })} className={cn(chip, cat === c ? "border-ink bg-ink text-bg" : "border-line bg-surface")}>{c}</Link>)}
        </nav>
      </div>
      <div className="grid max-w-3xl gap-4">
        {jobs.length === 0 ? (<EmptyState icon={Briefcase} title="No hay avisos con ese filtro" text="Publicá el tuyo: si ofrecés trabajo o si te ofrecés vos." action={<LinkButton href={`/empleo/nuevo?tipo=${kind}`}>Publicar un aviso</LinkButton>}/>) : (jobs.map((j) => (<Link key={j.id} href={`/empleo/${j.id}`} data-reveal className="grid gap-2 rounded-2xl border border-line bg-surface p-5 transition hover:border-monte">
              <div className="flex flex-wrap items-center gap-2"><Pill tone={j.kind === "oferta" ? "ok" : "info"}>{j.kind === "oferta" ? "Ofrecen" : "Buscan"}</Pill><span className="font-bold text-ink-2">{j.category}{j.zone ? ` · ${j.zone}` : ""}</span></div>
              <h2 className="text-2xl font-bold leading-snug">{j.title}</h2>
              <p className="line-clamp-2 text-ink-2">{j.body}</p>
              <p className="text-sm text-ink-2">{j.author_name.split(" ")[0]} · {timeAgo(j.created_at)}</p>
            </Link>)))}
      </div>
    </Container>);
}
