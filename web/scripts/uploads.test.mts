import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const directory = await fs.mkdtemp(path.join(os.tmpdir(),"sampacho-photos-test-"));
process.env.SAMPACHO_DATA_DIR = directory;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL;
process.env.ALLOW_LOCAL_UPLOADS = "1";
const { saveImages, readImage, deleteImages, IMAGE_NAME_RE, storeImage, clearImages } = await import("../src/lib/uploads");
await test("Almacenamiento de fotos", async (suite) => {
suite.after(async () => { await clearImages(); await fs.rmdir(path.join(directory,'uploads')).catch(()=>undefined); await fs.rmdir(directory); });
await suite.test("fotos locales: WebP, máximo 1600px, EXIF eliminado y lectura/borrado",async()=>{
  const original = await sharp({create:{width:2400,height:1800,channels:3,background:'#54796b'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const names = await saveImages([new File([new Uint8Array(original)],'foto.jpg',{type:'image/jpeg'})],'c',3);
  assert.equal(names.length,1); assert.match(names[0],IMAGE_NAME_RE);
  const meta = await sharp(await readImage(names[0])).metadata();
  assert.equal(meta.format,'webp'); assert.ok(meta.width! <=1600 && meta.height! <=1600); assert.equal(meta.exif,undefined);
  await deleteImages(names); await assert.rejects(readImage(names[0]));
});
await suite.test("validación de nombres, formato, cantidad y presupuesto; limpia cargas parciales",async()=>{
  await assert.rejects(readImage('../secreto'),/encontrada/);
  const bad = new File(['no es imagen'],'x.jpg',{type:'image/jpeg'});
  await assert.rejects(saveImages([bad],'p',4),/no se pudo leer/);
  await assert.rejects(saveImages([bad,bad],'p',1),/hasta 1/);
  await assert.rejects(saveImages([new File([new Uint8Array(3_200_001)],'x.jpg')],'p',4),/demasiado grandes/);
  const good = await sharp({create:{width:10,height:10,channels:3,background:'red'}}).png().toBuffer();
  await assert.rejects(saveImages([new File([new Uint8Array(good)],'ok.png'),bad],'p',4));
  assert.deepEqual(await fs.readdir(path.join(directory,'uploads')),[]);
});
await suite.test("Vercel sin token falla cerrado aunque se habilite almacenamiento local",async()=>{
  process.env.VERCEL='1';
  try { await assert.rejects(storeImage('p-00000000-0000-4000-8000-000000000000.webp',Buffer.from('x')),/almacenamiento privado/); }
  finally { delete process.env.VERCEL; }
});

});
