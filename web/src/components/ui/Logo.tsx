import { cn } from "@/lib/cn";

/** Símbolo: pin de ubicación con tres vecinos conectados; uno es el girasol que se suma. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M32 3C18.7 3 8 13.6 8 26.8 8 44.2 32 61 32 61s24-16.8 24-34.2C56 13.6 45.3 3 32 3z" fill="var(--monte)" />
      <path d="M22.5 22.5 41.5 22.5 32 37Z" fill="none" stroke="var(--on-monte)" strokeWidth="3" strokeLinejoin="round" opacity=".9" />
      <circle cx="22.5" cy="22.5" r="6" fill="var(--on-monte)" />
      <circle cx="41.5" cy="22.5" r="6" fill="#F2B02A" />
      <circle cx="32" cy="37" r="6" fill="var(--on-monte)" />
    </svg>
  );
}

export function Logo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="font-display text-[1.35rem] leading-none tracking-tight">
        <b className="font-extrabold">Sampacho</b> <span className="font-medium text-monte">Conecta</span>
      </span>
    </span>
  );
}
