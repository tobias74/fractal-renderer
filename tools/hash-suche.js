// Sucht die Konstanten des 32-Bit-Mischers, aus dem die adaptive Glättung ihre Probenpositionen zieht (mische() in index.html).
//
// Aufbau des Mischers, eine verbreitete Bauweise: abwechselnd die oberen Bits nach unten schieben und einmischen und mit einer
// ungeraden Zahl malnehmen:  h ^= h >> s1; h *= m1; h ^= h >> s2; h *= m2; h ^= h >> s3
// Gesucht werden s1, m1, s2, m2, s3. Maß ist der Lawineneffekt: Kippt ein Eingangsbit, soll jedes Ausgangsbit mit
// Wahrscheinlichkeit genau ½ kippen. Die Abweichung davon, als Wurzel des mittleren Quadrats über alle 32 × 32 Bitpaare,
// bereinigt um das Rauschen der Stichprobe und in Tausendsteln, ist die Güte: je kleiner, desto besser.
//
// Ablauf: viele zufällige Kandidaten grob bewerten, die besten genauer, diese Schritt für Schritt verbessern (ein Bit einer
// Konstante oder eine Verschiebung ändern, behalten, was besser ist) und am Ende mit einer frischen, großen Stichprobe neu
// bewerten. Danach prüft das Programm den Sieger so, wie die Glättung ihn benutzt. Alle Zufallszahlen der Suche kommen aus
// SHA-256 im Zählerbetrieb mit festem Startwert (Node-Standardbibliothek): Jeder Aufruf findet dieselben Konstanten.
//
// Aufruf: node tools/hash-suche.js   (einige Minuten)
'use strict';
const crypto = require('crypto');

const START = 'fraktal-renderer/mische';

function zufallsquelle(name) {   // 32-Bit-Zahlen aus SHA-256(START | name | Zähler)
  let zaehler = 0, puffer = null, i = 8;
  return () => {
    if (i === 8) { puffer = crypto.createHash('sha256').update(`${START}|${name}|${zaehler++}`).digest(); i = 0; }
    return puffer.readUInt32LE(4 * i++);
  };
}
function stichprobe(name, n) { const z = zufallsquelle(name), a = new Uint32Array(n); for (let i = 0; i < n; i++) a[i] = z(); return a; }

// Der Mischer in JavaScript, Bit für Bit wie im Shader (Math.imul rechnet wie u32-Multiplikation modulo 2³²)
function mischer(k) {
  return x => { x ^= x >>> k.s1; x = Math.imul(x, k.m1); x ^= x >>> k.s2; x = Math.imul(x, k.m2); x ^= x >>> k.s3; return x >>> 0; };
}

// Lawinen-Abweichung in Tausendsteln. Die Messschleife wird je Kandidat mit dem Mischer als festem Code übersetzt, sonst
// kostete der Funktionsaufruf mehr als das Mischen. Gezählt wird je Eingangsbit und Byte des Unterschieds nach Bytewert
// (vier Zählungen statt 32 je Probe); die einzelnen Bits zählt erst der Schluss aus den Tabellen aus.
function abweichung(k, eingaben) {
  const misch = v => `${v} ^= ${v} >>> ${k.s1}; ${v} = Math.imul(${v}, ${k.m1 | 0}); ${v} ^= ${v} >>> ${k.s2}; ${v} = Math.imul(${v}, ${k.m2 | 0}); ${v} ^= ${v} >>> ${k.s3};`;
  const zaehle = new Function('eingaben', 'tab', `
    for (let s = 0; s < eingaben.length; s++) {
      const x = eingaben[s]; let y = x; ${misch('y')}
      for (let i = 0; i < 32; i++) {
        let z = x ^ (1 << i); ${misch('z')}
        const d = (y ^ z) >>> 0, b = i << 10;
        tab[b | (d & 255)]++; tab[b | 256 | ((d >>> 8) & 255)]++; tab[b | 512 | ((d >>> 16) & 255)]++; tab[b | 768 | (d >>> 24)]++;
      }
    }`);
  const n = eingaben.length, tab = new Uint32Array(32 * 4 * 256);
  zaehle(eingaben, tab);
  let q = 0;
  for (let i = 0; i < 32; i++) for (let byte = 0; byte < 4; byte++) {
    const c = new Float64Array(8);
    for (let v = 1; v < 256; v++) { const t = tab[(i << 10) | (byte << 8) | v]; if (t) for (let j = 0; j < 8; j++) if ((v >> j) & 1) c[j] += t; }
    for (let j = 0; j < 8; j++) { const p = c[j] / n - 0.5; q += p * p; }
  }
  // 0,25/n ist das erwartete Quadrat des reinen Stichprobenrauschens. Liegt der Rest darunter, ist die Abweichung mit dieser
  // Stichprobe nicht mehr messbar; das Vorzeichen bleibt dann negativ stehen, damit die Rangfolge erhalten bleibt.
  const s = q / 1024 - 0.25 / n;
  return 1000 * Math.sign(s) * Math.sqrt(Math.abs(s));
}

// Probenposition wie jitter() im Shader: drei Eingaben verschachtelt gemischt, zwei Zahlen je Probe (Radius und Winkel)
function versatz(m, x, y, runde) {
  const h = (a, b, c) => m((a ^ m((b ^ m(c)) >>> 0)) >>> 0);
  return [((h(x, y, 2 * runde) >>> 8) + 0.5) / 16777216, (h(x, y, 2 * runde + 1) >>> 8) / 16777216];
}

// Anwendungsprüfung: 256 × 256 Pixel, 16 Durchläufe. Gleichverteilung je Zahl (Chi-Quadrat über 64 Fächer, erwartet etwa 63)
// und Zusammenhang mit Nachbarpixel, Nachbarzeile, nächstem Durchlauf und der zweiten Zahl derselben Probe (Korrelation,
// erwartet 0 ± 0,001); dazu Paare mit dem rechten Nachbarn in 16 × 16 Fächern (Chi-Quadrat, erwartet etwa 255).
function anwendung(m) {
  const B = 256, R = 16, N = B * B * R, u1 = new Float64Array(N), u2 = new Float64Array(N);
  const at = (x, y, r) => (r * B + y) * B + x;
  for (let r = 0; r < R; r++) for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) { const v = versatz(m, x, y, r + 1); u1[at(x, y, r)] = v[0]; u2[at(x, y, r)] = v[1]; }
  const chi = (a, f) => { const c = new Float64Array(f), e = a.length / f; for (const v of a) c[Math.min(f - 1, Math.floor(v * f))]++; let s = 0; for (const n of c) s += (n - e) * (n - e) / e; return s; };
  const korr = paare => { let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0; for (const [a, b] of paare) { n++; sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b; } return (sab / n - sa / n * sb / n) / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2)); };
  function* nachbarn(dx, dy, dr, v, w) { for (let r = 0; r + dr < R; r++) for (let y = 0; y + dy < B; y++) for (let x = 0; x + dx < B; x++) yield [v[at(x, y, r)], w[at(x + dx, y + dy, r + dr)]]; }
  const paar2d = () => { const f = 16, c = new Float64Array(f * f); let n = 0; for (const [a, b] of nachbarn(1, 0, 0, u1, u1)) { c[Math.floor(a * f) * f + Math.floor(b * f)]++; n++; } const e = n / (f * f); let s = 0; for (const k of c) s += (k - e) * (k - e) / e; return s; };
  return {
    'Chi² u1 (64 Fächer)': chi(u1, 64), 'Chi² u2 (64 Fächer)': chi(u2, 64),
    'Korrelation Nachbarpixel': korr(nachbarn(1, 0, 0, u1, u1)), 'Korrelation Nachbarzeile': korr(nachbarn(0, 1, 0, u1, u1)),
    'Korrelation nächster Durchlauf': korr(nachbarn(0, 0, 1, u1, u1)), 'Korrelation u1 mit u2': korr(nachbarn(0, 0, 0, u1, u2)),
    'Chi² Paare mit Nachbar (256 Fächer)': paar2d(),
  };
}

const hex = v => '0x' + (v >>> 0).toString(16).padStart(8, '0');
const zeige = k => `s1 ${k.s1}, m1 ${hex(k.m1)}, s2 ${k.s2}, m2 ${hex(k.m2)}, s3 ${k.s3}`;

function suche(log = console.log) {
  const t0 = Date.now(), zeit = () => `${((Date.now() - t0) / 1000).toFixed(0)} s`;
  const zk = zufallsquelle('kandidaten');
  const kandidat = () => ({ s1: 11 + zk() % 9, m1: (zk() | 1) >>> 0, s2: 11 + zk() % 9, m2: (zk() | 1) >>> 0, s3: 11 + zk() % 9 });
  const bewerte = (liste, eingaben) => { for (const k of liste) k.abw = abweichung(k, eingaben); return liste.sort((a, b) => a.abw - b.abw); };

  // Jede Stufe misst genauer: Kleine Stichproben trennen nur die schlechten von den guten, erst große die guten untereinander.
  let feld = Array.from({ length: 8000 }, kandidat);
  for (const [stufe, n, bleiben] of [['grob', 12, 200], ['mittel', 16, 40], ['genau', 20, 4]]) {
    feld = bewerte(feld, stichprobe(stufe, 1 << n)).slice(0, bleiben);
    log(`${stufe}: mit 2^${n} Proben bewertet, die besten ${bleiben} bleiben (${zeit()}), bester ${feld[0].abw.toFixed(3)} ‰`);
  }

  const ein = stichprobe('verbessern', 1 << 21), zs = zufallsquelle('schritte');
  for (const k of feld) {
    let best = abweichung(k, ein);
    for (let t = 0; t < 200; t++) {
      const neu = { ...k }, w = zs() % 5;
      if (w < 2) { const f = w ? 'm2' : 'm1'; neu[f] = (neu[f] ^ (2 << (zs() % 31))) >>> 0; }   // ein Bit kippen, das unterste bleibt 1
      else { const f = ['s1', 's2', 's3'][w - 2]; neu[f] = Math.min(20, Math.max(8, neu[f] + (zs() & 1 ? 1 : -1))); }
      const a = abweichung(neu, ein);
      if (a < best) { best = a; Object.assign(k, neu); }
    }
    log(`verbessert, 200 Schritte mit 2^21 Proben (${zeit()}): ${zeige(k)}  ${best.toFixed(3)} ‰`);
  }
  const schluss = stichprobe('schluss', 1 << 24);
  bewerte(feld, schluss);
  for (const k of feld) log(`frisch bewertet mit 2^24 Proben: ${zeige(k)}  ${k.abw.toFixed(3)} ‰`);
  return { sieger: feld[0], schluss, zeit };
}

module.exports = { abweichung, mischer, versatz, anwendung, stichprobe, zeige };

if (require.main === module) {
  const { sieger: k, zeit } = suche();
  console.log('\nAnwendungsprüfung des Siegers:');
  for (const [name, wert] of Object.entries(anwendung(mischer(k)))) console.log(`  ${name.padEnd(36)} ${wert.toFixed(4)}`);
  console.log(`\nErgebnis (${zeit()}):\n  ${zeige(k)}\n  Abweichung ${k.abw.toFixed(3)} ‰`);
  console.log(`  WGSL: h ^= h >> ${k.s1}u; h *= ${hex(k.m1)}u; h ^= h >> ${k.s2}u; h *= ${hex(k.m2)}u; h ^= h >> ${k.s3}u;`);
}
