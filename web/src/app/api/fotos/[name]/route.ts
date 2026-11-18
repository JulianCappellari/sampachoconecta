import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { readImage } from "@/lib/uploads";

const NAME_RE = /^[pcli]-[0-9a-f-]{36}\.webp$/;

export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!NAME_RE.test(name)) return new NextResponse("No encontrado", { status: 404 });

  // Las fotos de reclamos son privadas: solo las ve el autor y el municipio (RN-01).
  const isClaim = name.startsWith("c-");
  if (isClaim) {
    const user = await getUser();
    if (!user) return new NextResponse("No autorizado", { status: 401 });
    const claim = one<{ user_id: number }>("SELECT user_id FROM claims WHERE photos LIKE ?", `%${name}%`);
    if (!claim || (claim.user_id !== user.id && user.role !== "municipio")) return new NextResponse("No autorizado", { status: 403 });
  }
  try {
    const buf = await readImage(name);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": isClaim ? "private, no-store" : "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}
