"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/cn";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/** Efecto «imán» (estilo React Bits): el botón se acerca suavemente al cursor, con resorte. */
export function Magnet({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div ref={ref} style={{ x, y }} onMouseMove={move} onMouseLeave={leave} className={cn("inline-block", className)}>
      {children}
    </motion.div>
  );
}

/** Tarjeta con luz que sigue al cursor (estilo Aceternity/Magic UI). Solo decorativa. */
export function Spotlight({ children, className, color = "rgba(242,176,42,.22)" }: { children: ReactNode; className?: string; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        ref.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn("group/spot relative overflow-hidden", className)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background: `radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), ${color}, transparent 70%)` }}
      />
      {children}
    </div>
  );
}

/**
 * Texto que se «enciende» palabra por palabra mientras se hace scroll (estilo React Bits ScrollReveal),
 * con GSAP SplitText + ScrollTrigger. Sin movimiento, el texto se ve completo.
 */
export function ScrollWords({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(el, { type: "words", tag: "span" });
        gsap.fromTo(split.words, { opacity: 0.16, filter: "blur(3px)" }, {
          opacity: 1,
          filter: "blur(0px)",
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 45%", scrub: true },
        });
        return () => split.revert();
      });
    },
    { scope: ref },
  );
  return (
    <p ref={ref} className={className}>
      {children}
    </p>
  );
}

/** Fondo «aurora»: manchas de color que se desplazan despacio. Quieto con movimiento reducido. */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <span className="aurora-blob left-[-10%] top-[-20%] size-[34rem] bg-[#0E6B5A]/25" style={{ animationDuration: "26s" }} />
      <span className="aurora-blob right-[-8%] top-[10%] size-[28rem] bg-[#F2B02A]/20" style={{ animationDuration: "32s", animationDelay: "-8s" }} />
      <span className="aurora-blob bottom-[-25%] left-[30%] size-[30rem] bg-[#2D69C4]/15" style={{ animationDuration: "38s", animationDelay: "-14s" }} />
    </div>
  );
}
