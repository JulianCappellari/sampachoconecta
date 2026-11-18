import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Privacidad y datos" };

export default function Page() {
  const h = "mt-8 text-2xl font-bold";
  return (
    <Container narrow className="pb-8">
      <PageHeader title="Privacidad y datos" intro="Cómo cuidamos lo que nos confiás, de acuerdo con la Ley 25.326 de Protección de Datos Personales." />
      <div className="grid max-w-prose gap-3 py-6 text-lg">
        <h2 className={h}>Qué datos guardamos</h2>
        <p>Tu nombre, email, barrio y, si querés, tu celular. También lo que publicás: textos, fotos, comentarios, calificaciones y reclamos.</p>
        <h2 className={h}>Qué ven los demás</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Tu nombre aparece en lo que publicás y comentás.</li>
          <li>Tu celular solo se muestra si lo ponés en una venta, un aviso o tu ficha de comercio u oficio.</li>
          <li>Tu email nunca se muestra a otros vecinos.</li>
          <li>Tus reclamos los ven únicamente vos y la municipalidad. No aparecen en el muro ni en las búsquedas.</li>
        </ul>
        <h2 className={h}>Fotos</h2>
        <p>Antes de guardar una foto le quitamos los datos ocultos del archivo (EXIF), que pueden incluir la ubicación exacta donde se sacó.</p>
        <h2 className={h}>Tus derechos</h2>
        <p>Podés ver, corregir y pedir la eliminación de tus datos desde tu perfil o escribiéndole a la municipalidad. Al eliminar tu cuenta, tus datos personales se anonimizan.</p>
        <h2 className={h}>Contraseñas y seguridad</h2>
        <p>Tu contraseña se guarda cifrada y nadie, ni los administradores, puede verla. Nunca te la vamos a pedir por mensaje.</p>
      </div>
    </Container>
  );
}
