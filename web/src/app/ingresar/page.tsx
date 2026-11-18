import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { safeNext } from "@/lib/types";
import { login } from "@/actions/auth";
import { Form } from "@/components/ui/Form";
import { Field } from "@/components/ui/Fields";
import { Container } from "@/components/ui/bits";
import { LogoMark } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Ingresar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect(safeNext(next));
  return (
    <Container narrow className="py-12 sm:py-20">
      <div className="mx-auto grid max-w-md gap-6">
        <div className="grid justify-items-start gap-3">
          <LogoMark size={52} />
          <h1 className="text-4xl font-extrabold">Ingresar</h1>
          <p className="text-ink-2">Entrá para publicar, calificar y hacer reclamos.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <Form action={login} submit="Ingresar" block>
            <input type="hidden" name="next" value={next ?? ""} />
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
          </Form>
        </div>
        <p className="text-ink-2">
          ¿Todavía no tenés cuenta?{" "}
          <Link href={`/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-monte underline">
            Registrate gratis
          </Link>
        </p>
      </div>
    </Container>
  );
}
