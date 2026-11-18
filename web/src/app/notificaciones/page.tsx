import type { Metadata } from "next";
import Link from "next/link";
import { BellOff, CheckCheck, Siren } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listNotifications, pendingDigest } from "@/lib/data";
import { markAllRead, markRead } from "@/actions/seguir";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { btn } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader } from "@/components/ui/bits";
export const metadata: Metadata = { title: "Avisos para mí" };
export const dynamic = "force-dynamic";
const CLS: Record<string, string> = { avisos: "Aviso", novedades: "Novedad", pedidos: "Pedido", reclamo: "Mi reclamo", idea: "Idea" };
export default async function Page() {
    const user = await requireUser("/notificaciones");
    const list = await listNotifications(user.id);
    const unread = list.filter((n) => !n.read_at).length;
    const waiting = await pendingDigest(user.id);
    return (<Container narrow className="pb-8">
      <PageHeader title="Avisos para mí" intro="Lo que seguís y lo que pasa con tus reclamos, pedidos e ideas. Los avisos del teléfono se activan en “Qué sigo”. El email todavía no está disponible." actions={<>
            <Link href="/siguiendo" className={btn("secondary")}>Qué sigo</Link>
            {unread > 0 && (<form action={markAllRead}><button className={btn("primary")}><CheckCheck className="size-5" aria-hidden/> Marcar todo leído</button></form>)}
          </>}/>
      <div className="grid gap-3 py-8">
        {waiting > 0 && <p className="rounded-xl bg-surface-2 p-3 text-ink-2">{waiting} {waiting === 1 ? "aviso se entrega" : "avisos se entregan"} en tu próximo resumen, según lo que configuraste.</p>}
        {list.length === 0 ? (<EmptyState icon={BellOff} title="Todavía no tenés avisos" text="Seguí temas, zonas o comercios y las novedades van a aparecer acá. Los cambios en tus reclamos también." action={<Link href="/siguiendo" className={btn("primary")}>Elegir qué seguir</Link>}/>) : (<ul className="grid gap-3">
            {list.map((n) => (<li key={n.id} className={cn("rounded-2xl border p-4", n.read_at ? "border-line bg-surface" : "border-monte bg-monte-soft/40")}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-bold">{CLS[n.class] ?? "Aviso"}</span>
                  {n.urgent ? <span className="inline-flex items-center gap-1 font-bold text-err"><Siren className="size-4" aria-hidden/> Urgente</span> : null}
                  <span className="text-ink-2">{timeAgo(n.created_at)}</span>
                  {!n.read_at && <span className="rounded-full bg-monte px-2 py-0.5 font-bold text-on-monte">Nuevo</span>}
                </div>
                <h2 className="mt-1 text-xl font-bold">{n.href ? <Link href={n.href} className="hover:underline">{n.title}</Link> : n.title}</h2>
                {n.body && <p className="text-ink-2">{n.body}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {n.reason && <p className="text-sm text-ink-2">{n.reason}</p>}
                  {!n.read_at && <form action={markRead.bind(null, n.id)}><button className={btn("ghost", "sm")}>Marcar leído</button></form>}
                </div>
              </li>))}
          </ul>)}
      </div>
    </Container>);
}
