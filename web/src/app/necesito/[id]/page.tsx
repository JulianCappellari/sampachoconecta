import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Flag, MessageCircle, Phone } from "lucide-react";
import { getUser } from "@/lib/auth";
import { eligibleListings, getRequest, requestResponses } from "@/lib/pedidos";
import { one } from "@/lib/db";
import { fmtDate, telLink, timeAgo, waLink } from "@/lib/format";
import { closeRequest, hideRequest, renewRequest, respondRequest, withdrawResponse } from "@/actions/pedidos";
import { reportContent } from "@/actions/muro";
import { Avatar, Card, Container, Pill } from "@/components/ui/bits";
import { ExtLink, btn, LinkButton } from "@/components/ui/Button";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Form } from "@/components/ui/Form";
import { Select, TextArea } from "@/components/ui/Fields";
import { Photo } from "@/components/ui/Photo";
import { ShareButton } from "@/components/ui/ShareButton";
import { FollowButton } from "@/components/ui/FollowButton";
import { CloseForm } from "@/components/resultados/CloseForm";
import { isFollowing } from "@/lib/data";
type Ctx = {
    params: Promise<{
        id: string;
    }>;
};
export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
    const r = await getRequest(Number((await params).id));
    const hidden = (await one<{
        hidden: number;
    }>("SELECT hidden FROM community_requests WHERE id = ?", Number((await params).id)))?.hidden;
    return { title: r && !hidden ? r.title : "Pedido" };
}
export default async function Page({ params }: Ctx) {
    const id = Number((await params).id);
    const user = await getUser();
    const req = Number.isInteger(id) ? await getRequest(id) : undefined;
    const hidden = (await one<{
        hidden: number;
    }>("SELECT hidden FROM community_requests WHERE id = ?", id))?.hidden;
    if (!req || hidden)
        notFound();
    const mine = user?.id === req.author_id;
    const mod = user?.role === "moderador" || user?.role === "municipio";
    const responses = await requestResponses(id);
    const open = req.effective === "abierto";
    const listings = user ? await eligibleListings(user.id) : [];
    const myResp = new Set(responses.filter((r) => r.user_id === user?.id).map((r) => r.listing_id));
    const outcome = await one<{
        id: number;
        body: string;
    }>("SELECT id,body FROM community_outcomes WHERE source_type='pedido' AND source_id = ? AND status='publicado'", id);
    const path = `/necesito/${id}`;
    const state = { abierto: ["Abierto", "ok"], vencido: ["Vencido", "neutral"], resuelto: ["Resuelto", "info"], cancelado: ["Cancelado", "neutral"] }[req.effective] as [
        string,
        "ok" | "neutral" | "info"
    ];
    return (<Container narrow className="pb-8">
      <div className="pt-8 sm:pt-12"><Link href="/necesito" className="font-bold text-monte hover:underline">← Necesito</Link></div>
      <article className="grid gap-6 py-6">
        <div className="flex flex-wrap items-center gap-3" data-reveal>
          <Avatar name={req.author_name} size={48}/>
          <div className="flex-1"><p className="font-bold">{req.author_name}</p><p className="text-ink-2">{timeAgo(req.created_at)}</p></div>
          <Pill tone={state[1]}>{state[0]}</Pill>
        </div>
        <div className="grid gap-2" data-reveal>
          <p className="font-bold text-ink-2">{req.kind === "producto" ? "Busca un producto" : "Busca un servicio"} · {req.category}{req.zone ? ` · ${req.zone}` : ""}</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">{req.title}</h1>
        </div>
        <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed" data-reveal>{req.body}</p>
        {req.photos.length > 0 && <ul className="grid gap-3 sm:grid-cols-3">{req.photos.map((n, i) => <li key={n} className="aspect-square overflow-hidden rounded-xl bg-surface-2"><Photo name={n} alt={`Foto ${i + 1} del pedido`}/></li>)}</ul>}
        <p className="text-ink-2">{open ? `Abierto hasta el ${fmtDate(req.expires_at)}.` : req.effective === "vencido" ? `Venció el ${fmtDate(req.expires_at)} y ya no acepta respuestas.` : `Cerrado el ${fmtDate(req.closed_at ?? req.expires_at)}.`}</p>

        {outcome && (<p className="flex items-start gap-3 rounded-2xl bg-monte-soft p-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-monte" aria-hidden/><span><b className="text-monte">Gracias, se resolvió.</b> “{outcome.body}” <Link href="/resultados" className="font-bold underline">Ver todos los resultados</Link></span></p>)}

        <div className="-ml-2 flex flex-wrap items-center gap-1 border-y border-line py-2">
          <ShareButton path={path} title={req.title}/>
          {user && !mine && <FollowButton type="tema" id={`rubro:${req.category}`} following={await isFollowing(user.id, "tema", `rubro:${req.category}`)} loggedIn label={`Seguir pedidos de ${req.category}`}/>}
          {(mine || mod) && <span className="ml-auto"><ConfirmForm action={hideRequest.bind(null, id)} message="¿Eliminar este pedido? Deja de verse para todos.">Eliminar</ConfirmForm></span>}
        </div>

        <section aria-labelledby="respuestas" className="grid gap-4">
          <h2 id="respuestas" className="text-3xl font-bold">Respuestas <span className="text-ink-2">({responses.length})</span></h2>
          {responses.length === 0 && <p className="text-ink-2">Todavía no respondió nadie.</p>}
          <ul className="grid gap-4">
            {responses.map((r) => (<li key={r.id} className={`grid gap-2 rounded-2xl border p-4 ${req.chosen_response_id === r.id ? "border-monte bg-monte-soft/50" : "border-line bg-surface"}`} data-reveal>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/guia/${r.listing_id}`} className="text-xl font-bold hover:underline">{r.listing_name}</Link>
                  <span className="text-ink-2">{r.listing_category} · {timeAgo(r.created_at)}</span>
                  {req.chosen_response_id === r.id && <Pill tone="ok">Elegida por quien pidió</Pill>}
                </div>
                <p className="whitespace-pre-line">{r.body}</p>
                {r.phone ? (<div className="flex flex-wrap gap-2">
                    <ExtLink href={telLink(r.phone)} variant="secondary" size="sm"><Phone className="size-4" aria-hidden/> Llamar</ExtLink>
                    {r.whatsapp && <ExtLink href={waLink(r.whatsapp, `Hola, vi tu respuesta a mi pedido "${req.title}" en Sampacho Conecta.`)} variant="wa" size="sm"><MessageCircle className="size-4" aria-hidden/> WhatsApp</ExtLink>}
                  </div>) : <p className="text-sm text-ink-2">Esta ficha ya no está disponible, por eso se quitó su contacto.</p>}
                {r.user_id === user?.id && open && <div><ConfirmForm action={withdrawResponse.bind(null, r.id)} message="¿Retirar tu respuesta?" variant="ghost">Retirar mi respuesta</ConfirmForm></div>}
              </li>))}
          </ul>

          {open && !mine && (<Card className="grid gap-3">
              <h3 className="text-xl font-bold">Responder con mi ficha</h3>
              {!user ? (<p>Para responder, <Link className={btn("primary", "sm", "mx-1")} href={`/ingresar?next=${encodeURIComponent(path)}`}>ingresá a tu cuenta</Link> y tené una ficha de comercio u oficio.</p>) : listings.length === 0 ? (<p>Para responder necesitás una ficha en la guía. <Link href="/guia/nuevo" className="font-bold text-monte underline">Sumá tu comercio</Link> o <Link href="/guia/nuevo?tipo=oficio" className="font-bold text-monte underline">tu oficio</Link>.</p>) : (<Form action={respondRequest.bind(null, id)} submit="Enviar respuesta">
                  <Select label="Tu ficha" name="listing_id" options={listings.map((l) => ({ value: String(l.id), label: `${l.name}${myResp.has(l.id) ? " (ya respondiste; se edita)" : ""}` }))}/>
                  <TextArea label="Tu propuesta o disponibilidad" name="body" rows={3} required minLength={5} maxLength={500} hint="Se muestra con el contacto público de tu ficha. Elegir una respuesta no es un contrato."/>
                </Form>)}
            </Card>)}
        </section>

        {mine && (open || req.effective === "vencido") && (<section className="grid gap-5 rounded-2xl border-2 border-monte p-5" aria-labelledby="cerrar">
            <h2 id="cerrar" className="text-2xl font-bold">Tu pedido</h2>
            {req.effective === "vencido" && <form action={renewRequest.bind(null, id)}><button className={btn("secondary")}>Renovar 7 días</button></form>}
            {open && (<>
                <CloseForm action={closeRequest.bind(null, id)} title="Encontré una solución" submit="Marcar como resuelto" previewTitle={req.title}>
                  <input type="hidden" name="action" value="resolver"/>
                  <input type="hidden" name="version" value={req.version}/>
                  {responses.length > 0 && <Select label="¿Qué respuesta te sirvió? (opcional)" name="chosen" placeholder="Ninguna en particular" options={responses.map((r) => ({ value: String(r.id), label: r.listing_name }))}/>}
                </CloseForm>
                <details>
                  <summary className="min-h-11 cursor-pointer font-bold text-ink-2 hover:text-err">Cancelar el pedido</summary>
                  <div className="pt-3"><Form action={closeRequest.bind(null, id)} submit="Cancelar pedido" variant="secondary"><input type="hidden" name="action" value="cancelar"/><input type="hidden" name="version" value={req.version}/><p className="text-ink-2">El pedido se cierra y deja de recibir respuestas.</p></Form></div>
                </details>
              </>)}
          </section>)}

        {user && !mine && (<details className="rounded-2xl border border-line bg-surface">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-bold text-ink-2 hover:text-err"><Flag className="size-5" aria-hidden/> Denunciar este pedido</summary>
            <div className="border-t border-line p-4"><Form action={reportContent.bind(null, "request", id)} submit="Enviar denuncia" variant="secondary"><Select label="Motivo" name="reason" placeholder="Elegí un motivo" options={["Es spam o publicidad", "Contenido ofensivo", "Información falsa", "Es una estafa", "Otro motivo"]} required/></Form></div>
          </details>)}
      </article>
      <div className="pb-10"><LinkButton href="/necesito" variant="secondary">← Volver a Necesito</LinkButton></div>
    </Container>);
}
