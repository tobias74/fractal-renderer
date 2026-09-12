const CLOUDS = ['clifford', 'dejong', 'pickover', 'ikone', 'hopalong', 'gumowski'];
const ACTIVE = /Fertig|Done|Sammelt|Collecting|Rendert|Rendering|Vorschau|Preview|Verfeinert|Refining/;

describe('Fraktalfamilien', () => {
  beforeEach(() => cy.visitApp());

  it('bietet genau acht Fraktale in zwei Gruppen an', () => {
    cy.get('#family optgroup').should('have.length', 2);
    cy.get('#family optgroup').eq(0).should('have.attr', 'label', 'Fluchtzeit');
    cy.get('#family optgroup').eq(1).should('have.attr', 'label', 'Punktwolken');
    cy.get('#family option').should('have.length', 8);
    cy.get('#family option').then($o => expect([...$o].map(o => o.value)).to.deep.eq(['mandel', 'julia'].concat(CLOUDS)));
    cy.get('#family').should('have.value', 'mandel');
  });

  it('Julia-Menge über die Familienauswahl', () => {
    cy.rerender(() => cy.pickOption('family', 'julia'));
    cy.rowShown('juliaC', true);
    cy.rowShown('formula', true);
    cy.expectHash('mode', 'julia');
  });

  CLOUDS.forEach(v => it(`Punktwolke ${v}`, () => {
    cy.pickOption('family', v);
    cy.rowShown('accRow', true);
    cy.rowShown('cloudRow', true);
    cy.rowShown('iterRow', false);   // Iterationen gibt es nur bei der Fluchtzeit
    cy.rowShown('formula', false);
    cy.get('#cloudPrm input[type=range]').its('length').should('be.greaterThan', 0);
    cy.waitRender(/Fertig|Done/, 60000);
    cy.expectHash('fam', v);
    cy.expectHash('ex', e => expect(parseFloat(e)).to.be.greaterThan(0));
    // Anzeige-Shader und Worker liefern ein Bild: nicht schwarz, mehrere Farben (hier unter WebGL 2)
    cy.shotStats('wolke-' + v).then(s => {
      expect(s.mean, v + ' ist nicht schwarz').to.be.greaterThan(1);
      expect(s.colors, v + ' hat mehrere Farben').to.be.greaterThan(20);
    });
  }));

  it('Punktwolken unter WebGL 2: CPU-Worker und GLSL-Anzeige liefern ein Bild', () => {
    for (const v of CLOUDS) {
      cy.visitApp('fam=' + v + '&at=3000000', { storage: { 'fractal.renderer': 'webgl' } });
      cy.get('#badge').should('have.text', 'WebGL 2');
      cy.waitRender(/Fertig|Done/, 60000);
      cy.shotStats('wolke-webgl-' + v).then(s => {
        expect(s.mean, v + ' ist nicht schwarz').to.be.greaterThan(1);
        expect(s.colors, v + ' hat mehrere Farben').to.be.greaterThan(20);
      });
    }
  });

  it('Punktwolken: Belichtung, Gamma und Probenziel wirken auf die Adresse', () => {
    cy.pickOption('family', 'clifford');
    cy.setRange('exposure', 700);
    cy.expectHash('ex', e => expect(parseFloat(e)).to.be.greaterThan(1));
    cy.setRange('gamma', 500);
    cy.expectHash('ga', g => expect(parseFloat(g)).to.be.greaterThan(0));
    cy.pickOption('accTarget', '3000000');
    cy.get('#accTarget').should('have.value', '3000000');
    cy.expectHash('at', '3000000');
  });

  it('Belichtung 0,1 bis 1000 und Gamma 0,2 bis 5, beide logarithmisch', () => {
    cy.pickOption('family', 'clifford');
    cy.get('#exposureVal').should('have.value', '1,00');   // die Vorgaben stehen weiter mitten auf der Skala
    cy.get('#gammaVal').should('have.value', '2,00');
    cy.setRange('exposure', 1000); cy.get('#exposureVal').should('have.value', '1000'); cy.expectHash('ex', '1000');
    cy.setRange('exposure', 0); cy.get('#exposureVal').should('have.value', '0,10'); cy.expectHash('ex', '0.1');
    cy.setRange('gamma', 0); cy.get('#gammaVal').should('have.value', '0,20'); cy.expectHash('ga', '0.2');
    cy.setRange('gamma', 1000); cy.get('#gammaVal').should('have.value', '5,00'); cy.expectHash('ga', '5');
    cy.visitApp('fam=clifford&ex=500&ga=0.3');           // Werte jenseits der alten Grenzen 10 und 1 kommen aus dem Link an
    cy.get('#exposureVal').should('have.value', '500');
    cy.get('#gammaVal').should('have.value', '0,30');
  });

  // Früher sprang die Helligkeitsskala bei jedem Neustart des Sammelns auf 1: das erste Bild blitzte übersteuert auf,
  // bis die neue Skala von der Grafikkarte zurück war. Beim Ziehen eines Reglers flackerte es deshalb stark.
  // Die Zwischenstände werden immer gezeigt; unter WebGL wachsen sie über die CPU-Worker sichtbar heran.
  for (const rend of ['auto', 'webgl']) it(`kein Aufblitzen beim Verstellen, Zwischenstände sichtbar (Renderer ${rend})`, () => {
    cy.visitApp('fam=dejong&at=10000000', rend === 'webgl' ? { storage: { 'fractal.renderer': 'webgl' } } : {});
    cy.get('#accSteps').should('not.exist');               // kein Häkchen mehr: Zwischenstände gibt es immer
    cy.waitRender(/Fertig|Done/, 60000);
    cy.wait(400);
    // Jede Anzeige schreibt ihre Skala zusammen mit Belichtung 1 und Gamma 2 an die Grafikkarte: unter WebGPU als
    // acht Zahlen per writeBuffer, unter WebGL als zwei uniform4f. Der Test schneidet diese Werte an der Schnittstelle mit.
    cy.window().then(win => {
      win.__skalen = [];
      const merk = (skala, ex, ga) => { if (Math.abs(ex - 1) < 1e-6 && Math.abs(ga - 2) < 1e-6) win.__skalen.push(skala); };
      if (win.GPUQueue) {
        const orig = win.GPUQueue.prototype.writeBuffer;
        win.GPUQueue.prototype.writeBuffer = function (buf, off, data, ...rest) {
          if (data instanceof win.Float32Array && data.length === 8 && data[6] === 0 && data[7] === 0) merk(data[3], data[4], data[5]);
          return orig.call(this, buf, off, data, ...rest);
        };
      }
      const gl2 = win.WebGL2RenderingContext.prototype, orig4 = gl2.uniform4f;
      let vorige = null;
      gl2.uniform4f = function (loc, a, b, c, d) {
        if (vorige && c === 0 && d === 0) merk(vorige[3], a, b);
        vorige = [a, b, c, d];
        return orig4.call(this, loc, a, b, c, d);
      };
    });
    // wie beim Ziehen: kleine Schritte ab der Vorgabe a = 2 (Reglerstellung 833), je Schritt Δa ≈ 0,04
    for (const v of [840, 847, 854]) { cy.get('#cloudPrm input[type=range]').first().invoke('val', v).trigger('input'); cy.wait(60); }
    cy.wait(300);
    cy.waitRender(/Fertig|Done/, 60000);
    cy.wait(600);
    cy.window().then(win => {
      const w = win.__skalen;
      expect(w.length, 'Bilder nach dem Verstellen').to.be.greaterThan(0);
      // Die Skala ist die Trefferzahl am 99,9-Perzentil und wächst mit der Punktzahl: am Ende einige Hundert, im ersten
      // Zwischenbild nach dem Verstellen mit erst wenigen Punkten entsprechend weniger (unter WebGL gemessen ab etwa 20).
      // Das alte Aufblitzen war eine Skala von genau 1 (zurückgesetzt); eine Skala nahe null hieße, dass alte Zähler mit
      // der Punktzahl eines neuen, noch leeren Durchlaufs gezeigt würden. Die Grenze 2 trennt beides mit Spielraum.
      expect(Math.min(...w), 'Skala nie zurückgesetzt, also kein übersteuertes Aufblitzen').to.be.greaterThan(2);
    });
  });

  it('Alles zurücksetzen stellt auch die Parameter der Attraktoren zurück', () => {
    cy.pickOption('family', 'clifford');
    cy.get('#cloudPrm input[type=range]').first().invoke('val', 300).trigger('input');
    cy.expectHash('pa', a => expect(parseFloat(a)).to.not.be.closeTo(-1.5, 0.001));
    cy.setRange('exposure', 800);
    cy.get('#reset').click();
    cy.get('#family').should('have.value', 'clifford');
    cy.expectHash('pa', '-1.500');
    cy.get('#cloudPrm input[type=range]').first().should('have.value', String(Math.round(1000 * (-1.5 + 3) / 6)));
    cy.get('#exposureVal').should('have.value', '1,00');
  });

  it('Symmetrische Ikone: sechs Regler, n ganzzahlig, alle im Link (pa bis pf)', () => {
    cy.visitApp('fam=ikone&at=3000000');
    cy.get('#cloudPrm input[type=range]').should('have.length', 6);
    cy.get('#cloudPrm .lbl span:first-child').then($l => expect([...$l].map(e => e.textContent)).to.deep.eq(['λ', 'α', 'β', 'γ', 'ω', 'n']));
    cy.get('#cloudPrm .val').last().should('have.value', '7');
    cy.get('#cloudPrm input[type=range]').last().invoke('val', 480).trigger('input');   // n von 3 bis 9: 3 + 6 · 0,48 = 5,88, gerundet 6
    cy.get('#cloudPrm .val').last().should('have.value', '6');
    cy.expectHash('pf', n => expect(parseFloat(n)).to.eq(6));
    cy.expectHash('pa', a => expect(parseFloat(a)).to.be.closeTo(-2.5, 0.001));
  });

  it('Proben: jede Änderung sammelt neu und steht im Link', () => {
    // früher geschah nichts: weniger Proben änderten das Bild nicht, und der Link behielt den alten Wert
    cy.visitApp('fam=dejong&at=3000000');
    cy.waitRender(/Fertig · \d,\d Mio\. Punkte/, 60000);   // 3 Mio.: einstellig
    cy.pickOption('accTarget', '10000000');
    cy.expectHash('at', '10000000');
    cy.waitRender(/Fertig · \d\d,\d Mio\. Punkte/, 60000);   // 10 Mio.: zweistellig
    cy.pickOption('accTarget', '3000000');
    cy.expectHash('at', '3000000');
    cy.waitRender(/Fertig · \d,\d Mio\. Punkte/, 60000);   // neu gesammelt, wieder einstellig
  });

  it('Clifford-Attraktor: Parameterregler schreiben pa..pd', () => {
    cy.pickOption('family', 'clifford');
    cy.get('#cloudPrm input[type=range]').first().invoke('val', 300).trigger('input');
    cy.expectHash('pa', a => expect(parseFloat(a)).to.be.a('number'));
    cy.expectHash('pd', d => expect(d).to.not.be.null);
  });

  it('Links auf entfernte Familien landen bei der Mandelbrot-Menge', () => {
    // Buddhabrot, L-Systeme, 3D und einige Punktwolken, zuletzt Farn und Lorenz, gibt es nicht mehr; alte Links sollen nicht ins Leere laufen.
    for (const fam of ['buddha', 'nebula', 'ls_koch', 'd3_bulb', 'flame', 'henon', 'fern', 'lorenz']) {
      cy.visitApp('fam=' + fam);
      cy.get('#family').should('have.value', 'mandel');
      cy.rowShown('formula', true);
      cy.rowShown('accRow', false);
      cy.get('#state', { timeout: 60000 }).invoke('text').should('match', ACTIVE);
    }
  });

  it('zurück zur Mandelbrot-Menge blendet die Sonderabschnitte wieder aus', () => {
    cy.pickOption('family', 'dejong');
    cy.rowShown('accRow', true);
    cy.rowShown('cloudRow', true);
    cy.rerender(() => cy.pickOption('family', 'mandel'));
    cy.rowShown('accRow', false);
    cy.rowShown('cloudRow', false);
    cy.rowShown('formula', true);
    cy.rowShown('iterRow', true);
    cy.rowShown('aaRow', true);
    cy.expectHash('fam', null);
    cy.get('#state').invoke('text').should('match', /Fertig/);
  });
});
