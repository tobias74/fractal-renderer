// Wegwerf-Sonde: misst, wie lange die Fassung mit Ebenen und Masken zum Übersetzen braucht, und schreibt die
// Zeit samt Schrittzahl in eine Datei. Wird nach dem Gebrauch wieder gelöscht.
describe('Sonde Übersetzungszeit', () => {
  it('misst die Dauer bis zur fertigen Fassung', () => {
    const B = 'mode=mandel&re=-0.75&im=0.1&z=1.3&it=400';
    const MASKE = B + '&nb=12:1:1:1:m1,0,0,0.25,1';   // eine Einstellungsebene mit Maske erzwingt die volle Fassung
    cy.visitApp(MASKE, { wait: false });
    const t0 = Date.now();
    cy.get('#state', { timeout: 600000 }).should($s => {
      const t = $s.text();
      expect(t, 'Statuszeile').to.match(/Fertig|Done/);
      expect(t, 'Statuszeile').not.to.match(/übersetzt|Compiling/);
    });
    cy.then(() => {
      const dauer = Date.now() - t0;
      cy.window().then(win => {
        cy.writeFile('cypress/uebersetzen-dauer.json', {
          sekunden: Math.round(dauer / 100) / 10,
          schritte: (win.fractalState && win.fractalState.get && 'unbekannt') || 'unbekannt',
        });
      });
    });
  });
});
