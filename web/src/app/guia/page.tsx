import type { Metadata } from "next";
import { Explorer, type ExplorerParams } from "@/components/guia/Explorer";

export const metadata: Metadata = { title: "Guía de comercios de Sampacho", description: "Todos los comercios de Sampacho en el mapa: dirección, teléfono, horarios, si están abiertos ahora y calificaciones de los vecinos. Farmacias, almacenes, panaderías, ferreterías y más.", alternates: { canonical: "/guia" } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<ExplorerParams> }) {
  return <Explorer kind="comercio" sp={await searchParams} />;
}
