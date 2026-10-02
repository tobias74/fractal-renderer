// Pixelvergleich am Desktop: eine feste Liste von Links wird mit einem Git-Stand und mit dem Arbeitsstand (index.html im
// Projekt) in Headless-Chrome gerendert (WebGPU), die Bildpunkte des Bildes werden exakt verglichen. Für Umbauten, die kein
// Bild verändern dürfen. Infrastruktur wie tools/leistung.js.
//
// Aufruf: node tools/bildvergleich.js [--stand HEAD] [--gegen arbeit] [--nur <Regex auf den Namen>] [--bilder <verzeichnis>] [--breite 900] [--hoehe 560]
//   stand  = Git-Revision für die Vorlage (Vorgabe HEAD); gegen = zweiter Stand (Vorgabe: der Arbeitsstand)
//   bilder = Verzeichnis: bei einer Abweichung beide Bilder dort ablegen (<Fall>-vorlage.png, <Fall>-neu.png)
//   Ausgabe je Fall: gleich / anders (Anteil abweichender Farbwerte, größte Abweichung) / Fehler; Rückgabewert 1, wenn
//   ein Fall abweicht oder scheitert.
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), http = require('http'), os = require('os'), path = require('path');

const root = path.join(__dirname, '..');
const arg = (n, v) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : v; };
const STAND = arg('stand', 'HEAD'), GEGEN = arg('gegen', 'arbeit');
const BILDER = arg('bilder', null), NUR = arg('nur', null), BREITE = +arg('breite', 900), HOEHE = +arg('hoehe', 560);
const ABLAGE = path.join(os.tmpdir(), 'fraktal-bildvergleich');

// ---- Die Fälle: Name und Link (ohne #); ls = zusätzliche Einstellungen im lokalen Speicher
const ORT = 'mode=mandel&re=-0.7453&im=0.1127&z=300&it=800';
const FAELLE = [];
const fall = (name, hash, ls) => FAELLE.push({ name, hash, ls });
fall('start', '');
for (let m = 0; m <= 40; m++) fall('farbe-' + m, ORT + '&map=' + m);
for (let i = 1; i <= 8; i++) fall('innen-' + i, ORT + '&map=2&in=' + i);
for (const g of [1, 2]) { fall('rand-' + g, ORT + '&glow=' + g + '&gw=3'); fall('rand-' + g + '-bahn', ORT + '&map=19&glow=' + g + '&gw=3'); fall('rand-' + g + '-relief', ORT + '&map=4&glow=' + g + '&gw=3'); }
fall('gestuft', ORT + '&st=1');
fall('palettenbreite', ORT + '&pf=1');
fall('palettenbreite-relief', ORT + '&map=6&pf=1');
fall('je-kanal-rgb', ORT + '&kn=0~1,0.05,0,1,1,0,0,1,0,0~1,0.05,0,1,1,2.0944,0,1,0,0~1,0.05,0,1,1,4.1888,0,1,0,0');
fall('je-kanal-lch', ORT + '&kn=1~3,0.02,0.3,1,1,0,0,1,0,0~0,0,0.8,0,1,0,0,1,0,0~4,1,0,0,1,0,0,1,0,0');
fall('je-kanal-quellen', ORT + '&kn=1~6,0.12,0,0,1,0,0,1,0,0~0,0,0.7,0,1,0,0,1,0,0~5,1,0,0,1,0,0,1,0,0');
fall('sinus', ORT + '&it=2000&map=40&wv=96,5,1,1,0.3,1.2,2.4,0,0.5,-0.5,0.8,0,1,1.1,0.9,11100,01110,00111,3');
fall('sinus-palette', ORT + '&it=2000&map=40&wv=96,5,1,1,0.3,1.2,2.4,0,0.5,-0.5,0.8,0,1,1.1,0.9,11100,01110,00111,7');
fall('sinus-zusaetze', ORT + '&it=2000&map=40&wv=96,5,1,1,0.3,1.2,2.4,0,0.5,-0.5,0.8,0,1,1.1,0.9,11100,01110,00111,3,0.5,0.02,0.02,2');
for (const t of [1, 5, 11, 15, 24, 27]) fall('textur-' + t, ORT + '&tx=' + t + '&ts=0.4');
fall('textur-stapel', ORT + '&tx=1&ts=0.4&t2=2&t3=3');
fall('textur-bahn', ORT + '&map=19&tx=1&ts=0.4');
fall('textur-relief', ORT + '&map=4&tx=1&ts=0.4');
fall('textur-innen', ORT + '&map=2&in=3&tx=1&ts=0.4');
fall('relief-licht', ORT + '&map=4&rn=22.08&lz=1');
fall('relief-material', ORT + '&map=4&mt=2');
fall('paar', ORT + '&map=31');
fall('zweidimensional-aus', ORT + '&map=18&p2=-1');
fall('newton', 'mode=julia&f=11&p=3&z=0.5&re=0&im=0&it=200&jre=0&jim=0');
fall('newton-verfahren', 'mode=julia&f=11&p=3&z=0.5&re=0&im=0&it=200&jre=0&jim=0&fn=4');
fall('lyapunov-folge', 'mode=mandel&f=13&seq=AB');
fall('julia', 'mode=julia&jre=-0.8&jim=0.156&it=500');
fall('punktwolke', 'fam=dejong&at=2000000');
fall('ebenen', ORT + '&l2=f%3D1&la=2&lm2=2:0.7:1:0:1:');
fall('ebenen-lch', ORT + '&l2=f%3D1&la=2&lm2=19:1:1:0:1:');
fall('nachbearbeitung', ORT + '&nb=11:1:1:1;3:1:1:0.2,0.3');
// Nachbearbeitung: jede Art (Vorgaben, einige mit eigenen Werten), jede Maskenart, Nachbar-Ebenen samt Lichtquellen, Ketten
for (let a = 1; a <= 29; a++) if (a < 20 || a > 23) { if (a !== 28) fall('nach-' + a, ORT + '&nb=' + a + ':1:0.8:'); }
fall('nach-2-werte', ORT + '&nb=2:1:1:0.1,0.9,1.6,0.05,0.95');
fall('nach-5-werte', ORT + '&nb=5:1:1:40,0.3,-0.2');
fall('nach-7-lichter', ORT + '&nb=7:1:1:0.3,-0.2,0.1,2,0');
for (const m of [1, 2, 3, 4, 5]) fall('nach-12-' + m, ORT + '&nb=12:1:1:' + m + ',0.8');
fall('nach-18-farbig', ORT + '&nb=18:1:1:0.3,1,2');
fall('nach-25-ohne', ORT + '&nb=25:1:1:0.9,0.5,0.1,0.4,0');
for (const a of [20, 21, 22, 23]) fall('nachbar-' + a, ORT + '&nb=3:1:1:0.1,0.2;' + a + ':1:0.9:;11:1:0.5:');
fall('nachbar-20-r2', ORT + '&nb=20:1:1:2');
fall('nachbar-22-farbig', ORT + '&nb=22:1:1:1.5,60,1');
for (const q of [0, 5, 6, 7]) fall('licht-' + q, ORT + '&nb=28:1:1:' + q + ',1.5');
fall('licht-textur', ORT + '&tx=1&ts=0.4&nb=28:1:1:1,1.5');
fall('licht-abstand', ORT + '&nb=28:1:1:5,1.5;11:1:1:1:m10,0,0,0.25,0,8');
for (const m of [1, 2, 3, 8, 9, 10, 11, 12]) fall('maske-' + m, ORT + (m === 12 ? '&tx=1&ts=0.4' : '') + '&nb=11:1:1:1:m' + m + ',0,0,0.25');
fall('maske-13', ORT + '&nb=3:1:1:0.3,0.2;11:1:1:1:m13,0,0,0.25,0,0,0.4');
fall('maske-umgekehrt', ORT + '&nb=11:1:1:1:m2,1,0,0.25,0,0.5');
fall('maske-zeigen', ORT + '&nb=3:1:1:0.2;11:1:1:1:m9,0,1,0.25;5:1:1:30');
fall('maske-kante-nachbar', ORT + '&nb=5:1:1:30;21:1:1:1.5:m11,0,0,0.25,0.05;4:1:1:0.5');
fall('nach-kette', ORT + '&nb=1:1:1;2:1:0.7:0.05;9:1:1:0.3,-0.2;10:1:1:0.6;13:1:0.5:;17:1:0.9:0.9,0.1,0,0,1,0,0.1,0,0.9;26:1:0.4:;29:1:1:0.5,12,1,1,0.9,0.8');
fall('nach-leuchten-textur', ORT + '&tx=1&ts=0.4&nb=29:1:1:0.4,24,1.2,1,1,1');
for (const m of [1, 3, 6, 9, 11, 14, 15, 16, 17, 18, 21]) fall('ebenen-modus-' + m, ORT + '&l2=f%3D1&la=2&lm2=' + m + ':0.7:1:0:1:');
fall('ebenen-drei', ORT + '&l2=f%3D1&l3=map%3D19&la=3&lm2=9:0.7:1:0:1:&lm3=14:0.6:1:0:1:');
fall('ebenen-maske', ORT + '&l2=f%3D1&la=2&lm2=2:0.7:1:0:1:&lu2=m2,0,0,0.25,0,0.5');
fall('ebenen-nach', ORT + '&l2=f%3D1&la=2&lm2=2:0.7:1:0:1:&nb=21:1:1:1.5;5:1:1:20');
// Bildelemente vom 02.10.2026: Itinerar, Gitterwinkel, Gitter-Ungleichgewicht (Texturen 29 bis 31), direkte Falle (Färbungen 41, 42)
fall('textur-29', ORT + '&tx=29&ts=0.5&tz=3');
fall('textur-29-anfang', 'mode=mandel&tx=29&ts=0.5&tz=3&tq=4:8:1:0:0');
fall('textur-30', ORT + '&tx=30&ts=0.2');
fall('textur-31', ORT + '&tx=31&ts=0.7');
fall('textur-29-30-31', ORT + '&tx=29&ts=0.4&t2=30&t3=31');
fall('direkt-41', 'mode=mandel&map=41&dt=0,0.25,1');
fall('direkt-42', ORT + '&map=42&dt=0,0.25,0.05');
fall('direkt-41-ring', ORT + '&map=41&dt=1,0.15,0.03');
fall('direkt-41-achse-julia', 'mode=julia&jre=-0.8&jim=0.156&it=500&map=41&dt=2,0.3,0.45');
fall('direkt-41-textur', 'mode=mandel&map=41&dt=0,0.25,0.1&tx=29&ts=0.5&tz=3');
fall('glaettung', ORT + '&aa=2&aam=grid');
fall('glaettung-adaptiv', ORT + '&map=19&aa=3&aam=grid&aat=0.012&aax=16');

// ---- Stände bereitstellen
fs.mkdirSync(ABLAGE, { recursive: true });
function verzeichnisFuer(stand) {
  const dir = path.join(ABLAGE, 'stand-' + stand.replace(/[^a-z0-9_.-]/gi, '_'));
  fs.mkdirSync(dir, { recursive: true });
  const html = stand === 'arbeit' ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : execFileSync('git', ['show', stand + ':index.html'], { cwd: root, maxBuffer: 1 << 26 }).toString('utf8');
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

// ---- Chrome über das DevTools-Protokoll
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let proc = null, ws = null;
function ende(code) { try { if (ws) ws.close(); } catch (e) { /* egal */ } try { if (proc) proc.kill(); } catch (e) { /* egal */ } setTimeout(() => process.exit(code), 300); }
function chromeStarten() {
  return new Promise((res, rej) => {
    proc = spawn(chrome, ['--headless=new', `--user-data-dir=${path.join(ABLAGE, 'chrome-profil')}`, '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-port=0', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', `--window-size=${BREITE},${HOEHE}`, '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    proc.stderr.on('data', d => { err += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(err); if (m) res(m[1]); });
    proc.on('exit', c => rej(new Error('Chrome beendet (' + c + ')\n' + err.slice(-1500))));
    setTimeout(() => rej(new Error('Chrome meldet sich nicht')), 60000);
  });
}
const schlaf = ms => new Promise(r => setTimeout(r, ms));

// Fertig heißt: Statuszeile beginnt mit „Fertig“ (Glättung durch) und alle sichtbaren Ebenen sind gerechnet
const LESEN = `(() => { const s = document.getElementById('state').textContent;
  const st = window.ebenenStand ? window.ebenenStand() : null;
  const alle = !st || st.ebenen.length <= 1 || (st.phase === 'idle' && st.renderEbene === st.ebeneAktiv && !st.ebenen.some((e, k) => { const solo = st.ebenen.findIndex(x => x.solo); return (solo >= 0 ? k === solo : e.sichtbar) && (!e.frisch || e.glattOffen); }));
  return { fertig: /^(Fertig|Done)/.test(s) && alle, status: s, fatal: !document.getElementById('fatal').hidden }; })()`;
const BILD = `(() => { const c = document.querySelector('#stage canvas'); return c ? c.toDataURL('image/png') : ''; })()`;
const VERGLEICH = a => `(async () => {
  const lade = s => new Promise((r, j) => { const i = new Image(); i.onload = () => { const k = document.createElement('canvas'); k.width = i.width; k.height = i.height; const g = k.getContext('2d'); g.drawImage(i, 0, 0); r(g.getImageData(0, 0, i.width, i.height).data); }; i.onerror = j; i.src = s; });
  const c = document.querySelector('#stage canvas'); const A = await lade(${JSON.stringify(a)}), B = await lade(c.toDataURL('image/png'));
  if (A.length !== B.length) return { groesse: true };
  let n = 0, mx = 0; for (let j = 0; j < A.length; j++) { const d = Math.abs(A[j] - B[j]); if (d) { n++; if (d > mx) mx = d; } }
  return { n, anteil: n / A.length, mx }; })()`;

async function main() {
  const faelle = FAELLE.filter(f => !NUR || new RegExp(NUR).test(f.name));
  const a = await servieren(verzeichnisFuer(STAND)), b = await servieren(verzeichnisFuer(GEGEN));
  const wsUrl = await chromeStarten();
  const port = new URL(wsUrl).port;
  const target = await new Promise((res, rej) => { const q = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => { let t = ''; r.on('data', c => t += c); r.on('end', () => res(JSON.parse(t))); }); q.on('error', rej); q.end(); });
  ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pend = new Map(); let fehler = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') fehler.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(String(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)); return r.result?.result?.value; };
  await send('Page.enable'); await send('Runtime.enable');
  let skript = null, ladungen = 0;
  async function laden(port2, f) {
    const ls = Object.assign({ 'fractal.consent': JSON.stringify({ v: 2, ts: 1, settings: true, marketing: false }), 'fractal.lang': 'de', 'fractal.aa': '1', 'fractal.aamode': 'grid' }, f.ls || {});
    if (skript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: skript });
    skript = (await send('Page.addScriptToEvaluateOnNewDocument', { source: 'localStorage.clear();' + Object.entries(ls).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join('') })).result.identifier;
    fehler = [];
    await send('Page.navigate', { url: `http://127.0.0.1:${port2}/?v=${++ladungen}` + (f.hash ? '#' + f.hash : '') });
    await schlaf(400);
    const t0 = Date.now();
    for (;;) {
      const z = await js(LESEN).catch(() => null);
      if (z && z.fatal) throw new Error('App meldet einen Fehler: ' + z.status);
      if (z && z.fertig) break;
      if (Date.now() - t0 > 180000) throw new Error('Zeitüberschreitung, Status: ' + (z && z.status));
      await schlaf(60);
    }
    await schlaf(500);   // ein Bild nach „Fertig“, damit die Anzeige steht
    if (fehler.length) throw new Error('Ausnahme: ' + fehler[0].slice(0, 300));
  }
  // Aufwärmen
  await laden(a.port, { hash: '' }); await laden(b.port, { hash: '' });
  let schlecht = 0;
  console.log(`Vergleich ${STAND} gegen ${GEGEN}, ${faelle.length} Fälle, ${BREITE}×${HOEHE}`);
  for (const f of faelle) {
    let zeile;
    try {
      await laden(a.port, f); const bildA = await js(BILD);
      await laden(b.port, f); const v = await js(VERGLEICH(bildA));
      if (v.groesse) { zeile = 'ANDERS (Bildgröße)'; schlecht++; }
      else if (v.n === 0) zeile = 'gleich';
      else { zeile = `ANDERS  ${(100 * v.anteil).toFixed(3)} % der Werte, höchstens ${v.mx}`; schlecht++;
        if (BILDER) { fs.mkdirSync(BILDER, { recursive: true }); const png = u => Buffer.from(u.split(',')[1], 'base64'); fs.writeFileSync(path.join(BILDER, f.name + '-vorlage.png'), png(bildA)); fs.writeFileSync(path.join(BILDER, f.name + '-neu.png'), png(await js(BILD))); } }
    } catch (e) { zeile = 'FEHLER  ' + String(e.message).slice(0, 200); schlecht++; }
    console.log(f.name.padEnd(26), zeile);
  }
  console.log(schlecht ? `${schlecht} von ${faelle.length} Fällen abweichend oder gescheitert` : 'alle Fälle gleich');
  ende(schlecht ? 1 : 0);
}
main().catch(e => { console.error('Fehler:', e.message); ende(2); });
