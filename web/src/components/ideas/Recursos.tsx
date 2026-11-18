import { mapSequential } from "../../lib/async";
import { CheckCircle2, Hammer, Landmark, XCircle } from "lucide-react";
import type { User } from "@/lib/auth";
import { NEED_KINDS } from "@/lib/constants";
import { type Commitment, ideaNeeds, ideaPermissions, ideaUpdates, needCommitments, publicNames } from "@/lib/ideas";
import { fmtDate, timeAgo } from "@/lib/format";
import { addNeed, addPermission, closeIdea, confirmFulfillment, decideCommitment, postIdeaUpdate, proposeCommitment, reviewPermission, setNeedTarget, withdrawCommitment, } from "@/actions/recursos";
import { Card, Pill } from "@/components/ui/bits";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Form } from "@/components/ui/Form";
import { Check, Field, Select, TextArea } from "@/components/ui/Fields";
import { PhotoInput } from "@/components/ui/PhotoInput";
const CSTATUS: Record<string, [
    string,
    "neutral" | "info" | "warn" | "ok" | "err"
]> = {
    pendiente: ["Pendiente de respuesta", "warn"],
    aceptada: ["Aceptada", "info"],
    cumplida: ["Cumplida", "ok"],
    retirada: ["Retirada", "neutral"],
    rechazada: ["No aceptada", "err"],
};
function Bar({ target, reserved, fulfilled }: {
    target: number;
    reserved: number;
    fulfilled: number;
}) {
    const pct = (n: number) => `${Math.min(100, (n / target) * 100)}%`;
    return (<div role="img" aria-label={`Objetivo ${target}. Aceptados ${reserved}. Cumplidos ${fulfilled}.`} className="relative h-3 overflow-hidden rounded-full bg-surface-2">
      <span className="absolute inset-y-0 left-0 rounded-full bg-monte/35" style={{ width: pct(reserved) }}/>
      <span className="absolute inset-y-0 left-0 rounded-full bg-monte" style={{ width: pct(fulfilled) }}/>
    </div>);
}
export async function Recursos({ ideaId, status, ownerId, closingNote, user }: {
    ideaId: number;
    status: string;
    ownerId: number;
    closingNote: string | null;
    user: User | null;
}) {
    const needs = await ideaNeeds(ideaId);
    const updates = await ideaUpdates(ideaId);
    const perms = await ideaPermissions(ideaId);
    const owner = user?.id === ownerId;
    const muni = user?.role === "municipio";
    const open = status !== "realizada" && status !== "cancelada";
    const commits = owner || user ? await needCommitments(needs.map((n) => n.id)) : [];
    const visible = (c: Commitment) => owner || c.user_id === user?.id;
    const h = "text-2xl font-bold";
    return (<div className="grid gap-10">
      {!open && (<p role="status" className={`flex items-start gap-3 rounded-2xl p-4 ${status === "realizada" ? "bg-monte-soft text-monte" : "bg-surface-2"}`}>
          {status === "realizada" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden/> : <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden/>}
          <span><b>{status === "realizada" ? "Idea realizada." : "Idea cancelada."}</b> {closingNote}</span>
        </p>)}

      <section aria-labelledby="hace-falta" className="grid gap-4">
        <div>
          <h2 id="hace-falta" className={h}>Qué hace falta</h2>
          <p className="text-ink-2">Los apoyos (“Me sumo”) muestran interés. Esto es distinto: aportes concretos que el organizador acepta y confirma.</p>
        </div>
        {needs.length === 0 && <p className="text-ink-2">{owner ? "Todavía no cargaste qué hace falta. Agregalo abajo." : "El organizador todavía no definió qué hace falta."}</p>}
        <ul className="grid gap-4">
          {await mapSequential(needs, async (n) => {
            const kind = NEED_KINDS.find((k) => k.id === n.kind);
            const mine = commits.find((c) => c.need_id === n.id && c.user_id === user?.id);
            const list = commits.filter((c) => c.need_id === n.id && visible(c));
            const names = await publicNames(n.id);
            return (<li key={n.id} className="grid gap-3 rounded-2xl border border-line bg-surface p-5" data-reveal>
                <div className="flex flex-wrap items-center gap-2"><Pill tone="info"><Hammer className="size-3.5" aria-hidden/> {kind?.label}</Pill>{n.deadline && <span className="text-sm text-ink-2">Para el {fmtDate(n.deadline)}</span>}{n.status === "cerrada" && <Pill>Cerrada</Pill>}</div>
                <h3 className="text-xl font-bold">{n.description}</h3>
                <Bar target={n.target} reserved={n.reserved} fulfilled={n.fulfilled}/>
                <p className="flex flex-wrap gap-x-5 gap-y-1">
                  <span>Objetivo: <b>{n.target} {n.unit}</b></span>
                  <span>Aceptados: <b>{n.reserved}</b></span>
                  <span>Cumplidos: <b>{n.fulfilled}</b></span>
                  {n.reserved < n.target && n.status === "abierta" && <span className="text-ink-2">Faltan {n.target - n.reserved}</span>}
                </p>
                {names.length > 0 && <p className="text-sm text-ink-2">Colaboran: {names.join(", ")}</p>}

                {/* Participante: su propuesta */}
                {mine && (<div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-3">
                    Tu aporte: <b>{mine.status === "aceptada" || mine.status === "cumplida" ? mine.accepted : mine.proposed}</b> <Pill tone={CSTATUS[mine.status][1]}>{CSTATUS[mine.status][0]}</Pill>{mine.status === "aceptada" && mine.fulfilled > 0 && <span>· recibidos {mine.fulfilled}</span>}
                    {mine.reason && <span className="text-ink-2">Motivo: {mine.reason}</span>}
                    {mine.status !== "cumplida" && mine.status !== "retirada" && mine.status !== "rechazada" && <ConfirmForm action={withdrawCommitment.bind(null, mine.id)} message="¿Retirar tu aporte? Se libera el cupo." variant="ghost">Retirar</ConfirmForm>}
                  </div>)}
                {user && !owner && open && n.status === "abierta" && (!mine || ["retirada", "rechazada", "pendiente", "aceptada"].includes(mine.status)) && (<details className="rounded-xl border border-line">
                    <summary className="min-h-11 cursor-pointer px-4 py-2.5 font-bold text-monte">{mine && mine.status !== "retirada" && mine.status !== "rechazada" ? "Cambiar mi aporte" : "Ofrecer ayuda"}</summary>
                    <div className="border-t border-line p-4">
                      <Form action={proposeCommitment.bind(null, n.id)} submit="Enviar propuesta" variant="secondary">
                        <Field label={`Cuántos ${n.unit} podés aportar`} name="qty" type="number" min={1} max={n.target} defaultValue={1} required/>
                        <Field label="Comentario (opcional)" name="note" maxLength={200}/>
                        <Check name="public_name">Mostrar mi nombre de pila entre quienes colaboran</Check>
                        <p className="text-sm text-ink-2">Tu propuesta no reserva cupo hasta que el organizador la acepte. Tu nombre y contacto solo los ve el organizador.</p>
                      </Form>
                    </div>
                  </details>)}

                {/* Organizador: gestión */}
                {owner && (<div className="grid gap-3 border-t border-line pt-3">
                    {list.length === 0 ? <p className="text-ink-2">Todavía no hay propuestas.</p> : (<ul className="grid gap-3">
                        {list.map((c) => (<li key={c.id} className="grid gap-2 rounded-xl bg-surface-2 p-3">
                            <p className="flex flex-wrap items-center gap-2"><b>{c.user_name}</b> propone <b>{c.proposed}</b> <Pill tone={CSTATUS[c.status][1]}>{CSTATUS[c.status][0]}</Pill>{c.note && <span className="text-ink-2">“{c.note}”</span>}</p>
                            {c.status === "pendiente" && open && (<div className="grid gap-3 sm:grid-cols-2">
                                <Form action={decideCommitment.bind(null, c.id, "accept")} submit="Aceptar" variant="primary"><Field label="Cantidad a aceptar" name="qty" type="number" min={1} max={c.proposed} defaultValue={c.proposed}/></Form>
                                <Form action={decideCommitment.bind(null, c.id, "reject")} submit="Rechazar" variant="secondary"><Field label="Motivo" name="reason" required/></Form>
                              </div>)}
                            {c.status === "aceptada" && (<Form action={confirmFulfillment.bind(null, c.id)} submit="Confirmar lo recibido" variant="secondary"><Field label={`Recibido en total (de ${c.accepted})`} name="qty" type="number" min={c.fulfilled} max={c.accepted} defaultValue={c.fulfilled}/></Form>)}
                            {c.status === "cumplida" && <p className="text-sm text-ink-2">Recibido: {c.fulfilled} de {c.accepted}.</p>}
                          </li>))}
                      </ul>)}
                    {open && (<details>
                        <summary className="min-h-10 cursor-pointer text-sm font-bold text-ink-2">Cambiar el objetivo</summary>
                        <div className="pt-2"><Form action={setNeedTarget.bind(null, n.id)} submit="Guardar objetivo" variant="secondary"><Field label="Nuevo objetivo" name="target" type="number" min={1} defaultValue={n.target}/><Field label="Motivo (obligatorio si lo ampliás)" name="reason"/></Form></div>
                      </details>)}
                  </div>)}
              </li>);
        })}
        </ul>
        {owner && open && (<Card className="grid gap-3">
            <h3 className="text-xl font-bold">Agregar una necesidad</h3>
            <Form action={addNeed.bind(null, ideaId)} submit="Agregar necesidad" resetOnOk>
              <Select label="Tipo" name="kind" options={NEED_KINDS.map((k) => ({ value: k.id, label: k.label }))}/>
              <Field label="Qué hace falta" name="description" required placeholder="Palas y carretillas para la jornada"/>
              <div className="grid gap-4 sm:grid-cols-3"><Field label="Cantidad" name="target" type="number" min={1} defaultValue={1} required/><Field label="Unidad" name="unit" placeholder="personas, unidades…"/><Field label="Plazo" name="deadline" type="date"/></div>
            </Form>
          </Card>)}
      </section>

      <section aria-labelledby="permisos" className="grid gap-3">
        <h2 id="permisos" className={h}>Permisos y gestiones</h2>
        {perms.length === 0 && <p className="text-ink-2">No hay permisos registrados.</p>}
        <ul className="grid gap-3">
          {perms.map((p) => (<li key={p.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
              <p className="flex flex-wrap items-center gap-2"><Landmark className="size-4 text-monte" aria-hidden/><b>{p.description}</b><Pill tone={p.status === "aprobado" ? "ok" : p.status === "rechazado" ? "err" : p.status === "en_revision" ? "info" : "warn"}>{{ pendiente: "Pendiente", en_revision: "En revisión municipal", aprobado: "Aprobado por la municipalidad", rechazado: "Rechazado" }[p.status]}</Pill></p>
              {p.reference && <p className="text-sm text-ink-2">Referencia: {p.reference}{p.decided_at ? ` · ${fmtDate(p.decided_at)}` : ""}</p>}
              {muni && (<details><summary className="min-h-10 cursor-pointer text-sm font-bold text-monte">Registrar decisión municipal</summary>
                  <div className="pt-2"><Form action={reviewPermission.bind(null, p.id)} submit="Guardar" variant="secondary"><Select label="Estado" name="status" defaultValue={p.status === "pendiente" ? "en_revision" : p.status} options={[{ value: "en_revision", label: "En revisión" }, { value: "aprobado", label: "Aprobado" }, { value: "rechazado", label: "Rechazado" }]}/><Field label="Referencia (expediente o resolución)" name="reference" defaultValue={p.reference ?? ""}/></Form></div>
                </details>)}
            </li>))}
        </ul>
        {perms.length > 0 && <p className="text-sm text-ink-2">Cargar una aprobación acá no reemplaza el trámite administrativo real.</p>}
        {owner && open && (<details className="rounded-xl border border-line"><summary className="min-h-11 cursor-pointer px-4 py-2.5 font-bold text-monte">Registrar que hace falta un permiso</summary>
            <div className="border-t border-line p-4"><Form action={addPermission.bind(null, ideaId)} submit="Registrar" variant="secondary" resetOnOk><Field label="Qué permiso o gestión" name="description" required placeholder="Autorización para usar el predio del ferrocarril"/></Form></div>
          </details>)}
      </section>

      <section aria-labelledby="novedades" className="grid gap-3">
        <h2 id="novedades" className={h}>Novedades de la idea</h2>
        {updates.length === 0 && <p className="text-ink-2">Todavía no hay novedades.</p>}
        <ul className="grid gap-2">{updates.map((u) => <li key={u.id} className="rounded-xl bg-surface-2 p-3"><p className="text-sm text-ink-2"><b className="capitalize text-ink">{u.kind}</b> · {u.author_name.split(" ")[0]} · {timeAgo(u.created_at)}</p><p>{u.body}</p></li>)}</ul>
        {owner && open && (<Form action={postIdeaUpdate.bind(null, ideaId)} submit="Publicar novedad" variant="secondary" resetOnOk>
            <Select label="Tipo" name="kind" options={[{ value: "novedad", label: "Novedad" }, { value: "actividad", label: "Fecha y lugar de una actividad" }]}/>
            <TextArea label="Qué querés contar" name="body" rows={2} required maxLength={600} hint="Se avisa a quienes se sumaron. Usá lugares aproximados, sin domicilios."/>
          </Form>)}
      </section>

      {owner && open && (<Card className="grid gap-3 border-monte">
          <h2 className={h}>Cerrar la idea</h2>
          <p className="text-ink-2">Apoyos o aportes alcanzados no cierran la idea solos: la cerrás vos, con una explicación.</p>
          <Form action={closeIdea.bind(null, ideaId)} submit="Cerrar la idea" variant="secondary">
            <Select label="¿Cómo termina?" name="action" options={[{ value: "realizada", label: "Se realizó" }, { value: "cancelada", label: "Se cancela" }]}/>
            <TextArea label="Explicá el cierre" name="closing" rows={3} required maxLength={600} hint="Si cancelás, los aportes ya cumplidos quedan registrados y las reservas sin cumplir se liberan."/>
            <Check name="publish">Si se realizó, publicar un agradecimiento en “Gracias, se resolvió”</Check>
            <PhotoInput max={3} label="Fotos del resultado"/>
          </Form>
        </Card>)}
    </div>);
}
