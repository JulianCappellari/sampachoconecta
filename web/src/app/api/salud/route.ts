import { NextResponse } from "next/server";
import { one } from "@/lib/db";
export const dynamic = "force-dynamic";
/** Chequeo de salud para monitoreo: responde 200 si Postgres contesta. No expone datos. */
export async function GET() {
    try {
        await one("SELECT 1 AS ok");
        return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }
    catch {
        return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
}
