import { DEEP_HASH, DEFAULT_RE } from '../support/commands';

describe('Navigation im Bild', () => {
  beforeEach(() => cy.visitApp());
  const canvas = () => cy.get('#stage canvas');
  const ptr = (type, x, y, extra = {}) => canvas().trigger(type, Object.assign({ pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y }, extra));

  it('Mausrad zoomt hinein und heraus; Anzeige, Tiefe und Adresse folgen', () => {
    canvas().trigger('wheel', { deltaY: -400, clientX: 800, clientY: 400, deltaMode: 0 });
    cy.expectHash('z', z => expect(parseFloat(z)).to.be.closeTo(Math.exp(0.88), 0.05));
    cy.get('#zoomRead').invoke('text').should('not.eq', 'Zoom 1,0×');
    cy.get('#depthVal').invoke('text').should('match', /^10\^\d+ von 10\^26$/);
    cy.waitRender();
    canvas().trigger('wheel', { deltaY: 400, clientX: 800, clientY: 400, deltaMode: 0 });
    cy.expectHash('z', z => expect(parseFloat(z)).to.be.closeTo(1, 0.02));
    cy.waitRender();
  });

  it('Ziehen verschiebt die Ansicht, das Ergebnis steht beim Loslassen fest', () => {
    ptr('pointerdown', 800, 400, { button: 0, buttons: 1 });
    for (let i = 1; i <= 10; i++) ptr('pointermove', 800 - 12 * i, 400 - 6 * i, { buttons: 1 });
    ptr('pointerup', 680, 340, { button: 0, buttons: 0 });
    cy.expectHash('re', re => expect(parseFloat(re), 'Mitte wandert nach rechts').to.be.greaterThan(DEFAULT_RE + 0.01));
    cy.expectHash('im', im => expect(parseFloat(im), 'Mitte wandert nach unten').to.be.lessThan(0));
    cy.waitRender();
    cy.get('#coords').invoke('text').should('not.contain', 'Re -0,008');
  });

  it('Doppelklick zoomt um den Faktor 2', () => {
    for (let k = 0; k < 2; k++) {
      ptr('pointerdown', 700, 300, { button: 0, buttons: 1 });
      ptr('pointerup', 700, 300, { button: 0, buttons: 0 });
    }
    cy.expectHash('z', z => expect(parseFloat(z)).to.be.closeTo(2, 0.01));
    cy.waitRender();
  });

  it('Tastatur: Plus und Minus zoomen, Pfeile verschieben, R setzt zurück', () => {
    cy.get('body').type('+');
    cy.expectHash('z', z => expect(parseFloat(z)).to.be.closeTo(1.5, 0.01));
    cy.get('body').type('-');
    cy.expectHash('z', z => expect(parseFloat(z)).to.be.closeTo(1, 0.01));
    cy.get('body').type('{rightarrow}');
    cy.expectHash('re', re => expect(parseFloat(re)).to.not.be.closeTo(DEFAULT_RE, 1e-9));
    cy.get('body').type('{downarrow}');
    cy.expectHash('im', im => expect(parseFloat(im)).to.not.eq(0));
    cy.get('body').type('r');
    cy.expectHash('re', re => expect(parseFloat(re)).to.be.closeTo(DEFAULT_RE, 1e-9));
    cy.expectHash('im', im => expect(parseFloat(im)).to.eq(0));
    cy.expectHash('z', z => expect(parseFloat(z)).to.eq(1));
    cy.waitRender();
  });

  it('Tastenkürzel greifen nicht, während ein Eingabefeld den Fokus hat', () => {
    cy.rerender(() => cy.pickOption('formula', 13));   // Lyapunov hat ein Textfeld für die Folge (setzt die Ansicht zurück)
    cy.get('body').type('+');
    cy.expectHash('z', z => expect(parseFloat(z)).to.be.closeTo(2.25, 0.01));   // Lyapunov-Ansicht hat Zoom 1,5, ein Plus: 2,25
    cy.revealInDetails('seq');
    cy.get('#seq').clear().type('rh');                   // r würde zurücksetzen, h das Bedienfeld einklappen
    cy.revealInDetails('seq');
    cy.get('#seq').invoke('val').should('match', /^rh$/i);
    cy.get('#panel').should('not.have.class', 'collapsed');
    cy.expectHash('z', z => expect(parseFloat(z)).to.be.closeTo(2.25, 0.01));   // Lyapunov-Ansicht hat Zoom 1,5, ein Plus: 2,25
  });

  it('Tiefenzoom aus der Adresse wird exakt wiederhergestellt', () => {
    cy.visitApp(DEEP_HASH);
    cy.get('#zoomRead').invoke('text').should('match', /Zoom 1,4·10.?20/);
    cy.get('#iterVal').invoke('text').then(t => expect(parseInt(t.replace(/\D/g, ''), 10), 'Iterationen automatisch hoch').to.be.greaterThan(5000));
    cy.get('#coords').should('contain.text', 'Re -0,7447252191636852');
    cy.get('#depthVal').should('contain.text', '10^20');
    cy.get('#state').invoke('text').should('match', /Fertig/);
    cy.get('#depthFill').then($f => expect(parseFloat($f[0].style.width), 'Tiefenbalken gefüllt').to.be.greaterThan(50));
  });

  it('Zoom am Anschlag: nicht tiefer als 10^26', () => {
    cy.visitApp('mode=mandel&re=-0.75&im=0&z=1e26');
    cy.get('#depthVal').should('contain.text', '10^26 von 10^26');
    canvas().trigger('wheel', { deltaY: -400, clientX: 800, clientY: 400, deltaMode: 0 });
    cy.expectHash('z', z => expect(parseFloat(z)).to.be.at.most(1.0001e26));
  });
});
