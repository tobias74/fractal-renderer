// Kommentarfallen finden: eine Zeile, in der nach einem Zeilenkommentar „//“ noch Code steht, der einmal hinter dem Kommentar
// weiterlaufen sollte (drei echte Fehler dieser Art am 18.09.2026: lsSet-Aufrufe, push, Zuweisungen am Zeilenende).
// Aufruf: node tools/kommentar-pruefen.js [Datei …]  (Vorgabe: index.html und tools/*.js). Rückgabe 1 bei Funden.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dateien = process.argv.length > 2 ? process.argv.slice(2) : ['index.html', ...fs.readdirSync(path.join(root, 'tools')).filter(f => f.endsWith('.js')).map(f => 'tools/' + f)];
const CODE = /\b(if|for|while|const|let|var|return|throw)\b\s*[(\w]|\b\w+\((?:[^)]*)\)\s*;|\b\w+(\.\w+)*\s*(=|\+=|-=)\s*[^=>]/;   // Aufruf mit Semikolon, Zuweisung, Kontrollwort
let funde = 0;
for (const f of dateien) {
  const zeilen = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
  zeilen.forEach((z, i) => {
    let k = -1, inStr = null;   // das erste „//“ außerhalb eines Strings (grob: einfache, doppelte und Backtick-Anführungszeichen)
    for (let j = 0; j < z.length; j++) { const c = z[j]; if (inStr) { if (c === '\\') j++; else if (c === inStr) inStr = null; } else if (c === '\'' || c === '"' || c === '`') inStr = c; else if (c === '/' && z[j + 1] === '/') { k = j; break; } }
    if (k < 0) return;
    const vor = z.slice(0, k), rest = z.slice(k + 2);
    if (/^\s*$/.test(vor) || /https?:$/.test(vor) || /^\s*\*/.test(vor)) return;   // reine Kommentarzeile, Adresse, Sternchenkommentar
    if (!/;\s*$/.test(rest) && !/\}\s*$/.test(rest)) return;                            // ein Kommentar endet selten mit Semikolon oder Klammer
    if (CODE.test(rest)) { funde++; console.log(f + ':' + (i + 1) + ': ' + z.trim().slice(0, 160)); }
  });
}
console.log(funde ? funde + ' mögliche Kommentarfalle(n)' : 'keine Kommentarfallen');
process.exit(funde ? 1 : 0);
