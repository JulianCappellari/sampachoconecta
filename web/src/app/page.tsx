import Link from "next/link";
import { HandHelping, Megaphone, Pill as PillIcon, Wrench } from "lucide-react";
import { getUser } from "@/lib/auth";
import { siteStats } from "@/lib/data";
import { currentZones, getHoy } from "@/lib/hoy";
import { ensureWasteReminders } from "@/lib/waste";
import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/bits";
import { HeroMotion } from "@/components/motion/HeroMotion";
import { PinnedMap } from "@/components/motion/PinnedMap";
import { CountUp } from "@/components/motion/CountUp";
import { Aurora, Magnet, ScrollWords, Spotlight } from "@/components/motion/Effects";
import { HoySection } from "@/components/hoy/HoySection";
export const dynamic = "force-dynamic";
const MARQUEE = ["Noticias", "Ventas", "Eventos", "Comercios", "Oficios", "Pedidos", "Reclamos", "Ideas vecinales", "Farmacia de turno", "Teléfonos útiles", "Agenda del pueblo"];
const QUICK = [
    { href: "/utiles", icon: PillIcon, title: "Farmacia de turno", text: "La de hoy, con teléfono" },
    { href: "/reclamos/nuevo", icon: Megaphone, title: "Hacer un reclamo", text: "Privado, con seguimiento" },
    { href: "/oficios", icon: Wrench, title: "Buscar un oficio", text: "Con opiniones de vecinos" },
    { href: "/necesito", icon: HandHelping, title: "Necesito algo", text: "Pedí y respondan los comercios" },
] as const;
export default async function Home() {
    const user = await getUser();
    await ensureWasteReminders();
    const zones = await currentZones(user);
    const hoy = await getHoy(zones);
    const stats = await siteStats();
    return (<>
      <noscript>
        <style>{`.h-line>span{transform:none!important;animation:none!important}.h-fade{opacity:1!important;transform:none!important;animation:none!important}`}</style>
      </noscript>

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden">
        <Aurora />
        <div className="h-street-wrap pointer-events-none absolute inset-0" aria-hidden>
          <svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" className="size-full text-line">
            <g stroke="currentColor" strokeWidth="10" strokeLinecap="round" fill="none" opacity=".6">
              {[90, 250, 410, 570].map((y) => (<path key={y} className="h-street" pathLength={1} strokeDasharray={1} d={`M-20 ${y}H1220`}/>))}
              {[180, 420, 660, 900, 1120].map((x) => (<path key={x} className="h-street" pathLength={1} strokeDasharray={1} d={`M${x} -20V720`}/>))}
              <path className="h-street" pathLength={1} strokeDasharray={1} d="M-20 640 1220 180" strokeWidth="5"/>
            </g>
          </svg>
          <div className="absolute inset-0 bg-gradient-to-b from-bg/20 via-bg/60 to-bg"/>
        </div>

        <Container className="relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.25fr_1fr] lg:py-28">
          <div className="grid gap-7">
            <h1 className="text-[clamp(2.6rem,7.2vw,6.4rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
              <span className="h-line block overflow-hidden pb-[0.08em]"><span>Lo que pasa</span></span>
              <span className="h-line block overflow-hidden pb-[0.08em]"><span>en Sampacho,</span></span>
              <span className="h-line block overflow-hidden pb-[0.08em]"><span>ahora.</span></span>
            </h1>
            <p className="h-fade max-w-xl text-lg text-ink-2 sm:text-xl">
              Novedades, comercios, oficios, pedidos, reclamos a la municipalidad e ideas de los vecinos. Todo en un solo lugar, desde el celular.
            </p>
            <div className="h-fade flex flex-wrap gap-3">
              <Magnet><LinkButton href="#hoy" size="lg">Ver qué pasa hoy</LinkButton></Magnet>
              <Magnet><LinkButton href="/muro" variant="secondary" size="lg">Ir al muro</LinkButton></Magnet>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2" aria-label="Accesos rápidos">
            {QUICK.map((q) => {
            const Icon = q.icon;
            return (<li key={q.href} className="h-card">
                  <Spotlight className="h-full rounded-2xl border border-line bg-surface/90 backdrop-blur transition hover:border-monte hover:shadow-[0_18px_40px_-26px_rgba(14,107,90,.7)]">
                    <Link href={q.href} className="relative grid h-full content-between gap-6 p-5">
                      <span className="grid size-11 place-items-center rounded-xl bg-monte-soft text-monte"><Icon className="size-6" aria-hidden/></span>
                      <span><span className="block font-display text-xl font-bold leading-tight">{q.title}</span><span className="block text-ink-2">{q.text}</span></span>
                    </Link>
                  </Spotlight>
                </li>);
        })}
          </ul>
        </Container>
        <HeroMotion />
      </section>

      <div id="hoy" className="scroll-mt-16"/>
      <HoySection hoy={hoy} zones={zones}/>

      {/* Cinta */}
      <div className="overflow-hidden border-b-2 border-ink bg-girasol py-3 text-on-girasol" aria-hidden>
        <div className="marquee-track flex">
          {[0, 1].map((k) => (<ul key={k} className="flex shrink-0 items-center">
              {MARQUEE.map((m) => (<li key={m} className="flex items-center font-display text-xl font-extrabold sm:text-2xl">
                  <span className="px-6">{m}</span>
                  <svg width="22" height="22" viewBox="0 0 64 64"><path d="M32 3C18.7 3 8 13.6 8 26.8 8 44.2 32 61 32 61s24-16.8 24-34.2C56 13.6 45.3 3 32 3z" fill="currentColor"/><circle cx="32" cy="27" r="9" fill="#F2B02A"/></svg>
                </li>))}
            </ul>))}
        </div>
      </div>

      <PinnedMap />

      {/* Manifiesto con texto que se enciende al hacer scroll */}
      <Container className="py-24 sm:py-36">
        <ScrollWords className="max-w-5xl font-display text-[clamp(1.9rem,5vw,3.9rem)] font-bold leading-[1.12] tracking-tight">
          Un pueblo se cuida cuando todos saben qué pasa, quién ofrece qué y qué hay que arreglar. Acá lo ponemos a la vista, y lo hacemos juntos.
        </ScrollWords>
      </Container>

      {/* Cifras en una frase */}
      <section className="border-y border-line bg-surface" aria-label="El pueblo en números">
        <Container className="py-20 sm:py-28">
          <p className="max-w-5xl font-display text-[clamp(1.9rem,5vw,3.9rem)] font-bold leading-[1.12] tracking-tight" data-reveal>
            Hoy hay <b className="text-monte"><CountUp value={stats.users}/> vecinos</b> conectados, <b className="text-monte"><CountUp value={stats.listings}/> comercios y oficios</b> en la guía,{" "}
            <b className="text-monte"><CountUp value={stats.claimsResolved}/> {stats.claimsResolved === 1 ? "reclamo resuelto" : "reclamos resueltos"}</b> y{" "}
            <b className="text-monte"><CountUp value={stats.ideas}/> ideas</b> buscando equipo.
          </p>
        </Container>
      </section>

      {/* Reclamos */}
      <Container className="py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="grid gap-5" data-reveal>
            <h2 className="text-4xl font-extrabold sm:text-5xl">¿Algo no funciona en tu cuadra?</h2>
            <p className="max-w-lg text-lg text-ink-2">
              Una luz apagada, un bache, un contenedor desbordado. Contáselo a la municipalidad desde acá. El reclamo es privado: lo ven solo vos y el municipio.
            </p>
            <Magnet className="w-fit"><LinkButton href="/reclamos/nuevo" size="lg">Hacer un reclamo</LinkButton></Magnet>
          </div>
          <ol className="grid gap-4">
            {[
            ["Contás qué pasa", "Elegís la categoría, escribís qué ocurre, sumás fotos y marcás el lugar en el mapa."],
            ["Recibís un número", "Cada reclamo tiene su número de seguimiento, por ejemplo R-2026-0142."],
            ["Ves qué sigue", "Sabés quién lo atiende, qué te respondieron y cuándo esperar la próxima novedad."],
        ].map(([t, d], i) => (<li key={t} data-reveal className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-monte font-display text-xl font-extrabold text-on-monte">{i + 1}</span>
                <div>
                  <h3 className="text-xl font-bold">{t}</h3>
                  <p className="text-ink-2">{d}</p>
                </div>
              </li>))}
          </ol>
        </div>
      </Container>

      {/* Sumarse */}
      <Container className="pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-girasol p-8 text-on-girasol sm:p-14" data-reveal>
          <svg aria-hidden className="absolute -right-10 -top-10 size-72 opacity-15" viewBox="0 0 64 64"><path d="M32 3C18.7 3 8 13.6 8 26.8 8 44.2 32 61 32 61s24-16.8 24-34.2C56 13.6 45.3 3 32 3z" fill="currentColor"/></svg>
          <div className="relative grid max-w-2xl gap-5">
            <h2 className="text-4xl font-extrabold sm:text-6xl">Sampacho se arma entre todos.</h2>
            <p className="text-lg sm:text-xl">
              {user
            ? "Contá una novedad, sumá tu comercio, pedí lo que necesitás o proponé una idea para el pueblo."
            : "Creá tu cuenta gratis en un minuto. Publicá, calificá, reclamá y sumate a las ideas de tus vecinos."}
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (<>
                  <Magnet><LinkButton href="/muro/nueva" size="lg" className="bg-ink text-bg hover:bg-ink">Publicar en el muro</LinkButton></Magnet>
                  <Magnet><LinkButton href="/necesito/nuevo" size="lg" className="border-2 border-ink bg-transparent text-ink hover:bg-ink/10">Pedir algo</LinkButton></Magnet>
                </>) : (<>
                  <Magnet><LinkButton href="/registro" size="lg" className="bg-ink text-bg hover:bg-ink">Crear mi cuenta</LinkButton></Magnet>
                  <Magnet><LinkButton href="/ingresar" size="lg" className="border-2 border-ink bg-transparent text-ink hover:bg-ink/10">Ya tengo cuenta</LinkButton></Magnet>
                </>)}
            </div>
          </div>
        </div>
      </Container>
    </>);
}
