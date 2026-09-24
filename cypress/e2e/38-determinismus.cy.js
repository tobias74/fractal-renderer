// Determinismus: der Link allein legt das Bild fest, auf jedem Gerät und in jeder Fenstergröße.
// Die Färbung „Kurve“ führt ihre Zuordnung als Punkte oder als Tabelle mit 512 Werten; beides steht im Link. „Aus dem
// Histogramm befüllen“ misst das ganze sichtbare Bild; was es schreibt, steht danach fest im Link, auch wenn die Messung
// vom Bildschirm abhängt. Der automatische Farbanker misst eine Bezugsregion, die nur der Link bestimmt. Ein fester
// Vergleichswert (im festen Testfenster 1280x720) fängt jede unbeabsichtigte Änderung des Befüllens; eine bewusste
// Produktentscheidung schreibt ihn ausdrücklich neu.
const ZEICHEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// die Tabelle aus dem Link: je Wert zwei Zeichen (12 Bit), „.“ + Anzahl wiederholt den vorigen
const tabelle = t => { const v = []; let vorher = -1; for (let i = 0; i < t.length; i += 2) { if (t[i] === '.') { const k = ZEICHEN.indexOf(t[i + 1]) + 1; for (let r = 0; r < k; r++) v.push(vorher / 4095); } else { vorher = ZEICHEN.indexOf(t[i]) * 64 + ZEICHEN.indexOf(t[i + 1]); v.push(vorher / 4095); } } return v; };
const param = (h, k) => new URLSearchParams(h.replace(/^#/, '')).get(k);
const warteAuf = (k, pruefe) => cy.location('hash').should(h => pruefe(param(h, k))).then(h => param(h, k));   // liest die Adresse bei jeder Wiederholung neu
const voll = v => expect(v && tabelle(v).length, 'die Tabelle steht vollständig im Link: 512 Werte').to.equal(512);
const BILD = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=1500&ca=off';
const HIST = BILD + '&map=3';   // die frühere Färbung „Histogramm“: wird beim Laden zur Tabelle, einmal befüllt
const BILDTEIL = { x0: 0.02, y0: 0.08, x1: 0.6, y1: 0.9 };   // links vom Bedienfeld, das rechts über der Leinwand liegt
const befuellen = () => { cy.get('#kurveAusHist').click({ force: true }); };

describe('Determinismus: der Link legt das Bild fest', () => {
  const geladen = (b, h, link = HIST) => {
    cy.viewport(b, h);
    cy.visitApp(link); cy.waitRender();
    return warteAuf('kt', voll);
  };

  it('ein alter Link mit map=3 wird zur Kurve mit Tabelle; befüllt wird aus dem ganzen Bild', () => {
    const tabellen = {};
    for (const [b, h] of [[1280, 720], [375, 812]]) geladen(b, h).then(kt => { tabellen[b + 'x' + h] = kt; });
    cy.expectHash('map', '28');
    cy.then(() => expect(tabellen['375x812'], 'ein anderes Fenster zeigt mehr oder weniger Umgebung: eine andere Tabelle').to.not.equal(tabellen['1280x720']));
  });

  it('fester Vergleichswert: das Befüllen ändert sich nicht aus Versehen', () => {
    // Ändert eine bewusste Entscheidung das Befüllen, wird dieser Wert ausdrücklich neu geschrieben.
    geladen(1280, 720).then(kt => cy.fixture('determinismus-kt.json').then(f => expect(kt, 'Tabelle des festen Links').to.equal(f.kt)));
  });

  it('die Tabelle bleibt beim Zoomen und Verschieben; neu befüllt nimmt sie die aktuelle Ansicht', () => {
    geladen(1280, 720).then(kt => {
      cy.get('#stage canvas').trigger('wheel', { deltaY: -400, clientX: 300, clientY: 300 }); cy.wait(800); cy.waitRender();
      cy.expectHash('kt', kt);   // der Zoom hat sie nicht angerührt
      cy.get('#stage canvas').trigger('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 400, clientY: 300, force: true });
      cy.get('#stage canvas').trigger('pointermove', { pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: 470, clientY: 330, force: true });
      cy.get('#stage canvas').trigger('pointerup', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: 470, clientY: 330, force: true });
      cy.wait(600); cy.waitRender();
      cy.expectHash('kt', kt);   // das Verschieben auch nicht
      cy.pane('farbe'); befuellen();
      warteAuf('kt', v => { voll(v); expect(v, 'neu befüllt: eine andere Ansicht, eine andere Tabelle').to.not.equal(kt); });
    });
  });

  it('ein Link mit Tabelle zeigt sie wieder; zurück zur Kurve nimmt sie aus dem Link', () => {
    geladen(1280, 720).then(kt => {
      cy.visitApp(BILD + '&map=28&kt=' + kt); cy.waitRender();
      cy.pane('farbe'); cy.get('#kurveArtTabelle').should('have.class', 'on');
      cy.get('#kurveTabZeile').should('not.have.attr', 'hidden');
      cy.get('#kurveListe .kz').should('have.length', 512);
      cy.wait(800); cy.expectHash('kt', kt);   // das Laden schreibt sie unverändert zurück
      cy.get('#kurveArtKurve').click();
      cy.expectHash('kt', null);
      cy.get('#kurveTabZeile').should('have.attr', 'hidden');
    });
  });

  it('von der Kurve zur Tabelle: vorbefüllt aus der Kurve, das Bild springt nicht; eine Zeile ändert Bild und Link', () => {
    cy.visitApp(BILD + '&map=28&kv=0:0,0.3:0.7,1:1'); cy.waitRender();
    cy.pane('farbe'); cy.wait(300); cy.get('#stage canvas').screenshot('kurve', { overwrite: true });   // das Bedienfeld liegt schon offen über der Leinwand, auf allen drei Bildern gleich
    cy.get('#kurveArtTabelle').click();
    warteAuf('kt', voll).then(kt => {
      const w = tabelle(kt);
      expect(w[0], 'beginnt wie die Kurve').to.be.closeTo(0, 0.005);
      expect(w[511], 'endet wie die Kurve').to.be.closeTo(1, 0.005);
      expect(w[153], 'folgt dem Knick bei 0,3 → 0,7').to.be.closeTo(0.7 * 153 / (0.3 * 511), 0.01);
      cy.expectHash('kv', null);
      cy.waitRender(); cy.get('#stage canvas').screenshot('tabelle', { overwrite: true });
      cy.task('pngDiff', { a: 'cypress/screenshots/38-determinismus.cy.js/kurve.png', b: 'cypress/screenshots/38-determinismus.cy.js/tabelle.png', region: BILDTEIL })
        .then(d => expect(d.meanDiff, 'dasselbe Bild').to.be.lessThan(0.5));
      cy.get('#kurveListe input[data-i="400"]').scrollIntoView().clear().type('0,25{enter}');
      warteAuf('kt', v => { voll(v); expect(tabelle(v)[400], 'die getippte Zeile').to.be.closeTo(0.25, 1 / 4095); });
      cy.waitRender(); cy.get('#stage canvas').screenshot('zeile', { overwrite: true });
      cy.task('pngDiff', { a: 'cypress/screenshots/38-determinismus.cy.js/tabelle.png', b: 'cypress/screenshots/38-determinismus.cy.js/zeile.png', region: BILDTEIL })
        .then(d => expect(d.meanDiff, 'die Zeile färbt das Bild um').to.be.greaterThan(0.5));
    });
  });

  const NEWTON = 'mode=julia&f=11&p=3&jre=0&jim=0&re=0&im=0&z=0.7&it=400&map=3&ca=off';   // reines Newton mit drei Wurzeln (in der Mandelbrot-Art ist es Nova: ein Fixpunkt)
  it('Newton: die Nummer der Wurzel zählt beim Befüllen nicht als Fluchtzeit', () => {
    geladen(1280, 720, NEWTON).then(kt => {
      // Mit dem Fehler landeten alle Punkte der Wurzeln 1 und 2 im letzten Fach: vor ihm stünde nur ein Drittel
      expect(tabelle(kt)[510], 'fast alle Punkte liegen vor dem letzten Fach').to.be.greaterThan(0.9);
    });
  });

  it('Newton: Befüllen aus einem Einzugsgebiet ist eine Wahl des Werkzeugs, im Link steht nur die Tabelle', () => {
    geladen(1280, 720, NEWTON).then(alle => {
      cy.pane('farbe');
      cy.get('#kurveWurzelZeile').should('not.have.attr', 'hidden');
      cy.get('#kurveWurzel button').should('have.length', 4);   // alle und die drei Wurzeln
      cy.get('#kurveWurzel button[data-w="-1"]').should('have.class', 'on');   // Vorgabe: alle Punkte, wie bisher
      cy.get('#kurveWurzel button[data-w="1"]').click(); cy.wait(500); befuellen();
      warteAuf('kt', v => { voll(v); expect(v, 'nur Wurzel 2: eine andere Verteilung').to.not.equal(alle); });
      cy.location('hash').then(h => expect([...new URLSearchParams(h.slice(1)).keys()].filter(k => !/^(mode|re|im|z|jre|jim|it|pv|den|aa|aam|aat|aax|aas|map|kt|ca|p|f|pp)$/.test(k)), 'die Wahl steht nicht im Link').to.deep.equal([]));
      cy.get('#kurveWurzel button[data-w="-1"]').click(); cy.wait(500); befuellen();
      warteAuf('kt', v => expect(v, 'wieder alle: die Tabelle von vorher').to.equal(alle));
    });
    cy.visitApp(HIST); cy.pane('farbe'); cy.wait(800);
    cy.get('#kurveWurzelZeile').should('have.attr', 'hidden');   // ohne Wurzelformel keine Wahl
  });

  it('der automatische Farbanker ist in jeder Fenstergröße derselbe', () => {
    const anker = {};
    for (const [b, h] of [[1280, 720], [1000, 1400], [1600, 600]]) {
      cy.viewport(b, h);
      cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=1500'); cy.waitRender();
      warteAuf('ca', v => expect(v, 'der Anker steht im Link').to.match(/^\d/)).then(ca => { anker[b + 'x' + h] = ca; });
    }
    cy.then(() => { const w = Object.values(anker); for (const [name, ca] of Object.entries(anker)) expect(ca, name).to.equal(w[0]); });
  });

  // Werkzeuge ohne eigenen Stand: sie verändern nur die Tabelle, im Link steht nichts außer ihr.
  it('Wiederholungen − / + lesen die Zahl aus der Tabelle; das Rad rückt sie zur Verteilung und zurück', () => {
    geladen(1280, 720).then(kt => {
      cy.pane('farbe'); cy.get('#kurveWdhZahl').should('have.text', '1'); cy.get('#kurveWdhMinus').should('be.disabled');
      cy.get('#kurveWdhPlus').click().click(); cy.get('#kurveWdhZahl').should('have.text', '3');
      warteAuf('kt', v => { voll(v); expect(v).to.not.equal(kt); expect(tabelle(v).filter((x, i, w) => i && x < w[i - 1] - 0.5).length, 'zwei Rücksprünge').to.equal(2); });
      cy.get('#kurveRad').focus().type('{leftarrow}'.repeat(25), { delay: 0 }).type('{rightarrow}'.repeat(50), { delay: 0 });   // das Rad lässt die Wiederholungen, wie sie sind
      cy.get('#kurveWdhZahl').should('have.text', '3');
      cy.location('hash').then(h => { const k = [...new URLSearchParams(h.slice(1)).keys()]; expect(k.filter(x => !/^(mode|re|im|z|it|pv|den|aa|aam|aat|aax|aas|map|kt|ca)$/.test(x)), 'kein Stand der Werkzeuge im Link').to.deep.equal([]); });
      cy.visitApp(BILD + '&map=28&kt=' + kt); cy.pane('farbe');   // ein geladener Link: die Zahl kommt aus der Tabelle, nicht aus einem Gedächtnis
      cy.get('#kurveWdhPlus').click(); cy.get('#kurveWdhZahl').should('have.text', '2');
      cy.get('#kurveWdhMinus').click(); cy.get('#kurveWdhZahl').should('have.text', '1');
      cy.wait(600); warteAuf('kt', v => expect(v, 'plus und minus: bitgenau die alte Tabelle').to.equal(kt));
      cy.get('#kurveRad').focus().type('{leftarrow}{leftarrow}{leftarrow}');
      warteAuf('kt', v => { voll(v); expect(v, 'nach links: näher an der geraden Linie').to.not.equal(kt); expect(Math.abs(tabelle(v)[256] - 256.5 / 512)).to.be.lessThan(Math.abs(tabelle(kt)[256] - 256.5 / 512)); });
      cy.get('#kurveRad').type('{rightarrow}{rightarrow}{rightarrow}');
      warteAuf('kt', v => expect(v, 'gleich weit zurück: wieder dieselbe Tabelle').to.equal(kt));
      cy.get('#kurveRad').type('{leftarrow}'.repeat(12), { delay: 0 }).type('{rightarrow}'.repeat(12), { delay: 0 });
      warteAuf('kt', v => expect(v, 'zwölf Rastungen hin und zurück').to.equal(kt));
      cy.get('#kurveRad').type('{leftarrow}'.repeat(60), { delay: 0 });   // über den Anschlag hinaus: die gerade Linie
      warteAuf('kt', v => { const w = tabelle(v); expect(w[256], 'am linken Anschlag: die gerade Linie').to.be.closeTo(256.5 / 512, 1 / 4095); });
      cy.get('#kurveRad').type('{rightarrow}'.repeat(60), { delay: 0 });   // und bis zum rechten Anschlag: genau die Verteilung
      warteAuf('kt', v => expect(v, 'am rechten Anschlag: genau die Verteilung').to.equal(kt));
    });
  });

  it('Pendeln, Schieben, Wellen, Stufen, Weicher: alles aus der Tabelle abgelesen, hin und zurück bitgenau', () => {
    const rad = (id, taste, n) => cy.get('#' + id).focus().type(('{' + taste + '}').repeat(n), { delay: 0 });
    const setzen = (id, n = 1) => { for (let i = 0; i < n; i++) cy.get('#' + id).click(); };
    cy.visitApp(BILD + '&map=28'); cy.pane('farbe'); cy.get('#kurveArtTabelle').click();   // eine glatte Tabelle (die gerade Linie): eine steile Histogramm-Tabelle kann ganze Runden zwischen zwei Zeilen überspringen
    warteAuf('kt', voll).then(k0 => {
      cy.get('#kurvePendel').should('be.disabled');   // eine Runde: nichts zu pendeln
      setzen('kurveWdhPlus', 2); setzen('kurvePendel');
      cy.get('#kurvePendel').should('have.class', 'on');
      warteAuf('kt', v => { voll(v); const w = tabelle(v); expect(w.filter((x, i) => i && x < w[i - 1] - 0.5).length, 'pendelnd: keine Rücksprünge').to.equal(0); expect(w.some((x, i) => i && x < w[i - 1]), 'aber Strecken, die rückwärts laufen').to.equal(true); }).then(pendelnd => {
        cy.visitApp(BILD + '&map=28&kt=' + pendelnd); cy.pane('farbe');   // nach dem Laden: aus der Tabelle abgelesen, ohne Gedächtnis
        cy.get('#kurveWdhZahl').should('have.text', '3'); cy.get('#kurvePendel').should('have.class', 'on');
        rad('kurveSchiebRad', 'rightarrow', 20); warteAuf('kt', v => expect(v, 'geschoben').to.not.equal(pendelnd));
        rad('kurveSchiebRad', 'leftarrow', 20); warteAuf('kt', v => expect(v, 'zurückgeschoben').to.equal(pendelnd));
        rad('kurveWellenRad', 'rightarrow', 8); warteAuf('kt', v => expect(v, 'gewellt').to.not.equal(pendelnd));
        rad('kurveWellenRad', 'leftarrow', 8); warteAuf('kt', v => expect(v, 'die Welle wieder weg').to.equal(pendelnd));
        setzen('kurveStufenPlus', 4); cy.get('#kurveStufenZahl').should('have.text', '5');
        warteAuf('kt', v => expect(new Set(tabelle(v)).size, 'fünf Stufen').to.equal(5));
        setzen('kurveStufenMinus', 4); cy.get('#kurveStufenZahl').should('have.text', 'aus');
        warteAuf('kt', v => expect(v, 'ohne Stufen: wieder die glatte Tabelle').to.equal(pendelnd));
        cy.get('#kurveWdhZahl').should('have.text', '3'); cy.get('#kurvePendel').should('have.class', 'on');   // Stufen, Wellen, Schieben lassen Runden und Pendeln stehen
        setzen('kurvePendel'); setzen('kurveWdhMinus', 2);
        warteAuf('kt', v => { const a = tabelle(v), b = tabelle(k0); expect(Math.max(...a.map((x, i) => Math.abs(x - b[i]))) * 4095, 'Pendeln aus, eine Runde: die Tabelle vom Anfang (nach dem Laden ohne ungerundete Werte: höchstens zwei Bit Rundung)').to.be.at.most(2.001); });
        setzen('kurveWeicher');
        warteAuf('kt', v => { voll(v); expect(v, 'weicher').to.not.equal(k0); });
        cy.location('hash').then(h => expect([...new URLSearchParams(h.slice(1)).keys()].filter(k => !/^(mode|re|im|z|it|pv|den|aa|aam|aat|aax|aas|map|kt|ca)$/.test(k)), 'kein Stand der Werkzeuge im Link').to.deep.equal([]));
      });
    });
  });

  it('aus einem Ausschnitt befüllen: Rechteck im Bild aufziehen, Esc bricht ab', () => {
    const ziehen = (x0, y0, x1, y1) => {
      cy.get('#ausschnittWahl').trigger('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: x0, clientY: y0, force: true })
        .trigger('pointermove', { pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: x1, clientY: y1, force: true })
        .trigger('pointerup', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: x1, clientY: y1, force: true });
    };
    geladen(1280, 720).then(ganz => {
      cy.pane('farbe');
      cy.get('#kurveAusAusschnitt').click(); cy.get('#ausschnittWahl').should('not.have.attr', 'hidden');
      cy.get('body').type('{esc}'); cy.get('#ausschnittWahl').should('have.attr', 'hidden');   // abgebrochen: nichts gemessen
      cy.wait(600); cy.expectHash('kt', ganz);
      cy.get('#kurveAusAusschnitt').click();
      ziehen(100, 150, 400, 400);
      cy.get('#ausschnittWahl').should('have.attr', 'hidden');
      warteAuf('kt', v => { voll(v); expect(v, 'nur der Ausschnitt: eine andere Verteilung').to.not.equal(ganz); }).then(links => {
        cy.get('#kurveAusAusschnitt').click(); ziehen(100, 150, 400, 400);   // derselbe Ausschnitt: dieselbe Tabelle
        cy.wait(1000); warteAuf('kt', v => expect(v).to.equal(links));
        cy.get('#kurveAusHist').click();   // das ganze Bild: wieder die Tabelle vom Anfang
        warteAuf('kt', v => expect(v).to.equal(ganz));
      });
    });
  });

  // Das Histogramm stand in der Bildschleife hinter der Glättung: das Befüllen wartete sie ganz ab.
  // Mit adaptiver Glättung von 1024 Proben hieß das viele Sekunden, in denen sich scheinbar nichts tat.
  it('das Befüllen wirkt sofort, auch mitten in einer langen Glättung', () => {
    const SCHWER = 'mode=mandel&re=-0.22094502632049801464334432997345&im=-0.73374448804157853244596757677124&z=8.269621354e-1&it=18500&aa=4&aam=adaptive&aat=0.003&aax=1024&aas=0.45&map=3&tx=4&ts=0.9&ca=26.94922&p=3&f=11&pp=0.9545&dr=90';
    cy.visitApp(SCHWER, { aa: '' }); cy.waitRender();
    warteAuf('kt', voll).then(kt => {
      cy.get('#stage canvas').trigger('wheel', { deltaY: -600, clientX: 300, clientY: 300 });
      cy.get('#state', { timeout: 20000 }).should($s => expect($s.text(), 'die Glättung läuft').to.match(/Glättung \d+ %/));
      cy.pane('farbe'); befuellen();
      cy.location('hash', { timeout: 3000 }).should(h => expect(param(h, 'kt'), 'binnen drei Sekunden, nicht erst nach der Glättung').to.not.equal(kt));
      cy.get('#state').invoke('text').should('match', /Glättung/);   // die Glättung lief dabei weiter
    });
  });
});
