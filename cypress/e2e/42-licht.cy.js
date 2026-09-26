// Relief mit fester Neigung, einstellbares Licht, Kuppeln innen, Feldlinien aus den letzten Schritten (26.09.2026).
// Additiv: ohne die Schlüssel rn, li, li2, in=5, tx=24 bleibt jedes Bild, wie es war.
import { IMAGE_REGION } from '../support/commands';

const B = 'mode=mandel&re=0.34236842755989844&im=0.42789484789099641&z=3.6e7&it=256&map=6';   // Dendriten mit weiten Tälern
const K = 'mode=mandel&re=-0.75&im=0.1&z=8&it=500&map=6';                                     // große Komponenten für die Kuppeln
const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => d.meanDiff);
const anders = (a, b, text, min = 2) => diff(a, b).then(d => expect(d, text).to.be.greaterThan(min));
const gleich = (a, b, text) => diff(a, b).then(d => expect(d, text).to.be.lessThan(0.5));

describe('Relief mit fester Neigung und einstellbarem Licht', () => {
  it('Zeilen hierarchisch: Normale nur beim Relief, Winkel nur mit fester Neigung; Lichter als Karten, hinzufügen, ausschalten, entfernen', () => {
    cy.visitApp(B.replace('map=6', 'map=2'));
    for (const z of ['reliefNormRow', 'neigungWinkelRow', 'lichtRow']) cy.rowShown(z, false);
    cy.visitApp(B);
    cy.rowShown('reliefNormRow'); cy.rowShown('neigungWinkelRow', false); cy.rowShown('lichtRow');
    cy.get('.licht-karte').should('have.length', 1); cy.get('#lichtWeg1').should('not.be.visible');   // ein Licht, das bleibt
    cy.get('#licht1_az').should('have.value', '135'); cy.expectHash('lz', null);   // die Vorgabe steht nicht im Link
    cy.rerender(() => cy.pickOption('reliefNorm', '1'));
    cy.rowShown('neigungWinkelRow'); cy.expectHash('rn', '40');
    cy.get('#lichtNeu').click({ force: true }); cy.waitRender();
    cy.get('.licht-karte').should('have.length', 2); cy.expectHash('lz', '135:38.6:0.8:0.4:28:ffffff_315:30:0.5:0:28:9ec8ff');
    cy.get('#lichtAn2').uncheck({ force: true }); cy.waitRender();
    cy.expectHash('lz', '135:38.6:0.8:0.4:28:ffffff_315:30:0.5:0:28:9ec8ff:0'); cy.get('#lichtKarte2').should('have.class', 'aus');
    cy.get('#lichtZu1').click({ force: true }); cy.get('#lichtKarte1').should('have.class', 'nach-zu');   // zugeklappt: nur der Kopf
    cy.get('#lichtWeg2').click({ force: true }); cy.get('#rueckfrageJa').should('have.text', 'Licht entfernen').click();
    cy.get('.licht-karte').should('have.length', 1); cy.expectHash('lz', null);
  });

  it('ohne neue Schlüssel wie bisher; feste Neigung und Lichter verändern das Bild und kommen aus dem Link zurück', () => {
    cy.visitApp(B); cy.shotStats('licht-ohne').then(ohne => {
      cy.visitApp(B + '&amb=0.31'); cy.expectHash('amb', '0.31');   // eingestellt, fast die Vorgabe: fast dasselbe Bild
      cy.shotStats('licht-vorgabe').then(v => diff(ohne, v).then(d => expect(d, 'eingestellt auf fast die Vorgabe').to.be.lessThan(3)));
      cy.visitApp(B + '&rn=30'); cy.expectHash('rn', '30');
      cy.get('#reliefNorm').should('have.value', '1'); cy.get('#neigungWinkel').should('have.value', '30');
      cy.shotStats('licht-rn').then(rn => {
        anders(ohne, rn, 'feste Neigung');
        cy.visitApp(B + '&rn=30&lz=150:30:0.8:3:300:ffffff'); cy.expectHash('lz', '150:30:0.8:3:300:ffffff');
        cy.get('#licht1_az').should('have.value', '150'); cy.get('#licht1_haerteVal').should('have.value', '300');
        cy.shotStats('licht-glanz').then(g => {
          anders(rn, g, 'Licht mit hartem Glanz');
          cy.visitApp(B + '&rn=30&lz=150:30:0.8:3:300:ffffff_300:20:1:0:28:ff8040'); cy.get('#licht2_farbe').should('have.value', '#ff8040');
          cy.shotStats('licht-zwei').then(z => anders(g, z, 'zweites Licht', 1));
        });
      });
    });
    cy.visitApp(B + '&rn=0'); cy.expectHash('rn', null);   // 0 = aus
    cy.visitApp(B + '&rn=200'); cy.expectHash('rn', '85');   // begrenzt
    cy.visitApp(B + '&lz=1_2_3_4_5_6'); cy.get('.licht-karte').should('have.length', 4);   // höchstens vier Lichter
  });

  it('Kuppeln innen: eigene Innenfärbung, beleuchtet, im Link; das Licht gilt auch dort', () => {
    cy.visitApp(K.replace('map=6', 'map=2') + '&in=2'); cy.shotStats('innen-linien').then(linien => {
      cy.visitApp(K.replace('map=6', 'map=2') + '&in=5'); cy.expectHash('in', '5');
      cy.get('#interior').should('have.value', '5'); cy.rowShown('lichtRow');   // ohne Relief-Färbung: das Licht der Kuppeln
      cy.shotStats('innen-kuppeln').then(k => {
        anders(linien, k, 'Kuppeln statt Höhenlinien');
        cy.visitApp(K.replace('map=6', 'map=2') + '&in=5&lz=315:30:0.8:1:40:ffffff');
        cy.shotStats('innen-kuppeln-licht').then(kl => anders(k, kl, 'Licht von der anderen Seite'));
      });
    });
  });

  it('Feldlinien aus den letzten Schritten: Texturart 24 mit eigenen Reglern und Streifen, im Link', () => {
    cy.visitApp(K); cy.shotStats('fl-ohne').then(ohne => {
      cy.visitApp(K + '&tx=24&ts=1&sp=3'); cy.expectHash('tx', '24'); cy.expectHash('sp', '3');
      cy.get('#textur option[value="24"]').should('have.text', 'Feldlinien (letzte Schritte)');
      cy.shotStats('fl-mit').then(mit => {
        anders(ohne, mit, 'Feldlinien verändern das Bild', 1);
        cy.visitApp(K + '&tx=24&ts=1&sp=3&tq=8:0.2'); cy.expectHash('tq', '8:0.2');
        cy.shotStats('fl-regler').then(r => anders(mit, r, 'andere Stellen und Gewichte', 0.3));
        cy.visitApp(K + '&tx=24&ts=1&sp=3'); cy.shotStats('fl-mit2').then(m2 => gleich(mit, m2, 'bestimmt: derselbe Link, dasselbe Bild'));
      });
    });
  });
});
