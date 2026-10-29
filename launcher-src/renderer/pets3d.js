/* 3D-Schulter-Pets im Minecraft-Stil: Quader mit Pixel-Texturen (1 Textur-Pixel = 1 Einheit = 1 Skin-Pixel, Nearest-Filter).
   Eigener kleiner WebGL-Renderer auf einer durchsichtigen Ebene über dem Skin-Viewer. Er nutzt nur Kamera- und Körper-Matrizen des Viewers
   (camera.projectionMatrix / matrixWorldInverse, skin.matrixWorld), braucht also keine three.js-Klassen. Ein unsichtbares Körper-Modell sorgt für korrekte Verdeckung. */
(() => {
  /* Teil: s = Größe [b,h,t], p = Mitte [x,y,z] (y=0 ist die Standfläche), c = Farbe, k = Pixelrauschen, flap = Flügel (+1 links / -1 rechts), glow = leuchtet */
  const P = (s, p, c, o = {}) => ({ s, p, c, ...o });
  const MODELS = {
    parrot: [
      P([1, 1, 1], [-0.8, 0.5, 0], '#9ca3af'), P([1, 1, 1], [0.8, 0.5, 0], '#9ca3af'),
      P([3, 4, 3], [0, 3, 0], '#d62828'),
      P([1, 3, 2], [-2, 3.3, -0.2], '#2563eb', { flap: -1 }), P([1, 3, 2], [2, 3.3, -0.2], '#2563eb', { flap: 1 }),
      P([2, 1, 4], [0, 1.4, -3], '#2563eb'), P([1, 1, 3], [0, 1.2, -5.6], '#facc15'),
      P([2, 2, 2], [0, 5.9, 0.4], '#d62828'), P([1, 1, 1], [0, 5.6, 1.9], '#e5e7eb'), P([1, 1, 1], [0, 4.8, 1.7], '#9ca3af'),
      P([1, 2, 1], [0, 7.5, -0.2], '#b91c1c'),
      P([0.5, 0.5, 0.3], [-0.7, 6.2, 1.45], '#111827', { k: 0 }), P([0.5, 0.5, 0.3], [0.7, 6.2, 1.45], '#111827', { k: 0 })
    ],
    cat: [
      P([3, 3, 4], [0, 1.5, 0], '#f59e0b'), P([3, 3, 3], [0, 4.6, 1.2], '#f59e0b'),
      P([1, 1, 0.6], [-1, 6.6, 1.2], '#f59e0b'), P([1, 1, 0.6], [1, 6.6, 1.2], '#f59e0b'),
      P([1, 1, 1], [-1.1, 0.5, 1.6], '#b45309'), P([1, 1, 1], [1.1, 0.5, 1.6], '#b45309'),
      P([1, 4, 1], [0, 3, -2.6], '#b45309'), P([0.8, 0.8, 0.3], [0, 4.2, 2.75], '#fda4af', { k: 0 }),
      P([0.6, 0.7, 0.3], [-0.9, 5, 2.75], '#111827', { k: 0 }), P([0.6, 0.7, 0.3], [0.9, 5, 2.75], '#111827', { k: 0 })
    ],
    slime: [
      P([4, 4, 4], [0, 2, 0], '#4ade80'), P([2, 2, 2], [0, 2, 0], '#15803d'),
      P([0.9, 0.9, 0.3], [-1, 2.9, 2.1], '#052e16', { k: 0 }), P([0.9, 0.9, 0.3], [1, 2.9, 2.1], '#052e16', { k: 0 }), P([1.2, 0.5, 0.3], [0, 1.4, 2.1], '#052e16', { k: 0 })
    ],
    ghost: [
      P([3, 5, 3], [0, 3.5, 0], '#f8fafc', { glow: 0.35 }),
      P([1, 1, 1], [-1, 0.5, 0], '#f8fafc', { glow: 0.35 }), P([1, 1, 1], [1, 0.5, 0.6], '#f8fafc', { glow: 0.35 }), P([1, 1, 1], [0, 0.5, -0.8], '#f8fafc', { glow: 0.35 }),
      P([0.7, 1, 0.3], [-0.8, 4.6, 1.55], '#111827', { k: 0 }), P([0.7, 1, 0.3], [0.8, 4.6, 1.55], '#111827', { k: 0 }), P([1, 1, 0.3], [0, 3, 1.55], '#111827', { k: 0 })
    ],
    pumpkin: [
      P([4, 3.5, 4], [0, 1.75, 0], '#f97316'), P([1, 1.5, 1], [0, 4.2, 0], '#16a34a'), P([3, 0.6, 3], [0, 0.3, 0], '#c2410c'),
      P([0.9, 0.9, 0.3], [-1, 2.3, 2.05], '#111827', { k: 0 }), P([0.9, 0.9, 0.3], [1, 2.3, 2.05], '#111827', { k: 0 }), P([2, 0.7, 0.3], [0, 1.1, 2.05], '#111827', { k: 0 }),
      P([0.9, 0.9, 0.3], [-1, 2.3, 2.0], '#fde047', { glow: 1, k: 0 })
    ],
    dragon: [
      P([1, 1, 1], [-1, 0.5, 0.8], '#6b21a8'), P([1, 1, 1], [1, 0.5, 0.8], '#6b21a8'),
      P([3, 3, 5], [0, 2.5, 0], '#a855f7'), P([3, 3, 3], [0, 5, 2], '#a855f7'), P([2, 1, 1.5], [0, 4.5, 4], '#c084fc'),
      P([0.8, 1.5, 0.8], [-1, 7, 1.6], '#fde68a'), P([0.8, 1.5, 0.8], [1, 7, 1.6], '#fde68a'),
      P([0.6, 3, 3], [-2.2, 4.4, -0.3], '#6b21a8', { flap: -1 }), P([0.6, 3, 3], [2.2, 4.4, -0.3], '#6b21a8', { flap: 1 }),
      P([1.5, 1.5, 3], [0, 2.2, -4], '#a855f7'), P([1, 1, 2], [0, 2, -6], '#6b21a8'),
      P([0.7, 0.7, 0.3], [-0.9, 5.5, 3.55], '#fde047', { glow: 1, k: 0 }), P([0.7, 0.7, 0.3], [0.9, 5.5, 3.55], '#fde047', { glow: 1, k: 0 })
    ],
    robot: [
      P([1, 1, 1], [-0.9, 0.5, 0], '#475569'), P([1, 1, 1], [0.9, 0.5, 0], '#475569'),
      P([3, 3, 3], [0, 2.5, 0], '#94a3b8'), P([1, 2, 1], [-2, 2.7, 0], '#64748b'), P([1, 2, 1], [2, 2.7, 0], '#64748b'),
      P([3, 3, 3], [0, 5.5, 0], '#cbd5e1'), P([0.3, 1.2, 0.3], [0, 7.7, 0], '#64748b'), P([0.8, 0.8, 0.8], [0, 8.5, 0], '#ef4444', { glow: 1 }),
      P([0.7, 0.7, 0.3], [-0.8, 5.8, 1.55], '#22d3ee', { glow: 1, k: 0 }), P([0.7, 0.7, 0.3], [0.8, 5.8, 1.55], '#22d3ee', { glow: 1, k: 0 }), P([1.6, 0.4, 0.3], [0, 4.7, 1.55], '#1e293b', { k: 0 })
    ],
    fox: [
      P([1, 1, 1], [-0.9, 0.5, 1.4], '#1f2937'), P([1, 1, 1], [0.9, 0.5, 1.4], '#1f2937'), P([1, 1, 1], [-0.9, 0.5, -1.2], '#1f2937'), P([1, 1, 1], [0.9, 0.5, -1.2], '#1f2937'),
      P([3, 2.5, 5], [0, 2.2, 0], '#ea580c'), P([3, 2.5, 3], [0, 4.4, 2.2], '#ea580c'), P([2, 1.2, 1.6], [0, 3.9, 4.3], '#fef3c7'), P([0.8, 0.7, 0.5], [0, 4.3, 5.2], '#111827', { k: 0 }),
      P([1, 1.4, 0.6], [-1, 6.4, 1.8], '#ea580c'), P([1, 1.4, 0.6], [1, 6.4, 1.8], '#ea580c'),
      P([2, 2, 4], [0, 2.6, -3.6], '#ea580c'), P([2, 2, 1.4], [0, 2.6, -6], '#fef3c7'),
      P([0.6, 0.6, 0.3], [-0.9, 4.9, 3.75], '#111827', { k: 0 }), P([0.6, 0.6, 0.3], [0.9, 4.9, 3.75], '#111827', { k: 0 })
    ],
    panda: [
      P([1.4, 1.5, 1.4], [-1, 0.75, 1.2], '#111827'), P([1.4, 1.5, 1.4], [1, 0.75, 1.2], '#111827'), P([1.4, 1.5, 1.4], [-1, 0.75, -1.2], '#111827'), P([1.4, 1.5, 1.4], [1, 0.75, -1.2], '#111827'),
      P([3.6, 3, 4], [0, 2.8, 0], '#f8fafc'), P([3.7, 1, 1.8], [0, 3.4, 1.4], '#111827'),
      P([3.6, 3.2, 3.2], [0, 5.8, 1.6], '#f8fafc'), P([1.2, 1.2, 0.8], [-1.6, 7.8, 1.2], '#111827'), P([1.2, 1.2, 0.8], [1.6, 7.8, 1.2], '#111827'),
      P([1, 1.1, 0.3], [-1, 6.2, 3.25], '#111827', { k: 0 }), P([1, 1.1, 0.3], [1, 6.2, 3.25], '#111827', { k: 0 }),
      P([0.4, 0.4, 0.3], [-1, 6.3, 3.45], '#f8fafc', { k: 0 }), P([0.4, 0.4, 0.3], [1, 6.3, 3.45], '#f8fafc', { k: 0 }), P([1, 0.7, 0.3], [0, 5.2, 3.3], '#111827', { k: 0 }),
      P([1, 1, 1], [0, 2.8, -2.4], '#f8fafc')
    ],
    owl: [
      P([0.8, 0.5, 1.2], [-0.8, 0.25, 0.3], '#facc15'), P([0.8, 0.5, 1.2], [0.8, 0.25, 0.3], '#facc15'),
      P([3.4, 4.2, 3], [0, 2.6, 0], '#92400e'), P([2.2, 2.6, 0.4], [0, 2.4, 1.6], '#fde68a'),
      P([3.6, 3, 3], [0, 6.3, 0], '#b45309'), P([0.9, 1.2, 0.9], [-1.4, 8.4, 0], '#78350f'), P([0.9, 1.2, 0.9], [1.4, 8.4, 0], '#78350f'),
      P([1.3, 1.3, 0.4], [-0.9, 6.5, 1.6], '#fef3c7', { k: 0 }), P([1.3, 1.3, 0.4], [0.9, 6.5, 1.6], '#fef3c7', { k: 0 }),
      P([0.6, 0.6, 0.3], [-0.9, 6.5, 1.85], '#111827', { k: 0 }), P([0.6, 0.6, 0.3], [0.9, 6.5, 1.85], '#111827', { k: 0 }), P([0.7, 0.9, 0.5], [0, 5.6, 1.7], '#f59e0b', { k: 0 }),
      P([0.6, 3, 2], [-2.1, 2.8, -0.2], '#78350f', { flap: -1 }), P([0.6, 3, 2], [2.1, 2.8, -0.2], '#78350f', { flap: 1 })
    ],
    bunny: [
      P([1.4, 1, 2], [-0.9, 0.5, 0.9], '#f1f5f9'), P([1.4, 1, 2], [0.9, 0.5, 0.9], '#f1f5f9'),
      P([3, 3, 4], [0, 2.5, -0.2], '#e2e8f0'), P([3, 2.8, 2.8], [0, 4.9, 1.2], '#f1f5f9'),
      P([1, 4, 0.7], [-0.8, 8.2, 0.9], '#f1f5f9'), P([1, 4, 0.7], [0.8, 8.2, 0.9], '#f1f5f9'), P([0.5, 3, 0.3], [-0.8, 8.2, 1.3], '#fda4af', { k: 0 }), P([0.5, 3, 0.3], [0.8, 8.2, 1.3], '#fda4af', { k: 0 }),
      P([1.5, 1.5, 1.5], [0, 2.2, -2.6], '#ffffff'), P([0.8, 0.6, 0.3], [0, 4.5, 2.7], '#fda4af', { k: 0 }),
      P([0.5, 0.6, 0.3], [-0.8, 5.3, 2.65], '#111827', { k: 0 }), P([0.5, 0.6, 0.3], [0.8, 5.3, 2.65], '#111827', { k: 0 })
    ],
    penguin: [
      P([1.2, 0.5, 1.6], [-0.9, 0.25, 0.4], '#f59e0b'), P([1.2, 0.5, 1.6], [0.9, 0.25, 0.4], '#f59e0b'),
      P([3.4, 5, 2.8], [0, 3, 0], '#111827'), P([2.2, 3.6, 0.4], [0, 2.8, 1.5], '#f8fafc'),
      P([3.2, 2.6, 2.8], [0, 6.8, 0], '#111827'), P([2, 1.6, 0.4], [0, 6.6, 1.5], '#f8fafc'), P([1, 0.7, 1], [0, 6.4, 1.9], '#f59e0b'),
      P([0.5, 0.5, 0.3], [-0.8, 7.2, 1.45], '#111827', { k: 0 }), P([0.5, 0.5, 0.3], [0.8, 7.2, 1.45], '#111827', { k: 0 }),
      P([0.6, 3, 1.6], [-2, 3.2, 0], '#1f2937', { flap: -1 }), P([0.6, 3, 1.6], [2, 3.2, 0], '#1f2937', { flap: 1 })
    ],
    bee: [
      P([3, 3, 4], [0, 3, 0], '#facc15'), P([3.1, 0.8, 1], [0, 3, 1], '#111827'), P([3.1, 0.8, 1], [0, 3, -1.2], '#111827'), P([2, 2, 1.2], [0, 2.6, -2.5], '#111827'), P([0.4, 0.4, 1.2], [0, 2.4, -3.6], '#f59e0b'),
      P([0.4, 1.6, 0.4], [-0.8, 5.2, 2], '#111827'), P([0.4, 1.6, 0.4], [0.8, 5.2, 2], '#111827'),
      P([0.6, 2.4, 3], [-1.6, 5, -0.4], '#bae6fd', { flap: -1, glow: 0.5 }), P([0.6, 2.4, 3], [1.6, 5, -0.4], '#bae6fd', { flap: 1, glow: 0.5 }),
      P([0.8, 0.8, 0.3], [-0.9, 3.6, 2.05], '#111827', { k: 0 }), P([0.8, 0.8, 0.3], [0.9, 3.6, 2.05], '#111827', { k: 0 })
    ],
    axolotl: [
      P([1, 1, 1.4], [-1.2, 0.5, 1.2], '#f9a8d4'), P([1, 1, 1.4], [1.2, 0.5, 1.2], '#f9a8d4'), P([1, 1, 1.4], [-1.2, 0.5, -1.2], '#f9a8d4'), P([1, 1, 1.4], [1.2, 0.5, -1.2], '#f9a8d4'),
      P([3, 2.4, 4], [0, 2, 0], '#fbcfe8'), P([3.6, 2.6, 3], [0, 3.6, 2.2], '#fbcfe8'),
      P([0.5, 1.8, 0.5], [-2.1, 4.6, 2], '#f43f5e', { flap: -1 }), P([0.5, 1.4, 0.5], [-2.1, 3.6, 2], '#f43f5e'), P([0.5, 1.8, 0.5], [2.1, 4.6, 2], '#f43f5e', { flap: 1 }), P([0.5, 1.4, 0.5], [2.1, 3.6, 2], '#f43f5e'),
      P([1, 2.2, 4], [0, 2.6, -3.6], '#f9a8d4'),
      P([0.6, 0.6, 0.3], [-1.1, 4.2, 3.75], '#111827', { k: 0 }), P([0.6, 0.6, 0.3], [1.1, 4.2, 3.75], '#111827', { k: 0 }), P([1.2, 0.3, 0.3], [0, 3.1, 3.75], '#be185d', { k: 0 })
    ],
    wolf: [
      P([1, 1.4, 1], [-0.9, 0.7, 1.4], '#6b7280'), P([1, 1.4, 1], [0.9, 0.7, 1.4], '#6b7280'), P([1, 1.4, 1], [-0.9, 0.7, -1.3], '#6b7280'), P([1, 1.4, 1], [0.9, 0.7, -1.3], '#6b7280'),
      P([3, 2.8, 5], [0, 2.8, 0], '#9ca3af'), P([3, 3, 3], [0, 5.2, 2.3], '#9ca3af'), P([1.8, 1.4, 1.8], [0, 4.5, 4.4], '#e5e7eb'), P([0.8, 0.7, 0.4], [0, 4.9, 5.4], '#111827', { k: 0 }),
      P([1, 1.3, 0.6], [-1, 7.4, 2], '#6b7280'), P([1, 1.3, 0.6], [1, 7.4, 2], '#6b7280'),
      P([1.2, 1.2, 3.5], [0, 3.6, -3.8], '#6b7280'),
      P([0.6, 0.5, 0.3], [-0.9, 5.7, 3.85], '#fde047', { glow: 0.6, k: 0 }), P([0.6, 0.5, 0.3], [0.9, 5.7, 3.85], '#fde047', { glow: 0.6, k: 0 })
    ],
    phoenix: [
      P([1, 1, 1], [-0.8, 0.5, 0], '#facc15'), P([1, 1, 1], [0.8, 0.5, 0], '#facc15'),
      P([3, 4, 3], [0, 3, 0], '#ef4444', { glow: 0.3 }), P([2, 2, 2], [0, 5.9, 0.4], '#f97316', { glow: 0.3 }), P([1, 1, 1.4], [0, 5.6, 1.9], '#facc15'),
      P([1, 2, 1], [0, 7.5, -0.2], '#fde047', { glow: 1 }),
      P([0.8, 4, 4], [-2.2, 3.6, -0.3], '#f97316', { flap: -1, glow: 0.3 }), P([0.8, 4, 4], [2.2, 3.6, -0.3], '#f97316', { flap: 1, glow: 0.3 }),
      P([0.8, 1.5, 3], [-2.2, 1.3, -0.5], '#fde047', { flap: -1, glow: 0.6 }), P([0.8, 1.5, 3], [2.2, 1.3, -0.5], '#fde047', { flap: 1, glow: 0.6 }),
      P([1, 1, 5], [0, 1.6, -4], '#ef4444', { glow: 0.3 }), P([1, 1, 4], [-1.2, 1.2, -4.2], '#fde047', { glow: 0.6 }), P([1, 1, 4], [1.2, 1.2, -4.2], '#fde047', { glow: 0.6 }),
      P([0.5, 0.5, 0.3], [-0.7, 6.2, 1.45], '#111827', { k: 0 }), P([0.5, 0.5, 0.3], [0.7, 6.2, 1.45], '#111827', { k: 0 })
    ]
  };

  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const cl = (v) => Math.min(255, Math.max(0, v * f)) | 0; return `rgb(${cl((n >> 16) & 255)},${cl((n >> 8) & 255)},${cl(n & 255)})`; };

  /* ---- kleine Matrix-Helfer (column-major wie three.js / WebGL) ---- */
  const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
  const trans = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  const scal = (s) => new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]);

  /* Flächen eines Quaders: Normale + 4 Ecken (Vorzeichen für x,y,z), gegen den Uhrzeigersinn von außen */
  const FACES = [
    { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], d: 'xy' },
    { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], d: 'xy' },
    { n: [1, 0, 0], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], d: 'zy' },
    { n: [-1, 0, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], d: 'zy' },
    { n: [0, 1, 0], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], d: 'xz' },
    { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], d: 'xz' }
  ];
  const UVQ = [[0, 1], [1, 1], [1, 0], [0, 0]];

  const VS = 'attribute vec3 aP;attribute vec2 aT;attribute vec3 aN;attribute float aG;uniform mat4 uMVP;uniform mat4 uMV;varying vec2 vT;varying float vL;varying float vG;' +
    'void main(){gl_Position=uMVP*vec4(aP,1.0);vT=aT;vG=aG;vec3 n=normalize(mat3(uMV)*aN);vL=0.5+0.5*max(dot(n,normalize(vec3(0.35,0.65,0.7))),0.0);}';
  const FS = 'precision mediump float;uniform sampler2D uTex;varying vec2 vT;varying float vL;varying float vG;' +
    'void main(){vec4 c=texture2D(uTex,vT);gl_FragColor=vec4(c.rgb*(vL+vG*0.7),1.0);}';

  function compile(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s)); return s; }

  /* Atlas mit allen Flächen-Texturen packen (Regalverfahren), gibt UV-Rechtecke je Quader/Fläche zurück */
  function buildAtlas(spec, rnd) {
    const items = [];
    spec.forEach((q, bi) => {
      const [w, h, d] = q.s;
      const dims = { xy: [w, h], zy: [d, h], xz: [w, d] };
      FACES.forEach((f, fi) => {
        const [fw, fh] = dims[f.d]; const W = Math.max(1, Math.round(fw)), H = Math.max(1, Math.round(fh));
        const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { x.fillStyle = shade(q.c, 1 + (rnd() - 0.5) * (q.k ?? 0.16)); x.fillRect(i, j, 1, 1); }
        items.push({ bi, fi, c, W, H });
      });
    });
    const SZ = 128, atlas = document.createElement('canvas'); atlas.width = atlas.height = SZ; const ax = atlas.getContext('2d');
    let px = 1, py = 1, rowH = 0; const uv = {};
    for (const it of items) {
      if (px + it.W + 1 > SZ) { px = 1; py += rowH + 1; rowH = 0; }
      ax.drawImage(it.c, px, py); uv[it.bi + ':' + it.fi] = [(px + 0.02) / SZ, (py + 0.02) / SZ, (px + it.W - 0.02) / SZ, (py + it.H - 0.02) / SZ];
      px += it.W + 1; rowH = Math.max(rowH, it.H);
    }
    return { atlas, uv };
  }

  /* Körper-Ersatz nur für die Tiefe (unsichtbar): Kopf, Rumpf, Arme, Beine in Skin-Koordinaten */
  const BODY = [[0, 4, 0, 7.6, 7.6, 7.6], [0, -6, 0, 7.6, 11.6, 3.6], [-6, -6, 0, 3.6, 11.6, 3.6], [6, -6, 0, 3.6, 11.6, 3.6], [-2, -18, 0, 3.6, 11.6, 3.6], [2, -18, 0, 3.6, 11.6, 3.6]];

  function attach(viewer, petId, canvas, opts = {}) {
    const spec = MODELS[petId]; if (!spec) throw new Error('kein 3D-Modell');
    if (!viewer.camera || !viewer.playerObject?.skin) throw new Error('Viewer ohne Kamera/Skin');
    const ov = document.createElement('canvas'); ov.className = 'pet3d'; ov.width = canvas.width; ov.height = canvas.height;
    ov.style.cssText = `position:absolute;left:${canvas.offsetLeft}px;top:${canvas.offsetTop}px;width:${canvas.clientWidth || canvas.width}px;height:${canvas.clientHeight || canvas.height}px;pointer-events:none;z-index:4`;
    const gl = ov.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false }) || ov.getContext('experimental-webgl');
    if (!gl) throw new Error('kein WebGL');
    const prog = gl.createProgram(); gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const loc = (n) => gl.getAttribLocation(prog, n), uni = (n) => gl.getUniformLocation(prog, n);
    const rnd = rng(petId.length * 7919 + 13);
    const { atlas, uv } = buildAtlas(spec, rnd);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const white = gl.createTexture();                                              // 1x1 weiß für die Tiefen-Körper
    gl.bindTexture(gl.TEXTURE_2D, white); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const buf = gl.createBuffer(), aP = loc('aP'), aT = loc('aT'), aN = loc('aN'), aG = loc('aG');
    const STRIDE = 9 * 4;
    const upload = (arr) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
      for (const [a, n, o] of [[aP, 3, 0], [aT, 2, 12], [aN, 3, 20], [aG, 1, 32]]) { gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, n, gl.FLOAT, false, STRIDE, o); }
    };
    /* Eckpunkte eines Quaders (mit optionalem Flügelschlag um die Oberkante) */
    function boxVerts(q, bi, ang, out) {
      const [w, h, d] = q.s, [cx, cy, cz] = q.p, g = q.glow || 0;
      const ca = Math.cos(ang), sa = Math.sin(ang), py = cy + h / 2;
      const rot = (x, y, z) => (ang ? [cx + (x - cx) * ca - (y - py) * sa + 0, py + (x - cx) * sa + (y - py) * ca, z] : [x, y, z]);
      const rotN = (n) => (ang ? [n[0] * ca - n[1] * sa, n[0] * sa + n[1] * ca, n[2]] : n);
      FACES.forEach((f, fi) => {
        const r = uv[bi + ':' + fi] || [0, 0, 1, 1]; const n = rotN(f.n);
        const P = f.v.map((s) => rot(cx + s[0] * w / 2, cy + s[1] * h / 2, cz + s[2] * d / 2));
        for (const k of [0, 1, 2, 0, 2, 3]) { const t = UVQ[k]; out.push(P[k][0], P[k][1], P[k][2], r[0] + t[0] * (r[2] - r[0]), r[1] + t[1] * (r[3] - r[1]), n[0], n[1], n[2], g); }
      });
    }
    const bodyArr = []; BODY.forEach((b) => { const q = { s: [b[3], b[4], b[5]], p: [b[0], b[1], b[2]] }; const tmp = []; boxVerts(q, -1, 0, tmp); bodyArr.push(...tmp); });
    const bodyData = new Float32Array(bodyArr);
    const uMVP = uni('uMVP'), uMV = uni('uMV'), uTex = uni('uTex');
    gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);
    let t = 0, alive = true;

    function frame() {
      if (!alive) return;
      if (!opts.once && !document.body.contains(canvas)) return off();
      t = opts.once ? (opts.t || 0.8) : t + 0.05;
      try {
        viewer.camera.updateMatrixWorld?.(); viewer.playerObject.skin.updateWorldMatrix?.(true, false);
        const proj = viewer.camera.projectionMatrix.elements, view = viewer.camera.matrixWorldInverse.elements, skinW = viewer.playerObject.skin.matrixWorld.elements;
        gl.viewport(0, 0, ov.width, ov.height); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // 1) unsichtbarer Körper: nur Tiefe
        let mv = mul(view, skinW), mvp = mul(proj, mv);
        gl.uniformMatrix4fv(uMVP, false, mvp); gl.uniformMatrix4fv(uMV, false, mv); gl.uniform1i(uTex, 0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, white);
        if (!opts.once) { gl.colorMask(false, false, false, false); upload(bodyData); gl.drawArrays(gl.TRIANGLES, 0, bodyData.length / 9); gl.colorMask(true, true, true, true); }
        // 2) Pet auf der rechten Schulter
        const model = mul(skinW, mul(trans(-6, 0.2 + Math.sin(t * 1.6) * 0.18, 0), scal(0.9)));
        mv = mul(view, model); mvp = mul(proj, mv);
        gl.uniformMatrix4fv(uMVP, false, mvp); gl.uniformMatrix4fv(uMV, false, mv);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const arr = []; spec.forEach((q, bi) => boxVerts(q, bi, q.flap ? q.flap * (0.25 + 0.4 * Math.sin(t * 6)) : 0, arr));
        const data = new Float32Array(arr); upload(data); gl.drawArrays(gl.TRIANGLES, 0, data.length / 9);
      } catch (e) { console.warn('3D-Pet:', e.message); return off(); }
      if (!opts.once) requestAnimationFrame(frame);
    }
    canvas.parentElement.append(ov);
    if (opts.once) { frame(); return ov; }
    requestAnimationFrame(frame);
    function off() { alive = false; ov.remove(); }
    return off;
  }
  /* Einzelbild eines Pets als PNG (für Shop/Cosmetics/Crates) – echtes 3D, schräg von vorn */
  const persp = (fovy, a, n, f) => { const t = 1 / Math.tan(fovy / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; };
  function lookAt(ex, ey, ez, tx, ty, tz) {
    const fx = tx - ex, fy = ty - ey, fz = tz - ez, fl = Math.hypot(fx, fy, fz), F = [fx / fl, fy / fl, fz / fl];
    let R = [-F[2], 0, F[0]]; const rl = Math.hypot(...R); R = R.map((v) => v / rl);
    const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
    return [R[0], U[0], -F[0], 0, R[1], U[1], -F[1], 0, R[2], U[2], -F[2], 0, -(R[0] * ex + R[1] * ey + R[2] * ez), -(U[0] * ex + U[1] * ey + U[2] * ez), F[0] * ex + F[1] * ey + F[2] * ez, 1];
  }
  const snaps = {};
  function snapshot(petId, size = 192) {
    if (snaps[petId]) return snaps[petId];
    const holder = document.createElement('div'), cv = document.createElement('canvas'); cv.width = cv.height = size; holder.append(cv);
    const ang = -0.55, d = 22, tx = -6, ty = 3.6, ex = tx + Math.sin(ang) * d, ez = Math.cos(ang) * d;
    const viewer = { camera: { projectionMatrix: { elements: new Float32Array(persp(0.5, 1, 1, 200)) }, matrixWorldInverse: { elements: new Float32Array(lookAt(ex, ty + 3, ez, tx, ty, 0)) } },
      playerObject: { skin: { matrixWorld: { elements: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) } } } };
    const ov = attach(viewer, petId, cv, { once: true });
    return (snaps[petId] = ov.toDataURL('image/png'));
  }
  window.Pets3D = { has: (id) => !!MODELS[id], attach, snapshot };
})();
