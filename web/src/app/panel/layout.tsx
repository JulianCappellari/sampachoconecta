import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ensureOverdueReminders } from "@/lib/incidents";
import { Container } from "@/components/ui/bits";
import { PanelNav } from "./PanelNav";
export default async function Layout({ children }: {
    children: React.ReactNode;
}) {
    const user = await requireRole(["moderador", "municipio"], "/panel");
    const staff = user.role === "municipio";
    if (staff)
        await ensureOverdueReminders();
    const items = [
        ...(staff ? [{ href: "/panel", label: "Resumen" }, { href: "/panel/reclamos", label: "Reclamos" }, { href: "/panel/incidentes", label: "Incidentes" }] : []),
        { href: "/panel/contenido", label: "Contenido" },
        { href: "/panel/moderacion", label: "Denuncias" },
        { href: "/panel/usuarios", label: "Usuarios" },
        ...(staff ? [{ href: "/panel/utiles", label: "Útiles y farmacias" }, { href: "/panel/alertas", label: "Alertas" }, { href: "/panel/residuos", label: "Residuos" }, { href: "/panel/turismo", label: "Turismo" }, { href: "/panel/destacados", label: "Destacados" }, { href: "/encuestas/nueva", label: "Nueva encuesta" }] : []),
    ];
    return (<Container className="pb-8">
      <div className="pt-8 sm:pt-12">
        <p className="font-bold text-monte">Panel de gestión · {staff ? "Municipalidad" : "Moderación"}</p>
        <PanelNav items={items}/>
      </div>
      {children}
      <p className="pb-4 pt-8 text-sm text-ink-2"><Link href="/" className="font-bold text-monte hover:underline">← Volver al sitio</Link></p>
    </Container>);
}
