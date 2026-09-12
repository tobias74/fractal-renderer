// Cypress-Konfiguration für die End-to-End-Tests des Fraktal-Renderers.
// Start: `npm run test:e2e` (startet den lokalen Server auf Port 8765 und führt alle Tests aus)
// oder `npm run cy:open` bei laufendem Server (`npm run serve`).
const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');
const { pngStats, pngDiff } = require('./cypress/support/png.js');
const { pruefeI18n } = require('./tools/i18n-pruefen.js');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8765',
    viewportWidth: 1280,
    viewportHeight: 720,   // entspricht dem Electron-Fenster, damit Screenshots nicht skaliert werden
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    retries: { runMode: 1, openMode: 0 },
    downloadsFolder: 'cypress/downloads',
    trashAssetsBeforeRuns: true,
    experimentalMemoryManagement: true,
    setupNodeEvents(on, config) {
      // WebGPU im Chrome-Browser freischalten (Electron nutzt sonst WebGL 2, was die App ebenfalls kann)
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push('--enable-unsafe-webgpu', '--ignore-gpu-blocklist');
          if (process.platform === 'win32') launchOptions.args.push('--use-angle=d3d11');
        }
        return launchOptions;
      });
      on('task', {
        // Übersetzung ohne Browser prüfen: Marken, Schlüssel, tote Einträge, Platzhalter (tools/i18n-pruefen.js)
        i18nPruefen() { return pruefeI18n(); },
        // Helligkeits-Statistik eines Bildbereichs (Anteile 0..1 der Bildbreite/-höhe) eines Screenshots
        pngStats({ file, region }) { return pngStats(fs.readFileSync(file), region); },
        // Mittlere Abweichung zweier Screenshots im Bereich
        pngDiff({ a, b, region }) { return pngDiff(fs.readFileSync(a), fs.readFileSync(b), region); },
        // Dateien im Download-Ordner, optional nach Muster gefiltert; wartet bis zu `timeoutMs` auf einen Treffer
        async waitForDownload({ pattern, timeoutMs = 30000 }) {
          const dir = config.downloadsFolder, re = new RegExp(pattern), t0 = Date.now();
          for (;;) {
            const hits = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => re.test(f) && !f.endsWith('.crdownload')) : [];
            if (hits.length) return hits.map(f => path.join(dir, f));
            if (Date.now() - t0 > timeoutMs) return [];
            await new Promise(r => setTimeout(r, 200));
          }
        },
        clearDownloads() {
          const dir = config.downloadsFolder;
          if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { force: true });
          return null;
        },
        // PNG-Datei: enthält sie den iTXt-Schlüssel „FractalRenderer“ mit Parametern?
        pngParams({ file }) {
          const buf = fs.readFileSync(file);
          const key = Buffer.from('FractalRenderer\0');
          const i = buf.indexOf(key);
          if (i < 0) return null;
          // iTXt: keyword\0 compression(1) method(1) language\0 translated\0 text
          let p = i + key.length + 2;
          while (buf[p] !== 0) p++; p++;   // language tag
          while (buf[p] !== 0) p++; p++;   // translated keyword
          // Chunk-Länge steht 8 Bytes vor dem Schlüsselwort (4 Länge + 4 Typ); die Daten beginnen beim Schlüsselwort
          const len = buf.readUInt32BE(i - 8), end = i + len;
          return buf.toString('utf8', p, end);
        },
      });
      return config;
    },
  },
});
