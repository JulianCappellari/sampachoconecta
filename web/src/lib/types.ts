export type FormState = { error?: string; ok?: string } | null;

export const text = (fd: FormData, name: string): string => {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
};

/** Solo rutas internas: evita redirecciones a otros sitios. */
export const safeNext = (next: string | null | undefined, fallback = "/"): string =>
  next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;

export const PHONE_RE = /^[\d\s+()-]{8,20}$/;
