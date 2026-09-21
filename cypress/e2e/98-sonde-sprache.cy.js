// Wegwerf-Sonde: sammelt dieselbe Bestandsaufnahme wie Spec 09 einmal nach dem Umschalten der Sprache und einmal
// nach frischem Laden und schreibt den Unterschied in eine Datei. Wird nach dem Gebrauch wieder gelöscht.
describe('Sonde Sprache', () => {
  const inventar = () => cy.window().then(win => {
    const norm = s => s.replace(/\s+/g, ' ').trim().replace(/[0-9]/g, '#');
    const out = [], w = win.document.createTreeWalker(win.document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const p = n.parentElement; if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName)) continue;
      const v = norm(n.nodeValue); if (v) out.push(v);
    }
    for (const el of win.document.body.querySelectorAll('[aria-label],[placeholder],[title],optgroup[label]'))
      for (const a of ['aria-label', 'placeholder', 'title', 'label']) if (el.hasAttribute(a)) out.push('@' + a + ': ' + norm(el.getAttribute(a)));
    return out;
  });

  it('nennt den Unterschied', () => {
    cy.visitApp('mode=mandel', { lang: 'de' });
    cy.get('#langSel').should('exist');
    cy.pickOption('langSel', 'en');
    cy.waitRender(/Done/);
    inventar().then(umgeschaltet => {
      cy.visitApp('mode=mandel', { lang: 'en' });
      cy.waitRender(/Done/);
      inventar().then(frisch => {
        const zaehl = x => { const k = new Map(); for (const v of x) k.set(v, (k.get(v) || 0) + 1); return k; };
        const a = zaehl(umgeschaltet), b = zaehl(frisch), unterschied = [];
        for (const [k, v] of a) if ((b.get(k) || 0) !== v) unterschied.push({ text: k.slice(0, 120), umgeschaltet: v, frisch: b.get(k) || 0 });
        for (const [k, v] of b) if ((a.get(k) || 0) !== v) unterschied.push({ text: k.slice(0, 120), umgeschaltet: a.get(k) || 0, frisch: v });
        cy.writeFile('cypress/sprache-unterschied.json', { anzahlUmgeschaltet: umgeschaltet.length, anzahlFrisch: frisch.length, unterschied });
      });
    });
  });
});
