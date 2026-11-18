import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { IDEA_CATEGORIES } from "@/lib/constants";
import { createIdea } from "@/actions/ideas";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { PhotoInput } from "@/components/ui/PhotoInput";
import { Container, PageHeader } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Proponer una idea" };

export default async function Page() {
  await requireUser("/ideas/nueva");
  return (
    <Container narrow className="pb-8">
      <PageHeader title="Proponer una idea" back={{ href: "/ideas", label: "Ideas vecinales" }} intro="Contá qué te gustaría hacer. Cuando se sumen vecinos, vas a poder armar un grupo de WhatsApp para organizarse." />
      <div className="py-8">
        <Form action={createIdea} submit="Publicar idea" className="gap-5">
          <Field label="Título" name="title" required minLength={5} maxLength={100} placeholder="Huerta comunitaria en el predio del ferrocarril" />
          <Select label="Categoría" name="category" options={IDEA_CATEGORIES} placeholder="Elegí una categoría" required />
          <TextArea label="¿En qué consiste?" name="body" rows={6} required minLength={20} maxLength={1500} hint="Qué querés hacer, para quién y qué ayuda necesitás." />
          <PhotoInput max={1} label="Foto" />
        </Form>
      </div>
    </Container>
  );
}
