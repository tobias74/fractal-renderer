// Navigation: Schwung beim Ziehen (Vorgabe aus, einschaltbar im Bereich Technik) und die neuen Tasten.
// Der Schwung bewegt nur die Ansicht; er ist wie das Ziehen selbst kein eigener Schritt für Rückgängig.
describe('Navigation: Schwung und Tasten', () => {
  const B = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400';
  const ziehen = (schritte = 6, dx = -22) => {
    cy.get('#stage canvas').trigger('pointerdown', { pointerId: 1, clientX: 600, clientY: 400, force: true });
    for (let i = 1; i <= schritte; i++) cy.get('#stage canvas').trigger('pointermove', { pointerId: 1, clientX: 600 + i * dx, clientY: 400, force: true });
    cy.get('#stage canvas').trigger('pointerup', { pointerId: 1, clientX: 600 + schritte * dx, clientY: 400, force: true });
  };

  it('der Schalter steht im Bereich Technik, ist vorgegeben aus und bleibt im Speicher', () => {
    cy.visitApp(B);
    cy.revealInDetails('traegheit');
    cy.get('#traegheit').should('not.be.checked');   // ein Fraktal ist kein Kartenbild: der Nachlauf ist aus, bis man ihn will
    cy.get('#traegheit').check();
    cy.window().then(w => expect(w.localStorage.getItem('fractal.traegheit'), 'die Wahl liegt im Speicher').to.equal('1'));
    cy.get('#traegheit').uncheck();
    cy.window().then(w => expect(w.localStorage.getItem('fractal.traegheit')).to.equal('0'));
  });

  it('mit Schwung läuft das Bild nach dem Loslassen weiter, ohne Schwung nicht', () => {
    cy.visitApp(B); cy.waitRender();
    cy.pane('motiv');   // Vorgabe ist ohne Schwung
    ziehen();
    cy.wait(1500);
    cy.hashParams().then(h => cy.wrap(parseFloat(h.get('re'))).as('ohneSchwung'));
    cy.visitApp(B); cy.waitRender();
    cy.revealInDetails('traegheit'); cy.get('#traegheit').check();
    cy.pane('motiv');
    ziehen();
    cy.wait(1500);
    cy.get('@ohneSchwung').then(ohne => {
      cy.hashParams().then(h => parseFloat(h.get('re'))).should(mit => {
        expect(Math.abs(mit - (-0.7462586155)), 'mit Schwung wandert die Mitte weiter').to.be.greaterThan(Math.abs(ohne - (-0.7462586155)));
      });
    });
  });

  it('der Schwung ist kein eigener Schritt für Rückgängig: ein Rückgängig stellt die Ansicht von vor dem Ziehen her', () => {
    cy.visitApp(B); cy.waitRender();
    cy.revealInDetails('traegheit'); cy.get('#traegheit').check(); cy.pane('motiv');   // mit Schwung, damit der Auslauf mitgeprüft wird
    cy.get('#undo').should('be.disabled');
    ziehen();
    cy.wait(900);
    cy.get('#undo').should('not.be.disabled');
    cy.get('#undo').click();
    cy.hashParams().then(h => expect(parseFloat(h.get('re')), 're nach Rückgängig').to.be.closeTo(-0.7462586155, 1e-9));
  });

  it('die Leertaste wählt die nächste Fraktal-Ebene, bei einer einzigen geschieht nichts', () => {
    cy.visitApp(B + '&l2=f%3D1&lm2=2:0.7:1:0:1:&la=1'); cy.waitRender();
    cy.get('#stapelZeilen .stapel-zeile.on').should('have.attr', 'data-ebene', '1');
    cy.get('body').trigger('keydown', { key: ' ' });
    cy.get('#stapelZeilen .stapel-zeile.on').should('have.attr', 'data-ebene', '2');
    cy.get('body').trigger('keydown', { key: ' ' });
    cy.get('#stapelZeilen .stapel-zeile.on').should('have.attr', 'data-ebene', '1');
    cy.visitApp(B); cy.waitRender();
    cy.get('body').trigger('keydown', { key: ' ' });   // eine Ebene: die Taste tut nichts und stört nicht
    cy.get('#state').should('exist');
  });
});
