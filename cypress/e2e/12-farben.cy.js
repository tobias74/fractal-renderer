import { IMAGE_REGION, CONSENT_NONE } from '../support/commands';

describe('Farbe und Farbschema-Editor', () => {
  beforeEach(() => cy.visitApp());

  it('vor und zurück durch die Paletten, in der Reihenfolge des Menüs, am Ende wieder von vorn', () => {
    cy.pane('palette');
    cy.get('#palette').should('have.value', '0');
    cy.rerender(() => cy.get('#palVor').click()); cy.get('#palette').should('have.value', '1');   // nach Klassisch im Menü: Perlmutt
    cy.expectHash('pv', v => expect(v).to.contain('9fd8d2'));
    cy.rerender(() => cy.get('#palZurueck').click()); cy.get('#palette').should('have.value', '0');
    cy.rerender(() => cy.get('#palZurueck').click());   // vor der ersten: die letzte des Menüs (Bunt, Stickerei)
    cy.get('#palette').should('have.value', '110');
    cy.rerender(() => cy.get('#palVor').click()); cy.get('#palette').should('have.value', '0');
    cy.pickOption('palette', 27); cy.rerender(() => cy.get('#palVor').click()); cy.get('#palette').should('have.value', '41');   // die Gruppe Hell geht bei den neueren weiter
  });

  it('171 Paletten in den Gruppen Hell, Dunkel, Zwei- und Dreiklang und Bunt, jede Nummer genau einmal', () => {
    cy.get('#palette optgroup').then($g => expect([...$g].map(g => g.label)).to.deep.eq(['Hell', 'Dunkel', 'Zwei- und Dreiklang', 'Bunt']));
    cy.get('#palette option').then($o => {
      const werte = [...$o].map(o => +o.value).sort((a, b) => a - b);
      expect(werte, 'Nummern 0 bis 170, keine doppelt').to.deep.eq([...Array(171).keys()]);
      expect([...$o].map(o => o.textContent.trim()).filter((n, i, a) => a.indexOf(n) !== i), 'kein Name doppelt').to.deep.eq([]);
    });
    cy.get('#palette option[value="0"]').should('have.text', 'Klassisch');   // Nummer 0 und Standard
    cy.get('#palette').should('have.value', '0');
    cy.rerender(() => cy.pickOption('palette', 18));
    cy.get('#palette').should('have.value', '18'); cy.expectHash('pal', null);   // die Palette steht mit ihren Werten im Link, nicht beim Namen
    cy.get('#palette optgroup[label="Hell"] option[value="19"]').should('have.text', 'Salbei');   // hell
    cy.get('#palette optgroup[label="Hell"] option[value="21"]').should('have.text', 'Rosenquarz');   // die zwanzig vom 25.09.2026: sieben hell, dreizehn dunkel
    cy.get('#palette optgroup[label="Dunkel"] option[value="28"]').should('have.text', 'Neonorchidee');
    cy.get('#palette optgroup[label="Dunkel"] option[value="40"]').should('have.text', 'Jade');
    cy.get('#palette optgroup[label="Hell"] option[value="41"]').should('have.text', 'Porzellan');   // die vierzig vom 25.09.2026: vierzehn hell, sechsundzwanzig dunkel
    cy.get('#palette optgroup[label="Dunkel"] option[value="80"]').should('have.text', 'Tiefer Wald');
    cy.get('#palette optgroup[label="Bunt"] option[value="81"]').should('have.text', 'Regenbogen');   // die dreißig bunten vom 25.09.2026 in eigener Gruppe
    cy.get('#palette optgroup[label="Bunt"] option[value="110"]').should('have.text', 'Stickerei');
    cy.get('#palette optgroup[label="Zwei- und Dreiklang"] option[value="111"]').should('have.text', 'Moos und Flieder');   // die dreißig Zwei- und Dreiklänge vom 25.09.2026
    cy.get('#palette optgroup[label="Zwei- und Dreiklang"] option[value="140"]').should('have.text', 'Umbra, Gold und Schiefer');
    cy.get('#palette optgroup[label="Zwei- und Dreiklang"] option[value="141"]').should('have.text', 'Venezianische Lagune');   // nach Regionen und Epochen
    cy.get('#palette optgroup[label="Zwei- und Dreiklang"] option[value="170"]').should('have.text', 'Böhmisches Glas');
    cy.rerender(() => cy.pickOption('palette', 19));
    cy.get('#palette').should('have.value', '19');
  });

  it('Paletten aus Stützstellen laufen über die Farbtabelle', () => {
    cy.shotStats('farbe-vorgabe-klassisch').then(a => {
      cy.rerender(() => cy.pickOption('palette', 6));   // Holzschnitt: Papier und Schwarz
      cy.shotStats('farbe-vorgabe-holzschnitt').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'Farbtabelle statt Kosinus').to.be.greaterThan(5));
      });
    });
    cy.expectHash('pal', null);
  });

  it('Rückgängig lässt den offenen Paletteneditor offen und zeigt den Schritt davor', () => {   // 20.09.2026
    cy.visitApp();
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();
    cy.get('#peArt [data-art="quilez"]').click();
    cy.get('#palEd').should('not.have.attr', 'hidden');
    cy.get('#peQuilez input[type=range][data-k="d"][data-i="0"]').invoke('val', 0.2).trigger('input');
    cy.expectHash('pv', v => expect(v).to.contain(',0.2,0.6,0.7'));
    cy.get('#peQuilez input[type=range][data-k="d"][data-i="1"]').invoke('val', 0.1).trigger('input');
    cy.expectHash('pv', v => expect(v).to.contain(',0.2,0.1,0.7'));
    cy.get('#undo').click();
    cy.get('#palEd').should('not.have.attr', 'hidden');   // der Editor bleibt stehen, statt sich zu schließen
    cy.get('#peQuilez input[type=range][data-k="d"][data-i="1"]').should('have.value', '0.6');   // und zeigt den Stand davor
    cy.get('#peQuilez input.pe-wert[data-k="d"][data-i="1"]').should('have.value', '0,60');
    cy.expectHash('pv', v => expect(v).to.contain(',0.2,0.6,0.7'));
    cy.get('#redo').click();
    cy.get('#palEd').should('not.have.attr', 'hidden');
    cy.get('#peQuilez input[type=range][data-k="d"][data-i="1"]').should('have.value', '0.1');
  });

  it('Quilez-Palette: zwölf Regler, Formel im Link, aus Klassisch dasselbe Bild', () => {
    cy.shotStats('quilez-vorher').then(a => {
      cy.revealInDetails('palEdit');
      cy.get('#palEdit').click();
      cy.get('#peArt [data-art="quilez"]').click();
      cy.get('#peQuilez input[type=range]').should('have.length', 12); cy.get('#peQuilez input.pe-wert').should('have.length', 12);   // je Regler ein Feld zum Tippen (19.09.2026)
      cy.get('#peStops').should('not.be.visible');
      cy.waitRender();
      cy.shotStats('quilez-klassisch').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'Formel von Klassisch, pixelgleich').to.be.lessThan(0.5));
      });
    });
    cy.expectHash('pv', v => expect(v).to.contain('~q~0.5,0.5,0.5,0.5,0.5,0.5,1,1,1,0.5,0.6,0.7'));
    cy.get('#peQuilez input[type=range][data-k="d"][data-i="0"]').invoke('val', 0.2).trigger('input');
    cy.expectHash('pv', v => expect(v).to.contain(',0.2,0.6,0.7'));
    cy.get('#peQuilez input.pe-wert[data-k="d"][data-i="0"]').should('have.value', '0,20');   // das Feld folgt dem Regler
    cy.get('#peArt [data-art="stops"]').click();   // als Stützstellen weiterführen, zurück kommt die Formel unverändert
    cy.get('#peStops .pe-stop').should('have.length', 8);
    cy.get('#peArt [data-art="quilez"]').click();
    cy.get('#peQuilez input[type=range][data-k="d"][data-i="0"]').should('have.value', '0.2');
    // Getippte Koeffizienten: Enter übernimmt und stellt den Regler, Escape verwirft, Unlesbares stellt zurück, Werte klemmen an den Reglerbereich
    cy.get('#peQuilez input.pe-wert[data-k="c"][data-i="1"]').clear().type('0,2{enter}');   // c, Grün: eine langsame Welle
    cy.get('#peQuilez input.pe-wert[data-k="c"][data-i="1"]').should('have.value', '0,20');
    cy.get('#peQuilez input[type=range][data-k="c"][data-i="1"]').should('have.value', '0.2');
    cy.expectHash('pv', v => expect(v, 'die Formel im Link').to.contain('~q~0.5,0.5,0.5,0.5,0.5,0.5,1,0.2,1,0.2,0.6,0.7'));
    cy.get('#peQuilez input.pe-wert[data-k="c"][data-i="1"]').clear().type('9{esc}');   // Escape: der alte Wert bleibt
    cy.get('#peQuilez input.pe-wert[data-k="c"][data-i="1"]').should('have.value', '0,20');
    cy.get('#peQuilez input.pe-wert[data-k="c"][data-i="1"]').clear().type('abc{enter}');   // unlesbar: zurück
    cy.get('#peQuilez input.pe-wert[data-k="c"][data-i="1"]').should('have.value', '0,20');
    cy.get('#peQuilez input.pe-wert[data-k="c"][data-i="1"]').clear().type('9{enter}');   // über dem Reglerbereich: geklemmt auf 3
    cy.get('#peQuilez input.pe-wert[data-k="c"][data-i="1"]').should('have.value', '3,00');
    cy.get('#peQuilez input[type=range][data-k="c"][data-i="1"]').should('have.value', '3');
    cy.expectHash('pv', v => expect(v).to.contain(',1,3,1,'));
  });

  it('Palette, Verlauf, Randlinien und Innen wirken auf Adresse und Bild', () => {
    cy.shotStats('farbe-klassisch').then(a => {
      cy.rerender(() => cy.pickOption('palette', 1));
      cy.get('#palette').should('have.value', '1');
      cy.shotStats('farbe-perlmutt').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'andere Palette, anderes Bild').to.be.greaterThan(5));
      });
    });
    cy.rerender(() => cy.pickOption('mapping', 28));
    cy.expectHash('map', '28');
    cy.rerender(() => cy.pickOption('glowMode', 1));
    cy.expectHash('glow', '1');
    cy.setRange('glowWidth', 800);
    cy.expectHash('gw', v => expect(parseFloat(v)).to.be.greaterThan(1));
    cy.get('#glowVal').invoke('val').should('match', /\d/);
    cy.rerender(() => cy.pickOption('interior', 2));
    cy.expectHash('in', '2');
    cy.setRange('offset', 500);
    cy.get('#offset').should('have.value', '500');
    cy.waitRender();
  });

  it('Stufen des Logarithmus: der Regler ersetzt die alten Nummern, Zwischenwerte blenden über, alte Links kommen an', () => {
    const B = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=2000';   // eigene Vergleicher: dieser Abschnitt hat keine
    const gleich = (x, y, text) => cy.task('pngDiff', { a: x.file, b: y.file, region: IMAGE_REGION }).then(dd => expect(dd.meanDiff, text).to.be.lessThan(0.5));
    const anders = (x, y, text) => cy.task('pngDiff', { a: x.file, b: y.file, region: IMAGE_REGION }).then(dd => expect(dd.meanDiff, text).to.be.greaterThan(5));
    cy.visitApp(B + '&map=9');                                       // alter Link: fünffach logarithmisch
    cy.get('#mapping').should('have.value', '2');                    // wird zur logarithmischen Färbung mit fünf Stufen
    cy.get('#logStufen').should('have.value', '5');
    cy.expectHash('map', null); cy.expectHash('lst', '5');   // die logarithmische Färbung ist die Vorgabe und steht nicht im Link
    cy.shotStats('log-alt-9').then(alt9 => {
      cy.visitApp(B + '&map=2&lst=5');                               // derselbe Zustand, neu geschrieben
      cy.shotStats('log-neu-5').then(neu5 => gleich(alt9, neu5, 'Stufe 5 färbt wie die alte Nummer 9'));
      cy.visitApp(B + '&map=2');                                     // eine Stufe: die gewohnte logarithmische Färbung
      cy.shotStats('log-1').then(eins => {
        anders(eins, alt9, 'fünf Stufen sehen anders aus als eine');
        cy.visitApp(B + '&map=2&lst=3&ca=off');                      // Farbanker an und aus darf das Bild nicht verschieben:
        cy.pane('palette');                                          // die JS-Kopie der Abbildung muss die Stufen kennen
        cy.revealInDetails('colAnchor');
        cy.shotStats('log-anker-ohne').then(ohneAnker => {
          cy.get('#colAnchor').check({ force: true });
          cy.waitRender();
          cy.wait(600);
          cy.shotStats('log-anker-mit').then(mitAnker => gleich(ohneAnker, mitAnker, 'der Anker verschiebt das Bild nicht'));
        });
        cy.visitApp(B + '&map=2&lst=1.5');                           // Zwischenwert: kein Einrasten, eigenes Bild
        cy.pane('farbe');
        cy.get('#logStufen').should('have.value', '1.5');
        cy.get('#logStufenVal').invoke('val').should('match', /^1[.,]50$/);
        cy.shotStats('log-1punkt5').then(halb => {
          anders(eins, halb, 'anderthalb Stufen sehen anders aus als eine');
          cy.visitApp(B + '&map=2&lst=2');
          cy.shotStats('log-2').then(zwei => anders(halb, zwei, 'und anders als zwei'));
        });
      });
    });
  });

  it('Stufen mit „Dichte mitführen“: aus bleibt die Dichte stehen wie bisher, an zieht sie nach, anderes Bild, Häkchen im Link', () => {
    const gleich = (x, y, text) => cy.task('pngDiff', { a: x.file, b: y.file, region: IMAGE_REGION }).then(dd => expect(dd.meanDiff, text).to.be.lessThan(0.5));
    const anders = (x, y, text) => cy.task('pngDiff', { a: x.file, b: y.file, region: IMAGE_REGION }).then(dd => expect(dd.meanDiff, text).to.be.greaterThan(5));
    const B = 'mode=mandel&re=-0.743643887037158&im=0.131825904205330&z=1e5&it=5000';   // Seepferdchental: große Spanne an Fluchtzeiten
    cy.visitApp(B + '&map=2');
    cy.pane('farbe');
    cy.get('#logDichteMit').should('not.be.checked');                 // Vorgabe: aus, die Dichte bleibt stehen
    cy.rerender(() => cy.setRange('logStufen', 3));
    cy.expectHash('den', '0.0400'); cy.expectHash('lsd', null);       // wie bisher
    cy.shotStats('lsd-aus').then(aus => {
      cy.rerender(() => cy.setRange('logStufen', 1));
      cy.get('#logDichteMit').check();
      cy.expectHash('lsd', '1');
      cy.wait(800);                                                   // die Werteprobe der Ansicht liest die Fluchtzeiten
      cy.rerender(() => cy.setRange('logStufen', 3));
      cy.expectHash('den', v => expect(parseFloat(v), 'Dichte nachgezogen').to.be.greaterThan(0.05));   // enger gedrückte Werte, höhere Dichte
      cy.shotStats('lsd-an').then(an => {
        anders(aus, an, 'mit Dichte anders als ohne');
        cy.location('hash').then(h => {
          cy.visitApp(h);                                             // derselbe Link: Häkchen, Stufe und Dichte kommen mit
          cy.pane('farbe');
          cy.get('#logDichteMit').should('be.checked');
          cy.get('#logStufen').should('have.value', '3');
          cy.shotStats('lsd-link').then(link => gleich(an, link, 'der Link gibt das Bild wieder'));
        });
      });
    });
  });

  it('Verläufe Relief, Doppelt logarithmisch und Logarithmisch + Relief: Adresse, Neurender, andere Bilder', () => {
    cy.get('#mapping option').should('have.length', 25);   // 24 einwertige (mit dem eigenen Sammler; „Histogramm“ ist jetzt die Tabelle der Kurve) plus „Werte kombinieren“ (mit Kurve, Ursprungsnähe, Gesamtdrehung, Periodengebiete, Spiralfalle, logmap, äußerer Winkel) plus „Werte kombinieren“
    cy.rerender(() => cy.pickOption('mapping', 2));
    cy.get('#logStufenRow').should('not.have.attr', 'hidden');       // die Stufen gehören zur logarithmischen Färbung
    for (const st of [2, 3, 4, 5, 6, 10]) {                          // früher fünf eigene Färbungen, heute ein Regler (bis 10)
      cy.rerender(() => cy.setRange('logStufen', st));
      cy.expectHash('lst', String(st));
    }
    cy.rerender(() => cy.setRange('logStufen', 1));
    cy.expectHash('lst', null);                                      // die einfache Stufe steht nicht im Link
    cy.rerender(() => cy.pickOption('mapping', 6));
    cy.get('#logStufenRow').should('have.attr', 'hidden');            // andere Färbung: der Regler ist weg
    cy.expectHash('map', '6');
    cy.rerender(() => cy.pickOption('mapping', 2));
    cy.shotStats('verlauf-log').then(a => {
      cy.rerender(() => cy.pickOption('mapping', 4));
      cy.expectHash('map', '4');
      cy.get('#state').invoke('text').should('match', /Fertig/);
      cy.shotStats('verlauf-abstand').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'Relief sieht anders aus').to.be.greaterThan(5));
        expect(b.std, 'weiches Relief, kein Rauschen, aber Kontrast').to.be.greaterThan(10);
      });
    });
    cy.rerender(() => cy.pickOption('glowMode', 1));   // Randlinien kombinierbar
    cy.expectHash('glow', '1');
    cy.location('hash').then(h => {
      cy.visitApp(h);
      cy.get('#mapping').should('have.value', '4');
      cy.get('#state').invoke('text').should('match', /Fertig/);
    });
  });

  it('Färbung nach Lyapunov-Exponent: eigene Gruppe, eigenes Bild, Randlinien und Innen entfallen, Re und Im mit eigener Palette', () => {
    cy.get('#mapping optgroup').then($g => expect([...$g].map(g => g.label)).to.deep.eq(['Fluchtzeit', 'Abstand', 'Lyapunov', 'Winkel', 'Bahnmittel', 'Bahnfallen']));
    cy.rerender(() => cy.pickOption('glowMode', 1));
    cy.shotStats('lyap-vorher').then(a => {
      cy.rerender(() => cy.pickOption('mapping', 13));
      cy.expectHash('map', '13');
      cy.get('#glowMode').parent().should('have.attr', 'hidden');
      cy.get('#interior').parent().should('have.attr', 'hidden');
      cy.get('#palette').parent().should('not.have.attr', 'hidden');   // der echte Exponent färbt über die Palette
      cy.shotStats('lyap-exponent').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'anderes Bild').to.be.greaterThan(5));
        expect(b.std, 'Verläufe, keine Fläche').to.be.greaterThan(10);
      });
    });
    cy.get('#lyGrenzeRow').should('have.attr', 'hidden');            // die Grenze gibt es nur bei der Färbung nach Re und Im
    cy.rerender(() => cy.pickOption('mapping', 14));
    cy.expectHash('map', '14');
    cy.get('#palette').should('have.value', 'z:0');                  // Pastell: erster Eintrag der zweidimensionalen
    cy.get('#palette').parent().should('not.have.attr', 'hidden');
    cy.get('#lyGrenzeRow').should('not.have.attr', 'hidden');
    cy.get('#lyGrenzeVal').should('have.value', '2');                 // Vorgabe
    cy.expectHash('lg', null);
    cy.shotStats('lyap-grenze-2').then(a => {
      cy.rerender(() => cy.setRange('lyGrenze', 1000));
      cy.get('#lyGrenzeVal').should('have.value', '1.000.000.000');
      cy.expectHash('lg', '1000000000');
      cy.shotStats('lyap-grenze-1e9').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'Muster rund um die Menge ändert sich').to.be.greaterThan(5));
      });
      cy.rerender(() => cy.setRange('lyGrenze', 0));                // 0 ist ein gültiger Wert, nicht „fehlt“
      cy.get('#lyGrenzeVal').should('have.value', '0');
      cy.expectHash('lg', '0');
      cy.shotStats('lyap-grenze-0').then(c => {
        cy.task('pngDiff', { a: a.file, b: c.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'nur noch der erste Schritt').to.be.greaterThan(5));
      });
    });
    cy.rerender(() => cy.pickOption('mapping', 2));                  // zurück: alles wie vorher
    cy.get('#glowMode').should('have.value', '1').parent().should('not.have.attr', 'hidden');
    cy.get('#palette').parent().should('not.have.attr', 'hidden');
    cy.rerender(() => cy.pickOption('formula', 11));                 // Newton/Nova: Lyapunov und die Winkel fehlen, die Bahn-Gruppen bleiben
    cy.get('#mapping optgroup[data-ohne-newton]').should('have.length', 2).each($g => expect($g.prop('hidden')).to.eq(true));
    cy.get('#mapping optgroup:not([data-ohne-newton])').each($g => expect($g.prop('hidden'), $g.attr('label') + ' bleibt').to.eq(false));   // Bahnmittel und Bahnfallen lesen die Bahn aus: sie gelten auch hier
  });

  it('Farbanker: mit „Farbe beim Dichte-Regler halten“ bleibt die Bildmitte beim Verstellen der Dichte stehen', () => {
    const MID = { x0: 0.494, y0: 0.49, x1: 0.506, y1: 0.51 };
    const diffs = {};
    const sweep = (name, anchorOn) => {
      cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1');
      cy.revealInDetails('colAnchor');
      cy.get('#colAnchor').should('be.checked');   // Standard an: Median der Ansicht
      cy.expectHash('ca', v => expect(parseFloat(v)).to.be.greaterThan(0));
      cy.revealInDetails('colAnchor');
      cy.get('#colAnchor').uncheck();
      cy.expectHash('ca', 'off');
      if (anchorOn) {   // Alt+Klick in die Bildmitte setzt den Anker genau dort
        cy.get('#stage canvas').click(640, 360, { altKey: true });
        cy.expectHash('ca', v => expect(parseFloat(v)).to.be.greaterThan(0));
        cy.revealInDetails('colAnchor');
        cy.get('#colAnchor').should('be.checked');
      }
      cy.wait(400);
      cy.shotStats(name + '-vorher', MID).then(a => {
        cy.get('#densVal').clear().type('0,23{enter}');   // Dichte 0,04 → 0,23, getippt statt geschoben: vom Maßstab des Reglers unabhängig
        cy.expectHash('den', v => expect(parseFloat(v)).to.be.greaterThan(0.1));
        cy.wait(400);
        cy.shotStats(name + '-nachher', MID).then(b => {
          cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(g => expect(g.meanDiff, name + ': Bild insgesamt ändert sich').to.be.greaterThan(5));
          cy.task('pngDiff', { a: a.file, b: b.file, region: MID }).then(d => { diffs[name] = d.meanDiff; });
        });
      });
    };
    sweep('anker-aus', false);
    sweep('anker-an', true);
    cy.then(() => expect(diffs['anker-an'], 'Bildmitte mit Anker (' + diffs['anker-an'] + ') gegenüber ohne (' + diffs['anker-aus'] + ')').to.be.lessThan(diffs['anker-aus'] * 0.5));
    cy.revealInDetails('colAnchor');
    cy.get('#colAnchor').uncheck();
    cy.expectHash('ca', 'off');
    cy.revealInDetails('colAnchor');
    cy.get('#colAnchor').check();   // Häkchen allein: Median der Ansicht
    cy.expectHash('ca', v => expect(parseFloat(v)).to.be.greaterThan(0));
    cy.get('#reset').click();
    cy.revealInDetails('colAnchor');
    cy.get('#colAnchor').should('be.checked');   // Zurücksetzen: Standard an, Anker neu aus der Ansicht
    cy.expectHash('ca', v => expect(parseFloat(v)).to.be.greaterThan(0));
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&ca=off');
    cy.revealInDetails('colAnchor');
    cy.get('#colAnchor').should('not.be.checked');
    cy.expectHash('ca', 'off');
  });

  it('„Farben wandern lassen“ bewegt den Farbversatz und lässt sich stoppen', () => {
    cy.revealInDetails('animate');
    cy.get('#animate').check();
    cy.revealInDetails('offset');
    cy.get('#offset').invoke('val').then(v0 => {
      cy.wait(600);
      cy.revealInDetails('offset');
      cy.get('#offset').invoke('val').should(v1 => expect(Number(v1)).to.not.eq(Number(v0)));
    });
    cy.revealInDetails('animate');
    cy.get('#animate').uncheck();
    cy.revealInDetails('offset');
    cy.get('#offset').invoke('val').then(v0 => {
      cy.wait(400);
      cy.revealInDetails('offset');
      cy.get('#offset').invoke('val').should('eq', v0);
    });
  });

  it('Stauchung (Regler): Regler nur bei den Stauchungs-Verläufen, exakt linear/Wurzel/Log an den Marken, im Link', () => {
    cy.rowShown('compRow', false);
    cy.rerender(() => cy.pickOption('mapping', 11));
    cy.rowShown('compRow', true);
    cy.get('#compNote').should('contain.text', 'Log');
    cy.expectHash('sc', '0.000');
    cy.shotStats('stauchung-log').then(a => {
      cy.setRange('comp', 0);
      cy.get('#compNote').should('contain.text', 'linear');
      cy.expectHash('sc', '1.000');
      cy.setRange('comp', 167);
      cy.get('#compNote').should('contain.text', 'Wurzel');
      cy.setRange('comp', 1000);
      cy.get('#compNote').should('contain.text', 'stärker');
      cy.expectHash('sc', '-2.000');
      cy.wait(300);
      cy.shotStats('stauchung-stark').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'starke Stauchung sieht anders aus als Log').to.be.greaterThan(5));
      });
    });
    cy.rerender(() => cy.pickOption('mapping', 12));
    cy.expectHash('map', '12');
    cy.rowShown('compRow', true);
    cy.rerender(() => cy.pickOption('mapping', 2));
    cy.rowShown('compRow', false);
    cy.expectHash('sc', null);
  });

  it('Farbversatz steht im Link und kommt beim Laden zurück', () => {
    cy.setRange('offset', 500);
    cy.expectHash('off', '0.500');
    cy.location('hash').then(h => {
      cy.visitApp(h);
      cy.get('#offset').should('have.value', '500');
    });
    cy.setRange('offset', 0);
    cy.expectHash('off', null);
  });

  it('Farbdichte: Regler, Anzeige und Adresse stimmen überein', () => {
    cy.setRange('density', 700);
    cy.get('#densVal').invoke('val').then(t => {
      const shown = parseFloat(t.replace(',', '.'));
      cy.expectHash('den', v => expect(parseFloat(v)).to.be.closeTo(shown, 0.01));
    });
  });

  it('Farbschema-Editor: neues Schema anlegen, speichern, wiederfinden, löschen', () => {
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').should('have.attr', 'aria-expanded', 'false').click();
    cy.get('#palEd').should('be.visible');
    cy.get('#palEdit').should('have.attr', 'aria-expanded', 'true');
    cy.get('#pane-palette').should('not.have.attr', 'hidden');   // der Editor sitzt im Bedienfeld (Reiter „Palette“), nicht in einem Dialog über dem Bild
    cy.get('#palEd').should($e => expect($e[0].closest('.modal'), 'kein Dialog').to.eq(null));
    cy.get('#stage canvas').should('be.visible');
    cy.get('#peStops > *').its('length').should('be.greaterThan', 1).then(n0 => {
      cy.get('#peAdd').click();
      cy.get('#peStops > *').should('have.length', n0 + 1);
    });
    cy.get('#peName').clear().type('Testschema');
    cy.get('#peSaveNew').should('not.be.visible');   // ein neuer Entwurf wird mit „Speichern“ angelegt
    cy.get('#peSave').click();
    cy.get('#peState').should('have.text', 'gespeichert');
    cy.get('#peDelete').should('be.visible');
    cy.get('#palette optgroup[label="Eigene"] option').should('contain.text', 'Testschema');
    cy.get('#palette option:selected').should('have.text', 'Testschema');
    cy.get('#palette option:selected').should('contain.text', 'Testschema'); cy.expectHash('cp', null);   // der Name steht nicht im Link, nur die Werte (pv)
    cy.window().then(win => expect(win.localStorage.getItem('fractal.palettes')).to.contain('Testschema'));
    cy.get('#peClose').click();
    cy.get('#palEd').should('not.be.visible');
    cy.get('#palEdit').should('have.attr', 'aria-expanded', 'false');
    cy.get('#palette + .menu-btn span').first().should('have.text', 'Testschema');

    // nach dem Neuladen noch da und wählbar
    cy.visitApp('', { keep: true, consent: null, lang: null, aa: null });
    cy.get('#palette optgroup[label="Eigene"] option').contains('Testschema').invoke('val').then(v => cy.pickOption('palette', v));
    cy.get('#palette option:selected').should('have.text', 'Testschema');
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();
    cy.get('#peName').should('have.value', 'Testschema');
    cy.get('#peState').should('have.text', 'gespeichert');
    cy.get('#peDelete').click();
    cy.get('#state').invoke('text').should('match', /gelöscht/);
    // gelöscht ist ganz weg: kein Eintrag, kein „(nicht gespeichert)“, der Editor ist zu, das Bild zeigt wieder die Vorgabe
    cy.get('#palEd').should('not.be.visible');
    cy.get('#palette option').then($o => expect([...$o].map(o => o.textContent).join('|'), 'keine Spur mehr').to.not.contain('Testschema'));
    cy.get('#palette optgroup[label="Eigene"]').should('not.exist');
    cy.get('#palette').should('have.value', '0');
    cy.expectHash('cp', null);
    cy.window().then(win => expect(win.localStorage.getItem('fractal.palettes') || '[]').to.not.contain('Testschema'));
  });

  it('Umkehren verändert die Stützstellen, Zurücksetzen holt den Stand vom Öffnen zurück', () => {
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();
    cy.get('#pePreview').should('be.visible');
    const stand = $r => [...$r].map(r => r.value).join(',');
    cy.get('#peStops input[type=range]').then($r => {
      const vorher = stand($r);
      cy.get('#peReverse').click();
      cy.get('#peStops input[type=range]').should($n => expect(stand($n), 'umgekehrt').to.not.eq(vorher));
      cy.get('#peReset').click();
      cy.get('#peStops input[type=range]').should($n => expect(stand($n), 'wie beim Öffnen').to.eq(vorher));
    });
    cy.get('#peCyclic').should('be.checked').uncheck().should('not.be.checked');
    cy.get('#palEdit').click();   // derselbe Knopf klappt den Editor wieder zu
    cy.get('#palEd').should('not.be.visible');
  });

  it('ein ungespeicherter Entwurf verschwindet aus dem Menü, sobald eine andere Palette gewählt wird', () => {
    const texte = $o => [...$o].map(o => o.textContent).join('|');
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();
    cy.get('#peReverse').click();
    cy.get('#peClose').click();
    cy.get('#palette option').should($o => expect(texte($o), 'färbt noch das Bild').to.contain('(nicht gespeichert)'));
    cy.pickOption('palette', 7);
    cy.get('#palette option').should($o => expect(texte($o), 'kein toter Eintrag').to.not.contain('(nicht gespeichert)'));
  });

  // Ohne Einwilligung kann nichts im Browser landen, darum gibt es die Speichern-Knöpfe gar nicht erst. Das Schema
  // wirkt trotzdem sofort im Bild und steckt im Link — verloren geht also nur das Ablegen.
  it('ohne Einwilligung für App-Einstellungen gibt es kein Speichern, das Schema bleibt im Link', () => {
    cy.visitApp('', { consent: CONSENT_NONE });
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();
    cy.get('#peName').clear().type('Fluechtig');
    cy.get('#peSaveRow').should('have.attr', 'hidden');
    cy.get('#peSave').should('not.be.visible');
    cy.get('#peNoStore').scrollIntoView().should('be.visible').and('contain.text', 'Kein Speichern');   // der Editor ist lang: erst ins Bild rollen
    cy.get('#palEd p.hint[data-i18n="editor.changes-apply-image-immediately"]').should('not.have.attr', 'hidden');   // der Hinweis auf die Cookie-Einstellungen bleibt ohne Einwilligung
    cy.get('#palette option:selected').should('contain.text', 'Fluechtig'); cy.expectHash('cp', null);   // der Name steht nicht im Link, nur die Werte (pv)
    cy.get('#palette option:selected').invoke('text').should('contain', 'Fluechtig');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.palettes')).to.be.null);
    cy.get('#peClose').click();
  });

  it('ein Schema im Link wird beim Laden angeboten und angewandt', () => {
    cy.visitApp('mode=mandel&re=-0.75&im=0&z=1&cp=' + encodeURIComponent('Linkschema~1~0:ff0000,0.5:00ff00,1:0000ff'));
    cy.get('#palette option:selected').invoke('text').should('contain', 'Linkschema');
    cy.get('#palette option:selected').should('contain.text', 'Linkschema'); cy.expectHash('cp', null);   // der Name steht nicht im Link, nur die Werte (pv)
  });
});


describe('Zweidimensionale Paletten', () => {
  const gruppen = () => cy.get('#palette optgroup').then($g => [...$g].map(g => g.label));
  const anders = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(5));
  const gleich = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.lessThan(0.5));
  const art = a => { cy.revealInDetails('palArt'); cy.get('#palArt button[data-art="' + a + '"]').click(); };   // Umschalter gewöhnlich / zweidimensional
  const editor = () => { cy.revealInDetails('palEdit'); cy.get('#palEdit').click(); cy.get('#pal2Ed').should('not.have.attr', 'hidden'); };

  it('der Umschalter steht nur, wo die Färbung zwei Werte liefert, und wechselt die Liste', () => {
    cy.visitApp();
    cy.get('#palArt').should('have.attr', 'hidden');
    gruppen().should('deep.eq', ['Hell', 'Dunkel', 'Zwei- und Dreiklang', 'Bunt']);
    cy.visitApp('mode=mandel&map=14&p2=field-lines');
    cy.get('#palArt').should('not.have.attr', 'hidden');
    cy.get('#palArt [data-art="2"]').should('have.class', 'on');
    gruppen().should('deep.eq', ['Vorgaben']);
    cy.get('#palette').should('have.value', 'z:3');
    cy.rerender(() => art(1));
    gruppen().should('deep.eq', ['Hell', 'Dunkel', 'Zwei- und Dreiklang', 'Bunt']);
    cy.expectHash('p2', 'n');
    cy.rerender(() => art(2));
    cy.get('#palette').should('have.value', 'z:3');                  // die zuletzt gewählte zweidimensionale kommt zurück
    cy.rerender(() => cy.pickOption('mapping', 2));
    cy.get('#palArt').should('have.attr', 'hidden');
    gruppen().should('deep.eq', ['Hell', 'Dunkel', 'Zwei- und Dreiklang', 'Bunt']);
    cy.expectHash('p2', null);
  });

  it('Lyapunov nach Re und Im: die bisherigen Farben sind die Vorgabe, Paletten beider Arten kommen dazu, der Link merkt sich die Wahl', () => {
    cy.visitApp('mode=mandel&map=14&re=0&im=0&z=0.75&it=255');
    cy.get('#palette').should('have.value', 'z:0');
    cy.expectHash('p2', null);                                       // Vorgabe: nichts im Link
    cy.shotStats('zwei-reim').then(a => {
      cy.rerender(() => cy.pickOption('palette', 'z:4'));            // Kacheln
      cy.expectHash('p2', null); cy.expectHash('pv2', v => expect(v, 'tiles: mit ihren Werten im Link').to.be.a('string'));
      cy.shotStats('zwei-reim-kacheln').then(b => anders(a, b, 'andere Farben'));
      cy.rerender(() => art(1));                                     // auch die gewöhnlichen Paletten
      cy.rerender(() => cy.pickOption('palette', 0));
      cy.expectHash('p2', 'n');
      cy.location('hash').then(h => { cy.visitApp(h); cy.get('#palette').should('have.value', '0'); cy.get('#palArt [data-art="1"]').should('have.class', 'on'); });
      cy.rerender(() => art(2));
      cy.get('#palette').should('have.value', 'z:0');
      cy.expectHash('p2', null);
      cy.shotStats('zwei-reim-zurueck').then(c => gleich(a, c, 'wieder die bisherigen Farben'));
    });
  });

  it('Lyapunov (Markus): Gold und Blau als Vorgabe, Farbversatz nur bei Paletten mit Umlauf', () => {
    cy.visitApp('mode=mandel&f=13');
    cy.get('#palette').should('have.value', 'z:1');
    cy.rowShown('offset', false);
    cy.shotStats('zwei-markus').then(a => {
      cy.rerender(() => cy.pickOption('palette', 'z:2'));            // Eis und Glut
      cy.expectHash('p2', null); cy.expectHash('pv2', v => expect(v, 'ice-and-embers: mit ihren Werten im Link').to.be.a('string'));
      cy.rowShown('offset', false);
      cy.shotStats('zwei-markus-eis').then(b => {
        anders(a, b, 'andere Farben');
        cy.rerender(() => cy.pickOption('palette', 'z:6'));          // Bänder: Formel mit Umlauf, der Farbversatz schiebt die Bänder
        cy.expectHash('p2', null); cy.expectHash('pv2', v => expect(v, 'bands: mit ihren Werten im Link').to.be.a('string'));
        cy.rowShown('offset', true);
        cy.shotStats('zwei-markus-baender').then(c => {
          anders(b, c, 'Bänder statt Eis und Glut');
          cy.rerender(() => cy.pickOption('palette', 'z:7'));        // Magenta und Mint: dieselben Bänder in anderen Tönen
          cy.expectHash('p2', null); cy.expectHash('pv2', v => expect(v, 'magenta-and-mint: mit ihren Werten im Link').to.be.a('string'));
          cy.shotStats('zwei-markus-magenta').then(d => anders(c, d, 'Magenta und Mint statt Bänder'));
        });
      });
      cy.rerender(() => art(1));
      cy.rerender(() => cy.pickOption('palette', 7));                // gewöhnliche Palette über λ
      cy.expectHash('p2', 'n');
      cy.rowShown('offset', true);
    });
  });

  it('Fluchtwinkel: Färbung mit dem Winkel beim Ausbruch, ohne Randlinien; Innen: Winkel des letzten Bahnpunkts', () => {
    cy.visitApp();
    cy.shotStats('winkel-vorher').then(a => {
      cy.rerender(() => cy.pickOption('mapping', 15));
      cy.expectHash('map', '15');
      cy.get('#glowMode').parent().should('have.attr', 'hidden');
      cy.get('#interior').parent().should('not.have.attr', 'hidden');
      cy.get('#palArt').should('not.have.attr', 'hidden');
      cy.get('#palette').should('have.value', '0');                  // Vorgabe: die gewöhnliche Palette
      cy.shotStats('winkel-klassisch').then(b => {
        anders(a, b, 'der Winkel färbt mit');
        cy.rerender(() => art(2));
        cy.get('#palette').should('have.value', 'z:3');              // erste zweidimensionale hier: Feldlinien
        cy.rerender(() => cy.pickOption('palette', 'z:5'));          // Binärzerlegung
        cy.expectHash('p2', null); cy.expectHash('pv2', v => expect(v, 'binary-decomposition: mit ihren Werten im Link').to.be.a('string'));
        cy.shotStats('winkel-binaer').then(c => anders(b, c, 'Binärzerlegung'));
      });
    });
    const MITTE = { x0: 0.40, y0: 0.42, x1: 0.48, y1: 0.58 };        // im Hauptkörper der Menge
    cy.shotStats('winkel-innen-schwarz', MITTE).then(a => {
      expect(a.mean, 'innen schwarz').to.be.lessThan(5);
      cy.rerender(() => cy.pickOption('interior', 3));
      cy.expectHash('in', '3');
      cy.shotStats('winkel-innen-winkel', MITTE).then(b => expect(b.std, 'innen färbt der Winkel').to.be.greaterThan(5));
    });
  });

  it('Newton/Nova: die bisherige Färbung bleibt Vorgabe, zweidimensionale Paletten trennen Wurzel und Dauer', () => {
    cy.visitApp('mode=julia&f=11&jre=0&jim=0&re=0&im=0&z=0.7');
    cy.get('#palette').should('have.value', '0');
    cy.get('#palArt [data-art="1"]').should('have.class', 'on');
    cy.shotStats('zwei-newton').then(a => {
      cy.rerender(() => art(2));
      cy.get('#palette').should('have.value', 'z:4');                // Kacheln: je Wurzel eine Farbfamilie
      cy.expectHash('p2', null); cy.expectHash('pv2', v => expect(v, 'tiles: mit ihren Werten im Link').to.be.a('string'));
      cy.shotStats('zwei-newton-kacheln').then(b => anders(a, b, 'andere Farben'));
      cy.rerender(() => art(1));
      cy.expectHash('p2', null);
      cy.shotStats('zwei-newton-zurueck').then(c => gleich(a, c, 'wie vorher'));
    });
  });

  it('Editor „Aus Verläufen“: Kopie einer Vorgabe, Muster, Verlauf aus einer Palette, Speichern, Link, Löschen', () => {
    cy.visitApp('mode=mandel&map=15&p2=field-lines');                           // Feldlinien
    cy.shotStats('ed2-feldlinien').then(a => {
      editor();
      cy.get('#palEd').should('have.attr', 'hidden');                // der Editor der gewöhnlichen Paletten bleibt zu
      cy.get('#p2eName').should('have.value', 'Feldlinien (eigen)');
      cy.get('#p2eArt [data-art="verlauf"]').should('have.class', 'on');
      cy.get('#p2eMuster').should('have.value', 'linien');
      cy.get('#palette').should('have.value', 'y:tmp');
      cy.waitRender();
      cy.shotStats('ed2-kopie').then(b => gleich(a, b, 'die Kopie färbt wie die Vorgabe'));
      cy.pickOption('p2eMuster', 'kacheln');
      cy.get('#p2eNuRow').should('not.have.attr', 'hidden');
      cy.get('#p2eBreiteRow').should('have.attr', 'hidden');
      cy.get('.pe2-v[data-v="a"] .pe2-aus').select('8', { force: true });   // Blattgold
      cy.expectHash('pv2', v => expect(v).to.contain('~v~kacheln'));
      cy.waitRender();
      cy.shotStats('ed2-kacheln').then(c => anders(a, c, 'Kacheln in Blattgold'));
    });
    cy.get('#p2eName').clear().type('Testmuster');
    cy.get('#p2eSave').click();
    cy.get('#p2eState').should('have.text', 'gespeichert');
    cy.get('#palette optgroup[label="Eigene"] option').should('contain.text', 'Testmuster');
    cy.window().then(win => expect(JSON.parse(win.localStorage.getItem('fractal.palettes2')), 'im Browser').to.have.length(1));
    cy.get('#palette option:selected').should('contain.text', 'Testmuster'); cy.expectHash('cp2', null);   // der Name steht nicht im Link, nur die Werte (pv2)
    cy.location('hash').then(h => {                                   // der Link trägt das Schema selbst
      cy.visitApp(h, { keep: true });
      cy.get('#palette option:selected').should('contain.text', 'Testmuster');
    });
    cy.get('#palette optgroup[label="Eigene"] option').first().invoke('val').then(v => cy.pickOption('palette', v));
    editor();
    cy.get('#p2eDelete').click();
    cy.get('#pal2Ed').should('have.attr', 'hidden');
    cy.get('#palette optgroup[label="Eigene"]').should('not.exist');
    cy.get('#palette').should('have.value', 'z:3');                  // zurück zur Vorgabe Feldlinien
    cy.window().then(win => expect(JSON.parse(win.localStorage.getItem('fractal.palettes2'))).to.have.length(0));
  });

  it('Editor „Aus Verläufen“: je Achse ein Verlaufsstreifen mit Marken; ziehen verschiebt die Stützstelle, Klick wählt die Zeile', () => {
    cy.visitApp('mode=mandel&map=15&p2=e&cp2=' + encodeURIComponent('Probe2~v~linien,6,4,0.070,0.850,0,0~1;0.000:ff2020,0.400:2020ff~-'));   // eigenes Schema aus dem Link
    editor();
    cy.get('#p2eMehr').then($d => { $d[0].open = true; });                        // die Stützstellen stehen unter „Erweitert“
    cy.get('.pe2-st[data-v="a"] .pe2-streifen').scrollIntoView().should('be.visible');   // der Verlauf der Achse als Streifen (tief im Bedienfeld: erst ins Bild rollen)
    cy.get('.pe2-st[data-v="a"] .pe-marke').should('have.length', 2);              // je Stützstelle eine Marke darunter
    cy.get('.pe2-st[data-v="a"] .pe-stop').should('have.length', 2);               // die Liste bleibt
    cy.get('.pe2-st[data-v="a"] .pe-marken').then($b => {                           // die zweite Marke von 40 % auf 70 % ziehen
      const r = $b[0].getBoundingClientRect(), m = $b.find('.pe-marke').eq(1);
      cy.wrap(m).trigger('pointerdown', { clientX: r.left + 0.4 * r.width, clientY: r.top + 6, pointerId: 1, button: 0, isPrimary: true, force: true })
        .trigger('pointermove', { clientX: r.left + 0.7 * r.width, clientY: r.top + 6, pointerId: 1, force: true })
        .trigger('pointerup', { clientX: r.left + 0.7 * r.width, clientY: r.top + 6, pointerId: 1, force: true });
    });
    cy.get('.pe2-st[data-v="a"] .pe-stop').eq(1).find('input[type=range]').invoke('val').then(v => expect(+v, 'Regler folgt der Marke').to.be.within(690, 710));
    cy.get('.pe2-st[data-v="a"] .pe-stop').eq(1).find('input.pos').invoke('val').should('match', /^(69|70|71)[.,]\d$/);
    cy.expectHash('pv2', v => expect(v, 'gezogene Stelle im Link').to.match(/0\.(69|70|71)\d:2020ff/));
    cy.get('.pe2-st[data-v="a"] .pe-marke').eq(0).trigger('pointerdown', { pointerId: 2, button: 0, isPrimary: true, force: true }).trigger('pointerup', { pointerId: 2, force: true });   // Klick: Zeile gewählt
    cy.get('.pe2-st[data-v="a"] .pe-stop').eq(0).should('have.class', 'on');
    cy.get('.pe2-st[data-v="a"] .pe-stop').eq(0).find('input[type=range]').invoke('val', 250).trigger('input');   // der Regler rückt die Marke mit
    cy.get('.pe2-st[data-v="a"] .pe-marke').eq(0).should('have.attr', 'style').and('contain', 'left: 25%');
  });

  it('Editor „Quilez für zwei Werte“: Kopie von Pastell färbt gleich, Regler je Quadrant, Zurücksetzen', () => {
    cy.visitApp('mode=mandel&map=14&re=0&im=0&z=0.75&it=255');
    cy.shotStats('q2-vorher').then(a => {
      editor();
      cy.get('#p2eArt [data-art="formel"]').should('have.class', 'on');
      cy.get('#p2eRegler input[type=range]').should('have.length', 15); cy.get('#p2eRegler input.pe-wert').should('have.length', 15);   // je Regler ein Feld zum Tippen (19.09.2026)
      cy.get('#p2eQuad [data-q="3"]').should('have.class', 'on');
      cy.waitRender();
      cy.shotStats('q2-kopie').then(b => gleich(a, b, 'die Kopie färbt wie das Original'));
      cy.get('#p2eQuad [data-q="0"]').click().should('have.class', 'on');
      cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').clear().type('0,3{enter}');   // getippt im Quadranten „− −“ allein: die anderen bleiben, wie sie sind
      cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').should('have.value', '0,30');
      cy.get('#p2eRegler input[type=range][data-k="2"][data-i="0"]').should('have.value', '0.3');
      cy.get('#p2eQuad [data-q="3"]').click(); cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').should('not.have.value', '0,30');
      cy.get('#p2eQuad [data-q="0"]').click().should('have.class', 'on');
      cy.get('#p2eGleich').check({ force: true });                   // alle vier Quadranten wie der gewählte
      cy.get('#p2eRegler input[type=range][data-k="0"][data-i="0"]').invoke('val', 0).trigger('input', { force: true });   // a, Rot: kein Rot mehr
      cy.expectHash('pv2', v => expect(v).to.contain('~f~0,'));
      cy.get('#p2eRegler input.pe-wert[data-k="0"][data-i="0"]').should('have.value', '0,00');   // das Feld folgt dem Regler
      cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').clear().type('-0,65{enter}');   // cu, Rot getippt: Regler und alle vier Quadranten folgen
      cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').should('have.value', '-0,65');
      cy.get('#p2eRegler input[type=range][data-k="2"][data-i="0"]').should('have.value', '-0.65');
      cy.get('#p2eQuad [data-q="2"]').click(); cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').should('have.value', '-0,65');   // im anderen Quadranten dasselbe (alle gleich)
      cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').clear().type('7{enter}');   // über dem Reglerbereich: geklemmt auf 4
      cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').should('have.value', '4,00');
      cy.get('#p2eRegler input[type=range][data-k="2"][data-i="0"]').should('have.value', '4');
      // „alle vier Quadranten gleich“ ist ein Schalter (20.09.2026): abwählbar, auch wenn alle noch gleich sind; danach gilt eine Änderung nur dem gewählten Quadranten
      cy.get('#p2eGleich').uncheck({ force: true }).should('not.be.checked');
      cy.get('#p2eQuad [data-q="1"]').click(); cy.get('#p2eGleich').should('not.be.checked');   // bleibt abgewählt, der Zustand springt nicht zurück
      cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').clear().type('1,5{enter}');
      cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').should('have.value', '1,50');
      cy.get('#p2eQuad [data-q="0"]').click(); cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').should('have.value', '4,00');   // der andere Quadrant blieb
      cy.get('#p2eGleich').check({ force: true });   // anhaken: der gewählte Quadrant (4,00) gilt wieder für alle
      cy.get('#p2eQuad [data-q="1"]').click(); cy.get('#p2eRegler input.pe-wert[data-k="2"][data-i="0"]').should('have.value', '4,00');
      cy.get('#p2eQuad [data-q="0"]').click();
      cy.waitRender();
      cy.shotStats('q2-geaendert').then(c => anders(a, c, 'andere Farben'));
      cy.get('#p2eReset').click();
      cy.waitRender();
      cy.shotStats('q2-zurueck').then(d => gleich(a, d, 'Zurücksetzen holt den Stand vom Öffnen'));
    });
  });
});

describe('Färbungen nach Bahnstatistik', () => {
  const anders = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(5));
  const gleich = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.lessThan(0.5));
  const gruppen = () => cy.get('#palette optgroup').then($g => [...$g].map(g => g.label));
  const art = a => { cy.revealInDetails('palArt'); cy.get('#palArt button[data-art="' + a + '"]').click(); };

  it('sechs Färbungen: eigenes Bild, Adresse, keine Randlinien; Innen und zweidimensionale Paletten je nach Färbung', () => {
    cy.visitApp();
    cy.shotStats('stat-log').then(a => {
      // [Verfahren, Innen wählbar (nur außen gefärbt), erste zweidimensionale Palette oder null]
      for (const [m, innen, zwei] of [[16, false, 3], [17, false, null], [18, false, 3], [19, true, null], [20, true, null], [21, false, 3]]) {
        cy.rerender(() => cy.pickOption('mapping', m));
        cy.expectHash('map', String(m));
        cy.get('#glowMode').parent().should('have.attr', 'hidden');
        cy.get('#interior').parent().should(innen ? 'not.have.attr' : 'have.attr', 'hidden');
        cy.get('#palArt').should(zwei === null ? 'have.attr' : 'not.have.attr', 'hidden');
        if (zwei !== null) cy.get('#palette').should('have.value', 'z:' + zwei);   // Vorgabe: Feldlinien
        cy.shotStats('stat-' + m).then(b => anders(a, b, 'Färbung ' + m));
      }
    });
    cy.rerender(() => cy.pickOption('formula', 11));                 // Newton/Nova: die Bahn-Färbungen bleiben, denn eine Bahn gibt es auch dort
    cy.get('#mapping optgroup[label="Bahnmittel"]').should('have.prop', 'hidden', false);
    cy.get('#mapping').should('have.value', '21');   // die zuletzt gewählte bleibt stehen, sie bedeutet hier ebenfalls etwas
  });

  // Die Bahnstatistik malt seidige Schleier, die Fluchtzeit malt Ringe. Beides in einem Bild geht nur, wenn die Färbung
  // zwei Werte liefert und eine zweidimensionale Palette sie beide bekommt. Die einwertigen Verfahren bleiben daneben.
  // Das n in sin(n·arg z) war fest 5. Als Regler ändert es die Feinheit der Strähnen; die Vorgabe 5 lässt jedes bestehende
  // Bild unverändert. Die Zeile gibt es nur, wo das Streifenmittel rechnet (19 und 22), im Link steht sp nur abseits der Vorgabe.
  it('Streifen: Regler nur beim Streifenmittel, Vorgabe 5, ein anderer Wert ändert das Bild und steht im Link', () => {
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400');
    cy.get('#streifenRow').should('have.attr', 'hidden');                 // logarithmisch: keine Streifen
    cy.rerender(() => cy.pickOption('mapping', 19));
    cy.get('#streifenRow').should('not.have.attr', 'hidden');
    cy.get('#streifenVal').should('have.value', '5');
    cy.get('#streifen').should('have.value', '5');
    cy.expectHash('sp', null);                                             // Vorgabe: nichts im Link
    cy.shotStats('streifen-5').then(fuenf => {
      cy.get('#streifenVal').clear().type('9{enter}');                   // getippt, wie überall
      cy.waitRender();
      cy.get('#streifen').should('have.value', '9');
      cy.expectHash('sp', '9');
      cy.shotStats('streifen-9').then(neun => anders(fuenf, neun, 'neun Streifen sehen anders aus als fünf'));
    });
    cy.rerender(() => cy.pickOption('mapping', 31));                      // kombiniert (Fluchtzeit, Streifenmittel): dieselbe Statistik, Regler bleibt
    cy.get('#streifenRow').should('not.have.attr', 'hidden');
    cy.get('#streifenVal').should('have.value', '9');
    cy.rerender(() => cy.pickOption('mapping', 20));                      // Dreiecksmittel kennt keine Streifen
    cy.get('#streifenRow').should('have.attr', 'hidden');
    cy.expectHash('sp', null);
  });
  it('Vorlauf und Gewichtung: Regler nur bei der Bahnstatistik, Vorgabe 0, andere Werte ändern das Bild und stehen im Link', () => {
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400');
    cy.get('#vorlaufRow').should('have.attr', 'hidden');                  // logarithmisch: keine Bahnstatistik
    cy.get('#gewichtRow').should('have.attr', 'hidden');
    cy.rerender(() => cy.pickOption('mapping', 17));                     // Kreuzfalle: Vorlauf ja, Gewichtung nein (kein Mittel)
    cy.get('#vorlaufRow').should('not.have.attr', 'hidden');
    cy.get('#gewichtRow').should('have.attr', 'hidden');
    cy.rerender(() => cy.pickOption('mapping', 19));                     // Streifenmittel: beide
    cy.get('#vorlaufRow').should('not.have.attr', 'hidden');
    cy.get('#gewichtRow').should('not.have.attr', 'hidden');
    cy.get('#vorlaufVal').should('have.value', '0');
    cy.get('#gewichtVal').invoke('val').should('match', /^0[.,]00$/);
    cy.expectHash('sk', null);                                            // Vorgaben: nichts im Link
    cy.expectHash('sw', null);
    cy.shotStats('bahn-vorgabe').then(vorgabe => {
      cy.get('#gewichtVal').clear().type('1{enter}');                    // spätere Schritte zählen mehr
      cy.waitRender();
      cy.get('#gewicht').should('have.value', '1');
      cy.expectHash('sw', '1');
      cy.shotStats('bahn-gewicht-1').then(g1 => {
        anders(vorgabe, g1, 'Gewichtung 1 sieht anders aus als das gewöhnliche Mittel');
        cy.get('#gewichtVal').clear().type('0{enter}');
        cy.waitRender();
        cy.expectHash('sw', null);
        cy.get('#vorlaufVal').clear().type('60{enter}');                 // die ersten 60 Schritte zählen nicht (20 änderte das Bild nur schwach)
        cy.waitRender();
        cy.get('#vorlauf').should('have.value', '60');
        cy.expectHash('sk', '60');
        cy.shotStats('bahn-vorlauf-60').then(v60 => anders(vorgabe, v60, 'Vorlauf 60 sieht anders aus als ohne'));
      });
    });
    cy.rerender(() => cy.pickOption('mapping', 2));                      // zurück zur Fluchtzeit: beide Zeilen weg, nichts im Link
    cy.get('#vorlaufRow').should('have.attr', 'hidden');
    cy.get('#gewichtRow').should('have.attr', 'hidden');
    cy.expectHash('sk', null);
  });
  it('Ursprungsnähe: allein (24) wie eine Falle, innen wie außen; als Paar mit dem Streifenmittel (25) zweidimensional mit Streifen und Gewichtung', () => {
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400');
    cy.shotStats('ursprung-log').then(log => {
      cy.rerender(() => cy.pickOption('mapping', 24));
      cy.expectHash('map', '24');
      cy.get('#palArt').should('have.attr', 'hidden');                 // ein Wert: keine zweidimensionale Palette
      cy.get('#streifenRow').should('have.attr', 'hidden');
      cy.get('#gewichtRow').should('have.attr', 'hidden');
      cy.get('#vorlaufRow').should('not.have.attr', 'hidden');          // der Vorlauf gilt für jede Bahnstatistik
      cy.get('#interior').parent().should('have.attr', 'hidden');       // färbt innen wie außen, wie die Kreuzfalle
      cy.shotStats('ursprung-24').then(u => {
        anders(log, u, 'Ursprungsnähe sieht anders aus als logarithmisch');
        cy.rerender(() => cy.pickOption('mapping', 31));                // kombiniert: Ursprungsnähe mit Abzug auf der ersten Achse
        cy.expectHash('map', '31');
        cy.rerender(() => cy.pickOption('paarA', 5));
        cy.rerender(() => cy.pickOption('paarAbzugA', 1));
        cy.get('#palArt').should('not.have.attr', 'hidden');            // zwei Werte: Umschalter da, Vorgabe zweidimensional „Feldlinien“
        cy.get('#palArt [data-art="2"]').should('have.class', 'on');
        cy.get('#palette').find('option:selected').should('have.text', 'Feldlinien');
        cy.get('#streifenRow').should('not.have.attr', 'hidden');
        cy.get('#gewichtRow').should('not.have.attr', 'hidden');
        cy.get('#abzugRow').should('not.have.attr', 'hidden');          // Fluchtzeit-Abzug nur hier
        cy.get('#abzugVal').invoke('val').should('match', /^0[.,]00$/);
        cy.expectHash('sn', null);
        cy.shotStats('ursprung-25').then(p => {
          anders(u, p, 'die Kombination sieht anders aus als die Ursprungsnähe allein');
          cy.get('#abzugVal').clear({ force: true }).type('0,3{enter}', { force: true });   // force: nach dem Screenshot hält Cypress das Feld für verdeckt, die App zeigt es

          cy.get('#abzug').should('have.value', '0.3');
          cy.expectHash('sn', '0.3');
          cy.wait(400);
          cy.shotStats('ursprung-25-abzug').then(q => anders(p, q, 'der Fluchtzeit-Abzug ändert das Bild'));
        });
        cy.rerender(() => cy.pickOption('mapping', 19));
        cy.get('#abzugRow').should('have.attr', 'hidden');
        cy.expectHash('sn', null);
        cy.rerender(() => cy.pickOption('mapping', 26));                // Gesamtdrehung allein: wie das Streifenmittel, aber ohne Streifen
        cy.expectHash('map', '26');
        cy.get('#palArt').should('have.attr', 'hidden');
        cy.get('#streifenRow').should('have.attr', 'hidden');
        cy.get('#gewichtRow').should('not.have.attr', 'hidden');
        cy.shotStats('drehung-26').then(d => {
          anders(u, d, 'Gesamtdrehung sieht anders aus als die Ursprungsnähe');
          cy.rerender(() => cy.pickOption('mapping', 31));              // kombiniert: Gesamtdrehung mit Abzug und Streifenmittel
          cy.rerender(() => cy.pickOption('paarA', 4));
          cy.rerender(() => cy.pickOption('paarAbzugA', 2));
          cy.expectHash('map', '31');
          cy.get('#palArt [data-art="2"]').should('have.class', 'on');
          cy.get('#palette option').contains('Salbei mit Höfen').then($o => cy.pickOption('palette', $o.val()));   // dieses Schema trägt das Muster „Verlauf über Verlauf“
          cy.get('#streifenRow').should('not.have.attr', 'hidden');
          cy.get('#abzugRow').should('not.have.attr', 'hidden');
          cy.expectHash('sn', '0.3');                                    // der Abzug von vorhin gilt hier weiter
          cy.shotStats('drehung-27').then(e => {
            anders(d, e, 'die Kombination sieht anders aus als die Drehung allein');
            cy.get('#abzugVal').clear({ force: true }).type('2{enter}', { force: true });   // Bereich bis 2 (force wie oben)
            cy.get('#abzug').should('have.value', '2');
            cy.expectHash('sn', '2');
            cy.revealInDetails('palEdit');                              // die Vorgabe nutzt das neue Muster „Verlauf über Verlauf“
            cy.get('#palEdit').click();
            cy.get('#p2eMuster').should('have.value', 'ueberlagern');
            cy.get('#p2eMuster option').should('have.length', 8);   // mit „Zonen über Verlauf“
            cy.get('#p2eMusterText').invoke('text').should('match', /Mittelgrau/);
            cy.get('#p2eReset').click();
          });
        });
      });
    });
  });
  it('Textur: eine Bahnstatistik als Helligkeit über der Fluchtzeit-Färbung — Vorgabe keine, Regler und Link, nur wo der Kanal frei ist', () => {
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400');
    cy.get('#texturRow').should('not.have.attr', 'hidden');
    cy.get('#textur').should('have.value', '0');
    cy.get('#texStaerkeRow').should('have.attr', 'hidden');
    cy.expectHash('tx', null);
    cy.shotStats('textur-ohne').then(ohne => {
      cy.rerender(() => cy.pickOption('textur', 1));                    // Streifenmittel als Textur
      cy.expectHash('tx', '1');
      cy.get('#texStaerkeRow').should('not.have.attr', 'hidden');
      cy.get('#texKontrastRow').should('not.have.attr', 'hidden');
      cy.get('#texMitteRow').should('not.have.attr', 'hidden');
      cy.get('#streifenRow').should('not.have.attr', 'hidden');           // die Regler der Statistik gelten mit
      cy.get('#gewichtRow').should('not.have.attr', 'hidden');
      cy.get('#glowMode').parent().should('have.attr', 'hidden');          // Randlinien brauchen den Kanal, den die Textur belegt
      cy.get('#texStaerkeVal').invoke('val').should('match', /^0[.,]70$/);
      cy.shotStats('textur-streifen').then(mit => {
        anders(ohne, mit, 'die Textur ändert das Bild');
        cy.get('#texStaerkeVal').clear().type('0,2{enter}');               // reine Farbstufe
        cy.get('#texStaerke').should('have.value', '0.2');
        cy.expectHash('ts', '0.2');
        cy.wait(400);
        cy.gezeichnet(); cy.shotStats('textur-schwach').then(schwach => anders(mit, schwach, 'weniger Stärke, anderes Bild'));
        cy.rerender(() => cy.pickOption('textur', 0));                    // aus: wieder das alte Bild
        cy.expectHash('tx', null);
        cy.get('#glowMode').parent().should('not.have.attr', 'hidden');
        cy.shotStats('textur-wieder-ohne').then(zurueck => gleich(ohne, zurueck, 'ohne Textur wieder das alte Bild'));
        cy.rerender(() => cy.pickOption('textur', 6));                    // Strahlen: der Fluchtwinkel als Textur, Streifen-Regler gilt, keine Gewichtung
        cy.expectHash('tx', '6');
        cy.get('#streifenRow').should('not.have.attr', 'hidden');
        cy.get('#gewichtRow').should('have.attr', 'hidden');
        cy.shotStats('textur-strahlen').then(st => anders(ohne, st, 'Strahlen ändern das Bild'));
        cy.rerender(() => cy.pickOption('textur', 8));                    // Periodengebiete: Schritt der größten Nähe als Treppe
        cy.expectHash('tx', '8');
        cy.shotStats('textur-perioden').then(pe => cy.task('pngDiff', { a: ohne.file, b: pe.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'Periodengebiete ändern das Bild (bei Zoom 1 nur wenige Gebiete)').to.be.greaterThan(2)));
        cy.rerender(() => cy.pickOption('textur', 0));
      });
    });
    cy.rerender(() => cy.pickOption('mapping', 19));                     // Färbung nach Bahnstatistik: die Textur bleibt möglich (im dritten Kanal)
    cy.get('#texturRow').should('not.have.attr', 'hidden');
    cy.rerender(() => cy.pickOption('mapping', 4));                      // Relief braucht den Kanal selbst
    // Abstand und Relief schließen Texturen nicht mehr aus (siehe Kanal-Umbau): der Platz bleibt sichtbar
  });
  it('Textur über einer Statistik-Färbung: Streifenmittel (19) und das Paar (27) mit Textur, Link, ohne Textur wieder das alte Bild', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&map=19');
    cy.get('#texturRow').should('not.have.attr', 'hidden');
    cy.shotStats('statistik-ohne-textur').then(ohne => {
      cy.rerender(() => cy.pickOption('textur', 3));                    // Gesamtdrehung als Textur über dem Streifenmittel
      cy.expectHash('tx', '3');
      cy.get('#texStaerkeRow').should('not.have.attr', 'hidden');
      cy.shotStats('statistik-mit-textur').then(mit => {
        anders(ohne, mit, 'die Textur ändert das Bild der Statistik-Färbung');
        cy.rerender(() => cy.pickOption('textur2', 1));                 // gestapelt: die zweite Textur obendrauf
        cy.expectHash('t2', '1');
        cy.shotStats('statistik-zwei-texturen').then(zwei => anders(mit, zwei, 'die zweite Textur ändert das Bild'));
        cy.rerender(() => cy.pickOption('textur2', 0));
        cy.rerender(() => cy.pickOption('textur', 0));
        cy.expectHash('tx', null);
        cy.shotStats('statistik-wieder-ohne').then(zurueck => gleich(ohne, zurueck, 'ohne Textur wieder das alte Bild'));
      });
    });
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&map=31&pa=4:30:2:0&pb=2:30:0:0&tx=1&ts=0.8');   // die Kombination mit Textur aus dem Link
    cy.get('#texturRow').should('not.have.attr', 'hidden');
    cy.get('#textur').should('have.value', '1');
    cy.shotStats('paar-mit-textur').then(mit => {
      cy.rerender(() => cy.pickOption('textur', 0));
      cy.shotStats('paar-ohne-textur').then(ohne => anders(ohne, mit, 'die Textur ändert auch das Paar'));
    });
  });
  it('Farben der Textur: Vorgabe Weiß und Schwarz wie bisher, andere Farben tönen, im Link nur abseits der Vorgabe', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&tx=1&ts=0.8');
    cy.get('#texFarbenRow').should('not.have.attr', 'hidden');
    cy.get('#texHell').should('have.value', '#ffffff');
    cy.get('#texDunkel').should('have.value', '#000000');
    cy.expectHash('tc', null);
    cy.shotStats('texfarben-vorgabe').then(vorgabe => {
      cy.revealInDetails('texHell');                                       // die Farbwähler stehen tief im Bedienfeld
      cy.get('#texHell').scrollIntoView().invoke('val', '#8060ff').trigger('input', { force: true });   // helle Seite lila: die Textur tönt statt aufzuhellen
      cy.expectHash('tc', '8060ff');
      cy.expectHash('td', null);
      cy.wait(500);
      cy.shotStats('texfarben-lila').then(lila => {
        anders(vorgabe, lila, 'eine bunte helle Farbe ändert das Bild');
        cy.get('#texDunkel').scrollIntoView().invoke('val', '#c02020').trigger('input', { force: true });
        cy.expectHash('td', 'c02020');                                     // dunkle Seite kräftig rot: deutlich sichtbar
        cy.wait(500);
        cy.shotStats('texfarben-dunkel').then(dunkel => anders(lila, dunkel, 'die dunkle Farbe ändert das Bild'));
        cy.get('#texHell').scrollIntoView().invoke('val', '#ffffff').trigger('input', { force: true });
        cy.get('#texDunkel').scrollIntoView().invoke('val', '#000000').trigger('input', { force: true });
        cy.expectHash('tc', null);
        cy.wait(500);
        cy.shotStats('texfarben-zurueck').then(zurueck => gleich(vorgabe, zurueck, 'Weiß und Schwarz: wieder das alte Bild'));
      });
    });
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&tx=1&t2=3&tc=8060ff&t2c=ffe080&t2d=102030');   // Farben beider Texturen aus dem Link
    cy.get('#texHell').should('have.value', '#8060ff');
    cy.get('#tex2Hell').should('have.value', '#ffe080');
    cy.get('#tex2Dunkel').should('have.value', '#102030');
    cy.get('#tex2FarbenRow').should('not.have.attr', 'hidden');
  });
  it('Texturstapel: bis zu vier Texturen, Pfeile und Ziehen ändern die Reihenfolge, × nimmt eine heraus, der Link trägt alle Plätze', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&tx=1&ts=0.8&t2=3&t3=5&t3c=ff8040');
    cy.get('#textur3Row').should('not.have.attr', 'hidden');              // Platz 3 aus dem Link, Platz 4 als freier Platz dahinter
    cy.get('#textur4Row').should('not.have.attr', 'hidden');
    cy.get('#tex4StaerkeRow').should('have.attr', 'hidden');
    cy.get('#textur3').should('have.value', '5');
    cy.get('#tex3Hell').should('have.value', '#ff8040');
    cy.shotStats('stapel3-vorher').then(drei => {
      cy.rerender(() => cy.pickOption('textur4', 6));                    // vierter Platz: Strahlen
      cy.expectHash('t4', '6');
      cy.shotStats('stapel4').then(vier => anders(drei, vier, 'die vierte Textur ändert das Bild'));
      cy.rerender(() => cy.pickOption('textur4', 0));
      cy.expectHash('t4', null);
      cy.shotStats('stapel3-wieder').then(z => gleich(drei, z, 'ohne die vierte wieder das Bild mit dreien'));
    });
    cy.revealInDetails('texturRow');
    cy.get('#texturRow .tex-griff').focus().trigger('keydown', { key: 'ArrowDown', force: true });   // Tastatur: Platz 1 nach unten, die Streifen wandern samt Stärke auf Platz 2
    cy.expectHash('tx', '3'); cy.expectHash('t2', '1'); cy.expectHash('t2s', '0.8'); cy.expectHash('t3', '5');
    cy.get('#textur2Row .tex-weg').click({ force: true });                  // Platz 2 heraus – erst die Rückfrage (20.09.2026)
    cy.get('#rueckfrage').should('be.visible'); cy.get('#rueckfrageText').invoke('text').should('contain', 'Textur 2 (');
    cy.get('#rueckfrageJa').should('have.text', 'Textur löschen');   // der Knopf passt zum Anlass
    cy.get('#rueckfrageNein').click(); cy.get('#rueckfrage').should('not.be.visible');   // abgelehnt: der Stapel bleibt, wie er war
    cy.expectHash('t2', '1'); cy.expectHash('t3', '5');
    cy.get('#textur2Row .tex-weg').click({ force: true }); cy.get('#rueckfrage').should('be.visible');
    cy.get('body').type('{esc}'); cy.get('#rueckfrage').should('not.be.visible'); cy.expectHash('t2', '1');   // Escape lehnt ebenso ab
    cy.get('#textur2Row .tex-weg').click({ force: true }); cy.get('#rueckfrageJa').click();   // bestätigt: Platz 3 rückt auf
    cy.get('#rueckfrage').should('not.be.visible');
    cy.expectHash('t2', '5'); cy.expectHash('t2c', 'ff8040'); cy.expectHash('t3', null);
    cy.get('#textur2Row .tex-griff').then($g => {                           // Ziehen am Griff: Platz 2 über die Mitte von Platz 1 — der Platzhalter rückt schon beim Ziehen
      const r1 = Cypress.$('#texKarte1')[0].getBoundingClientRect(), rg = $g[0].getBoundingClientRect();
      cy.wrap($g).trigger('pointerdown', { clientX: rg.left + 5, clientY: rg.top + 5, pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, force: true })
        .trigger('pointermove', { clientX: rg.left + 5, clientY: r1.top + 2, pointerId: 7, pointerType: 'mouse', force: true });
      cy.get('.tex-flieger').should('exist');                                // das Abbild am Zeiger
      cy.get('#texKarte2').should('have.class', 'tex-platz');               // der gezogene Eintrag bleibt als Lücke stehen
      cy.get('#texKarte1').should('have.attr', 'style').and('contain', 'translateY(');   // der obere rückt schon beim Ziehen nach unten
      cy.wrap($g).trigger('pointerup', { clientX: rg.left + 5, clientY: r1.top + 2, pointerId: 7, pointerType: 'mouse', force: true });
    });
    cy.get('.tex-flieger').should('not.exist');
    cy.get('#texKarte1').should($k => expect($k[0].style.transform, 'keine Verschiebung mehr').to.eq(''));   // der Zustand ist umsortiert
    cy.expectHash('tx', '5'); cy.expectHash('tc', 'ff8040'); cy.expectHash('t2', '3');
    cy.get('#texturRow .tex-kopf .menu-btn').should('contain.text', 'Ursprungsnähe');   // die Art steht als Auswahl im Kopf
    cy.get('#texturRow .tex-kopf > label').should('have.attr', 'hidden');   // belegt: kein Platzname im Kopf, nur die Art
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&map=31&pa=4:30:2:0&pb=2:30:0:0&tx=1&t2=3&t3=5&t4=2&ts=0.8');   // vier Texturen über einer Statistik-Färbung (Kanäle z und w)
    cy.get('#textur4').should('have.value', '2');
    cy.waitRender();
    cy.get('#state').should('contain.text', 'Fertig');
  });
  it('Texturkarten: Schalter je Textur (aus = wie keine, Einstellungen bleiben, im Link ta=0), Ein- und Ausklappen mit Kurzangabe', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&tx=1&ts=0.8');
    cy.get('#texKarte1').should('not.have.attr', 'hidden');
    cy.get('#texAn').should('be.checked');
    cy.shotStats('karte-an').then(an => {
      cy.rerender(() => cy.get('#texAn').uncheck({ force: true }));        // aus: der Platz wirkt nicht mehr
      cy.expectHash('ta', '0'); cy.expectHash('tx', '1'); cy.expectHash('ts', '0.8');   // die Einstellungen bleiben im Link
      cy.get('#texKarte1').should('have.class', 'aus');
      cy.shotStats('karte-aus').then(aus => {
        anders(an, aus, 'ausgeschaltet färbt anders');
        cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400');
        cy.shotStats('karte-ohne').then(ohne => gleich(aus, ohne, 'ausgeschaltet ist wie keine Textur'));
      });
    });
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&tx=1&ts=0.8&ta=0&t2=1&t2s=0.8');   // aus dem Link: Platz 1 aus, Platz 2 an
    cy.get('#texAn').should('not.be.checked'); cy.get('#tex2An').should('be.checked');
    cy.get('#texKarte1').should('have.class', 'aus'); cy.get('#texKarte2').should('not.have.class', 'aus');
    cy.shotStats('platz1-aus-platz2-an').then(zwei => {   // Platz 2 wirkt allein, genau wie dieselbe Textur auf Platz 1 (Platz 1 aus darf den Stapel nicht abschalten)
      cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&tx=1&ts=0.8');
      cy.shotStats('nur-platz1').then(nur => gleich(zwei, nur, 'Platz 2 allein färbt wie dieselbe Textur auf Platz 1'));
      cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400');
      cy.shotStats('ohne-textur-2').then(ohne => anders(zwei, ohne, 'Platz 2 wirkt, obwohl Platz 1 aus ist'));
      cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&tx=1&ts=0.8&ta=0&t2=1&t2s=0.8');
    });
    cy.rerender(() => cy.get('#texAn').check({ force: true }));
    cy.expectHash('ta', null);
    cy.get('#texturRow .tex-klapp').click({ force: true });                 // einklappen: nur die Kopfzeile mit Kurzangabe
    cy.get('#texStaerkeRow').should('have.attr', 'hidden');
    cy.get('#texturRow .tex-kopf .menu-btn').should('contain.text', 'Streifenmittel');   // eingeklappt bleibt die Art im Kopf stehen
    cy.get('#texturRow .tex-kurz').invoke('text').should('match', /^0[.,]80$/);         // daneben nur noch die Stärke
    cy.get('#texturRow .tex-klapp').click({ force: true });                 // ausklappen
    cy.get('#texStaerkeRow').should('not.have.attr', 'hidden');
    cy.get('#texturRow .tex-kurz').should('have.attr', 'hidden');           // ausgeklappt: die Stärke steht in ihrer Zeile, der Kopf trägt nur die Art
  });
  it('Texturarten 9 bis 19: Bänder, Randnähe, Kanten, Glätten, Krümmung, Gitter-, Ring- und Punktfalle, Weglänge, Schwerpunkt, Vorzeichenwechsel färben, auch gestapelt und mit WebGL 2; eigene Regler je Art im Link (tq)', () => {
    const B = 'mode=mandel&re=-0.9&im=0.6&z=1&it=400';
    const deutlich = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(1.5));   // leiser als „anders“: manche Arten zeichnen fein
    cy.visitApp(B);
    cy.get('#textur option').should('have.length', 24);   // Keine und 23 Arten (mit der Karte, dem eigenen Ausdruck und der Rosettenfalle)
    cy.get('#textur4 option').should('have.length', 24);
    cy.shotStats('arten-ohne').then(ohne => {
      for (const art of [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]) {
        cy.visitApp(B + '&tx=' + art + '&ts=0.8');
        cy.get('#textur').should('have.value', String(art));
        cy.expectHash('tx', String(art));
        cy.get('#texturRow .tex-kopf .menu-btn').invoke('text').should('not.be.empty');
        cy.shotStats('art-' + art).then(mit => deutlich(ohne, mit, 'Art ' + art + ' färbt'));
      }
      cy.visitApp(B + '&tx=15&ts=0.8&tq=0.5');   // Ringfalle mit eigenem Regler: der Radius kommt aus dem Link, steht im Feld und im Regler
      cy.get('#texWerteRow').should('not.have.attr', 'hidden');
      cy.get('#texW1_0').should('have.value', '0.5'); cy.get('#texW1_0Val').should('have.value', '0,50');
      cy.get('label[for="texW1_0"]').should('have.text', 'Radius');
      cy.expectHash('tq', '0.5');
      cy.shotStats('ring-05').then(r05 => {
        cy.revealInDetails('texW1_0Val');
        cy.rerender(() => cy.get('#texW1_0Val').scrollIntoView().clear().type('1{enter}'));   // getippt: Vorgabe 1, der Schlüssel verschwindet, das Bild ändert sich
        cy.expectHash('tq', null);
        cy.get('#texW1_0').should('have.value', '1');
        cy.shotStats('ring-1').then(r1 => deutlich(r05, r1, 'der Radius der Ringfalle verändert das Bild'));
      });
      cy.visitApp(B + '&tx=15&ts=0.8&tq=0.5:0.25');   // konzentrische Ringe: der Ringabstand steht als zweiter Wert im Link, auf 0 entfällt er
      cy.get('#texW1_1').should('have.value', '0.25');
      cy.get('label[for="texW1_1"]').should('have.text', 'Ringabstand');
      cy.expectHash('tq', '0.5:0.25');
      cy.shotStats('ringe-025').then(ringe => {
        cy.revealInDetails('texW1_1Val');
        cy.rerender(() => cy.get('#texW1_1Val').scrollIntoView().clear().type('0{enter}'));
        cy.expectHash('tq', '0.5');
        cy.shotStats('ringe-0').then(einer => deutlich(einer, ringe, 'konzentrische Ringe sehen anders aus als der eine Ring'));
      });
      cy.visitApp(B + '&tx=1&ts=0.8&t2=19&t2q=0.3:-0.2');   // Punktfalle auf Platz 2 mit zwei Reglern; Platz 1 (Streifenmittel) hat keine
      cy.get('#texWerteRow').should('have.attr', 'hidden'); cy.get('#tex2WerteRow').should('not.have.attr', 'hidden');
      cy.get('#texW2_0').should('have.value', '0.3'); cy.get('#texW2_1').should('have.value', '-0.2');
      cy.expectHash('t2q', '0.3:-0.2');
      cy.get('#tex2Werte input[type=range]').should('have.length', 2);
      cy.pickOption('textur', '19');   // andere Art auf Platz 1: ihre Regler mit Vorgaben, nichts im Link
      cy.get('#texWerteRow').should('not.have.attr', 'hidden'); cy.get('#texW1_0').should('have.value', '0');
      cy.expectHash('tq', null);
      cy.waitRender();
      cy.visitApp(B + '&map=19&tx=12&t2=13&t3=14&t4=11');   // vier neue Arten gestapelt über einer Statistik-Färbung (Kanäle z und w)
      cy.get('#textur4').should('have.value', '11');
      cy.shotStats('arten-stapel').then(mit => deutlich(ohne, mit, 'der Stapel aus neuen Arten färbt'));
    });
  });
  it('Kurve: Übertragungskurve über den Häufigkeiten — Gerade als Vorgabe, gezogener Punkt ändert das Bild, Punkte im Link', () => {
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400');
    cy.get('#kurveRow').should('have.attr', 'hidden');
    cy.rerender(() => cy.pickOption('mapping', 28));
    cy.expectHash('map', '28');
    cy.get('#kurveRow').should('not.have.attr', 'hidden');
    cy.expectHash('kv', null);                                            // Gerade: nichts im Link
    cy.wait(600);                                                          // der Durchlauf über die Häufigkeiten
    cy.shotStats('kurve-gerade').then(gerade => {
      cy.get('#kurveBild').then($c => {                                    // Punkt in der Mitte setzen und nach oben ziehen
        const r = $c[0].getBoundingClientRect();
        const x = r.left + r.width / 2, y0 = r.top + r.height / 2, y1 = r.top + r.height * 0.15;
        cy.wrap($c).trigger('pointerdown', { clientX: x, clientY: y0, pointerId: 1, button: 0, isPrimary: true, force: true })
          .trigger('pointermove', { clientX: x, clientY: y1, pointerId: 1, force: true })
          .trigger('pointerup', { clientX: x, clientY: y1, pointerId: 1, force: true });
      });
      cy.expectHash('kv', v => { const p = v.split(','); expect(p.length, 'drei Punkte').to.eq(3); expect(parseFloat(p[1].split(':')[1]), 'Mittelpunkt oben').to.be.greaterThan(0.7); });
      cy.wait(400);
      cy.shotStats('kurve-gezogen').then(gezogen => {
        anders(gerade, gezogen, 'die gezogene Kurve ändert das Bild');
        cy.get('#kurveGerade').click();
        cy.expectHash('kv', null);
        cy.wait(400);
        cy.shotStats('kurve-wieder-gerade').then(zurueck => gleich(gerade, zurueck, 'Gerade: wieder wie vorher'));
      });
    });
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400&map=28&kv=0:0,0.5:0.9,1:1');   // Punkte kommen aus dem Link zurück
    cy.get('#mapping').should('have.value', '28');
    cy.expectHash('kv', '0:0,0.5:0.9,1:1');
    cy.waitRender(); cy.wait(600);
    cy.revealInDetails('kurveAusgleich');
    cy.get('#kurveAusgleich').click();                                   // aus den Häufigkeiten: Punkte an den Achteln der Verteilung, steigend in x und y
    cy.expectHash('kv', v => {
      const p = v.split(',').map(z => z.split(':').map(Number));
      expect(p.length, 'mehr als die Gerade').to.be.greaterThan(3);
      for (let i = 1; i < p.length; i++) { expect(p[i][0], 'x steigt').to.be.greaterThan(p[i - 1][0]); expect(p[i][1], 'y steigt').to.be.greaterThan(p[i - 1][1]); }
    });
    cy.get('#kurveGerade').click();                                      // Achse auf die Ansicht spannen: die Gerade färbt dann anders, ohne Häkchen wieder wie vorher
    cy.expectHash('kv', null);
    cy.wait(400);
    cy.shotStats('kurve-ungespannt').then(a => {
      cy.get('#kurveSpann').check();
      cy.expectHash('ks', '1');
      cy.wait(400);
      cy.shotStats('kurve-gespannt').then(b => {
        anders(a, b, 'die gespannte Achse färbt anders');
        cy.get('#kurveSpann').uncheck();
        cy.expectHash('ks', null);
        cy.wait(400);
        cy.shotStats('kurve-ungespannt-2').then(c => gleich(a, c, 'ohne Häkchen wieder wie vorher'));
      });
    });
    cy.rerender(() => cy.pickOption('mapping', 2));                      // andere Färbung: Editor weg, Kurve nicht im Link
    cy.get('#kurveRow').should('have.attr', 'hidden');
    cy.expectHash('kv', null);
  });
  it('Gestapelte Texturen: eine zweite Textur über der ersten, eigene Regler, Link, ohne zweite wieder wie mit einer', () => {
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400&tx=1&ts=0.8');
    cy.get('#textur2Row').should('not.have.attr', 'hidden');                // die zweite Textur steht unter der ersten
    cy.get('#textur2').should('have.value', '0');
    cy.get('#tex2StaerkeRow').should('have.attr', 'hidden');
    cy.expectHash('t2', null);
    cy.waitRender();
    cy.shotStats('stapel-eine').then(eine => {
      cy.rerender(() => cy.pickOption('textur2', 6));                     // Strahlen über dem Streifenmittel
      cy.expectHash('t2', '6');
      cy.get('#tex2StaerkeRow').should('not.have.attr', 'hidden');
      cy.get('#streifenRow').should('not.have.attr', 'hidden');
      cy.shotStats('stapel-zwei').then(zwei => {
        anders(eine, zwei, 'die zweite Textur ändert das Bild');
        cy.get('#tex2StaerkeVal').clear().type('0,3{enter}');              // eigene Stärke, reine Farbstufe
        cy.get('#tex2Staerke').should('have.value', '0.3');
        cy.expectHash('t2s', '0.3');
        cy.wait(400);
        cy.shotStats('stapel-schwach').then(schwach => anders(zwei, schwach, 'weniger Stärke der zweiten Textur, anderes Bild'));
        cy.rerender(() => cy.pickOption('textur2', 0));                   // ohne zweite: wieder wie mit einer
        cy.expectHash('t2', null);
        cy.get('#tex2StaerkeRow').should('have.attr', 'hidden');
        cy.shotStats('stapel-wieder-eine').then(zurueck => gleich(eine, zurueck, 'ohne zweite Textur wieder das Bild mit einer'));
      });
    });
    cy.rerender(() => cy.pickOption('textur', 0));                        // ohne erste gibt es auch keine zweite
    cy.get('#textur2Row').should('have.attr', 'hidden');
  });
  it('Werte kombinieren: jedes Ziel einzeln — Achsen, Helligkeit, Sättigung; im Link nur, wenn es vom Platz abweicht', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&ca=off&p2=n&map=31');
    cy.pane('farbe');
    cy.get('#paarZielA').should('have.value', '0');                       // Vorgabe: erster Wert auf die erste Achse
    cy.get('#paarZielB').should('have.value', '1');                       // zweiter auf die zweite
    cy.expectHash('pa', '1:1:0:0'); cy.expectHash('pb', '2:30:0:0');      // das Ziel fehlt im Link, solange es dem Platz entspricht
    cy.shotStats('ziel-achsen').then(achsen => {
      cy.rerender(() => cy.pickOption('paarZielB', 2));                   // zweiter Wert auf die Helligkeit
      cy.expectHash('pb', '2:30:0:0:2');
      cy.shotStats('ziel-hell').then(hell => {
        anders(achsen, hell, 'als Helligkeit sieht der Wert anders aus als auf der zweiten Achse');
        cy.rerender(() => cy.pickOption('paarZielB', 3));                 // und auf die Sättigung
        cy.expectHash('pb', '2:30:0:0:3');
        cy.shotStats('ziel-satt').then(satt => anders(hell, satt, 'Sättigung sieht anders aus als Helligkeit'));
        cy.rerender(() => cy.pickOption('paarZielB', 0));                 // beide auf dieselbe Achse: sie addieren sich
        cy.expectHash('pb', '2:30:0:0:0');
        cy.get('#state').should('contain.text', 'Fertig');
      });
    });
  });

  it('Texturplatz mit Ziel: sein Wert geht wahlweise auf die Farbe oder auf eine Achse der Palette', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&ca=off&map=31&tx=1&ts=0.4');
    cy.pane('farbe');
    cy.get('#texZielRow1').should('not.have.attr', 'hidden');
    cy.get('#texZiel1').should('have.value', '2');                      // Vorgabe: der Platz wirkt wie bisher auf die Farbe
    cy.expectHash('tz', null);                                          // und steht dann nicht im Link
    cy.shotStats('texziel-farbe').then(farbe => {
      cy.rerender(() => cy.pickOption('texZiel1', '0'));                // auf die erste Achse der Palette
      cy.expectHash('tz', '0');
      cy.get('#texFarbenRow').should('have.attr', 'hidden');            // helle und dunkle Farbe gelten dort nicht
      cy.shotStats('texziel-achse').then(achse => {
        anders(farbe, achse, 'auf der Achse ergibt der Wert ein anderes Bild als auf der Farbe');
        cy.rerender(() => cy.pickOption('mapping', 2));                 // eine Färbung ohne Achsen …
        cy.get('#texZiel1').should('have.value', '2');                  // … lässt den Platz auf die Farbe zurückfallen
        cy.expectHash('tz', null);
        cy.get('#texFarbenRow').should('not.have.attr', 'hidden');
      });
    });
  });

  it('Werte kombinieren (31): Achsen frei, Faktor, Abzug, Klemme, Textur obendrauf, alles im Link', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&ca=off');          // ohne Farbanker: kein Ankerlesen zwischen den Bildern
    cy.rerender(() => cy.pickOption('mapping', 31));
    cy.get('#paarRow').should('not.have.attr', 'hidden');
    cy.get('#paarA').should('have.value', '1'); cy.get('#paarB').should('have.value', '2');   // Vorgabe: Fluchtzeit und Streifenmittel ×30
    cy.get('#paarFaktorBVal').invoke('val').should('match', /^30[.,]00$/);
    cy.expectHash('map', '31'); cy.expectHash('pa', '1:1:0:0'); cy.expectHash('pb', '2:30:0:0');
    cy.shotStats('komb-vorgabe').then(vorgabe => {
      cy.rerender(() => cy.pickOption('paarA', 4));                       // erste Achse auf die Gesamtdrehung
      cy.rerender(() => cy.pickOption('paarAbzugA', 2));                  // mit Fluchtzeit-Abzug
      cy.expectHash('pa', '4:1:2:0');                                   // der Faktor bleibt beim Wechsel des Werts stehen
      cy.get('#abzugRow').should('not.have.attr', 'hidden');              // der β-Regler gehört zum Abzug
      cy.get('#streifenRow').should('not.have.attr', 'hidden');           // zweite Achse ist das Streifenmittel
      cy.shotStats('komb-drehung').then(drehung => {
        anders(vorgabe, drehung, 'andere erste Achse, anderes Bild');
        cy.rerender(() => cy.pickOption('paarB', 1));                     // zweite Achse auf die Fluchtzeit
        cy.expectHash('pb', '1:30:0:0');
        cy.get('#streifenRow').should('have.attr', 'hidden');             // ohne Streifenmittel keine Streifen
        cy.shotStats('komb-drehzeit').then(dz => {
          // Eigene Schwelle: die zweite Achse läuft mit Faktor 30 so schnell durch die Palette, dass der Wechsel zwar überall
          // sichtbar ist, über das ganze Bild gemittelt aber nur gut 5 ergibt — gemessen 4,9 bis 5,3, also zu dicht an der 5.
          cy.task('pngDiff', { a: drehung.file, b: dz.file, region: IMAGE_REGION }).then(dd => expect(dd.meanDiff, 'andere zweite Achse, anderes Bild').to.be.greaterThan(3));
          cy.get('#paarFaktorAVal').clear({ force: true }).type('300{enter}', { force: true });   // Faktor getippt
          cy.expectHash('pa', '4:300:2:0');
          cy.get('#paarKlemmeA').check({ force: true });                  // Klemme
          cy.expectHash('pa', '4:300:2:1');
          cy.wait(600);
          cy.shotStats('komb-faktor').then(fk => {
            anders(dz, fk, 'Faktor und Klemme ändern das Bild');
            cy.rerender(() => cy.pickOption('textur', 1));                // Textur obendrauf (dritter Kanal)
            cy.expectHash('tx', '1');
            cy.shotStats('komb-textur').then(tx => anders(fk, tx, 'die Textur ändert das Bild'));
            cy.rerender(() => cy.pickOption('textur', 0));
          });
        });
      });
    });
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&map=31&pa=5:5:1:1&pb=2:30:0:0&sn=1');   // alles aus dem Link
    cy.get('#paarA').should('have.value', '5'); cy.get('#paarKlemmeA').should('be.checked'); cy.get('#paarAbzugA').should('have.value', '1');
    cy.get('#paarB').should('have.value', '2'); cy.get('#abzug').should('have.value', '1');
    cy.waitRender();
    cy.get('#state').should('contain.text', 'Fertig');
  });
  it('Periodengebiete (29): der Schritt der größten Nähe zum Ursprung, innen wie außen, eigenes Bild aus Gebieten', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400');
    cy.shotStats('perioden-log').then(log => {
      cy.rerender(() => cy.pickOption('mapping', 29));
      cy.expectHash('map', '29');
      cy.get('#interior').parent().should('have.attr', 'hidden');         // färbt innen wie außen
      cy.get('#texturRow').should('not.have.attr', 'hidden');              // auch über einer Statistik-Färbung gibt es die Textur (dritter Kanal)
      cy.shotStats('perioden-29').then(p => anders(log, p, 'Periodengebiete sehen anders aus als logarithmisch'));
    });
  });
  it('Farbanker beim Bahnmittel: nur auf Wunsch, ohne Bildsprung beim Setzen und Lösen, nach anderen Streifen am selben Punkt neu geankert', () => {
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400&map=19&ca=off');
    cy.revealInDetails('colAnchor');
    cy.get('#colAnchor').parent().should('not.have.attr', 'hidden');   // neu: der Anker gilt auch fürs Bahnmittel …
    cy.get('#colAnchor').should('not.be.checked');                      // … aber nie von selbst: ohne Häkchen alles wie bisher
    cy.expectHash('sa', null);
    cy.waitRender();
    let sa1 = null, off1 = null;
    cy.shotStats('bahnanker-ohne').then(ohne => {
      cy.get('#stage canvas').click(704, 180, { altKey: true });       // Alt+Klick ins Feld: Anker an diesem Punkt
      cy.expectHash('sa', v => expect(parseFloat(v)).to.be.within(0, 1));
      cy.revealInDetails('colAnchor');
      cy.get('#colAnchor').should('be.checked');
      cy.location('hash').then(h => { const p = new URLSearchParams(h.slice(1)); sa1 = p.get('sa'); off1 = p.get('off'); });
      cy.wait(400);
      cy.shotStats('bahnanker-mit').then(mit => gleich(ohne, mit, 'das Setzen des Ankers ändert das Bild nicht'));
    });
    cy.revealInDetails('streifenVal');                                   // die Streifen stehen im Reiter „Farbe“, der Anker im Reiter „Palette“
    cy.get('#streifenVal').scrollIntoView().clear().type('9{enter}');   // andere Streifen: am selben Punkt neu geankert, der Versatz bleibt
    cy.waitRender();
    cy.expectHash('sp', '9');
    cy.expectHash('sa', v => { expect(parseFloat(v)).to.be.within(0, 1); expect(v, 'Anker neu gemessen').not.to.eq(sa1); });
    cy.expectHash('off', v => expect(v, 'Versatz unverändert').to.eq(off1));
    cy.wait(400);
    cy.shotStats('bahnanker-neun').then(neun => {
      cy.revealInDetails('colAnchor');
      cy.get('#colAnchor').uncheck();                                   // Lösen: das Bild bleibt in diesem Moment, der Versatz gleicht aus
      cy.expectHash('sa', null);
      cy.expectHash('off', v => expect(v, 'Versatz nachgeführt').not.to.eq(off1));
      cy.wait(400);
      cy.shotStats('bahnanker-geloest').then(los => gleich(neun, los, 'das Lösen des Ankers ändert das Bild nicht'));
    });
  });
  it('Bahnmittel mit Fluchtzeit: zwei Werte statt einem, das einwertige Verfahren bleibt daneben bestehen', () => {
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=600');
    cy.rerender(() => cy.pickOption('mapping', 19));                 // Streifenmittel wie bisher: ein Wert, kein Umschalter
    cy.get('#palArt').should('have.attr', 'hidden');
    cy.expectHash('map', '19');
    cy.shotStats('bahn-einwertig').then(ein => {
      cy.rerender(() => cy.pickOption('mapping', 31));               // dieselbe Statistik, aber kombiniert mit der Fluchtzeit
      cy.expectHash('map', '31');
      cy.get('#palArt').should('not.have.attr', 'hidden');
      cy.get('#palArt [data-art="2"]').should('have.class', 'on');   // Vorgabe ist hier die zweidimensionale Palette
      gruppen().should('deep.eq', ['Vorgaben']);
      cy.shotStats('bahn-zweiwertig').then(zwei => anders(ein, zwei, 'Paar mit der Fluchtzeit sieht anders aus als das Mittel allein'));
      cy.rerender(() => art(1));                                     // auf die gewöhnliche Palette und zurück
      cy.expectHash('p2', 'n');
      cy.rerender(() => cy.pickOption('mapping', 19));
      cy.get('#palArt').should('have.attr', 'hidden');
      cy.shotStats('bahn-einwertig-2').then(zurueck => gleich(ein, zurueck, 'das einwertige Verfahren ist unverändert'));
    });
  });
});

describe('Farbe: Editor-Ergänzungen, Dichte anpassen, Innenfarbe, Gestuft', () => {
  const anders = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(5));
  const gleich = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.lessThan(0.5));

  it('Farbschema-Editor: Position tippen, gleichmäßig verteilen, Übergänge in OKLab, Häufigkeiten unter der Vorschau', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&cp=' + encodeURIComponent('Probe~1~0.000:ff2020,0.400:2020ff'));   // zwei kräftige Farben: RGB und OKLab mischen sichtbar anders
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();
    cy.get('#peStops input.pos').should('have.length', 2);                 // je Stützstelle ein getipptes Feld (Prozent)
    cy.get('#peHist').should('be.visible');                                  // Häufigkeit je Palettenstelle unter der Vorschau
    cy.get('#palEd p.hint[data-i18n="editor.changes-apply-image-immediately"]').should('have.attr', 'hidden');   // mit Einwilligung erübrigt sich der Hinweis auf die Cookie-Einstellungen
    cy.get('#peMarken .pe-marke').should('have.length', 2);                 // je Stützstelle eine Marke unter der Vorschau
    cy.get('#peMarken').then($b => {                                         // die zweite Marke von 40 % auf 70 % ziehen
      const r = $b[0].getBoundingClientRect(), m = $b.find('.pe-marke').eq(1);
      cy.wrap(m).trigger('pointerdown', { clientX: r.left + 0.4 * r.width, clientY: r.top + 6, pointerId: 1, button: 0, isPrimary: true, force: true })
        .trigger('pointermove', { clientX: r.left + 0.7 * r.width, clientY: r.top + 6, pointerId: 1, force: true })
        .trigger('pointerup', { clientX: r.left + 0.7 * r.width, clientY: r.top + 6, pointerId: 1, force: true });
    });
    cy.get('#peStops .pe-stop').eq(1).find('input[type=range]').invoke('val').then(v => expect(+v, 'Regler folgt der Marke').to.be.within(690, 710));
    cy.expectHash('pv', v => expect(v, 'gezogene Stelle im Link').to.match(/0\.(69|70|71)\d:/));
    cy.get('#peMarken .pe-marke').eq(0).trigger('pointerdown', { pointerId: 2, button: 0, isPrimary: true, force: true }).trigger('pointerup', { pointerId: 2, force: true });   // Klick: Zeile gewählt
    cy.get('#peStops .pe-stop').eq(0).should('have.class', 'on');
    cy.get('#peStops .pe-stop').eq(1).find('input.pos').clear().type('30{enter}');
    cy.get('#peStops .pe-stop').eq(1).find('input[type=range]').should('have.value', '300');
    cy.expectHash('pv', v => expect(v, 'getippte Stelle im Link').to.contain('0.300:'));
    cy.get('#peSpread').click();                                             // zyklisch: zwei gleiche Abstände über den Umlauf, also 0 und 50 %
    cy.get('#peStops .pe-stop').eq(1).find('input[type=range]').should('have.value', '500');
    cy.get('#peStops .pe-stop').eq(1).find('input.pos').invoke('val').should('match', /^50[.,]0$/);
    cy.waitRender();
    cy.shotStats('editor-rgb').then(rgb => {
      cy.get('#peRaum').check();                                             // Übergänge in OKLab: im Link „~o“, anderes Bild
      cy.expectHash('pv', v => expect(v.endsWith('~o'), 'OKLab im Link').to.eq(true));
      cy.wait(400);
      cy.shotStats('editor-oklab').then(ok => anders(rgb, ok, 'OKLab mischt anders als RGB'));
      cy.get('#peRaum').uncheck();
      cy.expectHash('pv', v => expect(v.endsWith('~o'), 'wieder RGB').to.eq(false));
      cy.wait(400);
      cy.shotStats('editor-rgb-2').then(zurueck => gleich(rgb, zurueck, 'RGB wie vorher'));
    });
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&cp=' + encodeURIComponent('Probe~1~0.000:ff2020,0.500:2020ff~o'));   // aus dem Link zurück
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();
    cy.get('#peRaum').should('be.checked');
  });

  it('Farbdichte „Anpassen“, Innen „Eigene Farbe“ mit Farbwähler und „Gestuft“: Link und Bild', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&ca=off');
    cy.revealInDetails('densAuto');
    cy.get('#densAuto').click();                                             // die mittleren 80 % der Werte füllen einen Durchlauf
    cy.expectHash('den', v => expect(parseFloat(v), 'Dichte angepasst').not.to.eq(0.04));
    cy.get('#innenFarbe').should('have.attr', 'hidden');                    // Farbwähler nur bei „Eigene Farbe“
    cy.waitRender();
    cy.shotStats('innen-schwarz').then(schwarz => {
      cy.rerender(() => cy.pickOption('interior', 4));
      cy.expectHash('in', '4');
      cy.get('#innenFarbe').should('not.have.attr', 'hidden');
      cy.get('#innenFarbe').invoke('val', '#ff0000').trigger('input');
      cy.expectHash('ic', 'ff0000');
      cy.wait(400);
      cy.shotStats('innen-rot').then(rot => anders(schwarz, rot, 'die eigene Innenfarbe färbt das Innere'));
    });
    cy.rerender(() => cy.pickOption('interior', 0));
    cy.expectHash('ic', null);                                               // ohne „Eigene Farbe“ steht die Farbe nicht im Link
    cy.get('#gestuft').parent().should('not.have.attr', 'hidden');
    cy.shotStats('stetig').then(stetig => {
      cy.revealInDetails('gestuft');
      cy.get('#gestuft').check();                                            // ganze Iterationen: Bänder
      cy.expectHash('st', '1');
      cy.wait(400);
      cy.shotStats('gestuft').then(bander => anders(stetig, bander, 'gestuft zeigt Bänder'));
      cy.revealInDetails('gestuft');
      cy.get('#gestuft').uncheck();
      cy.expectHash('st', null);
    });
    cy.rerender(() => cy.pickOption('mapping', 19));                       // Bahnstatistik: weder Anpassen noch Gestuft
    cy.get('#densAuto').should('have.attr', 'hidden');
    cy.get('#gestuft').parent().should('have.attr', 'hidden');
  });

  it('Anordnung: Abhängigkeiten laufen nur nach unten (Anker vor Dichte, Wandern vor Versatz, Automatik vor Iterationen, Textur vor ihren Reglern)', () => {
    cy.visitApp();
    const vor = (a, b) => cy.window().then(w => { const A = w.document.getElementById(a), B = w.document.getElementById(b); expect(A.compareDocumentPosition(B) & 4, a + ' steht vor ' + b).to.eq(4); });
    vor('colAnchor', 'density'); vor('animate', 'offset'); vor('iterAuto', 'iterRange'); vor('mapping', 'streifen'); vor('mapping', 'gewicht'); vor('mapping', 'textur'); vor('interior', 'innenFarbe'); vor('mapping', 'gestuft');
  });
});

describe('Texturmasken: berechnete Auswahl je Platz', () => {
  const B = 'mode=mandel&re=-0.9&im=0.6&z=1&it=400&map=19&tx=1&ts=0.4';
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });

  it('Iterationsbereich begrenzt die Textur; Umkehren, Schalter, Zeigen, Regler mit Wertfeld, Link', () => {
    cy.visitApp(B);
    cy.shotStats('tm-ohne').then(ohne => {
      cy.visitApp(B + '&tu=m3,1,0,0.25,0,20');   // umgekehrt: die Textur nur, wo die Fluchtzeit über 20 liegt (bei Zoom 1 ein schmaler Saum)
      cy.pane('texturen');
      cy.get('#texM1_art').should('have.value', '3'); cy.get('#texM1_1').should('have.value', '20'); cy.get('#texM1_8').should('have.value', '0.25');
      cy.get('#texM1_inv').should('be.checked'); cy.get('#texM1_an').should('be.checked');
      cy.shotStats('tm-inv').then(inv => {
        diff(ohne, inv).then(d => expect(d.meanDiff, 'die Maske nimmt die Textur fast überall weg').to.be.greaterThan(3));
        cy.get('#texM1_an').uncheck({ force: true });   // Maske aus: wie ohne Maske, die Einstellungen bleiben
        cy.expectHash('tu', 'm3,3,0,0.25,0,20');
        cy.waitRender();
        cy.shotStats('tm-aus').then(aus => diff(ohne, aus).then(d => expect(d.meanDiff, 'Maske aus = ohne Maske').to.be.lessThan(0.5)));
        cy.get('#texM1_an').check({ force: true });
        cy.get('#texM1_inv').uncheck({ force: true });   // nicht umgekehrt: die Textur fast überall
        cy.expectHash('tu', 'm3,0,0,0.25,0,20');
        cy.waitRender();
        cy.shotStats('tm-iter').then(it => diff(inv, it).then(d => expect(d.meanDiff, 'umgekehrt: anders').to.be.greaterThan(3)));
        cy.get('#texM1_zeig').check({ force: true });   // die Maske als Grau
        cy.expectHash('tu', 'm3,0,1,0.25,0,20');
        cy.waitRender();
        cy.shotStats('tm-zeig').then(z => { expect(z.mean, 'weiß, wo die Fluchtzeit unter 20 liegt').to.be.greaterThan(120); diff(inv, z).then(d => expect(d.meanDiff, 'die Maske statt des Bildes').to.be.greaterThan(20)); });   // (der Rand der Menge liefert mit Glättung viele Graustufen, darum keine Farbzählung)
        cy.get('#texM1_1').invoke('val', 60).trigger('input');   // Schieber: das Wertfeld folgt, der Link auch
        cy.get('#texM1_1Val').should('have.value', '60');
        cy.expectHash('tu', 'm3,0,1,0.25,0,60');
        cy.pickOption('texM1_art', '0');   // keine Maske: das Feld verschwindet aus dem Link
        cy.location('hash').should(h => expect(decodeURIComponent(h)).to.not.contain('&tu='));
      });
    });
  });

});

describe('Paar-Wert Streifenphase (Sammler 18)', () => {
  const B = 'mode=mandel&re=-0.9&im=0.6&z=1&it=400';
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  it('steht in beiden Achsenlisten, geht in den Link und färbt anders als das Streifenmittel', () => {
    cy.visitApp(B + '&map=31&pa=4:30:2:0&pb=2:30:0:0');
    cy.pane('farbe');
    cy.get('#paarA option[value="9"]').should('exist'); cy.get('#paarB option[value="9"]').should('exist');
    cy.shotStats('phase-streifen').then(streifen => {
      cy.pickOption('paarB', '9');
      cy.expectHash('pb', v => expect(v).to.match(/^9:/));
      cy.waitRender();
      cy.shotStats('phase-phase').then(phase => diff(streifen, phase).then(d => expect(d.meanDiff, 'die Phase färbt anders als das Mittel').to.be.greaterThan(5)));
    });
    cy.visitApp(B + '&map=31&pa=9:12:0:0&pb=1:1:0:0');   // Phase als erste Achse, aus dem Link
    cy.pane('farbe');
    cy.get('#paarA').should('have.value', '9');
  });
});

describe('Spiralfalle, Texturen innen und Fallenverbund', () => {
  const J = 'mode=julia&jre=-0.390541&jim=0.586788&it=400&re=0&im=0&z=1.2';   // Siegel-Scheibe zum goldenen Schnitt: großes Inneres
  const B = 'mode=mandel&re=-0.75&im=0.1&z=1.3&it=100';
  const AUSSEN = { x0: 0.02, y0: 0.1, x1: 0.07, y1: 0.9 };   // linker Rand: sicher außerhalb der Menge
  const diff = (a, b, region = IMAGE_REGION) => cy.task('pngDiff', { a: a.file, b: b.file, region });

  it('Spiralfalle: Textur 20 mit Reglern im Link (tq), Färbung 32 innen wie außen mit Windung (sd)', () => {
    cy.visitApp(B + '&tx=20');
    cy.pane('farbe');
    cy.get('#textur').should('have.value', '20');
    cy.shotStats('spirale-tex').then(vorgabe => {
      cy.visitApp(B + '&tx=20&tq=0.5:0.3:0');
      cy.expectHash('tq', v => expect(v).to.eq('0.5:0.3:0'));
      cy.shotStats('spirale-tex2').then(anders => diff(vorgabe, anders).then(d => expect(d.meanDiff, 'Windung und Mitte wirken').to.be.greaterThan(0.5)));
    });
    cy.visitApp(J + '&map=32');
    cy.pane('farbe');
    cy.get('#mapping').should('have.value', '32');
    cy.get('#spiraleRow').should('not.have.attr', 'hidden');
    cy.get('#spirale').should('have.value', '0.2');
    cy.shotStats('spirale-map').then(vorher => {
      cy.get('#spiraleVal').clear().type('0.5{enter}');
      cy.get('#spirale').should('have.value', '0.5');
      cy.expectHash('sd', v => expect(v).to.eq('0.5'));
      cy.waitRender();
      cy.shotStats('spirale-map2').then(anders => diff(vorher, anders).then(d => expect(d.meanDiff, 'die Windung verändert das Bild').to.be.greaterThan(5)));
    });
  });

  it('Wo ein Platz wirkt: außen, nur innen oder überall — je Platz wählbar, im Link (tw), alter Schalter ti wird „überall“', () => {
    cy.visitApp(J + '&tx=19&ts=0.8');                                  // Punktfalle, wie immer nur außen
    cy.pane('farbe');
    cy.get('#texWo1').should('have.value', '0');
    cy.expectHash('tw', null);                                          // außen ist die Vorgabe und steht nicht im Link
    cy.shotStats('wo-aussen').then(aussen => {
      cy.rerender(() => cy.pickOption('texWo1', '1'));                  // nur innen
      cy.expectHash('tw', '1');
      cy.shotStats('wo-innen').then(innen => {
        diff(aussen, innen).then(d => expect(d.meanDiff, 'das Innere bekommt die Falle').to.be.greaterThan(5));
        diff(aussen, innen, AUSSEN).then(d => expect(d.meanDiff, 'außen ist die Textur verschwunden').to.be.greaterThan(1));
        cy.rerender(() => cy.pickOption('texWo1', '2'));                // überall
        cy.expectHash('tw', '2');
        cy.shotStats('wo-ueberall').then(ueberall => {
          diff(aussen, ueberall, AUSSEN).then(d => expect(d.meanDiff, 'außen wieder wie zu Beginn').to.be.lessThan(0.5));
          diff(innen, ueberall, AUSSEN).then(d => expect(d.meanDiff, 'außen anders als bei „nur innen“').to.be.greaterThan(1));
        });
      });
    });
    cy.visitApp(J + '&tx=19&ts=0.8&ti=1');                              // alter Link: ein Schalter für alle Plätze
    cy.pane('farbe');
    cy.get('#texWo1').should('have.value', '2');                        // wird zu „überall“
    cy.expectHash('tw', '2');
    cy.expectHash('ti', null);
  });

  it('Fallenverbund: Punkt- und Ringfalle mit weichem Minimum ergeben ein anderes Bild; Regler mit Wertfeld, Link (tv)', () => {
    cy.visitApp(B + '&tx=19&t2=15&t2s=0.6');
    cy.pane('texturen');
    cy.get('#texVerbund').should('have.value', '0');
    cy.shotStats('verbund-ohne').then(ohne => {
      cy.get('#texVerbundVal').clear().type('0.5{enter}');
      cy.get('#texVerbund').should('have.value', '0.5');
      cy.expectHash('tv', v => expect(v).to.eq('0.5'));
      cy.waitRender();
      cy.shotStats('verbund-mit').then(mit => diff(ohne, mit).then(d => expect(d.meanDiff, 'der Verbund verändert das Bild').to.be.greaterThan(5)));
    });
    cy.visitApp(B + '&tx=19&tv=0.5');   // eine Falle allein: der Verbund ist ihr eigenes Minimum, der Regler kommt aus dem Link
    cy.pane('texturen');
    cy.get('#texVerbund').should('have.value', '0.5');
    cy.get('#texVerbundVal').should('have.value', '0.5');
  });
});

describe('Äußerer Winkel und Karte', () => {
  const B = 'mode=mandel&re=-0.75&im=0.1&z=1.3&it=500';
  it('Färbung 34: äußerer Winkel statt Fluchtwinkel, im Link, nur bei z^d + c wählbar', () => {
    cy.visitApp(B + '&map=15');
    cy.shotStats('winkel-flucht').then(flucht => {
      cy.visitApp(B + '&map=34');
      cy.get('#mapping').should('have.value', '34');
      cy.expectHash('map', '34');
      cy.shotStats('winkel-aussen').then(aussen => {
        cy.task('pngDiff', { a: flucht.file, b: aussen.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'der äußere Winkel färbt anders als der Fluchtwinkel').to.be.greaterThan(3));
      });
    });
    cy.visitApp(B);
    cy.get('#mapping option[value="34"]').should('have.prop', 'hidden', false);
    cy.rerender(() => cy.pickOption('formula', 1));
    cy.get('#mapping option[value="34"]').should('have.prop', 'hidden', true);
  });

  it('Textur 21 Karte: Ringe und Strahlen mit Reglern im Link (tq), ohne Strahlen fehlen Linien', () => {
    cy.visitApp(B);
    cy.shotStats('karte-ohne').then(ohne => {
      cy.visitApp(B + '&tx=21&ts=1');
      cy.get('#textur').should('have.value', '21');
      cy.get('label[for="texW1_1"]').should('have.text', 'Strahlen');
      cy.expectHash('tq', null);
      cy.shotStats('karte-mit').then(mit => {
        cy.task('pngDiff', { a: ohne.file, b: mit.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'die Karte zeichnet Linien').to.be.greaterThan(1));
        cy.visitApp(B + '&tx=21&ts=1&tq=1:32:3');   // viele breite Strahlen: der Unterschied ist sicher messbar (acht Strahlen zu 1 Pixel ändern kaum den Mittelwert)
        cy.expectHash('tq', '1:32:3');
        cy.shotStats('karte-strahlen').then(strahlen => {
          cy.visitApp(B + '&tx=21&ts=1&tq=1:0:3');
          cy.expectHash('tq', '1:0:3');
          cy.shotStats('karte-ringe').then(ringe => cy.task('pngDiff', { a: strahlen.file, b: ringe.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'ohne Strahlen fehlen Linien').to.be.greaterThan(0.3)));
        });
      });
    });
  });
});

describe('Logarithmisch ab Iteration (logmap)', () => {
  const B = 'mode=mandel&re=-0.75&im=0.1&z=1.3&it=1000&map=33';
  it('Startiteration nur bei logmap, Link lm, ein späterer Start färbt anders, der Farbanker verschiebt nichts', () => {
    cy.visitApp(B);
    cy.pane('farbe');
    cy.get('#logmapRow').should('not.have.attr', 'hidden');
    cy.expectHash('lm', null);
    cy.shotStats('logmap-0').then(start0 => {
      cy.get('#logmapVal').clear().type('20{enter}');
      cy.expectHash('lm', '20');
      cy.waitRender();
      cy.shotStats('logmap-20').then(start20 => cy.task('pngDiff', { a: start0.file, b: start20.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'späterer Start färbt anders').to.be.greaterThan(3)));
    });
    cy.visitApp(B + '&lm=20&ca=off');
    cy.shotStats('logmap-ohne-anker').then(ohne => {
      cy.visitApp(B + '&lm=20&ca=30');
      cy.shotStats('logmap-mit-anker').then(mit => cy.task('pngDiff', { a: ohne.file, b: mit.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'feste Paletteneinträge, der Anker wirkt nicht').to.be.lessThan(0.5)));
    });
    cy.visitApp(B.replace('map=33', 'map=2'));
    cy.pane('farbe');
    cy.get('#logmapRow').should('have.attr', 'hidden');
  });
});

describe('Abklingen der Bahnmittel', () => {
  const B = 'mode=mandel&re=-0.75&im=0.1&z=1.3&it=2000&map=19';
  it('Regler nur bei den Mitteln, Link se, das gleitende Mittel färbt anders, ohne Abklingen wie bisher', () => {
    cy.visitApp(B);
    cy.pane('farbe');
    cy.get('#abklingRow').should('not.have.attr', 'hidden');
    cy.get('#abklingen').should('have.value', '0');
    cy.expectHash('se', null);
    cy.shotStats('abkl-0').then(gleich => {
      cy.get('#abklingenVal').clear().type('0,1{enter}');
      cy.expectHash('se', '0.1');
      cy.waitRender();
      cy.shotStats('abkl-01').then(abk => cy.task('pngDiff', { a: gleich.file, b: abk.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'gleitendes Mittel färbt anders').to.be.greaterThan(3)));
    });
    cy.visitApp('mode=mandel&re=-0.75&im=0.1&z=1.3&it=200&map=2');
    cy.pane('farbe');
    cy.get('#abklingRow').should('have.attr', 'hidden');
  });

  it('Texturplatz 2 bleibt im Link, wenn Platz 1 auf „Keine“ geht (der Shader rechnet ihn weiter)', () => {
    cy.visitApp('mode=mandel&re=-0.9&im=0.6&z=1&it=400&tx=1&t2=3'); cy.waitRender();
    cy.expectHash('t2', '3');
    cy.rerender(() => cy.pickOption('textur', 0));
    cy.expectHash('tx', null); cy.expectHash('t2', '3');
  });
});
