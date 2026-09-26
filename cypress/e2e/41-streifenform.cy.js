// Form des Streifenmittels (26.09.2026): Welle ½ + ½·sin(n·arg z) wie bisher (Vorgabe) oder Abschnitte — der Kreis in
// n Abschnitte geteilt, der Wert ist die Lage des Winkels im Abschnitt (Sägezahn). Additiv: ohne sf bleibt jedes Bild, wie es war.
import { IMAGE_REGION } from '../support/commands';

const B = 'mode=mandel&re=-0.7453&im=0.1127&z=300&it=500';
const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => d.meanDiff);

describe('Form des Streifenmittels', () => {
  it('die Auswahl steht nur beim Streifenmittel und ist von Haus aus die Welle', () => {
    cy.visitApp(B + '&map=19');
    cy.rowShown('streifenFormRow');
    cy.get('#streifenForm').should('have.value', '0');
    cy.get('#streifenForm option[value="1"]').should('have.text', 'Abschnitte (Sägezahn)');
    cy.visitApp(B + '&map=2');
    cy.rowShown('streifenFormRow', false);
    cy.visitApp(B + '&map=2&tx=1');   // als Textur rechnet das Streifenmittel auch
    cy.rowShown('streifenFormRow');
  });

  it('Abschnitte färben anders, stehen im Link, kommen beim Laden zurück; die Welle gleicht dem Bild ohne sf', () => {
    cy.visitApp(B + '&map=19'); cy.shotStats('form-ohne').then(ohne => {
      cy.visitApp(B + '&map=19&sf=0'); cy.shotStats('form-welle').then(welle => diff(ohne, welle).then(d => expect(d, 'Welle = bisher').to.be.lessThan(0.5)));
      cy.visitApp(B + '&map=19&sf=1');
      cy.get('#streifenForm').should('have.value', '1'); cy.expectHash('sf', '1');
      cy.shotStats('form-saege').then(saege => diff(ohne, saege).then(d => expect(d, 'Abschnitte verändern das Bild').to.be.greaterThan(2)));
    });
    cy.pickOption('streifenForm', '0');
    cy.location('hash').should('not.include', 'sf=');
  });

  it('gilt auch für das Streifenmittel als Textur; ohne Streifenmittel schreibt der Link kein sf', () => {
    cy.visitApp(B + '&map=2&tx=1&tz=3&ts=0.5'); cy.shotStats('tex-welle').then(welle => {
      cy.visitApp(B + '&map=2&tx=1&tz=3&ts=0.5&sf=1'); cy.expectHash('sf', '1');
      cy.shotStats('tex-saege').then(saege => diff(welle, saege).then(d => expect(d, 'Textur in Abschnitten').to.be.greaterThan(1)));
    });
    cy.visitApp(B + '&map=2&sf=1');
    cy.location('hash').should('not.include', 'sf=');
  });
});
