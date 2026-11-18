"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { audit, canModerate, getUser, requireUser } from "@/lib/auth";
import { BARRIOS, POST_CATEGORIES } from "@/lib/constants";
import { localToUtc, nowUtc } from "@/lib/format";
import { fanOutPost } from "@/lib/notify";
import { saveImages, UploadError } from "@/lib/uploads";
import { PHONE_RE, text, type FormState } from "@/lib/types";

const LOCAL_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const ids = POST_CATEGORIES.map((c) => c.id) as [string, ...string[]];

const postSchema = z.object({
  category: z.enum(ids, { message: "Elegí una categoría." }),
  title: z.string().min(3, "El título necesita al menos 3 letras.").max(120, "El título es muy largo (máximo 120)."),
  body: z.string().min(3, "Contá un poco más en el texto.").max(2000, "El texto es muy largo (máximo 2000)."),
});

export async function createPost(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/muro/nueva");
  const parsed = postSchema.safeParse({ category: text(fd, "category"), title: text(fd, "title"), body: text(fd, "body") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.category === "aviso" && user.role !== "municipio") return { error: "Solo la municipalidad publica avisos oficiales." };
  const recent = one<{ n: number }>(
    "SELECT COUNT(*) n FROM posts WHERE author_id = ? AND created_at > datetime('now','-1 day')",
    user.id,
  )?.n;
  if ((recent ?? 0) >= 10) return { error: "Llegaste al máximo de 10 publicaciones por día. Probá mañana." };

  let price: number | null = null;
  let condition: string | null = null;
  let eventAt: string | null = null;
  let eventPlace: string | null = null;
  let phone: string | null = null;
  let expires: string | null = null;
  const pinned: string | null = null;

  if (d.category === "venta") {
    price = Number(text(fd, "price").replace(",", "."));
    if (!Number.isFinite(price) || price < 0) return { error: "Escribí el precio con números, por ejemplo 85000." };
    condition = text(fd, "condition") === "nuevo" ? "nuevo" : "usado";
    expires = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 19).replace("T", " ");
  }
  if (d.category === "evento") {
    eventAt = text(fd, "event_at");
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(eventAt)) return { error: "Elegí la fecha y la hora del evento." };
    eventPlace = text(fd, "event_place") || null;
  }
  if (d.category === "venta" || d.category === "perdido" || d.category === "empleo") {
    phone = text(fd, "contact_phone");
    if (phone && !PHONE_RE.test(phone)) return { error: "El teléfono de contacto no parece válido." };
    if (d.category === "venta" && !phone) return { error: "Para vender, dejá un celular de contacto." };
  }
  let severity = "informativo";
  let zone: string | null = null;
  let startsAt: string | null = null;
  let endsAt: string | null = null;
  let eventEnd: string | null = null;
  if (d.category === "aviso" || d.category === "evento") {
    const z = text(fd, "zone");
    if (z) {
      if (!(BARRIOS as readonly string[]).includes(z)) return { error: "Elegí una zona de la lista." };
      zone = z;
    }
  }
  if (d.category === "evento") {
    const end = text(fd, "event_end_at");
    if (end) {
      if (!LOCAL_DT.test(end) || end <= eventAt!) return { error: "La hora de fin tiene que ser posterior al inicio del evento." };
      eventEnd = end;
    }
  }
  if (d.category === "aviso") {
    const sv = text(fd, "severity") || "informativo";
    if (!["informativo", "importante", "urgente"].includes(sv)) return { error: "Elegí el nivel del aviso." };
    severity = sv;
    const s = text(fd, "starts_at");
    const e = text(fd, "ends_at");
    if (s && !LOCAL_DT.test(s)) return { error: "Revisá la fecha de inicio." };
    if (e && !LOCAL_DT.test(e)) return { error: "Revisá la fecha de fin." };
    startsAt = s ? localToUtc(s) : null;
    endsAt = e ? localToUtc(e) : null;
    if (endsAt && endsAt <= nowUtc()) return { error: "La fecha de fin ya pasó: el aviso no se vería nunca." };
    if (startsAt && endsAt && endsAt <= startsAt) return { error: "El fin tiene que ser posterior al inicio." };
  }

  let photos: string[] = [];
  try {
    photos = await saveImages(fd.getAll("photos"), "p", 4);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  // El dato y los avisos a seguidores se confirman juntos; no hay llamadas de red dentro.
  const id = tx(() => {
    const r = run(
      `INSERT INTO posts (author_id,category,title,body,photos,price,condition,contact_phone,event_at,event_place,event_end_at,pinned_until,expires_at,starts_at,ends_at,severity,zone,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
      user.id, d.category, d.title, d.body, JSON.stringify(photos), price, condition, phone || null, eventAt, eventPlace, eventEnd, pinned, expires, startsAt, endsAt, severity, zone,
    );
    fanOutPost(r.id);
    return r.id;
  });
  revalidatePath("/muro");
  revalidatePath("/");
  revalidatePath("/agenda");
  redirect(`/muro/${id}`);
}

export async function toggleLike(postId: number): Promise<{ liked: boolean; likes: number } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Ingresá para dar me gusta." };
  const had = one("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?", postId, user.id);
  if (had) run("DELETE FROM likes WHERE post_id = ? AND user_id = ?", postId, user.id);
  else run("INSERT OR IGNORE INTO likes (post_id,user_id) VALUES (?,?)", postId, user.id);
  const likes = one<{ n: number }>("SELECT COUNT(*) n FROM likes WHERE post_id = ?", postId)?.n ?? 0;
  return { liked: !had, likes };
}

export async function addComment(kind: "post" | "idea", targetId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const body = text(fd, "body");
  if (body.length < 1) return { error: "Escribí un comentario." };
  if (body.length > 600) return { error: "El comentario es muy largo (máximo 600)." };
  const exists = kind === "post" ? one("SELECT 1 FROM posts WHERE id = ? AND deleted = 0", targetId) : one("SELECT 1 FROM ideas WHERE id = ?", targetId);
  if (!exists) return { error: "Esa publicación ya no existe." };
  run("INSERT INTO comments (kind,target_id,user_id,body) VALUES (?,?,?,?)", kind, targetId, user.id, body);
  revalidatePath(kind === "post" ? `/muro/${targetId}` : `/ideas/${targetId}`);
  revalidatePath(kind === "post" ? "/muro" : "/ideas");
  return { ok: "Comentario publicado." };
}

export async function deleteComment(commentId: number, path: string) {
  const user = await requireUser();
  const c = one<{ user_id: number }>("SELECT user_id FROM comments WHERE id = ?", commentId);
  if (!c) return;
  if (c.user_id !== user.id && !canModerate(user)) return;
  run("UPDATE comments SET hidden = 1 WHERE id = ?", commentId);
  if (c.user_id !== user.id) audit(user.id, "comment.hide", String(commentId));
  revalidatePath(path.startsWith("/") ? path : "/muro");
}

export async function deletePost(postId: number) {
  const user = await requireUser();
  const p = one<{ author_id: number }>("SELECT author_id FROM posts WHERE id = ?", postId);
  if (!p) return;
  if (p.author_id !== user.id && !canModerate(user)) return;
  run("UPDATE posts SET deleted = 1 WHERE id = ?", postId);
  if (p.author_id !== user.id) audit(user.id, "post.delete", String(postId));
  revalidatePath("/muro");
  revalidatePath("/");
  redirect("/muro");
}

export async function markSold(postId: number) {
  const user = await requireUser();
  const p = one<{ author_id: number; status: string }>("SELECT author_id, status FROM posts WHERE id = ?", postId);
  if (!p || p.author_id !== user.id) return;
  run("UPDATE posts SET status = ? WHERE id = ?", p.status === "sold" ? "active" : "sold", postId);
  revalidatePath(`/muro/${postId}`);
  revalidatePath("/muro");
}

export async function renewPost(postId: number) {
  const user = await requireUser();
  const p = one<{ author_id: number }>("SELECT author_id FROM posts WHERE id = ?", postId);
  if (!p || p.author_id !== user.id) return;
  run("UPDATE posts SET expires_at = datetime('now','+30 days') WHERE id = ? AND category = 'venta'", postId);
  revalidatePath(`/muro/${postId}`);
  revalidatePath("/muro");
}

const REASONS = ["Es spam o publicidad", "Contenido ofensivo", "Información falsa", "Es una estafa", "Otro motivo"];

export async function reportContent(kind: "post" | "comment" | "request", targetId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const reason = text(fd, "reason");
  if (!REASONS.includes(reason)) return { error: "Elegí un motivo." };
  const table = kind === "post" ? "posts" : kind === "request" ? "community_requests" : "comments";
  if (!one(`SELECT 1 FROM ${table} WHERE id = ?`, targetId)) return { error: "Ese contenido ya no existe." };
  tx(() => {
    run("INSERT OR IGNORE INTO reports (kind,target_id,user_id,reason) VALUES (?,?,?,?)", kind, targetId, user.id, reason);
    // RN-05: 3 denuncias de usuarios distintos ocultan el contenido hasta que lo revise un moderador.
    const n = one<{ n: number }>("SELECT COUNT(DISTINCT user_id) n FROM reports WHERE kind = ? AND target_id = ?", kind, targetId)?.n ?? 0;
    if (n >= 3) run(`UPDATE ${table} SET hidden = 1 WHERE id = ?`, targetId);
  });
  revalidatePath("/muro");
  return { ok: "Gracias. Un moderador lo va a revisar." };
}
