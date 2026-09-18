const RAIL = 46;   // Breite der Bereichsleiste am rechten Rand

describe('Bedienfeld: Schublade und Bereichsleiste am PC', () => {
  beforeEach(() => cy.visitApp());

  it('ist offen, bündig an der Bereichsleiste, die Leiste zeigt drei Bereiche', () => {
    cy.get('#panel').should('not.have.class', 'collapsed').then($p => {
      const r = $p[0].getBoundingClientRect();
      expect(r.right, 'schließt an die Bereichsleiste an').to.eq(1280 - RAIL);
      expect(r.top, 'oben bündig').to.eq(0);
      expect(r.height, 'volle Höhe').to.eq(720);
      expect(r.width, 'Breite').to.be.closeTo(356, 1);
    });
    cy.get('.panel-head .wordmark').should('have.text', 'Motiv');   // die Kopfzeile nennt den offenen Bereich
    cy.get('#badge').should('be.visible');
    cy.get('#toggle').should('not.be.visible');
    cy.get('#rail').should('be.visible').then($r => {
      const r = $r[0].getBoundingClientRect();
      expect(r.right, 'Leiste am rechten Rand').to.eq(1280);
      expect(r.width, 'Breite der Leiste').to.eq(RAIL);
    });
    cy.get('#rail button[data-pane]').should('have.length', 8);   // Motiv, Farbe, Texturen, Palette, Qualität, Mischen, Nachbearbeitung, Technik
    cy.get('#rail button[data-pane="motiv"]').should('have.class', 'on');
    cy.get('#panelTab').should('be.visible').and('have.attr', 'aria-expanded', 'true');
    cy.get('#burger').then($b => { const b = $b[0].getBoundingClientRect(); expect(b.top).to.be.closeTo(14, 1); expect(b.left, 'Menü-Knopf links').to.be.closeTo(14, 1); });
  });

  it('gleitet hinaus und wieder herein; die Bereichsleiste bleibt stehen', () => {
    cy.get('#panelTab').click();
    cy.get('#panel').should('have.class', 'collapsed');
    cy.get('#panelTab').should('have.attr', 'aria-expanded', 'false');
    cy.wait(500);   // Übergang abwarten
    cy.get('#rail').should('be.visible').then($r => expect($r[0].getBoundingClientRect().right, 'Leiste bleibt am Bildrand').to.eq(1280));
    cy.get('#panel').then($p => expect($p[0].getBoundingClientRect().left, 'Schublade draußen').to.be.greaterThan(1279));
    cy.get('#panelBody').should('not.have.attr', 'hidden');
    cy.get('#panelTab').click();
    cy.get('#panel').should('not.have.class', 'collapsed');
    cy.wait(500);
    cy.get('#panel').then($p => expect($p[0].getBoundingClientRect().right).to.eq(1280 - RAIL));
    cy.get('#family + .menu-btn').should('be.visible');
  });

  it('die Leiste wechselt den Bereich, die Statuszeile bleibt sichtbar', () => {
    cy.get('#pane-motiv').should('not.have.attr', 'hidden');
    cy.get('#panel .panel-foot #state').should('be.visible');
    cy.get('#rail button[data-pane="farbe"]').click();
    cy.get('#pane-farbe').should('not.have.attr', 'hidden');
    cy.get('#pane-motiv').should('have.attr', 'hidden');
    cy.get('.panel-head .wordmark').should('have.text', 'Farbe');
    cy.get('#rail button[data-pane="farbe"]').should('have.class', 'on');
    cy.get('#panel .panel-foot #state').should('be.visible');
    cy.get('#rail button[data-pane="qualitaet"]').click();
    cy.get('#pane-qualitaet').should('not.have.attr', 'hidden');
    cy.get('.panel-head .wordmark').should('have.text', 'Qualität');
    cy.get('#rail button[data-pane="technik"]').click();
    cy.get('#pane-technik').should('not.have.attr', 'hidden');
    cy.get('#pane-qualitaet').should('have.attr', 'hidden');
    cy.get('.panel-head .wordmark').should('have.text', 'Technik');
    cy.get('#rail button[data-pane="motiv"]').click();
    cy.get('.panel-head .wordmark').should('have.text', 'Motiv');
  });

  // Seit die Werte Eingabefelder sind, brauchen die Gruppen Luft: Der Farbbereich ist damit bei 720 px Fensterhöhe
  // etwas höher als das Bedienfeld und rollt ein Stück; mit Textur-Auswahl und „Gestuft“ zwei Zeilen mehr (gewollt: lieber
  // rollen als enger stellen). Weit darüber hinaus darf kein Bereich wachsen.
  it('kein Bereich läuft weit über das Bedienfeld hinaus', () => {
    for (const p of ['motiv', 'farbe', 'texturen', 'palette', 'qualitaet', 'ebenen', 'nach', 'technik']) {
      cy.get('#rail button[data-pane="' + p + '"]').click();
      const spiel = p === 'motiv' ? 440 : 180;   // Motiv: „Weitere Einstellungen“ steht immer offen (gewollt), dafür rollt der Bereich
      cy.get('#panelBody').should($b => expect($b[0].scrollHeight, p + ' passt').to.be.at.most($b[0].clientHeight + spiel));
    }
  });

  it('lässt sich mit der Taste H umschalten', () => {
    cy.get('body').type('h');
    cy.get('#panel').should('have.class', 'collapsed');
    cy.get('body').type('H');
    cy.get('#panel').should('not.have.class', 'collapsed');
  });

  it('das Bild bleibt beim Umschalten unverändert (kein Neurender nötig)', () => {
    cy.get('#state').invoke('text').then(before => {
      cy.get('#panelTab').click();
      cy.wait(400);
      cy.get('#state').should('have.text', before);
      cy.get('#panelTab').click();
    });
  });
});
