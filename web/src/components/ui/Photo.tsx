import { cn } from "@/lib/cn";

/** Foto guardada en el servidor (ya comprimida a WebP). */
export function Photo({ name, alt, className, eager }: { name: string; alt: string; className?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/fotos/${name}`} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className={cn("h-full w-full object-cover", className)} />
  );
}
