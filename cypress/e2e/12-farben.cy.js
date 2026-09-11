import { IMAGE_REGION, CONSENT_NONE } from '../support/commands';

describe('Farbe und Farbschema-Editor', () => {
  beforeEach(() => cy.visitApp());

  it('19 Paletten in den Gruppen Hell und Dunkel, jede Nummer genau einmal', () => {
    cy.get('#palette optgroup').then($g => expect([...$g].map(g => g.label)).to.deep.eq(['Hell', 'Dunkel']));
    cy.get('#palette option').then($o => {
      const werte = [...$o].map(o => +o.value).sort((a, b) => a - b);
      expect(werte, 'Nummern 0 bis 18, keine doppelt').to.deep.eq([...Array(19).keys()]);
    });
    cy.get('#palette option[value="0"]').should('have.text', 'Klassisch');   // Nummer 0 und Standard
    cy.get('#palette').should('have.value', '0');
    cy.rerender(() => cy.pickOption('palette', 18));
    cy.expectHash('pal', 'silver');
  });

  it('Paletten aus Stützstellen laufen über die Farbtabelle', () => {
    cy.shotStats('farbe-vorgabe-klassisch').then(a => {
      cy.rerender(() => cy.pickOption('palette', 6));   // Holzschnitt: Papier und Schwarz
      cy.shotStats('farbe-vorgabe-holzschnitt').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'Farbtabelle statt Kosinus').to.be.greaterThan(5));
      });
    });
    cy.expectHash('pal', 'woodcut');
  });

  it('Quilez-Palette: zwölf Regler, Formel im Link, aus Klassisch dasselbe Bild', () => {
    cy.shotStats('quilez-vorher').then(a => {
      cy.revealInDetails('palEdit');
      cy.get('#palEdit').click();
      cy.get('#peArt [data-art="quilez"]').click();
      cy.get('#peQuilez input').should('have.length', 12);
      cy.get('#peStops').should('not.be.visible');
      cy.waitRender();
      cy.shotStats('quilez-klassisch').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'Formel von Klassisch, pixelgleich').to.be.lessThan(0.5));
      });
    });
    cy.expectHash('cp', v => expect(v).to.contain('~q~0.5,0.5,0.5,0.5,0.5,0.5,1,1,1,0.5,0.6,0.7'));
    cy.get('#peQuilez input[data-k="d"][data-i="0"]').invoke('val', 0.2).trigger('input');
    cy.expectHash('cp', v => expect(v).to.contain(',0.2,0.6,0.7'));
    cy.get('#peArt [data-art="stops"]').click();   // als Stützstellen weiterführen, zurück kommt die Formel unverändert
    cy.get('#peStops .pe-stop').should('have.length', 8);
    cy.get('#peArt [data-art="quilez"]').click();
    cy.get('#peQuilez input[data-k="d"][data-i="0"]').should('have.value', '0.2');
  });

  it('Palette, Verlauf, Randlinien und Innen wirken auf Adresse und Bild', () => {
    cy.shotStats('farbe-klassisch').then(a => {
      cy.rerender(() => cy.pickOption('palette', 1));
      cy.expectHash('pal', 'mother-of-pearl');
      cy.shotStats('farbe-perlmutt').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'andere Palette, anderes Bild').to.be.greaterThan(5));
      });
    });
    cy.rerender(() => cy.pickOption('mapping', 3));
    cy.expectHash('map', '3');
    cy.rerender(() => cy.pickOption('glowMode', 1));
    cy.expectHash('glow', '1');
    cy.setRange('glowWidth', 800);
    cy.expectHash('gw', v => expect(parseFloat(v)).to.be.greaterThan(1));
    cy.get('#glowVal').invoke('text').should('match', /\d/);
    cy.rerender(() => cy.pickOption('interior', 2));
    cy.expectHash('in', '2');
    cy.setRange('offset', 500);
    cy.get('#offset').should('have.value', '500');
    cy.waitRender();
  });

  it('Verläufe Relief, Doppelt logarithmisch und Logarithmisch + Relief: Adresse, Neurender, andere Bilder', () => {
    cy.get('#mapping option').should('have.length', 22);
    cy.rerender(() => cy.pickOption('mapping', 5));
    cy.expectHash('map', '5');
    cy.rerender(() => cy.pickOption('mapping', 7));
    cy.expectHash('map', '7');
    cy.rerender(() => cy.pickOption('mapping', 8));
    cy.expectHash('map', '8');
    cy.rerender(() => cy.pickOption('mapping', 9));
    cy.expectHash('map', '9');
    cy.rerender(() => cy.pickOption('mapping', 10));
    cy.expectHash('map', '10');
    cy.rerender(() => cy.pickOption('mapping', 6));
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
    cy.get('#lyGrenzeVal').should('have.text', '2');                 // Vorgabe
    cy.expectHash('lg', null);
    cy.shotStats('lyap-grenze-2').then(a => {
      cy.rerender(() => cy.setRange('lyGrenze', 1000));
      cy.get('#lyGrenzeVal').should('have.text', '1.000.000.000');
      cy.expectHash('lg', '1000000000');
      cy.shotStats('lyap-grenze-1e9').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'Muster rund um die Menge ändert sich').to.be.greaterThan(5));
      });
      cy.rerender(() => cy.setRange('lyGrenze', 0));                // 0 ist ein gültiger Wert, nicht „fehlt“
      cy.get('#lyGrenzeVal').should('have.text', '0');
      cy.expectHash('lg', '0');
      cy.shotStats('lyap-grenze-0').then(c => {
        cy.task('pngDiff', { a: a.file, b: c.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'nur noch der erste Schritt').to.be.greaterThan(5));
      });
    });
    cy.rerender(() => cy.pickOption('mapping', 2));                  // zurück: alles wie vorher
    cy.get('#glowMode').should('have.value', '1').parent().should('not.have.attr', 'hidden');
    cy.get('#palette').parent().should('not.have.attr', 'hidden');
    cy.rerender(() => cy.pickOption('formula', 11));                 // Newton/Nova färbt nach Wurzeln: Lyapunov und Winkel fehlen
    cy.get('#mapping optgroup[data-ohne-newton]').should('have.length', 4).each($g => expect($g.prop('hidden')).to.eq(true));
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
        cy.setRange('density', 440);   // Dichte 0,04 → 0,23: moderater Schritt, der Regler reicht jetzt bis 100
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
    cy.get('#compVal').should('contain.text', 'Log');
    cy.expectHash('sc', '0.000');
    cy.shotStats('stauchung-log').then(a => {
      cy.setRange('comp', 0);
      cy.get('#compVal').should('contain.text', 'linear');
      cy.expectHash('sc', '1.000');
      cy.setRange('comp', 167);
      cy.get('#compVal').should('contain.text', 'Wurzel');
      cy.setRange('comp', 1000);
      cy.get('#compVal').should('contain.text', 'stärker');
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
    cy.get('#densVal').invoke('text').then(t => {
      const shown = parseFloat(t.replace(',', '.'));
      cy.expectHash('den', v => expect(parseFloat(v)).to.be.closeTo(shown, 0.01));
    });
  });

  it('Farbschema-Editor: neues Schema anlegen, speichern, wiederfinden, löschen', () => {
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').should('have.attr', 'aria-expanded', 'false').click();
    cy.get('#palEd').should('be.visible');
    cy.get('#palEdit').should('have.attr', 'aria-expanded', 'true');
    cy.get('#pane-farbe').should('not.have.attr', 'hidden');   // der Editor sitzt im Bedienfeld, nicht in einem Dialog über dem Bild
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
    cy.expectHash('cp', v => expect(v).to.contain('Testschema'));
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

  it('ohne Einwilligung für App-Einstellungen bleibt ein Schema nur im Link', () => {
    cy.visitApp('', { consent: CONSENT_NONE });
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();
    cy.get('#peName').clear().type('Fluechtig');
    cy.get('#peSaveNew').should('not.be.visible');   // ein neuer Entwurf wird mit „Speichern“ angelegt
    cy.get('#peSave').click();
    cy.expectHash('cp', v => expect(v).to.contain('Fluechtig'));
    cy.window().then(win => expect(win.localStorage.getItem('fractal.palettes')).to.be.null);
    cy.get('#peClose').click();
  });

  it('ein Schema im Link wird beim Laden angeboten und angewandt', () => {
    cy.visitApp('mode=mandel&re=-0.75&im=0&z=1&cp=' + encodeURIComponent('Linkschema~1~0:ff0000,0.5:00ff00,1:0000ff'));
    cy.get('#palette option:selected').invoke('text').should('contain', 'Linkschema');
    cy.expectHash('cp', v => expect(v).to.contain('Linkschema'));
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
    gruppen().should('deep.eq', ['Hell', 'Dunkel']);
    cy.visitApp('mode=mandel&map=14&p2=field-lines');
    cy.get('#palArt').should('not.have.attr', 'hidden');
    cy.get('#palArt [data-art="2"]').should('have.class', 'on');
    gruppen().should('deep.eq', ['Vorgaben']);
    cy.get('#palette').should('have.value', 'z:3');
    cy.rerender(() => art(1));
    gruppen().should('deep.eq', ['Hell', 'Dunkel']);
    cy.expectHash('p2', 'n');
    cy.rerender(() => art(2));
    cy.get('#palette').should('have.value', 'z:3');                  // die zuletzt gewählte zweidimensionale kommt zurück
    cy.rerender(() => cy.pickOption('mapping', 2));
    cy.get('#palArt').should('have.attr', 'hidden');
    gruppen().should('deep.eq', ['Hell', 'Dunkel']);
    cy.expectHash('p2', null);
  });

  it('Lyapunov nach Re und Im: die bisherigen Farben sind die Vorgabe, Paletten beider Arten kommen dazu, der Link merkt sich die Wahl', () => {
    cy.visitApp('mode=mandel&map=14&re=0&im=0&z=0.75&it=255');
    cy.get('#palette').should('have.value', 'z:0');
    cy.expectHash('p2', null);                                       // Vorgabe: nichts im Link
    cy.shotStats('zwei-reim').then(a => {
      cy.rerender(() => cy.pickOption('palette', 'z:4'));            // Kacheln
      cy.expectHash('p2', 'tiles');
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
      cy.expectHash('p2', 'ice-and-embers');
      cy.rowShown('offset', false);
      cy.shotStats('zwei-markus-eis').then(b => {
        anders(a, b, 'andere Farben');
        cy.rerender(() => cy.pickOption('palette', 'z:6'));          // Bänder: Formel mit Umlauf, der Farbversatz schiebt die Bänder
        cy.expectHash('p2', 'bands');
        cy.rowShown('offset', true);
        cy.shotStats('zwei-markus-baender').then(c => {
          anders(b, c, 'Bänder statt Eis und Glut');
          cy.rerender(() => cy.pickOption('palette', 'z:7'));        // Magenta und Mint: dieselben Bänder in anderen Tönen
          cy.expectHash('p2', 'magenta-and-mint');
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
        cy.expectHash('p2', 'binary-decomposition');
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
      cy.expectHash('p2', 'tiles');
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
      cy.expectHash('cp2', v => expect(v).to.contain('~v~kacheln'));
      cy.waitRender();
      cy.shotStats('ed2-kacheln').then(c => anders(a, c, 'Kacheln in Blattgold'));
    });
    cy.get('#p2eName').clear().type('Testmuster');
    cy.get('#p2eSave').click();
    cy.get('#p2eState').should('have.text', 'gespeichert');
    cy.get('#palette optgroup[label="Eigene"] option').should('contain.text', 'Testmuster');
    cy.window().then(win => expect(JSON.parse(win.localStorage.getItem('fractal.palettes2')), 'im Browser').to.have.length(1));
    cy.expectHash('cp2', v => expect(v).to.contain('Testmuster'));
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

  it('Editor „Quilez für zwei Werte“: Kopie von Pastell färbt gleich, Regler je Quadrant, Zurücksetzen', () => {
    cy.visitApp('mode=mandel&map=14&re=0&im=0&z=0.75&it=255');
    cy.shotStats('q2-vorher').then(a => {
      editor();
      cy.get('#p2eArt [data-art="formel"]').should('have.class', 'on');
      cy.get('#p2eRegler input').should('have.length', 15);
      cy.get('#p2eQuad [data-q="3"]').should('have.class', 'on');
      cy.waitRender();
      cy.shotStats('q2-kopie').then(b => gleich(a, b, 'die Kopie färbt wie das Original'));
      cy.get('#p2eQuad [data-q="0"]').click().should('have.class', 'on');
      cy.get('#p2eGleich').check({ force: true });                   // alle vier Quadranten wie der gewählte
      cy.get('#p2eRegler input[data-k="0"][data-i="0"]').invoke('val', 0).trigger('input', { force: true });   // a, Rot: kein Rot mehr
      cy.expectHash('cp2', v => expect(v).to.contain('~f~0,'));
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
    cy.rerender(() => cy.pickOption('formula', 11));                 // Newton/Nova färbt nach Wurzeln
    cy.get('#mapping optgroup[label="Bahnmittel"]').should('have.prop', 'hidden', true);
    cy.get('#mapping').should('have.value', '2');
  });
});
