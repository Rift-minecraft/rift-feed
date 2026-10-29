/* Kopiert skinview3d in renderer/vendor, damit auch per Update-Dateien nachgeladene Versionen es finden */
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'skinview3d', 'bundles', 'skinview3d.bundle.js');
const dst = path.join(__dirname, '..', 'renderer', 'vendor', 'skinview3d.bundle.js');
if (fs.existsSync(src)) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); console.log('vendor: skinview3d kopiert'); }
else console.warn('vendor: skinview3d nicht gefunden (npm install ausgeführt?)');
