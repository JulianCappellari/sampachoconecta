import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getUser } from "@/lib/auth";
import { POST_CATEGORIES } from "@/lib/constants";
import { listPosts } from "@/lib/data";
import { cn } from "@/lib/cn";
import { inputCls } from "@/components/ui/Fields";
import { btn, LinkButton } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader } from "@/components/ui/bits";
import { PostCard } from "@/components/muro/PostCard";
export const metadata: Metadata = { title: "Muro de novedades de Sampacho", description: "Noticias, eventos, ventas, avisos oficiales, perdidos y encontrados y ofertas de empleo de Sampacho, publicados por los vecinos y la municipalidad.", alternates: { canonical: "/muro" } };
export const dynamic = "force-dynamic";
const PER = 10;
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        cat?: string;
        q?: string;
        p?: string;
    }>;
}) {
    const sp = await searchParams;
    const user = await getUser();
    const cat = POST_CATEGORIES.some((c) => c.id === sp.cat) ? sp.cat : undefined;
    const q = sp.q?.trim().slice(0, 80) || undefined;
    const page = Math.max(1, Math.min(20, Number(sp.p) || 1));
    const rows = await listPosts({ category: cat, q, viewerId: user?.id, limit: PER * page + 1 });
    const hasMore = rows.length > PER * page;
    const posts = rows.slice(0, PER * page);
    const href = (o: {
        cat?: string;
        p?: number;
    }) => {
        const u = new URLSearchParams();
        const c = "cat" in o ? o.cat : cat;
        if (c)
            u.set("cat", c);
        if (q)
            u.set("q", q);
        if (o.p && o.p > 1)
            u.set("p", String(o.p));
        const s = u.toString();
        return `/muro${s ? `?${s}` : ""}`;
    };
    const chip = "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] px-4 font-bold transition";
    return (<Container className="pb-8">
      <PageHeader title="Muro" intro="Noticias, ventas, eventos y avisos de los vecinos de Sampacho." actions={<LinkButton href="/muro/nueva"><Plus className="size-5" aria-hidden/> Publicar</LinkButton>}/>
      <div className="grid gap-6 py-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <aside className="grid content-start gap-4 lg:sticky lg:top-24 lg:self-start">
          <form action="/muro" role="search" className="relative">
            {cat && <input type="hidden" name="cat" value={cat}/>}
            <label htmlFor="q" className="sr-only">Buscar en el muro</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" aria-hidden/>
            <input id="q" name="q" defaultValue={q} placeholder="Buscar en el muro" className={cn(inputCls, "pl-12")}/>
          </form>
          <nav aria-label="Categorías" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            <Link href={href({ cat: undefined })} aria-current={!cat ? "page" : undefined} className={cn(chip, !cat ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-monte", "lg:justify-start")}>
              Todo
            </Link>
            {POST_CATEGORIES.map((c) => (<Link key={c.id} href={href({ cat: c.id })} aria-current={cat === c.id ? "page" : undefined} className={cn(chip, cat === c.id ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-monte", "lg:justify-start")}>
                <span aria-hidden className="size-3 rounded-full" style={{ background: c.color }}/>
                {c.label}
              </Link>))}
          </nav>
        </aside>

        <section aria-label="Publicaciones" className="grid max-w-3xl content-start gap-5">
          {posts.length === 0 ? (<EmptyState title={q || cat ? "No encontramos publicaciones con ese filtro" : "Todavía no hay publicaciones"} text={q || cat ? "Probá con otra palabra o mirá todas las categorías." : "Sé el primero en contar algo del pueblo."} action={<LinkButton href="/muro/nueva">Publicar algo</LinkButton>}/>) : (posts.map((p) => <PostCard key={p.id} post={p}/>))}
          {hasMore && (<Link href={href({ p: page + 1 })} scroll={false} className={btn("secondary", "md", "w-fit justify-self-center")}>
              Ver más publicaciones
            </Link>)}
        </section>
      </div>
    </Container>);
}
