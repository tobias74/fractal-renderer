// Reiner Node-PNG-Decoder (8 Bit, nicht interlaced) für Bildprüfungen in den Tests — ohne Zusatzpakete.
const zlib = require('zlib');

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('kein PNG');
  let pos = 8, w = 0, h = 0, bitDepth = 0, colorType = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; if (data[12] !== 0) throw new Error('interlaced PNG'); }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('Bittiefe ' + bitDepth + ' nicht unterstützt');
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType], raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch;
  const out = Buffer.alloc(w * h * ch);
  let prev = Buffer.alloc(stride), p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++], line = raw.subarray(p, p + stride); p += stride;
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0, x = line[i];
      let v;
      if (ft === 0) v = x; else if (ft === 1) v = x + a; else if (ft === 2) v = x + b; else if (ft === 3) v = x + ((a + b) >> 1);
      else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    cur.copy(out, y * stride); prev = cur;
  }
  return { w, h, ch, data: out };
}

// Bereich als Anteile: { x0, y0, x1, y1 } in 0..1 (Standard: ganzes Bild)
function bounds(img, region = {}) {
  const { x0 = 0, y0 = 0, x1 = 1, y1 = 1 } = region;
  return { ax: Math.floor(x0 * img.w), ay: Math.floor(y0 * img.h), bx: Math.ceil(x1 * img.w), by: Math.ceil(y1 * img.h) };
}

// Mittlere Helligkeit, Streuung und Anzahl unterschiedlicher Farben im Bereich
function pngStats(buf, region) {
  const img = decodePng(buf), { ax, ay, bx, by } = bounds(img, region);
  let n = 0, sum = 0, sum2 = 0, dsum = 0, dn = 0; const colors = new Set();
  for (let y = ay; y < by; y += 2) for (let x = ax; x < bx; x += 2) {
    const i = (y * img.w + x) * img.ch, l = (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
    sum += l; sum2 += l * l; n++;
    if (x + 1 < bx) { const j = i + img.ch; dsum += Math.abs((img.data[j] + img.data[j + 1] + img.data[j + 2]) / 3 - l); dn++; }   // Rauheit: Sprung zum rechten Nachbarn
    if (colors.size < 5000) colors.add((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]);
  }
  const mean = sum / n, std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  return { width: img.w, height: img.h, mean: +mean.toFixed(2), std: +std.toFixed(2), rough: +(dsum / Math.max(1, dn)).toFixed(2), colors: colors.size, samples: n };
}

// Mittlere absolute Abweichung (0..255) zweier gleich großer Bilder im Bereich
function pngDiff(bufA, bufB, region) {
  const A = decodePng(bufA), B = decodePng(bufB);
  if (A.w !== B.w || A.h !== B.h) return { error: 'Größe verschieden', a: [A.w, A.h], b: [B.w, B.h] };
  const { ax, ay, bx, by } = bounds(A, region);
  let n = 0, diff = 0, changed = 0;
  for (let y = ay; y < by; y += 2) for (let x = ax; x < bx; x += 2) {
    const i = (y * A.w + x) * A.ch, j = (y * B.w + x) * B.ch;
    const d = Math.abs(A.data[i] - B.data[j]) + Math.abs(A.data[i + 1] - B.data[j + 1]) + Math.abs(A.data[i + 2] - B.data[j + 2]);
    diff += d / 3; n++; if (d > 30) changed++;
  }
  return { meanDiff: +(diff / n).toFixed(2), changedShare: +(changed / n).toFixed(3), samples: n };
}

module.exports = { decodePng, pngStats, pngDiff };
