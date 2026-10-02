// Die zweite Formel der Hybrid-Folge hat eigene Regler: Potenz d (Vorgabe: wie A), ihren Parameter und ihre zweite
// Parameterzeile (Vorgabe: die Vorgaben ihrer Formel). Unverstellt rechnet B wie bisher, im Link stehen nur verstellte Werte.
import { IMAGE_REGION } from '../support/commands';

const param = (h, k) => new URLSearchParams(h.replace(/^#/, '')).get(k);
const warteAuf = (k, pruefe) => cy.location('hash').should(h => pruefe(param(h, k))).then(h => param(h, k));
const anders = (a, b, text) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => expect(d.meanDiff, text).to.be.greaterThan(1));
const MB = 'mode=mandel&re=-0.3&im=0&z=0.9&it=300&ca=off&seq=AB';

describe('Hybrid-Folge: eigene Regler der zweiten Formel', () => {
  it('ohne zweite Formel keine Regler; mit ihr die Vorgaben, und nichts davon im Link', () => {
    cy.visitApp(MB); cy.pane('motiv');
    cy.get('#hybridRegler').should('have.attr', 'hidden');
    cy.visitApp(MB + '&hb=7'); cy.pane('motiv');   // B = Phoenix: ein Parameter
    cy.get('#hybridRegler').should('not.have.attr', 'hidden');
    cy.get('#powerB').should('have.value', '0');   // wie A
    cy.get('#paramBRow').should('not.have.attr', 'hidden');
    cy.get('#paramBLabel').invoke('text').should('match', /\(B\)$/);
    cy.get('#paramBVal').should('have.value', '-0,500');
    cy.get('#param2BRow').should('have.attr', 'hidden');
    cy.wait(600);
    cy.location('hash').then(h => { for (const k of ['bd', 'bp', 'bq']) expect(param(h, k), k).to.equal(null); });
  });

  it('eigene Potenz von B: z² + c im Wechsel mit z³ + c, im Link und beim Laden zurück', () => {
    cy.visitApp(MB + '&hb=0'); cy.pane('motiv');
    cy.shotStats('hybrid-wie-a').then(a => {
      cy.rerender(() => cy.pickOption('powerB', 3));
      warteAuf('bd', v => expect(v).to.equal('3'));
      cy.shotStats('hybrid-b-hoch-3').then(b => anders(a, b, 'B mit Potenz 3 rechnet anders'));
    });
    cy.visitApp(MB + '&hb=0&bd=3'); cy.pane('motiv');
    cy.get('#powerB').should('have.value', '3');
    cy.rerender(() => cy.pickOption('powerB', 0));
    warteAuf('bd', v => expect(v, 'wie A: nicht im Link').to.equal(null));
  });

  it('Parameter von B: verstellt, im Link, beim Laden zurück; eine andere Formel B beginnt mit ihren Vorgaben', () => {
    cy.visitApp(MB + '&hb=7'); cy.pane('motiv');
    cy.shotStats('phoenix-vorgabe').then(a => {
      cy.rerender(() => cy.get('#paramBVal').clear().type('0,3{enter}'));
      warteAuf('bp', v => expect(parseFloat(v)).to.be.closeTo(0.3, 1e-6));
      cy.shotStats('phoenix-0-3').then(b => anders(a, b, 'ein anderer Parameter von B, ein anderes Bild'));
    });
    cy.visitApp(MB + '&hb=7&bp=0.3&bd=4'); cy.pane('motiv');
    cy.get('#paramBVal').should('have.value', '0,300');
    cy.get('#powerB').should('have.value', '4');
    cy.pickOption('formelB', 2);   // Burning Ship: kein Parameter; die Potenz bleibt
    cy.get('#paramBRow').should('have.attr', 'hidden');
    warteAuf('bp', v => expect(v).to.equal(null));
    cy.expectHash('bd', '4');
  });

  it('Zwei Potenzen und Kubisch sind als B wählbar, mit ihrer zweiten Zeile; Lyapunov und die eigene Formel nicht', () => {
    cy.visitApp(MB + '&hb=0'); cy.pane('motiv');
    cy.get('#formelB option[value="17"]').should('exist');
    cy.get('#formelB option[value="26"]').should('exist');
    cy.get('#formelB option[value="13"]').should('not.exist');
    cy.get('#formelB option[value="37"]').should('not.exist');
    cy.rerender(() => cy.pickOption('formelB', 17));
    cy.get('#param2BRow').should('not.have.attr', 'hidden');
    cy.get('#param2BaVal').should('have.value', '3,800');   // Vorgaben der Formel
    cy.shotStats('zwei-potenzen-b').then(a => {
      cy.rerender(() => cy.get('#param2BaVal').clear().type('2,5{enter}'));
      warteAuf('bq', v => expect(v).to.equal('2.5:-2.4:1.2'));
      cy.shotStats('zwei-potenzen-b-2-5').then(b => anders(a, b, 'die zweite Zeile von B wirkt'));
    });
    cy.rerender(() => cy.pickOption('formelB', 26));   // Kubisch: eine Zahl in der zweiten Zeile
    cy.get('#param2BaVal').should('have.value', '0,000');
    cy.get('#param2Bb').should('have.attr', 'hidden');
    warteAuf('bq', v => expect(v, 'eine andere Formel B: wieder die Vorgaben').to.equal(null));
  });
});
