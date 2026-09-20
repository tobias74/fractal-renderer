import { DEFAULT_RE } from '../support/commands';

describe('Zustand in der Adresse', () => {
  it('stellt Ansicht, Farb- und Formelparameter aus der Adresse wieder her', () => {
    cy.visitApp('mode=mandel&re=-0.5&im=0.1&z=3&pal=2&den=0.1&map=0&glow=1&gw=2&in=1&p=3&it=300');
    cy.get('#palette').should('have.value', '2');
    cy.get('#mapping').should('have.value', '0');
    cy.get('#glowMode').should('have.value', '1');
    cy.get('#interior').should('have.value', '1');
    cy.get('#power').should('have.value', '3');
    cy.revealInDetails('iterAuto');
    cy.get('#iterAuto').should('not.be.checked');
    cy.get('#iterVal').should('have.value', '300');
    cy.get('#densVal').invoke('val').should('contain', '0,100');
    cy.get('#glowVal').invoke('val').should('match', /2,0/);
    cy.get('#coords').should('contain.text', 'Re -0,500').and('contain.text', 'Im 0,100');
    cy.get('#zoomRead').should('have.text', 'Zoom 3,0×');
    cy.get('#state').invoke('text').should('match', /300 Iterationen/);
  });

  it('schreibt Änderungen zurück in die Adresse', () => {
    cy.visitApp();
    cy.pickOption('palette', 3); cy.expectHash('pal', 'cobalt');
    cy.pickOption('mapping', 1); cy.expectHash('map', '1');
    cy.pickOption('glowMode', 2); cy.expectHash('glow', '2');
    cy.expectHash('gw', v => expect(parseFloat(v)).to.be.greaterThan(0));
    cy.pickOption('interior', 2); cy.expectHash('in', '2');
    cy.setRange('density', 700); cy.expectHash('den', v => expect(parseFloat(v)).to.be.greaterThan(0.04));
    cy.revealInDetails('iterAuto');
    cy.get('#iterAuto').uncheck();
    cy.setRange('iterRange', 600); cy.expectHash('it', v => expect(parseInt(v, 10)).to.be.greaterThan(120));
    cy.revealInDetails('iterAuto');
    cy.get('#iterAuto').check(); cy.expectHash('it', null);
    cy.waitRender();
  });

  it('lädt die geänderte Adresse identisch wieder', () => {
    cy.visitApp();
    cy.pickOption('palette', 4);
    cy.pickOption('power', 5);
    cy.setRange('density', 600);
    cy.expectHash('p', '5');
    cy.expectHash('pal', 'atoll');
    cy.location('hash').then(h => {
      cy.visitApp(h);
      cy.get('#palette').should('have.value', '4');
      cy.get('#power').should('have.value', '5');
      cy.location('hash').should('eq', h);
    });
  });

  it('Rückgängig und Wiederholen: Schritte zurück, wieder vor, auch nach Alles zurücksetzen', () => {
    cy.visitApp('mode=mandel&re=-0.75&im=0.1&z=1.3&it=200');
    cy.get('#undo').should('be.disabled');                       // frisch geladen gibt es nichts zurückzunehmen
    cy.get('#redo').should('be.disabled');
    cy.rerender(() => cy.pickOption('palette', '4'));
    cy.expectHash('pal', p => expect(p, 'die Palette steht im Link').to.be.a('string'));   // der Link nennt sie beim Namen
    cy.get('#undo').should('not.be.disabled');
    cy.rerender(() => cy.get('#undo').click());
    cy.get('#palette').should('have.value', '0');
    cy.get('#redo').should('not.be.disabled');
    cy.rerender(() => cy.get('#redo').click());
    cy.get('#palette').should('have.value', '4');
    cy.rerender(() => cy.get('#reset').click());                 // Alles zurücksetzen ist selbst ein Schritt
    cy.get('#palette').should('have.value', '0');
    cy.rerender(() => cy.get('#undo').click());
    cy.get('#palette').should('have.value', '4');
    cy.rerender(() => cy.get('#stage canvas').trigger('wheel', { deltaY: -400, clientX: 800, clientY: 400, deltaMode: 0 }));   // auch die Ansicht ist ein Schritt
    cy.expectHash('z', z => expect(parseFloat(z), 'näher dran').to.be.greaterThan(1.4));
    cy.rerender(() => cy.get('#undo').click());
    cy.expectHash('z', z => expect(parseFloat(z), 'zurück zur vorigen Ansicht').to.be.closeTo(1.3, 1e-6));
  });

  it('Rückgängig nimmt auch technische Werte zurück, die nicht in der Adresse stehen', () => {
    cy.visitApp('mode=mandel&re=-0.75&im=0.1&z=1.3');
    cy.rerender(() => cy.pickOption('cycleSel', '1'));   // Zyklenprüfung: ein technischer Wert
    cy.get('#undo').should('not.be.disabled');
    cy.rerender(() => cy.get('#undo').click());
    cy.get('#cycleSel').should('have.value', 'auto');
    cy.rerender(() => cy.get('#redo').click());
    cy.get('#cycleSel').should('have.value', '1');
  });

  it('das Wählen einer Fraktal-Ebene ist kein Schritt; Rückgängig nennt den Bereich, wechselt ihn aber nicht', () => {   // 20.09.2026
    cy.visitApp('mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:&la=2'); cy.waitRender();
    cy.get('#undo').should('be.disabled');
    cy.get('#stWahl1').click(); cy.expectHash('la', null);       // Ebene 1 wählen: nur Auswahl
    cy.get('#undo').should('be.disabled');                        // kein Schritt daraus
    cy.get('#stWahl2').click(); cy.expectHash('la', '2');
    cy.get('#undo').should('be.disabled');
    cy.rerender(() => cy.get('#stage canvas').trigger('wheel', { deltaY: -400, clientX: 800, clientY: 400, deltaMode: 0 }));   // eine echte Änderung: die Ansicht
    cy.expectHash('z', z => expect(parseFloat(z)).to.be.greaterThan(1.1));
    cy.get('#undo').should('not.be.disabled');
    cy.pane('motiv');                                              // im Motiv: dort soll das Rückgängig uns lassen
    cy.get('#undo').click();
    cy.get('#state').invoke('text').should('match', /Rückgängig: Ansicht/);      // der Hinweis nennt den Bereich
    cy.get('#stapelZeilen .stapel-zeile.on').should('have.attr', 'data-ebene', '2');   // die Ebene bleibt gewählt
    cy.get('#pane-motiv').should('not.have.attr', 'hidden'); cy.get('#pane-palette').should('have.attr', 'hidden');   // und der Bereich wird nicht gewechselt
    cy.expectHash('z', '1.0000e+0');
    cy.get('#redo').click();
    cy.get('#state').invoke('text').should('match', /Wiederhergestellt: Ansicht/);
  });

  it('ignoriert Unsinn in der Adresse und bleibt bedienbar', () => {
    cy.visitApp('mode=quatsch&z=abc&p=99&pal=-3&f=77&den=1e9');
    cy.get('#family').should('have.value', 'mandel');
    cy.get('#power').should('have.value', '8');
    cy.get('#palette').should('have.value', '0');                    // f=77 fällt auf die letzte Formel (Eigene Formel): gewöhnliche Palette als Vorgabe
    cy.get('#formula').should('have.value', '37');
    cy.get('#zoomRead').should('have.text', 'Zoom 1,0×');
    cy.expectHash('re', re => expect(parseFloat(re)).to.be.closeTo(DEFAULT_RE, 1e-9));
    cy.get('#state').invoke('text').should('match', /Fertig/);
  });

  it('Vorgaben heißen im Link beim Namen; alte Nummern gelten weiter, eine entfernte fällt auf die Vorgabe zurück', () => {
    cy.visitApp('mode=mandel&pal=6&map=15&p2=4');                    // alte Nummern: Holzschnitt, Feldlinien
    cy.get('#palette').should('have.value', 'z:3');
    cy.get('#palette option:selected').should('have.text', 'Feldlinien');
    cy.expectHash('pal', 'woodcut');                                   // der Link nennt jetzt die Namen
    cy.expectHash('p2', 'field-lines');
    cy.visitApp('mode=mandel&map=16&p2=3');                           // 3 war eine inzwischen entfernte Vorgabe
    cy.get('#palette option:selected').should('have.text', 'Feldlinien');   // die Vorgabe dieser Färbung
    cy.expectHash('p2', null);
    cy.visitApp('mode=mandel&map=15&p2=tiles&pal=deep-sea');
    cy.get('#palette option:selected').should('have.text', 'Kacheln');
    cy.expectHash('pal', 'deep-sea');
  });

  it('Julia-Parameter und Startwert wandern mit', () => {
    cy.visitApp('mode=julia&re=0&im=0&z=1&jre=-0.8&jim=0.156&z0r=0.1&z0i=-0.2');
    cy.get('#family').should('have.value', 'julia');
    cy.revealInDetails('jre');
    cy.get('#jre').invoke('val').then(v => expect(parseFloat(v)).to.be.closeTo(-0.8, 1e-6));
    cy.revealInDetails('jim');
    cy.get('#jim').invoke('val').then(v => expect(parseFloat(v)).to.be.closeTo(0.156, 1e-6));
    cy.revealInDetails('z0re');
    cy.get('#z0re').invoke('val').then(v => expect(parseFloat(v)).to.be.closeTo(0.1, 1e-6));
    cy.expectHash('z0i', '-0.2');
  });
});
