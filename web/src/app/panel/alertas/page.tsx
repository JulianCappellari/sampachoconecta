import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";
import { ALERT_KINDS, BARRIOS, SMN_URL } from "@/lib/constants";
import { NOTICE_ACTIVE } from "@/lib/hoy";
import { fmtDateTime, fmtTime } from "@/lib/format";
import { issueAlert } from "@/actions/alertas";
import { Form } from "@/components/ui/Form";
import { Field, Select, TextArea } from "@/components/ui/Fields";
import { Card } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Panel · Alertas" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireRole(["municipio"], "/panel/alertas");
  const active = all<{ id: number; title: string; zone: string | null; ends_at: string | null; created_at: string }>(
    `SELECT p.id,p.title,p.zone,p.ends_at,p.created_at FROM posts p WHERE ${NOTICE_ACTIVE} AND p.alert_kind IS NOT NULL ORDER BY p.created_at DESC`,
  );
  return (
    <div className="grid gap-8 py-8">
      <div className="grid gap-2">
        <h1 className="text-4xl font-extrabold">Alertas al vecino</h1>
        <p className="max-w-2xl text-ink-2">Emití un aviso urgente por clima severo o cortes. Llega a la bandeja de todos los vecinos de la zona y, a quienes lo activaron, al teléfono.</p>
        <p className="flex max-w-2xl items-start gap-2 rounded-xl bg-girasol-soft p-3 text-warn"><TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden /><span><b>No es una alerta oficial del SMN.</b> El mensaje lo aclara y remite a <a href={SMN_URL} className="underline" target="_blank" rel="noopener noreferrer">smn.gob.ar</a>. Usalo según la información que tengas de las áreas competentes.</span></p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="grid content-start gap-3 border-err">
          <h2 className="text-2xl font-bold">Emitir una alerta</h2>
          <Form action={issueAlert} submit="Emitir alerta ahora" variant="primary">
            <Select label="Tipo" name="kind" options={ALERT_KINDS.map((k) => ({ value: k.id, label: k.label }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Zona" name="zone" placeholder="Todo el pueblo" options={BARRIOS} />
              <Field label="Vigente (horas)" name="hours" type="number" min={1} max={72} defaultValue={12} />
            </div>
            <TextArea label="Mensaje adicional (opcional)" name="message" rows={3} maxLength={300} hint="El texto de recomendaciones del tipo elegido se agrega solo." />
          </Form>
        </Card>
        <section aria-labelledby="vig" className="grid content-start gap-3">
          <h2 id="vig" className="text-2xl font-bold">Alertas vigentes</h2>
          {active.length === 0 ? <p className="text-ink-2">No hay alertas vigentes.</p> : (
            <ul className="grid gap-3">{active.map((a) => <li key={a.id} className="rounded-2xl border border-line bg-surface p-4"><Link href={`/muro/${a.id}`} className="text-lg font-bold hover:underline">{a.title}</Link><p className="text-ink-2">Emitida {fmtDateTime(a.created_at)}{a.ends_at ? ` · vence a las ${fmtTime(a.ends_at)} h` : ""}. Para cancelarla, abrila y usá “Cancelar aviso”.</p></li>)}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
