// [Name, Tiefenzoom per Störungsrechnung?, Besonderheit]
const FORMULAS = [
  ['Mandelbrot', true], ['Burning Ship', true, 'flip'], ['Tricorn', true], ['Celtic', true], ['Buffalo', true, 'flip'],
  ['Perpendicular Burning Ship', true, 'flip'], ['Perpendicular Mandelbrot', true], ['Phoenix', false, 'param'], ['Lambda', false],
  ['Sinus', false], ['Exponential', false], ['Newton / Nova', false, 'param'], ['Magnet 1', false], ['Lyapunov', false, 'seq'],
  ['z^p + c', false, 'param'], ['Sinus mit Pol', false, 'param'], ['McMullen', false, 'param'],
  ['Zwei Potenzen', true, 'param'],
  ['Heart', true], ['Celtic Mandelbar', true], ['Perpendicular Celtic', true], ['Celtic Heart', true], ['Perpendicular Buffalo', true],
  ['Halley / Nova', false, 'param'],
];

import { DEFAULT_RE, IMAGE_REGION } from '../support/commands';

describe('Formelfamilie', () => {
  beforeEach(() => cy.visitApp());

  it('Fluchtgrenze: Form und Radius stehen im Link, ändern das Bild und fehlen bei Lyapunov und Newton/Nova', () => {
    cy.rowShown('fluchtRow', true);
    cy.get('#fluchtForm').should('have.value', '0');
    cy.get('#fluchtRadiusVal').should('have.value', 'Vorgabe');
    cy.expectHash('ff', null); cy.expectHash('fr', null);
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.screenshot('flucht-vorgabe', { capture: 'viewport', overwrite: true });
    cy.get('#fluchtRadiusVal').clear().type('2{enter}');                    // kleiner Radius: die Grenze zeichnet sich in die Bänder
    cy.get('#fluchtRadius').should('have.value', '50');   // Regler ab 1,01 logarithmisch: 2 steht bei 50
    cy.expectHash('fr', '2');
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.screenshot('flucht-radius-2', { capture: 'viewport', overwrite: true });
    cy.task('pngDiff', { a: 'cypress/screenshots/04-formeln.cy.js/flucht-vorgabe.png', b: 'cypress/screenshots/04-formeln.cy.js/flucht-radius-2.png', region: { x0: 0.05, y0: 0.1, x1: 0.6, y1: 0.9 } }).then(d => expect(d.meanDiff, 'Radius 2 sieht anders aus').to.be.greaterThan(2));
    cy.rerender(() => cy.pickOption('fluchtForm', 1));                     // Quadrat
    cy.expectHash('ff', '1');
    cy.get('#fluchtRadiusVal').clear().type('0{enter}');                    // 0: zurück zur Vorgabe
    cy.expectHash('fr', null);
    cy.get('#fluchtRadiusVal').should('have.value', 'Vorgabe');
    cy.rerender(() => cy.pickOption('formula', 13));                       // Lyapunov: keine Fluchtgrenze
    cy.rowShown('fluchtRow', false);
    cy.rerender(() => cy.pickOption('formula', 11));                       // Newton/Nova ebenso
    cy.rowShown('fluchtRow', false);
  });

  it('listet alle 24 Formeln in der richtigen Reihenfolge', () => {
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

  it('Zwei Potenzen: Parameter und Zweig im Link, Tiefenzoom bei 10^12 ohne Rundungsflecken, WebGL 2 rechnet dasselbe Bild', () => {
    // nahe am kritischen Punkt heben sich die linearen Anteile beider Potenzen auf; ohne die Reihe um z₀ zerfiel das Bild in fp32 in Flecken
    const T = 'mode=mandel&f=17&pp=-0.9&pq=3.8:-2.4:1.2&pk=-1&inv=1&re=1.410647617268638&im=-0.5399341480183459&z=1.2545e12&it=2500&fr=10&map=33&lm=377&dr=-127';
    cy.visitApp(T);
    cy.waitRender();
    cy.get('#formulaNote').should('have.text', 'Tiefenzoom');
    cy.expectHash('pq', '3.8:-2.4:1.2');
    cy.expectHash('pk', '-1');
    cy.shotStats('zwei-potenzen-webgpu').then(gpu => {
      expect(gpu.std, 'Struktur statt Fläche').to.be.greaterThan(20);
      cy.visitApp(T, { storage: { 'fractal.renderer': 'webgl' } });
      cy.waitRender();
      cy.shotStats('zwei-potenzen-webgl').then(gl => cy.task('pngDiff', { a: gpu.file, b: gl.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'WebGL 2 rechnet dasselbe Bild').to.be.lessThan(8)));
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

  it('Inversionsmitte: Felder nur bei invertierter Ebene, Link ir/ii, anderes Bild als die Inversion um den Ursprung', () => {
    cy.rowShown('invMitteRow', false);
    cy.visitApp('mode=mandel&re=1.2&im=0&z=0.32&it=200&inv=1');
    cy.rowShown('invMitteRow', true);
    cy.get('#invRe').should('have.value', '0.0000');
    cy.shotStats('inv-null').then(ursprung => {
      cy.visitApp('mode=mandel&re=1.2&im=0&z=0.32&it=200&inv=1&ir=-0.5&ii=0.2');
      cy.get('#invRe').should('have.value', '-0.5000'); cy.get('#invIm').should('have.value', '0.2000');
      cy.expectHash('ir', '-0.5'); cy.expectHash('ii', '0.2');
      cy.shotStats('inv-mitte').then(mitte => cy.task('pngDiff', { a: ursprung.file, b: mitte.file, region: { x0: 0.05, y0: 0.1, x1: 0.6, y1: 0.9 } }).then(d => expect(d.meanDiff, 'die Mitte verändert das Bild').to.be.greaterThan(5)));
    });
    cy.get('#invRe').clear().type('0.3');
    cy.expectHash('ir', '0.3');
    cy.rerender(() => cy.pickOption('invert', '0'));   // ohne Inversion: Zeile weg, Schlüssel weg
    cy.rowShown('invMitteRow', false);
    cy.expectHash('ir', null); cy.expectHash('ii', null);
  });

  it('Biomorph-Nachtest: Schalter bei der Fluchtgrenze, Link bm, anderes Bild mit Quadrat und großem Radius', () => {
    const B = 'mode=mandel&re=-0.75&im=0&z=1.3&it=100&ff=1&fr=10';
    cy.visitApp(B);
    cy.get('#biomorph').should('not.be.checked');
    cy.shotStats('biomorph-ohne').then(ohne => {
      cy.visitApp(B + '&bm=1');
      cy.get('#biomorph').should('be.checked');
      cy.expectHash('bm', '1');
      cy.shotStats('biomorph-mit').then(mit => cy.task('pngDiff', { a: ohne.file, b: mit.file, region: { x0: 0.05, y0: 0.1, x1: 0.6, y1: 0.9 } }).then(d => expect(d.meanDiff, 'der Nachtest verändert das Bild').to.be.greaterThan(5)));
    });
    cy.get('#biomorph').uncheck({ force: true });
    cy.expectHash('bm', null);
  });

  it('Ebenenabbildung: Auswahl, Link ab, anderes Bild; Julia-Menge zur Bildmitte nimmt die Abbildung mit', () => {
    const B = 'mode=mandel&re=0.3&im=0.2&z=0.5&it=200';
    cy.visitApp(B);
    cy.rowShown('abbRow', true);
    cy.get('#abbildung').should('have.value', '0');
    cy.shotStats('abb-ohne').then(ohne => {
      cy.visitApp(B + '&ab=1');   // e^z
      cy.get('#abbildung').should('have.value', '1');
      cy.expectHash('ab', '1');
      cy.shotStats('abb-exp').then(mit => cy.task('pngDiff', { a: ohne.file, b: mit.file, region: { x0: 0.05, y0: 0.1, x1: 0.6, y1: 0.9 } }).then(d => expect(d.meanDiff, 'e^z verändert das Bild').to.be.greaterThan(5)));
    });
    cy.get('#juliaHere').click();   // c = e^(0,3 + 0,2 i)
    cy.expectHash('jre', v => expect(parseFloat(v)).to.be.closeTo(Math.exp(0.3) * Math.cos(0.2), 1e-4));
    cy.expectHash('jim', v => expect(parseFloat(v)).to.be.closeTo(Math.exp(0.3) * Math.sin(0.2), 1e-4));
    cy.rerender(() => cy.pickOption('abbildung', '0'));
    cy.expectHash('ab', null);
  });

  it('Fluchtradius unter 2: getippt steht er genau im Feld und im Link, die Menge zerfällt in Blasen; unter 1,01 wird geklemmt', () => {
    const B = 'mode=mandel&re=-0.75&im=0.1&z=1.3&it=200';
    cy.visitApp(B + '&fr=2');
    cy.shotStats('fr-2').then(zwei => {
      cy.get('#fluchtRadiusVal').clear().type('1,63{enter}');
      cy.expectHash('fr', '1.63');
      cy.get('#fluchtRadiusVal').invoke('val').should('match', /^1[,.]63$/);
      cy.waitRender();
      cy.shotStats('fr-163').then(klein => cy.task('pngDiff', { a: zwei.file, b: klein.file, region: { x0: 0.05, y0: 0.1, x1: 0.6, y1: 0.9 } }).then(d => expect(d.meanDiff, 'kleinerer Radius, anderes Bild').to.be.greaterThan(2)));
    });
    cy.visitApp(B + '&fr=1.001');
    cy.expectHash('fr', '1.01');
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

  it('Halley/Nova: Potenz 3 statt der entarteten 2, keine Fluchtgrenze, eigene Gebiete neben Newton', () => {
    cy.rerender(() => cy.pickOption('formula', 23));
    cy.get('#power').should('have.value', '3');
    cy.get('#power option[value="2"]').should('have.prop', 'hidden', true);
    cy.rowShown('fluchtRow', false);
    cy.expectHash('f', '23');
    cy.visitApp('mode=julia&f=23&jre=0&jim=0&re=0&im=0&z=0.7');   // reines Halley; d = 2 im Link wird auf 3 gehoben
    cy.get('#power').should('have.value', '3');
    cy.shotStats('halley-wurzel', { x0: 0.58, y0: 0.45, x1: 0.66, y1: 0.55 }).then(h => {
      expect(h.std, 'Verlauf statt Fläche').to.be.greaterThan(3);
      cy.shotStats('halley-ganz').then(halley => {
        cy.visitApp('mode=julia&f=11&jre=0&jim=0&re=0&im=0&z=0.7');
        cy.shotStats('newton-ganz').then(newton => cy.task('pngDiff', { a: halley.file, b: newton.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'Halley zeichnet andere Gebiete als Newton').to.be.greaterThan(3)));
      });
    });
  });
});
