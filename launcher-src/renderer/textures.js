/* Prozedural erzeugte Cape- und Skin-Texturen für den Rift-Shop */
const RT = (() => {
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };

  /* Cape-Pixel: u,v = Position auf der Vorderseite (0..9, 0..15), t = Zeit in Sekunden (nur für animierte Capes) */
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const mix = (A, B, k) => lerp(A, B, Math.max(0, Math.min(1, k)));
  const ramp = (stops, k) => { k = Math.max(0, Math.min(1, k)) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(k)); return lerp(stops[i], stops[i + 1], k - i); };
  function capePx(item, u, v, t) {
    const A = hex(item.colors[0]), B = hex(item.colors[1]);
    switch (item.pattern) {
      case 'stripes': return ((u + v) >> 1) % 2 ? A : B;
      case 'dots': return (u % 3 === 1 && v % 3 === 1) ? lerp(A, [255, 255, 255], .5) : lerp(A, B, v / 16);
      case 'checker': return ((u >> 1) + (v >> 1)) % 2 ? A : B;
      case 'rift': { let col = lerp(A, B, v / 16); const edge = u === 0 || u === 9 || v === 0 || v === 15; const bolt = Math.abs(u - (4 + ((v * 3) % 5) - 2)) < 1;
        if (edge) col = lerp(col, [255, 255, 255], .45); if (bolt) col = [255, 255, 255]; return col; }
      case 'sunset': { const d = Math.hypot(u - 4.5, v - 9); return d < 3 ? [255, 236, 170] : ramp([[251, 146, 60], [236, 72, 153], A.map((x, i) => (x + B[i]) >> 1), B], v / 16); }
      case 'scales': { const o = (v & 1) ? 1 : 0; const uu = (u + o) % 3, vv = v % 2; const edge = uu === 0 || vv === 1; return edge ? B : lerp(A, [190, 255, 190], (v % 4) / 8); }
      case 'wave': { const w = Math.sin(u * 0.7 + t * 2.2 + v * 0.35) * 1.6; const k = (v + w) / 16; const crest = Math.sin(u * 0.7 + t * 2.2 + v * 0.35) > 0.85; return crest ? [200, 240, 255] : mix(A, B, k); }
      case 'neon': { const h = (t * 0.35 + (u + v) / 24) % 1; const c = ramp([A, B, A], h < .5 ? h * 2 : 1 - (h - .5) * 2); const edge = u === 0 || u === 9 || v === 0 || v === 15; const pulse = 0.5 + 0.5 * Math.sin(t * 4); return edge ? mix(c, [255, 255, 255], 0.5 + 0.4 * pulse) : mix([12, 10, 30], c, 0.35 + 0.35 * Math.sin(t * 3 + v * 0.5)); }
      case 'embers': { const f = Math.sin(u * 1.1 + t * 3 - v * 0.6) * 0.5 + 0.5; const spark = hash(u, Math.floor(v + t * 4) % 16) > 0.93; return spark ? [255, 220, 120] : mix(B, A, f * (v / 16) * 1.3); }
      case 'aurora': { const k = Math.sin(u * 0.55 + t * 1.3 + Math.sin(v * 0.4 + t * 0.8) * 2) * 0.5 + 0.5; const band = ramp([A, [56, 189, 248], B, [232, 121, 249]], (k + v / 40 + t * 0.05) % 1); return mix([8, 10, 28], band, 0.35 + 0.65 * (1 - v / 20) * (0.6 + 0.4 * k)); }
      case 'void': { const neb = Math.sin(u * 0.4 + t * 0.6) * Math.cos(v * 0.35 - t * 0.5) * 0.5 + 0.5; let c = mix(A, [88, 28, 135], neb * 0.7); const s = hash(u, v); if (s > 0.9) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + s * 40); c = mix(c, B, tw); } return c; }
      case 'matrix': { const sp = 3 + hash(u, 1) * 6, off = hash(u, 7) * 20, head = (t * sp + off) % 26; const d = head - v; if (d < 0 || d > 9) return mix([2, 20, 12], [4, 40, 24], hash(u, v)); return d < 1 ? [220, 255, 230] : mix(B, [2, 40, 20], d / 9); }
      case 'inferno': { const n = Math.sin(u * 1.3 + t * 5 - v * 0.9) * 0.5 + Math.sin(u * 0.7 - t * 4 + v * 0.5) * 0.3 + 0.5; const h = (v / 16) * 0.9 + (1 - n) * 0.25 - 0.1; return ramp([[69, 10, 10], [185, 28, 28], [249, 115, 22], [253, 224, 71], [255, 255, 255]], 1 - h); }
      case 'shimmer': { const band = Math.max(0, 1 - Math.abs(((u + v) * 0.5 - ((t * 5) % 24) + 4)) / 3); return mix(lerp(A, B, v / 16), [255, 255, 255], band * 0.45 + (hash(u, v) > .96 ? .15 : 0)); }
      case 'carbon': { const w = ((u + (v >> 1)) & 1) ^ (v & 1); return mix(A, B, w ? .8 : .25 + hash(u, v) * .15); }
      case 'leaves': { const n = hash(u >> 1, v >> 1); const lf = n > .72; return lf ? mix(A, [190, 255, 140], (v % 3) / 4) : mix(B, A, v / 24 + n * .3); }
      case 'ripple': { const d = Math.hypot(u - 4.5, v - 7) * 1.1 - t * 2.6; const k = Math.sin(d) * .5 + .5; return mix(lerp(B, A, v / 16), [220, 245, 255], k > .85 ? .6 : k * .15); }
      case 'diamond': { const d = Math.abs(((u % 6) - 2.5)) + Math.abs(((v % 6) - 2.5)); const edge = Math.abs(d - 3) < .6; const mid = d < 1.1; return edge ? [255, 226, 140] : mid ? mix(A, [255, 255, 255], .45) : mix(A, B, d / 6); }
      case 'stars': { const sky = ramp([B, A, [8, 6, 30]], v / 16 * .9 + .05 + Math.sin(t * .5 + u) * .02); const s = hash(u * 3, v * 7); if (s > .86) { const tw = .5 + .5 * Math.sin(t * 3 + s * 60); return mix(sky, [255, 255, 255], tw); } return sky; }
      case 'plasma': { const k = (Math.sin(u * .6 + t * 1.6) + Math.sin(v * .5 - t * 1.2) + Math.sin((u + v) * .4 + t * 2) + 3) / 6; return mix(A, B, k); }
      case 'lightning': { const base = lerp(B, A, v / 16 * .8); const ph = Math.floor(t * 2.4), on = (t * 2.4 - ph) < .28; const bx = 4 + Math.round(Math.sin(v * 1.3 + ph * 7) * 2); const bolt = Math.abs(u - bx) < 1 && hash(ph, 3) > .35; const edge = u === 0 || u === 9 || v === 0 || v === 15; return bolt && on ? [255, 255, 255] : mix(base, [255, 255, 255], (edge ? .35 : 0) + (on ? .08 : 0)); }
      case 'gold': { const band = Math.max(0, 1 - Math.abs(((u * .8 + v) - ((t * 7) % 30) + 5)) / 3.5); const base = ramp([A, B, A], ((u + v) % 8) / 8); return mix(base, [255, 250, 210], band * .7); }
      case 'prism': { const h = ((u + v) / 26 + t * .25) % 1; const rb = ramp([[244, 114, 182], [250, 204, 21], [74, 222, 128], [34, 211, 238], [167, 139, 250], [244, 114, 182]], h); const edge = u === 0 || u === 9 || v === 0 || v === 15; return mix(rb, [255, 255, 255], edge ? .5 : hash(u, v + Math.floor(t * 3)) > .95 ? .6 : 0); }
      default: return lerp(A, B, v / 16);
    }
  }
  function cape(item, t = 0) {
    const [c, x] = mk(64, 32);
    for (let py = 0; py < 32; py++) for (let px = 0; px < 64; px++) {
      const u = (px % 22) - 1, v = (py % 17) - 1;
      const col = capePx(item, Math.max(0, Math.min(9, u)), Math.max(0, Math.min(15, v)), t);
      x.fillStyle = css(col); x.fillRect(px, py, 1, 1);
    }
    return c;
  }

  function skin(item) {
    const [c, x] = mk(64, 64);
    const [main, dark, tone] = item.colors;
    const R = (col, ...r) => { x.fillStyle = col; x.fillRect(...r); };
    R(tone, 0, 0, 32, 16);                    // Kopf
    R(dark, 0, 0, 32, 8); R(dark, 0, 8, 32, 3); R(dark, 24, 8, 8, 8);   // Haare
    R('#ffffff', 9, 12, 2, 1); R('#ffffff', 13, 12, 2, 1);
    R(main, 10, 12, 1, 1); R(main, 13, 12, 1, 1);
    R('#00000033', 11, 14, 2, 1);
    R(main, 16, 16, 24, 16); R(dark, 16, 29, 24, 1);                    // Torso
    for (const [ax, ay] of [[40, 16], [32, 48]]) { R(main, ax, ay, 16, 16); R(tone, ax, ay + 13, 16, 3); }  // Arme
    R(dark, 0, 16, 16, 16); R(dark, 16, 48, 16, 16);                    // Beine
    R(main, 0, 29, 16, 3); R(main, 16, 61, 16, 3);                      // Stiefel
    return c;
  }

  /* Vorderansicht für Kacheln */
  const animSet = new Set(); let animOn = false, lastT = 0;
  function animTick(ts) {
    if (ts - lastT >= 45) { lastT = ts; for (const a of animSet) { if (!a.c.isConnected && ts - a.t0 > 4000) { animSet.delete(a); continue; } a.draw(ts / 1000); } }
    if (animSet.size) requestAnimationFrame(animTick); else animOn = false;
  }
  function capeFront(item) {
    const [c, x] = mk(10, 16);
    const draw = (t) => { const img = x.createImageData(10, 16); for (let v = 0; v < 16; v++) for (let u = 0; u < 10; u++) { const p = capePx(item, u, v, t), i = (v * 10 + u) * 4; img.data[i] = p[0]; img.data[i + 1] = p[1]; img.data[i + 2] = p[2]; img.data[i + 3] = 255; } x.putImageData(img, 0, 0); };
    draw(0);
    if (item.anim) { animSet.add({ c, draw, t0: performance.now() }); if (!animOn) { animOn = true; requestAnimationFrame(animTick); } }
    return c;
  }
  function skinFront(item) {
    const src = skin(item); const [c, x] = mk(16, 32);
    x.drawImage(src, 8, 8, 8, 8, 4, 0, 8, 8);
    x.drawImage(src, 20, 20, 8, 12, 4, 8, 8, 12);
    x.drawImage(src, 44, 20, 4, 12, 0, 8, 4, 12);
    x.drawImage(src, 44, 20, 4, 12, 12, 8, 4, 12);
    x.drawImage(src, 4, 20, 4, 12, 4, 20, 4, 12);
    x.drawImage(src, 4, 20, 4, 12, 8, 20, 4, 12);
    return c;
  }
  /* ---------- Schulter-Begleiter (Pixel-Sprites 10x10) ---------- */
  const PETS = {
    fox: { pal: { O: '#f97316', W: '#fff7ed', K: '#111827', D: '#9a3412' }, rows: ['.O......O.', '.OO....OO.', '.OOOOOOOO.', '.OKOOOOKO.', '.OOWWWWOO.', '..OWWKWO..', '.OOOOOOOOD', '.OOOOOOOOD', '.OO.OO..D.', '.OO.OO....'] },
    panda: { pal: { W: '#f8fafc', K: '#111827' }, rows: ['.KK....KK.', '.KKWWWWKK.', '.WWWWWWWW.', '.WKKWWKKW.', '.WKKWWKKW.', '.WWWKKWWW.', '..WWWWWW..', '.KKWWWWKK.', '.KKWWWWKK.', '..KK..KK..'] },
    owl: { pal: { B: '#92400e', L: '#fde68a', Y: '#facc15', K: '#111827', O: '#f97316' }, rows: ['.B......B.', '.BB....BB.', '.BBBBBBBB.', 'BLYKBBKYLB', 'BLLLBBLLLB', '.BBBOOBBB.', '.BLLLLLLB.', '.BLBLLBLB.', '..BBBBBB..', '..OO..OO..'] },
    bunny: { pal: { W: '#f8fafc', P: '#fda4af', K: '#111827' }, rows: ['..W....W..', '..WP..PW..', '..WP..PW..', '..WWWWWW..', '.WWKWWKWW.', '.WWWPPWWW.', '..WWWWWW..', '.WWWWWWWW.', '.WW.WW.WW.', '..........'] },
    penguin: { pal: { K: '#1e293b', W: '#f8fafc', O: '#f59e0b' }, rows: ['...KKKK...', '..KKKKKK..', '..KWKKWK..', '..KKOOKK..', '.KKWWWWKK.', '.KKWWWWKK.', '.KKWWWWKK.', '..KWWWWK..', '..OO..OO..', '..........'] },
    bee: { pal: { Y: '#facc15', K: '#111827', W: '#e0f2fe' }, rows: ['..K....K..', '.WK....KW.', 'WWYYYYYYWW', '.YYKYYKYY.', '.YYYYYYYY.', '.KKKKKKKK.', '.YYYYYYYY.', '.KKKKKKKK.', '..YYYYYY..', '...KKKK...'] },
    axolotl: { pal: { P: '#fbcfe8', R: '#f43f5e', K: '#111827', D: '#f9a8d4' }, rows: ['R.R....R.R', '.PPPPPPPP.', 'RPKPPPPKPR', '.PPPPPPPP.', '.PPPDDPPP.', '..PPPPPP..', '.PPPPPPPPD', '.PPPPPPPPD', '.PP.PP..D.', '.PP.PP....'] },
    wolf: { pal: { G: '#94a3b8', W: '#f1f5f9', K: '#111827', D: '#475569' }, rows: ['.G......G.', '.GG....GG.', '.GGGGGGGG.', '.GKGGGGKG.', '.GGGWWGGG.', '..GWWKWG..', '.GGGGGGGG.', '.GGGGGGGGD', '.GG.GG..D.', '.GG.GG....'] },
    cat: { pal: { O: '#f59e0b', D: '#b45309', P: '#fda4af', K: '#111827' }, rows: ['..O....O..', '..OO..OO..', '.OOOOOOOO.', '.OKOOOOKO.', '.OOOPPOOO.', '..OOOOOO..', '.OOOOOOOOD', '.OOOOOOOOD', '.OO.OO..D.', '.OO.OO....'] },
    slime: { pal: { G: '#4ade80', D: '#15803d', K: '#052e16', W: '#dcfce7' }, rows: ['..........', '...GGGG...', '..GGGGGG..', '.GGWGGGGG.', '.GKGGGKGG.', '.GGGGGGGG.', '.GGGDDGGG.', '.GGGGGGGG.', '..GGGGGG..', '..........'] },
    parrot: { pal: { R: '#d62828', D: '#9b1c1c', B: '#2563eb', Y: '#facc15', K: '#111827', W: '#ffffff', G: '#9ca3af' }, rows: ['...RRR....', '..RRRRR...', '..RKWRGG..', '..RRRRGG..', '..RRRRR...', '.BBRRRRD..', '.BBBRRRD..', '.YBBRRDD..', '...G..G...', '..GG.GG...'] },
    robot: { pal: { S: '#cbd5e1', D: '#64748b', E: '#22d3ee' }, rows: ['....DD....', '....SS....', '.SSSSSSSS.', '.SEESSEES.', '.SEESSEES.', '.SSSSSSSS.', '..SSSSSS..', '.DSSSSSSD.', '..SS..SS..', '..DD..DD..'] },
    ghost: { pal: { W: '#f8fafc', K: '#111827' }, rows: ['...WWWW...', '..WWWWWW..', '.WWWWWWWW.', '.WWKWWKWW.', '.WWKWWKWW.', '.WWWWWWWW.', '.WWWKKWWW.', '.WWWWWWWW.', '.WW.WW.WW.', '.W..WW..W.'] },
    pumpkin: { pal: { O: '#f97316', D: '#c2410c', G: '#16a34a', K: '#111827', Y: '#fde047' }, rows: ['....GG....', '....G.....', '..OOOOOO..', '.OOOOOOOO.', '.OKOOOOKO.', '.OOOYYOOO.', '.OKOOOOKO.', '.OOKKKKOO.', '..OOOOOO..', '...DDDD...'] },
    phoenix: { pal: { R: '#ef4444', O: '#f97316', Y: '#fde047', K: '#111827', W: '#ffffff' }, rows: ['.Y......Y.', '.OY....YO.', '.OOR..ROO.', '.OOORROOO.', 'OOORKWRROO', 'OOORRRYYOO', '.OORRRYY..', '..ORRRR...', '..Y.RR.Y..', '.Y..YY..Y.'] },
    dragon: { pal: { P: '#a855f7', D: '#6b21a8', Y: '#fde68a', E: '#fde047', K: '#111827' }, rows: ['.D......D.', '.DP....PD.', '..PPPPPP..', '.PPEPPEPP.', '.PPPPPPPPP', '..PPPPPP..', 'DPPPYYPPPD', '.DPPYYPPD.', '..PP..PP..', '..DD..DD..'] }
  };
  function petSprite(item) {
    const def = PETS[item.pet] || PETS.ghost; const [c, x] = mk(10, 10);
    def.rows.forEach((row, y) => [...row].forEach((ch, px) => { if (ch !== '.') { x.fillStyle = def.pal[ch]; x.fillRect(px, y, 1, 1); } }));
    return c;
  }

  /* ---------- Nametag-Farben ---------- */
  function nametagCss(item) {
    const st = item?.style; if (!st) return { style: '', cls: '' };
    const c = st.colors;
    switch (st.kind) {
      case 'solid': return fx({ style: `color:${c[0]}`, cls: '' });
      case 'gradient': return fx({ style: `background:linear-gradient(90deg,${c.join(',')});-webkit-background-clip:text;background-clip:text;color:transparent`, cls: '' });
      case 'glow': return fx({ style: `color:${c[0]};text-shadow:0 0 6px ${c[0]},0 0 16px ${c[0]}`, cls: '' });
      case 'rainbow': return fx({ style: '', cls: 'nt-rainbow' });
      case 'chrome': return fx({ style: '', cls: 'nt-chrome' });
    }
    return { style: '', cls: '' };
    function fx(o) { for (const f of st.fx || []) o.cls += ' fx-' + f; o.cls = o.cls.trim(); return o; }
  }
  /* ---------- Badges & Aura-Icons (24x24 Pfade) ---------- */
  const ICONS = {
    bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
    heart: 'M12 21s-8-5.300-8-11a4.500 4.500 0 0 1 8-2.700A4.500 4.500 0 0 1 20 10c0 5.700-8 11-8 11z',
    star: 'M12 2l3 6.900 7.500.7-5.700 5 1.700 7.400L12 18l-6.500 4 1.700-7.400-5.700-5 7.500-.7z',
    skull: 'M12 2a8 8 0 0 0-8 8c0 2.800 1.400 4.600 3 5.700V19a1 1 0 0 0 1 1h1v2h2v-2h2v2h2v-2h1a1 1 0 0 0 1-1v-3.300c1.600-1.100 3-2.900 3-5.700a8 8 0 0 0-8-8zM8.500 10.500a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
    diamond: 'M6 3h12l4 6-10 13L2 9zm1.200 2L4.800 8.500h4.100L10 5zm5.800 0 1 3.500h4.200L16.800 5zM12 7.800 10.600 8.500 12 18.500l1.400-10z',
    crown: 'M3 18h18v2H3zM3 8l4.500 4L12 5l4.500 7L21 8l-2 8H5z',
    bat: 'M12 7c-1 0-1.500 1-2 1.800C8.500 7.500 6 6.500 2 8c1.500 1 2 2.500 1.800 4 1-.7 2.200-.8 3.200-.2.500 1 1.500 1.800 2.500 2L12 18l2.500-4.400c1-.2 2-1 2.500-2 1-.6 2.200-.5 3.200.2C20 10.500 20.500 9 22 8c-4-1.500-6.500-.5-8 .8C13.500 8 13 7 12 7z',
    snow: 'M11 2h2v20h-2zM2 11h20v2H2zM4.900 6.300l1.400-1.400 14.800 14.800-1.400 1.400zM4.900 17.700 19.700 4.900l1.400 1.400L6.300 19.100z',
    sparks: 'M12 1l2.200 8.800L23 12l-8.800 2.200L12 23l-2.200-8.800L1 12l8.800-2.200z',
    flame: 'M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.500 2-4.500C9 11 10 11.500 10.500 12 10 8 11 5 12 2z',
    leaf: 'M20 3C9 3 4 9 4 15c0 1.500.4 2.800 1 3.900C6.500 14.500 9 11.500 13 9.500c-3 3-5 6-5.800 10.100C8.400 20.500 10 21 12 21c6 0 8-7 8-18z',
    shield: 'M12 2 4 5v6c0 5 3.400 9.200 8 11 4.600-1.800 8-6 8-11V5z',
    eye: 'M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    notes: 'M9 3v12.500A3.500 3.500 0 1 0 11 19V8h8V3z',
    moon: 'M20 14.500A8.500 8.500 0 0 1 9.500 4 8.500 8.500 0 1 0 20 14.500z',
    flames: 'M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.500 2-4.500C9 11 10 11.500 10.500 12 10 8 11 5 12 2z'
  };
  const BADGE_COL = { leaf: ['#bbf7d0', '#16a34a'], shield: ['#bfdbfe', '#2563eb'], eye: ['#e9d5ff', '#7e22ce'], moon: ['#e0e7ff', '#6366f1'], flame: ['#fdba74', '#ef4444'], diamond: ['#a5f3fc', '#0891b2'], bolt: ['#fde047', '#f59e0b'], heart: ['#fb7185', '#e11d48'], star: ['#fef08a', '#f59e0b'], skull: ['#f8fafc', '#94a3b8'], crown: ['#fde68a', '#d97706'] };
  const AURA_COL = { leaves: ['#bbf7d0', '#16a34a'], notes: ['#fbcfe8', '#db2777'], void: ['#a78bfa', '#1e1b4b'], embers: ['#fdba74', '#dc2626'], galaxy: ['#c084fc', '#22d3ee'], sparks: ['#fde047', '#f59e0b'], snow: ['#ffffff', '#bae6fd'], stars: ['#fef08a', '#f59e0b'], hearts: ['#fb7185', '#e11d48'], flames: ['#fdba74', '#ef4444'], bats: ['#c084fc', '#581c87'] };
  const ICON_OF = { leaves: 'leaf', void: 'sparks', embers: 'flames', stars: 'star', hearts: 'heart', bats: 'bat', galaxy: 'sparks' };
  function iconCanvas(path, [a, b], size = 64) {
    const [c, x] = mk(size, size); x.imageSmoothingEnabled = true; x.scale(size / 24, size / 24);
    const g = x.createLinearGradient(0, 0, 0, 24); g.addColorStop(0, a); g.addColorStop(1, b);
    x.fillStyle = g; x.fill(new Path2D(path), 'evenodd'); return c;
  }
  /* Rift-Logo (Glitzerstern) vor jedem Nametag – ersetzt die Badges */
  const badgeSvg = (item, px = 22) => `<svg class="badge riftlogo" viewBox="0 0 24 24" width="${px}" height="${px}"><path fill="#fff" d="M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z"/></svg>`;
  const auraGlyph = (kind) => ICONS[ICON_OF[kind] || kind];
  const auraColors = (kind) => AURA_COL[kind];
  function ntPreview(item, text = 'Name') {
    const w = document.createElement('div'); w.className = 'ntwrap';
    const css = nametagCss(item); const n = document.createElement('div');
    n.className = 'ntprev ' + css.cls; n.style.cssText = css.style; n.textContent = text; w.append(n); return w;
  }
  function nametagCanvas(item, text = 'Name') {
    const [c, x] = mk(150, 40); const st = item.style;
    x.font = '800 24px Consolas, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const g = x.createLinearGradient(20, 0, 130, 0);
    if (st.kind === 'rainbow') ['#f43f5e', '#f59e0b', '#84cc16', '#22d3ee', '#a855f7'].forEach((col, i) => g.addColorStop(i / 4, col));
    else if (st.colors.length > 1) st.colors.forEach((col, i) => g.addColorStop(i / (st.colors.length - 1), col));
    else { g.addColorStop(0, st.colors[0]); g.addColorStop(1, st.colors[0]); }
    if (st.kind === 'glow') { x.shadowColor = st.colors[0]; x.shadowBlur = 10; }
    x.fillStyle = g; x.fillText(text, 75, 21);
    return c;
  }

  function petThumb(item) {                                       // echtes 3D-Vorschaubild, sonst 2D-Sprite
    try { if (window.Pets3D?.has(item.pet)) { const im = new Image(); im.src = Pets3D.snapshot(item.pet, 192); im.alt = item.name || ''; return im; } } catch (e) { console.warn('Pet-3D-Vorschau:', e.message); }
    return petSprite(item);
  }
  /* Emote-Vorschau: graue Person mit schwarzer Umrandung, bewegt sich wie im Spiel */
  function emotePose(id, t) {
    const P = { head: [0, 0, 0], body: [0, 0, 0], ra: [0, 0, 0], la: [0, 0, 0], rl: [0, 0, 0], ll: [0, 0, 0] };   // [x, y, z]
    const s8 = Math.sin(t * 8), s5 = Math.sin(t * 5), S = Math.sin;
    switch (id) {
      case 'wave': P.ra = [0, 0, 2.7 + S(t * 10) * .3]; P.head[2] = .1; break;
      case 'dance': P.ra = [-2.9 + s8 * .5, 0, .3]; P.la = [-2.9 - s8 * .5, 0, -.3]; P.body[1] = S(t * 4) * .4; P.head[1] = -P.body[1]; P.rl[0] = s8 * .6; P.ll[0] = -s8 * .6; break;
      case 'bow': { const k = S(Math.min(1, (t % 2.4) / 2.4) * Math.PI); P.body[0] = .9 * k; P.head[0] = .5 * k; P.ra[0] = P.la[0] = .9 * k; break; }
      case 'clap': { const c = Math.abs(S(t * 9)); P.ra = [-1.35, -(.1 + .5 * c), 0]; P.la = [-1.35, .1 + .5 * c, 0]; break; }
      case 'flex': { const p = S(t * 6) * .12; P.ra = [-.3, 0, 1.45 + p]; P.la = [-.3, 0, -1.45 - p]; break; }
      case 'spin': P.ra[2] = .8; P.la[2] = -.8; break;
      case 'victory': P.ra = [-3.0, 0, .2]; P.la = [-.2, 0, -.3]; P.head[0] = -.3; break;
      case 'ghost': P.ra[0] = P.la[0] = -1.5 + S(t * 3) * .15; P.body[0] = .25; break;
      case 'pumpkin': { const p = (t % 1.6) / 1.6; P.ra[0] = p < .6 ? -3.0 * (p / .6) : -3.0 + ((p - .6) / .4) * 2.6; break; }
      case 'sword_surf': P.body[1] = .6; P.head[1] = -.6; P.rl[2] = .25; P.ll[2] = -.25; P.ra[2] = 1.3 + s5 * .1; P.la[2] = -1.3 - s5 * .1; P.body[2] = S(t * 2) * .12; break;
      case 'cauldron': P.ra = [-1.2, S(t * 5) * .5, 0]; P.la = [-1.0, Math.cos(t * 5) * .3, 0]; P.head[0] = .3; break;
    }
    return P;
  }
  /* 3D-Vorschau: weisser Skin mit schwarzer Huelle (Overlay-Layer) und zwei schwarzen Augen-Pixeln, eigener kleiner Software-Renderer */
  const EMOTE_SKIN = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAACZ0lEQVR4Xt3YQW4EIQxE0bn//XKezAZ9hYJqx0aiBU+qDVQjexZZ5PMJ/C7iobqfxaxhkyIeqtOFslnDJkU8VKcLZbOGTYp4qE4XymYNmxTxUJ0ulM0aNinioTpdKJs1bFLEQ3W6UDZr2KSIh+p0oWyeMelLJgPvzUt7Y/vC+gMzyUuGgXbnpb2xfWH9gZnkwexPxeysYhhozF9PZ7UwyUuGgXbnpb2xfWH9gZnkJcNA+9OLfgeKBsUiHjIoGhSreMmgaFAs4iGDokGxipcMigbFIh4yKBoUq3jJoGhQLOIhg6JB8b/40qDYcHEIBneiPSg2XByCwZ1oD4oNF4dgcCfag2LDxSEY3In2oNhwcQgGd6I9KDZcHILBnWgPig0Xh2BwJ9qDYsPFIRjcifag2HBxCAZ3oj0oNlwcgsGdaA+KDReHYHAn2oNiw8UhGDwh+qdERPvZRLSvWaYPaiLazyaifc0yfVAT0X42Ee1rlumDmoj2s4loX5OmD9yW0G0L6z4h/eC2hG5bWPcJ6Qe3JXTbwrpPSD+4LaHbFtZ9QvrBbQndtrDuE9IPbkvotoV1nzR9QPMo+j8JRYOiQdHTeTUh/UDziEkNigZFg6Kn82pC+oHmEZMaFA2KBkVP59WE9APNIyY1KBoUDYqezqsZaCGbDpNuMpknm+Egm86mvTGZJ5vhIJsOk20ymSeb4SCbzqa9MZknm+Egmw6TbTKZJ5vhIJvOpr0xmSeb4SCbDpNtMpknm+Egm86mvTGZJ5vhIJsOk20ymSeb4SCbzqa9MZknm+Egmw6TbTKZJ5vhIJvOpr0xmSeVL3E/LJyjSZIrAAAAAElFTkSuQmCC';
  const emoteTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const o = { c, ready: false }, img = new Image();
    img.onload = () => { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0);
      x.fillStyle = '#fff'; x.fillRect(9, 12, 1, 1); x.fillRect(14, 12, 1, 1);   // alte Augen weg
      x.fillStyle = '#000'; x.fillRect(10, 12, 1, 1); x.fillRect(13, 12, 1, 1);  // neue Augen: enger beieinander
      o.ready = true; };
    img.src = EMOTE_SKIN; return o;
  })();
  // Teile: pivot, Box relativ zum Pivot, Groesse w,h,d, Skin-Ursprung (Basis / Overlay)
  const EPARTS = {
    head: { p: [0, 0, 0], b: [-4, -8, -4, 4, 0, 4], s: [8, 8, 8], uv: [0, 0], ov: [32, 0] }, body: { p: [0, 0, 0], b: [-4, 0, -2, 4, 12, 2], s: [8, 12, 4], uv: [16, 16], ov: [16, 32] },
    ra: { p: [-5, 2, 0], b: [-3, -2, -2, 1, 10, 2], s: [4, 12, 4], uv: [40, 16], ov: [40, 32] }, la: { p: [5, 2, 0], b: [-1, -2, -2, 3, 10, 2], s: [4, 12, 4], uv: [32, 48], ov: [48, 48] },
    rl: { p: [-1.9, 12, 0], b: [-2, 0, -2, 2, 12, 2], s: [4, 12, 4], uv: [0, 16], ov: [0, 32] }, ll: { p: [1.9, 12, 0], b: [-2, 0, -2, 2, 12, 2], s: [4, 12, 4], uv: [16, 48], ov: [0, 48] }
  };
  const ECAPE = { cape: true, p: [0, 0, 2.2], b: [-5, 0, 0, 5, 16, 1], s: [10, 16, 1], uv: [0, 0], ov: [0, 0] };
  const EFACES = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [4, 5, 1, 0], [3, 2, 6, 7]];
  const uvRect = (o, [w, h, d], fi) => [[o[0] + d, o[1] + d, w, h], [o[0] + d + w + d, o[1] + d, w, h], [o[0], o[1] + d, d, h], [o[0] + d + w, o[1] + d, d, h], [o[0] + d, o[1], w, d], [o[0] + d + w, o[1], w, d]][fi];
  function rotMat(x, y, z) {   // R = Rz * Ry * Rx (wie ModelPart)
    const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
    return [[cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx], [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx], [-sy, cy * sx, cy * cx]];
  }
  const mulV = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
  function emoteFigure(item, opts = {}) {
    const W = 120, H = 150, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const draw = (ts) => {
      const t = (ts || 0) % 6, P = emotePose(opts.cape || opts.skin ? 'none' : item.emote, t), capeTex = opts.cape ? (item.anim ? cape(item, ts || 0) : opts.cape) : null; x.clearRect(0, 0, W, H);
      const g = x.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, 78); g.addColorStop(0, (item.colors?.[0] || '#64748b') + '99'); g.addColorStop(.6, (item.colors?.[1] || '#1e293b') + '55'); g.addColorStop(1, '#0000'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      if (!emoteTex.ready && !opts.skin) return;
      const yaw = opts.skin ? -0.5 + Math.sin(t * 1.1) * .5 : opts.cape ? Math.PI - 0.5 + Math.sin(t * 1.1) * .45 : -0.55 + (item.emote === 'spin' ? t * 12.57 : Math.sin(t * .8) * .25), cyw = Math.cos(yaw), syw = Math.sin(yaw), S = 3.6, D = 160;
      const view = (v) => { const X = v[0] * cyw + v[2] * syw, Z = -v[0] * syw + v[2] * cyw, k = D / (D + Z); return { x: W / 2 + X * S * k, y: H / 2 + (v[1] - 8) * S * k, z: Z }; };
      const polys = [];
      const parts = Object.entries(EPARTS).map(([n, d]) => [d, P[n], opts.skin || emoteTex.c, [0, 1]]);
      if (capeTex) parts.push([ECAPE, [0.12 + Math.sin(t * 2) * .03, 0, 0], capeTex, [0]]);
      for (const [def, r, tex, layers] of parts) {
        const R = rotMat(r[0], r[1], r[2]);
        for (const layer of layers) {
          const e = layer ? .5 : 0, [x0, y0, z0, x1, y1, z1] = [def.b[0] - e, def.b[1] - e, def.b[2] - e, def.b[3] + e, def.b[4] + e, def.b[5] + e];
          const loc = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
          const wv = loc.map((l) => { const q = mulV(R, l); return [q[0] + def.p[0], q[1] + def.p[1], q[2] + def.p[2]]; });
          const ctr = [0, 1, 2].map((k) => wv.reduce((a, v) => a + v[k], 0) / 8);
          EFACES.forEach((f, fi) => {
            const a = wv[f[0]], b = wv[f[1]], d = wv[f[3]], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ad = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
            let n = [ab[1] * ad[2] - ab[2] * ad[1], ab[2] * ad[0] - ab[0] * ad[2], ab[0] * ad[1] - ab[1] * ad[0]]; const nl = Math.hypot(...n) || 1; n = n.map((q) => q / nl);
            const fc = [0, 1, 2].map((k) => (wv[f[0]][k] + wv[f[2]][k]) / 2); if (n[0] * (fc[0] - ctr[0]) + n[1] * (fc[1] - ctr[1]) + n[2] * (fc[2] - ctr[2]) < 0) n = n.map((q) => -q);
            const nr = [n[0] * cyw + n[2] * syw, n[1], -n[0] * syw + n[2] * cyw]; if (nr[2] > 0.02) return;   // Rueckseite
            const lit = Math.max(0, -(nr[0] * .35 + nr[1] * .5 + nr[2] * .8)) * .5, pts = f.map((q) => view(wv[q]));
            polys.push({ z: pts.reduce((s, p) => s + p.z, 0) / 4 - layer * .01, pts, lit, uv: def.cape ? [[12, 1, 10, 16], [1, 1, 10, 16], [0, 1, 1, 16], [11, 1, 1, 16], [1, 0, 10, 1], [11, 0, 10, 1]][fi] : uvRect(layer ? def.ov : def.uv, def.s, fi), layer, tex });
          });
        }
      }
      polys.sort((p, q) => q.z - p.z);
      x.imageSmoothingEnabled = false;
      for (const p of polys) {
        const [sx, sy, sw, sh] = p.uv, [a0, b0, , d0] = p.pts;
        x.save(); x.globalAlpha = p.layer ? .38 : 1; x.filter = `brightness(${(.8 + p.lit * .5).toFixed(2)})`;
        x.setTransform((b0.x - a0.x) / sw, (b0.y - a0.y) / sw, (d0.x - a0.x) / sh, (d0.y - a0.y) / sh, a0.x, a0.y);
        x.drawImage(p.tex, sx, sy, sw, sh, 0, 0, sw, sh); x.restore();
        if (p.layer) { x.save(); x.lineJoin = 'round'; x.lineWidth = .9; x.strokeStyle = 'rgba(0,0,0,.85)'; x.beginPath(); p.pts.forEach((q, i) => (i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y))); x.closePath(); x.stroke(); x.restore(); }
      }
    };
    draw(0);
    animSet.add({ c, draw: (ts) => draw(ts), t0: performance.now() }); if (!animOn) { animOn = true; requestAnimationFrame(animTick); }
    return c;
  }
  const emoteThumb = emoteFigure;
const capeFigure = (item) => emoteFigure(item, { cape: cape(item, 0) });
  const front = (item) => (item.type === 'cape' ? capeFigure(item) : item.type === 'skin' ? emoteFigure(item, { skin: skin(item) }) : item.type === 'pet' ? petThumb(item)
    : item.type === 'badge' ? iconCanvas(ICONS[item.badge], BADGE_COL[item.badge]) : item.type === 'aura' ? iconCanvas(auraGlyph(item.aura), AURA_COL[item.aura]) : item.type === 'emote' ? emoteThumb(item) : ntPreview(item));
  const frames = (item, n = 10, step = 0.2) => { const out = []; for (let i = 0; i < n; i++) out.push(cape(item, i * step).toDataURL('image/png')); return out; };
  const dataUrl = (item) => (item.type === 'cape' ? cape(item) : skin(item)).toDataURL('image/png');

  /* Standard-Skin (Fallback) */
  const defaultSkinUrl = () => skin({ colors: ['#3b82f6', '#1e3a8a', '#e7c9a9'] }).toDataURL('image/png');

  /* ---------- Crates: Faces aus renderer/crates/*.png, pro Stufe per Verlaufskarte eingefärbt ---------- */
  const FACES = ['front', 'back', 'left', 'right', 'top', 'bottom'];
  const CRATE_TINT = {
    common: null,
    rare: ['#06112b', '#2563eb', '#dbeafe'], epic: ['#14061f', '#9333ea', '#f3e8ff'], legendary: ['#1f1203', '#f59e0b', '#fff7d6'],
    mythic: ['#1a0620', '#d946ef', '#fdf4ff'], halloween: ['#140700', '#f97316', '#ffedd5']
  };
  const crateCache = {};
  const crateReady = Promise.all(FACES.map((f) => new Promise((res) => { const im = new Image(); im.onload = () => res([f, im]); im.onerror = () => res([f, null]); im.src = (window.CRATE_FACES || {})[f] || ''; }))).then((list) => {
    for (const [id, stops] of Object.entries(CRATE_TINT)) {
      crateCache[id] = {};
      if (id === 'halloween' && window.CRATE_FACES_HALLOWEEN) { for (const f of FACES) crateCache[id][f] = window.CRATE_FACES_HALLOWEEN[f]; continue; }
      for (const [f, im] of list) {
        if (!im) continue;
        const [c, x] = mk(im.width, im.height); x.drawImage(im, 0, 0);
        { const hw = Math.floor(im.width / 2); x.save(); x.translate(im.width, 0); x.scale(-1, 1); x.drawImage(im, 0, 0, hw, im.height, 0, 0, hw, im.height); x.restore(); }   /* symmetrisch: linke Hälfte spiegeln */
        if (stops) {
          const d = x.getImageData(0, 0, c.width, c.height), cols = stops.map(hex);
          for (let i = 0; i < d.data.length; i += 4) {
            const L = Math.max(0, Math.min(1, ((d.data[i] + d.data[i + 1] + d.data[i + 2]) / 765 - 0.06) / 0.72));
            const col = L < 0.5 ? lerp(cols[0], cols[1], L * 2) : lerp(cols[1], cols[2], (L - 0.5) * 2);
            d.data[i] = col[0]; d.data[i + 1] = col[1]; d.data[i + 2] = col[2];
          }
          x.putImageData(d, 0, 0);
        }
        crateCache[id][f] = c.toDataURL('image/png');
      }
    }
  });
  const crateFace = (id, f) => crateCache[id]?.[f] || '';
  /* CSS-3D-Würfel; size in px */
  function crateCube(id, size) {
    const w = document.createElement('div'); w.className = 'scene'; w.style.cssText = `width:${size}px;height:${size}px;--s:${size}px`;
    const cube = document.createElement('div'); cube.className = 'cube';
    for (const f of FACES) { const e = document.createElement('div'); e.className = 'cface ' + f; e.style.backgroundImage = `url(${crateFace(id, f)})`; cube.append(e); }
    w.append(cube); return w;
  }

  return { crateReady, crateFace, crateCube, cape, skin, front, dataUrl, frames, defaultSkinUrl, nametagCss, petSprite, PETS, badgeSvg, auraGlyph, auraColors };
})();
