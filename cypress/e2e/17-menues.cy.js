// Das Bedienfeld zeigt je Familie und Formel nur, was dort tatsächlich wirkt. Früher standen bei den Punktwolken
// ein Formelmenü, Näherung und Zykluserkennung, bei Phoenix die Potenz und bei Lyapunov die ganze Palette: alles
// ohne jede Wirkung.
const sichtbar = (sel, erwartet) => cy.get(sel).should($e => {
  let versteckt = false;
  for (let e = $e[0]; e && !(e.classList && e.classList.contains('pane')); e = e.parentElement) if (e.hidden) versteckt = true;
  expect(!versteckt, sel + (erwartet ? ' sichtbar' : ' versteckt')).to.eq(erwartet);
});
const formel = f => cy.rerender(() => cy.pickOption('formula', String(f)));

describe('Menüs je Variante', () => {
  beforeEach(() => cy.visitApp());

  it('Punktwolke: keine Formel, kein Qualitätsbereich, keine Technik der Fluchtzeit, keine Zoomtiefe', () => {
    cy.pickOption('family', 'clifford');
    sichtbar('#formulaRow', false);
    cy.get('#formula + .menu-btn').should('not.be.visible');   // früher blieb hier ein Knopf „Mandelbrot z^d + c“ stehen
    cy.get('#railQualitaet').should('not.be.visible');
    cy.get('#pane-qualitaet').should('have.class', 'leer');
    sichtbar('#renderer', true);
    sichtbar('#blaSel', false);
    sichtbar('#cycleSel', false);
    sichtbar('#depthFill', false);
    sichtbar('#palette', true);                                // Punktwolken färben über Palette und Versatz
    sichtbar('#offset', true);
    sichtbar('#mapping', false);
    cy.waitRender(/Fertig|Done/, 60000);
    cy.get('#save').click();
    cy.get('#posterCropRow').should('not.be.visible');        // gespeichert wird nur, was zu sehen ist
    cy.get('#posterRes').should('be.disabled');
    cy.get('#posterCancel').click();
    cy.rerender(() => cy.pickOption('family', 'mandel'));
    sichtbar('#formulaRow', true);
    cy.get('#railQualitaet').should('be.visible');
    sichtbar('#depthFill', true);
  });

  it('Potenz d nur bei den z^d-Formeln und bei Newton/Nova', () => {
    for (const [f, an] of [[0, true], [1, true], [6, true], [7, false], [8, false], [9, false], [10, false], [11, true], [12, false], [13, false]]) {
      formel(f);
      sichtbar('#power', an);
    }
  });

  it('Näherung nur bei z^d + c, Zykluserkennung nicht bei Newton/Nova und Lyapunov', () => {
    for (const [f, bla, zyklus] of [[0, true, true], [1, false, true], [7, false, true], [11, false, false], [13, false, false]]) {
      formel(f);
      sichtbar('#blaSel', bla);
      sichtbar('#cycleSel', zyklus);
    }
  });

  it('Lyapunov: Palette und Farbdichte, keine Ebene, keine Julia-Menge', () => {
    formel(13);
    sichtbar('#seqRow', true);
    sichtbar('#invert', false);
    sichtbar('#juliaHere', false);
    sichtbar('#density', true);
    sichtbar('#palette', true);                                // zweidimensionale Paletten, Vorgabe die klassischen Farben
    cy.get('#palette').should('have.value', 'z:1');
    for (const id of ['#mapping', '#glowMode', '#interior', '#glowWidth', '#offset', '#colAnchor', '#animate', '#palFilter']) sichtbar(id, false);
    // Im Julia-Modus fehlt Lyapunov im Menü, der Wechsel dorthin schaltet auf z^d + c
    cy.rerender(() => cy.pickOption('family', 'julia'));
    cy.get('#formula').should('have.value', '0');
    cy.get('#formula + .menu-btn').click();
    cy.get('#formulaMenu button[data-value="13"]').should('not.exist');
    cy.get('#formulaMenu button[data-value="11"]').should('exist');   // Nova als Julia-Menge ergibt Sinn
    cy.get('body').type('{esc}');
    cy.rerender(() => cy.pickOption('family', 'mandel'));
    cy.get('#formula + .menu-btn').click();
    cy.get('#formulaMenu button[data-value="13"]').should('exist');
    cy.get('body').type('{esc}');
  });

  it('ein alter Link auf Lyapunov als Julia-Menge landet bei z^d + c', () => {
    cy.visitApp('mode=julia&f=13');
    cy.get('#family').should('have.value', 'julia');
    cy.get('#formula').should('have.value', '0');
  });

  it('Punktwolke: der Farbversatz färbt sofort neu', () => {
    // Die Farben der Punktwolken stecken in den Zählern; ohne Neustart des Sammelns tat der Regler nichts.
    cy.visitApp('fam=clifford&at=3000000');
    cy.waitRender(/Fertig|Done/, 60000);
    cy.shotStats('versatz-vorher').then(a => {
      cy.pane('farbe');
      cy.setRange('offset', 500);
      cy.wait(300);
      cy.waitRender(/Fertig|Done/, 60000);
      cy.shotStats('versatz-nachher').then(b => {
        cy.task('pngDiff', { a: a.file, b: b.file, region: { x0: 0.02, y0: 0.08, x1: 0.6, y1: 0.9 } }).then(d => {
          expect(d.meanDiff, 'Bild hat andere Farben').to.be.greaterThan(2);
        });
      });
    });
  });
});
