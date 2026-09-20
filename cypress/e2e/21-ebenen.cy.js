// Fraktal-Ebenen: Ebenenzeile in Motiv, Farbe und Palette (Auswahl, +, ×), der Mischer (Reihenfolge, Sichtbarkeit, Solo, Mischmodus,
// Deckkraft, Maske, Ansicht verbunden), der Link (l2 …, lm2 …, lu2 …, la), der Verbund im Bild auf WebGPU und WebGL 2.
import { IMAGE_REGION } from '../support/commands';

describe('Fraktal-Ebenen', () => {
  const anders = (a, b, text, min = 3) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 8) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.lessThan(max));
  const ZWEI = 'mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:&la=2';   // Mandelbrot unten, Burning Ship darüber (Negativ multiplizieren, 70 %), Ebene 2 gewählt

  it('Ebenenzeile: mit einer Ebene nur das Plus; Plus legt eine Kopie an und wählt sie, Titel und Link folgen, × löscht', () => {
    cy.visitApp('mode=mandel'); cy.waitRender();
    cy.get('#stapel').should('not.have.attr', 'hidden'); cy.get('#stapelTitel').should('have.text', '1 Ebene');
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 0);
    cy.get('#stapelNeu').click();
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 2);
    cy.get('#stapelZeilen .stapel-zeile.on').should('have.attr', 'data-ebene', '2');
    cy.get('#pane-motiv > .pane-title').should('have.text', 'Motiv');
    cy.expectHash('la', '2'); cy.expectHash('lm2', '0:1:1:0:1:'); cy.expectHash('l2', v => expect(v, 'Parametersatz der zweiten Ebene').to.contain('mode=mandel'));
    cy.pane('farbe'); cy.get('#stapelZeilen .stapel-zeile').should('have.length', 2);   // dieselbe Zeile in Farbe und Palette
    cy.get('#pane-farbe > .pane-title').should('have.text', 'Farbe');
    cy.pane('motiv');
    cy.rerender(() => cy.pickOption('formula', 1));   // die zweite Ebene bekommt Burning Ship, die erste bleibt
    cy.expectHash('f', null); cy.expectHash('l2', v => expect(v).to.match(/(^|&)f=1(&|$)/));
    cy.get('#stWahl1').click();
    cy.get('#formula').should('have.value', '0'); cy.expectHash('la', null);
    cy.get('#stapelZeilen .stapel-zeile.on .stapel-weg').click();   // Rückfrage in der App
    cy.get('#rueckfrage').should('be.visible'); cy.get('#rueckfrageText').invoke('text').should('contain', 'Ebene 1 ');
    cy.get('#rueckfrageNein').click(); cy.get('#rueckfrage').should('not.be.visible');   // abgelehnt: nichts passiert
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 2);
    cy.get('#stapelZeilen .stapel-zeile.on .stapel-weg').click(); cy.get('#rueckfrageJa').click();   // bestätigt: die gewählte (erste) löschen, die zweite wird zum Grund
    cy.get('#rueckfrage').should('not.be.visible');
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 0); cy.get('#stapelTitel').should('have.text', '1 Ebene');
    cy.get('#formula').should('have.value', '1'); cy.expectHash('l2', null); cy.expectHash('f', '1');
  });

  it('Der Verbund im Bild: zwei Ebenen ergeben ein anderes Bild als jede allein, Solo und Sichtbarkeit greifen, WebGL 2 rechnet dasselbe', () => {
    cy.visitApp(ZWEI); cy.alleEbenenFertig();   // die zweite Ebene rechnet nach der ersten nach
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.gezeichnet(); cy.shotStats('eb-zwei').then(zwei => {
      cy.visitApp('mode=mandel'); cy.waitRender();
      cy.gezeichnet(); cy.shotStats('eb-nur-mandel').then(m => anders(zwei, m, 'anders als die Mandelbrot-Menge allein'));
      cy.visitApp('mode=mandel&f=1'); cy.waitRender();
      cy.gezeichnet(); cy.shotStats('eb-nur-ship').then(sh => anders(zwei, sh, 'anders als das Burning Ship allein'));
      cy.visitApp(ZWEI, { storage: { 'fractal.renderer': 'webgl' } }); cy.alleEbenenFertig();
      cy.gezeichnet(); cy.shotStats('eb-zwei-webgl').then(gl => gleich(zwei, gl, 'WebGL 2 mischt dasselbe Bild', 10));
      cy.visitApp(ZWEI); cy.alleEbenenFertig();
      cy.pane('ebenen'); cy.get('#stapelZeilen .stapel-zeile').should('have.length', 2);
      cy.get('#stSolo2').click(); cy.wait(600);   // Solo: nur die zweite Ebene
      cy.gezeichnet(); cy.shotStats('eb-solo').then(solo => {
        anders(zwei, solo, 'Solo zeigt nur die zweite Ebene');
        cy.get('#stSolo2').click(); cy.get('#stAuge1').uncheck({ force: true }); cy.wait(600);   // Solo aus, erste Ebene unsichtbar: dasselbe Bild wie Solo
        cy.gezeichnet(); cy.shotStats('eb-unsichtbar').then(u => gleich(solo, u, 'ohne die erste Ebene bleibt die zweite allein', 3));
      });
    });
  });

  it('Mischer: Modus, Deckkraft und Maske stehen im Link und ändern das Bild; die Vorgabe schreibt nichts', () => {
    cy.visitApp('mode=mandel&l2=f%3D1&la=2'); cy.alleEbenenFertig();
    cy.expectHash('lm2', '0:1:1:0:1:'); cy.expectHash('lu2', null);
    cy.pane('ebenen');
    cy.gezeichnet(); cy.shotStats('eb-normal').then(normal => {
      cy.pickOption('ebeneModus2', 10); cy.wait(600);   // Differenz
      cy.expectHash('lm2', '10:1:1:0:1:');
      cy.gezeichnet(); cy.shotStats('eb-differenz').then(diff => anders(normal, diff, 'Differenz mischt anders als Normal'));
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
    cy.visitApp(ZWEI); cy.alleEbenenFertig();
    cy.get('#stAuge2').uncheck({ force: true }); cy.wait(600);   // der Grund allein, vor den Gesten
    cy.gezeichnet(); cy.shotStats('eb-grund-vorher').then(vorher => {
    cy.get('#stAuge2').check({ force: true }); cy.wait(600);
    cy.get('#stapelKette').click();   // Bewegen: Nur diese
    cy.get('#stapelKette').should('have.attr', 'aria-pressed', 'true');
    cy.get('#stage canvas').trigger('wheel', { deltaY: -300, clientX: 200, clientY: 300 }); cy.wait(1200);   // Zoom an der gewählten Ebene: sie löst sich
    cy.expectHash('z', '1.0000e+0');   // die erste Ebene bleibt bei Zoom 1
    cy.expectHash('lm2', '2:0.7:1:0:0:');
    cy.expectHash('l2', v => expect(v, 'die zweite Ebene zoomte').to.match(/(^|&)z=/).and.not.to.match(/(^|&)z=1.0000e%2B0(&|$)/));
    cy.get('#stapelKette').click();   // Bewegen: Alle — die gelöste Ebene geht mit
    cy.get('#stage canvas').trigger('wheel', { deltaY: -300, clientX: 200, clientY: 300 }); cy.wait(1200);
    cy.expectHash('z', v => expect(parseFloat(v), 'die erste Ebene zoomte mit').to.be.greaterThan(1.1));
    cy.alleEbenenFertig(); cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.get('#stAuge2').uncheck({ force: true }); cy.wait(600);
    cy.gezeichnet(); cy.shotStats('eb-grund-nachher').then(nachher => anders(vorher, nachher, 'der Grund rechnete in der neuen Ansicht nach'));   // vorher blieb sein gesicherter Stand stehen
    cy.get('#stAuge2').check({ force: true }); cy.wait(600);
    cy.pane('ebenen');
    cy.get('#ebeneAngleichen2').click(); cy.wait(800);   // auf die Ansicht der ersten Ebene
    cy.hashParams().then(h => { const z1 = h.get('z'), l2 = new URLSearchParams(h.get('l2')); expect(l2.get('z'), 'angeglichen').to.eq(z1); });
    cy.get('#ebeneVerb2').check(); cy.wait(800);
    cy.expectHash('lm2', '2:0.7:1:0:1:'); cy.expectHash('l2', v => expect(v, 'verbunden: keine eigene Ansicht').not.to.match(/(^|&)z=/));
    });
  });

  it('Glättung je Ebene: der Bereich Qualität bearbeitet die gewählte Ebene, jede Ebene trägt ihre Werte im eigenen Parametersatz, die zuletzt eingestellte wird Browser-Einstellung', () => {
    cy.visitApp(ZWEI, { aa: '3' }); cy.alleEbenenFertig();
    cy.pane('qualitaet');
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 2);
    cy.get('#pane-qualitaet > .pane-title').should('have.text', 'Qualität');
    cy.get('#qualEbenenHinweis').should('not.have.attr', 'hidden');
    cy.get('#aaSel').should('have.value', '3');
    cy.rerender(() => cy.pickOption('aaSel', 2));   // die zweite Ebene: 2 × 2
    cy.expectHash('lm2', '2:0.7:1:0:1:');   // kein Anhang mehr im Mischsatz (19.09.2026)
    cy.expectHash('l2', v => expect(new URLSearchParams(v).get('aa'), 'die Glättung der Ebene 2 in ihrem Parametersatz').to.eq('2'));   // der Link folgt mit 400 ms Verzug
    cy.expectHash('aa', '3');   // die der Ebene 1 im Link
    cy.window().then(win => expect(win.localStorage.getItem('fractal.aa'), 'die zuletzt eingestellte Glättung ist die Browser-Einstellung (Vorgabe für Links ohne Angabe)').to.eq('2'));
    cy.get('#stWahl1').click(); cy.wait(800);
    cy.get('#aaSel').should('have.value', '3'); cy.get('#pane-qualitaet > .pane-title').should('have.text', 'Qualität');
    cy.get('#stWahl2').click(); cy.wait(800);
    cy.get('#aaSel').should('have.value', '2');
    cy.visitApp('mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1::2:adaptive:0.012:64:0.45&la=2', { aa: '3' }); cy.alleEbenenFertig();   // adaptiv nur auf der zweiten Ebene
    cy.pane('qualitaet'); cy.get('#aaModeSel').should('have.value', 'adaptive');
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.get('#stWahl1').click(); cy.wait(800);
    cy.get('#aaModeSel').should('have.value', 'grid');
  });

  it('Anzeigen: „Nur diese“ ist das Solo der gewählten Ebene im Mischer, die Auswahl nimmt es mit, „Alle“ hebt es auf', () => {
    cy.visitApp(ZWEI); cy.alleEbenenFertig();
    cy.get('#stSolo2').should('not.have.class', 'on');
    cy.get('#stSolo2').click(); cy.wait(600);   // Solo der gewählten Ebene
    cy.expectHash('lm2', '2:0.7:1:1:1:');
    cy.pane('ebenen'); cy.get('#stSolo2').should('have.class', 'on'); cy.pane('motiv');
    cy.get('#stWahl1').click(); cy.wait(800);   // die Auswahl nimmt das Solo mit
    cy.expectHash('lm2', '2:0.7:1:0:1:'); cy.expectHash('lm1', '0:1:1:1:1:');
    cy.get('#stSolo1').should('have.class', 'on');   // die Auswahl nahm das Solo mit
    cy.get('#stSolo1').click(); cy.wait(600);   // Solo aus
    cy.expectHash('lm1', null); cy.expectHash('lm2', '2:0.7:1:0:1:');
    cy.get('#stSolo1').should('not.have.class', 'on');
  });

  it('Ziehen mit „Bewegen: Alle“: währenddessen bleibt die gewählte Ebene live, kein Wechsel auf den veralteten Grund', () => {
    cy.visitApp('mode=mandel&l2=f%3D1%26z%3D2%26re%3D-0.5%26im%3D0.2&lm2=2:0.7:1:0:0:&la=2'); cy.alleEbenenFertig();
    cy.expectHash('re', v => expect(parseFloat(v), 'die Mitte steht im Link').to.be.a('number'));   // der Link wird verzögert geschrieben: erst warten, dann lesen
    cy.hashParams().then(h => { cy.wrap(parseFloat(h.get('re'))).as('reVorher'); });   // die Mitte des Grunds vor dem Ziehen
    const zieh = (c, schritte, x0, y0) => { const win = c.ownerDocument.defaultView; const ev = (type, x, y) => c.dispatchEvent(new win.PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true })); return ev; };
    cy.get('#stage canvas').then($c => { const ev = zieh($c[0]); ev('pointerdown', 300, 300); for (let i = 1; i <= 10; i++) ev('pointermove', 300 + 6 * i, 300 + 4 * i); });
    cy.wait(80); cy.get('#state').invoke('text').should('not.match', /· Ebene/);   // vorher: der Grund wurde im ersten Frame live, der Rückwechsel verlor den Versatz
    cy.get('#stage canvas').then($c => { const ev = zieh($c[0]); for (let i = 11; i <= 20; i++) ev('pointermove', 300 + 6 * i, 300 + 4 * i); });
    cy.wait(80); cy.get('#state').invoke('text').should('not.match', /· Ebene/);
    cy.wait(700); cy.get('#state').invoke('text').should('not.match', /· Ebene/);   // auch in einer Pause mit gehaltenem Zeiger rechnet keine andere Ebene (sonst ruckelt das Weiterziehen)
    cy.get('#stage canvas').then($c => { const ev = zieh($c[0]); ev('pointerup', 420, 380); });
    cy.alleEbenenFertig(); cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.expectHash('z', '1.0000e+0');
    cy.get('@reVorher').then(reVorher => cy.hashParams().then(h => { const l2 = new URLSearchParams(h.get('l2')), dRe = parseFloat(h.get('re')) - reVorher; expect(dRe, 'der Grund zog mit').to.be.lessThan(-0.05); expect(parseFloat(l2.get('re')) - (-0.5), 'die gelöste Ebene zog um denselben Bildschirmversatz (halbe Ebeneneinheiten bei Zoom 2)').to.be.closeTo(dRe / 2, 1e-6); }));
  });

  it('Reihenfolge: erst die Grundbilder aller Ebenen, dann die Glättungen, die gewählte Ebene zuerst', () => {
    cy.visitApp(ZWEI, { aa: '3' }); cy.alleEbenenFertig();   // beide Ebenen 3 × 3 (die zweite erbt die Glättung des Grunds)
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.window().then(win => {
      const p = win.ebenenProtokoll, erst = was => p.indexOf(was);
      expect(p, 'Protokoll').to.include('grund 2').and.include('vertagt 2').and.include('grund 1').and.include('vertagt 1').and.include('glaettung 2').and.include('glaettung 1');
      expect(erst('vertagt 2'), 'die gewählte Ebene vertagt ihre Glättung').to.be.greaterThan(erst('grund 2'));
      expect(erst('grund 1'), 'der Grund rechnet sein Grundbild vor jeder Glättung').to.be.greaterThan(erst('vertagt 2')).and.to.be.lessThan(erst('glaettung 2'));
      expect(erst('glaettung 2'), 'die gewählte Ebene glättet zuerst').to.be.lessThan(erst('glaettung 1'));
    });
  });

  it('Rückgängig und Datei: der Stapel gehört zum Zustand', () => {
    cy.visitApp('mode=mandel'); cy.waitRender();
    cy.get('#stapelNeu').click(); cy.wait(600);
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 2);
    cy.get('#undo').click(); cy.wait(600);
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 0);
    cy.get('#redo').click(); cy.wait(600);
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 2);
    cy.appState().then(st => { expect(st.params.l2, 'die Ebene steht im Zustand').to.be.an('object'); });
  });
});
