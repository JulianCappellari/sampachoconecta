"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing } from "lucide-react";
import { setFollow } from "@/actions/seguir";
import { cn } from "@/lib/cn";

/** Seguir / Dejar de seguir un tema, zona o comercio. Envía el estado deseado, no un toggle. */
export function FollowButton({ type, id, following, loggedIn, label, className }: { type: "tema" | "zona" | "ficha"; id: string; following: boolean; loggedIn: boolean; label?: string; className?: string }) {
  const [on, setOn] = useState(following);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!loggedIn) return router.push(`/ingresar?next=${encodeURIComponent(location.pathname)}`);
          const want = !on;
          setOn(want);
          const r = await setFollow(type, id, want);
          if ("error" in r) setOn(!want);
          else setOn(r.following);
        })
      }
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 font-bold transition",
        on ? "border-monte bg-monte-soft text-monte" : "border-line bg-surface hover:border-monte",
        className,
      )}
    >
      {on ? <BellRing className="size-4" aria-hidden /> : <Bell className="size-4" aria-hidden />}
      {label ?? (on ? "Siguiendo" : "Seguir")}
    </button>
  );
}
