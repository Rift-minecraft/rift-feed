/* Countdowns (Admin): 1 = nicht schließbar, 2 = schließbar + kleine Anzeige oben rechts, 3 = Update-/Release-Countdown */
(() => {
  let list = [], closed = new Set(); try { closed = new Set(JSON.parse(localStorage.getItem('cdClosed') || '[]')); } catch {}
  let shown = null, timer = 0;
  const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
  const parts = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 }; };
  const short = (ms) => { const p = parts(ms); return p.d ? `${p.d}T ${pad(p.h)}:${pad(p.m)}` : `${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`; };
  const save = () => { try { localStorage.setItem('cdClosed', JSON.stringify([...closed].slice(-50))); } catch {} };
  const unit = (v, l) => `<div class="cdu"><b data-v="${v}">${v}</b><small>${l}</small></div>`;

  function box(a) {
    const o = document.createElement('div'); o.id = 'cdBox'; o.className = 'cdbox m-' + a.mode;
    const adm = typeof S !== "undefined" && !!S.admin, locked = a.mode === 'locked';
    o.innerHTML = `<div class="cdcard"><div class="cdkind">${a.mode === 'release' ? 'RELEASE' : a.mode === 'locked' ? 'WICHTIG' : 'COUNTDOWN'}</div><h2>${esc(a.title)}</h2><p>${esc(a.message || '')}</p>
      <div class="cdrow" id="cdDigits"></div><div class="cdend" id="cdEnd"></div>
      <div class="row" style="justify-content:center;margin-top:16px">${!locked || adm ? `<button class="b" id="cdClose">${locked ? 'Schließen (Admin)' : 'Schließen'}</button>` : ''}${adm ? '<button class="b danger" id="cdDel">Für alle entfernen</button>' : ''}</div></div>`;
    document.body.append(o);
    const close = () => { o.classList.add('out'); setTimeout(() => o.remove(), 350); shown = null; if (!locked) { closed.add(a.id); save(); } else if (adm) closed.add(a.id); tick(); };
    if ($('#cdClose')) $('#cdClose').onclick = close;
    if ($('#cdDel')) $('#cdDel').onclick = async () => { try { await api('admin:remove', a.id); toast('Countdown entfernt'); } catch (e) { toast(e.message, true); } closed.add(a.id); close(); window.pollFeed && pollFeed(); };
    shown = a.id; return o;
  }

  function tick() {
    const now = Date.now(); const act = list.filter((a) => a.type === 'countdown' && new Date(a.endsAt).getTime() > now - 3600e3);
    const adm = typeof S !== "undefined" && !!S.admin;
    // Box: wichtigster Countdown, der noch nicht geschlossen wurde
    const want = act.find((a) => a.mode === 'locked' && !(adm && closed.has(a.id)) && new Date(a.endsAt) > now) || act.find((a) => !closed.has(a.id));
    if (want && shown !== want.id && !document.getElementById('cdBox')) box(want);
    if (shown && !want) { document.getElementById('cdBox')?.remove(); shown = null; }
    const cur = shown && act.find((a) => a.id === shown);
    if (cur) {
      const ms = new Date(cur.endsAt).getTime() - now, p = parts(ms), dg = document.getElementById('cdDigits');
      if (dg) {
        if (ms <= 0) { dg.innerHTML = `<div class="cdnow">${cur.mode === 'release' ? 'Jetzt verfügbar!' : 'Es geht los!'}</div>`; }
        else { const v = [[p.d, 'Tage'], [pad(p.h), 'Std'], [pad(p.m), 'Min'], [pad(p.s), 'Sek']]; if (!dg.dataset.init) { dg.innerHTML = v.map(([x, l]) => unit(x, l)).join(''); dg.dataset.init = 1; } else dg.querySelectorAll('b').forEach((b, i) => { const nv = String(v[i][0]); if (b.textContent !== nv) { b.textContent = nv; b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); } }); }
      }
      const en = document.getElementById('cdEnd'); if (en) en.textContent = new Date(cur.endsAt).toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'short' }) + ' Uhr';
    }
    // Chip oben rechts für geschlossene (nicht-gesperrte) Countdowns
    const chipA = act.find((a) => a.mode !== 'locked' && closed.has(a.id) && new Date(a.endsAt).getTime() > now);
    let chip = document.getElementById('cdChip');
    if (chipA) {
      if (!chip) { chip = document.createElement('div'); chip.id = 'cdChip'; chip.className = 'pill btn cdchip'; const ref = document.getElementById('offPill') || document.getElementById('coinPill'); ref.parentNode.insertBefore(chip, ref); }
      chip.title = chipA.title; chip.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg><b>${short(new Date(chipA.endsAt).getTime() - now)}</b>`;
      chip.onclick = () => { closed.delete(chipA.id); save(); tick(); };
    } else if (chip) chip.remove();
  }
  window.cdUpdate = (announcements) => { list = (announcements || []).filter((a) => a.type === 'countdown'); tick(); clearInterval(timer); if (list.length) timer = setInterval(tick, 1000); };
})();
