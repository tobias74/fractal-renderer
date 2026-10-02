import { IMAGE_REGION, DEEP_HASH } from '../support/commands';

const RIGHT = { x0: 0.75, y0: 0.2, x1: 0.98, y1: 0.9 };   // dort liegt das Bedienfeld

describe('Bildprüfung per Screenshot', () => {
  it('Mandelbrot-Standardansicht: farbig und strukturiert, Kardioide schwarz', () => {
    cy.visitApp();
    cy.shotStats('bild-mandel', IMAGE_REGION).then(s => {
      expect(s.mean, 'Helligkeit').to.be.within(10, 200);
      expect(s.std, 'Kontrast').to.be.greaterThan(20);
      expect(s.colors, 'Farben').to.be.greaterThan(300);
    });
    cy.shotStats('bild-mandel-mitte', { x0: 0.43, y0: 0.42, x1: 0.49, y1: 0.58 }).then(s => expect(s.mean, 'Inneres der Kardioide').to.be.lessThan(12));
  });

  it('Julia-Menge unterscheidet sich von der Mandelbrot-Menge', () => {
    cy.visitApp();
    cy.shotStats('bild-vergleich-mandel').then(a => {
      cy.rerender(() => cy.pickOption('family', 'julia'));
      cy.shotStats('bild-vergleich-julia').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff).to.be.greaterThan(8));
      });
    });
  });

  it('Zoom verändert das Bild, Zurücksetzen stellt es wieder her', () => {
    cy.visitApp();
    cy.shotStats('bild-zoom-0').then(a => {
      cy.get('#stage canvas').trigger('wheel', { deltaY: -400, clientX: 800, clientY: 400, deltaMode: 0 });
      cy.waitRender();
      cy.wait(300);
      cy.shotStats('bild-zoom-1').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'gezoomt').to.be.greaterThan(5));
        cy.get('body').type('r');
        cy.waitRender();
        cy.wait(300);
        cy.shotStats('bild-zoom-2').then(c => {
          cy.task('pngDiff', { a: a.file, b: c.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'zurückgesetzt').to.be.lessThan(1.5));
        });
      });
    });
  });

  it('Tiefenzoom liefert ein strukturiertes Bild, kein Schwarz und kein Rauschen', () => {
    cy.visitApp(DEEP_HASH);
    cy.shotStats('bild-tief').then(s => {
      expect(s.mean).to.be.greaterThan(8);
      expect(s.std).to.be.greaterThan(8);
      expect(s.colors).to.be.greaterThan(100);
    });
  });

  it('eingeklapptes Bedienfeld gibt den rechten Bildteil frei', () => {
    cy.visitApp();
    cy.shotStats('bild-panel-offen', RIGHT).then(a => {
      cy.get('#panelTab').click();
      cy.wait(600);
      cy.shotStats('bild-panel-zu', RIGHT).then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: RIGHT }).then(d => expect(d.meanDiff).to.be.greaterThan(5));
      });
    });
  });

  it('Innenfärbung „Verlauf“ macht die Kardioide hell', () => {
    cy.visitApp();
    cy.rerender(() => cy.pickOption('interior', 1));
    cy.shotStats('bild-innen', { x0: 0.43, y0: 0.42, x1: 0.49, y1: 0.58 }).then(s => expect(s.mean, 'Inneres nicht mehr schwarz').to.be.greaterThan(20));
  });

  it('Unterseite deckt das Bild vollständig ab', () => {
    cy.visitApp('page=impressum');
    cy.shotStats('bild-seite', IMAGE_REGION).then(a => {
      expect(a.std, 'Fläche mit Text statt Fraktal').to.be.lessThan(40);
      cy.get('#pageFootApp').click();
      cy.wait(300);
      cy.shotStats('bild-seite-zu', IMAGE_REGION).then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, 'darunter liegt das Fraktal').to.be.greaterThan(15));
      });
    });
  });
});
