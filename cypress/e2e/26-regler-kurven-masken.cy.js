import { IMAGE_REGION } from '../support/commands';

// Regler, Kurven und Masken: Feinheiten der Bedienung, die bisher kein Test anfasst – getippte Werte (Enter, Escape,
// Unlesbares, Grenzen, Tausenderpunkt und Komma je Sprache), die beiden Kurveneditoren (Doppelklick, Nachbarn, Kanäle,
// Höchstzahl) und Masken beider Sorten zusammen mit der adaptiven Glättung.
describe('Regler, Kurven und Masken', () => {
  const B = 'mode=mandel&re=-0.9&im=0.6&z=1&it=400';
  const diff = (a, b) => cy.task('pngDiff', { a: a.file, b: b.file, region: IMAGE_REGION });
  const ebene = art => { cy.get('#nachNeu + .menu-btn').scrollIntoView().click(); cy.get('#nachNeuMenu').should('be.visible').find('button[data-value="' + art + '"]').click(); cy.get('#nachNeu').should('have.value', '0'); cy.waitRender(); };
  // Zeigerereignisse auf einer Zeichenfläche in Bruchteilen ihrer Breite und Höhe (die Editoren rechnen mit clientX/Y)
  const zeiger = (sel, art, fx, fy) => cy.get(sel).then($c => { const r = $c[0].getBoundingClientRect(); cy.wrap($c).trigger(art, { clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, button: 0, pointerId: 1, scrollBehavior: false }); });
  const ziehen = (sel, fx0, fy0, fx1, fy1) => { zeiger(sel, 'pointerdown', fx0, fy0); zeiger(sel, 'pointermove', fx1, fy1); zeiger(sel, 'pointerup', fx1, fy1); };
  const tippen = (sel, fx, fy) => { zeiger(sel, 'pointerdown', fx, fy); zeiger(sel, 'pointerup', fx, fy); };

  it('Getippte Werte: Enter übernimmt, Escape verwirft, Unlesbares stellt zurück, Grenzen klemmen, Tausenderpunkt und Komma je Sprache', () => {
    cy.visitApp(B);
    cy.get('#iterVal').should('have.value', '400');
    cy.get('#iterVal').clear().type('1.500{enter}');            // deutsch: ein Punkt mit drei Ziffern dahinter ist der Tausenderpunkt
    cy.expectHash('it', '1500'); cy.get('#iterVal').should('have.value', '1.500');
    cy.get('#iterVal').clear().type('2,5{enter}');              // das Komma trennt Dezimalen: 2,5 klemmt an die Untergrenze 50
    cy.expectHash('it', '50'); cy.get('#iterVal').should('have.value', '50');
    cy.get('#iterVal').clear().type('abc{enter}');              // unlesbar: der alte Wert kommt zurück, der Link bleibt
    cy.get('#iterVal').should('have.value', '50'); cy.expectHash('it', '50');
    cy.get('#iterVal').clear().type('999999999{enter}');        // über der Obergrenze: geklemmt
    cy.expectHash('it', '100000'); cy.get('#iterVal').should('have.value', '100.000');
    cy.get('#iterVal').clear().type('777{esc}');                // Escape verwirft das Getippte
    cy.get('#iterVal').should('have.value', '100.000'); cy.expectHash('it', '100000');
    cy.get('#iterVal').clear().type('600 Iterationen{enter}');  // Zusätze werden überlesen
    cy.expectHash('it', '600');
    cy.get('#iterVal').clear().type(' 1 200 {enter}');          // Leerzeichen gruppieren
    cy.expectHash('it', '1200');
    cy.get('#iterVal').clear().type('-30{enter}');              // negativ: an die Untergrenze
    cy.expectHash('it', '50');
    cy.visitApp(B, { lang: 'en' });                             // englisch: das Komma gruppiert, der Punkt trennt Dezimalen
    cy.get('#iterVal').clear().type('1,500{enter}');
    cy.expectHash('it', '1500'); cy.get('#iterVal').should('have.value', '1,500');
    cy.get('#iterVal').clear().type('1.500{enter}');
    cy.expectHash('it', '50');
  });

  it('Gradationskurven: Doppelklick entfernt Zwischenpunkte, nicht die Enden; kein Punkt wandert über seinen Nachbarn; jeder Kanal für sich; Zurücksetzen nur den gezeigten', () => {
    cy.visitApp(B); cy.pane('nach'); ebene(1);
    const CV = '#nachKarte1 canvas', GERADE = '0/0+1/1';
    cy.get(CV).scrollIntoView().should('be.visible');
    cy.expectHash('nb', `1:1:1::${GERADE}~${GERADE}~${GERADE}~${GERADE}`);
    ziehen(CV, 0.5, 0.5, 0.5, 0.8);                                                   // Punkt in der Mitte, nach unten gezogen: y ≈ 0,2
    cy.expectHash('nb', v => expect(v).to.match(/^1:1:1::0\/0\+0\.5\/0\.2\d*\+1\/1~/));
    ziehen(CV, 0.5, 0.8, 1, 0.8);                                                     // über den rechten Endpunkt hinaus: bleibt knapp davor
    cy.expectHash('nb', v => { const x = parseFloat(v.split('::')[1].split('~')[0].split('+')[1].split('/')[0]); expect(x, 'vor dem Nachbarn').to.be.within(0.99, 0.9961); });
    ziehen(CV, 0.996, 0.8, 0.5, 0.8);                                                 // zurück in die Mitte
    cy.expectHash('nb', v => expect(v).to.match(/^1:1:1::0\/0\+0\.5\/0\.2\d*\+1\/1~/));
    ziehen(CV, 0, 1, 0.3, 0.6);                                                       // der linke Endpunkt bleibt bei x = 0, nur y folgt
    cy.expectHash('nb', v => expect(v).to.match(/^1:1:1::0\/0\.4\d*\+0\.5\/0\.2\d*\+1\/1~/));
    zeiger(CV, 'dblclick', 0, 0.6);                                                   // Doppelklick auf den Endpunkt: bleibt
    cy.wait(200); cy.expectHash('nb', v => expect(v.split('~')[0].split('+').length, 'drei Punkte').to.eq(3));
    zeiger(CV, 'dblclick', 0.5, 0.8);                                                 // Doppelklick auf den Zwischenpunkt: weg
    cy.expectHash('nb', v => expect(v).to.match(/^1:1:1::0\/0\.4\d*\+1\/1~/));
    cy.get('#nachKarte1 .seg button').eq(2).click();                                  // Grün: eine eigene Kurve
    ziehen(CV, 0.5, 0.5, 0.5, 0.3);
    cy.expectHash('nb', v => { const k = v.split('::')[1].split('~'); expect(k[0], 'Gesamt unverändert').to.match(/^0\/0\.4\d*\+1\/1$/); expect(k[1], 'Rot unverändert').to.eq(GERADE); expect(k[2], 'Grün mit Punkt').to.match(/^0\/0\+0\.5\/0\.7\d*\+1\/1$/); });
    cy.get('#nachKarte1 .ghost.klein').click();                                       // Zurücksetzen: nur Grün
    cy.expectHash('nb', v => { const k = v.split('::')[1].split('~'); expect(k[2], 'Grün gerade').to.eq(GERADE); expect(k[0], 'Gesamt bleibt').to.match(/^0\/0\.4/); });
    cy.get('#nachKarte1 .seg button').eq(0).click(); cy.get('#nachKarte1 .ghost.klein').click();
    cy.expectHash('nb', `1:1:1::${GERADE}~${GERADE}~${GERADE}~${GERADE}`);
  });

  it('Farbkurve der Färbung „Kurve“: höchstens zwölf Punkte, Doppelklick entfernt Zwischenpunkte und lässt die Enden, Punkte bleiben geordnet, die Gerade räumt den Link', () => {
    cy.visitApp('mode=mandel&re=-0.7462586155&im=0.1111580353&z=5.6e4&it=400');
    cy.rerender(() => cy.pickOption('mapping', 28));
    cy.get('#kurveRow').should('not.have.attr', 'hidden'); cy.get('#kurveBild').scrollIntoView();
    const CV = '#kurveBild', W = 480, H = 220, R = 8;
    const fx = x => (R + x * (W - 2 * R)) / W, fy = y => (H - R - y * (H - 2 * R)) / H;   // Kurvenwerte → Bruchteile der Zeichenfläche (Rand 8 px)
    for (let k = 1; k <= 11; k++) tippen(CV, fx(k / 12), fy(0.5 + 0.02 * (k % 3)));   // elf Zwischenpunkte: der elfte ist einer zu viel
    cy.expectHash('kv', v => expect(v.split(',').length, 'zwölf Punkte, nicht mehr').to.eq(12));
    zeiger(CV, 'dblclick', fx(0), fy(0)); cy.wait(200);
    cy.expectHash('kv', v => expect(v.split(',').length, 'der Endpunkt bleibt').to.eq(12));
    zeiger(CV, 'dblclick', fx(6 / 12), fy(0.5));
    cy.expectHash('kv', v => expect(v.split(',').length, 'ein Zwischenpunkt weniger').to.eq(11));
    ziehen(CV, fx(1 / 12), fy(0.52), fx(0.5), fy(0.9));   // ein Punkt bleibt zwischen seinen Nachbarn
    cy.expectHash('kv', v => { const xs = v.split(',').map(p => parseFloat(p.split(':')[0])); for (let i = 1; i < xs.length; i++) expect(xs[i], 'steigend').to.be.greaterThan(xs[i - 1]); expect(xs[1], 'vor dem zweiten').to.be.lessThan(2 / 12 + 0.001); });
    cy.get('#kurveGerade').click(); cy.expectHash('kv', null);
  });

  it('Masken beider Sorten mit adaptiver Glättung: Ebenenmaske und Maske der Einstellungsebene wirken, Umkehren und zurück, wie frisch geladen', () => {
    const LINK = 'mode=mandel&l2=f%3D1&lm2=2:0.7:1:0:1:&lu2=m3,0,0,0.25,10,40&la=2&nb=11:1:1:1:m1,0,0,0.25,1';   // Burning Ship über Mandelbrot mit Iterationsbereich-Maske; darüber Invertieren nur außen
    const OPT = { storage: { 'fractal.aamode': 'adaptive' } };
    cy.visitApp(LINK, OPT); cy.alleEbenenFertig(); cy.gezeichnet();
    cy.get('#aaModeSel').should('have.value', 'adaptive');   // adaptiv eingestellt (das Puffer-Flag aaOn ist beim Ebenenwechsel kurz falsch, die Statuszeile nennt bei Fraktal-Ebenen keine Glättungszeit)
    cy.expectHash('lu2', v => expect(v).to.match(/^m3,0,/)); cy.expectHash('nb', '11:1:1:1:m1,0,0,0.25,1');
    cy.shotStats('mk-start').then(start => {
      cy.pane('nach');
      cy.get('#nachM1_inv').check({ force: true }); cy.expectHash('nb', '11:1:1:1:m1,1,0,0.25,1'); cy.alleEbenenFertig(); cy.gezeichnet();
      cy.shotStats('mk-nach-inv').then(inv1 => {
        diff(start, inv1).then(d => expect(d.meanDiff, 'umgekehrte Maske der Einstellungsebene: anderes Bild').to.be.greaterThan(5));
        cy.get('#nachM1_inv').uncheck({ force: true }); cy.alleEbenenFertig(); cy.gezeichnet();
        cy.shotStats('mk-nach-zurueck').then(z1 => diff(start, z1).then(d => expect(d.meanDiff, 'zurück wie zuvor').to.be.lessThan(4)));
        cy.pane('ebenen');
        cy.get('#ebM2_inv').check(); cy.expectHash('lu2', v => expect(v.split(',')[1], 'Ebenenmaske umgekehrt').to.eq('1')); cy.alleEbenenFertig(); cy.gezeichnet();
        cy.shotStats('mk-ebene-inv').then(inv2 => {
          diff(start, inv2).then(d => expect(d.meanDiff, 'umgekehrte Ebenenmaske: anderes Bild').to.be.greaterThan(5));
          cy.get('#ebM2_inv').uncheck(); cy.alleEbenenFertig(); cy.gezeichnet();
          cy.shotStats('mk-ebene-zurueck').then(z2 => diff(start, z2).then(d => expect(d.meanDiff, 'zurück wie zuvor').to.be.lessThan(4)));
          cy.visitApp(LINK, OPT); cy.alleEbenenFertig(); cy.gezeichnet();
          cy.shotStats('mk-frisch').then(frisch => diff(start, frisch).then(d => expect(d.meanDiff, 'frisch geladen dasselbe Bild').to.be.lessThan(4)));
        });
      });
    });
  });
});
