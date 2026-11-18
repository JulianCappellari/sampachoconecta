import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Bell, Briefcase, CalendarDays, Compass, Recycle, Vote, ChevronRight, HandHelping, HeartHandshake, Lightbulb, Phone, ShieldCheck, User, Wrench } from "lucide-react";
import { getUser } from "@/lib/auth";
import { Container, PageHeader } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Más" };

export default async function Page() {
  const user = await getUser();
  const items = [
    { href: "/oficios", label: "Oficios", text: "Electricistas, gasistas, plomeros y más", icon: Wrench },
    { href: "/empleo", label: "Bolsa de trabajo", text: "Ofrecen y buscan trabajo en el pueblo", icon: Briefcase },
    { href: "/encuestas", label: "Encuestas vecinales", text: "Consultas de la municipalidad", icon: Vote },
    { href: "/residuos", label: "Recolección de residuos", text: "Qué día pasa el camión en tu zona", icon: Recycle },
    { href: "/visitar", label: "Visitar Sampacho", text: "Qué conocer, dónde comer y dormir", icon: Compass },
    { href: "/transparencia", label: "Transparencia", text: "Cómo van los reclamos, en cifras", icon: BarChart3 },
    { href: "/necesito", label: "Necesito", text: "Pedí algo y respondan los comercios", icon: HandHelping },
    { href: "/resultados", label: "Gracias, se resolvió", text: "Lo que los vecinos lograron", icon: HeartHandshake },
    ...(user ? [{ href: "/siguiendo", label: "Qué sigo", text: "Temas, zonas y comercios", icon: Bell }] : []),
    { href: "/ideas", label: "Ideas vecinales", text: "Proponé y sumate con grupo de WhatsApp", icon: Lightbulb },
    { href: "/agenda", label: "Agenda", text: "Eventos y actividades del pueblo", icon: CalendarDays },
    { href: "/utiles", label: "Teléfonos útiles", text: "Emergencias y farmacia de turno", icon: Phone },
    ...(user && (user.role === "municipio" || user.role === "moderador")
      ? [{ href: "/panel", label: "Panel de gestión", text: "Reclamos, moderación y usuarios", icon: ShieldCheck }]
      : []),
    user
      ? { href: "/perfil", label: "Mi perfil", text: user.name, icon: User }
      : { href: "/ingresar", label: "Ingresar o crear cuenta", text: "Para publicar, calificar y reclamar", icon: User },
  ];
  return (
    <Container narrow className="pb-8">
      <PageHeader title="Más" />
      <ul className="grid gap-3 py-6">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link href={it.href} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-monte">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-monte-soft text-monte"><Icon className="size-6" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">{it.label}</span>
                  <span className="block truncate text-ink-2">{it.text}</span>
                </span>
                <ChevronRight className="size-5 text-ink-2" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
