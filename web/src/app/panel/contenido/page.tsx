import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { CONTENT_KINDS, contentList } from "@/lib/data";
import { removeContent } from "@/actions/moderacion";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { inputCls } from "@/components/ui/Fields";
import { EmptyState } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Panel · Contenido" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string; q?: string }> }) {
  const user = await requireRole(["moderador", "municipio"], "/panel/contenido");
  const sp = await searchParams;
  const tipo = CONTENT_KINDS.some((k) => k.id === sp.tipo) ? sp.tipo! : "post";
  const q = sp.q?.trim().slice(0, 60) || undefined;
  const rows = contentList(tipo, q);
  const muni = user.role === "municipio";
  const chip = "inline-flex min-h-10 items-center rounded-full border-[1.5px] px-3.5 font-bold";
  const href = (t: string) => `/panel/contenido?tipo=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return (
    <div className="grid gap-6 py-8">
      <div className="grid gap-2">
        <h1 className="text-4xl font-extrabold">Contenido</h1>
        <p className="max-w-2xl text-ink-2">Retirá lo que ensucie el sistema: spam, estafas, contenido ofensivo o repetido. Lo retirado deja de verse para los vecinos y queda registrado quién lo hizo.</p>
        <p className="flex max-w-2xl items-start gap-2 rounded-xl bg-monte-soft p-3 text-monte"><Lock className="mt-0.5 size-5 shrink-0" aria-hidden /><span><b>Los reclamos no se pueden eliminar.</b> Ni acá ni desde ningún otro lugar: son un registro entre el vecino y la municipalidad.</span></p>
      </div>
      <nav aria-label="Tipo de contenido" className="flex flex-wrap gap-2">
        {CONTENT_KINDS.map((k) => <Link key={k.id} href={href(k.id)} aria-current={tipo === k.id ? "page" : undefined} className={cn(chip, tipo === k.id ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-monte")}>{k.label}</Link>)}
      </nav>
      <form action="/panel/contenido" role="search" className="relative max-w-xl">
        <input type="hidden" name="tipo" value={tipo} />
        <label htmlFor="q" className="sr-only">Buscar</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" aria-hidden />
        <input id="q" name="q" defaultValue={q} placeholder="Buscar por texto" className={cn(inputCls, "pl-12")} />
      </form>
      {rows.length === 0 ? <EmptyState title="No hay contenido para mostrar" text="Probá con otra búsqueda o con otro tipo de contenido." /> : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={`${r.id}-${r.extra ?? ""}`} className="flex flex-wrap items-start gap-4 rounded-2xl border border-line bg-surface p-4">
              <div className="min-w-0 flex-1 grid gap-1">
                <p className="font-bold">{r.href ? <Link href={r.href} target="_blank" className="hover:underline">{r.title}</Link> : r.title}</p>
                <p className="text-ink-2">{r.preview}</p>
                <p className="text-sm text-ink-2">{r.author} · {timeAgo(r.created_at)}</p>
              </div>
              {r.protectedItem && !muni ? (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-bold text-ink-2">Solo municipio</span>
              ) : (
                <ConfirmForm action={removeContent.bind(null, tipo, r.id, r.extra ?? undefined)} message="¿Retirar este contenido? Deja de verse para los vecinos y queda registrado.">Retirar</ConfirmForm>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
