import type { Metadata } from "next";
import { Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listUsers } from "@/lib/data";
import { setUserRole, toggleSuspend } from "@/actions/panel";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Avatar, Pill } from "@/components/ui/bits";
import { btn } from "@/components/ui/Button";
import { inputCls } from "@/components/ui/Fields";
export const metadata: Metadata = { title: "Panel · Usuarios" };
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        q?: string;
    }>;
}) {
    const me = await requireRole(["moderador", "municipio"], "/panel/usuarios");
    const q = (await searchParams).q?.trim().slice(0, 60) || undefined;
    const users = await listUsers(q);
    const admin = me.role === "municipio";
    return (<div className="grid gap-6 py-8">
      <h1 className="text-4xl font-extrabold">Usuarios</h1>
      <form action="/panel/usuarios" role="search" className="relative max-w-xl">
        <label htmlFor="q" className="sr-only">Buscar usuario</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-2" aria-hidden/>
        <input id="q" name="q" defaultValue={q} placeholder="Nombre o email" className={cn(inputCls, "pl-12")}/>
      </form>
      <ul className="grid gap-3">
        {users.map((u) => (<li key={u.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
            <Avatar name={u.name} size={44}/>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-bold">{u.name} {u.suspended ? <Pill tone="err">Suspendido</Pill> : null}</p>
              <p className="truncate text-ink-2">{u.email} · {u.barrio ?? "Sin barrio"} · desde {fmtDate(u.created_at)}</p>
            </div>
            {admin && u.id !== me.id ? (<form action={setUserRole.bind(null, u.id)} className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`rol-${u.id}`}>Rol de {u.name}</label>
                <select id={`rol-${u.id}`} name="role" defaultValue={u.role} className={cn(inputCls, "min-h-10 w-auto py-1")}>
                  <option value="vecino">Vecino</option><option value="moderador">Moderador</option><option value="municipio">Municipalidad</option>
                </select>
                <button className={btn("secondary", "sm")}>Guardar</button>
              </form>) : (<Pill tone={u.role === "vecino" ? "neutral" : "info"}>{u.role === "vecino" ? "Vecino" : u.role === "moderador" ? "Moderador" : "Municipalidad"}</Pill>)}
            {u.role === "vecino" && (<form action={toggleSuspend.bind(null, u.id)}><button className={btn(u.suspended ? "secondary" : "danger", "sm")}>{u.suspended ? "Reactivar" : "Suspender"}</button></form>)}
          </li>))}
      </ul>
    </div>);
}
