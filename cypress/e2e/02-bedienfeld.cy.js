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
    cy.get('#rail button[data-pane]').should('have.length', 4);
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
  // etwas höher als das Bedienfeld und rollt ein Stück. Weit darüber hinaus darf kein Bereich wachsen.
  it('kein Bereich läuft weit über das Bedienfeld hinaus', () => {
    for (const p of ['motiv', 'farbe', 'qualitaet', 'technik']) {
      cy.get('#rail button[data-pane="' + p + '"]').click();
      cy.get('#panelBody').should($b => expect($b[0].scrollHeight, p + ' passt').to.be.at.most($b[0].clientHeight + 80));
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

describe('Bedienfeld am Handy', () => {
  beforeEach(() => {
    cy.viewport(375, 812);
    cy.visitApp();
  });

  it('zeigt das ganze Bild, oben die Leiste mit Menü und Status, unten die Reiter', () => {
    cy.get('#panel').should('have.class', 'collapsed').and('not.be.visible');
    for (const id of ['#rail', '#toolbar', '#siteBar']) cy.get(id).should('not.be.visible');
    cy.get('#burger').should('be.visible');
    cy.get('#mStatus').should('be.visible').and('contain.text', 'Zoom');
    cy.get('#tabbar').should('be.visible').then($t => {
      const r = $t[0].getBoundingClientRect();
      expect(r.bottom, 'unten bündig').to.be.closeTo(812, 1);
      expect(r.width).to.eq(375);
    });
    cy.get('#tabbar button:visible').should('have.length', 5);
    cy.get('#mStatus').click();
    cy.get('#mInfo').should('be.visible').and('contain.text', 'Tiefe');
  });

  it('ein Reiter öffnet ein halbhohes Blatt mit genau diesem Bereich, derselbe Reiter schließt es', () => {
    cy.get('#tabFarbe').click();
    cy.get('#panel').should('not.have.class', 'collapsed');
    cy.get('#tabFarbe').should('have.class', 'on');
    cy.get('.panel-head .wordmark').should('have.text', 'Farbe');
    cy.get('#pane-farbe').should('not.have.attr', 'hidden');
    cy.get('#pane-farbe .row').first().should('be.visible');   // der Bereich rollt im Blatt, sein Anfang ist zu sehen
    cy.get('#pane-motiv').should('not.be.visible');
    cy.wait(400);   // Übergang abwarten
    cy.get('#panel').then($p => {
      const r = $p[0].getBoundingClientRect();
      expect(r.height, 'halbhoch').to.be.at.most(812 * 0.53);
      expect(r.bottom, 'sitzt auf den Reitern').to.be.closeTo(812 - 58, 2);
    });
    cy.get('#tabMehr').click();
    cy.get('.panel-head .wordmark').should('have.text', 'Mehr');
    cy.get('#mActions').should('be.visible');
    cy.get('#tabMehr').click();
    cy.get('#panel').should('have.class', 'collapsed');
    cy.get('#tabbar button.on').should('not.exist');
  });

  it('Chips und Farbfelder wählen dasselbe wie die Auswahlfelder', () => {
    cy.get('#tabMotiv').click();
    cy.get('#famChips button').should('have.length', 8);
    cy.get('#famChips button[data-value="julia"]').click();
    cy.get('#family').should('have.value', 'julia');
    cy.get('#famChips button.on').should('have.attr', 'data-value', 'julia');
    cy.get('#tabFarbe').click();
    cy.get('#palStrip button').should('have.length', 19);
    cy.get('#palStrip button[data-value="7"]').click();
    cy.get('#palette').should('have.value', '7');
    cy.expectHash('pal', 'deep-sea');
  });

  it('Speichern öffnet den Dialog, Mehr führt die Aktionen der Werkzeugleiste aus', () => {
    cy.get('#tabSave').click();
    cy.get('#poster').should('be.visible');
    cy.get('#posterCancel').click();
    cy.get('#tabMehr').click();
    cy.get('#mActions [data-act="linkOpen"]').click();
    cy.get('#panel').should('have.class', 'collapsed');
    cy.get('#linkDlg').should('be.visible');
  });

  it('beim Ziehen eines Reglers bleibt nur dieser stehen', () => {
    cy.get('#tabFarbe').click();
    cy.get('#density').trigger('pointerdown').invoke('val', 600).trigger('input');
    cy.get('body').should('have.class', 'regler-aktiv');
    cy.get('#density').should('have.css', 'visibility', 'visible');
    cy.get('#glowWidth').should('have.css', 'visibility', 'hidden');
    cy.window().trigger('pointerup');
    cy.get('body').should('not.have.class', 'regler-aktiv');
  });
});
