// Headless-Chrome-Screenshot über das DevTools-Protokoll (mit GPU / WebGPU-Flags).
// Aufruf: node cdp-shot.js <url> <out.png> [waitMs=7000] [width=1280] [height=800] [mobile=0] [initScript]
// initScript: JavaScript, das vor dem Seitenskript läuft, z. B. "localStorage.setItem('fractal.renderer','webgl')"
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

const [url, out, waitMs = '7000', width = '1280', height = '800', mobile = '0', initScript = ''] = process.argv.slice(2);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = __dirname + '/chrome-profile';
const args = [
  '--headless=new', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-angle=d3d11',
  `--window-size=${width},${height}`, '--hide-scrollbars', 'about:blank',
];
const proc = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
let wsUrl = null, stderr = '';
proc.stderr.on('data', d => {
  stderr += d;
  const m = /DevTools listening on (ws:\/\/\S+)/.exec(stderr);
  if (m && !wsUrl) { wsUrl = m[1]; main().catch(e => { console.error('FEHLER', e); cleanup(1); }); }
});
function cleanup(code) { try { proc.kill(); } catch (e) { /* egal */ } setTimeout(() => process.exit(code), 300); }
setTimeout(() => { console.error('Timeout: Chrome meldet sich nicht.\n' + stderr.slice(-2000)); cleanup(1); }, 60000);

async function main() {
  const port = new URL(wsUrl).port;
  const target = await new Promise((res, rej) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, r => {
      let b = ''; r.on('data', c => b += c); r.on('end', () => res(JSON.parse(b)));
    });
    req.on('error', rej); req.end();
  });
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const logs = [];
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
    if (msg.method === 'Runtime.consoleAPICalled') logs.push(msg.params.type + ': ' + msg.params.args.map(a => a.value ?? a.description ?? '').join(' '));
    else if (msg.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
    else if (msg.method === 'Log.entryAdded') logs.push(msg.params.entry.level + ': ' + msg.params.entry.text);
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  if (mobile === '1') await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 2, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
  if (initScript) await send('Page.addScriptToEvaluateOnNewDocument', { source: initScript });
  await send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, +waitMs));
  const ev = await send('Runtime.evaluate', { returnByValue: true, expression: `JSON.stringify({
    badge: document.getElementById('badge')?.textContent,
    state: document.getElementById('state')?.textContent,
    tech: document.getElementById('techInfo')?.textContent,
    res: document.getElementById('resInfo')?.textContent,
    zoom: document.getElementById('zoomRead')?.textContent,
    coords: document.getElementById('coords')?.textContent,
    fatal: !document.getElementById('fatal')?.hidden,
    canvas: (() => { const c = document.querySelector('#stage canvas'); return c ? [c.width, c.height] : null; })(),
    ui: [...document.querySelectorAll('#panel select, #panel input')].map(e => e.id + '=' + (e.type === 'checkbox' ? e.checked : e.value)).join(' '),
    mode: document.querySelector('.seg button.on')?.textContent,
    status: window.__tl && window.__tl.status ? window.__tl.status() : null,
    dbg: (() => { if (!window.__dbg) return null; const d = window.__dbg(); const c = d.counts; if (!c) return { prm: d.prm.prm, plane: d.prm.plane, ps: d.ps }; let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, n = 0; for (let y = 0; y < d.H; y++) for (let x = 0; x < d.W; x++) { if (c[(y * d.stride + x) * 4 + 3] > 0) { n++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; } } return { lit: n, minx, maxx, miny, maxy, prm: d.prm.prm, plane: d.prm.plane, ps: d.ps, chains: d.prm.chains, steps: d.prm.steps, warm: d.prm.warm }; })() })` });
  console.log('PAGE:', ev.result?.result?.value ?? JSON.stringify(ev));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) { fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64')); console.log('saved', out); }
  else console.log('kein Screenshot:', JSON.stringify(shot));
  console.log('LOGS:\n' + logs.join('\n'));
  ws.close(); cleanup(0);
}
