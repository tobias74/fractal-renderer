// Texturen über den Färbungen nach Abstand (4) und Relief (6, 12): beide brauchten früher denselben zweiten Kanal
// und schlossen sich aus. Jetzt behält die Färbung den y-Kanal und die Texturwerte stehen in z und w, wie es bei den
// Färbungen nach Bahnwerten längst der Fall ist.
import { IMAGE_REGION } from '../support/commands';

describe('Texturen über Abstand und Relief', () => {
  const B = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400&ca=off';
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  const anders = (a, b, text, min = 3) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 0.5) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.lessThan(max));

  it('die Texturen stehen bei Abstand und Relief zur Verfügung, bei Lyapunov weiterhin nicht', () => {
    for (const m of [4, 6, 12]) {
      cy.visitApp(B + '&map=' + m);
      cy.get('#railTexturen').should('not.have.attr', 'hidden');
      cy.pane('texturen');
      cy.get('#textur').should('exist');
    }
    cy.visitApp(B + '&map=15');            // Lyapunov: keine Texturen, wie bisher
    cy.get('#railTexturen').should('have.attr', 'hidden');
  });

  it('eine Textur über dem Relief ändert das Bild, ohne Textur bleibt es wie zuvor', () => {
    cy.visitApp(B + '&map=6&mt=2&mg=0.7'); cy.waitRender();
    cy.shotStats('tr-ohne').then(ohne => {
      cy.visitApp(B + '&map=6&mt=2&mg=0.7&tx=1&ts=2&tc=6'); cy.waitRender();
      cy.shotStats('tr-mit').then(mit => anders(ohne, mit, 'die Textur liegt über dem beleuchteten Relief'));
      cy.visitApp(B + '&map=6&mt=2&mg=0.7&tx=0'); cy.waitRender();   // ausdrücklich ohne Platz: dasselbe Bild
      cy.shotStats('tr-leer').then(leer => gleich(ohne, leer, 'ohne Textur bleibt das Relief, wie es war'));
    });
  });

  it('das Ziel Relief-Höhe gibt es nur bei den beiden beleuchteten Färbungen und es formt das Höhenfeld', () => {
    const H = B + '&map=6&mt=2&mg=0.7&tx=1&ts=2&tc=6';
    cy.visitApp(H);
    cy.pane('texturen');
    cy.get('#texZiel1 option[value="8"]').should('not.have.attr', 'hidden').and('have.text', 'Relief-Höhe');
    cy.visitApp(B + '&map=2&tx=1&ts=2');        // gewöhnliche Färbung: kein Höhenfeld, also kein Ziel
    cy.pane('texturen');
    cy.get('#texZiel1 option[value="8"]').should('have.attr', 'hidden');
    cy.visitApp(B + '&map=2&tx=1&ts=2&tz=8');   // aus dem Link: fällt sichtbar auf die Helligkeit zurück
    cy.pane('texturen'); cy.get('#texZiel1').should('have.value', '2'); cy.expectHash('tz', null);
    cy.visitApp(H); cy.waitRender();
    cy.shotStats('tr-hell').then(hell => {
      cy.visitApp(H + '&tz=8'); cy.waitRender();
      cy.expectHash('tz', '8');
      cy.shotStats('tr-hoehe').then(hoehe => anders(hell, hoehe, 'als Höhe formt der Wert das Relief statt die Farbe'));
    });
  });

  it('WebGL 2 rechnet Textur über Relief und die Relief-Höhe wie WebGPU', () => {
    const gl = { storage: { 'fractal.renderer': 'webgl' } };
    for (const [z, name] of [['2', 'hell'], ['8', 'hoehe']]) {
      const H = B + '&map=6&mt=2&mg=0.7&tx=1&ts=2&tc=6&tz=' + z;
      cy.visitApp(H); cy.waitRender();
      cy.shotStats('tr-gpu-' + name).then(gpu => {
        cy.visitApp(H, gl);
        cy.get('#badge').should('have.text', 'WebGL 2');
        cy.waitRender();
        cy.shotStats('tr-gl-' + name).then(g => diff(gpu, g).then(d => expect(d.meanDiff, 'WebGL 2 rechnet ' + name + ' wie WebGPU').to.be.lessThan(8)));
      });
    }
  });
});
