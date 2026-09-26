// Nullstellenverfahren, Verzerrungen, Parameterebenen, Wendepunkte, Domain Coloring, neue Texturen, Innenfärbungen, Zuordnungen und
// LCh-Mischmodi (26.09.2026). Additiv: ohne die neuen Schlüssel bleibt jedes Bild, wie es war; derselbe Link gibt dasselbe Bild.
import { IMAGE_REGION } from '../support/commands';

const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION }).then(d => d.meanDiff);
const anders = (a, b, text, min = 2) => diff(a, b).then(d => expect(d, text).to.be.greaterThan(min));
const gleich = (a, b, text, max = 0.5) => diff(a, b).then(d => expect(d, text).to.be.lessThan(max));
const bild = (hash, name) => { cy.visitApp(hash); return cy.shotStats(name); };

describe('Der Link gibt jede Zahl exakt wieder', () => {
  it('feine Werte bleiben erhalten, kurze Formen bleiben kurz; Laden und Schreiben ist ein Fixpunkt (auch Re und Im)', () => {
    const L = 'mode=mandel&re=-1.768667862837488812627419470&im=0.001645580546820209430325900&z=4.444444e%2B21&it=2000&map=12&sc=0&den=7.863651&off=0.487843&ca=off&rn=22.08&tx=24&ts=0.05&tz=3';
    cy.visitApp(L);
    cy.expectHash('den', '7.863651'); cy.expectHash('off', '0.487843'); cy.expectHash('rn', '22.08'); cy.expectHash('ts', '0.05');
    cy.location('hash').then(h1 => { cy.visitApp(h1.slice(1)); cy.location('hash').should('eq', h1); });
    cy.visitApp('mode=mandel&den=0.04&off=0.5'); cy.expectHash('den', '0.0400'); cy.expectHash('off', '0.500');   // wie bisher
  });
});

describe('Nullstellenverfahren', () => {
  it('die Auswahl heißt „Verfahren“, Newton ist die Vorgabe und bleibt bitgleich; jedes weitere Verfahren zeichnet anders', () => {
    const B = 'mode=julia&f=11&p=3&z=0.5&re=0&im=0&it=200&jre=0&jim=0';
    bild(B, 'vf-ohne').then(ohne => {
      cy.rowShown('fnRow'); cy.get('label[for="fnSel"]').should('have.text', 'Verfahren');
      cy.get('#fnSel option').should('have.length', 7);
      bild(B + '&fn=0', 'vf-newton').then(nw => gleich(ohne, nw, 'Newton = bisher'));
      for (const fn of [1, 4, 5, 6]) bild(B + '&fn=' + fn, 'vf-' + fn).then(m => { cy.expectHash('fn', String(fn)); anders(ohne, m, 'Verfahren ' + fn); });
    });
    cy.visitApp('mode=mandel&f=0'); cy.get('label[for="fnSel"]').then($l => expect($l.closest('#fnRow').attr('hidden'), 'ohne Liste keine Auswahl').to.exist);
  });
  it('auch bei Newton auf eigene Nullstellen', () => {
    const B = 'mode=julia&f=35&z=0.7&re=0&im=0&it=200&jre=0&jim=0';
    bild(B, 'vf35-ohne').then(ohne => bild(B + '&fn=2', 'vf35-2').then(m => anders(ohne, m, 'Tschebyschow auf eigene Nullstellen')));
  });
});

describe('Ebene: Verzerrungen, Parameterebenen, Wendepunkte', () => {
  const B = 'mode=mandel&re=-0.5&im=0&z=1&it=300';
  it('Verzerrungen mit Mitte und Reglern, im Link; Parameterebenen ohne Regler', () => {
    bild(B, 'eb-ohne').then(ohne => {
      bild(B + '&ab=10&am=-0.75:0.1:6:15', 'eb-kal').then(k => { anders(ohne, k, 'Kaleidoskop'); cy.expectHash('am', '-0.75:0.1:6:15'); cy.rowShown('abbParamRow'); cy.get('#abbAVal').should('have.value', '6'); });
      bild(B + '&ab=8', 'eb-strudel').then(k => { anders(ohne, k, 'Strudel'); cy.expectHash('am', '0:0:1:1'); });
      bild(B + '&ab=12', 'eb-lambda').then(k => { anders(ohne, k, 'λ-Ebene'); cy.rowShown('abbParamRow', false); cy.expectHash('am', null); });
    });
  });
  it('Wendepunkt in der Bildmitte: im Link, bestimmt; entfernen stellt Mitte und Zoom wieder her', () => {
    const S = 'mode=mandel&re=-0.7453&im=0.1127&z=300&it=800';
    cy.visitApp(S); cy.shotStats('wp-ohne').then(ohne => {
      cy.get('#wendeSetzen').click({ force: true }); cy.waitRender();
      cy.expectHash('wp', '-0.7453,0.1127,3.0000e+2');   // exakt und kurz; dazu der Zoom davor, damit das Entfernen genau zurückfindet
      cy.shotStats('wp-mit').then(mit => {
        anders(ohne, mit, 'gefaltet');
        cy.location('hash').then(h => { cy.visitApp(h.slice(1)); cy.shotStats('wp-link').then(l => gleich(mit, l, 'derselbe Link, dasselbe Bild')); });
      });
      cy.get('#wendeWeg').click({ force: true }); cy.waitRender();
      cy.expectHash('wp', null); cy.expectHash('z', '3.0000e+2');
      cy.shotStats('wp-weg').then(w => gleich(ohne, w, 'zurück wie vorher', 1));
    });
  });
});

describe('Färbungen, Texturen, Innen, Zuordnungen, Mischmodi', () => {
  it('Domain Coloring: Schritt N im Link, anders als ohne', () => {
    const B = 'mode=mandel&re=-0.6&im=0&z=1&it=200';
    bild(B + '&map=36', 'dc-letzter').then(a => {
      cy.rowShown('domSchrittRow');
      bild(B + '&map=36&dn=8', 'dc-8').then(b => { cy.expectHash('dn', '8'); anders(a, b, 'nach acht Schritten'); });
    });
  });
  it('Lagrange-Deskriptor, Tropfenfalle, Entropie färben anders als keine Textur; die p-Norm der Ringfalle wirkt', () => {
    const B = 'mode=mandel&re=-0.7453&im=0.1127&z=300&it=800';
    bild(B, 'tx-ohne').then(ohne => {
      for (const art of [25, 26, 27]) bild(B + '&tx=' + art + '&ts=1', 'tx-' + art).then(m => { cy.expectHash('tx', String(art)); anders(ohne, m, 'Art ' + art, 1); });
      bild(B + '&tx=15&ts=1', 'ring-kreis').then(k => bild(B + '&tx=15&ts=1&tq=1:0:1', 'ring-raute').then(rr => { cy.expectHash('tq', '1:0:1'); anders(k, rr, 'Raute statt Kreis', 0.5); }));
    });
  });
  it('Äquikontinuität: zweite Bahn bei z^d + c, im Link mit ihren Reglern; bei anderen Formeln neutral', () => {
    const B = 'mode=mandel&re=-0.7453&im=0.1127&z=300&it=800';
    bild(B + '&tz=3', 'aq-ohne').then(ohne => bild(B + '&tx=28&ts=1&tz=3', 'aq-mit').then(mit => {
      cy.expectHash('tx', '28'); anders(ohne, mit, 'Äquikontinuität auf der Palettenposition');
      bild(B + '&tx=28&ts=1&tz=3&tq=2:5', 'aq-regler').then(r => { cy.expectHash('tq', '2:5'); anders(mit, r, 'anderer Abstand und Skala', 0.3); });
    }));
    const T = 'mode=mandel&f=2&re=-0.5&im=0&z=1&it=300&tz=3';   // Tricorn: keine zweite Bahn, der Platz bleibt neutral
    bild(T, 'aq-t-ohne').then(ohne => bild(T + '&tx=28&ts=1', 'aq-t-mit').then(mit => gleich(ohne, mit, 'neutral bei anderen Formeln')));
  });
  it('Sinuswellen (Färbung 40): alle Werte im Link, Zeilen sichtbar, anders als ohne; Masken und Schalter kommen zurück', () => {
    const B = 'mode=mandel&re=-0.7453&im=0.1127&z=300&it=2000';
    const W = '96,5,1,1,0.3,1.2,2.4,0,0.5,-0.5,0.8,0,1,1.1,0.9,11100,01110,00111,3';
    bild(B + '&map=0', 'sw-linear').then(l => bild(B + '&map=40&wv=' + W, 'sw-sinus').then(sw => {
      cy.expectHash('wv', W); cy.rowShown('sinusRow'); anders(l, sw, 'Sinuswellen');
      cy.get('#sinus_mG').should('have.value', '01110'); cy.get('#sinus_nachher').should('be.checked');
    }));
    cy.visitApp(B + '&map=40'); cy.expectHash('wv', '64,0,1,0,0,2.0944,4.1888,0,0,0,0,0,1,1,1,1,1,1,0');   // die eigenen Vorgaben: ein Regenbogen ohne Sprünge
  });
  it('Sinuswellen, Zusätze: Verschiebung, XOR, polar, Rekursion stehen im Link und färben anders; ohne sie bleibt der Link kurz', () => {
    const B = 'mode=mandel&re=-0.7453&im=0.1127&z=300&it=2000&map=40&wv=96,5,1,1,0.3,1.2,2.4,0,0.5,-0.5,0.8,0,1,1.1,0.9,11100,01110,00111,3';
    bild(B, 'swz-ohne').then(ohne => {
      for (const z of ['0.5,0,0,1', '0,0.02,0,1', '0,0,0.02,1', '0,0,0,3']) bild(B + ',' + z, 'swz-' + z).then(m => { cy.expectHash('wv', v => expect(v.endsWith(',3,' + z), 'Zusätze im Link').to.be.true); anders(ohne, m, 'Zusatz ' + z); });
      bild(B + ',0,0,0,1', 'swz-null').then(m => { cy.location('hash').should('not.include', '00111%2C3%2C'); gleich(ohne, m, 'Zusätze auf der Vorgabe: dasselbe Bild', 0.01); });
    });
  });
  it('Sinuswellen, Palette: der Schalter nimmt die Palette (Bit 4 im Link), sperrt die Kanalwerte; ohne ihn ein Hinweis im Palette-Tab; Regler unter jedem Zahlenfeld', () => {
    const B = 'mode=mandel&re=-0.7453&im=0.1127&z=300&it=2000&map=40&wv=96,5,1,1,0.3,1.2,2.4,0,0.5,-0.5,0.8,0,1,1.1,0.9,11100,01110,00111,';
    bild(B + '3', 'swp-aus').then(aus => {
      cy.get('#palSinusHinweis').should('not.have.attr', 'hidden'); cy.get('#sinus_oRRegler').should('not.be.disabled');
      bild(B + '7', 'swp-an').then(an => {
        cy.expectHash('wv', v => expect(v.endsWith(',7'), 'Schalter im Link').to.be.true); anders(aus, an, 'Farben aus der Palette');
        cy.get('#sinus_palette').should('be.checked'); cy.get('#sinus_oRRegler').should('be.disabled'); cy.get('#sinus_versatzRegler').should('not.be.disabled');
        cy.get('#palSinusHinweis').should('have.attr', 'hidden');
        bild(B + '7&pal=weinrot', 'swp-weinrot').then(w => anders(an, w, 'eine andere Palette wirkt'));
      });
    });
    cy.visitApp(B + '3'); cy.get('#sinus_oBRegler').invoke('val', '2').trigger('input', { force: true }); cy.get('#sinus_oB').should('have.value', '2');
    cy.expectHash('wv', v => expect(v.split(',')[6]).to.eq('2'));
  });
  it('Innenfärbungen 6 bis 8 und die Zuordnungen 37 bis 39', () => {
    const B = 'mode=mandel&re=-0.5&im=0&z=1&it=300';
    bild(B + '&in=3', 'in-3').then(w => { for (const i of [6, 7, 8]) bild(B + '&in=' + i, 'in-' + i).then(m => { cy.expectHash('in', String(i)); anders(w, m, 'Innen ' + i, 1); }); });
    bild(B + '&map=0', 'map-0').then(l => { for (const m of [37, 38, 39]) bild(B + '&map=' + m, 'map-' + m).then(x => { cy.expectHash('map', String(m)); anders(l, x, 'Zuordnung ' + m, 1); }); });
  });
  it('LCh-Mischmodi der Fraktal-Ebenen', () => {
    const Z = 'mode=mandel&l2=f%3D1&la=2&lm2=';
    bild(Z + '0:1:1:0:1:', 'lch-normal').then(nm => { for (const m of [18, 19, 20, 21]) bild(Z + m + ':1:1:0:1:', 'lch-' + m).then(x => anders(nm, x, 'Modus ' + m, 1)); });
  });
});
