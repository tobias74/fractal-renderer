// Palettenübergang: eine zweite Palette, in die das Bild hineinwächst, während die Palettenstelle fortschreitet.
// Spanne 0 ist die Vorgabe und heißt: kein Übergang, es bleibt bei der einen Palette und am alten Bild.
import { IMAGE_REGION } from '../support/commands';

describe('Palettenübergang', () => {
  const B = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400&ca=off';
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });

  it('ohne Spanne gibt es keinen Übergang; zweite Palette und Beginn erscheinen erst mit ihr', () => {
    cy.visitApp(B);
    cy.pane('palette');
    cy.get('#palPfadSpanne').should('have.value', '0');
    cy.rowShown('palZweiRow', false); cy.rowShown('palPfadBeginnRow', false);
    cy.expectHash('pps', null); cy.expectHash('pp2', null); cy.expectHash('ppb', null);
    cy.rerender(() => cy.get('#palPfadSpanne').invoke('val', '6').trigger('input'));
    cy.expectHash('pps', '6');
    cy.rowShown('palZweiRow', true); cy.rowShown('palPfadBeginnRow', true);
    cy.rerender(() => cy.get('#palPfadSpanne').invoke('val', '0').trigger('input'));
    cy.expectHash('pps', null);
    cy.rowShown('palZweiRow', false);
  });

  it('zweite Palette und Beginn stehen im Link und überstehen das Laden, Zurücksetzen räumt sie weg', () => {
    cy.visitApp(B + '&pps=6&pp2=4&ppb=-2');
    cy.pane('palette');
    cy.get('#palPfadSpanneVal').should('have.value', '6,00');
    cy.get('#palPfadBeginnVal').should('have.value', '-2,00');
    cy.get('#palZwei').should('have.value', '4');
    cy.get('#resetAll').click();
    cy.expectHash('pps', null); cy.expectHash('pp2', null); cy.expectHash('ppb', null);
  });

  it('der Übergang färbt anders, die zweite Palette zählt, und WebGL 2 rechnet gleich', () => {
    cy.visitApp(B); cy.waitRender();
    cy.shotStats('pp-ohne').then(ohne => {
      cy.visitApp(B + '&pps=6&pp2=4'); cy.waitRender();
      cy.shotStats('pp-mit').then(mit => {
        diff(ohne, mit).then(d => expect(d.meanDiff, 'die zweite Palette übernimmt nach hinten').to.be.greaterThan(3));
        cy.visitApp(B + '&pps=6&pp2=9'); cy.waitRender();
        cy.shotStats('pp-andere').then(a => diff(mit, a).then(d => expect(d.meanDiff, 'eine andere zweite Palette färbt anders').to.be.greaterThan(3)));
      });
      cy.visitApp(B + '&pps=0'); cy.waitRender();   // ausdrücklich ohne Spanne: dasselbe Bild
      cy.shotStats('pp-null').then(nul => diff(ohne, nul).then(d => expect(d.meanDiff, 'ohne Spanne bleibt das alte Bild').to.be.lessThan(0.5)));
    });
    const H = B + '&pps=6&pp2=4&ppb=-2';
    cy.visitApp(H); cy.waitRender();
    cy.shotStats('pp-gpu').then(gpu => {
      cy.visitApp(H, { storage: { 'fractal.renderer': 'webgl' } });
      cy.get('#badge').should('have.text', 'WebGL 2');
      cy.waitRender();
      cy.shotStats('pp-gl').then(g => diff(gpu, g).then(d => expect(d.meanDiff, 'WebGL 2 rechnet den Übergang wie WebGPU').to.be.lessThan(8)));
    });
  });

  it('der Übergang wirkt auch mit vorgefilterter Palette (gemitteltes Nachschlagen)', () => {
    cy.visitApp(B + '&pf=1'); cy.waitRender();
    cy.shotStats('pp-vf-ohne').then(ohne => {
      cy.visitApp(B + '&pf=1&pps=6&pp2=4'); cy.waitRender();
      cy.shotStats('pp-vf-mit').then(mit => diff(ohne, mit).then(d => expect(d.meanDiff, 'auch die gemittelte Palette folgt dem Übergang').to.be.greaterThan(3)));
    });
  });
});
