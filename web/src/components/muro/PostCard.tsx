import Link from "next/link";
import { BadgeCheck, CalendarDays, MapPin, MessageCircle } from "lucide-react";
import type { Post } from "@/lib/data";
import { postCategory } from "@/lib/constants";
import { clamp, eventParts, money, timeAgo } from "@/lib/format";
import { Avatar, Pill, Tag } from "@/components/ui/bits";
import { Photo } from "@/components/ui/Photo";
import { ShareButton } from "@/components/ui/ShareButton";
import { LikeButton } from "./LikeButton";
import { cn } from "@/lib/cn";

export function PostCard({ post, className }: { post: Post; className?: string }) {
  const cat = postCategory(post.category);
  const official = post.author_role === "municipio";
  const ev = post.event_at ? eventParts(post.event_at) : null;
  const sold = post.status === "sold";
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  // El estado se calcula al leer: un aviso vencido no figura como vigente aunque no haya corrido ninguna tarea.
  const state: { label: string; tone: "ok" | "warn" | "err" | "neutral" | "info" } | null =
    post.lifecycle === "cancelled"
      ? { label: "Cancelado", tone: "err" }
      : post.category === "aviso"
        ? post.ends_at && post.ends_at <= now
          ? { label: "Finalizado", tone: "neutral" }
          : post.severity === "urgente"
            ? { label: "Urgente", tone: "err" }
            : post.severity === "importante"
              ? { label: "Importante", tone: "warn" }
              : null
        : post.status === "resolved"
          ? { label: "Resuelto", tone: "ok" }
          : null;

  return (
    <article
      data-reveal
      className={cn(
        "group relative grid gap-3 rounded-2xl border bg-surface p-4 transition hover:shadow-[0_10px_30px_-18px_rgba(14,107,90,.6)] sm:p-5",
        post.category === "aviso" ? "border-monte" : "border-line",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={post.author_name} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate font-bold leading-tight">
            {post.author_name}
            {official && <BadgeCheck className="size-4 shrink-0 text-monte" aria-label="Cuenta oficial" />}
          </p>
          <p className="text-sm text-ink-2">{timeAgo(post.created_at)}</p>
        </div>
        {state && <Pill tone={state.tone}>{state.label}</Pill>}
        <Tag color={cat.color}>{cat.label}</Tag>
      </div>

      <div className="grid gap-1.5">
        <h3 className="text-xl font-bold leading-snug sm:text-2xl">
          <Link href={`/muro/${post.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-offset-4">
            {post.title}
          </Link>
        </h3>
        <p className="text-ink-2">{clamp(post.body, 200)}</p>
      </div>

      {post.photos[0] && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-surface-2">
          <Photo name={post.photos[0]} alt={`Foto de “${post.title}”`} className="transition duration-500 group-hover:scale-[1.03]" />
          {post.photos.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-ink/80 px-2.5 py-0.5 text-sm font-bold text-bg">+{post.photos.length - 1}</span>
          )}
        </div>
      )}

      {(post.price != null || ev) && (
        <div className="flex flex-wrap items-center gap-3">
          {post.price != null && (
            <span className={cn("font-display text-2xl font-extrabold", sold && "text-ink-2 line-through")}>{money(post.price)}</span>
          )}
          {sold && <span className="rounded-full bg-surface-2 px-3 py-0.5 text-sm font-bold">Vendido</span>}
          {post.condition && !sold && <span className="rounded-full bg-surface-2 px-3 py-0.5 text-sm font-bold capitalize">{post.condition}</span>}
          {ev && (
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 font-bold">
              <span className="inline-flex items-center gap-1.5 text-[#B83C78] dark:text-[#F08BB8]">
                <CalendarDays className="size-5" aria-hidden />
                <span className="capitalize">{ev.long}</span>
                {ev.time && <span>· {ev.time} h</span>}
              </span>
              {post.event_place && (
                <span className="inline-flex items-center gap-1.5 text-ink-2">
                  <MapPin className="size-4" aria-hidden /> {post.event_place}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      <div className="-mb-1 -ml-2 flex flex-wrap items-center gap-1 border-t border-line pt-2">
        <LikeButton postId={post.id} liked={!!post.liked} likes={post.likes} />
        <span className="inline-flex min-h-10 items-center gap-1.5 px-3 font-bold text-ink-2">
          <MessageCircle className="size-5" aria-hidden /> {post.comments}
          <span className="sr-only">comentarios</span>
        </span>
        <ShareButton path={`/muro/${post.id}`} title={post.title} className="ml-auto" label="" />
      </div>
    </article>
  );
}
