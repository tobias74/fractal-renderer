import { CONSENT_NONE } from '../support/commands';

describe('Cookie-Einwilligung', () => {
  it('erscheint beim ersten Besuch als blockierender Dialog mit abgewählten Kategorien', () => {
    cy.visitApp('', { consent: null, wait: false });
    cy.get('#consent').should('be.visible').and('have.attr', 'aria-modal', 'true').and('have.attr', 'role', 'dialog');
    cy.get('#consentTitle').should('have.text', 'Cookie-Einstellungen');
    cy.get('#consentSettingsCb').should('not.be.checked');
    cy.get('#consentMarketing').should('not.be.checked');
    cy.get('#consentCancel, #consentRejectAll, #consentSave, #consentAll').should('have.length', 4).and('be.visible');
    cy.get('#consentPrivacy').should('be.visible');
    cy.window().then(win => {
      const el = win.document.elementFromPoint(640, 400);
      expect(el && el.closest('#consent'), 'Dialog deckt die Seite ab').to.not.be.null;
    });
    cy.window().then(win => expect(win.localStorage.getItem('fractal.consent'), 'noch nichts gespeichert').to.be.null);
  });

  it('lässt sich am niedrigen Schirm scrollen, bis der Knopf zum Zustimmen im Bild steht', () => {
    // Am Handy ist die Karte höher als das Bild. Ohne eigenen Rollbereich ragte sie oben und unten heraus,
    // und „Alle akzeptieren“ blieb unerreichbar.
    cy.viewport(375, 560);
    cy.visitApp('', { consent: null, wait: false });
    cy.get('#consent').should('be.visible').then($m => {
      expect($m[0].scrollHeight, 'Karte höher als das Bild').to.be.greaterThan($m[0].clientHeight);
    });
    cy.get('#consent').scrollTo('bottom');
    cy.get('#consentAll').should($b => {
      const r = $b[0].getBoundingClientRect();
      expect(r.top, 'Knopf nicht über dem Bildrand').to.be.at.least(0);
      expect(r.bottom, 'Knopf nicht unter dem Bildrand').to.be.at.most(560);
    });
    cy.get('#consent').scrollTo('top');
    cy.get('#consentTitle').should($h => expect($h[0].getBoundingClientRect().top, 'Überschrift erreichbar').to.be.at.least(0));
    cy.get('#consentAll').click();
    cy.get('#consent').should('not.be.visible');
    cy.window().then(win => expect(JSON.parse(win.localStorage.getItem('fractal.consent'))).to.include({ settings: true, marketing: true }));
  });

  it('„Alle ablehnen“ speichert nur die Auswahl selbst; App-Einstellungen bleiben flüchtig', () => {
    cy.visitApp('', { consent: null, wait: false });
    cy.get('#consentRejectAll').click();
    cy.get('#consent').should('not.be.visible');
    cy.window().then(win => {
      const c = JSON.parse(win.localStorage.getItem('fractal.consent'));
      expect(c).to.include({ v: 2, settings: false, marketing: false });
      expect(new Date(c.ts).getTime(), 'Zeitstempel').to.be.greaterThan(0);
      expect(win.fractalConsent.get()).to.include({ settings: false, marketing: false });
    });
    cy.waitRender();
    cy.pickOption('aaSel', 2);
    cy.get('#aaVal').should('contain.text', '4 Proben je Pixel');
    cy.pickOption('cycleSel', '0');
    cy.window().then(win => {
      expect(win.localStorage.getItem('fractal.aa'), 'Glättung nicht gespeichert').to.be.null;
      expect(win.localStorage.getItem('fractal.cycle'), 'Zykluserkennung nicht gespeichert').to.be.null;
    });
  });

  it('„Auswahl speichern“ mit App-Einstellungen: Einstellungen werden gespeichert', () => {
    cy.visitApp('', { consent: null, wait: false });
    cy.get('#consentSettingsCb').check();
    cy.get('#consentSave').click();
    cy.get('#consent').should('not.be.visible');
    cy.window().then(win => expect(win.fractalConsent.get()).to.include({ settings: true, marketing: false }));
    cy.waitRender();
    cy.pickOption('aaSel', 2);
    cy.window().then(win => expect(win.localStorage.getItem('fractal.aa')).to.eq('2'));
    cy.pickOption('cycleSel', '0');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.cycle')).to.eq('0'));
    cy.visitApp('', { keep: true, consent: null, lang: null, aa: null });
    cy.get('#aaSel').should('have.value', '2');
    cy.get('#cycleSel').should('have.value', '0');
  });

  it('ohne Einwilligung liest die App gespeicherte Einstellungen gar nicht erst', () => {
    // etwa Reste aus einer älteren Fassung: sie liegen noch im Browser, gelten aber nicht
    const alt = JSON.stringify([{ name: 'Altes Schema', cyclic: true, stops: [{ p: 0, c: '#ff0000' }] }]);
    cy.visitApp('', { consent: CONSENT_NONE, storage: { 'fractal.cycle': '0', 'fractal.palettes': alt } });
    cy.get('#cycleSel').should('have.value', 'auto');
    cy.get('#palette optgroup[label="Eigene"]').should('not.exist');
  });

  it('„Alle akzeptieren“ setzt beide Kategorien', () => {
    cy.visitApp('', { consent: null, wait: false });
    cy.get('#consentAll').click();
    cy.get('#consent').should('not.be.visible');
    cy.window().then(win => expect(win.fractalConsent.get()).to.include({ settings: true, marketing: true }));
  });

  it('beim ersten Besuch gibt es kein „Abbrechen“: ohne Wahl geht es nicht weiter', () => {
    cy.visitApp('', { consent: null, wait: false });
    cy.get('#consentCancel').should('not.be.visible');
    cy.get('body').type('{esc}');
    cy.get('#consent').should('be.visible');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.consent')).to.be.null);
  });

  it('lässt sich aus Leiste, Seitenleiste und Unterseite erneut öffnen und zeigt die gespeicherte Wahl', () => {
    cy.visitApp('', { consent: { v: 2, ts: 1, settings: true, marketing: false } });
    cy.get('#consent').should('not.be.visible');
    cy.get('#siteCookies').click();
    cy.get('#consent').should('be.visible');
    cy.get('#consentSettingsCb').should('be.checked');
    cy.get('#consentMarketing').should('not.be.checked');
    cy.get('#consentCancel').should('be.visible').click();
    cy.get('#consent').should('not.be.visible');
    cy.get('#burger').click();
    cy.get('#drawerCookies').click();
    cy.get('#consent').should('be.visible');
    cy.get('#consentCancel').click();
    cy.get('#siteBar button[data-legal="impressum"]').click();
    cy.get('#pageCookies').click();
    cy.get('#consent').should('be.visible');
    cy.get('#page').should('not.have.attr', 'hidden');   // die Unterseite bleibt offen (der Dialog deckt sie ab, daher kein be.visible)
    cy.get('#consentMarketing').check();
    cy.get('#consentSave').click();
    cy.window().then(win => expect(win.fractalConsent.get().marketing).to.be.true);
  });

  it('Widerruf der App-Einstellungen löscht die gespeicherten Einstellungen', () => {
    cy.visitApp('', { storage: { 'fractal.aa': '3', 'fractal.cycle': '0', 'fractal.palettes': '[]', 'fractal.palettes2': '[]' } });
    cy.get('#siteCookies').click();
    cy.get('#consentSettingsCb').uncheck();
    cy.get('#consentSave').click();
    cy.window().then(win => {
      expect(win.fractalConsent.get().settings).to.be.false;
      for (const k of ['fractal.aa', 'fractal.cycle', 'fractal.palettes', 'fractal.palettes2']) expect(win.localStorage.getItem(k), k + ' gelöscht').to.be.null;
      expect(win.localStorage.getItem('fractal.consent'), 'Auswahl selbst bleibt').to.not.be.null;
      expect(win.localStorage.getItem('fractal.lang'), 'Sprache ist notwendig und bleibt').to.eq('de');
    });
  });

  // Was nicht gespeichert werden kann, soll auch keinen Knopf zum Speichern haben: Ohne Einwilligung verschwinden die
  // Speichern-Knöpfe beider Farbeditoren, an ihrer Stelle steht der Grund. Stimmt man bei offenem Editor zu, sind sie da.
  it('ohne Einwilligung gibt es in den Farbeditoren kein Speichern, mit Einwilligung sofort wieder', () => {
    cy.visitApp('', { consent: CONSENT_NONE });
    cy.revealInDetails('palEdit');
    cy.get('#palEdit').click();
    cy.get('#peName').clear().type('Nur heute');
    cy.get('#peSaveRow').should('have.attr', 'hidden');
    cy.get('#peNoStore').should('be.visible').and('contain.text', 'Kein Speichern');
    cy.get('#palette option:selected').invoke('text').should('contain', 'Nur heute');   // im Bild gilt es trotzdem
    cy.window().then(win => {
      expect(win.localStorage.getItem('fractal.palettes'), 'nichts abgelegt').to.be.null;
      expect(win.localStorage.getItem('fractal.palettes2'), 'auch keine zweidimensionalen').to.be.null;
    });
    cy.get('#siteCookies').click();                                          // bei offenem Editor zustimmen
    cy.get('#consentSettingsCb').check();
    cy.get('#consentSave').click();
    cy.get('#peSaveRow').should('not.have.attr', 'hidden');
    cy.get('#peNoStore').should('not.be.visible');
    cy.get('#peSave').click();
    cy.get('#peState').should('have.text', 'gespeichert');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.palettes'), 'jetzt abgelegt').to.not.be.null);
  });

  it('ohne Einwilligung landet außer der Auswahl selbst und der Sprache nichts im Browser', () => {
    cy.visitApp('', { consent: CONSENT_NONE, aa: null });
    cy.pane('qualitaet');
    cy.pickOption('aaModeSel', 'fast');                    // Verfahren, getippter Wert, Auflösung, Renderer, Zyklus
    cy.get('#aaTolVal').clear().type('2,5{enter}');
    cy.get('#aaTolVal').should('have.value', '2,5 %');
    cy.pickOption('quality', '0.5');
    cy.get('#palFilter').check({ force: true });
    cy.pane('technik');
    cy.pickOption('cycleSel', '0');
    cy.pickOption('blaSel', '0');
    cy.window().then(win => {
      const fremd = Object.keys(win.localStorage).filter(k => k.startsWith('fractal.') && k !== 'fractal.consent' && k !== 'fractal.lang');
      expect(fremd, 'nichts abgelegt außer Auswahl und Sprache').to.deep.eq([]);
    });
    cy.get('#aaModeSel').should('have.value', 'fast');     // in dieser Sitzung gilt alles ganz normal
    cy.get('#cycleSel').should('have.value', '0');
  });

  it('wird die Einwilligung später erteilt, wandern die bis dahin gewählten Einstellungen in den Browser', () => {
    cy.visitApp('', { consent: CONSENT_NONE, aa: null });
    cy.pane('technik');
    cy.pickOption('cycleSel', '0');
    cy.window().then(win => expect(win.localStorage.getItem('fractal.cycle'), 'noch nichts abgelegt').to.be.null);
    cy.get('#siteCookies').click();
    cy.get('#consentSettingsCb').check();
    cy.get('#consentSave').click();
    cy.get('#consent').should('not.be.visible');
    cy.window().then(win => {
      expect(win.localStorage.getItem('fractal.cycle'), 'die laufende Wahl wird nachgetragen').to.eq('0');
      expect(win.localStorage.getItem('fractal.aamode'), 'und der Rest der Technik auch').to.not.be.null;
    });
    cy.visitApp('', { keep: true, consent: null, lang: null, aa: null });
    cy.get('#cycleSel').should('have.value', '0');
  });

  it('ältere Einwilligungen (v1) gelten nicht mehr und werden neu abgefragt', () => {
    cy.visitApp('', { consent: { v: 1, marketing: true }, wait: false });
    cy.get('#consent').should('be.visible');
    cy.get('#consentMarketing').should('not.be.checked');
  });
});
