// Schnelltest (rund eine halbe Minute): Läuft die App überhaupt noch?
//
// Gedacht für kleine Änderungen an Texten, Stilen oder einzelnen Bedienelementen: „npm run test:smoke“ prüft nur,
// dass nichts Grundlegendes zerbrochen ist. Für die geänderte Stelle selbst kommt die zuständige Spezifikation dazu
// („npx cypress run --spec cypress/e2e/12-farben.cy.js“), und der komplette Lauf („npm run test:e2e“, mehrere
// Minuten) bleibt den größeren Umbauten und dem Stand vor dem Zusammenführen vorbehalten.
describe('Schnelltest', () => {
  it('startet, rendert ein Bild und wechselt zwischen allen Bereichen', () => {
    cy.visitApp();
    cy.get('#badge').invoke('text').should('match', /^(WebGPU|WebGL 2)$/);
    cy.get('#fatal').should('not.be.visible');
    cy.get('#stage canvas').should('be.visible');
    cy.get('#resInfo').should('contain.text', 'Render ');
    cy.get('#rail button[data-pane]').should('have.length', 4);
    for (const [p, titel] of [['motiv', 'Motiv'], ['farbe', 'Farbe'], ['qualitaet', 'Qualität'], ['technik', 'Technik']]) {
      cy.get('#rail button[data-pane="' + p + '"]').click();
      cy.get('#pane-' + p).should('not.have.attr', 'hidden');
      cy.get('.panel-head .wordmark').should('have.text', titel);
    }
    cy.get('#panel .panel-foot #state').should('be.visible');
  });

  it('rechnet mit beiden Glättungsverfahren zu Ende und färbt sofort um', () => {
    cy.visitApp();
    cy.rerender(() => cy.pickOption('aaSel', 2));               // Raster
    cy.get('#resInfo').should('contain.text', 'Glättung 2 × 2');
    cy.rerender(() => cy.pickOption('aaModeSel', 'adaptive'));  // adaptiv, kleinste Stufe: in Sekunden fertig
    cy.setRange('aaMax', 0);
    cy.waitRender(/Fertig · [\d,]+ (ms|s) \+ [\d,]+ (ms|s) Glättung/, 60000);
    cy.get('#resInfo').should('contain.text', 'Glättung adaptiv');
    cy.pane('farbe');
    cy.pickOption('palette', '2');                              // Umfärben braucht keinen neuen Durchlauf
    cy.waitRender();
  });

  it('zeigt den Einwilligungsdialog und lässt ihn am kleinen Schirm bedienen', () => {
    cy.viewport(375, 560);
    cy.visitApp('', { consent: null, wait: false });
    cy.get('#consent').should('be.visible');
    cy.get('#consent').scrollTo('bottom');                      // die Karte ist höher als das Bild
    cy.get('#consentAll').should($b => {
      const r = $b[0].getBoundingClientRect();
      expect(r.bottom, 'Knopf im Bild').to.be.at.most(560);
    }).click();
    cy.get('#consent').should('not.be.visible');
    cy.waitRender();
  });
});
