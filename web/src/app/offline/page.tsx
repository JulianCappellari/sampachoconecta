import type { Metadata } from "next";
import { Phone, WifiOff } from "lucide-react";
import { EMERGENCY_CONTACTS } from "@/lib/emergency";
import { ExtLink } from "@/components/ui/Button";
import { Container, PageHeader } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Sin conexión" };

/** Pantalla que se muestra sin señal. Es estática: los teléfonos de emergencia siempre están a mano. */
export default function Page() {
  return (
    <Container narrow className="pb-8">
      <PageHeader title="Sin conexión" intro="No hay señal en este momento. Cuando vuelva, todo se actualiza solo." />
      <div className="grid gap-6 py-8">
        <p className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4"><WifiOff className="mt-0.5 size-5 shrink-0" aria-hidden /> Podés seguir usando los teléfonos de emergencia, y las páginas de teléfonos, agenda, residuos y visitar que abriste antes.</p>
        <ul className="grid gap-3">
          {EMERGENCY_CONTACTS.map((c) => (
            <li key={c.number}>
              <ExtLink href={`tel:${c.number}`} variant="secondary" size="lg" className="w-full justify-between rounded-2xl py-4">
                <span>{c.name}</span>
                <span className="inline-flex items-center gap-2 font-display text-2xl font-extrabold text-monte"><Phone className="size-5" aria-hidden /> {c.number}</span>
              </ExtLink>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
