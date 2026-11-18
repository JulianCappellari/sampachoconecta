import { mapSequential } from "../../lib/async";
import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { getUser } from "@/lib/auth";
import { publicOutcomes } from "@/lib/hoy";
import { setOutcomeVisibility } from "@/actions/resultados";
import { timeAgo } from "@/lib/format";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Container, EmptyState, PageHeader } from "@/components/ui/bits";
import { Photo } from "@/components/ui/Photo";
import { Spotlight } from "@/components/motion/Effects";
import { one } from "@/lib/db";
export const metadata: Metadata = { title: "Gracias, se resolvió: lo que logramos en Sampacho", description: "Pedidos, ideas y publicaciones de Sampacho que se resolvieron gracias a la comunidad.", alternates: { canonical: "/resultados" } };
export const dynamic = "force-dynamic";
const LABEL = { pedido: "Pedido resuelto", publicacion: "Publicación cerrada", idea: "Idea realizada" } as const;
export default async function Page() {
    const user = await getUser();
    const list = await publicOutcomes(40);
    const mod = user?.role === "moderador" || user?.role === "municipio";
    return (<Container className="pb-8">
      <PageHeader title="Gracias, se resolvió" intro="Cosas que los vecinos encontraron, resolvieron o lograron. Cada resultado lo escribió quien cerró el pedido o la publicación."/>
      <div className="grid gap-5 py-8 md:grid-cols-2">
        {list.length === 0 && <div className="md:col-span-2"><EmptyState icon={HeartHandshake} title="Todavía no hay resultados" text="Cuando alguien cierre un pedido, encuentre algo o concrete una idea y quiera contarlo, aparece acá."/></div>}
        {await mapSequential(list, async (o) => {
            const mineOutcome = (await one<{
                author_id: number;
            }>("SELECT author_id FROM community_outcomes WHERE id = ?", o.id))?.author_id === user?.id;
            return (<Spotlight key={o.id} className="rounded-3xl border border-line bg-surface" color="rgba(14,107,90,.10)">
              <article data-reveal className="relative grid gap-3 p-5">
                {o.photos[0] && <div className="-mx-5 -mt-5 aspect-[16/8] overflow-hidden bg-surface-2"><Photo name={o.photos[0]} alt=""/></div>}
                <p className="text-sm font-bold text-monte">{LABEL[o.source_type as keyof typeof LABEL]}</p>
                <h2 className="text-2xl font-bold leading-snug">{o.source_title}</h2>
                <p className="text-lg">“{o.body}”</p>
                <p className="text-sm text-ink-2">Lo cuenta {o.author_name.split(" ")[0]} · {timeAgo(o.created_at)}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={o.source_href} className="font-bold text-monte hover:underline">Ver el origen</Link>
                  {(mod || mineOutcome) && <ConfirmForm action={setOutcomeVisibility.bind(null, o.id, false)} message="¿Ocultar este resultado? El origen conserva su estado real." variant="ghost">Ocultar</ConfirmForm>}
                </div>
              </article>
            </Spotlight>);
        })}
      </div>
    </Container>);
}
