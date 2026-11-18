import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { claimStatus } from "@/lib/constants";
import { panelStats } from "@/lib/data";
import { listIncidents, overdueClaims } from "@/lib/incidents";
import { Card } from "@/components/ui/bits";
export const metadata: Metadata = { title: "Panel · Resumen" };
export const dynamic = "force-dynamic";
function Bars({ rows, tone }: {
    rows: {
        label: string;
        n: number;
    }[];
    tone?: string;
}) {
    const max = Math.max(1, ...rows.map((r) => r.n));
    if (!rows.length)
        return <p className="text-ink-2">Sin datos todavía.</p>;
    return (<ul className="grid gap-2.5">
      {rows.map((r) => (<li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3">
          <span className="truncate font-bold">{r.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full" style={{ width: `${(r.n / max) * 100}%`, background: tone ?? "var(--monte)" }}/></span>
          <span className="text-right font-display font-extrabold tabular-nums">{r.n}</span>
        </li>))}
    </ul>);
}
export default async function Page() {
    const user = await requireRole(["moderador", "municipio"], "/panel");
    if (user.role !== "municipio")
        redirect("/panel/moderacion");
    const s = await panelStats();
    const overdue = await overdueClaims();
    const activeIncidents = (await listIncidents()).filter((i) => i.status === "activo").length;
    const kpi = [
        { label: "Reclamos abiertos", v: s.openClaims, href: "/panel/reclamos" },
        { label: "Actualizaciones vencidas", v: overdue.length, href: "/panel/reclamos", sub: overdue[0] ? `La más antigua: ${overdue[0].number}` : "Todo al día" },
        { label: "Incidentes activos", v: activeIncidents, href: "/panel/incidentes" },
        { label: "Denuncias por revisar", v: s.openReports, href: "/panel/moderacion" },
        { label: "Vecinos registrados", v: s.users, href: "/panel/usuarios", sub: `${s.newUsers7} nuevos esta semana` },
        { label: "Días promedio de resolución", v: s.avgDays == null ? "—" : s.avgDays.toFixed(1).replace(".", ","), href: "/panel/reclamos" },
    ];
    return (<div className="grid gap-8 py-8">
      <h1 className="text-4xl font-extrabold">Resumen</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpi.map((k) => (<li key={k.label}>
            <Link href={k.href} className="grid h-full content-between gap-3 rounded-2xl border border-line bg-surface p-5 transition hover:border-monte">
              <span className="font-bold text-ink-2">{k.label}</span>
              <span className="font-display text-5xl font-extrabold">{k.v}</span>
              {k.sub && <span className="text-sm text-ink-2">{k.sub}</span>}
            </Link>
          </li>))}
      </ul>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="grid content-start gap-4"><h2 className="text-xl font-bold">Reclamos por estado</h2><Bars rows={s.byStatus.map((r) => ({ label: claimStatus(r.status).label, n: r.n }))}/></Card>
        <Card className="grid content-start gap-4"><h2 className="text-xl font-bold">Reclamos por categoría</h2><Bars rows={s.byCategory.map((r) => ({ label: r.category, n: r.n }))} tone="var(--cielo)"/></Card>
        <Card className="grid content-start gap-4"><h2 className="text-xl font-bold">Reclamos por barrio</h2><Bars rows={s.byBarrio.map((r) => ({ label: r.barrio, n: r.n }))} tone="var(--girasol)"/></Card>
      </div>
    </div>);
}
