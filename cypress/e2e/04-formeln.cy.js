// [Name, Tiefenzoom per Störungsrechnung?, Besonderheit]
const FORMULAS = [
  ['Mandelbrot', true], ['Burning Ship', true, 'flip'], ['Tricorn', true], ['Celtic', true], ['Buffalo', true, 'flip'],
  ['Perpendicular Burning Ship', true, 'flip'], ['Perpendicular Mandelbrot', true], ['Phoenix', false, 'param'], ['Lambda', false],
  ['Sinus', false], ['Exponential', false], ['Newton / Nova', false, 'param'], ['Magnet 1', false], ['Lyapunov', false, 'seq'],
];

import { DEFAULT_RE } from '../support/commands';

describe('Formelfamilie', () => {
  beforeEach(() => cy.visitApp());

  it('listet alle 14 Formeln in der richtigen Reihenfolge', () => {
    cy.get('#formula option').should('have.length', FORMULAS.length).each(($o, i) => expect($o.text()).to.contain(FORMULAS[i][0]));
  });

  FORMULAS.forEach(([name, pert, extra], i) => {
    it(`${i}: ${name} rendert (${pert ? 'Tiefenzoom' : 'fp32'})`, () => {
      if (i) cy.rerender(() => cy.pickOption('formula', i));
      cy.get('#formulaNote').should('have.text', pert ? 'Tiefenzoom' : 'fp32, Zoom bis 10^5');
      cy.expectHash('f', i ? String(i) : null);
      cy.rowShown('paramRow', extra === 'param');
      cy.rowShown('seqRow', extra === 'seq');
      if (extra === 'flip') cy.get('#invert').should('have.value', '2');
      cy.get('#state').invoke('text').should('match', /Fertig/);
    });
  });

  it('Parameter-Regler (Phoenix) schreibt pp in die Adresse', () => {
    cy.rerender(() => cy.pickOption('formula', 7));
    cy.get('#paramLabel').should('have.text', 'Phoenix p');
    cy.setRange('param', 900);
    cy.expectHash('pp', v => expect(parseFloat(v)).to.be.closeTo(0.8, 0.01));
    cy.get('#paramVal').invoke('val').should('contain', '0,8');
    cy.waitRender();
  });

  it('Lyapunov: Folge aus A und B wird bereinigt und gespeichert', () => {
    cy.rerender(() => cy.pickOption('formula', 13));
    cy.revealInDetails('seq');
    cy.get('#seq').clear().type('abxab');
    cy.expectHash('seq', 'ABAB');
    cy.waitRender();
  });

  it('Lyapunov reicht in alle vier Quadranten: auch mit negativen a und b bleibt die Bahn beschränkt', () => {
    // Ausschnitt a ≈ −1,35 … −0,18, b ≈ −0,9 … −0,08: früher ganz grau (nicht definiert), jetzt überall ein Exponent
    for (const r of ['webgpu', 'webgl']) {
      cy.visitApp('mode=mandel&f=13&re=-0.5&im=-0.5&z=3', r === 'webgl' ? { storage: { 'fractal.renderer': 'webgl' } } : {});
      if (r === 'webgl') cy.get('#badge').should('have.text', 'WebGL 2');
      cy.shotStats('lyapunov-quadrant-' + r).then(s => {
        expect(s.mean, r + ': hell (Gold) statt Grau').to.be.greaterThan(80);
        expect(s.colors, r + ': ein Verlauf statt einer Fläche').to.be.greaterThan(20);
      });
    }
  });

  it('Ebene: gespiegelt, invertiert und zurück', () => {
    cy.rerender(() => cy.pickOption('invert', '1'));
    cy.expectHash('inv', '1');
    cy.rerender(() => cy.pickOption('invert', '3'));
    cy.expectHash('inv', '1');
    cy.expectHash('fl', '1');
    cy.rerender(() => cy.pickOption('invert', '0'));
    cy.expectHash('inv', null);
    cy.expectHash('fl', null);
  });

  it('„Julia-Menge zur Bildmitte“ wechselt den Modus, die c-Regler wirken', () => {
    cy.rerender(() => cy.get('#juliaHere').click());
    cy.get('#family').should('have.value', 'julia');
    cy.rowShown('juliaC', true);
    cy.expectHash('mode', 'julia');
    cy.expectHash('jre', v => expect(parseFloat(v)).to.be.closeTo(DEFAULT_RE, 1e-6));   // Bildmitte der Standardansicht
    cy.setRange('jreRange', -0.4);
    cy.expectHash('jre', '-0.4');
    cy.revealInDetails('jre');
    cy.get('#jre').invoke('val').then(v => expect(parseFloat(v)).to.be.closeTo(-0.4, 1e-6));
    cy.revealInDetails('jim');
    cy.get('#jim').clear().type('0.3').trigger('change');
    cy.expectHash('jim', '0.3');
    cy.waitRender();
    cy.rerender(() => cy.pickOption('family', 'mandel'));
    cy.rowShown('juliaC', false);
    cy.expectHash('mode', 'mandel');
  });

  it('Startwert z₀ für die Mandelbrot-Menge', () => {
    cy.rowShown('z0Row', true);
    cy.setRange('z0reRange', 0.25);
    cy.expectHash('z0r', '0.25');
    cy.expectHash('z0i', '0');
    cy.revealInDetails('z0re');
    cy.get('#z0re').invoke('val').then(v => expect(parseFloat(v)).to.be.closeTo(0.25, 1e-6));
    cy.waitRender();
    cy.setRange('z0reRange', 0);
    cy.expectHash('z0r', null);
  });

  it('Potenz d ≠ 2 setzt die Ansicht auf den Ursprung; „Zurücksetzen“ stellt alles außer der Familie zurück', () => {
    cy.rerender(() => cy.pickOption('power', 4));
    cy.get('#coords').should('contain.text', 'Re 0,742');   // Ursprung plus Versatz für das Bedienfeld
    cy.pickOption('palette', 2);
    cy.get('#reset').click();
    cy.get('#power').should('have.value', '2');
    cy.get('#palette').should('have.value', '0');
    cy.get('#family').should('have.value', 'mandel');
    cy.expectHash('p', null);
    cy.expectHash('pal', null);
    cy.get('#coords').should('contain.text', 'Re -0,008');
  });

  it('Newton/Nova: Potenz 3 statt der entarteten 2, die Konvergenzdauer färbt die Gebiete', () => {
    cy.rerender(() => cy.pickOption('formula', 11));
    cy.get('#power').should('have.value', '3');
    cy.get('#power option[value="2"]').should('have.prop', 'hidden', true);
    cy.rerender(() => cy.pickOption('formula', 0));
    cy.get('#power').should('have.value', '2');                  // beim Verlassen wieder die Standardpotenz
    cy.visitApp('mode=julia&f=11&jre=0&jim=0&re=0&im=0&z=0.7');   // reines Newton; d = 2 im Link wird auf 3 gehoben
    cy.get('#power').should('have.value', '3');
    // Um die Wurzel 1 läuft die Farbe mit der Zahl der Schritte bis zur Konvergenz. Einfarbig war der Fehler im
    // WGSL-Shader (break im switch verließ die Schleife nicht); den sieht nur der Lauf in Chrome mit WebGPU.
    cy.shotStats('newton-wurzel', { x0: 0.58, y0: 0.45, x1: 0.66, y1: 0.55 }).then(s => expect(s.std, 'Verlauf statt Fläche').to.be.greaterThan(3));
  });
});
