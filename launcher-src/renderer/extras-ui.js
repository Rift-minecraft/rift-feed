/* Stats · Medien · Hosting (lokaler Server) · Wrapped · Skin Studio */
const fmtH = (min) => (min >= 60 ? (min / 60).toFixed(min >= 600 ? 0 : 1) + ' h' : Math.round(min) + ' min');
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function statsOf(sessions) {
  const total = sessions.reduce((a, s) => a + s.min, 0);
  const byV = {}, bySrv = {}, byDay = {}, byHour = new Array(24).fill(0), byWd = new Array(7).fill(0);
  sessions.forEach((s) => {
    byV[s.v] = (byV[s.v] || 0) + s.min; if (s.s) bySrv[s.s] = (bySrv[s.s] || 0) + s.min;
    const k = dayKey(s.t); byDay[k] = (byDay[k] || 0) + s.min;
    const d = new Date(s.t); byHour[d.getHours()] += s.min; byWd[d.getDay()] += s.min;
  });
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  let streak = 0, best = 0, run = 0; const keys = Object.keys(byDay).sort();
  keys.forEach((k, i) => { run = i && (new Date(k) - new Date(keys[i - 1])) / 864e5 === 1 ? run + 1 : 1; best = Math.max(best, run); });
  const t = new Date(); while (byDay[dayKey(t)]) { streak++; t.setDate(t.getDate() - 1); }
  if (!streak) { const y = new Date(); y.setDate(y.getDate() - 1); const t2 = y; while (byDay[dayKey(t2)]) { streak++; t2.setDate(t2.getDate() - 1); } }
  return { total, count: sessions.length, longest: sessions.reduce((a, s) => Math.max(a, s.min), 0), byV, bySrv, byDay, byHour, byWd, topV: top(byV), topS: top(bySrv), days: keys.length, streak, best };
}
const bars = (arr, labels, fmt = fmtH) => { const m = Math.max(1, ...arr); return `<div class="bars">${arr.map((v, i) => `<div class="bar" title="${esc(labels[i])}: ${fmt(v)}"><i style="height:${Math.max(2, v / m * 100)}%"></i><span>${esc(labels[i])}</span></div>`).join('')}</div>`; };
const hbar = (o) => { const e = Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6), m = e[0]?.[1] || 1; return e.length ? e.map(([k, v]) => `<div class="hb"><span>${esc(k)}</span><div><i style="width:${v / m * 100}%"></i></div><b>${fmtH(v)}</b></div>`).join('') : '<p class="mute">Noch keine Daten.</p>'; };

/* ---------------- Stats ---------------- */
async function renderStats() {
  content.innerHTML = '<h2>Statistiken</h2><div class="mute">Lade…</div>';
  const d = await api('stats:get'); if (view !== 'stats') return;
  const st = statsOf(d.sessions);
  const last = [], lab = []; for (let i = 13; i >= 0; i--) { const t = new Date(); t.setDate(t.getDate() - i); last.push(st.byDay[dayKey(t)] || 0); lab.push(t.getDate() + '.'); }
  content.innerHTML = `<h2>Statistiken <small>Dein Spiel im Überblick – gemessen ab dem ersten Start mit diesem Launcher</small></h2>
    <div class="statgrid">
      <div class="card stat"><small>Gesamtzeit</small><b>${fmtH(st.total)}</b></div><div class="card stat"><small>Sitzungen</small><b>${st.count}</b></div>
      <div class="card stat"><small>Längste Sitzung</small><b>${fmtH(st.longest)}</b></div><div class="card stat"><small>Ø pro Sitzung</small><b>${st.count ? fmtH(st.total / st.count) : '–'}</b></div>
      <div class="card stat"><small>Serie (Tage)</small><b>${st.streak}</b></div><div class="card stat"><small>Lieblingsversion</small><b>${st.topV ? esc(st.topV[0]) : '–'}</b></div></div>
    <div class="card"><h3>Letzte 14 Tage</h3>${bars(last, lab)}</div>
    <div class="twocol"><div class="card"><h3>Uhrzeit</h3>${bars(st.byHour, st.byHour.map((_, i) => i % 3 ? '' : String(i)))}</div>
      <div class="card"><h3>Wochentag</h3>${bars(st.byWd, DAYS)}</div></div>
    <div class="twocol"><div class="card"><h3>Versionen</h3>${hbar(st.byV)}</div><div class="card"><h3>Server</h3>${hbar(st.bySrv)}</div></div>`;
}

/* ---------------- Medien ---------------- */
let mediaTab = 'all';
const thumbQueue = []; let thumbBusy = 0;
function loadThumb(id, img) {
  thumbQueue.push([id, img]);
  const pump = () => { while (thumbBusy < 3 && thumbQueue.length) { const [i, el] = thumbQueue.shift(); if (!el.isConnected) continue; thumbBusy++; api('media:thumb', { id: i, width: 360 }).then((u) => { el.src = u; }).catch(() => {}).finally(() => { thumbBusy--; pump(); }); } };
  pump();
}
async function renderMedia() {
  content.innerHTML = `<h2>Medien <small>Screenshots, Clips (letzte 30 s) und Aufnahmen aus dem Spiel</small></h2>
    <div class="tabs" id="mtabs">${[['all', 'Alle'], ['shot', 'Screenshots'], ['clip', 'Clips'], ['rec', 'Aufnahmen']].map(([k, n]) => `<button class="tab ${mediaTab === k ? 'active' : ''}" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="mgrid" id="mgrid"><div class="mute">Lade…</div></div>`;
  $('#mtabs').onclick = (e) => { const b = e.target.closest('.tab'); if (b) { mediaTab = b.dataset.k; renderMedia(); } };
  let list = []; try { list = await api('media:list'); } catch (e) { toast(e.message, true); }
  if (view !== 'media') return;
  list = list.filter((m) => mediaTab === 'all' || m.kind === mediaTab);
  const g = $('#mgrid');
  if (!list.length) { g.innerHTML = '<div class="card mute" style="grid-column:1/-1">Noch nichts da. Im Spiel: <b>F2</b> Screenshot, <b>Rechte Umschalttaste</b> öffnet das Rift-Menü (Clip speichern, Aufnahme).</div>'; return; }
  g.innerHTML = '';
  list.forEach((m) => {
    const el = document.createElement('div'); el.className = 'card mitem';
    const lab = { shot: 'Screenshot', clip: 'Clip', rec: 'Aufnahme' }[m.kind];
    el.innerHTML = `<div class="mth"><img alt=""><span class="mk ${m.kind}">${lab}${m.video ? (m.secs ? ' · ' + Math.round(m.secs) + ' s' : '') : m.frames ? ' · ' + Math.round(m.frames / m.fps) + ' s' : ''}</span></div><div class="mmeta"><b>${esc(m.profile)}</b><small class="mute">${new Date(m.mtime).toLocaleString('de-DE')}</small></div>`;
    g.append(el); loadThumb(m.id, el.querySelector('img'));
    el.onclick = () => openMedia(m);
  });
}
async function openMedia(m) {
  const ov = document.createElement('div'); ov.className = 'mview';
  ov.innerHTML = `<div class="mbox"><div class="mstage"><img alt=""></div><div class="row"><button class="b" id="mRev">Im Ordner zeigen</button><button class="b danger" id="mDel">Löschen</button><button class="b" id="mClose" style="margin-left:auto">Schließen</button></div></div>`;
  document.body.append(ov); const img = ov.querySelector('img'); let timer = null;
  const close = () => { clearInterval(timer); ov.remove(); };
  ov.onclick = (e) => { if (e.target === ov) close(); }; $('#mClose', ov).onclick = close;
  $('#mRev', ov).onclick = guard(() => api('media:reveal', m.id));
  $('#mDel', ov).onclick = guard(async () => { if (!confirm('Wirklich löschen?')) return; await api('media:delete', m.id); close(); renderMedia(); });
  try {
    if (m.kind === 'shot') img.src = await api('media:full', m.id);
    else if (m.video) {                                          // Videoteile nahtlos hintereinander abspielen
      const urls = await api('media:videos', m.id); if (!urls.length) throw new Error('Keine Videodatei gefunden.');
      const v = document.createElement('video'); v.controls = true; v.autoplay = true; v.style.cssText = 'max-width:100%;max-height:62vh'; img.replaceWith(v);
      let k = 0; v.src = urls[0]; v.onended = () => { if (++k < urls.length) { v.src = urls[k]; v.play(); } };
    } else { const fr = await api('media:frames', { id: m.id, width: 800 }); let i = 0; img.src = fr[0]; const step = Math.max(1, Math.ceil(m.frames / 400)); timer = setInterval(() => { i = (i + 1) % fr.length; img.src = fr[i]; }, 1000 / ((m.fps || 10) / step)); }
  } catch (e) { toast(e.message, true); close(); }
}

/* ---------------- Wrapped ---------------- */
/* Nur zum Jahresende sichtbar: 31. Dezember bis 10. Januar */
function wrapSeason() { if (window.__wrapForce) return true; const d = new Date(); return (d.getMonth() === 11 && d.getDate() === 31) || (d.getMonth() === 0 && d.getDate() <= 10); }
async function renderWrapped() {
  if (!wrapSeason()) { go('play'); return; }
  content.innerHTML = '<h2>Rift Wrapped</h2><div class="mute">Lade…</div>';
  const d = await api('stats:get'); if (view !== 'wrapped') return;
  const year = new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear(); const ses = d.sessions.filter((s) => new Date(s.t).getFullYear() === year); const st = statsOf(ses);
  const wd = st.byWd.indexOf(Math.max(...st.byWd)), hr = st.byHour.indexOf(Math.max(...st.byHour));
  const cards = [
    ['Deine Spielzeit', fmtH(st.total), `in ${st.count} Sitzungen an ${st.days} Tagen`],
    ['Lieblingsversion', st.topV ? st.topV[0] : '–', st.topV ? fmtH(st.topV[1]) + ' gespielt' : 'Noch keine Daten'],
    ['Längste Sitzung', fmtH(st.longest), st.best ? `Beste Serie: ${st.best} Tage am Stück` : ''],
    ['Zockerzeit', st.total ? `${DAYS[wd]} · ${hr}:00 Uhr` : '–', 'Wann du am meisten spielst'],
    ['Lieblingsserver', st.topS ? st.topS[0] : '–', st.topS ? fmtH(st.topS[1]) : 'Noch auf keinem Server'],
    ['Sammlung', `${(S.owned || []).length} Items`, `${S.coins} Rift Coins auf dem Konto`]
  ];
  const hrs = st.total / 60, mcDays = hrs / 24;
  const dayArr = st.byWd, maxD = Math.max(1, ...dayArr);
  const slides = [
    { bg: ['#0a0a0d', '#3a0f16'], html: `<div class="ws-star"><svg viewBox="0 0 24 24"><path d="M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z"/></svg></div><small>RIFT WRAPPED</small><h1>${year}</h1><p>${esc(S.account?.name || '')}, so war dein Jahr in Minecraft.</p>` },
    { bg: ['#111116', '#5a1822'], html: `<small>DEINE SPIELZEIT</small><h1 class="big"><span data-count="${hrs.toFixed(1)}" data-dec="${hrs >= 10 ? 0 : 1}">0</span><em>h</em></h1><p>in ${st.count} Sitzungen an ${st.days} verschiedenen Tagen${hrs >= 12 ? `<br>Das sind ${mcDays.toFixed(1)} volle Tage am Stück.` : ''}</p>` },
    { bg: ['#0d0d12', '#2d2d3a'], html: `<small>LIEBLINGSVERSION</small><h1 class="mid">${esc(st.topV ? st.topV[0] : '–')}</h1><div class="ws-hb">${hbar(st.byV)}</div>` },
    { bg: ['#160c0e', '#6b1a24'], html: `<small>DEINE ZOCKERTAGE</small><div class="ws-bars">${DAYS.map((d, i) => `<div><i style="--h:${Math.max(4, dayArr[i] / maxD * 100)}%;animation-delay:${0.1 + i * 0.08}s" class="${dayArr[i] === maxD && st.total ? 'top' : ''}"></i><span>${d}</span></div>`).join('')}</div><p>${st.total ? `Am liebsten spielst du <b>${['sonntags', 'montags', 'dienstags', 'mittwochs', 'donnerstags', 'freitags', 'samstags'][wd]}</b> gegen <b>${hr}:00 Uhr</b>.` : 'Noch keine Daten.'}</p>` },
    { bg: ['#14110a', '#5c4310'], html: `<small>LÄNGSTE SITZUNG</small><h1 class="big"><span data-count="${(st.longest / 60).toFixed(1)}" data-dec="1">0</span><em>h</em></h1><p>${st.best ? `Deine beste Serie: <b>${st.best} Tage</b> am Stück.` : 'Spiele an mehreren Tagen hintereinander für eine Serie.'}${st.streak ? `<br>Aktuell: ${st.streak} Tage in Folge.` : ''}</p>` },
    { bg: ['#0a0a0d', '#7d1f2b'], html: `<small>LIEBLINGSSERVER</small><h1 class="mid">${esc(st.topS ? st.topS[0] : 'Singleplayer')}</h1><p>${st.topS ? fmtH(st.topS[1]) + ' dort verbracht.' : 'Du hast noch keinen Server über den Launcher besucht.'}</p>` },
    { bg: ['#0b0b10', '#26262e'], html: `<small>DEIN JAHR IN ZAHLEN</small><div class="ws-sum">${cards.map(([t, v]) => `<div><span>${esc(t)}</span><b>${esc(v)}</b></div>`).join('')}</div><button class="b primary" id="wsave">Als Bild speichern</button>` }
  ];
  content.innerHTML = `<h2>Rift Wrapped <small>${year}</small></h2><div class="ws-wrap"><div class="ws" id="ws"><div class="ws-prog">${slides.map(() => '<i><b></b></i>').join('')}</div>
    ${slides.map((sl, i) => `<section class="ws-s" data-i="${i}" style="background:linear-gradient(165deg,${sl.bg[0]},${sl.bg[1]})">${sl.html}</section>`).join('')}
    <div class="ws-hit l"></div><div class="ws-hit r"></div></div></div><p class="mute" style="text-align:center">Klicke rechts/links oder nutze ← →. Wrapped zählt nur Sitzungen, die dieser Launcher gemessen hat.</p>`;
  let cur = -1, timer = null, anim = 0; const root = $('#ws'), N = slides.length, DUR = 6500;
  const countUp = (sec) => sec.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count) || 0, dec = +el.dataset.dec || 0, t0 = performance.now();
    const f = (now) => { const k = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - k, 3); el.textContent = (end * e).toFixed(dec); if (k < 1 && cur >= 0) anim = requestAnimationFrame(f); }; anim = requestAnimationFrame(f);
  });
  const show = (i) => {
    if (i < 0 || i >= N) return; cur = i; clearTimeout(timer); cancelAnimationFrame(anim);
    root.querySelectorAll('.ws-s').forEach((e, k) => { e.classList.remove('on'); if (k === i) { void e.offsetWidth; e.classList.add('on'); countUp(e); } });
    root.querySelectorAll('.ws-prog i').forEach((e, k) => { e.className = k < i ? 'done' : ''; const b = e.firstChild; b.style.animation = 'none'; void b.offsetWidth; if (k === i && i < N - 1) b.style.animation = `wsFill ${DUR}ms linear forwards`; });
    if (i < N - 1) timer = setTimeout(() => show(i + 1), DUR);
  };
  root.querySelector('.ws-hit.r').onclick = () => show(Math.min(N - 1, cur + 1)); root.querySelector('.ws-hit.l').onclick = () => show(Math.max(0, cur - 1));
  const key = (e) => { if (view !== 'wrapped') { document.removeEventListener('keydown', key); clearTimeout(timer); return; } if (e.key === 'ArrowRight') show(Math.min(N - 1, cur + 1)); if (e.key === 'ArrowLeft') show(Math.max(0, cur - 1)); };
  document.addEventListener('keydown', key); show(0);
  $('#wsave').onclick = () => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1500; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 1080, 1500); g.addColorStop(0, '#0c0c0e'); g.addColorStop(1, '#3a0f16'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1500);
    x.fillStyle = '#ffc83d'; x.font = 'bold 64px sans-serif'; x.fillText('RIFT WRAPPED ' + year, 70, 120); x.font = '30px sans-serif'; x.fillStyle = '#9a9aa5'; x.fillText(S.account?.name || '', 70, 170);
    cards.forEach(([t, v, s], i) => { const cx = 70 + (i % 2) * 480, cy = 250 + Math.floor(i / 2) * 400; x.fillStyle = '#16161b'; x.fillRect(cx, cy, 460, 370); x.strokeStyle = '#ffffff30'; x.strokeRect(cx + .5, cy + .5, 459, 369);
      x.fillStyle = '#9a9aa5'; x.font = '28px sans-serif'; x.fillText(t, cx + 30, cy + 60); x.fillStyle = '#fff'; let fs = 72; x.font = `bold ${fs}px sans-serif`; while (x.measureText(v).width > 400 && fs > 30) { fs -= 4; x.font = `bold ${fs}px sans-serif`; } x.fillText(v, cx + 30, cy + 190);
      x.fillStyle = '#9a9aa5'; x.font = '26px sans-serif'; x.fillText(s.slice(0, 30), cx + 30, cy + 300); });
    c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'rift-wrapped-' + year + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
  };
}
