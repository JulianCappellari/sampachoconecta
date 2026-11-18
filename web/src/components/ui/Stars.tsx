"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Estrellas de solo lectura, con relleno parcial para promedios. */
export function Stars({ value, size = 18, className }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  const row = (fill: string) => (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} width={size} height={size} fill={fill} stroke="none" aria-hidden />
      ))}
    </span>
  );
  return (
    <span role="img" aria-label={`${value.toFixed(1).replace(".", ",")} de 5 estrellas`} className={cn("relative inline-block leading-none", className)}>
      <span className="text-line">{row("currentColor")}</span>
      <span className="absolute inset-y-0 left-0 overflow-hidden text-girasol" style={{ width: `${pct}%` }}>
        {row("currentColor")}
      </span>
    </span>
  );
}

/** Selector de 1 a 5 estrellas (radios accesibles). */
export function StarInput({ name = "stars", defaultValue = 0 }: { name?: string; defaultValue?: number }) {
  const [v, setV] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || v;
  const labels = ["Malo", "Regular", "Bueno", "Muy bueno", "Excelente"];
  return (
    <fieldset className="grid gap-1">
      <legend className="font-bold">Tu calificación</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-cielo" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} checked={v === n} onChange={() => setV(n)} className="sr-only" required />
            <span className="sr-only">
              {n} {n === 1 ? "estrella" : "estrellas"}: {labels[n - 1]}
            </span>
            <Star
              aria-hidden
              className={cn("size-9 transition-transform", n <= shown ? "scale-105 text-girasol" : "text-line")}
              fill="currentColor"
              stroke="none"
            />
          </label>
        ))}
        <span className="ml-2 min-w-24 font-bold text-ink-2" aria-hidden>
          {shown ? labels[shown - 1] : ""}
        </span>
      </div>
    </fieldset>
  );
}
