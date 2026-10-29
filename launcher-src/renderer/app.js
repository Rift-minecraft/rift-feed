/* ================== Helpers ================== */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = (ch, ...a) => rift.invoke(ch, ...a).then((r) => { if (!r.ok) throw new Error(r.error); if (ch === 'shop:equip' || ch === 'editor:save') setTimeout(() => publishCosmetics(), 50); return r.data; });
const content = $('#content');
let S = null;              // Launcher-State
let view = 'play';
let game = { status: 'idle', text: '', pct: 0, log: [] };
let viewer = null;
let accountProfile = null; // Minecraft-Profil (Skin/Capes) bei MS-Login
let mrState = { type: 'mod', query: '', hits: [], loading: false, provider: 'modrinth' }, mrSeq = 0;

function toast(msg, err = false) {
  const ok = !err && /^(✓|Installiert|Gespeichert|Importiert|Kopiert|Freund hinzugefügt|Modpack|Neu:|Update|Intro an|Cloud-Adresse|Code kopiert|Entfernt|\d+ Mod)/i.test(msg);
  const dur = err ? 7000 : 4200, t = document.createElement('div');
  t.className = 't ' + (err ? 'err' : ok ? 'ok' : 'info');
  t.style.setProperty('--dur', dur + 'ms');
  const ic = err ? '<path d="M12 8v5m0 3.5v.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.700 3.900a2 2 0 0 0-3.400 0z"/>' : ok ? '<path d="M5 12.500l4.500 4.500L19 7.500"/>' : '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8.500v.01"/>';
  t.innerHTML = `<svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round">${ic}</svg><span class="tm"></span><i class="tb"></i>`;
  t.querySelector('.tm').textContent = msg;
  const box = $('#toast'); box.append(t); while (box.children.length > 5) box.firstChild.remove();
  const out = () => { if (!t.isConnected) return; t.classList.add('bye'); setTimeout(() => t.remove(), 320); };
  let to = setTimeout(out, dur); t.onclick = () => { clearTimeout(to); out(); };
}
const guard = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message, true); } };
const RARITY = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic', event: 'Halloween', secret: 'Secret', plus: 'Rift+' };
const profile = () => S.profiles.find((p) => p.id === S.selectedProfile);
const item = (id) => S.items.find((i) => i.id === id);
const TYPE_LABEL = { cape: 'Cape', skin: 'Skin', nametag: 'Nametag', pet: 'Pet', aura: 'Aura', badge: 'Badge', emote: 'Emote' };
const LOADERS = { vanilla: 'Vanilla', fabric: 'Fabric', quilt: 'Quilt', forge: 'Forge', neoforge: 'NeoForge' };

function itemTile(it, { locked, equipped, extra = '' } = {}) {
  const el = document.createElement('div');
  el.className = `item r-${it.rarity}` + (locked ? ' locked' : '') + (equipped ? ' eq' : '');
  const cv = RT.front(it);
  cv.style.cssText = `width:100%;height:110px;image-rendering:${['nametag', 'aura', 'badge'].includes(it.type) ? 'auto' : 'pixelated'};object-fit:contain`;
  el.append(cv);
  el.insertAdjacentHTML('beforeend', `<b>${esc(it.name)}</b><span class="tag t-${it.rarity}">${RARITY[it.rarity]} ${TYPE_LABEL[it.type]}</span>${extra}`);
  return el;
}

/* ================== Chrome ================== */
function applyPlusColor() { document.documentElement.style.setProperty('--plus', S?.plus?.color || '#22c55e'); }
function renderChrome() {
  applyPlusColor();
  { const off = NET.off; document.body.classList.toggle('offline', off); $('#hwTile').classList.toggle('locked', off); $('#offPill').style.display = off ? '' : 'none';
    document.querySelectorAll('.nav').forEach((b) => b.classList.toggle('locked', off && OFFLINE_LOCK.includes(b.dataset.view))); }
  { const prev = +$('#coinCount').textContent; if (prev && S.coins > prev) { document.body.classList.add('coinbump'); setTimeout(() => document.body.classList.remove('coinbump'), 700); } }
  $('#coinCount').textContent = S.coins;
  const hw = !!S.events?.halloween?.active; $('#hwTile').style.display = hw ? '' : 'none';
  if (hw) { const x = S.pass?.xp || 0, per = 80, t = Math.min(20, Math.floor(x / per)); $('#hwSub').textContent = `Stufe ${t}/20 · 🍬 ${S.candy || 0}`; $('#hwFill').style.width = (t >= 20 ? 100 : (x % per) / per * 100) + '%'; }
  $('#wrapPill').style.display = wrapSeason() ? '' : 'none'; $('#wrapPill').onclick = () => go('wrapped');
  $('#giftPill').classList.toggle('ready', !!S.daily?.claimable);
  $('#adminNav').style.display = S.admin ? '' : 'none';
  { const pn = $('#plusNav'); if (pn) pn.style.display = S.plus?.active ? '' : 'none'; }
  document.querySelector('.logo')?.classList.toggle('plus', !!(S.plus && S.plus.active));
  { const vb = document.querySelector('.brand small'); if (vb) vb.textContent = 'v' + String(S.appVersion || appVersion).replace(/^v/, ''); }
  const p = profile();
  $('#profilePill').textContent = p ? `${p.name} · ${p.mcVersion} · ${LOADERS[p.loader] || p.loader}` : 'Kein Profil';
  const acc = S.account;
  $('#accountName').textContent = acc ? acc.name : '';
  const head = $('#accountHead');
  if (acc) { head.style.display = ''; head.src = `https://mc-heads.net/avatar/${acc.uuid}/28`; head.onerror = () => (head.style.display = 'none'); }
  else head.style.display = 'none';
}
const ACCENTS = { white: '#ffffff', green: '#22c55e', blue: '#3b82f6', purple: '#a855f7', red: '#ef4444', orange: '#f97316', pink: '#ec4899' };
function applyStyle() {
  const st = S?.settings || {}; document.body.classList.toggle('fxmo', !!st.fxMotion);
  document.documentElement.dataset.accent = st.accent || 'white';
  document.documentElement.dataset.bg = st.bg || 'black';
  I18N.setLang(st.lang || 'de');
}
document.querySelectorAll('.nav').forEach((b) => b.addEventListener('click', () => { if (b.dataset.view === 'mods') modsTarget = null; go(b.dataset.view); }));
document.addEventListener('click', (e) => { const b = e.target.closest('[data-win]'); if (b) api('win:control', b.dataset.win); });
$('#profilePill').onclick = () => go('profiles');
$('#giftPill').onclick = () => showDaily();
$('#accountPill').onclick = () => go('settings');

rift.on('nav', (v) => { if (S && S.account) go(v); });
/* Unter-Tabs: Server gehört zum Hosting, Wrapped zu den Stats */
const SUBTABS = {};
function ensureSubtabs() {
  const g = SUBTABS[view]; const have = $('#subtabs');
  if (!g) { have?.remove(); return; }
  if (have && have.dataset.v === view) return;
  have?.remove();
  content.insertAdjacentHTML('afterbegin', `<div class="tabs" id="subtabs" data-v="${view}" style="margin-bottom:16px">${g.map(([k, n]) => `<div class="tab ${k === view ? 'active' : ''}" data-go="${k}">${n}</div>`).join('')}</div>`);
  content.querySelectorAll('#subtabs .tab').forEach((t) => (t.onclick = () => go(t.dataset.go)));
}
new MutationObserver(() => ensureSubtabs()).observe(content, { childList: true });
const NET = { off: false };
const OFFLINE_LOCK = ['plus', 'skins', 'capes', 'cosmetics', 'crates', 'shop', 'mods', 'pass', 'media'];
function go(v, arg) {
  if (NET.off && OFFLINE_LOCK.includes(v)) { const b = document.querySelector('.nav[data-view="' + v + '"]'); if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } toast?.('Offline – hier brauchst du Internet'); return; }
  if (!S.account) { renderChrome(); return renderSetup(); }   // ohne Login kein Hauptmenü
  $('#login').classList.add('hidden'); document.body.classList.remove('locked');
  view = v;
  document.querySelectorAll('.nav').forEach((b) => b.classList.toggle('active', b.dataset.view === v || (false) || (v === 'wrapped' && b.dataset.view === 'stats') || (v === 'picker' && b.dataset.view === 'profiles') || (v === 'editor' && b.dataset.view === 'capes')));
  if (viewer) { viewer.dispose(); viewer = null; }
  if (window.__editorKeys) { document.removeEventListener('keydown', window.__editorKeys); window.__editorKeys = null; }
  renderChrome();
  ({ play: renderPlay, profiles: renderProfiles, picker: renderPicker, cosmetics: renderCosmetics, crates: renderCrates, editor: renderEditor, mods: renderMods, skins: renderSkins, capes: renderCapes, shop: renderShop, plus: renderPlusTab, friends: renderFriends, settings: renderSettings, pass: (a) => renderPass(a), stats: (a) => renderStats(a), media: (a) => renderMedia(a), wrapped: (a) => renderWrapped(a), admin_update: (a) => renderAdminUpdate(a), admin_news: (a) => renderAdminNews(a), admin_setup: (a) => renderAdminSetup(a) })[v](arg);
}

/* ================== 3D-Viewer ================== */
async function loadAccountProfile() {
  if (S.account?.type !== 'ms') { accountProfile = null; return; }
  try { accountProfile = await api('skin:account'); } catch { accountProfile = null; }
}
function attachPet(v, canvas) {
  const pet = S.equipped.pet && item(S.equipped.pet);
  if (!pet) return;
  try { if (window.Pets3D?.has(pet.pet)) { const off = Pets3D.attach(v, pet.pet, canvas); const dispose = v.dispose?.bind(v); if (dispose) v.dispose = () => { off(); dispose(); }; return; } } catch (e) { console.warn('3D-Pet nicht möglich, Fallback auf Sprite:', e.message); }
  attachPet2D(v, canvas, pet);
}
function attachPet2D(v, canvas, pet) {
  const el = document.createElement('div'); el.className = 'petsprite';
  el.append(RT.petSprite(pet));
  const img = new Image();                                   // optional: eigenes Bild renderer/pets/<pet>.png ersetzt den Pixel-Sprite
  img.onload = () => el.replaceChildren(img); img.src = `pets/${pet.pet}.png`;
  canvas.parentElement.append(el);
  let t = 0;
  const tick = () => {
    if (!document.body.contains(el)) return;
    t += 0.06;
    const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height;
    let x = canvas.offsetLeft + W * 0.36, y = canvas.offsetTop + H * 0.27;           // Fallback-Position
    try {                                                                           // exakt an der Schulter, folgt der Drehung
      const p = v.playerObject.position.clone();
      v.playerObject.skin.rightArm.getWorldPosition(p);
      p.y += 3.5; p.project(v.camera);
      if (isFinite(p.x) && isFinite(p.y)) { x = canvas.offsetLeft + ((p.x + 1) / 2) * W; y = canvas.offsetTop + ((1 - p.y) / 2) * H; }
    } catch {}
    el.style.left = x - 20 + 'px'; el.style.top = y - 36 + Math.sin(t) * 2.5 + 'px';
    requestAnimationFrame(tick);
  };
  tick();
}
function attachAura(canvas) {
  const a = S.equipped.aura && item(S.equipped.aura); if (!a) return;
  const L = document.createElement('div'); L.className = 'auralayer ' + a.aura;
  const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height;
  L.style.cssText = `left:${canvas.offsetLeft}px;top:${canvas.offsetTop}px;width:${W}px;height:${H}px`;
  const [c1, c2] = RT.auraColors(a.aura); const N = a.aura === 'bats' ? 5 : 16;
  const svg = `<svg viewBox="0 0 24 24"><defs><linearGradient id="ag${a.aura}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path fill="url(#ag${a.aura})" fill-rule="evenodd" d="${RT.auraGlyph(a.aura)}"/></svg>`;
  for (let i = 0; i < N; i++) {
    const e = document.createElement('i'); const sz = a.aura === 'bats' ? 22 + Math.random() * 10 : 8 + Math.random() * 10;
    e.style.cssText = `width:${sz}px;height:${sz}px;--x:${(10 + Math.random() * 80).toFixed(0)}%;--y:${(8 + Math.random() * 60).toFixed(0)}%;--dx:${(Math.random() * 60 - 30).toFixed(0)}px;--d:${(a.aura === 'bats' ? 6 + Math.random() * 3 : 3 + Math.random() * 3).toFixed(1)}s;--dl:${(-Math.random() * 6).toFixed(1)}s`;
    e.innerHTML = svg; L.append(e);
  }
  canvas.parentElement.append(L);
}
function makeViewer(canvas, w, h, opts = {}) {
  const v = new skinview3d.SkinViewer({ canvas, width: w, height: h });
  v.animation = new skinview3d.IdleAnimation();
  v.controls.enableZoom = false;
  v.fov = 40; v.zoom = 0.9;
  const eqSkin = S.equipped.skin && item(S.equipped.skin);
  const fallback = () => v.loadSkin(RT.defaultSkinUrl());
  if (eqSkin) v.loadSkin(RT.dataUrl(eqSkin));
  else if (accountProfile?.skins?.length) {
    const s = accountProfile.skins.find((x) => x.state === 'ACTIVE') || accountProfile.skins[0];
    v.loadSkin(s.url, { model: s.variant === 'SLIM' ? 'slim' : 'default' }).catch(fallback);
  } else if (S.account?.type === 'ms') v.loadSkin(`https://crafatar.com/skins/${S.account.uuid}`).catch(fallback);
  else fallback();
  if (opts.cape !== false) {
    const cid = S.equipped.cape;
    if (cid && cid.startsWith('custom:')) { const cc = S.customCapes.find((c) => 'custom:' + c.id === cid); if (cc) v.loadCape(cc.data); }
    else if (cid && item(cid)) v.loadCape(RT.dataUrl(item(cid)));
    else { const c = accountProfile?.capes?.find((x) => x.state === 'ACTIVE'); if (c) v.loadCape(c.url).catch(() => {}); }
  }
  if (opts.pet !== false) attachPet(v, canvas);
  if (opts.pet !== false) attachAura(canvas);
  return v;
}

/* ================== Login (Pflicht) ================== */
function renderLogin() {
  document.body.classList.add('locked');
  const el = $('#login'); el.classList.remove('hidden');
  el.innerHTML = `<div class="lbox"><svg class="bolt" viewBox="0 0 24 24"><path fill="#ffffff" d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>
    <h1>RIFT LAUNCHER</h1>
    <p>Melde dich mit deinem Microsoft-Account an, um den Launcher zu benutzen.<br>Dafür brauchst du Minecraft: Java Edition.</p>
    <button class="msbtn" id="msBtn"><span class="mslogo"><i style="background:#f25022"></i><i style="background:#7fba00"></i><i style="background:#00a4ef"></i><i style="background:#ffb900"></i></span><span id="msTxt">Mit Microsoft anmelden</span></button></div>`;
  $('#msBtn').onclick = async () => {
    const b = $('#msBtn'); b.disabled = true; $('#msTxt').textContent = 'Warte auf Anmeldefenster…';
    try {
      S = await api('auth:microsoft');
      await loadAccountProfile();
      toast('Willkommen, ' + S.account.name + '!');
      go('play');
    } catch (e) { toast(e.message, true); b.disabled = false; $('#msTxt').textContent = 'Mit Microsoft anmelden'; }
  };
}

/* ================== PLAY ================== */
const PLAY_PATH = 'M7 4v16l13-8z', STOP_PATH = 'M6 6h12v12H6z';
function renderPlay() {
  content.innerHTML = `<div class="play">
    <div class="stage">
      <div class="nametag ${RT.nametagCss(item(S.equipped.nametag)).cls}" style="${RT.nametagCss(item(S.equipped.nametag)).style}">${RT.badgeSvg()}${esc(S.account?.name || '')}</div>
      <canvas id="sv"></canvas>
      <div class="launchwrap" id="lw"><button class="launchbtn" id="launchBtn"><span class="fill" id="lfill"></span><span class="shine"></span>
        <svg class="ic" viewBox="0 0 24 24"><path id="lic" d="${PLAY_PATH}"/></svg><span class="txt"><span class="lt" id="lt">SPIELEN</span><span class="ls" id="ls"></span></span></button></div>
      <div class="pstrip" id="pstrip"></div>
      <div class="log" id="log" style="height:70px"></div>
    </div>
    <div class="news">
      <h2>Rift News</h2>
      ${feed.filter((a) => a.type === 'news' || a.type === 'update').slice(0, 3).map((a) => `<div class="newscard" data-ann="${esc(a.id)}" style="background-image:linear-gradient(135deg,#3b3b42,#0d0d0f)"><span>${esc(a.title)}</span></div>`).join('')}
      <div class="newscard" data-go="shop" style="background-image:linear-gradient(135deg,#3b3b42,#0d0d0f)"><span>Neue Crates im Shop – Rift Core Cape</span></div>
      <div class="newscard" data-go="mods" style="background-image:linear-gradient(135deg,#3b3b42,#0d0d0f)"><span>Mods, Shader & Modpacks über Modrinth</span></div>
      <div class="newscard" data-go="skins" style="background-image:linear-gradient(135deg,#3b3b42,#0d0d0f)"><span>Skins ändern & direkt auf deinen Account anwenden</span></div>
    </div></div>`;
  content.querySelectorAll('[data-go]').forEach((e) => (e.onclick = () => go(e.dataset.go)));
  content.querySelectorAll('[data-ann]').forEach((e) => (e.onclick = () => showAnnouncement(feed.find((a) => a.id === e.dataset.ann))));
  viewer = makeViewer($('#sv'), 360, 400);
  viewer.playerObject.rotation.y = 0.55;     // Figur schräg zur Seite gedreht (zeigt zu den News)
  paintStrip();
  paintGame();
}
/* In-Game-Features (HUDs, R-Menü, Clips) brauchen die Rift-Mod = Fabric + Minecraft 1.21.4 */
function paintStrip() {
  const el = $('#pstrip'); if (!el) return;
  el.innerHTML = S.profiles.map((p) => `<div class="lcard ${p.id === S.selectedProfile ? 'sel' : ''}" data-id="${esc(p.id)}"><b>${esc(p.mcVersion)}</b><small>${esc(LOADERS[p.loader] || p.loader)}</small><div class="mute" style="font-size:11px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</div></div>`).join('') + '<div class="lcard add" id="addP" title="Neue Version">＋</div>';
  el.querySelectorAll('[data-id]').forEach((c) => (c.onclick = guard(async () => { S = await api('profiles:select', c.dataset.id); renderChrome(); paintStrip(); paintGame(); })));
  $('#addP').onclick = () => go('picker');
}
function paintGame() {
  const lw = $('#lw'); if (!lw) return;
  const p = profile(); const btn = $('#launchBtn');
  lw.className = 'launchwrap'; btn.onclick = null; $('#lfill').style.width = '0';
  $('#lic').setAttribute('d', PLAY_PATH);
  if (game.status === 'running') {
    lw.classList.add('stop'); $('#lt').textContent = 'STOP'; $('#ls').textContent = 'Minecraft läuft – klicken zum Beenden';
    $('#lic').setAttribute('d', STOP_PATH); btn.onclick = () => { game.stopped = true; api('game:stop'); };
  } else if (game.status === 'idle') {
    $('#lt').textContent = 'SPIELEN';
    $('#ls').textContent = p ? `${p.name} · ${p.mcVersion} · ${LOADERS[p.loader] || p.loader}` : 'Wähle zuerst eine Version';
    btn.onclick = guard(async () => {
      if (!p) return go('picker'); if (NET.off) playOfflineAnimation(); else publishCosmetics();
      try { await api('game:launch', p.id); } catch (e) { fxActive?.cancel(); throw e; }   // die Animation startet erst kurz vor dem Spielfenster (game:spawn) und endet mit game:window
    });
  } else {
    lw.classList.add('busy'); $('#lt').textContent = 'STARTET'; $('#ls').textContent = game.text || 'Bereite vor…'; $('#lfill').style.width = (game.pct || 8) + '%';
  }
  $('#log').innerHTML = game.log.slice(-60).map(esc).join('<br>');
  $('#log').scrollTop = 1e9;
}
rift.on('game:state', (d) => {
  game.status = d.status; game.text = d.text;
  if (d.status === 'idle') {
    fxActive?.finish();
    
    game.stopped = false;
  }
  if (d.status === 'idle') game.pct = 0;
  if (d.state) { S = d.state; renderChrome(); if (d.earned) toast(`+${d.earned} Rift Coins für ${d.earned} Min. Spielzeit`); }
  if (view === 'play') paintGame();
});

rift.on('invite:new', (list) => list.forEach((iv) => {   // Einladung eines Freundes auf seinen lokalen Server
  const o = document.createElement('div'); o.className = 'card ivcard'; o.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:95;width:320px';
  o.innerHTML = `<b>${esc(iv.fromName)} lädt dich ein</b><div class="mute" style="margin:6px 0 10px;font-size:12px">${esc(iv.name)}${iv.version ? ' · Minecraft ' + esc(iv.version) : ''}</div><div class="row"><button class="b primary" id="ivGo">Beitreten</button><button class="b" id="ivNo">Später</button></div>`;
  document.body.appendChild(o); setTimeout(() => o.remove(), 90000);
  o.querySelector('#ivNo').onclick = () => o.remove();
  o.querySelector('#ivGo').onclick = guard(async () => {
    const pr = S.profiles.find((p) => p.mcVersion === iv.version) || (iv.version ? null : S.profiles[0]);
    if (!pr) throw new Error('Du brauchst ein Profil mit Minecraft ' + iv.version + '.');
    const [host, port] = String(iv.addr).split(':'); o.remove(); toast('Starte Minecraft…'); await api('game:launch', pr.id, { host, port: +port || 25565 });
  });
}));
rift.on('game:window', () => fxActive?.finish());
rift.on('game:progress', (p) => { game.pct = p.total ? Math.round((p.task / p.total) * 100) : 0; game.text = `Lade ${p.type}… ${game.pct}%`; if (game.status === 'idle') game.status = 'starting'; if (view === 'play') paintGame(); });
rift.on('game:log', (l) => { game.log.push(l); if (game.log.length > 300) game.log.shift(); if (view === 'play') paintGame(); });
rift.on('install:progress', (d) => { toast(d.text); });

/* ================== Cosmetics für andere Spieler (im Spiel) ================== */
let pubTimer = null;
function publishCosmetics() {
  clearTimeout(pubTimer);
  pubTimer = setTimeout(async () => {
    try {
      const cid = S.equipped.cape; let png;
      if (cid?.startsWith('custom:')) png = S.customCapes.find((c) => 'custom:' + c.id === cid)?.data;
      else if (cid && item(cid)) png = RT.dataUrl(item(cid));
      const ci = cid && !cid.startsWith('custom:') ? item(cid) : null;
      syncCatalog();
      await api('cosmetics:publish', png || null, ci?.anim ? RT.frames(ci, 10, 0.2) : null);
    } catch {}
  }, 400);
}

/* ================== PROFILE ================== */
let mcVersions = null, versionImgs = null;
async function versions() { return (mcVersions ||= await api('versions:minecraft')); }
async function renderProfiles() {
  content.innerHTML = `<h2>Profile <span style="margin-left:auto" class="row"><button class="b" id="impMr">⬆ Modpack (.mrpack) importieren</button><button class="b primary" id="newP">+ Neue Version</button></span></h2><div class="plist" id="plist"></div>`;
  $('#impMr').onclick = guard(async () => { const s = await api('modpack:importFile'); if (s) { S = s; renderChrome(); toast('Modpack importiert.'); renderProfiles(); } });
  const list = $('#plist');
  if (!S.profiles.length) list.innerHTML = '<div class="empty">Noch keine Profile. Wähle eine Minecraft-Version oder installiere ein Modpack über „Mods“.</div>';
  for (const p of S.profiles) {
    const el = document.createElement('div');
    el.className = 'card profile' + (p.id === S.selectedProfile ? ' sel' : '');
    el.innerHTML = `<h3>${esc(p.name)}</h3><div class="row"><span class="tag">${esc(p.mcVersion)}</span><span class="tag">${esc(LOADERS[p.loader] || p.loader)}</span><span class="tag">${p.ram || 4} GB</span><span class="tag">${(p.installed || []).length} Inhalte</span></div>
      <div class="row"><button class="b" data-a="edit">Ändern</button><button class="b" data-a="open">Ordner</button><button class="b danger" data-a="del">Löschen</button></div>`;
    el.onclick = guard(async (e) => {
      const a = e.target.dataset.a;
      if (a === 'edit') return go('picker', p);
      if (a === 'open') return api('profiles:openFolder', p.id);
      if (a === 'del') { if (confirm(`Profil „${p.name}“ inkl. aller Dateien löschen?`)) { S = await api('profiles:delete', p.id); go('profiles'); } return; }
      S = await api('profiles:select', p.id); go('profiles');
    });
    list.append(el);
  }
  $('#newP').onclick = () => go('picker');
}

/* ================== LAUNCHPAD: alle Profile schnell starten / bearbeiten ================== */
function renderLaunchpad() {
  content.innerHTML = `<h2>Launchpad <small>Alle Profile auf einen Blick – starten, bearbeiten, Mods hinzufügen</small><button class="b primary" id="newP" style="margin-left:auto">+ Neue Version</button></h2><div class="lpad" id="lpad"></div>`;
  const grid = $('#lpad');
  if (!S.profiles.length) grid.innerHTML = '<div class="empty">Noch keine Profile.</div>';
  const busy = game.status !== 'idle';
  for (const p of S.profiles) {
    const el = document.createElement('div'); el.className = 'card lp' + (p.id === S.selectedProfile ? ' sel' : '');
    el.innerHTML = `<div class="lphead"><b>${esc(p.name)}</b><span class="tag">${esc(LOADERS[p.loader] || p.loader)}</span></div><div class="mute" style="font-size:12px">Minecraft ${esc(p.mcVersion)} · ${p.ram || 4} GB · ${(p.installed || []).length} Inhalte</div>
      <button class="b primary lpplay" data-a="play" ${busy ? 'disabled' : ''}>${game.status === 'running' ? 'Läuft…' : '▶ Starten'}</button>
      <div class="row lpbtn"><button class="b" data-a="edit">Bearbeiten</button><button class="b" data-a="mods">Mods</button><button class="b" data-a="open">Ordner</button><button class="b danger" data-a="del">✕</button></div>`;
    el.onclick = guard(async (e) => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'play') { S = await api('profiles:select', p.id); renderChrome(); await api('game:launch', p.id); return; }
      if (a === 'edit') return go('picker', p);
      if (a === 'mods') { S = await api('profiles:select', p.id); modsTarget = p.id; return go('mods'); }
      if (a === 'open') return api('profiles:openFolder', p.id);
      if (a === 'del') { if (confirm(`Profil „${p.name}“ inkl. aller Dateien löschen?`)) { S = await api('profiles:delete', p.id); go('launchpad'); } }
    });
    grid.append(el);
  }
  $('#newP').onclick = () => go('picker');
}

/* ---- Version-Picker im LabyMod-Stil: Loader-Karten + Versions-Kacheln ---- */
const UPDATE_NAMES = { '1.21': 'Tricky Trials', '1.20': 'Trails & Tales', '1.19': 'The Wild Update', '1.18': 'Caves & Cliffs II', '1.17': 'Caves & Cliffs I', '1.16': 'Nether Update', '1.15': 'Buzzy Bees', '1.14': 'Village & Pillage', '1.13': 'Update Aquatic', '1.12': 'World of Color', '1.11': 'Exploration Update', '1.10': 'Frostburn Update', '1.9': 'Combat Update', '1.8': 'Bountiful Update', '1.7': 'The Update that Changed the World', '1.6': 'Horse Update', '1.5': 'Redstone Update', '1.4': 'Pretty Scary Update', '1.3': 'Villager Trading', '1.2': 'Anvil Update', '1.1': 'Classic', '1.0': 'Adventure Update' };
const LOADER_INFO = {
  vanilla: ['V', 'Original-Spiel ohne Mods'], fabric: ['F', 'Leicht & schnell – Sodium, Iris, …'],
  quilt: ['Q', 'Fabric-kompatibel, community-getrieben'], forge: ['⚒', 'Klassiker für große Modpacks'],
  neoforge: ['N', 'Moderner Forge-Nachfolger (ab 1.20.2)']
};
const hueOf = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

async function renderPicker(editing) {
  content.innerHTML = '<div class="empty">Lade Versionen…</div>';
  const vs = await versions().catch(() => ['1.21.4', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.9']);
  const imgs = (await (versionImgs ||= api('versions:images').catch(() => null))) || { versions: {}, groups: {} };
  const neoOk = (v) => { const [, mi, pa] = v.split('.').map(Number); return mi > 20 || (mi === 20 && (pa || 0) >= 2); };
  const sel = { ver: editing?.mcVersion || null, loader: (editing?.loader && editing.loader !== 'vanilla') ? editing.loader : 'fabric', name: editing?.name || '', ram: editing?.ram || S.settings.ram, touched: !!editing };
  const groups = new Map();
  for (const v of vs) { const g = v.split('.').slice(0, 2).join('.'); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(v); }
  let first = true;
  const groupHtml = [...groups].map(([g, list]) => {
    const h = hueOf(g);
    const tiles = list.map((v) => {
      const isNew = first; first = false;
      const img = imgs.versions?.[v] || imgs.groups?.[g];
      return `<div class="ptile ${img ? 'hasimg' : ''}" data-v="${esc(v)}" data-big="${esc(g)}" style="--h:${h};${img ? `background-image:linear-gradient(180deg,#0000 35%,#000d),url('${esc(img)}')` : ''}">${isNew ? '<span class="new">NEU</span>' : ''}<span class="chk">✓</span><b>${esc(v)}</b><small>${esc(UPDATE_NAMES[g] || 'Minecraft ' + g)}</small></div>`;
    }).join('');
    return `<div class="vgroup"><div class="vhead"><b>${esc(g)}</b><span>${esc(UPDATE_NAMES[g] || '')}</span></div><div class="vrow">${tiles}</div></div>`;
  }).join('');
  content.innerHTML = `<div class="picker"><h2>${editing ? 'Version ändern' : 'Version wählen'} <small>Loader und Minecraft-Version aussuchen</small></h2>
    <div class="loaders">${Object.entries(LOADER_INFO).filter(([k]) => k !== 'vanilla').map(([k, [gl, tag]]) => `<div class="ldr" data-l="${k}"><span class="gl">${gl}</span><b>${LOADERS[k]}</b><small>${esc(tag)}</small></div>`).join('')}</div>
    ${groupHtml}</div>
    <div class="pickbar"><div class="sum" id="sum"></div><input type="text" id="pname" maxlength="40" placeholder="Profilname"><label class="row mute" style="font-size:12px">RAM <input type="range" id="pram" min="1" max="16" value="${sel.ram}"><b id="pramv" style="color:#fff">${sel.ram} GB</b></label><button class="b primary" id="pcreate">${editing ? 'Speichern' : 'Profil erstellen'}</button></div>`;
  const refresh = () => {
    content.querySelectorAll('.ldr').forEach((e) => e.classList.toggle('on', e.dataset.l === sel.loader));
    content.querySelectorAll('.ptile').forEach((e) => { e.classList.toggle('on', e.dataset.v === sel.ver); e.classList.toggle('dis', sel.loader === 'neoforge' && !neoOk(e.dataset.v)); });
    if (!sel.touched) $('#pname').value = sel.ver ? `${sel.ver} ${LOADERS[sel.loader]}` : '';
    $('#sum').innerHTML = sel.ver ? `<b>${esc(sel.ver)}</b> · ${esc(LOADERS[sel.loader])}` : '<span class="mute">Noch keine Version gewählt</span>';
    $('#pcreate').disabled = !sel.ver;
  };
  content.querySelectorAll('.ldr').forEach((e) => (e.onclick = () => { sel.loader = e.dataset.l; if (sel.loader === 'neoforge' && sel.ver && !neoOk(sel.ver)) sel.ver = null; refresh(); }));
  content.querySelectorAll('.ptile').forEach((e) => (e.onclick = () => { if (e.classList.contains('dis')) return toast('NeoForge gibt es erst ab Minecraft 1.20.2.', true); sel.ver = e.dataset.v; refresh(); }));
  $('#pname').value = sel.name; $('#pname').oninput = () => { sel.touched = true; };
  $('#pram').oninput = () => { sel.ram = +$('#pram').value; $('#pramv').textContent = sel.ram + ' GB'; };
  $('#pcreate').onclick = guard(async () => {
    S = await api('profiles:save', { id: editing?.id, name: $('#pname').value.trim() || `${sel.ver} ${LOADERS[sel.loader]}`, mcVersion: sel.ver, loader: sel.loader, ram: sel.ram });
    toast(editing ? 'Gespeichert.' : 'Profil erstellt!'); go('play');
  });
  refresh();
  if (sel.ver) content.querySelector(`.ptile[data-v="${CSS.escape(sel.ver)}"]`)?.scrollIntoView({ block: 'center' });
}

/* ================== MODS (Modrinth) ================== */
const MR_TABS = { mod: 'Mods', modpack: 'Modpacks', shader: 'Shader', resourcepack: 'Resource Packs', datapack: 'Data Packs' };
let modsTarget = null;
function renderModsChooser() {
  content.innerHTML = `<h2>Mods <small>Wähle zuerst das Profil, zu dem du Mods, Shader, Resource Packs oder Data Packs hinzufügen willst</small></h2><div class="lpad" id="mpick"></div>
    <div class="row" style="margin-top:18px"><button class="b" id="mpack">Modpacks durchsuchen (erstellt ein eigenes Profil)</button></div>`;
  const grid = $('#mpick');
  if (!S.profiles.length) grid.innerHTML = '<div class="empty">Noch keine Profile – erstelle zuerst eine Version oder installiere ein Modpack.</div>';
  for (const p of S.profiles) {
    const el = document.createElement('div'); el.className = 'card lp' + (p.id === S.selectedProfile ? ' sel' : '');
    el.innerHTML = `<div class="lphead"><b>${esc(p.name)}</b><span class="tag">${esc(LOADERS[p.loader] || p.loader)}</span></div><div class="mute" style="font-size:12px">Minecraft ${esc(p.mcVersion)} · ${(p.installed || []).length} Inhalte</div><button class="b primary">Mods hinzufügen</button>`;
    el.onclick = guard(async () => { S = await api('profiles:select', p.id); modsTarget = p.id; mrState.type = 'mod'; renderChrome(); renderMods(); });
    grid.append(el);
  }
  $('#mpack').onclick = () => { modsTarget = '*'; mrState.type = 'modpack'; renderMods(); };
}
async function renderMods() {
  if (!modsTarget || (modsTarget !== '*' && !S.profiles.find((x) => x.id === modsTarget))) return renderModsChooser();
  const p = modsTarget === '*' ? null : profile();
  content.innerHTML = `<h2><select id="prov" style="font:inherit;font-weight:700;background:transparent;color:inherit;border:0;cursor:pointer"><option value="modrinth" ${mrState.provider === 'modrinth' ? 'selected' : ''}>Modrinth</option><option value="curseforge" ${mrState.provider === 'curseforge' ? 'selected' : ''}>CurseForge</option></select> <small>${p ? 'Ziel: ' + esc(p.name) + ' (' + esc(p.mcVersion) + ', ' + esc(LOADERS[p.loader]) + ')' : 'Kein Profil gewählt – Modpacks erstellen ein eigenes'}</small></h2>
    <div class="tabs">${Object.entries(MR_TABS).map(([k, v]) => `<div class="tab ${k === mrState.type ? 'active' : ''}" data-t="${k}">${v}</div>`).join('')}</div>
    <div class="row" style="margin-bottom:14px"><input id="q" style="flex:1" placeholder="Suchen…" value="${esc(mrState.query)}"><label class="row mute"><input type="checkbox" id="flt" checked style="min-width:0"> Nur kompatibel</label><button class="b primary" id="go">Suchen</button><button class="b" id="mimp" title="Eigene Modpack-Datei (.mrpack) importieren">⬆ .mrpack</button></div>
    <div class="mr"><div id="hits"></div><div><h2 style="font-size:13px">Installiert</h2><div class="card" id="inst" style="padding:6px"></div></div></div>`;
  content.querySelectorAll('.tab').forEach((t) => (t.onclick = () => { mrState.type = t.dataset.t; mrState.query = $('#q').value; renderMods(); }));
  content.querySelector('h2').insertAdjacentHTML('beforeend', '<button class="b" id="mchg" style="margin-left:auto">Profil wechseln</button>');
  $('#mchg').onclick = () => { modsTarget = null; renderModsChooser(); };
  if (p) {
    $('#mchg').insertAdjacentHTML('beforebegin', '<button class="b" id="mupd" style="margin-left:auto">Updates prüfen</button>'); $('#mchg').style.marginLeft = '8px';
    $('#mupd').onclick = guard(async () => {
      const b = $('#mupd'); b.disabled = true; b.textContent = 'Prüfe…';
      try {
        const up = await api('mods:check', p.id);
        if (!up.length) { toast('Alle Mods sind aktuell.'); return; }
        if (!confirm(up.length + ' Update(s) verfügbar:\n\n' + up.map((u) => u.title + ' → ' + u.to).join('\n') + '\n\nJetzt aktualisieren?')) return;
        b.textContent = 'Lade…'; const n = await api('mods:update', p.id); toast(n + ' Mod(s) aktualisiert.'); renderInstalled();
      } finally { b.disabled = false; b.textContent = 'Updates prüfen'; }
    });
  }
  $('#mimp').onclick = guard(async () => { const s = await api('modpack:importFile'); if (s) { S = s; renderChrome(); toast('Modpack importiert – du findest es unter Profile.'); } });
  $('#prov').onchange = () => { mrState.provider = $('#prov').value; mrState.query = $('#q').value; renderMods(); };
  $('#go').onclick = () => search(); let qt = 0; $('#q').onkeydown = (e) => { if (e.key === 'Enter') { clearTimeout(qt); search(); } }; $('#q').oninput = () => { clearTimeout(qt); qt = setTimeout(() => search(), 450); };
  renderInstalled();
  search();
}
async function renderInstalled() {
  const p = profile(); const box = $('#inst'); if (!box) return;
  if (!p) { box.innerHTML = '<div class="empty">–</div>'; return; }
  const list = await api('profiles:installed', p.id);
  box.innerHTML = list.length ? '' : '<div class="empty">Noch nichts installiert.</div>';
  for (const i of list) {
    const d = document.createElement('div'); d.className = 'inst';
    d.innerHTML = `<img src="${esc(i.icon || '')}"><span title="${esc(i.title)}">${esc(i.title)}</span><button title="Entfernen">✕</button>`;
    d.querySelector('button').onclick = guard(async () => { await api('profiles:removeMod', p.id, i.projectId); renderInstalled(); });
    box.append(d);
  }
}
const search = guard(async () => {
  const p = profile(); const hitsEl = $('#hits'); if (!hitsEl) return;
  mrState.query = $('#q').value;
  hitsEl.innerHTML = '<div class="empty">Lade…</div>'; const my = ++mrSeq, cfm = mrState.provider === 'curseforge';
  const filter = $('#flt').checked && p && mrState.type !== 'modpack';
  const res = await api(cfm ? 'cf:search' : 'modrinth:search', { query: mrState.query, type: mrState.type, mcVersion: filter ? p.mcVersion : '', loader: filter ? p.loader : '' });
  if (my !== mrSeq) return;   // veraltete Antwort (neuere Suche laeuft schon)
  hitsEl.innerHTML = res.hits.length ? '' : '<div class="empty">Keine Treffer.</div>';
  for (const h of res.hits) {
    const d = document.createElement('div'); d.className = 'hit';
    d.innerHTML = `<img src="${esc(h.icon_url || '')}"><div class="meta"><b>${esc(h.title)}</b> <span class="mute">von ${esc(h.author)}</span><p>${esc(h.description)}</p><span class="tag">⬇ ${h.downloads.toLocaleString('de-DE')}</span></div><button class="b primary">${mrState.type === 'modpack' ? 'Als Profil' : 'Installieren'}</button>`;
    const btn = d.querySelector('button');
    btn.onclick = guard(async () => {
      btn.disabled = true; btn.textContent = '…';
      try {
        if (mrState.type === 'modpack') { S = await api(cfm ? 'cf:installModpack' : 'modrinth:installModpack', h.project_id); renderChrome(); toast(`Modpack „${h.title}“ als Profil angelegt.`); }
        else { const r = await api(cfm ? 'cf:install' : 'modrinth:install', p?.id, h.project_id, mrState.type); S = await api('state:get'); toast('Installiert: ' + r.names.join(', ')); renderInstalled(); }
        btn.textContent = '✓';
      } catch (e) { btn.disabled = false; btn.textContent = 'Erneut'; throw e; }
    });
    hitsEl.append(d);
  }
});

/* ================== SKINS ================== */
function renderSkins() {
  content.innerHTML = `<h2>Skins</h2><div class="skinpage">
    <div class="viewerbox card"><canvas id="sv"></canvas>
      <div class="row"><button class="b" id="import">PNG importieren</button><select id="variant"><option value="classic">Classic</option><option value="slim">Slim</option></select></div>
      <button class="b primary" id="apply" style="width:100%">Skin auf Account anwenden</button>
      <small class="mute">Anwenden braucht den Microsoft-Login. Gewählte Skins siehst du sofort im Launcher.</small></div>
    <div><div class="items" id="items"></div></div></div>
    <input type="file" id="file" accept="image/png" style="display:none">`;
  viewer = makeViewer($('#sv'), 300, 380);
  let currentDataUrl = null;
  const setCurrent = (url) => { currentDataUrl = url; viewer.loadSkin(url, { model: $('#variant').value === 'slim' ? 'slim' : 'default' }); };
  const eq = S.equipped.skin && item(S.equipped.skin);
  if (eq) currentDataUrl = RT.dataUrl(eq);
  $('#items').innerHTML = `<div class="card" style="padding:20px;max-width:520px"><h3 style="margin-bottom:8px">Skins</h3><p class="mute">Skins sind kostenlos: Lade dir einen Skin (PNG) herunter, z. B. von NameMC oder minecraftskins.com, und importiere ihn links. Mit „Skin auf Account anwenden“ gilt er im Spiel.</p>
    <div class="row" style="margin-top:14px"><button class="b" id="resetSkin">Eigener Account-Skin</button></div></div>`;
  $('#resetSkin').onclick = guard(async () => { S = await api('shop:equip', 'skin', null); go('skins'); });
  $('#import').onclick = () => $('#file').click();
  $('#file').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { setCurrent(r.result); toast('Skin geladen – „Anwenden“ drücken, um ihn zu übernehmen.'); }; r.readAsDataURL(f);
  };
  $('#apply').onclick = guard(async () => {
    if (!currentDataUrl) return toast('Erst einen Skin wählen oder importieren.', true);
    await api('skin:apply', { dataUrl: currentDataUrl, variant: $('#variant').value });
    await loadAccountProfile(); toast('Skin auf deinen Account angewendet!');
  });
}

/* ================== CAPES ================== */
function customCapeTile(c, { equipped } = {}) {
  const el = document.createElement('div');
  el.className = 'item r-rare' + (equipped ? ' eq' : '');
  const cv = document.createElement('canvas'); cv.width = 10; cv.height = 16;
  cv.style.cssText = 'width:100%;height:110px;image-rendering:pixelated;object-fit:contain';
  const img = new Image(); img.onload = () => { cv.getContext('2d').drawImage(img, 1, 1, 10, 16, 0, 0, 10, 16); }; img.src = c.data;
  el.append(cv);
  el.insertAdjacentHTML('beforeend', `<b>${esc(c.name)}</b><div class="row" style="gap:6px"><button class="b mini" data-a="edit">Ändern</button><button class="b mini danger" data-a="del">✕</button></div>`);
  return el;
}
function renderCapes() {
  content.innerHTML = `<h2>Capes</h2><div class="skinpage"><div class="viewerbox card"><canvas id="sv"></canvas>
    <small class="mute">Rift-Capes und eigene Capes sind Launcher-Cosmetics (im Launcher sichtbar). Minecraft-Capes deines Accounts werden im Spiel angezeigt.</small></div>
    <div><h2 style="font-size:13px">Eigene Capes <small>aus dem Cape-Editor</small></h2><div class="items" id="cc" style="margin-bottom:24px"></div>
    <h2 style="font-size:13px">Rift Capes</h2><div class="items" id="rc" style="margin-bottom:24px"></div><h2 style="font-size:13px">Minecraft-Capes (Account)</h2><div class="items" id="mc"></div></div></div>`;
  viewer = makeViewer($('#sv'), 300, 380);
  viewer.playerObject.rotation.y = Math.PI * 0.9; // Rückseite zeigen
  const cc = $('#cc');
  const add = document.createElement('div'); add.className = 'item addtile';
  add.innerHTML = S.editorUnlocked ? '<span class="plus">＋</span><b>Neue Cape malen</b>' : `<span class="plus">🔒</span><b>Cape-Editor</b><span class="tag"><span class="coin"></span> ${S.editorPrice}</span>`;
  add.onclick = () => go('editor');
  cc.append(add);
  for (const c of S.customCapes) {
    const t = customCapeTile(c, { equipped: S.equipped.cape === 'custom:' + c.id });
    t.onclick = guard(async (e) => {
      const a = e.target.dataset.a;
      if (a === 'edit') return go('editor', c.id);
      if (a === 'del') { if (confirm(`„${c.name}“ löschen?`)) { S = await api('editor:delete', c.id); renderCapes(); } return; }
      S = await api('shop:equip', 'cape', S.equipped.cape === 'custom:' + c.id ? null : 'custom:' + c.id); renderCapes();
    });
    cc.append(t);
  }
  const rc = $('#rc');
  const none = document.createElement('div'); none.className = 'item'; none.innerHTML = '<b style="margin:30px 0">Keine Cape</b>';
  none.onclick = guard(async () => { S = await api('shop:equip', 'cape', null); renderCapes(); });
  rc.append(none);
  for (const it of S.items.filter((i) => i.type === 'cape' && ((i.rarity !== 'secret' && i.rarity !== 'plus' && !i.pass) || S.owned.includes(i.id)))) {
    const owned = S.owned.includes(it.id);
    const t = itemTile(it, { locked: !owned, equipped: S.equipped.cape === it.id });
    t.onclick = guard(async () => { if (!owned) return toast('Hol sie dir aus einer Crate im Shop!', true); S = await api('shop:equip', 'cape', it.id); renderCapes(); });
    rc.append(t);
  }
  const mc = $('#mc');
  if (S.account?.type !== 'ms') mc.innerHTML = '<div class="empty">Mit Microsoft einloggen, um deine Account-Capes zu sehen.</div>';
  else if (!accountProfile?.capes?.length) mc.innerHTML = '<div class="empty">Dein Account besitzt keine Capes.</div>';
  else for (const c of accountProfile.capes) {
    const d = document.createElement('div'); d.className = 'item' + (c.state === 'ACTIVE' ? ' eq' : '');
    d.innerHTML = `<b style="margin:30px 0">${esc(c.alias)}</b><span class="tag">${c.state === 'ACTIVE' ? 'Aktiv' : 'Aktivieren'}</span>`;
    d.onclick = guard(async () => { accountProfile = await api('cape:set', c.state === 'ACTIVE' ? null : c.id); renderCapes(); });
    mc.append(d);
  }
}

/* ================== CAPE-EDITOR ================== */
const CW = 10, CH = 16, CELLPX = 24;
const PALETTE = ['#000000', '#1f1f23', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#ffffff', '#7f1d1d', '#dc2626', '#f97316', '#facc15', '#a3e635', '#16a34a', '#065f46', '#22d3ee', '#2563eb', '#1e3a8a', '#7c3aed', '#c026d3', '#ec4899', '#78350f', '#a16207', '#fde68a', '#fecaca'];
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hex2 = (n) => n.toString(16).padStart(2, '0');
function renderEditor(editId) {
  if (!S.editorUnlocked) {
    content.innerHTML = `<div class="card hero lockedEditor"><div class="bigicon">🎨</div><h2 style="justify-content:center">Cape-Editor</h2>
      <p>Male deine eigene Cape Pixel für Pixel – live an deinem Skin. Speichere bis zu 12 Capes und rüste sie im Launcher aus.</p>
      <button class="b primary big" id="buyEd"><span class="coin"></span> ${S.editorPrice} Rift Coins – Freischalten</button>
      <small class="mute">Du hast ${S.coins} Rift Coins.</small></div>`;
    $('#buyEd').onclick = guard(async () => { const ok = await buyFlow({ name: 'Cape-Editor', sub: 'Eigene Capes gestalten', price: S.editorPrice, successText: 'Freigeschaltet!', run: async () => { S = await api('editor:buy'); renderChrome(); } }); if (ok) renderEditor(editId); });
    return;
  }
  const cur = editId && S.customCapes.find((c) => c.id === editId);
  const BASE = '#33333b';                        // Grundfarbe, damit eine neue Cape nie unsichtbar ist
  let px = new Array(CW * CH).fill(BASE);
  let tool = 'pencil', color = '#ffffff', mirror = false, curId = cur?.id || null, hover = null, drawing = false, last = null;
  const undo = [], redo = [];
  const snap = () => px.slice();

  content.innerHTML = `<h2>Cape-Editor <small>Mit der Maus malen · P Stift · E Radierer · F Füllen · I Pipette · Strg+Z/Y</small></h2>
    <div class="editor">
      <div class="card etools">
        <div class="toolrow">${[['pencil', '✏', 'Stift'], ['eraser', '⌫', 'Radierer'], ['fill', '▣', 'Füllen'], ['picker', '◉', 'Pipette']].map(([k, i, n]) => `<button class="tool" data-tool="${k}" title="${n}"><span>${i}</span>${n}</button>`).join('')}</div>
        <label class="row mute"><input type="checkbox" id="mir" style="min-width:0"> Spiegeln (links/rechts)</label>
        <div class="swatches">${PALETTE.map((c) => `<i class="sw" data-c="${c}" style="background:${c}"></i>`).join('')}</div>
        <div class="row"><input type="color" id="col" value="${color}" style="width:54px;height:38px;padding:2px"><span class="mute" id="colv"></span></div>
        <label class="f">Vorlage<select id="tpl"><option value="">– Grundfarbe –</option>${S.items.filter((i) => i.type === 'cape' && S.owned.includes(i.id)).map((i) => `<option value="${i.id}">${esc(i.name)}</option>`).join('')}</select></label>
        <div class="row"><button class="b mini" id="undo">↶ Zurück</button><button class="b mini" id="redo">↷ Vor</button><button class="b mini danger" id="clear">Leeren</button></div>
        <div class="row"><button class="b mini" id="impPng">⬆ Cape-PNG hochladen</button><input type="file" id="impF" accept="image/png,image/*" hidden></div>
      </div>
      <div class="egrid"><canvas id="grid" width="${CW * CELLPX}" height="${CH * CELLPX}"></canvas><small class="mute">Rückseite der Cape · ${CW}×${CH} Pixel</small></div>
      <div class="viewerbox card"><canvas id="sv"></canvas>
        <input type="text" id="cname" maxlength="30" placeholder="Name der Cape" value="${esc(cur?.name || 'Meine Cape')}" style="width:100%">
        <div class="row" style="width:100%"><button class="b primary" id="save" style="flex:1">Speichern</button><button class="b" id="equip" style="flex:1">Speichern & tragen</button></div></div>
    </div>`;

  const grid = $('#grid'), gx = grid.getContext('2d');
  const draw = () => {
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      gx.fillStyle = (x + y) % 2 ? '#2b2b30' : '#222226'; gx.fillRect(x * CELLPX, y * CELLPX, CELLPX, CELLPX);
      const c = px[y * CW + x]; if (c) { gx.fillStyle = c; gx.fillRect(x * CELLPX, y * CELLPX, CELLPX, CELLPX); }
    }
    gx.strokeStyle = '#ffffff1c'; gx.lineWidth = 1; gx.beginPath();
    for (let x = 0; x <= CW; x++) { gx.moveTo(x * CELLPX + .5, 0); gx.lineTo(x * CELLPX + .5, CH * CELLPX); }
    for (let y = 0; y <= CH; y++) { gx.moveTo(0, y * CELLPX + .5); gx.lineTo(CW * CELLPX, y * CELLPX + .5); }
    gx.stroke();
    if (hover) { gx.strokeStyle = '#fff'; gx.lineWidth = 2; gx.strokeRect(hover.x * CELLPX + 1, hover.y * CELLPX + 1, CELLPX - 2, CELLPX - 2); }
  };
  const buildTex = () => {
    const c = mkc(64, 32), x = c.getContext('2d');
    const put = (tx, ty, col) => { if (col) { x.fillStyle = col; x.fillRect(tx, ty, 1, 1); } };
    for (let y = 0; y < CH; y++) for (let xx = 0; xx < CW; xx++) { const col = px[y * CW + xx]; put(1 + xx, 1 + y, col); put(12 + xx, 1 + y, col); }
    for (let y = 0; y < CH; y++) { put(0, 1 + y, px[y * CW]); put(11, 1 + y, px[y * CW + CW - 1]); }
    for (let xx = 0; xx < CW; xx++) { put(1 + xx, 0, px[xx]); put(11 + xx, 0, px[(CH - 1) * CW + xx]); }
    return c;
  };
  viewer = makeViewer($('#sv'), 300, 400, { cape: false, pet: false });
  viewer.playerObject.rotation.y = Math.PI * 0.92;
  let pending = false;
  const preview = () => { if (pending) return; pending = true; setTimeout(() => { pending = false; try { viewer && viewer.loadCape(buildTex().toDataURL()); } catch {} }, 80); };
  const refresh = () => { draw(); preview(); };

  const fromCanvasFlat = (src) => { const d = src.getContext('2d').getImageData(0, 0, CW, CH).data, out = []; for (let i = 0; i < CW * CH; i++) out.push(d[i * 4 + 3] > 20 ? '#' + hex2(d[i * 4]) + hex2(d[i * 4 + 1]) + hex2(d[i * 4 + 2]) : null); return out; };
  const fromCanvas = (src) => {
    const d = src.getContext('2d').getImageData(1, 1, CW, CH).data; const out = [];
    for (let i = 0; i < CW * CH; i++) out.push(d[i * 4 + 3] > 20 ? '#' + hex2(d[i * 4]) + hex2(d[i * 4 + 1]) + hex2(d[i * 4 + 2]) : null);
    return out;
  };
  if (cur) { const img = new Image(); img.onload = () => { const c = mkc(64, 32); c.getContext('2d').drawImage(img, 0, 0); px = fromCanvas(c); refresh(); }; img.src = cur.data; }

  const cell = (e) => { const r = grid.getBoundingClientRect(); return { x: Math.max(0, Math.min(CW - 1, Math.floor(((e.clientX - r.left) / r.width) * CW))), y: Math.max(0, Math.min(CH - 1, Math.floor(((e.clientY - r.top) / r.height) * CH))) }; };
  const setPx = (x, y, c) => { px[y * CW + x] = c; if (mirror) px[y * CW + (CW - 1 - x)] = c; };
  const flood = (x, y, to) => {
    const from = px[y * CW + x]; if (from === to) return;
    const st = [[x, y]];
    while (st.length) { const [cx, cy] = st.pop(); if (cx < 0 || cy < 0 || cx >= CW || cy >= CH || px[cy * CW + cx] !== from) continue; px[cy * CW + cx] = to; st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); }
  };
  const line = (a, b, fn) => { let { x: x0, y: y0 } = a; const { x: x1, y: y1 } = b; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy; for (;;) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } } };
  const setColor = (c) => { color = c; $('#col').value = c; $('#colv').textContent = c; document.querySelectorAll('.sw').forEach((s) => s.classList.toggle('on', s.dataset.c === c)); };
  const setTool = (t) => { tool = t; document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === t)); };
  const apply = (p) => {
    if (tool === 'pencil') setPx(p.x, p.y, color);
    else if (tool === 'eraser') setPx(p.x, p.y, BASE);
    else if (tool === 'fill') flood(p.x, p.y, color);
    else if (tool === 'picker') { const c = px[p.y * CW + p.x]; if (c) setColor(c); setTool('pencil'); }
  };
  grid.onpointerdown = (e) => {
    grid.setPointerCapture(e.pointerId); drawing = true; undo.push(snap()); if (undo.length > 80) undo.shift(); redo.length = 0;
    const p = cell(e); last = p; apply(p); refresh();
  };
  grid.onpointermove = (e) => {
    const p = cell(e); hover = p;
    if (drawing && (tool === 'pencil' || tool === 'eraser')) { line(last, p, (x, y) => apply({ x, y })); last = p; refresh(); } else draw();
  };
  grid.onpointerup = () => { drawing = false; };
  grid.onpointerleave = () => { hover = null; draw(); };
  const doUndo = () => { if (!undo.length) return; redo.push(snap()); px = undo.pop(); refresh(); };
  const doRedo = () => { if (!redo.length) return; undo.push(snap()); px = redo.pop(); refresh(); };
  $('#undo').onclick = doUndo; $('#redo').onclick = doRedo;
  $('#impPng').onclick = () => $('#impF').click();
  $('#impF').onchange = (e) => {   // eigene Cape-Datei: volle MC-Cape (64x32 bzw. 22x17) oder beliebiges Bild, wird auf die Rueckseite skaliert
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const img = new Image(); img.onload = () => {
      const c = mkc(CW, CH), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      const full = img.width / img.height === 2 || (img.width >= 22 && img.height >= 17 && img.width / img.height > 1.2 && img.width / img.height < 2.2);
      if (full) { const k = img.width / (img.width >= 64 ? 64 : 22); g.drawImage(img, k, k, CW * k, CH * k, 0, 0, CW, CH); } else g.drawImage(img, 0, 0, CW, CH);
      undo.push(snap()); px = fromCanvasFlat(c); refresh(); toast('Cape geladen – du kannst sie noch bearbeiten und speichern.');
    }; img.onerror = () => toast('Bild konnte nicht gelesen werden.', true); img.src = URL.createObjectURL(f);
  };
  $('#clear').onclick = () => { undo.push(snap()); px = new Array(CW * CH).fill(BASE); refresh(); };
  $('#mir').onchange = (e) => (mirror = e.target.checked);
  document.querySelectorAll('.tool').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
  document.querySelectorAll('.sw').forEach((s) => (s.onclick = () => { setColor(s.dataset.c); if (tool === 'eraser' || tool === 'picker') setTool('pencil'); }));
  $('#col').oninput = (e) => setColor(e.target.value);
  $('#tpl').onchange = (e) => {
    const it = item(e.target.value); undo.push(snap());
    px = it ? fromCanvas(RT.cape(it)) : new Array(CW * CH).fill(BASE); refresh();
  };
  window.__editorKeys = (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); doUndo(); }
    else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); doRedo(); }
    else if (k === 'p') setTool('pencil'); else if (k === 'e') setTool('eraser'); else if (k === 'f') setTool('fill'); else if (k === 'i') setTool('picker');
  };
  document.addEventListener('keydown', window.__editorKeys);
  const save = async (andEquip) => {
    const r = await api('editor:save', { id: curId, name: $('#cname').value.trim(), data: buildTex().toDataURL('image/png') });
    S = r.state; curId = r.id;
    if (andEquip) S = await api('shop:equip', 'cape', 'custom:' + curId);
    toast(andEquip ? 'Gespeichert und ausgerüstet!' : 'Gespeichert!');
    if (andEquip) go('capes');
  };
  $('#save').onclick = guard(() => save(false));
  $('#equip').onclick = guard(() => save(true));
  setTool('pencil'); setColor('#ffffff'); refresh();
}

/* ================== COSMETICS (Nametags & Pets) ================== */
let cosTab = 'nametag';
function renderCosmetics() {
  const nt = S.equipped.nametag && item(S.equipped.nametag);
  const css = RT.nametagCss(nt);
  content.innerHTML = `<h2>Cosmetics <small>Nametags, Pets, Auren und Emotes</small></h2>
    <div class="tabs">${[['nametag', 'Nametags'], ['pet', 'Schulter-Pets'], ['aura', 'Auren'], ['emote', 'Emotes']].map(([k, n]) => `<div class="tab ${cosTab === k ? 'active' : ''}" data-t="${k}">${n}</div>`).join('')}</div>
    <div class="skinpage"><div class="viewerbox card"><div class="nametag mini ${css.cls}" style="${css.style}">${RT.badgeSvg()}${esc(S.account?.name || '')}</div><canvas id="sv"></canvas></div>
    <div><div class="items" id="items"></div></div></div>`;
  content.querySelectorAll('.tab').forEach((t) => (t.onclick = () => { cosTab = t.dataset.t; renderCosmetics(); }));
  viewer = makeViewer($('#sv'), 300, 380);
  const wrap = $('#items');
  const none = document.createElement('div'); none.className = 'item'; none.innerHTML = `<b style="margin:30px 0">${({ pet: 'Kein Pet', aura: 'Keine Aura', badge: 'Kein Badge', emote: 'Rad leeren' })[cosTab] || 'Standard-Farbe'}</b>`;
  none.onclick = guard(async () => { if (cosTab === 'emote') { for (const id of [...(S.emoteWheel || [])]) S = await api('emote:toggle', id); } else S = await api('shop:equip', cosTab, null); renderCosmetics(); });
  wrap.append(none);
  for (const it of S.items.filter((i) => i.type === cosTab && ((i.rarity !== 'secret' && i.rarity !== 'plus' && !i.pass) || S.owned.includes(i.id)))) {
    const owned = S.owned.includes(it.id) || !!it.base;
    const ev = it.event && S.events?.[it.event];
    if (ev && !ev.active && !owned) continue;   // Event vorbei: nur noch sichtbar, wenn man es besitzt
    const extra = owned ? '' : ev && it.free ? `<span class="tag free">GRATIS – ${esc(ev.name)}-Event</span>` : !S.skinPrices[it.rarity] ? '<span class="tag">Nur in Crates</span>' : `<span class="tag"><span class="coin"></span> ${S.skinPrices[it.rarity]}</span>`;
    const t = itemTile(it, { locked: !owned, equipped: cosTab === 'emote' ? (S.emoteWheel || []).includes(it.id) : S.equipped[cosTab] === it.id, extra: cosTab === 'emote' && owned ? '<span class="tag">' + ((S.emoteWheel || []).includes(it.id) ? 'Im Rad ✓' : 'Ins Rad (Taste B)') + '</span>' : extra });
    t.onclick = guard(async () => {
      if (!owned && ev && it.free) { S = await api('shop:claim', it.id); renderChrome(); renderCosmetics(); toast(it.name + ' abgeholt!'); return; }
      if (!owned && !S.skinPrices[it.rarity]) return toast('Dieses Item gibt es nur in Crates.');
      if (!owned) { const ok = await buyFlow({ name: it.name, sub: RARITY[it.rarity] + ' ' + TYPE_LABEL[it.type], price: S.skinPrices[it.rarity], preview: RT.front(it), run: async () => { S = await api('shop:buyItem', it.id); renderChrome(); } }); if (ok) renderCosmetics(); return; }
      if (cosTab === 'emote') { S = await api('emote:toggle', it.id); return renderCosmetics(); }
      S = await api('shop:equip', cosTab, S.equipped[cosTab] === it.id ? null : it.id); renderCosmetics();
    });
    wrap.append(t);
  }
}

/* ================== SHOP ================== */
const BOX_COLORS = { common: ['#e5e5ea', '#6b6b73'], rare: ['#60a5fa', '#1e3a8a'], epic: ['#c084fc', '#581c87'], legendary: ['#fbbf24', '#b45309'], mythic: ['#f9a8d4', '#6d28d9'], halloween: ['#fb923c', '#3b0764'] };
function crateSvg(id) {
  const [a, b] = BOX_COLORS[id];
  const face = id === 'halloween' ? '<path d="M38 60l5 6-8 1zM62 60l-5 6 8 1zM40 74q10 8 20 0" fill="#fde047" stroke="#fde047" stroke-width="2"/>' : '<path d="M44 54h12v14H44z" fill="#ffd54a" stroke="#0007"/>';
  return `<svg viewBox="0 0 100 100"><defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <path d="M12 38 50 22l38 16v42L50 96 12 80z" fill="url(#g${id})" stroke="#fff3" stroke-width="2"/><path d="M50 22v74M12 38l38 16 38-16" stroke="#0006" stroke-width="3" fill="none"/>
    ${face}<path d="M52 6 44 24h8l-4 12 14-18h-9z" fill="#fff" opacity=".85"/></svg>`;
}
const giftSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 7h-2.2A3 3 0 0 0 12 4.600 3 3 0 0 0 6.200 7H4a1 1 0 0 0-1 1v3h18V8a1 1 0 0 0-1-1zM9 7a1 1 0 1 1 2 0v0zm4 0a1 1 0 1 1 2 0zM4 13v6a2 2 0 0 0 2 2h5v-8zm9 0v8h5a2 2 0 0 0 2-2v-6z"/></svg>';

/* ================== CRATES ================== */
const CRATE_RARITY_WORD = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythic: 'Mythic', halloween: 'Halloween' };
function crateOdds(c) {
  const rows = [];
  for (const [r, w] of Object.entries(c.weights)) {
    const pool = S.items.filter((i) => i.rarity === r && (!c.event ? !i.event : i.event === c.event || r !== 'event'));
    if (!pool.length) continue;
    if (r === 'secret') { rows.push({ rarity: r, type: 'secret', items: [], pct: w, each: 0 }); continue; }
    const byType = {};
    for (const it of pool) (byType[it.type] ||= []).push(it);
    for (const [type, items] of Object.entries(byType)) rows.push({ rarity: r, type, items, pct: (w * items.length) / pool.length, each: w / pool.length });
  }
  return rows;
}
const TYPE_VIEW = { cape: ['capes'], nametag: ['cosmetics', 'nametag'], pet: ['cosmetics', 'pet'], aura: ['cosmetics', 'aura'], badge: ['cosmetics', 'badge'] };
const fmtPct = (p) => (p >= 10 ? p.toFixed(0) : p.toFixed(1)).replace(/\.0$/, '') + '%';
function showOddsGroup(row) {
  const m = $('#modal'); m.classList.remove('hidden');
  m.innerHTML = `<div class="opening"><h2 style="justify-content:center"><span class="t-${row.rarity}">${RARITY[row.rarity]}</span>&nbsp;${TYPE_LABEL[row.type]} · ${fmtPct(row.pct)}</h2><div class="items" id="grp" style="max-height:60vh;overflow:auto"></div>
    <div class="row" style="justify-content:center"><button class="b primary" id="goto">Im Bereich „${TYPE_LABEL[row.type]}“ ansehen</button><button class="b" id="gclose">Schließen</button></div></div>`;
  for (const it of row.items) { const t = itemTile(it, { extra: `<span class="tag">${fmtPct(row.each)} pro Drop</span>`, locked: !S.owned.includes(it.id) }); $('#grp').append(t); }
  const close = () => { m.classList.add('hidden'); m.innerHTML = ''; };
  $('#gclose').onclick = close;
  $('#goto').onclick = () => { close(); const [v, tab] = TYPE_VIEW[row.type] || ['cosmetics']; if (tab) cosTab = tab; go(v); };
}
async function renderCrates() {
  await RT.crateReady;
  content.innerHTML = `<h2>Crates <small>Klicke eine Crate an für Chancen und zum Öffnen</small><button class="b primary" id="giftBtn" style="margin-left:auto">${giftSvg} Daily Gift${S.daily?.claimable ? ' · bereit' : ''}</button></h2><div class="crates" id="cgrid"></div>`;
  const inv = S.crateInv || {};
  for (const c of S.crates) {
    const ev = c.event && S.events?.[c.event]; const off = ev && !ev.active; const n = inv[c.id] || 0;
    const el = document.createElement('div'); el.className = `card crate ${off ? 'off' : ''}`; el.style.setProperty('--cc', (BOX_COLORS[c.id]?.[0] || '#fff') + '66'); el.style.setProperty('--i', S.crates.indexOf(c));
    el.innerHTML = `<div class="box"></div><h3>${esc(c.name)}</h3><div class="hint">${off ? `Event ${esc(ev.from)} – ${esc(ev.to)}` : n ? `Im Besitz: ${n}` : 'Click to open!'}</div>${off ? '' : `<span class="tag">${n ? `${n}× im Inventar` : `<span class="coin"></span> ${c.price}`}</span>`}`;
    el.querySelector('.box').append(RT.crateCube(c.id, 128));
    el.onclick = () => renderCrateDetail(c.id);
    $('#cgrid').append(el);
  }
  $('#giftBtn').onclick = () => showDaily();
}
const KEY_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 14a5 5 0 1 1 4.6-7H22v4h-2v3h-3v-3h-5.4A5 5 0 0 1 7 14zm0-7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>';
const CRATE_DESC = { halloween: 'Spooky Items, exklusive Cosmetics – nur für kurze Zeit.', common: 'Solide Basis-Cosmetics für den Einstieg.', rare: 'Seltene Items mit Chance auf mehr.', epic: 'Epische Items und starke Effekte.', legendary: 'Legendäre Cosmetics, selten und begehrt.', mythic: 'Das Beste vom Besten – Mythic-Items.' };
async function renderCrateDetail(id) {
  await RT.crateReady;
  const c = S.crates.find((x) => x.id === id); if (!c) return renderCrates();
  const ev = c.event && S.events?.[c.event]; const off = ev && !ev.active; const n = (S.crateInv || {})[c.id] || 0;
  const odds = crateOdds(c);
  const order = Object.keys(c.weights);
  content.innerHTML = `<button class="b back" id="cback">↶ Zurück</button><div class="cdetail"><div>
      <div class="chead"><img src="${RT.crateFace(c.id, 'front')}" alt=""><div><h1>${esc(c.name)}</h1><small class="rw-${c.id}">${esc(CRATE_RARITY_WORD[c.id] || c.id)}</small></div></div>
      <div class="cratebig" id="box_${c.id}"></div>
      <p class="cdesc">${esc(CRATE_DESC[c.id] || 'Zufällige Cosmetics aus dem Rift-Universum.')}</p>
      ${off ? `<div class="copenrow"><button class="openbtn" disabled>${KEY_SVG}<span>Nur im Event (${esc(ev.from)} – ${esc(ev.to)})</span></button></div>`
        : `<div class="copenrow"><button class="openbtn" id="copen">${KEY_SVG}<span>Öffnen</span></button><div class="keybox">${KEY_SVG}<b>${n ? n + 'x' : '<span class="coin"></span> ' + c.price}</b></div></div>`}
    </div><div class="sep"></div><div class="chances"><h4>Drop-Chancen</h4>
      ${order.map((r) => { const rows = odds.filter((o) => o.rarity === r); if (!rows.length) return ''; if (r === 'secret') return `<div class="cr-h t-secret">Secret · ${fmtPct(c.weights[r])}</div><div class="crow" data-r="secret"><span class="tp t-secret">??? · Geheime Cosmetics</span></div>`; return `<div class="cr-h t-${r}">${RARITY[r]} · ${fmtPct(c.weights[r])}</div>${rows.map((o) => `<div class="crow" data-r="${r}" data-t="${o.type}"><span class="tp"><b class="t-${r}">${fmtPct(o.pct)}</b>${RARITY[r]} ${TYPE_LABEL[o.type]}</span><span class="mute">${o.items.length}×</span></div>`).join('')}`; }).join('')}
    </div></div>`;
  $('#box_' + c.id).append(RT.crateCube(c.id, 224)); $('#box_' + c.id).style.setProperty('--cc', (BOX_COLORS[c.id]?.[0] || '#fff') + '55');
  $('#cback').onclick = () => renderCrates();
  content.querySelectorAll('.crow').forEach((e) => { if (e.dataset.r !== 'secret') e.onclick = () => showOddsGroup(odds.find((o) => o.rarity === e.dataset.r && o.type === e.dataset.t)); });
  const open = $('#copen'); if (open) open.onclick = guard(async () => { if (!n && !(await buyFlow({ name: c.name, sub: 'Crate öffnen', price: c.price, successText: 'Bezahlt!' }))) return; await openCrate(c.id); });
}

/* ================== DAILY GIFTS ================== */
function rewardLabel(r) { return [r.coins ? `<span class="coin"></span> ${r.coins}` : '', r.crate ? `${RARITY[r.crate]} Crate` : ''].filter(Boolean).join(' + '); }
function showDaily() {
  const d = S.daily; if (!d) return;
  const m = $('#modal'); m.classList.remove('hidden');
  const cur = d.claimable ? d.streak % 7 : -1;
  m.innerHTML = `<div class="opening daily"><h2 style="justify-content:center">Daily Gift</h2><p class="mute" style="text-align:center">Hol dir jeden Tag ein Geschenk – 7 Tage in Folge für das große Finale. Verpasst du einen Tag, startet die Serie neu.</p>
    <div class="days">${d.rewards.map((r, i) => {
      const done = d.claimable ? i < d.streak % 7 : i <= (d.streak - 1) % 7;
      return `<div class="day ${done ? 'done' : ''} ${i === cur ? 'now' : ''}"><small>Tag ${i + 1}</small><div class="rw">${r.crate ? `<div class="mini"><img src="${RT.crateFace(r.crate, 'front')}" alt="" style="width:100%;height:100%;image-rendering:pixelated"></div>` : ''}${r.coins ? `<span class="coin"></span>` : ''}</div><b>${rewardLabel(r)}</b>${done ? '<i>✓</i>' : ''}</div>`;
    }).join('')}</div>
    <div class="row" style="justify-content:center"><button class="b primary" id="claim" ${d.claimable ? '' : 'disabled'}>${d.claimable ? 'Geschenk abholen' : 'Heute schon abgeholt'}</button><button class="b" id="dclose">Schließen</button></div></div>`;
  $('#dclose').onclick = () => { m.classList.add('hidden'); m.innerHTML = ''; };
  $('#claim').onclick = guard(async () => {
    const res = await api('shop:daily'); S = res.state; renderChrome();
    toast('Geschenk: ' + rewardLabel(res.reward).replace(/<[^>]+>/g, '').trim());
    confetti('#fbbf24'); showDaily(); if (view === 'crates') renderCrates();
  });
}
function shopGrid(type, title) {
  const h = document.createElement('div');
  h.innerHTML = `<h2 style="margin-top:28px">${title}</h2><div class="items"></div>`;
  const wrap = h.querySelector('.items');
  for (const it of S.items.filter((i) => i.type === type && !i.event && i.rarity !== 'secret' && i.rarity !== 'plus')) {
    const owned = S.owned.includes(it.id);
    const buyable = !!S.skinPrices[it.rarity];
    const t = itemTile(it, { extra: owned ? '<span class="tag">Im Besitz</span>' : buyable ? `<button class="b mini"><span class="coin"></span> ${S.skinPrices[it.rarity]}</button>` : '<span class="tag">Nur in Crates</span>' });
    if (!owned && buyable) t.onclick = guard(async () => { const ok = await buyFlow({ name: it.name, sub: RARITY[it.rarity] + ' ' + TYPE_LABEL[it.type], price: S.skinPrices[it.rarity], preview: RT.front(it), run: async () => { S = await api('shop:buyItem', it.id); renderChrome(); } }); if (ok) renderShop(); });
    wrap.append(t);
  }
  return h;
}
function renderShop() {
  content.innerHTML = `<h2>Shop <small>Verdiene Rift Coins mit Spielzeit (1 Coin/Min.) und dem täglichen Geschenk</small><button class="b" id="toCrates" style="margin-left:auto">Zu den Crates</button></h2>
    <div class="card editorcard"><div class="bigicon">🎨</div><div style="flex:1"><h3>Cape-Editor</h3><p class="mute">Male deine eigene Cape Pixel für Pixel und sieh sie live an deinem Skin.</p></div>
      <button class="b ${S.editorUnlocked ? '' : 'primary'}" id="edBtn">${S.editorUnlocked ? 'Öffnen' : `<span class="coin"></span> ${S.editorPrice} – Freischalten`}</button></div>
    <div id="plusCard"></div><div id="grids"></div>`;
  $('#toCrates').onclick = () => go('crates'); paintPlus();
  $('#edBtn').onclick = guard(async () => { if (!S.editorUnlocked) { const ok = await buyFlow({ name: 'Cape-Editor', sub: 'Eigene Capes gestalten', price: S.editorPrice, successText: 'Freigeschaltet!', run: async () => { S = await api('editor:buy'); renderChrome(); } }); if (!ok) return; } go('editor'); });
  $('#grids').append(shopGrid('nametag', 'Nametags'), shopGrid('pet', 'Schulter-Pets'), shopGrid('aura', 'Auren'));
}
function confetti(color) {
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = i % 2 ? color : '#fff';
    c.style.animationDuration = 1.8 + Math.random() * 2 + 's'; c.style.animationDelay = Math.random() * 0.6 + 's';
    document.body.append(c); setTimeout(() => c.remove(), 5000);
  }
}
const RCOL = { common: '#e5e5ea', rare: '#60a5fa', epic: '#c084fc', legendary: '#fbbf24', mythic: '#f472b6', event: '#fb923c', secret: '#a855f7', plus: '#22c55e' };
async function openCrate(id) {
  const res = await api('shop:buyCrate', id);
  S = res.state; renderChrome();
  const it = res.item, col = RCOL[it.rarity] || '#fff', secret = it.rarity === 'secret', sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const m = $('#modal'); m.classList.remove('hidden');
  m.innerHTML = `<div class="cine ${secret ? 'secret' : ''}" id="cine" style="--rc:#ffffff"><div class="cine-rays"></div><div class="cine-ring"></div><div class="cine-ring r2"></div><div class="cine-box" id="cbox"></div><div class="cine-txt" id="ctxt">${secret ? '? ? ?' : 'ÖFFNET…'}</div><div class="cine-flash"></div><div id="cres"></div></div>`;
  const cine = $('#cine'); $('#cbox').append(RT.crateCube(id, 240));
  await sleep(250); cine.classList.add('charging');
  // Farbe „rastet“ durch die Seltenheiten, bevor sie beim Ergebnis landet
  const cycle = Object.values(RCOL); const total = secret ? 3200 : 1900; const t0 = Date.now(); let i = 0;
  const tm = setInterval(() => { const k = (Date.now() - t0) / total; cine.style.setProperty('--rc', k > 0.8 ? col : cycle[i++ % cycle.length]); }, 110);
  await sleep(total); clearInterval(tm); cine.style.setProperty('--rc', col);
  cine.classList.remove('charging'); cine.classList.add('flash'); await sleep(260);
  $('#cbox').style.opacity = 0; $('#cbox').style.transform = 'scale(2)'; $('#ctxt').remove(); cine.classList.add('revealed');
  for (let k = 0; k < 46; k++) { const s = document.createElement('i'); s.className = 'spark'; const ang = Math.random() * 6.283, d = 140 + Math.random() * 300; s.style.setProperty('--dx', Math.cos(ang) * d + 'px'); s.style.setProperty('--dy', Math.sin(ang) * d + 'px'); s.style.animationDelay = Math.random() * 0.25 + 's'; cine.append(s); setTimeout(() => s.remove(), 1800); }
  $('#cres').innerHTML = `<div class="rcard r-${it.rarity}"><div class="rword">${RARITY[it.rarity].toUpperCase()}</div><div class="rprev" id="rprev"></div><h2>${esc(it.name)}</h2>
    <div class="mute">${TYPE_LABEL[it.type]} · ${res.duplicate ? `Schon im Besitz – ${res.refund} Rift Coins zurück` : '<b style="color:#4ade80">Neu in deiner Sammlung!</b>'}</div></div>
    <div class="rbtns"><button class="b primary" id="again">Nochmal</button><button class="b" id="done">Fertig</button></div>`;
  const cv = RT.front(it); cv.style.cssText = `width:${it.type === 'nametag' ? '180px' : 'auto'};height:${it.type === 'nametag' ? 'auto' : '190px'};image-rendering:${it.type === 'nametag' ? 'auto' : 'pixelated'}`; $('#rprev').append(cv);
  if (it.rarity !== 'common') confetti(col);
  $('#done').onclick = () => { m.classList.add('hidden'); m.innerHTML = ''; renderCrateDetail(id); };
  $('#again').onclick = guard(async () => { m.classList.add('hidden'); m.innerHTML = ''; await renderCrateDetail(id); await openCrate(id); });
}

/* ================== SETTINGS ================== */
function renderSettings() {
  const a = S.account;
  content.innerHTML = `<h2>Einstellungen</h2><div class="form">
    <div class="card"><b>Account:</b> ${a ? esc(a.name) + ' <span class="tag">' + 'Microsoft' + '</span>' : 'Nicht eingeloggt'}
      <div class="row" style="margin-top:12px">${a ? '<button class="b danger" id="out">Ausloggen</button>' : '<button class="b primary" id="in">Einloggen</button>'}</div></div>
    <label class="f">Standard-RAM (GB)<input id="ram" type="number" min="1" max="32" value="${S.settings.ram}"></label>
    <label class="f">Java-Pfad (leer = automatisch Java 21 laden)<input id="java" value="${esc(S.settings.javaPath)}" placeholder="C:\\Program Files\\Java\\bin\\java.exe"></label>
    <label class="row"><input type="checkbox" id="min" ${S.settings.closeOnLaunch ? 'checked' : ''} style="min-width:0"> Launcher beim Start minimieren</label>
    <label class="row"><input type="checkbox" id="fs" ${S.settings.fullscreen !== false ? 'checked' : ''} style="min-width:0"> Minecraft im Vollbild starten</label>
    <div class="card"><b>Updates &amp; Meldungen</b><small class="mute" style="display:block;margin:6px 0 10px" id="feedSt">Installiert: v${esc(appVersion || '?')}</small>
      <div class="row"><button class="b" id="feedChk">Jetzt prüfen</button></div></div>
${S.admin ? `<div class="card"><b>Cloud-Adresse (nur Admin)</b><small class="mute" style="display:block;margin:6px 0 10px">Adresse deines Cloudflare-Workers (steht nach worker/deploy.bat im Fenster, oder in Cloudflare unter Workers &amp; Pages → rift-cosmetics). „Für alle speichern“ gilt für alle Spieler und bleibt nach Updates erhalten.</small>
      <div class="row"><input id="capi" placeholder="https://rift-cosmetics.name.workers.dev" value="${esc(S.settings.cosmeticsApi || S.cloudApi || '')}" style="flex:1"><button class="b primary" id="capiGo">Für alle speichern</button></div>
      <small class="mute" style="display:block;margin:10px 0 6px">CurseForge-API-Key (kostenlos auf console.curseforge.com) – für die CurseForge-Suche im Mods-Tab.</small><div class="row"><input id="cfk" placeholder="$2a$10$…" value="${esc(S.cfKey || '')}" style="flex:1"></div></div>` : ''}
    <div class="card" id="refCard"><b>Freunde einladen</b><small class="mute" style="display:block;margin:6px 0 10px">Teile deinen Code: Neue Spieler und du bekommen je 300 Coins (Bonus bei 3 und 10 Einladungen).</small>
      <div class="row"><b id="refCode" class="refcode">…</b><button class="b mini" id="refCopy">Kopieren</button><button class="b mini primary" id="refClaim" style="display:none"></button></div>
      <small class="mute" id="refInfo" style="display:block;margin:8px 0"></small>
      <div class="row"><input id="refIn" placeholder="Code von einem Freund (RIFT-XXXXXX)" style="flex:1"><button class="b" id="refGo">Einlösen</button></div></div>
    <div class="card"><b>Rift-Overlay im Spiel</b><small class="mute" style="display:block;margin:6px 0 10px">HUDs, Menü (Rechts-Shift), Clips (F8), Aufnahme (F7) und Server hosten – läuft über jedem Minecraft, ohne Mod (nur Windows). Beim ersten Mal kann Windows nach der PowerShell-Freigabe fragen.</small>
      <label class="row"><input type="checkbox" id="ovl" checked style="min-width:0"> Overlay aktivieren</label></div>
    <div class="card"><b>Sprache</b><div class="row" style="margin-top:10px" id="langs">${[['de', 'Deutsch'], ['en', 'English']].map(([k, n]) => `<button class="b ${S.settings.lang === k ? 'primary' : ''}" data-lang="${k}">${n}</button>`).join('')}</div></div>
    <div class="card"><b>Style</b><small class="mute" style="display:block;margin:6px 0 10px">Akzentfarbe</small><div class="swatches2" id="accs">${Object.entries(ACCENTS).map(([k, c]) => `<button class="sw2 ${S.settings.accent === k ? 'on' : ''}" data-acc="${k}" style="background:${c}" title="${k}"></button>`).join('')}</div>
      <small class="mute" style="display:block;margin:14px 0 10px">Hintergrund</small><div class="row" id="bgs">${[['black', 'Schwarz'], ['graphite', 'Graphit']].map(([k, n]) => `<button class="b ${S.settings.bg === k ? 'primary' : ''}" data-bg="${k}">${n}</button>`).join('')}</div></div>
    <div class="card"><b>Code einlösen</b><div class="row" style="margin-top:10px"><input id="codeIn" placeholder="CODE" style="flex:1;text-transform:uppercase"><button class="b primary" id="codeBtn">Einlösen</button></div></div>
    <div class="card"><b>Beta</b><small class="mute" style="display:block;margin:6px 0 10px">Experimentelle Funktionen – standardmäßig aus. Schalte sie an, wenn dein PC sie flüssig schafft.</small>
      <label class="row"><input type="checkbox" id="fxbg" ${S.settings.fxBg ? 'checked' : ''} style="min-width:0"> Partikel-Hintergrund (kann am Anfang ruckeln)</label>
      <label class="row"><input type="checkbox" id="fxmo" ${S.settings.fxMotion ? 'checked' : ''} style="min-width:0"> Extra-Effekte (Kacheln kippen, Klick-Wellen)</label>
      <label class="row"><input type="checkbox" id="betaUp" ${S.settings.betaUpdates ? 'checked' : ''} style="min-width:0"> Beta-Updates erhalten (neue Versionen früher testen, kann Fehler haben)</label>
      <div class="row" style="margin-top:10px"><button class="b" id="wprev">Wrapped-Vorschau</button></div></div>
    <div class="card"><b>Debug</b><small class="mute" style="display:block;margin:6px 0 10px">Simuliert eine Neuinstallation: löscht Login, Coins, Profile und Einstellungen und startet den Launcher neu.</small>
      <label class="row"><input type="checkbox" id="rall" style="min-width:0"> Auch heruntergeladene Spieldateien &amp; Java löschen</label>
      <p class="mute" style="font-size:12px">Version ${esc(S.appVersion || "")} · Update-Feed: ${S.feedRepo ? esc(S.feedRepo) : "<b style=\"color:#f87171\">nicht eingerichtet – in Controls „Setup“ ausführen und den Launcher neu bauen</b>"}</p>
      <div class="row" style="margin-top:10px"><button class="b danger" id="reset">Alle Daten löschen (Neuinstallation)</button></div></div>
    <button class="b primary" id="saveS">Speichern</button></div>`;
  { const f = content.querySelector('.form'); [...f.children].forEach((c) => { const beta = /Beta|Debug/.test(c.querySelector('b')?.textContent || '') && c.classList.contains('card'); c.dataset.g = beta ? 'beta' : 'main'; if (c.id === 'saveS') c.dataset.g = 'all'; });
    const bar = document.createElement('div'); bar.className = 'stabs'; bar.innerHTML = '<button data-t="main">Allgemein</button><button data-t="beta">Beta</button>'; content.querySelector('h2').after(bar);
    const setTab = (t) => { f.dataset.tab = t; bar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); }; bar.onclick = (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.t); }; setTab('main'); }
  $('#codeBtn').onclick = guard(async () => { const r = await api('code:redeem', $('#codeIn').value); S = r.state; renderChrome(); $('#codeIn').value = ''; toast(r.admin ? 'Admin freigeschaltet – neuer Bereich links' : `Code eingelöst: +${r.coins} Rift Coins`); });
  (async () => { try { const r = await api('ref:status'); $('#refCode').textContent = r.code; $('#refInfo').textContent = `${r.count} Freund(e) eingeladen` + (r.redeemed ? ' · du hast bereits einen Code eingelöst' : ''); if (r.pending) { const b = $('#refClaim'); b.style.display = ''; b.textContent = `${r.pending}× Belohnung abholen`; b.onclick = guard(async () => { const c = await api('ref:claim'); S = c.state; renderChrome(); toast(`+${c.coins} Coins`); renderSettings(); }); } } catch (e) { $('#refCode').textContent = '—'; $('#refInfo').textContent = e.message; } })();
  $('#refCopy').onclick = () => { try { navigator.clipboard.writeText($('#refCode').textContent); toast('Code kopiert'); } catch {} };
  $('#refGo').onclick = guard(async () => { const r = await api('ref:redeem', $('#refIn').value); S = r.state; renderChrome(); $('#refIn').value = ''; toast(`+${r.coins} Coins – willkommen!`); });
  $('#fxbg').onchange = guard(async () => { S = await api('settings:save', { fxBg: $('#fxbg').checked }); });
  $('#betaUp').onchange = guard(async () => { S = await api('settings:save', { betaUpdates: $('#betaUp').checked }); toast(S.settings.betaUpdates ? 'Beta-Updates an – du siehst Tester-Versionen.' : 'Beta-Updates aus.'); pollFeed?.(); });
  $('#fxmo').onchange = guard(async () => { S = await api('settings:save', { fxMotion: $('#fxmo').checked }); document.body.classList.toggle('fxmo', !!S.settings.fxMotion); });
  $('#reset').onclick = guard(async () => { if (confirm('Wirklich ALLE Launcher-Daten löschen? (Login, Coins, Profile, Einstellungen)' )) await api('app:reset', $('#rall').checked); });
  const style = guard(async (patch) => { S = await api('settings:save', patch); applyStyle(); renderSettings(); });
  content.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => style({ lang: b.dataset.lang })));
  content.querySelectorAll('[data-acc]').forEach((b) => (b.onclick = () => style({ accent: b.dataset.acc })));
  content.querySelectorAll('[data-bg]').forEach((b) => (b.onclick = () => style({ bg: b.dataset.bg })));
  if (a) $('#out').onclick = guard(async () => { S = await api('auth:logout'); accountProfile = null; go('settings'); }); 
  $('#wprev').onclick = () => { window.__wrapForce = true; renderChrome(); go('wrapped'); };
  $('#feedChk').onclick = guard(async () => { const r = await api('feed:get'); const u = r.announcements.filter((a) => a.type === 'update').sort((a, b) => (isNewer(a.version, b.version) ? -1 : 1))[0];
    $('#feedSt').innerHTML = `Installiert: v${esc(r.appVersion)} · ${esc(r.info.text)}${r.info.repo ? ' · ' + esc(r.info.repo) + '@' + esc(r.info.branch) : ''}<br>` + (u ? `Neuestes Update im Feed: v${esc(String(u.version).replace(/^v/, ''))} – ${isNewer(u.version, r.appVersion) ? 'NEUER als deine Version (Popup erscheint)' : 'nicht neuer als deine Version (kein Popup)'}` : 'Kein Update im Feed.');
    pollFeed(); });
  api('overlay:get').then((o) => { const e = $('#ovl'); if (e) e.checked = o.cfg.enabled; }).catch(() => {});
  if ($('#capiGo')) $('#capiGo').onclick = guard(async () => { const v = $('#capi').value.trim(); const o = await api('admin:setCloud', v, $('#cfk').value.trim()); S = await api('settings:save', { cosmeticsApi: o.api }); toast('Cloud-Adresse für alle gespeichert.'); });
  $('#saveS').onclick = guard(async () => { await api('overlay:set', { enabled: $('#ovl').checked }); S = await api('settings:save', { ram: +$('#ram').value, javaPath: $('#java').value.trim(), closeOnLaunch: $('#min').checked, fullscreen: $('#fs').checked}); toast('Gespeichert.'); });
}

/* ================== Ankündigungen (Rift Launcher Controls) ================== */
let feed = [];
let appVersion = '1.0.0';
let maintTimer = null;
const verNum = (v) => String(v || '0').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
const isNewer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
const KINDS = { news: 'Fast News', update: 'Update', info: 'Info' };
const GEAR = 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z';

/* Wartung: Vollbild, nicht schließbar, zeigt nur die geschätzte Zeit */
const maintIgnored = new Set();
function renderMaintenance(m) {
  const el = $('#maint');
  if (!m) { el.classList.add('hidden'); el.innerHTML = ''; el.dataset.id = ''; clearInterval(maintTimer); maintTimer = null; return; }
  const key = m.id + (S.admin ? ':a' : '');
  if (el.dataset.id === key && !el.classList.contains('hidden')) return;
  el.dataset.id = key; el.classList.remove('hidden');
  el.innerHTML = `<div class="mwin"><button data-win="min">–</button><button data-win="close">✕</button></div>
    <div class="mbox"><svg viewBox="0 0 24 24"><path d="${GEAR}"/></svg><h1>WARTUNGSARBEITEN</h1><div class="eta"><small>ESTIMATED TIME</small><b id="etaV">…</b></div>
    ${S.admin ? '<div class="row" style="gap:10px;margin-top:8px"><button class="b primary" id="mStop">■ Wartung stoppen</button><button class="b" id="mHide">Nur bei mir ausblenden</button></div>'
      : '<div style="margin-top:14px"><a id="mCodeL" style="color:#777;font-size:11px;cursor:pointer">Admin-Code</a><div id="mCodeB" style="display:none;gap:6px;margin-top:6px"><input id="mCode" placeholder="Code" style="width:140px"><button class="b" id="mCodeGo">OK</button></div></div>'}</div>`;
  const hide = guard(async () => { await api('maint:ignore', m.id); maintIgnored.add(m.id); renderMaintenance(null); });
  $('#mHide') && ($('#mHide').onclick = hide);
  $('#mStop') && ($('#mStop').onclick = guard(async () => {
    try { await api('admin:remove', m.id); toast('Wartung beendet – alle Spieler sehen sie in Kürze nicht mehr.'); maintIgnored.add(m.id); await api('maint:ignore', m.id); renderMaintenance(null); pollFeed(); }
    catch (e) { await hide(); toast('Für alle beenden geht erst nach dem GitHub-Setup (' + e.message + '). Bei dir ist sie ausgeblendet.', true); go('admin_setup'); }
  }));
  if ($('#mCodeL')) { $('#mCodeL').onclick = () => { $('#mCodeB').style.display = 'flex'; $('#mCode').focus(); };
    $('#mCodeGo').onclick = guard(async () => { const r = await api('code:redeem', $('#mCode').value); S = r.state; renderChrome(); el.dataset.id = ''; renderMaintenance(m); toast(r.admin ? 'Admin freigeschaltet' : 'Code eingelöst'); }); }
  const tick = () => {
    const v = $('#etaV'); if (!v) return;
    if (!m.etaAt) { v.textContent = 'To be announced'; return; }
    const ms = new Date(m.etaAt) - Date.now();
    if (ms <= 0) { v.textContent = 'Any moment now…'; return; }
    const h = Math.floor(ms / 3.6e6), mi = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
    v.textContent = `${h ? h + 'h ' : ''}${String(mi).padStart(h ? 2 : 1, '0')}m ${String(s).padStart(2, '0')}s`;
  };
  tick(); clearInterval(maintTimer); maintTimer = setInterval(tick, 1000);
}

const dismissed = new Set();
function showAnnouncement(a) {
  if (!a) return;
  const p = $('#popup'); p.classList.remove('hidden');
  const isUpdate = a.type === 'update', must = isUpdate && a.mandatory;
  p.innerHTML = `<div class="ann t-${esc(a.type)}"><div class="kind">${esc(KINDS[a.type] || 'Info')}${isUpdate && a.version ? ' · v' + esc(String(a.version).replace(/^v/, '')) : ''}${must ? ' · Pflicht' : ''}</div>
    <h3>${esc(a.title)}</h3><p>${esc(a.message || '')}</p><div class="upwrap" id="upwrap"><div class="uptop"><span id="upphase">Bereit</span><b id="uppct">0%</b></div><div class="upbar"><i></i></div></div>
    <div class="row">${a.link ? `<button class="b primary" id="annLink">${isUpdate ? 'Jetzt aktualisieren' : 'Mehr erfahren'}</button>` : ''}${must && !S.admin ? '' : `<button class="b" id="annOk">${must ? 'Schließen (Admin)' : 'Schließen'}</button>`}${must && S.admin ? '<button class="b" id="annDel">Für alle entfernen</button>' : ''}</div>
    ${must && !S.admin ? '<div style="margin-top:12px"><a id="pCodeL" style="color:#777;font-size:11px;cursor:pointer">Admin-Code</a><div id="pCodeB" style="display:none;gap:6px;margin-top:6px"><input id="pCode" placeholder="Code" style="width:140px"><button class="b" id="pCodeGo">OK</button></div></div>' : ''}</div>`;
  if ($('#pCodeL')) { $('#pCodeL').onclick = () => { $('#pCodeB').style.display = 'flex'; $('#pCode').focus(); };
    $('#pCodeGo').onclick = guard(async () => { const r = await api('code:redeem', $('#pCode').value); S = r.state; renderChrome(); showAnnouncement(a); toast(r.admin ? 'Admin freigeschaltet' : 'Code eingelöst'); }); }
  if ($('#annDel')) $('#annDel').onclick = guard(async () => {
    try { await api('admin:remove', a.id); toast('Entfernt – alle Spieler sehen es in Kürze nicht mehr.'); }
    catch (e) { toast('Für alle entfernen geht erst nach dem GitHub-Setup (' + e.message + ').', true); }
    await api('maint:ignore', a.id); dismissed.add(a.id); p.classList.add('hidden'); p.innerHTML = ''; pollFeed();
  });
  if (!must || S.admin) $('#annOk').onclick = () => { p.classList.add('hidden'); p.innerHTML = ''; if (must) { dismissed.add(a.id); api('maint:ignore', a.id).catch(() => {}); } api('feed:seen', [a.id]).catch(() => {}); S.seen = [...(S.seen || []), a.id]; showNextAnnouncement(); };
  if (a.link) $('#annLink').onclick = async () => {
    if (!isUpdate) return window.open(a.link);
    api('feed:seen', [a.id]).catch(() => {});   // gleiches Update nicht nochmal aufpoppen lassen
    const b = $('#annLink'); b.disabled = true; b.textContent = 'Lade herunter…'; $('#upwrap').classList.add('on'); setUpPhase('download', 0);
    try {
      if (a.hot) { await api('update:hot', a.link, a.version, a.sha256); b.textContent = 'Starte neu…'; setUpPhase('restart', 100); }
      else { await api('update:install', a.link, a.version); b.textContent = 'Installer startet…'; setUpPhase('restart', 100); }
    }
    catch (e) { b.disabled = false; b.textContent = 'Erneut versuchen'; $('#upwrap')?.classList.remove('on'); toast(e.message, true); }
  };
}
const UP_PHASE = { download: 'Lade Update herunter…', verify: 'Prüfe Datei…', install: 'Entpacke & installiere…', restart: 'Starte neu…' };
function setUpPhase(phase, pct) {
  const i = $('.upbar i'); if (!i) return;
  $('#upphase').textContent = UP_PHASE[phase] || phase;
  if (pct != null) { i.style.width = pct + '%'; $('#uppct').textContent = Math.round(pct) + '%'; }
  $('#upwrap').classList.toggle('done', phase === 'restart');
}
rift.on('update:progress', (d) => setUpPhase(d.phase || 'download', d.pct));

function showNextAnnouncement() {
  if (!$('#popup').classList.contains('hidden')) return;
  const next = feed.find((a) => {
    if (a.type === 'maintenance' || a.type === 'countdown' || dismissed.has(a.id)) return false;
    const seen = (S.seen || []).includes(a.id);
    if (a.type === 'update') return isNewer(a.version, appVersion) && (a.mandatory || !seen);
    return !seen;
  });
  if (next) showAnnouncement(next);
}
let pollT = null;
async function pollFeed() {
  clearTimeout(pollT);
  try {
    const r = await api('feed:get');
    const before = JSON.stringify(feed.map((a) => a.id));
    feed = [...r.announcements.filter((a) => a.type !== 'update'), ...r.announcements.filter((a) => a.type === 'update').sort((a, b) => (isNewer(a.version, b.version) ? -1 : isNewer(b.version, a.version) ? 1 : 0))]; appVersion = r.appVersion; S.seen = r.seen;
    renderMaintenance(feed.find((a) => a.type === 'maintenance' && !maintIgnored.has(a.id)));
    const upd = feed.find((a) => a.type === 'update' && isNewer(a.version, appVersion));
    const pill = $('#updPill');
    if (upd) { pill.style.display = ''; pill.textContent = '⬆ Update v' + String(upd.version).replace(/^v/, ''); pill.onclick = () => showAnnouncement(upd); } else pill.style.display = 'none';
    if (before !== JSON.stringify(feed.map((a) => a.id)) && view === 'play') renderPlay();
    window.cdUpdate && cdUpdate(r.announcements, r.upcoming);
    showNextAnnouncement();
  } catch {}
  pollT = setTimeout(pollFeed, feed.some((a) => a.type === 'maintenance') ? 30e3 : 60e3);
}

addEventListener('focus', () => { if (S) pollFeed(); });

/* ================== Start ================== */
(async () => {
  S = await api('state:get');
  applyStyle();
  await loadAccountProfile();
  publishCosmetics();
  pollFeed();
  go('play');
  setTimeout(plusMonthPopup, 1400);
  if (S.hotError) setTimeout(() => toast('Das letzte Update konnte nicht gestartet werden: ' + S.hotError, true), 1800);
  setTimeout(syncCatalog, 2500);
  if (S.account && S.daily?.claimable) setTimeout(() => { if ($('#modal').classList.contains('hidden')) showDaily(); }, 900);
})().catch((e) => { document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;padding:20px">${esc(e.stack || e)}</pre>`); });

document.addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);


/* ================== BETA: LAUNCH-ANIMATION ================== */
/* weißer Stern wächst -> Lichtstreifen rasen vorbei (erst schnell und weiß, dann langsamer und rot) -> Mojang-Rot; danach öffnet sich das Spiel mit seinem echten Ladebildschirm */
let fxActive = null;
function playLaunchAnimation(preview) {
  if (fxActive) return fxActive;
  const ov = document.createElement('div'); ov.id = 'launchfx';
  ov.innerHTML = '<canvas></canvas><div class="mojang"></div><div class="fx-skip">Klicken zum Überspringen</div>' + (preview ? '<button class="fx-x" title="Schließen">✕</button>' : '');
  document.body.append(ov);
  const cv = ov.querySelector('canvas'), x = cv.getContext('2d'), mj = ov.querySelector('.mojang');
  let W = 0, H = 0;
  const resize = () => { const d = window.devicePixelRatio || 1; W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; };
  resize(); window.addEventListener('resize', resize);
  const T_STAR = 1.7, T_RUSH = 3.6, T_WASH = 0.8, T_END = T_STAR + T_RUSH + T_WASH;
  const cl = (v) => Math.min(1, Math.max(0, v)), ease = (v) => 1 - Math.pow(1 - cl(v), 3), easeIn = (v) => Math.pow(cl(v), 2);
  const mix = (k) => [255, Math.round(255 - 215 * k), Math.round(255 - 225 * k)];   // weiß -> rot
  const rgba = (c, al) => `rgba(${c[0]},${c[1]},${c[2]},${al})`;
  const N = 460;
  const lines = Array.from({ length: N }, () => ({ a: Math.random() * 6.283, z: 0.05 + Math.random() * 0.95, w: 0.5 + Math.random() * 1.5 }));
  let t0 = performance.now(), last = t0, skipped = false, done = false, finished = false, mjAt = 0, raf = 0;

  function star(cx, cy, R, rot, col, al) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
    g.addColorStop(0, rgba(col, al)); g.addColorStop(0.25, rgba(col, al * 0.35)); g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g; x.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);
    x.save(); x.translate(cx, cy); x.rotate(rot); x.fillStyle = rgba(col, al);
    x.beginPath();                                          // 4-zackiger Stern, vertikal und horizontal gleich
    for (let i = 0; i <= 160; i++) { const tt = i / 160 * 6.2832, c = Math.cos(tt), s = Math.sin(tt); x.lineTo(R * 1.25 * Math.sign(c) * Math.abs(c) ** 8, R * 1.25 * Math.sign(s) * Math.abs(s) ** 11); }
    x.closePath(); x.shadowColor = rgba(col, 1); x.shadowBlur = R * 0.12; x.fill(); x.restore();
  }
  function frame(now) {
    if (done) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let t = (now - t0) / 1000; if (skipped) t = Math.max(t, T_END);
    const m = Math.min(W, H), cx = W / 2, cy = H / 2, diag = Math.hypot(W, H) / 2;
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    if (t < T_END) {
      if (t < T_STAR) {                                       // Stern erscheint und wächst
        const k = ease(t / T_STAR);
        star(cx, cy, 4 + k * m * 0.3, t * 0.6, [255, 255, 255], 0.5 + 0.5 * k);
      } else {
        const u = (t - T_STAR) / T_RUSH, col = mix(Math.min(1, easeIn(u) * 1.05));
        const sp = Math.pow(1 - cl(u), 2.2) * 2.4 + 0.12;     // erst sehr schnell, dann langsam
        const stretch = 0.02 + 0.55 * sp;                      // Länge der Streifen folgt der Geschwindigkeit
        x.lineCap = 'round';
        for (const l of lines) {
          l.z -= dt * sp * 0.35 * (0.6 + l.w * 0.5); if (l.z < 0.02) { l.z = 1; l.a = Math.random() * 6.283; }
          const r1 = m * 0.03 / l.z, r0 = m * 0.03 / (l.z + stretch * l.z);
          if (r0 > diag * 1.2) continue;
          const c = Math.cos(l.a), s = Math.sin(l.a), al = Math.min(1, r1 / (m * 0.15));
          x.strokeStyle = rgba(col, al); x.lineWidth = Math.max(1, (r1 / diag) * m * 0.012 * l.w);
          x.beginPath(); x.moveTo(cx + c * r0, cy + s * r0); x.lineTo(cx + c * r1, cy + s * r1); x.stroke();
        }
        star(cx, cy, m * (0.3 - 0.22 * easeIn(u)), t * 0.6, col, 1 - 0.4 * u);   // Stern bleibt als Fluchtpunkt
        const wash = cl((t - T_STAR - T_RUSH) / T_WASH);       // Streifen -> Mojang-Rot
        if (wash > 0) { x.fillStyle = `rgba(239,50,61,${ease(wash)})`; x.fillRect(0, 0, W, H); }
      }
    } else {
      if (!mjAt) { mjAt = now; mj.classList.add('on'); }
      x.fillStyle = '#ef323d'; x.fillRect(0, 0, W, H);
      if (finished && (now - mjAt) / 1000 > 0.5) return end();   // rotes Bild bleibt, bis Minecraft läuft – dann kommt der echte Ladebildschirm
    }
    raf = requestAnimationFrame(frame);
  }
  function end() {
    if (done) return; done = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
    ov.classList.add('out'); setTimeout(() => { ov.remove(); fxActive = null; }, 550);
  }
  ov.onclick = () => { skipped = true; };
  if (preview) { const esc_ = (e) => { if (e.key === 'Escape') { skipped = true; document.removeEventListener('keydown', esc_); } }; document.addEventListener('keydown', esc_); }
  raf = requestAnimationFrame(frame);
  if (preview) setTimeout(() => { finished = true; }, (T_END + 2) * 1000);
  setTimeout(() => { finished = true; if (!mjAt) skipped = true; }, 120000);   // Sicherheitsnetz
  return (fxActive = { finish() { finished = true; }, cancel() { end(); } });
}


/* ================== BETA: CRASH-ANIMATION ================== */
/* Derselbe Stern – ein Meteor schlägt ein, der Stern zerplatzt, dann „Spiel abgestürzt“ mit Logs / Weiter */
let crashActive = false;
function playCrashAnimation(code, preview) {
  if (crashActive) return; crashActive = true;
  const ov = document.createElement('div'); ov.id = 'launchfx'; ov.className = 'crashfx';
  ov.innerHTML = `<div class="cr-vig"></div><div class="cr-scan"></div>
    <div class="cr-main">
      <svg class="cr-star" viewBox="-12 -12 24 24"><defs><clipPath id="crA"><polygon points="-12,-12 12,-12 -12,12"/></clipPath><clipPath id="crB"><polygon points="12,-12 12,12 -12,12"/></clipPath></defs>
        <g clip-path="url(#crA)" class="ha"><path d="M0-10C1.4-3 3-1.4 10 0 3 1.4 1.4 3 0 10-1.4 3-3 1.4-10 0-3-1.4-1.4-3 0-10Z"/></g>
        <g clip-path="url(#crB)" class="hb"><path d="M0-10C1.4-3 3-1.4 10 0 3 1.4 1.4 3 0 10-1.4 3-3 1.4-10 0-3-1.4-1.4-3 0-10Z"/></g></svg>
      <h1 class="cr-t" data-t="ABGESTÜRZT">ABGESTÜRZT</h1>
      <p class="cr-s">Minecraft wurde unerwartet beendet (Code ${esc(String(code))})</p>
      <div class="cr-btns"><button class="b" id="crLogs">Logs ansehen</button><button class="b primary" id="crAi">AI-Check <small>BETA</small></button><button class="b" id="crGo">Schließen</button></div>
    </div>
    <div class="cr-panel" id="crPanel"><div class="cr-ph"><b id="crPt"></b><button class="b mini" id="crPx">✕ Schließen</button></div><div class="cr-pb" id="crPb"></div></div>`;
  document.body.append(ov);
  const close = () => { ov.classList.add('out'); setTimeout(() => { ov.remove(); crashActive = false; }, 450); };
  const panel = $('#crPanel'), pb = $('#crPb'), pt = $('#crPt'); let mode = '';
  const openPanel = (m, title) => { mode = m; pt.textContent = title; panel.classList.add('on'); ov.classList.add('pan'); };
  const closePanel = () => { mode = ''; panel.classList.remove('on'); ov.classList.remove('pan'); };
  $('#crGo').onclick = close; $('#crPx').onclick = closePanel;
  $('#crLogs').onclick = () => { if (mode === 'logs') return closePanel(); openPanel('logs', 'Logs'); pb.innerHTML = '<pre></pre>'; const pre = pb.firstChild; pre.textContent = game.log.slice(-150).join('\n') || '(keine Log-Zeilen)'; pre.scrollTop = pre.scrollHeight; };
  $('#crAi').onclick = async () => {
    if (mode === 'ai') return closePanel(); openPanel('ai', 'AI-Check (Beta)');
    pb.innerHTML = '<div class="cr-load"><i></i><i></i><i></i><span>Analysiere Logs…</span></div>';
    try {
      const pr = profile(); if (!pr) throw new Error('Kein Profil ausgewählt.');
      const res = await api('ai:check', pr.id, game.log.slice(-300));
      await new Promise((r) => setTimeout(r, 900));
      pb.innerHTML = '<small class="mute">Regelbasierte Analyse deiner Logs – läuft komplett auf deinem PC.</small>' + res.map((f, i) => `<div class="cr-f" style="--i:${i}"><p>${esc(f.text).replace(/\n/g, '<br>')}</p>${f.fix ? `<button class="b primary mini" data-fix="${esc(f.fix.id)}">${esc(f.fix.label)}</button>` : ''}</div>`).join('');
      pb.querySelectorAll('[data-fix]').forEach((b) => b.onclick = async () => {
        b.disabled = true; try { const msg = await api('ai:fix', pr.id, b.dataset.fix); if (b.dataset.fix === 'safe_mode') await api('overlay:set', { enabled: false }).catch(() => {}); b.outerHTML = `<span class="cr-ok">✓ ${esc(msg)}</span>`; S = await api('state:get'); }
        catch (e) { b.disabled = false; toast(e.message, true); }
      });
    } catch (e) { pb.innerHTML = `<p>${esc(e.message)}</p>`; }
  };
  if (preview) { const k = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } }; document.addEventListener('keydown', k); }
}

/* ================== Kauf bestätigen (durchziehen) ================== */
/* opts: { name, sub, price, preview (Element), run: async () => … }  →  true bei Kauf, false bei Abbruch */
function buyFlow({ name, sub = '', price, preview, run, successText = 'Gekauft!', unit = '', balance, money = false }) {
  return new Promise((resolve) => {
    const ov = document.createElement('div'); ov.className = 'buyov';
    const after = money ? 1 : (balance ?? S.coins ?? 0) - price;
    ov.innerHTML = `<div class="buybox"><button class="buyx" title="Abbrechen">✕</button>
      <div class="buyh">Kauf bestätigen</div><div class="buyprev"></div><div class="buyname">${esc(name)}</div><div class="mute">${esc(sub)}</div>
      <div class="buyprice">${money ? '$' : unit ? '🍬' : '<span class="coin"></span>'} ${price}</div>${money ? '<div class="mute">Testmodus – es wird noch nichts abgebucht</div>' : `<div class="mute">Kontostand danach: <b style="color:${after < 0 ? '#ff6a6a' : '#fff'}">${after}</b> ${unit || 'Coins'}</div>`}
      <div class="slide ${after < 0 ? 'dis' : ''}"><div class="slfill"></div><div class="sltxt">${after < 0 ? unit ? 'Nicht genug ' + unit : 'Nicht genug Rift Coins' : 'Zum Bezahlen durchziehen'}</div><div class="slh">➜</div></div>
      <div class="buydone"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23" fill="none" stroke="currentColor" stroke-width="3"/><path d="M14 27l8 8 16-17" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><b>${esc(successText)}</b><span class="mute">${esc(name)}</span></div></div>`;
    if (preview) ov.querySelector('.buyprev').append(preview); else ov.querySelector('.buyprev').remove();
    document.body.append(ov); requestAnimationFrame(() => ov.classList.add('on'));
    const box = ov.querySelector('.buybox'), sl = ov.querySelector('.slide'), h = ov.querySelector('.slh'), fill = ov.querySelector('.slfill');
    let done = false; const close = (v) => { if (done) return; done = true; ov.classList.remove('on'); setTimeout(() => ov.remove(), 250); resolve(v); };
    ov.querySelector('.buyx').onclick = () => close(false); ov.addEventListener('mousedown', (e) => { if (e.target === ov && !box.classList.contains('busy')) close(false); });
    let drag = false, x0 = 0, p = 0, paidAt = 0; const max = () => sl.clientWidth - h.offsetWidth - 8;
    const set = (v) => { p = Math.max(0, Math.min(1, v)); h.style.transform = `translateX(${p * max()}px)`; fill.style.width = (p * max() + h.offsetWidth + 4) + 'px'; };
    h.onpointerdown = (e) => { if (sl.classList.contains('dis') || box.classList.contains('busy')) return; drag = true; x0 = e.clientX - p * max(); h.setPointerCapture(e.pointerId); h.classList.add('grab'); };
    h.onpointermove = (e) => { if (drag) set((e.clientX - x0) / max()); };
    h.onpointerup = h.onpointercancel = async () => {
      if (!drag) return; drag = false; h.classList.remove('grab');
      if (p < 0.97) { h.style.transition = 'transform .25s'; fill.style.transition = 'width .25s'; set(0); setTimeout(() => { h.style.transition = fill.style.transition = ''; }, 260); return; }
      set(1); box.classList.add('busy'); sl.querySelector('.sltxt').textContent = 'Wird bezahlt…';
      try { if (run) await run(); } catch (e) { toast(e.message || String(e), true); box.classList.remove('busy'); return close(false); }
      box.classList.add('paid'); paidAt = Date.now(); try { confetti('#ffc83d'); } catch {}
      if (run) setTimeout(() => close(true), 2000); else close(true);
    };
    box.addEventListener('click', (e) => { if (box.classList.contains('paid') && Date.now() - paidAt > 900 && !e.target.closest('.buyx')) close(true); });
  });
}

/* ---- Offline-Erkennung ---- */
(function netWatch() {
  let last = null;
  const apply = (on) => { if (last === on || !S) return; const was = last; last = on; NET.off = !on; renderChrome(); if (was !== null) toast?.(on ? 'Wieder online' : 'Offline – nur Starten möglich'); if (!on && OFFLINE_LOCK.includes(view)) go('play'); else if (on && was === false && view === 'play') go('play'); };
  const check = async () => { let on = navigator.onLine; if (on) { try { on = await api('net:check'); } catch {} } apply(!!on); };
  window.addEventListener('offline', () => apply(false)); window.addEventListener('online', check);
  setInterval(check, 12000); setTimeout(check, 1500);
})();
function playOfflineAnimation() {
  const d = document.createElement('div'); d.className = 'offanim';
  d.innerHTML = '<svg viewBox="0 0 24 24" width="84" height="84" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path class="w1" d="M2 8.8a15 15 0 0 1 20 0"/><path class="w2" d="M5 12.5a10 10 0 0 1 14 0"/><path class="w3" d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8" fill="currentColor"/><path class="sl" d="M3 3l18 18"/></svg><b>OFFLINE-MODUS</b><small>Minecraft startet ohne Internet</small>';
  document.body.appendChild(d); setTimeout(() => d.classList.add('out'), 1700); setTimeout(() => d.remove(), 2200);
}

/* ---- Rift+ Karte im Shop ---- */
async function paintPlus() {
  const el = $('#plusCard'); if (!el) return; let d; try { d = await api('plus:get'); } catch { return; }
  if (!$('#plusCard')) return;
  el.innerHTML = `<div class="plusbox ${d.active ? 'on' : ''}"><div class="plusl"><div class="pluslogo"><img src="logo.png" alt=""><i>+</i></div><div><h3>Rift<span>+</span></h3><small>Das VIP-Abo</small></div></div>
    <ul class="plusperks"><li><b>20 %</b> Rabatt auf Shop, Crates &amp; Editor</li><li><b>Jeden Monat</b> ein exklusives Cosmetic nur für VIPs</li><li><b>Halloween Premium-Pass</b> inklusive (statt 2,99 $)</li><li><b>Grünes +</b> am Rift-Logo, im Nametag und im Spiel</li></ul>
    <div class="plusr"><div class="plusprice">${d.active ? 'Aktiv ✓' : '<b>4,99 $</b><small>pro Monat</small>'}</div>
      ${d.active ? `<button class="b ${d.claimable ? 'primary' : ''}" id="plusClaim" ${d.claimable ? '' : 'disabled'}>${d.claimable ? 'Monats-Cosmetic abholen' : '✓ Diesen Monat geholt'}</button><button class="b mini" id="plusOff">Kündigen</button>`
        : d.payTest ? '<button class="b primary plusgo" id="plusGo">Rift+ holen</button>' : '<button class="b" disabled>Not for sale</button>'}</div></div>`;
  if ($('#plusGo')) $('#plusGo').onclick = guard(async () => { const ok = await buyFlow({ name: 'Rift+', sub: 'Monatliches Abo · Zahlung folgt später', price: '4,99', money: true, successText: 'Willkommen bei Rift+!', run: async () => { S = await api('plus:subscribe'); renderChrome(); } }); if (ok) { try { confetti('#22c55e'); } catch {} paintPlus(); } });
  if ($('#plusOff')) $('#plusOff').onclick = guard(async () => { S = await api('plus:cancel'); renderChrome(); toast('Rift+ gekündigt'); paintPlus(); });
  if ($('#plusClaim')) $('#plusClaim').onclick = guard(async () => { const r = await api('plus:claim'); S = r.state; renderChrome(); toast('Neu: ' + r.item.name); paintPlus(); });
}


/* ---- Rift+: Monats-Popup & eigener Tab ---- */
const curMonth = () => new Date().toISOString().slice(0, 7);
async function plusMonthPopup() {
  if (!S?.account || !S.plus?.active || S.plus.claimedMonth === curMonth() || document.querySelector('.plusmo')) return;
  let d; try { d = await api('plus:get'); } catch { return; } if (!d.claimable || !d.item) return;
  const o = document.createElement('div'); o.className = 'plusmo';
  o.innerHTML = `<div class="plusmc"><small>RIFT+ · DEIN MONATS-GESCHENK</small><div class="pmprev"></div><h3>${esc(d.item.name)}</h3><span class="tag t-plus">${TYPE_LABEL[d.item.type]} · nur für Rift+</span><div class="row" style="justify-content:center;margin-top:16px"><button class="b primary" id="pmGo">Abholen</button><button class="b" id="pmLater">Später</button></div></div>`;
  document.body.appendChild(o); const cv = RT.front(d.item); cv.style.cssText = 'width:150px;height:150px;object-fit:contain'; o.querySelector('.pmprev').append(cv);
  requestAnimationFrame(() => o.classList.add('in'));
  const close = () => { o.classList.remove('in'); setTimeout(() => o.remove(), 250); };
  o.querySelector('#pmLater').onclick = close;
  o.querySelector('#pmGo').onclick = guard(async () => { const r = await api('plus:claim'); S = r.state; renderChrome(); try { confetti('#22c55e'); } catch {} toast('Neu: ' + r.item.name); close(); if (view === 'plus') renderPlusTab(); });
}
async function renderFriends() {
  content.innerHTML = `<h2>Freunde <small>Online sehen, Profil mit Skin &amp; Cosmetics anschauen</small></h2><div class="form" style="max-width:680px">
    <div class="card"><b>Dein Freundes-Code</b><div class="row" style="margin-top:10px"><b id="frCode" class="refcode">…</b><button class="b mini" id="frCopy">Kopieren</button></div>
    <div class="row" style="margin-top:12px"><input id="frIn" placeholder="Code von einem Freund (RIFT-XXXXXX)" style="flex:1"><button class="b primary" id="frAdd">Hinzufügen</button></div></div>
    <div class="card" id="frList"><div class="mute">Lade…</div></div></div>`;
  const paint = (d) => {
    $('#frCode').textContent = d.code; const L = $('#frList');
    L.innerHTML = d.friends.length ? `<b>${d.friends.filter((f) => f.online).length} online · ${d.friends.length} Freunde</b>` + d.friends.map((f) => `<div class="row frrow" style="margin-top:10px;align-items:center;gap:10px"><i style="width:10px;height:10px;border-radius:50%;background:${f.online ? '#22c55e' : '#52525b'};flex:none"></i><b style="flex:1">${esc(f.name)}${f.plus ? ' <span style="color:#22c55e">+</span>' : ''} <small class="mute">${f.online ? 'online' + (f.where ? ' · ' + esc(f.where) : '') : 'offline'}</small></b><button class="b mini" data-pf="${f.uuid}" data-nm="${esc(f.name)}">Profil</button><button class="b mini danger" data-rm="${f.uuid}">✕</button></div>`).join('') : '<div class="mute">Noch keine Freunde. Tausche deinen Code mit jemandem aus.</div>';
    L.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = guard(async () => { paint(await api('friends:remove', b.dataset.rm)); })));
    L.querySelectorAll('[data-pf]').forEach((b) => (b.onclick = guard(() => friendProfile(b.dataset.pf, b.dataset.nm))));
  };
  const load = async () => { try { paint(await api('friends:list')); } catch (e) { $('#frList').innerHTML = `<div class="mute">${esc(e.message)}</div>`; } };
  $('#frCopy').onclick = () => { navigator.clipboard?.writeText($('#frCode').textContent); toast('Code kopiert'); };
  $('#frAdd').onclick = guard(async () => { const v = $('#frIn').value.trim(); if (!v) return; paint(await api('friends:add', v)); $('#frIn').value = ''; toast('Freund hinzugefügt'); });
  await load(); const tm = setInterval(() => { if (!$('#frList')) return clearInterval(tm); load(); }, 20000);
}
async function friendProfile(uuid, name) {
  const d = await api('friends:profile', uuid), c = d.cos || {};
  const o = document.createElement('div'); o.className = 'overlayfull'; o.style.cssText = 'position:fixed;inset:0;background:#000b;display:flex;align-items:center;justify-content:center;z-index:90';
  o.innerHTML = `<div class="card" style="width:min(520px,92vw);display:flex;gap:18px;align-items:center"><canvas id="fpV" style="flex:none"></canvas><div style="flex:1"><h2 style="margin:0">${esc(name)}${c.plus ? ' <span style="color:#22c55e">+</span>' : ''}</h2>
    <div class="mute" style="margin:8px 0;line-height:1.7">${c.pet ? 'Pet: <b>' + esc(c.pet) + '</b><br>' : ''}${c.aura ? 'Aura: <b>' + esc(c.aura) + '</b><br>' : ''}${c.badge ? 'Badge: <b>' + esc(c.badge) + '</b><br>' : ''}${c.nametag ? 'Nametag: <b>' + esc(c.nametag.kind || 'eigener') + '</b><br>' : ''}${c.capePng ? 'Cape: <b>aktiv</b>' : 'Keine Cape'}${d.cos ? '' : '<br>Noch keine Cosmetics gespeichert.'}</div>
    <button class="b primary" id="fpX">Schließen</button></div></div>`;
  document.body.appendChild(o);
  let v; try { v = makeViewer(o.querySelector('#fpV'), 220, 300, { cape: false, pet: false }); if (d.skin) await v.loadSkin(d.skin.url, { model: d.skin.model }).catch(() => {}); if (c.capePng) v.loadCape(c.capePng); else if (v.resetCape) v.resetCape(); v.animation = new skinview3d.IdleAnimation(); } catch (e) { console.warn(e); }
  const close = () => { try { v && v.dispose && v.dispose(); } catch {} o.remove(); };
  o.querySelector('#fpX').onclick = close; o.onclick = (e) => { if (e.target === o) close(); };
}
async function renderPlusTab() {
  const all = await api('plus:all'); const d = await api('plus:get'); const mon = new Date().getMonth();
  const MN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  content.innerHTML = `<div class="plustab"><h2>Rift<span style="color:#22c55e">+</span></h2><p class="mute">Deine VIP-Vorteile. Jeden Monat ein neues, exklusives Cosmetic.</p>
    ${d.claimable ? '<div class="card"><b>Dieses Monats-Cosmetic wartet auf dich</b><div class="row" style="margin-top:10px"><button class="b primary" id="ptClaim">Jetzt abholen</button></div></div>' : ''}
    <h3 style="margin:18px 0 10px">Monats-Cosmetics</h3><div class="plusgrid" id="ptGrid"></div>
    <h3 style="margin:22px 0 10px">Animierte Capes <small class="mute">nur für Rift+</small></h3><div class="plusgrid" id="ptAnim"></div>
    <h3 style="margin:22px 0 10px">Farbe deines „+“</h3><div class="card"><small class="mute" style="display:block;margin-bottom:10px">Gilt am Rift-Logo, im Nametag und im Spiel.</small><div class="swatches2" id="ptCols">${['#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f97316', '#facc15', '#ef4444', '#ffffff'].map((c) => `<button class="sw2 ${(S.plus.color || '#22c55e') === c ? 'on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}</div></div>
    <h3 style="margin:22px 0 10px">Early Access</h3>
    <div class="card"><b>Neue Features vor allen anderen</b><small class="mute" style="display:block;margin:6px 0 10px">Nur für Rift+: Neue Funktionen kommen zuerst hierher, bevor alle sie bekommen. Mit Early Access bekommst du sie automatisch.</small>
      <label class="row"><input type="checkbox" id="ptEA" ${S.settings.earlyAccess ? 'checked' : ''} style="min-width:0"> Early Access aktivieren</label>
      <ul class="plusperks" style="margin-top:12px"><li><b>Bald</b> Neue Emotes &amp; Auren eine Woche früher</li><li><b>Bald</b> Neue Mod-Funktionen im Spiel zuerst testen</li><li><b>Bald</b> Exklusive Rift+ Widgets im Spiel-Menü</li></ul></div></div>`;
  const grid = $('#ptGrid');
  all.forEach((it, i) => { const t = itemTile(it, { locked: !it.owned }); t.classList.add('pt'); t.insertAdjacentHTML('beforeend', `<small class="mute">${MN[i]}${it.owned ? ' · ✓' : i > mon ? ' · kommt noch' : ' · verpasst'}</small>`); grid.append(t); });
  const shop = await api('plus:shop'); const ag = $('#ptAnim');
  shop.forEach((it) => { const t = itemTile(it, { locked: !it.owned, extra: it.owned ? '<span class="tag">Gekauft ✓</span>' : `<span class="tag"><span class="coin"></span> ${Math.ceil(it.price * 0.8)}</span>` }); if (!it.owned) t.onclick = guard(async () => { const ok = await buyFlow({ name: it.name, sub: 'Animiertes Cape · Rift+', price: Math.ceil(it.price * 0.8), preview: RT.front(it), run: async () => { S = await api('plus:buy', it.id); renderChrome(); } }); if (ok) renderPlusTab(); }); ag.append(t); });
  $('#ptCols').querySelectorAll('.sw2').forEach((b) => (b.onclick = guard(async () => { S = await api('plus:color', b.dataset.c); publishCosmetics(); applyPlusColor(); renderPlusTab(); })));
  if ($('#ptClaim')) $('#ptClaim').onclick = guard(async () => { const r = await api('plus:claim'); S = r.state; renderChrome(); toast('Neu: ' + r.item.name); renderPlusTab(); });
  $('#ptEA').onchange = guard(async () => { S = await api('settings:save', { earlyAccess: $('#ptEA').checked }); });
}

/* ---- Katalog fuer die Cosmetics-Auswahl im Spiel ---- */
let catSig = '';
async function syncCatalog() {
  try {
    const sig = S.owned.join(',') + '|' + (S.customCapes || []).map((c) => c.id).join(',');
    if (sig === catSig) return; catSig = sig;
    const out = [];
    for (const it of S.items) {
      if (!['cape', 'nametag', 'aura', 'pet', 'badge'].includes(it.type) || !S.owned.includes(it.id)) continue;
      const e = { id: it.id, type: it.type, name: it.name, rarity: it.rarity };
      if (it.type === 'nametag' && it.style) e.nametag = { kind: it.style.kind, colors: it.style.colors || [], fx: it.style.fx || [] };
      if (it.type === 'aura') e.aura = it.aura; if (it.type === 'pet') e.pet = it.pet; if (it.type === 'badge') e.badge = it.badge;
      if (it.type === 'cape') { e.capePng = RT.dataUrl(it); if (it.anim) e.capeFrames = RT.frames(it, 8, 0.25); }
      out.push(e);
    }
    for (const cc of S.customCapes || []) out.push({ id: 'custom:' + cc.id, type: 'cape', name: cc.name || 'Eigenes Cape', rarity: 'common', capePng: cc.data });
    await api('catalog:save', out);
  } catch {}
}
