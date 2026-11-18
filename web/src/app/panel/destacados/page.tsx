import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { applicationsFor, weekStart } from "@/lib/featured";
import { chooseFeatured } from "@/actions/operacion";
import { fmtDate } from "@/lib/format";
import { btn } from "@/components/ui/Button";
import { Pill } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Panel · Destacados" };
export const dynamic = "force-dynamic";

export default async function Page() {
  await requireRole(["municipio"], "/panel/destacados");
  const weeks = [{ label: "Esta semana", w: weekStart() }, { label: "Semana próxima", w: weekStart(1) }];
  return (
    <div className="grid gap-8 py-8">
      <div className="grid gap-1"><h1 className="text-4xl font-extrabold">Destacado de la semana</h1><p className="max-w-2xl text-ink-2">Si no elegís a nadie, la app elige entre quienes se postularon al comercio que hace más tiempo no fue destacado. Podés cambiar la elección cuando quieras.</p></div>
      {weeks.map(({ label, w }) => {
        const apps = applicationsFor(w);
        return (
          <section key={w} aria-labelledby={`w-${w}`} className="grid gap-3">
            <h2 id={`w-${w}`} className="text-2xl font-bold">{label} <span className="font-normal text-ink-2">(desde el {fmtDate(w + " 00:00:00")})</span></h2>
            {apps.length === 0 ? <p className="text-ink-2">Nadie se postuló todavía.</p> : (
              <ul className="grid gap-3">
                {apps.map((a) => (
                  <li key={a.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-2"><Link href={`/guia/${a.listing_id}`} className="text-xl font-bold hover:underline">{a.listing_name}</Link>{a.status === "elegido" && <Pill tone="ok">Elegido</Pill>}<span className="text-sm text-ink-2">{a.last_featured ? `Último destacado: ${fmtDate(a.last_featured + " 00:00:00")}` : "Nunca fue destacado"}</span></div>
                    <p className="text-ink-2">“{a.pitch}”</p>
                    {a.status !== "elegido" && <form action={chooseFeatured.bind(null, a.id)}><button className={btn("secondary", "sm")}>Elegir este</button></form>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
