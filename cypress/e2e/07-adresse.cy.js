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
    cy.get('#iterVal').should('have.text', '300');
    cy.get('#densVal').should('contain.text', '0,100');
    cy.get('#glowVal').invoke('text').should('match', /2,0/);
    cy.get('#coords').should('contain.text', 'Re -0,500').and('contain.text', 'Im 0,100');
    cy.get('#zoomRead').should('have.text', 'Zoom 3,0×');
    cy.get('#state').invoke('text').should('match', /300 Iterationen/);
  });

  it('schreibt Änderungen zurück in die Adresse', () => {
    cy.visitApp();
    cy.pickOption('palette', 3); cy.expectHash('pal', '3');
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
    cy.expectHash('pal', '4');
    cy.location('hash').then(h => {
      cy.visitApp(h);
      cy.get('#palette').should('have.value', '4');
      cy.get('#power').should('have.value', '5');
      cy.location('hash').should('eq', h);
    });
  });

  it('ignoriert Unsinn in der Adresse und bleibt bedienbar', () => {
    cy.visitApp('mode=quatsch&z=abc&p=99&pal=-3&f=77&den=1e9');
    cy.get('#family').should('have.value', 'mandel');
    cy.get('#power').should('have.value', '8');
    cy.get('#palette').should('have.value', 'z:1');                  // Lyapunov: die klassischen Farben (Gold und Blau) als Vorgabe
    cy.get('#formula').should('have.value', '13');
    cy.get('#zoomRead').should('have.text', 'Zoom 1,0×');
    cy.expectHash('re', re => expect(parseFloat(re)).to.be.closeTo(DEFAULT_RE, 1e-9));
    cy.get('#state').invoke('text').should('match', /Fertig/);
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
