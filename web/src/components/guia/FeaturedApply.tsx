import { Star } from "lucide-react";
import type { Listing } from "@/lib/data";
import { missingForFeatured, myApplication, recentlyFeatured } from "@/lib/featured";
import { fmtDate } from "@/lib/format";
import { applyFeatured } from "@/actions/operacion";
import { Form } from "@/components/ui/Form";
import { Select, TextArea } from "@/components/ui/Fields";
import { Card, Pill } from "@/components/ui/bits";
/** Postulación del dueño al «Destacado de la semana». Se explican las condiciones antes de postular. */
export async function FeaturedApply({ listing }: {
    listing: Listing;
}) {
    const missing = missingForFeatured(listing);
    const app = await myApplication(listing.id);
    const recent = await recentlyFeatured(listing.id);
    return (<Card className="grid gap-3">
      <h2 className="flex items-center gap-2 text-xl font-bold"><Star className="size-5 text-warn" aria-hidden/> Destacado de la semana</h2>
      {app ? (<p>Estás postulado para la semana del {fmtDate(app.week_start + " 00:00:00")} <Pill tone={app.status === "elegido" ? "ok" : "info"}>{app.status === "elegido" ? "Elegido" : "Postulado"}</Pill></p>) : missing.length > 0 ? (<p className="text-ink-2">Para postularte, completá tu ficha: falta {missing.join(", ")}.</p>) : recent ? (<p className="text-ink-2">Tu ficha fue destacada hace poco. Para que roten otros comercios, podés volver a postularte pasadas 4 semanas.</p>) : (<Form action={applyFeatured.bind(null, listing.id)} submit="Postular mi comercio" variant="secondary">
          <Select label="¿Para qué semana?" name="week" options={[{ value: "proxima", label: "La semana próxima" }, { value: "actual", label: "Esta semana (si todavía no hay destacado)" }]}/>
          <TextArea label="¿Por qué tu comercio merece destacarse?" name="pitch" rows={2} required minLength={10} maxLength={200}/>
          <p className="text-sm text-ink-2">Es gratis. Se elige entre quienes se postulan al que hace más tiempo no fue destacado.</p>
        </Form>)}
    </Card>);
}
