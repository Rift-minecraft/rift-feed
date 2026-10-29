/* AI-Check (Beta): untersucht Logs / Crash-Reports lokal mit festen Regeln (keine Cloud, keine echte KI) und kann bekannte Probleme beheben */
const fs = require('fs'), path = require('path'), os = require('os');
module.exports = ({ h, state, save, getProfile, profileDir, GAME_ROOT, overlay }) => {
  const read = (f, max = 400000) => { try { const s = fs.readFileSync(f, 'utf8'); return s.length > max ? s.slice(-max) : s; } catch { return ''; } };
  const newest = (dir, test) => { try { return fs.readdirSync(dir).filter(test).map((n) => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.t - a.t)[0]?.n; } catch { return null; } };
  function gather(p, extra) {
    const dir = profileDir(p); let txt = (extra || []).join('\n') + '\n' + read(path.join(dir, 'logs', 'latest.log'));
    const cr = newest(path.join(dir, 'crash-reports'), (n) => /\.txt$/.test(n)); if (cr) txt += '\n' + read(path.join(dir, 'crash-reports', cr));
    const hs = newest(dir, (n) => /^hs_err_pid.*\.log$/.test(n)); if (hs) txt += '\n' + read(path.join(dir, hs), 60000);
    return txt;
  }
  const modFiles = (p) => { try { return fs.readdirSync(path.join(profileDir(p), 'mods')).filter((f) => /\.jar$/i.test(f) && !/^rift-/i.test(f)); } catch { return []; } };
  function check(p, extra) {
    const t = gather(p, extra), F = [], add = (id, text, fix) => F.push({ id, text, fix: fix || null });
    const has = (re) => re.test(t);
    if (has(/de\.rift\.mod|rift\.mixins\.json|rift-\d[\w.]*-fabric/i)) add('riftmod', 'Der Rift-Mod (Cosmetics im Spiel) taucht im Fehler auf und verursacht vermutlich den Absturz.', { id: 'rift_off', label: 'Rift-Mod ausschalten' });
    if (has(/OutOfMemoryError|java\.lang\.OutOfMemory/i)) add('oom', 'Minecraft hatte zu wenig Arbeitsspeicher.', { id: 'ram_up', label: 'RAM erhöhen' });
    if (has(/Could not reserve enough space|Invalid maximum heap size|Error occurred during initialization of VM/i)) add('ram_down', 'Der eingestellte RAM ist größer als dein PC frei hat.', { id: 'ram_down', label: 'RAM verringern' });
    if (has(/UnsupportedClassVersionError|class file version|requires Java \d+|Java \d+ or newer/i)) add('java', 'Die Java-Version passt nicht zu dieser Minecraft-Version.', { id: 'java_auto', label: 'Automatische Java wählen' });
    const mm = t.match(/(?:Failed to load mod|Mod|mod) ['"“]?([\w.\-]+)['"”]? .*?(?:requires|is incompatible|failed|crashed)/i) || t.match(/Mixin apply failed .*?\b([\w\-]+)\.mixins\.json/i) || t.match(/Could not execute entrypoint stage '\w+' due to errors, provided by '([\w\-]+)'/i);
    if (mm) { const id = mm[1].toLowerCase(), f = modFiles(p).find((x) => x.toLowerCase().includes(id)); add('mod', `Die Mod „${mm[1]}“ verursacht vermutlich das Problem.`, f ? { id: 'mod_off:' + f, label: `„${f}“ deaktivieren` } : null); }
    else if (has(/Incompatible mod set|Mixin transformation|InvalidInjectionException|NoSuchMethodError|NoClassDefFoundError/i)) add('mods', 'Eine Mod passt nicht zur Minecraft-/Loader-Version oder zu einer anderen Mod.', modFiles(p).length ? { id: 'mods_off', label: 'Alle Mods vorübergehend deaktivieren' } : null);
    if (has(/GLFW error|WGL:|OpenGL|Pixel format not accelerated|EXCEPTION_ACCESS_VIOLATION|ig\d+icd|atio6axx|nvoglv/i)) add('gpu', 'Ein Grafiktreiber-Problem wurde erkannt. Aktualisiere den Treiber (Intel/NVIDIA/AMD) – oder setze die Grafik-Einstellungen zurück.', { id: 'video_reset', label: 'Grafik-Einstellungen zurücksetzen' });
    if (has(/resetting fullscreen mode|Detected unexpected shutdown/i) || (!F.length && state.settings.fullscreen !== false)) add('fs', 'Minecraft ist früh beim Start beendet worden. Häufig stören Vollbild oder das Rift-Overlay.', { id: 'safe_mode', label: 'Overlay & Vollbild ausschalten' });
    if (has(/UnknownHostException|Connection (?:refused|reset|timed out)|Failed to download|SSLHandshake/i)) add('net', 'Eine Datei konnte nicht geladen werden – prüfe deine Internetverbindung (oder starte im Offline-Modus).');
    if (has(/ZipException|Invalid or corrupt jarfile|SHA-?1 (?:mismatch|check)|Unable to resolve library|NoSuchFileException/i)) add('corrupt', 'Spieldateien sind beschädigt oder unvollständig.', { id: 'redownload', label: 'Versions-Dateien neu laden' });
    if (!F.length) { const c = (t.match(/Caused by: .+/g) || t.match(/\[ERROR\].+|Exception.+/g) || []).slice(-2).join('\n'); add('unknown', 'Keine bekannte Ursache gefunden.' + (c ? '\nLetzter Hinweis:\n' + c.slice(0, 400) : ''), null); }
    return F;
  }
  const profOpts = (p) => path.join(profileDir(p), 'options.txt');
  function setOpts(p, kv) {
    const f = profOpts(p); let lines = read(f).split(/\r?\n/).filter(Boolean);
    for (const k in kv) { lines = lines.filter((l) => l.split(':')[0] !== k); lines.push(k + ':' + kv[k]); }
    fs.writeFileSync(f, lines.join('\n') + '\n');
  }
  function fix(p, id) {
    if (id === 'rift_off') { state.settings.riftMod = false; save(); const d = path.join(profileDir(p), 'mods'); try { for (const f of fs.readdirSync(d)) if (/^rift-.*\.jar$/i.test(f)) fs.unlinkSync(path.join(d, f)); } catch {} return 'Rift-Mod ausgeschaltet und entfernt. Cosmetics im Spiel sind dann aus.'; }
    if (id === 'ram_up') { const cur = p.ram || state.settings.ram || 4; p.ram = Math.min(Math.max(2, Math.floor(os.totalmem() / 2 ** 30 * 0.6)), cur + 2); save(); return `RAM auf ${p.ram} GB gestellt.`; }
    if (id === 'ram_down') { p.ram = Math.max(2, Math.floor(os.freemem() / 2 ** 30 * 0.7)); save(); return `RAM auf ${p.ram} GB gestellt.`; }
    if (id === 'java_auto') { state.settings.javaPath = ''; save(); return 'Eigene Java-Pfad entfernt – der Launcher lädt die passende Java selbst.'; }
    if (id.startsWith('mod_off:')) { const f = path.basename(id.slice(8)), d = path.join(profileDir(p), 'mods'); fs.renameSync(path.join(d, f), path.join(d, f + '.disabled')); return `„${f}“ deaktiviert (Datei endet jetzt auf .disabled).`; }
    if (id === 'mods_off') { const d = path.join(profileDir(p), 'mods'); let n = 0; for (const f of modFiles(p)) { fs.renameSync(path.join(d, f), path.join(d, f + '.disabled')); n++; } return `${n} Mods deaktiviert. Zum Zurückholen „.disabled“ vom Dateinamen entfernen.`; }
    if (id === 'video_reset') { setOpts(p, { fullscreen: 'false', maxFps: '60', renderDistance: '8', graphicsMode: '0', enableVsync: 'true' }); return 'Grafik-Einstellungen zurückgesetzt.'; }
    if (id === 'safe_mode') { state.settings.fullscreen = false; save(); try { overlay && overlay.setEnabled && overlay.setEnabled(false); } catch {} return 'Vollbild ausgeschaltet. Schalte das Overlay in den Einstellungen aus, falls es weiter abstürzt.'; }
    if (id === 'redownload') { const d = path.join(GAME_ROOT, 'versions', p.mcVersion); fs.rmSync(d, { recursive: true, force: true }); return 'Versions-Dateien gelöscht – sie werden beim nächsten Start neu geladen (Internet nötig).'; }
    throw new Error('Unbekannte Reparatur');
  }
  h('ai:check', (profileId, extra) => { const p = getProfile(profileId); if (!p) throw new Error('Kein Profil'); return check(p, Array.isArray(extra) ? extra.slice(-300).map(String) : []); });
  h('ai:fix', (profileId, id) => { const p = getProfile(profileId); if (!p) throw new Error('Kein Profil'); return fix(p, String(id)); });
};
