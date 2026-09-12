import { IMAGE_REGION } from '../support/commands';

describe('Start und Grundzustand', () => {
  it('lädt ohne Fehler, rendert die Mandelbrot-Menge und zeigt den Renderer an', () => {
    cy.visitApp();
    cy.title().should('eq', 'Fraktal-Renderer');
    cy.get('#badge').invoke('text').should('match', /^(WebGPU|WebGL 2)$/);
    cy.get('#stage canvas').should($c => {
      expect($c[0].width, 'Canvas-Breite').to.be.greaterThan(400);
      expect($c[0].height, 'Canvas-Höhe').to.be.greaterThan(300);
    });
    cy.get('#state').invoke('text').should('match', /Fertig · \d+ ms/).and('match', /120 Iterationen/);
    cy.get('#zoomRead').should('have.text', 'Zoom 1,0×');
    cy.get('#coords').should('contain.text', 'Re -0,008').and('contain.text', 'Im 0,000');   // Fraktal in der Fläche neben dem Bedienfeld zentriert
    cy.get('#iterVal').should('have.value', '120');
    cy.get('#depthVal').should('have.text', '10^0 von 10^26');
    cy.get('#techInfo').invoke('text').should('match', /WGSL|GLSL|WebGL/);
  });

  it('meldet keine Konsolenfehler beim Start', () => {
    cy.visitApp('', { onBeforeLoad: win => cy.stub(win.console, 'error').as('consoleError') });
    cy.get('@consoleError').should('not.have.been.called');
  });

  it('zeigt ein farbiges, strukturiertes Bild und keinen schwarzen Bildschirm', () => {
    cy.visitApp();
    cy.shotStats('start', IMAGE_REGION).then(s => {
      expect(s.mean, 'mittlere Helligkeit').to.be.greaterThan(10);
      expect(s.std, 'Kontrast').to.be.greaterThan(15);
      expect(s.colors, 'Farbvielfalt').to.be.greaterThan(200);
    });
  });

  it('läuft auch mit erzwungenem WebGL 2', () => {
    cy.visitApp('', { storage: { 'fractal.renderer': 'webgl' } });
    cy.get('#badge').should('have.text', 'WebGL 2');
    cy.get('#renderer').should('have.value', 'webgl');
    cy.get('#techInfo').invoke('text').should('match', /WebGL/);
    cy.get('#state').invoke('text').should('match', /Fertig/);
  });

  it('zeigt die Bedienhinweise und alle Abschnitte des Bedienfelds', () => {
    cy.visitApp();
    for (const id of ['formula', 'iterRow', 'colorRow', 'aaRow']) cy.rowShown(id, true);
    cy.get('#rail button[data-pane]').should('have.length', 4);
    cy.get('#pane-motiv').should('not.have.attr', 'hidden');
    cy.get('#pane-farbe').should('have.attr', 'hidden');
    cy.get('#toolbar button').should('have.length', 5);   // Speichern deckt Bildschirm und Druck ab
    for (const id of ['accRow', 'cloudRow']) cy.rowShown(id, false);
    cy.get('#panel .panel-foot #state').should('be.visible');
    cy.get('#pane-technik').should('have.attr', 'hidden');
    cy.get('#pane-technik .pane-title').should('have.text', 'Technik');
    // Technik trägt nur, was die Rechnung betrifft; die Auflösung steht bei der Glättung unter Qualität
    cy.get('#pane-technik #renderer, #pane-technik #cycleSel, #pane-technik #blaSel').should('have.length', 3);
    cy.get('#pane-qualitaet #quality').should('exist');
    cy.get('#pane-technik #quality').should('not.exist');
  });
});
