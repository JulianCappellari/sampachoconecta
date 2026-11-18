import type { Metadata } from "next";
import Link from "next/link";
import { HandHelping, Plus, Search } from "lucide-react";
import { BARRIOS, REQUEST_CATEGORIES } from "@/lib/constants";
import { listRequests } from "@/lib/pedidos";
import { fmtDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { inputCls } from "@/components/ui/Fields";
import { LinkButton } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader, Pill } from "@/components/ui/bits";
export const metadata: Metadata = { title: "Necesito" };
export const dynamic = "force-dynamic";
type SP = {
    cat?: string;
    zona?: string;
    q?: string;
    cerrados?: string;
};
export default async function Page({ searchParams }: {
    searchParams: Promise<SP>;
}) {
    const sp = await searchParams;
    const cat = REQUEST_CATEGORIES.includes(sp.cat ?? "") ? sp.cat : undefined;
    const zone = (BARRIOS as readonly string[]).includes(sp.zona ?? "") ? sp.zona : undefined;
    const q = sp.q?.trim().slice(0, 80) || undefined;
    const closed = sp.cerrados === "1";
    const rows = await listRequests({ category: cat, zone, q, closed });
    const href = (o: Partial<Record<keyof SP, string | null>>) => {
        const cur: SP = { cat, zona: zone, q, cerrados: closed ? "1" : undefined };
        const u = new URLSearchParams();
        for (const [k, v] of Object.entries({ ...cur, ...o }))
            if (v)
                u.set(k, v);
        return `/necesito${u.toString() ? `?${u}` : ""}`;
    };
    const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] px-4 font-bold transition";
    return (<Container className="pb-8">
      <PageHeader title="Necesito" intro="Pedí un producto o un servicio y que respondan los comercios y prestadores de Sampacho. Es un pedido, no una compra: cada uno se contacta por su cuenta." actions={<LinkButton href="/necesito/nuevo"><Plus className="size-5" aria-hidden/> Pedir algo</LinkButton>}/>
      <div className="grid gap-4 py-6">
        <form action="/necesito" role="search" className="relative max-w-2xl">
          {cat && <input type="hidden" name="cat" value={cat}/>}
          {zone && <input type="hidden" name="zona" value={zone}/>}
          {closed && <input type="hidden" name="cerrados" value="1"/>}
          <label htmlFor="q" className="sr-only">Buscar pedidos</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" aria-hidden/>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar un pedido" className={cn(inputCls, "pl-12")}/>
        </form>
        <nav aria-label="Rubros" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
          <Link href={href({ cat: null })} className={cn(chip, !cat ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-monte")}>Todos</Link>
          {REQUEST_CATEGORIES.map((c) => <Link key={c} href={href({ cat: c })} className={cn(chip, cat === c ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-monte")}>{c}</Link>)}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-ink-2">Zona:</span>
          <Link href={href({ zona: null })} className={cn(chip, "min-h-10", !zone ? "border-monte bg-monte-soft text-monte" : "border-line bg-surface")}>Todas</Link>
          {BARRIOS.map((z) => <Link key={z} href={href({ zona: z })} className={cn(chip, "min-h-10", zone === z ? "border-monte bg-monte-soft text-monte" : "border-line bg-surface")}>{z}</Link>)}
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden/>
          <Link href={href({ cerrados: closed ? null : "1" })} aria-pressed={closed} className={cn(chip, "min-h-10", closed ? "border-ink bg-ink text-bg" : "border-line bg-surface")}>Ver cerrados y vencidos</Link>
        </div>
      </div>
      <div className="grid max-w-3xl gap-4" aria-live="polite">
        {rows.length === 0 ? (<EmptyState icon={HandHelping} title={closed ? "No hay pedidos cerrados" : "No hay pedidos abiertos con ese filtro"} text="Si necesitás algo, pedilo: los comercios y prestadores que siguen tu rubro se enteran." action={<LinkButton href="/necesito/nuevo">Pedir algo</LinkButton>}/>) : (rows.map((r) => {
            const days = r.days_left;
            return (<Link key={r.id} href={`/necesito/${r.id}`} data-reveal className="group grid gap-2 rounded-2xl border border-line bg-surface p-5 transition hover:border-monte">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={r.effective === "abierto" ? "ok" : r.effective === "resuelto" ? "info" : "neutral"}>{{ abierto: "Abierto", vencido: "Vencido", resuelto: "Resuelto", cancelado: "Cancelado" }[r.effective]}</Pill>
                  <span className="font-bold text-ink-2">{r.kind === "producto" ? "Busca un producto" : "Busca un servicio"} · {r.category}{r.zone ? ` · ${r.zone}` : ""}</span>
                </div>
                <h2 className="text-2xl font-bold leading-snug">{r.title}</h2>
                <p className="line-clamp-2 text-ink-2">{r.body}</p>
                <p className="flex flex-wrap items-center gap-x-4 text-sm text-ink-2">
                  <span>{r.author_name.split(" ")[0]} · {timeAgo(r.created_at)}</span>
                  <span className="font-bold text-ink">{r.responses} {r.responses === 1 ? "respuesta" : "respuestas"}</span>
                  <span>{r.effective === "abierto" ? `Vence en ${days} ${days === 1 ? "día" : "días"}` : `Cerrado el ${fmtDate(r.closed_at ?? r.expires_at)}`}</span>
                </p>
              </Link>);
        }))}
      </div>
    </Container>);
}
