import Link from "next/link";
import { List, Map as MapIcon, Plus, Search } from "lucide-react";
import { SHOP_CATEGORIES, TRADE_CATEGORIES } from "@/lib/constants";
import { listListings } from "@/lib/data";
import { cn } from "@/lib/cn";
import { inputCls } from "@/components/ui/Fields";
import { LinkButton } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader } from "@/components/ui/bits";
import { MapView, type MapMarker } from "@/components/maps/MapView";
import { ListingCard } from "./ListingCard";

export type ExplorerParams = { cat?: string; q?: string; abierto?: string; urgencias?: string; orden?: string; vista?: string };

export function Explorer({ kind, sp }: { kind: "comercio" | "oficio"; sp: ExplorerParams }) {
  const trade = kind === "oficio";
  const base = trade ? "/oficios" : "/guia";
  const cats = (trade ? TRADE_CATEGORIES : SHOP_CATEGORIES) as readonly string[];
  const cat = sp.cat && cats.includes(sp.cat) ? sp.cat : undefined;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const open = sp.abierto === "1";
  const emergency = sp.urgencias === "1";
  const sort = ["nuevos", "nombre"].includes(sp.orden ?? "") ? sp.orden : "mejores";
  const map = !trade && sp.vista === "mapa";

  const rows = listListings({ kind, category: cat, q, open: !trade && open, emergency: trade && emergency, sort });
  const markers: MapMarker[] = rows
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({ id: l.id, lat: l.lat!, lng: l.lng!, title: l.name, sub: l.category + (l.open ? " · Abierto ahora" : ""), href: `/guia/${l.id}`, color: l.open ? "#0E6B5A" : "#6B7B75" }));

  const href = (o: Partial<Record<keyof ExplorerParams, string | null>>) => {
    const cur: Record<string, string | undefined> = { cat, q, abierto: open ? "1" : undefined, urgencias: emergency ? "1" : undefined, orden: sort === "mejores" ? undefined : sort, vista: map ? "mapa" : undefined };
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...cur, ...o })) if (v) u.set(k, v);
    const s = u.toString();
    return `${base}${s ? `?${s}` : ""}`;
  };
  const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] px-4 font-bold transition";
  const on = "border-ink bg-ink text-bg";
  const off = "border-line bg-surface hover:border-monte";

  return (
    <Container className="pb-8">
      <PageHeader
        title={trade ? "Oficios" : "Guía de comercios"}
        intro={trade ? "Electricistas, gasistas, plomeros y más, con la opinión de otros vecinos." : "Los comercios de Sampacho en el mapa: dirección, teléfono, horarios y calificaciones."}
        actions={<LinkButton href={`/guia/nuevo?tipo=${kind}`}><Plus className="size-5" aria-hidden /> {trade ? "Ofrecer mi oficio" : "Sumar mi comercio"}</LinkButton>}
      />
      <div className="grid gap-4 py-6">
        <form action={base} role="search" className="relative max-w-2xl">
          {cat && <input type="hidden" name="cat" value={cat} />}
          {open && <input type="hidden" name="abierto" value="1" />}
          {emergency && <input type="hidden" name="urgencias" value="1" />}
          {map && <input type="hidden" name="vista" value="mapa" />}
          <label htmlFor="q" className="sr-only">Buscar</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" aria-hidden />
          <input id="q" name="q" defaultValue={q} placeholder={trade ? "Buscar un oficio o una persona" : "Buscar un comercio o rubro"} className={cn(inputCls, "pl-12")} />
        </form>
        <nav aria-label="Filtros" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
          <Link href={href({ cat: null })} className={cn(chip, !cat ? on : off)} aria-current={!cat ? "page" : undefined}>Todos</Link>
          {cats.map((c) => (
            <Link key={c} href={href({ cat: c })} className={cn(chip, cat === c ? on : off)} aria-current={cat === c ? "page" : undefined}>{c}</Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {trade ? (
            <Link href={href({ urgencias: emergency ? null : "1" })} aria-pressed={emergency} className={cn(chip, emergency ? "border-girasol bg-girasol text-on-girasol" : off)}>Atiende urgencias</Link>
          ) : (
            <Link href={href({ abierto: open ? null : "1" })} aria-pressed={open} className={cn(chip, open ? "border-monte bg-monte text-on-monte" : off)}>Abierto ahora</Link>
          )}
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
          {([["mejores", "Mejor calificados"], ["nuevos", "Más nuevos"], ["nombre", "A–Z"]] as const).map(([k, l]) => (
            <Link key={k} href={href({ orden: k === "mejores" ? null : k })} className={cn("min-h-11 inline-flex items-center rounded-full px-3 font-bold", sort === k ? "bg-monte-soft text-monte" : "text-ink-2 hover:text-ink")}>{l}</Link>
          ))}
          {!trade && (
            <span className="ml-auto flex gap-1 rounded-full border border-line bg-surface p-1 lg:hidden" role="group" aria-label="Vista">
              <Link href={href({ vista: null })} aria-pressed={!map} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-bold", !map ? "bg-ink text-bg" : "text-ink-2")}><List className="size-4" aria-hidden /> Lista</Link>
              <Link href={href({ vista: "mapa" })} aria-pressed={map} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-bold", map ? "bg-ink text-bg" : "text-ink-2")}><MapIcon className="size-4" aria-hidden /> Mapa</Link>
            </span>
          )}
        </div>
      </div>

      <div className={cn("grid gap-6", !trade && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]")}>
        <section aria-label="Resultados" className={cn("grid content-start gap-4", map && "hidden lg:grid")}>
          <p className="text-ink-2" aria-live="polite">{rows.length} {rows.length === 1 ? "resultado" : "resultados"}</p>
          {rows.length === 0 ? (
            <EmptyState title="No encontramos resultados" text="Probá con otra palabra o quitá algún filtro." action={<LinkButton href={base} variant="secondary">Ver todos</LinkButton>} />
          ) : (
            rows.map((l) => <ListingCard key={l.id} l={l} />)
          )}
        </section>
        {!trade && (
          <div className={cn("lg:sticky lg:top-24 lg:block lg:self-start", map ? "block" : "hidden")}>
            <MapView markers={markers} className="h-[68svh] lg:h-[calc(100svh-8rem)]" />
          </div>
        )}
      </div>
    </Container>
  );
}
