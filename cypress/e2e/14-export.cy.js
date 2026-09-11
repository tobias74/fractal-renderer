describe('Bild speichern: Ausschnitt und Auflösung, sonst nichts', () => {
  beforeEach(() => {
    cy.task('clearDownloads');
    cy.visitApp();
  });

  it('Dialog: zwei Achsen, Ausschnitt zuerst, Papier und dpi nur als Auskunft in der Infozeile', () => {
    cy.get('#save').should('have.attr', 'aria-label', 'Bild speichern');
    cy.get('#save').click();
    cy.get('#poster').should('be.visible');
    cy.get('#posterTitle').should('have.text', 'Bild speichern');
    // Der Ausschnitt steht oben und ist ohne Umweg erreichbar: kein Menü, hinter dem der Rahmen verschwindet.
    cy.get('#posterCropRow').should('be.visible');
    // Eine Zeile: Verhältnis, zwei Umschalter und der Knopf, der die Maske aufruft; „Bildschirm“ ist gewählt
    cy.get('#cropScreen').should('be.visible').and('have.text', 'Bildschirm').and('have.class', 'on').and('have.attr', 'aria-pressed', 'true');
    cy.get('#cropPick').should('be.visible').and('have.text', 'Manuell').and('not.have.class', 'on');
    cy.get('#cropEdit').should('be.visible').and('have.attr', 'aria-label', 'Ausschnitt am Bild festlegen');
    cy.get('#cropScreen').then($a => {
      const mitte = r => r.top + r.height / 2, a = mitte($a[0].getBoundingClientRect());
      for (const id of ['cropPick', 'cropEdit']) cy.get('#' + id).should($b => {
        expect(mitte($b[0].getBoundingClientRect()), id + ' auf einer Linie').to.be.closeTo(a, 2);
      });
    });
    cy.get('#posterCropInfo').should('have.text', '16:9');
    // Ein Bild hat nur Pixel: Papier und dpi lassen sich nicht einstellen, sie stehen nur als Auskunft in der Infozeile.
    for (const id of ['posterPaper', 'posterDpi', 'posterPrint', 'posterSize', 'posterEdge', 'posterAbout']) cy.get('#' + id).should('not.exist');
    cy.get('#poster').should($p => {
      const ohneInfo = $p[0].cloneNode(true); ohneInfo.querySelector('#posterInfo').remove();
      expect(ohneInfo.textContent.toLowerCase(), 'dpi nur in der Infozeile').to.not.contain('dpi');
    });
    cy.get('#posterInfo').should('contain.text', 'A3 77 dpi, A2 55 dpi, A1 39 dpi, A0 27 dpi');
    // Die zweite Achse ist ein Regler; ganz links steht die Auflösung des Bildschirms und wird sofort gespeichert.
    cy.get('#posterRes').should('have.value', '0');
    cy.get('#posterResVal').should('have.text', '1280 × 720 px');
    cy.get('#posterInfo').should('contain.text', 'ohne neues Rendern');
    cy.get('#posterStart').should('have.text', 'Speichern');
    cy.setRange('posterRes', 4);
    cy.get('#posterResVal').should('have.text', '1000 × 563 px');
    cy.get('#posterStart').should('have.text', 'Rendern');
    cy.pickOption('posterFmt', 'jpg');
    cy.get('#posterCancel').click();
    cy.get('#poster').should('not.be.visible');
  });

  it('Auflösungsregler: jede Stufe nennt die Pixel, die dabei herauskommen', () => {
    cy.get('#save').click();
    for (const [stufe, text] of [[1, '500 × 281 px'], [3, '800 × 450 px'], [6, '1600 × 900 px']]) {
      cy.setRange('posterRes', stufe);
      cy.get('#posterResVal').should('have.text', text);
      cy.get('#posterInfo').should('contain.text', text.replace(' px', ' px ·'));
    }
    // Infozeile: was das Bild auf A3 bis A0 an Auflösung hätte, ohne dass sich das einstellen ließe
    cy.setRange('posterRes', 11);
    cy.get('#posterResVal').should('have.text', '5000 × 2813 px');
    cy.get('#posterInfo').should('contain.text', 'A3 302 dpi, A2 214 dpi, A1 151 dpi, A0 107 dpi');
    // Der Regler reicht weit: bei 16:9 bis 32 000 px, genug für A0 weit über 600 dpi
    cy.get('#posterRes').should('have.attr', 'max', '19');
    cy.setRange('posterRes', 19);
    cy.get('#posterResVal').should('have.text', '32000 × 18000 px');
    cy.get('#posterInfo').should('contain.text', 'A0 684 dpi');
    // Die höchste Stufe bleibt unter der Grenze: der Regler kann nichts Ungültiges einstellen.
    cy.get('#posterRes').invoke('attr', 'max').then(max => {
      cy.setRange('posterRes', max);
      cy.get('#posterInfo').should('not.contain.text', 'zu groß');
      cy.get('#posterStart').should('not.be.disabled');
    });
    cy.get('#posterCancel').click();
  });

  it('Dialog passt am niedrigen Schirm ohne Rollen ins Bild', () => {
    // Am Handy im Artifact-Rahmen bleiben oft keine 500 px Höhe: alles muss zusammen ins Bild passen.
    cy.viewport(390, 480);
    cy.visitApp();
    cy.get('#tabSave').click();   // am Handy sitzt Speichern in den Reitern
    cy.get('#poster').should('be.visible');
    cy.setRange('posterRes', 3);
    cy.get('#poster').should($m => expect($m[0].scrollHeight, 'ohne Rollen').to.be.at.most($m[0].clientHeight));
    for (const id of ['posterTitle', 'cropScreen', 'cropPick', 'cropEdit', 'posterRes', 'posterFmt', 'posterStart', 'posterCancel']) {
      cy.get('#' + id).should($e => {
        const r = $e[0].getBoundingClientRect();
        expect(r.top, id + ' oben im Bild').to.be.at.least(0);
        expect(r.bottom, id + ' unten im Bild').to.be.at.most(480);
      });
    }
    cy.get('#posterCancel').click();
  });

  it('der Export glättet mit Verfahren und Werten der App, ohne eigene Wahl', () => {
    // Eine eigene Stufe im Dialog gab es früher; dieselbe Zahl bedeutet aber am Bildschirm und beim Export nicht
    // dasselbe. Jetzt steht in der Infozeile, womit gerechnet wird, und es gibt nichts mehr einzustellen.
    cy.rerender(() => cy.pickOption('aaSel', 4));
    cy.get('#save').click();
    cy.setRange('posterRes', 2);
    cy.get('#posterAA').should('not.exist');
    cy.get('#posterInfo').should('contain.text', 'Raster 4 × 4 wie am Bildschirm');
    cy.get('#posterCancel').click();
    cy.rerender(() => cy.pickOption('aaModeSel', 'adaptive'));
    cy.setRange('aaMax', 5);            // Deckel 256 Proben je Pixel
    cy.get('#aaMaxVal').should('have.text', '256');
    cy.get('#save').click();
    cy.setRange('posterRes', 2);
    cy.get('#posterInfo').should('contain.text', 'adaptiv wie am Bildschirm');
    cy.get('#posterInfo').should('contain.text', 'höchstens 256 Proben je Pixel');
    cy.get('#posterCancel').click();
  });

  it('speichert die Bildschirmansicht aus demselben Dialog, ohne neu zu rendern', () => {
    // Speichern und Drucken sind eine Sache: ein Knopf, ein Dialog, die Bildschirmauflösung ist die erste Stufe.
    cy.get('#save').click();
    cy.get('#posterRes').should('have.value', '0');
    cy.get('#posterStart').click();
    cy.get('#modal', { timeout: 60000 }).should('be.visible');   // ohne Download-Fähigkeit: Bild in voller Größe
    cy.get('#dl').invoke('attr', 'download').should('match', /^fraktal-mandel-1280x720-.*\.png$/);
    cy.get('#dl').click();
    cy.task('waitForDownload', { pattern: '1280x720.*[.]png$', timeoutMs: 20000 }).then(files => {
      expect(files, 'Bild im Download-Ordner').to.have.length.greaterThan(0);
      cy.readFile(files[0], null).then(buf => {
        expect(buf.readUInt32BE(16), 'Breite wie am Bildschirm').to.eq(1280);
        expect(buf.readUInt32BE(20), 'Höhe wie am Bildschirm').to.eq(720);
      });
    });
    cy.get('#closeModal').click();
  });

  it('rendert ein kleines Bild mit Parametern und bietet die Datei an', () => {
    cy.pickOption('power', 3);
    cy.get('#save').click();
    cy.setRange('posterRes', 1);
    cy.pickOption('posterFmt', 'png');
    cy.get('#posterResVal').should('have.text', '500 × 281 px');
    cy.get('#posterStart').click();
    cy.get('#posterState', { timeout: 120000 }).invoke('text').should('match', /Gespeichert|gerendert|Fertig|Herunterladen/);
    cy.get('#posterDl').should('be.visible');
    cy.get('#posterDl').invoke('attr', 'download').should('match', /\.png$/);
    cy.get('#posterDl').invoke('attr', 'href').should('match', /^blob:/);
    cy.get('#posterDl').click();
    cy.task('waitForDownload', { pattern: '500x281.*[.]png$', timeoutMs: 20000 }).then(files => {
      expect(files, 'Bild im Download-Ordner').to.have.length.greaterThan(0);
      cy.readFile(files[0], null).then(buf => {
        expect(buf.readUInt32BE(16), 'Breite').to.eq(500);
        expect(buf.readUInt32BE(20), 'Höhe').to.eq(281);
      });
      // Halb gerenderte Bilder fielen früher nicht auf: oben Bild, unten leer. Beide Ränder müssen Farbe tragen.
      for (const [name, region] of [['oberer Rand', { x0: 0, y0: 0, x1: 1, y1: 0.12 }], ['unterer Rand', { x0: 0, y0: 0.88, x1: 1, y1: 1 }]]) {
        cy.task('pngStats', { file: files[0], region }).then(s => {
          expect(s.colors, name + ' hat mehr als eine Farbe').to.be.greaterThan(1);
          expect(s.mean, name + ' ist nicht leer').to.be.greaterThan(0);
        });
      }
      cy.task('pngParams', { file: files[0] }).then(t => {
        expect(t, 'Parameter im Bild').to.be.a('string');
        expect(JSON.parse(t).params).to.contain('p=3');
      });
    });
    cy.get('#posterCancel').click();
  });

  it('adaptiver Export: rechnet mit demselben Kriterium wie der Bildschirm', () => {
    // Neuer Rechenweg: Die Exportkachel liegt in den Bildschirmpuffern und wird Runde für Runde verfeinert.
    cy.rerender(() => cy.pickOption('aaModeSel', 'adaptive'));
    cy.setRange('aaMax', 0);            // Deckel 8 Proben je Pixel: kurz genug für den Test
    cy.get('#aaMaxVal').should('have.text', '8');
    cy.get('#save').click();
    cy.setRange('posterRes', 3);
    cy.pickOption('posterFmt', 'png');
    cy.get('#posterResVal').should('have.text', '800 × 450 px');
    cy.get('#posterInfo').should('contain.text', 'adaptiv wie am Bildschirm');
    cy.get('#posterStart').click();
    cy.get('#posterState', { timeout: 180000 }).invoke('text').should('match', /Gespeichert|gerendert|Fertig|Herunterladen/);
    cy.get('#posterDl').click();
    cy.task('waitForDownload', { pattern: '800x450.*[.]png$', timeoutMs: 30000 }).then(files => {
      expect(files, 'Bild im Download-Ordner').to.have.length.greaterThan(0);
      cy.readFile(files[0], null).then(buf => {
        expect(buf.readUInt32BE(16), 'Breite').to.eq(800);
        expect(buf.readUInt32BE(20), 'Höhe').to.eq(450);
      });
      // über mehrere Kacheln hinweg vollständig und nicht schwarz
      for (const [name, region] of [['links oben', { x0: 0, y0: 0, x1: 0.3, y1: 0.3 }], ['rechts unten', { x0: 0.7, y0: 0.7, x1: 1, y1: 1 }], ['Mitte', { x0: 0.35, y0: 0.35, x1: 0.65, y1: 0.65 }]]) {
        cy.task('pngStats', { file: files[0], region }).then(st => {
          expect(st.colors, name + ' hat mehr als eine Farbe').to.be.greaterThan(1);
          expect(st.mean, name + ' ist nicht leer').to.be.greaterThan(0);
        });
      }
    });
    cy.get('#posterCancel').click();
    cy.waitRender();   // der Bildschirm wird nach dem adaptiven Export neu gerechnet
  });

  it('hohes Bild über mehrere Streifen: die Datei ist von oben bis unten gefüllt', () => {
    // PNG wird streifenweise geschrieben, ohne Bild in voller Größe (sonst begrenzt die Zeichenfläche des Geräts
    // die Bildgröße). Ein hochkantiger Rahmen prüft, dass dabei keine Zeile verloren geht.
    cy.get('#save').click();
    cy.get('#cropPick').click();
    cy.get('#crop').should('be.visible');
    cy.pickOption('cropFmt', '9_16');   // hochkant steht als eigener Eintrag im selben Menü
    cy.get('#cropOk').click();
    cy.get('#poster').should('be.visible');
    cy.get('#posterCropInfo').should('have.text', '9:16');
    cy.setRange('posterRes', 7);
    cy.pickOption('posterFmt', 'png');
    cy.get('#posterResVal').should('have.text', '1125 × 2000 px');
    cy.get('#posterStart').click();
    cy.get('#posterState', { timeout: 180000 }).invoke('text').should('match', /Gespeichert|gerendert|Fertig|Herunterladen/);
    cy.get('#posterThumb').should('be.visible');
    cy.get('#posterDl').click();
    cy.task('waitForDownload', { pattern: '1125x2000.*[.]png$', timeoutMs: 30000 }).then(files => {
      expect(files, 'Bild im Download-Ordner').to.have.length.greaterThan(0);
      cy.readFile(files[0], null).then(buf => {
        expect(buf.readUInt32BE(16), 'Breite').to.eq(1125);
        expect(buf.readUInt32BE(20), 'Höhe').to.eq(2000);
      });
      for (const [name, region] of [['oben', { y0: 0, y1: 0.08 }], ['Mitte', { y0: 0.46, y1: 0.54 }], ['unten', { y0: 0.92, y1: 1 }]]) {
        cy.task('pngStats', { file: files[0], region }).then(st => {
          expect(st.colors, name + ' hat mehr als eine Farbe').to.be.greaterThan(1);
          expect(st.mean, name + ' ist nicht leer').to.be.greaterThan(0);
        });
      }
    });
    cy.get('#posterCancel').click();
  });

  it('Ausschnittrahmen: ohne Umweg erreichbar, verschieben, Verhältnis ändern, übernehmen, verwerfen', () => {
    cy.get('#save').click();
    cy.get('#cropPick').click();        // direkt, ohne vorher ein Menü umzustellen
    cy.get('#poster').should('not.be.visible');
    cy.get('#crop').should('be.visible');
    cy.get('#cropBox').should('be.visible');
    cy.get('#cropFmt').should('have.value', 'screen');   // ohne Vorgabe die Form, die man gerade sieht
    // Ein Menü für die Form: jedes Verhältnis quer und hoch, keine eigene Ausrichtung (bei „Frei“ wäre sie sinnlos)
    cy.get('#cropOrient').should('not.exist');
    cy.get('#cropFmt optgroup').should('have.length', 2);
    for (const v of ['free', '1_1', '16_9', '9_16', '4_3', '3_4']) cy.get(`#cropFmt option[value="${v}"]`).should('exist');
    cy.get('#cropLabel').invoke('text').should('match', /16:9 · \d+ × \d+ px/);
    cy.pickOption('cropFmt', '4_3');
    cy.get('#cropBox').should($b => {
      const r = $b[0].getBoundingClientRect();
      expect(r.width / r.height, 'Rahmen im Verhältnis 4:3').to.be.closeTo(4 / 3, 0.02);
    });
    cy.get('#cropLabel').should('contain.text', '4:3');
    cy.get('#cropBox').then($b => {
      const r0 = $b[0].getBoundingClientRect();
      const x = r0.left + r0.width / 2, y = r0.top + r0.height / 2;
      cy.get('#cropBox').trigger('pointerdown', { pointerId: 2, pointerType: 'mouse', button: 0, buttons: 1, clientX: x, clientY: y });
      cy.get('#cropBox').trigger('pointermove', { pointerId: 2, pointerType: 'mouse', buttons: 1, clientX: x + 60, clientY: y + 30 });
      cy.get('#cropBox').trigger('pointerup', { pointerId: 2, pointerType: 'mouse', button: 0, buttons: 0, clientX: x + 60, clientY: y + 30 });
      cy.get('#cropBox').then($b2 => expect($b2[0].getBoundingClientRect().left, 'Rahmen verschoben').to.be.closeTo(r0.left + 60, 3));
    });
    cy.get('#cropOk').click();
    cy.get('#poster').should('be.visible');
    cy.get('#cropPick').should('have.class', 'on').and('have.attr', 'aria-pressed', 'true');
    cy.get('#cropScreen').should('not.have.class', 'on');
    cy.get('#posterCropInfo').should('have.text', '4:3');   // das Verhältnis des Rahmens, nicht mehr das des Schirms
    // „Manuell“ ist schon gewählt, ein weiterer Klick darauf ändert nichts
    cy.get('#cropPick').click();
    cy.get('#crop').should('not.be.visible');
    cy.get('#poster').should('be.visible');
    // Das Symbol ruft die Maske mit dem bestehenden Rahmen zum Ändern auf; Abbrechen lässt ihn stehen
    cy.get('#cropEdit').click();
    cy.get('#crop').should('be.visible');
    cy.get('#cropFmt').should('have.value', '4_3');
    cy.get('#cropCancel').click();
    cy.get('#poster').should('be.visible');
    cy.get('#cropPick').should('have.class', 'on');
    // „Bildschirm“ verwirft den Rahmen
    cy.get('#cropScreen').click();
    cy.get('#cropScreen').should('have.class', 'on');
    cy.get('#cropPick').should('not.have.class', 'on');
    cy.get('#posterCropInfo').should('have.text', '16:9');
    cy.get('#cropPick').click();        // nach dem Verwerfen wieder einen Rahmen wählen, dann abbrechen
    cy.get('#cropCancel').click();
    cy.get('#crop').should('not.be.visible');
    cy.get('#poster').should('be.visible');
    cy.get('#cropScreen').should('have.class', 'on');   // Abbrechen ohne Rahmen bleibt beim Bildschirm
    cy.get('#cropEdit').click();        // das Symbol ruft die Maske auch ohne Rahmen auf
    cy.get('#crop').should('be.visible');
    cy.get('#cropOk').click();
    cy.get('#cropPick').should('have.class', 'on');
    cy.get('#posterCancel').click();
  });

  it('Formen: ein DIN-Eintrag für A, B und C, benannte Formate, jede Form quer und hoch, keine Größen', () => {
    cy.get('#save').click();
    cy.get('#cropEdit').click();
    cy.get('#cropFmt optgroup').eq(0).should('have.attr', 'label', 'Querformat').find('option').should('have.length', 12);
    cy.get('#cropFmt optgroup').eq(1).should('have.attr', 'label', 'Hochformat').find('option').should('have.length', 12);
    // DIN A, B und C haben dasselbe Verhältnis: ein Eintrag je Richtung, keine Größen wie A3 oder B4
    cy.get('#cropFmt option').filter((i, o) => o.textContent.includes('DIN')).should('have.length', 2);
    cy.get('#cropFmt').should($s => expect($s.text(), 'keine Größen im Menü').to.not.match(/\b[ABC][0-9]\b/));
    for (const [wert, anzeige, v] of [['din_h', 'DIN 1:√2', Math.SQRT1_2], ['letter_q', 'Letter 11:8,5', 11 / 8.5], ['gold_q', '1,618:1', (1 + Math.sqrt(5)) / 2], ['7_5', '7:5', 1.4], ['3_1', '3:1', 3]]) {
      cy.pickOption('cropFmt', wert);
      cy.get('#cropLabel').should('contain.text', anzeige);
      cy.get('#cropBox').should($b => {
        const r = $b[0].getBoundingClientRect();
        expect(r.width / r.height, wert).to.be.closeTo(v, 0.01);
      });
    }
    cy.pickOption('cropFmt', 'din_h');
    cy.get('#cropOk').click();
    cy.get('#posterCropInfo').should('have.text', 'DIN 1:√2');
    cy.get('#posterCancel').click();
  });

  it('erneutes Öffnen beginnt wieder beim Bildschirm, die Maske liegt nach dem Verschieben im Bild', () => {
    // Ein Rahmen hängt an Koordinaten der Ebene. Nach Verschieben oder Zoomen läge ein alter Rahmen irgendwo.
    cy.get('#save').click();
    cy.get('#cropEdit').click();
    cy.pickOption('cropFmt', '1_1');
    cy.get('#cropOk').click();
    cy.get('#cropPick').should('have.class', 'on');
    cy.get('#posterCropInfo').should('have.text', '1:1');
    cy.get('#posterCancel').click();
    cy.rerender(() => cy.get('body').type('{rightarrow}{rightarrow}{rightarrow}{rightarrow}'));   // Ansicht verschieben
    cy.get('#save').click();
    cy.get('#cropScreen').should('have.class', 'on');
    cy.get('#cropPick').should('not.have.class', 'on');
    cy.get('#posterCropInfo').should('have.text', '16:9');
    cy.get('#posterStart').should('have.text', 'Speichern');
    cy.get('#cropEdit').click();
    cy.get('#cropBox').should($b => {
      const r = $b[0].getBoundingClientRect();
      expect(r.left, 'Maske links im Fenster').to.be.at.least(0);
      expect(r.top, 'Maske oben im Fenster').to.be.at.least(0);
      expect(r.right, 'Maske rechts im Fenster').to.be.at.most(Cypress.config('viewportWidth'));
      expect(r.bottom, 'Maske unten im Fenster').to.be.at.most(Cypress.config('viewportHeight'));
    });
    cy.get('#cropCancel').click();
    cy.get('#posterCancel').click();
  });
});
