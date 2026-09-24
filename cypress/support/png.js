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
  let n = 0, sum = 0, sum2 = 0, dsum = 0, dn = 0, grau = 0; const colors = new Set();   // grau: Pixel, deren Kanäle sich um höchstens 6 unterscheiden
  for (let y = ay; y < by; y += 2) for (let x = ax; x < bx; x += 2) {
    const i = (y * img.w + x) * img.ch, l = (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
    sum += l; sum2 += l * l; n++;
    if (x + 1 < bx) { const j = i + img.ch; dsum += Math.abs((img.data[j] + img.data[j + 1] + img.data[j + 2]) / 3 - l); dn++; }   // Rauheit: Sprung zum rechten Nachbarn
    if (colors.size < 5000) colors.add((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]);
    { const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2]; if (Math.abs(r - g) <= 6 && Math.abs(g - b) <= 6 && Math.abs(r - b) <= 6) grau++; }
  }
  const mean = sum / n, std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  return { width: img.w, height: img.h, mean: +mean.toFixed(2), std: +std.toFixed(2), rough: +(dsum / Math.max(1, dn)).toFixed(2), colors: colors.size, grau: +(grau / Math.max(1, n)).toFixed(4), samples: n };   // grau: Anteil 0 … 1
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

// Feine Linien (etwa an Kachelgrenzen): je Spalte und Zeile, wie weit sie im Mittel von ihren beiden Nachbarn abweicht,
// im Verhältnis zum Median. Die äußersten drei Spalten und Zeilen zählen nicht (dort fehlt ein Nachbar wirklich).
function pngNaht(buf) {
  const { w, h, ch, data } = decodePng(buf);
  const Y = (x, y) => { const i = (y * w + x) * ch; return (data[i] + data[i + 1] + data[i + 2]) / 3; };
  const wert = (n, m, f) => { const a = []; for (let i = 3; i < n - 3; i++) { let s = 0; for (let j = 0; j < m; j++) s += f(i, j); a.push([i, s / m]); } return a; };
  const auswerten = a => { const med = a.map(v => v[1]).sort((p, q) => p - q)[a.length >> 1] || 1e-9; const [i, v] = a.reduce((m, e) => e[1] > m[1] ? e : m); return { stelle: i, faktor: +(v / med).toFixed(2) }; };
  return {
    w, h,
    spalte: auswerten(wert(w, h, (x, y) => Math.abs(Y(x, y) - (Y(x - 1, y) + Y(x + 1, y)) / 2))),
    zeile: auswerten(wert(h, w, (y, x) => Math.abs(Y(x, y) - (Y(x, y - 1) + Y(x, y + 1)) / 2))),
  };
}

// Pixel für Pixel: wie viele weichen ab, und wie weit höchstens (0 = bitgleich)
function pngGleich(bufA, bufB) {
  const A = decodePng(bufA), B = decodePng(bufB);
  if (A.w !== B.w || A.h !== B.h) return { fehler: 'Größe verschieden' };
  let anders = 0, max = 0;
  for (let i = 0; i < A.data.length; i++) { const d = Math.abs(A.data[i] - B.data[i]); if (d) { max = Math.max(max, d); if (i % A.ch === 0) anders++; } }
  return { anders, max, pixel: A.w * A.h };
}

module.exports = { decodePng, pngStats, pngDiff, pngNaht, pngGleich };
