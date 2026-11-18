"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/lib/types";
import { btn } from "./Button";
import { cn } from "@/lib/cn";
import { preparePhotos } from "@/lib/prepare-photos";

type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode;
  submit?: string;
  className?: string;
  /** Limpia los campos cuando la acción responde ok. */
  resetOnOk?: boolean;
  variant?: "primary" | "sun" | "wa" | "secondary";
  /** Botón de envío a lo ancho. */
  block?: boolean;
};

/**
 * Formulario con estado: muestra errores y confirmaciones del servidor sin perder lo que el
 * vecino escribió (React 19 limpia los campos tras cada acción; acá se evita enviando el FormData a mano).
 */
export function Form({ action, children, submit = "Guardar", className, resetOnOk, variant = "primary", block }: Props) {
  const [state, dispatch, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <form
      ref={ref}
      // Si se envía antes de que cargue el script, que nunca viaje por la URL (GET).
      method="post"
      className={cn("grid gap-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (preparing || pending) return;
        const fd = new FormData(e.currentTarget);
        const max = Number(e.currentTarget.querySelector<HTMLInputElement>('input[name="photos"]')?.dataset.maxFiles ?? 4);
        setClientError(null);
        setPreparing(true);
        void preparePhotos(fd, max).then(data => {
          startTransition(() => dispatch(data));
        }).catch((error: unknown) => {
          setClientError(error instanceof Error ? error.message : "No pudimos preparar el envío.");
        }).finally(() => setPreparing(false));
      }}
    >
      {children}
      <div aria-live="polite" className="grid gap-3">
        {(clientError || state?.error) && (
          <p role="alert" className="rounded-xl bg-err-soft px-4 py-3 font-bold text-err">
            {clientError || state?.error}
          </p>
        )}
        {!clientError && state?.ok && (
          <p role="status" className="rounded-xl bg-monte-soft px-4 py-3 font-bold text-monte">
            {state.ok}
          </p>
        )}
      </div>
      <ResetWatcher state={state} formRef={ref} enabled={!!resetOnOk} />
      <button type="submit" disabled={pending || preparing} className={btn(variant, "md", block ? "w-full" : "justify-self-start")}>
        {(pending || preparing) && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {preparing ? "Preparando fotos…" : pending ? "Enviando…" : submit}
      </button>
    </form>
  );
}

function ResetWatcher({ state, formRef, enabled }: { state: FormState; formRef: React.RefObject<HTMLFormElement | null>; enabled: boolean }) {
  useEffect(() => {
    if (enabled && state?.ok) formRef.current?.reset();
  }, [state, enabled, formRef]);
  return null;
}
