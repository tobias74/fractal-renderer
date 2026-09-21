// Palettenkurve: die Farben innerhalb eines Palettenumlaufs umverteilen. Exponent 1 ist die Gleichverteilung und
// lässt jedes alte Bild unverändert; der Schwerpunkt erscheint erst, wenn eine Kurve wirkt. Die Kurve bildet den
// Umlauf auf sich selbst ab, die Umlaufgrenze bleibt also unberührt.
import { IMAGE_REGION } from '../support/commands';

describe('Palettenkurve', () => {
  const B = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400&ca=off';
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });

  it('Vorgabe ist die Gleichverteilung, der Schwerpunkt erscheint erst mit einer Kurve', () => {
    cy.visitApp(B);
    cy.pane('palette');
    cy.get('#palKurve').should('have.value', '1');
    cy.get('#palKurveVal').should('have.value', '1,00');
    cy.rowShown('palKurveMitteRow', false);
    cy.expectHash('plk', null); cy.expectHash('plm', null);
    cy.rerender(() => cy.get('#palKurve').invoke('val', '3.2').trigger('input'));
    cy.expectHash('plk', '3.2');
    cy.rowShown('palKurveMitteRow', true);
    cy.rerender(() => cy.get('#palKurve').invoke('val', '1').trigger('input'));   // zurück auf gleichmäßig: der Schlüssel verschwindet
    cy.expectHash('plk', null);
    cy.rowShown('palKurveMitteRow', false);
  });

  it('getippte Werte gelten auch jenseits des Reglers, und Zurücksetzen räumt beide Schlüssel weg', () => {
    cy.visitApp(B + '&plk=3.2&plm=0.4');
    cy.pane('palette');
    cy.get('#palKurveVal').should('have.value', '3,20');
    cy.get('#palKurveMitteVal').should('have.value', '0,400');
    cy.rerender(() => cy.get('#palKurveVal').clear().type('8{enter}'));   // weiter als der Regler reicht
    cy.expectHash('plk', '5');                                            // auf die Grenze geklemmt
    cy.get('#resetAll').click();
    cy.expectHash('plk', null); cy.expectHash('plm', null);
  });

  it('die Kurve färbt anders, der Schwerpunkt verschiebt die Stauchung, und WebGL 2 rechnet gleich', () => {
    cy.visitApp(B); cy.waitRender();
    cy.shotStats('pk-gleich').then(gleich => {
      cy.visitApp(B + '&plk=3.2'); cy.waitRender();
      cy.shotStats('pk-kurve').then(kurve => {
        diff(gleich, kurve).then(d => expect(d.meanDiff, 'die Kurve verteilt die Farben um').to.be.greaterThan(3));
        cy.visitApp(B + '&plk=3.2&plm=0.4'); cy.waitRender();
        cy.shotStats('pk-mitte').then(mitte => diff(kurve, mitte).then(d => expect(d.meanDiff, 'der Schwerpunkt verschiebt die Stauchung').to.be.greaterThan(3)));
      });
      cy.visitApp(B + '&plk=1'); cy.waitRender();   // ausdrücklich gleichmäßig: dasselbe Bild
      cy.shotStats('pk-eins').then(eins => diff(gleich, eins).then(d => expect(d.meanDiff, 'Exponent 1 lässt das Bild, wie es war').to.be.lessThan(0.5)));
    });
    const H = B + '&plk=3.2&plm=0.4';
    cy.visitApp(H); cy.waitRender();
    cy.shotStats('pk-gpu').then(gpu => {
      cy.visitApp(H, { storage: { 'fractal.renderer': 'webgl' } });
      cy.get('#badge').should('have.text', 'WebGL 2');
      cy.waitRender();
      cy.shotStats('pk-gl').then(g => diff(gpu, g).then(d => expect(d.meanDiff, 'WebGL 2 rechnet die Kurve wie WebGPU').to.be.lessThan(8)));
    });
  });
});
