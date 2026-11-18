import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { UPLOAD_DIR } from "./db";

const MAX_BYTES = 8 * 1024 * 1024;

export class UploadError extends Error {}

/**
 * Valida, comprime (WebP, máx. 1600 px) y guarda las fotos. sharp descarta los metadatos EXIF,
 * que podrían revelar la ubicación de una casa. Devuelve los nombres de archivo guardados.
 * prefix: p = publicación, c = reclamo (privado), l = ficha, i = idea.
 */
export async function saveImages(files: FormDataEntryValue[], prefix: "p" | "c" | "l" | "i", max: number) {
  const valid = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (valid.length > max) throw new UploadError(`Podés subir hasta ${max} fotos.`);
  const out: string[] = [];
  for (const f of valid) {
    if (f.size > MAX_BYTES) throw new UploadError("Cada foto puede pesar hasta 8 MB.");
    const buf = Buffer.from(await f.arrayBuffer());
    const name = `${prefix}-${randomUUID()}.webp`;
    try {
      await sharp(buf)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(path.join(UPLOAD_DIR, name));
    } catch {
      throw new UploadError("Una de las fotos no se pudo leer. Probá con un archivo JPG o PNG.");
    }
    out.push(name);
  }
  return out;
}

export async function readImage(name: string) {
  return fs.readFile(path.join(UPLOAD_DIR, name));
}
