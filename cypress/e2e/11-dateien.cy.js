import { DEFAULT_RE } from '../support/commands';

describe('Dateien: Parameter und Bilder speichern und wieder öffnen', () => {
  beforeEach(() => {
    cy.task('clearDownloads');
    cy.visitApp();
  });

  it('fractalState liefert den vollständigen Zustand', () => {
    cy.appState().then(s => {
      expect(s.app).to.eq('Fraktal-Renderer');
      expect(s.version).to.eq(1);
      expect(s.params).to.contain('mode=mandel');
      expect(parseFloat(new URLSearchParams(s.params).get('re'))).to.be.closeTo(DEFAULT_RE, 1e-9);
      expect(s.extra).to.have.all.keys('aa', 'aaMode', 'aaTol', 'aaMax', 'aaSigma', 'palFilter', 'palFilterK', 'cycle', 'bla', 'quality');
      expect(s.extra.aa).to.eq(1);
      expect(new Date(s.saved).getTime()).to.be.greaterThan(0);
    });
  });

  it('fractalState.set übernimmt Parameter und Technik', () => {
    cy.window().then(win => win.fractalState.set({ app: 'Fraktal-Renderer', version: 1, params: 'mode=mandel&re=-1&im=0.2&z=4&p=3&pal=2', extra: { aa: 2 } }));
    cy.waitRender();
    cy.get('#power').should('have.value', '3');
    cy.get('#palette').should('have.value', '2');
    cy.get('#zoomRead').should('have.text', 'Zoom 4,0×');
    cy.get('#coords').should('contain.text', 'Re -1,000').and('contain.text', 'Im 0,200');
    cy.get('#aaSel').should('have.value', '2');
    cy.expectHash('p', '3');
  });

  it('fractalState.set lehnt Unbrauchbares ab, ohne den Zustand zu verändern', () => {
    cy.window().then(win => {
      expect(win.fractalState.set({ foo: 1 })).to.be.false;
      expect(win.fractalState.set(null)).to.be.false;
    });
    cy.get('#power').should('have.value', '2');
    cy.expectHash('re', re => expect(parseFloat(re)).to.be.closeTo(DEFAULT_RE, 1e-9));
  });

  it('Dateien tragen die Farben in voller Form, auch bei Vorgaben', () => {
    cy.visitApp('mode=mandel&pal=woodcut&map=15&p2=field-lines');                 // Holzschnitt, Fluchtwinkel mit Feldlinien
    cy.appState().then(s => {
      expect(s.colors.palette).to.include({ name: 'Holzschnitt', preset: 'woodcut', cyclic: true });
      expect(s.colors.palette.stops).to.have.length(4);
      expect(s.colors.palette.stops[0]).to.deep.eq({ p: 0.21, c: '#1a1714' });
      expect(s.colors.palette2).to.include({ name: 'Feldlinien', preset: 'field-lines', art: 'verlauf', muster: 'linien', n: 6 });
      expect(s.colors.palette2.a.stops).to.have.length(8);
    });
    cy.visitApp();                                                  // Klassisch: die Formel mit ihren Werten
    cy.appState().then(s => expect(s.colors.palette).to.deep.include({ name: 'Klassisch', preset: 'classic', a: [0.5, 0.5, 0.5], d: [0.5, 0.6, 0.7] }));
  });

  it('eine Vorgabe mit anderen Werten als in der Datei: die gespeicherten Farben gelten, unverändert bleibt die Vorgabe', () => {
    cy.visitApp('mode=mandel&pal=woodcut&map=15&p2=field-lines');
    cy.appState().then(s => {
      cy.window().then(win => win.fractalState.set(JSON.parse(JSON.stringify(s))));   // unverändert: Vorgaben bleiben
      cy.waitRender();
      cy.expectHash('pal', 'woodcut'); cy.expectHash('p2', 'field-lines'); cy.expectHash('cp', null); cy.expectHash('cp2', null);
      const m = JSON.parse(JSON.stringify(s));                      // so, als hätte eine spätere Fassung die Vorgaben geändert
      m.colors.palette.stops[0].c = '#ff0000'; m.colors.palette2.n = 9;
      cy.window().then(win => win.fractalState.set(m));
      cy.waitRender();
      cy.get('#palette').should('have.value', 'y:tmp');
      cy.get('#palette option:selected').should('have.text', 'Feldlinien (nicht gespeichert)');
      cy.expectHash('cp2', v => expect(v).to.contain('~v~linien,9,'));
      cy.get('#palArt [data-art="1"]').click({ force: true });      // die gewöhnliche Palette ebenso
      cy.get('#palette option:selected').should('have.text', 'Holzschnitt (nicht gespeichert)');
      cy.expectHash('cp', v => expect(v).to.contain(':ff0000'));
    });
  });

  it('„Parameter speichern“ legt eine JSON-Datei ab, die sich über „Datei öffnen“ wieder laden lässt', () => {
    cy.pickOption('power', 4);
    cy.expectHash('p', '4');
    cy.get('#paramsSave').click();
    cy.task('waitForDownload', { pattern: '^fraktal-mandel-.*\\.json$' }).then(files => {
      expect(files, 'JSON im Download-Ordner').to.have.length.greaterThan(0);
      cy.readFile(files[0]).then(json => {
        expect(json.app).to.eq('Fraktal-Renderer');
        expect(json.params).to.contain('p=4');
      });
      cy.rerender(() => cy.pickOption('power', 2));
      cy.get('#fileInput').selectFile(files[0], { force: true });
      cy.waitRender();
      cy.get('#power').should('have.value', '4');
      cy.expectHash('p', '4');
    });
  });

  it('Ende zu Ende: das gespeicherte Bild stellt Ansicht und Aussehen wieder her', () => {
    // Einstellungen quer durch alle Bereiche, dann speichern, alles verstellen, die Datei laden und vergleichen.
    cy.rerender(() => cy.pickOption('power', 3));
    cy.pane('farbe');
    cy.pickOption('palette', '2');
    cy.pickOption('mapping', '1');
    cy.pickOption('glowMode', '2');
    cy.pickOption('interior', '1');
    cy.setRange('density', 700);
    cy.setRange('offset', 300);
    cy.pane('qualitaet');
    cy.get('#palFilter').check({ force: true });
    cy.rerender(() => cy.pickOption('aaSel', 2));
    cy.waitRender();
    cy.appState().then(vorher => {
      cy.wait(400);
      cy.shotStats('e2e-vorher').then(a => {
        cy.get('#save').click();
        cy.get('#posterStart').click();
        cy.get('#modal', { timeout: 60000 }).should('be.visible');
        cy.get('#dl').click();
        cy.get('#closeModal').click();
        cy.task('waitForDownload', { pattern: 'fraktal-mandel-.*[.]png', timeoutMs: 30000 }).then(files => {
          expect(files, 'PNG im Download-Ordner').to.have.length.greaterThan(0);
          cy.get('#reset').click();            // alles verstellen, damit nichts zufällig gleich bleibt
          cy.waitRender();
          cy.pane('farbe');
          cy.pickOption('palette', '5');
          cy.rerender(() => cy.pickOption('power', 6));
          cy.get('#fileInput').selectFile(files[0], { force: true });   // dieselbe Datei wieder laden
          cy.get('#power').should('have.value', '3');                   // erst wenn die Datei übernommen ist
          cy.waitRender();
          cy.appState().then(nachher => {
            expect(nachher.params, 'Link-Parameter wiederhergestellt').to.eq(vorher.params);
            expect(nachher.extra, 'Technik wiederhergestellt').to.deep.eq(vorher.extra);
          });
          cy.wait(400);
          cy.shotStats('e2e-nachher').then(b => {
            cy.task('pngDiff', { a: a.file, b: b.file, region: { x0: 0.02, y0: 0.08, x1: 0.66, y1: 0.9 } }).then(d => {
              expect(d.error, 'gleiche Größe').to.be.undefined;
              expect(d.meanDiff, 'Bild praktisch identisch').to.be.lessThan(1.5);
              expect(d.changedShare, 'kaum veränderte Pixel').to.be.lessThan(0.05);
            });
          });
        });
      });
    });
  });

  it('„Bild speichern“ erzeugt ein PNG mit eingebetteten Parametern, das die Ansicht wiederherstellt', () => {
    cy.pickOption('power', 5);
    cy.expectHash('p', '5');
    cy.get('#save').click();
    cy.get('#posterStart').click();   // Bildschirmgröße ist die Vorgabe im Speichern-Dialog
    // ohne Download-Schnittstelle des Artefakts zeigt die App das Bild in einem Dialog mit Download-Link
    cy.get('#modal', { timeout: 60000 }).should('be.visible');
    cy.get('#shot').invoke('attr', 'src').should('match', /^blob:/);
    cy.get('#dl').invoke('attr', 'download').should('match', /^fraktal-mandel-.*\.png$/);
    cy.get('#dl').click();
    cy.get('#closeModal').click();
    cy.get('#modal').should('not.be.visible');
    cy.task('waitForDownload', { pattern: '^fraktal-mandel-.*\\.png$' }).then(files => {
      expect(files, 'PNG im Download-Ordner').to.have.length.greaterThan(0);
      cy.readFile(files[0], null).then(buf => {
        expect(buf.slice(0, 8).toString('hex'), 'PNG-Signatur').to.eq('89504e470d0a1a0a');
        expect(buf.readUInt32BE(16), 'Breite = Canvas').to.be.greaterThan(400);
      });
      cy.task('pngParams', { file: files[0] }).then(text => {
        expect(text, 'iTXt-Chunk „FractalRenderer“').to.be.a('string');
        const j = JSON.parse(text);
        expect(j.app).to.eq('Fraktal-Renderer');
        expect(j.params).to.contain('p=5');
        expect(j.colors.palette, 'die Palette mit allen Werten im Bild').to.deep.include({ name: 'Klassisch', preset: 'classic', a: [0.5, 0.5, 0.5] });
      });
      cy.rerender(() => cy.pickOption('power', 2));
      cy.get('#fileInput').selectFile(files[0], { force: true });
      cy.waitRender();
      cy.get('#power').should('have.value', '5');
    });
  });

  it('„Link …“: Dialog zeigt den vollständigen Link, ein eingefügter Link wird übernommen', () => {
    cy.pickOption('power', 4);
    cy.expectHash('p', '4');
    cy.get('#linkOpen').click();
    cy.get('#linkDlg').should('be.visible');
    cy.get('#linkText').invoke('val').should('match', /^http:\/\/localhost:8765\/#mode=mandel&re=.*&p=4/);
    cy.get('#linkText').clear().type('http://irgendwo/#mode=mandel&re=-0.5&im=0.1&z=3&pal=2&p=3', { parseSpecialCharSequences: false });
    cy.get('#linkApply').click();
    cy.get('#linkDlg').should('not.be.visible');
    cy.waitRender();
    cy.get('#power').should('have.value', '3');
    cy.get('#palette').should('have.value', '2');
    cy.get('#zoomRead').should('have.text', 'Zoom 3,0×');
    cy.get('#linkOpen').click();
    cy.get('#linkText').clear().type('quatsch');
    cy.get('#linkApply').click();
    cy.get('#state').invoke('text').should('match', /Kein gültiger Link/);
    cy.get('#linkDlg').should('be.visible');
    cy.get('#linkClose').click();
    cy.get('#linkDlg').should('not.be.visible');
  });

  it('JSON-Datei per Drag & Drop auf das Bild ziehen', () => {
    const state = { app: 'Fraktal-Renderer', version: 1, params: 'mode=julia&re=0&im=0&z=1&jre=-0.8&jim=0.156&pal=1', extra: {} };
    cy.get('#stage').selectFile({ contents: Cypress.Buffer.from(JSON.stringify(state)), fileName: 'zustand.json', mimeType: 'application/json' }, { action: 'drag-drop' });
    cy.waitRender();
    cy.get('#family').should('have.value', 'julia');
    cy.get('#palette').should('have.value', '1');
    cy.expectHash('mode', 'julia');
    cy.expectHash('jre', '-0.8');
  });

  it('eine fremde Datei wird abgelehnt, der Zustand bleibt', () => {
    cy.get('#fileInput').selectFile({ contents: Cypress.Buffer.from('kein gültiger Zustand'), fileName: 'notiz.json', mimeType: 'application/json' }, { force: true });
    cy.waitRender(/Fertig|keine|nicht|Keine/, 10000);
    cy.get('#family').should('have.value', 'mandel');
    cy.expectHash('re', re => expect(parseFloat(re)).to.be.closeTo(DEFAULT_RE, 1e-9));
  });

  it('„Datei öffnen …“ öffnet die Dateiauswahl', () => {
    cy.window().then(win => cy.stub(win.HTMLInputElement.prototype, 'click').as('pick'));
    cy.get('#fileOpen').click();
    cy.get('@pick').should('have.been.called');
  });

  // Ein Poster entsteht anders als die Bildschirmansicht: Die Datei wird streifenweise geschrieben, ohne je ein Bild in
  // voller Größe anzulegen, und die Parameter kommen beim Schreiben mit hinein statt nachträglich. Dieser Weg braucht
  // seinen eigenen Test, sonst deckt ihn keiner ab.
  it('Poster: die streifenweise geschriebene Datei trägt die Parameter und stellt die Ansicht wieder her', () => {
    cy.pickOption('power', 6);
    cy.expectHash('p', '6');
    cy.get('#save').click();
    cy.setRange('posterRes', 1);                               // kleinste Stufe über dem Bildschirm: schnell gerechnet
    cy.get('#posterResVal').invoke('text').should('match', /\d+ × \d+ px/);
    cy.get('#posterStart').click();
    cy.get('#posterState', { timeout: 120000 }).invoke('text').should('match', /^(Fertig|Gespeichert)/);
    cy.get('#posterDl').should('not.have.attr', 'hidden');
    cy.get('#posterDl').invoke('attr', 'download').should('match', /^poster-mandel-\d+x\d+-.*\.png$/);
    cy.get('#posterDl').click();
    cy.task('waitForDownload', { pattern: '^poster-mandel-.*\\.png$' }).then(files => {
      expect(files, 'Poster im Download-Ordner').to.have.length.greaterThan(0);
      cy.readFile(files[0], null).then(buf => {
        expect(buf.slice(0, 8).toString('hex'), 'PNG-Signatur').to.eq('89504e470d0a1a0a');
        expect(buf.readUInt32BE(16), 'Breite laut IHDR').to.be.greaterThan(0);
      });
      cy.task('pngParams', { file: files[0] }).then(text => {
        expect(text, 'iTXt-Chunk im streifenweise geschriebenen PNG').to.be.a('string');
        expect(JSON.parse(text).params).to.contain('p=6');
      });
      cy.get('#posterCancel').click();
      cy.rerender(() => cy.pickOption('power', 2));
      cy.get('#fileInput').selectFile(files[0], { force: true });
      cy.waitRender();
      cy.get('#power').should('have.value', '6');
    });
  });

  it('JPEG: auch das kleinere Format trägt die Parameter und lässt sich wieder öffnen', () => {
    cy.pickOption('power', 3);
    cy.get('#save').click();
    cy.pickOption('posterFmt', 'jpg');
    cy.setRange('posterRes', 1);
    cy.get('#posterStart').click();
    cy.get('#posterState', { timeout: 120000 }).invoke('text').should('match', /^(Fertig|Gespeichert)/);
    cy.get('#posterDl').invoke('attr', 'download').should('match', /\.jpg$/);
    cy.get('#posterDl').click();
    cy.task('waitForDownload', { pattern: '^poster-mandel-.*\\.jpg$' }).then(files => {
      expect(files, 'JPEG im Download-Ordner').to.have.length.greaterThan(0);
      cy.readFile(files[0], null).then(buf => expect(buf.slice(0, 2).toString('hex'), 'JPEG-Signatur').to.eq('ffd8'));
      cy.get('#posterCancel').click();
      cy.rerender(() => cy.pickOption('power', 5));
      cy.get('#fileInput').selectFile(files[0], { force: true });
      cy.waitRender();
      cy.get('#power').should('have.value', '3');
    });
  });

  it('ein Bild ohne Parameter und eine beschädigte Datei werden abgelehnt, der Zustand bleibt', () => {
    // 1 × 1 px PNG ohne unseren Textblock, erzeugt im Fenster: ein ganz normales Bild von woanders
    cy.window().then(win => new Cypress.Promise(res => {
      const c = win.document.createElement('canvas'); c.width = c.height = 1;
      c.getContext('2d').fillRect(0, 0, 1, 1);
      c.toBlob(b => b.arrayBuffer().then(a => res(Cypress.Buffer.from(new Uint8Array(a)))), 'image/png');
    })).then(png => {
      cy.get('#fileInput').selectFile({ contents: png, fileName: 'fremdes-bild.png', mimeType: 'image/png' }, { force: true });
      cy.get('#state').invoke('text').should('contain', 'keine Fraktal-Parameter');
    });
    cy.get('#power').should('have.value', '2');
    // PNG-Signatur, danach Unsinn: darf nicht durchschlagen
    const kaputt = Cypress.Buffer.concat([Cypress.Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Cypress.Buffer.from('völlig kaputt, kein gültiger Block')]);
    cy.get('#fileInput').selectFile({ contents: kaputt, fileName: 'halb.png', mimeType: 'image/png' }, { force: true });
    cy.get('#state').invoke('text').should('match', /keine Fraktal-Parameter|konnte nicht/);
    cy.get('#family').should('have.value', 'mandel');
    cy.expectHash('re', re => expect(parseFloat(re)).to.be.closeTo(DEFAULT_RE, 1e-9));
  });

  it('die Technik-Einstellungen fahren in der Datei mit: Verfahren und getippte Werte kommen zurück', () => {
    cy.pane('qualitaet');
    cy.pickOption('aaModeSel', 'fast');
    cy.get('#aaTolVal').clear().type('2,5{enter}');             // Wert tippen statt schieben
    cy.get('#aaTolVal').should('have.value', '2,5 %');
    cy.get('#paramsSave').click();
    cy.task('waitForDownload', { pattern: '^fraktal-mandel-.*\\.json$' }).then(files => {
      cy.readFile(files[0]).then(json => {
        expect(json.extra.aaMode, 'Verfahren in der Datei').to.eq('fast');
        expect(json.extra.aaTol, 'getippte Toleranz in der Datei').to.be.closeTo(0.025, 0.0005);
      });
      cy.pickOption('aaModeSel', 'grid');
      cy.get('#fileInput').selectFile(files[0], { force: true });
      cy.waitRender();
      cy.get('#aaModeSel').should('have.value', 'fast');
      cy.get('#aaTolVal').should('have.value', '2,5 %');
    });
  });
});
