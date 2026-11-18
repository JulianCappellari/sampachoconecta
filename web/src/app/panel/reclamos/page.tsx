import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { CLAIM_CATEGORIES, CLAIM_STATUS } from "@/lib/constants";
import { staffClaims } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { StatusPill } from "@/components/ui/bits";
import { inputCls } from "@/components/ui/Fields";
import { MapView } from "@/components/maps/MapView";
export const metadata: Metadata = { title: "Panel · Reclamos" };
export const dynamic = "force-dynamic";
const COLOR: Record<string, string> = { recibido: "#6B7B75", en_revision: "#2D69C4", en_proceso: "#C48A00", resuelto: "#1E8A4C", rechazado: "#C2362C" };
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        estado?: string;
        cat?: string;
        q?: string;
    }>;
}) {
    await requireRole(["municipio"], "/panel/reclamos");
    const sp = await searchParams;
    const estado = CLAIM_STATUS.some((s) => s.id === sp.estado) ? sp.estado : undefined;
    const cat = (CLAIM_CATEGORIES as readonly string[]).includes(sp.cat ?? "") ? sp.cat : undefined;
    const q = sp.q?.trim().slice(0, 60) || undefined;
    const claims = await staffClaims({ status: estado, category: cat, q });
    const markers = claims.filter((c) => c.lat != null && c.lng != null).map((c) => ({ id: c.id, lat: c.lat!, lng: c.lng!, title: `${c.number} · ${c.category}`, sub: c.address ?? undefined, href: `/reclamos/${c.id}`, color: COLOR[c.status] }));
    const href = (o: {
        estado?: string | null;
        cat?: string | null;
    }) => {
        const u = new URLSearchParams();
        const e = "estado" in o ? o.estado : estado;
        const c = "cat" in o ? o.cat : cat;
        if (e)
            u.set("estado", e);
        if (c)
            u.set("cat", c);
        if (q)
            u.set("q", q);
        return `/panel/reclamos${u.toString() ? `?${u}` : ""}`;
    };
    const chip = "inline-flex min-h-10 shrink-0 items-center rounded-full border-[1.5px] px-3.5 font-bold";
    return (<div className="grid gap-6 py-8">
      <h1 className="text-4xl font-extrabold">Bandeja de reclamos</h1>
      <div className="grid gap-3">
        <form action="/panel/reclamos" role="search" className="relative max-w-xl">
          {estado && <input type="hidden" name="estado" value={estado}/>}
          {cat && <input type="hidden" name="cat" value={cat}/>}
          <label htmlFor="q" className="sr-only">Buscar reclamo</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" aria-hidden/>
          <input id="q" name="q" defaultValue={q} placeholder="Número, dirección o texto" className={cn(inputCls, "pl-12")}/>
        </form>
        <nav aria-label="Estados" className="flex flex-wrap gap-2">
          <Link href={href({ estado: null })} className={cn(chip, !estado ? "border-ink bg-ink text-bg" : "border-line bg-surface")}>Todos</Link>
          {CLAIM_STATUS.map((s) => <Link key={s.id} href={href({ estado: s.id })} className={cn(chip, estado === s.id ? "border-ink bg-ink text-bg" : "border-line bg-surface")}>{s.label}</Link>)}
        </nav>
        <nav aria-label="Categorías" className="flex flex-wrap gap-2">
          <Link href={href({ cat: null })} className={cn(chip, !cat ? "border-monte bg-monte-soft text-monte" : "border-line bg-surface")}>Todas las categorías</Link>
          {CLAIM_CATEGORIES.map((c) => <Link key={c} href={href({ cat: c })} className={cn(chip, cat === c ? "border-monte bg-monte-soft text-monte" : "border-line bg-surface")}>{c}</Link>)}
        </nav>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="grid content-start gap-3">
          <p className="text-ink-2" aria-live="polite">{claims.length} {claims.length === 1 ? "reclamo" : "reclamos"}. Los más antiguos sin resolver van primero.</p>
          {claims.map((c) => (<Link key={c.id} href={`/reclamos/${c.id}`} className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-monte">
              <div className="grid min-w-0 flex-1 gap-1">
                <div className="flex flex-wrap items-center gap-2"><StatusPill status={c.status}/><span className="font-mono text-sm text-ink-2">{c.number}</span><span className="text-sm text-ink-2">{timeAgo(c.created_at)}</span></div>
                <p className="text-lg font-bold">{c.category} <span className="font-normal text-ink-2">· {c.author_name}{c.author_barrio ? `, ${c.author_barrio}` : ""}</span></p>
                <p className="truncate text-ink-2">{c.description}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-ink-2 group-hover:text-monte" aria-hidden/>
            </Link>))}
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <MapView markers={markers} className="h-96 xl:h-[70svh]"/>
          <p className="mt-2 text-sm text-ink-2">Pines por estado: gris recibido, azul en revisión, ámbar en proceso, verde resuelto, rojo rechazado.</p>
        </div>
      </div>
    </div>);
}
