// Wird vor jeder Spezifikation geladen: eigene Befehle und globale Einstellungen.
import './commands';

// Die App darf keine unbehandelten Fehler werfen; Cypress lässt den Test dann scheitern (Standardverhalten).
// Einzige Ausnahme: ResizeObserver-Rauschen einiger Browser, das nichts mit der App zu tun hat.
Cypress.on('uncaught:exception', err => {
  if (/ResizeObserver loop/.test(err.message)) return false;
  return true;
});
