import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { BARRIOS } from "@/lib/constants";
import { createPoll } from "@/actions/encuestas";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { Container, PageHeader } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Nueva consulta" };

export default async function Page() {
  await requireRole(["municipio"], "/encuestas/nueva");
  return (
    <Container narrow className="pb-8">
      <PageHeader title="Nueva consulta" back={{ href: "/encuestas", label: "Encuestas" }} intro="Una pregunta, de 2 a 6 opciones. Cada vecino con cuenta vota una vez." />
      <div className="py-8">
        <Form action={createPoll} submit="Publicar consulta" className="gap-5">
          <Field label="Pregunta" name="question" required minLength={8} maxLength={160} placeholder="¿Qué obra querés que se priorice este año?" />
          <TextArea label="Contexto (opcional)" name="body" rows={3} maxLength={800} />
          <fieldset className="grid gap-3">
            <legend className="font-bold">Opciones</legend>
            {[1, 2, 3, 4, 5, 6].map((n) => <Field key={n} id={`option-${n}`} label={`Opción ${n}${n > 2 ? " (opcional)" : ""}`} name="option" required={n <= 2} maxLength={80} />)}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="¿Quiénes votan?" name="zone" placeholder="Todo el pueblo" options={BARRIOS} hint="Si elegís un barrio, vota quien lo tenga en su perfil." />
            <Field label="Días abierta" name="days" type="number" min={1} max={30} defaultValue={7} />
          </div>
        </Form>
      </div>
    </Container>
  );
}
