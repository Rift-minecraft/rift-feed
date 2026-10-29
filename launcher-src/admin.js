/* Admin-Bereich im Launcher (per Code freigeschaltet): Updates und Ankündigungen über GitHub an alle Spieler verteilen.
   Kein eigener Server nötig – GitHub (Repo „rift-feed“ + Releases) dient als kostenloser Verteiler. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const crypto = require('crypto');
const vm = require('vm');
const AdmZip = require('adm-zip');

module.exports = function registerAdmin(ctx) {
  const { h, send, DATA, app, dialog, shell, getConfig, setFeed, curVersion, isAdmin, setCloudApi } = ctx;
  const FILE = path.join(DATA, 'admin.json');          // Token liegt NICHT im Launcher-State (der geht an die Oberfläche)
  let cfg = { token: '', repo: '', user: '', branch: 'main' };
  try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}
  let token = ''; try { if (cfg.token) token = Buffer.from(cfg.token, 'base64').toString('utf8'); } catch {}
  const persist = () => fs.writeFileSync(FILE, JSON.stringify({ token: token ? Buffer.from(token).toString('base64') : '', repo: cfg.repo, user: cfg.user, branch: cfg.branch }));
  const FEED_FILE = 'announcements.json';
  const guardAdmin = () => { if (!isAdmin()) throw new Error('Admin-Bereich nicht freigeschaltet.'); };
  const needRepo = () => { if (!token || !/^[\w.-]+\/[\w.-]+$/.test(cfg.repo)) throw new Error('Noch nicht mit GitHub verbunden – erst im Admin-Tab „Setup“ verbinden.'); };
  const progress = (step, pct) => send('admin:progress', { step, pct });
  const A = (ch, fn) => h(ch, async (...a) => { guardAdmin(); return fn(...a); });

  /* ---------- GitHub ---------- */
  async function gh(method, url, body) {
    const r = await fetch(url.startsWith('http') ? url : 'https://api.github.com' + url, {
      method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'RiftLauncher-Admin', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await r.text(); let j; try { j = JSON.parse(text); } catch { j = text; }
    if (!r.ok) {
      const det = (j && Array.isArray(j.errors) ? j.errors : []).map((x) => [x.resource, x.field, x.code, x.message].filter(Boolean).join(' ')).join('; ');
      const e = new Error(`GitHub ${r.status}: ${(j && j.message) || text}${det ? ' (' + det + ')' : ''}`); e.status = r.status; throw e;
    }
    return j;
  }
  const fileUrl = () => `/repos/${cfg.repo}/contents/${FEED_FILE}`;
  async function loadFeed() {
    needRepo();
    try {
      const j = await gh('GET', `${fileUrl()}?ref=${cfg.branch}`);
      const d = JSON.parse(Buffer.from(j.content, 'base64').toString('utf8'));
      return { list: Array.isArray(d.announcements) ? d.announcements : [], sha: j.sha };
    } catch (e) { if (e.status === 404) return { list: [], sha: null }; throw e; }
  }
  async function saveFeed(list, message) {
    for (let i = 0; i < 2; i++) {
      const { sha } = await loadFeed();
      try { await gh('PUT', fileUrl(), { message, branch: cfg.branch, sha: sha || undefined, content: Buffer.from(JSON.stringify({ announcements: list }, null, 2)).toString('base64') }); return; }
      catch (e) { if (e.status !== 409 || i) throw e; }
    }
  }
  const prune = (list) => list.filter((a) => !a.expiresAt || Date.now() - new Date(a.expiresAt) < 7 * 864e5);
  const parseStart = (v) => { if (!v) return null; const t = new Date(v).getTime(); if (!isFinite(t)) throw new Error('Ungültiges Datum.'); return t < Date.now() + 30000 ? null : new Date(t).toISOString(); };
  const cmpVer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };

  /* ---------- Verbinden ---------- */
  A('admin:status', () => ({ connected: !!token && !!cfg.repo, repo: cfg.repo, user: cfg.user, feedRepo: getConfig().feedRepo || '' }));
  A('admin:openTokenPage', () => { shell.openExternal('https://github.com/settings/tokens/new?scopes=repo&description=Rift+Launcher+Admin&default_expires_at=none'); return true; });
  A('admin:connect', async (t) => {
    t = String(t || '').trim(); if (!t) throw new Error('Bitte das GitHub-Token einfügen.');
    token = t;
    try {
      const user = await gh('GET', '/user');
      let repo;
      try { repo = await gh('POST', '/user/repos', { name: 'rift-feed', description: 'Rift Launcher – Ankündigungen & Updates', private: false, auto_init: true }); }
      catch (e) { if (e.status !== 422) throw e; repo = await gh('GET', `/repos/${user.login}/rift-feed`); }
      if (repo.private) repo = await gh('PATCH', `/repos/${repo.full_name}`, { private: false });
      cfg = { ...cfg, user: user.login, repo: repo.full_name, branch: repo.default_branch || 'main' };
      persist(); setFeed({ feedRepo: cfg.repo, branch: cfg.branch, file: FEED_FILE });
      return { user: cfg.user, repo: cfg.repo };
    } catch (e) { token = ''; throw e; }
  });
  A('admin:disconnect', () => { token = ''; cfg.repo = ''; cfg.user = ''; persist(); return true; });

  /* ---------- Ankündigungen ---------- */
  A('admin:feed', async () => (await loadFeed()).list);
  A('admin:post', async (a) => {
    const { list } = await loadFeed();
    const type = ['maintenance', 'news', 'info', 'countdown'].includes(a.type) ? a.type : 'info';
    const cd = type === 'countdown'; let endsAt;
    if (cd) { endsAt = new Date(a.endsAt).getTime(); if (!isFinite(endsAt) || endsAt < Date.now() + 10000) throw new Error('Bitte ein Ziel-Datum in der Zukunft wählen.'); }
    const m = type === 'maintenance';
    const startsAt = parseStart(a.startsAt); const startMs = startsAt ? new Date(startsAt).getTime() : Date.now();
    const ann = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type,
      title: m ? 'Wartungsarbeiten' : String(a.title || '').slice(0, 120), message: m ? '' : String(a.message || '').slice(0, 2000),
      link: /^https:\/\//.test(a.link || '') ? a.link : '', blocking: m, showAfterInstall: !!a.showAfterInstall && !m,
      etaAt: m && +a.etaMinutes > 0 ? new Date(startMs + a.etaMinutes * 60000).toISOString() : undefined,
      startsAt: startsAt || undefined, createdAt: new Date().toISOString(),
      expiresAt: cd ? new Date(endsAt + 3600e3).toISOString() : m || !(+a.expiresHours > 0) ? null : new Date(Date.now() + a.expiresHours * 3600e3).toISOString()
    };
    if (cd) { ann.mode = ['locked', 'closable', 'release'].includes(a.mode) ? a.mode : 'closable'; ann.endsAt = new Date(endsAt).toISOString(); }
    if (!ann.title) throw new Error('Titel fehlt.');
    const next = [ann, ...prune(list).filter((x) => !(m && !startsAt && x.type === 'maintenance'))];
    await saveFeed(next, `${startsAt ? 'Geplant: ' : 'Ankündigung: '}${ann.title}`);
    return next;
  });
  A('admin:remove', async (id) => { const { list } = await loadFeed(); const next = list.filter((a) => a.id !== id); await saveFeed(next, 'Ankündigung entfernt'); return next; });

  /* ---------- Update-Datei wählen ---------- */
  A('admin:pickFile', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Update (ZIP) oder Installer (EXE)', extensions: ['zip', 'exe'] }] });
    return r.canceled ? null : fileInfo(r.filePaths[0]);
  });
  A('admin:fileInfo', (p) => fileInfo(p));
  function fileInfo(p) { const st = fs.statSync(p); return { path: p, name: path.basename(p), size: st.size, kind: p.toLowerCase().endsWith('.exe') ? 'exe' : 'zip' }; }

  /* ---------- ZIP -> Update-Paket ---------- */
  function findVendor() {
    for (const d of [__dirname, app.getAppPath()]) for (const rel of [['renderer', 'vendor', 'skinview3d.bundle.js'], ['node_modules', 'skinview3d', 'bundles', 'skinview3d.bundle.js']]) { const f = path.join(d, ...rel); if (fs.existsSync(f)) return f; }
    return null;
  }
  function buildHotZip(srcZip, version) {
    const zin = new AdmZip(srcZip);
    const files = zin.getEntries().filter((e) => !e.isDirectory).map((e) => ({ e, n: e.entryName.replace(/\\/g, '/') }));
    const names = files.map((f) => f.n);
    let root = null;
    for (const n of names) if (n.endsWith('main.js')) { const p = n.slice(0, -7); if (names.includes(p + 'renderer/index.html') && (root === null || p.length < root.length)) root = p; }
    if (root === null) throw new Error('In der ZIP wurde kein Launcher gefunden (main.js und renderer/index.html fehlen).');
    const out = new AdmZip(); const picked = [];
    for (const { e, n } of files) {
      if (!n.startsWith(root)) continue;
      const rel = n.slice(root.length);
      if (rel.includes('..') || path.isAbsolute(rel) || /(^|\/)(node_modules|dist|mod-src|server|build|\.git)\//.test(rel)) continue;
      const top = !rel.includes('/');
      const ok = (top && /\.js$/.test(rel) && rel !== 'loader.js') || rel.startsWith('renderer/') || /^mod\/[^/]+\.jar$/.test(rel);
      if (!ok) continue;
      const data = e.getData();
      if (/\.js$/.test(rel) && !rel.startsWith('renderer/vendor/')) {                       // Syntaxprüfung, damit kein kaputtes Update an alle geht
        try { new vm.Script('(function(){' + data.toString('utf8') + '\n})', { filename: rel }); } catch (er) { throw new Error(`Syntaxfehler in ${rel}: ${er.message}`); }
      }
      out.addFile(rel, data); picked.push(rel);
    }
    for (const must of ['main.js', 'preload.js', 'renderer/index.html']) if (!picked.includes(must)) throw new Error(`In der ZIP fehlt ${must}.`);
    if (!picked.includes('renderer/vendor/skinview3d.bundle.js')) {
      const v = findVendor(); if (!v) throw new Error('skinview3d fehlt (weder in der ZIP noch im installierten Launcher).');
      out.addFile('renderer/vendor/skinview3d.bundle.js', fs.readFileSync(v));
    }
    let zc = {}; const cf = files.find((f) => f.n === root + 'config.json'); if (cf) { try { zc = JSON.parse(cf.e.getData().toString('utf8')); } catch {} }
    out.addFile('config.json', Buffer.from(JSON.stringify({ ...zc, feedRepo: cfg.repo, branch: cfg.branch, file: FEED_FILE, cosmeticsApi: getConfig().cosmeticsApi || zc.cosmeticsApi || '', modRepo: getConfig().modRepo || zc.modRepo || '' }, null, 2)));   // Feed immer auf DEIN Repo
    const dest = path.join(os.tmpdir(), `rift-update-${version}.zip`); out.writeZip(dest);
    return { path: dest, sha256: crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex'), size: fs.statSync(dest).size, count: picked.length, hasMod: picked.some((p) => p.endsWith('.jar')) };
  }

  /* ---------- Hochladen & an alle senden ---------- */
  function uploadAsset(uploadUrl, filePath) {
    return new Promise((resolve, reject) => {
      const size = fs.statSync(filePath).size, u = new URL(uploadUrl);
      const req = https.request({ method: 'POST', hostname: u.hostname, path: u.pathname + u.search, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'RiftLauncher-Admin', 'Content-Type': 'application/octet-stream', 'Content-Length': size } }, (res) => {
        let b = ''; res.on('data', (d) => (b += d));
        res.on('end', () => { let j; try { j = JSON.parse(b); } catch { j = b; } res.statusCode < 300 ? resolve(j) : reject(new Error(`GitHub ${res.statusCode}: ${(j && j.message) || b}`)); });
      });
      req.on('error', reject);
      let sent = 0, last = -1; const rs = fs.createReadStream(filePath);
      rs.on('data', (c) => { sent += c.length; const p = Math.floor((sent / size) * 100); if (p !== last) { last = p; progress('Lade hoch…', p); } });
      rs.on('error', reject); rs.pipe(req);
    });
  }
  /* Mod-Quellcode (mod-src/) aus der gewählten ZIP ins Repo schieben - dort baut GitHub Actions den Rift-Mod automatisch */
  async function syncModSource(zipPath) {
    const zip = new AdmZip(zipPath); let n = 0;
    for (const e of zip.getEntries()) {
      if (e.isDirectory) continue; const m = /^(?:[^/]+\/)?(mod-src\/.+)$/.exec(e.entryName.replace(/\\/g, '/')); if (!m) continue;
      const rel = m[1], b64 = e.getData().toString('base64'); let sha;
      try { const cur = await gh('GET', `/repos/${cfg.repo}/contents/${rel}?ref=${cfg.branch}`); sha = cur.sha; if (String(cur.content || '').replace(/\n/g, '') === b64) continue; } catch (er) { if (er.status !== 404) throw er; }
      await gh('PUT', `/repos/${cfg.repo}/contents/${rel}`, { message: 'Rift-Mod Quellcode', content: b64, sha, branch: cfg.branch }); n++;
    }
    return n;
  }
  /* Beta -> Full Release: gleiche Datei, jetzt fuer alle (neue ID, damit das Popup bei allen erscheint) */
  A('admin:promoteUpdate', async (id) => {
    needRepo();
    const { list } = await loadFeed(); const a = list.find((x) => x.id === id && x.type === 'update' && x.beta);
    if (!a) throw new Error('Beta-Update nicht gefunden.');
    try { const rel = await gh('GET', `/repos/${cfg.repo}/releases/tags/v${a.version}`); await gh('PATCH', `/repos/${cfg.repo}/releases/${rel.id}`, { prerelease: false }); } catch {}
    const full = { ...a, beta: undefined, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: `Rift Launcher ${a.version} ist da!`, createdAt: new Date().toISOString() };
    await saveFeed([full, ...prune(list).filter((x) => x.type !== 'update')], 'Full Release ' + a.version);
    return { version: a.version };
  });
  /* Cloud-Adresse (Cloudflare-Worker) fuer alle Spieler setzen: cloud.json im Feed-Repo */
  A('admin:setCloud', async (u, cfKey) => {
    needRepo(); u = String(u || '').trim().replace(/\/$/, ''); cfKey = String(cfKey || '').trim();
    if (!/^https:\/\/[\w.-]+(\/.*)?$/.test(u)) throw new Error('Bitte die volle Adresse mit https:// angeben.');
    let sha; try { sha = (await gh('GET', `/repos/${cfg.repo}/contents/cloud.json?ref=${cfg.branch}`)).sha; } catch (e) { if (e.status !== 404) throw e; }
    await gh('PUT', `/repos/${cfg.repo}/contents/cloud.json`, { message: 'Cloud-Adresse', branch: cfg.branch, sha, content: Buffer.from(JSON.stringify({ api: u, cfKey }, null, 2)).toString('base64') });
    setCloudApi(u, cfKey); return { api: u };
  });
  A('admin:publishUpdate', async (o) => {
    needRepo();
    const when = parseStart(o.startsAt);
    if (!o.filePath || !fs.existsSync(o.filePath)) throw new Error('Keine Datei gewählt.');
    progress('Prüfe Datei…', 0);
    const feed = (await loadFeed()).list;
    const base = [curVersion(), ...feed.filter((a) => a.type === 'update').map((a) => a.version)].filter(Boolean).sort(cmpVer).pop();
    let version = String(o.version || '').replace(/^v/, '').trim();
    const isExe = o.filePath.toLowerCase().endsWith('.exe');
    if (!version && isExe) { const m = /(\d+\.\d+\.\d+)/.exec(path.basename(o.filePath)); if (m) version = m[1]; }
    if (!version) { const [a, b, c] = base.split('.').map(Number); version = `${a}.${b}.${c + 1}`; }
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Version bitte als 1.2.3 angeben.');
    let up = { path: o.filePath, sha256: undefined, size: fs.statSync(o.filePath).size };
    if (!isExe) { progress('Baue Update-Paket…', 0); up = buildHotZip(o.filePath, version); }
    const tag = 'v' + version;
    let rel; try { rel = await gh('GET', `/repos/${cfg.repo}/releases/tags/${tag}`); } catch (e) { if (e.status !== 404) throw e; }
    if (rel) await gh('PATCH', `/repos/${cfg.repo}/releases/${rel.id}`, { name: 'Rift Launcher ' + version, body: o.notes || '', draft: false, prerelease: !!o.beta });
    else rel = await gh('POST', `/repos/${cfg.repo}/releases`, { tag_name: tag, target_commitish: cfg.branch, name: 'Rift Launcher ' + version, body: o.notes || '', draft: false, prerelease: !!o.beta });
    const name = (isExe ? `RiftLauncher-Setup-${version}.exe` : `rift-update-${version}.zip`);
    for (const a of rel.assets || []) if (a.name === name) await gh('DELETE', `/repos/${cfg.repo}/releases/assets/${a.id}`);
    const asset = await uploadAsset(`${rel.upload_url.replace(/\{.*$/, '')}?name=${encodeURIComponent(name)}`, up.path);
    progress('Sende an alle Spieler…', 100);
    const ann = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: 'update', title: o.beta ? `Rift Launcher ${version} Beta zum Testen` : `Rift Launcher ${version} ist da!`, message: o.notes || 'Ein neues Update steht bereit.', link: asset.browser_download_url, version, mandatory: !!o.mandatory && !o.beta, beta: !!o.beta || undefined, hot: !isExe, sha256: up.sha256, startsAt: when || undefined, createdAt: new Date().toISOString() };
    const keep = prune(feed).filter((x) => x.type !== 'update' || !!when || (o.beta && !x.beta));   // Beta ersetzt nur alte Betas, ein Full-Release ersetzt alles
    await saveFeed([ann, ...keep], (when ? 'Geplantes Update ' : 'Update ') + version);
    let modSynced = 0; if (!isExe) { try { progress('Rift-Mod-Quellcode abgleichen…', 100); modSynced = await syncModSource(o.filePath); } catch (e) { progress('Mod-Abgleich fehlgeschlagen: ' + e.message, 100); } }
    progress('Fertig!', 100);
    return { beta: !!o.beta, modSynced, version, hot: !isExe, startsAt: when, files: up.count || 0, mod: !!up.hasMod, size: up.size, release: rel.html_url };
  });
};
