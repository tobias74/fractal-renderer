// Näherung (BLA) im Tiefenzoom: die Näherung muss dasselbe Bild liefern wie die Rechnung ohne sie — dieser
// Vergleich fehlte bisher. Dazu die zertifizierte Fassung, die im Radius zusätzlich die Rundung bilanziert und
// deshalb etwas seltener abkürzt; sie muss erst recht dasselbe Bild liefern.
// Die Schranke liegt bei 5: an den Bandgrenzen im Tiefenzoom verschiebt sich die Fluchtzeit um einen Schritt.
import { DEEP_HASH, IMAGE_REGION } from '../support/commands';

describe('Näherung (BLA): gleiches Bild, zertifizierte Fassung', () => {
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });

  it('die Auswahl kennt vier Einstellungen und trägt die zertifizierte in Adresse und Speicher', () => {
    cy.visitApp(DEEP_HASH);
    cy.revealInDetails('blaSel');
    cy.get('#blaSel option').should('have.length', 4);
    cy.get('#blaSel option[value="2"]').should('have.text', 'Zertifiziert');
    cy.get('#blaSel').should('have.value', 'auto'); cy.expectHash('bla', null);
    cy.rerender(() => cy.pickOption('blaSel', '2'));
    cy.expectHash('bla', '2');
    cy.window().then(w => expect(w.localStorage.getItem('fractal.bla'), 'die Wahl liegt im Speicher').to.equal('2'));
    cy.visitApp(DEEP_HASH + '&bla=2');
    cy.revealInDetails('blaSel'); cy.get('#blaSel').should('have.value', '2');
  });

  it('mit Näherung, ohne Näherung und zertifiziert ergeben dasselbe Bild', () => {
    cy.visitApp(DEEP_HASH + '&bla=0'); cy.waitRender();
    cy.shotStats('bla-aus').then(aus => {
      cy.visitApp(DEEP_HASH + '&bla=1'); cy.waitRender();
      cy.shotStats('bla-an').then(an => diff(aus, an).then(d => expect(d.meanDiff, 'die Näherung kürzt ab, ohne das Bild zu ändern').to.be.lessThan(5)));
      cy.visitApp(DEEP_HASH + '&bla=2'); cy.waitRender();
      cy.shotStats('bla-zert').then(z => diff(aus, z).then(d => expect(d.meanDiff, 'die zertifizierte Fassung erst recht').to.be.lessThan(5)));
    });
  });

  it('auch am Rand eines Minibrots, wo die Neubasis oft greift, bleibt das Bild gleich', () => {
    const H = 'mode=mandel&re=-1.7492046334590113&im=0.0000000000000000&z=8e12&it=3000&ca=off';
    cy.visitApp(H + '&bla=0'); cy.waitRender();
    cy.shotStats('bla-mini-aus').then(aus => {
      cy.visitApp(H + '&bla=2'); cy.waitRender();
      cy.shotStats('bla-mini-zert').then(z => diff(aus, z).then(d => expect(d.meanDiff, 'Neubasis und zertifizierte Radien ändern das Bild nicht').to.be.lessThan(2)));
    });
  });
});
