import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { BARRIOS, REQUEST_CATEGORIES } from "@/lib/constants";
import { createJob } from "@/actions/empleo";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { Container, PageHeader } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Publicar un aviso de trabajo" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  await requireUser("/empleo/nuevo");
  return (
    <Container narrow className="pb-8">
      <PageHeader title="Publicar un aviso" back={{ href: "/empleo", label: "Bolsa de trabajo" }} intro="El teléfono que escribas se muestra públicamente en el aviso. No uses datos que no quieras compartir." />
      <div className="py-8">
        <Form action={createJob} submit="Publicar aviso" className="gap-5">
          <Select label="¿Qué querés publicar?" name="kind" defaultValue={tipo === "busco" ? "busco" : "oferta"} options={[{ value: "oferta", label: "Ofrezco un trabajo" }, { value: "busco", label: "Busco trabajo" }]} />
          <Field label="Título" name="title" required minLength={5} maxLength={100} placeholder="Ayudante de panadería, turno mañana" />
          <TextArea label="Detalles" name="body" rows={5} required minLength={10} maxLength={800} hint="Tareas, horarios, experiencia. Sin documentos ni datos sensibles." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Rubro" name="category" options={[...REQUEST_CATEGORIES, "Otro"]} placeholder="Elegí un rubro" required />
            <Select label="Zona" name="zone" placeholder="Todo el pueblo" options={BARRIOS} />
            <Field label="Celular de contacto" name="phone" type="tel" required placeholder="3584 123456" hint="Te escriben por WhatsApp." />
            <Field label="Días visible" name="days" type="number" min={1} max={60} defaultValue={30} />
          </div>
        </Form>
      </div>
    </Container>
  );
}
