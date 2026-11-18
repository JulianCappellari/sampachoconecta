import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PHONE_CATEGORIES } from "@/lib/constants";
import { listPhones, pharmacyUpcoming } from "@/lib/data";
import { addPhone, deletePhone, savePharmacy } from "@/actions/panel";
import { eventParts, todayKey } from "@/lib/format";
import { Card } from "@/components/ui/bits";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Form } from "@/components/ui/Form";
import { Field, Select } from "@/components/ui/Fields";
export const metadata: Metadata = { title: "Panel · Útiles y farmacias" };
export const dynamic = "force-dynamic";
export default async function Page() {
    await requireRole(["municipio"], "/panel/utiles");
    const phones = await listPhones();
    const duty = await pharmacyUpcoming(14);
    return (<div className="grid gap-10 py-8">
      <h1 className="text-4xl font-extrabold">Útiles y farmacias</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid content-start gap-4" aria-labelledby="tel">
          <h2 id="tel" className="text-2xl font-bold">Teléfonos útiles</h2>
          <Card>
            <Form action={addPhone} submit="Agregar teléfono" resetOnOk>
              <Field label="Nombre del servicio" name="name" required placeholder="Hospital Municipal"/>
              <Field label="Número" name="number" type="tel" required placeholder="3584 123456"/>
              <Select label="Categoría" name="category" options={PHONE_CATEGORIES} defaultValue="Municipio"/>
            </Form>
          </Card>
          <ul className="grid gap-2">
            {phones.map((p) => (<li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5">
                <span><b>{p.name}</b> <span className="text-ink-2">· {p.number} · {p.category}</span></span>
                <ConfirmForm action={deletePhone.bind(null, p.id)} message={`¿Quitar “${p.name}”?`}>Quitar</ConfirmForm>
              </li>))}
          </ul>
        </section>
        <section className="grid content-start gap-4" aria-labelledby="farm">
          <h2 id="farm" className="text-2xl font-bold">Farmacias de turno</h2>
          <Card>
            <Form action={savePharmacy} submit="Cargar turnos">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Desde el día" name="from" type="date" defaultValue={todayKey()} required/>
                <Field label="Cantidad de días" name="days" type="number" min={1} max={31} defaultValue={1} required/>
              </div>
              <Field label="Farmacia" name="name" required placeholder="Farmacia del Centro"/>
              <Field label="Dirección" name="address" placeholder="San Martín 450"/>
              <Field label="Teléfono" name="phone" type="tel"/>
            </Form>
          </Card>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {duty.map((d) => {
            const p = eventParts(d.date);
            return <li key={d.date} className="flex justify-between gap-3 px-4 py-2.5"><span className="capitalize text-ink-2">{p.weekday} {p.day}/{d.date.slice(5, 7)}</span><b>{d.name}</b></li>;
        })}
          </ul>
        </section>
      </div>
    </div>);
}
