import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { BARRIOS } from "@/lib/constants";
import { claimsByUser, myListings } from "@/lib/data";
import { logout, updateProfile } from "@/actions/auth";
import { Form } from "@/components/ui/Form";
import { Check, Field, Select } from "@/components/ui/Fields";
import { Avatar, Card, Container, PageHeader, Pill, StatusPill } from "@/components/ui/bits";
import { Stars } from "@/components/ui/Stars";
import { btn } from "@/components/ui/Button";
export const metadata: Metadata = { title: "Mi perfil" };
const ROLE = { vecino: "Vecino", moderador: "Moderador", municipio: "Municipalidad" } as const;
export default async function Page() {
    const user = await requireUser("/perfil");
    const listings = await myListings(user.id);
    const claims = (await claimsByUser(user.id)).slice(0, 3);
    return (<Container className="pb-8">
      <PageHeader title="Mi perfil"/>
      <div className="grid gap-8 py-8 lg:grid-cols-[1fr_1.1fr]">
        <section className="grid content-start gap-5" aria-labelledby="datos">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size={64}/>
            <div>
              <h2 id="datos" className="text-2xl font-bold">{user.name}</h2>
              <p className="text-ink-2">{user.email}</p>
              <Pill tone="ok" className="mt-1">{ROLE[user.role]}</Pill>
            </div>
          </div>
          <Card>
            <Form action={updateProfile} submit="Guardar cambios">
              <Field label="Nombre y apellido" name="name" defaultValue={user.name} required/>
              <Field label="Celular" name="phone" type="tel" defaultValue={user.phone ?? ""} hint="Privado: solo lo ve quien vos elijas al publicar."/>
              <Select label="Barrio" name="barrio" options={BARRIOS} defaultValue={user.barrio ?? ""} placeholder="Elegí tu barrio" required/>
              <Check name="big_text" defaultChecked={!!user.big_text}>Usar letra más grande (20 % más)</Check>
            </Form>
          </Card>
          <form action={logout}>
            <button type="submit" className={btn("secondary")}>
              <LogOut className="size-5" aria-hidden/> Cerrar sesión
            </button>
          </form>
        </section>

        <div className="grid content-start gap-8">
          <section aria-labelledby="mis-reclamos" className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <h2 id="mis-reclamos" className="text-2xl font-bold">Mis reclamos</h2>
              <Link href="/reclamos" className="font-bold text-monte hover:underline">Ver todos</Link>
            </div>
            {claims.length === 0 ? (<p className="text-ink-2">Todavía no hiciste ningún reclamo.</p>) : (<ul className="grid gap-2">
                {claims.map((c) => (<li key={c.id}>
                    <Link href={`/reclamos/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-4 hover:border-monte">
                      <span><span className="font-bold">{c.category}</span> <span className="text-ink-2">· {c.number}</span></span>
                      <StatusPill status={c.status}/>
                    </Link>
                  </li>))}
              </ul>)}
          </section>

          <section aria-labelledby="mis-fichas" className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="mis-fichas" className="text-2xl font-bold">Mis comercios y oficios</h2>
              <div className="flex gap-2">
                <Link href="/guia/nuevo?tipo=comercio" className={btn("secondary", "sm")}>Sumar comercio</Link>
                <Link href="/guia/nuevo?tipo=oficio" className={btn("secondary", "sm")}>Ofrecer oficio</Link>
              </div>
            </div>
            {listings.length === 0 ? (<p className="text-ink-2">Todavía no tenés fichas. Sumá tu comercio o tu oficio para que te encuentren.</p>) : (<ul className="grid gap-2">
                {listings.map((l) => (<li key={l.id}>
                    <Link href={`/guia/${l.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-4 hover:border-monte">
                      <span><span className="font-bold">{l.name}</span> <span className="text-ink-2">· {l.category}</span></span>
                      {l.count >= 3 ? <span className="flex items-center gap-2"><Stars value={l.avg}/> <b>{l.avg.toFixed(1).replace(".", ",")}</b></span> : <Pill>Nuevo</Pill>}
                    </Link>
                  </li>))}
              </ul>)}
          </section>
        </div>
      </div>
    </Container>);
}
