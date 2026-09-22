// Texturen über den Wurzelformeln (Newton/Nova, Halley/Nova und die Fassungen auf eigene Nullstellen). Dort flieht
// nichts: die Bahn läuft in eine Nullstelle, und statt der Fluchtzeit zählt die Schrittzahl bis dorthin. Die Sammler
// hängen ohnehin an der Bahn, also tragen die Plätze auch hier. Was das Fliehen braucht, bleibt hierarchisch weg:
// Randnähe und Karte brauchen die Abstandsschätzung, Strahlen und Wirbel den Fluchtwinkel.
import { IMAGE_REGION } from '../support/commands';

describe('Texturen über den Wurzelformeln', () => {
  const B = 'mode=mandel&f=11&p=3&re=0&im=0&z=1.6&it=400';   // Newton/Nova, Potenz 3
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  const anders = (a, b, text, min = 3) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 0.5) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.lessThan(max));

  it('der Bereich steht bei Newton zur Verfügung, und die Arten ohne Fluchtzeit fehlen darin', () => {
    cy.visitApp(B); cy.waitRender();
    cy.get('#railTexturen').should('not.have.attr', 'hidden');
    cy.pane('texturen');
    for (const v of ['1', '2', '4', '5', '11', '14', '15', '19', '23']) cy.get(`#textur option[value="${v}"]`).should('not.have.attr', 'hidden');
    for (const v of ['6', '7', '10', '21']) cy.get(`#textur option[value="${v}"]`).should('have.attr', 'hidden');   // Strahlen, Wirbel, Randnähe, Karte
    cy.visitApp('mode=mandel&f=0'); cy.pane('texturen');
    for (const v of ['6', '7', '10', '21']) cy.get(`#textur option[value="${v}"]`).should('not.have.attr', 'hidden');   // bei einer Fluchtzeit-Formel sind sie wieder da
  });

  it('jede Art, die die Bahn ausliest, ändert das Bild; ohne Platz bleibt es das alte', () => {
    cy.visitApp(B); cy.waitRender();
    cy.shotStats('nt-ohne').then(ohne => {
      for (const [art, name] of [['4', 'Kreuzfalle'], ['1', 'Streifenmittel'], ['11', 'Kanten'], ['15', 'Ringfalle']]) {
        cy.visitApp(B + '&tx=' + art + '&ts=0.9'); cy.waitRender();
        cy.shotStats('nt-' + art).then(a => anders(ohne, a, name + ' färbt die Wurzelfärbung um'));
      }
      cy.visitApp(B + '&tx=0'); cy.waitRender();
      cy.shotStats('nt-keine').then(a => gleich(ohne, a, 'ohne Art bleibt das Bild, wie es war'));
    });
  });

  it('eine Art, die es hier nicht gibt, wirkt nicht und lässt das Bild unberührt', () => {
    cy.visitApp(B); cy.waitRender();
    cy.shotStats('nt-rein').then(rein => {
      cy.visitApp(B + '&tx=10&ts=0.9'); cy.waitRender();   // Randnähe aus dem Link: ohne Abstandsschätzung wirkungslos
      cy.shotStats('nt-randnaehe').then(a => gleich(rein, a, 'die Randnähe bleibt bei Newton ohne Wirkung'));
    });
  });

  it('auch Halley/Nova trägt die Plätze', () => {
    const H = 'mode=mandel&f=23&p=3&re=0&im=0&z=1.6&it=400';
    cy.visitApp(H); cy.waitRender();
    cy.shotStats('nt-halley-ohne').then(ohne => {
      cy.visitApp(H + '&tx=15&ts=0.9'); cy.waitRender();
      cy.shotStats('nt-halley-ring').then(a => anders(ohne, a, 'die Ringfalle wirkt auch auf Halley'));
    });
  });

  it('an den Fluchtzeit-Formeln ändert sich nichts: dasselbe Bild wie zuvor', () => {
    const M = 'mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400&ca=off&tx=1&ts=0.8';
    cy.visitApp(M); cy.waitRender();
    cy.shotStats('nt-mandel-streifen').then(s => {
      expect(s.mean, 'das Bild steht').to.be.greaterThan(5);
      expect(s.colors, 'und ist farbig').to.be.greaterThan(200);
    });
    cy.expectHash('tx', '1');
  });
  // Dieselbe Frage eine Ebene höher: die Bahn-Färbungen und „Werte kombinieren“ lesen ebenfalls nur die Bahn aus.
  // Gesperrt bleiben Lyapunov (passt nicht zu einer Konvergenz) und die beiden Winkel-Färbungen.
  it('die Bahn-Färbungen und das Paar gelten auch über den Wurzelformeln, Lyapunov und die Winkel nicht', () => {
    cy.visitApp(B); cy.waitRender();
    cy.pane('farbe');
    for (const m of ['17', '19', '20', '24', '26', '29', '31', '32', '35']) cy.get(`#mapping option[value="${m}"]`).should('not.have.attr', 'hidden');
    for (const m of ['13', '14', '15', '16', '34']) cy.get(`#mapping option[value="${m}"]`).should('have.attr', 'hidden');
    cy.visitApp(B + '&map=13'); cy.waitRender();   // aus dem Link: fällt auf die Wurzelfärbung zurück
    cy.pane('farbe'); cy.get('#mapping').should('have.value', '2');
  });

  it('jede Bahn-Färbung ergibt über Newton ihr eigenes Bild', () => {
    cy.visitApp(B); cy.waitRender();
    cy.shotStats('nf-wurzel').then(wurzel => {
      const bilder = [];
      for (const m of ['19', '17', '24', '32', '26']) {
        cy.visitApp(B + '&map=' + m); cy.waitRender();
        cy.shotStats('nf-' + m).then(a => { bilder.push(a); anders(wurzel, a, 'Färbung ' + m + ' färbt anders als die Wurzelfärbung'); });
      }
      cy.then(() => {
        anders(bilder[0], bilder[1], 'Streifenmittel und Kreuzfalle unterscheiden sich');
        anders(bilder[1], bilder[2], 'Kreuzfalle und Ursprungsnähe unterscheiden sich');
        anders(bilder[2], bilder[3], 'Ursprungsnähe und Spiralfalle unterscheiden sich');
      });
      cy.visitApp(B + '&map=31&pa=1:1:0:0&pb=2:30:0:0'); cy.waitRender();   // Werte kombinieren: Schrittzahl und Streifenmittel
      cy.shotStats('nf-paar').then(a => anders(wurzel, a, 'Werte kombinieren färbt anders als die Wurzelfärbung'));
      cy.pane('farbe'); cy.rowShown('paarRow', true);
      cy.get('#paarA option[value="8"]').should('have.attr', 'hidden');   // Fluchtwinkel als Achse: nur, wo etwas flieht
    });
  });
});
