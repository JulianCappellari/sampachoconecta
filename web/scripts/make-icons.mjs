// Genera los íconos PNG de la PWA a partir del símbolo. Uso: node scripts/make-icons.mjs
import sharp from "sharp";
import fs from "node:fs";

const pin = (bg, pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${bg}"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 64})">
    <path d="M32 3C18.7 3 8 13.6 8 26.8 8 44.2 32 61 32 61s24-16.8 24-34.2C56 13.6 45.3 3 32 3z" fill="#0E6B5A"/>
    <path d="M22.5 22.5 41.5 22.5 32 37Z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" opacity=".9"/>
    <circle cx="22.5" cy="22.5" r="6" fill="#fff"/><circle cx="41.5" cy="22.5" r="6" fill="#F2B02A"/><circle cx="32" cy="37" r="6" fill="#fff"/>
  </g>
</svg>`;

fs.mkdirSync("public/icons", { recursive: true });
await sharp(Buffer.from(pin("#FFFFFF", 56))).resize(512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(pin("#FFFFFF", 56))).resize(192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(pin("#FFFFFF", 120))).resize(512).png().toFile("public/icons/maskable-512.png");
await sharp(Buffer.from(pin("#FFFFFF", 70))).resize(180).png().toFile("src/app/apple-icon.png");
console.log("Íconos generados");
