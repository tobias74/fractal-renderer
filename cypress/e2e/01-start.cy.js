import { IMAGE_REGION } from '../support/commands';

describe('Start und Grundzustand', () => {
  it('lädt ohne Fehler, rendert die Mandelbrot-Menge und zeigt den Renderer an', () => {
    cy.visitApp();
    cy.title().should('eq', 'Fraktal-Renderer');
    cy.get('#badge').invoke('text').should('match', /^WebGPU$/);
    cy.get('#stage canvas').should($c => {
      expect($c[0].width, 'Canvas-Breite').to.be.greaterThan(400);
      expect($c[0].height, 'Canvas-Höhe').to.be.greaterThan(300);
    });
    cy.get('#state').invoke('text').should('match', /Fertig · \d+ ms/).and('match', /120 Iterationen/);
    cy.get('#zoomRead').should('have.text', 'Zoom 1,0×');
    cy.get('#coords').should('contain.text', 'Re -0,008').and('contain.text', 'Im 0,000');   // Fraktal in der Fläche neben dem Bedienfeld zentriert
    cy.get('#iterVal').should('have.value', '120');
    cy.get('#depthVal').should('have.text', '10^0 von 10^26');
    cy.get('#techInfo').invoke('text').should('match', /WGSL/);
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

  it('startet nach einem Kontextverlust neu, auch wenn der Grafikprozess erst einen Moment braucht', () => {   // 20.09.2026: am Handy scheiterte der sofortige Wechsel nach VK_ERROR_DEVICE_LOST
    cy.get('#badge').should('have.text', 'WebGPU'); cy.waitRender();
    cy.window().then(w => {
      const orig = w.navigator.gpu.requestAdapter.bind(w.navigator.gpu); let verweigert = 0;
      w.navigator.gpu.requestAdapter = (...a) => (verweigert++ < 1 ? Promise.resolve(null) : orig(...a));   // der erste neue Anlauf findet noch keine Grafikkarte
      expect(w.__kontextVerlieren(), 'der Testhaken löst den Verlust aus').to.eq(true);
    });
    cy.get('#badge', { timeout: 15000 }).should('have.text', 'WebGPU');   // der zweite Anlauf nach der Pause gelingt
    cy.get('#fatal').should('have.attr', 'hidden');   // nie „keine GPU“
    cy.waitRender(); cy.gezeichnet().should('eq', true);
  });

  it('zeigt die Bedienhinweise und alle Abschnitte des Bedienfelds', () => {
    cy.visitApp();
    for (const id of ['formula', 'iterRow', 'colorRow', 'aaRow']) cy.rowShown(id, true);
    cy.get('#rail button[data-pane]').should('have.length', 8);   // Motiv, Farbe, Texturen, Palette, Qualität, Mischen, Nachbearbeitung, Technik
    cy.get('#pane-motiv').should('not.have.attr', 'hidden');
    cy.get('#pane-farbe').should('have.attr', 'hidden');
    cy.get('#toolbar button').should('have.length', 8);   // Speichern deckt Bildschirm und Druck ab; dazu Link, Datei öffnen, Bilddatei prüfen, Parameter speichern, Rückgängig, Wiederholen, Zurücksetzen
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
