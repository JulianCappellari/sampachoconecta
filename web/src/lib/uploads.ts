import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { put, get, del, list } from "@vercel/blob";

export const IMAGE_NAME_RE = /^[pcli]-[0-9a-f-]{36}\.webp$/;
const MAX_BYTES = 8 * 1024 * 1024;
const localDir = () => path.resolve(process.env.SAMPACHO_DATA_DIR ?? path.join(process.cwd(), "data"), "uploads");
function requireLocal() {
  if (process.env.VERCEL || (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_UPLOADS !== "1")) throw new UploadError("Falta configurar el almacenamiento privado de fotos.");
}
export class UploadError extends Error {}

/** Un store privado para todas las fotos: ni siquiera conocer la URL permite leer un reclamo. */
export async function storeImage(name: string, buffer: Buffer): Promise<void> {
  if (!IMAGE_NAME_RE.test(name)) throw new UploadError("Nombre de foto inválido.");
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(name, buffer, { access: "private", addRandomSuffix: false, contentType: "image/webp", cacheControlMaxAge: name.startsWith("c-") ? 60 : 31536000 });
  } else {
    requireLocal();
    await fs.mkdir(localDir(), { recursive: true });
    await fs.writeFile(path.join(localDir(), name), buffer, { flag: "wx" });
  }
}

/** Valida, recomprime a WebP y quita EXIF. El cliente no sustituye esta validación. */
export async function saveImages(files: FormDataEntryValue[], prefix: "p" | "c" | "l" | "i", max: number) {
  const valid = files.filter((file): file is File => file instanceof File && file.size > 0);
  if (valid.length > max) throw new UploadError(`Podés subir hasta ${max} fotos.`);
  if (valid.reduce((sum, file) => sum + file.size, 0) > 3_200_000) throw new UploadError("Las fotos del envío son demasiado grandes. Elegí menos fotos o reducí su tamaño.");
  const names: string[] = [];
  try {
    for (const file of valid) {
      if (file.size > MAX_BYTES) throw new UploadError("Cada foto puede pesar hasta 8 MB antes de comprimir.");
      let buffer: Buffer;
      try {
        buffer = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      } catch { throw new UploadError("Una foto no se pudo leer. Probá con JPG o PNG."); }
      if (buffer.length > 2_000_000) throw new UploadError("Una foto sigue siendo demasiado grande. Probá con otra de menor resolución.");
      const name = `${prefix}-${randomUUID()}.webp`;
      await storeImage(name, buffer);
      names.push(name);
    }
    return names;
  } catch (error) {
    await deleteImages(names).catch(() => undefined);
    if (error instanceof UploadError) throw error;
    throw new UploadError("No pudimos guardar las fotos. Volvé a intentar en unos minutos.");
  }
}

export async function readImage(name: string): Promise<Buffer> {
  if (!IMAGE_NAME_RE.test(name)) throw new Error("Foto no encontrada");
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await get(name, { access: "private", useCache: !name.startsWith("c-") });
    if (!result || result.statusCode !== 200 || result.blob.size > 2_000_000) throw new Error("Foto no encontrada");
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  requireLocal();
  return fs.readFile(path.join(localDir(), name));
}

export async function deleteImages(names: string[]): Promise<void> {
  for (const name of names) {
    if (!IMAGE_NAME_RE.test(name)) throw new Error("Nombre de foto inválido");
    if (process.env.BLOB_READ_WRITE_TOKEN) await del(name);
    else { requireLocal(); await fs.unlink(path.join(localDir(), name)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; }); }
  }
}

/** Solo lo usa el comando administrativo explícito --reset --yes. No elimina objetos ajenos al formato de la app. */
export async function clearImages(): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    let cursor: string | undefined;
    do {
      const page = await list({ cursor, limit: 1000 });
      await deleteImages(page.blobs.filter(blob => IMAGE_NAME_RE.test(blob.pathname)).map(blob => blob.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } else {
    requireLocal();
    const names = await fs.readdir(localDir()).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return []; throw error; });
    await deleteImages(names.filter(name => IMAGE_NAME_RE.test(name)));
  }
}
