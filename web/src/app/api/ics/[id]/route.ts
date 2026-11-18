import { NextResponse } from "next/server";
import { getPost } from "@/lib/data";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Archivo .ics para agregar un evento al calendario del teléfono (hora local de Argentina). */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  const p = Number.isInteger(id) ? getPost(id) : undefined;
  if (!p || p.category !== "evento" || !p.event_at) return new NextResponse("No encontrado", { status: 404 });
  const start = p.event_at.replace(/[-:]/g, "") + "00"; // 20261122T210000
  const [d, t] = [p.event_at.slice(0, 10), p.event_at.slice(11, 16)];
  const end = new Date(`${d}T${t}:00Z`);
  end.setUTCHours(end.getUTCHours() + 2);
  const endStr = end.toISOString().replace(/[-:]/g, "").slice(0, 15);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sampacho Conecta//ES",
    "BEGIN:VEVENT",
    `UID:evento-${p.id}@sampachoconecta`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=America/Argentina/Cordoba:${start}`,
    `DTEND;TZID=America/Argentina/Cordoba:${endStr}`,
    `SUMMARY:${esc(p.title)}`,
    `DESCRIPTION:${esc(p.body.slice(0, 400))}`,
    p.event_place ? `LOCATION:${esc(p.event_place)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="evento-${p.id}.ics"` },
  });
}
