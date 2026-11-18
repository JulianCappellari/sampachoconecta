import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, HeartHandshake, MapPin, Megaphone, Newspaper, Phone, Pill as PillIcon, Recycle, Siren, Star, TriangleAlert, Vote } from "lucide-react";
import type { Hoy } from "@/lib/hoy";
import { BARRIOS } from "@/lib/constants";
import { clamp, eventParts, fmtDate, fmtTime, telLink, timeAgo, todayLabel } from "@/lib/format";
import { setZone } from "@/actions/avisos";
import { ExtLink } from "@/components/ui/Button";
import { Pill } from "@/components/ui/bits";
import { Spotlight } from "@/components/motion/Effects";
import { cn } from "@/lib/cn";
import { kindLabel } from "@/lib/waste-labels";
import { WeatherWidget } from "@/components/weather/WeatherWidget";

const SEV = { urgente: "err", importante: "warn", informativo: "info" } as const;
const SEV_LABEL = { urgente: "Urgente", importante: "Importante", informativo: "Informativo" } as const;

function Block({ title, icon: Icon, href, children, className, dark }: { title: string; icon: React.ComponentType<{ className?: string }>; href?: string; children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <Spotlight className={cn("rounded-3xl p-5 sm:p-6", dark ? "bg-[#0B4F43] text-white" : "border border-line bg-surface", className)} color={dark ? "rgba(242,176,42,.22)" : "rgba(14,107,90,.10)"}>
      <div className="relative grid content-start gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold">
            <Icon className={cn("size-5", dark ? "text-[#F2B02A]" : "text-monte")} /> {title}
          </h3>
          {href && (
            <Link href={href} className={cn("inline-flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap font-bold hover:underline", dark ? "text-[#F2B02A]" : "text-monte")}>
              Ver todos <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        {children}
      </div>
    </Spotlight>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="rounded-xl bg-surface-2 px-4 py-3 text-ink-2">{children}</p>;

export function HoySection({ hoy, zones }: { hoy: Hoy; zones: string[] }) {
  const dateLabel = todayLabel();
  return (
    <section aria-labelledby="hoy-title" className="relative border-y border-line bg-bg">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-8 grid gap-4 lg:relative lg:z-20" data-reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-bold text-ink-2">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
              <h2 id="hoy-title" className="text-4xl font-extrabold sm:text-6xl">Hoy en Sampacho</h2>
            </div>
            <WeatherWidget />
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Elegir zona">
            <span className="mr-1 font-bold text-ink-2">Zona:</span>
            {["", ...BARRIOS].map((z) => {
              const on = z ? zones.includes(z) : zones.length === 0;
              return (
                <form key={z || "todas"} action={setZone.bind(null, z)}>
                  <button aria-pressed={on} className={cn("inline-flex min-h-10 items-center rounded-full border-[1.5px] px-3.5 font-bold transition", on ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:border-monte")}>{z || "Todo el pueblo"}</button>
                </form>
              );
            })}
          </div>
          <Link href="/notificaciones" className="inline-flex min-h-11 w-fit items-center gap-2 font-bold text-monte hover:underline">Recibir avisos de lo que me importa <ArrowRight className="size-4" aria-hidden /></Link>
        </div>

        {/* Alertas vigentes: lo más importante, arriba de todo */}
        {hoy.notices.filter((n) => n.alert_kind).map((n) => (
          <Link key={n.id} href={`/muro/${n.id}`} role="alert" className="mb-4 flex items-start gap-4 rounded-3xl bg-[#B3261E] p-5 text-white transition hover:brightness-110 sm:p-6">
            <TriangleAlert className="mt-1 size-7 shrink-0" aria-hidden />
            <span className="grid gap-1">
              <span className="text-sm font-bold uppercase tracking-wide">Alerta de la municipalidad{n.zone ? ` · ${n.zone}` : ""}</span>
              <span className="font-display text-2xl font-extrabold leading-tight">{n.title}</span>
              <span className="text-white/90">{clamp(n.body.split("\n")[0], 160)}</span>
              <span className="text-sm text-white/80">No es una alerta oficial del SMN · {n.ends_at ? `vigente hasta las ${fmtTime(n.ends_at)} h` : "vigente"}</span>
            </span>
          </Link>
        ))}

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Avisos */}
          <Block title="Avisos de la municipalidad" icon={Megaphone} href="/muro?cat=aviso" className="lg:col-span-7" dark>
            {hoy.notices.filter((n) => !n.alert_kind).length === 0 ? (
              <p className="rounded-xl bg-white/10 px-4 py-3">No hay otros avisos vigentes ahora.</p>
            ) : (
              <ul className="grid gap-3">
                {hoy.notices.filter((n) => !n.alert_kind).map((n) => (
                  <li key={n.id}>
                    <Link href={`/muro/${n.id}`} className="grid gap-1.5 rounded-2xl bg-white/10 p-4 transition hover:bg-white/15">
                      <span className="flex flex-wrap items-center gap-2 text-sm">
                        <Pill tone={SEV[n.severity as keyof typeof SEV] ?? "info"}>{SEV_LABEL[n.severity as keyof typeof SEV_LABEL] ?? "Informativo"}</Pill>
                        {n.zone && <span className="inline-flex items-center gap-1 text-white/80"><MapPin className="size-3.5" aria-hidden /> {n.zone}</span>}
                      </span>
                      <span className="font-display text-xl font-bold leading-snug">{n.title}</span>
                      <span className="text-white/80">{clamp(n.body, 120)}</span>
                      <span className="text-sm text-white/70">
                        Fuente: Municipalidad · actualizado {timeAgo(n.updated_at ?? n.created_at)}
                        {n.ends_at && ` · vigente hasta las ${fmtTime(n.ends_at)} h${n.ends_at.slice(0, 10) !== new Date().toISOString().slice(0, 10) ? ` del ${fmtDate(n.ends_at)}` : ""}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {/* Farmacia */}
          <Block title="Farmacia de turno" icon={PillIcon} href="/utiles" className="lg:col-span-5">
            {hoy.pharmacy ? (
              <div className="grid gap-3">
                <p className="font-display text-3xl font-extrabold leading-tight">{hoy.pharmacy.name}</p>
                {hoy.pharmacy.address && <p className="flex items-center gap-2 text-ink-2"><MapPin className="size-4" aria-hidden /> {hoy.pharmacy.address}</p>}
                {hoy.pharmacy.phone && <ExtLink href={telLink(hoy.pharmacy.phone)} variant="primary" className="w-fit"><Phone className="size-5" aria-hidden /> Llamar</ExtLink>}
                <p className="text-sm text-ink-2">De turno hoy. Confirmá el horario por teléfono antes de ir.</p>
              </div>
            ) : (
              <Empty>Todavía no hay información confirmada sobre la farmacia de turno de hoy.</Empty>
            )}
          </Block>

          {/* Eventos */}
          <Block title="Eventos de hoy" icon={CalendarDays} href="/agenda" className="lg:col-span-5">
            {hoy.eventsToday.length === 0 ? (
              <Empty>No hay eventos publicados para hoy.</Empty>
            ) : (
              <ul className="grid gap-3">
                {hoy.eventsToday.map((e) => {
                  const p = eventParts(e.event_at!);
                  return (
                    <li key={e.id}>
                      <Link href={`/muro/${e.id}`} className="flex gap-3 rounded-2xl bg-surface-2 p-3 transition hover:bg-monte-soft">
                        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#B83C78] font-display font-extrabold leading-none text-white">{p.time || "Hoy"}</span>
                        <span className="min-w-0"><span className="block font-bold leading-snug">{e.title}</span><span className="block truncate text-ink-2">{e.event_place}{e.event_end_at ? ` · hasta las ${e.event_end_at.slice(11, 16)} h` : ""}</span></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {hoy.upcoming.length > 0 && (
              <div className="grid gap-2 border-t border-line pt-4">
                <h4 className="font-bold text-ink-2">Próximos días</h4>
                <ul className="grid gap-1.5">
                  {hoy.upcoming.map((e) => {
                    const p = eventParts(e.event_at!);
                    return <li key={e.id} className="flex gap-3"><span className="w-20 shrink-0 font-bold capitalize text-ink-2">{p.day} {p.month}</span><Link href={`/muro/${e.id}`} className="font-bold hover:text-monte hover:underline">{e.title}</Link></li>;
                  })}
                </ul>
              </div>
            )}
          </Block>

          {/* Cambios de servicios */}
          <Block title="Cambios de servicios" icon={Clock} className="lg:col-span-7">
            {hoy.changes.length === 0 ? (
              <Empty>No hay cambios programados para las próximas 24 horas.</Empty>
            ) : (
              <ul className="grid gap-3">
                {hoy.changes.map((c) => (
                  <li key={c.id}>
                    <Link href={`/muro/${c.id}`} className="flex gap-3 rounded-2xl bg-surface-2 p-3 transition hover:bg-monte-soft">
                      <Siren className="mt-1 size-5 shrink-0 text-warn" aria-hidden />
                      <span><span className="block font-bold leading-snug">{c.title}</span><span className="block text-ink-2">{c.starts_at && c.starts_at > new Date().toISOString().slice(0, 19).replace("T", " ") ? `Desde las ${fmtTime(c.starts_at)} h` : c.ends_at ? `Hasta las ${fmtTime(c.ends_at)} h` : ""}{c.zone ? ` · ${c.zone}` : ""}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {/* Novedades */}
          <Block title="Novedades" icon={Newspaper} href="/muro" className="lg:col-span-7">
            {hoy.news.length === 0 ? (
              <Empty>Todavía no hay novedades recientes.</Empty>
            ) : (
              <ul className="grid gap-2">
                {hoy.news.map((n) => (
                  <li key={n.id}><Link href={`/muro/${n.id}`} className="flex items-baseline justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-surface-2"><span className="font-bold">{n.title}</span><span className="shrink-0 text-sm text-ink-2">{timeAgo(n.created_at)}</span></Link></li>
                ))}
              </ul>
            )}
          </Block>

          {/* Resultados */}
          <Block title="Gracias, se resolvió" icon={HeartHandshake} href="/resultados" className="lg:col-span-5">
            {hoy.outcomes.length === 0 ? (
              <Empty>Cuando un vecino cierre un pedido, una búsqueda o una idea, su resultado aparece acá.</Empty>
            ) : (
              <ul className="grid gap-3">
                {hoy.outcomes.map((o) => (
                  <li key={o.id} className="rounded-2xl bg-monte-soft p-3">
                    <p className="font-bold leading-snug">{o.source_title}</p>
                    <p className="text-ink-2">“{clamp(o.body, 90)}” <span className="text-sm">— {o.author_name.split(" ")[0]}</span></p>
                    <Link href={o.source_href} className="text-sm font-bold text-monte hover:underline">Ver el origen</Link>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {/* Recolección de residuos */}
          <Block title="Recolección de residuos" icon={Recycle} href="/residuos" className="lg:col-span-5">
            {zones.length === 0 ? (
              <Empty>Elegí tu zona arriba para ver cuándo pasa el camión.</Empty>
            ) : hoy.waste.today.length === 0 && hoy.waste.tomorrow.length === 0 ? (
              <Empty>No hay recolección programada para hoy ni mañana en {zones.join(", ")}.</Empty>
            ) : (
              <ul className="grid gap-2">
                {[...hoy.waste.today.map((s) => ({ ...s, when: "Hoy" })), ...hoy.waste.tomorrow.map((s) => ({ ...s, when: "Mañana" }))].map((s) => (
                  <li key={`${s.when}-${s.id}`} className={cn("flex items-baseline justify-between gap-3 rounded-xl px-3 py-2", s.when === "Hoy" ? "bg-monte-soft" : "bg-surface-2")}>
                    <span><b>{s.when}</b> · {kindLabel(s.kind)}</span><span className="text-sm text-ink-2">{s.zone}{s.note ? ` · ${s.note}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {/* Destacado de la semana */}
          <Block title="Destacado de la semana" icon={Star} href="/guia" className="lg:col-span-7">
            {hoy.featured ? (
              <Link href={`/guia/${hoy.featured.listing.id}`} className="grid gap-1.5 rounded-2xl bg-girasol-soft p-4 transition hover:brightness-95 sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="grid gap-1">
                  <span className="text-sm font-bold text-warn">{hoy.featured.listing.category}</span>
                  <span className="font-display text-2xl font-extrabold leading-tight text-on-girasol dark:text-girasol">{hoy.featured.listing.name}</span>
                  <span className="text-ink-2">“{hoy.featured.pitch}”</span>
                </span>
                <span className="inline-flex items-center gap-2 font-bold text-monte">Ver ficha <ArrowRight className="size-4" aria-hidden /></span>
              </Link>
            ) : (
              <Empty>Esta semana todavía no hay un comercio destacado. Si tenés un comercio, postulalo desde su ficha.</Empty>
            )}
          </Block>

          {/* Consultas abiertas */}
          {hoy.polls.length > 0 && (
            <Block title="Consultas abiertas" icon={Vote} href="/encuestas" className="lg:col-span-12">
              <ul className="grid gap-2 md:grid-cols-2">
                {hoy.polls.map((p) => (
                  <li key={p.id}><Link href={`/encuestas/${p.id}`} className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 transition hover:bg-monte-soft"><span className="font-bold">{p.question}</span><span className="shrink-0 text-sm text-ink-2">Cierra el {fmtDate(p.closes_at)}</span></Link></li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      </div>
    </section>
  );
}
