// Eigene Ausdrücke: die Formelsprache (AUSDRUCK), die eigene Formel (37), der eigene Sammler je Stelle (Färbung 35, Paarwert 10
// je Achse, Texturart 22 je Platz) und die eigene Ebenenabbildung (7) — Eingabefelder, Anzeige, Fehler, Link, Bild, WebGL 2.
import { IMAGE_REGION } from '../support/commands';

describe('Eigene Ausdrücke', () => {
  const anders = (a, b, text, min = 3) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 8) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.lessThan(max));

  it('Formelsprache: Unicode wird zu ASCII, die Anzeige zeigt die gelesene Form, Fehler nennen die Stelle', () => {
    cy.visitApp('mode=mandel');
    cy.window().then(win => {
      const A = win.AUSDRUCK; const r = A.uebersetze('z² − c·z₁ + π', 'formel');
      expect(r.ok).to.be.true; expect(r.ascii).to.eq('z^2 - c*z_1 + pi'); expect(r.schoen).to.eq('z² − c·z₁ + π');
      const w = A.uebersetze('0.5 + 0.5 sin(4 arg z)', 'wert');
      expect(w.ok).to.be.true; expect(w.schoen).to.eq('0.5 + 0.5 sin(4 arg(z))');
      const e = A.uebersetze('z + q', 'wert');
      expect(e.ok).to.be.false; expect(e.key).to.eq('expr.err-unknown'); expect(e.pos).to.eq(4); expect(e.arg).to.eq('q');
      const reell = A.uebersetze('z', 'wert');
      expect(reell.ok, 'ein Sammler braucht ein reelles Ergebnis').to.be.false; expect(reell.key).to.eq('expr.err-real');
      const v = A.rechne(A.parsen('z^2 + c', 'formel').ast, { z: [0.3, 0.4], c: [-0.5, 0.25] });
      expect(v[0]).to.be.closeTo(-0.57, 1e-12); expect(v[1]).to.be.closeTo(0.49, 1e-12);
    });
  });

  it('Eigene Formel: z^2 + c ist die Vorgabe und sieht aus wie Mandelbrot; getippt ändert Link und Bild; Fehler bleiben außen vor', () => {
    cy.visitApp('mode=mandel&f=37');
    cy.waitRender();
    cy.rowShown('formelRow', true); cy.rowShown('paramRow', true); cy.rowShown('param2Row', true);
    cy.get('#formelEigen').should('have.value', 'z^2 + c');
    cy.get('#formelEigenText').should('have.text', 'z² + c').and('not.have.class', 'fehler');
    cy.get('#formulaNote').should('have.text', 'fp32, Zoom bis 10^5');
    cy.expectHash('xf', 'z^2 + c');
    cy.shotStats('xf-vorgabe').then(vorgabe => {
      cy.visitApp('mode=mandel&f=0'); cy.waitRender();
      cy.shotStats('xf-mandelbrot').then(mb => gleich(vorgabe, mb, 'z^2 + c direkt sieht aus wie die Mandelbrot-Menge'));
      cy.visitApp('mode=mandel&f=37'); cy.waitRender();
      cy.get('#formelEigen').clear().type('z^3 + c{enter}');
      cy.get('#formelEigenText').should('have.text', 'z³ + c');
      cy.expectHash('xf', 'z^3 + c');
      cy.waitRender();
      cy.shotStats('xf-kubisch').then(k3 => {
        anders(vorgabe, k3, 'z³ + c ist ein anderes Bild');
        cy.get('#formelEigen').clear().type('z^3 +{enter}');   // unvollständig: Anzeige meldet den Fehler, Zustand und Link behalten die gültige Formel
        cy.get('#formelEigenText').should('have.class', 'fehler').and('contain.text', 'Stelle 6');
        cy.expectHash('xf', 'z^3 + c');
        cy.get('#formelEigen').clear().type('z^4 + c{enter}'); cy.waitRender(); cy.wait(400);   // geänderter Ausdruck: der Shader muss neu übersetzen, nicht das alte Bild stehen lassen
        cy.shotStats('xf-k4').then(k4 => anders(k3, k4, 'z⁴ + c rechnet wirklich neu'));
      });
    });
    cy.visitApp('mode=mandel&f=37&xf=z%5E2+%2B+q');   // ungültig im Link: die Vorgabe
    cy.get('#formelEigen').should('have.value', 'z^2 + c');
    cy.visitApp('mode=julia&f=37&xf=z%5E2+%2B+c%2Bz_1*0.1'); cy.waitRender();   // Julia-Modus mit z_1
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.visitApp('mode=mandel&f=0'); cy.rowShown('formelRow', false);
  });

  it('Eigener Sammler der Färbung: Feld, Zusammenfassung und Zustand stehen im Link, wenn sie von der Vorgabe abweichen; das Bild folgt', () => {
    cy.visitApp('mode=mandel&map=35');
    cy.waitRender();
    cy.pane('farbe');
    cy.rowShown('eigenFRow', true);
    cy.get('#eigenF').should('have.value', '|z|'); cy.get('#eigenFText').should('have.text', '|z|');
    cy.get('#eigenFG').should('have.value', '1');
    cy.get('#eigenFSText').should('have.text', 's bleibt 0');
    cy.expectHash('xc', null); cy.expectHash('xcg', null); cy.expectHash('xcs', null);
    cy.shotStats('xc-vorgabe').then(vorgabe => {
      cy.rerender(() => cy.pickOption('eigenFG', 0));   // Mittel statt Minimum
      cy.expectHash('xcg', '0');
      cy.shotStats('xc-mittel').then(mittel => {
        anders(vorgabe, mittel, 'das Mittel von |z| färbt anders als das Minimum');
        cy.get('#eigenF').clear().type('|z - 1|{enter}');
        cy.get('#eigenFText').should('have.text', '|z − 1|');
        cy.expectHash('xc', '|z - 1|');
        cy.waitRender();
        cy.shotStats('xc-punkt').then(p => anders(mittel, p, 'ein anderer Ausdruck, ein anderes Bild'));
      });
      cy.get('#eigenFS').clear().type('s + 1{enter}');   // Zustand zählt die Schritte
      cy.get('#eigenFSText').should('have.text', 's + 1');
      cy.expectHash('xcs', 's + 1');
      cy.get('#eigenF').clear().type('q{enter}');   // Fehler: Anzeige, Link bleibt
      cy.get('#eigenFText').should('have.class', 'fehler').and('contain.text', 'unbekannter Name');
      cy.expectHash('xc', '|z - 1|');
    });
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.pane('farbe'); cy.get('#eigenF').should('have.value', 'frac(re z)'); cy.get('#eigenFG').should('have.value', '4'); cy.get('#eigenFS').should('have.value', 's + 1');
    cy.visitApp('mode=mandel'); cy.pane('farbe'); cy.rowShown('eigenFRow', false);
  });

  it('Paar-Achsen und Texturplätze tragen je einen eigenen Ausdruck: Block bei der Stelle, Schlüssel im Link', () => {
    const H = 'mode=mandel&map=31&pa=10:1:0:0&pb=10:20:0:0&pae=%7Cim+z%7C&pbe=frac(2+arg+z%2Fpi)&pbeg=0';   // beide Achsen mit eigenem Ausdruck
    cy.visitApp(H); cy.waitRender();
    cy.pane('farbe'); cy.rowShown('eigenPARow', true); cy.rowShown('eigenPBRow', true); cy.rowShown('eigenFRow', false);
    cy.get('#eigenPA').should('have.value', '|im z|'); cy.get('#eigenPB').should('have.value', 'frac(2 arg z/pi)'); cy.get('#eigenPBG').should('have.value', '0');
    cy.get('#eigenPBText').should('have.text', 'frac(2 arg(z)/π)');
    cy.shotStats('pe-zwei').then(zwei => {
      cy.get('#eigenPB').clear().type('|re z|{enter}');
      cy.expectHash('pbe', '|re z|');
      cy.waitRender();
      cy.shotStats('pe-anders').then(a => anders(zwei, a, 'die zweite Achse mit anderem Ausdruck färbt anders'));
      cy.rerender(() => cy.pickOption('paarB', 2));   // Streifenmittel: der Block der Achse B verschwindet, der Schlüssel auch
      cy.rowShown('eigenPBRow', false); cy.rowShown('eigenPARow', true); cy.expectHash('pbe', null); cy.expectHash('pae', '|im z|');
    });
    const T = 'mode=mandel&tx=22&te=frac(2+arg+z%2Fpi)&teg=0&t2=22&t2e=%7Cim+z%7C';   // zwei Texturplätze, zwei Ausdrücke
    cy.visitApp(T); cy.waitRender();
    cy.pane('farbe'); cy.rowShown('eigenT1Row', true); cy.rowShown('eigenT2Row', true);
    cy.get('#eigenT1').should('have.value', 'frac(2 arg z/pi)'); cy.get('#eigenT2').should('have.value', '|im z|'); cy.get('#eigenT1G').should('have.value', '0');
    cy.shotStats('te-zwei').then(zwei => {
    });
    cy.visitApp('mode=mandel'); cy.pane('farbe'); cy.rowShown('eigenT1Row', false);
  });

  it('Eigene Ebenenabbildung: c^2 gleicht der eingebauten Quadratur, c^3 ist ein anderes Bild, das Feld zeigt die Form', () => {
    cy.visitApp('mode=mandel&ab=7&xm=c%5E2&z=0.5'); cy.waitRender();
    cy.revealInDetails('abbEigenRow');
    cy.get('#abbEigen').should('have.value', 'c^2'); cy.get('#abbEigenText').should('have.text', 'c²');
    cy.expectHash('xm', 'c^2');
    cy.shotStats('xm-quadrat').then(q => {
      cy.visitApp('mode=mandel&ab=3&z=0.5'); cy.waitRender();
      cy.shotStats('xm-eingebaut').then(e => gleich(q, e, 'c² als Ausdruck gleicht der eingebauten Abbildung z²', 3));
      cy.visitApp('mode=mandel&ab=7&xm=c%5E3&z=0.5'); cy.waitRender();
      cy.get('#abbEigenText').should('have.text', 'c³');
      cy.shotStats('xm-kubik').then(k => {
        anders(q, k, 'c³ ist ein anderes Bild');
      });
    });
    cy.visitApp('mode=mandel&ab=3'); cy.rowShown('abbEigenRow', false);
  });
});
