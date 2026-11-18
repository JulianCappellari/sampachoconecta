import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "sun" | "wa" | "ghost" | "danger";
type Size = "md" | "sm" | "lg";

const V: Record<Variant, string> = {
  primary: "bg-monte text-on-monte hover:brightness-110",
  secondary: "border-[1.5px] border-line bg-surface text-ink hover:bg-surface-2",
  sun: "bg-girasol text-on-girasol hover:brightness-105",
  wa: "bg-wa text-white hover:brightness-110",
  ghost: "text-monte hover:bg-monte-soft",
  danger: "bg-err-soft text-err hover:brightness-95",
};
const S: Record<Size, string> = {
  sm: "min-h-10 px-3.5 text-[0.95rem]",
  md: "min-h-12 px-5",
  lg: "min-h-14 px-7 text-lg",
};

export const btn = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-xl font-bold transition duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-60",
    V[variant],
    S[size],
    extra,
  );

export function Button({
  variant,
  size,
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={btn(variant, size, className)} {...p} />;
}

export function LinkButton({
  variant,
  size,
  className,
  ...p
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={btn(variant, size, className)} {...p} />;
}

/** Enlace externo (llamar, WhatsApp, mapas). */
export function ExtLink({
  variant,
  size,
  className,
  ...p
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }) {
  const external = p.href?.startsWith("http");
  return (
    <a
      className={btn(variant, size, className)}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...p}
    />
  );
}
