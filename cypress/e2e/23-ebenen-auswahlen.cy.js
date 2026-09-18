// Fraktal-Ebenen: jede Auswahl der Dropdowns im Zusammenhang mit Ebenen und ihre Kombinationen — Maskenarten (mit und ohne
// Umkehren), alle Mischmodi bei zwei Deckkräften und gegen WebGL 2, Glättungsverfahren und -stufen je Ebene, jede Formel,
// jede Färbung, jede Palette und jede Ebenenabbildung auf einer zweiten Ebene, die Schalter „Bewegen“ und „Anzeigen“ über drei
// Ebenen, eigene Ausdrücke (Formel, Färbung, Ebenenabbildung) verteilt auf drei Ebenen.
import { IMAGE_REGION } from '../support/commands';

describe('Ebenen: alle Auswahlen und Kombinationen', () => {
  const anders = (a, b, text, min = 3) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 6) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.lessThan(max));
  const ZWEI = 'mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:&la=2';
  const DREI = 'mode=mandel&l2=f%3D1&l3=f%3D2&lm2=2:0.7:1:0:1:&lm3=10:0.5:1:0:1:&la=3';
  const spion = { onBeforeLoad: win => { cy.spy(win.console, 'error').as('konsole'); } };
  const fertig = () => cy.alleEbenenFertig().then(ms => expect(ms, 'fertig').to.be.greaterThan(0));
  const uebersetzt = () => { cy.get('#state', { timeout: 30000 }).invoke('text').should('not.match', /übersetzt|Compiling/); cy.wait(500); };
  const alleFertig = (timeout = 60000) => cy.alleEbenenFertig(timeout);
  const optionen = id => cy.get('#' + id + ' option').then($o => [...$o].filter(o => !o.hidden && !o.disabled).map(o => o.value));   // nur, was das Menü gerade anbietet (versteckte Einträge gehören zu anderen Formeln oder Familien)

  it('Maskenarten: jede Art auf der zweiten Ebene, mit und ohne Umkehren, rendert fertig und steht im Link; „Innen“ ändert das Bild', () => {
    cy.visitApp(ZWEI, spion); fertig(); cy.pane('ebenen');
    cy.shotStats('ea-maske-ohne').then(ohne => {
      optionen('ebM2_art').then(arten => {
        expect(arten.filter(a => a !== '0'), 'Maskenarten der Ebenen (ohne Kanten und Ebenenzustand)').to.have.length(7);
        for (const art of arten.filter(a => a !== '0')) {
          cy.pickOption('ebM2_art', art); cy.wait(300); uebersetzt();
          cy.expectHash('lu2', v => expect(v.startsWith('m' + art + ','), 'Maske ' + art + ' im Link').to.be.true);
          cy.get('#state').invoke('text').should('match', /Fertig/);
          cy.get('#ebM2_inv').check(); cy.wait(400); cy.expectHash('lu2', v => expect(v.split(',')[1], 'umgekehrt').to.eq('1'));
          cy.get('#ebM2_inv').uncheck(); cy.wait(200);
        }
        cy.pickOption('ebM2_art', 1); cy.wait(300); uebersetzt();
        cy.shotStats('ea-maske-innen').then(innen => anders(ohne, innen, 'Innen-Maske ändert das Bild'));
        cy.pickOption('ebM2_art', 0); cy.wait(600); cy.expectHash('lu2', null);
        cy.shotStats('ea-maske-weg').then(weg => gleich(weg, ohne, 'ohne Maske wie zuvor'));
      });
    });
    cy.get('@konsole').should('not.have.been.called');
  });

  it('Mischmodi × Deckkraft: jeder Modus bei 0,5 und 1 im Link und fertig; WebGL 2 gleicht WebGPU in jedem Modus', () => {
    cy.visitApp(ZWEI, spion); fertig(); cy.pane('ebenen');
    for (const deck of [0.5, 1]) {
      cy.setRange('ebeneDeck2', deck); cy.wait(200);
      for (let m = 0; m < 18; m++) { cy.pickOption('ebeneModus2', m); cy.wait(150); cy.expectHash('lm2', m + ':' + deck + ':1:0:1:'); }
    }
    cy.get('#state').invoke('text').should('match', /Fertig/); cy.get('@konsole').should('not.have.been.called');
    for (let m = 0; m < 18; m++) {
      cy.visitApp(`mode=mandel&l2=f%3D1&lm2=${m}:0.6:1:0:1:&la=2`); fertig();
      cy.shotStats('ea-modus-' + m).then(gpu => {
        cy.visitApp(`mode=mandel&l2=f%3D1&lm2=${m}:0.6:1:0:1:&la=2`, { storage: { 'fractal.renderer': 'webgl' } }); fertig();
        cy.get('#badge').should('contain.text', 'WebGL');
        cy.shotStats('ea-modus-' + m + '-gl').then(gl => gleich(gpu, gl, 'Modus ' + m + ': WebGL 2 wie WebGPU', 12));
      });
    }
  });

  it('Glättung je Ebene: jedes Verfahren und jede Stufe auf der zweiten Ebene, der Grund behält seine; alle Ebenen werden fertig', () => {
    cy.visitApp(ZWEI, Object.assign({ aa: '2' }, spion)); alleFertig().then(ms => expect(ms).to.be.greaterThan(0));
    cy.pane('qualitaet'); cy.get('#aaSel').should('have.value', '2'); cy.get('#aaModeSel').should('have.value', 'grid');
    optionen('aaModeSel').then(verfahren => {
      for (const v of verfahren) {
        cy.pickOption('aaModeSel', v); cy.wait(300); alleFertig().then(ms => expect(ms, 'Verfahren ' + v + ' fertig').to.be.greaterThan(0));
        cy.get('#aaModeSel').should('have.value', v);
        if (v === 'grid') cy.expectHash('lm2', '2:0.7:1:0:1:'); else cy.expectHash('lm2', x => expect(x, 'eigenes Verfahren im Mischsatz').to.contain(':' + v + ':'));
      }
      cy.pickOption('aaModeSel', 'grid'); cy.wait(300);
      optionen('aaSel').then(stufen => {
        for (const st of stufen) {
          cy.pickOption('aaSel', st); cy.wait(300); alleFertig().then(ms => expect(ms, 'Stufe ' + st + ' fertig').to.be.greaterThan(0));
          if (st === '2') cy.expectHash('lm2', '2:0.7:1:0:1:'); else cy.expectHash('lm2', x => expect(x.split(':')[6], 'eigene Stufe im Mischsatz').to.eq(st));
          cy.window().then(win => expect(win.localStorage.getItem('fractal.aa'), 'die Browser-Einstellung gehört dem Grund').to.eq('2'));
        }
      });
    });
    cy.get('#stWahl1').click(); cy.wait(600);
    cy.get('#aaSel').should('have.value', '2'); cy.get('#aaModeSel').should('have.value', 'grid');
    cy.get('@konsole').should('not.have.been.called');
  });

  it('Formeln: jede Formel als zweite Ebene über der Mandelbrot-Menge rendert fertig und ohne Fehler', () => {
    cy.visitApp('mode=mandel'); fertig();
    optionen('formula').then(formeln => {
      expect(formeln.length, 'Formeln').to.be.greaterThan(30);
      for (const f of formeln) {
        cy.visitApp(`mode=mandel&l2=f%3D${f}&lm2=2:0.7:1:0:1:&la=2`, spion);
        alleFertig().then(ms => expect(ms, 'Formel ' + f + ' als Ebene fertig').to.be.greaterThan(0));
        cy.get('#formula').should('have.value', f);
        if (f !== '0') cy.expectHash('l2', v => expect(v, 'Formel im Satz der Ebene').to.match(new RegExp('(^|&)f=' + f + '(&|$)')));
        cy.get('@konsole').should('not.have.been.called');
      }
    });
  });

  it('Färbungen, Paletten und Ebenenabbildungen: jede Auswahl auf der zweiten Ebene rendert fertig; der Grund behält seine', () => {
    cy.visitApp(ZWEI, spion); fertig();
    cy.pane('farbe');
    optionen('mapping').then(werte => {
      expect(werte.length, 'Färbungen').to.be.greaterThan(20);
      for (const v of werte) { cy.pickOption('mapping', v); fertig(); uebersetzt(); cy.get('#mapping').should('have.value', v); cy.expectHash('map', null); }
    });
    cy.pane('palette');
    optionen('palette').then(werte => {
      expect(werte.length, 'Paletten').to.be.greaterThan(15);
      for (const v of werte) { cy.pickOption('palette', v); cy.wait(250); cy.get('#palette').should('have.value', v); cy.get('#state').invoke('text').should('match', /Fertig/); }
    });
    cy.pane('motiv');
    optionen('abbildung').then(werte => {
      expect(werte.length, 'Ebenenabbildungen').to.be.greaterThan(5);
      for (const v of werte) { cy.pickOption('abbildung', v); fertig(); cy.get('#abbildung').should('have.value', v); if (v !== '0') cy.expectHash('l2', x => expect(x).to.match(new RegExp('(^|&)ab=' + v + '(&|$)'))); cy.expectHash('ab', null); }
    });
    cy.get('#stWahl1').click(); cy.wait(600);
    cy.get('#abbildung').should('have.value', '0'); cy.pane('farbe'); cy.get('#mapping').should('have.value', '2');
    cy.get('@konsole').should('not.have.been.called');
  });

  it('Schalter × Auswahl: „Bewegen: Nur diese“ mit dem Grund löst die anderen, „Alle“ nimmt sie mit; „Anzeigen: Nur diese“ folgt der Auswahl über drei Ebenen', () => {
    cy.visitApp(DREI); alleFertig().then(ms => expect(ms).to.be.greaterThan(0));
    cy.get('#stWahl1').click(); cy.wait(600);
    cy.get('#stapelKette').click();   // Nur diese, mit dem Grund gewählt: die anderen lösen sich
    cy.get('#stage canvas').trigger('wheel', { deltaY: -300, clientX: 200, clientY: 300 }); cy.wait(1200);
    cy.expectHash('lm2', '2:0.7:1:0:0:'); cy.expectHash('lm3', '10:0.5:1:0:0:');
    cy.expectHash('z', v => expect(parseFloat(v), 'der Grund zoomte').to.be.greaterThan(1.1));
    cy.expectHash('l2', v => expect(new URLSearchParams(v).get('z'), 'die zweite blieb bei Zoom 1').to.eq('1.0000e+0'));
    cy.expectHash('l3', v => expect(new URLSearchParams(v).get('z'), 'die dritte blieb bei Zoom 1').to.eq('1.0000e+0'));
    cy.get('#stapelKette').click();   // Alle: die gelösten gehen mit
    cy.get('#stage canvas').trigger('wheel', { deltaY: -300, clientX: 200, clientY: 300 }); cy.wait(1200);
    cy.hashParams().then(h => { const z2 = parseFloat(new URLSearchParams(h.get('l2')).get('z')), z3 = parseFloat(new URLSearchParams(h.get('l3')).get('z')); expect(z2, 'die zweite zoomte mit').to.be.greaterThan(1.1); expect(z3, 'die dritte zoomte mit').to.be.closeTo(z2, 1e-6); });
    alleFertig().then(ms => expect(ms, 'alle drei fertig nach den Gesten').to.be.greaterThan(0));
    cy.get('#stSolo1').click(); cy.wait(500);   // Solo auf dem Grund
    cy.expectHash('lm1', '0:1:1:1:1:');
    cy.get('#stWahl2').click(); cy.wait(600);
    cy.expectHash('lm1', null); cy.expectHash('lm2', '2:0.7:1:1:0:');
    cy.get('#stWahl3').click(); cy.wait(600);
    cy.expectHash('lm2', '2:0.7:1:0:0:'); cy.expectHash('lm3', '10:0.5:1:1:0:');
    cy.pane('ebenen'); cy.get('#stSolo3').should('have.class', 'on'); cy.get('#stSolo2').should('not.have.class', 'on');
    cy.get('#stAuge2').uncheck({ force: true }); cy.wait(400); cy.expectHash('lm2', '2:0.7:0:0:0:');   // unsichtbar bleibt unsichtbar
    cy.get('#stSolo3').click(); cy.wait(500);   // Solo aus
    cy.expectHash('lm3', '10:0.5:1:0:0:'); cy.expectHash('lm2', '2:0.7:0:0:0:');
    cy.get('#stZeile2').should('have.class', 'aus');
  });

  it('Eigene Ausdrücke auf Ebenen: eigene Formel auf dem Grund, eigene Färbung auf der zweiten, eigene Ebenenabbildung auf der dritten; WebGL 2 gleicht WebGPU', () => {
    const link = 'mode=mandel&f=37&xf=z%5E3%2Bc&l2=f%3D1%26map%3D35%26xc%3Dsqrt(n)&l3=f%3D2%26ab%3D7%26xm%3Dz*z&lm2=2:0.7:1:0:1:&lm3=10:0.5:1:0:1:&la=3';
    cy.visitApp(link, spion); alleFertig().then(ms => expect(ms, 'drei Ebenen mit eigenen Ausdrücken fertig').to.be.greaterThan(0));
    cy.expectHash('f', '37'); cy.expectHash('xf', 'z^3+c');
    cy.expectHash('l2', v => { expect(v).to.match(/(^|&)map=35(&|$)/); expect(v).to.contain('xc='); });
    cy.expectHash('l3', v => { expect(v).to.match(/(^|&)ab=7(&|$)/); expect(v).to.contain('xm='); });
    cy.get('#abbildung').should('have.value', '7');
    cy.get('#stWahl1').click(); cy.wait(600); cy.get('#formula').should('have.value', '37');
    cy.get('@konsole').should('not.have.been.called');
    cy.shotStats('ea-ausdruecke').then(gpu => {
      cy.visitApp(link, { storage: { 'fractal.renderer': 'webgl' } }); alleFertig().then(ms => expect(ms).to.be.greaterThan(0));
      cy.shotStats('ea-ausdruecke-gl').then(gl => gleich(gpu, gl, 'WebGL 2 rechnet die eigenen Ausdrücke auf allen Ebenen wie WebGPU', 12));
    });
  });
});
