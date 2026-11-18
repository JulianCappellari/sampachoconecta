import { getWeather } from "@/lib/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getWeather();
  return Response.json(report, {
    // La caché del servicio limita consultas incluso ante requests simultáneos.
    // No guardar una respuesta en CDN y luego presentarla como recién consultada.
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
