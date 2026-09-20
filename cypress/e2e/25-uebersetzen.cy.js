import { IMAGE_REGION } from '../support/commands';

// Übersetzen der Fassung mit Ebenen und Masken: die Fassung des Farbpasses, die Einstellungsebenen und Ebenenmasken kennt,
// entsteht beim ersten Gebrauch nebenher (WebGPU: Pipelines asynchron, WebGL 2: Programme parallel). Solange zeigt der
// Bildschirm die Farbe ohne Ebenen, die Statuszeile sagt „Ebenen und Masken werden übersetzt …“, die Laufanzeige läuft.
// Die Testhaken window.__uebersetzenHalten (hält die Übersetzung an, bis der Test sie freigibt) und window.__uebersetzenFehler
// (lässt sie scheitern) machen den flüchtigen Zustand fassbar; ohne sie wäre er im aktuellen Chrome nach Millisekunden vorbei.
describe('Übersetzen der Fassung mit Ebenen und Masken', () => {
  const B = 'mode=mandel&re=-0.9&im=0.6&z=1&it=400';
  const TIEF = 'mode=mandel&re=-0.7436447860&im=0.1318252536&z=3000&it=2500';   // adaptive Glättung braucht hier mehrere Sekunden
  const DREI = 'mode=mandel&l2=f%3D1&l3=f%3D2&lm2=2:0.7:1:0:1:&lm3=10:0.5:1:0:1:&la=3';   // Mandelbrot, Burning Ship, Tricorn; Ebene 3 gewählt
  const halten = () => cy.window().then(win => { win.__uebersetzenHalten = true; });
  const frei = () => cy.window().then(win => { win.__uebersetzenHalten = false; });
  const stand = () => cy.window().then(win => win.ebenenStand());
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  // Eine Einstellungsebene aus der Liste (12 = Graustufen: das Bild wird grau, was pngStats als Anteil „grau“ misst)
  const ebene = art => { cy.get('#nachNeu + .menu-btn').scrollIntoView().click(); cy.get('#nachNeuMenu').should('be.visible').find('button[data-value="' + art + '"]').click(); cy.get('#nachNeu').should('have.value', '0'); };
  // Der Zustand „wird übersetzt“: Statuszeile, Klasse für die Laufleiste, Punkt am Handy, Testhaken
  const meldung = (timeout = 15000) => {
    cy.get('#state', { timeout }).should($s => expect($s.text(), 'Statuszeile').to.match(/übersetzt|Compiling/));
    cy.get('#state').should('have.class', 'uebersetzt'); cy.get('#mStatus').should('have.class', 'busy');
    stand().its('uebersetzt').should('be.true');
  };
  const fertigOhneMeldung = (re = /Fertig|Done/, timeout = 30000) => {
    cy.get('#state', { timeout }).should($s => { const t = $s.text(); expect(t, 'Statuszeile').to.match(re); expect(t, 'Statuszeile').not.to.match(/übersetzt|Compiling/); });
    cy.get('#state').should('not.have.class', 'uebersetzt'); cy.get('#mStatus').should('not.have.class', 'busy');
    stand().its('uebersetzt').should('be.false');
  };
  // Die Anzeigen im Fuß des Bedienfelds (Tiefe, Koordinaten, Status) bleiben da und sind nicht leer
  const anzeigenDa = () => { for (const id of ['depthVal', 'coords', 'state']) cy.get('#' + id).should('be.visible').invoke('text').should('not.be.empty'); };

  it('angehalten: Meldung, Laufanzeige und ein Bild ohne die Ebene; freigegeben: Fertig, keine Meldung, die Ebene wirkt', () => {
    cy.visitApp(B); cy.pane('nach');
    cy.shotStats('ue-ohne').then(ohne => {
      expect(ohne.grau, 'farbiges Ausgangsbild').to.be.lessThan(0.5);
      halten(); ebene(12);
      meldung(); anzeigenDa();
      cy.wait(800); cy.gezeichnet();
      cy.shotStats('ue-gehalten').then(g => { diff(ohne, g).then(d => expect(d.meanDiff, 'ohne Fassung: die Farbe wie zuvor').to.be.lessThan(2)); expect(g.grau, 'noch farbig').to.be.lessThan(0.5); });
      cy.expectHash('nb', v => expect(v, 'die Ebene steht trotzdem im Link').to.match(/^12:/));
      frei(); fertigOhneMeldung(); anzeigenDa();
      cy.gezeichnet(); cy.shotStats('ue-frei').then(f => expect(f.grau, 'Graustufen wirken').to.be.greaterThan(0.95));
    });
  });

  it('während der adaptiven Glättung: die Glättung läuft weiter und die Anzeigen bleiben; danach die Meldung; freigegeben: Fertig mit Glättung und Ebene', () => {
    cy.visitApp(TIEF, { storage: { 'fractal.aamode': 'adaptive', 'fractal.aamax': '1024' }, wait: false });
    cy.pane('nach');
    cy.get('#state', { timeout: 60000 }).should($s => expect($s.text(), 'die Glättung läuft').to.match(/Glättung \d+ %/));
    halten(); ebene(12);
    cy.get('#state', { timeout: 15000 }).should($s => { const x = $s.text(); expect(x, 'Glättung läuft weiter').to.match(/Glättung \d+ %/); expect(x, 'und die Zeile sagt, worauf die Laufleiste wartet').to.match(/übersetzt/); });   // beides in einer Zeile (Nutzerwunsch 19.09.2026: der Text zum Balken fehlte)
    stand().its('uebersetzt').should('be.true'); cy.get('#mStatus').should('have.class', 'busy');
    anzeigenDa();
    cy.wait(500); anzeigenDa();
    meldung(90000);   // die Glättung ist durch: jetzt sagt die Zeile, worauf sie wartet
    anzeigenDa();
    cy.gezeichnet(); cy.shotStats('ue-glatt-gehalten').then(g => expect(g.grau, 'ohne Fassung noch farbig').to.be.lessThan(0.5));
    frei(); fertigOhneMeldung(/Fertig.*Glättung/); anzeigenDa();
    cy.gezeichnet(); cy.shotStats('ue-glatt-frei').then(f => expect(f.grau, 'Graustufen wirken auf dem geglätteten Bild').to.be.greaterThan(0.95));
  });

  it('Fehlerpfad: scheitert das Übersetzen, sagt es die App, die Meldung bleibt nicht hängen, das Bild bleibt farbig, die App bleibt bedienbar', () => {
    cy.visitApp(B, { onBeforeLoad: win => { win.__uebersetzenFehler = true; } }); cy.pane('nach');
    cy.shotStats('ue-fehler-vorher').then(vorher => {
      ebene(12);
      cy.get('#state', { timeout: 15000 }).should($s => expect($s.text(), 'der Hinweis').to.match(/nicht übersetzt|not compiled/));
      fertigOhneMeldung();   // nach dem Hinweis wieder „Fertig“, nicht „wird übersetzt“
      stand().then(z => { expect(z.nachFehler, 'der Fehler ist gemerkt').to.match(/Testhaken/); expect(z.phase, 'Bildschleife ruhig').to.eq('idle'); });
      cy.gezeichnet(); cy.shotStats('ue-fehler-nachher').then(n => { diff(vorher, n).then(d => expect(d.meanDiff, 'ohne Fassung: die Farbe wie zuvor').to.be.lessThan(2)); expect(n.grau).to.be.lessThan(0.5); });
      cy.get('#stage canvas').dblclick(300, 300); cy.waitRender();   // weiter bedienbar: zoomen rechnet neu und meldet Fertig
      cy.expectHash('z', v => expect(parseFloat(v), 'gezoomt').to.be.greaterThan(1.5));
      cy.expectHash('nb', v => expect(v, 'die Ebene bleibt im Link').to.match(/^12:/));
      cy.get('#state').should('not.have.class', 'uebersetzt');
    });
  });

  it('die Ebene während des Übersetzens wieder entfernen: freigegeben Fertig und das Bild wie ohne Ebene; eine neue Ebene wirkt danach sofort', () => {
    cy.visitApp(B); cy.pane('nach');
    cy.shotStats('ue-weg-vorher').then(vorher => {
      halten(); ebene(12); meldung();
      cy.get('#nachKarte1 .tex-weg').click(); cy.get('#rueckfrageJa').click(); cy.get('#nachKarte1').should('not.exist');
      cy.hashParams().then(h => expect(h.has('nb'), 'keine Ebene im Link').to.be.false);
      frei(); fertigOhneMeldung();
      cy.gezeichnet(); cy.shotStats('ue-weg-nachher').then(n => diff(vorher, n).then(d => expect(d.meanDiff, 'wie ohne Ebene').to.be.lessThan(2)));
      ebene(12);   // die Fassung steht jetzt: keine Meldung mehr, die Ebene wirkt gleich
      cy.waitRender(); cy.get('#state').invoke('text').should('not.match', /übersetzt/);
      cy.gezeichnet(); cy.shotStats('ue-weg-neu').then(n => expect(n.grau, 'Graustufen wirken sofort').to.be.greaterThan(0.95));
    });
  });

  it('Schalter und Deckkraft während des Übersetzens: freigegeben gilt der letzte Stand (aus bleibt farbig, an wird grau)', () => {
    cy.visitApp(B); cy.pane('nach');
    halten(); ebene(12); meldung();
    cy.get('#nachAn1').uncheck({ force: true });
    cy.expectHash('nb', v => expect(v, 'aus im Link').to.match(/^12:0:/));
    frei(); fertigOhneMeldung();
    cy.gezeichnet(); cy.shotStats('ue-schalter-aus').then(aus => {
      expect(aus.grau, 'ausgeschaltet: farbig').to.be.lessThan(0.5);
      cy.get('#nachAn1').check({ force: true }); cy.wait(400);
      cy.get('#state').invoke('text').should('not.match', /übersetzt/);
      cy.gezeichnet(); cy.shotStats('ue-schalter-an').then(an => expect(an.grau, 'eingeschaltet: grau, ohne erneutes Übersetzen').to.be.greaterThan(0.95));
    });
  });

  it('Zoomen während des Übersetzens: nach jedem Bild kommt die Meldung wieder, das Bild bleibt farbig; freigegeben wirkt die Ebene auf der neuen Ansicht', () => {
    cy.visitApp(B); cy.pane('nach');
    halten(); ebene(12); meldung();
    cy.get('#stage canvas').dblclick(300, 300);
    cy.expectHash('z', v => expect(parseFloat(v), 'gezoomt').to.be.greaterThan(1.5));
    meldung(30000); anzeigenDa();
    cy.gezeichnet(); cy.shotStats('ue-zoom-gehalten').then(g => expect(g.grau, 'noch farbig').to.be.lessThan(0.5));
    frei(); fertigOhneMeldung();
    cy.gezeichnet(); cy.shotStats('ue-zoom-frei').then(f => expect(f.grau, 'Graustufen auf der neuen Ansicht').to.be.greaterThan(0.95));
  });

  it('Fraktal-Ebenen: Masken auf zwei Ebenen, gesetzt während die Fassung übersetzt wird – freigegeben wirken beide wie frisch geladen', () => {
    cy.visitApp(DREI); cy.alleEbenenFertig(); cy.pane('ebenen');
    halten();
    cy.pickOption('ebM3_art', 3);   // Iterationsbereich auf Ebene 3 (der gewählten)
    cy.expectHash('lu3', v => expect(v, 'Maske der Ebene 3 im Link').to.match(/^m3,/));   // der Link folgt mit 400 ms Verzug
    meldung(30000);
    cy.get('#stWahl2').click(); cy.get('#ebM2_art').should('exist');
    cy.pickOption('ebM2_art', 1);   // Innen/Außen auf Ebene 2, noch während die Fassung entsteht
    cy.expectHash('lu2', v => expect(v, 'Maske der Ebene 2 im Link').to.match(/^m1,/)); cy.expectHash('la', '2');
    frei(); fertigOhneMeldung(); cy.alleEbenenFertig();
    cy.hashParams().then(h => {
      const lu2 = h.get('lu2'), lu3 = h.get('lu3');
      expect(lu2, 'Maske der Ebene 2 im Link').to.match(/^m1,/); expect(lu3, 'Maske der Ebene 3 im Link').to.match(/^m3,/);
      cy.gezeichnet(); cy.shotStats('ue-masken-live').then(live => {
        cy.visitApp(DREI + '&lu2=' + encodeURIComponent(lu2) + '&lu3=' + encodeURIComponent(lu3)); cy.alleEbenenFertig(); cy.gezeichnet();
        cy.shotStats('ue-masken-frisch').then(frisch => diff(live, frisch).then(d => expect(d.meanDiff, 'beide Masken wirken wie frisch geladen').to.be.lessThan(3)));
      });
    });
  });

  it('Sprachwechsel während des Übersetzens: die Meldung wechselt mit, freigegeben „Done“', () => {
    cy.visitApp(B); cy.pane('nach');
    halten(); ebene(12); meldung();
    cy.pickOption('siteLangSel', 'en');
    cy.get('#state', { timeout: 10000 }).should($s => expect($s.text()).to.match(/Compiling layers and masks/));
    cy.get('#state').should('have.class', 'uebersetzt');
    frei(); fertigOhneMeldung(/Done/);
    cy.gezeichnet(); cy.shotStats('ue-en-frei').then(f => expect(f.grau).to.be.greaterThan(0.95));
  });

  it('Handy: der Statuspunkt pulsiert, das aufgeklappte Statusfeld trägt die Meldung; freigegeben Fertig', () => {
    cy.viewport(390, 844);
    cy.visitApp(B); cy.get('#tabNach').click();
    halten(); ebene(12);
    cy.get('#mStatus', { timeout: 15000 }).should('have.class', 'busy').click();
    cy.get('#mState').should('be.visible').invoke('text').should('match', /übersetzt/);
    cy.get('#mState').should('have.class', 'uebersetzt');
    frei();
    cy.get('#mState', { timeout: 30000 }).should($s => { expect($s.text()).to.match(/Fertig/); expect($s.text()).not.to.match(/übersetzt/); });
    cy.get('#mStatus').should('not.have.class', 'busy'); cy.get('#mState').should('not.have.class', 'uebersetzt');
  });

  it('WebGL 2: dieselbe Meldung, angehalten und freigegeben; ohne parallele Übersetzung wirkt die Ebene sofort', () => {
    cy.visitApp(B, { storage: { 'fractal.renderer': 'webgl' } }); cy.pane('nach');
    cy.get('#badge').invoke('text').should('match', /WebGL/i);
    halten(); ebene(12); cy.wait(300);
    stand().then(z => {
      if (z.uebersetzt) {   // KHR_parallel_shader_compile: die Programme entstehen nebenher, der Haken hält die Prüfung an
        meldung(); anzeigenDa();
        cy.gezeichnet(); cy.shotStats('ue-gl-gehalten').then(g => expect(g.grau, 'noch farbig').to.be.lessThan(0.5));
        frei(); fertigOhneMeldung();
      } else {   // ohne die Erweiterung übersetzt WebGL sofort; dann darf es auch keine Meldung geben
        cy.log('WebGL 2 ohne parallele Übersetzung: sofort fertig');
        cy.get('#state').invoke('text').should('not.match', /übersetzt/);
        frei();
      }
      cy.waitRender(); cy.gezeichnet(); cy.shotStats('ue-gl-frei').then(f => expect(f.grau, 'Graustufen wirken mit WebGL 2').to.be.greaterThan(0.95));
    });
  });

  it('Hinweis über dem Bild: erscheint erst nach kurzer Zeit mit Schritt und Sekunden, zählt hoch, steht auch in der Statuszeile, lässt sich wegklicken', () => {
    cy.visitApp(B); cy.pane('nach');
    cy.get('#uebersetzenToast').should('have.attr', 'hidden');
    halten(); ebene(12); meldung();
    cy.get('#uebersetzenToast', { timeout: 5000 }).should('be.visible');
    cy.get('#uebersetzenToast .toast-text').invoke('text').should('match', /übersetzt/);
    cy.get('#toastDetail').invoke('text').should('match', /^Schritt 1 von [1-4] · \d+ s$/);   // WebGPU: vier Programme nacheinander, das erste läuft
    stand().then(z => { expect(z.uebSchritt, 'noch kein Schritt fertig').to.eq(0); expect(z.uebSchritte, 'Schritte gezählt').to.be.within(1, 4); });
    cy.get('#toastDetail').invoke('text').then(a => {
      cy.wait(1300);
      cy.get('#toastDetail').invoke('text').then(b => { const sek = x => parseInt(x.match(/(\d+) s$/)[1], 10); expect(sek(b), 'die Sekunden zählen hoch').to.be.greaterThan(sek(a)); });
    });
    cy.get('#state').invoke('text').should('match', /übersetzt … Schritt 1 von [1-4] · \d+ s/);   // dieselbe Angabe in der Statuszeile
    cy.get('#toastWeg').click(); cy.get('#uebersetzenToast').should('have.attr', 'hidden');
    cy.wait(900); cy.get('#uebersetzenToast').should('have.attr', 'hidden');   // bleibt weg, solange diese Übersetzung läuft
    meldung();   // die Statuszeile sagt es weiterhin
    frei(); fertigOhneMeldung(); cy.get('#uebersetzenToast').should('have.attr', 'hidden');
    cy.gezeichnet(); cy.shotStats('ue-toast-frei').then(f => expect(f.grau, 'Graustufen wirken').to.be.greaterThan(0.95));
  });

  it('Hinweis abschaltbar in Technik: ohne ihn bleibt die Statuszeile; die Einstellung überlebt das Neuladen', () => {
    cy.visitApp(B); cy.pane('technik');
    cy.get('#toastAn').should('be.checked').uncheck({ force: true });
    cy.window().then(win => expect(win.localStorage.getItem('fractal.toast'), 'abgelegt').to.eq('0'));
    cy.pane('nach'); halten(); ebene(12); meldung();
    cy.wait(1200); cy.get('#uebersetzenToast').should('have.attr', 'hidden');
    cy.get('#state').invoke('text').should('match', /übersetzt … (Schritt 1 von [1-4] · )?\d+ s/);
    frei(); fertigOhneMeldung();
    cy.visitApp(B, { storage: { 'fractal.toast': '0' } }); cy.pane('technik');
    cy.get('#toastAn').should('not.be.checked').check({ force: true });
    cy.window().then(win => expect(win.localStorage.getItem('fractal.toast'), 'wieder an').to.eq('1'));
  });

  it('Handy: der Statusknopf zeigt den Zustand, solange etwas läuft; der Hinweis steht oben unter der Kopfzeile', () => {
    cy.viewport(390, 844);
    cy.visitApp(B);
    cy.get('#mKurz').should('have.text', '');   // fertig: nur der Zoom im Knopf
    cy.get('#tabNach').click(); halten(); ebene(12);
    cy.get('#mKurz', { timeout: 15000 }).invoke('text').should('match', /übersetzt/);
    cy.get('#mKurz').should('be.visible');
    cy.get('#uebersetzenToast', { timeout: 5000 }).should('be.visible').then($t => { const r = $t[0].getBoundingClientRect(); expect(r.top, 'oben unter der Kopfzeile').to.be.within(40, 160); expect(r.right, 'im Bild').to.be.lessThan(392); });
    frei();
    cy.get('#mState', { timeout: 30000 }).should($s => { expect($s.text()).to.match(/Fertig/); expect($s.text()).not.to.match(/übersetzt/); });
    cy.get('#mKurz').should('have.text', ''); cy.get('#uebersetzenToast').should('have.attr', 'hidden');
  });
});
