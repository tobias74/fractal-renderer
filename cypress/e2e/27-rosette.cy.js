// Rosettenfalle (Texturart 23, Sammler 21) und Auswertung der Fallen je Platz: Bedienzeilen (hierarchisch), Link-Schlüssel
// (tq mit sechs Werten, tr, tf), Bild je Wertwahl und Auswertung, WebGL 2 gleich WebGPU, die Vorgabe lässt das alte Bild
// (Ringfalle mit und ohne Schlüssel identisch), der Fallenverbund nimmt die Rosette mit.
import { IMAGE_REGION } from '../support/commands';

describe('Rosettenfalle und Auswertung der Fallen', () => {
  const B = 'mode=mandel&re=-0.75&im=0.1&z=1.3&it=100';
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  const anders = (a, b, text, min = 3) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 8) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.lessThan(max));

  it('Bedienzeilen: die Rosette hat sechs Regler, Wert und Auswertung; Stichproben zeigen die Schrittweite; andere Fallen nur die Auswertung; keine Falle nichts', () => {
    cy.visitApp(B + '&tx=23&ts=0.8');
    cy.pane('texturen');
    cy.get('#textur option').should('have.length', 24);
    cy.get('#textur option[value="23"]').should('have.text', 'Rosettenfalle');
    cy.get('#textur').should('have.value', '23');
    cy.get('#texWerte input[type=range]').should('have.length', 6);
    cy.get('#texWerte label').then($l => expect([...$l].map(l => l.textContent)).to.deep.eq(['Amplitude', 'Blätter', 'Drall', 'Phase', 'Weite', 'Härte']));
    cy.get('#texW1_0').should('have.value', '0.5'); cy.get('#texW1_1').should('have.value', '5'); cy.get('#texW1_1Val').should('have.value', '5');   // Blätter ganzzahlig, ohne Nachkommastellen
    cy.get('#texW1_4').should('have.value', '0.2'); cy.get('#texW1_5').should('have.value', '2');
    cy.rowShown('texWahlRow1', true); cy.rowShown('texFallenRow1', true); cy.rowShown('texStichRow1', false);
    cy.get('#texWahl1').should('have.value', '0'); cy.get('#texFallen1').should('have.value', '0');
    cy.expectHash('tq', null); cy.expectHash('tr', null); cy.expectHash('tf', null);
    cy.rerender(() => cy.pickOption('texFallen1', '1'));   // Stichproben: die Schrittweite erscheint, ihre Vorgabe 4 steht nicht im Link
    cy.rowShown('texStichRow1', true); cy.get('#texStich1').should('have.value', '4'); cy.expectHash('tf', '1');
    cy.rerender(() => cy.get('#texStich1').scrollIntoView().clear().type('8{enter}'));
    cy.expectHash('tf', '1:8'); cy.get('#texStich1').should('have.value', '8');
    cy.rerender(() => cy.pickOption('texFallen1', '2'));   // am Ende: keine Schrittweite
    cy.rowShown('texStichRow1', false); cy.expectHash('tf', '2');
    cy.rerender(() => cy.pickOption('texWahl1', '2'));
    cy.expectHash('tr', '2');
    cy.rerender(() => cy.pickOption('textur', '15'));   // Ringfalle: die Auswertung bleibt, die Wertwahl gehört zur Rosette
    cy.rowShown('texWahlRow1', false); cy.rowShown('texFallenRow1', true); cy.expectHash('tf', '2'); cy.expectHash('tr', null);
    cy.rerender(() => cy.pickOption('textur', '1'));   // Streifenmittel ist keine Falle: nichts davon, auch nicht im Link
    cy.rowShown('texWahlRow1', false); cy.rowShown('texFallenRow1', false); cy.rowShown('texStichRow1', false); cy.expectHash('tf', null);
  });

  it('Link: Regler, Wertwahl und Auswertung kommen aus dem Link zurück, auch auf Platz 2; getippte Blätter werden gerundet', () => {
    cy.visitApp(B + '&tx=23&tq=0.7:6:0.5:30:0.3:3&tr=1&tf=1:3&t2=15&t2f=2');
    cy.pane('texturen');
    ['0.7', '6', '0.5', '30', '0.3', '3'].forEach((v, i) => cy.get('#texW1_' + i).should('have.value', v));
    cy.get('#texWahl1').should('have.value', '1'); cy.get('#texFallen1').should('have.value', '1'); cy.get('#texStich1').should('have.value', '3');
    cy.rowShown('texWahlRow2', false); cy.rowShown('texFallenRow2', true); cy.rowShown('texStichRow2', false); cy.get('#texFallen2').should('have.value', '2');
    cy.expectHash('tq', '0.7:6:0.5:30:0.3:3'); cy.expectHash('tr', '1'); cy.expectHash('tf', '1:3'); cy.expectHash('t2f', '2');
    cy.appState().then(st => { expect(st.params.tr, 'Zustand tr').to.eq('1'); expect(st.params.tf, 'Zustand tf').to.eq('1:3'); expect(st.params.t2f, 'Zustand t2f').to.eq('2'); });
    cy.revealInDetails('texW1_1Val');
    cy.rerender(() => cy.get('#texW1_1Val').scrollIntoView().clear().type('4,6{enter}'));   // Blätter sind ganzzahlig: 4,6 wird 5
    cy.get('#texW1_1').should('have.value', '5'); cy.get('#texW1_1Val').should('have.value', '5');
    cy.expectHash('tq', '0.7:5:0.5:30:0.3:3');
  });

  it('Bild: Maske, Kontaktiteration und Kontaktwinkel sehen verschieden aus, ebenso Stichproben und am Ende; Drall macht die Spiralrosette; WebGL 2 rechnet dasselbe', () => {
    cy.visitApp(B + '&tx=23&ts=0.8');
    cy.shotStats('ros-maske').then(maske => {
      cy.visitApp(B + '&tx=23&ts=0.8&tr=1');
      cy.shotStats('ros-iteration').then(it1 => {
        anders(maske, it1, 'die Kontaktiteration färbt anders als die Maske');
        cy.visitApp(B + '&tx=23&ts=0.8&tr=2');
        cy.shotStats('ros-winkel').then(wi => {
          anders(maske, wi, 'der Kontaktwinkel färbt anders als die Maske'); anders(it1, wi, 'Kontaktwinkel und Kontaktiteration unterscheiden sich');
          cy.visitApp(B + '&tx=23&ts=0.8&tr=2', { storage: { 'fractal.renderer': 'webgl' } });
          cy.shotStats('ros-winkel-gl').then(gl => gleich(wi, gl, 'WebGL 2 rechnet den Kontaktwinkel wie WebGPU'));
        });
      });
      cy.visitApp(B + '&tx=23&ts=0.8&tf=1');
      cy.shotStats('ros-stich').then(st => {
        anders(maske, st, 'Stichproben (jede vierte Iteration) ergeben ein anderes Bild');
        cy.visitApp(B + '&tx=23&ts=0.8&tf=2');
        cy.shotStats('ros-ende').then(en => { anders(maske, en, 'am Ende ergibt ein anderes Bild'); anders(st, en, 'Stichproben und am Ende unterscheiden sich'); });
      });
      cy.visitApp(B + '&tx=23&ts=0.8&tq=0.5:5:2');
      cy.shotStats('ros-drall').then(dr => anders(maske, dr, 'Drall macht aus der Rosette eine Spiralrosette'));
      cy.visitApp(B + '&tx=23&ts=0.8', { storage: { 'fractal.renderer': 'webgl' } });
      cy.shotStats('ros-maske-gl').then(gl => gleich(maske, gl, 'WebGL 2 rechnet die Rosette wie WebGPU'));
    });
  });

  it('Vorgabe lässt das alte Bild: Ringfalle mit und ohne Schlüssel identisch, andere Auswertung anders; der Fallenverbund nimmt die Rosette mit, WebGL 2 gleich', () => {
    cy.visitApp(B + '&tx=15&ts=0.8');
    cy.shotStats('ring-alt').then(alt => {
      cy.visitApp(B + '&tx=15&ts=0.8&tf=0&tr=0');   // die Vorgaben ausdrücklich im Link: dieselben Werte, die Schlüssel verschwinden
      cy.expectHash('tf', null); cy.expectHash('tr', null);
      cy.shotStats('ring-vorgabe').then(vg => gleich(alt, vg, 'die Vorgabe der Auswertung ändert die Ringfalle nicht', 1));
      cy.visitApp(B + '&tx=15&ts=0.8&tf=2');
      cy.shotStats('ring-ende').then(en => anders(alt, en, 'am Ende färbt die Ringfalle anders'));
      cy.visitApp(B + '&tx=15&ts=0.8&tf=1:2');
      cy.shotStats('ring-stich').then(st => anders(alt, st, 'jede zweite Iteration färbt die Ringfalle anders', 1));
    });
    cy.visitApp(B + '&tx=23&ts=0.8&t2=15&t2s=0.6');
    cy.shotStats('verbund-ohne').then(ohne => {
      cy.visitApp(B + '&tx=23&ts=0.8&t2=15&t2s=0.6&tv=0.5');
      cy.pane('texturen'); cy.get('#texVerbund').should('have.value', '0.5');
      cy.shotStats('verbund-mit').then(mit => {
        anders(ohne, mit, 'der Verbund mit der Rosette verändert das Bild');
        cy.visitApp(B + '&tx=23&ts=0.8&t2=15&t2s=0.6&tv=0.5', { storage: { 'fractal.renderer': 'webgl' } });
        cy.shotStats('verbund-gl').then(gl => gleich(mit, gl, 'WebGL 2 rechnet den Verbund mit der Rosette wie WebGPU'));
      });
    });
  });
});
