"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Lightbulb, Megaphone, MapPin, Newspaper, Phone, Wrench } from "lucide-react";
import { btn } from "@/components/ui/Button";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const PLACES = [
  { key: "Muro", href: "/muro", icon: Newspaper, x: 150, y: 150, title: "Lo que se cuenta en la plaza", text: "Noticias, ventas, eventos y avisos del municipio con fotos. Cada vecino publica y comenta, y todo queda a mano.", cta: "Ir al muro" },
  { key: "Guía", href: "/guia", icon: MapPin, x: 410, y: 110, title: "Cada comercio, en su lugar del mapa", text: "Dirección, teléfono, horarios y si está abierto ahora. Con la opinión de otros vecinos para elegir mejor.", cta: "Abrir la guía" },
  { key: "Oficios", href: "/oficios", icon: Wrench, x: 490, y: 300, title: "El electricista que te recomienda el barrio", text: "Gasistas, plomeros, albañiles y más, con matrícula, teléfono y calificaciones reales. Hay quienes atienden urgencias.", cta: "Buscar un oficio" },
  { key: "Reclamos", href: "/reclamos/nuevo", icon: Megaphone, x: 340, y: 440, title: "Un reclamo con número y seguimiento", text: "Lo ven solo vos y la municipalidad. Sabés en qué estado está y quién lo está resolviendo.", cta: "Hacer un reclamo" },
  { key: "Ideas", href: "/ideas", icon: Lightbulb, x: 130, y: 400, title: "Una idea, un grupo de WhatsApp", text: "Proponé algo para el pueblo. Cuando se suman vecinos, armás el grupo y empiezan a hacerlo realidad.", cta: "Ver las ideas" },
  { key: "Útiles", href: "/utiles", icon: Phone, x: 300, y: 270, title: "Lo urgente, a un toque", text: "Farmacia de turno de hoy y teléfonos de emergencia. Funciona también cuando la señal es mala.", cta: "Ver teléfonos" },
] as const;

const STREETS_H = [70, 200, 330, 480, 560];
const STREETS_V = [80, 230, 370, 520];

/**
 * Momento principal del sitio: el mapa del pueblo queda fijo mientras se hace scroll.
 * Cada tramo marca un lugar, dibuja la calle que lo conecta con el anterior y cambia el texto.
 * Sin movimiento (prefers-reduced-motion) se muestra todo junto, como una lista.
 */
export function PinnedMap() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        el.dataset.anim = "true";
        const steps = gsap.utils.toArray<HTMLElement>(".step", el);
        const pins = gsap.utils.toArray<SVGGElement>(".pin", el);
        const labels = gsap.utils.toArray<SVGTextElement>(".pin-label", el);
        const segs = gsap.utils.toArray<SVGPathElement>(".seg", el);
        const streets = gsap.utils.toArray<SVGPathElement>(".street", el);
        const ring = el.querySelector<SVGCircleElement>(".ring")!;

        gsap.set(steps, { autoAlpha: 0, y: 40 });
        gsap.set(pins, { scale: 0, transformOrigin: "0px 0px" });
        gsap.set(labels, { autoAlpha: 0 });
        gsap.set([...segs, ...streets], { strokeDashoffset: 1 });
        gsap.set(ring, { autoAlpha: 0, attr: { cx: PLACES[0].x, cy: PLACES[0].y - 16 } });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            // Queda fijo justo debajo del encabezado pegajoso.
            start: () => `top ${document.querySelector("header")?.getBoundingClientRect().height ?? 64}px`,
            end: () => `+=${Math.round(window.innerHeight * PLACES.length * 0.85)}`,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        tl.to(streets, { strokeDashoffset: 0, duration: 1.2, stagger: 0.08, ease: "power1.out" });
        let t = 0.4;
        PLACES.forEach((p, i) => {
          tl.to(ring, { attr: { cx: p.x, cy: p.y - 16 }, autoAlpha: 1, duration: 0.7, ease: "power2.inOut" }, t);
          if (i > 0) tl.to(segs[i - 1], { strokeDashoffset: 0, duration: 0.7, ease: "power1.inOut" }, t);
          tl.to(pins[i], { scale: 1, duration: 0.5, ease: "back.out(2.2)" }, t + 0.35);
          tl.to(labels[i], { autoAlpha: 1, duration: 0.3 }, t + 0.5);
          tl.to(steps[i], { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, t + 0.35);
          if (i < PLACES.length - 1) tl.to(steps[i], { autoAlpha: 0, y: -40, duration: 0.4, ease: "power2.in" }, t + 2.0);
          t += 2.5;
        });
        tl.to({}, { duration: 0.8 });

        return () => {
          delete el.dataset.anim;
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} data-anim="false" aria-labelledby="pueblo-title" className="group/pin relative overflow-hidden bg-[#0B4F43] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center group-data-[anim=true]/pin:h-[calc(100svh-4rem)] group-data-[anim=true]/pin:grid-rows-[minmax(0,44%)_minmax(0,1fr)] group-data-[anim=true]/pin:gap-2 group-data-[anim=true]/pin:py-4 md:group-data-[anim=true]/pin:grid-rows-1 md:group-data-[anim=true]/pin:gap-10 md:group-data-[anim=true]/pin:py-0">
        {/* Copy */}
        <div className="order-2 grid content-center gap-6 md:order-1">
          <h2 id="pueblo-title" className="font-display text-3xl font-extrabold text-[#F2B02A] sm:text-4xl">
            Un pueblo, seis lugares
          </h2>
          <div className="grid gap-10 group-data-[anim=true]/pin:relative group-data-[anim=true]/pin:block group-data-[anim=true]/pin:h-64 sm:group-data-[anim=true]/pin:h-72 md:group-data-[anim=true]/pin:h-96">
            {PLACES.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.key}
                  className="step grid content-start gap-3 group-data-[anim=true]/pin:absolute group-data-[anim=true]/pin:inset-0 group-data-[anim=true]/pin:content-center"
                >
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1 font-bold">
                    <Icon className="size-5 text-[#F2B02A]" aria-hidden /> {p.key}
                  </span>
                  <h3 className="max-w-xl text-balance font-display text-[clamp(1.75rem,4.4vw,3.4rem)] font-extrabold leading-[1.02]">{p.title}</h3>
                  <p className="max-w-lg text-[1.05rem] text-white/85 md:text-lg">{p.text}</p>
                  <Link href={p.href} className={btn("sun", "md", "w-fit")}>
                    {p.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mapa */}
        <div className="order-1 min-h-0 md:order-2">
          <svg viewBox="0 0 600 600" className="mx-auto h-full max-h-[34rem] w-full" role="img" aria-label="Mapa estilizado de Sampacho con los seis lugares de la app">
            <rect width="600" height="600" rx="28" fill="#0E6B5A" />
            <clipPath id="map-clip">
              <rect width="600" height="600" rx="28" />
            </clipPath>
            <g clipPath="url(#map-clip)">
              <rect x="236" y="206" width="128" height="118" fill="#8CD3B8" opacity=".22" />
              <path d="M-20 540 L620 220" stroke="#F2B02A" strokeOpacity=".45" strokeWidth="3" strokeDasharray="10 8" fill="none" />
              <g stroke="#ffffff" strokeOpacity=".3" strokeWidth="9" strokeLinecap="round" fill="none">
                {STREETS_H.map((y) => (
                  <path key={`h${y}`} className="street" pathLength={1} strokeDasharray={1} d={`M-20 ${y}H620`} />
                ))}
                {STREETS_V.map((x) => (
                  <path key={`v${x}`} className="street" pathLength={1} strokeDasharray={1} d={`M${x} -20V620`} />
                ))}
              </g>
              <g stroke="#F2B02A" strokeWidth="3.5" strokeLinecap="round" fill="none">
                {PLACES.slice(1).map((p, i) => (
                  <path key={p.key} className="seg" pathLength={1} strokeDasharray={1} d={`M${PLACES[i].x} ${PLACES[i].y - 16}L${p.x} ${p.y - 16}`} />
                ))}
              </g>
              <circle className="ring" r="46" fill="none" stroke="#F2B02A" strokeWidth="3.5" cx={PLACES[0].x} cy={PLACES[0].y - 16} />
              {PLACES.map((p, i) => (
                <g key={p.key} transform={`translate(${p.x} ${p.y})`}>
                  <g className="pin">
                    <path d="M0 0C-9-11-17-19-17-30a17 17 0 0 1 34 0C17-19 9-11 0 0z" fill="#fff" />
                    <circle cx="0" cy="-30" r="7" fill={i === 1 ? "#0E6B5A" : "#F2B02A"} />
                  </g>
                  <text className="pin-label" x="0" y="56" textAnchor="middle" fontSize="19" fontWeight="700" fill="#fff" style={{ paintOrder: "stroke", stroke: "#0E6B5A", strokeWidth: 5 }}>
                    {p.key}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
