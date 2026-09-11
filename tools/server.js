// Mini-Server für die lokale Entwicklung: liefert das Projektverzeichnis aus
// und nimmt per POST /shot?name=x ein PNG entgegen (landet in tools/shots/).
// Aufruf: node tools/server.js  →  http://localhost:8765
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const root = path.join(__dirname, '..');
// Vorgabe: nur der eigene Rechner. Mit --lan (oder HOST=0.0.0.0) hört der Server auf allen Adressen, damit
// zum Beispiel ein Handy im selben WLAN die Seite ansehen kann; --port bzw. PORT wählt einen anderen Port.
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const PORT = +(arg('--port') || process.env.PORT || 8765);
const HOST = process.argv.includes('--lan') ? '0.0.0.0' : (process.env.HOST || '127.0.0.1');

const shots = path.join(__dirname, 'shots');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/shot') {
    const name = (url.searchParams.get('name') || 'shot').replace(/[^a-z0-9_-]/gi, '');
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      fs.mkdirSync(shots, { recursive: true });
      fs.writeFileSync(path.join(shots, name + '.png'), Buffer.concat(chunks));
      res.end('ok');
    });
    return;
  }
  let file = decodeURIComponent(url.pathname);
  if (file === '/') file = '/index.html';
  const p = path.normalize(path.join(root, file));
  if (!p.startsWith(root)) { res.statusCode = 403; return res.end('forbidden'); }
  fs.readFile(p, (e, d) => {
    if (e) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
    res.end(d);
  });
}).on('error', e => {
  if (e.code !== 'EADDRINUSE') throw e;
  // läuft schon (z. B. Vorschau-Server): am Leben bleiben, damit start-server-and-test die Tests trotzdem startet
  console.log('Port 8765 ist belegt, nutze den laufenden Server.');
  setInterval(() => {}, 1 << 30);
}).listen(PORT, HOST, () => {
  console.log('Fraktal-Renderer: http://localhost:' + PORT);
  if (HOST !== '127.0.0.1') for (const list of Object.values(os.networkInterfaces()))
    for (const n of list) if (n.family === 'IPv4' && !n.internal) console.log('im Netz:              http://' + n.address + ':' + PORT);
});
