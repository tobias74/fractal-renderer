// Prüft die Übersetzung ohne Browser: Aufruf `node tools/i18n-pruefen.js` oder über den Cypress-Task „i18nPruefen“.
//
//   1. Jede Marke im Markup (data-i18n…) hat einen Eintrag im Wörterbuch.
//   2. Jeder Schlüssel, den der Code nennt, hat einen Eintrag.
//   3. Jeder Eintrag wird irgendwo verwendet (sonst ist er tot).
//   4. Deutsch und Englisch eines Eintrags haben dieselben Platzhalter {0}, {1} …
//   5. Kein Schlüssel steht doppelt im Wörterbuch.
const fs = require('fs');
const path = require('path');

const GEBAUT = ['quilez.slider.'];   // Schlüssel, die der Code zusammensetzt: nicht als Zeichenkette zu finden

function pruefeI18n(datei) {
  const quelle = fs.readFileSync(datei || path.join(__dirname, '..', 'index.html'), 'utf8');
  const wA = quelle.indexOf('const TEXTE = {'), wE = quelle.indexOf('\n});\n', wA) + 4;
  if (wA < 0 || wE < 4) return { fehler: ['Wörterbuch TEXTE nicht gefunden'] };
  const block = quelle.slice(wA, wE), rest = quelle.slice(0, wA) + quelle.slice(wE);
  const fehler = [];

  const eintraege = new Map();
  for (const m of block.matchAll(/^ {2}'([^']+)': \{ de: '((?:[^'\\]|\\.)*)', en: '((?:[^'\\]|\\.)*)' \},$/gm)) {
    if (eintraege.has(m[1])) fehler.push('Schlüssel doppelt: ' + m[1]);
    eintraege.set(m[1], { de: m[2], en: m[3] });
  }
  if (!eintraege.size) return { fehler: ['keine Einträge im Wörterbuch gefunden'] };

  const marken = new Set([...quelle.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map(m => m[1]));
  for (const k of marken) if (!eintraege.has(k)) fehler.push('Marke im Markup ohne Eintrag: ' + k);

  const gerufen = new Set();
  for (const m of rest.matchAll(/(?:^|[^\w.])(?:t|notify|posterZustand)\('([^']+)'/g)) gerufen.add(m[1]);
  for (const m of rest.matchAll(/fester(?:Text)\([^,]+, '([^']+)'/g)) gerufen.add(m[1]);
  for (const m of rest.matchAll(/festesAttribut\([^,]+, '[^']+', '([^']+)'/g)) gerufen.add(m[1]);
  for (const k of gerufen) if (!k.endsWith('.') && !eintraege.has(k)) fehler.push('Schlüssel im Code ohne Eintrag: ' + k);

  for (const [k, e] of eintraege) {
    if (GEBAUT.some(p => k.startsWith(p))) continue;
    if (!marken.has(k) && !rest.includes("'" + k + "'")) fehler.push('Eintrag wird nirgends verwendet: ' + k);
    const platz = v => [...new Set([...v.matchAll(/\{(\d)\}/g)].map(x => x[1]))].sort().join(',');
    if (platz(e.de) !== platz(e.en)) fehler.push('Platzhalter unterschiedlich: ' + k + ' (de „' + platz(e.de) + '“, en „' + platz(e.en) + '“)');
  }
  return { fehler, eintraege: eintraege.size, marken: marken.size, gerufen: gerufen.size };
}

module.exports = { pruefeI18n };

if (require.main === module) {
  const ergebnis = pruefeI18n(process.argv[2]);
  console.log('Einträge:', ergebnis.eintraege, '| Marken im Markup:', ergebnis.marken, '| Schlüssel im Code:', ergebnis.gerufen);
  if (ergebnis.fehler.length) { console.log('Fehler (' + ergebnis.fehler.length + '):'); for (const f of ergebnis.fehler) console.log('   ' + f); process.exitCode = 1; }
  else console.log('alles in Ordnung');
}
