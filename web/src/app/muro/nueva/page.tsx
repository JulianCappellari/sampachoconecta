import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Container, PageHeader } from "@/components/ui/bits";
import { PostForm } from "@/components/muro/PostForm";

export const metadata: Metadata = { title: "Publicar en el muro" };

export default async function Page({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const user = await requireUser("/muro/nueva");
  const { cat } = await searchParams;
  return (
    <Container narrow className="pb-8">
      <PageHeader title="Publicar en el muro" back={{ href: "/muro", label: "Volver al muro" }} />
      <div className="py-8">
        <PostForm isMunicipio={user.role === "municipio"} initial={cat} />
      </div>
    </Container>
  );
}
