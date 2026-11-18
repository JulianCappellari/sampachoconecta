"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, HandHelping, Home, Lightbulb, Megaphone, MapPin, Menu, Newspaper, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";

export const NAV = [
  { href: "/muro", label: "Muro", icon: Newspaper },
  { href: "/guia", label: "Guía", icon: MapPin },
  { href: "/oficios", label: "Oficios", icon: Wrench },
  { href: "/reclamos", label: "Reclamos", icon: Megaphone },
  { href: "/necesito", label: "Necesito", icon: HandHelping },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/empleo", label: "Empleo", icon: Briefcase },
  { href: "/mas", label: "Más", icon: Menu },
] as const;

const active = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

export function TopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Principal" className="hidden items-center gap-0.5 lg:flex">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(path, n.href) ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2 font-bold transition hover:bg-surface-2",
            active(path, n.href) ? "bg-monte-soft text-monte" : "text-ink",
          )}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

const BOTTOM = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/muro", label: "Muro", icon: Newspaper },
  { href: "/guia", label: "Guía", icon: MapPin },
  { href: "/reclamos", label: "Reclamos", icon: Megaphone },
  { href: "/mas", label: "Más", icon: Menu },
] as const;

export function BottomNav() {
  const path = usePathname();
  // En "Más" se resaltan también las secciones que viven ahí.
  const moreRoutes = ["/oficios", "/empleo", "/encuestas", "/residuos", "/visitar", "/transparencia", "/necesito", "/resultados", "/siguiendo", "/notificaciones", "/ideas", "/agenda", "/utiles", "/perfil", "/panel", "/mas"];
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {BOTTOM.map((n) => {
        const on = n.href === "/mas" ? moreRoutes.some((r) => active(path, r)) : active(path, n.href);
        const Icon = n.icon;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={cn("relative grid min-h-16 place-items-center content-center gap-0.5 text-[0.72rem] font-bold", on ? "text-monte" : "text-ink-2")}
          >
            {on && <span aria-hidden className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-monte" />}
            <Icon className="size-6" aria-hidden />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
