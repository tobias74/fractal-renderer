// Weitere Ziele der Texturplätze: Farbton (5), Glühen (6) und Deckkraft der Ebene (7). Geprüft: die Auswahl ist
// hierarchisch (Glühen nur mit wirksamen Kantenlinien, Deckkraft nur ab der zweiten Fraktal-Ebene), die Werte
// überstehen Link und „Alles zurücksetzen“, jedes Ziel ändert das Bild, die Vorgabe lässt das alte Bild, und.
// Die Deckkraft reist über ein eigenes, drittes Ziel des Farbpasses zum Ebenenpass — der liest die fertige Farbe
// aus dem Zwischenbild und käme sonst nicht an sie heran.
import { IMAGE_REGION } from '../support/commands';

describe('Ziele der Texturplätze: Farbton, Glühen und Deckkraft', () => {
  const B = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400&ca=off';
  const KANTE = B + '&tx=11&ts=0.8';                       // Kanten: die Textur braucht keine Bahnstatistik, darum bleiben die Kantenlinien wirksam
  const ZWEI = '&l2=f%3D1&lm2=2:0.7:1:0:1:';               // zweite Fraktal-Ebene darunter
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  const anders = (a, b, text, min = 3) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 8) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.lessThan(max));
  const option = (v, versteckt) => cy.get('#texZiel1 option[value="' + v + '"]').should(versteckt ? 'have.attr' : 'not.have.attr', 'hidden');

  it('die Auswahl ist hierarchisch: Farbton immer, Glühen nur mit Kantenlinien, Deckkraft nur ab der zweiten Ebene', () => {
    cy.visitApp(KANTE);                                     // eine Ebene, keine Kantenlinien
    cy.pane('texturen');
    cy.get('#texZiel1 option').should('have.length', 9);
    cy.get('#texZiel1 option[value="5"]').should('have.text', 'Farbton');
    cy.get('#texZiel1 option[value="6"]').should('have.text', 'Glühen');
    cy.get('#texZiel1 option[value="7"]').should('have.text', 'Deckkraft der Ebene');
    option('5', false); option('6', true); option('7', true);
    cy.visitApp(KANTE + '&glow=1&gw=8');                    // mit Kantenlinien
    cy.pane('texturen'); option('6', false); option('7', true);
    cy.visitApp(KANTE + ZWEI);                              // mit zweiter Ebene
    cy.pane('texturen'); option('6', true); option('7', false);
    cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI);             // beides
    cy.pane('texturen'); option('5', false); option('6', false); option('7', false);
  });

  it('die Ziele stehen im Link, überstehen das Laden und weichen der Helligkeit, wenn ihre Voraussetzung fehlt', () => {
    cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI);
    cy.pane('texturen');
    cy.get('#texZiel1').should('have.value', '2'); cy.expectHash('tz', null);   // Vorgabe: Helligkeit, ohne Schlüssel
    cy.rerender(() => cy.pickOption('texZiel1', '5'));
    cy.expectHash('tz', '5');
    cy.rowShown('texFarbenRow', false);   // der Farbton braucht die beiden Farben nicht …
    cy.rowShown('texMaskeRow1', true);    // … folgt aber der Maske wie die Helligkeit
    cy.rerender(() => cy.pickOption('texZiel1', '6'));
    cy.expectHash('tz', '6'); cy.rowShown('texMaskeRow1', false);   // das Glühen summiert die Werte, es wirkt überall
    cy.rerender(() => cy.pickOption('texZiel1', '7'));
    cy.expectHash('tz', '7'); cy.rowShown('texMaskeRow1', false);
    cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI + '&tz=7');   // aus dem Link geladen bleibt es stehen
    cy.pane('texturen'); cy.get('#texZiel1').should('have.value', '7');
    cy.visitApp(KANTE + '&glow=1&gw=8&tz=7');               // ohne zweite Ebene fällt die Deckkraft auf die Helligkeit zurück
    cy.pane('texturen'); cy.get('#texZiel1').should('have.value', '2'); cy.expectHash('tz', null);
    cy.visitApp(KANTE + ZWEI + '&tz=6');                    // ohne Kantenlinien ebenso das Glühen
    cy.pane('texturen'); cy.get('#texZiel1').should('have.value', '2'); cy.expectHash('tz', null);
    cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI + '&tz=5');   // „Alles zurücksetzen“ räumt den Schlüssel weg
    cy.get('#resetAll').click();
    cy.expectHash('tz', null);
  });

  it('jedes Ziel ändert das Bild, und die Vorgabe lässt es, wie es war', () => {
    cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI); cy.waitRender();
    cy.shotStats('tz2-vorgabe').then(vor => {
      cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI + '&ts=1.5&tz=5'); cy.waitRender();
      cy.shotStats('tz2-farbton').then(a => anders(vor, a, 'der Farbton dreht die Farbe'));
      cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI + '&ts=1.5&tz=6'); cy.waitRender();
      cy.shotStats('tz2-gluehen').then(a => anders(vor, a, 'das Glühen folgt dem Wert des Platzes'));
      cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI + '&ts=1.5&tz=7'); cy.waitRender();
      cy.shotStats('tz2-deckkraft').then(a => anders(vor, a, 'die Deckkraft der Ebene folgt dem Wert des Platzes'));
      cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI + '&tz=2'); cy.waitRender();   // ausdrücklich die Vorgabe: dasselbe Bild
      cy.shotStats('tz2-wie-vorgabe').then(a => gleich(vor, a, 'die Helligkeit bleibt die Vorgabe', 0.5));
    });
  });

});
