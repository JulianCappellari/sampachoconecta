"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleLike } from "@/actions/muro";
import { cn } from "@/lib/cn";

export function LikeButton({ postId, liked, likes }: { postId: number; liked: boolean; likes: number }) {
  const [state, setState] = useState({ liked, likes });
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={state.liked}
      aria-label={state.liked ? "Quitar me gusta" : "Dar me gusta"}
      onClick={() =>
        start(async () => {
          // Respuesta inmediata; el servidor confirma el número real.
          setState((s) => ({ liked: !s.liked, likes: s.likes + (s.liked ? -1 : 1) }));
          const r = await toggleLike(postId);
          if ("error" in r) {
            setState({ liked, likes });
            router.push("/ingresar");
          } else setState(r);
        })
      }
      className={cn(
        "relative z-10 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-bold transition hover:bg-surface-2",
        state.liked ? "text-err" : "text-ink-2",
      )}
    >
      <Heart className={cn("size-5", state.liked && "pop")} fill={state.liked ? "currentColor" : "none"} aria-hidden />
      {state.likes}
    </button>
  );
}
