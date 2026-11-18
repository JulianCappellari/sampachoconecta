import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Lock, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { claimsByUser } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { Container, EmptyState, PageHeader, StatusPill } from "@/components/ui/bits";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Mis reclamos" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser("/reclamos");
  if (user.role === "municipio") redirect("/panel/reclamos");
  const claims = claimsByUser(user.id);
  return (
    <Container className="pb-8">
      <PageHeader
        title="Mis reclamos"
        intro={<span className="inline-flex items-start gap-2"><Lock className="mt-1 size-5 shrink-0" aria-hidden /> Tus reclamos son privados: solo los ven vos y la municipalidad.</span>}
        actions={<LinkButton href="/reclamos/nuevo"><Plus className="size-5" aria-hidden /> Nuevo reclamo</LinkButton>}
      />
      <div className="grid max-w-3xl gap-4 py-8">
        {claims.length === 0 ? (
          <EmptyState
            title="Todavía no hiciste ningún reclamo"
            text="Si ves una luz apagada, un bache o un contenedor desbordado, contáselo a la municipalidad. Te damos un número para seguirlo."
            action={<LinkButton href="/reclamos/nuevo">Hacer mi primer reclamo</LinkButton>}
          />
        ) : (
          claims.map((c) => (
            <Link key={c.id} href={`/reclamos/${c.id}`} data-reveal className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-monte">
              <div className="min-w-0 flex-1 grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={c.status} />
                  <span className="font-mono text-sm text-ink-2">{c.number}</span>
                </div>
                <h2 className="text-xl font-bold">{c.category}</h2>
                <p className="truncate text-ink-2">{c.description}</p>
                <p className="text-sm text-ink-2">Presentado {timeAgo(c.created_at)}{c.address ? ` · ${c.address}` : ""}</p>
              </div>
              <ChevronRight className="size-6 shrink-0 text-ink-2 transition group-hover:translate-x-1 group-hover:text-monte" aria-hidden />
            </Link>
          ))
        )}
      </div>
    </Container>
  );
}
