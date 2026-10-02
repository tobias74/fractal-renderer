// Prüft die Shader des Farbpasses auf das Muster, das der Adreno-Compiler (praktisch jedes Snapdragon-Handy) falsch
// übersetzt: bedingte Zuweisungen und bedingte Rückgaben mit einer Bedingung, die erst zur Laufzeit feststeht
// Regel:
//   – ein `if`, in dessen Block (oder else-Zweig) eine Zuweisung, ein `return` oder `discard` steht, darf als Bedingung nur
//     override-Konstanten und feste Zahlen haben; sonst gehört es als `select` geschrieben (oder die Einstellung wird Konstante)
//   – `&&` und `||` nur in solchen Bedingungen; sonst `&` und `|`
//   – ein `switch` nur auf Konstanten (seine Zweige sind bedingte Zuweisungen)
// Aufruf: node tools/farbpass-pruefen.js [--bestand]   (--bestand: alle Funde auflisten, Rückgabewert 0)
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const BESTAND = process.argv.includes('--bestand');

// Die Shader des Farbpasses: Farbbibliothek, Farbpass, Nachbearbeitung, Ebenen, Akkumulation der Glättung
const SHADER = ['WGSL_COLOR_LIB', 'WGSL_COLOR', 'WGSL_POST_ABSCHNITT', 'WGSL_POST_SCHICHT', 'WGSL_LEUCHT', 'WGSL_POST_MAIN', 'WGSL_VERBUND', 'WGSL_VERBUND_SCHICHT', 'WGSL_AANEED', 'WGSL_AAACC', 'WGSL_AABEDARF', 'WGSL_AASTAT', 'WGSL_ACCDISP'];
// Die Rechenpässe (Iteration des Fraktals, der Punktwolken, Vorschau und Füllen der Iterationstextur) und die Konstanten, die nur
// aus den Texten oben zusammengesetzt sind. Jeder Shader muss in einer der beiden Listen stehen: ein neuer fällt sonst auf.
const RECHNEN = ['WGSL_FRACTAL', 'WGSL_CHAOS', 'WGSL_UPSCALE', 'WGSL_FILL', 'WGSL_COLOR_OHNE', 'WGSL_COLOR_VOLL', 'WGSL_POST', 'WGSL_EBENE', 'WGSL_TEXMASKE_ATTRAPPE'];
const neu = [...html.matchAll(/^const (WGSL_\w+)/gm)].map(m => m[1]).filter(n => !SHADER.includes(n) && !RECHNEN.includes(n));
if (neu.length) { console.log('Farbpass-Prüfung: Shader ohne Einordnung (in SHADER oder RECHNEN eintragen): ' + neu.join(', ')); process.exit(1); }
function shaderText(name) {   // die Template-Literale der Konstante hintereinander (Einsetzungen ${…} durch Leerzeichen ersetzt)
  const a = html.indexOf('const ' + name + ' = '); if (a < 0) return null;
  let text = '', tpl = null;
  for (let i = html.indexOf('=', a) + 1; i < html.length; i++) {   // bis zum Semikolon der Anweisung, außerhalb der Template-Literale
    const c = html[i];
    if (tpl !== null) {
      if (c === '\\') { tpl += c + html[i + 1]; i++; continue; }
      if (c === '$' && html[i + 1] === '{') { let tiefe = 0; for (; i < html.length; i++) { if (html[i] === '{') tiefe++; else if (html[i] === '}' && --tiefe === 0) break; } tpl += ' '; continue; }
      if (c === '`') { text += tpl + '\n'; tpl = null; continue; }
      tpl += c; continue;
    }
    if (c === '`') { tpl = ''; continue; }
    if (c === ';') break;
  }
  return { text, zeile0: html.slice(0, a).split('\n').length };
}
const OHNE_KOMMENTAR = t => t.replace(/\/\/[^\n]*/g, m => ' '.repeat(m.length));
function klammer(t, i, auf, zu) {   // Index der passenden schließenden Klammer zu t[i] === auf
  let tiefe = 0;
  for (let j = i; j < t.length; j++) { if (t[j] === auf) tiefe++; else if (t[j] === zu) { tiefe--; if (tiefe === 0) return j; } }
  return -1;
}
const ZUWEISUNG = /(^|[^=!<>])(=|\+=|-=|\*=|\/=|&=|\|=)(?!=)/;
function hatWirkung(block) {   // Zuweisung an etwas außerhalb (lokale let/var zählen nicht), return, discard
  const ohneLokal = block.replace(/\b(let|var)\s+\w+\s*(:\s*[\w<>, ]+)?\s*=\s*[^;]*;/g, ' ');
  return /\breturn\b|\bdiscard\b/.test(ohneLokal) || ZUWEISUNG.test(ohneLokal.replace(/[<>!=]=|==/g, '  '));
}
const WOERTER = new Set(['true', 'false', 'u32', 'i32', 'f32', 'bool']);
function nurKonstanten(bed, konst) {
  const namen = bed.replace(/\b0x[0-9a-fA-F]+u?\b/g, ' ').replace(/\b\d+(\.\d+)?([eE][+-]?\d+)?[uif]?\b/g, ' ').match(/[A-Za-z_]\w*(\.\w+)*/g) || [];
  return namen.every(n => konst.has(n) || WOERTER.has(n));
}

const funde = [];
for (const name of SHADER) {
  const s = shaderText(name); if (!s) continue;
  const t = OHNE_KOMMENTAR(s.text);
  const konst = new Set([...t.matchAll(/\boverride\s+(\w+)/g)].map(m => m[1]));
  // Konstanten, die ein anderer Shader dieses Farbpasses deklariert, gelten auch hier (die Texte werden zusammengesetzt)
  for (const n2 of SHADER) { const s2 = shaderText(n2); if (s2) for (const m of s2.text.matchAll(/\boverride\s+(\w+)/g)) konst.add(m[1]); }
  const zeileVon = i => s.zeile0 + t.slice(0, i).split('\n').length - 1;
  const fnVon = i => { const m = [...t.slice(0, i).matchAll(/\bfn\s+(\w+)/g)].pop(); return m ? m[1] : '?'; };
  const erlaubteBed = [];   // Bereiche erlaubter Bedingungen (dort dürfen && und || stehen)
  const re = /\bif\s*\(/g; let m;
  while ((m = re.exec(t))) {
    const auf = m.index + m[0].length - 1, zu = klammer(t, auf, '(', ')'); if (zu < 0) continue;
    const bed = t.slice(auf + 1, zu);
    // der Block und die ganze else-Kette dahinter
    let j = zu + 1; while (/\s/.test(t[j])) j++;
    let wirkung = false, k = j;
    for (;;) {
      if (t[k] !== '{') break;
      const e = klammer(t, k, '{', '}'); if (e < 0) break;
      if (hatWirkung(t.slice(k + 1, e))) wirkung = true;
      let n = e + 1; while (/\s/.test(t[n])) n++;
      if (t.startsWith('else', n)) { n += 4; while (/\s/.test(t[n])) n++; if (t.startsWith('if', n)) { const a2 = t.indexOf('(', n), z2 = klammer(t, a2, '(', ')'); n = z2 + 1; while (/\s/.test(t[n])) n++; } k = n; continue; }
      break;
    }
    const konstant = nurKonstanten(bed, konst);
    if (konstant) erlaubteBed.push([auf, zu]);
    if (wirkung && !konstant) funde.push({ shader: name, fn: fnVon(m.index), zeile: zeileVon(m.index), art: 'if mit Zuweisung/return, Bedingung zur Laufzeit', text: bed.replace(/\s+/g, ' ').trim().slice(0, 90) });
  }
  const re3 = /\bswitch\s+([^{]+)\{/g;   // ein switch ist eine Kette bedingter Zweige: nur auf Konstanten
  while ((m = re3.exec(t))) if (!nurKonstanten(m[1], konst)) funde.push({ shader: name, fn: fnVon(m.index), zeile: zeileVon(m.index), art: 'switch auf Laufzeitwert', text: m[1].trim().slice(0, 90) });
  const re2 = /&&|\|\|/g;
  while ((m = re2.exec(t))) {
    if (erlaubteBed.some(([a, b]) => m.index > a && m.index < b)) continue;
    // in einer Anweisung, die nur aus Konstanten besteht (etwa eine abgeleitete override-Konstante), sind && und || erlaubt
    const anf = Math.max(t.lastIndexOf(';', m.index), t.lastIndexOf('{', m.index), t.lastIndexOf('}', m.index)) + 1, end = t.indexOf(';', m.index);
    const anw = t.slice(anf, end).trim(), ov = /^override\s+\w+\s*:\s*\w+\s*=\s*([\s\S]*)$/.exec(anw);
    if (ov && nurKonstanten(ov[1], konst)) continue;
    const zs = t.lastIndexOf('\n', m.index) + 1, ze = t.indexOf('\n', m.index);
    funde.push({ shader: name, fn: fnVon(m.index), zeile: zeileVon(m.index), art: m[0] + ' mit Laufzeitwerten', text: t.slice(zs, ze).trim().slice(0, 90) });
  }
}

if (!funde.length) { console.log('Farbpass: keine bedingten Zuweisungen oder Rückgaben zur Laufzeit'); process.exit(0); }
if (BESTAND) {
  const jeFn = {}; for (const f of funde) { const k = f.shader + ' › ' + f.fn; jeFn[k] = (jeFn[k] || 0) + 1; }
  for (const f of funde) console.log(`index.html:${f.zeile}  ${f.shader} › ${f.fn}  ${f.art}:  ${f.text}`);
  console.log('\nje Funktion: ' + Object.entries(jeFn).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(', '));
}
console.log(`Farbpass: ${funde.length} Stellen mit Laufzeit-Bedingung (Adreno) – mit select schreiben oder die Einstellung zur override-Konstante machen`);
process.exit(BESTAND ? 0 : 1);
