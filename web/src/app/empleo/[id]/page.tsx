import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getJob } from "@/lib/jobs";
import { fmtDate, telLink, timeAgo, waLink } from "@/lib/format";
import { hideJob, renewJob, toggleJobFilled } from "@/actions/empleo";
import { Avatar, Container, Pill } from "@/components/ui/bits";
import { btn, ExtLink } from "@/components/ui/Button";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { ShareButton } from "@/components/ui/ShareButton";
type Ctx = {
    params: Promise<{
        id: string;
    }>;
};
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
    return { title: (await getJob(Number((await params).id)))?.title ?? "Aviso" };
}
export default async function Page({ params }: Ctx) {
    const id = Number((await params).id);
    const user = await getUser();
    const j = Number.isInteger(id) ? await getJob(id) : undefined;
    if (!j)
        notFound();
    const mine = user?.id === j.author_id;
    const mod = user?.role === "moderador" || user?.role === "municipio";
    const open = j.effective === "abierta";
    return (<Container narrow className="pb-8">
      <div className="pt-8 sm:pt-12"><Link href={`/empleo?tipo=${j.kind}`} className="font-bold text-monte hover:underline">← Bolsa de trabajo</Link></div>
      <article className="grid gap-6 py-6">
        <div className="flex flex-wrap items-center gap-3" data-reveal>
          <Avatar name={j.author_name} size={48}/>
          <div className="flex-1"><p className="font-bold">{j.author_name}</p><p className="text-ink-2">{timeAgo(j.created_at)}</p></div>
          <Pill tone={open ? "ok" : "neutral"}>{{ abierta: "Abierto", cubierta: "Cubierto", vencida: "Vencido" }[j.effective]}</Pill>
        </div>
        <div className="grid gap-2" data-reveal>
          <p className="font-bold text-ink-2">{j.kind === "oferta" ? "Ofrecen trabajo" : "Buscan trabajo"} · {j.category}{j.zone ? ` · ${j.zone}` : ""}</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">{j.title}</h1>
        </div>
        <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed">{j.body}</p>
        <p className="text-ink-2">{open ? `Visible hasta el ${fmtDate(j.expires_at)}.` : j.effective === "vencida" ? `Venció el ${fmtDate(j.expires_at)}.` : "El autor lo marcó como cubierto."}</p>
        {open && (<div className="flex flex-wrap gap-2">
            <ExtLink href={waLink(j.contact_phone, `Hola, vi tu aviso "${j.title}" en Sampacho Conecta.`)} variant="wa" size="lg"><MessageCircle className="size-5" aria-hidden/> Escribir por WhatsApp</ExtLink>
            <ExtLink href={telLink(j.contact_phone)} variant="secondary" size="lg"><Phone className="size-5" aria-hidden/> Llamar</ExtLink>
          </div>)}
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">Sampacho Conecta no intermedia ni verifica las ofertas. Antes de dar datos personales o dinero, conocé a la persona y desconfiá de lo que parezca demasiado bueno.</p>
        <div className="-ml-2 flex flex-wrap items-center gap-1 border-y border-line py-2">
          <ShareButton path={`/empleo/${id}`} title={j.title}/>
          {mine && (<>
              <form action={toggleJobFilled.bind(null, id)}><button className="min-h-10 rounded-full px-3 font-bold text-ink-2 hover:bg-surface-2">{j.status === "abierta" ? "Marcar como cubierto" : "Volver a abrir"}</button></form>
              {j.effective === "vencida" && <form action={renewJob.bind(null, id)}><button className={btn("secondary", "sm")}>Renovar 30 días</button></form>}
            </>)}
          {(mine || mod) && <span className="ml-auto"><ConfirmForm action={hideJob.bind(null, id)} message="¿Eliminar este aviso?">Eliminar</ConfirmForm></span>}
        </div>
      </article>
    </Container>);
}
