// Handy: alles, was nur die schmale Ansicht betrifft – das Blatt statt der Schublade, die Reiterleiste, Flächen für Finger,
// Dialoge über dem Menüknopf und die Frage, ob in schmaler Breite etwas über den Rand steht. Was die Bereiche inhaltlich tun,
// prüfen die Specs am PC; hier zählt nur, was das Telefon daran ändert.
// Anderswo bereits abgedeckt: Seitenleiste am Handy (08), Einwilligung am kleinen Schirm (00), Speichern-Dialog schmal (14).

// Ein Zustand mit Textur samt Maske und zwei Ebenen samt Maske: so sind alle Karten vollständig gebaut.
const VOLL = 'mode=mandel&re=-0.9&im=0.6&z=1&it=400&map=19&tx=1&ts=0.4&tu=m3,1,0,0.25,0,20&nb=16:1:1:0.5,0;11:1:1:1:m13,0,0,0.25,0,0,0.35';
const BEREICHE = [['motiv', 'tabMotiv'], ['farbe', 'tabFarbe'], ['texturen', 'tabTexturen'], ['palette', 'tabPalette'], ['qualitaet', 'tabQualitaet'], ['ebenen', 'tabEbenen'], ['nach', 'tabNach'], ['technik', 'tabMehr']];

// Alles, was rechts über den Bildschirm hinausragt. Waagerecht rollende Streifen (Chips, Farbfelder) zählen nicht mit.
function ueberstand(pane, breite) {
  const win = pane.ownerDocument.defaultView;
  const rollt = el => {
    for (let p = el.parentElement; p && p !== pane; p = p.parentElement) {
      const o = win.getComputedStyle(p).overflowX;
      if (o === 'auto' || o === 'scroll') return true;
    }
    return false;
  };
  return [...pane.querySelectorAll('*')]
    .filter(el => el.offsetParent && !rollt(el))
    .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > breite + 1; })
    .map(el => (el.id || el.className || el.tagName) + ' bis ' + Math.round(el.getBoundingClientRect().right));
}

describe('Bedienfeld am Handy', () => {
  beforeEach(() => {
    cy.viewport(375, 812);
    cy.visitApp();
  });

  it('zeigt das ganze Bild, oben die Leiste mit Menü und Status, unten die Reiter', () => {
    cy.get('#panel').should('have.class', 'collapsed').and('not.be.visible');
    for (const id of ['#rail', '#toolbar', '#siteBar']) cy.get(id).should('not.be.visible');
    cy.get('#burger').should('be.visible');
    cy.get('#mStatus').should('be.visible').and('contain.text', 'Zoom');
    cy.get('#tabbar').should('be.visible').then($t => {
      const r = $t[0].getBoundingClientRect();
      expect(r.bottom, 'unten bündig').to.be.closeTo(812, 1);
      expect(r.width).to.eq(375);
    });
    cy.get('#tabbar button:visible').should('have.length', 8);   // Motiv, Farbe, Texturen, Palette, Qualität, Mischen, Effekte, Mehr (Speichern sitzt in der Kopfzeile)
    cy.get('#mStatus').click();
    cy.get('#mInfo').should('be.visible').and('contain.text', 'Tiefe');
  });

  it('ein Reiter öffnet ein halbhohes Blatt mit genau diesem Bereich, derselbe Reiter schließt es', () => {
    cy.get('#tabFarbe').click();
    cy.get('#panel').should('not.have.class', 'collapsed');
    cy.get('#tabFarbe').should('have.class', 'on');
    cy.get('.panel-head .wordmark').should('have.text', 'Farbe');
    cy.get('#pane-farbe').should('not.have.attr', 'hidden');
    cy.get('#pane-farbe .row').first().should('be.visible');   // der Bereich rollt im Blatt, sein Anfang ist zu sehen
    cy.get('#pane-motiv').should('not.be.visible');
    cy.wait(400);   // Übergang abwarten
    cy.get('#panel').then($p => {
      const r = $p[0].getBoundingClientRect();
      expect(r.height, 'halbhoch').to.be.at.most(812 * 0.53);
      expect(r.bottom, 'sitzt auf den Reitern').to.be.closeTo(812 - 58, 2);
    });
    cy.get('#tabMehr').click();
    cy.get('.panel-head .wordmark').should('have.text', 'Mehr');
    cy.get('#mActions').should('be.visible');
    cy.get('#mActions [data-act="undo"]').should('be.visible').and('be.disabled');   // Rückgängig und Wiederholen auch am Handy
    cy.get('#mActions [data-act="redo"]').should('be.visible').and('be.disabled');
    cy.get('#mActions [data-act="reset"]').should('be.visible').then($b => {   // eigene Zeile über die volle Breite
      const raster = $b[0].parentElement.getBoundingClientRect();
      expect($b[0].getBoundingClientRect().width, 'Alles zurücksetzen steht allein in seiner Zeile').to.be.greaterThan(raster.width * 0.9);
    });
    cy.get('#tabMehr').click();
    cy.get('#panel').should('have.class', 'collapsed');
    cy.get('#tabbar button.on').should('not.exist');
  });

  it('Chips und Farbfelder wählen dasselbe wie die Auswahlfelder', () => {
    cy.get('#tabMotiv').click();
    cy.get('#famChips button').should('have.length', 8);
    cy.get('#famChips button[data-value="julia"]').click();
    cy.get('#family').should('have.value', 'julia');
    cy.get('#famChips button.on').should('have.attr', 'data-value', 'julia');
    cy.get('#tabPalette').click();   // die Farbfelder wohnen im Bereich „Palette“
    cy.get('#palStrip button').should('have.length', 187);   // 187 Vorgaben, darunter Salbei und Salbei, gedeckt, und die hundertsechsundsechzig vom 25.09.2026
    cy.get('#palStrip button[data-value="7"]').click();
    cy.get('#palette').should('have.value', '7');
    cy.expectHash('pal', null);   // Werte statt Namen
  });

  it('Speichern öffnet den Dialog, Mehr führt die Aktionen der Werkzeugleiste aus', () => {
    cy.get('#tabSave').click();
    cy.get('#poster').should('be.visible');
    cy.get('#posterCancel').click();
    cy.get('#tabMehr').click();
    cy.get('#mActions [data-act="linkOpen"]').click();
    cy.get('#panel').should('have.class', 'collapsed');
    cy.get('#linkDlg').should('be.visible');
  });

  it('beim Ziehen eines Reglers bleibt nur dieser stehen', () => {
    cy.get('#tabPalette').click();   // Dichte und Versatz stehen im Bereich „Palette“
    cy.get('#density').trigger('pointerdown', { clientX: 100, clientY: 400 }).invoke('val', 600).trigger('input');   // nur angetippt: das Blatt bleibt stehen (20.09.2026: kein Flackern beim Berühren oder senkrechten Wischen)
    cy.get('body').should('not.have.class', 'regler-aktiv');
    cy.get('#density').trigger('pointermove', { clientX: 104, clientY: 440 });   // senkrecht: ein Scrollen, kein Ziehen
    cy.get('body').should('not.have.class', 'regler-aktiv');
    cy.get('#density').trigger('pointermove', { clientX: 130, clientY: 402 }).invoke('val', 650).trigger('input');   // waagerecht gezogen: jetzt tritt das Blatt zurück
    cy.get('body').should('have.class', 'regler-aktiv');
    cy.get('#density').should('have.css', 'visibility', 'visible');
    cy.get('#offset').should('have.css', 'visibility', 'hidden');   // der Nachbar im selben Bereich verschwindet
    cy.get('#glowWidth').should('have.css', 'visibility', 'hidden');
    cy.window().trigger('pointerup');
    cy.get('body').should('not.have.class', 'regler-aktiv');
  });
});

describe('Handy: nichts steht über den Rand', () => {
  for (const [breite, hoehe] of [[375, 812], [320, 640]]) {
    it(`bei ${breite} px bleibt jeder Bereich im Bild`, () => {
      cy.viewport(breite, hoehe);
      cy.visitApp(VOLL);
      for (const [name, tab] of BEREICHE) {
        cy.get('#' + tab).click();
        cy.get('#pane-' + name).should('not.have.attr', 'hidden');
        cy.get('#pane-' + name).then($p => expect(ueberstand($p[0], breite), 'Bereich ' + name).to.deep.eq([]));
      }
      cy.document().its('documentElement.scrollWidth').should('eq', breite);   // die Seite selbst rollt nie zur Seite
    });
  }
});

describe('Handy: Flächen für Finger', () => {
  beforeEach(() => {
    cy.viewport(375, 812);
    cy.visitApp(VOLL);
  });

  it('Knöpfe im Kopf einer Karte und der Schalter sind groß genug, Häkchen bleiben quadratisch', () => {
    cy.get('#tabNach').click();
    cy.get('#nachKarte1 .tex-kopf button').should('have.length.greaterThan', 1).each($b => {
      const r = $b[0].getBoundingClientRect();
      expect(Math.min(r.width, r.height), 'Knopf ' + ($b[0].className || $b[0].id)).to.be.at.least(30);
    });
    cy.get('#nachKarte1 .tex-schalter input').then($s => {
      const r = $s[0].getBoundingClientRect();
      expect(r.height, 'Fläche des Schalters').to.be.at.least(32);
    });
    cy.get('#nachKarte2 .nach-maske .chk input').should('have.length.greaterThan', 0).then($cs => {
      const boxen = [...$cs].map(el => el.getBoundingClientRect()).filter(r => r.width > 0);   // im Blatt gerollte zählen mit
      expect(boxen.length, 'Häkchen der Maske').to.be.greaterThan(0);
      for (const r of boxen) {
        expect(r.width, 'Häkchen bleibt quadratisch').to.be.closeTo(r.height, 1.5);
        expect(r.width, 'Häkchen groß genug').to.be.at.least(18);
      }
    });
  });
});

describe('Handy: Dialoge liegen über dem Menüknopf', () => {
  it('die Überschrift des Speichern-Dialogs bleibt frei', () => {
    cy.viewport(375, 812);
    cy.visitApp();
    cy.get('#tabSave').click();
    cy.get('#poster').should('be.visible');
    cy.window().then(win => {
      const z = id => parseInt(win.getComputedStyle(win.document.getElementById(id)).zIndex, 10);
      expect(z('poster'), 'Dialog über dem Menüknopf').to.be.greaterThan(z('burger'));
      const r = win.document.getElementById('posterTitle').getBoundingClientRect();
      const oben = win.document.elementFromPoint(Math.round(r.left + 4), Math.round(r.top + 8));
      expect(oben.id, 'nichts liegt über der Überschrift').to.eq('posterTitle');
    });
    cy.get('#posterCancel').click();
  });
});

describe('Handy: das Blatt ziehen', () => {
  it('Tippen auf den Kopf zieht es ganz auf, Ziehen nach unten wieder halbhoch und dann zu', () => {
    cy.viewport(375, 812);
    cy.visitApp();
    cy.get('#tabMotiv').click();
    cy.wait(400);
    cy.get('.panel-head').click(60, 20);
    cy.get('#panel').should('have.class', 'expanded').then($p => {
      expect($p[0].getBoundingClientRect().height, 'fast die ganze Höhe').to.be.greaterThan(812 * 0.6);
    });
    const ziehen = () => cy.get('.panel-head')
      .trigger('pointerdown', { pointerId: 1, clientX: 60, clientY: 300, eventConstructor: 'PointerEvent' })
      .trigger('pointermove', { pointerId: 1, clientX: 60, clientY: 420, eventConstructor: 'PointerEvent' })
      .trigger('pointerup', { pointerId: 1, clientX: 60, clientY: 420, eventConstructor: 'PointerEvent' });
    ziehen();
    cy.get('#panel').should('not.have.class', 'expanded').and('not.have.class', 'collapsed');   // erst halbhoch
    ziehen();
    cy.get('#panel').should('have.class', 'collapsed');                                        // dann zu
  });
});

describe('Handy: Rückgängig im Blatt „Mehr“', () => {
  it('nimmt den Schritt zurück und lässt das Blatt offen', () => {
    cy.viewport(375, 812);
    cy.visitApp();
    cy.get('#tabPalette').click();
    cy.rerender(() => cy.get('#palStrip button[data-value="7"]').click());
    cy.get('#palette').should('have.value', '7');
    cy.get('#tabMehr').click();
    cy.get('#mActions [data-act="undo"]').should('not.be.disabled');
    cy.rerender(() => cy.get('#mActions [data-act="undo"]').click());
    cy.get('#palette').should('have.value', '0');
    cy.get('#panel').should('not.have.class', 'collapsed');   // mehrere Schritte hintereinander ohne erneutes Öffnen
    cy.get('#mActions').should('be.visible');
    cy.get('#mActions [data-act="redo"]').should('not.be.disabled');
    cy.rerender(() => cy.get('#mActions [data-act="redo"]').click());
    cy.get('#palette').should('have.value', '7');
  });
});

describe('Handy im Querformat', () => {
  it('schaltet auf das Bedienfeld am Rand und bleibt im Bild', () => {
    cy.viewport(812, 375);
    cy.visitApp(VOLL);
    cy.get('#rail').should('be.visible');
    cy.get('#tabbar').should('not.be.visible');
    cy.get('#panel').should('not.have.class', 'collapsed').then($p => {
      const r = $p[0].getBoundingClientRect();
      expect(r.right, 'schließt an die Bereichsleiste an').to.be.closeTo(812 - 46, 1);
      expect(r.height, 'volle Höhe').to.be.closeTo(375, 1);
    });
    cy.get('#rail button[data-pane="nach"]').click();
    cy.get('#pane-nach').should('not.have.attr', 'hidden');   // eigene Zeile: „not.have.attr“ gibt den Wert weiter, nicht das Element
    cy.get('#pane-nach').then($p => expect(ueberstand($p[0], 812), 'Bereich nach').to.deep.eq([]));
    cy.get('#state').invoke('text').should('match', /Fertig/);
  });
  // Der Zustand steht am Handy im Statusknopf. Solange etwas läuft, muss er ganz lesbar sein: genau dann will man
  // wissen, warum das Bild noch nicht da ist. Vorher war er nach gut zwanzig Zeichen abgeschnitten.
  it('der Statusknopf zeigt einen langen Zustand vollständig, solange etwas läuft', () => {
    cy.viewport(375, 812);
    cy.visitApp('mode=mandel'); cy.waitRender();
    cy.window().then(win => {
      const kurz = win.document.getElementById('mKurz'), knopf = win.document.getElementById('mStatus');
      kurz.textContent = 'Ebenen und Masken werden übersetzt … Schritt 1 von 4 · 85 s';
      knopf.classList.add('busy');
    });
    cy.get('#mKurz').should($k => {
      const el = $k[0];
      expect(el.scrollWidth, 'nichts steht seitlich über').to.be.at.most(el.clientWidth + 1);
      expect(el.scrollHeight, 'und nichts unten').to.be.at.most(el.clientHeight + 1);
    });
    cy.get('#mStatus').then($b => expect($b[0].getBoundingClientRect().right, 'der Knopf bleibt im Bild').to.be.at.most(375));
    cy.get('.appbar-title').should('not.be.visible');   // der Titel weicht, solange gerechnet wird
  });
});
