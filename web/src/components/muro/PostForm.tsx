"use client";

import { useState } from "react";
import { createPost } from "@/actions/muro";
import { BARRIOS, POST_CATEGORIES } from "@/lib/constants";
import { Form } from "@/components/ui/Form";
import { Check, Field, Select, TextArea } from "@/components/ui/Fields";
import { PhotoInput } from "@/components/ui/PhotoInput";

export function PostForm({ isMunicipio, initial }: { isMunicipio: boolean; initial?: string }) {
  const cats = POST_CATEGORIES.filter((c) => c.id !== "aviso" || isMunicipio);
  const [cat, setCat] = useState(cats.some((c) => c.id === initial) ? initial! : "noticia");

  return (
    <Form action={createPost} submit="Publicar" className="gap-5">
      <Select
        label="¿Qué querés publicar?"
        name="category"
        value={cat}
        onChange={(e) => setCat(e.target.value)}
        options={cats.map((c) => ({ value: c.id, label: c.label }))}
      />
      <Field
        label="Título"
        name="title"
        required
        minLength={3}
        maxLength={120}
        placeholder={cat === "venta" ? "Bicicleta rodado 26 en buen estado" : cat === "evento" ? "Cena a beneficio del club" : "Un título corto y claro"}
      />
      <TextArea label="Contá los detalles" name="body" required minLength={3} maxLength={2000} />

      {cat === "venta" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Precio en pesos" name="price" inputMode="numeric" required placeholder="85000" />
          <Select label="Estado" name="condition" options={[{ value: "usado", label: "Usado" }, { value: "nuevo", label: "Nuevo" }]} />
          <div className="sm:col-span-2">
            <Field label="Celular de contacto" name="contact_phone" type="tel" required placeholder="3584 123456" hint="Los interesados te escriben por WhatsApp. Se muestra en esta publicación." />
          </div>
        </div>
      )}
      {cat === "evento" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha y hora de inicio" name="event_at" type="datetime-local" required />
          <Field label="Hora de fin" name="event_end_at" type="datetime-local" hint="Opcional. Sin hora de fin se muestra como evento de todo el día." />
          <Field label="Lugar" name="event_place" placeholder="Club Sportivo, Mitre 500" />
          <Select label="Zona" name="zone" placeholder="Todo el pueblo" options={BARRIOS} />
        </div>
      )}
      {(cat === "perdido" || cat === "empleo") && (
        <Field label="Celular de contacto" name="contact_phone" type="tel" placeholder="3584 123456" hint="Opcional. Se muestra en la publicación." />
      )}
      {cat === "aviso" && (
        <fieldset className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
          <legend className="px-1 font-bold">Vigencia y alcance del aviso</legend>
          <Select label="Nivel" name="severity" options={[{ value: "informativo", label: "Informativo" }, { value: "importante", label: "Importante" }, { value: "urgente", label: "Urgente" }]} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Empieza" name="starts_at" type="datetime-local" hint="Vacío: desde ahora." />
            <Field label="Termina" name="ends_at" type="datetime-local" hint="Vacío: sin fecha de fin. Pasada esa hora, el aviso deja de verse como vigente." />
          </div>
          <Select label="Zona" name="zone" placeholder="Todo el pueblo" options={BARRIOS} />
        </fieldset>
      )}
      <PhotoInput max={4} />
      {cat === "venta" && <Check name="ack" required>Las ventas vencen a los 30 días. Podés renovarlas o marcarlas como vendidas.</Check>}
    </Form>
  );
}
