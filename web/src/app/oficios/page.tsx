import type { Metadata } from "next";
import { Explorer, type ExplorerParams } from "@/components/guia/Explorer";

export const metadata: Metadata = { title: "Oficios y servicios en Sampacho", description: "Electricistas, gasistas, plomeros, albañiles y otros oficios de Sampacho con teléfono, zona de trabajo y calificaciones de vecinos.", alternates: { canonical: "/oficios" } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<ExplorerParams> }) {
  return <Explorer kind="oficio" sp={await searchParams} />;
}
