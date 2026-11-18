"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Ambulance, Flame, Phone, Shield, Siren, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { EMERGENCY_CONTACTS, EMERGENCY_SOURCE } from "@/lib/emergency";

const ICONS = { medical: Ambulance, fire: Flame, police: Shield };

export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const path = usePathname();

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div
      key={path}
      ref={root}
      className="emergency-access fixed z-[55] flex flex-col items-end gap-3"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label="Emergencias"
        title="Emergencias"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-12 items-center justify-center rounded-full bg-[#A62D25] text-white shadow-[0_6px_24px_-6px_rgba(0,0,0,.35)] transition-colors hover:bg-[#85221C]"
      >
        <Siren className="size-5" aria-hidden />
      </button>

      {open && (
        <section id={panelId} aria-label="Llamadas de emergencia" className="emergency-panel absolute bottom-[calc(100%+0.75rem)] right-0 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl bg-surface p-4 text-ink shadow-[0_12px_48px_-12px_rgba(0,0,0,.4)]" data-lenis-prevent>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">Llamá sin buscar</h2>
            <button type="button" aria-label="Cerrar emergencias" className="grid size-12 shrink-0 place-items-center rounded-xl hover:bg-surface-2" onClick={() => { setOpen(false); trigger.current?.focus(); }}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <ul className="grid gap-2">
            {EMERGENCY_CONTACTS.map((contact) => {
              const Icon = ICONS[contact.kind];
              return (
                <li key={contact.number}>
                  <a href={`tel:${contact.number}`} aria-label={`Llamar a ${contact.name}, ${contact.number}`} className="flex min-h-16 items-center gap-3 rounded-xl bg-surface-2 px-3 py-3 transition-colors hover:bg-monte-soft">
                    <Icon className="size-5 shrink-0 text-monte" aria-hidden />
                    <span className="min-w-0 flex-1"><span className="block text-sm font-bold leading-snug">{contact.name}</span><span className="font-display text-2xl font-bold tabular-nums">{contact.number}</span></span>
                    <Phone className="size-5 shrink-0 text-monte" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-ink-2">Elegí un servicio para abrir la llamada en tu teléfono.</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-monte">
            <Link href="/utiles" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center underline underline-offset-4">Todos los teléfonos</Link>
            <a href={EMERGENCY_SOURCE} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">Fuente municipal</a>
          </div>
        </section>
      )}
    </div>
  );
}
