// Adaptive Glättung sammelt fertig gefärbte Proben. Ändert sich eine Farbeinstellung, müssen die Proben neu gefärbt werden —
// sonst bleibt das alte Bild stehen, bis man neu lädt (so geschehen mit dem Regler der logarithmischen Färbung, weil die
// von Hand gepflegte Liste der Farbeinstellungen ihn nicht kannte). Hier: bei maximaler adaptiver Glättung jeden reinen
// Farbregler verstellen; das Bild muss danach genau dem frisch geladenen Link gleichen.
import { IMAGE_REGION } from '../support/commands';

const ADAPTIV = '&aa=2&aam=adaptive&aat=0.003&aax=1024&aas=0.45';   // Glättung adaptiv, höchste Probenzahl
const GEGLAETTET = /Fertig.*Glättung/;   // erst dann ist das Bild fertig geglättet: „Fertig“ allein steht kurz, bevor die adaptive Glättung anläuft
const B = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=1500&ca=off' + ADAPTIV;

describe('Adaptive Glättung: jede Farbänderung wirkt sofort', () => {
  const vergleichen = (name, link, verstellen) => {
    it(name, () => {
      cy.visitApp(link, { aa: '' }); cy.waitRender(GEGLAETTET);
      cy.shotStats(name + '-vorher').then(vorher => {
        cy.get('#state').invoke('text').then(alt => {
          verstellen();
          // erst ein neuer Durchlauf (die Statuszeile verlässt den alten Stand), dann dessen Ende — bleibt der Neustart aus, wie beim Fehler, schlägt schon das an
          cy.get('#state', { timeout: 20000 }).should($s => expect($s.text(), 'die Glättung beginnt neu').not.to.equal(alt));
        });
        cy.waitRender(GEGLAETTET);
        cy.shotStats(name + '-verstellt').then(verstellt => {
          cy.task('pngDiff', { a: vorher.file, b: verstellt.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'der Regler verändert das Bild').to.be.greaterThan(1));
          cy.location('hash').then(h => {
            cy.visitApp(h, { aa: '' }); cy.waitRender(GEGLAETTET);   // derselbe Stand, frisch geladen
            cy.shotStats(name + '-frisch').then(frisch => cy.task('pngDiff', { a: verstellt.file, b: frisch.file, region: IMAGE_REGION })
              .then(d => expect(d.meanDiff, 'ohne Neuladen dasselbe Bild wie frisch geladen').to.be.lessThan(1)));
          });
        });
      });
    });
  };
  vergleichen('Log-Start (logarithmische Färbung)', B + '&map=33', () => { cy.pane('farbe'); cy.setRange('logmap', 200); });
  vergleichen('Log-Stufen', B + '&map=2', () => { cy.pane('farbe'); cy.setRange('logStufen', 4); });
  vergleichen('Palettenkurve', B, () => { cy.pane('palette'); cy.setRange('palKurve', 3); });
  vergleichen('Palettenübergang', B, () => { cy.pane('palette'); cy.setRange('palPfadSpanne', 6); cy.pickOption('palZwei', 4); });   // Vorgabe der Zielpalette ist die Hauptpalette selbst: eine andere wählen
  vergleichen('Farbversatz', B, () => { cy.pane('palette'); cy.setRange('offset', 400); });

  it('die Glättung kommt zur Ruhe: der Schlüssel der Farbe ändert sich nicht von selbst', () => {
    cy.visitApp(B + '&map=33&lm=200', { aa: '' }); cy.waitRender(GEGLAETTET);
    cy.get('#state').invoke('text').then(t1 => { cy.wait(2500); cy.get('#state').invoke('text').should('equal', t1); });   // kein neuer Durchlauf ohne Anlass
  });
});
