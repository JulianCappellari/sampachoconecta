const FILE_BUDGET = 750_000;
const REQUEST_BUDGET = 3_800_000;

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("No pudimos comprimir una foto.")), "image/jpeg", quality));
}

async function compress(file: File): Promise<File> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Cada foto puede pesar hasta 8 MB antes de comprimir.");
  if (!file.type.startsWith("image/")) throw new Error("Elegí archivos de imagen JPG, PNG o WebP.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error("No pudimos leer una foto. Probá con JPG o PNG."); });
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 50_000_000) throw new Error("La resolución de una foto es demasiado grande.");
    let scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Tu navegador no puede preparar fotos. Probá con otro navegador.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.65, 0.48]) {
        const blob = await encode(canvas, quality);
        if (blob.size <= FILE_BUDGET) return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
      }
      scale *= 0.75;
    }
    throw new Error("Una foto sigue siendo demasiado grande. Elegí otra o enviá menos fotos.");
  } finally { URL.revokeObjectURL(url); }
}

/** Se ejecuta antes de llamar a la Server Action; incluye margen para multipart y campos de texto. */
export async function preparePhotos(data: FormData, max = 4): Promise<FormData> {
  const photos = data.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (photos.length > max) throw new Error(`Podés enviar hasta ${max} fotos. Volvé a elegirlas.`);
  data.delete("photos");
  for (const photo of photos) data.append("photos", await compress(photo));
  let bytes = 16_384; // Separadores multipart, nombres y metadatos de las acciones.
  for (const [, value] of data) bytes += typeof value === "string" ? new TextEncoder().encode(value).byteLength : value.size;
  if (bytes > REQUEST_BUDGET) throw new Error("El envío es demasiado grande. Quitá algunas fotos y volvé a intentar.");
  return data;
}
