/* Rift-Overlay: durchsichtiges Fenster über Minecraft (alle Versionen, auch Vanilla, kein Mod).
   Windows: ein kleiner PowerShell-Helfer liest Tasten (WASD, Maus, Menü-Taste) und die Lage des Minecraft-Fensters.
   Das Overlay zeigt HUDs (Keystrokes, CPS, Uhr, Spielzeit, CPU/RAM, FPS aus der Bildschirmaufnahme) und das Rift-Menü. */
const fs = require('fs'), path = require('path'), os = require('os');
const { spawn } = require('child_process');
const { BrowserWindow, screen } = require('electron');

const PS = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public static class W {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int k);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
}
"@
[void][W]::SetProcessDPIAware()
$gamePid = [int]$args[0]; $ovPid = [int]$args[1]; $cmd = $args[2]
$keys = $args[3].Split(',') | ForEach-Object { [int]$_ }
$h = [IntPtr]::Zero; $last = ''; $n = 0
function Tap($k) { [W]::keybd_event([byte]$k, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 20; [W]::keybd_event([byte]$k, 0, 2, [UIntPtr]::Zero) }
while ($true) {
  if (($n % 60) -eq 0) { if (-not (Get-Process -Id $gamePid)) { break } }; $n++
  $pr = New-Object System.Collections.Generic.List[string]
  foreach ($k in $keys) { if (([W]::GetAsyncKeyState($k) -band 0x8000) -ne 0) { $pr.Add([string]$k) } }
  $fg = [W]::GetForegroundWindow(); [uint32]$fp = 0; [void][W]::GetWindowThreadProcessId($fg, [ref]$fp)
  $gfg = [int]($fp -eq [uint32]$gamePid); $ofg = [int]($fp -eq [uint32]$ovPid)
  if ($gfg -eq 1) { $h = $fg }
  $icon = 1; $x = 0; $y = 0; $w = 0; $hh = 0
  if ($h -ne [IntPtr]::Zero) {
    $r = New-Object 'W+RECT'; [void][W]::GetClientRect($h, [ref]$r)
    $pt = New-Object 'W+POINT'; [void][W]::ClientToScreen($h, [ref]$pt)
    $x = $pt.X; $y = $pt.Y; $w = $r.R; $hh = $r.B; $icon = [int][W]::IsIconic($h)
  }
  $line = '{0}|{1}|{2}|{3}|{4}|{5}|{6}|{7}' -f $gfg, $ofg, $x, $y, $w, $hh, $icon, ($pr -join ' ')
  if ($line -ne $last) { [Console]::Out.WriteLine($line); [Console]::Out.Flush(); $last = $line }
  if (Test-Path $cmd) {
    $lines = Get-Content $cmd; Remove-Item $cmd -Force
    foreach ($l in $lines) {
      $q = $l.Split(' ', 2)
      if ($q[0] -eq 'fg') { if ($h -ne [IntPtr]::Zero) { [void][W]::SetForegroundWindow($h) } }
      elseif ($q[0] -eq 'fsif') { if ($gfg -eq 1) { Tap ([int]$q[1]) } }
      elseif ($q[0] -eq 'combo') { $ks = @($q[1].Split(' ') | ForEach-Object { [int]$_ }); foreach ($k in $ks) { [W]::keybd_event([byte]$k, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 25 }; [array]::Reverse($ks); foreach ($k in $ks) { [W]::keybd_event([byte]$k, 0, 2, [UIntPtr]::Zero); Start-Sleep -Milliseconds 25 } }
      elseif ($q[0] -eq 'chat') {
        $t = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($q[1]))
        if ($t.StartsWith('/')) { [System.Windows.Forms.SendKeys]::SendWait('/'); $t = $t.Substring(1) } else { Tap 0x54 }
        Start-Sleep -Milliseconds 200
        [System.Windows.Forms.SendKeys]::SendWait([regex]::Replace($t, '[+^%~(){}\[\]]', '{$0}') + '{ENTER}')
      }
    }
  }
  Start-Sleep -Milliseconds 8
}
`;

/* Tastennamen (KeyboardEvent.code) -> Windows-Tastencode */
const VK = { Space: 0x20, Tab: 9, Insert: 0x2D, Delete: 0x2E, Home: 0x24, End: 0x23, PageUp: 0x21, PageDown: 0x22, ArrowLeft: 0x25, ArrowUp: 0x26, ArrowRight: 0x27, ArrowDown: 0x28,
  ShiftLeft: 0xA0, ShiftRight: 0xA1, ControlLeft: 0xA2, ControlRight: 0xA3, AltLeft: 0xA4, AltRight: 0xA5, Backquote: 0xC0, Minus: 0xBD, Equal: 0xBB, BracketLeft: 0xDB, BracketRight: 0xDD,
  Semicolon: 0xBA, Quote: 0xDE, Comma: 0xBC, Period: 0xBE, Slash: 0xBF, Backslash: 0xDC, Mouse1: 0x01, Mouse2: 0x02, Mouse3: 0x04, Mouse4: 0x05, Mouse5: 0x06, NumpadAdd: 0x6B, NumpadSubtract: 0x6D, NumpadMultiply: 0x6A, NumpadDivide: 0x6F, NumpadDecimal: 0x6E, Escape: 0x1B, Pause: 0x13, ScrollLock: 0x91 };
for (let i = 0; i < 26; i++) VK['Key' + String.fromCharCode(65 + i)] = 65 + i;
for (let i = 0; i < 10; i++) { VK['Digit' + i] = 48 + i; VK['Numpad' + i] = 96 + i; }
for (let i = 1; i <= 12; i++) VK['F' + i] = 111 + i;
const VK_NAME = Object.fromEntries(Object.entries(VK).map(([k, v]) => [v, k]));
const VK_ALL = [...new Set(Object.values(VK))];
const F3 = 0x72;
/* Aktionen: Spiel-Tastenfolgen werden von Rift in Minecraft "gedrückt" */
const GAME = { hitboxes: [F3, 0x42], chunks: [F3, 0x47], tooltips: [F3, 0x48], debug: [F3], reloadChunks: [F3, 0x41], reloadRes: [F3, 0x54], copyPos: [F3, 0x43], pauseFocus: [F3, 0x50], gmSwitch: [F3, 0x73], spectator: [F3, 0x4E], clearChat: [F3, 0x44], copyData: [F3, 0x49], f3help: [F3, 0x51], renderDist: [F3, 0x46], pauseMenu: [F3, 0x1B], profiler: [F3, 0x4C], hideGui: [0x70], screenshot: [0x71], perspective: [0x74], fullscreen: [0x7A] };

const DEF = {
  enabled: true, clipBuffer: true, pvp: false,
  hotkeys: { menu: 'ShiftRight', editor: 'Insert', clip: 'F8', rec: 'F7' },
  ui: { font: 'Segoe UI', size: 14, radius: 6, hudAlpha: 0.55, menuAlpha: 0.35, accent: '#c0353f', text: '#ffffff', shadow: true, scale: 1, hudBg: true },
  opt: { crosshair: { shape: 'cross', size: 12, color: '#ffffff' }, timerMin: 5, breakMin: 45, notes: 'Notizen…', text: 'Rift Launcher', counterLabel: 'Zähler', macros: ['gg', '/home', '/spawn', '/time set day', '/gamemode creative', '/gamemode survival'] },
  hud: {}
};
const WIDGETS = ['keystrokes', 'cps', 'clicks', 'fps', 'fpsavg', 'fpsgraph', 'frametime', 'clock', 'date', 'session', 'sys', 'cpugraph', 'battery', 'ping', 'server', 'profile', 'watermark', 'stopwatch', 'timer', 'pomodoro', 'counter', 'notes', 'customtext', 'crosshair', 'lowfps', 'reminder', 'coins'];
const ON = ['keystrokes', 'cps', 'fps', 'watermark'];
WIDGETS.forEach((k, i) => { DEF.hud[k] = { on: ON.includes(k), x: k === 'crosshair' ? -2 : k === 'watermark' ? -1 : 24, y: k === 'crosshair' ? -2 : 24 + (i % 12) * 44 }; });
DEF.hud.keystrokes.y = 330; DEF.hud.cps.y = 280; DEF.hud.fps.y = 24;

module.exports = function registerOverlay({ h, send, DATA, getProfileDir, onClip }) {
  const CFG = path.join(DATA, 'overlay.json'), CMD = path.join(DATA, 'winpoll.cmd'), PSF = path.join(DATA, 'winpoll.ps1');
  let cfg = JSON.parse(JSON.stringify(DEF));
  const merge = (base, c) => { const o = { ...base, ...c }; o.hotkeys = { ...base.hotkeys, ...(c.hotkeys || {}) }; o.ui = { ...base.ui, ...(c.ui || {}) }; o.opt = { ...base.opt, ...(c.opt || {}) };
    o.opt.crosshair = { ...base.opt.crosshair, ...((c.opt || {}).crosshair || {}) }; o.hud = {}; for (const k of WIDGETS) o.hud[k] = { ...base.hud[k], ...((c.hud || {})[k] || {}) }; return o; };
  try { cfg = merge(cfg, JSON.parse(fs.readFileSync(CFG, 'utf8'))); } catch {}
  const saveCfg = () => { try { fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2)); } catch {} };

  let ow = null, helper = null, menuOpen = false, prevKeys = new Set(), capturing = false, ctx = null, lastRect = '', cpuPrev = null, sysTimer = null, rec = null;

  const toOv = (ch, d) => { if (ow && !ow.isDestroyed()) ow.webContents.send(ch, d); };
  const cpu = () => { const c = os.cpus(); let idle = 0, tot = 0; c.forEach((x) => { for (const k in x.times) tot += x.times[k]; idle += x.times.idle; }); const r = cpuPrev ? 100 * (1 - (idle - cpuPrev.idle) / Math.max(1, tot - cpuPrev.tot)) : 0; cpuPrev = { idle, tot }; return Math.max(0, Math.min(100, r)); };

  function create() {
    ow = new BrowserWindow({
      width: 800, height: 600, x: 0, y: 0, show: false, frame: false, transparent: true, resizable: false, movable: false, skipTaskbar: true, focusable: false,
      hasShadow: false, alwaysOnTop: true, fullscreenable: false, backgroundColor: '#00000000',
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
    });
    ow.setAlwaysOnTop(true, 'screen-saver'); ow.setIgnoreMouseEvents(true, { forward: true });
    try { ow.setContentProtection(true); } catch {}                // Overlay erscheint nicht in der Bildschirmaufnahme
    ow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
    ow.on('closed', () => { ow = null; });
  }

  /* Das Overlay nimmt NIE den Fokus (sonst minimiert Minecraft im Vollbild). Damit die Maus frei wird, öffnet Rift dafür kurz das Pausenmenü (Esc). */
  let typing = false, escIgnore = 0, fsDone = false;
  function setMenu(open, viaEsc) {
    if (!ow || ow.isDestroyed() || open === menuOpen) return;
    menuOpen = open; typing = false; ow.setFocusable(false); ow.setIgnoreMouseEvents(!open, { forward: true });
    if (open) { ow.showInactive(); setTimeout(() => { escIgnore = Date.now() + 700; send2('combo 27'); }, 80); }
    else if (!viaEsc) { escIgnore = Date.now() + 700; send2('combo 27'); }
    toOv('overlay:menu', open); log('Menü ' + (open ? 'geöffnet' : 'geschlossen'));
  }
  h('overlay:typing', (on) => { if (!ow || ow.isDestroyed() || !menuOpen) return false; typing = !!on; if (on) { ow.setFocusable(true); ow.focus(); } else { ow.setFocusable(false); send2('fg'); } return true; });

  const send2 = (line) => { try { fs.appendFileSync(CMD, line + '\n'); } catch {} };
  function dispatch(id) {
    if (GAME[id]) return send2('combo ' + GAME[id].join(' '));
    const m = /^macro(\d)$/.exec(id); if (m) { const t = (cfg.opt.macros || [])[+m[1]]; if (t) send2('chat ' + Buffer.from(String(t)).toString('base64')); return; }
    toOv('overlay:cmd', id);
  }
  function onLine(line) {
    const p = line.trim().split('|'); if (p.length < 8) return;
    const [gfg, ofg, x, y, w, hh, icon] = p.slice(0, 7).map(Number); const pressed = new Set(p[7].split(' ').filter(Boolean).map(Number));
    const rising = (code) => { const v = VK[code]; return v && pressed.has(v) && !prevKeys.has(v); };
    if (capturing) { for (const v of pressed) if (!prevKeys.has(v) && v > 2 && VK_NAME[v]) { capturing = false; if (VK_NAME[v] === 'Escape') { toOv('overlay:picked', 'Escape'); prevKeys = pressed; setMenu(false, true); return; } toOv('overlay:picked', VK_NAME[v]); break; } prevKeys = pressed; return; }
    if (menuOpen && !typing && Date.now() > escIgnore && rising('Escape')) { prevKeys = pressed; setMenu(false, true); return; }
    if (ctx && (gfg || ofg)) {
      if (rising(cfg.hotkeys.menu)) setMenu(!menuOpen);
      else if (rising(cfg.hotkeys.editor)) { if (menuOpen) setMenu(false); else { setMenu(true); toOv('overlay:cmd', 'editor'); } }
      else if (gfg && !menuOpen) for (const id in cfg.hotkeys) if (id !== 'menu' && id !== 'editor' && cfg.hotkeys[id] && rising(cfg.hotkeys[id])) dispatch(id);
    }
    prevKeys = pressed;
    if (ow && !ow.isDestroyed()) toOv('overlay:keys', [...pressed]);
    if (!ow || ow.isDestroyed()) return;
    const visible = (gfg || ofg) && !icon && w > 50 && hh > 50 && cfg.enabled;
    const key = [x, y, w, hh].join(',');
    if (visible && key !== lastRect) {
      lastRect = key;
      try { const d = screen.screenToDipRect(null, { x, y, width: w, height: hh }); ow.setBounds({ x: d.x, y: d.y, width: d.width, height: d.height }); } catch { ow.setBounds({ x, y, width: w, height: hh }); }
      toOv('overlay:size', { w, h: hh });
    }
    if (visible && !ow.isVisible()) ow.showInactive();
    if (!visible && ow.isVisible() && !menuOpen) ow.hide();
    if (!gfg && !ofg && menuOpen) setMenu(false, true);
  }

  const log = (t) => { try { send('game:log', '[Overlay] ' + t); } catch {} };
  function start(pid, profile, server) {
    if (process.platform !== 'win32' || !cfg.enabled || !pid) return;
    stop(); ctx = { pid, profile, server, t0: Date.now(), name: profile && profile.name, mc: profile && profile.mcVersion };
    try { fs.writeFileSync(PSF, PS, 'utf8'); } catch { return; }
    create(); log('gestartet für PID ' + pid);
    helper = spawn('powershell.exe', ['-NoProfile', '-NoLogo', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PSF, String(pid), String(process.pid), CMD, VK_ALL.join(',')], { windowsHide: true });
    let buf = ''; helper.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { onLine(buf.slice(0, i)); buf = buf.slice(i + 1); } });
    helper.stderr.on('data', (d) => log('Helfer: ' + String(d).trim().slice(0, 200))); helper.on('error', (e) => log('Helfer-Fehler: ' + e.message));
    helper.on('close', (c) => { log('Helfer beendet (Code ' + c + ')'); helper = null; });
    clearInterval(sysTimer); sysTimer = setInterval(() => toOv('overlay:sys', { cpu: cpu(), ramUsed: 1 - os.freemem() / os.totalmem(), t0: ctx?.t0 }), 2000);
    toOv('overlay:ctx', { server: server || null, name: ctx.name, mc: ctx.mc });
  }
  function stop() {
    clearInterval(sysTimer); menuOpen = false; ctx = null; lastRect = ''; prevKeys = new Set(); capturing = false; fsDone = false;
    try { helper?.kill(); } catch {} helper = null;
    if (ow && !ow.isDestroyed()) { try { ow.destroy(); } catch {} } ow = null;
    try { fs.rmSync(CMD, { force: true }); } catch {}
  }

  /* ---------- IPC ---------- */
  h('overlay:get', () => ({ cfg, running: !!ctx, ctx: ctx ? { server: ctx.server || null, t0: ctx.t0, name: ctx.name, mc: ctx.mc } : null, platform: process.platform }));
  h('overlay:set', (patch) => { cfg = merge(cfg, { ...cfg, ...patch, hotkeys: { ...cfg.hotkeys, ...(patch.hotkeys || {}) }, ui: { ...cfg.ui, ...(patch.ui || {}) }, opt: { ...cfg.opt, ...(patch.opt || {}) }, hud: Object.fromEntries(WIDGETS.map((k) => [k, { ...cfg.hud[k], ...((patch.hud || {})[k] || {}) }])) });
    if (patch.hotkeys) for (const k in patch.hotkeys) if (patch.hotkeys[k] === '') cfg.hotkeys[k] = '';
    saveCfg(); toOv('overlay:cfg', cfg); send('overlay:cfg', cfg); return cfg; });
  h('overlay:capture', (on) => { capturing = !!on; return true; });
  h('overlay:menuClose', () => { setMenu(false); return true; });
  h('overlay:screenId', async () => {
    const { desktopCapturer } = require('electron');
    const src = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
    let target = screen.getPrimaryDisplay().id;
    if (ow && !ow.isDestroyed()) target = screen.getDisplayMatching(ow.getBounds()).id;
    const m = src.find((s) => String(s.display_id) === String(target)) || src[0];
    return m ? m.id : null;
  });
  const mediaDir = (kind, name) => { const d = path.join(getProfileDir(ctx?.profile) || path.join(DATA, 'media'), kind); const full = path.join(d, name); fs.mkdirSync(full, { recursive: true }); return full; };
  const stamp = () => { const n = new Date(), p2 = (v) => String(v).padStart(2, '0'); return `${n.getFullYear()}${p2(n.getMonth() + 1)}${p2(n.getDate())}-${p2(n.getHours())}${p2(n.getMinutes())}${p2(n.getSeconds())}`; };
  h('overlay:saveClip', ({ segs, poster, secs }) => {
    if (!ctx) throw new Error('Kein Spiel läuft.'); if (!Array.isArray(segs) || !segs.length) throw new Error('Puffer ist noch leer.');
    const dir = mediaDir('rift-clips', 'clip-' + stamp()); const names = [];
    segs.slice(0, 8).forEach((b, i) => { const n = `s${i + 1}.webm`; fs.writeFileSync(path.join(dir, n), Buffer.from(b)); names.push(n); });
    if (poster) try { fs.writeFileSync(path.join(dir, 'poster.jpg'), Buffer.from(String(poster).split(',')[1] || '', 'base64')); } catch {}
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ segs: names, secs: Math.round(secs || 0) })); try { onClip && onClip(); } catch {} return path.basename(dir);
  });
  h('overlay:recStart', () => { if (!ctx) throw new Error('Kein Spiel läuft.'); const dir = mediaDir('rift-recordings', 'rec-' + stamp()); fs.writeFileSync(path.join(dir, 'video.webm'), Buffer.alloc(0)); rec = { dir, t0: Date.now() }; return true; });
  h('overlay:recChunk', (b) => { if (rec) fs.appendFileSync(path.join(rec.dir, 'video.webm'), Buffer.from(b)); return true; });
  h('overlay:recStop', ({ poster } = {}) => {
    if (!rec) return true;
    if (poster) try { fs.writeFileSync(path.join(rec.dir, 'poster.jpg'), Buffer.from(String(poster).split(',')[1] || '', 'base64')); } catch {}
    fs.writeFileSync(path.join(rec.dir, 'meta.json'), JSON.stringify({ segs: ['video.webm'], secs: Math.round((Date.now() - rec.t0) / 1000) })); rec = null; return true;
  });

  const fullscreenSoon = () => { [0, 1500, 3500].forEach((d) => setTimeout(() => { if (ctx && !fsDone) { send2('fsif 122'); if (d >= 3500) fsDone = true; } }, d)); };
  return { start, stop, fullscreenSoon, cfg: () => cfg, forward: (ch, d) => toOv(ch, d) };
};
module.exports.WIDGETS = WIDGETS; module.exports.PVP = { renderDistance: '8', particles: '2', renderClouds: 'false', entityShadows: 'false', graphicsMode: '0', fancyGraphics: 'false', biomeBlendRadius: '0', enableVsync: 'false', maxFps: '260', ao: 'false' };
