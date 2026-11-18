"use client";

import { Share2 } from "lucide-react";
import { cn } from "@/lib/cn";

/** Compartir por WhatsApp (o el menú de compartir del teléfono). */
export function ShareButton({ path, title, className, label = "Compartir" }: { path: string; title: string; className?: string; label?: string }) {
  return (
    <button
      type="button"
      className={cn("relative z-10 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-bold text-ink-2 transition hover:bg-surface-2", className)}
      onClick={async () => {
        const url = new URL(path, window.location.origin).toString();
        const text = `${title} — Sampacho Conecta`;
        if (navigator.share) {
          try {
            await navigator.share({ title, text, url });
            return;
          } catch {
            /* el vecino canceló */
          }
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener,noreferrer");
      }}
    >
      <Share2 className="size-5" aria-hidden />
      {label}
    </button>
  );
}
