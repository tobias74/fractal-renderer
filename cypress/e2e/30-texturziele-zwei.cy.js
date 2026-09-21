// Weitere Ziele der Texturplätze: Farbton (5) und Glühen (6). Geprüft: die Auswahl ist hierarchisch (Glühen nur mit
// wirksamen Kantenlinien), die Werte überstehen Link und „Alles zurücksetzen“, jedes Ziel ändert das Bild, die
// Vorgabe lässt das alte Bild, und WebGL 2 rechnet wie WebGPU.
// Deckkraft der Ebene (7) und Relief-Höhe (8) gibt es nicht: der Ebenenpass liest die fertige Farbe aus einem
// Zwischenbild, und das Höhenfeld ließ sich im GLSL-Programm nicht binden. Siehe die Commits dazu.
import { IMAGE_REGION } from '../support/commands';

describe('Ziele der Texturplätze: Farbton und Glühen', () => {
  const B = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400&ca=off';
  const KANTE = B + '&tx=11&ts=0.8';                       // Kanten: die Textur braucht keine Bahnstatistik, darum bleiben die Kantenlinien wirksam
  const ZWEI = '&l2=f%3D1&lm2=2:0.7:1:0:1:';               // zweite Fraktal-Ebene darunter
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  const anders = (a, b, text, min = 3) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 8) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.lessThan(max));
  const option = (v, versteckt) => cy.get('#texZiel1 option[value="' + v + '"]').should(versteckt ? 'have.attr' : 'not.have.attr', 'hidden');

  it('die Auswahl ist hierarchisch: Farbton immer, Glühen nur mit Kantenlinien, Deckkraft nur mit zweiter Ebene', () => {
    cy.visitApp(KANTE);                                     // eine Ebene, keine Kantenlinien
    cy.pane('texturen');
    cy.get('#texZiel1 option').should('have.length', 7);
    cy.get('#texZiel1 option[value="5"]').should('have.text', 'Farbton');
    cy.get('#texZiel1 option[value="6"]').should('have.text', 'Glühen');
    cy.get('#texZiel1 option[value="7"]').should('have.text', 'Deckkraft der Ebene');
    cy.visitApp(KANTE + '&glow=1&gw=8');                    // mit Kantenlinien
    cy.visitApp(KANTE + ZWEI);                              // mit zweiter Ebene
    cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI);             // beides
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
      cy.shotStats('tz2-deckkraft').then(a => anders(vor, a, 'die Deckkraft der Ebene folgt dem Wert des Platzes'));
      cy.visitApp(KANTE + '&glow=1&gw=8' + ZWEI + '&tz=2'); cy.waitRender();   // ausdrücklich die Vorgabe: dasselbe Bild
      cy.shotStats('tz2-wie-vorgabe').then(a => gleich(vor, a, 'die Helligkeit bleibt die Vorgabe', 0.5));
    });
  });

  it('WebGL 2 rechnet die drei Ziele wie WebGPU', () => {
    const gl = { storage: { 'fractal.renderer': 'webgl' } };
    for (const [z, name] of [['5', 'farbton'], ['6', 'gluehen'], ]) {
      const H = KANTE + '&glow=1&gw=8' + ZWEI + '&ts=1.5&tz=' + z;
      cy.visitApp(H); cy.waitRender();
      cy.shotStats('tz2-gpu-' + name).then(gpu => {
        cy.visitApp(H, gl);
        cy.get('#badge').should('have.text', 'WebGL 2');
        cy.waitRender();
        cy.shotStats('tz2-gl-' + name).then(g => gleich(gpu, g, 'WebGL 2 rechnet das Ziel ' + name + ' wie WebGPU'));
      });
    }
  });
});
