/* Eigener Server auf dem eigenen PC (Vanilla), mit Konsole. Erreichbar über localhost bzw. im WLAN/LAN. */
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');

module.exports = function registerLocalServer({ h, send, DATA, getJSON, download, requiredJava, ensureJava, shell, app, AdmZip }) {
  const ROOT = path.join(DATA, 'localservers');
  const FILE = path.join(ROOT, 'servers.json');
  const procs = new Map();                                       // id -> { p, status }
  const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } };
  const store = (l) => { fs.mkdirSync(ROOT, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(l, null, 2)); };
  const dirOf = (id) => { if (!/^[a-z0-9]+$/.test(id)) throw new Error('Ungültige ID.'); return path.join(ROOT, id); };
  const get = (id) => { const s = load().find((x) => x.id === id); if (!s) throw new Error('Server nicht gefunden.'); return s; };
  const lanIp = () => { for (const l of Object.values(os.networkInterfaces())) for (const a of l || []) if (a.family === 'IPv4' && !a.internal) return a.address; return ''; };
  const view = () => load().map((s) => ({ ...s, status: procs.get(s.id)?.status || 'stopped', jar: fs.existsSync(path.join(dirOf(s.id), 'server.jar')), lan: lanIp() }));
  const setStatus = (id, status) => { const e = procs.get(id); if (e) e.status = status; send('lserver:state', { id, status }); };

  const props = (s) => ['server-port=' + s.port, 'motd=' + String(s.motd).replace(/[\r\n=]/g, ' '), 'max-players=' + s.maxPlayers, 'online-mode=' + !!s.onlineMode,
    'gamemode=' + s.gamemode, 'difficulty=' + s.difficulty, 'enable-command-block=true', 'level-name=world'].join('\n') + '\n';

  h('lserver:list', () => view());

  h('lserver:create', async (o) => {
    const l = load(); if (l.length >= 10) throw new Error('Maximal 10 lokale Server.');
    if (!o.eula) throw new Error('Du musst der Minecraft-EULA zustimmen (https://aka.ms/MinecraftEULA).');
    const version = String(o.version || ''); if (!/^[0-9a-z.\-_]{1,24}$/i.test(version)) throw new Error('Ungültige Version.');
    const port = Math.max(1024, Math.min(65535, +o.port || 25565));
    if (l.some((x) => x.port === port)) throw new Error('Dieser Port ist bei einem anderen Server schon eingetragen.');
    const s = {
      id: Date.now().toString(36), name: String(o.name || 'Mein Server').slice(0, 40), version, port, ram: Math.max(1, Math.min(32, +o.ram || 2)),
      motd: String(o.motd || 'Ein Rift-Server').slice(0, 80), maxPlayers: Math.max(1, Math.min(200, +o.maxPlayers || 10)),
      onlineMode: o.onlineMode !== false, gamemode: ['survival', 'creative', 'adventure'].includes(o.gamemode) ? o.gamemode : 'survival',
      difficulty: ['peaceful', 'easy', 'normal', 'hard'].includes(o.difficulty) ? o.difficulty : 'normal'
    };
    const dir = dirOf(s.id); fs.mkdirSync(dir, { recursive: true });
    send('lserver:state', { id: s.id, status: 'downloading' });
    try {
      const man = await getJSON('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
      const v = man.versions.find((x) => x.id === version); if (!v) throw new Error('Version ' + version + ' gibt es nicht.');
      const vj = await getJSON(v.url);
      const url = vj.downloads?.server?.url; if (!url) throw new Error('Für ' + version + ' gibt es keinen Server-Download.');
      await download(url, path.join(dir, 'server.jar'));
      fs.writeFileSync(path.join(dir, 'eula.txt'), 'eula=true\n'); fs.writeFileSync(path.join(dir, 'server.properties'), props(s));
    } catch (e) { fs.rmSync(dir, { recursive: true, force: true }); send('lserver:state', { id: s.id, status: 'stopped' }); throw e; }
    l.push(s); store(l); return view();
  });

  h('lserver:start', async (id) => {
    const s = get(id); if (procs.has(id)) throw new Error('Läuft bereits.');
    const dir = dirOf(id); if (!fs.existsSync(path.join(dir, 'server.jar'))) throw new Error('server.jar fehlt.');
    fs.writeFileSync(path.join(dir, 'server.properties'), props(s));   // Einstellungen immer aktuell halten (Rest der Datei wird neu erzeugt)
    procs.set(id, { p: null, status: 'starting' }); send('lserver:state', { id, status: 'starting' });
    try {
      const java = await ensureJava(await requiredJava(s.version));
      const p = spawn(java, [`-Xmx${s.ram}G`, '-Xms512M', '-jar', 'server.jar', 'nogui'], { cwd: dir, windowsHide: true });
      procs.get(id).p = p;
      const feed = (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((line) => {
        send('lserver:log', { id, line });
        if (/\]: Done \(/.test(line)) setStatus(id, 'running');
      });
      p.stdout.on('data', feed); p.stderr.on('data', feed);
      p.on('error', (e) => { send('lserver:log', { id, line: 'Fehler: ' + e.message }); procs.delete(id); send('lserver:state', { id, status: 'stopped' }); });
      p.on('close', (code) => { unshare(id); procs.delete(id); send('lserver:log', { id, line: `— Server beendet (Code ${code}) —` }); send('lserver:state', { id, status: 'stopped' }); });
    } catch (e) { procs.delete(id); send('lserver:state', { id, status: 'stopped' }); throw e; }
    return true;
  });

  const stop = (id) => {
    const e = procs.get(id); if (!e || !e.p) return;
    setStatus(id, 'stopping');
    try { e.p.stdin.write('stop\n'); } catch {}
    setTimeout(() => { if (procs.get(id)?.p === e.p) try { e.p.kill(); } catch {} }, 25000);
  };
  h('lserver:stop', (id) => { stop(id); return true; });
  h('lserver:command', ({ id, cmd }) => {
    const e = procs.get(id); if (!e?.p) throw new Error('Server läuft nicht.');
    const c = String(cmd || '').replace(/[\r\n]/g, '').slice(0, 300); if (!c) return true;
    e.p.stdin.write(c.replace(/^\//, '') + '\n'); send('lserver:log', { id, line: '> ' + c }); return true;
  });
  h('lserver:delete', (id) => {
    if (procs.has(id)) throw new Error('Erst den Server stoppen.');
    store(load().filter((s) => s.id !== id)); fs.rmSync(dirOf(id), { recursive: true, force: true }); return view();
  });
  /* Tunnel fuer Freunde (bore.pub, kostenlos, ohne Konto): macht den lokalen Port unter bore.pub:<port> erreichbar */
  const tunnels = new Map();   // id -> { p, addr }
  const boreExe = async () => {
    const win = process.platform === 'win32', dir = path.join(ROOT, 'bore'), exe = path.join(dir, win ? 'bore.exe' : 'bore');
    if (fs.existsSync(exe)) return exe;
    const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64', triple = win ? `${arch}-pc-windows-msvc` : process.platform === 'darwin' ? `${arch}-apple-darwin` : `${arch}-unknown-linux-musl`;
    const ver = '0.5.2', url = `https://github.com/ekzhang/bore/releases/download/v${ver}/bore-v${ver}-${triple}.${win ? 'zip' : 'tar.gz'}`;
    fs.mkdirSync(dir, { recursive: true }); const tmp = path.join(dir, 'dl' + (win ? '.zip' : '.tar.gz')); await download(url, tmp);
    if (win) { new AdmZip(tmp).extractAllTo(dir, true); } else { await new Promise((res, rej) => spawn('tar', ['-xzf', tmp, '-C', dir]).on('close', (c) => (c === 0 ? res() : rej(new Error('Entpacken fehlgeschlagen'))))); fs.chmodSync(exe, 0o755); }
    try { fs.unlinkSync(tmp); } catch {}
    if (!fs.existsSync(exe)) throw new Error('Tunnel-Programm nicht gefunden.'); return exe;
  };
  const unshare = (id) => { const t = tunnels.get(id); if (t) { try { t.p.kill(); } catch {} tunnels.delete(id); send('lserver:share', { id, addr: '' }); } };
  h('lserver:share', async (id) => {
    const s = get(id); if (!procs.has(id)) throw new Error('Starte den Server zuerst.');
    if (tunnels.get(id)) return { addr: tunnels.get(id).addr };
    const exe = await boreExe();
    return await new Promise((resolve, reject) => {
      const p = spawn(exe, ['local', String(s.port), '--to', 'bore.pub'], { windowsHide: true }); let done = false;
      const to = setTimeout(() => { if (!done) { done = true; try { p.kill(); } catch {} reject(new Error('Tunnel nicht erreichbar (bore.pub). Internet/Firewall prüfen.')); } }, 20000);
      const on = (d) => { const m = /bore\.pub:(\d{2,5})/.exec(String(d)); if (m && !done) { done = true; clearTimeout(to); const addr = 'bore.pub:' + m[1]; tunnels.set(id, { p, addr }); send('lserver:share', { id, addr }); resolve({ addr }); } };
      p.stdout.on('data', on); p.stderr.on('data', on);
      p.on('close', () => { clearTimeout(to); if (tunnels.get(id)?.p === p) { tunnels.delete(id); send('lserver:share', { id, addr: '' }); } if (!done) { done = true; reject(new Error('Tunnel beendet.')); } });
      p.on('error', (e) => { if (!done) { done = true; clearTimeout(to); reject(e); } });
    });
  });
  h('lserver:unshare', (id) => { unshare(id); return true; });
  h('lserver:info', (id) => { const s = get(id); return { id, name: s.name, version: s.version, port: s.port, addr: tunnels.get(id)?.addr || '' }; });
  h('lserver:folder', (id) => { shell.openPath(dirOf(id)); return true; });

  app.on('before-quit', () => { for (const [, t] of tunnels) try { t.p.kill(); } catch {} for (const [, e] of procs) try { e.p?.stdin.write('stop\n'); } catch {} });
};
