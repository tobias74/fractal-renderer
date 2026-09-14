import { IMAGE_REGION } from '../support/commands';

// Nachbearbeitung: Einstellungsebenen auf der fertigen Farbe – Stapel, Regler aus der Tabelle, Link, Kurveneditor, Bild.
describe('Nachbearbeitung: Einstellungsebenen', () => {
  const B = 'mode=mandel&re=-0.9&im=0.6&z=1&it=400';
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  // Die Liste stellt sich nach der Wahl auf „wählen“ zurück, darum nicht cy.pickOption (das prüft den gewählten Wert)
  const ebene = art => { cy.get('#nachNeu + .menu-btn').scrollIntoView().click(); cy.get('#nachNeuMenu').should('be.visible').find('button[data-value="' + art + '"]').click(); cy.get('#nachNeu').should('have.value', '0'); cy.waitRender(); };

  it('der Bereich steht in Leiste und Reitern, eine Ebene kommt aus der Liste, der Link trägt sie', () => {
    cy.visitApp(B);
    cy.get('#rail button[data-pane="nach"]').should('exist').click();
    cy.get('#pane-nach').should('not.have.attr', 'hidden');
    cy.get('.panel-head .wordmark').should('have.text', 'Nachbearbeitung');
    cy.get('#nachStapel .nach-karte').should('have.length', 0);
    cy.get('#nachNeu option').should('have.length', 28);   // „Ebene wählen“ und 27 Arten
    cy.shotStats('nach-ohne').then(ohne => {
      ebene(11);   // Invertieren
      cy.get('#nachStapel .nach-karte').should('have.length', 1);
      cy.get('#nachKarte1 .tex-kurz').should('have.text', 'Invertieren');
      cy.get('#nachW1_deck').should('have.value', '1'); cy.get('#nachW1_0').should('have.value', '1');   // Deckkraft und Stärke
      cy.expectHash('pp', '11:1:1:1');
        cy.shotStats('nach-invers').then(inv => {
        diff(ohne, inv).then(d => expect(d.meanDiff, 'invertiert färbt anders').to.be.greaterThan(40));
        expect(inv.mean, 'Innen wird hell').to.be.greaterThan(ohne.mean);
        cy.get('#nachAn1').uncheck({ force: true });   // aus: wie ohne Ebene, die Einstellungen bleiben
        cy.get('#nachKarte1').should('have.class', 'aus');
        cy.expectHash('pp', '11:0:1:1');
        cy.waitRender();
        cy.shotStats('nach-aus').then(aus => diff(ohne, aus).then(d => expect(d.meanDiff, 'ausgeschaltet ist wie ohne').to.be.lessThan(0.5)));
        cy.get('#nachAn1').check({ force: true });
        cy.get('#nachW1_0Val').clear().type('0,5{enter}');   // getippte Stärke: halb invertiert
        cy.expectHash('pp', '11:1:1:0.5');
        cy.get('#nachW1_0').should('have.value', '0.5');
        cy.waitRender();
        cy.shotStats('nach-halb').then(halb => { diff(ohne, halb).then(d => expect(d.meanDiff, 'halb: anders als ohne').to.be.greaterThan(10)); diff(inv, halb).then(d => expect(d.meanDiff, 'halb: anders als ganz').to.be.greaterThan(10)); });
      });
    });
  });

  it('Regler aus der Tabelle: Auswahl, Schalter, Farbe; Deckkraft mischt; das Entfernen räumt die Karte weg', () => {
    cy.visitApp(B);
    cy.pane('nach');
    ebene(12);   // Graustufen: Verfahren (Auswahl) und Stärke
    cy.get('#nachW1_0').should('have.value', '0');   // Verfahren Leuchtdichte
    cy.pickOption('nachW1_0', '4');   // Grünkanal
    cy.expectHash('pp', '12:1:1:4,1');
    cy.get('#nachW1_deckVal').clear().type('0,25{enter}');
    cy.expectHash('pp', '12:1:0.25:4,1');
    ebene(18);   // Körnung: Schalter „farbig“
    cy.get('#nachKarte2 .tex-kurz').should('have.text', 'Körnung');
    cy.get('#nachW2_1').should('not.be.checked').check({ force: true });
    cy.expectHash('pp', v => expect(v).to.contain(';18:1:1:0.3,1,1'));
    ebene(14);   // Zweiton: zwei Farben
    cy.get('#nachW3_0').should('have.value', '#1a2a4a');
    cy.get('#nachW3_0').invoke('val', '#ff0000').trigger('input');
    cy.expectHash('pp', v => expect(v).to.contain(';14:1:1:1,0,0,0.9412,0.8471,0.6588,1'));
    cy.get('#nachStapel .nach-karte').should('have.length', 3);
    // Zuklappen: die Regler verschwinden, der Kopf zeigt die Deckkraft, der Zustand überlebt den Neubau des Stapels und steht nicht im Link
    cy.get('#nachZu1').should('have.attr', 'aria-expanded', 'true').click();
    cy.get('#nachKarte1').should('have.class', 'nach-zu');
    cy.get('#nachZu1').should('have.attr', 'aria-expanded', 'false');
    cy.get('#nachW1_deck').should('not.be.visible');
    cy.get('#nachKarte1 .tex-wert').should('have.text', '25 %');
    cy.get('#nachKarte2').should('not.have.class', 'nach-zu');
    cy.expectHash('pp', v => expect(v).to.match(/^12:1:0.25:4,1;18:/));
    cy.get('#nachKarte1 .tex-kurz').click();   // der Name klappt ebenfalls
    cy.get('#nachKarte1').should('not.have.class', 'nach-zu');
    cy.get('#nachW1_deck').should('be.visible');
    cy.get('#nachKarte1 .tex-wert').should('have.text', '');
    cy.get('#nachZu1').click();
    cy.get('#nachKarte2 .tex-weg').click();   // Körnung raus, Zweiton rückt auf; Karte 1 bleibt zu
    cy.get('#nachKarte1').should('have.class', 'nach-zu');
    cy.get('#nachStapel .nach-karte').should('have.length', 2);
    cy.get('#nachKarte2 .tex-kurz').should('have.text', 'Zweiton');
    cy.expectHash('pp', v => { expect(v).to.contain('12:1:0.25:4,1;14:1:1:'); expect(v).to.not.contain('18:'); });
  });

  it('der Link stellt den Stapel wieder her, Ebenen mit Nachbarn: nur die oberste wirkt, Pfeiltasten sortieren', () => {
    cy.visitApp(B + '&pp=3:1:1:0.2,0.3;20:1:1:1;21:1:1:1,1;10:0:0.5:0.5,0.75,0.5,1');
    cy.pane('nach');
    cy.get('#nachStapel .nach-karte').should('have.length', 4);
    cy.get('#nachKarte1 .tex-kurz').should('have.text', 'Helligkeit und Kontrast');
    cy.get('#nachW1_0').should('have.value', '0.2'); cy.get('#nachW1_1').should('have.value', '0.3');
    cy.get('#nachKarte2 .tex-kurz').should('have.text', 'Weichzeichnen');
    cy.get('#nachKarte3 .tex-kurz').should('have.text', 'Schärfen');
    cy.get('#nachKarte3').should('have.class', 'nach-inaktiv');   // zweite Ebene mit Nachbarn: wirkt nicht, sagt es
    cy.get('#nachKarte3 .nach-hinweis').should('not.have.attr', 'hidden');   // (unterhalb des sichtbaren Bereichs der Schublade: hidden-Attribut statt Sichtbarkeit)
    cy.get('#nachKarte2').should('not.have.class', 'nach-inaktiv');
    cy.get('#nachKarte4').should('have.class', 'aus');   // Vignette aus, Deckkraft 0,5 bleibt
    cy.get('#nachW4_deck').should('have.value', '0.5');
    cy.get('#nachKarte3 .tex-griff').focus().type('{upArrow}');   // Schärfen über Weichzeichnen: jetzt wirkt Schärfen
    cy.get('#nachKarte2 .tex-kurz').should('have.text', 'Schärfen');
    cy.get('#nachKarte2').should('not.have.class', 'nach-inaktiv');
    cy.get('#nachKarte3 .tex-kurz').should('have.text', 'Weichzeichnen');
    cy.get('#nachKarte3').should('have.class', 'nach-inaktiv');
    cy.expectHash('pp', v => expect(v).to.match(/^3:[^;]*;21:[^;]*;20:[^;]*;10:/));
    cy.get('#nachLive').should('contain.text', 'Ebene jetzt an Platz 2 von 4');
  });

  it('Gradationskurven: der Editor setzt und zieht Punkte, die Kurve steht im Link und verändert das Bild', () => {
    cy.visitApp(B);
    cy.pane('nach');
    cy.shotStats('kurve-ohne').then(ohne => {
      ebene(1);
      cy.get('#nachKarte1 canvas').should('be.visible');
      cy.get('#nachKarte1 .seg button').should('have.length', 4).first().should('have.class', 'on');
      cy.expectHash('pp', '1:1:1::0/0+1/1~0/0+1/1~0/0+1/1~0/0+1/1');   // die Vorgabe: Diagonalen
      cy.shotStats('kurve-gerade').then(gerade => diff(ohne, gerade).then(d => expect(d.meanDiff, 'die Diagonale ändert nichts').to.be.lessThan(0.5)));
      cy.get('#nachKarte1 canvas').scrollIntoView().then($c => {   // einen Punkt in der Mitte setzen und nach unten ziehen: Mitteltöne dunkler (erst rollen: der Editor rechnet mit clientX/Y)
        const r = $c[0].getBoundingClientRect();
        cy.wrap($c).trigger('pointerdown', { clientX: r.left + r.width * 0.5, clientY: r.top + r.height * 0.5, button: 0, pointerId: 1, scrollBehavior: false })
          .trigger('pointermove', { clientX: r.left + r.width * 0.5, clientY: r.top + r.height * 0.8, button: 0, pointerId: 1, scrollBehavior: false })
          .trigger('pointerup', { pointerId: 1, scrollBehavior: false });
      });
      cy.expectHash('pp', v => expect(v).to.match(/^1:1:1::0\/0\+0\.5\/0\.2\d*\+1\/1~/));
      cy.waitRender();
      cy.shotStats('kurve-dunkel').then(dunkel => { diff(ohne, dunkel).then(d => expect(d.meanDiff, 'die Kurve färbt anders').to.be.greaterThan(5)); expect(dunkel.mean, 'dunkler').to.be.lessThan(ohne.mean); });
      cy.get('#nachKarte1 .seg button').eq(1).click();   // Rotkurve: die Punkte der Gesamtkurve bleiben
      cy.get('#nachKarte1 .ghost.klein').click();        // Rotkurve zurücksetzen (war ohnehin gerade)
      cy.expectHash('pp', v => expect(v).to.match(/^1:1:1::0\/0\+0\.5\/0\.2\d*\+1\/1~0\/0\+1\/1~/));
    });
  });

  it('Schwarzweiß, Fotofilter, Verlaufsumsetzung, selektive Farbe und die Mitten in Schatten/Lichter verändern das Bild', () => {
    cy.visitApp(B);
    cy.shotStats('neu-ohne').then(ohne => {
      for (const [name, pp, mind] of [
        ['schwarzweiss', '24:1:1:0.4,0.6,0.4,0.6,0.2,0.8', 5],
        ['fotofilter', '25:1:1:0.925,0.541,0,0.5,1', 2],
        ['verlauf', '26:1:1:0.08,0.1,0.25,0.78,0.35,0.2,1,0.94,0.82,0.5,1', 5],
        ['selektiv', '27:1:1:4,120,0,0,40', 2],   // Blautöne um 120° gedreht: der blaue Außenraum wird grün
        ['mitten', '9:1:1:0,0,0.5,0.6', 2]]) {   // nur die Mitten heller (angehängter Regler)
        cy.visitApp(B + '&pp=' + pp);
        cy.get('#nachKarte1').should('exist');
        cy.shotStats('neu-' + name).then(s => diff(ohne, s).then(d => expect(d.meanDiff, name + ' färbt anders').to.be.greaterThan(mind)));
      }
      cy.visitApp(B + '&pp=9:1:1:0.2,0.3,0.5');   // alter Link ohne Mitten: liest sich wie mit Mitten 0
      cy.pane('nach');
      cy.get('#nachW1_3').should('have.value', '0');
      cy.expectHash('pp', '9:1:1:0.2,0.3,0.5,0');
    });
  });

  it('Masken: berechnete Auswahl je Ebene – Innen/Außen, Umkehren, Zeigen, Regler aus der Tabelle, Link, Kantenmaske als Nachbar-Ebene', () => {
    cy.visitApp(B);
    cy.shotStats('maske-ohne').then(ohne => {
      cy.visitApp(B + '&pp=11:1:1:1');
      cy.shotStats('maske-voll').then(voll => {
        cy.visitApp(B + '&pp=11:1:1:1:m1,0,0,0.25,1');   // Invertieren nur außen
        cy.pane('nach');
        cy.get('#nachM1_art').should('have.value', '1'); cy.get('#nachM1_0').should('have.value', '1');   // Seite: Außen
        cy.get('#nachM1_8').should('not.exist');   // Innen/Außen hat keinen weichen Rand
        cy.shotStats('maske-aussen').then(aussen => {
          diff(ohne, aussen).then(d => expect(d.meanDiff, 'außen invertiert').to.be.greaterThan(20));
          diff(voll, aussen).then(d => expect(d.meanDiff, 'innen bleibt').to.be.greaterThan(5));
          cy.get('#nachM1_inv').check({ force: true });   // umgekehrt: nur innen
          cy.expectHash('pp', '11:1:1:1:m1,1,0,0.25,1');
          cy.waitRender();
          cy.shotStats('maske-innen').then(innen => {
            diff(aussen, innen).then(d => expect(d.meanDiff, 'umgekehrt: anders').to.be.greaterThan(20));
            cy.get('#nachM1_an').uncheck({ force: true });   // Maske aus: die Ebene wirkt überall, die Einstellungen bleiben
            cy.expectHash('pp', '11:1:1:1:m1,3,0,0.25,1');
            cy.waitRender();
            cy.shotStats('maske-aus').then(aus => diff(voll, aus).then(d => expect(d.meanDiff, 'Maske aus = ganz invertiert').to.be.lessThan(0.5)));
            cy.get('#nachM1_an').check({ force: true });
            cy.expectHash('pp', '11:1:1:1:m1,1,0,0.25,1');
            cy.get('#nachM1_zeig').check({ force: true });   // die Maske als Grau
            cy.expectHash('pp', '11:1:1:1:m1,1,1,0.25,1');
            cy.waitRender();
            cy.shotStats('maske-zeigen').then(z => { diff(innen, z).then(d => expect(d.meanDiff, 'Maske als Grau').to.be.greaterThan(5)); expect(z.colors, 'nur Grau').to.be.lessThan(30); });
          });
        });
      });
    });
    cy.visitApp(B + '&pp=11:1:1:1:m1,0,0,0.25,0;11:1:1:1:m1,0,0,0.25,1');   // innen plus außen = alles
    cy.shotStats('maske-beide').then(beide => { cy.visitApp(B + '&pp=11:1:1:1'); cy.shotStats('maske-voll2').then(voll => diff(beide, voll).then(d => expect(d.meanDiff, 'innen + außen = ganz').to.be.lessThan(0.5))); });
    cy.visitApp(B + '&pp=11:1:1:1:m10,0,0,0.25,0,8');   // Abstandsband: der Abstand wird mitgerechnet, das Bild entsteht trotzdem
    cy.get('#nachKarte1').should('exist');
    cy.shotStats('maske-abstand').then(ab => cy.shotStats('maske-abstand2').then(() => diff(ab, ab).then(d => expect(d.meanDiff).to.eq(0))));
    cy.visitApp(B + '&pp=11:1:1:1:m11,0,0,0.25,0.1;20:1:1:2');   // Kantenmaske: die Ebene zählt als Nachbar-Ebene, das Weichzeichnen danach wirkt nicht
    cy.pane('nach');
    cy.get('#nachKarte1').should('not.have.class', 'nach-inaktiv');
    cy.get('#nachKarte2').should('have.class', 'nach-inaktiv');
    cy.pickOption('nachM1_art', '8');   // Bänder: Regler aus der Tabelle und weicher Rand
    cy.get('#nachM1_0').should('have.value', '4'); cy.get('#nachM1_8').should('have.value', '0.25');
    cy.get('#nachM1_0').invoke('val', 6).trigger('input');   // der Schieber: das Wertfeld folgt
    cy.get('#nachM1_0Val').should('have.value', '6,00');   // Schrittweite 0,5: zwei Nachkommastellen
    cy.get('#nachM1_8').invoke('val', 0.5).trigger('input'); cy.get('#nachM1_8Val').should('have.value', '0,50');
    cy.get('#nachM1_8').invoke('val', 0.25).trigger('input');
    cy.get('#nachM1_0Val').clear().type('8{enter}');
    cy.expectHash('pp', v => expect(v).to.match(/^11:1:1:1:m8,0,0,0.25,8,0,0.5;20:/));
    cy.get('#nachKarte2').should('not.have.class', 'nach-inaktiv');   // ohne Kantenmaske wirkt das Weichzeichnen wieder
    cy.pickOption('nachM1_art', '0');
    cy.expectHash('pp', '11:1:1:1;20:1:1:2');
  });

  // Exportpfad: mit Ebene muss die Datei invertiert sein (das Zwischenbild der Nachbearbeitung gilt auch je Exportkachel), auf beiden Renderern gleich
  const exportMittel = (hash, storage) => {
    cy.task('clearDownloads');
    cy.visitApp(hash, storage ? { storage } : undefined);
    cy.get('#save').click();
    cy.setRange('posterRes', 1); cy.pickOption('posterFmt', 'png');
    cy.get('#posterResVal').should('have.text', '500 × 281 px');
    cy.get('#posterStart').click();
    cy.get('#posterState', { timeout: 120000 }).invoke('text').should('match', /Gespeichert|gerendert|Fertig|Herunterladen/);
    cy.get('#posterDl').should('be.visible').click();
    return cy.task('waitForDownload', { pattern: '500x281.*[.]png$', timeoutMs: 20000 }).then(files => {
      expect(files, 'Bild im Download-Ordner').to.have.length.greaterThan(0);
      return cy.task('pngStats', { file: files[0], region: { x0: 0, y0: 0, x1: 1, y1: 1 } }).then(st => st.mean);
    });
  };
  it('die Ebenen wirken im gespeicherten Bild, mit WebGPU wie mit WebGL 2, und stehen in den Bildangaben', () => {
    exportMittel(B).then(ohne => {
      exportMittel(B + '&pp=11:1:1:1').then(mit => {
        expect(Math.abs(mit - ohne), 'die Datei ist invertiert').to.be.greaterThan(40);
        exportMittel(B + '&pp=11:1:1:1', { 'fractal.renderer': 'webgl' }).then(gl => expect(Math.abs(gl - mit), 'WebGL 2 exportiert dasselbe').to.be.lessThan(3));
      });
    });
    cy.visitApp(B + '&pp=11:1:1:1');
    cy.get('#save').click();
    cy.get('#metaText').invoke('val').then(text => expect(JSON.parse(text).params, 'die Ebenen stehen in den Bildangaben').to.contain('pp=11'));
    cy.get('#posterCancel').click();
  });

  it('mit WebGL 2: Ebene und Maske wirken, die Fassung mit Ebenen steht binnen 25 s (kein minutenlanges Übersetzen mehr)', () => {
    const gl = { storage: { 'fractal.renderer': 'webgl' } };
    cy.visitApp(B, gl);
    cy.get('#badge').should('have.text', 'WebGL 2');
    cy.shotStats('gl-ohne').then(ohne => {
      cy.visitApp(B + '&pp=11:1:1:1', gl);
      cy.get('#state', { timeout: 25000 }).should('not.contain.text', 'übersetzt');   // die Fassung mit Ebenen wird nebenher übersetzt; das dauerte einmal über 30 s
      cy.waitRender();
      cy.shotStats('gl-invers').then(inv => {
        diff(ohne, inv).then(d => expect(d.meanDiff, 'WebGL 2 invertiert').to.be.greaterThan(40));
        cy.visitApp(B + '&pp=11:1:1:1:m1,0,0,0.25,1', gl);   // nur außen: die Maske kam auf WebGL 2 einmal nicht an (Uniforms hinter einem Kommentar)
        cy.get('#state', { timeout: 25000 }).should('not.contain.text', 'übersetzt');
        cy.waitRender();
        cy.shotStats('gl-maske').then(mk => { diff(ohne, mk).then(d => expect(d.meanDiff, 'außen invertiert').to.be.greaterThan(20)); diff(inv, mk).then(d => expect(d.meanDiff, 'innen bleibt').to.be.greaterThan(5)); });
      });
    });
  });

  it('ein von Hand getippter Link mit + in den Kurven liest sich richtig (die Adresse macht aus + ein Leerzeichen)', () => {
    cy.visitApp(B + '&pp=1:1:1::0/0+0.5/0.2+1/1~0/0+1/1~0/0+1/1~0/0+1/1');
    cy.expectHash('pp', v => expect(v).to.match(/^1:1:1::0\/0\+0\.5\/0\.2\+1\/1~/));
    cy.pane('nach');
    cy.get('#nachKarte1 .tex-kurz').should('have.text', 'Gradationskurven');
  });
});
