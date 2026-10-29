/* Einrichtung (Willkommen · Sprache · Design · Microsoft-Login · Fertig) – ersetzt den alten Login-Bildschirm */
const WZ = {
  de: {
    hello: 'WILLKOMMEN', sub: 'Dein Minecraft-Launcher. In einer Minute eingerichtet.', go: 'Los geht’s',
    langT: 'Sprache wählen', langS: 'Du kannst das später in den Einstellungen ändern.',
    styleT: 'Mach ihn zu deinem', styleS: 'Akzentfarbe und Hintergrund', accent: 'Akzent', bg: 'Hintergrund', black: 'Schwarz', graphite: 'Graphit',
    anim: 'Start-Animation (Beta)', animS: 'Rift öffnet sich, wenn Minecraft startet', prev: 'Vorschau',
    msT: 'Anmelden', msS: 'Melde dich mit deinem Microsoft-Account an. Dafür brauchst du Minecraft: Java Edition.', ms: 'Mit Microsoft anmelden', wait: 'Warte auf Anmeldefenster…',
    next: 'Weiter', back: 'Zurück', done: 'Willkommen,', ready: 'Alles bereit.'
  },
  en: {
    hello: 'WELCOME', sub: 'Your Minecraft launcher. Set up in a minute.', go: 'Let’s go',
    langT: 'Choose your language', langS: 'You can change this later in Settings.',
    styleT: 'Make it yours', styleS: 'Accent colour and background', accent: 'Accent', bg: 'Background', black: 'Black', graphite: 'Graphite',
    anim: 'Launch animation (beta)', animS: 'Rift opens up when Minecraft starts', prev: 'Preview',
    msT: 'Sign in', msS: 'Sign in with your Microsoft account. You need Minecraft: Java Edition.', ms: 'Sign in with Microsoft', wait: 'Waiting for sign-in window…',
    next: 'Next', back: 'Back', done: 'Welcome,', ready: 'All set.'
  }
};
const STAR_PATH = 'M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z';

function renderSetup() {
  document.body.classList.add('locked');
  const el = $('#login'); el.classList.remove('hidden'); el.classList.add('wiz'); el.classList.remove('burst');
  const t = () => WZ[S.settings.lang === 'en' ? 'en' : 'de'];
  const known = !!S.settings.setupDone;                       // Einrichtung schon einmal gemacht: nur Login zeigen
  let step = known ? 3 : 0; const STEPS = 4;
  if (!known) { try { const sv = +localStorage.getItem('wzStep'); if (sv >= 1 && sv <= 3) step = sv; } catch {} }   // genau dort weitermachen, wo du aufgehoert hast
  el.innerHTML = `<canvas class="wz-bg"></canvas><div class="mwin"><button data-win="min">–</button><button data-win="close">✕</button></div><div class="wz-card" id="wzc"></div><div class="wz-dots" id="wzd"></div>`;

  /* Hintergrund: treibende Sterne in der Akzentfarbe */
  const cv = el.querySelector('canvas'), x = cv.getContext('2d'); let W = 0, H = 0, raf = 0;
  const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 2 + Math.random() * 7, v: 0.00004 + Math.random() * 0.00012, p: Math.random() * 6.28 }));
  const size = () => { const d = devicePixelRatio || 1; W = cv.width = el.clientWidth * d; H = cv.height = el.clientHeight * d; };
  size(); window.addEventListener('resize', size);
  const loop = (ts) => {
    if (!el.classList.contains('wiz')) { window.removeEventListener('resize', size); return; }
    const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#fff';
    x.clearRect(0, 0, W, H); x.fillStyle = acc;
    for (const s of stars) {
      s.y -= s.v * 16; if (s.y < -0.05) { s.y = 1.05; s.x = Math.random(); }
      const a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(ts / 900 + s.p)), r = s.s * (devicePixelRatio || 1), cx = s.x * W, cy = s.y * H;
      x.globalAlpha = a; x.beginPath(); x.moveTo(cx, cy - r); x.quadraticCurveTo(cx, cy, cx + r, cy); x.quadraticCurveTo(cx, cy, cx, cy + r); x.quadraticCurveTo(cx, cy, cx - r, cy); x.quadraticCurveTo(cx, cy, cx, cy - r); x.fill();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const dots = () => { $('#wzd').innerHTML = known ? '' : Array.from({ length: STEPS }, (_, i) => `<i class="${i === step ? 'on' : i < step ? 'past' : ''}"></i>`).join(''); };
  const nav = (back, next) => `<div class="wz-nav">${back ? `<button class="b" id="wzBack">${t().back}</button>` : '<span></span>'}${next ? `<button class="b primary" id="wzNext">${next}</button>` : ''}</div>`;
  const show = (n, dir = 1) => {
    const c = $('#wzc'); c.className = 'wz-card out'; c.style.setProperty('--dir', dir);
    setTimeout(() => { step = n; try { localStorage.setItem('wzStep', String(n)); } catch {} draw(); c.className = 'wz-card in'; dots(); }, c.innerHTML ? 220 : 0);
  };
  const star = (cls = '') => `<svg class="wz-star ${cls}" viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg>`;

  function draw() {
    const c = $('#wzc'), T = t();
    if (step === 0) {
      c.innerHTML = `<div class="wz-hero">${star('big')}<span class="ring r1"></span><span class="ring r2"></span></div>
        <h1 class="wz-title">${[...T.hello].map((ch, i) => `<span style="animation-delay:${0.5 + i * 0.07}s">${ch}</span>`).join('')}</h1>
        <p class="wz-p fade" style="animation-delay:1.3s">${T.sub}</p>
        <div class="fade" style="animation-delay:1.6s"><button class="b primary big" id="wzNext">${T.go}</button></div>`;
      $('#wzNext').onclick = () => show(1);
    } else if (step === 1) {
      c.innerHTML = `<h2 class="wz-h">${T.langT}</h2><p class="wz-p">${T.langS}</p>
        <div class="wz-langs">${[['de', 'DE', 'Deutsch'], ['en', 'EN', 'English']].map(([k, a, n], i) => `<button class="wz-lang ${S.settings.lang === k ? 'on' : ''}" data-l="${k}" style="animation-delay:${0.1 + i * 0.1}s"><b>${a}</b><span>${n}</span></button>`).join('')}</div>${nav(false, T.next)}`;
      c.querySelectorAll('.wz-lang').forEach((b) => (b.onclick = async () => { S = await api('settings:save', { lang: b.dataset.l }); applyStyle(); draw(); c.querySelectorAll('.wz-lang').forEach((e) => e.classList.add('stay')); }));
      $('#wzNext').onclick = () => show(2);
    } else if (step === 2) {
      c.innerHTML = `<h2 class="wz-h">${T.styleT}</h2><p class="wz-p">${T.styleS}</p>
        <div class="wz-sec">${T.accent}</div><div class="swatches2 wz-sw">${Object.entries(ACCENTS).map(([k, col], i) => `<button class="sw2 ${S.settings.accent === k ? 'on' : ''}" data-acc="${k}" style="background:${col};animation-delay:${0.05 + i * 0.06}s"></button>`).join('')}</div>
        <div class="wz-sec">${T.bg}</div><div class="row" style="justify-content:center">${[['black', T.black], ['graphite', T.graphite]].map(([k, n]) => `<button class="b ${S.settings.bg === k ? 'primary' : ''}" data-bg="${k}">${n}</button>`).join('')}</div>
        <label class="wz-opt"><input type="checkbox" id="wzAnim" ${S.settings.launchAnim ? 'checked' : ''}><span><b>${T.anim}</b><small>${T.animS}</small></span><button class="b" id="wzPrev" type="button">${T.prev}</button></label>${nav(true, T.next)}`;
      const st = async (patch) => { S = await api('settings:save', patch); applyStyle(); draw(); };
      c.querySelectorAll('[data-acc]').forEach((b) => (b.onclick = () => st({ accent: b.dataset.acc })));
      c.querySelectorAll('[data-bg]').forEach((b) => (b.onclick = () => st({ bg: b.dataset.bg })));
      $('#wzAnim').onchange = async () => { S = await api('settings:save', { launchAnim: $('#wzAnim').checked }); };
      $('#wzPrev').onclick = () => playLaunchAnimation(true, null);
      $('#wzBack').onclick = () => show(1, -1); $('#wzNext').onclick = () => show(3);
    } else {
      c.innerHTML = `<div class="wz-hero small">${star('big')}</div><h2 class="wz-h">${T.msT}</h2><p class="wz-p">${T.msS}</p>
        <button class="msbtn" id="msBtn"><span class="mslogo"><i style="background:#f25022"></i><i style="background:#7fba00"></i><i style="background:#00a4ef"></i><i style="background:#ffb900"></i></span><span id="msTxt">${T.ms}</span></button>${known ? '' : nav(true, '')}`;
      if (!known) $('#wzBack').onclick = () => show(2, -1);
      $('#msBtn').onclick = async () => {
        const b = $('#msBtn'); b.disabled = true; $('#msTxt').textContent = T.wait;
        try {
          S = await api('auth:microsoft'); await loadAccountProfile();
          S = await api('settings:save', { setupDone: true });
          finish();
        } catch (e) { toast(e.message, true); b.disabled = false; $('#msTxt').textContent = T.ms; }
      };
    }
    I18N.apply?.(c);
  }

  function finish() {
    const T = t(), c = $('#wzc'); $('#wzd').innerHTML = '';
    c.className = 'wz-card in';
    c.innerHTML = `<div class="wz-hero">${star('big')}<span class="ring r1"></span><span class="ring r2"></span></div>
      <img class="wz-head" src="https://mc-heads.net/avatar/${esc(S.account.uuid)}/64" alt="" onerror="this.style.display='none'">
      <h1 class="wz-title small">${esc(T.done)} ${esc(S.account.name)}</h1><p class="wz-p fade" style="animation-delay:.5s">${T.ready}</p>`;
    renderChrome();
    setTimeout(() => el.classList.add('burst'), 1500);
    setTimeout(() => { el.classList.add('hidden'); el.classList.remove('wiz', 'burst'); cancelAnimationFrame(raf); el.innerHTML = ''; go('play'); }, 2500);
  }

  draw(); $('#wzc').className = 'wz-card in'; dots();
}
