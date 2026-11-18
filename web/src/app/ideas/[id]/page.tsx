import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Landmark, Lock, Users } from "lucide-react";
import { getUser } from "@/lib/auth";
import { IDEA_STATUS, ideaStatus } from "@/lib/constants";
import { getIdea, listComments } from "@/lib/data";
import { clamp, timeAgo } from "@/lib/format";
import { setGroupLink, setIdeaStatus, toggleMunicipal } from "@/actions/ideas";
import { Card, Container, PageHeader, Pill } from "@/components/ui/bits";
import { ExtLink, btn } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { Field, Select } from "@/components/ui/Fields";
import { Photo } from "@/components/ui/Photo";
import { ShareButton } from "@/components/ui/ShareButton";
import { SupportButton } from "@/components/ideas/SupportButton";
import { Comments } from "@/components/muro/Comments";
import { Recursos } from "@/components/ideas/Recursos";
import { ideaClosing } from "@/lib/ideas";
type Ctx = {
    params: Promise<{
        id: string;
    }>;
};
export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
    const id = Number((await params).id);
    const i = Number.isInteger(id) ? await getIdea(id) : undefined;
    if (!i)
        return { title: "Idea", robots: { index: false } };
    const description = clamp(i.body.replace(/\s+/g, " "), 155);
    return {
        title: `${i.title} · idea vecinal`, description,
        alternates: { canonical: `/ideas/${id}` },
        openGraph: { type: "article", title: i.title, description, url: `/ideas/${id}` },
    };
}
export default async function Page({ params }: Ctx) {
    const id = Number((await params).id);
    const user = await getUser();
    const idea = Number.isInteger(id) ? await getIdea(id, user?.id) : undefined;
    if (!idea)
        notFound();
    const mine = user?.id === idea.author_id;
    const staff = user?.role === "municipio";
    const canSeeGroup = !!idea.group_link && (!!idea.joined || mine || staff || user?.role === "moderador");
    const comments = await listComments("idea", id);
    const path = `/ideas/${id}`;
    return (<Container className="pb-8">
      <PageHeader title={idea.title} back={{ href: "/ideas", label: "Ideas vecinales" }} intro={<span className="flex flex-wrap items-center gap-2">
          <Pill tone={idea.status === "realizada" ? "ok" : idea.status === "en_marcha" ? "info" : "neutral"}>{ideaStatus(idea.status).label}</Pill>
          {idea.municipal ? <Pill tone="warn"><Landmark className="size-4" aria-hidden/> En estudio municipal</Pill> : null}
          <span>{idea.category} · propuesta por <b className="text-ink">{idea.author_name}</b> · {timeAgo(idea.created_at)}</span>
        </span>}/>

      <div className="grid gap-10 py-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-8">
          {idea.photo && <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-surface-2"><Photo name={idea.photo} alt={`Foto de la idea “${idea.title}”`} eager/></div>}
          <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed">{idea.body}</p>
          <Recursos ideaId={id} status={idea.status} ownerId={idea.author_id} closingNote={(await ideaClosing(id))?.closing_note ?? null} user={user}/>
          <Comments kind="idea" targetId={id} comments={comments} user={user} path={path}/>
        </div>

        <aside className="order-first grid content-start gap-5 lg:sticky lg:top-24 lg:order-none lg:self-start">
          <Card className="grid gap-4">
            <p className="flex items-center gap-2 text-lg"><Users className="size-6 text-monte" aria-hidden/> <b className="font-display text-3xl">{idea.supports}</b> {idea.supports === 1 ? "vecino se sumó" : "vecinos se sumaron"}</p>
            <div className="flex flex-wrap items-center gap-2">
              <SupportButton ideaId={id} joined={!!idea.joined} supports={idea.supports} size="lg"/>
              <ShareButton path={path} title={idea.title}/>
            </div>
            {canSeeGroup ? (<ExtLink href={idea.group_link!} variant="wa" size="lg"><Users className="size-5" aria-hidden/> Unirme al grupo de WhatsApp</ExtLink>) : idea.group_link ? (<p className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-ink-2"><Lock className="mt-0.5 size-5 shrink-0" aria-hidden/> Esta idea tiene grupo de WhatsApp. Tocá “Me sumo” y se te habilita el botón para entrar.</p>) : (<p className="text-ink-2">Todavía no hay grupo de WhatsApp. {mine ? "Cuando haya vecinos, creá uno y pegá el enlace acá abajo." : "Cuando quien propuso la idea lo cree, aparece acá."}</p>)}
          </Card>

          {mine && (<Card className="grid gap-4">
              <h2 className="text-xl font-bold">Administrar mi idea</h2>
              <Form action={setGroupLink.bind(null, id)} submit="Guardar enlace" variant="secondary">
                <Field label="Enlace del grupo de WhatsApp" name="group_link" defaultValue={idea.group_link ?? ""} placeholder="https://chat.whatsapp.com/…" hint="Solo lo ven los vecinos que se sumaron."/>
                <details className="rounded-xl bg-surface-2 p-3 text-sm">
                  <summary className="cursor-pointer font-bold">¿Cómo creo el grupo?</summary>
                  <ol className="mt-2 grid list-decimal gap-1 pl-5">
                    <li>En WhatsApp tocá “Nuevo grupo” y creá el grupo con el nombre de tu idea.</li>
                    <li>Entrá a la info del grupo y tocá “Invitar por enlace”.</li>
                    <li>Copiá el enlace y pegalo acá.</li>
                  </ol>
                </details>
              </Form>
              {idea.status !== "realizada" && idea.status !== "cancelada" && <Form action={setIdeaStatus.bind(null, id)} submit="Cambiar estado" variant="secondary">
                <Select label="Estado de la idea" name="status" defaultValue={idea.status} options={IDEA_STATUS.filter((s) => s.id === "propuesta" || s.id === "en_marcha").map((s) => ({ value: s.id, label: s.label }))}/>
              </Form>}
            </Card>)}
          {staff && (<form action={toggleMunicipal.bind(null, id)}>
              <button className={btn("secondary", "md", "w-full")}><Landmark className="size-5" aria-hidden/> {idea.municipal ? "Quitar “En estudio municipal”" : "Marcar “En estudio municipal”"}</button>
            </form>)}
          {!user && <Link href={`/ingresar?next=${encodeURIComponent(path)}`} className={btn("secondary")}>Ingresá para sumarte</Link>}
        </aside>
      </div>
    </Container>);
}
