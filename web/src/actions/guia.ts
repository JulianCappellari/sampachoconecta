"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { one, run, tx } from "@/lib/db";
import { audit, canModerate, requireUser } from "@/lib/auth";
import { SHOP_CATEGORIES, TRADE_CATEGORIES } from "@/lib/constants";
import { saveImages, UploadError } from "@/lib/uploads";
import { PHONE_RE, text, type FormState } from "@/lib/types";

const base = {
  name: z.string().min(3, "Escribí el nombre (mínimo 3 letras).").max(80),
  description: z.string().min(10, "Contá a qué te dedicás en al menos 10 letras.").max(600, "La descripción es muy larga (máximo 600)."),
  phone: z.string().regex(PHONE_RE, "El teléfono debe tener entre 8 y 20 números."),
};

export async function createListing(kind: "comercio" | "oficio", _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(`/guia/nuevo?tipo=${kind}`);
  const cats = (kind === "comercio" ? SHOP_CATEGORIES : TRADE_CATEGORIES) as readonly string[];
  const parsed = z.object({ ...base, category: z.string().refine((c) => cats.includes(c), "Elegí un rubro de la lista.") }).safeParse({
    name: text(fd, "name"),
    description: text(fd, "description"),
    phone: text(fd, "phone"),
    category: text(fd, "category"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const whatsapp = text(fd, "whatsapp");
  if (whatsapp && !PHONE_RE.test(whatsapp)) return { error: "El WhatsApp no parece un número válido." };

  const address = text(fd, "address") || null;
  const zone = text(fd, "zone") || null;
  if (kind === "comercio" && !address) return { error: "Escribí la dirección del comercio." };
  const lat = parseFloat(text(fd, "lat"));
  const lng = parseFloat(text(fd, "lng"));
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  if (kind === "comercio" && !hasPoint) return { error: "Marcá el comercio en el mapa para que los vecinos lo encuentren." };

  const open = text(fd, "open_time");
  const close = text(fd, "close_time");
  const timeRe = /^\d{2}:\d{2}$/;
  if ((open && !timeRe.test(open)) || (close && !timeRe.test(close))) return { error: "Revisá los horarios." };
  const days = fd.getAll("days").map(String).filter((x) => /^[0-6]$/.test(x));

  if (kind === "comercio" && one("SELECT 1 FROM listings WHERE kind='comercio' AND deleted=0 AND lower(name)=lower(?) AND lower(address)=lower(?)", d.name, address)) {
    return { error: "Ya hay un comercio con ese nombre y dirección. Si es tuyo, pedí la titularidad a un moderador." };
  }
  let photos: string[] = [];
  try {
    photos = await saveImages(fd.getAll("photos"), "l", 4);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  const { id } = run(
    `INSERT INTO listings (kind,owner_id,category,name,description,address,zone,lat,lng,phone,whatsapp,open_time,close_time,open_days,license,emergency,photos)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    kind, user.id, d.category, d.name, d.description, address, zone,
    hasPoint ? lat : null, hasPoint ? lng : null, d.phone, whatsapp || null,
    open || null, close || null, days.join(",") || null,
    text(fd, "license") || null, fd.get("emergency") === "on" ? 1 : 0, JSON.stringify(photos),
  );
  revalidatePath("/guia");
  revalidatePath("/oficios");
  revalidatePath("/");
  redirect(`/guia/${id}?nuevo=1`);
}

export async function rateListing(listingId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(`/guia/${listingId}`);
  const l = one<{ owner_id: number }>("SELECT owner_id FROM listings WHERE id = ? AND deleted = 0", listingId);
  if (!l) return { error: "Esta ficha ya no existe." };
  // RN-03: el dueño no califica su propia ficha.
  if (l.owner_id === user.id) return { error: "No podés calificar tu propia ficha." };
  const stars = Number(text(fd, "stars"));
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Elegí de 1 a 5 estrellas." };
  const review = text(fd, "review");
  if (review.length > 500) return { error: "La reseña es muy larga (máximo 500)." };
  tx(() => {
    // RN-02: una sola calificación por vecino; si vuelve a calificar, se actualiza.
    run(
      `INSERT INTO ratings (listing_id,user_id,stars,review) VALUES (?,?,?,?)
       ON CONFLICT(listing_id,user_id) DO UPDATE SET stars = excluded.stars, review = excluded.review, created_at = datetime('now')`,
      listingId, user.id, stars, review || null,
    );
    run(
      `UPDATE listings SET avg = COALESCE((SELECT ROUND(AVG(stars),1) FROM ratings WHERE listing_id = ?),0),
       count = (SELECT COUNT(*) FROM ratings WHERE listing_id = ?) WHERE id = ?`,
      listingId, listingId, listingId,
    );
  });
  revalidatePath(`/guia/${listingId}`);
  revalidatePath("/guia");
  revalidatePath("/oficios");
  return { ok: "¡Gracias por tu calificación!" };
}

export async function replyRating(listingId: number, raterId: number, _: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const l = one<{ owner_id: number }>("SELECT owner_id FROM listings WHERE id = ?", listingId);
  if (!l || l.owner_id !== user.id) return { error: "Solo el dueño de la ficha puede responder." };
  const reply = text(fd, "reply");
  if (reply.length < 2 || reply.length > 400) return { error: "La respuesta debe tener entre 2 y 400 letras." };
  run("UPDATE ratings SET reply = ? WHERE listing_id = ? AND user_id = ?", reply, listingId, raterId);
  revalidatePath(`/guia/${listingId}`);
  return { ok: "Respuesta publicada." };
}

export async function verifyListing(listingId: number) {
  const user = await requireUser();
  if (!canModerate(user)) return;
  run("UPDATE listings SET verified = 1 - verified WHERE id = ?", listingId);
  audit(user.id, "listing.verify", String(listingId));
  revalidatePath(`/guia/${listingId}`);
  revalidatePath("/guia");
}

export async function deleteListing(listingId: number) {
  const user = await requireUser();
  const l = one<{ owner_id: number; kind: string }>("SELECT owner_id, kind FROM listings WHERE id = ?", listingId);
  if (!l || (l.owner_id !== user.id && !canModerate(user))) return;
  run("UPDATE listings SET deleted = 1 WHERE id = ?", listingId);
  if (l.owner_id !== user.id) audit(user.id, "listing.delete", String(listingId));
  revalidatePath("/guia");
  revalidatePath("/oficios");
  redirect(l.kind === "oficio" ? "/oficios" : "/guia");
}
