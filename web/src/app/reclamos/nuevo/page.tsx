import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CLAIM_CATEGORIES } from "@/lib/constants";
import { createClaim } from "@/actions/reclamos";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { PhotoInput } from "@/components/ui/PhotoInput";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { Container, PageHeader } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Nuevo reclamo" };

export default async function Page() {
  await requireUser("/reclamos/nuevo");
  return (
    <Container narrow className="pb-8">
      <PageHeader title="Nuevo reclamo" back={{ href: "/reclamos", label: "Mis reclamos" }} />
      <p className="mt-6 flex items-start gap-3 rounded-2xl bg-monte-soft p-4 text-monte">
        <Lock className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span className="font-bold">Este reclamo es privado: lo ven solo vos y la municipalidad. No se publica en el muro.</span>
      </p>
      <div className="py-8">
        <Form action={createClaim} submit="Enviar reclamo" className="gap-6">
          <Select label="¿De qué se trata?" name="category" options={CLAIM_CATEGORIES} placeholder="Elegí una categoría" required />
          <TextArea label="¿Qué está pasando?" name="description" required minLength={10} maxLength={1500} hint="Contá qué ves y desde cuándo. Cuanto más claro, más rápido se resuelve." />
          <Field label="Dirección o referencia" name="address" autoComplete="off" placeholder="Belgrano y Mitre, frente a la escuela" />
          <LocationPicker label="Marcá el lugar en el mapa" hint="Tocá el mapa o usá tu ubicación. Si no marcás el punto, escribí la dirección." />
          <PhotoInput max={3} hint="Una foto ayuda mucho. Solo la verá el municipio." />
        </Form>
      </div>
    </Container>
  );
}
