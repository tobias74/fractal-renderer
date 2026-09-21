// Materialmodell der Reliefbeleuchtung (Färbungen 4, 6, 12): Zeilen nur bei einer Relief-Färbung und hierarchisch, Link-Runde,
// Bild je Material, Schatten, Reflexion und Neigung, WebGPU gleich WebGL 2, „Einfach“ ohne Schlüssel bitgleich zum bisherigen Relief.
import { IMAGE_REGION } from '../support/commands';

describe('Materialmodell des Reliefs', () => {
  const B = 'mode=mandel&re=-0.7435&im=0.1314&z=120&it=800';   // Seepferdchental: viel Relief im Bild
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  const anders = (a, b, text, min = 1) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 4) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.lessThan(max));
  const ZEILEN = ['materialRow', 'glanzRow', 'reflexionRow', 'himmelLageRow', 'himmelSpanneRow', 'neigungRow', 'schattenRow', 'schattenLaengeRow'];
  const REGLER = ['glanzRow', 'reflexionRow', 'neigungRow', 'schattenRow'];
  const UNTER = ['himmelLageRow', 'himmelSpanneRow', 'schattenLaengeRow'];

  it('Zeilen nur bei einer Relief-Färbung, hierarchisch: Regler erst abseits von „Einfach“, Himmel nur mit Reflexion, Schattenlänge nur mit Schatten', () => {
    cy.visitApp(B);   // logarithmisch: kein Relief, keine Zeile
    cy.pane('farbe');
    for (const z of ZEILEN) cy.rowShown(z, false);
    cy.rerender(() => cy.pickOption('mapping', 6));
    cy.rowShown('materialRow', true);
    for (const z of ZEILEN.slice(1)) cy.rowShown(z, false);   // „Einfach“: nur die Auswahl selbst
    cy.expectHash('mt', null);
    cy.rerender(() => cy.pickOption('material', 1));
    cy.expectHash('mt', '1');
    for (const z of REGLER) cy.rowShown(z, true);
    for (const z of UNTER) cy.rowShown(z, false);
    cy.get('#schatten').check({ force: true }); cy.waitRender();
    cy.rowShown('schattenLaengeRow', true); cy.expectHash('ms', '1'); cy.expectHash('ml', null);   // die Vorgabe der Länge steht nicht im Link
    cy.rerender(() => cy.setRange('reflexion', 0.5));
    cy.rowShown('himmelLageRow', true); cy.rowShown('himmelSpanneRow', true); cy.expectHash('mr', '0.5');
    cy.expectHash('mhl', null); cy.expectHash('mhs', null);   // Himmel in der Vorgabe: kein Schlüssel
    cy.rerender(() => cy.setRange('reflexion', 0));
    cy.rowShown('himmelLageRow', false); cy.rowShown('himmelSpanneRow', false); cy.expectHash('mr', null);
    cy.get('#schatten').uncheck({ force: true }); cy.waitRender();
    cy.rowShown('schattenLaengeRow', false); cy.expectHash('ms', null);
    cy.rerender(() => cy.pickOption('material', 2));
    cy.expectHash('mt', '2');
    for (const z of REGLER) cy.rowShown(z, true);
    cy.rerender(() => cy.pickOption('material', 0));
    for (const z of ZEILEN.slice(1)) cy.rowShown(z, false);
    cy.expectHash('mt', null); cy.expectHash('mg', null);
    cy.rerender(() => cy.pickOption('mapping', 4)); cy.rowShown('materialRow', true);    // auch Relief (Abstand) …
    cy.rerender(() => cy.pickOption('mapping', 12)); cy.rowShown('materialRow', true);   // … und Stauchung + Relief
    cy.rerender(() => cy.pickOption('mapping', 2)); cy.rowShown('materialRow', false);
  });

  it('Link-Runde: Laden stellt Auswahl, Regler und Felder wieder her; getippte Werte jenseits des Reglers gelten; Alles zurücksetzen räumt die Schlüssel weg', () => {
    cy.visitApp(B + '&map=6&mt=2&mg=0.8&mr=1.5&mhl=0.25&mhs=0.3&mn=2.5&ms=1&ml=16');
    cy.pane('farbe');
    cy.get('#material').should('have.value', '2');
    cy.get('#glanz').should('have.value', '0.8'); cy.get('#glanzVal').should('have.value', '0,80');
    cy.get('#reflexion').should('have.value', '1.5'); cy.get('#reflexionVal').should('have.value', '1,50');
    cy.get('#himmelLage').should('have.value', '0.25'); cy.get('#himmelSpanne').should('have.value', '0.3');
    cy.get('#neigung').should('have.value', '2.5'); cy.get('#schatten').should('be.checked'); cy.get('#schattenLaenge').should('have.value', '16');
    for (const z of [...REGLER, ...UNTER]) cy.rowShown(z, true);
    cy.hashParams().then(p => {
      expect(p.get('mt')).to.eq('2'); expect(p.get('mg')).to.eq('0.8'); expect(p.get('mr')).to.eq('1.5'); expect(p.get('mhl')).to.eq('0.25');
      expect(p.get('mhs')).to.eq('0.3'); expect(p.get('mn')).to.eq('2.5'); expect(p.get('ms')).to.eq('1'); expect(p.get('ml')).to.eq('16');
    });
    cy.get('#neigungVal').clear().type('8{enter}'); cy.waitRender();   // getippt jenseits des Reglers (5): der Wert bleibt
    cy.expectHash('mn', '8'); cy.get('#neigungVal').should('have.value', '8,00');
    cy.get('#schattenLaengeVal').clear().type('60{enter}'); cy.waitRender();
    cy.expectHash('ml', '60'); cy.get('#schattenLaengeVal').should('have.value', '60');
    cy.location('hash').then(h => {
      cy.visitApp(h);   // die Runde: alles kommt wieder
      cy.pane('farbe');
      cy.get('#material').should('have.value', '2'); cy.get('#neigungVal').should('have.value', '8,00'); cy.get('#schattenLaengeVal').should('have.value', '60');
      cy.get('#himmelLageVal').should('have.value', '0,250'); cy.get('#himmelSpanneVal').should('have.value', '0,300');
    });
    cy.rerender(() => cy.get('#reset').click());   // Alles zurücksetzen: keine Material-Schlüssel mehr
    for (const k of ['mt', 'mg', 'mr', 'mhl', 'mhs', 'mn', 'ms', 'ml']) cy.expectHash(k, null);
    cy.get('#mapping').should('have.value', '2');
  });

  it('Bild: Dielektrikum, Metall, Schatten, Reflexion und Neigung ändern es; „Einfach“ danach ist bitgleich zum Relief ohne Schlüssel', () => {
    cy.visitApp(B + '&map=6');
    cy.shotStats('mat-einfach').then(einfach => {
      cy.visitApp(B + '&map=6&mt=1&mg=0.2');   // breites, schwaches Glanzlicht statt des engen, kräftigen des einfachen Reliefs
      cy.shotStats('mat-dielektrikum').then(di => {
        anders(einfach, di, 'Dielektrikum ändert das Bild');
        cy.visitApp(B + '&map=6&mt=2');
        cy.shotStats('mat-metall').then(me => {
          anders(einfach, me, 'Metall ändert das Bild', 5); anders(di, me, 'Metall sieht anders aus als das Dielektrikum', 5);
          cy.visitApp(B + '&map=6&mt=1&mr=2&mhs=0.5');
          cy.shotStats('mat-reflexion').then(re => anders(einfach, re, 'die Himmelsreflexion aus der Palette ändert das Bild', 5));
          cy.visitApp(B + '&map=6&mt=1&mn=3');
          cy.shotStats('mat-neigung').then(ne => {
            anders(einfach, ne, 'die Relief-Neigung ändert das Bild', 2);
            cy.visitApp(B + '&map=6&mt=1&mn=3&ms=1&ml=20');   // Schatten fallen vor allem an steilen Flanken: auf dem steileren Relief
            cy.shotStats('mat-schatten').then(sch => anders(ne, sch, 'lokale Schatten ändern das Bild'));
          });
          cy.pane('farbe'); cy.rerender(() => cy.pickOption('material', 0));   // zurück zu „Einfach“: exakt das bisherige Bild
          cy.expectHash('mt', null); cy.expectHash('mn', null); cy.gezeichnet();
          cy.shotStats('mat-einfach-zurueck').then(z => diff(einfach, z).then(d => expect(d.meanDiff, '„Einfach“ ist bitgleich zum Relief ohne Schlüssel').to.eq(0)));
        });
      });
    });
  });

  it('WebGL 2 rechnet das Materialmodell wie WebGPU, auch Relief (Abstand) und Stauchung + Relief', () => {
    const gl = { storage: { 'fractal.renderer': 'webgl' } };
    for (const [name, link] of [['log', B + '&map=6&mt=2&mg=0.7&mr=1&mhs=0.4&mn=2&ms=1&ml=12'], ['abstand', B + '&map=4&mt=1&mg=0.8&mr=1.5&ms=1'], ['stauchung', B + '&map=12&sc=0.4&mt=2&mn=1.5']]) {
      cy.visitApp(link);
      cy.get('#badge').should('have.text', 'WebGPU');
      cy.shotStats('mat-gpu-' + name).then(gpu => {
        cy.visitApp(link, gl);
        cy.get('#badge').should('have.text', 'WebGL 2');
        cy.get('#state', { timeout: 25000 }).should('not.contain.text', 'übersetzt'); cy.waitRender();
        cy.shotStats('mat-gl-' + name).then(webgl => gleich(gpu, webgl, 'WebGL 2 rechnet dasselbe Bild (' + name + ')'));
      });
    }
  });
});
