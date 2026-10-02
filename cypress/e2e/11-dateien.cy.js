import { DEFAULT_RE, IMAGE_REGION } from '../support/commands';

describe('Dateien: Parameter und Bilder speichern und wieder öffnen', () => {
  beforeEach(() => {
    cy.task('clearDownloads');
    cy.visitApp();
  });

  it('fractalState liefert den vollständigen Zustand', () => {
    cy.appState().then(s => {
      expect(s.app).to.eq('Fraktal-Renderer');
      expect(s.version).to.eq(2);
      expect(s.params, 'die Parameter als lesbares Objekt').to.be.an('object').that.includes({ mode: 'mandel', aa: '1', aam: 'grid' });   // Glättung je Ebene im Parametersatz
      expect(parseFloat(s.params.re)).to.be.closeTo(DEFAULT_RE, 1e-9);
      expect(s.params.pv, 'die Palette mit ihren Werten').to.match(/^~q~/);
      expect(s).not.to.have.any.keys('extra', 'colors');   // alles steht in den Parametern
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
    cy.window().then(win => win.fractalState.set({ params: { mode: 'mandel', re: '-1', im: '0.2', z: '4', p: '4', aa: '2', aam: 'grid' } }));   // Version 2: die Parameter als Objekt
    cy.waitRender();
    cy.get('#power').should('have.value', '4'); cy.get('#aaSel').should('have.value', '2'); cy.expectHash('aa', '2');
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
      expect(s).not.to.have.property('colors');   // die Werte stehen im Link: pv (gewöhnliche Palette), pv2 (zweite Palette), ohne Namen
      expect(s.params, 'kein Name im Link').not.to.have.property('pal');
      expect(s.params.pv, 'Stützstellen der Vorgabe: zyklisch, erste bei 0,21').to.match(/^~1~0\.210:1a1714,/);
      expect(s.params.pv.split('~')[2].split(',')).to.have.length(4);
      expect(s.params, 'auch die zweite Palette ohne Namen').not.to.have.property('p2');
      expect(s.params.pv2, 'die zweite Palette mit allen Werten').to.match(/^~v~linien,6,/);
    });
    cy.visitApp();                                                  // Klassisch: die Formel mit ihren Werten, ohne Kennung (Vorgabe 0)
    cy.appState().then(s => { expect(s.params.pv).to.eq('~q~0.5,0.5,0.5,0.5,0.5,0.5,1,1,1,0.5,0.6,0.7'); expect(s.params).not.to.have.any.keys('pal', 'cp'); });
  });

  // Der Link beschreibt die Ansicht vollständig (19.09.2026): Paletten mit ihren Werten (pv, pv2, ppv; seit 24.09.2026 ohne Namen:
  // welche Vorgabe oder welches eigene Schema es ist, folgt beim Laden aus den Werten, sonst heißt sie „Aus dem Link“),
  // die Glättung jeder Ebene in ihrem Parametersatz. Die Datei ist derselbe Inhalt als lesbares Objekt, ohne extra und colors.
  const LINKSCHEMA = 'pv=' + encodeURIComponent('~1~0:ff0000,0.5:00ff00,1:0000ff');   // eine eigene Palette im Link: drei Stützstellen, zyklisch, ohne Namen
  const KLASSISCH = '~q~0.5,0.5,0.5,0.5,0.5,0.5,1,1,1,0.5,0.6,0.7';   // die Werte der Vorgabe „Klassisch“, wie sie im Link stehen
  const setze = m => { cy.window().then(win => win.fractalState.set(JSON.parse(JSON.stringify(m)))); cy.waitRender(); };

  it('der Link trägt alles: Werte der Palette (pv, ohne Namen), Glättung, Nachbearbeitung', () => {
    cy.visitApp('mode=mandel&' + LINKSCHEMA + '&nb=11:1:1:1');
    cy.appState().then(s => {
      expect(s.params.pv, 'die eigene Palette mit ihren Werten, ohne Namen').to.match(/^~1~0\.000:ff0000,/);
      expect(s.params).not.to.have.property('cp');   // kein zweiter Weg mit Namen
      expect(s.params).to.include.keys('aa', 'aam', 'aat', 'aax', 'aas', 'nb');
      expect(s).not.to.have.any.keys('extra', 'colors');
      expect(JSON.stringify(s)).not.to.match(/"preset"|%3[AD]|%2C/);   // lesbar: keine kodierten Zeichen
    });
    cy.visitApp('mode=mandel&pal=atoll');
    cy.appState().then(s => { expect(s.params, 'kein Name im Link').not.to.have.property('pal'); expect(s.params.pv, 'die Werte der Vorgabe').to.match(/^~[1q]~/); expect(s.params).not.to.have.property('cp'); });
  });

  it('die Werte im Link gelten vor der Vorgabe: andere Werte werden ein Schema „Aus dem Link“, gleiche Werte stellen die Vorgabe her', () => {
    cy.appState().then(s => {
      const m = JSON.parse(JSON.stringify(s)); m.params.pv = '~q~0.5,0.5,0.5,0.5,0.5,0.5,1,1,1,0.1,0.2,0.3';   // so, als hätte eine spätere Fassung „Klassisch“ geändert
      setze(m);
      cy.expectHash('pv', v => expect(v, 'die Werte des Links, ohne Namen').to.match(/^~q~.*0\.1,0\.2,0\.3$/));
      cy.get('#palette option:selected').should('have.text', 'Aus dem Link (nicht gespeichert)');
      const k = JSON.parse(JSON.stringify(s)); k.params.pv = KLASSISCH;   // dieselben Werte wie die Vorgabe: die Vorgabe
      setze(k);
      cy.expectHash('cp', null); cy.get('#palette').should('have.value', '0');
      const ohne = JSON.parse(JSON.stringify(s)); delete ohne.params.pv;   // ohne Werte: die Kennung der Vorgabe genügt
      setze(ohne);
      cy.expectHash('cp', null); cy.get('#palette').should('have.value', '0');
    });
  });

  it('jede Ebene trägt ihre Glättung im eigenen Parametersatz; ohne Angabe gilt die Browser-Einstellung, für jede Ebene gleich', () => {
    cy.visitApp('mode=mandel&aa=3&aam=grid&l2=' + encodeURIComponent('f=1&aa=2&aam=fast&aat=0.02&aax=64&aas=0.45') + '&lm2=2:0.7:1:0:1:&la=2', { aa: '1' });
    cy.alleEbenenFertig();
    cy.pane('qualitaet'); cy.get('#aaModeSel').should('have.value', 'fast'); cy.get('#aaTolVal').should('have.value', '2,0 %');   // Ebene 2 aus l2
    cy.get('#stWahl1').click(); cy.wait(800);
    cy.get('#aaSel').should('have.value', '3'); cy.get('#aaModeSel').should('have.value', 'grid');   // Ebene 1 aus dem Link, nicht aus dem Browser (dort 1)
    cy.expectHash('lm2', '2:0.7:1:0:1:');   // kein Anhang mehr im Mischsatz
    cy.expectHash('l2', v => { const l2 = new URLSearchParams(v); expect(l2.get('aa'), 'Glättung der Ebene 2 in l2').to.eq('2'); expect(l2.get('aam')).to.eq('fast'); });
    cy.expectHash('aa', '3');   // die der Ebene 1 im Link
    cy.visitApp('mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:&la=2', { storage: { 'fractal.aa': '2' } });   // ohne Angabe: beide Ebenen mit der Browser-Einstellung
    cy.alleEbenenFertig(); cy.pane('qualitaet');
    cy.get('#aaSel').should('have.value', '2'); cy.get('#stWahl1').click(); cy.wait(800); cy.get('#aaSel').should('have.value', '2');
    cy.expectHash('aa', '2'); cy.expectHash('l2', v => expect(new URLSearchParams(v).get('aa'), 'auch l2 schreibt seine Glättung').to.eq('2'));
  });

  it('ältere Dateien (Version 1: Link als Text, extra, colors mit Namen) laden weiter; die Werte gelten, die Kennung nicht', () => {
    const alt = { app: 'Fraktal-Renderer', version: 1, params: 'mode=mandel&re=-0.9&im=0.6&z=1&it=400', extra: { aa: 2, aaMode: 'grid' }, colors: { palette: { name: 'Klassisch', preset: 'classic', a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1, 1, 1], d: [0.5, 0.6, 0.7] } } };
    setze(alt);
    cy.expectHash('it', '400'); cy.get('#aaSel').should('have.value', '2');   // Technik aus extra
    cy.expectHash('cp', null); cy.get('#palette').should('have.value', '0');   // dieselben Werte wie die Vorgabe: die Vorgabe
    const fremd = JSON.parse(JSON.stringify(alt)); fremd.colors.palette.d = [0.1, 0.2, 0.3];   // Kennung sagt Vorgabe, die Werte sagen etwas anderes
    setze(fremd);
    cy.expectHash('pv', v => expect(v, 'die Werte gelten, nicht die Kennung').to.match(/~q~/));
    cy.get('#palette option:selected').should('have.text', 'Klassisch (nicht gespeichert)');   // der Name aus der alten Datei als Beschriftung
    const ohne = JSON.parse(JSON.stringify(alt)); delete ohne.colors; delete ohne.extra;   // ganz ohne die Blöcke: Vorgabe und Browser-Einstellung
    setze(ohne);
    cy.expectHash('cp', null); cy.get('#palette').should('have.value', '0'); cy.get('#aaSel').should('have.value', '1');
  });

  it('Ende zu Ende mit eigener Palette: das PNG trägt sie einmal, lesbar, und öffnet sich mit denselben Farben', () => {
    cy.visitApp('mode=mandel&' + LINKSCHEMA);
    cy.gezeichnet(); cy.shotStats('pal-datei-vorher').then(vorher => {
      cy.get('#save').click(); cy.get('#posterStart').click();
      cy.get('#modal', { timeout: 60000 }).should('be.visible'); cy.get('#dl').click(); cy.get('#closeModal').click();
      cy.task('waitForDownload', { pattern: '^fraktal-mandel-.*\\.png$' }).then(files => {
        cy.task('pngParams', { file: files[0] }).then(text => { const j = JSON.parse(text); expect(j).to.have.all.keys('params'); expect(j.params.pv, 'die Palette einmal, mit ihren Werten').to.contain(':ff0000'); expect(text, 'lesbar').not.to.match(/%3[AD]|%2C/); });
        cy.visitApp();   // Klassisch
        cy.get('#fileInput').selectFile(files[0], { force: true }); cy.waitRender();
        cy.get('#palette option:selected').invoke('text').should('contain', 'Aus dem Link');
        cy.expectHash('pv', v => expect(v).to.contain(':ff0000'));
        cy.gezeichnet(); cy.shotStats('pal-datei-nachher').then(nachher => cy.task('pngDiff', { a: vorher.file, b: nachher.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'dieselben Farben').to.be.lessThan(2)));
      });
    });
  });

  it('eine Vorgabe mit anderen Werten als in der Datei: die gespeicherten Farben gelten, unverändert bleibt die Vorgabe', () => {
    cy.visitApp('mode=mandel&pal=woodcut&map=15&p2=field-lines');
    cy.appState().then(s => {
      setze(s);   // unverändert: Vorgaben bleiben
      cy.expectHash('pal', null); cy.expectHash('p2', null); cy.expectHash('cp', null); cy.expectHash('cp2', null);   // die Vorgaben stehen mit ihren Werten im Link (pv, pv2), nicht beim Namen
      const m = JSON.parse(JSON.stringify(s));                      // so, als hätte eine spätere Fassung die Vorgaben geändert
      m.params.pv = m.params.pv.replace(':1a1714', ':ff0000'); m.params.pv2 = m.params.pv2.replace('~v~linien,6,', '~v~linien,9,');
      setze(m);
      cy.get('#palette').should('have.value', 'y:tmp');
      cy.get('#palette option:selected').should('have.text', 'Aus dem Link (nicht gespeichert)');   // die Werte des Links: keiner Vorgabe gleich
      cy.expectHash('pv2', v => expect(v).to.contain('~v~linien,9,'));
      cy.get('#palArt [data-art="1"]').click({ force: true });      // die gewöhnliche Palette ebenso
      cy.get('#palette option:selected').should('have.text', 'Aus dem Link (nicht gespeichert)');
      cy.expectHash('pv', v => expect(v).to.contain(':ff0000'));
    });
  });

  it('die Bilddatei trägt die Parameter immer: kein Häkchen, ein Block, und der Dialog zeigt genau diesen Text', () => {
    cy.get('#save').click();
    cy.get('#posterMeta').should('be.visible');
    cy.get('#metaParams, #metaColors, #metaTech').should('not.exist');   // seit 19.09.2026 nichts mehr abzuwählen
    cy.get('#metaText').invoke('val').should('match', /^\{\n  "params": \{/);
    cy.get('#posterStart').click();
    cy.get('#modal', { timeout: 60000 }).should('be.visible'); cy.get('#dl').click(); cy.get('#closeModal').click();
    cy.task('waitForDownload', { pattern: '^fraktal-mandel-.*\\.png$' }).then(files => {
      cy.task('pngParams', { file: files[0] }).then(text => {
        const j = JSON.parse(text);
        expect(j, 'nur die gewählten Angaben').to.have.all.keys('params');
        expect(j.params.mode, 'lesbar als Objekt').to.eq('mandel');
      });
      cy.rerender(() => cy.pickOption('power', 3));
      cy.get('#fileInput').selectFile(files[0], { force: true });   // ohne den Namen der App öffnet die Datei trotzdem: die Parameter zählen
      cy.waitRender();
      cy.get('#power').should('have.value', '2');
    });
  });

  it('„Bilddatei prüfen“ zeigt die Angaben dieser App und die weiteren Blöcke, ohne etwas zu ändern, und übernimmt die Ansicht auf Wunsch', () => {
    cy.pickOption('power', 5);
    cy.get('#save').click();
    cy.get('#posterMeta').should('be.visible');
    cy.get('#posterStart').click();
    cy.get('#modal', { timeout: 60000 }).should('be.visible'); cy.get('#dl').click(); cy.get('#closeModal').click();
    cy.task('waitForDownload', { pattern: '^fraktal-mandel-.*\\.png$' }).then(files => {
      cy.rerender(() => cy.pickOption('power', 2));
      cy.get('#metaInput').selectFile(files[0], { force: true });
      cy.get('#metaDlg').should('be.visible');
      cy.get('#metaBericht').should('contain.text', 'PNG').and('contain.text', 'p = 5').and('contain.text', 'pv = ~q~').and('contain.text', 'aam = ');   // die Parameter lesbar, mit Palette und Glättung
      // Die App legt keine Fremdblöcke an. Ältere Browser schreiben ein Farbraum-Kennzeichen (sRGB, als „vom Browser gesetzt“ ausgewiesen),
      // Chrome ab 152 schreibt keines mehr: dann meldet der Bericht, dass es keine weiteren Blöcke gibt.
      cy.get('#metaBericht').invoke('text').should(t => expect(/sRGB[^]*vom Browser gesetzt|Keine weiteren Text- oder Anwendungsblöcke/.test(t), 'Fremdblöcke: nur das Kennzeichen des Browsers oder keine').to.be.true);
      cy.get('#metaDlg .hint').last().should('contain.text', 'entfernt keine Metadaten');
      cy.get('#power').should('have.value', '2');   // Prüfen ändert nichts
      cy.get('#metaApply').click();
      cy.waitRender();
      cy.get('#metaDlg').should('not.be.visible');
      cy.get('#power').should('have.value', '5');
    });
    cy.get('#paramsSave').click();   // eine JSON-Datei zeigt der Leser ebenso
    cy.task('waitForDownload', { pattern: '^fraktal-mandel-.*\\.json$' }).then(files => {
      cy.get('#metaInput').selectFile(files[0], { force: true });
      cy.get('#metaBericht').should('contain.text', 'Textdatei').and('contain.text', 'p = 5');
      cy.get('#metaClose').click();
    });
    // fremdes PNG (1 × 1 Pixel) mit einem tEXt-Block „Comment“ = „hallo“; die Prüfsummen sind Platzhalter, der Leser prüft sie nicht
    cy.writeFile('cypress/downloads/fremd.png', Buffer.from('89504e470d0a1a0a' + '0000000d49484452000000010000000108060000001f15c4d0' + '0000000d74455874436f6d6d656e740068616c6c6f00000000' + '00000010494441547801010500faff000000000000000000000100000000' + '0000000049454e44ae426082', 'hex'), null);
    cy.get('#metaInput').selectFile('cypress/downloads/fremd.png', { force: true });
    cy.get('#metaBericht').should('contain.text', 'Keine Angaben dieser App').and('contain.text', 'tEXt „Comment“').and('contain.text', 'hallo');
    cy.get('#metaApply').should('have.attr', 'hidden');
    cy.get('#metaClose').click();
  });

  it('„Parameter speichern“ legt eine JSON-Datei ab, die sich über „Datei öffnen“ wieder laden lässt', () => {
    cy.pickOption('power', 4);
    cy.expectHash('p', '4');
    cy.get('#paramsSave').click();
    cy.task('waitForDownload', { pattern: '^fraktal-mandel-.*\\.json$' }).then(files => {
      expect(files, 'JSON im Download-Ordner').to.have.length.greaterThan(0);
      cy.readFile(files[0]).then(json => {
        expect(json.app).to.eq('Fraktal-Renderer');
        expect(json.params.p).to.eq('4');
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
            expect(nachher.params, 'Link-Parameter wiederhergestellt, samt Glättung und Palette').to.deep.eq(vorher.params);
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
        expect(j).to.have.all.keys('params');
        expect(j.params.p).to.eq('5');
        expect(j.params.pv, 'die Palette mit allen Werten im Bild').to.match(/^~q~0\.5,0\.5,0\.5,/);
        expect(JSON.stringify(j)).not.to.match(/"preset"|"colors"|"extra"/);
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
        expect(JSON.parse(text).params.p).to.eq('6');
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
        expect(json.params.aam, 'Verfahren in der Datei (im Parametersatz der Ebene)').to.eq('fast');
        expect(parseFloat(json.params.aat), 'getippte Toleranz in der Datei').to.be.closeTo(0.025, 0.0005);
      });
      cy.pickOption('aaModeSel', 'grid');
      cy.get('#fileInput').selectFile(files[0], { force: true });
      cy.waitRender();
      cy.get('#aaModeSel').should('have.value', 'fast');
      cy.get('#aaTolVal').should('have.value', '2,5 %');
    });
  });
});
