"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Número que cuenta hasta su valor al entrar en pantalla. Sin JS o sin animación muestra el valor final. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const o = { v: 0 };
        el.textContent = "0";
        gsap.to(o, {
          v: value,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = String(Math.round(o.v));
          },
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
        return () => {
          el.textContent = String(value);
        };
      });
    },
    { dependencies: [value] },
  );
  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}
