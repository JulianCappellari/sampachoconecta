"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run } from "@/lib/db";
import { getUser, requireRole, requireUser } from "@/lib/auth";
import { IDEA_CATEGORIES } from "@/lib/constants";
import { saveImages, UploadError } from "@/lib/uploads";
import { text, type FormState } from "@/lib/types";

const schema = z.object({
  title: z.string().min(5, "El título necesita al menos 5 letras.").max(100, "El título es muy largo (máximo 100)."),
  body: z.string().min(20, "Explicá la idea en al menos 20 letras.").max(1500, "El texto es muy largo (máximo 1500)."),
  category: z.enum(IDEA_CATEGORIES, { message: "Elegí una categoría." }),
});

export async function createIdea(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/ideas/nueva");
  const parsed = schema.safeParse({ title: text(fd, "title"), body: text(fd, "body"), category: text(fd, "category") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let photo: string | null = null;
  try {
    photo = (await saveImages(fd.getAll("photos"), "i", 1))[0] ?? null;
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  const { id } = run("INSERT INTO ideas (author_id,title,body,category,photo) VALUES (?,?,?,?,?)", user.id, parsed.data.title, parsed.data.body, parsed.data.category, photo);
  run("INSERT INTO idea_supports (idea_id,user_id) VALUES (?,?)", id, user.id);
  revalidatePath("/ideas");
  redirect(`/ideas/${id}`);
}

export async function toggleSupport(ideaId: number): Promise<{ joined: boolean; supports: number } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Ingresá para sumarte." };
  const had = one("SELECT 1 FROM idea_supports WHERE idea_id = ? AND user_id = ?", ideaId, user.id);
  if (had) run("DELETE FROM idea_supports WHERE idea_id = ? AND user_id = ?", ideaId, user.id);
  else run("INSERT OR IGNORE INTO idea_supports (idea_id,user_id) VALUES (?,?)", ideaId, user.id);
  const supports = one<{ n: number }>("SELECT COUNT(*) n FROM idea_supports WHERE idea_id = ?", ideaId)?.n ?? 0;
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
  return { joined: !had, supports };
}

// RN-08: solo enlaces de invitación de WhatsApp. Se valida el host exacto con URL, no un prefijo de texto.
function validGroupLink(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.hostname !== "chat.whatsapp.com" || u.username || u.password || u.port) return null;
    const m = u.pathname.match(/^\/([A-Za-z0-9_-]{10,40})$/);
    return m ? `https://chat.whatsapp.com/${m[1]}` : null;
  } catch {
    return null;
  }
}

export async function setGroupLink(ideaId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const idea = one<{ author_id: number }>("SELECT author_id FROM ideas WHERE id = ?", ideaId);
  if (!idea || idea.author_id !== user.id) return { error: "Solo quien propuso la idea puede cargar el grupo." };
  const raw = text(fd, "group_link");
  const link = raw ? validGroupLink(raw) : "";
  if (!raw) {
    run("UPDATE ideas SET group_link = NULL WHERE id = ?", ideaId);
    revalidatePath(`/ideas/${ideaId}`);
    return { ok: "Quitamos el enlace del grupo." };
  }
  if (!link) return { error: "El enlace tiene que empezar con https://chat.whatsapp.com/ y ser una invitación de grupo." };
  run("UPDATE ideas SET group_link = ? WHERE id = ?", link, ideaId);
  revalidatePath(`/ideas/${ideaId}`);
  return { ok: "Listo. Los vecinos que se sumaron ya ven el botón del grupo." };
}

// «Realizada» y «cancelada» solo se alcanzan cerrando la idea con una explicación (ver closeIdea).
const statusIds = ["propuesta", "en_marcha"];

export async function setIdeaStatus(ideaId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const idea = one<{ author_id: number }>("SELECT author_id FROM ideas WHERE id = ?", ideaId);
  if (!idea || idea.author_id !== user.id) return { error: "Solo quien propuso la idea cambia su estado." };
  const status = text(fd, "status");
  if (!statusIds.includes(status)) return { error: "Elegí un estado." };
  run("UPDATE ideas SET status = ? WHERE id = ?", status, ideaId);
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
  return { ok: "Estado actualizado." };
}

export async function toggleMunicipal(ideaId: number) {
  await requireRole(["municipio"]);
  run("UPDATE ideas SET municipal = 1 - municipal WHERE id = ?", ideaId);
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath("/ideas");
}
