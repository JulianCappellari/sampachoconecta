import type { Metadata } from "next";
import { Explorer, type ExplorerParams } from "@/components/guia/Explorer";

export const metadata: Metadata = { title: "Oficios" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<ExplorerParams> }) {
  return <Explorer kind="oficio" sp={await searchParams} />;
}
