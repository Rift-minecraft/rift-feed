/* Statistiken (Spielzeit) + Medien-Galerie (Screenshots, Clips, Aufnahmen) */
const fs = require('fs'), path = require('path');
const { nativeImage } = require('electron');

module.exports = function registerStats({ h, DATA, getProfiles, profileDir, shell }) {
  const FILE = path.join(DATA, 'stats.json');
  const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { sessions: [] }; } };
  const store = (d) => { try { fs.writeFileSync(FILE, JSON.stringify(d)); } catch {} };

  function record({ profile, start, end, server }) {
    const min = Math.round((end - start) / 60000 * 10) / 10;
    if (!(min >= 0.5)) return;
    const d = load(); d.sessions.push({ t: start, min, v: profile.mcVersion, l: profile.loader, p: profile.name, s: server ? server.host : '' });
    if (d.sessions.length > 5000) d.sessions = d.sessions.slice(-5000);
    store(d);
  }

  h('stats:get', () => load());

  /* ---------- Medien ---------- */
  const KINDS = { shot: 'screenshots', clip: 'rift-clips', rec: 'rift-recordings' };
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  function resolve(id) {
    let o; try { o = JSON.parse(Buffer.from(String(id), 'base64url').toString()); } catch { throw new Error('Ungültige Datei.'); }
    const prof = getProfiles().find((p) => p.id === o.p); if (!prof || !KINDS[o.k]) throw new Error('Ungültige Datei.');
    if (!o.n || /[\\/]|\.\./.test(o.n)) throw new Error('Ungültiger Name.');
    const dir = path.join(profileDir(prof), KINDS[o.k]);
    return { kind: o.k, dir, full: path.join(dir, o.n), name: o.n, prof };
  }
  const frameFiles = (dir) => { try { return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort(); } catch { return []; } };

  h('media:list', () => {
    const out = [];
    for (const prof of getProfiles()) {
      const base = profileDir(prof);
      try {
        for (const f of fs.readdirSync(path.join(base, 'screenshots'))) {
          if (!/\.png$/i.test(f)) continue;
          out.push({ id: enc({ p: prof.id, k: 'shot', n: f }), kind: 'shot', name: f, profile: prof.name, mtime: fs.statSync(path.join(base, 'screenshots', f)).mtimeMs });
        }
      } catch {}
      for (const k of ['clip', 'rec']) {
        try {
          for (const f of fs.readdirSync(path.join(base, KINDS[k]), { withFileTypes: true })) {
            if (!f.isDirectory()) continue;
            const dir = path.join(base, KINDS[k], f.name); let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); } catch {}
            out.push({ id: enc({ p: prof.id, k, n: f.name }), kind: k, name: f.name, profile: prof.name, mtime: fs.statSync(dir).mtimeMs, frames: frameFiles(dir).length, fps: meta.fps || 10, video: !!meta.segs, secs: meta.secs || 0 });
          }
        } catch {}
      }
    }
    return out.sort((a, b) => b.mtime - a.mtime).slice(0, 400);
  });

  const thumb = (file, w) => {
    const img = nativeImage.createFromPath(file); if (img.isEmpty()) throw new Error('Bild nicht lesbar.');
    const s = img.getSize(); const r = w && s.width > w ? img.resize({ width: w, quality: 'good' }) : img;
    return 'data:image/jpeg;base64,' + r.toJPEG(82).toString('base64');
  };
  h('media:thumb', ({ id, width }) => {
    const r = resolve(id);
    if (r.kind === 'shot') return thumb(r.full, width || 360);
    const poster = path.join(r.full, 'poster.jpg'); if (fs.existsSync(poster)) return thumb(poster, width || 360);
    const f = frameFiles(r.full); if (!f.length) throw new Error('Leer.');
    return thumb(path.join(r.full, f[Math.floor(f.length / 2)]), width || 360);
  });
  h('media:frames', ({ id, width }) => {                          // Clip komplett (max. 400 Bilder) zum Abspielen
    const r = resolve(id); if (r.kind === 'shot') throw new Error('Kein Clip.');
    const f = frameFiles(r.full); const step = Math.max(1, Math.ceil(f.length / 400));
    return f.filter((_, i) => i % step === 0).map((n) => thumb(path.join(r.full, n), width || 640));
  });
  h('media:videos', (id) => {                                      // Clips/Aufnahmen aus der Bildschirmaufnahme (WebM-Teile, der Reihe nach abspielen)
    const r = resolve(id); let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(r.full, 'meta.json'), 'utf8')); } catch {}
    return (meta.segs || []).filter((n) => /^[\w.-]+\.webm$/.test(n)).map((n) => require('url').pathToFileURL(path.join(r.full, n)).href);
  });
  h('media:full', (id) => { const r = resolve(id); return 'data:image/png;base64,' + fs.readFileSync(r.full).toString('base64'); });
  h('media:reveal', (id) => { const r = resolve(id); if (fs.existsSync(r.full)) shell.showItemInFolder(r.full); else shell.openPath(r.dir); return true; });
  h('media:delete', (id) => { const r = resolve(id); fs.rmSync(r.full, { recursive: true, force: true }); return true; });

  return { record };
};
