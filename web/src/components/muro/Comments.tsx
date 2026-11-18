import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { User } from "@/lib/auth";
import type { Comment } from "@/lib/data";
import { addComment, deleteComment } from "@/actions/muro";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/bits";
import { ConfirmForm } from "@/components/ui/ConfirmForm";
import { Form } from "@/components/ui/Form";
import { TextArea } from "@/components/ui/Fields";
import { btn } from "@/components/ui/Button";

export function Comments({ kind, targetId, comments, user, path }: { kind: "post" | "idea"; targetId: number; comments: Comment[]; user: User | null; path: string }) {
  const canModerate = user?.role === "moderador" || user?.role === "municipio";
  return (
    <section aria-labelledby="comentarios" className="grid gap-5">
      <h2 id="comentarios" className="text-2xl font-bold">
        Comentarios <span className="text-ink-2">({comments.length})</span>
      </h2>
      {comments.length === 0 && <p className="text-ink-2">Todavía no hay comentarios. Escribí el primero.</p>}
      <ul className="grid gap-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar name={c.author_name} size={40} />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-3">
              <p className="flex flex-wrap items-center gap-x-2 font-bold">
                {c.author_name}
                {c.author_role === "municipio" && <BadgeCheck className="size-4 text-monte" aria-label="Cuenta oficial" />}
                <span className="text-sm font-normal text-ink-2">{timeAgo(c.created_at)}</span>
              </p>
              <p className="whitespace-pre-line break-words">{c.body}</p>
              {(user?.id === c.user_id || canModerate) && (
                <div className="mt-1">
                  <ConfirmForm action={deleteComment.bind(null, c.id, path)} message="¿Eliminar este comentario?" variant="ghost">
                    Eliminar
                  </ConfirmForm>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {user ? (
        <Form action={addComment.bind(null, kind, targetId)} submit="Comentar" resetOnOk>
          <TextArea label="Tu comentario" name="body" rows={3} required maxLength={600} />
        </Form>
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-5">
          Para comentar,{" "}
          <Link href={`/ingresar?next=${encodeURIComponent(path)}`} className={btn("primary", "sm", "mx-1")}>
            ingresá a tu cuenta
          </Link>
        </p>
      )}
    </section>
  );
}
