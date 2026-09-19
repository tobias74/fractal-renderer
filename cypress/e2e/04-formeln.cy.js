// [Name, Tiefenzoom per Störungsrechnung?, Besonderheit]
const FORMULAS = [
  ['Mandelbrot', true], ['Burning Ship', true, 'flip'], ['Tricorn', true], ['Celtic', true], ['Buffalo', true, 'flip'],
  ['Perpendicular Burning Ship', true, 'flip'], ['Perpendicular Mandelbrot', true], ['Phoenix', false, 'param'], ['Lambda', false],
  ['Sinus', false], ['Exponential', false], ['Newton / Nova', false, 'param'], ['Magnet 1', false], ['Lyapunov', false, 'seq param'],
  ['z^p + c', false, 'param'], ['Sinus mit Pol', false, 'param'], ['McMullen', false, 'param'],
  ['Zwei Potenzen', true, 'param'],
  ['Heart', true], ['Celtic Mandelbar', true], ['Perpendicular Celtic', true], ['Celtic Heart', true], ['Perpendicular Buffalo', true],
  ['Halley / Nova', false, 'param'],
  ['Magnet 2', false], ['Tetration', false], ['Kubisch', true, 'param'], ['Ikenaga', true], ['Tschebyschow', true, 'param'],
  ['Barnsley 1', false, 'param'], ['Barnsley 2', false, 'param'], ['Barnsley 3', false, 'param'], ['Spider', false, 'param'],
  ['Collatz', false], ['fn(zᵈ) + c', false],
  ['Newton / Nova auf eigene Nullstellen', false, 'param'], ['Halley / Nova auf eigene Nullstellen', false, 'param'],
  ['Eigene Formel', false, 'param'],
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
    cy.revealInDetails('fluchtRadiusVal');
    cy.get('#fluchtRadiusVal').clear().type('2{enter}');                    // kleiner Radius: die Grenze zeichnet sich in die Bänder
    cy.get('#fluchtRadius').should('have.value', '50');   // Regler ab 1,01 logarithmisch: 2 steht bei 50
    cy.expectHash('fr', '2');
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.screenshot('flucht-radius-2', { capture: 'viewport', overwrite: true });
    cy.task('pngDiff', { a: 'cypress/screenshots/04-formeln.cy.js/flucht-vorgabe.png', b: 'cypress/screenshots/04-formeln.cy.js/flucht-radius-2.png', region: { x0: 0.05, y0: 0.1, x1: 0.6, y1: 0.9 } }).then(d => expect(d.meanDiff, 'Radius 2 sieht anders aus').to.be.greaterThan(2));
    cy.rerender(() => cy.pickOption('fluchtForm', 1));                     // Quadrat
    cy.expectHash('ff', '1');
    cy.revealInDetails('fluchtRadiusVal');
    cy.get('#fluchtRadiusVal').clear().type('0{enter}');                    // 0: zurück zur Vorgabe
    cy.expectHash('fr', null);
    cy.get('#fluchtRadiusVal').should('have.value', 'Vorgabe');
    cy.rerender(() => cy.pickOption('formula', 13));                       // Lyapunov: keine Fluchtgrenze
    cy.rowShown('fluchtRow', false);
    cy.rerender(() => cy.pickOption('formula', 11));                       // Newton/Nova ebenso
    cy.rowShown('fluchtRow', false);
  });

  it('listet alle 38 Formeln in der richtigen Reihenfolge', () => {
    cy.get('#formula option').should('have.length', FORMULAS.length).each(($o, i) => expect($o.text()).to.contain(FORMULAS[i][0]));
  });

  FORMULAS.forEach(([name, pert, extra], i) => {
    it(`${i}: ${name} rendert (${pert ? 'Tiefenzoom' : 'fp32'})`, () => {
      if (i) cy.rerender(() => cy.pickOption('formula', i));
      cy.get('#formulaNote').should('have.text', pert ? 'Tiefenzoom' : 'fp32, Zoom bis 10^5');
      cy.expectHash('f', i ? String(i) : null);
      cy.rowShown('paramRow', (extra || '').includes('param'));
      cy.rowShown('seqRow', (extra || '').includes('seq'));
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

  it('Kubisch: Tiefenzoom bei 10^12 am Rand der Menge, WebGL 2 rechnet dasselbe Bild', () => {
    const T = 'mode=mandel&f=26&pp=0.6&re=-0.80615306973529044&im=0.3&z=1e12';   // Randpunkt der Menge z³ + 0,6·z² + c bei Im c = 0,3
    cy.visitApp(T);
    cy.waitRender();
    cy.get('#formulaNote').should('have.text', 'Tiefenzoom');
    cy.expectHash('pp', '0.6000');
    cy.get('#depthVal').should('contain.text', '10^12');
    cy.shotStats('kubisch-webgpu').then(gpu => {
      expect(gpu.std, 'Struktur statt Fläche').to.be.greaterThan(5);
      cy.visitApp(T, { storage: { 'fractal.renderer': 'webgl' } });
      cy.waitRender();
      cy.shotStats('kubisch-webgl').then(gl => cy.task('pngDiff', { a: gpu.file, b: gl.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'WebGL 2 rechnet dasselbe Bild').to.be.lessThan(8)));
    });
  });

  it('Tschebyschow: der Grad kommt aus dem Link, Barnsley 1 bringt seine Fluchtradius-Vorgabe 2 mit', () => {
    cy.visitApp('mode=mandel&f=28&pp=5&z=5');
    cy.waitRender();
    cy.get('#paramVal').invoke('val').should('match', /^5[.,]000$/);
    cy.get('#formulaNote').should('have.text', 'Tiefenzoom');
    cy.expectHash('pp', '5.000');
    cy.shotStats('tschebyschow-5').then(t5 => expect(t5.std, 'Struktur').to.be.greaterThan(10));
    cy.visitApp('mode=mandel&f=29');
    cy.waitRender();
    cy.get('#fluchtRadiusVal').should('have.value', 'Vorgabe');   // die Vorgabe der Formel (2) ist keine Einstellung: Feld und Link bleiben leer
    cy.expectHash('fr', null);
    cy.shotStats('barnsley-1').then(b1 => expect(b1.std, 'Struktur').to.be.greaterThan(10));
  });

  it('Startwert für alle Formeln, Start im Bildpunkt, Faltung und Gedächtnis: nur wo sie wirken, im Link, anderes Bild', () => {
    const anders = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(3));
    cy.visitApp('mode=mandel&f=25');   // Tetration: direkt gerechnet — Startwert, Faltung und Gedächtnis wirken
    cy.waitRender();
    cy.rowShown('z0Row', true); cy.rowShown('faltRow', true); cy.rowShown('gedRow', true);
    cy.shotStats('tet-basis').then(basis => {
      cy.rerender(() => cy.pickOption('faltung', 1));
      cy.expectHash('fa', '1');
      cy.shotStats('tet-faltung').then(ge => anders(basis, ge, 'die Faltung ändert das Bild'));
      cy.rerender(() => cy.pickOption('faltung', 0));
      cy.expectHash('fa', null);
      cy.rerender(() => cy.setRange('gedaechtnis', 300));
      cy.expectHash('gd', '0.3');
      cy.get('#gedaechtnisVal').invoke('val').should('match', /^0[.,]300$/);
      cy.shotStats('tet-gedaechtnis').then(gd => anders(basis, gd, 'das Gedächtnis ändert das Bild'));
      cy.rerender(() => cy.setRange('gedaechtnis', 0));
      cy.expectHash('gd', null);
      cy.get('#startC').check({ force: true });   // bei Tetration nur ein Schritt Versatz (c¹ = c): hier zählt der Link, das Bild prüft Exponential unten
      cy.expectHash('zc', '1');
      cy.get('#startC').uncheck({ force: true });
      cy.expectHash('zc', null);
      cy.rerender(() => cy.setRange('z0reRange', 0.4));   // Startwert: bei Tetration als Versatz zur 1
      cy.expectHash('z0r', '0.4');
      cy.shotStats('tet-z0').then(z0 => anders(basis, z0, 'der Startwert ändert das Bild'));
    });
    cy.visitApp('mode=mandel&f=26');   // Kubisch (Störungsrechnung): Startwert ja, Faltung und Gedächtnis nein
    cy.rowShown('z0Row', true); cy.rowShown('faltRow', false);
    cy.visitApp('mode=mandel&f=10&zc=1');   // Exponential: exp(0) + c ≠ c, der Start im Bildpunkt ergibt eine andere Menge
    cy.waitRender();
    cy.get('#startC').should('be.checked');
    cy.shotStats('exp-zc').then(ez => { cy.visitApp('mode=mandel&f=10'); cy.waitRender(); cy.shotStats('exp-ohne').then(eo => anders(ez, eo, 'Start im Bildpunkt ändert das Bild')); });
    cy.visitApp('mode=mandel&f=27&zc=1');   // Ikenaga (Störungsrechnung): F(0) = −c, die Abweichung beginnt bei δc
    cy.waitRender();
    cy.shotStats('ikenaga-zc').then(iz => { cy.visitApp('mode=mandel&f=27'); cy.waitRender(); cy.shotStats('ikenaga-ohne').then(io => anders(iz, io, 'Start im Bildpunkt wirkt in der Störungsrechnung')); });
    cy.visitApp('mode=mandel&f=7'); cy.rowShown('faltRow', true); cy.rowShown('gedRow', false);   // Phoenix hat sein eigenes p
    cy.visitApp('mode=mandel&f=13'); cy.rowShown('z0Row', false); cy.rowShown('faltRow', false);   // Lyapunov: nichts davon
  });

  it('Kleine Regler: Zerfall bei Spider, Versatz bei Barnsley, komplexes a bei Kubisch, Startpunkt und Vorlauf bei Lyapunov, Potenz bei Phoenix', () => {
    const anders = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(3));
    cy.visitApp('mode=mandel&f=32');   // Spider: Zerfall ½ ist die Vorgabe und fehlt im Link
    cy.waitRender();
    cy.get('#paramVal').invoke('val').should('match', /^0[.,]500$/);
    cy.expectHash('pp', '0.5000');   // pp steht immer im Link, sobald die Formel einen Parameter hat
    cy.shotStats('spider-halb').then(halb => {
      cy.rerender(() => cy.setRange('param', 900));   // 0,9: c zerfällt kaum noch
      cy.expectHash('pp', '0.9000');
      cy.shotStats('spider-09').then(neun => anders(halb, neun, 'der Zerfall ändert das Bild'));
    });
    cy.visitApp('mode=mandel&f=29&pp=0.5');   // Barnsley 1 mit Versatz ½
    cy.waitRender();
    cy.get('#paramVal').invoke('val').should('match', /^0[.,]500$/);
    cy.shotStats('barnsley-k05').then(k05 => { cy.visitApp('mode=mandel&f=29'); cy.waitRender(); cy.shotStats('barnsley-k1').then(k1 => anders(k05, k1, 'der Versatz ändert das Bild')); });
    cy.visitApp('mode=mandel&f=26&pp=0.6&pq=0.4');   // Kubisch: Im a = 0,4 aus dem Link, zweite Zeile mit genau einem Regler
    cy.waitRender();
    cy.rowShown('param2Row', true); cy.rowShown('zweigRow', false);
    cy.get('#param2b').should('have.attr', 'hidden'); cy.get('#param2c').should('have.attr', 'hidden');
    cy.get('#param2aVal').invoke('val').should('match', /^0[.,]4/);
    cy.expectHash('pq', '0.4');
    cy.shotStats('kubisch-im04').then(im => { cy.visitApp('mode=mandel&f=26&pp=0.6'); cy.waitRender(); cy.shotStats('kubisch-im0').then(re => anders(im, re, 'der Imaginärteil von a ändert das Bild')); });
    cy.visitApp('mode=mandel&f=13');   // Lyapunov: Startpunkt und Vorlauf mit den bisherigen Vorgaben
    cy.waitRender();
    cy.rowShown('paramRow', true); cy.rowShown('param2Row', true); cy.rowShown('zweigRow', false);
    cy.get('#paramVal').invoke('val').should('match', /^0[.,]500$/);
    cy.expectHash('pp', '0.5000'); cy.expectHash('pq', '0.2');   // die Vorgaben, so wie sie im Link stehen
    cy.shotStats('lyap-vorgabe').then(v => {
      cy.rerender(() => cy.setRange('param', 250));   // x₀ ≈ 0,255
      cy.expectHash('pp', v2 => expect(parseFloat(v2)).to.be.closeTo(0.255, 0.002));
      cy.shotStats('lyap-x0').then(x0 => anders(v, x0, 'der Startpunkt ändert das Bild'));
    });
    cy.visitApp('mode=mandel&f=7');   // Phoenix: die Potenz steht zur Wahl
    cy.waitRender();
    cy.get('#power').parent().should('not.have.attr', 'hidden');
    cy.shotStats('phoenix-2').then(p2 => {
      cy.rerender(() => cy.pickOption('power', 3));
      cy.expectHash('p', '3');
      cy.shotStats('phoenix-3').then(p3 => anders(p2, p3, 'die Potenz ändert das Bild'));
    });
  });

  it('Funktionsauswahl: Lambda mit sin statt z(1 − z), fn(zᵈ) + c mit Potenz; Wahl im Link, anderes Bild, sonst verborgen', () => {
    const anders = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(3));
    cy.visitApp('mode=mandel&f=8');   // Lambda: Vorgabe z(1 − z), kein fn im Link
    cy.waitRender();
    cy.rowShown('fnRow', true);
    cy.get('#fnSel').should('have.value', '0');
    cy.expectHash('fn', null);
    cy.shotStats('lambda-z1z').then(basis => {
      cy.rerender(() => cy.pickOption('fnSel', 1));   // sin
      cy.expectHash('fn', '1');
      cy.shotStats('lambda-sin').then(sin => anders(basis, sin, 'λ·sin z sieht anders aus als λ·z(1 − z)'));
    });
    cy.visitApp('mode=mandel&f=34&fn=6&p=3');   // fn(z^d) + c mit exp und d = 3
    cy.waitRender();
    cy.get('#fnSel').should('have.value', '6');
    cy.get('#power').should('have.value', '3');
    cy.get('#power').parent().should('not.have.attr', 'hidden');
    cy.get('#formulaNote').should('have.text', 'fp32, Zoom bis 10^5');
    cy.shotStats('fn-exp-3').then(e3 => {
      cy.rerender(() => cy.pickOption('fnSel', 1));   // sin
      cy.expectHash('fn', null);   // sin ist die erste der Liste und damit die Vorgabe dieser Formel
      cy.shotStats('fn-sin-3').then(s3 => anders(e3, s3, 'andere Funktion, anderes Bild'));
    });
    cy.visitApp('mode=mandel&f=9'); cy.rowShown('fnRow', false);   // Sinus kennt keine Auswahl
  });

  it('Newton auf eigene Nullstellen: drei im Kreis sind die Vorgabe, fünf ändern Bild und Link, getippt kommt an, der Kreis setzt zurück', () => {
    const anders = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(3));
    cy.visitApp('mode=mandel&f=35');
    cy.waitRender();
    cy.rowShown('nzRow', true); cy.rowShown('fluchtRow', false);   // konvergiert: keine Fluchtgrenze
    cy.get('#nzListe > div').should('have.length', 3);
    cy.get('#nzRe0').should('have.value', '1.0000');
    cy.expectHash('nz', null);
    cy.shotStats('nz-drei').then(drei => {
      cy.rerender(() => cy.pickOption('nzAnzahl', 5));
      cy.get('#nzListe > div').should('have.length', 5);
      cy.expectHash('nz', v => expect(v.split(',').length, 'fünf Paare').to.eq(10));
      cy.shotStats('nz-fuenf').then(fuenf => {
        anders(drei, fuenf, 'fünf Becken statt drei');
        cy.get('#nzRe0').clear().type('0.3').blur();   // eine Nullstelle verschieben
        cy.expectHash('nz', v => expect(v.startsWith('0.3,'), 'die getippte Nullstelle steht im Link').to.be.true);
        cy.waitRender();
        cy.shotStats('nz-verschoben').then(vs => anders(fuenf, vs, 'verschobene Nullstelle, anderes Bild'));
        cy.get('#nzKreis').click();
        cy.get('#nzRe0').should('have.value', '1.0000');
        cy.expectHash('nz', v => expect(v.startsWith('1,0,'), 'wieder im Kreis').to.be.true);
      });
    });
    cy.visitApp('mode=mandel&f=36&nz=1,0,-1,0,0,1,0,-1');   // Halley mit vier Nullstellen aus dem Link
    cy.waitRender();
    cy.get('#nzListe > div').should('have.length', 4);
    cy.get('#formulaNote').should('have.text', 'fp32, Zoom bis 10^5');
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.visitApp('mode=mandel&f=11'); cy.rowShown('nzRow', false);   // Newton auf z^d − 1 kennt keine Nullstellen-Liste
  });

  it('Hybrid-Folge: zwei Formeln im Wechsel stehen im Link, rechnen in fp32, ergeben ein eigenes Bild, auf WebGL 2 dasselbe', () => {
    const anders = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(3));
    const H = 'mode=mandel&f=0&hb=1&seq=AB';   // Mandelbrot und Burning Ship im Wechsel
    cy.visitApp(H);
    cy.waitRender();
    cy.rowShown('hybridRow', true); cy.rowShown('seqRow', true);
    cy.get('#formelB').should('have.value', '1');
    cy.get('#seq').should('have.value', 'AB');
    cy.get('#formulaNote').should('have.text', 'fp32, Zoom bis 10^5');
    cy.expectHash('hb', '1'); cy.expectHash('seq', 'AB');
    cy.shotStats('hybrid-ab').then(ab => {
      cy.visitApp('mode=mandel&f=0'); cy.waitRender();
      cy.shotStats('hybrid-nur-a').then(a => anders(ab, a, 'anders als Mandelbrot allein'));
      cy.visitApp('mode=mandel&f=1'); cy.waitRender();
      cy.shotStats('hybrid-nur-b').then(b => anders(ab, b, 'anders als Burning Ship allein'));
      cy.visitApp(H, { storage: { 'fractal.renderer': 'webgl' } }); cy.waitRender();
      cy.shotStats('hybrid-webgl').then(gl => cy.task('pngDiff', { a: ab.file, b: gl.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'WebGL 2 rechnet dasselbe Bild').to.be.lessThan(8)));
    });
    cy.visitApp(H);
    cy.waitRender();
    cy.rerender(() => cy.pickOption('formelB', -1));   // zweite Formel weg: Tiefenzoom zurück, Folge verborgen, nichts mehr im Link
    cy.get('#formulaNote').should('have.text', 'Tiefenzoom');
    cy.rowShown('seqRow', false);
    cy.expectHash('hb', null); cy.expectHash('seq', null);
    cy.visitApp('mode=mandel&f=13'); cy.rowShown('hybridRow', false);   // Lyapunov: keine Bahn, keine Folge
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
    cy.revealInDetails('invRe');
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

  it('Fluchtgrenze: Produkt, Differenz der Quadrate und Differenz der Beträge – jede Form ein anderes Bild als der Kreis und als die anderen, im Link, WebGPU wie WebGL 2', () => {
    const B = 'mode=mandel&re=-0.75&im=0&z=1.3&it=100&fr=2', R = { x0: 0.05, y0: 0.1, x1: 0.6, y1: 0.9 };   // kleiner Radius: die Grenze zeichnet sich in die Bänder (seit 19.09.2026 drei Formen mehr)
    const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: R });
    cy.visitApp(B);
    cy.shotStats('flucht-kreis').then(kreis => {
      const bilder = {};
      cy.wrap([5, 6, 7]).each(f => {
        cy.visitApp(B + '&ff=' + f); cy.get('#fluchtForm').should('have.value', String(f)); cy.expectHash('ff', String(f));
        cy.shotStats('flucht-form-' + f).then(bild => { bilder[f] = bild; diff(kreis, bild).then(d => expect(d.meanDiff, 'Form ' + f + ' anders als der Kreis').to.be.greaterThan(1.2)); });
      }).then(() => {
        diff(bilder[5], bilder[6]).then(d => expect(d.meanDiff, 'Produkt anders als Differenz der Quadrate').to.be.greaterThan(1.2));
        diff(bilder[6], bilder[7]).then(d => expect(d.meanDiff, 'Differenz der Quadrate anders als Differenz der Beträge').to.be.greaterThan(1.2));
        cy.visitApp(B + '&ff=6', { storage: { 'fractal.renderer': 'webgl' } }); cy.get('#badge').invoke('text').should('match', /WebGL/i);
        cy.shotStats('flucht-form-6-gl').then(gl => diff(bilder[6], gl).then(d => expect(d.meanDiff, 'WebGL 2 rechnet dieselbe Grenze').to.be.lessThan(0.8)));
      });
    });
    cy.visitApp('mode=mandel&ff=9'); cy.get('#fluchtForm').should('have.value', '7');   // über den Rand: an die letzte Form geklemmt
    cy.rerender(() => cy.pickOption('fluchtForm', 5)); cy.expectHash('ff', '5');   // aus dem Menü
    cy.rerender(() => cy.pickOption('fluchtForm', 0)); cy.expectHash('ff', null);
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
      cy.revealInDetails('fluchtRadiusVal');
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
