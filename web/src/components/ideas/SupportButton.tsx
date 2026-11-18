"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandHeart } from "lucide-react";
import { toggleSupport } from "@/actions/ideas";
import { btn } from "@/components/ui/Button";

export function SupportButton({ ideaId, joined, supports, size = "md" }: { ideaId: number; joined: boolean; supports: number; size?: "sm" | "md" | "lg" }) {
  const [s, setS] = useState({ joined, supports });
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={s.joined}
      onClick={() =>
        start(async () => {
          setS((x) => ({ joined: !x.joined, supports: x.supports + (x.joined ? -1 : 1) }));
          const r = await toggleSupport(ideaId);
          if ("error" in r) {
            setS({ joined, supports });
            router.push(`/ingresar?next=/ideas/${ideaId}`);
            return;
          }
          setS(r);
          router.refresh();
        })
      }
      className={btn(s.joined ? "secondary" : "sun", size, "relative z-10")}
    >
      <HandHeart className="size-5" aria-hidden />
      {s.joined ? "Ya me sumé" : "Me sumo"} · {s.supports}
    </button>
  );
}
