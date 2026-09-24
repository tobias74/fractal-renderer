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
    cy.get('#tabSave').click();   // am Handy sitzt Speichern in der Kopfzeile
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
    cy.get('#aaMaxVal').should('have.value', '256');
    cy.get('#save').click();
    cy.setRange('posterRes', 2);
    cy.get('#posterInfo').should('contain.text', 'adaptiv wie am Bildschirm');
    cy.get('#posterInfo').should('contain.text', 'höchstens 256 Proben je Pixel');
    cy.get('#posterCancel').click();
  });

  it('Bildangaben: kein Häkchen mehr, die Parameter stehen immer in der Datei, der genaue Text ist zu sehen', () => {
    cy.get('#save').click();
    cy.get('#posterMeta').should('be.visible');
    cy.get('#metaParams, #metaColors, #metaTech').should('not.exist');   // seit 19.09.2026 nichts mehr abzuwählen: die Parameter enthalten Farben und Glättung
    cy.get('#metaApp, #metaDate, #metaUrl, #metaNone, #metaAll, #posterMetaKurz').should('not.exist');   // kein Name, kein Datum, kein Link, keine Sammelknöpfe
    cy.get('#posterMeta').should('be.visible');   // immer offen
    cy.get('#metaText').invoke('val').should('match', /^\{\n  "params": \{\n    "mode": "mandel"/);   // eingerückt und lesbar: ein Objekt, keine kodierte Zeile
    cy.get('#metaText').invoke('val').then(text => {   // genau der Text, der in die Datei kommt
      const j = JSON.parse(text);
      expect(j, 'Angaben').to.have.all.keys('params');
      expect(j.params).to.include.keys('mode', 're', 'im', 'z', 'pv', 'aa', 'aam', 'aat', 'aax', 'aas');   // Palette mit Werten und Glättung stehen darin
      expect(text, 'keine kodierten Zeichen').not.to.match(/%3[AD]|%2C/);
      expect(j).to.not.have.any.keys('app', 'version', 'saved', 'url', 'extra', 'colors');
    });
    cy.get('#metaWo').should('contain.text', 'iTXt');
    cy.pickOption('posterFmt', 'jpg');
    cy.get('#metaWo').should('contain.text', 'Kommentar');
    cy.get('#metaText').invoke('val').should('match', /^\{\n  "params"/);   // auch bei JPEG derselbe Text
    cy.window().then(win => expect(win.localStorage.getItem('fractal.meta'), 'keine Wahl mehr im Browser').to.be.null);
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
        expect(JSON.parse(t).params.p).to.eq('3');
      });
    });
    cy.get('#posterCancel').click();
  });

  it('adaptiver Export: rechnet mit demselben Kriterium wie der Bildschirm', () => {
    // Neuer Rechenweg: Die Exportkachel liegt in den Bildschirmpuffern und wird Runde für Runde verfeinert.
    cy.rerender(() => cy.pickOption('aaModeSel', 'adaptive'));
    cy.setRange('aaMax', 0);            // Deckel 8 Proben je Pixel: kurz genug für den Test
    cy.get('#aaMaxVal').should('have.value', '8');
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

  it('Kanten des Rahmens: jede Kante zieht ihre Seite, die Gegenseite steht; mit festem Verhältnis wächst die andere Achse von der haltenden Kante aus', () => {
    cy.get('#save').click(); cy.get('#cropPick').click(); cy.get('#cropBox').should('be.visible');
    for (const k of ['n', 's', 'w', 'e']) cy.get(`#cropBox .h[data-h=${k}]`).should('exist');   // seit 19.09.2026 auch die Kanten, nicht nur die Ecken
    const zieh = (kante, dx, dy) => cy.get(`#cropBox .h[data-h=${kante}]`).then($h => {
      const r = $h[0].getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      cy.wrap($h).trigger('pointerdown', { pointerId: 3, pointerType: 'mouse', button: 0, buttons: 1, clientX: x, clientY: y });
      cy.get('#cropBox').trigger('pointermove', { pointerId: 3, pointerType: 'mouse', buttons: 1, clientX: x + dx, clientY: y + dy });
      cy.get('#cropBox').trigger('pointerup', { pointerId: 3, pointerType: 'mouse', button: 0, buttons: 0, clientX: x + dx, clientY: y + dy });
    });
    const rahmen = () => cy.get('#cropBox').then($b => $b[0].getBoundingClientRect());
    cy.pickOption('cropFmt', 'free');
    rahmen().then(r0 => { zieh('e', 40, 0); rahmen().then(r1 => { expect(r1.right, 'rechte Kante folgt').to.be.closeTo(r0.right + 40, 3); expect(r1.left, 'linke Kante steht').to.be.closeTo(r0.left, 1); expect(r1.height, 'Höhe bleibt (frei)').to.be.closeTo(r0.height, 1); }); });
    rahmen().then(r0 => { zieh('n', 0, -30); rahmen().then(r1 => { expect(r1.top, 'obere Kante folgt').to.be.closeTo(r0.top - 30, 3); expect(r1.bottom, 'untere Kante steht').to.be.closeTo(r0.bottom, 1); expect(r1.width, 'Breite bleibt').to.be.closeTo(r0.width, 1); }); });
    rahmen().then(r0 => { zieh('w', 20, 0); rahmen().then(r1 => { expect(r1.left, 'linke Kante folgt nach innen').to.be.closeTo(r0.left + 20, 3); expect(r1.right, 'rechte Kante steht').to.be.closeTo(r0.right, 1); }); });
    rahmen().then(r0 => { zieh('s', 0, 25); rahmen().then(r1 => { expect(r1.bottom, 'untere Kante folgt').to.be.closeTo(r0.bottom + 25, 3); expect(r1.top, 'obere Kante steht').to.be.closeTo(r0.top, 1); }); });
    cy.pickOption('cropFmt', '16_9');
    rahmen().then(r0 => { zieh('e', 64, 0); rahmen().then(r1 => { expect(r1.right, 'rechte Kante folgt').to.be.closeTo(r0.right + 64, 3); expect(r1.left, 'linke Kante steht').to.be.closeTo(r0.left, 1); expect(r1.width / r1.height, '16:9 bleibt').to.be.closeTo(16 / 9, 0.02); expect(r1.top, 'die obere Kante steht ebenfalls: gewachsen wird nach unten').to.be.closeTo(r0.top, 1); }); });
    rahmen().then(r0 => { zieh('s', 0, 18); rahmen().then(r1 => { expect(r1.bottom, 'untere Kante folgt').to.be.closeTo(r0.bottom + 18, 3); expect(r1.top, 'obere Kante steht').to.be.closeTo(r0.top, 1); expect(r1.width / r1.height, '16:9 bleibt').to.be.closeTo(16 / 9, 0.02); expect(r1.left, 'die linke Kante steht ebenfalls: gewachsen wird nach rechts').to.be.closeTo(r0.left, 1); }); });
    cy.get('#cropBox .h[data-h=se]').then($h => {   // die Ecken ziehen weiter wie bisher
      const r = $h[0].getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      rahmen().then(r0 => {
        cy.wrap($h).trigger('pointerdown', { pointerId: 4, pointerType: 'mouse', button: 0, buttons: 1, clientX: x, clientY: y });
        cy.get('#cropBox').trigger('pointermove', { pointerId: 4, pointerType: 'mouse', buttons: 1, clientX: x - 32, clientY: y - 18 });
        cy.get('#cropBox').trigger('pointerup', { pointerId: 4, pointerType: 'mouse', button: 0, buttons: 0, clientX: x - 32, clientY: y - 18 });
        rahmen().then(r1 => { expect(r1.left, 'Gegenecke steht').to.be.closeTo(r0.left, 1); expect(r1.top).to.be.closeTo(r0.top, 1); expect(r1.right, 'Ecke folgt').to.be.closeTo(r0.right - 32, 3); expect(r1.width / r1.height).to.be.closeTo(16 / 9, 0.02); });
      });
    });
    cy.get('#cropCancel').click(); cy.get('#posterCancel').click();
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

  // Rollen im Dialog: die Karte passt immer ins Bild, der Metadaten-Abschnitt nimmt die Resthöhe und rollt. Das Textfeld
  // darf dabei nicht zusammengedrückt werden (overflow hidden: der Rest des Textes wäre unerreichbar) – so war es am
  // 19.09.2026, weil der Flex-Container das Feld auf die Resthöhe schrumpfte.
  const rect = $e => $e[0].getBoundingClientRect();
  const LANG = 'mode=mandel&l2=f%3D1&l3=f%3D2&lm2=2:0.7:1:0:1:&lm3=10:0.5:1:0:1:&nb=11:1:1:1;3:1:1:0.2,0.3&la=3';   // drei Fraktal-Ebenen und zwei Einstellungsebenen: genug Text, dass der Abschnitt rollen muss
  const langerStand = () => { cy.visitApp(LANG); cy.alleEbenenFertig(); };
  const dialogPasst = (hoehe) => {
    cy.get('#poster').should($m => expect($m[0].scrollHeight, 'der Dialog selbst rollt nicht').to.be.at.most($m[0].clientHeight + 1));
    for (const id of ['posterTitle', 'cropScreen', 'posterRes', 'posterFmt', 'posterStart', 'posterCancel']) {
      cy.get('#' + id).should($e => { const r = rect($e); expect(r.top, id + ' oben im Bild').to.be.at.least(0); expect(r.bottom, id + ' unten im Bild').to.be.at.most(hoehe); });
    }
  };
  const textGanzDa = () => cy.get('#metaText').should($t => expect($t[0].scrollHeight, 'das Textfeld zeigt den ganzen Text (nicht zusammengedrückt)').to.be.at.most($t[0].clientHeight + 2));
  const abschnittRollt = () => {
    cy.get('#posterMeta').should($m => expect($m[0].scrollHeight, 'der Metadaten-Abschnitt hat etwas zu rollen').to.be.greaterThan($m[0].clientHeight + 20));
    cy.get('#posterMeta').scrollTo('bottom', { ensureScrollable: true });
    cy.get('#posterMeta').should($m => expect($m[0].scrollTop, 'gerollt').to.be.greaterThan(0));
    cy.get('#posterMeta').then($m => cy.get('#metaText').should($t => expect(rect($t).bottom, 'das Ende des Textes ist im Abschnitt zu sehen').to.be.at.most(rect($m).bottom + 1)));
    cy.get('#posterMeta').scrollTo('top');
  };

  it('Rollen: am Schreibtisch nimmt der Metadaten-Abschnitt den Rest, zeigt das ganze Textfeld und rollt bis zum Ende; Knöpfe und Regler bleiben stehen', () => {
    langerStand();
    cy.get('#save').click(); cy.get('#poster').should('be.visible');
    cy.get('#metaText').invoke('val').should('match', /"l3": \{/);   // langer Text: drei Ebenen und Nachbearbeitung
    dialogPasst(720); textGanzDa(); abschnittRollt();
    cy.get('#posterMeta').scrollTo('bottom');
    dialogPasst(720);   // gerollt im Abschnitt: Titel, Regler und Knöpfe stehen weiter an ihrem Platz
    cy.get('#posterMeta').should($m => { const r = rect($m); expect(r.top, 'der Abschnitt beginnt unter der Infozeile').to.be.greaterThan(100); expect(r.bottom, 'und endet über den Knöpfen').to.be.lessThan(700); });
    cy.get('#posterCancel').click();
  });

  it('Rollen: mehr Ebenen, mehr Text – der Abschnitt wächst mit, das Textfeld bleibt ganz da', () => {
    cy.get('#save').click(); cy.get('#poster').should('be.visible');
    cy.get('#posterMeta').then($m => {
      const ohne = $m[0].scrollHeight;
      cy.get('#posterCancel').click();
      cy.visitApp('mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:&nb=11:1:1:1&la=2'); cy.alleEbenenFertig();   // eine zweite Fraktal-Ebene und eine Einstellungsebene: der Text wird länger
      cy.get('#save').click(); cy.get('#poster').should('be.visible');
      cy.get('#metaText').invoke('val').should('match', /"l2": \{/);   // die Ebene als verschachteltes Objekt
      textGanzDa();
      cy.get('#posterMeta').should($n => expect($n[0].scrollHeight, 'länger mit Ebenen').to.be.greaterThan(ohne));
    });
    cy.get('#posterCancel').click();
  });

  for (const [w, h] of [[458, 908], [390, 844], [800, 600], [1024, 640]]) {
    it(`Rollen bei ${w} × ${h}: der Dialog passt, das Textfeld ist ganz da, der Abschnitt rollt bis zum Ende`, () => {
      cy.viewport(w, h);
      langerStand();
      cy.get(w < 640 ? '#tabSave' : '#save').click({ force: true }); cy.get('#poster').should('be.visible');
      dialogPasst(h); textGanzDa(); abschnittRollt();
      cy.get('#posterCancel').click();
    });
  }

  it('Rollen am niedrigen Schirm: der Abschnitt behält seine Mindesthöhe und bleibt bis zum Ende rollbar', () => {
    cy.viewport(390, 480);
    langerStand();
    cy.get('#tabSave').click(); cy.get('#poster').should('be.visible');
    dialogPasst(480);
    cy.get('#posterMeta').should($m => expect($m[0].clientHeight, 'Mindesthöhe').to.be.at.least(60));
    textGanzDa(); abschnittRollt();
    cy.get('#posterCancel').click();
  });

  it('Rollen: der Wechsel zu JPEG ändert nur den Hinweis, der Abschnitt bleibt rollbar; Wiederöffnen beginnt oben', () => {
    langerStand();
    cy.get('#save').click(); cy.get('#poster').should('be.visible');
    cy.get('#posterMeta').scrollTo('bottom', { ensureScrollable: true });
    cy.pickOption('posterFmt', 'jpg');
    cy.get('#metaWo').invoke('text').should('match', /JPEG|Kommentar/);
    textGanzDa(); abschnittRollt();
    cy.get('#posterCancel').click();
    cy.get('#save').click(); cy.get('#poster').should('be.visible');
    cy.get('#posterMeta').should($m => expect($m[0].scrollTop, 'wieder oben').to.eq(0));
    cy.pickOption('posterFmt', 'png');
    cy.get('#posterCancel').click();
  });
  // Am Handy trifft ein Finger den kleinen Griff oft nicht. Solange der Rahmen steht, darf darum nichts an die
  // Leinwand durchkommen: kein Verschieben, kein Kneifen. Mit dem Zeiger fasst der Rahmen nur an sich selbst an;
  // erst bei grobem Zeiger (Finger) verschiebt ihn auch ein Zug in der abgedunkelten Fläche.
  it('der Ausschnittrahmen fängt Berührungen ab: die Ansicht bleibt stehen, der Rahmen wird am Rahmen angefasst', () => {
    cy.viewport(375, 812);
    cy.visitApp('mode=mandel'); cy.waitRender();
    cy.get('#tabSave').click();
    cy.get('#cropPick').click();
    cy.get('#cropBox').should('be.visible');
    cy.document().then(doc => {
      const el = doc.elementFromPoint(40, 120);
      expect(el && el.id, 'neben dem Rahmen liegt die Maske, nicht die Leinwand').to.eq('crop');
    });
    cy.hashParams().then(h => cy.wrap(h.get('re')).as('reVorher'));
    cy.get('#cropBox').then($b => {
      const links = $b[0].getBoundingClientRect().left, breit = $b[0].getBoundingClientRect().width;
      cy.get('#crop').trigger('pointerdown', { pointerId: 7, pointerType: 'touch', button: 0, buttons: 1, clientX: 40, clientY: 120, force: true });
      cy.get('#crop').trigger('pointermove', { pointerId: 7, pointerType: 'touch', buttons: 1, clientX: 90, clientY: 120, force: true });
      cy.get('#crop').trigger('pointerup', { pointerId: 7, pointerType: 'touch', button: 0, buttons: 0, clientX: 90, clientY: 120, force: true });
      cy.get('@reVorher').then(vorher => cy.expectHash('re', r => expect(r, 'die Ansicht blieb stehen').to.eq(vorher)));
      cy.expectHash('z', z => expect(parseFloat(z), 'kein Zoom').to.eq(1));
      cy.get('#cropBox').should($n => {
        const r = $n[0].getBoundingClientRect();
        expect(r.left, 'mit dem Zeiger fasst nur der Rahmen an: er bleibt stehen').to.be.closeTo(links, 1);
        expect(r.width, 'und bleibt gleich groß').to.be.closeTo(breit, 1);
      });
    });
    cy.get('#cropCancel').click();
  });
  // Der Knopf zum Rendern muss immer zu sehen sein, ohne Rollen. Zwischen Titel und Knopfzeile liegt dafür ein
  // rollender Rumpf; die Karte bleibt in der Höhe des Schirms, statt über seinen Rand hinauszuwachsen.
  it('der Speichern-Dialog passt in die Höhe: der Knopf zum Rendern steht immer im Bild', () => {
    for (const [b, h] of [[375, 812], [375, 667], [390, 560], [1280, 480]]) {
      cy.viewport(b, h);
      cy.visitApp('mode=mandel'); cy.waitRender();
      cy.get(b < 800 ? '#tabSave' : '#save').click();
      cy.get('#poster').should('be.visible');
      cy.get('#posterStart').should($k => {
        const r = $k[0].getBoundingClientRect();
        expect(r.bottom, `Rendern steht bei ${b}x${h} im Bild`).to.be.at.most(h + 0.5);
        expect(r.top, 'und nicht über dem oberen Rand').to.be.at.least(-0.5);
      });
      cy.get('#poster .modal-card').should($c => expect($c[0].getBoundingClientRect().height, 'die Karte bleibt in der Höhe des Schirms').to.be.at.most(h + 0.5));
      cy.get('#posterCancel').click();
    }
  });
});
// Feine Linien an den Kachelgrenzen: der Farbpass liest Nachbarpixel (Palettenbreite, Relief, Weichzeichnen, Licht,
// Schatten). An einer Kachelkante fehlten sie, adaptiv standen dort sogar alte Werte aus dem Bildschirmpuffer — im Bild
// eine dünne Linie längs jeder Kachelgrenze. Jetzt hat jede Kachel ringsum einen Rand, der wieder wegfällt.
describe('Bild speichern: die Kacheln fügen sich ohne Naht zusammen', () => {
  const L = 'mode=julia&re=1.05513090575635241126866132236458&im=-0.00903018044732939421468352256886&z=4.047223184e%2B0&jre=-0.626&jim=0&it=100000&pal=cobalt&den=0.0400&off=0.921&map=6&tx=14&ca=5.109375&f=37&pp=0.000&pq=0&dr=90&xf=z%5E7+-+z%5E2+%2B+c';
  for (const [name, glaettung, stufe] of [['adaptiv', '&aa=2&aam=adaptive&aat=0.003&aax=64&aas=0.45', 7], ['Raster', '&aa=2&aam=grid', 9]]) {
    it('Glättung ' + name + ': keine Linie an den Kachelgrenzen', () => {
      cy.task('clearDownloads');
      cy.visitApp(L + glaettung, { aa: '' });
      cy.get('#save').click();
      cy.setRange('posterRes', stufe);
      cy.pickOption('posterFmt', 'png');
      cy.get('#posterStart').click();
      cy.get('#posterDl', { timeout: 300000 }).should('be.visible').click();
      cy.task('waitForDownload', { pattern: '[.]png$', timeoutMs: 60000 }).then(files => cy.task('pngNaht', { file: files[0] }).then(n => {
        // mit dem Fehler hob sich die Spalte an der Kachelgrenze zehnfach vom Median ab; das Fraktal selbst bleibt unter dem Doppelten
        expect(n.spalte.faktor, 'Spalte ' + n.spalte.stelle).to.be.below(2.5);
        expect(n.zeile.faktor, 'Zeile ' + n.zeile.stelle).to.be.below(2.5);
      }));
    });
  }
});
// Die Kachelung ist unsichtbar: jedes Pixel entsteht aus seinem Index im ganzen Bild (Koordinate, Zufallsversatz der
// Proben, Raster des Leuchtens), und der Rand deckt alles, was Nachbarpixel liest. Derselbe Export mit kleinen und mit
// großen Kacheln ist deshalb bitgleich.
describe('Bild speichern: kleine und große Kacheln ergeben dasselbe Bild', () => {
  const EIGEN = 'mode=julia&re=1.05513090575635241126866132236458&im=-0.00903018044732939421468352256886&z=4.047223184e%2B0&jre=-0.626&jim=0&it=20000&pal=cobalt&den=0.0400&off=0.921&map=6&tx=14&ca=5.109375&f=37&pp=0.000&pq=0&dr=90&xf=z%5E7+-+z%5E2+%2B+c';
  const J = 'mode=julia&jre=-0.390541&jim=0.586788&it=400&re=0&im=0&z=1.2&map=24&ca=off';
  const exportieren = (link, kachel) => {
    cy.task('clearDownloads');
    cy.visitApp(link, { aa: '', onBeforeLoad(w) { w.__exportKachel = kachel; } });
    cy.get('#save').click();
    cy.setRange('posterRes', 4);   // 1000 px breit: mit 128er-Kacheln rund vierzig Kacheln
    cy.pickOption('posterFmt', 'png');
    cy.get('#posterStart').click();
    cy.get('#posterDl', { timeout: 300000 }).should('be.visible').click();
    return cy.task('waitForDownload', { pattern: '[.]png$', timeoutMs: 60000 }).then(files => files[0]);
  };
  for (const [name, link] of [
    ['eigene Formel, feste Glättung (Palettenbreite liest Nachbarn)', EIGEN + '&aa=2&aam=grid'],
    ['eigene Formel, adaptive Glättung (Zufallsversatz der Proben)', EIGEN + '&aa=2&aam=adaptive&aat=0.003&aax=16&aas=0.45'],
    ['Leuchten (verkleinertes Bild, Radius 16)', J + '&aa=1&nb=29:1:1:0.5,16,1.2,1,1,1'],
    ['Relief mit Schatten (Nachbarn bis zur Schattenlänge)', 'mode=mandel&re=-0.7435&im=0.1314&z=120&it=800&ca=off&aa=1&map=6&mt=2&mg=0.8&mr=1.5&mhl=0.25&mhs=0.3&mn=2.5&ms=1&ml=16'],
  ]) {
    it(name, () => {
      exportieren(link, 512).then(gross => cy.readFile(gross, null).then(buf => cy.writeFile('cypress/kachel-gross.png', buf, null)));
      exportieren(link, 128).then(klein => cy.task('pngGleich', { a: 'cypress/kachel-gross.png', b: klein }).then(g => {
        expect(g.fehler, 'gleiche Größe').to.equal(undefined);
        expect(g.anders, 'abweichende Pixel (von ' + g.pixel + ', höchstens um ' + g.max + ')').to.equal(0);
      }));
    });
  }
});
