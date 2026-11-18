"use client";

import { useState, type ReactNode } from "react";
import { Form } from "@/components/ui/Form";
import { Check, TextArea } from "@/components/ui/Fields";
import { PhotoInput } from "@/components/ui/PhotoInput";
import type { FormState } from "@/lib/types";

/**
 * Cierre con resultado opcional. Por defecto solo cierra; si elige publicar, muestra una vista previa
 * de cómo se verá el agradecimiento. Cerrar nunca obliga a publicar.
 */
export function CloseForm({
  action,
  title,
  submit,
  publishLabel = "Publicar un agradecimiento en “Gracias, se resolvió”",
  children,
  allowPublish = true,
  previewTitle,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  title: string;
  submit: string;
  publishLabel?: string;
  children?: ReactNode;
  allowPublish?: boolean;
  previewTitle?: string;
}) {
  const [publish, setPublish] = useState(false);
  const [txt, setTxt] = useState("");
  return (
    <div className="grid gap-4">
      <h3 className="text-xl font-bold">{title}</h3>
      <Form action={action} submit={submit}>
        {children}
        {allowPublish && (
          <>
            <Check name="publish" checked={publish} onChange={(e) => setPublish(e.target.checked)}>{publishLabel}</Check>
            {publish && (
              <div className="grid gap-4 rounded-2xl border border-line bg-surface-2 p-4">
                <TextArea label="¿Qué querés contar?" name="outcome" rows={3} maxLength={600} value={txt} onChange={(e) => setTxt(e.target.value)} hint="No incluyas teléfonos ni direcciones: el texto es público." />
                <PhotoInput max={3} label="Fotos del resultado" />
                <div aria-live="polite" className="rounded-xl bg-monte-soft p-3">
                  <p className="text-sm font-bold text-monte">Así se va a ver</p>
                  <p className="font-bold">{previewTitle ?? "Tu publicación"}</p>
                  <p className="text-ink-2">“{txt || "Tu agradecimiento aparece acá mientras escribís."}”</p>
                </div>
              </div>
            )}
            {!publish && <p className="text-sm text-ink-2">Con “solo cerrar” cambiamos el estado y no se publica nada nuevo.</p>}
          </>
        )}
      </Form>
    </div>
  );
}
