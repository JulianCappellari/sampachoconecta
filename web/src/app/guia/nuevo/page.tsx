import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SHOP_CATEGORIES, TRADE_CATEGORIES } from "@/lib/constants";
import { createListing } from "@/actions/guia";
import { DAY_NAMES } from "@/lib/format";
import { Form } from "@/components/ui/Form";
import { Check, Field, Select, TextArea } from "@/components/ui/Fields";
import { PhotoInput } from "@/components/ui/PhotoInput";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { Container, PageHeader } from "@/components/ui/bits";

export const metadata: Metadata = { title: "Sumar a la guía" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const kind = tipo === "oficio" ? "oficio" : "comercio";
  await requireUser(`/guia/nuevo?tipo=${kind}`);
  const trade = kind === "oficio";
  const days = [1, 2, 3, 4, 5, 6, 0];
  return (
    <Container narrow className="pb-8">
      <PageHeader
        title={trade ? "Ofrecer mi oficio" : "Sumar mi comercio"}
        back={{ href: trade ? "/oficios" : "/guia", label: trade ? "Oficios" : "Guía de comercios" }}
        intro={trade ? "Aparecé en el directorio para que los vecinos te encuentren y te califiquen." : "Tu comercio en el mapa, con teléfono, horarios y opiniones de los vecinos."}
      />
      <div className="py-8">
        <Form action={createListing.bind(null, kind)} submit="Publicar ficha" className="gap-6">
          <Field label={trade ? "Tu nombre o el de tu emprendimiento" : "Nombre del comercio"} name="name" required minLength={3} maxLength={80} />
          <Select label={trade ? "Oficio" : "Rubro"} name="category" options={trade ? TRADE_CATEGORIES : SHOP_CATEGORIES} placeholder="Elegí una opción" required />
          <TextArea label={trade ? "¿Qué trabajos hacés?" : "¿Qué ofrecés?"} name="description" rows={4} required minLength={10} maxLength={600} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono" name="phone" type="tel" required placeholder="3584 123456" />
            <Field label="WhatsApp" name="whatsapp" type="tel" placeholder="3584 123456" hint="Opcional. Con este número te escriben por WhatsApp." />
          </div>
          {trade ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Zona donde trabajás" name="zone" placeholder="Todo el pueblo" />
              <Field label="Matrícula" name="license" placeholder="Mat. 1234-E" hint="Opcional. Recomendada para gasistas y electricistas." />
              <div className="sm:col-span-2"><Check name="emergency">Atiendo urgencias</Check></div>
            </div>
          ) : (
            <>
              <Field label="Dirección" name="address" required placeholder="Mitre 310" />
              <LocationPicker label="Ubicación en el mapa" hint="Tocá el mapa donde está tu comercio, o usá tu ubicación si estás ahí." />
            </>
          )}
          <fieldset className="grid gap-3">
            <legend className="font-bold">Horario de atención</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Desde" name="open_time" type="time" defaultValue="08:00" />
              <Field label="Hasta" name="close_time" type="time" defaultValue="18:00" />
            </div>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <label key={d} className="has-[:checked]:border-monte has-[:checked]:bg-monte has-[:checked]:text-on-monte flex min-h-11 min-w-14 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-line bg-surface px-4 font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-cielo">
                  <input type="checkbox" name="days" value={d} defaultChecked={d >= 1 && d <= 5} className="sr-only" />
                  {DAY_NAMES[d]}
                </label>
              ))}
            </div>
          </fieldset>
          <PhotoInput max={4} label="Fotos" />
        </Form>
      </div>
    </Container>
  );
}
