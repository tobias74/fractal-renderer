const browserLang = lang => win => Object.defineProperty(win.navigator, 'language', { value: lang, configurable: true });

describe('Sprache', () => {
  it('Deutsch für deutsche Browser; Englisch per Leiste unten rechts, Wahl bleibt gespeichert', () => {
    cy.visitApp('', { lang: null, onBeforeLoad: browserLang('de-DE') });
    cy.get('.panel-head .wordmark').should('have.text', 'Motiv');
    cy.get('#siteBar button[data-legal="impressum"]').should('have.text', 'Impressum');
    cy.get('#siteLangSel').should('have.value', 'de');
    cy.pickOption('siteLangSel', 'en');
    cy.get('.panel-head .wordmark').should('have.text', 'Subject');
    cy.get('#siteBar button[data-legal="impressum"]').should('have.text', 'Imprint');
    cy.get('#rail button[data-pane="farbe"]').should('have.attr', 'aria-label', 'Colour');
    cy.get('#burger').should('have.attr', 'aria-label', 'Menu');
    cy.get('label[for="power"]').should('have.text', 'Power d');
    cy.get('#state').invoke('text').should('match', /Done · \d+ ms/).and('match', /iterations/);
    cy.get('#family + .menu-btn span').first().should('have.text', 'Mandelbrot set');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.lang')).to.eq('en'));
    cy.visitApp('', { keep: true, lang: null, consent: null, aa: null });
    cy.get('.panel-head .wordmark').should('have.text', 'Subject');
    cy.get('#drawerLang').should('have.value', 'en');
  });

  it('Englisch aus der Browsersprache, wenn nichts gespeichert ist', () => {
    cy.visitApp('', { lang: null, onBeforeLoad: browserLang('en-US') });
    cy.get('.panel-head .wordmark').should('have.text', 'Subject');
    cy.get('#siteLangSel').should('have.value', 'en');
  });

  it('Umschalten in der Seitenleiste wirkt überall, auch auf Menüeinträge und Hinweise', () => {
    cy.visitApp('', { lang: 'en' });
    cy.get('#burger').click();
    cy.get('#drawerLang').should('have.value', 'en');
    cy.get('#drawer nav button[data-legal="about"]').should('have.text', 'About the app');
    cy.pickOption('drawerLang', 'de');
    cy.get('#drawer nav button[data-legal="about"]').should('have.text', 'Über die App');
    cy.get('#drawerClose').click();
    cy.get('#siteLangSel').should('have.value', 'de');
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.get('#family + .menu-btn').click();
    cy.get('#familyMenu h4').first().should('have.text', 'Fluchtzeit');
    cy.get('body').type('{esc}');
  });

  it('dynamische Texte werden nachträglich übersetzt (Statuszeile, Glättung, Technik)', () => {
    cy.visitApp('', { lang: 'en' });
    cy.pickOption('aaSel', 2);
    cy.get('#aaVal').should('contain.text', 'samples per pixel');
    cy.get('#resInfo').should('contain.text', 'smoothing 2 × 2');
    cy.waitRender(/Done.*smoothing/, 60000);
    cy.pickOption('family', 'clifford');
    cy.waitRender(/Done|Collecting/, 30000);
    cy.get('#state').invoke('text').should('match', /M points/);   // Statuszeile der Punktwolke auf Englisch
  });

  it('Wörterbuch: jede Marke und jeder Schlüssel hat einen Eintrag, keine Karteileichen, gleiche Platzhalter', () => {
    cy.task('i18nPruefen').then(e => {
      expect(e.fehler, 'Fehler in der Übersetzung').to.deep.eq([]);
      expect(e.eintraege, 'Einträge im Wörterbuch').to.be.greaterThan(300);
      expect(e.marken, 'Marken im Markup').to.be.greaterThan(150);
    });
  });

  it('zur Laufzeit fehlt kein Schlüssel, auch nicht in Editoren, Dialogen und Unterseiten', () => {
    cy.visitApp('mode=mandel&map=15&p2=field-lines', { lang: 'en' });
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();                       // Editor der zweidimensionalen Paletten
    cy.get('#pal2Ed').should('not.have.attr', 'hidden');
    cy.rerender(() => cy.pickOption('mapping', 13));   // andere Färbung, andere Hinweise
    cy.pickOption('aaModeSel', 'adaptive');           // adaptive Glättung: eigene Hinweise
    cy.get('#save').click();                          // Speichern-Dialog
    cy.get('#poster').should('not.have.attr', 'hidden');
    cy.get('#posterCancel').click();
    cy.get('#burger').click(); cy.get('#drawerClose').click();
    cy.window().then(win => expect(win.__i18n().fehlende, 'Schlüssel ohne Eintrag').to.deep.eq([]));
  });

  it('Umschalten zur Laufzeit ergibt dieselbe Seite wie frisches Laden', () => {
    const inventar = () => cy.window().then(win => {
      const norm = s => s.replace(/\s+/g, ' ').trim().replace(/[0-9][0-9.,]*/g, '#');
      const out = [], w = win.document.createTreeWalker(win.document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const p = n.parentElement; if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName)) continue;
        const v = norm(n.nodeValue); if (v) out.push(v);
      }
      for (const el of win.document.body.querySelectorAll('[aria-label],[placeholder],[title],optgroup[label]'))
        for (const a of ['aria-label', 'placeholder', 'title', 'label']) if (el.hasAttribute(a)) out.push('@' + a + ': ' + norm(el.getAttribute(a)));
      return out.sort().join('\n');
    });
    cy.visitApp('mode=mandel', { lang: 'de' });
    cy.waitRender(/Fertig/);
    cy.pickOption('siteLangSel', 'en');
    cy.waitRender(/Done/);
    inventar().then(umgeschaltet => {
      cy.visitApp('mode=mandel', { lang: 'en' });
      cy.waitRender(/Done/);
      inventar().then(frisch => expect(umgeschaltet, 'Umschalten wie frisch geladen').to.eq(frisch));
    });
  });

  it('Zahlen folgen der Sprache: Komma auf Deutsch, Punkt auf Englisch', () => {
    cy.visitApp('mode=mandel&den=0.04', { lang: 'de' });
    cy.get('#densVal').should('have.text', '0,040');
    cy.get('#zoomRead').should('contain.text', '1,0×');
    cy.visitApp('mode=mandel&den=0.04', { lang: 'en' });
    cy.get('#densVal').should('have.text', '0.040');
    cy.get('#zoomRead').should('contain.text', '1.0×');
  });

  it('Rechtstexte liegen in beiden Sprachen vor', () => {
    cy.visitApp('page=datenschutz', { lang: 'en' });
    cy.get('#pageTitle').should('have.text', 'Privacy policy');
    cy.get('#pageBody').invoke('text').should('match', /localStorage|local storage/i);
    cy.get('#pageBody').should('contain.text', 'Processing in this application').and('contain.text', 'tobiga UG');
    cy.get('#pageBody h4').its('length').should('be.greaterThan', 30);
    cy.pickOption('pageLang', 'de');
    cy.get('#pageTitle').should('have.text', 'Datenschutzerklärung');
    cy.get('#pageBody').should('contain.text', 'Speicher').and('contain.text', 'Verarbeitung in dieser Anwendung');
  });
});
