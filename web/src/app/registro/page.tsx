import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { BARRIOS } from "@/lib/constants";
import { safeNext } from "@/lib/types";
import { register } from "@/actions/auth";
import { Form } from "@/components/ui/Form";
import { Check, Field, Select } from "@/components/ui/Fields";
import { Container } from "@/components/ui/bits";
import { LogoMark } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect(safeNext(next));
  return (
    <Container narrow className="py-12 sm:py-20">
      <div className="mx-auto grid max-w-md gap-6">
        <div className="grid justify-items-start gap-3">
          <LogoMark size={52} />
          <h1 className="text-4xl font-extrabold">Crear mi cuenta</h1>
          <p className="text-ink-2">Es gratis y lleva un minuto.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <Form action={register} submit="Crear mi cuenta" block>
            <input type="hidden" name="next" value={next ?? ""} />
            <Field label="Nombre y apellido" name="name" autoComplete="name" required minLength={2} />
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <Field label="Celular" name="phone" type="tel" autoComplete="tel" placeholder="3584 123456" hint="Opcional. No se muestra a otros vecinos, salvo que lo pongas en una venta o en tu ficha." />
            <Select label="Barrio" name="barrio" options={BARRIOS} placeholder="Elegí tu barrio" required />
            <Field label="Contraseña" name="password" type="password" autoComplete="new-password" required minLength={8} hint="Mínimo 8 caracteres." />
            <Check name="terms">
              Acepto la{" "}
              <Link href="/privacidad" className="font-bold text-monte underline" target="_blank">
                política de privacidad
              </Link>
              .
            </Check>
          </Form>
        </div>
        <p className="text-ink-2">
          ¿Ya tenés cuenta?{" "}
          <Link href={`/ingresar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-monte underline">
            Ingresá
          </Link>
        </p>
      </div>
    </Container>
  );
}
