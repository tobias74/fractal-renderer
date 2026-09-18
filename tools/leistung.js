// Leistungsmessung: feste Szenen in Headless-Chrome rendern (WebGPU, auf Wunsch WebGL 2) und die Zeiten nehmen, die
// die App selbst stoppt – renderMs (Ebene 0 fertig) und refineMs (Glättung fertig). Mehrere Stände aus der
// Git-Historie laufen gegen dieselben Szenen; jeder Stand liegt in einem eigenen Verzeichnis hinter einem eigenen Port,
// alle Stände laufen im selben Chrome, Szene für Szene im Wechsel, damit Aufwärmen und Drift alle gleich treffen.
//
// Aufruf: node tools/leistung.js [--staende arbeit,cd017bb,9d02bbb] [--runden 3] [--warm 3] [--szenen start,zoom,…]
//                                [--ablage <verzeichnis>] [--json <datei>] [--breite 1280] [--hoehe 800]
//   arbeit      = der Arbeitsstand (index.html im Projekt), alles andere sind Git-Revisionen (git show rev:index.html)
//   runden      = wie oft jede Szene je Stand frisch geladen wird (kalt: mit Übersetzen der Shader)
//   warm        = wie viele Neurender je Ladung dazukommen (warm: Shader stehen, nur die Rechnung)
//   ablage      = wohin die alten Stände und das Chrome-Profil kommen (Vorgabe: Temp-Verzeichnis des Systems)
// Ausgabe je Szene und Stand (Mediane, Millisekunden):
//   Durchlauf = ein reiner Vollbild-Durchlauf des Shaders mit Warten auf die GPU (die Rechnung selbst), dazu das Minimum
//   kalt      = erstes Bild nach dem Laden, so wie die App es stoppt (mit Übersetzen der Shader und ihrer Kachelplanung)
//   warm      = Neurender nach einer Eingabe, so wie die App es stoppt (Vorschau, Kacheln, Bildtakt)
//   Glättung  = Zeit der Glättung, nur bei Szenen mit Glättung
//   Zug max   = größte Lücke zwischen zwei Bildern beim Ziehen mit gedrückter Maus (40 Schritte, 16 ms), Zug fps = Bildrate dabei
//   Ebenen-Szenen (ebenen2, ebenen3): kalt und warm sind die Zeit, bis alle Ebenen samt Glättung fertig sind; ältere Stände kennen sie nicht
//   1. Bild   = vom Aufruf der Seite bis zum ersten Bild;  Laden = bis DOMContentLoaded (Lesen und Übersetzen der Seite)
// Dazu eine JSON-Datei mit allen Einzelwerten.
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), http = require('http'), os = require('os'), path = require('path');

const root = path.join(__dirname, '..');
const arg = (n, v) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : v; };
const STAENDE = arg('staende', 'arbeit,cd017bb,9d02bbb').split(',');
const RUNDEN = +arg('runden', 3), WARM = +arg('warm', 3);
const ABLAGE = arg('ablage', path.join(os.tmpdir(), 'fraktal-leistung'));
const JSON_DATEI = arg('json', path.join(ABLAGE, 'leistung-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json'));
const BREITE = +arg('breite', 1280), HOEHE = +arg('hoehe', 800);
const ORT = 're=-0.7436438870371587&im=0.13182590420531197';   // Seepferdchental: Rand, Innen und Außen gemischt

// Szenen: nur Adressparameter, die alle Stände kennen – außer bei „nurNeu“, die laufen nur auf Ständen, die sie können
// (die Messung merkt das am Bild: bleibt die Färbung unbekannt, fällt die App auf die Vorgabe zurück; das steht dann
// als Hinweis in der Tabelle, weil die Adresse nach dem Laden anders aussieht).
const SZENEN = [
  { name: 'start',    was: 'Startbild, 120 Iterationen',                      hash: '' },
  { name: 'zoom',     was: 'Zoom 10⁶, 2000 Iterationen',                      hash: `mode=mandel&${ORT}&z=1e6&it=2000` },
  { name: 'tief',     was: 'Zoom 10¹⁰, 3000 Iterationen',                     hash: `mode=mandel&${ORT}&z=1e10&it=3000` },
  { name: 'innen',    was: 'ganz im Inneren, jeder Punkt 5000 Iterationen, ohne Zyklenerkennung', hash: 'mode=mandel&re=-0.2&im=0&z=30&it=5000', ls: { 'fractal.cycle': '0' } },   // reiner Durchsatz
  { name: 'julia',    was: 'Julia-Menge, 500 Iterationen',                    hash: 'mode=julia&jre=-0.8&jim=0.156&it=500' },
  { name: 'relief',   was: 'Relief (Abstandsschätzung), Zoom 10⁶',            hash: `mode=mandel&${ORT}&z=1e6&it=1000&map=4` },
  { name: 'ebenen2',  was: 'Zwei Fraktal-Ebenen (Mandelbrot, Burning Ship gemischt), Zoom 10⁵, 2000 Iterationen', hash: `mode=mandel&${ORT}&z=1e5&it=2000&l2=f%3D1%26it%3D2000&lm2=2:0.7:1:0:1:&la=2`, nurNeu: ['la=2'], ebenen: true },
  { name: 'ebenen3',  was: 'Drei Fraktal-Ebenen (dazu Tricorn, Differenz), Zoom 10⁵, 2000 Iterationen',           hash: `mode=mandel&${ORT}&z=1e5&it=2000&l2=f%3D1%26it%3D2000&l3=f%3D2%26it%3D2000&lm2=2:0.7:1:0:1:&lm3=10:0.5:1:0:1:&la=3`, nurNeu: ['la=3'], ebenen: true },
  { name: 'histogramm', was: 'Histogramm-Färbung, Zoom 10⁶',                  hash: `mode=mandel&${ORT}&z=1e6&it=1000&map=3` },
  { name: 'streifen', was: 'Streifenmittel (Bahnstatistik), Zoom 10⁶',        hash: `mode=mandel&${ORT}&z=1e6&it=1000&map=19` },
  { name: 'dreieck',  was: 'Dreiecksmittel (Bahnstatistik), Zoom 10⁶',        hash: `mode=mandel&${ORT}&z=1e6&it=1000&map=20` },
  { name: 'zweid',    was: 'Bahnfalle Kreuz, zwei Werte (2D-Palette), Zoom 10⁶', hash: `mode=mandel&${ORT}&z=1e6&it=1000&map=18` },
  { name: 'glaettung', was: 'Startbild mit Raster-Glättung 2 × 2',            hash: '', ls: { 'fractal.aa': '2', 'fractal.aamode': 'grid' } },
  { name: 'webgl',    was: 'Startbild mit WebGL 2',                           hash: '', ls: { 'fractal.renderer': 'webgl' } },
  { name: 'webgl-zoom', was: 'Zoom 10⁶ mit WebGL 2',                          hash: `mode=mandel&${ORT}&z=1e6&it=2000`, ls: { 'fractal.renderer': 'webgl' } },
  { name: 'textur',   was: 'drei gestapelte Texturen über Streifenmittel',    hash: `mode=mandel&${ORT}&z=1e6&it=1000&map=19&tx=1&ts=0.4&tk=1.5&t2=2&t3=3`, nurNeu: ['map=19', 'tx=1', 't2=2', 't3=3'] },
  { name: 'paar',     was: 'Paar Drehung + Fluchtzeit (Färbung 30)',          hash: `mode=mandel&${ORT}&z=1e6&it=1000&map=30`, nurNeu: ['map=30'] },
];
const PASSES = 5;   // reine Durchläufe je Ladung
const gewaehlt = arg('szenen', '') ? SZENEN.filter(s => arg('szenen', '').split(',').includes(s.name)) : SZENEN;

// --- Stände bereitlegen: jeder bekommt ein Verzeichnis mit index.html und einen eigenen kleinen Server ---
// Das Skript der App ist in eine Funktion eingeschlossen; die Zeitvariablen sind von außen nicht zu sehen. Jede Kopie
// bekommt darum hinter der Zeile, die sie anlegt, einen Lesehaken (window.__leistung). Fehlt die Zeile in einem alten
// Stand, liest die Messung die Statuszeile („Fertig · 67 ms + 12 ms Glättung“), gröber, aber brauchbar.
fs.mkdirSync(ABLAGE, { recursive: true });
const ANKER = 'let renderT0 = 0, renderMs = 0, refineMs = -1, interactUntil = 0, rafId = 0;';
// Drei Haken: Zeiten lesen, die Ansicht als geändert melden (Neurender wie nach einer Eingabe) und ein reiner Durchlauf –
// ein einziger Vollbild-Aufruf des Fraktal-Shaders mit Warten auf die GPU, ohne Vorschau, Kacheln und Bildtakt.
const HAKEN = ANKER + '\nwindow.__leistung = () => ({ renderMs, refineMs, renderT0 }); window.__leistungNeu = () => viewChanged();'
  + ' window.__leistungPass = async () => { const t0 = performance.now(); renderer.renderFractal(\'full\', [{ x: 0, y: 0, w: W, h: H }], fractalParams(1, currentMaxIter(), 0), 0); await renderer.whenDone(); return performance.now() - t0; };   // von tools/leistung.js eingesetzt';
function verzeichnisFuer(stand) {
  const dir = path.join(ABLAGE, 'stand-' + stand.replace(/[^a-z0-9_.-]/gi, '_'));
  fs.mkdirSync(dir, { recursive: true });
  let html = stand === 'arbeit' ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : execFileSync('git', ['show', stand + ':index.html'], { cwd: root, maxBuffer: 1 << 26 }).toString('utf8');
  const mitHaken = html.includes(ANKER);
  if (mitHaken) html = html.replace(ANKER, HAKEN); else console.log(`Hinweis: Stand ${stand} ohne Lesehaken, die Zeiten kommen aus der Statuszeile.`);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return dir;
}
function servieren(dir) {
  return new Promise(res => {
    const srv = http.createServer((req, rs) => {
      let f = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (f === '/') f = '/index.html';
      const p = path.normalize(path.join(dir, f));
      if (!p.startsWith(dir)) { rs.statusCode = 403; return rs.end(); }
      fs.readFile(p, (e, d) => { if (e) { rs.statusCode = 404; return rs.end(); } rs.setHeader('Content-Type', p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream'); rs.end(d); });
    });
    srv.listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}

// --- Chrome über das DevTools-Protokoll ---
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let proc = null, ws = null;
function ende(code) { try { if (ws) ws.close(); } catch (e) { /* egal */ } try { if (proc) proc.kill(); } catch (e) { /* egal */ } setTimeout(() => process.exit(code), 300); }
function chromeStarten() {
  return new Promise((res, rej) => {
    proc = spawn(chrome, ['--headless=new', `--user-data-dir=${path.join(ABLAGE, 'chrome-profil')}`, '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--disable-gpu-shader-disk-cache',   // kalt heißt: Shader jedes Mal übersetzen
      `--window-size=${BREITE},${HOEHE}`, '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    proc.stderr.on('data', d => { err += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(err); if (m) res(m[1]); });
    proc.on('exit', c => rej(new Error('Chrome beendet (' + c + ')\n' + err.slice(-1500))));
    setTimeout(() => rej(new Error('Chrome meldet sich nicht')), 60000);
  });
}
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const schlaf = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const staende = [];
  for (const s of STAENDE) { const dir = verzeichnisFuer(s); const { port } = await servieren(dir); staende.push({ name: s, dir, port }); }
  const wsUrl = await chromeStarten();
  const port = new URL(wsUrl).port;
  const target = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => res(JSON.parse(b))); }); q.on('error', rej); q.end(); });
  ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pend = new Map(); const fehler = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') fehler.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async expr => { const a = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (a.result?.exceptionDetails) throw new Error(String(a.result.exceptionDetails.exception?.description || a.result.exceptionDetails.text).slice(0, 300)); return a.result?.result?.value; };
  await send('Page.enable'); await send('Runtime.enable');

  // Was die App weiß: Status, Zeiten, Größe. Fertig heißt: Statuszeile beginnt mit „Fertig“ (auch die Glättung ist
  // durch). Die Zeiten liefert der Lesehaken; ohne ihn werden sie aus der Statuszeile gelesen (Komma, „ms“ oder „s“).
  const LESEN = `(() => { const s = document.getElementById('state').textContent; const c = document.querySelector('#stage canvas');
    const zahl = (v, e) => parseFloat(v.replace(',', '.')) * (e === 's' ? 1000 : 1);
    let z = window.__leistung ? window.__leistung() : null;
    if (!z) { const m = /Fertig · ([\\d.,]+) (ms|s)(?: \\+ ([\\d.,]+) (ms|s) Glättung)?/.exec(s);
      z = m ? { renderMs: zahl(m[1], m[2]), refineMs: m[3] ? zahl(m[1], m[2]) + zahl(m[3], m[4]) : -1, renderT0: performance.now() - zahl(m[1], m[2]) } : { renderMs: -1, refineMs: -1, renderT0: 0 }; }
    const st = window.ebenenStand ? window.ebenenStand() : null;   // Fraktal-Ebenen (neuere Stände): erst fertig, wenn jede sichtbare Ebene gerechnet und geglättet ist
    const alle = !st || st.ebenen.length <= 1 || (st.phase === 'idle' && st.renderEbene === st.ebeneAktiv && !st.ebenen.some((e, k) => { const solo = st.ebenen.findIndex(x => x.solo); return (solo >= 0 ? k === solo : e.sichtbar) && (!e.frisch || e.glattOffen); }));
    return { fertig: /^Fertig/.test(s) && alle, status: s, renderMs: z.renderMs, refineMs: z.refineMs, renderT0: z.renderT0, jetzt: performance.now(), badge: document.getElementById('badge').textContent,
      breite: c ? c.width : 0, hoehe: c ? c.height : 0, hash: location.hash, fatal: !document.getElementById('fatal').hidden,
      params: (window.fractalState && window.fractalState.get().params) || '',
      dcl: performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd || 0 }; })()`;
  async function wartenBisFertig(vorher, timeout = 180000) {
    const t0 = Date.now();
    for (;;) {
      const z = await js(LESEN);
      if (z.fatal) throw new Error('App meldet einen Fehler: ' + z.status);
      if (z.fertig && z.renderMs >= 0 && z.renderMs !== vorher) return z;
      if (Date.now() - t0 > timeout) throw new Error('Zeitüberschreitung, Status: ' + z.status);
      await schlaf(40);
    }
  }
  // Neurender anstoßen: über den Haken die Ansicht als geändert melden; beginnt binnen zwei Sekunden kein Render (oder
  // fehlt der Haken), den Zustand mit einer Iteration mehr setzen. Beginnt auch dann keiner: null.
  const ANSTOSS_HAKEN = 'window.__leistungNeu ? (window.__leistungNeu(), true) : false';
  const ANSTOSS_ZUSTAND = `(() => { const s = window.fractalState.get(); s.params = /it=\\d+/.test(s.params) ? s.params.replace(/it=(\\d+)/, (m, n) => 'it=' + (+n + 1)) : s.params + '&it=121'; window.fractalState.set(s); return true; })()`;
  async function neuRendern(vorher) {
    for (const anstoss of [ANSTOSS_HAKEN, ANSTOSS_ZUSTAND]) {
      if (!(await js(anstoss))) continue;
      const t0 = Date.now();
      while (Date.now() - t0 < 2000) {
        const z = await js(LESEN);
        if (!z.fertig || z.renderMs < 0 || z.renderMs !== vorher) return wartenBisFertig(vorher);   // begonnen (oder schon fertig)
        await schlaf(20);
      }
    }
    return null;
  }
  // Ziehen: 40 Mausbewegungen im Abstand von 16 ms mit gedrückter Taste (echte Eingabe über das Protokoll), dazwischen die
  // Lücken zwischen den Bildern der Seite messen; danach warten, bis das Bild wieder fertig ist
  async function ziehen(vorher) {
    await js('window.__zug = { frames: 0, max: 0, last: performance.now(), lauf: true }; (function tick(t) { const g = window.__zug; g.frames++; g.max = Math.max(g.max, t - g.last); g.last = t; if (g.lauf) requestAnimationFrame(tick); })(performance.now()); true');
    let x = 420, y = 380;
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    const t0 = Date.now();
    for (let i = 0; i < 40; i++) { x += 4; y += 2; await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 }); await schlaf(16); }
    const dauer = Date.now() - t0;
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
    const g = await js('window.__zug.lauf = false; ({ frames: window.__zug.frames, max: window.__zug.max })');
    let fertig = null; try { fertig = await wartenBisFertig(vorher, 120000); } catch (e) { /* die Messung des Zugs zählt trotzdem */ }
    return { luecke: g.max, fps: g.frames / (dauer / 1000), fertig };
  }
  let ladungen = 0;
  async function laden(stand, szene) {
    const ls = Object.assign({ 'fractal.consent': JSON.stringify({ v: 2, ts: 1, settings: true, marketing: false }), 'fractal.lang': 'de', 'fractal.aa': '1', 'fractal.aamode': 'grid', 'fractal.quality': '1' }, szene.ls || {});
    await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();' + Object.entries(ls).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('') });
    await send('Page.navigate', { url: `http://127.0.0.1:${stand.port}/?leistung=${++ladungen}` + (szene.hash ? '#' + szene.hash : '') });
    await schlaf(300);
    return wartenBisFertig(undefined);
  }

  // Aufwärmen: einmal das Startbild jedes Stands, damit GPU, Chrome und der erste Gerätezugriff je Herkunft hinter uns liegen
  for (const st of staende) { await laden(st, SZENEN[0]); const w = SZENEN.find(x => x.name === 'webgl'); if (w) { try { await laden(st, w); } catch (e) { /* ohne WebGL: egal */ } } }   // auch WebGL je Stand: die erste Nutzung im Prozess kostet Sekunden und träfe sonst nur den ersten Stand
  const ergebnis = { datum: new Date().toISOString(), rechner: os.hostname(), cpu: os.cpus()[0]?.model, fenster: BREITE + '×' + HOEHE, runden: RUNDEN, warm: WARM, staende: staende.map(s => s.name), szenen: [] };
  for (const szene of gewaehlt) {
    const zeile = { name: szene.name, was: szene.was, hash: szene.hash, staende: {} };
    const mitGlaettung = !!(szene.ls && szene.ls['fractal.aa'] && szene.ls['fractal.aa'] !== '1');
    for (const st of staende) zeile.staende[st.name] = { kalt: [], warm: [], durchlauf: [], erstesBild: [], glaettung: [], laden: [], zugLuecke: [], zugFps: [], badge: '', groesse: '', hinweis: '', notizen: [] };
    for (let r = 0; r < RUNDEN; r++) {
      for (const st of staende) {
        const e = zeile.staende[st.name];
        let z;
        try { z = await laden(st, szene); } catch (err) { e.hinweis = String(err.message); continue; }
        e.badge = z.badge; e.groesse = z.breite + '×' + z.hoehe;
        // Kennt der Stand die Szene nicht (unbekannte Färbung, unbekannte Parameter), fehlt sie in seinem Zustand
        if (szene.nurNeu) { const ist = new URLSearchParams(z.params); for (const kv of szene.nurNeu) { const [k, v] = kv.split('='); if (ist.get(k) !== v) { e.hinweis = 'Stand kennt ' + kv + ' nicht'; break; } } }
        if (e.hinweis) continue;
        e.kalt.push(szene.ebenen ? z.jetzt - z.dcl : z.renderMs); e.erstesBild.push(szene.ebenen ? z.jetzt : z.renderT0 + z.renderMs); e.laden.push(z.dcl);   // bei Ebenen: vom Ende des Ladens, bis alle Ebenen samt Glättung fertig sind (renderT0 gehört nur der zuletzt gerechneten Ebene)
        if (mitGlaettung && z.refineMs > z.renderMs) e.glaettung.push(z.refineMs - z.renderMs);
        let vorher = z.renderMs;
        try {
          for (let w = 0; w < WARM; w++) {
            const tw = Date.now(), y = await neuRendern(vorher);
            if (!y) { e.notizen.push(`Runde ${r + 1}: kein Neurender begonnen (Status „${(await js(LESEN)).status}“)`); break; }
            e.warm.push(szene.ebenen ? Date.now() - tw : y.renderMs); /* bei Ebenen: vom Anstoß, bis alle Ebenen fertig sind */ if (mitGlaettung && y.refineMs > y.renderMs) e.glaettung.push(y.refineMs - y.renderMs); vorher = y.renderMs;
          }
          const zug = await ziehen(vorher); e.zugLuecke.push(zug.luecke); e.zugFps.push(zug.fps); if (zug.fertig) vorher = zug.fertig.renderMs;
          // reine Durchläufe: nur der Shader, ohne Planung – das ist die Zeit, die die Rechnung selbst braucht
          if (await js('typeof window.__leistungPass === "function"')) for (let p = 0; p < PASSES; p++) e.durchlauf.push(await js('window.__leistungPass()'));
        } catch (err) { e.notizen.push(`Runde ${r + 1}: ${err.message}`); }
        if (fehler.length) { e.notizen.push(...fehler.map(f => `Runde ${r + 1}, Seite: ${f.slice(0, 200)}`)); fehler.length = 0; }
      }
    }
    ergebnis.szenen.push(zeile);
    zeigeZeile(zeile, staende);
  }
  fs.writeFileSync(JSON_DATEI, JSON.stringify(ergebnis, null, 1));
  console.log('\nEinzelwerte: ' + JSON_DATEI);
  if (fehler.length) console.log('Ausnahmen in der Seite:\n' + fehler.slice(0, 10).join('\n'));
  ende(0);
}
const f0 = v => Number.isFinite(v) ? Math.round(v).toString() : '–';
function zeigeZeile(zeile, staende) {
  console.log(`\n${zeile.name}: ${zeile.was}`);
  console.log('  Stand'.padEnd(12) + 'Renderer'.padEnd(9) + 'Leinwand'.padEnd(11) + 'Durchlauf'.padStart(10) + 'min'.padStart(6) + 'kalt'.padStart(7) + 'warm'.padStart(7) + 'Glättung'.padStart(10) + 'Zug max'.padStart(9) + 'Zug fps'.padStart(9) + '1. Bild'.padStart(9) + 'Laden'.padStart(7) + '   (ms)');
  for (const st of staende) {
    const e = zeile.staende[st.name];
    if (e.hinweis) { console.log('  ' + st.name.padEnd(10) + '– ' + e.hinweis); continue; }
    const f1 = v => Number.isFinite(v) ? (v < 100 ? v.toFixed(1) : Math.round(v).toString()) : '–';
    console.log('  ' + st.name.padEnd(10) + e.badge.padEnd(9) + e.groesse.padEnd(11) + f1(median(e.durchlauf)).padStart(10) + f1(Math.min(...e.durchlauf)).padStart(6) + f0(median(e.kalt)).padStart(7) + f0(median(e.warm)).padStart(7)
      + (e.glaettung.length ? f0(median(e.glaettung)) : '–').padStart(10) + (e.zugLuecke.length ? f0(median(e.zugLuecke)) : '–').padStart(9) + (e.zugFps.length ? f0(median(e.zugFps)) : '–').padStart(9) + f0(median(e.erstesBild)).padStart(9) + f0(median(e.laden)).padStart(7));
    for (const n of e.notizen) console.log('             · ' + n);
  }
}
main().catch(e => { console.error('FEHLER', e); ende(1); });
