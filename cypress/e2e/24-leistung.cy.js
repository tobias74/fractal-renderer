// Leistung als Test: das Messwerkzeug tools/leistung.js rendert feste Szenen in Headless-Chrome (echte GPU, außerhalb von Electron,
// das requestAnimationFrame drosselt) und misst je Szene das erste Bild (kalt), das Neurendern (warm), einen einzelnen
// Renderdurchlauf sowie langsames und hastiges Ziehen mit gedrückter Maus (größte Bildlücke, Bildrate). Verglichen wird mit den
// Basiswerten in cypress/fixtures/leistung-basis.json: deutlich langsamer als die Basis ist ein Fehlschlag.
// Die Grafikkarte wechselt zwischen den Läufen ihre Taktstufe (derselbe Shader braucht mal 6, mal 20 ms), darum zählen bei den
// Renderzeiten die kleinsten Werte, und die Toleranzen sind großzügig; eng sind nur die Werte beim Ziehen, die stabil bei einem
// Bild je Bildschirmtakt liegen. Die Basis vom 18.09.2026 entspricht dem Stand ohne Fraktal-Ebenen (ddb9453) bis auf Messrauschen
// (Vergleich mit tools/leistung.js --staende arbeit,ddb9453).
// Basis neu schreiben (nach gewollten Änderungen oder auf einem anderen Rechner):
//   CYPRESS_leistungBasis=schreiben npx cypress run --browser electron --spec cypress/e2e/24-leistung.cy.js
const BASIS = 'cypress/fixtures/leistung-basis.json', LAUF = 'cypress/leistung-lauf.json';
const SZENEN = 'start,zoom,tief,glaettung,ebenen2,ebenen3';
const zahlen = a => (a || []).filter(Number.isFinite);
const median = a => { const s = zahlen(a).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const kleinster = a => { const s = zahlen(a); return s.length ? Math.min(...s) : NaN; };

describe('Leistung', () => {
  it('rendert die Standardszenen und zieht langsam und hastig nicht langsamer als die Basis', () => {
    cy.task('leistung', ['--staende', 'arbeit', '--runden', '1', '--warm', '3', '--szenen', SZENEN, '--json', LAUF], { timeout: 600000 }).then(r => {   // Aufgabe in cypress.config.js: node tools/leistung.js … ohne Shell
      expect(r.code, 'Messwerkzeug: ' + (r.stderr || r.stdout).slice(-400)).to.eq(0);
      cy.log(r.stdout.split('\n').filter(z => /^(  arbeit|[a-z0-9]+:)/.test(z)).join(' | '));
    });
    cy.readFile(LAUF).then(lauf => {
      const jetzt = {};
      for (const sz of lauf.szenen) {
        const e = sz.staende.arbeit; if (!e || e.hinweis) continue;
        jetzt[sz.name] = { kalt: median(e.kalt), warm: kleinster(e.warm), durchlauf: kleinster(e.durchlauf), glaettung: e.glaettung.length ? kleinster(e.glaettung) : null,
          zugLuecke: median(e.zugLuecke), zugFps: median(e.zugFps), schnellLuecke: median(e.schnellLuecke), schnellFps: median(e.schnellFps) };
      }
      expect(Object.keys(jetzt), 'gemessene Szenen').to.include.members(SZENEN.split(','));
      cy.log(JSON.stringify(jetzt));
      const schreiben = Cypress.env('leistungBasis') === 'schreiben';
      cy.task('dateiDa', BASIS).then(da => {
        if (schreiben || !da) { cy.writeFile(BASIS, { datum: lauf.datum, rechner: lauf.rechner, cpu: lauf.cpu, fenster: lauf.fenster, szenen: jetzt }); cy.log('Basiswerte geschrieben'); return; }
        cy.readFile(BASIS).then(basis => {
          for (const [name, b] of Object.entries(basis.szenen)) {
            const j = jetzt[name]; if (!j) continue;
            expect(j.kalt, `${name}: erstes Bild (Basis ${Math.round(b.kalt)} ms)`).to.be.lessThan(b.kalt * 1.6 + 250);
            expect(j.warm, `${name}: Neurendern (Basis ${Math.round(b.warm)} ms)`).to.be.lessThan(b.warm * 2 + 60);
            if (Number.isFinite(b.durchlauf) && Number.isFinite(j.durchlauf)) expect(j.durchlauf, `${name}: ein Renderdurchlauf (Basis ${b.durchlauf.toFixed(1)} ms)`).to.be.lessThan(b.durchlauf * 3 + 10);
            if (b.glaettung && j.glaettung) expect(j.glaettung, `${name}: Glättung (Basis ${Math.round(b.glaettung)} ms)`).to.be.lessThan(b.glaettung * 2 + 60);
            expect(j.zugLuecke, `${name}: größte Bildlücke beim Ziehen (Basis ${Math.round(b.zugLuecke)} ms)`).to.be.lessThan(Math.max(40, b.zugLuecke * 1.6));
            expect(j.zugFps, `${name}: Bildrate beim Ziehen (Basis ${Math.round(b.zugFps)})`).to.be.greaterThan(Math.min(45, b.zugFps * 0.8));
            expect(j.schnellLuecke, `${name}: größte Bildlücke beim hastigen Ziehen (Basis ${Math.round(b.schnellLuecke)} ms)`).to.be.lessThan(Math.max(60, b.schnellLuecke * 1.6));
            expect(j.schnellFps, `${name}: Bildrate beim hastigen Ziehen (Basis ${Math.round(b.schnellFps)})`).to.be.greaterThan(Math.min(40, b.schnellFps * 0.8));
          }
        });
      });
    });
  });
});
