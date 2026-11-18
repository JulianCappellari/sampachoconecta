import { NextResponse, type NextRequest } from "next/server";

/** Solo las respuestas anónimas pueden guardarse como páginas públicas sin conexión. */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Sampacho-Offline-Public", request.cookies.has("sc_session") ? "0" : "1");
  return response;
}
export const config = { matcher: ["/utiles", "/agenda", "/residuos", "/visitar", "/transparencia", "/privacidad"] };
