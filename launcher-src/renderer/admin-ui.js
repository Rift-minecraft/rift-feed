/* Admin-Bereich (erscheint links, sobald der Admin-Code eingelöst wurde): Update hochladen, Ankündigungen, GitHub-Verbindung */
const KIND_LABEL = { news: 'News', info: 'Info', maintenance: 'Wartung', countdown: 'Countdown' };
const nowLocal = () => { const d = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4); return d.toISOString().slice(0, 16); };
const schedHtml = (id) => `<label class="f">Zeitplan <small class="mute">(leer = sofort an alle)</small><div class="row"><input type="datetime-local" id="${id}" min="${nowLocal()}" style="flex:1"><button type="button" class="b mini" data-clr="${id}">Sofort</button></div></label>`;
const readSched = (id) => { const v = $('#' + id).value; if (!v) return null; const t = new Date(v); if (!isFinite(t)) throw new Error('Ungültiges Datum.'); if (t < Date.now()) throw new Error('Der Zeitpunkt liegt in der Vergangenheit.'); return t.toISOString(); };
const wireSched = () => content.querySelectorAll('[data-clr]').forEach((b) => (b.onclick = () => { $('#' + b.dataset.clr).value = ''; }));
const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

function adminGate() { if (!S.admin) { go('play'); return false; } return true; }

/* ---------- Setup: GitHub verbinden ---------- */
async function renderAdminSetup() {
  if (!adminGate()) return;
  const st = await api('admin:status').catch(() => ({}));
  content.innerHTML = `<h2>Admin · Setup <small>Verbindung zu GitHub – darüber gehen Updates und Ankündigungen an alle Spieler</small></h2><div class="form" style="max-width:640px">
    ${st.connected ? `<div class="card"><b>✓ Verbunden</b><div class="mute">GitHub-Konto <b>${esc(st.user)}</b> · Feed-Repo <b>${esc(st.repo)}</b></div>
        <p class="mute" style="font-size:12px;margin:10px 0 4px">Damit auch <b>neu installierte</b> Launcher den Feed kennen, steht in <code>config.json</code> (vor dem Bauen des Installers) diese Zeile:</p>
        <pre class="codebox" id="cfgline">"feedRepo": "${esc(st.repo)}"</pre>
        <div class="row"><button class="b mini" id="cpy">Kopieren</button><button class="b mini danger" id="disc">Trennen</button></div></div>`
      : `<div class="card"><b>Mit GitHub verbinden (einmalig)</b>
        <ol class="mute" style="margin:8px 0 8px 18px;line-height:1.7"><li>Auf „Token erstellen“ klicken, bei GitHub anmelden und unten auf <b>Generate token</b> drücken (Berechtigung <b>repo</b> ist schon gewählt).</li><li>Das Token (beginnt mit <code>ghp_</code>) kopieren und hier einfügen.</li></ol>
        <div class="row"><button class="b" id="tokPage">Token erstellen</button></div>
        <label class="f">Token<input id="tok" type="password" placeholder="ghp_…" autocomplete="off"></label>
        <button class="b primary" id="conn">Verbinden &amp; Feed-Repo anlegen</button>
        <small class="mute">Das Token wird nur auf diesem PC gespeichert (AppData) und nie an Spieler oder in den Feed geschickt.</small></div>`}
    <div class="card mute" style="font-size:12px">Ohne eigenen Server: GitHub speichert die Ankündigungen (<code>rift-feed</code>) und die Update-Dateien (Releases) kostenlos. Spieler-Launcher lesen das automatisch.</div></div>`;
  if (st.connected) {
    $('#cpy').onclick = () => { navigator.clipboard?.writeText($('#cfgline').textContent); toast('Kopiert'); };
    $('#disc').onclick = guard(async () => { if (confirm('GitHub-Verbindung trennen?')) { await api('admin:disconnect'); renderAdminSetup(); } });
  } else {
    $('#tokPage').onclick = () => api('admin:openTokenPage');
    $('#conn').onclick = guard(async () => { const r = await api('admin:connect', $('#tok').value); toast('Verbunden mit ' + r.repo); S = await api('state:get'); renderAdminSetup(); });
  }
}

/* ---------- Update hochladen ---------- */
async function renderAdminUpdate() {
  if (!adminGate()) return;
  const st = await api('admin:status').catch(() => ({}));
  if (!st.connected) { content.innerHTML = `<h2>Admin · Update</h2><div class="card hero"><p>Erst mit GitHub verbinden.</p><button class="b primary" id="goSet">Zum Setup</button></div>`; $('#goSet').onclick = () => go('admin_setup'); return; }
  let file = null;
  content.innerHTML = `<h2>Admin · Update veröffentlichen <small>Aktuell: v${esc(S.appVersion || '')} · Feed: ${esc(st.repo)}</small></h2><div class="form" style="max-width:660px">
    <div class="dropz" id="dz"><div class="bigicon">⬆</div><b id="dzT">ZIP hier ablegen oder klicken</b><small class="mute" id="dzS">Das Launcher-Projekt als ZIP (so wie du es von mir bekommst) – oder eine fertige Installer-EXE</small></div>
    <label class="f">Changelog<textarea id="unotes" placeholder="- Neue Cosmetics&#10;- Bugfixes"></textarea></label>
    <div class="row"><label class="f" style="flex:1">Version <small class="mute">(leer = automatisch +1)</small><input id="uver" placeholder="automatisch"></label></div>
    <label class="row"><input type="checkbox" id="umust" style="min-width:0"> Pflicht-Update (Popup nicht schließbar, Spielstart gesperrt)</label>
    <label class="row"><input type="checkbox" id="ubeta" style="min-width:0"> Nur als <b>Beta</b> senden (nur Spieler mit „Beta-Updates“ in den Einstellungen bekommen es)</label>
    ${schedHtml('ustart')}
    <button class="b primary big" id="upub" disabled>Veröffentlichen &amp; an alle senden</button>
    <div class="upwrap" id="aw"><div class="uptop"><span id="astep">…</span><b id="apct">0%</b></div><div class="upbar"><i></i></div></div>
    <div id="ares"></div>
    <div id="betas"></div>
    <small class="mute">Aus der ZIP werden automatisch die richtigen Dateien herausgesucht (Code, Oberfläche, Mod-Jar), auf Fehler geprüft und als kleines Update-Paket an alle Spieler verteilt. Die Launcher holen es innerhalb von ca. 2 Minuten und aktualisieren sich mit einem Klick – ohne Neuinstallation.</small></div>`;
  const betaList = async () => {
    const l = (await api('admin:feed').catch(() => [])).filter((a) => a.type === 'update');
    $('#betas').innerHTML = l.length ? `<div class="card"><b>Veröffentlichte Updates</b>${l.map((a) => `<div class="row" style="margin-top:8px;justify-content:space-between"><span>v${esc(a.version)} <small class="mute">${a.beta ? '· Beta (nur Tester)' : '· Full Release'}</small></span>${a.beta ? `<button class="b primary" data-full="${esc(a.id)}">Full Release für alle</button>` : ''}</div>`).join('')}</div>` : '';
    $('#betas').querySelectorAll('[data-full]').forEach((b) => (b.onclick = guard(async () => { b.disabled = true; const r = await api('admin:promoteUpdate', b.dataset.full); toast('v' + r.version + ' ist jetzt Full Release – alle bekommen es.'); pollFeed?.(); betaList(); })));
  };
  betaList();
  wireSched();
  const setFile = (f) => { file = f; $('#dzT').textContent = f.name; $('#dzS').textContent = `${fmtSize(f.size)} · ${f.kind === 'exe' ? 'Installer (alle müssen neu installieren)' : 'Update-Paket (automatisch erstellt)'}`; $('#upub').disabled = false; };
  $('#dz').onclick = guard(async () => { const f = await api('admin:pickFile'); if (f) setFile(f); });
  $('#dz').ondragover = (e) => { e.preventDefault(); $('#dz').classList.add('over'); };
  $('#dz').ondragleave = () => $('#dz').classList.remove('over');
  $('#dz').ondrop = guard(async (e) => { e.preventDefault(); $('#dz').classList.remove('over'); const p = rift.pathOf(e.dataTransfer.files[0]); if (!p) throw new Error('Datei konnte nicht gelesen werden – bitte klicken und auswählen.'); setFile(await api('admin:fileInfo', p)); });
  $('#upub').onclick = guard(async () => {
    $('#upub').disabled = true; $('#aw').classList.add('on'); $('#aw').classList.remove('done'); $('#ares').innerHTML = '';
    try {
      const r = await api('admin:publishUpdate', { filePath: file.path, notes: $('#unotes').value.trim(), version: $('#uver').value.trim(), mandatory: $('#umust').checked, beta: $('#ubeta').checked, startsAt: readSched('ustart') });
      $('#aw').classList.add('done');
      $('#ares').innerHTML = `<div class="card"><b>✓ ${r.startsAt ? 'Geplant für ' + esc(new Date(r.startsAt).toLocaleString('de-DE')) : 'Veröffentlicht'}: v${esc(r.version)}</b><div class="mute" style="font-size:12px">${r.hot ? `Update-Paket mit ${r.files} Dateien${r.mod ? ' inkl. Mod' : ''} (${fmtSize(r.size)})` : 'Installer-EXE'} · <a href="${esc(r.release)}" target="_blank" style="color:#fff">Release ansehen</a></div></div>`;
      toast('Update v' + r.version + (r.beta ? ' als Beta verteilt!' : ' verteilt!')); pollFeed?.(); betaList();
    } catch (e) { $('#upub').disabled = false; $('#aw').classList.remove('on'); throw e; }
  });
}
rift.on('admin:progress', (d) => { const i = $('#aw .upbar i'); if (!i) return; $('#astep').textContent = d.step; if (d.pct != null) { i.style.width = d.pct + '%'; $('#apct').textContent = Math.round(d.pct) + '%'; } });

/* ---------- Ankündigungen / Wartung ---------- */
async function renderAdminNews() {
  if (!adminGate()) return;
  const st = await api('admin:status').catch(() => ({}));
  if (!st.connected) { content.innerHTML = `<h2>Admin · Ankündigungen</h2><div class="card hero"><p>Erst mit GitHub verbinden.</p><button class="b primary" id="goSet">Zum Setup</button></div>`; $('#goSet').onclick = () => go('admin_setup'); return; }
  let list = []; try { list = await api('admin:feed'); } catch (e) { toast(e.message, true); }
  let type = 'news';
  content.innerHTML = `<h2>Admin · Ankündigungen <small>Popups, News und Wartungsmodus an alle Spieler</small></h2><div class="form" style="max-width:660px">
    <div class="row" id="atypes">${Object.entries(KIND_LABEL).map(([k, v]) => `<button class="b mini" data-t="${k}">${v}</button>`).join('')}</div>
    <div id="anormal" class="form"><label class="f">Titel<input id="atitle" maxlength="120"></label><label class="f">Nachricht<textarea id="amsg" maxlength="2000"></textarea></label>
      <label class="f">Link (optional, https)<input id="alink" placeholder="https://…"></label>
      <label class="f">Gültig für<select id="aexp"><option value="1">1 Stunde</option><option value="6">6 Stunden</option><option value="24">1 Tag</option><option value="168">7 Tage</option><option value="0">Nie</option></select></label></div>
    <div id="acd" class="card form" style="display:none"><b>Countdown</b>
      <label class="f">Art<select id="acdmode"><option value="locked">1 · Nicht schließbar (nur Admin kann ihn schließen)</option><option value="closable">2 · Schließbar – danach kleine Anzeige oben rechts</option><option value="release">3 · Update-/Release-Countdown (z. B. Launcher-Release)</option></select></label>
      <label class="f">Ziel-Zeitpunkt<input type="datetime-local" id="acdend" min="${nowLocal()}"></label></div>
    <div id="amaint" class="card" style="display:none"><b>Wartungsmodus</b><div class="mute" style="font-size:12px">Spieler sehen einen Vollbild-Screen mit „Estimated time“. Beenden: unten in der Liste entfernen.</div>
      <label class="f">Geschätzte Dauer<select id="aeta"><option value="15">15 Minuten</option><option value="30">30 Minuten</option><option value="60">1 Stunde</option><option value="120">2 Stunden</option><option value="240">4 Stunden</option><option value="0">Unbekannt</option></select></label></div>
    <label class="row" style="font-size:13px"><input type="checkbox" id="ashowai" style="min-width:0"> Auch nach Installation zeigen (neue Spieler sehen es sofort, sonst nur bereits installierte)</label>
    ${schedHtml('astart')}
    <button class="b primary" id="apost">An alle senden</button>
    <h3 style="margin-top:10px">Aktiv &amp; geplant</h3><div id="alist"></div></div>`;
  wireSched();
  const paint = () => {
    content.querySelectorAll('#atypes [data-t]').forEach((b) => b.classList.toggle('primary', b.dataset.t === type));
    $('#anormal').style.display = type === 'maintenance' ? 'none' : ''; $('#acd').style.display = type === 'countdown' ? '' : 'none'; $('#amaint').style.display = type === 'maintenance' ? '' : 'none';
    $('#alist').innerHTML = list.length ? list.map((a) => `<div class="card" style="display:flex;gap:10px;align-items:center;margin-bottom:6px"><div style="flex:1"><b>${esc(a.title)}</b> <span class="tag">${esc(a.type)}${a.version ? ' v' + esc(a.version) : ''}</span>${a.startsAt ? `<div class="mute" style="font-size:11px">Geplant: ${esc(new Date(a.startsAt).toLocaleString('de-DE'))}</div>` : ''}</div><button class="b mini danger" data-rm="${esc(a.id)}">Entfernen</button></div>`).join('') : '<div class="mute">Nichts aktiv.</div>';
    $('#alist').querySelectorAll('[data-rm]').forEach((b) => (b.onclick = guard(async () => { list = await api('admin:remove', b.dataset.rm); paint(); pollFeed?.(); })));
  };
  content.querySelectorAll('#atypes [data-t]').forEach((b) => (b.onclick = () => { type = b.dataset.t; paint(); }));
  $('#apost').onclick = guard(async () => {
    list = await api('admin:post', { type, title: $('#atitle').value, message: $('#amsg').value, link: $('#alink').value, expiresHours: +$('#aexp').value, etaMinutes: +$('#aeta').value, startsAt: readSched('astart'), mode: $('#acdmode').value, showAfterInstall: $('#ashowai').checked, endsAt: type === 'countdown' ? $('#acdend').value : undefined });
    toast('Gesendet!'); $('#atitle').value = ''; $('#amsg').value = ''; paint(); pollFeed?.();
  });
  paint();
}
