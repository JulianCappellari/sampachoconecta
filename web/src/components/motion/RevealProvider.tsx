"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Entrada suave de cualquier elemento con `data-reveal`, disparada por ScrollTrigger.
 * Respeta prefers-reduced-motion: sin movimiento, el contenido queda visible tal cual.
 */
export function RevealProvider() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const els = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      if (!els.length) return;
      gsap.set(els, { autoAlpha: 0, y: 22 });
      ScrollTrigger.batch(els, {
        start: "top 94%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.07, overwrite: true, clearProps: "transform" }),
      });
    });
    return () => mm.revert();
  }, [pathname]);

  return null;
}
