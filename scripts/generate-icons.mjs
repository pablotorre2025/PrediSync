/**
 * Genera los íconos PWA (192, 512, apple-touch-icon) desde public/favicon.svg.
 * Ejecutar: `npm run gen:icons`
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

const svgPath = join(publicDir, 'favicon.svg');
const svg = readFileSync(svgPath);

const targets = [
  { size: 192, file: 'pwa-192x192.png' },
  { size: 512, file: 'pwa-512x512.png' },
  { size: 180, file: 'apple-touch-icon.png' }
];

for (const t of targets) {
  await sharp(svg, { density: 384 })
    .resize(t.size, t.size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(join(publicDir, t.file));
  console.log('✔', t.file);
}
console.log('Iconos generados en', publicDir);
