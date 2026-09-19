// Ebenenmischer: jedes Bedienelement der Karten (Kopf, Einklappen, Sichtbar, Solo, Name, Mischmodus, Deckkraft, Ansicht,
// Maske, Löschen, Hinzufügen, Reihenfolge), Rückgängig und Link als Ganzes, dazu Rendern und Ziehen mit mehreren Ebenen
// (Reihenfolge der Schritte, Bildvergleich WebGPU/WebGL 2, Bildtakt beim Ziehen gegen eine Ebene).
import { IMAGE_REGION } from '../support/commands';

describe('Ebenenmischer', () => {
  const anders = (a, b, text, min = 3) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 6) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.lessThan(max));
  const ZWEI = 'mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:&la=2';                              // Mandelbrot unten, Burning Ship darüber (Negativ multiplizieren, 70 %), Ebene 2 gewählt
  const DREI = 'mode=mandel&l2=f%3D1&l3=f%3D2&lm2=2:0.7:1:0:1:&lm3=10:0.5:1:0:1:&la=3';    // dazu Tricorn (Differenz, 50 %), Ebene 3 gewählt
  const fertig = () => cy.alleEbenenFertig().then(ms => expect(ms, 'fertig').to.be.greaterThan(0));
  const stand = () => cy.window().then(win => win.ebenenStand());
  const uebersetzt = () => { cy.get('#state').invoke({ timeout: 60000 }, 'text').should('not.match', /übersetzt|Compiling/); cy.wait(600); };   /* die Frist muss am letzten Glied der Kette stehen; kalt braucht Electron 118 für die Fassung mit Masken rund 17 s (warm aus dem Shader-Cache unter 1 s); die Fassung mit Masken wird beim ersten Gebrauch nebenher übersetzt */
  const alleFertig = (timeout = 60000) => cy.alleEbenenFertig(timeout);
  // Ziehen im Fenster der App: n Schritte im Abstand von 16 ms, dazwischen die Lücken zwischen den Bildern messen
  const ziehen = (win, n = 40, pause = 0) => new Promise(res => {
    const c = win.document.querySelector('#stage canvas');
    const ev = (type, x, y) => c.dispatchEvent(new win.PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true }));
    let frames = 0, maxGap = 0, last = win.performance.now(), laufend = true, x = 300, y = 300, i = 0;
    const tick = t => { frames++; maxGap = Math.max(maxGap, t - last); last = t; if (laufend) win.requestAnimationFrame(tick); };
    win.requestAnimationFrame(tick);
    ev('pointerdown', x, y);
    const t0 = win.performance.now();
    const schritt = () => {
      if (i === Math.floor(n / 2) && pause) { i++; setTimeout(schritt, pause); return; }
      if (i >= n) { const t1 = win.performance.now(); laufend = false; ev('pointerup', x, y); res({ frames, maxGap: Math.round(maxGap), fps: Math.round(frames / ((t1 - t0) / 1000)) }); return; }
      x += 4; y += 2; ev('pointermove', x, y); i++; setTimeout(schritt, 16);
    };
    setTimeout(schritt, 16);
  });

  it('Stapel: die Zeile wählt die Ebene, „Mischen“ zeigt nur sie, Titel und Farbstreifen folgen, oberste Ebene zuerst', () => {
    cy.visitApp(ZWEI); fertig();
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 2); cy.get('#stapelZeilen .stapel-zeile').first().should('have.attr', 'data-ebene', '2');
    cy.get('#stZeile2').should('have.class', 'on'); cy.get('#stZeile1').should('not.have.class', 'on'); cy.get('#panel').should('have.class', 'ebenen-aktiv');
    cy.pane('ebenen'); cy.get('#ebeneModus2').should('exist'); cy.get('#ebeneModus1').should('not.exist');
    cy.get('#stWahl1').click(); cy.wait(600);
    cy.get('#stZeile1').should('have.class', 'on'); cy.expectHash('la', null);
    cy.get('#ebeneModus1').should('not.exist'); cy.get('#ebenenStapel .ebene-karte').should('have.length', 1).first().should('have.id', 'ebeneKarte1');   // der Grund: nur seine Karte mit dem Hinweis
    cy.pane('motiv'); cy.get('#pane-motiv > .pane-title').should('have.text', 'Motiv'); cy.get('#formula').should('have.value', '0');
    cy.get('#stWahl2').click(); cy.wait(600); cy.expectHash('la', '2'); cy.pane('ebenen'); cy.get('#ebeneModus2').should('exist');
    cy.visitApp('mode=mandel'); cy.waitRender();
    cy.get('#stapelTitel').should('have.text', '1 Ebene'); cy.get('#stapelZeilen .stapel-zeile').should('have.length', 0); cy.get('#stapelKette').should('not.be.visible'); cy.get('#panel').should('not.have.class', 'ebenen-aktiv');
  });

  it('Sichtbarkeit: eine ausgeblendete Ebene fehlt im Bild und steht so im Link; der Grund allein gleicht seinem Einzelbild', () => {
    cy.visitApp('mode=mandel'); fertig();
    cy.gezeichnet(); cy.shotStats('em-grund').then(grund => {
      cy.visitApp(ZWEI); fertig(); cy.pane('ebenen');
      cy.gezeichnet(); cy.shotStats('em-beide').then(beide => {
        anders(beide, grund, 'zwei Ebenen sind anders als der Grund allein');
        cy.get('#stAuge2').uncheck({ force: true }); cy.wait(800);
        cy.expectHash('lm2', '2:0.7:0:0:1:');
        cy.get('#stZeile2').should('have.class', 'aus');
        cy.gezeichnet(); cy.shotStats('em-ohne-2').then(ohne => gleich(ohne, grund, 'ohne die zweite Ebene bleibt der Grund'));
        cy.get('#stAuge2').check({ force: true }); cy.get('#stAuge1').uncheck({ force: true }); cy.wait(800);
        cy.expectHash('lm1', '0:1:0:0:1:');
        cy.gezeichnet(); cy.shotStats('em-ohne-1').then(ohne1 => { anders(ohne1, grund, 'ohne den Grund bleibt die zweite Ebene'); anders(ohne1, beide, 'anders als beide zusammen'); });
        cy.get('#stAuge1').check({ force: true }); cy.wait(800); cy.expectHash('lm1', null);
      });
    });
  });

  it('Solo: zeigt nur diese Ebene, Link und Schalter „Anzeigen“ folgen, der zweite Klick hebt es auf', () => {
    cy.visitApp(ZWEI); fertig(); cy.pane('ebenen');
    cy.gezeichnet(); cy.shotStats('em-solo-vorher').then(vorher => {
      cy.get('#stSolo2').click(); cy.wait(800);
      cy.get('#stSolo2').should('have.class', 'on'); cy.expectHash('lm2', '2:0.7:1:1:1:');
      cy.get('#stSolo2').should('have.attr', 'aria-pressed', 'true');
      cy.gezeichnet(); cy.shotStats('em-solo').then(solo => {
        anders(solo, vorher, 'Solo zeigt nur die zweite Ebene');
        cy.get('#stAuge1').uncheck({ force: true }); cy.wait(800);
        cy.gezeichnet(); cy.shotStats('em-solo-2').then(s2 => gleich(s2, solo, 'Solo hängt nicht an der Sichtbarkeit des Grunds'));
        cy.get('#stAuge1').check({ force: true });
        cy.get('#stSolo2').click(); cy.wait(800);
        cy.get('#stSolo2').should('not.have.class', 'on'); cy.expectHash('lm2', '2:0.7:1:0:1:');
        cy.gezeichnet(); cy.shotStats('em-solo-aus').then(aus => gleich(aus, vorher, 'Solo aus: wieder beide Ebenen'));
      });
    });
  });

  it('Name: steht im Link, auf der Pille, im Kartenkopf und im Titel der Bereiche', () => {
    cy.visitApp(ZWEI); fertig(); cy.pane('ebenen');
    cy.get('#ebeneName2').clear().type('Schiff{enter}'); cy.wait(400);
    cy.expectHash('lm2', '2:0.7:1:0:1:Schiff');
    cy.get('#stWahl2').should('contain.text', '2 Schiff');
    cy.get('#stWahl2').should('contain.text', '2 Schiff');
    cy.visitApp('mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:Schiff&la=2'); fertig(); cy.pane('ebenen');
    cy.get('#ebeneName2').should('have.value', 'Schiff');
    cy.get('#ebeneName2').clear().type('{enter}'); cy.wait(400); cy.expectHash('lm2', '2:0.7:1:0:1:');
  });

  it('Mischmodus: jeder Modus rendert ohne Fehler, Normal, Multiplizieren und Differenz unterscheiden sich, WebGL 2 gleicht WebGPU', () => {
    cy.visitApp(ZWEI, { onBeforeLoad: win => { cy.spy(win.console, 'error').as('konsole'); } }); fertig(); cy.pane('ebenen');
    cy.get('#ebeneModus2 option').should('have.length', 18);
    for (let i = 0; i < 18; i++) {
      cy.pickOption('ebeneModus2', i); cy.wait(250);
      cy.expectHash('lm2', i + ':0.7:1:0:1:'); cy.get('#state').invoke('text').should('match', /Fertig/);
    }
    cy.get('@konsole').should('not.have.been.called');
    cy.pickOption('ebeneModus2', 0); cy.wait(600);
    cy.gezeichnet(); cy.shotStats('em-normal').then(normal => {
      cy.pickOption('ebeneModus2', 1); cy.wait(600);
      cy.gezeichnet(); cy.shotStats('em-multi').then(multi => {
        anders(normal, multi, 'Multiplizieren mischt anders als Normal');
        cy.pickOption('ebeneModus2', 10); cy.wait(600);
        cy.gezeichnet(); cy.shotStats('em-diff').then(diff => {
          anders(multi, diff, 'Differenz mischt anders als Multiplizieren');
          cy.visitApp('mode=mandel&l2=f%3D1&lm2=10:0.7:1:0:1:&la=2', { storage: { 'fractal.renderer': 'webgl' } }); fertig();
          cy.get('#badge').should('contain.text', 'WebGL');
          cy.gezeichnet(); cy.shotStats('em-diff-webgl').then(gl => gleich(diff, gl, 'WebGL 2 mischt Differenz wie WebGPU', 10));
          cy.visitApp('mode=mandel&l2=f%3D1&lm2=1:0.7:1:0:1:&la=2', { storage: { 'fractal.renderer': 'webgl' } }); fertig();
          cy.gezeichnet(); cy.shotStats('em-multi-webgl').then(gl => gleich(multi, gl, 'WebGL 2 mischt Multiplizieren wie WebGPU', 10));
        });
      });
    });
  });

  it('Deckkraft: Regler und Zahlenfeld, 0 gleicht dem Grund allein, 1 ist anders als 0,3, alles im Link', () => {
    cy.visitApp('mode=mandel'); fertig();
    cy.gezeichnet(); cy.shotStats('em-deck-grund').then(grund => {
      cy.visitApp('mode=mandel&l2=f%3D1&la=2'); fertig(); cy.pane('ebenen');
      cy.get('#ebeneDeck2').should('have.value', '1');
      cy.setRange('ebeneDeck2', 0); cy.wait(800); cy.expectHash('lm2', '0:0:1:0:1:');
      cy.gezeichnet(); cy.shotStats('em-deck-0').then(d0 => {
        gleich(d0, grund, 'Deckkraft 0: nur der Grund');
        cy.setRange('ebeneDeck2', 0.3); cy.wait(800); cy.expectHash('lm2', '0:0.3:1:0:1:');
        cy.gezeichnet(); cy.shotStats('em-deck-03').then(d3 => {
          anders(d3, d0, 'Deckkraft 0,3 mischt die Ebene hinein');
          cy.get('#ebeneDeck2Val').clear().type('1{enter}'); cy.wait(800); cy.expectHash('lm2', '0:1:1:0:1:');
          cy.get('#ebeneDeck2').should('have.value', '1');
          cy.gezeichnet(); cy.shotStats('em-deck-1').then(d1 => anders(d1, d3, 'Deckkraft 1 ist anders als 0,3'));
        });
      });
    });
  });

  it('Ansicht: gelöst trägt die Ebene ihre eigene Ansicht im Link und im Mischer erscheint „Ansicht angleichen“; verbunden wieder nicht', () => {
    cy.visitApp(ZWEI); fertig(); cy.pane('ebenen');
    cy.get('#ebeneVerb2').should('be.checked'); cy.get('#ebeneAngleichen2').should('not.exist');
    cy.get('#ebeneVerb2').uncheck(); cy.wait(600);
    cy.expectHash('lm2', '2:0.7:1:0:0:'); cy.expectHash('l2', v => expect(v, 'eigene Ansicht').to.match(/(^|&)z=/));
    cy.get('#ebeneAngleichen2').should('exist');
    cy.get('#stage canvas').trigger('wheel', { deltaY: -300, clientX: 200, clientY: 300 }); cy.wait(1200);   // nur die gelöste, gewählte Ebene zoomt („Alle bewegen“ nimmt niemanden mit, weil der Grund verbunden bleibt und die Geste an der gewählten Ebene hängt)
    cy.expectHash('z', v => expect(parseFloat(v), 'der Grund zoomt mit („Alle bewegen“)').to.be.greaterThan(1.1));
    cy.get('#ebeneAngleichen2').click(); cy.wait(800);
    cy.hashParams().then(h => { const l2 = new URLSearchParams(h.get('l2')); expect(l2.get('z'), 'angeglichen').to.eq(h.get('z')); });
    cy.get('#ebeneVerb2').check(); cy.wait(600);
    cy.expectHash('lm2', '2:0.7:1:0:1:'); cy.expectHash('l2', v => expect(v, 'verbunden: keine eigene Ansicht').not.to.match(/(^|&)z=/));
    cy.get('#ebeneAngleichen2').should('not.exist');
  });

  it('Maske: Art, Regler und Umkehren ändern Bild und Link; „Keine“ löscht sie aus dem Link', () => {
    cy.visitApp(ZWEI); fertig(); cy.pane('ebenen');
    cy.gezeichnet(); cy.shotStats('em-maske-ohne').then(ohne => {
      cy.pickOption('ebM2_art', 3); cy.wait(300); uebersetzt();   // Iterationsbereich (Regler von/bis)
      cy.expectHash('lu2', v => expect(v.startsWith('m3,'), 'Maske im Link').to.be.true);
      cy.get('#ebM2_0').should('exist'); cy.setRange('ebM2_0', 10); cy.setRange('ebM2_1', 40); cy.wait(800);
      cy.gezeichnet(); cy.shotStats('em-maske-1').then(m1 => {
        anders(ohne, m1, 'die Maske ändert das Bild');
        cy.get('#ebM2_inv').check(); cy.wait(800);
        cy.expectHash('lu2', v => expect(v.split(',')[1], 'umgekehrt').to.eq('1'));
        cy.gezeichnet(); cy.shotStats('em-maske-inv').then(inv => {
          anders(m1, inv, 'umgekehrt ist anders');
          cy.setRange('ebM2_0', 20); cy.wait(800);
          cy.hashParams().then(h => expect(h.get('lu2').split(','), 'Reglerwert im Link').to.include('20'));
          cy.pickOption('ebM2_art', 0); cy.wait(800); cy.expectHash('lu2', null);
          cy.gezeichnet(); cy.shotStats('em-maske-weg').then(weg => gleich(weg, ohne, 'ohne Maske wie zuvor'));
        });
      });
    });
  });

  it('Löschen: Rückfrage im Mischer, Abbrechen behält, Bestätigen entfernt und wählt die Nachbarin; mit einer Ebene ist der Knopf gesperrt', () => {
    cy.visitApp(DREI); fertig(); cy.pane('ebenen');
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 3);
    cy.get('#stWeg2').click(); cy.get('#rueckfrage').should('be.visible'); cy.get('#rueckfrageText').should('contain.text', 'Ebene 2 ');
    cy.get('#rueckfrageNein').click(); cy.get('#rueckfrage').should('not.be.visible'); cy.get('#stapelZeilen .stapel-zeile').should('have.length', 3);
    cy.get('#stWeg2').click(); cy.get('#rueckfrageJa').click(); cy.wait(800);
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 2);
    cy.expectHash('l3', null); cy.expectHash('l2', v => expect(v, 'die dritte Ebene rückt nach').to.match(/(^|&)f=2(&|$)/)); cy.expectHash('lm2', '10:0.5:1:0:1:');
    cy.get('#stZeile2').should('have.class', 'on');   // die gewählte war die dritte, sie ist jetzt die zweite
    cy.get('#stWeg2').click(); cy.get('#rueckfrageJa').click(); cy.wait(800);
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 0); cy.get('#stapelTitel').should('have.text', '1 Ebene');
    cy.expectHash('l2', null); cy.expectHash('la', null);
    fertig();
  });

  it('Hinzufügen: eine Kopie über der gewählten, gleich gewählt; bei sechs Ebenen ist der Knopf gesperrt', () => {
    cy.visitApp(ZWEI); fertig(); cy.pane('ebenen');
    cy.get('#stapelNeu').click(); cy.wait(800);
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 3); cy.get('#stZeile3').should('have.class', 'on');
    cy.expectHash('la', '3'); cy.expectHash('l3', v => expect(v, 'Kopie der zweiten').to.match(/(^|&)f=1(&|$)/)); cy.expectHash('lm3', '2:0.7:1:0:1:');
    for (let n = 4; n <= 6; n++) { cy.get('#stapelNeu').click(); cy.wait(500); cy.get('#stapelZeilen .stapel-zeile').should('have.length', n); }
    cy.get('#stapelNeu').should('be.disabled');
    cy.get('#stapelNeu').should('be.disabled');
    cy.get('#stapelZeilen .stapel-zeile').should('have.length', 6);
    fertig(); stand().then(z => { expect(z.ebenen.every(e => e.frisch && !e.glattOffen), 'alle sechs Ebenen gerechnet').to.be.true; });
  });

  it('Reihenfolge: die Pfeiltasten am Griff tauschen die Ebenen, der neue Grund verliert Modus und Deckkraft, Link und Bild folgen', () => {
    cy.visitApp(ZWEI); fertig(); cy.pane('ebenen');
    cy.gezeichnet(); cy.shotStats('em-reihe-vorher').then(vorher => {
      cy.get('#stGriff2').focus().trigger('keydown', { key: 'ArrowDown', bubbles: true }); cy.wait(1500);   // im Stapel steht die oberste zuerst: nach unten = zum Grund
      cy.expectHash('f', '1'); cy.expectHash('l2', v => expect(v, 'die Mandelbrot-Menge liegt jetzt oben').not.to.match(/(^|&)f=1(&|$)/));
      cy.expectHash('lm2', '0:1:1:0:1:');   // der frühere Grund bringt Normal und volle Deckkraft mit
      cy.get('#stapelZeilen .stapel-zeile').last().should('contain.text', 'Burning Ship');
      fertig();
      cy.gezeichnet(); cy.shotStats('em-reihe-nachher').then(nachher => anders(vorher, nachher, 'getauscht ergibt ein anderes Bild'));
      cy.get('#stGriff1').focus().trigger('keydown', { key: 'ArrowUp', bubbles: true }); cy.wait(1500);
      cy.expectHash('f', null); cy.expectHash('l2', v => expect(v).to.match(/(^|&)f=1(&|$)/));
    });
  });

  it('Rückgängig und Wiederholen im Mischer; der Link als Ganzes stellt Name, Modus, Deckkraft, Maske und Ansicht wieder her', () => {
    cy.visitApp(ZWEI); fertig(); cy.pane('ebenen');
    cy.pickOption('ebeneModus2', 10); cy.wait(500); cy.setRange('ebeneDeck2', 0.3); cy.wait(500);
    cy.get('#ebeneName2').clear().type('Schiff{enter}'); cy.wait(300); cy.pickOption('ebM2_art', 1); cy.wait(300); uebersetzt(); cy.get('#ebeneVerb2').uncheck(); cy.wait(500);
    cy.expectHash('lm2', '10:0.3:1:0:0:Schiff');
    cy.location('hash').then(hash => {
      cy.get('#undo').click(); cy.wait(500); cy.expectHash('lm2', '10:0.3:1:0:1:Schiff');   // verbinden rückgängig
      cy.get('#undo').click(); cy.wait(500); cy.expectHash('lu2', null);                    // Maske rückgängig
      cy.get('#redo').click(); cy.wait(500); cy.expectHash('lu2', v => expect(v).to.match(/^m1,/));
      cy.visitApp(hash.replace(/^#/, '')); fertig(); cy.pane('ebenen');
      cy.get('#ebeneModus2').should('have.value', '10'); cy.get('#ebeneDeck2').should('have.value', '0.3'); cy.get('#ebeneName2').should('have.value', 'Schiff');
      cy.get('#ebM2_art').should('have.value', '1'); cy.get('#ebeneVerb2').should('not.be.checked'); cy.get('#ebeneAngleichen2').should('exist');
      cy.appState().then(st => expect(st.params.lm2, 'Datei trägt den Mischer').to.match(/^10:0\.3:/));   // Version 2: die Parameter als Objekt
    });
  });

  it('Rendern mit drei Ebenen: alle werden fertig, erst alle Grundbilder, dann die Glättungen (die gewählte zuerst), keine Fehler; WebGL 2 gleicht WebGPU', () => {
    cy.visitApp(DREI, { aa: '2', onBeforeLoad: win => { cy.spy(win.console, 'error').as('konsole'); } });
    alleFertig().then(ms => expect(ms, 'alle drei Ebenen samt Glättung fertig').to.be.greaterThan(0));
    cy.window().then(win => {
      const p = win.ebenenProtokoll, erst = was => p.indexOf(was);
      expect(p, 'Protokoll').to.include('grund 3').and.include('grund 2').and.include('grund 1').and.include('glaettung 3');
      expect(Math.max(erst('grund 1'), erst('grund 2'), erst('grund 3')), 'alle Grundbilder vor der ersten Glättung').to.be.lessThan(p.findIndex(s => s.startsWith('glaettung')));
      expect(p.filter(s => s.startsWith('glaettung'))[0], 'die gewählte Ebene glättet zuerst').to.eq('glaettung 3');
    });
    stand().then(z => expect(z.ebenen.every(e => e.frisch && !e.glattOffen), 'alle Ebenen frisch').to.be.true);
    cy.get('@konsole').should('not.have.been.called');
    cy.gezeichnet(); cy.shotStats('em-drei').then(drei => {
      cy.visitApp('mode=mandel&f=2'); fertig();
      cy.gezeichnet(); cy.shotStats('em-drei-tricorn').then(t => anders(drei, t, 'drei Ebenen sind anders als das Tricorn allein'));
      cy.visitApp(DREI, { aa: '2', storage: { 'fractal.renderer': 'webgl' } }); alleFertig();
      cy.gezeichnet(); cy.shotStats('em-drei-webgl').then(gl => gleich(drei, gl, 'WebGL 2 mischt drei Ebenen wie WebGPU', 10));
    });
  });

  it('Maske auf einer Hintergrund-Ebene beim Start: sie wirkt, auch wenn die Fassung mit Masken erst übersetzt wird', () => {
    cy.visitApp('mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:'); fertig(); cy.wait(1500);   // der Grund ist gewählt, die zweite Ebene rechnet im Hintergrund
    cy.gezeichnet(); cy.shotStats('em-hg-ohne').then(ohne => {
      cy.visitApp('mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:&lu2=m1,0,0,0.25,0'); fertig(); uebersetzt(); cy.wait(1500);
      cy.gezeichnet(); cy.shotStats('em-hg-maske').then(mit => anders(ohne, mit, 'die Maske der Hintergrund-Ebene wirkt im Bild'));
    });
  });

  it('Feinjustierung: Faktor, Versatz und Drehung zum Grund als Werte, Stoßknöpfe, Runden und Mitte; Ausrichten zeigt die Differenz mit Fadenkreuz, der Link bleibt', () => {
    cy.visitApp('mode=mandel&l2=f%3D1%26z%3D2&lm2=2:0.7:1:0:0:&la=2'); fertig(); cy.pane('ebenen');
    cy.get('#ebFein2_f').should('have.value', '2,000000');
    cy.get('#ebFein2_f').clear().type('1,5{enter}'); fertig();
    cy.expectHash('l2', v => expect(new URLSearchParams(v).get('z'), 'Faktor 1,5 zum Grund bei Zoom 1').to.eq('1.5000e+0'));
    cy.get('#ebFein2_x').clear().type('10{enter}'); fertig();
    cy.get('#ebFein2_x').should('have.value', '10,00');
    cy.location('hash').should(hash => { const h = new URLSearchParams(hash.slice(1)), l2 = new URLSearchParams(h.get('l2')); expect(parseFloat(l2.get('re')) - parseFloat(h.get('re')), 'zehn Pixel des Grunds nach rechts').to.be.closeTo(10 * 3 / 720, 1e-6); });   // der Link folgt verzögert
    cy.contains('#ebeneFein2 .ebene-fein-knopf', '×2').click(); fertig(); cy.get('#ebFein2_f').should('have.value', '3,000000');
    cy.get('#ebFein2_mitte').click(); fertig(); cy.get('#ebFein2_x').should('have.value', '0,00'); cy.get('#ebFein2_y').should('have.value', '0,00');
    cy.location('hash').should(hash => { const h = new URLSearchParams(hash.slice(1)), l2 = new URLSearchParams(h.get('l2')); expect(l2.get('re'), 'Mitte auf der Grundmitte').to.eq(h.get('re')); });
    cy.get('#ebFein2_f').clear().type('2,9{enter}'); fertig(); cy.get('#ebFein2_runden').click(); fertig(); cy.get('#ebFein2_f').should('have.value', '3,000000');
    cy.get('#ebFein2_d').clear().type('15{enter}'); fertig(); cy.expectHash('l2', v => expect(new URLSearchParams(v).get('dr'), 'Drehung zum Grund').to.eq('15'));
    cy.gezeichnet(); cy.shotStats('em-fein-normal').then(normal => {
      cy.get('#ebFein2_ausrichten').check(); cy.wait(800);
      cy.get('#fadenkreuz').should('not.have.attr', 'hidden');   // Cypress hält es für verdeckt (pointer-events: none), sichtbar ist es über der Leinwand cy.expectHash('lm2', '2:0.7:1:0:0:');   // Ausrichten ändert Modus und Deckkraft nur in der Anzeige
      cy.gezeichnet(); cy.shotStats('em-fein-diff').then(diff => anders(normal, diff, 'Differenz zum Ausrichten'));
      cy.get('#ebFein2_ausrichten').uncheck(); cy.get('#fadenkreuz').should('have.attr', 'hidden');
    });
  });

  it('Feine Gesten: Umschalt + Rad etwa ein Prozent, Umschalt + Pfeil ein Pixel, Alt + Pfeil ein Zehntel; der Link hält feine Zoomwerte', () => {
    cy.visitApp('mode=mandel'); cy.waitRender();
    cy.get('#stage canvas').trigger('wheel', { deltaY: -100, clientX: 640, clientY: 360, shiftKey: true }); cy.wait(700);
    cy.expectHash('z', v => { const z = parseFloat(v); expect(z, 'etwa ein Prozent').to.be.greaterThan(1.004).and.lessThan(1.02); });
    cy.hashParams().then(h => {
      const re0 = parseFloat(h.get('re')), ps = 3 / (parseFloat(h.get('z')) * 720);
      cy.get('body').type('{shift}{leftArrow}'); cy.wait(700);
      cy.hashParams().then(h2 => {
        const re1 = parseFloat(h2.get('re')); expect(Math.abs(re1 - re0), 'ein Pixel').to.be.closeTo(ps, ps * 0.01);
        cy.get('body').type('{alt}{leftArrow}'); cy.wait(700);
        cy.hashParams().then(h3 => expect(Math.abs(parseFloat(h3.get('re')) - re1), 'ein Zehntel Pixel').to.be.closeTo(ps / 10, ps * 0.002));
      });
    });
    cy.visitApp('mode=mandel&z=1.00001234e0'); cy.waitRender(); cy.expectHash('z', '1.000012340e+0');
    cy.visitApp('mode=mandel&z=2'); cy.waitRender(); cy.expectHash('z', '2.0000e+0');   // glatte Werte wie bisher
  });

  it('Leistung: drei Ebenen rechnen in höchstens der vierfachen Zeit einer Ebene; Ziehen mit drei Ebenen bleibt so flüssig wie mit einer', () => {
    cy.visitApp('mode=mandel&it=2000&z=1e5&re=-0.7436438870371587&im=0.13182590420531197', { aa: '2' });
    alleFertig().then(eine => {
      expect(eine, 'eine Ebene fertig').to.be.greaterThan(0);
      cy.window({ timeout: 30000 }).then({ timeout: 30000 }, win => ziehen(win, 40, 500)).then(z1 => {
        cy.visitApp('mode=mandel&it=2000&z=1e5&re=-0.7436438870371587&im=0.13182590420531197&l2=f%3D1%26it%3D2000&l3=f%3D2%26it%3D2000&lm2=2:0.7:1:0:1:&lm3=10:0.5:1:0:1:&la=3', { aa: '2' });
        alleFertig().then(drei => {
          expect(drei, 'drei Ebenen fertig').to.be.greaterThan(0);
          cy.log(`eine Ebene ${Math.round(eine)} ms, drei Ebenen ${Math.round(drei)} ms`);
          expect(drei, 'drei Ebenen brauchen höchstens das Vierfache einer Ebene (plus Sekunde)').to.be.lessThan(4 * eine + 1000);
          cy.window({ timeout: 30000 }).then({ timeout: 30000 }, win => ziehen(win, 40, 500)).then(z3 => {
            cy.log(`Ziehen: eine Ebene größte Lücke ${z1.maxGap} ms bei ${z1.fps} fps, drei Ebenen ${z3.maxGap} ms bei ${z3.fps} fps`);
            expect(z3.maxGap, 'größte Bildlücke beim Ziehen mit drei Ebenen').to.be.lessThan(Math.max(120, 2 * z1.maxGap + 40));
            expect(z3.fps, 'Bildrate beim Ziehen mit drei Ebenen').to.be.greaterThan(Math.min(30, z1.fps * 0.6));
            cy.get('#state').invoke('text').should('not.match', /· Ebene/);   // während des Ziehens (mit Pause) rechnete keine andere Ebene
            alleFertig().then(ms => expect(ms, 'nach dem Ziehen werden alle Ebenen fertig').to.be.greaterThan(0));
            cy.hashParams().then(h => { const l2 = new URLSearchParams(h.get('l2')), l3 = new URLSearchParams(h.get('l3')); expect(l2.get('re'), 'verbundene Ebenen tragen keine eigene Ansicht').to.be.null; expect(l3.get('re')).to.be.null; expect(parseFloat(h.get('re')), 'der Grund zog mit').not.to.eq(-0.7436438870371587); });
          });
        });
      });
    });
  });
});
