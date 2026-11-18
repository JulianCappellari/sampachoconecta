import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CheckCircle2, Clock, MapPin, MessageCircle, Navigation, Phone, ShieldCheck, Siren } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getListing, listRatings } from "@/lib/data";
import { hoursLabel, telLink, timeAgo, waLink } from "@/lib/format";
import { deleteListing, rateListing, replyRating, verifyListing } from "@/actions/guia";
import { Avatar, Card, Container, Pill } from "@/components/ui/bits";
import { ExtLink, LinkButton } from "@/components/ui/Button";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Form } from "@/components/ui/Form";
import { TextArea } from "@/components/ui/Fields";
import { Photo } from "@/components/ui/Photo";
import { StarInput, Stars } from "@/components/ui/Stars";
import { MapView } from "@/components/maps/MapView";
import { RatingSummary } from "@/components/guia/ListingCard";
import { ShareButton } from "@/components/ui/ShareButton";
import { btn } from "@/components/ui/Button";
import { FeaturedApply } from "@/components/guia/FeaturedApply";
type Ctx = {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<{
        nuevo?: string;
    }>;
};
export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
    const l = await getListing(Number((await params).id));
    return { title: l?.name ?? "Ficha", description: l?.description.slice(0, 150) };
}
export default async function Page({ params, searchParams }: Ctx) {
    const id = Number((await params).id);
    const { nuevo } = await searchParams;
    const user = await getUser();
    const l = Number.isInteger(id) ? await getListing(id) : undefined;
    if (!l)
        notFound();
    const ratings = await listRatings(id);
    const mine = user?.id === l.owner_id;
    const mod = user?.role === "moderador" || user?.role === "municipio";
    const myRating = ratings.find((r) => r.user_id === user?.id);
    const trade = l.kind === "oficio";
    const path = `/guia/${id}`;
    const dir = l.lat != null && l.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}` : null;
    return (<Container className="pb-8">
      <div className="pt-8 sm:pt-12" data-reveal>
        <Link href={trade ? "/oficios" : "/guia"} className="font-bold text-monte hover:underline">← {trade ? "Oficios" : "Guía de comercios"}</Link>
      </div>

      {nuevo && (<p role="status" className="mt-4 flex items-start gap-3 rounded-2xl bg-monte-soft p-4 font-bold text-monte">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden/> Tu ficha ya está publicada. Los vecinos pueden encontrarla y calificarla.
        </p>)}

      <div className="grid gap-10 py-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid content-start gap-6">
          <header className="grid gap-3" data-reveal>
            <p className="flex flex-wrap items-center gap-3 font-bold text-ink-2">
              {l.category}
              {l.verified ? <span className="inline-flex items-center gap-1 text-monte"><BadgeCheck className="size-5" aria-hidden/> Verificado por la comunidad</span> : null}
              {l.emergency ? <Pill tone="warn"><Siren className="size-4" aria-hidden/> Atiende urgencias</Pill> : null}
            </p>
            <h1 className="text-4xl font-extrabold sm:text-5xl">{l.name}</h1>
            <div className="text-lg"><RatingSummary avg={l.avg} count={l.count}/></div>
            {/* En celular, el contacto va primero; en escritorio vive en la columna lateral. */}
            <div className="flex flex-wrap gap-2 lg:hidden">
              <ExtLink href={telLink(l.phone)}><Phone className="size-5" aria-hidden/> Llamar</ExtLink>
              {l.whatsapp && <ExtLink href={waLink(l.whatsapp, `Hola, te encontré en Sampacho Conecta.`)} variant="wa"><MessageCircle className="size-5" aria-hidden/> WhatsApp</ExtLink>}
            </div>
          </header>

          {l.photos.length > 0 && (<ul className="grid gap-3 sm:grid-cols-2" data-reveal>
              {l.photos.map((n, i) => (<li key={n} className={`overflow-hidden rounded-2xl bg-surface-2 ${i === 0 && l.photos.length % 2 === 1 ? "sm:col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
                  <Photo name={n} alt={`Foto ${i + 1} de ${l.name}`} eager={i === 0}/>
                </li>))}
            </ul>)}

          <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed" data-reveal>{l.description}</p>

          <section aria-labelledby="opiniones" className="grid gap-5 pt-2">
            <h2 id="opiniones" className="text-3xl font-bold">Opiniones de vecinos</h2>
            {ratings.length === 0 && <p className="text-ink-2">Todavía nadie opinó. Podés ser el primero.</p>}
            <ul className="grid gap-4">
              {ratings.map((r) => (<li key={r.user_id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4" data-reveal>
                  <div className="flex items-center gap-3">
                    <Avatar name={r.author_name}/>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{r.author_name}</p>
                      <p className="flex items-center gap-2 text-sm text-ink-2"><Stars value={r.stars} size={16}/> {timeAgo(r.created_at)}</p>
                    </div>
                  </div>
                  {r.review && <p className="whitespace-pre-line">{r.review}</p>}
                  {r.reply && (<p className="rounded-xl bg-surface-2 p-3"><b>Respuesta de {l.name}:</b> {r.reply}</p>)}
                  {mine && !r.reply && (<details>
                      <summary className="min-h-10 cursor-pointer font-bold text-monte">Responder</summary>
                      <div className="pt-2"><Form action={replyRating.bind(null, id, r.user_id)} submit="Publicar respuesta" variant="secondary"><TextArea label="Tu respuesta" name="reply" rows={2} maxLength={400} required/></Form></div>
                    </details>)}
                </li>))}
            </ul>

            {mine ? (<p className="text-ink-2">No podés calificar tu propia ficha.</p>) : user ? (<Card className="grid gap-3">
                <h3 className="text-xl font-bold">{myRating ? "Cambiar mi calificación" : "Dejá tu opinión"}</h3>
                <Form action={rateListing.bind(null, id)} submit={myRating ? "Actualizar" : "Enviar opinión"}>
                  <StarInput defaultValue={myRating?.stars ?? 0}/>
                  <TextArea label="Contá tu experiencia" name="review" rows={3} maxLength={500} defaultValue={myRating?.review ?? ""} hint="Opcional. Sé respetuoso: tu nombre se muestra."/>
                </Form>
              </Card>) : (<p className="rounded-2xl border border-dashed border-line bg-surface p-5">
                Para opinar, <Link className={btn("primary", "sm", "mx-1")} href={`/ingresar?next=${encodeURIComponent(path)}`}>ingresá a tu cuenta</Link>
              </p>)}
          </section>
        </div>

        <aside className="grid content-start gap-5 lg:sticky lg:top-24 lg:self-start">
          <Card className="grid gap-4">
            <div className="grid gap-2">
              <ExtLink href={telLink(l.phone)} size="lg"><Phone className="size-5" aria-hidden/> Llamar · {l.phone}</ExtLink>
              {l.whatsapp && <ExtLink href={waLink(l.whatsapp, `Hola, te encontré en Sampacho Conecta.`)} variant="wa" size="lg"><MessageCircle className="size-5" aria-hidden/> Escribir por WhatsApp</ExtLink>}
              {dir && <ExtLink href={dir} variant="secondary" size="lg"><Navigation className="size-5" aria-hidden/> Cómo llegar</ExtLink>}
            </div>
            <ul className="grid gap-3 border-t border-line pt-4">
              {l.address && <li className="flex gap-3"><MapPin className="mt-1 size-5 shrink-0 text-monte" aria-hidden/> {l.address}</li>}
              {trade && l.zone && <li className="flex gap-3"><MapPin className="mt-1 size-5 shrink-0 text-monte" aria-hidden/> Trabaja en: {l.zone}</li>}
              {l.open_time && (<li className="flex gap-3"><Clock className="mt-1 size-5 shrink-0 text-monte" aria-hidden/> <span>{hoursLabel(l)} {l.open ? <Pill tone="ok" className="ml-1">Abierto ahora</Pill> : <Pill className="ml-1">Cerrado ahora</Pill>}</span></li>)}
              {l.license && <li className="flex gap-3"><ShieldCheck className="mt-1 size-5 shrink-0 text-monte" aria-hidden/> {l.license}</li>}
            </ul>
            <div className="flex flex-wrap gap-1 border-t border-line pt-3"><ShareButton path={path} title={l.name} label="Compartir ficha" className="-ml-3"/></div>
          </Card>
          {l.lat != null && l.lng != null && <MapView markers={[{ id: l.id, lat: l.lat, lng: l.lng, title: l.name, sub: l.address ?? undefined }]} className="h-64"/>}
          {mine && !trade && <FeaturedApply listing={l}/>}
          {(mine || mod) && (<Card className="flex flex-wrap items-center gap-2">
              {mod && <form action={verifyListing.bind(null, id)}><button className={btn("secondary", "sm")}>{l.verified ? "Quitar verificación" : "Verificar ficha"}</button></form>}
              <ConfirmForm action={deleteListing.bind(null, id)} message="¿Eliminar esta ficha? No se puede deshacer.">Eliminar ficha</ConfirmForm>
            </Card>)}
          {!user && <LinkButton href={`/ingresar?next=${encodeURIComponent(path)}`} variant="secondary">Ingresá para opinar</LinkButton>}
        </aside>
      </div>
    </Container>);
}
