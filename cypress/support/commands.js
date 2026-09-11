// Eigene Cypress-Befehle für die Fraktal-Renderer.
//
// cy.visitApp(hash, opts)   Seite mit vorbereitetem localStorage laden (Einwilligung, Sprache, Glättung) und auf das erste Bild warten
// cy.waitRender(re, ms)      warten, bis die Statuszeile zum Muster passt (Standard: fertig gerendert)
// cy.rerender(fn)            Aktion ausführen, die ein neues Bild auslöst, und auf dessen Fertigstellung warten
// cy.pickOption(id, value)   Wert eines (durch das eigene Menü ersetzten) Selects wählen
// cy.setRange(id, value)     Schieberegler setzen
// cy.hashParams()            URLSearchParams aus dem Adress-Hash
// cy.appState()              window.fractalState.get()
// cy.shotStats(name, region) Screenshot des Fensters und Helligkeits-Statistik eines Bereichs (Anteile 0..1)

export const CONSENT_ALL = { v: 2, ts: 1, settings: true, marketing: false };
export const CONSENT_NONE = { v: 2, ts: 1, settings: false, marketing: false };
export const IMAGE_REGION = { x0: 0.02, y0: 0.08, x1: 0.68, y1: 0.9 };   // Bildbereich links vom Bedienfeld (das liegt rechts)
export const DEEP_HASH = 'mode=mandel&re=-0.74472521916368515527240903324426&im=0.09610344114300482870465549243537&z=1.3509e20';
// Standardmitte der Mandelbrot-Ansicht: −0,75 plus halbe Bedienfeldbreite (356 px) in Ebenen-Einheiten bei Zoom 1
export const DEFAULT_RE = -0.75 + (356 / 2) * 3 / Math.min(1280, 720);
let visitCounter = 0;

Cypress.Commands.add('visitApp', (hash = '', opts = {}) => {
  const { consent = CONSENT_ALL, lang = 'de', aa = '1', storage = {}, keep = false, wait = true, onBeforeLoad } = opts;
  const h = hash ? (hash.startsWith('#') ? hash : '#' + hash) : '';
  // Eine eindeutige Abfrage erzwingt das Neuladen: unterscheidet sich nur der Hash, würde Cypress die Seite sonst
  // nicht neu laden (Browserverhalten), und die App liest die Adresse nur beim Start.
  visitCounter++;
  cy.visit('/?t=' + visitCounter + h, {
    onBeforeLoad(win) {
      if (!keep) win.localStorage.clear();
      if (consent) win.localStorage.setItem('fractal.consent', JSON.stringify(consent));
      if (lang) win.localStorage.setItem('fractal.lang', lang);
      if (aa) win.localStorage.setItem('fractal.aa', String(aa));
      for (const [k, v] of Object.entries(storage)) win.localStorage.setItem(k, v);
      if (onBeforeLoad) onBeforeLoad(win);
    },
  });
  cy.get('#fatal').should('not.be.visible');
  if (wait) cy.waitRender();
});

Cypress.Commands.add('waitRender', (re = /Fertig|Done/, timeout = 60000) => {
  // Prüffunktion statt .invoke('text'): so gilt der lange Timeout für die ganze Kette
  cy.get('#state', { timeout }).should($s => expect($s.text(), 'Statuszeile').to.match(re));
});

Cypress.Commands.add('rerender', (action, re) => {
  action();
  cy.wait(250);   // der neue Durchlauf beginnt im nächsten Frame
  cy.waitRender(re);
});

// Ein Bedienelement sichtbar machen: den Bereich der Leiste wählen und den Technik-Abschnitt aufklappen
Cypress.Commands.add('revealInDetails', (id) => {
  cy.get('#' + id, { log: false }).then($el => {
    const pane = $el.closest('.pane');
    if (pane.length && pane.attr('hidden') !== undefined) {
      const name = pane.attr('id').replace('pane-', '');
      cy.get('#rail button[data-pane="' + name + '"]', { log: false }).click();
    }
    const d = $el.closest('details');
    if (d.length && !d.prop('open')) d.prop('open', true);
  });
});

Cypress.Commands.add('pickOption', (id, value) => {
  const val = String(value);
  cy.revealInDetails(id);
  cy.get('#' + id).then($sel => {
    if ($sel.attr('data-enhanced') === '1') {
      cy.get(`#${id} + .menu-btn`).scrollIntoView().click();
      cy.get(`#${id}Menu`).should('be.visible').find(`button[data-value="${val}"]`).click();
      cy.get(`#${id}Menu`).should('not.be.visible');
    } else {
      cy.get('#' + id).select(val, { force: true });
    }
  });
  cy.get('#' + id).should('have.value', val);
});

// Abschnitte des Bedienfelds liegen oft unterhalb des sichtbaren Bereichs der Schublade; Cypress hält sie dann für
// unsichtbar. Ob die App einen Abschnitt zeigt, entscheidet allein das hidden-Attribut.
Cypress.Commands.add('rowShown', (id, shown = true) => {
  cy.get('#' + id).should(shown ? 'not.have.attr' : 'have.attr', 'hidden');
});

// Bereich der Bedienleiste wählen (Motiv, Farbe, Qualität); am Handy stehen alle untereinander
Cypress.Commands.add('pane', (name) => {
  cy.get('#rail button[data-pane="' + name + '"]').click();
  cy.get('#pane-' + name).should('not.have.attr', 'hidden');
});

Cypress.Commands.add('setRange', (id, value) => {
  cy.revealInDetails(id);
  cy.get('#' + id).scrollIntoView().invoke('val', String(value)).trigger('input').trigger('change');
});

Cypress.Commands.add('hashParams', () => cy.location('hash').then(h => new URLSearchParams(h.replace(/^#/, ''))));

// Adressparameter prüfen; wiederholt, weil die App die Adresse gebündelt (400 ms) nachzieht.
// `expected`: Zeichenkette, null (Parameter fehlt) oder eine Prüffunktion, die den Wert erhält.
Cypress.Commands.add('expectHash', (name, expected) => {
  cy.location('hash', { timeout: 6000 }).should(h => {
    const v = new URLSearchParams(h.replace(/^#/, '')).get(name);
    if (typeof expected === 'function') expected(v);
    else expect(v, 'Adressparameter ' + name).to.eq(expected);
  });
});

Cypress.Commands.add('appState', () => cy.window().then(win => win.fractalState.get()));

Cypress.Commands.add('shotStats', (name, region = IMAGE_REGION) => {
  let file = null;
  cy.screenshot(name, { capture: 'viewport', overwrite: true, onAfterScreenshot: (_el, props) => { file = props.path; } });
  return cy.then(() => cy.task('pngStats', { file, region }).then(stats => ({ ...stats, file })));
});
