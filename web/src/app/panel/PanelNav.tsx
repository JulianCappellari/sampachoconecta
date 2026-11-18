"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function PanelNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Panel" className="-mx-4 mt-3 flex gap-1 overflow-x-auto border-b-2 border-ink px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      {items.map((i) => {
        const on = i.href === "/panel" ? path === "/panel" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cn("-mb-0.5 inline-flex min-h-12 shrink-0 items-center rounded-t-xl border-b-4 px-4 font-bold transition", on ? "border-monte bg-monte-soft text-monte" : "border-transparent text-ink-2 hover:text-ink")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
