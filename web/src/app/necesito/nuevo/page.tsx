import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { BARRIOS, REQUEST_CATEGORIES } from "@/lib/constants";
import { activeRequestsOf } from "@/lib/pedidos";
import { createRequest } from "@/actions/pedidos";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { PhotoInput } from "@/components/ui/PhotoInput";
import { Container, PageHeader } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Pedir algo" };

export default async function Page() {
  const user = await requireUser("/necesito/nuevo");
  const active = activeRequestsOf(user.id);
  return (
    <Container narrow className="pb-8">
      <PageHeader title="Pedir algo" back={{ href: "/necesito", label: "Necesito" }} intro="Contá qué necesitás. Los comercios y prestadores con ficha en la guía pueden responderte con su contacto. No publiques tu teléfono ni tu dirección." />
      <div className="py-8">
        {active >= 5 ? (
          <p className="rounded-2xl bg-girasol-soft p-4 font-bold text-warn">Ya tenés 5 pedidos abiertos. Cerrá alguno para publicar otro.</p>
        ) : (
          <Form action={createRequest} submit="Publicar pedido" className="gap-5">
            <Select label="¿Qué buscás?" name="kind" options={[{ value: "servicio", label: "Un servicio (alguien que haga algo)" }, { value: "producto", label: "Un producto (algo que comprar o conseguir)" }]} placeholder="Elegí una opción" required />
            <Field label="Título" name="title" required minLength={5} maxLength={100} placeholder="Busco quien repare una persiana" />
            <TextArea label="Contá los detalles" name="body" rows={5} required minLength={10} maxLength={800} hint="Medidas, modelo, para cuándo lo necesitás. Sin datos personales." />
            <div className="grid gap-4 sm:grid-cols-3">
              <Select label="Rubro" name="category" options={REQUEST_CATEGORIES} placeholder="Elegí un rubro" required />
              <Select label="Zona aproximada" name="zone" options={BARRIOS} placeholder="Todo el pueblo" />
              <Field label="Días abierto" name="days" type="number" min={1} max={30} defaultValue={7} hint="De 1 a 30." />
            </div>
            <PhotoInput max={3} />
          </Form>
        )}
      </div>
    </Container>
  );
}
