"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Entrada del hero (una sola secuencia al cargar) y un leve desplazamiento en capas al hacer scroll.
 * Anima por clases dentro de #hero: h-street, h-line, h-fade, h-card.
 */
export function HeroMotion() {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const root = document.getElementById("hero");
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = <T extends Element>(s: string) => gsap.utils.toArray<T>(s, root);
      gsap.set(q(".h-street"), { strokeDashoffset: 1 });
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.to(q(".h-street"), { strokeDashoffset: 0, duration: 2.2, stagger: 0.06, ease: "power2.inOut" }, 0)
        .to(q(".h-line > span"), { y: 0, yPercent: 0, duration: 1, stagger: 0.12 }, 0.15)
        .to(q(".h-fade"), { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, 0.65)
        .fromTo(q(".h-card"), { autoAlpha: 0, y: 70, rotate: 2 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 1, stagger: 0.14 }, 0.5);

      // Capas a distinta velocidad cuando se baja.
      q<HTMLElement>(".h-card").forEach((c, i) => {
        gsap.to(c, {
          yPercent: -(10 + i * 8),
          ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.8 },
        });
      });
      gsap.to(q(".h-street-wrap"), {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true },
      });
    });
  }, []);

  return <span ref={ref} hidden />;
}
