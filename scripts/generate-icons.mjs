#!/usr/bin/env node
// Generates Prism extension icons.
// If public/icons/icon128.png already exists (placed manually), skip generation.
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── PNG encoder ───────────────────────────────────────────────────────────────
function crc32(buf) {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = t[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.from(pixels))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Geometry helpers ──────────────────────────────────────────────────────────
function cross(p1x, p1y, p2x, p2y, p3x, p3y) {
  return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
}

function inTriangle(px, py, ax, ay, bx, by, cx2, cy2) {
  const d1 = cross(px, py, ax, ay, bx, by);
  const d2 = cross(px, py, bx, by, cx2, cy2);
  const d3 = cross(px, py, cx2, cy2, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const nx = x1 + t * dx - px, ny = y1 + t * dy - py;
  return Math.sqrt(nx * nx + ny * ny);
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
function createIconPNG(S) {
  // Circle background
  const cx = S / 2, cy = S / 2;
  const bgR = S * 0.47;

  // Prism triangle  (right-pointing isoceles — classic "refraction" prism)
  const apexX = Math.round(S * 0.19), apexY = Math.round(S * 0.5);
  const faceX = Math.round(S * 0.72);                              // right face x
  const halfH = Math.round((faceX - apexX) / Math.sqrt(3));       // equilateral proportions
  const triTopY    = Math.round(apexY - halfH);
  const triBotY    = Math.round(apexY + halfH);

  // Rainbow fan  — radiates from the midpoint of the right face, spreading rightward
  const fanEndX   = Math.round(S * 0.93);
  const fanSpread = Math.round(halfH * 1.1);   // slightly wider than the prism half-height

  const RAINBOW = [
    [248, 113, 113],   // red
    [251, 146,  60],   // orange
    [253, 224,  71],   // yellow
    [ 74, 222, 128],   // green
    [ 96, 165, 250],   // blue
    [192, 132, 252],   // violet
  ];

  function getRainbow(x, y) {
    if (x <= faceX || x > fanEndX) return null;
    const t   = (x - faceX) / (fanEndX - faceX);
    const top = apexY - fanSpread * t;
    const bot = apexY + fanSpread * t;
    if (y < top || y > bot || bot <= top) return null;
    const idx = Math.min(5, Math.floor(6 * (y - top) / (bot - top)));
    return RAINBOW[idx];
  }

  function onEdge(x, y) {
    const edgeW = Math.max(0.8, S * 0.012);
    const d1 = segDist(x, y, apexX, apexY, faceX, triTopY);
    const d2 = segDist(x, y, faceX, triTopY, faceX, triBotY);
    const d3 = segDist(x, y, faceX, triBotY, apexX, apexY);
    return Math.min(d1, d2, d3) < edgeW;
  }

  const pixels = [];

  for (let y = 0; y < S; y++) {
    pixels.push(0); // PNG row filter byte
    for (let x = 0; x < S; x++) {
      const ddx = x - cx, ddy = y - cy;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);

      let r = 0, g = 0, b = 0, a = 0;

      if (dist < bgR + 1.5) {
        // Soft circle edge (1.5px AA)
        a = dist > bgR ? 0 : dist > bgR - 1.5 ? Math.round(255 * (bgR - dist) / 1.5) : 255;

        if (a > 0) {
          // Dark background — subtle center-bright radial gradient
          const gf = 1 - (dist / bgR) * 0.18;
          r = Math.round(13 * gf);
          g = Math.round(13 * gf);
          b = Math.round(20 * gf);

          // Rainbow bands (drawn before prism so prism covers them)
          const rc = getRainbow(x, y);
          if (rc) { [r, g, b] = rc; }

          // Prism body — light bluish-white glass
          if (inTriangle(x, y, apexX, apexY, faceX, triTopY, faceX, triBotY)) {
            r = 222; g = 220; b = 236;
          }

          // Prism edge — brighter white outline for definition
          if (onEdge(x, y)) {
            r = 248; g = 248; b = 255;
          }

          // Incoming white ray  (only for ≥ 32px where it's legible)
          if (S >= 32) {
            const rayW    = Math.max(1, Math.round(S * 0.022));
            const rayStart = Math.round(S * 0.05);
            if (x >= rayStart && x < apexX && Math.abs(y - apexY) <= rayW) {
              r = 240; g = 238; b = 250;
            }
          }
        }
      }

      pixels.push(r, g, b, a);
    }
  }

  return encodePNG(S, pixels);
}

// ── Generate all sizes (skip if manually placed icons already exist) ──────────
const outputDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outputDir, { recursive: true });

if (existsSync(join(outputDir, 'icon128.png'))) {
  console.log('Icons already present — skipping generation.');
} else {
  for (const size of [16, 32, 48, 128]) {
    writeFileSync(join(outputDir, `icon${size}.png`), createIconPNG(size));
    console.log(`✓ icon${size}.png`);
  }
  console.log('Icons generated.');
}
