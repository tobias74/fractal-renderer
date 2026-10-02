describe('Grundlegende Zugänglichkeit', () => {
  beforeEach(() => cy.visitApp());

  it('jedes Bedienelement im Bedienfeld hat einen Namen', () => {
    cy.get('#panel button:not([hidden]), #panel select, #panel input:not([type=file])').each($el => {
      const el = $el[0], id = el.id;
      const name = el.getAttribute('aria-label')
        || (id && Cypress.$(`label[for="${id}"]`).text())
        || $el.closest('label').text()
        || el.textContent.trim();
      expect(name, `${el.tagName.toLowerCase()}#${id || el.className}`).to.match(/\S/);
    });
  });

  it('Menüs, Dialoge und Unterseiten tragen ARIA-Rollen', () => {
    cy.get('#burger').should('have.attr', 'aria-controls', 'drawer').and('have.attr', 'aria-expanded', 'false');
    cy.get('#drawer').should('have.attr', 'aria-label');
    cy.get('#power + .menu-btn').should('have.attr', 'aria-haspopup', 'listbox').and('have.attr', 'aria-controls', 'powerMenu');
    cy.get('#powerMenu').should('have.attr', 'role', 'listbox').find('[role="option"]').should('have.length', 7);
    cy.get('#consent').should('have.attr', 'role', 'dialog').and('have.attr', 'aria-labelledby', 'consentTitle');
    cy.get('#poster .modal-card').should('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
    cy.get('#page').should('have.attr', 'role', 'document');
    cy.get('#panelTab').should('have.attr', 'aria-controls', 'panelBody');
  });

  it('Tastaturfokus: Griff und Menüknöpfe sind fokussierbar, die versteckten Selects nicht', () => {
    cy.get('#panelTab').focus().should('have.focus');
    cy.get('#power + .menu-btn').focus().should('have.focus');
    cy.get('#power').should('have.attr', 'tabindex', '-1');
    cy.get('#powerMenu button').first().should('have.attr', 'tabindex', '-1');
  });

  it('Bilder und Grafiken sind beschrieben oder als Dekoration markiert', () => {
    cy.get('#panel svg').each($s => expect($s.attr('aria-hidden'), 'dekoratives SVG').to.eq('true'));
    cy.get('#shot').should('have.attr', 'alt');
  });

  it('Sprache des Dokuments passt zur gewählten Sprache', () => {
    cy.get('html').invoke('attr', 'lang').should('match', /^de/);
    cy.pickOption('siteLangSel', 'en');
    cy.get('html').invoke('attr', 'lang').should('match', /^en/);
  });
});
