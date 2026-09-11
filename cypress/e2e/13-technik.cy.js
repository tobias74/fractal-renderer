import { DEEP_HASH } from '../support/commands';

describe('Glättung und Technik', () => {
  beforeEach(() => cy.visitApp());

  it('Glättungsstufen: Anzeige, Speicherbedarf und festes Budget von 512 MB', () => {
    cy.get('#aaSel').should('have.value', '1');
    cy.get('#aaVal').should('have.text', '1 Probe je Pixel');
    cy.get('#resInfo').invoke('text').should('match', /Render \d+ × \d+ px · Glättung 1 × 1 · [\d,]+ Mio\. Proben · \d+ MB/);
    cy.rerender(() => cy.pickOption('aaSel', 3));
    cy.get('#aaSel').should('have.value', '3');
    cy.get('#aaVal').should('contain.text', '9 Proben je Pixel, schrittweise');
    cy.get('#resInfo').should('contain.text', 'Glättung 3 × 3');
    cy.get('#aaHint').should('contain.text', '133 MB Grafikspeicher bei 1280 × 720 px').and('contain.text', '512 MB');
    cy.get('#state').invoke('text').should('match', /Fertig · \d+ ms \+ .*Glättung/);
    // 1280 × 720 px × 16 Byte je Probe: 5 × 5 sind 369 MB und passen, 6 × 6 wären 531 MB und fehlen im Menü
    cy.get('#aaSel option').should('have.length', 5);
    cy.get('#aaSel option').last().should('have.value', '5');
    cy.pickOption('aaSel', 5);
    cy.get('#aaVal').should('contain.text', '25 Proben je Pixel').and('not.contain.text', 'begrenzt');
    cy.get('#resInfo').should('contain.text', 'Glättung 5 × 5').and('contain.text', '369 MB');
    cy.pickOption('aaSel', 1);
    cy.get('#aaVal').should('have.text', '1 Probe je Pixel');
  });

  it('Kleinere Fläche lässt mehr Stufen ins Budget, bis 16 × 16; der Wunsch bleibt über der Grenze erhalten', () => {
    cy.get('#aaSel option').should('have.length', 5);
    cy.rerender(() => cy.pickOption('quality', '0.5'));   // 640 × 360 px: bis 10 × 10 (369 MB), 12 × 12 wären 531 MB
    cy.get('#aaSel option').should('have.length', 8);
    cy.get('#aaSel option').last().should('have.value', '10');
    cy.rerender(() => cy.pickOption('quality', '0.25'));  // 320 × 180 px: alle zehn Stufen, 16 × 16 sind 236 MB
    cy.get('#aaSel option').should('have.length', 10);
    cy.pickOption('aaSel', 16);
    cy.get('#aaVal').should('contain.text', '256 Proben je Pixel').and('not.contain.text', 'begrenzt');
    cy.get('#resInfo').should('contain.text', 'Glättung 16 × 16').and('contain.text', '236 MB');
    cy.rerender(() => cy.pickOption('quality', '1'));     // Wunsch 16 × 16 bleibt, gerechnet und gezeigt wird die höchste passende Stufe
    cy.get('#aaSel option').should('have.length', 5);
    cy.get('#aaSel').should('have.value', '5');
    cy.get('#resInfo').should('contain.text', 'Glättung 5 × 5 (begrenzt)');
    cy.get('#aaHint').should('contain.text', '16 × 16 bräuchte 3775 MB').and('contain.text', 'gerechnet wird 5 × 5');
    cy.pickOption('aaSel', 1);
    cy.get('#aaVal').should('have.text', '1 Probe je Pixel');
  });

  it('Adaptive Glättung: umschalten, verfeinert bis Fertig, zurück zum Raster', () => {
    cy.pickOption('aaModeSel', 'adaptive');
    cy.get('#aaGridRow').should('have.attr', 'hidden');
    cy.get('#aaAdaptRow').should('not.have.attr', 'hidden');
    cy.get('#aaPresets button[data-preset="4"]').click();   // Voreinstellung Maximal stellt die Regler
    cy.get('#aaTolVal').should('have.text', '0,3 %');
    cy.get('#aaMaxVal').should('have.text', '1024');
    cy.get('#aaPresets button[data-preset="4"]').should('have.class', 'on');
    cy.get('#aaPresets button[data-preset="1"]').click();
    cy.get('#aaTolVal').should('have.text', '3,0 %');
    cy.get('#aaMaxVal').should('have.text', '16');
    cy.get('#aaPresets button[data-preset="1"]').should('have.class', 'on');
    cy.setRange('aaTol', 1000);   // 5 % Restrauschen: schnell fertig, kein Preset passt mehr
    cy.get('#aaPresets button.on').should('have.length', 0);
    cy.get('#aaVal').should('contain.text', 'adaptiv, bis 16 Proben je Pixel');
    cy.get('#aaTolVal').should('have.text', '5,0 %');
    cy.get('#aaMaxVal').should('have.text', '16');
    cy.get('#resInfo').should('contain.text', 'Glättung adaptiv');
    cy.waitRender(/Fertig · [\d,]+ (ms|s) \+ [\d,]+ (ms|s) Glättung/, 120000);
    cy.get('#aaHint').should('contain.text', '100 % der Pixel fertig');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.aamode')).to.eq('adaptive'));
    cy.pickOption('aaModeSel', 'grid');
    cy.get('#aaGridRow').should('not.have.attr', 'hidden');
    cy.get('#resInfo').should('contain.text', 'Glättung 1 × 1');
    cy.waitRender();
  });

  // Früher behielt eine lockerere Einstellung die Proben der strengeren: „Schnell“ nach „Maximal“ änderte am Bild nichts,
  // der Export rechnete aber mit „Schnell“. Jetzt beginnt lockerer neu, strenger rechnet mit den vorhandenen Proben weiter.
  it('Adaptive Glättung: lockerere Einstellung beginnt neu, strengere rechnet weiter', () => {
    cy.visitApp('mode=mandel&re=-0.7436447860&im=0.1318252536&z=3000', { storage: { 'fractal.aamode': 'adaptive' } });
    cy.pickOption('aaModeSel', 'adaptive');
    cy.get('#aaPresets button[data-preset="4"]').click();   // Maximal
    cy.waitRender(/Fertig · [\d,]+ (ms|s) \+ [\d,]+ (ms|s) Glättung/, 120000);
    // Arbeit der Grafikkarte mitzählen: unter WebGL Zeichenaufrufe, unter WebGPU abgeschickte Befehlspuffer
    cy.window().then(win => {
      win.__arbeit = 0;
      const gl2 = win.WebGL2RenderingContext.prototype, draw = gl2.drawArrays;
      gl2.drawArrays = function (...a) { win.__arbeit++; return draw.apply(this, a); };
      if (win.GPUQueue) { const q = win.GPUQueue.prototype, sub = q.submit; q.submit = function (...a) { win.__arbeit++; return sub.apply(this, a); }; }
    });
    const nachKlick = (preset, pruef) => {
      cy.window().then(win => { win.__arbeit = 0; });
      cy.get(`#aaPresets button[data-preset="${preset}"]`).click();
      cy.wait(300);
      cy.waitRender(/Fertig · [\d,]+ (ms|s) \+ [\d,]+ (ms|s) Glättung/, 120000);
      cy.window().then(win => pruef(win.__arbeit));
    };
    nachKlick(1, n => expect(n, 'Schnell nach Maximal rechnet neu').to.be.greaterThan(40));
    nachKlick(2, n => expect(n, 'Normal nach Schnell rechnet weiter').to.be.greaterThan(0));
    cy.get('#aaHint').should('contain.text', '100 % der Pixel fertig');
  });

  it('Adaptive Glättung aus dem Speicher: Verfahren, Regler und Palettenvorfilterung werden übernommen', () => {
    cy.visitApp('', { storage: { 'fractal.aamode': 'adaptive', 'fractal.aamax': '256', 'fractal.aatol': '0.006', 'fractal.aasigma': '0.6', 'fractal.palfilter': '1' } });
    cy.get('#aaModeSel').should('have.value', 'adaptive');
    cy.get('#aaMax').should('have.value', '5');
    cy.get('#aaTolVal').should('have.text', '0,6 %');
    cy.get('#aaSigmaVal').should('have.text', '0,60 px');
    cy.get('#palFilter').should('be.checked');
    cy.get('#aaVal').should('contain.text', 'bis 256 Proben je Pixel');
    cy.appState().then(s => { expect(s.extra.aaMax).to.eq(256); expect(s.extra.palFilter).to.be.true; });
    cy.pickOption('aaModeSel', 'grid');
    cy.waitRender();
  });

  it('Palette vorfiltern: Häkchen wirkt sofort, wird gespeichert und in den Zustand übernommen', () => {
    cy.get('#palFilter').should('not.be.checked');
    cy.get('#palFilterRow').should('have.attr', 'hidden');
    cy.revealInDetails('palFilter');
    cy.get('#palFilter').check({ force: true });
    cy.get('#palFilterRow').should('not.have.attr', 'hidden');
    cy.get('#palFilterKVal').should('have.text', '1,00×');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.palfilter')).to.eq('1'));
    cy.expectHash('pf', '1');                 // ändert die Farben, gehört also in den Link
    cy.setRange('palFilterK', 1000);
    cy.get('#palFilterKVal').should('have.text', '4,00×');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.palfilterk')).to.eq('4'));
    cy.expectHash('pfk', '4.00');
    cy.appState().then(s => { expect(s.extra.palFilter).to.be.true; expect(s.extra.palFilterK).to.eq(4); });
    cy.waitRender();
    cy.setRange('palFilterK', 500);
    cy.get('#palFilterKVal').should('have.text', '1,00×');
    cy.get('#palFilter').uncheck({ force: true });
    cy.get('#palFilterRow').should('have.attr', 'hidden');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.palfilter')).to.eq('0'));
    cy.expectHash('pf', null);
  });

  it('Adaptive Glättung wird auch bei der höchsten Probenzahl fertig und zeigt dabei eine Restzeit', () => {
    // Deckel 1024 mit feinster Toleranz: an harten Kanten ist die Toleranz unerreichbar, es wird bis zum Deckel gerechnet.
    // Genau dort stand die Prozentzahl früher minutenlang scheinbar still, weil sie nur die fertigen Pixel zählte.
    cy.visitApp('mode=mandel&re=-0.7476861&im=0.0675545&z=2e5', { aa: null, wait: false,
      storage: { 'fractal.aamode': 'adaptive', 'fractal.aamax': '1024', 'fractal.aatol': '0.002', 'fractal.quality': '0.5' } });
    cy.get('#state', { timeout: 60000 }).invoke('text').should('match', /Glättung \d+ % · noch etwa/);
    cy.get('#state').invoke('text').then(first => {
      const p0 = +/Glättung (\d+) %/.exec(first)[1];
      cy.wait(3000);
      cy.get('#state', { timeout: 60000 }).invoke('text').should(later => {
        if (/^Fertig/.test(later)) return;                     // schnelle Grafikkarte: schon durch
        const p1 = +/Glättung (\d+) %/.exec(later)[1];
        expect(p1, 'Fortschritt steigt').to.be.greaterThan(p0);
      });
    });
    cy.waitRender(/Fertig · [\d,]+ (ms|s) \+ [\d,]+ (ms|s) Glättung/, 240000);
    cy.get('#aaHint').should('contain.text', '100 % der Pixel fertig');
  });

  it('Ziehen während der Glättung hält die Statuszeile nicht an', () => {
    // Beim Verschieben rechnet die App nur die neuen Streifen und verfeinert danach weiter. Die Statuszeile blieb dabei
    // auf „Rendert …“ stehen, bis alles fertig war, weil die Renderzeit nach dem Streifenlauf nie gesetzt wurde.
    cy.visitApp('mode=mandel&re=-0.7476861&im=0.0675545&z=2e5', { aa: null, wait: false,
      storage: { 'fractal.aamode': 'adaptive', 'fractal.aamax': '1024', 'fractal.aatol': '0.002' } });
    cy.get('#state', { timeout: 60000 }).invoke('text').should('match', /Glättung \d+ %/);   // die Glättung läuft
    cy.get('#stage canvas')
      .trigger('pointerdown', { pointerId: 1, clientX: 300, clientY: 300, isPrimary: true, force: true })
      .trigger('pointermove', { pointerId: 1, clientX: 322, clientY: 318, isPrimary: true, force: true })
      .trigger('pointermove', { pointerId: 1, clientX: 344, clientY: 336, isPrimary: true, force: true })
      .trigger('pointerup', { pointerId: 1, clientX: 344, clientY: 336, isPrimary: true, force: true });
    cy.wait(900);   // der aufgelaufene Versatz wird nach kurzer Ruhe übernommen: Streifen rechnen, dann weiter glätten
    cy.get('#state', { timeout: 8000 }).invoke('text').should('match', /Glättung \d+ %/);   // vorher stand hier „Rendert …“
    cy.waitRender(/Fertig · [\d,]+ (ms|s) \+ [\d,]+ (ms|s) Glättung/, 240000);
  });

  it('Glättung verfeinert schrittweise und meldet die Glättungszeit', () => {
    cy.pickOption('aaSel', 2);
    cy.waitRender(/Fertig · \d+ ms \+ [\d,]+ (ms|s) Glättung/, 60000);
  });

  it('Auflösung halbieren und vierteln', () => {
    cy.rerender(() => cy.pickOption('quality', '0.5'));
    cy.get('#resInfo').should('contain.text', 'Render 640 × 360 px');
    cy.get('#stage canvas').should($c => expect($c[0].width).to.eq(640));
    cy.rerender(() => cy.pickOption('quality', '0.25'));
    cy.get('#stage canvas').should($c => expect($c[0].width).to.eq(320));
    cy.rerender(() => cy.pickOption('quality', '1'));
    cy.get('#stage canvas').should($c => expect($c[0].width).to.eq(1280));
  });

  it('Näherung (BLA) und Zykluserkennung: Adresse und Speicher', () => {
    cy.pickOption('blaSel', '0'); cy.expectHash('bla', '0');
    cy.pickOption('blaSel', '1'); cy.expectHash('bla', '1');
    cy.pickOption('blaSel', 'auto'); cy.expectHash('bla', null);
    cy.window().then(win => expect(win.localStorage.getItem('fractal.bla')).to.eq('auto'));
    cy.pickOption('cycleSel', '1');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.cycle')).to.eq('1'));
    cy.waitRender();
    cy.pickOption('cycleSel', 'auto');
  });

  it('Tiefenzoom: Störungsrechnung, hohe Iterationszahl, BLA bei Bedarf', () => {
    cy.visitApp(DEEP_HASH);
    cy.get('#state').invoke('text').should('match', /Fertig/).and('match', /\d{2}\.\d{3} Iterationen/);
    cy.get('#techInfo').invoke('text').should('match', /Störungstheorie|Störungsrechnung|perturbation/i);
    cy.rerender(() => cy.pickOption('blaSel', '1'));
    cy.get('#state').invoke('text').should('match', /BLA/);
    cy.rerender(() => cy.pickOption('blaSel', '0'));
    cy.get('#state').invoke('text').should('not.match', /BLA/);
  });

  it('Renderer auf WebGL 2 umschalten und zurück auf Automatik', () => {
    cy.pickOption('renderer', 'webgl');
    cy.get('#badge', { timeout: 30000 }).should('have.text', 'WebGL 2');
    cy.waitRender();
    cy.window().then(win => expect(win.localStorage.getItem('fractal.renderer')).to.eq('webgl'));
    cy.get('#renderer').should('have.value', 'webgl');
    cy.pickOption('renderer', 'auto');
    cy.get('#badge', { timeout: 30000 }).invoke('text').should('match', /^(WebGPU|WebGL 2)$/);
    cy.waitRender();
  });

  it('Technik-Einstellungen aus dem Speicher werden beim Start übernommen', () => {
    cy.visitApp('', { storage: { 'fractal.aa': '2', 'fractal.cycle': '0', 'fractal.bla': '0', 'fractal.quality': '0.5' }, aa: null });
    cy.get('#aaSel').should('have.value', '2');
    cy.get('#cycleSel').should('have.value', '0');
    cy.get('#blaSel').should('have.value', '0');
    cy.get('#quality').should('have.value', '0.5');
    cy.get('#resInfo').should('contain.text', 'Render 640 × 360 px');
  });

  it('Gespeicherte Stufe über dem Budget: Menü zeigt die höchste passende Stufe, alter Schlüssel der Speichergrenze verschwindet', () => {
    cy.visitApp('', { storage: { 'fractal.aa': '8', 'fractal.aamem': '2000' }, aa: null });
    cy.get('#aaSel').should('have.value', '5');
    cy.get('#resInfo').should('contain.text', 'Glättung 5 × 5 (begrenzt)');
    cy.get('#aaHint').should('contain.text', '8 × 8 bräuchte 944 MB').and('contain.text', 'gerechnet wird 5 × 5');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.aamem'), 'fractal.aamem').to.be.null);
    cy.pickOption('aaSel', 1);
  });
});
