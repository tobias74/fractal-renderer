// Prüft die Formelsprache der eigenen Ausdrücke (AUSDRUCK in index.html) ohne Browser: Aufruf `node tools/ausdruck-pruefen.js`.
// Der Block wird aus index.html geschnitten und ausgeführt; dann laufen Lese-, Anzeige-, Rechen- und Übersetzungsfälle.
const fs = require('fs');
const path = require('path');

function ladeAusdruck(datei) {
  const quelle = fs.readFileSync(datei || path.join(__dirname, '..', 'index.html'), 'utf8');
  const a = quelle.indexOf('const AUSDRUCK = (() => {'), e = quelle.indexOf('\n})();\n', a);
  if (a < 0 || e < 0) throw new Error('AUSDRUCK nicht gefunden');
  return new Function(quelle.slice(a, e + 6) + '\nreturn AUSDRUCK;')();
}

function pruefeAusdruck(datei) {
  const A = ladeAusdruck(datei), fehler = [];
  const ok = (bed, text) => { if (!bed) fehler.push(text); };
  const nah = (x, y, eps = 1e-9) => Math.abs(x - y) <= eps;
  const nahC = (x, y, eps = 1e-9) => Array.isArray(x) && nah(x[0], y[0], eps) && nah(x[1], y[1], eps);

  // 1. Lesen und Anzeige: Eingabe, Art, erwartete ASCII-Form, erwartete schöne Form
  const lesen = [
    ['z^2 + c', 'formel', 'z^2 + c', 'z² + c'],
    ['z² − c·z₁ + π', 'formel', 'z^2 - c*z_1 + pi', 'z² − c·z₁ + π'],
    ['(z+1)(z-1)', 'formel', '(z+1)(z-1)', '(z + 1) (z − 1)'],
    ['z^-1', 'formel', 'z^-1', 'z⁻¹'],
    ['−z⁻¹', 'formel', '-z^-1', '−z⁻¹'],
    ['e^z + c', 'formel', 'e^z + c', 'e^z + c'],
    ['conj(z)^2 + c', 'formel', 'conj(z)^2 + c', 'conj(z)² + c'],
    ['|z - 1|', 'wert', '|z - 1|', '|z − 1|'],
    ['0.5 + 0.5 sin(4 arg z)', 'wert', '0.5 + 0.5 sin(4 arg z)', '0.5 + 0.5 sin(4 arg(z))'],
    ['|z| < 1 ? 0 : 1', 'wert', '|z| < 1 ? 0 : 1', '|z| < 1 ? 0 : 1'],
    ['min(|z|, |z - 1|)', 'wert', 'min(|z|, |z - 1|)', 'min(|z|, |z − 1|)'],
    ['atan(im z, re z)/(2 pi)', 'wert', 'atan(im z, re z)/(2 pi)', 'atan(im(z), re(z))/(2 π)'],
    ['s + |z|', 'zustand', 's + |z|', 's + |z|'],
    ['c^3', 'abbild', 'c^3', 'c³'],
    ['1/c', 'abbild', '1/c', '1/c'],
    ['a b z + c', 'formel', 'a b z + c', 'a b z + c'],
    ['frac(re z)', 'wert', 'frac(re z)', 'frac(re(z))'],
    ['re(z) im(z)', 'wert', 're(z) im(z)', 're(z) im(z)'],
    ['√z + c', 'formel', 'sqrt z + c', '√z + c'],
    ['z ≤ 1 ? 1 : 0', 'wert', 'z <= 1 ? 1 : 0', null],   // Vergleich mit komplexem z: Fehler (siehe unten)
  ];
  for (const [text, art, ascii, schoen] of lesen) {
    const r = A.uebersetze(text, art);
    if (schoen === null) { ok(!r.ok, 'sollte scheitern: ' + text); continue; }
    ok(r.ok, 'sollte lesbar sein: ' + text + (r.ok ? '' : ' → ' + r.key + ' @' + r.pos));
    if (!r.ok) continue;
    ok(r.ascii === ascii, 'ASCII von ' + text + ': ' + r.ascii + ' statt ' + ascii);
    ok(r.schoen === schoen, 'Anzeige von ' + text + ': ' + r.schoen + ' statt ' + schoen);
    ok(/return v\d+;$/.test(r.wgsl) && /return v\d+;$/.test(r.glsl), 'Rumpf endet mit return: ' + text);
    ok(!/NaN|Infinity|undefined/.test(r.wgsl + r.glsl), 'kein NaN/undefined im Code: ' + text);
  }

  // 2. Fehler: Eingabe, Art, Schlüssel, Stelle
  const fehlerFaelle = [
    ['', 'wert', 'expr.err-empty', 0], ['z +', 'wert', 'expr.err-end', 3], ['q + 1', 'wert', 'expr.err-unknown', 0],
    ['z', 'wert', 'expr.err-real', 0], ['z < 1', 'wert', 'expr.err-cmp', 2], ['(z', 'wert', 'expr.err-paren', 2],
    ['|z', 'wert', 'expr.err-bar', 2], ['z # 1', 'wert', 'expr.err-char', 2], ['min(z, 1)', 'wert', 'expr.err-realfn', 0],
    ['z ? 1 : 0', 'wert', 'expr.err-cond', 2], ['2 3', 'wert', 'expr.err-unexpected', 2], ['|z| < 1', 'wert', 'expr.err-bool', 4],
    ['a', 'wert', 'expr.err-unknown', 0], ['s', 'formel', 'expr.err-unknown', 0], ['z_3', 'wert', 'expr.err-unknown', 0],
  ];
  for (const [text, art, key, pos] of fehlerFaelle) {
    const r = A.uebersetze(text, art);
    ok(!r.ok && r.key === key && r.pos === pos, 'Fehler bei ' + JSON.stringify(text) + ': ' + (r.ok ? 'kein Fehler' : r.key + ' @' + r.pos) + ' statt ' + key + ' @' + pos);
  }

  // 3. Rechnen: Ausdruck, Art, Umgebung, erwartet
  const env = { z: [0.3, 0.4], z1: [0.1, -0.2], z2: [1, 1], c: [-0.5, 0.25], n: 3, s: 1.5, a: 0.5, b: -1 };
  const rechnen = [
    ['z^2 + c', 'formel', [0.09 - 0.16 - 0.5, 2 * 0.3 * 0.4 + 0.25]],
    ['|z|', 'wert', 0.5], ['z^-1', 'formel', [1.2, -1.6]], ['re z + im z', 'wert', 0.7],
    ['z^0.5', 'formel', A.rechne(A.parsen('sqrt z', 'formel').ast, env)],
    ['exp(ln z)', 'formel', [0.3, 0.4]], ['|z| < 1 ? re z : im z', 'wert', 0.3],
    ['min(|z|, |z - 1|)', 'wert', Math.min(0.5, Math.hypot(-0.7, 0.4))],
    ['atan(im z, re z)/(2 pi)', 'wert', Math.atan2(0.4, 0.3) / (2 * Math.PI)],
    ['a b z + c', 'formel', [-0.65, 0.05]], ['s + |z|', 'zustand', 2], ['n s', 'wert', 4.5], ['z_1 + z_2', 'formel', [1.1, 0.8]],
    ['tanh z', 'formel', A.rechne(A.parsen('sinh(z)/cosh(z)', 'formel').ast, env)], ['conj z', 'formel', [0.3, -0.4]],
    ['i z', 'formel', [-0.4, 0.3]], ['frac(2.75)', 'wert', 0.75], ['floor(-1.5)', 'wert', -2], ['sign(-3)', 'wert', -1],
  ];
  for (const [text, art, soll] of rechnen) {
    const r = A.rechne(A.parsen(text, art).ast, env);
    ok(Array.isArray(soll) ? nahC(r, soll) : nah(r, soll), 'Rechnen ' + text + ': ' + JSON.stringify(r) + ' statt ' + JSON.stringify(soll));
  }

  // 4. Übersetzung: Bausteine, die der Shader braucht
  const f = A.uebersetze('z^2 + c', 'formel');
  ok(f.ok && f.wgsl.includes('*Jz = ') && f.wgsl.includes('*Jc = ') && f.wgsl.includes('if (NEED_DE == 1u || LYAP != 0u)'), 'Formel: Jacobi-Matrizen im WGSL');
  ok(f.ok && f.glsl.includes('Jz = ') && f.glsl.includes('if (NEED_DE == 1 || LYAP != 0)'), 'Formel: Jacobi-Matrizen im GLSL');
  const m = A.uebersetze('c^2', 'abbild');
  ok(m.ok && /return w\d+;$/.test(m.jacWgsl) && /return w\d+;$/.test(m.jacGlsl) && m.jacWgsl.includes('mat2x2f('), 'Abbildung: Jacobi-Funktion');
  const w = A.uebersetze('|z| < 1 ? 0 : 1', 'wert');
  ok(w.ok && w.wgsl.includes('select(') && w.glsl.includes(' ? ') && !w.glsl.includes('select('), 'Fallunterscheidung: select im WGSL, ?: im GLSL');
  const g = A.uebersetze('arg z', 'wert');
  ok(g.ok && g.wgsl.includes('atan2(') && /\batan\(/.test(g.glsl) && !g.glsl.includes('atan2'), 'arg: atan2 im WGSL, atan im GLSL');
  ok(!A.uebersetze('2 z', 'formel').wgsl.includes('cmul'), 'Zahl mal komplex ohne cmul');
  ok(A.uebersetze('1e-7 + n', 'wert').glsl.includes('1.0e-7'), 'Gleitkommazahl mit Exponent bekommt den Punkt');
  return { fehler };
}

if (require.main === module) {
  const { fehler } = pruefeAusdruck();
  if (fehler.length) { console.log('Fehler (' + fehler.length + '):'); for (const f of fehler) console.log('   ' + f); process.exit(1); }
  console.log('AUSDRUCK: alles in Ordnung');
}
module.exports = { pruefeAusdruck, ladeAusdruck };
