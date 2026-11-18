import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, CheckCircle2, Flag, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getPost, listComments } from "@/lib/data";
import { postCategory } from "@/lib/constants";
import { eventParts, fmtDate, fmtTime, money, nowUtc, timeAgo, utcToLocalInput, waLink } from "@/lib/format";
import { BARRIOS } from "@/lib/constants";
import { one } from "@/lib/db";
import { isFollowing } from "@/lib/data";
import { cancelPost, updateNotice } from "@/actions/avisos";
import { closePost } from "@/actions/resultados";
import { CloseForm } from "@/components/resultados/CloseForm";
import { FollowButton } from "@/components/ui/FollowButton";
import { deletePost, markSold, renewPost, reportContent } from "@/actions/muro";
import { Avatar, Container, Pill, Tag } from "@/components/ui/bits";
import { ExtLink } from "@/components/ui/Button";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { Photo } from "@/components/ui/Photo";
import { ShareButton } from "@/components/ui/ShareButton";
import { LikeButton } from "@/components/muro/LikeButton";
import { Comments } from "@/components/muro/Comments";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Ctx = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const p = getPost(Number((await params).id));
  return { title: p?.title ?? "Publicación", description: p?.body.slice(0, 150) };
}

export default async function Page({ params }: Ctx) {
  const id = Number((await params).id);
  const user = await getUser();
  const post = Number.isInteger(id) ? getPost(id, user?.id) : undefined;
  if (!post || (post as unknown as { hidden?: number }).hidden) notFound();
  const cat = postCategory(post.category);
  const ev = post.event_at ? eventParts(post.event_at) : null;
  const mine = user?.id === post.author_id;
  const mod = user?.role === "moderador" || user?.role === "municipio";
  const sold = post.status === "sold" || post.status === "resolved";
  const isMuni = user?.role === "municipio";
  const outcome = one<{ body: string }>("SELECT body FROM community_outcomes WHERE source_type='publicacion' AND source_id = ? AND status='publicado'", id);
  const comments = listComments("post", id);
  const path = `/muro/${id}`;
  const waText = `Hola, vi tu publicación "${post.title}" en Sampacho Conecta.`;

  return (
    <Container narrow className="pb-8">
      <article className="grid gap-6 py-8 sm:py-12">
        <div className="flex flex-wrap items-center gap-3" data-reveal>
          <Avatar name={post.author_name} size={48} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 font-bold">
              {post.author_name}
              {post.author_role === "municipio" && <BadgeCheck className="size-5 text-monte" aria-label="Cuenta oficial" />}
            </p>
            <p className="text-ink-2">{timeAgo(post.created_at)}</p>
          </div>
          <Tag color={cat.color}>{cat.label}</Tag>
        </div>

        {(post.lifecycle === "cancelled" || (post.category === "aviso" && post.ends_at && post.ends_at <= nowUtc())) && (
          <p role="status" className="rounded-2xl bg-surface-2 p-4 font-bold">
            {post.lifecycle === "cancelled" ? `Este ${post.category === "aviso" ? "aviso" : "evento"} fue cancelado${post.updated_at ? ` el ${fmtDate(post.updated_at)}` : ""}.` : `Este aviso finalizó el ${fmtDate(post.ends_at!)} y queda como archivo.`}
          </p>
        )}
        {post.category === "aviso" && post.lifecycle === "active" && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2" data-reveal>
            <Pill tone={post.severity === "urgente" ? "err" : post.severity === "importante" ? "warn" : "info"}>{{ urgente: "Urgente", importante: "Importante", informativo: "Informativo" }[post.severity] ?? "Informativo"}</Pill>
            <span>Fuente: Municipalidad · actualizado {timeAgo(post.updated_at ?? post.created_at)}</span>
            {post.zone && <span>Zona: {post.zone}</span>}
            {post.ends_at && post.ends_at > nowUtc() && <span>Vigente hasta el {fmtDate(post.ends_at)} a las {fmtTime(post.ends_at)} h</span>}
          </p>
        )}
        <h1 className="text-4xl font-extrabold sm:text-5xl" data-reveal>{post.title}</h1>

        {(post.price != null || ev) && (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-2 p-4" data-reveal>
            {post.price != null && <span className={cn("font-display text-4xl font-extrabold", sold && "text-ink-2 line-through")}>{money(post.price)}</span>}
            {sold && <span className="rounded-full bg-ink px-3 py-1 font-bold text-bg">Vendido</span>}
            {post.condition && !sold && <span className="rounded-full bg-surface px-3 py-1 font-bold capitalize">{post.condition}</span>}
            {ev && (
              <div className="grid gap-1 font-bold">
                <span className="inline-flex items-center gap-2 text-lg text-[#B83C78] dark:text-[#F08BB8]">
                  <CalendarDays className="size-5" aria-hidden />
                  <span className="capitalize">{ev.long}</span>{ev.time && ` · ${ev.time} h`}
                </span>
                {post.event_place && <span className="inline-flex items-center gap-2 text-ink-2"><MapPin className="size-5" aria-hidden /> {post.event_place}</span>}
              </div>
            )}
          </div>
        )}

        <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed" data-reveal>{post.body}</p>

        {post.photos.length > 0 && (
          <ul className={cn("grid gap-3", post.photos.length > 1 && "sm:grid-cols-2")} data-reveal>
            {post.photos.map((n, i) => (
              <li key={n} className={cn("overflow-hidden rounded-2xl bg-surface-2", post.photos.length === 1 ? "aspect-[4/3]" : "aspect-square", post.photos.length === 3 && i === 0 && "sm:col-span-2 sm:aspect-[16/9]")}>
                <a href={`/api/fotos/${n}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto ${i + 1} en tamaño completo`}>
                  <Photo name={n} alt={`Foto ${i + 1} de “${post.title}”`} eager={i === 0} />
                </a>
              </li>
            ))}
          </ul>
        )}

        {post.contact_phone && !sold && (
          <ExtLink href={waLink(post.contact_phone, waText)} variant="wa" size="lg" className="w-fit">
            <MessageCircle className="size-5" aria-hidden /> Consultar por WhatsApp
          </ExtLink>
        )}

        <div className="-ml-2 flex flex-wrap items-center gap-1 border-y border-line py-2">
          <LikeButton postId={post.id} liked={!!post.liked} likes={post.likes} />
          <ShareButton path={path} title={post.title} />
          {mine && post.category === "venta" && (
            <>
              <form action={markSold.bind(null, id)}><button className="min-h-10 rounded-full px-3 font-bold text-ink-2 hover:bg-surface-2">{sold ? "Volver a publicar" : "Marcar como vendida"}</button></form>
              <form action={renewPost.bind(null, id)}><button className="min-h-10 rounded-full px-3 font-bold text-ink-2 hover:bg-surface-2">Renovar 30 días</button></form>
            </>
          )}
          {(mine || mod) && (
            <span className="ml-auto">
              <ConfirmForm action={deletePost.bind(null, id)} message="¿Eliminar esta publicación? No se puede deshacer.">Eliminar</ConfirmForm>
            </span>
          )}
        </div>

        {outcome && (
          <p className="flex items-start gap-3 rounded-2xl bg-monte-soft p-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-monte" aria-hidden /><span><b className="text-monte">Gracias, se resolvió.</b> “{outcome.body}” <Link href="/resultados" className="font-bold underline">Ver resultados</Link></span></p>
        )}

        {user && !mine && <div><FollowButton type="tema" id={post.category} following={isFollowing(user.id, "tema", post.category)} loggedIn label={`Seguir ${cat.label.toLowerCase()}`} /></div>}

        {mine && (post.category === "perdido" || post.category === "venta") && post.status === "active" && (
          <section className="rounded-2xl border-2 border-monte p-5" aria-label="Cerrar publicación">
            <CloseForm
              action={closePost.bind(null, id)}
              title={post.category === "perdido" ? "¿Ya apareció?" : "¿Ya se vendió?"}
              submit={post.category === "perdido" ? "Marcar como encontrado" : "Marcar como vendida"}
              publishLabel={post.category === "perdido" ? "Contar cómo se resolvió (agradecimiento público)" : "Publicar un agradecimiento"}
              previewTitle={post.title}
            />
          </section>
        )}

        {isMuni && post.category === "aviso" && (
          <section className="grid gap-4 rounded-2xl border-2 border-monte p-5" aria-label="Gestionar aviso">
            <h2 className="text-2xl font-bold">Gestionar aviso</h2>
            {post.lifecycle === "cancelled" ? <p className="text-ink-2">Este aviso está cancelado y queda archivado con su fecha.</p> : (
              <>
                <Form action={updateNotice.bind(null, id)} submit="Guardar corrección">
                  <input type="hidden" name="v" value={post.updated_at ?? post.created_at} />
                  <Field label="Título" name="title" defaultValue={post.title} required />
                  <TextArea label="Texto" name="body" defaultValue={post.body} rows={4} required />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Select label="Nivel" name="severity" defaultValue={post.severity} options={[{ value: "informativo", label: "Informativo" }, { value: "importante", label: "Importante" }, { value: "urgente", label: "Urgente" }]} />
                    <Select label="Zona" name="zone" defaultValue={post.zone ?? ""} placeholder="Todo el pueblo" options={BARRIOS} />
                    <Field label="Termina (extender o corregir)" name="ends_at" type="datetime-local" defaultValue={post.ends_at ? utcToLocalInput(post.ends_at) : ""} />
                  </div>
                  <p className="text-sm text-ink-2">Un cambio de nivel, fin o zona avisa a quienes siguen este tema y queda en el registro de auditoría.</p>
                </Form>
                <ConfirmForm action={cancelPost.bind(null, id)} message="¿Cancelar este aviso? Deja de figurar como vigente y se avisa a quienes lo siguen.">Cancelar aviso</ConfirmForm>
              </>
            )}
          </section>
        )}
        {(mine || isMuni) && post.category === "evento" && post.lifecycle === "active" && (
          <div><ConfirmForm action={cancelPost.bind(null, id)} message="¿Cancelar este evento? Se avisa a quienes siguen este tema.">Cancelar evento</ConfirmForm></div>
        )}

        {user && !mine && (
          <details className="group rounded-2xl border border-line bg-surface">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-bold text-ink-2 hover:text-err">
              <Flag className="size-5" aria-hidden /> Denunciar esta publicación
            </summary>
            <div className="border-t border-line p-4">
              <Form action={reportContent.bind(null, "post", id)} submit="Enviar denuncia" variant="secondary">
                <Select label="Motivo" name="reason" placeholder="Elegí un motivo" options={["Es spam o publicidad", "Contenido ofensivo", "Información falsa", "Es una estafa", "Otro motivo"]} required />
              </Form>
            </div>
          </details>
        )}
      </article>

      <Comments kind="post" targetId={id} comments={comments} user={user} path={path} />
      <div className="py-10"><LinkButton href="/muro" variant="secondary">← Volver al muro</LinkButton></div>
    </Container>
  );
}
