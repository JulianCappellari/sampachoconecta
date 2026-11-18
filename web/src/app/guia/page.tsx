import type { Metadata } from "next";
import { Explorer, type ExplorerParams } from "@/components/guia/Explorer";

export const metadata: Metadata = { title: "Guía de comercios" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<ExplorerParams> }) {
  return <Explorer kind="comercio" sp={await searchParams} />;
}
