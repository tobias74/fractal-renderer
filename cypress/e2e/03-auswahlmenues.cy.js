import { IMAGE_REGION } from '../support/commands';

describe('Eigene Auswahlmenüs am PC', () => {
  beforeEach(() => cy.visitApp());

  it('ersetzt das native Select durch Knopf und Menü', () => {
    cy.get('#power').should('have.class', 'sel-hidden').and('have.attr', 'data-enhanced', '1').and('not.be.visible');
    cy.get('#power + .menu-btn').should('be.visible')
      .and('have.attr', 'aria-haspopup', 'listbox')
      .and('have.attr', 'aria-expanded', 'false')
      .and('have.attr', 'aria-controls', 'powerMenu')
      .find('span').first().should('have.text', '2');
    cy.get('#powerMenu').should('exist').and('not.be.visible').find('button').should('have.length', 7);
  });

  it('öffnet das Menü unter dem Knopf, markiert den aktuellen Wert und schließt per Escape oder Klick daneben', () => {
    cy.get('#power + .menu-btn').click().should('have.attr', 'aria-expanded', 'true');
    cy.get('#power + .menu-btn').then($b => {
      const b = $b[0].getBoundingClientRect();
      cy.get('#powerMenu').should('be.visible').then($m => {
        const m = $m[0].getBoundingClientRect();
        expect(m.top, 'direkt unter dem Knopf').to.be.closeTo(b.bottom + 4, 1);
        expect(m.left, 'linksbündig').to.be.closeTo(b.left, 1);
        expect(m.width, 'mindestens Knopfbreite').to.be.at.least(b.width - 1);
      });
    });
    cy.get('#powerMenu button.on').should('have.length', 1).and('have.text', '2').and('have.attr', 'aria-selected', 'true');
    cy.get('body').type('{esc}');
    cy.get('#powerMenu').should('not.be.visible');
    cy.get('#power + .menu-btn').should('have.attr', 'aria-expanded', 'false');
    cy.get('#power + .menu-btn').click();
    cy.get('#powerMenu').should('be.visible');
    cy.get('.panel-head').click();
    cy.get('#powerMenu').should('not.be.visible');
  });

  it('Potenz d: jede Stufe von 3 bis 8 lässt sich per Maus wählen, Adresse und Anzeige folgen', () => {
    for (const d of [3, 4, 5, 6, 7, 8]) {
      cy.rerender(() => cy.pickOption('power', d));
      cy.get('#power + .menu-btn span').first().should('have.text', String(d));
      cy.expectHash('p', String(d));
      cy.get('#state').invoke('text').should('match', /Fertig/);
    }
    cy.pickOption('power', 2);
    cy.expectHash('p', null);
  });

  it('Potenz d verändert das Bild tatsächlich', () => {
    cy.shotStats('potenz-2').then(a => {
      cy.rerender(() => cy.pickOption('power', 3));
      cy.shotStats('potenz-3').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => {
          expect(d.meanDiff, 'Bildunterschied zwischen d = 2 und d = 3').to.be.greaterThan(5);
        });
      });
    });
  });

  it('Tastatur: Pfeiltasten, Pos1/Ende und Ziffern wirken wie beim nativen Select', () => {
    const key = k => cy.get('#power + .menu-btn').trigger('keydown', { key: k });
    cy.get('#power + .menu-btn').focus();
    key('ArrowDown'); cy.get('#power').should('have.value', '3');
    key('ArrowDown'); cy.get('#power').should('have.value', '4');
    key('ArrowUp'); cy.get('#power').should('have.value', '3');
    key('End'); cy.get('#power').should('have.value', '8');
    key('Home'); cy.get('#power').should('have.value', '2');
    key('5'); cy.get('#power').should('have.value', '5');
    // im offenen Menü wandert die Hervorhebung, Enter übernimmt
    key('Enter');
    cy.get('#powerMenu').should('be.visible');
    cy.get('#powerMenu button.hl').should('have.text', '5');
    key('ArrowDown'); cy.get('#powerMenu button.hl').should('have.text', '6');
    key('Enter');
    cy.get('#powerMenu').should('not.be.visible');
    cy.get('#power').should('have.value', '6');
    cy.expectHash('p', '6');
  });

  it('übernimmt beim Loslassen der Maus, auch wenn der Zeiger inzwischen auf einem anderen Eintrag steht', () => {
    cy.get('#power + .menu-btn').click();
    cy.get('#powerMenu button[data-value="3"]').trigger('pointerdown', { pointerType: 'mouse', button: 0, buttons: 1 });
    cy.get('#powerMenu button[data-value="4"]').trigger('pointerup', { pointerType: 'mouse', button: 0, buttons: 0 });
    cy.get('#power').should('have.value', '4');
    cy.get('#powerMenu').should('not.be.visible');
  });

  it('das Menü folgt dem Knopf, wenn sich das Fenster ändert', () => {
    cy.get('#siteLangSel + .menu-btn').click();   // Leiste unten links: ihre Höhe hängt am Fenster
    cy.get('#siteLangSelMenu').should('be.visible').then($m => {
      const top0 = $m[0].getBoundingClientRect().top;
      cy.viewport(1280, 560);
      cy.wait(200);
      cy.get('#siteLangSel + .menu-btn').then($b => {
        const bb = $b[0].getBoundingClientRect();
        cy.get('#siteLangSelMenu').should('be.visible').then($m2 => {
          const m = $m2[0].getBoundingClientRect();
          expect(Math.abs(m.top - top0), 'Menü ist mitgewandert').to.be.greaterThan(100);
          const below = Math.abs(m.top - (bb.bottom + 4)) < 2, above = Math.abs(m.bottom - (bb.top - 4)) < 2;
          expect(below || above, 'Menü hängt direkt unter oder über dem Knopf').to.be.true;
        });
      });
    });
    cy.get('body').type('{esc}');
    cy.viewport(1280, 720);
  });

  it('am unteren Fensterrand öffnet das Menü nach oben', () => {
    cy.get('#siteLangSel + .menu-btn').click();
    cy.get('#siteLangSel + .menu-btn').then($b => {
      const b = $b[0].getBoundingClientRect();
      cy.get('#siteLangSelMenu').should('be.visible').then($m => {
        const m = $m[0].getBoundingClientRect();
        expect(m.bottom, 'Menü endet über dem Knopf').to.be.at.most(b.top);
        expect(m.right, 'bleibt im Fenster').to.be.at.most(1280);
      });
    });
    cy.get('body').type('{esc}');
  });

  it('alle Selects im Bedienfeld sind ersetzt und beschriftet', () => {
    cy.get('#panel select').each($s => {
      const id = $s.attr('id');
      expect($s.attr('data-enhanced'), 'ersetzt: ' + id).to.eq('1');
      const btn = $s.next('.menu-btn');
      expect(btn.length, 'Knopf für ' + id).to.eq(1);
      const named = btn.attr('aria-label') || Cypress.$('label[for="' + id + '"]').length;
      expect(named, 'Beschriftung für ' + id).to.be.ok;
    });
  });

  it('ein Select mit Gruppen zeigt Überschriften im Menü', () => {
    cy.get('#family + .menu-btn').click();
    cy.get('#familyMenu h4').should('have.length', 2).first().should('have.text', 'Fluchtzeit');
    cy.get('#familyMenu h4').last().should('have.text', 'Punktwolken');
    cy.get('#familyMenu button').should('have.length', 8);
    cy.get('body').type('{esc}');
  });
});
