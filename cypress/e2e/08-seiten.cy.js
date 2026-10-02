describe('Menü-Seitenleiste und Unterseiten', () => {
  beforeEach(() => cy.visitApp());

  it('Burger oben links öffnet die Seitenleiste von links und schließt sie wieder', () => {
    cy.get('#drawer').should('not.have.class', 'open').and('have.attr', 'aria-hidden', 'true');
    cy.get('#burger').click().should('have.attr', 'aria-expanded', 'true');
    cy.get('#drawer').should('have.class', 'open').and('have.attr', 'aria-hidden', 'false');
    cy.get('#drawerBackdrop').should('be.visible');
    cy.wait(400);
    cy.get('#drawer').then($d => expect($d[0].getBoundingClientRect().left, 'am linken Rand').to.be.closeTo(0, 1));
    cy.get('#drawerTitle').should('have.text', 'Menü');
    cy.get('#drawer nav button').should('have.length', 5);
    cy.get('#drawerApp').should('have.text', 'Fraktale erkunden').and('have.attr', 'aria-current', 'page');
    cy.get('#drawerLang').should('have.value', 'de');
    cy.get('#drawerClose').click();
    cy.get('#drawer').should('not.have.class', 'open');
    cy.get('#burger').should('have.attr', 'aria-expanded', 'false');
    cy.get('#burger').click();
    cy.get('#drawerBackdrop').click();
    cy.get('#drawer').should('not.have.class', 'open');
    cy.get('#burger').click();
    cy.get('body').type('{esc}');
    cy.get('#drawer').should('not.have.class', 'open');
  });

  it('Impressum als eigene Seite: Adresse, Titel, Fußzeile führt zu den Fraktalen, Escape', () => {
    cy.get('#burger').click();
    cy.get('#drawer nav button[data-legal="impressum"]').click();
    cy.get('#page').should('be.visible');
    cy.get('#drawer').should('not.have.class', 'open');
    cy.get('#pageEyebrow').should('have.text', 'Rechtliches');
    cy.get('#pageTitle').should('have.text', 'Impressum');
    cy.get('#pageBody').should('contain.text', 'tobiga UG (haftungsbeschränkt)').and('contain.text', 'HRB 219431');
    cy.expectHash('page', 'impressum');
    cy.title().should('contain', 'Impressum');
    cy.get('.page-bar').should('not.contain.text', 'Fraktal-Renderer');   // kein Schriftzug in der Kopfzeile
    cy.get('#pageFootApp').should('have.text', 'Fraktale erkunden').click();
    cy.get('#page').should('not.be.visible');
    cy.expectHash('page', null);
    cy.title().should('eq', 'Fraktal-Renderer');
    cy.get('#siteBar button[data-legal="datenschutz"]').click();
    cy.get('#pageTitle').should('have.text', 'Datenschutzerklärung');
    cy.expectHash('page', 'datenschutz');
    cy.get('body').type('{esc}');
    cy.get('#page').should('not.be.visible');
  });

  it('„Über die App“: direkt per Adresse, Fußzeile wechselt die Seite, Sprache umschaltbar', () => {
    cy.visitApp('page=about');
    cy.get('#page').should('be.visible');
    cy.get('#pageEyebrow').should('have.text', 'Über die App');
    cy.get('#pageTitle').should('have.text', 'Fraktale im Browser');
    cy.get('#pageBody h3').first().should('have.text', 'Bedienung');   // ohne Aufzählung der Funktionen
    cy.get('#pageBody table').should('exist');
    cy.get('.page-foot button').should('have.length', 5);
    cy.get('.page-foot button[data-legal="impressum"]').click();
    cy.get('#pageTitle').should('have.text', 'Impressum');
    cy.expectHash('page', 'impressum');
    cy.pickOption('pageLang', 'en');
    cy.get('#pageTitle').should('have.text', 'Imprint');
    cy.get('#pageEyebrow').should('have.text', 'Legal');
    cy.get('#burger').click();
    cy.get('#drawerApp').should('be.visible').and('have.text', 'Explore fractals');
    cy.get('#drawerClose').click();
    cy.get('.page-foot button[data-legal="about"]').click();
    cy.get('#pageTitle').should('have.text', 'Fractals in the browser');
    cy.pickOption('pageLang', 'de');
    cy.get('#pageTitle').should('have.text', 'Fraktale im Browser');
  });

  it('Browser-Zurück und -Vor öffnen und schließen die Seite; App-Tastenkürzel bleiben aus', () => {
    cy.get('#siteBar button[data-legal="impressum"]').click();
    cy.get('#page').should('be.visible');
    cy.get('body').type('+');
    cy.expectHash('z', z => expect(parseFloat(z), 'kein Zoom hinter der Seite').to.eq(1));
    cy.go('back');
    cy.get('#page').should('not.be.visible');
    cy.expectHash('page', null);
    cy.go('forward');
    cy.get('#page').should('be.visible');
    cy.get('#pageTitle').should('have.text', 'Impressum');
  });

  it('alle Seiten gleichberechtigt: Menü auf Unterseiten, aktuelle Seite markiert, „Fraktale erkunden“ führt zur App', () => {
    cy.get('#siteBar button[data-legal="datenschutz"]').click();
    cy.get('#page').should('be.visible');
    cy.get('#burger').should('be.visible').click();
    cy.get('#drawer').should('have.class', 'open');
    cy.get('#drawer nav button[data-legal="datenschutz"]').should('have.attr', 'aria-current', 'page');
    cy.get('#drawerApp').should('be.visible').and('have.text', 'Fraktale erkunden').and('not.have.attr', 'aria-current');
    cy.get('#drawer nav button[data-legal="about"]').click();
    cy.get('#pageTitle').should('have.text', 'Fraktale im Browser');
    cy.expectHash('page', 'about');
    cy.get('.page-foot button[data-legal="about"]').should('have.attr', 'aria-current', 'page');
    cy.get('#burger').click();
    cy.get('#drawerApp').click();
    cy.get('#page').should('not.be.visible');
    cy.get('#drawer').should('not.have.class', 'open');
    cy.expectHash('page', null);
    cy.get('#burger').click();
    cy.get('#drawerApp').should('have.attr', 'aria-current', 'page');
    cy.get('#drawerClose').click();
  });

  it('die Fraktalansicht bleibt unter der Seite erhalten', () => {
    cy.pickOption('power', 3);
    cy.expectHash('p', '3');
    cy.get('#siteBar button[data-legal="impressum"]').click();
    cy.expectHash('p', '3');
    cy.expectHash('page', 'impressum');
    cy.get('#pageFootApp').click();
    cy.get('#power').should('have.value', '3');
    cy.get('#state').invoke('text').should('match', /Fertig/);
  });

  it('Seitenleiste am Handy nimmt die volle Breite bis zum rechten Rand', () => {
    cy.viewport(375, 812);
    cy.visitApp();
    cy.get('#burger').click();
    cy.wait(400);
    cy.get('#drawer').should('have.class', 'open').then($d => {
      const r = $d[0].getBoundingClientRect();
      expect(r.left).to.be.closeTo(0, 1);
      expect(r.width).to.be.at.most(375);
    });
    cy.get('#drawer nav button[data-legal="about"]').click();
    cy.get('#page').should('be.visible');
    cy.get('#pageFootApp').click();
    cy.get('#page').should('not.be.visible');
  });
});
