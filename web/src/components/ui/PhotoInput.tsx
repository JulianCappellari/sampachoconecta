"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";

/** Selector de fotos con vista previa. El servidor las comprime y quita los datos EXIF. */
export function PhotoInput({ max = 4, label = "Fotos", hint }: { max?: number; label?: string; hint?: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  return (
    <div className="grid gap-1.5">
      <label htmlFor="photos" className="font-bold">
        {label} <span className="font-normal text-ink-2">(opcional, hasta {max})</span>
      </label>
      <label
        htmlFor="photos"
        className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-line bg-surface px-4 py-4 text-center text-ink-2 transition hover:border-monte hover:bg-monte-soft hover:text-monte"
      >
        <ImagePlus className="size-7" aria-hidden />
        <span className="font-bold">{urls.length ? `${urls.length} ${urls.length === 1 ? "foto elegida" : "fotos elegidas"}` : "Tocá para elegir fotos"}</span>
      </label>
      <input
        id="photos"
        name="photos"
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).slice(0, max);
          setUrls(files.map((f) => URL.createObjectURL(f)));
        }}
      />
      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {urls.map((u) => (
            <li key={u}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="Vista previa" className="size-20 rounded-lg object-cover" />
            </li>
          ))}
        </ul>
      )}
      {hint && <p className="text-sm text-ink-2">{hint}</p>}
    </div>
  );
}
