import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { BARRIOS, WASTE_KINDS, WEEKDAYS } from "@/lib/constants";
import { allSlots, kindLabel } from "@/lib/waste";
import { addSlot, removeSlot } from "@/actions/operacion";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Form } from "@/components/ui/Form";
import { Field, Select } from "@/components/ui/Fields";
import { Card } from "@/components/ui/bits";
export const metadata: Metadata = { title: "Panel · Residuos" };
export const dynamic = "force-dynamic";
export default async function Page() {
    await requireRole(["municipio"], "/panel/residuos");
    const slots = await allSlots();
    const zones = [...new Set(slots.map((s) => s.zone))];
    return (<div className="grid gap-8 py-8">
      <h1 className="text-4xl font-extrabold">Recolección de residuos</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <Card className="grid content-start gap-3">
          <h2 className="text-2xl font-bold">Agregar un turno</h2>
          <Form action={addSlot} submit="Guardar turno" resetOnOk>
            <Select label="Zona" name="zone" options={BARRIOS} placeholder="Elegí una zona" required/>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Día" name="weekday" options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}/>
              <Select label="Tipo" name="kind" options={WASTE_KINDS.map((k) => ({ value: k.id, label: k.label }))}/>
            </div>
            <Field label="Aclaración (opcional)" name="note" placeholder="Sacar antes de las 7 h" maxLength={120}/>
          </Form>
        </Card>
        <section className="grid content-start gap-4" aria-labelledby="cron">
          <h2 id="cron" className="text-2xl font-bold">Cronograma cargado</h2>
          {slots.length === 0 && <p className="text-ink-2">Todavía no hay turnos.</p>}
          {zones.map((z) => (<div key={z} className="grid gap-2">
              <h3 className="text-xl font-bold">{z}</h3>
              <ul className="grid gap-2">{slots.filter((s) => s.zone === z).map((s) => <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5"><span><b>{WEEKDAYS[s.weekday]}</b> · {kindLabel(s.kind)}{s.note ? <span className="text-ink-2"> · {s.note}</span> : null}</span><ConfirmForm action={removeSlot.bind(null, s.id)} message="¿Quitar este turno?">Quitar</ConfirmForm></li>)}</ul>
            </div>))}
        </section>
      </div>
    </div>);
}
