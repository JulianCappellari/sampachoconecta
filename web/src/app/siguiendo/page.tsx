import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BARRIOS, POST_CATEGORIES, REQUEST_CATEGORIES } from "@/lib/constants";
import { all, one } from "@/lib/db";
import { followedPosts, followedTargets } from "@/lib/data";
import { savePrefs } from "@/actions/seguir";
import { Form } from "@/components/ui/Form";
import { Check, Field, Select } from "@/components/ui/Fields";
import { FollowButton } from "@/components/ui/FollowButton";
import { PostCard } from "@/components/muro/PostCard";
import { Card, Container, PageHeader } from "@/components/ui/bits";
import { PushToggle } from "@/components/site/PushToggle";
import { vapidPublicKey } from "@/lib/push";
export const metadata: Metadata = { title: "Qué sigo" };
export const dynamic = "force-dynamic";
const FREQ = [
    { value: "inmediata", label: "Enseguida" },
    { value: "diaria", label: "Resumen diario (8:00)" },
    { value: "semanal", label: "Resumen semanal (lunes 8:00)" },
    { value: "desactivada", label: "No avisarme" },
];
export default async function Page() {
    const user = await requireUser("/siguiendo");
    const f = await followedTargets(user.id);
    const prefs = new Map((await all<{
        class: string;
        frequency: string;
    }>("SELECT class,frequency FROM notification_prefs WHERE user_id = ?", user.id)).map((r) => [r.class, r.frequency]));
    const st = await one<{
        quiet_start: string;
        quiet_end: string;
        urgent_override: number;
    }>("SELECT quiet_start,quiet_end,urgent_override FROM user_settings WHERE user_id = ?", user.id);
    const fichas = await all<{
        id: number;
        name: string;
        category: string;
    }>("SELECT l.id,l.name,l.category FROM follows f JOIN listings l ON CAST(l.id AS TEXT) = f.target_id WHERE f.user_id = ? AND f.target_type='ficha' AND l.deleted = 0", user.id);
    const feed = await followedPosts(user.id, 6);
    const h = "text-2xl font-bold";
    return (<Container className="pb-8">
      <PageHeader title="Qué sigo" intro="Elegí qué información te importa. Seguir no avisa a nadie ni indica dónde vivís: solo ordena lo que ves y lo que te avisamos." actions={<Link href="/notificaciones" className="font-bold text-monte hover:underline">Ver mis avisos</Link>}/>
      <div className="grid gap-10 py-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid content-start gap-10">
          <section aria-labelledby="temas" className="grid gap-3">
            <h2 id="temas" className={h}>Temas</h2>
            <div className="flex flex-wrap gap-2">
              {POST_CATEGORIES.map((c) => <FollowButton key={c.id} type="tema" id={c.id} following={f.tema.has(c.id)} loggedIn label={c.label}/>)}
              <FollowButton type="tema" id="pedidos" following={f.tema.has("pedidos")} loggedIn label="Pedidos (Necesito)"/>
              <FollowButton type="tema" id="residuos" following={f.tema.has("residuos")} loggedIn label="Recolección de residuos"/>
              <FollowButton type="tema" id="trabajo" following={f.tema.has("trabajo")} loggedIn label="Bolsa de trabajo"/>
              <FollowButton type="tema" id="encuestas" following={f.tema.has("encuestas")} loggedIn label="Encuestas vecinales"/>
            </div>
          </section>
          <section aria-labelledby="zonas" className="grid gap-3">
            <h2 id="zonas" className={h}>Zonas</h2>
            <div className="flex flex-wrap gap-2">{BARRIOS.map((z) => <FollowButton key={z} type="zona" id={z} following={f.zona.has(z)} loggedIn label={z}/>)}</div>
          </section>
          <section aria-labelledby="rubros" className="grid gap-3">
            <h2 id="rubros" className={h}>Pedidos por rubro</h2>
            <p className="text-ink-2">Si ofrecés un servicio o vendés productos, seguí tu rubro para enterarte cuando alguien lo necesita.</p>
            <div className="flex flex-wrap gap-2">{REQUEST_CATEGORIES.map((c) => <FollowButton key={c} type="tema" id={`rubro:${c}`} following={f.tema.has(`rubro:${c}`)} loggedIn label={c}/>)}</div>
          </section>
          <section aria-labelledby="fichas" className="grid gap-3">
            <h2 id="fichas" className={h}>Comercios y oficios que seguís</h2>
            {fichas.length === 0 ? <p className="text-ink-2">Todavía no seguís ninguno. Tocá “Seguir” en la ficha de un comercio.</p> : (<ul className="flex flex-wrap gap-2">{fichas.map((l) => <li key={l.id} className="flex items-center gap-2"><Link href={`/guia/${l.id}`} className="font-bold hover:underline">{l.name}</Link><FollowButton type="ficha" id={String(l.id)} following loggedIn/></li>)}</ul>)}
          </section>
        </div>

        <div className="grid content-start gap-8">
          <PushToggle publicKey={vapidPublicKey()}/>
          <Card className="grid gap-4">
            <h2 className={h}>Cómo recibir los avisos</h2>
            <Form action={savePrefs} submit="Guardar preferencias">
              {(["avisos", "novedades", "pedidos"] as const).map((c) => (<Select key={c} label={{ avisos: "Avisos oficiales", novedades: "Novedades de lo que sigo", pedidos: "Pedidos y respuestas" }[c]} name={`freq_${c}`} options={FREQ} defaultValue={prefs.get(c) ?? "inmediata"}/>))}
              <fieldset className="grid gap-3 rounded-xl border border-line p-4">
                <legend className="px-1 font-bold">Horario de descanso</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Desde" name="quiet_start" type="time" defaultValue={st?.quiet_start ?? "22:00"}/>
                  <Field label="Hasta" name="quiet_end" type="time" defaultValue={st?.quiet_end ?? "08:00"}/>
                </div>
                <Check name="urgent_override" defaultChecked={!!st?.urgent_override}>Que los avisos urgentes me lleguen igual</Check>
                <p className="text-sm text-ink-2">El descanso se aplica a los avisos del teléfono: los que lleguen de noche esperan a la mañana. La bandeja interna siempre la podés revisar. El email todavía no está disponible.</p>
              </fieldset>
            </Form>
          </Card>
        </div>
      </div>

      <section aria-labelledby="feed" className="grid gap-4 border-t-2 border-ink py-8">
        <h2 id="feed" className="text-3xl font-bold">Lo último de lo que seguís</h2>
        {feed.length === 0 ? <p className="text-ink-2">Cuando sigas temas, zonas o comercios, las novedades aparecen acá.</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{feed.map((p) => <PostCard key={p.id} post={p}/>)}</div>}
      </section>
    </Container>);
}
