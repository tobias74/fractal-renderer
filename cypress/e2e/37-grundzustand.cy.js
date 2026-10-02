// Ein Grundzustand statt zweier Listen: der Start und „Alles zurücksetzen“ kommen beide aus standardZustand().
// Bisher stand die Liste der Vorgaben zweimal da und lief auseinander; zwölf Felder setzte „Alles zurücksetzen“ nicht
// zurück, darunter die Drehung. Dazu die Drehung selbst: alle Fraktalarten teilen einen Zustand, und ein Winkel aus
// einer Julia-Menge drehte bei der Punktwolke De Jong den Fingerweg — die Wolke wird aber ohne Drehung gezeichnet,
// das Bild lief in die falsche Richtung.
describe('Grundzustand und Zurücksetzen', () => {
  const ankerSteht = () => cy.window({ timeout: 20000 }).should(w => expect(w.__zustand.roh().colAnchor, 'der Farbanker, den die App nach dem ersten Bild selbst setzt').to.not.equal(null));
  const ohneBehalten = (o, behalten) => { const r = {}; for (const k of Object.keys(o).sort()) if (!behalten.includes(k)) r[k] = o[k]; return r; };

  it('„Alles zurücksetzen“ ergibt denselben Zustand wie frisches Laden — für jedes Feld', () => {
    cy.visitApp('mode=mandel', { aa: '' }); cy.waitRender(); ankerSteht();   // wie ein Erstbesucher: ohne die Glättungsstufe, die visitApp sonst vorbelegt (Zurücksetzen löscht sie ebenfalls)
    cy.window().then(w => cy.wrap(w.__zustand.roh()).as('frisch'));
    cy.window().then(w => cy.wrap(w.__zustand.behalten()).as('behalten'));
    cy.window().then(w => { w.__zustand.vergiften(); w.document.getElementById('reset').click(); });   // jedes Feld verstellt, im selben Takt zurückgesetzt
    cy.waitRender(); ankerSteht();
    cy.get('@behalten').then(behalten => cy.get('@frisch').then(frisch => cy.window().then(w => {
      const nach = w.__zustand.roh();
      expect(nach.__spaeter, 'ein später angelegtes Feld ohne Vorgabe ist fort').to.equal(undefined);
      const a = ohneBehalten(frisch, behalten), b = ohneBehalten(nach, behalten);
      const falsch = Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
      expect(falsch, 'Felder, die das Zurücksetzen nicht auf den Grundzustand bringt').to.deep.equal([]);
      expect(Object.keys(b).filter(k => !(k in a)), 'keine Felder, die es frisch nicht gibt').to.deep.equal([]);
    })));
  });

  it('„Alles zurücksetzen“ lässt die Wahl und die Geräteeinstellungen stehen', () => {
    cy.visitApp('mode=julia'); cy.waitRender();
    cy.revealInDetails('traegheit'); cy.get('#traegheit').check();
    cy.revealInDetails('reset'); cy.get('#reset').click();
    cy.waitRender();
    cy.get('#traegheit').should('be.checked');   // eine Einstellung des Geräts
    cy.window().then(w => expect(w.__zustand.roh().mode, 'die Julia-Menge bleibt').to.equal('julia'));
  });

  it('„Alles zurücksetzen“ setzt auch die Drehung zurück', () => {
    cy.visitApp('mode=mandel&dr=30'); cy.waitRender();
    cy.expectHash('dr', '30');
    cy.revealInDetails('reset'); cy.get('#reset').click();
    cy.waitRender();
    cy.expectHash('dr', null);
    cy.window().then(w => expect(w.__zustand.roh().dreh, 'Drehung').to.equal(0));
  });

  // Der Weg aus der Meldung, über die Oberfläche: eine Julia-Menge drehen, dann die Punktwolke De Jong wählen.
  it('eine gedrehte Julia-Menge, danach De Jong: das Ziehen folgt dem Finger, ohne Drehung', () => {
    cy.visitApp('mode=julia'); cy.waitRender();
    cy.pane('motiv');
    cy.setRange('dreh', 30);
    cy.expectHash('dr', '30');
    cy.pickOption('family', 'dejong');
    cy.waitRender();
    cy.hashParams().then(h => cy.wrap({ re: parseFloat(h.get('re')), im: parseFloat(h.get('im')) }).as('vor'));   // über den Link: gilt auch für den alten Stand
    cy.get('#stage canvas').trigger('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: 400, clientY: 300, force: true });
    for (let i = 1; i <= 5; i++) cy.get('#stage canvas').trigger('pointermove', { pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: 400 + i * 20, clientY: 300, force: true });
    cy.get('#stage canvas').trigger('pointerup', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: 500, clientY: 300, force: true });
    cy.wait(400);
    cy.get('@vor').then(vor => cy.hashParams().then(h => {
      const dx = parseFloat(h.get('re')) - vor.re, dy = parseFloat(h.get('im')) - vor.im;
      // Die Wolke wird achsenparallel gezeichnet: ein Zug nach rechts schiebt das Bild nach rechts, die Mitte also nach links
      expect(dx, 'die Mitte wandert nach links').to.be.lessThan(0);
      expect(Math.abs(dy), 'und nicht nach oben oder unten').to.be.lessThan(Math.abs(dx) * 1e-6);
    }));
  });

  it('der Winkel der Julia-Menge ist nach dem Umweg über De Jong wieder da', () => {
    cy.visitApp('mode=julia'); cy.waitRender();
    cy.pane('motiv');
    cy.setRange('dreh', 30);
    cy.pickOption('family', 'dejong'); cy.waitRender();
    cy.pickOption('family', 'julia'); cy.waitRender();
    cy.expectHash('dr', '30');
  });
  it('die Drehtasten wirken bei einer Punktwolke nicht: kein unsichtbarer Winkel, der später auftaucht', () => {
    cy.visitApp('mode=julia'); cy.waitRender();
    cy.pickOption('family', 'dejong'); cy.waitRender();
    cy.document().then(d => d.activeElement && d.activeElement.blur());
    cy.get('body').type(']]]');
    cy.window().then(w => expect(w.__zustand.roh().dreh, 'der Winkel bleibt, wie er war').to.equal(0));
    cy.pickOption('family', 'julia'); cy.waitRender();
    cy.expectHash('dr', null);   // zurück bei der Julia-Menge: keine Drehung, die niemand eingestellt hat
  });
});
