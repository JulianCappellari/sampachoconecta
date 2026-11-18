import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { claimStatus } from "@/lib/constants";

export const Container = ({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) => (
  <div className={cn("mx-auto w-full px-4 sm:px-6", narrow ? "max-w-3xl" : "max-w-6xl", className)}>{children}</div>
);

export function PageHeader({
  title,
  intro,
  actions,
  back,
}: {
  title: string;
  intro?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="grid gap-3 border-b-2 border-ink pb-5 pt-8 sm:pt-12" data-reveal>
      {back && (
        <Link href={back.href} className="w-fit font-bold text-monte hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-balance text-4xl font-extrabold sm:text-5xl">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {intro && <p className="max-w-2xl text-lg text-ink-2">{intro}</p>}
    </header>
  );
}

export function EmptyState({ title, text, action, icon: Icon }: { title: string; text: string; action?: ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="grid justify-items-start gap-3 rounded-2xl border-[1.5px] border-dashed border-line bg-surface px-6 py-10">
      {Icon && <span className="grid size-12 place-items-center rounded-xl bg-monte-soft text-monte"><Icon className="size-6" /></span>}
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="max-w-lg text-ink-2">{text}</p>
      {action}
    </div>
  );
}

const tone: Record<string, string> = {
  neutral: "bg-surface-2 text-ink-2",
  info: "bg-cielo-soft text-cielo",
  warn: "bg-girasol-soft text-warn",
  ok: "bg-monte-soft text-ok",
  err: "bg-err-soft text-err",
};

export function Pill({ children, tone: t = "neutral", className }: { children: ReactNode; tone?: keyof typeof tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold", tone[t], className)}>
      <span aria-hidden className="size-2 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = claimStatus(status);
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function Tag({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold text-white" style={{ background: color }}>
      {children}
    </span>
  );
}

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("rounded-2xl border border-line bg-surface p-5", className)}>{children}</div>
);

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full bg-monte-soft font-display font-bold text-monte"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
