/* Server Hub: gespeicherte Server + Live-Status (Minecraft Server List Ping, ohne Abhängigkeiten) */
const net = require('net'), dns = require('dns').promises, fs = require('fs'), path = require('path');

const vi = (n) => { const o = []; do { let b = n & 127; n >>>= 7; if (n) b |= 128; o.push(b); } while (n); return Buffer.from(o); };
const pstr = (s) => { const b = Buffer.from(s, 'utf8'); return Buffer.concat([vi(b.length), b]); };
const packet = (id, data) => { const body = Buffer.concat([vi(id), data]); return Buffer.concat([vi(body.length), body]); };
function readVar(buf, off) { let r = 0, s = 0, b; do { if (off >= buf.length) return null; b = buf[off++]; r |= (b & 127) << s; s += 7; if (s > 35) throw new Error('VarInt'); } while (b & 128); return [r, off]; }

function text(d) {                                              // MOTD (String oder Chat-Komponente) -> reiner Text
  if (d == null) return '';
  if (typeof d === 'string') return d.replace(/§./g, '');
  let s = (d.text || '') + (d.translate && !d.text ? d.translate : '');
  (d.extra || []).forEach((e) => { s += text(e); });
  return s.replace(/§./g, '');
}

async function resolve(host, port) {
  if (port === 25565 && !net.isIP(host)) {
    try { const r = await dns.resolveSrv('_minecraft._tcp.' + host); if (r[0]) return { host: r[0].name, port: r[0].port }; } catch {}
  }
  return { host, port };
}

function ping(host, port = 25565, timeout = 4500) {
  return resolve(host, port).then((t) => new Promise((resolve_) => {
    const t0 = Date.now(); let done = false, buf = Buffer.alloc(0);
    const sock = net.connect({ host: t.host, port: t.port });
    const fin = (r) => { if (done) return; done = true; clearTimeout(tm); sock.destroy(); resolve_(r); };
    const tm = setTimeout(() => fin({ online: false, error: 'Zeitüberschreitung' }), timeout);
    sock.on('error', (e) => fin({ online: false, error: e.code === 'ENOTFOUND' ? 'Adresse nicht gefunden' : e.code === 'ECONNREFUSED' ? 'Verbindung abgelehnt' : e.message }));
    sock.on('connect', () => {
      const hs = Buffer.concat([vi(765), pstr(host), Buffer.from([port >> 8, port & 255]), vi(1)]);
      sock.write(Buffer.concat([packet(0, hs), packet(0, Buffer.alloc(0))]));
    });
    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      try {
        const a = readVar(buf, 0); if (!a) return;
        const [len, o1] = a; if (buf.length < o1 + len) return;
        const b = readVar(buf, o1); if (!b) return;
        const [, o2] = b; const c = readVar(buf, o2); if (!c) return;
        const [jl, o3] = c; if (buf.length < o3 + jl) return;
        const j = JSON.parse(buf.slice(o3, o3 + jl).toString('utf8'));
        fin({
          online: true, ms: Date.now() - t0, motd: text(j.description).trim(),
          players: j.players?.online ?? 0, max: j.players?.max ?? 0,
          version: j.version?.name || '', favicon: typeof j.favicon === 'string' ? j.favicon : ''
        });
      } catch (e) { if (buf.length > 1 << 20) fin({ online: false, error: 'Ungültige Antwort' }); }
    });
  }));
}

const validHost = (h) => /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/i.test(h) || net.isIP(h);

module.exports = function registerServers({ h, DATA }) {
  const FILE = path.join(DATA, 'servers.json');
  const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } };
  const store = (l) => fs.writeFileSync(FILE, JSON.stringify(l, null, 2));
  const parse = (addr) => {
    const m = String(addr || '').trim().toLowerCase().replace(/^minecraft:\/\//, '').match(/^([^:\s]+)(?::(\d{1,5}))?$/);
    if (!m || !validHost(m[1])) throw new Error('Ungültige Serveradresse.');
    const port = m[2] ? +m[2] : 25565; if (port < 1 || port > 65535) throw new Error('Ungültiger Port.');
    return { host: m[1], port };
  };
  h('servers:list', () => load());
  h('servers:save', ({ name, address }) => {
    const { host, port } = parse(address); const l = load();
    if (l.length >= 50) throw new Error('Maximal 50 Server.');
    if (l.some((s) => s.host === host && s.port === port)) throw new Error('Server ist schon gespeichert.');
    l.push({ id: Date.now().toString(36), name: String(name || host).slice(0, 40), host, port });
    store(l); return l;
  });
  h('servers:delete', (id) => { const l = load().filter((s) => s.id !== id); store(l); return l; });
  h('servers:ping', ({ host, port }) => { const p = parse(host + ':' + (port || 25565)); return ping(p.host, p.port); });
};
module.exports.ping = ping;
