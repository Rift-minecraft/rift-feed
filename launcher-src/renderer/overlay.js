/* Rift-Overlay (rendert in einem durchsichtigen Fenster über Minecraft) */
const $ = (s, r = document) => r.querySelector(s), api = (c, ...a) => rift.invoke(c, ...a);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let cfg = null, ctx = null, size = { w: innerWidth, h: innerHeight }, menuOpen = false, editor = false, tab = 'widgets', pressed = new Set(), fps = 0, sys = { cpu: 0, ramUsed: 0 }, pingMs = null, hidden = false;
const clicks = { l: [], r: [], tl: 0, tr: 0, max: 0 }, fpsHist = [], cpuHist = [], frameHist = [];
const sw = { run: false, t0: 0, acc: 0 }, tm = { run: false, end: 0, left: 0 }, po = { run: false, phase: 'work', end: 0 }; let ctr = 0, battery = null, remindAt = Date.now() + 45 * 60000;
try { navigator.getBattery && navigator.getBattery().then((b) => { battery = b; }); } catch {}
const say = (t) => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => e.classList.remove('on'), 2200); };
const save = (p) => api('overlay:set', p).then((c) => { cfg = c; applyUi(); paint(); });

/* ---------- Pixel-Icons (8x8) ---------- */
const BM = {
  keystrokes: '.##.....|.##.....|##.##.##|##.##.##|........|.######.|.######.|........',
  cps: '..####..|.#.##.#.|.#.##.#.|.######.|.######.|.######.|..####..|........',
  clicks: '..#.#...|..#.#...|######..|..#.#...|######..|..#.#...|..#.#...|........',
  fps: '########|#......#|#.####.#|#.#..#.#|#.####.#|#......#|########|..####..',
  fpsavg: '........|.....#..|.#...#..|.#.#.#..|.#.#.##.|.#.#.##.|########|........',
  fpsgraph: '........|......#.|.#...#.#|.#..#..#|##.#...#|#.##....|........|########',
  frametime: '..####..|.#....#.|#..##..#|#..#...#|#......#|.#....#.|..####..|........',
  clock: '..####..|.#.##.#.|#..##..#|#..###.#|#......#|.#....#.|..####..|........',
  date: '.#....#.|########|#......#|#.#.#..#|#......#|#.#.#.##|#......#|########',
  session: '########|.#....#.|..#..#..|...##...|...##...|..#..#..|.#.##.#.|########',
  sys: '.#.#.#..|########|#.####.#|##.##.##|#.####.#|########|.#.#.#..|........',
  cpugraph: '........|#.......|#...#...|#.#.#.#.|#.#.#.#.|#.#.#.#.|########|........',
  battery: '..####..|########|#......#|#.####.#|#.####.#|#.####.#|#......#|########',
  ping: '.......#|.......#|.....#.#|.....#.#|...#.#.#|...#.#.#|.#.#.#.#|.#.#.#.#',
  server: '########|#.#..#.#|########|########|#.#..#.#|########|..#..#..|.######.',
  profile: '..####..|..####..|..####..|...##...|.######.|########|########|########',
  watermark: '...##...|...##...|..####..|########|########|..####..|...##...|...##...',
  stopwatch: '..####..|...##...|..#..#..|.#.##.#.|.#.##.#.|.#....#.|..#..#..|...##...',
  timer: '.######.|#.#..#.#|#..#.#.#|#...##.#|#......#|#......#|.######.|........',
  pomodoro: '...#....|..###...|.##.##..|########|########|########|.######.|..####..',
  counter: '...##...|...##...|...##...|########|########|...##...|...##...|...##...',
  notes: '.######.|.#....#.|.#.##.#.|.#....#.|.#.##.#.|.#....#.|.#.##.#.|.######.',
  customtext: '########|########|...##...|...##...|...##...|...##...|...##...|...##...',
  coins: '..####..|.#....#.|#..##..#|#.#..#.#|#.#..#.#|#..##..#|.#....#.|..####..',
  lowfps: '........|#.......|##......|###.....|####....|#####...|######..|########',
  reminder: '...##...|..####..|.######.|.######.|.######.|########|........|...##...',
  crosshair: '...##...|...##...|...##...|###..###|###..###|...##...|...##...|...##...'
};
function icon(k, px = 24, col = 'currentColor') {
  const rows = (BM[k] || BM.watermark).split('|'); let r = '';
  rows.forEach((row, y) => { for (let x = 0; x < 8; x++) if (row[x] === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; });
  return `<svg class="ic" width="${px}" height="${px}" viewBox="0 0 8 8" shape-rendering="crispEdges" fill="${col}">${r}</svg>`;
}
const NAMES = { keystrokes: 'Tasten (WASD)', cps: 'CPS', clicks: 'Klick-Zähler', fps: 'FPS (~)', fpsavg: 'FPS Min/Ø/Max', fpsgraph: 'FPS-Verlauf', frametime: 'Frame-Zeit', clock: 'Uhrzeit', date: 'Datum', session: 'Spielzeit', sys: 'CPU / RAM', cpugraph: 'CPU-Verlauf', battery: 'Akku', ping: 'Ping', server: 'Server', profile: 'Profil / Version', watermark: 'Rift-Logo', stopwatch: 'Stoppuhr', timer: 'Timer', pomodoro: 'Pomodoro', counter: 'Zähler', notes: 'Notizen', customtext: 'Eigener Text', crosshair: 'Fadenkreuz', lowfps: '1% Low FPS', reminder: 'Pausen-Erinnerung', coins: 'Coins (Sitzung)' };
const WIDGETS = Object.keys(NAMES);

/* ---------- Aussehen ---------- */
function applyUi() {
  const u = cfg.ui, r = document.documentElement.style;
  r.setProperty('--acc', u.accent); r.setProperty('--txt', u.text); r.setProperty('--fs', u.size + 'px'); r.setProperty('--rad', u.radius + 'px');
  r.setProperty('--font', `'${u.font}', system-ui, sans-serif`); r.setProperty('--hudbg', `rgba(14,14,20,${u.hudAlpha})`); r.setProperty('--menua', u.menuAlpha); r.setProperty('--sc', u.scale);
  document.body.classList.toggle('noshadow', !u.shadow); document.body.classList.toggle('nobg', !u.hudBg);
}

/* ---------- HUDs ---------- */
const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 3600) ? Math.floor(s / 3600) + ':' : ''}${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const graph = (a, max, w = 120, h = 28) => { if (a.length < 2) return ''; const m = max || Math.max(...a, 1); return `<svg class="g" width="${w}" height="${h}"><polyline fill="none" stroke="var(--acc)" stroke-width="1.5" points="${a.map((v, i) => `${(i / (a.length - 1) * w).toFixed(1)},${(h - Math.min(1, v / m) * (h - 2) - 1).toFixed(1)}`).join(' ')}"/></svg>`; };
function wHtml(k) {
  const now = Date.now(), o = cfg.opt, cps = (a) => { while (a.length && now - a[0] > 1000) a.shift(); return a.length; };
  const kk = (v) => pressed.has(v) ? 'on' : '';
  switch (k) {
    case 'keystrokes': return `<div class="keys"><i></i><i class="${kk(87)}">W</i><i></i><i class="${kk(65)}">A</i><i class="${kk(83)}">S</i><i class="${kk(68)}">D</i><i class="w2 ${kk(32)}">▬▬</i></div>`;
    case 'cps': { const l = cps(clicks.l), r = cps(clicks.r); clicks.max = Math.max(clicks.max, l, r); return `CPS <b>${l}</b> | <b>${r}</b> <small style="opacity:.6">max ${clicks.max}</small>`; }
    case 'clicks': return `Klicks <b>${clicks.tl}</b> | <b>${clicks.tr}</b>`;
    case 'fps': return `FPS <b>${fps ? '~' + fps : '–'}</b>`;
    case 'fpsavg': { if (!fpsHist.length) return 'FPS –'; const a = fpsHist; return `FPS min <b>${Math.min(...a)}</b> Ø <b>${Math.round(a.reduce((x, y) => x + y, 0) / a.length)}</b> max <b>${Math.max(...a)}</b>`; }
    case 'fpsgraph': return `FPS ${graph(fpsHist, 0)}`;
    case 'frametime': return `Frame <b>${fps ? (1000 / fps).toFixed(1) + ' ms' : '–'}</b>`;
    case 'clock': return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'date': return new Date().toLocaleDateString([], { weekday: 'short', day: '2-digit', month: '2-digit' });
    case 'session': return 'Spielzeit <b>' + mmss(now - (ctx?.t0 || now)) + '</b>';
    case 'sys': return `CPU <b>${Math.round(sys.cpu)}%</b> · RAM <b>${Math.round(sys.ramUsed * 100)}%</b>`;
    case 'cpugraph': return `CPU ${graph(cpuHist, 100)}`;
    case 'battery': return battery ? `Akku <b>${Math.round(battery.level * 100)}%</b>${battery.charging ? ' ⚡' : ''}` : 'Akku –';
    case 'ping': return `Ping <b>${pingMs == null ? '–' : pingMs + ' ms'}</b>`;
    case 'server': return ctx?.server?.host ? 'Server <b>' + esc(ctx.server.host) + '</b>' : 'Einzelspieler / manuell';
    case 'profile': return ctx?.name ? `<b>${esc(ctx.name)}</b> ${esc(ctx.mc || '')}` : 'Rift';
    case 'watermark': return '<img src="logo.png" style="height:1.1em;vertical-align:-3px"> <b>RIFT</b>';
    case 'stopwatch': return 'Stoppuhr <b>' + mmss(sw.acc + (sw.run ? now - sw.t0 : 0)) + '</b>';
    case 'timer': return 'Timer <b>' + mmss(tm.run ? tm.end - now : tm.left || o.timerMin * 60000) + '</b>';
    case 'pomodoro': return `${po.phase === 'work' ? 'Fokus' : 'Pause'} <b>${mmss(po.run ? po.end - now : (po.phase === 'work' ? 25 : 5) * 60000)}</b>`;
    case 'counter': return `${esc(o.counterLabel)} <b>${ctr}</b>`;
    case 'notes': return `<div class="notes">${esc(o.notes)}</div>`;
    case 'customtext': return esc(o.text);
    case 'coins': return `Coins <b>+${Math.floor((now - (ctx?.t0 || now)) / 60000)}</b>`;
    case 'lowfps': { if (fpsHist.length < 5) return '1% Low –'; const a = [...fpsHist].sort((x, y) => x - y); return `1% Low <b>${a[Math.floor(a.length * 0.01)]}</b>`; }
    case 'reminder': return `Pause in <b>${mmss(Math.max(0, remindAt - now))}</b>`;
    case 'crosshair': { const c = o.crosshair, s = +c.size, sh = c.shape; const w = s * 2 + 4; let d = ''; if (sh === 'dot') d = `<circle cx="${w / 2}" cy="${w / 2}" r="${Math.max(1.5, s / 6)}" fill="${c.color}"/>`; else if (sh === 'circle') d = `<circle cx="${w / 2}" cy="${w / 2}" r="${s * .7}" fill="none" stroke="${c.color}" stroke-width="2"/>`; else d = `<path d="M${w / 2} 2v${s * .7}M${w / 2} ${w - 2}v-${s * .7}M2 ${w / 2}h${s * .7}M${w - 2} ${w / 2}h-${s * .7}" stroke="${c.color}" stroke-width="2"/>`; return `<svg width="${w}" height="${w}">${d}</svg>`; }
  }
  return '';
}
function paintHuds() {
  const box = $('#huds'), vis = !hidden || menuOpen;
  for (const k of WIDGETS) {
    let el = box.querySelector(`[data-k="${k}"]`); const c = cfg.hud[k];
    if (!c.on || !vis) { el && el.remove(); continue; }
    if (!el) { el = document.createElement('div'); el.className = 'hud' + (k === 'keystrokes' ? ' k' : ''); el.dataset.k = k; box.appendChild(el); el.onpointerdown = (e) => editor && startDrag(k, el, e); }
    const h = wHtml(k); if (el._h !== h) { el.innerHTML = h; el._h = h; }
    if (el._drag) continue;
    el.classList.remove('r', 'c');
    if (c.x === -1) { el.classList.add('r'); el.style.left = 'auto'; el.style.right = '24px'; el.style.top = c.y + 'px'; }
    else if (c.x === -2) { el.classList.add('c'); el.style.right = 'auto'; el.style.left = '50%'; el.style.top = '50%'; }
    else { el.style.right = 'auto'; el.style.left = c.x + 'px'; el.style.top = (c.y < 0 ? 24 : c.y) + 'px'; }
  }
}
setInterval(() => { if (cfg) paintHuds(); }, 200);
setInterval(() => { if (fps) { fpsHist.push(fps); if (fpsHist.length > 60) fpsHist.shift(); } }, 1000);

/* ---------- Editor: Streifen links, Drag & Drop ---------- */
const STRIP_W = 66;
function paintStrip() {
  const s = $('#strip'); s.hidden = !editor; $('#edhint').hidden = !editor; if (!editor) return;
  s.innerHTML = '<button class="done" title="Fertig (Esc)">✓</button>' + WIDGETS.map((k) => `<div class="si ${cfg.hud[k].on ? 'on' : ''}" data-k="${k}" title="${NAMES[k]}">${icon(k, 28)}</div>`).join('');
  s.querySelector('.done').onclick = () => api('overlay:menuClose');
  s.querySelectorAll('.si').forEach((b) => b.onpointerdown = (e) => { const k = b.dataset.k, x0 = e.clientX, y0 = e.clientY; let moved = false; const g = document.createElement('div'); g.id = 'ghost'; g.innerHTML = icon(k, 36, 'var(--acc)'); document.body.appendChild(g);
    const mv = (m) => { if (Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) > 5) moved = true; g.style.left = m.clientX - 18 + 'px'; g.style.top = m.clientY - 18 + 'px'; };
    const up = (m) => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); g.remove();
      if (!moved) return save({ hud: { [k]: { ...cfg.hud[k], on: !cfg.hud[k].on } } }).then(paintStrip);
      if (m.clientX > STRIP_W) save({ hud: { [k]: { on: true, x: Math.round(m.clientX - 20), y: Math.round(m.clientY - 12) } } }).then(paintStrip); };
    mv(e); document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); });
}
function startDrag(k, el, e) {
  e.preventDefault(); const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top; el._drag = true; el.classList.remove('r', 'c'); el.style.right = 'auto'; el.style.transform = `scale(var(--sc))`;
  const mv = (m) => { el.style.left = Math.max(0, m.clientX - dx) + 'px'; el.style.top = Math.max(0, m.clientY - dy) + 'px'; };
  const up = (m) => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); el._drag = false; el.style.transform = '';
    if (m.clientX < STRIP_W) save({ hud: { [k]: { ...cfg.hud[k], on: false } } }).then(paintStrip); else save({ hud: { [k]: { on: true, x: Math.max(0, Math.round(m.clientX - dx)), y: Math.max(0, Math.round(m.clientY - dy)) } } }); };
  mv(e); document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}
function setEditor(on) { editor = on; document.body.classList.toggle('edit', menuOpen); $('#menu').hidden = !menuOpen || editor; paintStrip(); if (menuOpen && !editor) paint(); }

/* ---------- Events ---------- */
rift.on('overlay:size', (s) => { size = s; });
rift.on('overlay:keys', (arr) => { const was = pressed; pressed = new Set(arr); const t = Date.now(); if (pressed.has(1) && !was.has(1)) { clicks.l.push(t); clicks.tl++; } if (pressed.has(2) && !was.has(2)) { clicks.r.push(t); clicks.tr++; } });
rift.on('overlay:sys', (s) => { sys = s; cpuHist.push(s.cpu); if (cpuHist.length > 40) cpuHist.shift(); });
rift.on('overlay:cfg', (c) => { cfg = c; applyUi(); syncCapture(); });
rift.on('overlay:ctx', (c) => { ctx = { ...(ctx || {}), ...c }; });
rift.on('overlay:menu', (o) => { menuOpen = o; if (!o) editor = false; document.body.classList.toggle('edit', o); $('#menu').hidden = !o || editor; paintStrip(); if (o && !editor) paint(); });
rift.on('overlay:cmd', (c) => {
  const now = Date.now();
  if (c === 'clip') saveClip(); else if (c === 'rec') toggleRec(); else if (c === 'editor') setEditor(true);
  else if (c === 'hideHuds') { hidden = !hidden; say(hidden ? 'Overlays aus' : 'Overlays an'); }
  else if (c === 'swToggle') { if (sw.run) { sw.acc += now - sw.t0; sw.run = false; } else { sw.t0 = now; sw.run = true; } }
  else if (c === 'swReset') { sw.acc = 0; sw.t0 = now; }
  else if (c === 'timerToggle') { if (tm.run) { tm.left = tm.end - now; tm.run = false; } else { tm.end = now + (tm.left || cfg.opt.timerMin * 60000); tm.run = true; } }
  else if (c === 'ctrInc') ctr++; else if (c === 'ctrReset') ctr = 0;
  else if (c === 'pomoToggle') { po.run = !po.run; if (po.run) po.end = now + (po.phase === 'work' ? 25 : 5) * 60000; }
  else if (c === 'crosshairToggle') save({ hud: { crosshair: { ...cfg.hud.crosshair, on: !cfg.hud.crosshair.on } } });
  else if (c === 'media') api('overlay:nav', 'media');
});
setInterval(() => { const n = Date.now(); if (cfg && cfg.hud.reminder.on && n >= remindAt) { remindAt = n + cfg.opt.breakMin * 60000; say('☕ Zeit für eine Pause – trink was!'); } if (tm.run && n >= tm.end) { tm.run = false; tm.left = 0; say('⏰ Timer abgelaufen'); } if (po.run && n >= po.end) { po.phase = po.phase === 'work' ? 'break' : 'work'; po.end = n + (po.phase === 'work' ? 25 : 5) * 60000; say(po.phase === 'work' ? 'Fokus-Zeit' : '☕ Pause!'); } }, 500);
rift.on('lserver:log', ({ id, line }) => { (hostLogs[id] = hostLogs[id] || []).push(line); if (hostLogs[id].length > 150) hostLogs[id].shift(); const el = document.querySelector(`.log[data-id="${id}"]`); if (el) { el.textContent = hostLogs[id].join('\n'); el.scrollTop = el.scrollHeight; } });
rift.on('lserver:share', ({ id, addr }) => { hostAddr[id] = addr; if (menuOpen && tab === 'host') paintHost(); });
rift.on('invite:new', (l) => l.forEach((i) => say(i.fromName + ' lädt dich auf ' + i.name + ' ein – im Launcher beitreten')));
rift.on('lserver:state', ({ id, status }) => { hostStatus[id] = status; if (menuOpen && tab === 'host') paintHost(); });


/* ---------- Bildschirm-Aufnahme: FPS (~), Clip-Puffer (30 s), Aufnahme ---------- */
let stream = null, vid = $('#cap'), segs = [], segRec = null, segTimer = null, fullRec = null, fpsN = 0, fpsT = 0;
async function startCapture() {
  if (stream) return;
  try {
    const id = await api('overlay:screenId'); if (!id) return;
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id, maxWidth: 1280, maxHeight: 720, maxFrameRate: 60 } } });
    vid.srcObject = stream; await vid.play();
    const tick = (now) => { fpsN++; if (now - fpsT >= 1000) { fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now; } vid.requestVideoFrameCallback(tick); };
    vid.requestVideoFrameCallback(tick);
    if (cfg.clipBuffer) segLoop();
  } catch (e) { say('Aufnahme nicht möglich: ' + e.message); }
}
function stopCapture() { clearTimeout(segTimer); try { segRec?.stop(); } catch {} segRec = null; segs = []; stream?.getTracks().forEach((t) => t.stop()); stream = null; fps = 0; }
function segLoop() {
  if (!stream || !cfg.clipBuffer) return;
  const r = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 2500000 }); const parts = [];
  r.ondataavailable = (e) => e.data.size && parts.push(e.data);
  r.onstop = () => { if (parts.length) { segs.push(new Blob(parts, { type: 'video/webm' })); if (segs.length > 6) segs.shift(); } };
  r.start(); segRec = r; segTimer = setTimeout(() => { try { r.stop(); } catch {} segLoop(); }, 5000);
}
function syncCapture() { if (!cfg) return; (cfg.clipBuffer || cfg.hud.fps.on || fullRec) ? startCapture() : stopCapture(); }
const poster = () => { try { const c = document.createElement('canvas'); c.width = 480; c.height = Math.round(480 * vid.videoHeight / vid.videoWidth) || 270; c.getContext('2d').drawImage(vid, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .7); } catch { return ''; } };
async function saveClip() {
  if (!cfg.clipBuffer) return say('Clip-Puffer ist aus (Menü → Kamera).');
  if (!segs.length) return say('Puffer noch leer – kurz warten.');
  try { const bufs = await Promise.all(segs.map((b) => b.arrayBuffer())); await api('overlay:saveClip', { segs: bufs, poster: poster(), secs: bufs.length * 5 }); say('Clip der letzten ~' + bufs.length * 5 + ' s gespeichert'); } catch (e) { say(e.message); }
}
async function toggleRec() {
  if (fullRec) { const r = fullRec; fullRec = null; r.onstop = async () => { await api('overlay:recStop', { poster: poster() }); $('#rec').hidden = true; say('Aufnahme gespeichert'); syncCapture(); }; r.stop(); return; }
  if (!stream) { await startCapture(); } if (!stream) return;
  try { await api('overlay:recStart'); const r = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 4000000 });
    r.ondataavailable = async (e) => { if (e.data.size) await api('overlay:recChunk', await e.data.arrayBuffer()); }; r.start(2000); fullRec = r; $('#rec').hidden = false; say('Aufnahme läuft (F7 = Stopp)'); } catch (e) { say(e.message); }
}

/* ---------- Ping ---------- */
setInterval(async () => { if (!ctx?.server?.host) { pingMs = null; return; } try { const r = await api('servers:ping', { host: ctx.server.host, port: ctx.server.port }); pingMs = r && r.ms != null ? r.ms : null; } catch { pingMs = null; } }, 5000);

/* ---------- Hotkeys ---------- */
const ACT = [
  ['Rift', [['menu', 'Menü öffnen/schließen'], ['editor', 'Overlay-Editor'], ['clip', 'Clip speichern (30 s)'], ['rec', 'Aufnahme starten/stoppen'], ['hideHuds', 'Alle Overlays ein/aus'], ['crosshairToggle', 'Fadenkreuz ein/aus'], ['swToggle', 'Stoppuhr Start/Stopp'], ['swReset', 'Stoppuhr zurücksetzen'], ['timerToggle', 'Timer Start/Pause'], ['pomoToggle', 'Pomodoro Start/Stopp'], ['ctrInc', 'Zähler +1'], ['ctrReset', 'Zähler zurücksetzen'], ['media', 'Medien im Launcher öffnen']]],
  ['Spiel (Rift drückt die Taste für dich)', [['hitboxes', 'Hitboxen (F3+B)'], ['chunks', 'Chunk-Grenzen (F3+G)'], ['tooltips', 'Erweiterte Tooltips (F3+H)'], ['debug', 'Debug-Bildschirm (F3)'], ['reloadChunks', 'Chunks neu laden (F3+A)'], ['reloadRes', 'Texturen neu laden (F3+T)'], ['copyPos', 'Position kopieren (F3+C)'], ['pauseFocus', 'Pause bei Fokusverlust (F3+P)'], ['gmSwitch', 'Spielmodus-Wechsler (F3+F4)'], ['spectator', 'Zuschauer-Modus (F3+N)'], ['clearChat', 'Chat leeren (F3+D)'], ['copyData', 'Block/Entity-Daten kopieren (F3+I)'], ['f3help', 'F3-Hilfe im Chat (F3+Q)'], ['renderDist', 'Sichtweite wechseln (F3+F)'], ['pauseMenu', 'Pause ohne Menü (F3+Esc)'], ['profiler', 'Profiler-Diagramm (F3+L)'], ['hideGui', 'GUI verstecken (F1)'], ['screenshot', 'Screenshot (F2)'], ['perspective', 'Perspektive (F5)'], ['fullscreen', 'Vollbild (F11)']]],
  ['Chat-Makros (Text bearbeiten)', [0, 1, 2, 3, 4, 5].map((i) => ['macro' + i, 'Makro ' + (i + 1)])]
];
const kname = (c) => !c ? '—' : c.replace(/^Key|^Digit/, '').replace('Arrow', '↑↓←→'.slice(0, 0)).replace('Left', ' L').replace('Right', ' R');
let listening = null;
function listen(id, btn) {
  if (listening) return; listening = id; btn.classList.add('listen'); btn.textContent = 'Taste drücken…'; api('overlay:capture', true);
  rift.on('overlay:picked', function once(code) { if (listening !== id) return; listening = null; api('overlay:capture', false); if (code === 'Escape') return paint(); const hk = {}; for (const k in cfg.hotkeys) if (cfg.hotkeys[k] === code && k !== id) hk[k] = ''; hk[id] = code; save({ hotkeys: hk }); });
}

/* ---------- Menü ---------- */
const TABS = [['widgets', 'Overlays'], ['hotkeys', 'Hotkeys'], ['look', 'Aussehen'], ['cam', 'Kamera'], ['pvp', 'PvP-Modus'], ['host', 'Server hosten']];
const swi = (on, id) => `<div class="sw ${on ? 'on' : ''}" data-sw="${id}"></div>`;
const FONTS = ['Segoe UI', 'Consolas', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact', 'Courier New', 'Lucida Console', 'Comic Sans MS', 'Georgia'];
function paint() {
  if (!cfg || !menuOpen || editor || listening) return;
  $('#menu').innerHTML = `<div class="panel"><div class="side"><h1><img src="logo.png"> Rift</h1>${TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}<div class="sp"></div><button data-t="_ed">✥ Overlay-Editor</button><button data-t="_x">✕ Schließen</button></div><div class="main" id="mm"></div></div>`;
  $('#menu').querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { const t = b.dataset.t; if (t === '_x') return api('overlay:menuClose'); if (t === '_ed') return setEditor(true); tab = t; paint(); });
  const m = $('#mm'), o = cfg.opt, u = cfg.ui;
  setTimeout(() => $('#menu').querySelectorAll('input[type=text],input:not([type]),input[type=number],textarea').forEach((i) => { i.addEventListener('focus', () => api('overlay:typing', true)); i.addEventListener('blur', () => api('overlay:typing', false)); }), 0);
  if (tab === 'widgets') {
    const optRow = (k) => ({
      crosshair: `<div class="row"><select data-o="shape">${['cross', 'dot', 'circle'].map((s) => `<option ${o.crosshair.shape === s ? 'selected' : ''} value="${s}">${{ cross: 'Kreuz', dot: 'Punkt', circle: 'Kreis' }[s]}</option>`).join('')}</select><input type="range" min="4" max="40" value="${o.crosshair.size}" data-o="csize"><input type="color" value="${o.crosshair.color}" data-o="ccolor"></div>`,
      reminder: `<div class="row"><small>Alle … Minuten</small><input type="number" min="5" max="240" value="${o.breakMin}" data-o="breakMin" style="width:70px"></div>`,
      timer: `<div class="row"><small>Minuten</small><input type="number" min="1" max="180" value="${o.timerMin}" data-o="timerMin" style="width:70px"></div>`,
      notes: `<textarea data-o="notes" rows="3" style="width:100%;box-sizing:border-box">${esc(o.notes)}</textarea>`,
      customtext: `<input data-o="text" value="${esc(o.text)}" style="width:100%;box-sizing:border-box" maxlength="60">`,
      counter: `<input data-o="counterLabel" value="${esc(o.counterLabel)}" maxlength="20">`
    }[k] || '');
    m.innerHTML = '<h2>Overlays</h2><div class="mute">Anordnen geht am besten im <a style="text-decoration:underline;cursor:pointer" id="toEd">Overlay-Editor</a>: Icons aus dem Streifen ins Bild ziehen.</div>' + WIDGETS.map((k) => `<div class="row"><span class="wrow l">${icon(k, 22)} ${NAMES[k]}${k === 'fps' ? ' <small>(Schätzwert aus Aufnahme)</small>' : ''}</span>${swi(cfg.hud[k].on, 'h:' + k)}</div>${cfg.hud[k].on ? optRow(k) : ''}`).join('');
    $('#toEd').onclick = () => setEditor(true);
    m.querySelectorAll('[data-o]').forEach((i) => i.onchange = () => { const d = i.dataset.o, v = i.value, p = { opt: {} };
      if (d === 'shape') p.opt.crosshair = { shape: v }; else if (d === 'csize') p.opt.crosshair = { size: +v }; else if (d === 'ccolor') p.opt.crosshair = { color: v }; else p.opt[d] = d === 'timerMin' ? Math.max(1, +v || 5) : d === 'breakMin' ? (remindAt = Date.now() + Math.max(5, +v || 45) * 60000, Math.max(5, +v || 45)) : v; save(p); });
  } else if (tab === 'hotkeys') {
    m.innerHTML = '<h2>Hotkeys</h2><div class="mute">Klick auf eine Taste, dann die neue Taste (oder Maustaste 3/4/5) drücken. Esc bricht ab. Spiel-Aktionen drückt Rift in Minecraft für dich – so legst du z. B. Hitboxen auf eine freie Taste. Texte tippen (Makros, Notizen): beim Klick in ein Textfeld wird kurz Fokus genommen – im Vollbild minimiert Minecraft dann (F11 = Fenstermodus nutzen). Nimm Tasten, die du nicht zum Tippen brauchst (F6–F10, Numpad, Maus 4/5), denn die Taste wirkt auch im Chat.</div>'
      + ACT.map(([g, list]) => `<h3>${g}</h3>` + list.map(([id, lab]) => { const mi = /^macro(\d)$/.exec(id); return `<div class="row"><span class="l">${lab}</span>${mi ? `<input data-mac="${mi[1]}" value="${esc(o.macros[+mi[1]] || '')}" placeholder="Text oder /befehl" style="width:190px" maxlength="100">` : ''}<button class="btn key" data-k="${id}">${kname(cfg.hotkeys[id])}</button><button class="btn" data-c="${id}" title="Löschen">✕</button></div>`; }).join('')).join('');
    m.querySelectorAll('.key').forEach((b) => b.onclick = () => listen(b.dataset.k, b));
    m.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => save({ hotkeys: { [b.dataset.c]: '' } }));
    m.querySelectorAll('[data-mac]').forEach((i) => i.onchange = () => { const a = [...o.macros]; a[+i.dataset.mac] = i.value; save({ opt: { macros: a } }); });
  } else if (tab === 'look') {
    const rg = (id, lab, min, max, st, v) => `<div class="row"><span class="l">${lab}</span><input type="range" data-u="${id}" min="${min}" max="${max}" step="${st}" value="${v}"></div>`;
    m.innerHTML = `<h2>Aussehen</h2><div class="row"><span class="l">Schriftart</span><select data-u="font">${FONTS.map((f) => `<option ${u.font === f ? 'selected' : ''} style="font-family:'${f}'">${f}</option>`).join('')}</select></div>`
      + rg('size', 'Schriftgröße', 10, 24, 1, u.size) + rg('radius', 'Ecken-Rundung', 0, 20, 1, u.radius) + rg('scale', 'Overlay-Größe', 0.7, 1.6, 0.05, u.scale) + rg('hudAlpha', 'Overlay-Hintergrund (Deckkraft)', 0, 1, 0.05, u.hudAlpha) + rg('menuAlpha', 'Menü-Deckkraft', 0.05, 1, 0.05, u.menuAlpha)
      + `<div class="row"><span class="l">Akzentfarbe</span><input type="color" data-u="accent" value="${u.accent}"></div><div class="row"><span class="l">Textfarbe</span><input type="color" data-u="text" value="${u.text}"></div>`
      + `<div class="row"><span class="l">Text-Schatten</span>${swi(u.shadow, 'u:shadow')}</div><div class="row"><span class="l">Overlay-Hintergrund anzeigen</span>${swi(u.hudBg, 'u:hudBg')}</div>`
      + `<div class="row"><button class="btn" id="uReset">Zurücksetzen</button></div>`;
    m.querySelectorAll('[data-u]').forEach((i) => { const k = i.dataset.u; const val = () => i.type === 'range' ? +i.value : i.value; i.oninput = () => { if (i.type === 'range' || i.type === 'color') { cfg.ui[k] = val(); applyUi(); } }; i.onchange = () => save({ ui: { [k]: val() } }); });
    $('#uReset').onclick = () => save({ ui: { font: 'Segoe UI', size: 14, radius: 6, hudAlpha: .55, menuAlpha: .35, accent: '#c0353f', text: '#ffffff', shadow: true, scale: 1, hudBg: true } });
  } else if (tab === 'cam') {
    m.innerHTML = `<h2>Kamera</h2><div class="row"><div class="l">Clip-Puffer (letzte 30 s)<br><small>Nimmt im Hintergrund auf, damit der Clip-Hotkey die letzten 30 Sekunden speichert. Kostet etwas Leistung.</small></div>${swi(cfg.clipBuffer, 'clip')}</div>
      <div class="row"><button class="btn p" id="bClip">Clip speichern</button><button class="btn" id="bRec">${fullRec ? 'Aufnahme stoppen' : 'Aufnahme starten'}</button><button class="btn" id="bMed">Medien im Launcher</button></div><div class="mute">Screenshots: F2 (oder dein Hotkey). Clips und Aufnahmen findest du im Launcher unter „Medien“.</div>`;
    $('#bClip').onclick = saveClip; $('#bRec').onclick = async () => { await toggleRec(); paint(); }; $('#bMed').onclick = () => api('overlay:nav', 'media');
  } else if (tab === 'pvp') {
    m.innerHTML = `<h2>PvP-Modus</h2><div class="row"><div class="l">Leistungs-Optionen beim nächsten Start<br><small>Setzt für die Spielzeit Sichtweite 8, wenig Partikel, keine Wolken/Schatten, VSync aus. Deine options.txt wird nach dem Spiel wiederhergestellt.</small></div>${swi(cfg.pvp, 'pvp')}</div><div class="mute">Gilt ab dem nächsten Spielstart.</div>`;
  } else paintHost();
  m.querySelectorAll('[data-sw]').forEach((s) => s.onclick = () => { const id = s.dataset.sw; if (id.startsWith('h:')) { const k = id.slice(2); save({ hud: { [k]: { ...cfg.hud[k], on: !cfg.hud[k].on } } }); } else if (id.startsWith('u:')) save({ ui: { [id.slice(2)]: !cfg.ui[id.slice(2)] } }); else if (id === 'clip') save({ clipBuffer: !cfg.clipBuffer }); else if (id === 'pvp') save({ pvp: !cfg.pvp }); });
}

/* ---------- Hosting ---------- */
const hostLogs = {}, hostStatus = {}, hostAddr = {}; let hostList = [], vers = [];
async function paintHost() {
  const m = $('#mm'); if (!m) return;
  if (!hostList.length && !paintHost.loaded) { paintHost.loaded = true; try { hostList = await api('lserver:list'); vers = await api('versions:minecraft'); } catch {} hostList.forEach((s) => { hostStatus[s.id] = hostStatus[s.id] || s.status; }); }
  const keep = {}; m.querySelectorAll('.hc').forEach((i) => { keep[i.dataset.id] = i.value; }); const fv = {}; m.querySelectorAll('.nf').forEach((i) => { fv[i.id] = i.type === 'checkbox' ? i.checked : i.value; });
  const lab = { stopped: 'Gestoppt', starting: 'Startet…', running: 'Läuft', stopping: 'Stoppt…', downloading: 'Lädt…' };
  m.innerHTML = `<h2>Server hosten</h2><div class="srv"><div class="grid"><label>Name<input class="nf" id="nName" value="Mein Server" maxlength="40"></label><label>Version<select class="nf" id="nVer">${vers.slice(0, 60).map((v) => `<option>${esc(v)}</option>`).join('')}</select></label>
    <label>RAM (GB)<input class="nf" id="nRam" type="number" min="1" max="32" value="2"></label><label>Port<input class="nf" id="nPort" type="number" min="1024" max="65535" value="${25565 + hostList.length}"></label></div>
    <div class="row"><label class="mute"><input class="nf" type="checkbox" id="nOn" checked> Online-Modus</label><label class="mute"><input class="nf" type="checkbox" id="nEula"> <a>Minecraft-EULA</a> zustimmen</label><button class="btn p" id="nGo" style="margin-left:auto">Erstellen</button></div></div>`
    + hostList.map((s) => { const st = hostStatus[s.id] || 'stopped'; return `<div class="srv" data-id="${s.id}"><div class="row"><span class="dot ${st === 'running' ? 'on' : ''}"></span><b>${esc(s.name)}</b><span class="mute">${esc(s.version)} · ${lab[st] || st} · :${s.port}</span><span style="margin-left:auto" class="row">${st === 'stopped' ? '<button class="btn p" data-a="start">Start</button>' : '<button class="btn" data-a="stop">Stopp</button>'}${st === 'running' ? (hostAddr[s.id] ? `<button class="btn" data-a="invite">Freunde einladen</button><button class="btn" data-a="copy">${esc(hostAddr[s.id])}</button>` : '<button class="btn" data-a="share">Für Freunde freigeben</button>') : ''}<button class="btn d" data-a="del" ${st === 'stopped' ? '' : 'disabled'}>✕</button></span></div><div class="log" data-id="${s.id}">${esc((hostLogs[s.id] || []).join('\n'))}</div><input class="hc" data-id="${s.id}" placeholder="Befehl (Enter)" style="width:100%;box-sizing:border-box" ${st === 'running' ? '' : 'disabled'}></div>`; }).join('');
  for (const id in fv) { const e = m.querySelector('#' + id); if (e) { if (e.type === 'checkbox') e.checked = fv[id]; else e.value = fv[id]; } }
  m.querySelectorAll('.log').forEach((l) => { l.scrollTop = l.scrollHeight; });
  const run = (f) => async (...a) => { try { await f(...a); } catch (e) { say(e.message || String(e)); } };
  m.querySelectorAll('.hc').forEach((i) => { i.value = keep[i.dataset.id] || ''; i.onkeydown = run(async (e) => { if (e.key === 'Enter' && i.value.trim()) { const v = i.value; i.value = ''; await api('lserver:command', { id: i.dataset.id, cmd: v }); } }); });
  $('#nGo').onclick = run(async () => { $('#nGo').disabled = true; try { hostList = await api('lserver:create', { name: $('#nName').value, version: $('#nVer').value, ram: +$('#nRam').value, port: +$('#nPort').value, maxPlayers: 10, gamemode: 'survival', difficulty: 'normal', motd: 'Ein Rift-Server', onlineMode: $('#nOn').checked, eula: $('#nEula').checked }); say('Server erstellt'); } finally { paintHost(); } });
  m.querySelectorAll('[data-a]').forEach((b) => { const s = hostList.find((x) => x.id === b.closest('.srv').dataset.id); b.onclick = run(async () => { const a = b.dataset.a;
    if (a === 'start') { hostStatus[s.id] = 'starting'; paintHost(); await api('lserver:start', s.id); } else if (a === 'stop') await api('lserver:stop', s.id);
    else if (a === 'share') { say('Tunnel wird aufgebaut…'); const r = await api('lserver:share', s.id); hostAddr[s.id] = r.addr; paintHost(); say('Adresse: ' + r.addr); }
    else if (a === 'copy') { try { navigator.clipboard.writeText(hostAddr[s.id]); } catch {} say('Adresse kopiert'); }
    else if (a === 'invite') { const d = await api('friends:list'); const on = d.friends.filter((f) => f.online); if (!on.length) { say('Gerade ist kein Freund online.'); return; }
      const mc = s.version; for (const f of on) { try { await api('invite:send', { to: f.uuid, addr: hostAddr[s.id], name: s.name, version: mc, loader: '' }); } catch (e) { say(e.message); } } say('Einladung an ' + on.map((f) => f.name).join(', ') + ' gesendet'); }
    else if (a === 'del') { hostList = await api('lserver:delete', s.id); paintHost(); } }); });
}

/* ---------- Start ---------- */
(async () => { const r = await api('overlay:get'); cfg = r.cfg; ctx = r.ctx; applyUi(); paintHuds(); syncCapture(); })();
