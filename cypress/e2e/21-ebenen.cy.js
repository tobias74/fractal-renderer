// Fraktal-Ebenen: Ebenenzeile in Motiv, Farbe und Palette (Auswahl, +, ×), der Mischer (Reihenfolge, Sichtbarkeit, Solo, Mischmodus,
// Deckkraft, Maske, Ansicht verbunden), der Link (l2 …, lm2 …, lu2 …, la), der Verbund im Bild auf WebGPU und WebGL 2.
import { IMAGE_REGION } from '../support/commands';

describe('Fraktal-Ebenen', () => {
  const anders = (a, b, text, min = 3) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 8) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.lessThan(max));
  const ZWEI = 'mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:&la=2';   // Mandelbrot unten, Burning Ship darüber (Negativ multiplizieren, 70 %), Ebene 2 gewählt

  it('Ebenenzeile: mit einer Ebene nur das Plus; Plus legt eine Kopie an und wählt sie, Titel und Link folgen, × löscht', () => {
    cy.visitApp('mode=mandel'); cy.waitRender();
    cy.get('#ebenenZeileMotiv').should('not.have.attr', 'hidden'); cy.get('#ebenenZeileMotiv').should('have.class', 'einzeln');
    cy.get('#ebenenZeileMotiv .ebenen-pille').should('have.length', 0);
    cy.get('#ebenenZeileMotiv .ebenen-plus').click();
    cy.get('#ebenenZeileMotiv .ebenen-pille').should('have.length', 2);
    cy.get('#ebenenZeileMotiv .ebenen-pille.on').should('have.attr', 'data-ebene', '2');
    cy.get('#pane-motiv > .pane-title').should('have.text', 'Motiv · Ebene 2');
    cy.expectHash('la', '2'); cy.expectHash('lm2', '0:1:1:0:1:'); cy.expectHash('l2', v => expect(v, 'Parametersatz der zweiten Ebene').to.contain('mode=mandel'));
    cy.pane('farbe'); cy.get('#ebenenZeileFarbe .ebenen-pille').should('have.length', 2);   // dieselbe Zeile in Farbe und Palette
    cy.get('#pane-farbe > .pane-title').should('have.text', 'Farbe · Ebene 2');
    cy.pane('motiv');
    cy.rerender(() => cy.pickOption('formula', 1));   // die zweite Ebene bekommt Burning Ship, die erste bleibt
    cy.expectHash('f', null); cy.expectHash('l2', v => expect(v).to.match(/(^|&)f=1(&|$)/));
    cy.get('#ebenenZeileMotiv .ebenen-pille[data-ebene="1"]').click();
    cy.get('#formula').should('have.value', '0'); cy.expectHash('la', null);
    cy.get('#ebenenZeileMotiv .ebenen-pille.on .ebenen-weg').click();   // die gewählte (erste) löschen: die zweite wird zum Grund
    cy.get('#ebenenZeileMotiv .ebenen-pille').should('have.length', 0); cy.get('#ebenenZeileMotiv').should('have.class', 'einzeln');
    cy.get('#formula').should('have.value', '1'); cy.expectHash('l2', null); cy.expectHash('f', '1');
  });

  it('Der Verbund im Bild: zwei Ebenen ergeben ein anderes Bild als jede allein, Solo und Sichtbarkeit greifen, WebGL 2 rechnet dasselbe', () => {
    cy.visitApp(ZWEI); cy.waitRender(); cy.wait(1500);   // die zweite Ebene rechnet nach der ersten nach
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.shotStats('eb-zwei').then(zwei => {
      cy.visitApp('mode=mandel'); cy.waitRender();
      cy.shotStats('eb-nur-mandel').then(m => anders(zwei, m, 'anders als die Mandelbrot-Menge allein'));
      cy.visitApp('mode=mandel&f=1'); cy.waitRender();
      cy.shotStats('eb-nur-ship').then(sh => anders(zwei, sh, 'anders als das Burning Ship allein'));
      cy.visitApp(ZWEI, { storage: { 'fractal.renderer': 'webgl' } }); cy.waitRender(); cy.wait(1500);
      cy.shotStats('eb-zwei-webgl').then(gl => gleich(zwei, gl, 'WebGL 2 mischt dasselbe Bild', 10));
      cy.visitApp(ZWEI); cy.waitRender(); cy.wait(1500);
      cy.pane('ebenen'); cy.get('#ebenenStapel .ebene-karte').should('have.length', 2);
      cy.get('#ebeneSolo2').click(); cy.wait(600);   // Solo: nur die zweite Ebene
      cy.shotStats('eb-solo').then(solo => {
        anders(zwei, solo, 'Solo zeigt nur die zweite Ebene');
        cy.get('#ebeneSolo2').click(); cy.get('#ebeneAn1').uncheck({ force: true }); cy.wait(600);   // Solo aus, erste Ebene unsichtbar: dasselbe Bild wie Solo
        cy.shotStats('eb-unsichtbar').then(u => gleich(solo, u, 'ohne die erste Ebene bleibt die zweite allein', 3));
      });
    });
  });

  it('Mischer: Modus, Deckkraft und Maske stehen im Link und ändern das Bild; die Vorgabe schreibt nichts', () => {
    cy.visitApp('mode=mandel&l2=f%3D1&la=2'); cy.waitRender(); cy.wait(1500);
    cy.expectHash('lm2', '0:1:1:0:1:'); cy.expectHash('lu2', null);
    cy.pane('ebenen');
    cy.shotStats('eb-normal').then(normal => {
      cy.pickOption('ebeneModus2', 10); cy.wait(600);   // Differenz
      cy.expectHash('lm2', '10:1:1:0:1:');
      cy.shotStats('eb-differenz').then(diff => anders(normal, diff, 'Differenz mischt anders als Normal'));
      cy.setRange('ebeneDeck2', 0.3); cy.wait(600);
      cy.expectHash('lm2', '10:0.3:1:0:1:');
      cy.pickOption('ebM2_art', 1); cy.wait(600);   // Maske Innen/Außen
      cy.expectHash('lu2', v => expect(v.startsWith('m1,'), 'Maske im Link').to.be.true);
      cy.get('#ebM2_0').should('exist');
    });
    cy.visitApp('mode=mandel&l2=f%3D1&lm2=10:0.3:1:0:1:&lu2=m1,0,0,0.25,0&la=2'); cy.waitRender();   // alles aus dem Link
    cy.pane('ebenen'); cy.get('#ebeneModus2').should('have.value', '10'); cy.get('#ebeneDeck2').should('have.value', '0.3'); cy.get('#ebM2_art').should('have.value', '1');
  });

  it('Gesten: „Nur diese“ löst die gewählte Ebene und bewegt nur sie, „Alle bewegen“ nimmt alle mit; Angleichen und Verbinden holen sie zurück', () => {
    cy.visitApp(ZWEI); cy.waitRender(); cy.wait(1500);
    cy.get('#ebenenZeileMotiv .ebenen-modus-knopf').eq(1).click();   // Nur diese
    cy.get('#ebenenZeileMotiv .ebenen-modus-knopf.on').should('have.text', 'Nur diese');
    cy.get('#stage canvas').trigger('wheel', { deltaY: -300, clientX: 200, clientY: 300 }); cy.wait(1200);   // Zoom an der gewählten Ebene: sie löst sich
    cy.expectHash('z', '1.0000e+0');   // die erste Ebene bleibt bei Zoom 1
    cy.expectHash('lm2', '2:0.7:1:0:0:');
    cy.expectHash('l2', v => expect(v, 'die zweite Ebene zoomte').to.match(/(^|&)z=/).and.not.to.match(/(^|&)z=1.0000e%2B0(&|$)/));
    cy.get('#ebenenZeileMotiv .ebenen-modus-knopf').eq(0).click();   // Alle bewegen: die gelöste Ebene geht mit
    cy.get('#stage canvas').trigger('wheel', { deltaY: -300, clientX: 200, clientY: 300 }); cy.wait(1200);
    cy.expectHash('z', v => expect(parseFloat(v), 'die erste Ebene zoomte mit').to.be.greaterThan(1.1));
    cy.pane('ebenen');
    cy.get('#ebeneAngleichen2').click(); cy.wait(800);   // auf die Ansicht der ersten Ebene
    cy.hashParams().then(h => { const z1 = h.get('z'), l2 = new URLSearchParams(h.get('l2')); expect(l2.get('z'), 'angeglichen').to.eq(z1); });
    cy.get('#ebeneVerb2').check(); cy.wait(800);
    cy.expectHash('lm2', '2:0.7:1:0:1:'); cy.expectHash('l2', v => expect(v, 'verbunden: keine eigene Ansicht').not.to.match(/(^|&)z=/));
  });

  it('Rückgängig und Datei: der Stapel gehört zum Zustand', () => {
    cy.visitApp('mode=mandel'); cy.waitRender();
    cy.get('#ebenenZeileMotiv .ebenen-plus').click(); cy.wait(600);
    cy.get('#ebenenZeileMotiv .ebenen-pille').should('have.length', 2);
    cy.get('#undo').click(); cy.wait(600);
    cy.get('#ebenenZeileMotiv .ebenen-pille').should('have.length', 0);
    cy.get('#redo').click(); cy.wait(600);
    cy.get('#ebenenZeileMotiv .ebenen-pille').should('have.length', 2);
    cy.appState().then(st => { expect(st.params, 'die Ebene steht im Zustand').to.contain('l2='); });
  });
});
