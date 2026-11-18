import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PLACE_KINDS } from "@/lib/constants";
import { listPlaces, placeKindLabel } from "@/lib/tourism";
import { addPlace, removePlace } from "@/actions/operacion";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { Card } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Panel · Turismo" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireRole(["municipio"], "/panel/turismo");
  const places = listPlaces();
  return (
    <div className="grid gap-8 py-8">
      <div className="grid gap-1"><h1 className="text-4xl font-extrabold">Guía del visitante</h1><p className="max-w-2xl text-ink-2">Cargá lugares para conocer, fiestas y consejos. Se muestran en “Visitar Sampacho”. Cargá solo información que hayas verificado.</p></div>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <Card className="grid content-start gap-3">
          <h2 className="text-2xl font-bold">Agregar</h2>
          <Form action={addPlace} submit="Agregar a la guía" resetOnOk>
            <Select label="Tipo" name="kind" options={PLACE_KINDS.map((k) => ({ value: k.id, label: k.label }))} />
            <Field label="Nombre" name="name" required minLength={3} maxLength={100} />
            <TextArea label="Descripción" name="description" rows={4} required minLength={10} maxLength={600} />
            <Field label="Dirección o referencia (opcional)" name="address" />
            <LocationPicker label="Ubicación en el mapa (opcional)" hint="Para lugares, marcá el punto." />
          </Form>
        </Card>
        <section className="grid content-start gap-3" aria-labelledby="lista">
          <h2 id="lista" className="text-2xl font-bold">Cargados ({places.length})</h2>
          {places.length === 0 && <p className="text-ink-2">Todavía no hay lugares.</p>}
          <ul className="grid gap-2">{places.map((p) => <li key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3"><span><b>{p.name}</b><span className="block text-sm text-ink-2">{placeKindLabel(p.kind)}</span></span><ConfirmForm action={removePlace.bind(null, p.id)} message={`¿Quitar “${p.name}”?`}>Quitar</ConfirmForm></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
