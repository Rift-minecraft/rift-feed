/* Zusätzliche Animationen: Partikel-Hintergrund, Ripple, Tilt, Münzen-Zähler */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  /* 1) Partikel hinter dem Inhalt */
  const cv = document.createElement('canvas'); cv.id = 'bgfx'; document.body.prepend(cv); const x = cv.getContext('2d');
  let W = 0, H = 0, P = [];
  const place = () => { const c = document.getElementById('content'); if (!c) return; const r = c.getBoundingClientRect(); cv.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`; W = cv.width = r.width; H = cv.height = r.height; P = Array.from({ length: Math.round(W * H / 11000) }, () => mk(true)); };
  const mk = (rand) => ({ x: Math.random() * W, y: rand ? Math.random() * H : H + 10, r: 1 + Math.random() * 2.2, v: 0.1 + Math.random() * 0.35, p: Math.random() * 6.28, s: 0.5 + Math.random() * 1.5 });
  addEventListener('resize', place); setTimeout(place, 300);
  let last = 0;
  const loop = (ts) => {
    requestAnimationFrame(loop); if (document.hidden || ts - last < 33) return; last = ts;
    if (!(typeof S !== 'undefined' && S && S.settings && S.settings.fxBg)) { if (P.length) { P = []; x.clearRect(0, 0, W, H); } cv.style.display = 'none'; return; } if (!P.length) place(); cv.style.display = '';
    const hw = typeof S !== 'undefined' && S && S.events && S.events.halloween && S.events.halloween.active;
    x.clearRect(0, 0, W, H);
    for (const q of P) {
      q.y -= q.v; q.x += Math.sin(ts / 2000 * q.s + q.p) * 0.25; if (q.y < -10) Object.assign(q, mk(false));
      const a = (0.2 + 0.3 * (0.5 + 0.5 * Math.sin(ts / 700 * q.s + q.p))); x.globalAlpha = a;
      x.fillStyle = hw ? '#fb923c' : '#ffffff'; x.beginPath(); x.arc(q.x, q.y, q.r, 0, 6.283); x.fill();
    }
    x.globalAlpha = 1;
  };
  requestAnimationFrame(loop);

  /* 2) Ripple bei Klicks */
  document.addEventListener('pointerdown', (e) => {
    if (!document.body.classList.contains('fxmo')) return; const t = e.target.closest('.b,.tab,.pill.btn'); if (!t) return;
    const r = t.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement('span');
    s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    t.append(s); setTimeout(() => s.remove(), 650);
  }, true);

  /* 3) 3D-Tilt für Kacheln */
  let cur = null;
  const reset = (el) => { if (el) { el.style.transform = ''; el.style.transition = ''; } };
  document.addEventListener('pointermove', (e) => {
    if (!document.body.classList.contains('fxmo')) return;
    const t = e.target.closest && e.target.closest('.item,.crate,.hws,.hwt2 .hwcard');
    if (cur && cur !== t) { reset(cur); cur = null; }
    if (!t) return; cur = t;
    const r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    t.style.transition = 'transform .08s'; t.style.transform = `perspective(700px) rotateX(${(-py * 9).toFixed(2)}deg) rotateY(${(px * 11).toFixed(2)}deg) translateY(-6px) scale(1.03)`;
  });
  document.addEventListener('pointerleave', () => { reset(cur); cur = null; }, true);

  /* 4) Münzen-Zähler zählt hoch/runter */
  const cc = document.getElementById('coinCount');
  if (cc) { let shown = +cc.textContent || 0, busy = false;
    new MutationObserver(() => {
      if (busy) return; const to = +cc.textContent; if (Number.isNaN(to) || to === shown) return;
      const from = shown, t0 = performance.now(); busy = true;
      const step = (n) => { const k = Math.min(1, (n - t0) / 700), e = 1 - Math.pow(1 - k, 3); cc.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); else { cc.textContent = to; shown = to; busy = false; } };
      requestAnimationFrame(step);
    }).observe(cc, { childList: true, characterData: true, subtree: true });
  }
})();
