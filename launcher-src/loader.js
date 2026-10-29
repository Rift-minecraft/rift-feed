/* Einstiegspunkt: lädt – falls vorhanden – die per „Update-Dateien“ nachgeladene Version aus %AppData%/RiftClient/hot,
   sonst die eingebaute main.js. So braucht ein Update keine Neuinstallation. */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const Module = require('module');

const num = (v) => String(v || '0').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
const newer = (a, b) => { const x = num(a), y = num(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };

let started = false;
try {
  const dir = path.join(app.getPath('appData'), 'RiftClient', 'hot');
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  if (newer(man.version, app.getVersion()) && fs.existsSync(path.join(dir, 'main.js'))) {
    // Module der installierten App (adm-zip, msmc, …) auch für den nachgeladenen Code auffindbar machen
    Module.globalPaths.push(path.join(app.getAppPath(), 'node_modules'));
    process.env.NODE_PATH = Module.globalPaths.join(path.delimiter);
    Module._initPaths();
    global.__riftHot = { dir, version: man.version };
    started = true;
    require(path.join(dir, 'main.js'));
  }
} catch (e) {
  console.error('Hot-Update fehlgeschlagen, falle auf eingebaute Version zurück:', e);
  try { fs.writeFileSync(path.join(app.getPath('appData'), 'RiftClient', 'hot-error.txt'), String((e && e.stack) || e).slice(0, 1200)); } catch {}
  if (started) {   // halb gestartet → Update verwerfen und sauber neu starten
    try { fs.renameSync(path.join(app.getPath('appData'), 'RiftClient', 'hot'), path.join(app.getPath('appData'), 'RiftClient', 'hot.bad-' + Date.now())); } catch {}
    app.relaunch(); app.exit(0);
  }
}
if (!started) require('./main.js');
