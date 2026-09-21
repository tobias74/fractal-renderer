// Ziele der Texturplätze: neben Helligkeit (2) und den beiden Achsen (0, 1) gibt es die Palettenposition (3) und die
// Sättigung (4). Geprüft: die Auswahl ist hierarchisch (Palettenposition nur ohne „Werte kombinieren“, Achsen nur damit),
// die Werte überstehen Link, Löschen und „Alles zurücksetzen“, jedes Ziel färbt anders, die Vorgabe lässt das alte Bild,.
import { IMAGE_REGION } from '../support/commands';

describe('Ziele der Texturplätze: Palettenposition und Sättigung', () => {
  const B = 'mode=mandel&re=-0.75&im=0.1&z=1.3&it=200&ca=off';
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  const anders = (a, b, text, min = 3) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.greaterThan(min));
  const gleich = (a, b, text, max = 8) => diff(a, b).then(d => expect(d.meanDiff, text).to.be.lessThan(max));
  const option = (v, versteckt) => cy.get('#texZiel1 option[value="' + v + '"]').should(versteckt ? 'have.attr' : 'not.have.attr', 'hidden');

  it('Auswahl hierarchisch: Palettenposition ohne Achsen, Achsen nur bei „Werte kombinieren“, Sättigung immer', () => {
    cy.visitApp(B + '&tx=1&ts=0.5');
    cy.pane('texturen');
    cy.get('#texZiel1 option').should('have.length', 7);
    cy.get('#texZiel1 option[value="3"]').should('have.text', 'Palettenposition');
    cy.get('#texZiel1 option[value="4"]').should('have.text', 'Sättigung');
    cy.get('#texZiel1').should('have.value', '2'); cy.expectHash('tz', null);   // Vorgabe bleibt die Helligkeit, ohne Schlüssel
    option('3', false); option('4', false); option('0', true); option('1', true);   // ohne Achsen in der Färbung: die eine Palettenposition
    cy.rerender(() => cy.pickOption('texZiel1', '3'));
    cy.expectHash('tz', '3');
    cy.rowShown('texFarbenRow', false);   // in der Palette zieht der Wert nicht zu hellen und dunklen Farben
    cy.rowShown('texMaskeRow1', false);   // und er wirkt überall, nicht unter einer Maske
    cy.rerender(() => cy.pickOption('texZiel1', '4'));
    cy.expectHash('tz', '4');
    cy.rowShown('texFarbenRow', false);   // die Sättigung braucht die beiden Farben ebenso wenig …
    cy.rowShown('texMaskeRow1', true);    // … folgt aber der Maske wie die Helligkeit
    cy.rerender(() => cy.pickOption('texZiel1', '3'));
    cy.rerender(() => cy.pickOption('mapping', 31));   // „Werte kombinieren“ hat zwei Achsen …
    cy.get('#texZiel1').should('have.value', '2');     // … die Palettenposition fällt sichtbar auf die Helligkeit zurück
    cy.expectHash('tz', null);
    cy.pane('texturen');
    option('3', true); option('0', false); option('1', false); option('4', false);
    cy.rerender(() => cy.pickOption('texZiel1', '0'));
    cy.expectHash('tz', '0');
    cy.rerender(() => cy.pickOption('texZiel1', '4'));   // die Sättigung gibt es auch dort
    cy.expectHash('tz', '4');
    cy.rerender(() => cy.pickOption('mapping', 2));      // zurück zu einer Färbung ohne Achsen: die Sättigung bleibt
    cy.get('#texZiel1').should('have.value', '4'); cy.expectHash('tz', '4');
    cy.pane('texturen'); option('3', false); option('0', true); option('1', true);
  });

  it('Link: die neuen Ziele kommen je Platz zurück, überstehen Löschen und „Alles zurücksetzen“', () => {
    cy.visitApp(B + '&tx=1&ts=0.5&tz=3&t2=2&t2s=0.4&t2z=4&t3=4&t3s=0.3&t3z=3');
    cy.pane('texturen');
    cy.get('#texZiel1').should('have.value', '3');
    cy.get('#texZiel2').should('have.value', '4');
    cy.get('#texZiel3').should('have.value', '3');
    cy.expectHash('tz', '3'); cy.expectHash('t2z', '4'); cy.expectHash('t3z', '3');
    cy.appState().then(st => { expect(st.params.tz, 'Zustand tz').to.eq('3'); expect(st.params.t2z, 'Zustand t2z').to.eq('4'); expect(st.params.t3z, 'Zustand t3z').to.eq('3'); });
    cy.rerender(() => cy.pickOption('texZiel2', '2'));   // Helligkeit ist die Vorgabe: der Schlüssel verschwindet
    cy.expectHash('t2z', null); cy.expectHash('tz', '3');
    cy.rerender(() => cy.pickOption('texZiel2', '4'));
    cy.get('#texturRow .tex-weg').click({ force: true });   // Platz 1 heraus: die übrigen rücken auf und bringen ihr Ziel mit
    cy.get('#rueckfrageJa').click();
    cy.get('#texZiel1').should('have.value', '4');
    cy.get('#texZiel2').should('have.value', '3');
    cy.expectHash('tx', '2'); cy.expectHash('tz', '4'); cy.expectHash('t2z', '3'); cy.expectHash('t3z', null);
    cy.rerender(() => cy.get('#reset').click());   // Alles zurücksetzen: kein Ziel mehr im Link
    cy.expectHash('tz', null); cy.expectHash('t2z', null);
  });

  it('Bild: Palettenposition und Sättigung färben anders als die Helligkeit; Stärke 0 lässt jedes Ziel wirkungslos; WebGL 2 rechnet dasselbe', () => {
    cy.visitApp(B);
    cy.shotStats('tz-ohne').then(ohne => {
      cy.visitApp(B + '&tx=1&ts=0&tz=3');   // ohne Stärke verschiebt der Platz nichts
      cy.shotStats('tz-null').then(nul => gleich(ohne, nul, 'Stärke 0 lässt das Bild wie ohne Textur', 1));
      cy.visitApp(B + '&tx=1&ts=0.5');
      cy.shotStats('tz-hell').then(hell => {
        cy.visitApp(B + '&tx=1&ts=0.5&tz=2');   // die Vorgabe ausdrücklich im Link: derselbe Stand, der Schlüssel verschwindet
        cy.expectHash('tz', null);
        cy.shotStats('tz-hell2').then(h2 => gleich(hell, h2, 'die ausdrückliche Vorgabe lässt das alte Bild', 1));
        cy.visitApp(B + '&tx=1&ts=0.5&tz=3');
        cy.shotStats('tz-palette').then(pal => {
          anders(hell, pal, 'die Palettenposition färbt anders als die Helligkeit');
          cy.visitApp(B + '&tx=1&ts=0.5&tz=4');
          cy.shotStats('tz-satt').then(satt => {
            anders(hell, satt, 'die Sättigung färbt anders als die Helligkeit');
            anders(pal, satt, 'Palettenposition und Sättigung unterscheiden sich');
          });
        });
      });
    });
  });

  it('Auch über einer Statistik-Färbung, mit gemittelter Palette und innen wirken die neuen Ziele', () => {
    cy.visitApp(B + '&map=19&tx=4&ts=0.5');   // Streifenmittel als Färbung, Kreuzfalle als Textur (Werte im z- und w-Kanal)
    cy.shotStats('stat-hell').then(hell => {
      cy.visitApp(B + '&map=19&tx=4&ts=0.5&tz=3');
      cy.shotStats('stat-palette').then(pal => {
        anders(hell, pal, 'über einer Statistik-Färbung verschiebt die Palettenposition die Farbe');
      });
      cy.visitApp(B + '&map=19&tx=4&ts=0.5&tz=4');
      cy.shotStats('stat-satt').then(satt => anders(hell, satt, 'die Sättigung wirkt auch über einer Statistik-Färbung'));
    });
    cy.visitApp(B + '&tx=1&ts=0.5', { storage: { 'fractal.palfilter': '1' } });   // gemittelte Palette: die Verschiebung wirkt davor
    cy.shotStats('breit-hell').then(hell => {
      cy.visitApp(B + '&tx=1&ts=0.5&tz=3', { storage: { 'fractal.palfilter': '1' } });
      cy.shotStats('breit-palette').then(pal => anders(hell, pal, 'auch mit gemittelter Palette verschiebt die Palettenposition die Farbe'));
    });
    cy.visitApp(B + '&map=17&tx=1&ts=0.5&tw=2');   // Kreuzfalle als Färbung (innen wie außen), ein Platz überall
    cy.shotStats('ueberall-hell').then(hell => {
      cy.visitApp(B + '&map=17&tx=1&ts=0.5&tw=2&tz=3');
      cy.shotStats('ueberall-palette').then(pal => anders(hell, pal, 'innen wie außen verschiebt die Palettenposition die Farbe', 1));
    });
    cy.visitApp(B + '&in=3&tx=1&ts=0.5&tw=1');   // Innenfärbung nach Betrag und Winkel, ein Platz nur innen
    cy.shotStats('innen-hell').then(hell => {
      cy.visitApp(B + '&in=3&tx=1&ts=0.5&tw=1&tz=3');
      cy.shotStats('innen-palette').then(pal => anders(hell, pal, 'auch die Innenfärbung mit eigenem Palettenwert folgt der Palettenposition', 1));
    });
  });
});
