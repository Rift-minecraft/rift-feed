const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const AdmZip = require('adm-zip');
const { Client } = require('minecraft-launcher-core');

const UA = 'RiftClient/1.0.0 (rift-client)';
let CONFIG = {};
for (const d of [__dirname, app.getAppPath()]) { try { CONFIG = JSON.parse(fs.readFileSync(path.join(d, 'config.json'), 'utf8')); break; } catch {} }
const HOT = global.__riftHot || null;                    // per Update-Dateien nachgeladene Version (siehe loader.js)
const DATA = path.join(app.getPath('appData'), 'RiftClient');
const GAME_ROOT = path.join(DATA, 'minecraft');          // shared assets/libraries/versions
const PROFILES_DIR = path.join(DATA, 'profiles');        // one game directory per profile
const JAVA_DIR = path.join(DATA, 'java');
/* Feed-Ziel: config.json, sonst fest das GitHub-Repo des Admins */
if (!CONFIG.feedRepo || String(CONFIG.feedRepo).startsWith('OWNER')) CONFIG.feedRepo = 'Rift-minecraft/rift-feed';   // Standard-Feed (GitHub-Konto Rift-minecraft)
const STATE_FILE = path.join(DATA, 'state.json');
for (const d of [DATA, GAME_ROOT, PROFILES_DIR]) fs.mkdirSync(d, { recursive: true });

/* ------------------------------------------------------------------ */
/* Shop-Katalog (Rift Coins)                                           */
/* ------------------------------------------------------------------ */
const ITEMS_ALL = [
  // Capes (alle mit eigener Textur, die meisten animiert)
  { id: 'cape_ember', name: 'Glut', type: 'cape', rarity: 'common', colors: ['#ff7a18', '#af002d'], pattern: 'shimmer', anim: true },
  { id: 'cape_moss', name: 'Moos', type: 'cape', rarity: 'common', colors: ['#4d7c0f', '#a3e635'], pattern: 'leaves' },
  { id: 'cape_slate', name: 'Schiefer', type: 'cape', rarity: 'common', colors: ['#64748b', '#1e293b'], pattern: 'carbon' },
  { id: 'cape_ocean', name: 'Ozean', type: 'cape', rarity: 'common', colors: ['#0ea5e9', '#1e3a8a'], pattern: 'ripple', anim: true },
  { id: 'cape_mint', name: 'Minze', type: 'cape', rarity: 'common', colors: ['#34d399', '#064e3b'], pattern: 'shimmer', anim: true },
  { id: 'cape_forest', name: 'Wald', type: 'cape', rarity: 'common', colors: ['#16a34a', '#14532d'], pattern: 'leaves' },
  { id: 'cape_candy', name: 'Zuckerstange', type: 'cape', rarity: 'common', colors: ['#f43f5e', '#ffffff'], pattern: 'stripes' },
  { id: 'cape_sunset', name: 'Abendrot', type: 'cape', rarity: 'rare', colors: ['#fb923c', '#7c3aed'], pattern: 'sunset' },
  { id: 'cape_orchid', name: 'Orchidee', type: 'cape', rarity: 'rare', colors: ['#d946ef', '#581c87'], pattern: 'diamond' },
  { id: 'cape_glacier', name: 'Gletscher', type: 'cape', rarity: 'rare', colors: ['#e0f2fe', '#38bdf8'], pattern: 'shimmer', anim: true },
  { id: 'cape_coral', name: 'Korallenriff', type: 'cape', rarity: 'rare', colors: ['#fb7185', '#0e7490'], pattern: 'ripple', anim: true },
  { id: 'cape_floss', name: 'Zuckerwatte', type: 'cape', rarity: 'rare', colors: ['#f9a8d4', '#67e8f9'], pattern: 'plasma', anim: true },
  { id: 'cape_rift', name: 'Rift Core', type: 'cape', rarity: 'epic', colors: ['#1d4ed8', '#7c3aed'], pattern: 'lightning', anim: true },
  { id: 'cape_wave', name: 'Tiefsee', type: 'cape', rarity: 'epic', colors: ['#0ea5e9', '#1e3a8a'], pattern: 'wave', anim: true },
  { id: 'cape_scales', name: 'Drachenschuppen', type: 'cape', rarity: 'epic', colors: ['#16a34a', '#052e16'], pattern: 'scales' },
  { id: 'cape_royal', name: 'Königsmantel', type: 'cape', rarity: 'epic', colors: ['#7c3aed', '#fbbf24'], pattern: 'diamond' },
  { id: 'cape_dusk', name: 'Sternenhimmel', type: 'cape', rarity: 'epic', colors: ['#312e81', '#f472b6'], pattern: 'stars', anim: true },
  { id: 'cape_lava', name: 'Lava', type: 'cape', rarity: 'epic', colors: ['#fb923c', '#7f1d1d'], pattern: 'embers', anim: true },
  { id: 'cape_gold', name: 'Golden Rift', type: 'cape', rarity: 'legendary', colors: ['#b45309', '#fde68a'], pattern: 'gold', anim: true },
  { id: 'cape_neon', name: 'Neon-Pulse', type: 'cape', rarity: 'legendary', colors: ['#22d3ee', '#e879f9'], pattern: 'neon', anim: true },
  { id: 'cape_embers', name: 'Glutwind', type: 'cape', rarity: 'legendary', colors: ['#f97316', '#450a0a'], pattern: 'embers', anim: true },
  { id: 'cape_toxic', name: 'Giftwolke', type: 'cape', rarity: 'legendary', colors: ['#84cc16', '#14532d'], pattern: 'plasma', anim: true },
  { id: 'cape_nova', name: 'Nova', type: 'cape', rarity: 'mythic', colors: ['#f472b6', '#22d3ee'], pattern: 'prism', anim: true },
  { id: 'cape_riftx', name: 'Rift Prime', type: 'cape', rarity: 'mythic', colors: ['#38bdf8', '#7c3aed'], pattern: 'lightning', anim: true },
  // Nametag-Farben
  { id: 'nt_ice',     name: 'Eis',        type: 'nametag', rarity: 'common',    style: { kind: 'solid',    colors: ['#7dd3fc'] } },
  { id: 'nt_ruby',    name: 'Rubin',      type: 'nametag', rarity: 'common',    style: { kind: 'solid',    colors: ['#fb7185'] } },
  { id: 'nt_lime',    name: 'Limette',    type: 'nametag', rarity: 'common',    style: { kind: 'solid',    colors: ['#a3e635'] } },
  { id: 'nt_gold',    name: 'Gold',       type: 'nametag', rarity: 'rare',      style: { kind: 'gradient', colors: ['#fde68a', '#f59e0b'] } },
  { id: 'nt_neon',    name: 'Neon',       type: 'nametag', rarity: 'rare',      style: { kind: 'glow',     colors: ['#4ade80'] } },
  { id: 'nt_sunset',  name: 'Sunset',     type: 'nametag', rarity: 'epic',      style: { kind: 'gradient', colors: ['#f97316', '#ec4899', '#8b5cf6'] } },
  { id: 'nt_rainbow', name: 'Regenbogen', type: 'nametag', rarity: 'epic',      style: { kind: 'rainbow',  colors: [] } },
  { id: 'nt_chrome',  name: 'Chrome',     type: 'nametag', rarity: 'legendary', style: { kind: 'chrome',   colors: ['#ffffff', '#8a8a93'] } },
  // Schulter-Begleiter
  { id: 'pet_cat',    name: 'Mini-Katze',   type: 'pet', rarity: 'common',    pet: 'cat' },
  { id: 'pet_slime',  name: 'Schleimi',     type: 'pet', rarity: 'common',    pet: 'slime' },
  { id: 'pet_parrot', name: 'Papagei',      type: 'pet', rarity: 'rare',      pet: 'parrot' },
  { id: 'pet_robot',  name: 'Robo',         type: 'pet', rarity: 'rare',      pet: 'robot' },
  { id: 'pet_ghost',  name: 'Geisterchen',  type: 'pet', rarity: 'epic',      pet: 'ghost' },
  { id: 'pet_dragon', name: 'Baby-Drache',  type: 'pet', rarity: 'legendary', pet: 'dragon' },
  // Nametag-Effekte (animiert)
  { id: 'nt_float',  name: 'Schwebend', type: 'nametag', rarity: 'common',  style: { kind: 'gradient', colors: ['#a5f3fc', '#e0f2fe'], fx: ['float'] } },
  { id: 'nt_spin',   name: 'Rotor',     type: 'nametag', rarity: 'rare',    style: { kind: 'solid',    colors: ['#ffffff'],            fx: ['spin'] } },
  { id: 'nt_glitch', name: 'Glitch',    type: 'nametag', rarity: 'epic',    style: { kind: 'solid',    colors: ['#67e8f9'],            fx: ['glitch'] } },
  { id: 'nt_orbit',  name: 'Wirbel',    type: 'nametag', rarity: 'epic',    style: { kind: 'rainbow',  colors: [],                     fx: ['spin'] } },
  // Auren (Partikel um die Figur)
  { id: 'aura_sparks', name: 'Funken',  type: 'aura', rarity: 'common', aura: 'sparks' },
  { id: 'aura_snow',   name: 'Schnee',  type: 'aura', rarity: 'common', aura: 'snow' },
  { id: 'aura_stars',  name: 'Sterne',  type: 'aura', rarity: 'rare',   aura: 'stars' },
  { id: 'aura_hearts', name: 'Herzen',  type: 'aura', rarity: 'rare',   aura: 'hearts' },
  { id: 'aura_flames', name: 'Flammen', type: 'aura', rarity: 'epic',   aura: 'flames' },
  // Badges (Symbol neben dem Namen)
  { id: 'badge_bolt',  name: 'Blitz',      type: 'badge', rarity: 'common',    badge: 'bolt' },
  { id: 'badge_heart', name: 'Herz',       type: 'badge', rarity: 'common',    badge: 'heart' },
  { id: 'badge_star',  name: 'Stern',      type: 'badge', rarity: 'rare',      badge: 'star' },
  { id: 'badge_skull', name: 'Totenkopf',  type: 'badge', rarity: 'rare',      badge: 'skull' },
  { id: 'badge_crown', name: 'Krone',      type: 'badge', rarity: 'legendary', badge: 'crown' },
  // Neu: weitere Cosmetics
  { id: 'nt_pulse',   name: 'Pulsieren',  type: 'nametag', rarity: 'common',    style: { kind: 'solid',    colors: ['#fca5a5'],                       fx: ['pulse'] } },
  { id: 'nt_neon',    name: 'Neon',       type: 'nametag', rarity: 'rare',      style: { kind: 'glow',     colors: ['#22d3ee'],                       fx: ['pulse'] } },
  { id: 'nt_wave',    name: 'Welle',      type: 'nametag', rarity: 'rare',      style: { kind: 'gradient', colors: ['#f472b6', '#818cf8'],            fx: ['float'] } },
  { id: 'nt_inferno', name: 'Inferno',    type: 'nametag', rarity: 'legendary', style: { kind: 'gradient', colors: ['#fde047', '#f97316', '#ef4444'], fx: ['pulse', 'float'] } },
  { id: 'aura_embers', name: 'Glut',      type: 'aura',    rarity: 'epic',      aura: 'embers' },
  { id: 'badge_moon',  name: 'Mond',      type: 'badge',   rarity: 'rare',      badge: 'moon' },
  { id: 'badge_flame', name: 'Flamme',    type: 'badge',   rarity: 'epic',      badge: 'flame' },
  { id: 'nt_ice',     name: 'Eis',        type: 'nametag', rarity: 'common',    style: { kind: 'gradient', colors: ['#e0f2fe', '#38bdf8'],            fx: ['float'] } },
  { id: 'nt_toxic',   name: 'Toxisch',    type: 'nametag', rarity: 'rare',      style: { kind: 'glow',     colors: ['#84cc16'],                       fx: ['glitch'] } },
  { id: 'nt_royal',   name: 'Royal',      type: 'nametag', rarity: 'epic',      style: { kind: 'gradient', colors: ['#fde68a', '#f59e0b', '#fde68a'], fx: ['pulse'] } },
  { id: 'nt_void',    name: 'Void',       type: 'nametag', rarity: 'legendary', style: { kind: 'gradient', colors: ['#a78bfa', '#0f0f1a', '#a78bfa'], fx: ['spin', 'pulse'] } },
  { id: 'aura_leaves', name: 'Blätter',   type: 'aura',    rarity: 'common',    aura: 'leaves' },
  { id: 'aura_notes',  name: 'Noten',     type: 'aura',    rarity: 'rare',      aura: 'notes' },
  { id: 'aura_void',   name: 'Void-Funken', type: 'aura',  rarity: 'legendary', aura: 'void' },
  { id: 'badge_leaf',  name: 'Blatt',     type: 'badge',   rarity: 'common',    badge: 'leaf' },
  { id: 'badge_shield', name: 'Schild',   type: 'badge',   rarity: 'rare',      badge: 'shield' },
  { id: 'badge_eye',   name: 'Auge',      type: 'badge',   rarity: 'epic',      badge: 'eye' },
  // Mythic (nur aus Crates)
  { id: 'nt_mythic',    name: 'Singularität',   type: 'nametag', rarity: 'mythic', style: { kind: 'rainbow', colors: [], fx: ['spin', 'float'] } },
  { id: 'aura_galaxy',  name: 'Galaxie',        type: 'aura',    rarity: 'mythic', aura: 'galaxy' },
  { id: 'badge_diamond', name: 'Diamant',       type: 'badge',   rarity: 'mythic', badge: 'diamond' },
  { id: 'pet_phoenix',  name: 'Phönix',         type: 'pet',     rarity: 'mythic', pet: 'phoenix' },
  // Neue Capes: animiert (anim) und statisch
  // Secret – werden nur als „Secret“ angezeigt und erscheinen im Inventar erst, wenn man sie hat
  { id: 'cape_aurora',   name: 'Polarlicht',         type: 'cape',    rarity: 'secret',    colors: ['#34d399', '#6366f1'], pattern: 'aurora', anim: true },
  { id: 'cape_void',     name: 'Leere',              type: 'cape',    rarity: 'secret',    colors: ['#1e1b4b', '#a78bfa'], pattern: 'void', anim: true },
  { id: 'cape_matrix',   name: 'Code-Regen',         type: 'cape',    rarity: 'secret',    colors: ['#022c22', '#4ade80'], pattern: 'matrix', anim: true },
  { id: 'cape_inferno',  name: 'Inferno',            type: 'cape',    rarity: 'secret',    colors: ['#450a0a', '#fde047'], pattern: 'inferno', anim: true },
  { id: 'nt_zero',       name: 'Null',               type: 'nametag', rarity: 'secret',    style: { kind: 'rainbow', colors: [], fx: ['glitch', 'spin'] } },
  // Mehr Cosmetics
  { id: 'nt_ice',        name: 'Eiskristall',        type: 'nametag', rarity: 'rare',      style: { kind: 'gradient', colors: ['#bae6fd', '#38bdf8'], fx: ['float'] } },
  { id: 'nt_lava',       name: 'Lava',               type: 'nametag', rarity: 'epic',      style: { kind: 'gradient', colors: ['#fde047', '#ef4444'], fx: ['pulse'] } },
  { id: 'nt_galaxy',     name: 'Galaxie',            type: 'nametag', rarity: 'legendary', style: { kind: 'gradient', colors: ['#a78bfa', '#22d3ee'], fx: ['spin', 'float'] } },
  { id: 'nt_royal',      name: 'Königlich',          type: 'nametag', rarity: 'epic',      style: { kind: 'gradient', colors: ['#fbbf24', '#7c3aed'], fx: ['pulse', 'float'] } },
  { id: 'nt_toxic',      name: 'Toxisch',            type: 'nametag', rarity: 'rare',      style: { kind: 'gradient', colors: ['#bef264', '#16a34a'], fx: ['glitch'] } },
  { id: 'aura_flames',   name: 'Flammen',            type: 'aura',    rarity: 'epic',      aura: 'sparks' },
  { id: 'aura_frost',    name: 'Frost',              type: 'aura',    rarity: 'rare',      aura: 'snow' },
  { id: 'pet_fox',       name: 'Fuchs',              type: 'pet',     rarity: 'epic',      pet: 'fox' },
  { id: 'pet_blob',      name: 'Gelbi',              type: 'pet',     rarity: 'common',    pet: 'slime' },
  // Rift+ (monatliche Exklusiv-Cosmetics für Abonnenten)
  { id: 'plus_01', name: 'Eisdrache',        type: 'cape',    rarity: 'plus', colors: ['#bae6fd', '#0369a1'], pattern: 'wave', anim: true },
  { id: 'plus_02', name: 'Herzensbrecher',   type: 'nametag', rarity: 'plus', style: { kind: 'gradient', colors: ['#fb7185', '#be123c'], fx: ['pulse'] } },
  { id: 'plus_03', name: 'Frühlingshauch',   type: 'aura',    rarity: 'plus', aura: 'sparks' },
  { id: 'plus_04', name: 'Regenbogenwolke',  type: 'cape',    rarity: 'plus', colors: ['#f472b6', '#22d3ee'], pattern: 'prism', anim: true },
  { id: 'plus_05', name: 'Kolibri',          type: 'pet',     rarity: 'plus', pet: 'parrot' },
  { id: 'plus_06', name: 'Sommerblitz',      type: 'nametag', rarity: 'plus', style: { kind: 'gradient', colors: ['#fde047', '#f97316'], fx: ['pulse', 'glitch'] } },
  { id: 'plus_07', name: 'Sonnenwende',      type: 'cape',    rarity: 'plus', colors: ['#f59e0b', '#fef3c7'], pattern: 'gold', anim: true },
  { id: 'plus_08', name: 'Schwert-Surfer',   type: 'emote',   rarity: 'plus', emote: 'sword_surf', icon: '🗡️', colors: ['#38bdf8', '#1e3a8a'] },
  { id: 'plus_09', name: 'Herbstwind',       type: 'cape',    rarity: 'plus', colors: ['#f97316', '#78350f'], pattern: 'embers', anim: true },
  { id: 'plus_10', name: 'Hexenkessel',      type: 'emote',   rarity: 'plus', emote: 'cauldron', icon: '🧪', colors: ['#22c55e', '#14532d'] },
  { id: 'plus_11', name: 'Nebelgeist',       type: 'aura',    rarity: 'plus', aura: 'void' },
  { id: 'plus_12', name: 'Polarstern',       type: 'cape',    rarity: 'plus', colors: ['#1e3a8a', '#e0f2fe'], pattern: 'stars', anim: true },
  // Emotes (Emote-Wheel im Spiel, Taste B)
  { id: 'emote_wave',    name: 'Winken',        type: 'emote', rarity: 'common',    emote: 'wave',    icon: '👋', base: true, colors: ['#60a5fa', '#1e3a8a'] },
  { id: 'emote_dance',   name: 'Tanz',          type: 'emote', rarity: 'common',    emote: 'dance',   icon: '💃', base: true, colors: ['#f472b6', '#831843'] },
  { id: 'emote_bow',     name: 'Verbeugung',    type: 'emote', rarity: 'common',    emote: 'bow',     icon: '🙇', colors: ['#a3a3a3', '#262626'] },
  { id: 'emote_clap',    name: 'Applaus',       type: 'emote', rarity: 'rare',      emote: 'clap',    icon: '👏', colors: ['#fbbf24', '#78350f'] },
  { id: 'emote_flex',    name: 'Muskeln',       type: 'emote', rarity: 'rare',      emote: 'flex',    icon: '💪', colors: ['#f87171', '#7f1d1d'] },
  { id: 'emote_spin',    name: 'Pirouette',     type: 'emote', rarity: 'epic',      emote: 'spin',    icon: '🌀', colors: ['#a78bfa', '#4c1d95'] },
  { id: 'emote_victory', name: 'Siegerpose',    type: 'emote', rarity: 'epic',      emote: 'victory', icon: '🏆', colors: ['#fde047', '#a16207'] },
  { id: 'emote_ghost',   name: 'Geisterflug',   type: 'emote', rarity: 'event', event: 'halloween', free: true, emote: 'ghost',   icon: '👻', colors: ['#e5e7eb', '#4b5563'] },
  { id: 'emote_pumpkin', name: 'Kürbis-Wurf',   type: 'emote', rarity: 'event', event: 'halloween', free: true, emote: 'pumpkin', icon: '🎃', colors: ['#fb923c', '#7c2d12'] },
  { id: 'pet_fox2',    name: 'Rotfuchs',     type: 'pet', rarity: 'epic',      pet: 'fox' },
  { id: 'pet_panda',   name: 'Panda',        type: 'pet', rarity: 'epic',      pet: 'panda' },
  { id: 'pet_owl',     name: 'Eule',         type: 'pet', rarity: 'rare',      pet: 'owl' },
  { id: 'pet_bunny',   name: 'Häschen',      type: 'pet', rarity: 'common',    pet: 'bunny' },
  { id: 'pet_penguin', name: 'Pinguin',      type: 'pet', rarity: 'rare',      pet: 'penguin' },
  { id: 'pet_bee',     name: 'Biene',        type: 'pet', rarity: 'common',    pet: 'bee' },
  { id: 'pet_axolotl', name: 'Axolotl',      type: 'pet', rarity: 'legendary', pet: 'axolotl' },
  { id: 'pet_wolf',    name: 'Wolfwelpe',    type: 'pet', rarity: 'epic',      pet: 'wolf' },
  // Rift+ Shop: animierte Capes (nur Rift+, gekauft mit Coins)
  { id: 'plusa_01', name: 'Nordlicht Live',   type: 'cape', rarity: 'plus', plusShop: 1500, colors: ['#22d3ee', '#7c3aed'], pattern: 'aurora', anim: true },
  { id: 'plusa_02', name: 'Plasma Pulse',     type: 'cape', rarity: 'plus', plusShop: 1500, colors: ['#f472b6', '#4f46e5'], pattern: 'plasma', anim: true },
  { id: 'plusa_03', name: 'Inferno Flow',     type: 'cape', rarity: 'plus', plusShop: 1800, colors: ['#fde047', '#dc2626'], pattern: 'inferno', anim: true },
  { id: 'plusa_04', name: 'Matrix Regen',     type: 'cape', rarity: 'plus', plusShop: 1800, colors: ['#22c55e', '#052e16'], pattern: 'matrix', anim: true },
  { id: 'plusa_05', name: 'Prisma Wirbel',    type: 'cape', rarity: 'plus', plusShop: 2200, colors: ['#f0abfc', '#38bdf8'], pattern: 'prism', anim: true },
  { id: 'plusa_06', name: 'Blitzgewitter',    type: 'cape', rarity: 'plus', plusShop: 2200, colors: ['#1e1b4b', '#facc15'], pattern: 'lightning', anim: true },
  // Halloween-Pass Premium-Items
  { id: 'cape_hexen2',   name: 'Hexenkessel-Cape',   type: 'cape',    rarity: 'event', event: 'halloween', pass: 'premium', colors: ['#a855f7', '#1e1b4b'], pattern: 'lightning', anim: true },
  { id: 'nt_reaper',     name: 'Sensenmann',         type: 'nametag', rarity: 'event', event: 'halloween', pass: 'premium', style: { kind: 'gradient', colors: ['#f97316', '#111827'], fx: ['glitch', 'pulse'] } },
  { id: 'aura_cauldron', name: 'Kessel-Dampf',       type: 'aura',    rarity: 'event', event: 'halloween', pass: 'premium', aura: 'void' },
  { id: 'pet_ghost',     name: 'Mini-Geist',         type: 'pet',     rarity: 'event', event: 'halloween', pass: 'premium', pet: 'slime' },
  // Event: Halloween (free = gratis abholbar, solange das Event läuft; alle auch in der Halloween-Crate)
  { id: 'nt_bat',        name: 'Fledermaus',         type: 'nametag', rarity: 'event', event: 'halloween', free: true, style: { kind: 'gradient', colors: ['#fb923c', '#a855f7'], fx: ['bat'] } },
  { id: 'aura_bats',     name: 'Fledermaus-Schwarm', type: 'aura',    rarity: 'event', event: 'halloween', free: true, aura: 'bats' },
  { id: 'pet_pumpkin',   name: 'Kürbis',             type: 'pet',     rarity: 'event', event: 'halloween', free: true, pet: 'pumpkin' },
  { id: 'cape_witch',    name: 'Hexenmantel',        type: 'cape',    rarity: 'event', event: 'halloween', colors: ['#f97316', '#1f0a2e'], pattern: 'stripes' },
  { id: 'nt_spooky',     name: 'Spooky',             type: 'nametag', rarity: 'event', event: 'halloween', style: { kind: 'glow', colors: ['#fb923c'], fx: ['glitch'] } },
  { id: 'nt_ghosty',     name: 'Ghosty',             type: 'nametag', rarity: 'event', event: 'halloween', style: { kind: 'glow', colors: ['#e5e7eb'], fx: ['float'] } },
  { id: 'nt_blood',      name: 'Blutrot',            type: 'nametag', rarity: 'event', event: 'halloween', style: { kind: 'gradient', colors: ['#7f1d1d', '#ef4444', '#7f1d1d'], fx: ['pulse'] } },
  { id: 'nt_candy',      name: 'Candy Corn',         type: 'nametag', rarity: 'event', event: 'halloween', style: { kind: 'gradient', colors: ['#fde047', '#fb923c', '#fafafa'], fx: [] } },
  { id: 'nt_witchy',     name: 'Hexenbrut',          type: 'nametag', rarity: 'event', event: 'halloween', style: { kind: 'gradient', colors: ['#a855f7', '#4ade80'], fx: ['glitch'] } },
  { id: 'cape_pumpkin',  name: 'Kürbisfeld',         type: 'cape',    rarity: 'event', event: 'halloween', colors: ['#f97316', '#111827'], pattern: 'checker' },
  { id: 'cape_ghost',    name: 'Geisterlaken',       type: 'cape',    rarity: 'event', event: 'halloween', colors: ['#f3f4f6', '#9ca3af'], pattern: 'dots' },
  { id: 'cape_vampire',  name: 'Vampirumhang',       type: 'cape',    rarity: 'event', event: 'halloween', colors: ['#7f1d1d', '#0a0a0a'], pattern: 'stripes' },
  { id: 'badge_ghost',   name: 'Geist',              type: 'badge',   rarity: 'event', event: 'halloween', badge: 'skull' }
];
const ITEMS = ITEMS_ALL.filter((i, n, arr) => arr.findIndex((o) => o.id === i.id) === n).filter((i) => i.type !== 'badge' && i.pet !== 'robot' && i.pet !== 'phoenix');   // Badges gibt es nicht mehr – vor jedem Nametag steht das Rift-Logo
/* Events: Zeitraum als MM-TT (lokale Zeit des Spielers) */
const EVENTS = { halloween: { name: 'Halloween', from: '10-15', to: '11-02' } };
const eventActive = (k) => { const e = EVENTS[k]; if (!e) return false; const d = new Date(); const md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return md >= e.from && md <= e.to; };
const EDITOR_PRICE = 500, MAX_CUSTOM_CAPES = 12;
const SKIN_PRICE = { common: 150, rare: 350, epic: 800, legendary: 1800 };   // mythic & event: nur Crates (bzw. Gratis-Abholung)   // Direktkauf (Skins, Nametags, Pets)
const DUPLICATE_REFUND = { common: 20, rare: 60, epic: 150, legendary: 400, mythic: 1200, event: 80, secret: 3000, plus: 3000 };
const CRATES = [
  { id: 'common',    name: 'Common Crate',    price: 100,  weights: { common: 76, rare: 20, epic: 4 } },
  { id: 'rare',      name: 'Rare Crate',      price: 300,  weights: { common: 37.8, rare: 46, epic: 14, legendary: 2, secret: 0.2 } },
  { id: 'epic',      name: 'Epic Crate',      price: 700,  weights: { rare: 41.5, epic: 46, legendary: 11, mythic: 1, secret: 0.5 } },
  { id: 'legendary', name: 'Legendary Crate', price: 1500, weights: { epic: 49, legendary: 44, mythic: 6, secret: 1 } },
  { id: 'mythic',    name: 'Mythic Crate',    price: 4000, weights: { legendary: 70, mythic: 27, secret: 3 } },
  { id: 'halloween', name: 'Halloween Crate', price: 250,  event: 'halloween', weights: { event: 69, rare: 14, epic: 10, legendary: 5, mythic: 1, secret: 1 } }
];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
const defaultState = () => ({
  account: null,   // { type:'ms'|'offline', name, uuid, refresh? }
  profiles: [],
  selectedProfile: null,
  coins: 250,
  owned: [],
  equipped: { cape: null, skin: null, nametag: null, pet: null, aura: null, badge: null },
  editorUnlocked: false,
  customCapes: [],
  lastDaily: 0,
  daily: { last: '', streak: 0 },
  crateInv: {},
  updatedTo: '',
  seen: [],
  settings: { ram: 4, javaPath: '', closeOnLaunch: false, lang: 'de', accent: 'white', bg: 'black', launchAnim: false, fullscreen: true }
});
let state = defaultState();
try { state = { ...defaultState(), ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; } catch {}
state.settings = { ram: 4, javaPath: '', closeOnLaunch: false, lang: 'de', accent: 'white', bg: 'black', fullscreen: true, ...state.settings };
state.equipped = { cape: null, skin: null, nametag: null, pet: null, aura: null, badge: null, ...state.equipped }; state.equipped.badge = null; if (state.equipped.pet === 'pet_robot' || state.equipped.pet === 'pet_phoenix') state.equipped.pet = null;
if (state.account && state.account.type !== 'ms') state.account = null; // Offline-Modus gibt es nicht mehr
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

let win;
let overlay = null;
const send = (ch, data) => { if (win && !win.isDestroyed()) win.webContents.send(ch, data); if (/^(lserver|game|invite):/.test(ch) && overlay) overlay.forward(ch, data); };
const plusOn = () => !!(state.plus && state.plus.active);
const dp = (p) => (plusOn() ? Math.ceil(p * 0.8) : p);   // Rift+: 20 % Rabatt
const publicState = () => ({ cloudApi: state.cloudApi || '', cfSet: !!cfKey(),
  ...state,
  account: state.account && { type: state.account.type, name: state.account.name, uuid: state.account.uuid },
  feedRepo: (CONFIG.feedRepo && !String(CONFIG.feedRepo).startsWith('OWNER')) ? CONFIG.feedRepo : '', appVersion: curVersion(),
  items: ITEMS, crates: CRATES.map((c) => ({ ...c, price: dp(c.price) })), skinPrices: Object.fromEntries(Object.entries(SKIN_PRICE).map(([k, v]) => [k, dp(v)])), editorPrice: dp(EDITOR_PRICE),
  emoteWheel: state.emoteWheel || [],
  plus: { active: plusOn(), color: state.settings?.plusColor || '#22c55e', since: state.plus?.since || 0, claimedMonth: state.plus?.claimedMonth || '' }, payTest: !!state.payTest,
  daily: { ...dailyInfo(), rewards: DAILY_REWARDS },
  events: Object.fromEntries(Object.entries(EVENTS).map(([k, e]) => [k, { ...e, active: eventActive(k) }]))
});

/* ------------------------------------------------------------------ */
/* Ankündigungs-Feed (Rift Launcher Controls)                            */
/* ------------------------------------------------------------------ */
let lastFeed = [];
const activeAnn = (list) => (list || []).filter((a) => (!a.beta || state.settings?.betaUpdates) && (!a.startsAt || new Date(a.startsAt) <= new Date()) && (!a.expiresAt || new Date(a.expiresAt) > new Date()));
const verNum = (v) => String(v || '0').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
const isNewer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
const curVersion = () => (HOT && isNewer(HOT.version, app.getVersion()) ? HOT.version : app.getVersion());
const ignoredMaint = new Set();                                  // Admin hat die Wartung bei sich ausgeblendet
const blockingAnn = () => activeAnn(lastFeed).find((a) => !ignoredMaint.has(a.id) && (a.type === 'maintenance' || (a.type === 'countdown' && a.mode === 'locked' && new Date(a.endsAt) > new Date()) || (a.type === 'update' && a.mandatory && isNewer(a.version, curVersion()))));
let feedInfo = { ok: false, text: 'noch nicht geprüft' };
const cloudApiRaw = () => String(state.settings.cosmeticsApi || state.cloudApi || CONFIG.cosmeticsApi || '');
/* Cloud-Adresse vom Admin (Datei cloud.json im Feed-Repo): gilt fuer alle Spieler und bleibt nach Updates erhalten */
async function syncCloud() {
  const repo = CONFIG.feedRepo, br = CONFIG.branch || 'main'; if (!repo || repo.startsWith('OWNER')) return;
  const r = await fetch(`https://raw.githubusercontent.com/${repo}/${br}/cloud.json?t=${Date.now()}`, { headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache' } });
  if (!r.ok) return; const j = await r.json(); const u = String(j.api || '').trim().replace(/\/$/, '');
  if (/^https:\/\/[\w.-]+(\/.*)?$/.test(u) && u !== state.cloudApi) { state.cloudApi = u; save(); }
  const ck = String(j.cfKey || '').trim(); if (ck !== (state.cfKey || '')) { state.cfKey = ck; save(); }
}
async function fetchFeed() {
  const repo = CONFIG.feedRepo;
  if (!repo || repo.startsWith('OWNER')) { feedInfo = { ok: false, text: 'Kein Feed-Repo eingestellt.' }; return []; }
  const file = CONFIG.file || 'announcements.json', br = CONFIG.branch || 'main';
  const tries = [
    [`https://raw.githubusercontent.com/${repo}/${br}/${file}?t=${Date.now()}`, {}],                    // schnell, aber GitHub-CDN kann bis zu 5 Min. alt sein
    [`https://api.github.com/repos/${repo}/contents/${file}?ref=${br}`, { Accept: 'application/vnd.github.raw+json' }]   // immer aktuell (öffentliches Repo)
  ];
  let err = '';
  for (const [url, hd] of tries) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache', ...hd } });
      if (!r.ok) { err = `${r.status} bei ${url.includes('api.') ? 'GitHub-API' : 'raw'}${r.status === 404 ? ' (Repo privat oder Datei fehlt?)' : ''}`; continue; }
      const j = await r.json(); const list = Array.isArray(j.announcements) ? j.announcements : [];
      syncCloud().catch(() => {});
      lastFeed = list; feedInfo = { ok: true, at: Date.now(), count: list.length, text: `OK – ${list.length} Meldung(en) von ${url.includes('api.') ? 'GitHub-API' : 'raw'}`, repo, branch: br };
      return lastFeed;
    } catch (e) { err = e.message; }
  }
  feedInfo = { ok: false, at: Date.now(), text: 'Feed nicht erreichbar: ' + err, repo, branch: br };
  throw new Error(err);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
async function getJSON(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} bei ${url}`);
  return r.json();
}
async function download(url, dest) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`Download fehlgeschlagen (${r.status}): ${url}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}
const safeJoin = (base, rel) => {
  const full = path.resolve(base, rel);
  if (full !== path.resolve(base) && !full.startsWith(path.resolve(base) + path.sep)) throw new Error('Ungültiger Pfad im Paket: ' + rel);
  return full;
};
const profileDir = (p) => path.join(PROFILES_DIR, p.id);
const getProfile = (id) => state.profiles.find((p) => p.id === id);

/* ------------------------------------------------------------------ */
/* Java (automatischer Download von Temurin, passend zur MC-Version)                    */
/* ------------------------------------------------------------------ */
function javaMajor(bin) {
  return new Promise((res) => execFile(bin, ['-version'], (err, so, se) => {
    if (err) return res(0);
    const mm = /version "(\d+)(?:\.(\d+))?/.exec(String(se) + String(so));
    res(mm ? (mm[1] === '1' ? +mm[2] : +mm[1]) : 0);
  }));
}
/* welche Java-Version braucht diese Minecraft-Version? (steht im Mojang-Versions-JSON; neue Versionen brauchen z. B. Java 25) */
const javaNeedCache = {};
async function requiredJava(mcVersion) {
  if (javaNeedCache[mcVersion]) return javaNeedCache[mcVersion];
  let need = 21;
  try {
    const man = await getJSON('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
    const e = (man.versions || []).find((v) => v.id === mcVersion);
    if (e) { const j = await getJSON(e.url); need = Number(j.javaVersion?.majorVersion) || 21; }
    try { const f = path.join(DATA, 'javaneed.json'); const o = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; o[mcVersion] = need; fs.writeFileSync(f, JSON.stringify(o)); } catch {}
  } catch {   // offline: gemerkter Wert bzw. die lokale Versions-Datei
    need = 21;
    try { const o = JSON.parse(fs.readFileSync(path.join(DATA, 'javaneed.json'), 'utf8')); if (o[mcVersion]) need = o[mcVersion]; } catch {}
    try { const j = JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'versions', mcVersion, mcVersion + '.json'), 'utf8')); if (j.javaVersion?.majorVersion) need = Number(j.javaVersion.majorVersion); } catch {}
    return need;   // nicht cachen, damit es online neu geprüft wird
  }
  return (javaNeedCache[mcVersion] = need);
}
async function ensureJava(major = 21) {
  const custom = state.settings.javaPath;
  if (custom) { const mj = await javaMajor(custom); if (mj >= major) return custom; }   // zu alte eigene Java wird übergangen
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  const find = (dir) => {
    if (!fs.existsSync(dir)) return null;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) { if (dir === JAVA_DIR && /^jre-\d+$/.test(e.name)) continue; const r = find(f); if (r) return r; }
      else if (e.name === exe && path.basename(dir) === 'bin') return f;
    }
    return null;
  };
  const dir = path.join(JAVA_DIR, 'jre-' + major);
  let bin = find(dir) || (major === 21 ? find(JAVA_DIR) : null);
  if (bin && (await javaMajor(bin)) >= major) return bin;
  const osName = { win32: 'windows', darwin: 'mac', linux: 'linux' }[process.platform];
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x64';
  send('game:state', { status: 'java', text: `Lade Java ${major} herunter…` });
  const url = `https://api.adoptium.net/v3/binary/latest/${major}/ga/${osName}/${arch}/jre/hotspot/normal/eclipse`;
  const tmp = path.join(DATA, process.platform === 'win32' ? 'java.zip' : 'java.tar.gz');
  await download(url, tmp);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  if (process.platform === 'win32') new AdmZip(tmp).extractAllTo(dir, true);
  else await new Promise((res, rej) => execFile('tar', ['-xzf', tmp, '-C', dir], (e) => (e ? rej(e) : res())));
  fs.unlinkSync(tmp);
  bin = find(dir);
  if (!bin) throw new Error(`Java ${major} konnte nicht installiert werden. Bitte Java ${major} manuell in den Einstellungen angeben.`);
  if (process.platform !== 'win32') fs.chmodSync(bin, 0o755);
  return bin;
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */
let authCache = null; // { mclc, at }
async function msLogin() {
  const { Auth } = require('msmc');
  const authManager = new Auth('select_account');
  const xbox = await authManager.launch('electron');
  const mc = await xbox.getMinecraft();
  const mclc = mc.mclc();
  state.account = { type: 'ms', name: mc.profile.name, uuid: mc.profile.id, refresh: xbox.save() };
  authCache = { mclc, at: Date.now() };
  save();
}
let offlineLaunch = false;
const isOnline = () => require('dns').promises.lookup('api.github.com').then(() => true, () => false);
async function getAuthorization() {
  offlineLaunch = false;
  const acc = state.account;
  if (!acc) throw new Error('Nicht eingeloggt.');
  if (authCache && Date.now() - authCache.at < 50 * 60 * 1000) return authCache.mclc;
  const { Auth } = require('msmc');
  const authManager = new Auth('select_account');
  let mc;
  try {
    const xbox = await authManager.refresh(acc.refresh);
    mc = await xbox.getMinecraft();
    acc.refresh = xbox.save();
    save();
  } catch (e) {   // offline: gespeichertes Konto weiterverwenden – Start geht, Online-Server nicht
    if (!(await isOnline())) { offlineLaunch = true; return { access_token: '0', client_token: '0', uuid: acc.uuid, name: acc.name, user_properties: '{}', meta: { type: 'msa', demo: false } }; }
    throw e;
  }
  authCache = { mclc: mc.mclc(), at: Date.now() };
  return authCache.mclc;
}
const mcToken = async () => {
  if (state.account?.type !== 'ms') throw new Error('Nur mit einem Microsoft-Account möglich.');
  const a = await getAuthorization();
  return a.access_token;
};

/* ------------------------------------------------------------------ */
/* Mod-Loader                                                          */
/* ------------------------------------------------------------------ */
async function prepareLoader(profile, javaP) {
  const mc = profile.mcVersion;
  const result = { version: { number: mc, type: 'release' } };
  if (profile.loader === 'fabric' || profile.loader === 'quilt') {
    const base = profile.loader === 'fabric' ? 'https://meta.fabricmc.net/v2' : 'https://meta.quiltmc.org/v3';
    let lv = profile.loaderVersion;
    const localLoader = () => {   // offline: zuletzt installierte Loader-Version verwenden
      const pre = profile.loader + '-loader-', vd = path.join(GAME_ROOT, 'versions');
      const ids = fs.existsSync(vd) ? fs.readdirSync(vd).filter((d) => d.startsWith(pre) && d.endsWith('-' + mc) && fs.existsSync(path.join(vd, d, d + '.json'))) : [];
      return ids.sort((a, b) => fs.statSync(path.join(vd, b)).mtimeMs - fs.statSync(path.join(vd, a)).mtimeMs)[0];
    };
    if (!(await isOnline())) { const id = localLoader(); if (id) { result.version.custom = id; return result; } throw new Error('Offline: Diese Version wurde noch nie gestartet und muss einmal mit Internet geladen werden.'); }
    if (!lv) {
      const list = await getJSON(`${base}/versions/loader/${mc}`);
      if (!list.length) throw new Error(`${profile.loader} unterstützt Minecraft ${mc} nicht.`);
      lv = (list.find((e) => e.loader.stable !== false) || list[0]).loader.version;
    }
    const json = await getJSON(`${base}/versions/loader/${mc}/${lv}/profile/json`);
    const dir = path.join(GAME_ROOT, 'versions', json.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, json.id + '.json'), JSON.stringify(json));
    result.version.custom = json.id;
  } else if (profile.loader === 'forge') {
    const promos = await getJSON('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
    const fv = profile.loaderVersion || promos.promos[`${mc}-recommended`] || promos.promos[`${mc}-latest`];
    if (!fv) throw new Error(`Forge unterstützt Minecraft ${mc} nicht.`);
    const jar = path.join(GAME_ROOT, 'forge', `forge-${mc}-${fv}-installer.jar`);
    if (!fs.existsSync(jar)) {
      send('game:state', { status: 'loader', text: 'Lade Forge-Installer…' });
      await download(`https://maven.minecraftforge.net/net/minecraftforge/forge/${mc}-${fv}/forge-${mc}-${fv}-installer.jar`, jar);
    }
    result.forge = jar;
  } else if (profile.loader === 'neoforge') {
    // NeoForge: Installer-Jar laden und mit --installClient ins gemeinsame Spielverzeichnis installieren
    const parts = mc.split('.').map(Number);
    if (parts[1] < 20 || (parts[1] === 20 && (parts[2] || 0) < 2)) throw new Error('NeoForge gibt es nur für Minecraft 1.20.2 und neuer.');
    let nv = profile.loaderVersion;
    if (!nv) {
      const xml = await (await fetch('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml', { headers: { 'User-Agent': UA } })).text();
      const prefix = `${parts[1]}.${parts[2] || 0}.`;
      const all = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1]).filter((v) => v.startsWith(prefix));
      const stable = all.filter((v) => !/-(beta|alpha|rc)/i.test(v));
      nv = (stable.length ? stable : all).pop();
      if (!nv) throw new Error(`Keine NeoForge-Version für Minecraft ${mc} gefunden.`);
    }
    const id = `neoforge-${nv}`;
    if (!fs.existsSync(path.join(GAME_ROOT, 'versions', id, id + '.json'))) {
      const jar = path.join(GAME_ROOT, 'neoforge', `neoforge-${nv}-installer.jar`);
      if (!fs.existsSync(jar)) { send('game:state', { status: 'loader', text: 'Lade NeoForge-Installer…' }); await download(`https://maven.neoforged.net/releases/net/neoforged/neoforge/${nv}/neoforge-${nv}-installer.jar`, jar); }
      const lp = path.join(GAME_ROOT, 'launcher_profiles.json');
      if (!fs.existsSync(lp)) fs.writeFileSync(lp, JSON.stringify({ profiles: {}, clientToken: crypto.randomUUID(), launcherVersion: { name: 'RiftLauncher', format: 21 } }));
      const javaPath = await javaP;
      send('game:state', { status: 'loader', text: 'Installiere NeoForge (kann einige Minuten dauern)…' });
      await new Promise((resolve, reject) => {
        const pr = require('child_process').spawn(javaPath, ['-jar', jar, '--installClient', GAME_ROOT], { cwd: GAME_ROOT });
        const out = (b) => String(b).split(/\r?\n/).filter(Boolean).forEach((l) => send('game:log', '[NeoForge] ' + l));
        pr.stdout.on('data', out); pr.stderr.on('data', out);
        pr.on('error', reject);
        pr.on('close', (c) => (c === 0 ? resolve() : reject(new Error('NeoForge-Installation fehlgeschlagen (Code ' + c + '), siehe Log.'))));
      });
      if (!fs.existsSync(path.join(GAME_ROOT, 'versions', id, id + '.json'))) throw new Error('NeoForge wurde installiert, aber die Version wurde nicht gefunden: ' + id);
    }
    result.version.custom = id;
    try { const vj = JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'versions', id, id + '.json'), 'utf8')); send('game:log', `[NeoForge] ${id}: mainClass=${vj.mainClass}, inheritsFrom=${vj.inheritsFrom || '-'}, jvm-Argumente=${(vj.arguments?.jvm || []).length}`); } catch {}
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Spielstart                                                          */
/* ------------------------------------------------------------------ */
let launcher = null, gameProc = null;
/* PvP-Modus: schreibt für die Dauer des Spiels leichtere options.txt-Werte (Original wird danach zurückgeschrieben) */
let pvpBak = null;
function pvpApply(profile, wantFs) {
  pvpBak = null;
  try {
    const f = path.join(profileDir(profile), 'options.txt'); const o = overlay && overlay.cfg();
    const want = { ...(o && o.pvp ? require('./overlay.js').PVP : {}), pauseOnLostFocus: 'false', ...(wantFs ? { fullscreen: 'false' } : {}) };
    let txt = ''; try { txt = fs.readFileSync(f, 'utf8'); } catch {}
    const orig = {}; for (const l of txt.split(/\r?\n/)) { const i = l.indexOf(':'); if (i > 0) orig[l.slice(0, i)] = l.slice(i + 1); }
    pvpBak = { f, keys: Object.keys(want).map((k) => [k, k in orig ? orig[k] : null]), had: fs.existsSync(f) };
    const seen = new Set(); const out = txt.split(/\r?\n/).filter(Boolean).map((l) => { const k = l.split(':')[0]; if (k in want) { seen.add(k); return k + ':' + want[k]; } return l; });
    for (const k in want) if (!seen.has(k)) out.push(k + ':' + want[k]);
    fs.writeFileSync(f, out.join('\n') + '\n');
  } catch { pvpBak = null; }
}
/* stellt nur die von Rift geänderten Werte wieder her – Einstellungen, die du im Spiel geändert hast, bleiben erhalten */
function pvpRestore() {
  if (!pvpBak) return;
  try {
    let txt = ''; try { txt = fs.readFileSync(pvpBak.f, 'utf8'); } catch {}
    let lines = txt.split(/\r?\n/).filter(Boolean);
    for (const [k, v] of pvpBak.keys) { if (k === 'fullscreen') continue; lines = lines.filter((l) => l.split(':')[0] !== k); if (v !== null) lines.push(k + ':' + v); }
    fs.writeFileSync(pvpBak.f, lines.join('\n') + '\n');
  } catch {} pvpBak = null;
}
/* ---- Rift-Mod (Cosmetics im Spiel): wird automatisch geladen und ins Profil gelegt ---- */
const MOD_CACHE = path.join(DATA, 'rift-mod'); fs.mkdirSync(MOD_CACHE, { recursive: true });
const modFile = (mc, loader) => `rift-${mc}-${loader}.jar`;
async function fetchRiftMod(mc, loader) {   // true, wenn eine Mod-Datei (frisch oder aus dem Cache) vorliegt
  const repo = CONFIG.feedRepo || CONFIG.modRepo, f = path.join(MOD_CACHE, modFile(mc, loader));
  if (repo && !String(repo).startsWith('OWNER') && (await isOnline())) {
    try {
      const r = await fetch(`https://github.com/${repo}/releases/download/mod-latest/${modFile(mc, loader)}`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (r.ok) { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); return true; }
    } catch {}
  }
  if (!fs.existsSync(f)) { const b = path.join(__dirname, 'mod', modFile(mc, loader)); if (fs.existsSync(b)) { try { fs.copyFileSync(b, f); } catch {} } }   // mitgelieferte Datei als Fallback
  return fs.existsSync(f);
}
function installRiftMod(profile, mc, loader) {
  const dir = path.join(profileDir(profile), 'mods'); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^rift-.*\.jar$/i.test(f)) { try { fs.unlinkSync(path.join(dir, f)); } catch {} }
  fs.copyFileSync(path.join(MOD_CACHE, modFile(mc, loader)), path.join(dir, modFile(mc, loader)));
  const cfg = path.join(profileDir(profile), 'config'); fs.mkdirSync(cfg, { recursive: true });
  try {   // Cosmetics-Katalog fuer die Auswahl im Spiel
    let items = []; try { items = JSON.parse(fs.readFileSync(path.join(DATA, 'catalog.json'), 'utf8')); } catch {}
    const eq = state.equipped || {};
    fs.writeFileSync(path.join(cfg, 'rift-catalog.json'), JSON.stringify({ uuid: state.account?.uuid || '', plus: plusOn(), plusColor: state.settings?.plusColor || null, equipped: { cape: eq.cape || null, nametag: eq.nametag || null, aura: eq.aura || null, pet: eq.pet || null, badge: eq.badge || null }, items }));
  } catch {}
  fs.writeFileSync(path.join(cfg, 'rift-cosmetics.json'), JSON.stringify({ api: cloudApiRaw(), emotes: (state.emoteWheel || []).map((id) => ITEMS.find((i) => i.id === id)?.emote).filter(Boolean), emotesOwned: ITEMS.filter((i) => i.type === 'emote' && (i.base || state.owned.includes(i.id))).map((i) => i.emote) }));
}
/* Reimagined Intro (Modrinth, MIT) – immer dabei (Fabric/NeoForge) inkl. aller benoetigten Abhaengigkeiten (FancyMenu, Konkrete, Melody, Drippy, WaterMedia …). Einmal geladen, dann aus dem Cache. */
async function ensureIntroMod(profile, loader) {
  const mc = profile.mcVersion, dir = path.join(profileDir(profile), 'mods'); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^zz-intro-.*\.jar$/i.test(f) || /^zz-rift-intro\.jar$/i.test(f) || /^reimagined-?intro.*\.jar$/i.test(f)) { try { fs.unlinkSync(path.join(dir, f)); } catch {} }
  for (const d of ['fancymenu', 'fancymenu/customization', 'fancymenu/assets', 'fancymenu/panoramas', 'fancymenu/slideshows', 'drippyloadingscreen', 'watermedia']) { try { fs.mkdirSync(path.join(profileDir(profile), 'config', d), { recursive: true }); } catch {} }   // FancyMenu legt seine Ordner sonst nicht an (Crash "Pfad nicht gefunden")
  if (state.settings.introMod === false) return;
  const cdir = path.join(MOD_CACHE, `intro-${mc}-${loader}`), idx = path.join(cdir, 'index.json'); fs.mkdirSync(cdir, { recursive: true });
  let files = []; try { files = JSON.parse(fs.readFileSync(idx, 'utf8')); } catch {}
  if (!files.length || !files.every((f) => fs.existsSync(path.join(cdir, f)))) {
    const api = 'https://api.modrinth.com/v2', H = { headers: { 'User-Agent': UA } }, seen = new Set(), got = [];
    const pick = (vs) => (Array.isArray(vs) ? vs.find((v) => v.version_type === 'release') || vs[0] : vs);
    const byProject = async (p) => pick(await (await fetch(`${api}/project/${p}/version?loaders=${encodeURIComponent(JSON.stringify([loader]))}&game_versions=${encodeURIComponent(JSON.stringify([mc]))}`, H)).json());
    const walk = async (v, root) => {
      if (!v || seen.has(v.project_id)) return; seen.add(v.project_id);
      const fl = v.files || [], f = (root && fl.find((x) => /lite/i.test(x.filename))) || fl.find((x) => x.primary) || fl[0];
      if (f) { send('game:state', { status: 'loader', text: 'Lade Intro-Mods (einmalig): ' + f.filename }); const name = 'zz-intro-' + f.filename.replace(/[^\w.+-]/g, '_'); await download(f.url, path.join(cdir, name)); got.push(name); }
      for (const d of v.dependencies || []) {
        if (d.dependency_type !== 'required' || !d.project_id) continue;
        let dv = null; try { dv = d.version_id ? await (await fetch(`${api}/version/${d.version_id}`, H)).json() : null; } catch {}
        if (!dv || !dv.files) dv = await byProject(d.project_id).catch(() => null);
        if (!dv) { send('game:log', `[Intro] Abhaengigkeit ${d.project_id} nicht gefunden fuer ${mc}/${loader}`); continue; }
        await walk(dv, false);
      }
    };
    const root = await byProject('reimagined-intro'); if (!root) { send('game:log', `[Intro] Keine Version fuer ${mc}/${loader}.`); return; }
    await walk(root, true);
    files = got; fs.writeFileSync(idx, JSON.stringify(files));
  }
  for (const f of files) fs.copyFileSync(path.join(cdir, f), path.join(dir, f));
}
async function launchGame(profileId, server) {
  if (launcher) throw new Error('Das Spiel läuft bereits.');
  if (blockingAnn()) throw new Error('Der Start ist gerade gesperrt (Wartung oder Pflicht-Update).');
  const profile = getProfile(profileId);
  if (!profile) throw new Error('Kein Profil ausgewählt.');
  send('game:state', { status: 'starting', text: 'Bereite vor…' });
  try {
    const javaP = requiredJava(profile.mcVersion).then((mj) => ensureJava(mj));
    let lprof = profile, riftMod = null;                        // Vanilla gibt es nicht mehr: mit Rift-Mod läuft jedes Profil über Fabric
    if (state.settings.riftMod !== false && ['vanilla', 'fabric'].includes(profile.loader || 'vanilla') && (await fetchRiftMod(profile.mcVersion, 'fabric'))) { riftMod = 'fabric'; if (profile.loader !== 'fabric') lprof = { ...profile, loader: 'fabric' }; }
    else if (state.settings.riftMod !== false && profile.loader === 'neoforge' && (await fetchRiftMod(profile.mcVersion, 'neoforge'))) riftMod = 'neoforge';
    const [authorization, javaPath, loader] = await Promise.all([getAuthorization(), javaP, prepareLoader(lprof, javaP)]);
    if (riftMod) { try { await ensureIntroMod(profile, riftMod); } catch (e) { send('game:log', '[Intro] ' + e.message); } }
    if (riftMod) { try { installRiftMod(profile, profile.mcVersion, riftMod); } catch (e) { send('game:log', '[Rift-Mod] ' + e.message); } }
    fs.mkdirSync(profileDir(profile), { recursive: true });
    const useF11 = process.platform === 'win32' && state.settings.fullscreen !== false && !!(overlay && overlay.cfg().enabled);   // Vollbild erst nach dem Laden (F11), damit kein schwarzes Fenster aufblitzt
    pvpApply(profile, useF11);
    const opts = {
      authorization,
      root: GAME_ROOT,
      javaPath,
      version: loader.version,
      memory: { max: `${profile.ram || state.settings.ram}G`, min: '1G' },
      overrides: { gameDirectory: profileDir(profile), cwd: profileDir(profile) }
    };
    if (loader.forge) opts.forge = loader.forge;
    if (profile.loader === 'neoforge' && loader.version?.custom) {   // MCLC uebernimmt die JVM-Argumente der NeoForge-Version nicht: libraryDirectory & Co. selbst setzen (sonst "NeoForge installation is corrupted")
      try {
        const id = loader.version.custom, vj = JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'versions', id, id + '.json'), 'utf8')), libDir = path.join(GAME_ROOT, 'libraries'), out = [];
        const sub = (s) => String(s).replace(/\$\{library_directory\}/g, libDir).replace(/\$\{classpath_separator\}/g, path.delimiter).replace(/\$\{version_name\}/g, id).replace(/\$\{natives_directory\}/g, path.join(GAME_ROOT, 'natives'));
        let skip = false;
        for (const a of vj.arguments?.jvm || []) {
          if (typeof a !== 'string') continue;
          if (skip) { skip = false; continue; }
          if (a === '-cp' || a === '-classpath') { skip = true; continue; }
          if (a.includes('${classpath}') || /\$\{(launcher_name|launcher_version)\}/.test(a)) continue;
          out.push(sub(a));
        }
        if (!out.some((x) => x.startsWith('-DlibraryDirectory='))) out.push('-DlibraryDirectory=' + libDir);
        opts.customArgs = [...(opts.customArgs || []), ...out];
        send('game:log', '[NeoForge] JVM-Argumente: ' + out.map((x) => x.length > 90 ? x.slice(0, 90) + '…' : x).join(' '));
      } catch (e) { opts.customArgs = ['-DlibraryDirectory=' + path.join(GAME_ROOT, 'libraries')]; send('game:log', '[NeoForge] JVM-Argumente nicht lesbar: ' + e.message); }
    }
    if (state.settings.fullscreen !== false && !useF11) opts.window = { fullscreen: true };   // Fallback: direkt im Vollbild
    if (server && server.host) {                                // Server Hub: direkt auf den Server
      const host = String(server.host).replace(/[^a-z0-9.\-:]/gi, ''), port = Math.max(1, Math.min(65535, +server.port || 25565));
      const m = /^(\d+)\.(\d+)/.exec(profile.mcVersion || ''); const modern = m && (+m[1] >= 26 || (+m[1] === 1 && +m[2] >= 20));
      opts.customLaunchArgs = modern ? ['--quickPlayMultiplayer', `${host}:${port}`] : ['--server', host, '--port', String(port)];
    }
    launcher = new Client();
    launcher.on('arguments', () => { if (typeof spawnSig === 'function') spawnSig(); });      // Java wird gleich gestartet: Launcher-Animation erst jetzt zeigen
    const clean = (s) => String(s).replace(/(--accessToken\s+)\S+/g, '$1***');   // Token nie ins Log
    let spawnSent = false; const spawnSig = () => { if (!spawnSent) { spawnSent = true; send('game:spawn', true); if (state.settings.launchAnim && win && !win.isDestroyed()) { try { win.setAlwaysOnTop(true, 'screen-saver'); } catch {} } } };
    launcher.on('debug', (m) => { send('game:log', clean(m)); if (/Launching with arguments/i.test(String(m))) spawnSig(); });
    let winSent = false;
    const gameWindow = () => {                                  // Spielfenster ist da: kurz warten (Fenster ist erst schwarz), dann Animation beenden und Vollbild
      if (winSent) return; winSent = true;
      setTimeout(() => {
        send('game:window', true);
        if (state.settings.launchAnim && win && !win.isDestroyed()) { setTimeout(() => { try { win.setAlwaysOnTop(false); win.minimize(); } catch {} }, 350); }
        if (useF11 && overlay) overlay.fullscreenSoon();
      }, 1200);
    };
    launcher.on('data', (m) => { const s = clean(m); send('game:log', s); if (/Created window|Reloading ResourceManager|Using graphics (backend|device)/i.test(s)) gameWindow(); });
    setTimeout(gameWindow, 90000);                              // Sicherheitsnetz
    launcher.on('progress', (p) => send('game:progress', p));
    launcher.on('package-extract', () => send('game:state', { status: 'starting', text: 'Entpacke Dateien…' }));
    launcher.on('close', (code) => {
      const minutes = Math.min(120, Math.floor((Date.now() - startedAt) / 60000));
      if (minutes > 0) { state.coins += minutes; save(); passGain(5 * minutes, Math.floor(minutes / 2)); }
      launcher = null; try { overlay && overlay.stop(); pvpRestore(); if (win && !win.isDestroyed()) win.setAlwaysOnTop(false); } catch {}
      try { stats.record({ profile, start: startedAt, end: Date.now(), server }); } catch {}
      if (state.settings.launchAnim && win && !win.isDestroyed()) { try { win.restore(); win.show(); win.focus(); } catch {} }
      send('game:log', `— Minecraft beendet (Code ${code}) nach ${Math.round((Date.now() - startedAt) / 1000)} s —`);
      if (code !== 0) { try {                                   // Diagnose: letzte Zeilen aus logs/latest.log und neuester Crash-Report
        const dir = profileDir(profile); const lf = path.join(dir, 'logs', 'latest.log');
        if (fs.existsSync(lf)) send('game:log', '[latest.log]\n' + fs.readFileSync(lf, 'utf8').split(/\r?\n/).slice(-30).join('\n'));
        const cr = path.join(dir, 'crash-reports'); if (fs.existsSync(cr)) { const f = fs.readdirSync(cr).sort().pop(); if (f && Date.now() - fs.statSync(path.join(cr, f)).mtimeMs < 120000) send('game:log', '[' + f + ']\n' + fs.readFileSync(path.join(cr, f), 'utf8').split(/\r?\n/).slice(0, 25).join('\n')); }
      } catch {} }
      try {   // im Spiel geaenderte Cosmetics uebernehmen
        const ef = path.join(profileDir(profile), 'config', 'rift-equip.json');
        if (fs.existsSync(ef)) { const j = JSON.parse(fs.readFileSync(ef, 'utf8')); fs.unlinkSync(ef);
          for (const t of ['cape', 'nametag', 'aura', 'pet', 'badge']) if (t in j) { const id = j[t]; if (!id || state.owned.includes(id) || String(id).startsWith('custom:')) state.equipped[t] = id || null; }
          save(); }
      } catch {}
      send('game:state', { status: 'idle', text: '', code, earned: minutes, state: publicState() });
    });
    startedAt = Date.now();
    const proc = await launcher.launch(opts); gameProc = proc || null;
    if (!proc) { launcher = null; pvpRestore(); throw new Error('Minecraft konnte nicht gestartet werden (siehe Log).'); }
    passGain(10);
    try { overlay && overlay.start(proc.pid, profile, server); } catch {}
    send('game:state', { status: 'running', text: 'Minecraft läuft' });
    if (state.settings.closeOnLaunch) win.minimize();
    return true;
  } catch (e) {
    launcher = null; pvpRestore(); try { if (win && !win.isDestroyed()) win.setAlwaysOnTop(false); } catch {}
    send('game:state', { status: 'idle', text: '' });
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Modrinth                                                            */
/* ------------------------------------------------------------------ */
const MR = 'https://api.modrinth.com/v2';
const TYPE_DIR = { mod: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks', datapack: 'datapacks' };

async function mrSearch({ query, type, mcVersion, loader, offset = 0 }) {
  const facets = [[`project_type:${type}`]];
  if (mcVersion) facets.push([`versions:${mcVersion}`]);
  if (type === 'mod' && loader && loader !== 'vanilla') facets.push([`categories:${loader}`]);
  const qs = new URLSearchParams({ query: query || '', limit: '20', offset: String(offset), facets: JSON.stringify(facets) });
  return getJSON(`${MR}/search?${qs}`);
}

/* ---- CurseForge (braucht einen kostenlosen API-Key: console.curseforge.com; Admin traegt ihn ein) ---- */
const CF = 'https://api.curseforge.com/v1';
const cfKey = () => String(state.settings.cfKey || state.cfKey || CONFIG.curseforgeKey || '').trim();
const CF_CLASS = { mod: 6, modpack: 4471, resourcepack: 12, shader: 6552, datapack: 6945 };
const CF_LOADER = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 };
async function cfGet(p, opt = {}) {
  const k = cfKey(); if (!k) throw new Error('CurseForge ist noch nicht eingerichtet (Admin: Einstellungen → CurseForge-Key).');
  const r = await fetch(CF + p, { ...opt, headers: { 'x-api-key': k, Accept: 'application/json', 'User-Agent': UA, ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } });
  if (!r.ok) throw new Error('CurseForge ' + r.status + (r.status === 403 ? ' (Key ungültig?)' : '')); return r.json();
}
async function cfSearch({ query, type, mcVersion, loader }) {
  const qs = new URLSearchParams({ gameId: '432', classId: String(CF_CLASS[type] || 6), searchFilter: query || '', pageSize: '20', sortField: query ? '2' : '2', sortOrder: 'desc' });
  if (mcVersion) qs.set('gameVersion', mcVersion);
  if (type === 'mod' && loader && CF_LOADER[loader]) qs.set('modLoaderType', String(CF_LOADER[loader]));
  const j = await cfGet('/mods/search?' + qs);
  return { hits: (j.data || []).map((m) => ({ project_id: 'cf:' + m.id, title: m.name, author: m.authors?.[0]?.name || '?', description: m.summary, icon_url: m.logo?.thumbnailUrl || '', downloads: m.downloadCount || 0 })) };
}
const cfUrl = (f) => f.downloadUrl || `https://edge.forgecdn.net/files/${Math.floor(f.id / 1000)}/${f.id % 1000}/${encodeURIComponent(f.fileName)}`;
async function cfInstall(profile, modId, type, visited = new Set()) {
  if (visited.has(modId)) return []; visited.add(modId);
  const m = (await cfGet('/mods/' + modId)).data;
  const qs = new URLSearchParams({ gameVersion: profile.mcVersion, pageSize: '10' }); if (type === 'mod' && CF_LOADER[profile.loader]) qs.set('modLoaderType', String(CF_LOADER[profile.loader]));
  const files = (await cfGet(`/mods/${modId}/files?${qs}`)).data || [];
  const f = files.find((x) => x.releaseType === 1) || files[0]; if (!f) throw new Error(`„${m.name}“ hat keine Datei für ${profile.mcVersion} (${profile.loader}).`);
  const dest = safeJoin(path.join(profileDir(profile), TYPE_DIR[type] || 'mods'), f.fileName);
  send('install:progress', { text: `Installiere ${m.name}…` }); await download(cfUrl(f), dest);
  const pid = 'cf:' + modId; profile.installed = (profile.installed || []).filter((i) => i.projectId !== pid);
  profile.installed.push({ projectId: pid, title: m.name, type, file: path.relative(profileDir(profile), dest), icon: m.logo?.thumbnailUrl });
  const done = [m.name];
  for (const d of f.dependencies || []) if (d.relationType === 3) { try { done.push(...(await cfInstall(profile, d.modId, 'mod', visited))); } catch (e) { send('install:progress', { text: 'Abhängigkeit übersprungen: ' + e.message }); } }
  return done;
}
async function cfInstallModpack(modId) {
  const m = (await cfGet('/mods/' + modId)).data, files = (await cfGet(`/mods/${modId}/files?pageSize=5`)).data || [];
  const f = files.find((x) => x.releaseType === 1) || files[0]; if (!f) throw new Error('Keine Datei gefunden.');
  const tmp = path.join(DATA, 'tmp_' + crypto.randomBytes(4).toString('hex') + '.zip'); send('install:progress', { text: `Lade Modpack ${m.name}…` }); await download(cfUrl(f), tmp);
  try {
    const zip = new AdmZip(tmp), man = JSON.parse(zip.readAsText('manifest.json') || 'null'); if (!man || !man.files) throw new Error('Kein CurseForge-Modpack.');
    const ml = (man.minecraft.modLoaders.find((x) => x.primary) || man.minecraft.modLoaders[0] || {}).id || '', mm = /^(forge|fabric|quilt|neoforge)-(.+)$/.exec(ml);
    const profile = { id: crypto.randomUUID(), name: m.name.slice(0, 40), mcVersion: man.minecraft.version, loader: mm ? mm[1] : 'vanilla', loaderVersion: mm ? mm[2] : undefined, ram: state.settings.ram, installed: [{ projectId: 'cf:' + modId, title: m.name, type: 'modpack', icon: m.logo?.thumbnailUrl }] };
    const dir = profileDir(profile); fs.mkdirSync(path.join(dir, 'mods'), { recursive: true });
    const info = (await cfGet('/mods/files', { method: 'POST', body: JSON.stringify({ fileIds: man.files.map((x) => x.fileID) }) })).data || []; let i = 0;
    for (const x of info) { i++; send('install:progress', { text: `Modpack-Dateien ${i}/${info.length}` }); try { await download(cfUrl(x), safeJoin(path.join(dir, 'mods'), x.fileName)); } catch (e) { send('install:progress', { text: 'Übersprungen: ' + x.fileName }); } }
    const ov = (man.overrides || 'overrides') + '/'; for (const e of zip.getEntries()) { if (e.isDirectory || !e.entryName.startsWith(ov)) continue; const d = safeJoin(dir, e.entryName.slice(ov.length)); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, e.getData()); }
    state.profiles.push(profile); state.selectedProfile = profile.id; save(); return profile;
  } finally { try { fs.unlinkSync(tmp); } catch {} }
}
h('cf:search', (q) => cfSearch(q));
h('cf:install', async (profileId, modId, type) => { const p = getProfile(profileId); if (!p) throw new Error('Erst ein Profil anlegen/auswählen.'); const names = await cfInstall(p, String(modId).replace(/^cf:/, ''), type); save(); return { names, installed: p.installed }; });
h('cf:installModpack', async (modId) => { await cfInstallModpack(String(modId).replace(/^cf:/, '')); return publicState(); });
h('cf:ready', () => !!cfKey());

async function pickVersion(projectId, profile, type) {
  const qs = new URLSearchParams({ game_versions: JSON.stringify([profile.mcVersion]) });
  if (type === 'mod' && profile.loader !== 'vanilla') qs.set('loaders', JSON.stringify([profile.loader]));
  const versions = await getJSON(`${MR}/project/${projectId}/version?${qs}`);
  return versions.find((v) => v.version_type === 'release') || versions[0];
}

async function installProject(profile, projectId, type, visited = new Set()) {
  if (visited.has(projectId)) return [];
  visited.add(projectId);
  const proj = await getJSON(`${MR}/project/${projectId}`);
  const ptype = type || proj.project_type;
  if (!TYPE_DIR[ptype]) throw new Error('Typ nicht installierbar: ' + ptype);
  const v = await pickVersion(projectId, profile, ptype);
  if (!v) throw new Error(`„${proj.title}“ hat keine Version für ${profile.mcVersion} (${profile.loader}).`);
  const file = v.files.find((f) => f.primary) || v.files[0];
  const dest = safeJoin(path.join(profileDir(profile), TYPE_DIR[ptype]), file.filename);
  send('install:progress', { text: `Installiere ${proj.title}…` });
  await download(file.url, dest);
  profile.installed = (profile.installed || []).filter((i) => i.projectId !== projectId);
  profile.installed.push({ projectId, title: proj.title, type: ptype, file: path.relative(profileDir(profile), dest), icon: proj.icon_url });
  const done = [proj.title];
  for (const d of v.dependencies || []) {
    if (d.dependency_type === 'required' && d.project_id) {
      try { done.push(...(await installProject(profile, d.project_id, 'mod', visited))); } catch (e) { send('install:progress', { text: 'Abhängigkeit übersprungen: ' + e.message }); }
    }
  }
  return done;
}

async function installModpack(projectId) {
  const proj = await getJSON(`${MR}/project/${projectId}`);
  const versions = await getJSON(`${MR}/project/${projectId}/version`);
  const v = versions.find((x) => x.version_type === 'release') || versions[0];
  if (!v) throw new Error('Keine Version gefunden.');
  const file = v.files.find((f) => f.primary) || v.files[0];
  const tmp = path.join(DATA, 'tmp_' + crypto.randomBytes(4).toString('hex') + '.mrpack');
  send('install:progress', { text: `Lade Modpack ${proj.title}…` });
  await download(file.url, tmp);
  return importMrpack(tmp, proj.title, [{ projectId, title: proj.title, type: 'modpack', icon: proj.icon_url }]);
}
const dep0 = (i) => i.dependencies || {};
async function importMrpack(tmp, title, installed = []) {
  const zip = new AdmZip(tmp);
  const index = JSON.parse(zip.readAsText('modrinth.index.json') || 'null'); if (!index || !index.files) throw new Error('Das ist kein Modrinth-Modpack (.mrpack).');
  if (!dep0(index).minecraft) throw new Error('Im Modpack fehlt die Minecraft-Version.');
  const dep = index.dependencies || {};
  let loader = 'vanilla', loaderVersion;
  for (const [k, l] of [['fabric-loader', 'fabric'], ['quilt-loader', 'quilt'], ['forge', 'forge'], ['neoforge', 'neoforge']]) {
    if (dep[k]) { loader = l; loaderVersion = dep[k]; }
  }
  const profile = {
    id: crypto.randomUUID(), name: title, mcVersion: dep.minecraft, loader, loaderVersion,
    ram: state.settings.ram, installed
  };
  const dir = profileDir(profile);
  fs.mkdirSync(dir, { recursive: true });
  let i = 0;
  for (const f of index.files) {
    if (f.env && f.env.client === 'unsupported') continue;
    i++;
    send('install:progress', { text: `Modpack-Dateien ${i}/${index.files.length}` });
    await download(f.downloads[0], safeJoin(dir, f.path));
  }
  for (const prefix of ['overrides/', 'client-overrides/']) {
    for (const e of zip.getEntries()) {
      if (e.isDirectory || !e.entryName.startsWith(prefix)) continue;
      const dest = safeJoin(dir, e.entryName.slice(prefix.length));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, e.getData());
    }
  }
  fs.unlinkSync(tmp);
  state.profiles.push(profile); try { (() => { const ml = profile.loader === 'neoforge' ? 'neoforge' : 'fabric'; return fetchRiftMod(profile.mcVersion, ml).then((ok) => ok && installRiftMod(profile, profile.mcVersion, ml)); })().catch(() => {}); } catch {}   // Rift-Mod gleich beim Erstellen vorbereiten (unsichtbar)
  state.selectedProfile = profile.id;
  save();
  return profile;
}

/* ------------------------------------------------------------------ */
/* Skins & Capes (Minecraft Services API)                              */
/* ------------------------------------------------------------------ */
/* Skin/Cape des Spielers: wird hier geladen und als Data-URL geliefert (kein CORS-Problem im Renderer) */
async function pngDataUrl(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return 'data:image/png;base64,' + Buffer.from(await r.arrayBuffer()).toString('base64');
}
async function accountProfile() {
  let skins = [], capes = [];
  try {                                   // 1) offizielles Profil mit Login-Token (enthält auch deine Capes)
    const token = await mcToken();
    const p = await getJSON('https://api.minecraftservices.com/minecraft/profile', { headers: { Authorization: `Bearer ${token}` } });
    skins = (p.skins || []).map((x) => ({ url: x.url, variant: x.variant, state: x.state }));
    capes = (p.capes || []).map((x) => ({ url: x.url, alias: x.alias, state: x.state }));
  } catch {}
  if (!skins.length && state.account?.uuid) {   // 2) öffentlich über den Session-Server
    try {
      const p = await getJSON(`https://sessionserver.mojang.com/session/minecraft/profile/${state.account.uuid.replace(/-/g, '')}`);
      const tex = JSON.parse(Buffer.from(p.properties.find((x) => x.name === 'textures').value, 'base64').toString('utf8')).textures || {};
      if (tex.SKIN) skins = [{ url: tex.SKIN.url, variant: tex.SKIN.metadata?.model === 'slim' ? 'SLIM' : 'CLASSIC', state: 'ACTIVE' }];
      if (tex.CAPE) capes = [{ url: tex.CAPE.url, state: 'ACTIVE' }];
    } catch {}
  }
  const conv = async (list) => Promise.all(list.map(async (x) => { try { return { ...x, url: await pngDataUrl(x.url) }; } catch { return null; } })).then((a) => a.filter(Boolean));
  skins = await conv(skins); capes = await conv(capes);
  if (!skins.length && state.account?.uuid) {   // 3) letzter Ausweg
    try { skins = [{ url: await pngDataUrl(`https://crafatar.com/skins/${state.account.uuid}`), variant: 'CLASSIC', state: 'ACTIVE' }]; } catch {}
  }
  return { skins, capes };
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */
const h = (ch, fn) => ipcMain.handle(ch, async (_e, ...a) => {
  try { return { ok: true, data: await fn(...a) }; }
  catch (e) { return { ok: false, error: e.message || String(e) }; }
});

h('state:get', () => publicState());
h('auth:microsoft', async () => { await msLogin(); return publicState(); });
h('auth:logout', () => { state.account = null; authCache = null; save(); return publicState(); });

h('profiles:save', (p) => {
  if (!p.name || !p.mcVersion) throw new Error('Name und Version nötig.');
  const existing = p.id && getProfile(p.id);
  if (existing) Object.assign(existing, { name: p.name, mcVersion: p.mcVersion, loader: p.loader, ram: p.ram });
  else {
    const np = { id: crypto.randomUUID(), name: p.name, mcVersion: p.mcVersion, loader: p.loader || 'vanilla', ram: p.ram || 4, installed: [] };
    state.profiles.push(np); state.selectedProfile = np.id;
  }
  save(); return publicState();
});
h('profiles:delete', (id) => {
  const p = getProfile(id);
  if (p) fs.rmSync(profileDir(p), { recursive: true, force: true });
  state.profiles = state.profiles.filter((x) => x.id !== id);
  if (state.selectedProfile === id) state.selectedProfile = state.profiles[0]?.id || null;
  save(); return publicState();
});
h('profiles:select', (id) => { state.selectedProfile = id; save(); return publicState(); });
h('profiles:installed', (id) => getProfile(id)?.installed || []);
h('profiles:removeMod', (id, projectId) => {
  const p = getProfile(id);
  const item = p.installed.find((i) => i.projectId === projectId);
  if (item?.file) { try { fs.unlinkSync(safeJoin(profileDir(p), item.file)); } catch {} }
  p.installed = p.installed.filter((i) => i.projectId !== projectId);
  save(); return p.installed;
});

/* Mod-Updates: Modrinth kennt zu jedem Datei-Hash die neueste passende Version */
async function modUpdates(profile) {
  const items = (profile.installed || []).filter((i) => i.file && i.type === 'mod');
  const byHash = {};
  for (const i of items) { try { byHash[crypto.createHash('sha1').update(fs.readFileSync(safeJoin(profileDir(profile), i.file))).digest('hex')] = i; } catch {} }
  const hashes = Object.keys(byHash); if (!hashes.length) return [];
  const body = { hashes, algorithm: 'sha1', game_versions: [profile.mcVersion] };
  if (profile.loader !== 'vanilla') body.loaders = [profile.loader];
  const res = await getJSON(`${MR}/version_files/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const out = [];
  for (const [hash, v] of Object.entries(res || {})) {
    const f = v.files?.find((x) => x.primary) || v.files?.[0]; if (!f || f.hashes?.sha1 === hash) continue;
    if (!/^https:\/\/(cdn\.modrinth\.com|github\.com)\//.test(f.url)) continue;
    out.push({ projectId: byHash[hash].projectId, title: byHash[hash].title, to: v.version_number, file: f });
  }
  return out;
}
h('mods:check', async (id) => { const p = getProfile(id); if (!p) throw new Error('Profil nicht gefunden.'); return (await modUpdates(p)).map((u) => ({ projectId: u.projectId, title: u.title, to: u.to })); });
h('mods:update', async (id) => {
  const p = getProfile(id); if (!p) throw new Error('Profil nicht gefunden.');
  const list = await modUpdates(p); let n = 0;
  for (const u of list) {
    const item = p.installed.find((i) => i.projectId === u.projectId); const dest = safeJoin(path.join(profileDir(p), 'mods'), u.file.filename);
    await download(u.file.url, dest);
    if (u.file.hashes?.sha1 && crypto.createHash('sha1').update(fs.readFileSync(dest)).digest('hex') !== u.file.hashes.sha1) { fs.rmSync(dest, { force: true }); continue; }
    const old = safeJoin(profileDir(p), item.file); if (old !== dest) { try { fs.unlinkSync(old); } catch {} }
    item.file = path.relative(profileDir(p), dest); n++;
  }
  save(); return n;
});
h('profiles:openFolder', (id) => { const p = getProfile(id); fs.mkdirSync(profileDir(p), { recursive: true }); shell.openPath(profileDir(p)); });

h('versions:minecraft', async () => {
  const m = await getJSON('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
  return m.versions.filter((v) => v.type === 'release').map((v) => v.id);
});
/* Bilder der Updates: offizielle Patchnotes-Daten von Mojang (nur Verknüpfung, nichts wird mitgeliefert) */
let versionImages = null;
h('versions:images', async () => {
  if (versionImages) return versionImages;
  const out = { versions: {}, groups: {} };
  try {
    const j = await getJSON('https://launchercontent.mojang.com/v2/javaPatchNotes.json');
    for (const e of j.entries || []) {
      const u = e.image?.url; if (!u || !e.version) continue;
      const full = u.startsWith('http') ? u : 'https://launchercontent.mojang.com' + u;
      if (e.type && e.type !== 'release') continue;
      out.versions[e.version] = full;
      const g = String(e.version).split('.').slice(0, 2).join('.');
      if (!out.groups[g]) out.groups[g] = full;   // Liste ist neueste zuerst
    }
  } catch {}
  return (versionImages = out);
});
h('game:launch', (id, server) => launchGame(id, server));
h('net:check', () => isOnline());
h('game:stop', () => {
  const p = gameProc; if (!p) return false;
  try { if (process.platform === 'win32' && p.pid) require('child_process').exec('taskkill /pid ' + p.pid + ' /T /F'); else p.kill('SIGKILL'); } catch { try { p.kill(); } catch {} }
  return true;
});

h('modrinth:search', (q) => mrSearch(q));
h('modrinth:install', async (profileId, projectId, type) => {
  const p = getProfile(profileId);
  if (!p) throw new Error('Erst ein Profil anlegen/auswählen.');
  const names = await installProject(p, projectId, type);
  save();
  return { names, installed: p.installed };
});
h('modpack:importFile', async () => {   // eigene .mrpack-Datei (z. B. von Modrinth heruntergeladen)
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Modrinth-Modpack', extensions: ['mrpack'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const tmp = path.join(DATA, 'tmp_' + crypto.randomBytes(4).toString('hex') + '.mrpack'); fs.copyFileSync(r.filePaths[0], tmp);
  const nm = path.basename(r.filePaths[0]).replace(/\.mrpack$/i, '').slice(0, 40);
  try { await importMrpack(tmp, nm, [{ title: nm, type: 'modpack' }]); } finally { try { fs.unlinkSync(tmp); } catch {} }
  return publicState();
});
h('modrinth:installModpack', async (projectId) => { await installModpack(projectId); return publicState(); });

h('skin:account', () => accountProfile());
h('skin:apply', async ({ dataUrl, variant }) => {
  const token = await mcToken();
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const fd = new FormData();
  fd.append('variant', variant === 'slim' ? 'slim' : 'classic');
  fd.append('file', new Blob([buf], { type: 'image/png' }), 'skin.png');
  const r = await fetch('https://api.minecraftservices.com/minecraft/profile/skins', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA }, body: fd });
  if (!r.ok) throw new Error('Skin-Upload fehlgeschlagen: ' + r.status);
  return r.json();
});
h('cape:set', async (capeId) => {
  const token = await mcToken();
  const r = await fetch('https://api.minecraftservices.com/minecraft/profile/capes/active', {
    method: capeId ? 'PUT' : 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': UA },
    body: capeId ? JSON.stringify({ capeId }) : undefined
  });
  if (!r.ok) throw new Error('Cape ändern fehlgeschlagen: ' + r.status);
  return r.json();
});

/* ---- Shop ---- */
h('feed:get', async () => {
  let list = [];
  try { list = activeAnn(await fetchFeed()); } catch { list = activeAnn(lastFeed); }
  const eff = state.updatedTo && isNewer(state.updatedTo, curVersion()) ? state.updatedTo : curVersion();
  if (!state.feedInit && feedInfo.ok) {   // frische Installation: alte Meldungen und alte Updates nicht nachträglich anzeigen
    state.feedInit = true; state.seen = [...new Set([...(state.seen || []), ...list.filter((a) => a.type !== 'maintenance' && !a.showAfterInstall && !(a.type === 'update' && a.mandatory && isNewer(a.version, eff))).map((a) => a.id)])].slice(-200); save();
  }
  const nowT = Date.now(), upcoming = (lastFeed || []).filter((a) => a.type === 'update' && a.startsAt && new Date(a.startsAt) > nowT && new Date(a.startsAt) - nowT <= 864e5 && (!a.beta || state.settings?.betaUpdates) && isNewer(a.version, eff)).map((a) => ({ id: a.id, version: a.version, startsAt: a.startsAt, beta: !!a.beta }));
  return { announcements: list, upcoming, seen: state.seen, appVersion: eff, info: feedInfo };
});
/* Update-Dateien (Hot-Update): kleines ZIP mit main.js/preload.js/renderer – kein Installer nötig */
h('update:hot', async (url, version, sha256) => {
  const repo = CONFIG.feedRepo || '';
  if (!repo || !String(url).startsWith(`https://github.com/${repo}/releases/download/`)) throw new Error('Update-Quelle nicht erlaubt.');
  if (!/^\d+\.\d+\.\d+$/.test(String(version))) throw new Error('Ungültige Version.');
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('Download fehlgeschlagen: ' + r.status);
  const total = Number(r.headers.get('content-length')) || 0;
  const chunks = []; let got = 0; const reader = r.body.getReader();
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(Buffer.from(value)); got += value.length; send('update:progress', { pct: total ? Math.round((got / total) * 100) : 0 }); }
  send('update:progress', { pct: 100, phase: 'verify' });
  const buf = Buffer.concat(chunks);
  if (sha256 && require('crypto').createHash('sha256').update(buf).digest('hex') !== String(sha256).toLowerCase()) throw new Error('Prüfsumme stimmt nicht – Update abgebrochen.');
  send('update:progress', { pct: 100, phase: 'install' });
  const zip = new AdmZip(buf);
  const names = zip.getEntries().map((e) => e.entryName);
  if (!names.includes('main.js') || !names.includes('renderer/index.html')) throw new Error('Update-Paket unvollständig.');
  if (names.some((n) => n.includes('..') || path.isAbsolute(n))) throw new Error('Ungültiges Update-Paket.');
  const hot = path.join(DATA, 'hot'), tmp = path.join(DATA, 'hot.new');
  fs.rmSync(tmp, { recursive: true, force: true });
  zip.extractAllTo(tmp, true);
  fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify({ version: String(version), installedAt: new Date().toISOString() }));
  fs.rmSync(hot, { recursive: true, force: true });
  fs.renameSync(tmp, hot);
  setTimeout(() => { app.relaunch(); app.exit(0); }, 500);
  return true;
});
h('update:install', async (url, version) => {
  const repo = CONFIG.feedRepo || '';
  if (!repo || !String(url).startsWith(`https://github.com/${repo}/releases/download/`)) throw new Error('Update-Quelle nicht erlaubt.');
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('Download fehlgeschlagen: ' + r.status);
  const total = Number(r.headers.get('content-length')) || 0;
  const dest = path.join(app.getPath('temp'), `RiftClient-Update-${Date.now()}.exe`);
  const ws = fs.createWriteStream(dest);
  let got = 0;
  const reader = r.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    ws.write(value); got += value.length;
    send('update:progress', { pct: total ? Math.round((got / total) * 100) : 0 });
  }
  await new Promise((res) => ws.end(res));
  if (version) { state.updatedTo = String(version); save(); }   // falls die EXE intern eine andere Versionsnummer meldet, kein Update-Loop
  require('child_process').spawn(dest, [], { detached: true, stdio: 'ignore' }).unref();
  setTimeout(() => app.quit(), 600);
  return true;
});
h('feed:seen', (ids) => { state.seen = [...new Set([...state.seen, ...ids])].slice(-200); save(); return true; });

/* Daily Gifts: 7-Tage-Serie, Coins und Crates (ein Geschenk pro Kalendertag) */
const DAILY_REWARDS = [
  { coins: 50 }, { coins: 80 }, { crate: 'common' }, { coins: 120 }, { crate: 'rare' }, { coins: 200 }, { crate: 'epic', coins: 300 }
];
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dailyInfo = () => {
  const today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
  const claimable = state.daily.last !== today;
  const cont = state.daily.last === dayKey(y) || state.daily.last === today;
  const streak = claimable ? (cont ? state.daily.streak : 0) : state.daily.streak;   // bereits erreichte Tage
  return { claimable, streak, nextIndex: claimable ? streak % 7 : (state.daily.streak - 1 + 7) % 7 };
};
h('shop:daily', () => {
  const info = dailyInfo();
  if (!info.claimable) throw new Error('Das heutige Geschenk hast du schon abgeholt – komm morgen wieder!');
  const reward = DAILY_REWARDS[info.streak % 7];
  if (reward.coins) state.coins += reward.coins;
  if (reward.crate) state.crateInv[reward.crate] = (state.crateInv[reward.crate] || 0) + 1;
  state.daily = { last: dayKey(), streak: info.streak + 1 };
  save();
  return { reward, state: publicState() };
});

function rollRarity(w) {
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = crypto.randomInt(0, total * 100) / 100;
  for (const [k, v] of Object.entries(w)) { if ((r -= v) < 0) return k; }
  return 'common';
}
h('shop:buyCrate', (crateId) => {
  const crate = CRATES.find((c) => c.id === crateId);
  if (!crate) throw new Error('Unbekannte Crate.');
  if (crate.event && !eventActive(crate.event)) throw new Error('Diese Crate gibt es nur während des Events.');
  if ((state.crateInv[crate.id] || 0) > 0) state.crateInv[crate.id]--;     // zuerst Crates aus dem Inventar (z. B. Daily Gifts)
  else {
    if (state.coins < dp(crate.price)) throw new Error('Nicht genug Rift Coins.');
    state.coins -= dp(crate.price);
  }
  const rarity = rollRarity(crate.weights);
  const pool = ITEMS.filter((i) => !i.pass && i.rarity === rarity && (!crate.event ? !i.event : i.event === crate.event || rarity !== 'event'));
  const item = pool[crypto.randomInt(0, pool.length)];
  const duplicate = state.owned.includes(item.id);
  if (duplicate) state.coins += DUPLICATE_REFUND[rarity]; else state.owned.push(item.id);
  save(); passGain(20, 3);
  return { item, duplicate, refund: duplicate ? DUPLICATE_REFUND[rarity] : 0, state: publicState() };
});
h('shop:buyItem', (itemId) => {
  const it = ITEMS.find((i) => i.id === itemId && i.type !== 'cape' && !i.event && SKIN_PRICE[i.rarity]);
  if (!it) throw new Error('Dieses Item gibt es nur in Crates.');
  if (state.owned.includes(it.id)) throw new Error('Schon im Besitz.');
  const price = dp(SKIN_PRICE[it.rarity]);
  if (state.coins < price) throw new Error('Nicht genug Rift Coins.');
  state.coins -= price; state.owned.push(it.id); save(); passGain(15);
  return publicState();
});
h('shop:claim', (itemId) => {
  const it = ITEMS.find((i) => i.id === itemId && i.event && i.free);
  if (!it) throw new Error('Kein Event-Item.');
  if (!eventActive(it.event)) throw new Error('Dieses Event läuft gerade nicht.');
  if (state.owned.includes(it.id)) throw new Error('Schon abgeholt.');
  state.owned.push(it.id); save(); return publicState();
});
/* Cosmetics-Server: veröffentlicht, was du gerade trägst, damit andere Launcher-Spieler es im Spiel sehen */
async function publishCosmetics(capePng, frames) {
  const api = cloudApiRaw().replace(/\/$/, '');
  if (!api || state.account?.type !== 'ms') return false;
  const token = await mcToken();
  const eq = state.equipped, get = (id) => ITEMS.find((i) => i.id === id);
  const nt = get(eq.nametag);
  const body = {
    uuid: state.account.uuid,
    nametag: nt?.style ? { kind: nt.style.kind, colors: nt.style.colors || [], fx: nt.style.fx || [] } : null,
    plus: plusOn(), plusColor: state.settings?.plusColor || null, badge: get(eq.badge)?.badge || null, aura: get(eq.aura)?.aura || null, pet: get(eq.pet)?.pet || null,
    capePng: capePng || undefined, capeFrames: Array.isArray(frames) && frames.length ? frames : undefined
  };
  const r = await fetch(api + '/v1/cosmetics', { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify(body) });
  return r.ok;
}
/* ---- Freunde einladen (Referral) – läuft über den Cloudflare-Worker ---- */
const REF_COINS = 300, REF_BONUS = { 3: 500, 10: 2000 };
async function refCall(p, body) {
  const api = cloudApiRaw().replace(/\/$/, '');
  if (!api) throw new Error('Cloud ist noch nicht eingerichtet (Einstellungen → Cloud).');
  if (!(await isOnline())) throw new Error('Dafür brauchst du Internet.');
  const r = await fetch(api + '/v1/ref/' + p, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + (await mcToken()), 'Content-Type': 'application/json', 'User-Agent': UA }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status); return j;
}
/* ---- Freunde ---- */
async function friendCall(method, p, body) {
  const api = cloudApiRaw().replace(/\/$/, '');
  if (!api) throw new Error('Cloud ist noch nicht eingerichtet (Admin: Einstellungen → Cloud-Adresse).');
  if (!(await isOnline())) throw new Error('Dafür brauchst du Internet.');
  const r = await fetch(api + p, { method, headers: { Authorization: 'Bearer ' + (await mcToken()), 'Content-Type': 'application/json', 'User-Agent': UA }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Server nicht erreichbar (' + r.status + ')'); return j;
}
h('friends:list', () => friendCall('GET', '/v1/friends'));
h('invite:send', ({ to, addr, name, version, loader }) => friendCall('POST', '/v1/invite', { to, addr, name, version, loader }));
h('invite:clear', () => friendCall('DELETE', '/v1/invites'));
const invSeen = new Set();
setInterval(async () => {   // Einladungen von Freunden abholen (alle 25 s, nur mit Konto und Cloud)
  try {
    if (!state.account || !cloudApiRaw()) return;
    const j = await friendCall('GET', '/v1/invites'); const fresh = (j.invites || []).filter((i) => !invSeen.has(i.id));
    fresh.forEach((i) => invSeen.add(i.id)); if (fresh.length) send('invite:new', fresh);
  } catch {}
}, 25000);
h('friends:add', (code) => friendCall('POST', '/v1/friends', { code: String(code || '').trim() }));
h('friends:remove', (uuid) => friendCall('DELETE', '/v1/friends/' + String(uuid).replace(/[^0-9a-f]/gi, '')));
h('friends:profile', async (uuid) => {   // Cosmetics aus der Cloud + Skin-Adresse von Mojang
  uuid = String(uuid).replace(/[^0-9a-f]/gi, ''); const api = cloudApiRaw().replace(/\/$/, '');
  const cos = await (await fetch(api + '/v1/cosmetics/' + uuid, { headers: { 'User-Agent': UA } })).json().catch(() => ({}));
  let skin = null;
  try { const p = await (await fetch('https://sessionserver.mojang.com/session/minecraft/profile/' + uuid, { headers: { 'User-Agent': UA } })).json(); const tx = JSON.parse(Buffer.from(p.properties[0].value, 'base64').toString('utf8')).textures; if (tx.SKIN) skin = { url: tx.SKIN.url, model: tx.SKIN.metadata?.model === 'slim' ? 'slim' : 'default' }; } catch {}
  return { cos: cos && !cos.error ? cos : null, skin };
});
h('ref:status', () => refCall('status'));
h('ref:redeem', async (code) => { await refCall('redeem', { code }); state.coins += REF_COINS; save(); return { coins: REF_COINS, state: publicState() }; });
h('ref:claim', async () => {
  const s = await refCall('status'); const j = await refCall('claim', {}); const n = j.claimed || 0; let coins = n * REF_COINS;
  for (const [at, bonus] of Object.entries(REF_BONUS)) if (s.count >= +at && !(state.refBonus || []).includes(+at)) { coins += bonus; state.refBonus = [...(state.refBonus || []), +at]; }
  state.coins += coins; save(); return { n, coins, count: s.count, state: publicState() };
});
h('cosmetics:publish', (capePng, frames) => publishCosmetics(capePng, frames).catch(() => false));
h('catalog:save', (list) => { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, 'catalog.json'), JSON.stringify(Array.isArray(list) ? list : [])); } catch {} return true; });
h('plus:shop', () => ITEMS.filter((i) => i.plusShop).map((i) => ({ ...i, price: i.plusShop, owned: state.owned.includes(i.id) })));
h('plus:buy', (id) => {
  if (!plusOn()) throw new Error('Nur mit Rift+.');
  const it = ITEMS.find((i) => i.id === id && i.plusShop); if (!it) throw new Error('Unbekannt.');
  if (state.owned.includes(id)) throw new Error('Schon im Besitz.');
  const p = dp(it.plusShop); if (state.coins < p) throw new Error(`Dir fehlen ${p - state.coins} Rift Coins.`);
  state.coins -= p; state.owned.push(id); save(); return publicState();
});
h('plus:color', (c) => { if (!plusOn()) throw new Error('Nur mit Rift+.'); if (!/^#[0-9a-fA-F]{6}$/.test(c)) throw new Error('Ungültige Farbe.'); state.settings.plusColor = c; save(); return publicState(); });
state.emoteWheel = state.emoteWheel || ['emote_wave', 'emote_dance'];
h('emote:toggle', (id) => {
  const it = ITEMS.find((i) => i.id === id && i.type === 'emote'); if (!it) throw new Error('Unbekanntes Emote.');
  if (!it.base && !state.owned.includes(id)) throw new Error('Nicht im Besitz.');
  const w = state.emoteWheel = state.emoteWheel || [], i = w.indexOf(id);
  if (i >= 0) w.splice(i, 1); else { if (w.length >= 8) throw new Error('Das Rad ist voll (max. 8) – entferne zuerst eins.'); w.push(id); }
  save(); return publicState();
});
h('shop:equip', (type, id) => {
  if (!['cape', 'skin', 'nametag', 'pet', 'aura', 'badge'].includes(type)) throw new Error('Unbekannter Typ.');
  if (id) {
    const ok = String(id).startsWith('custom:') ? type === 'cape' && state.customCapes.some((c) => 'custom:' + c.id === id) : state.owned.includes(id) && ITEMS.find((i) => i.id === id)?.type === type;
    if (!ok) throw new Error('Nicht im Besitz.');
  }
  state.equipped[type] = id || null; save(); return publicState();
});

/* ---- Cape-Editor ---- */
h('editor:buy', () => {
  if (state.editorUnlocked) throw new Error('Schon freigeschaltet.');
  if (state.coins < EDITOR_PRICE) throw new Error(`Dir fehlen ${EDITOR_PRICE - state.coins} Rift Coins.`);
  state.coins -= dp(EDITOR_PRICE); state.editorUnlocked = true; save(); return publicState();
});
h('editor:save', ({ id, name, data }) => {
  if (!state.editorUnlocked) throw new Error('Cape-Editor ist noch nicht freigeschaltet.');
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data || '') || data.length > 120000) throw new Error('Ungültige Cape-Grafik.');
  name = String(name || 'Meine Cape').trim().slice(0, 30) || 'Meine Cape';
  const ex = id && state.customCapes.find((c) => c.id === id);
  if (ex) { ex.name = name; ex.data = data; }
  else {
    if (state.customCapes.length >= MAX_CUSTOM_CAPES) throw new Error(`Maximal ${MAX_CUSTOM_CAPES} eigene Capes.`);
    const nc = { id: crypto.randomUUID(), name, data }; state.customCapes.push(nc); id = nc.id;
  }
  save(); return { id, state: publicState() };
});
h('editor:delete', (id) => {
  state.customCapes = state.customCapes.filter((c) => c.id !== id);
  if (state.equipped.cape === 'custom:' + id) state.equipped.cape = null;
  save(); return publicState();
});
/* Codes (Feature wird später ausgebaut). Gespeichert wird nur der SHA-256-Hash. */
const sha = (t) => crypto.createHash('sha256').update(String(t).trim().toUpperCase()).digest('hex');
/* Codes: nur als Hash gespeichert. Neue Codes (Referral, Events …) hier eintragen: coins / crate / admin, repeat = mehrfach einlösbar */
const CODES = {
  [sha('RIFTDEBUG')]: { coins: 2000, repeat: true, label: 'Debug' },
  [sha('Admin1398')]: { admin: true, repeat: true, label: 'Admin' },
  [sha('RIFT+')]: { payTest: true, repeat: true, label: 'Rift+ Test' }
};
h('code:redeem', (code) => {
  const c = CODES[sha(code)];
  if (!c) throw new Error('Ungültiger Code.');
  state.redeemed = state.redeemed || [];
  const key = sha(code);
  if (!c.repeat && state.redeemed.includes(key)) throw new Error('Code wurde schon eingelöst.');
  if (!c.repeat) state.redeemed.push(key);
  if (c.coins) state.coins += c.coins;
  if (c.admin) state.admin = true;
  if (c.payTest) state.payTest = true;
  save();
  return { state: publicState(), coins: c.coins || 0, admin: !!c.admin, payTest: !!c.payTest };
});
h('maint:ignore', (id) => { if (!state.admin) throw new Error('Nur für Admins.'); ignoredMaint.add(String(id)); return true; });
/* Admin-Bereich (Updates/Ankündigungen über GitHub) – nur nach Admin-Code nutzbar */
require('./servers.js')({ h, DATA });

/* ---------------- Halloween Battle Pass (Candy Corn) ---------------- */
const PASS_XP = 80;                                              // XP pro Stufe
const PASS = [
  ['candy', 10], ['coins', 50], ['item', 'nt_bat'], ['candy', 15], ['crate', 1], ['coins', 100], ['item', 'aura_bats'], ['candy', 20], ['crate', 1], ['coins', 150],
  ['item', 'pet_pumpkin'], ['candy', 25], ['crate', 1], ['coins', 200], ['candy', 40], ['crate', 1], ['coins', 250], ['candy', 50], ['crate', 2], ['item', 'cape_witch']
].map(([t, v], i) => ({ tier: i + 1, type: t, value: v }));
const CANDY_SHOP = [{ id: 'nt_candy', kind: 'item', price: 100 }, { id: 'nt_ghosty', kind: 'item', price: 120 }, { id: 'nt_spooky', kind: 'item', price: 150 }, { id: 'nt_witchy', kind: 'item', price: 160 }, { id: 'nt_blood', kind: 'item', price: 180 },
  { id: 'cape_ghost', kind: 'item', price: 240 }, { id: 'cape_pumpkin', kind: 'item', price: 260 }, { id: 'cape_vampire', kind: 'item', price: 300 }, { id: 'crate', kind: 'crate', price: 100, name: 'Halloween Crate' }];
function passState() { state.pass = state.pass || { xp: 0, claimed: [], daily: '' }; state.candy = state.candy || 0; return state.pass; }
function passGain(xp, candy = 0) { try { if (!eventActive('halloween')) return; const p = passState(); p.xp += xp; state.candy += candy; save(); } catch {} }
h('pass:get', () => {
  const p = passState(), ev = eventActive('halloween');
  return { active: ev, xp: p.xp, per: PASS_XP, candy: state.candy, dailyReady: p.daily !== dayKey(),
    premium: premiumOn(), canBuy: !!state.payTest, premiumTiers: PASS_PREMIUM.map((t) => ({ ...t, item: t.type === 'item' ? ITEMS.find((i) => i.id === t.value) : null, unlocked: p.xp >= t.tier * PASS_XP, claimed: (p.claimedP || []).includes(t.tier) })),
    tiers: PASS.map((t) => ({ ...t, item: t.type === 'item' ? ITEMS.find((i) => i.id === t.value) : null, unlocked: p.xp >= t.tier * PASS_XP, claimed: p.claimed.includes(t.tier) })),
    shop: CANDY_SHOP.map((c) => ({ ...c, item: c.kind === 'item' ? ITEMS.find((i) => i.id === c.id) : null, owned: c.kind === 'item' && state.owned.includes(c.id) })) };
});
h('pass:daily', () => { if (!eventActive('halloween')) throw new Error('Das Event läuft gerade nicht.'); const p = passState(); if (p.daily === dayKey()) throw new Error('Heute schon abgeholt.'); p.daily = dayKey(); p.xp += 40; state.candy += 5; save(); return publicState(); });

/* ---------------- Rift+ (Abo) ---------------- */
const monthKey = () => new Date().toISOString().slice(0, 7);
const plusItem = () => ITEMS.find((i) => i.id === 'plus_' + String(new Date().getMonth() + 1).padStart(2, '0'));
h('plus:all', () => ITEMS.filter((i) => /^plus_\d+$/.test(i.id)).map((i) => ({ ...i, owned: state.owned.includes(i.id), current: i.id === plusItem().id })));
h('plus:get', () => ({ active: plusOn(), payTest: !!state.payTest, price: '4,99', item: plusItem(), claimable: plusOn() && state.plus.claimedMonth !== monthKey(), owned: state.owned.includes(plusItem().id) }));
h('plus:subscribe', () => {
  if (!state.payTest) throw new Error('Not for sale');            // Bezahlung kommt später – bis dahin nur mit Test-Code
  state.plus = { active: true, since: Date.now(), claimedMonth: state.plus?.claimedMonth || '' }; save(); return publicState();
});
h('plus:cancel', () => { if (state.plus) state.plus.active = false; save(); return publicState(); });
h('plus:claim', () => {
  if (!plusOn()) throw new Error('Nur mit Rift+.'); if (state.plus.claimedMonth === monthKey()) throw new Error('Diesen Monat schon abgeholt.');
  const it = plusItem(); if (!state.owned.includes(it.id)) state.owned.push(it.id); state.plus.claimedMonth = monthKey(); save(); return { state: publicState(), item: it };
});
const PASS_PREMIUM = [
  ['coins', 100], ['candy', 20], ['crate', 1], ['coins', 150], ['item', 'nt_reaper'], ['candy', 30], ['crate', 1], ['coins', 250], ['candy', 40], ['item', 'pet_ghost'],
  ['crate', 2], ['coins', 350], ['candy', 60], ['crate', 2], ['item', 'aura_cauldron'], ['coins', 500], ['candy', 80], ['crate', 3], ['coins', 800], ['item', 'cape_hexen2']
].map(([t, v], i) => ({ tier: i + 1, type: t, value: v }));
const premiumOn = () => plusOn() || !!(state.pass && state.pass.premium);
h('pass:buyPremium', () => {
  if (!state.payTest) throw new Error('Not for sale'); passState(); state.pass.premium = true; save(); return publicState();
});
h('pass:claim', (tier, track) => {
  if (!eventActive('halloween')) throw new Error('Das Event läuft gerade nicht.');
  const prem = track === 'premium', p = passState(), list = prem ? PASS_PREMIUM : PASS, t = list.find((x) => x.tier === tier); if (!t) throw new Error('Unbekannte Stufe.');
  if (prem && !premiumOn()) throw new Error('Dafür brauchst du den Premium-Pass.');
  const key = prem ? 'claimedP' : 'claimed'; p[key] = p[key] || [];
  if (p.xp < t.tier * PASS_XP) throw new Error('Noch nicht freigeschaltet.'); if (p[key].includes(tier)) throw new Error('Schon abgeholt.');
  p[key].push(tier);
  if (t.type === 'coins') state.coins += t.value; else if (t.type === 'candy') state.candy += t.value;
  else if (t.type === 'crate') state.crateInv.halloween = (state.crateInv.halloween || 0) + t.value;
  else if (t.type === 'item' && !state.owned.includes(t.value)) state.owned.push(t.value);
  save(); return publicState();
});
h('pass:buy', (id) => {
  if (!eventActive('halloween')) throw new Error('Das Event läuft gerade nicht.');
  const c = CANDY_SHOP.find((x) => x.id === id); if (!c) throw new Error('Unbekannt.'); passState();
  if (c.kind === 'item' && state.owned.includes(id)) throw new Error('Schon im Besitz.');
  if (state.candy < c.price) throw new Error('Nicht genug Candy Corn.');
  state.candy -= c.price; if (c.kind === 'item') state.owned.push(id); else state.crateInv.halloween = (state.crateInv.halloween || 0) + 1;
  save(); return publicState();
});
const stats = require('./stats.js')({ h, DATA, getProfiles: () => state.profiles, profileDir, shell });
require('./localserver.js')({ h, send, DATA, getJSON, download, requiredJava, ensureJava, shell, app, AdmZip });
require('./aicheck.js')({ h, state, save, getProfile, profileDir, GAME_ROOT, overlay: null });
overlay = require('./overlay.js')({ h, send, DATA, getProfileDir: profileDir, onClip: () => passGain(10) });
h('overlay:nav', (what) => { if (win && !win.isDestroyed() && ['media', 'stats'].includes(what)) { win.restore(); win.show(); win.focus(); send('nav', what); } return true; });
require('./admin.js')({
  h, send, DATA, app, dialog, shell,
  getConfig: () => CONFIG,
  setFeed: (c) => { CONFIG = { ...CONFIG, ...c }; try { fs.writeFileSync(path.join(DATA, 'feed.json'), JSON.stringify(c)); } catch {} },
  curVersion, isAdmin: () => !!state.admin, setCloudApi: (u, k) => { state.cloudApi = u; if (k !== undefined) state.cfKey = k; save(); }
});
/* Debug: Neuinstallation simulieren – Login, Coins, Profile, Einstellungen löschen (optional auch Spieldateien/Java) */
h('app:reset', async (everything) => {
  try { fs.rmSync(STATE_FILE, { force: true }); } catch {}
  if (everything) for (const d of [PROFILES_DIR, GAME_ROOT, JAVA_DIR]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
  try { const { session } = require('electron'); await session.defaultSession.clearStorageData(); await session.defaultSession.clearCache(); } catch {}
  setTimeout(() => { app.relaunch(); app.exit(0); }, 400);
  return true;
});
h('settings:save', (s) => { state.settings = { ...state.settings, ...s }; save(); return publicState(); });
h('win:control', (a) => {
  if (a === 'min') win.minimize();
  if (a === 'max') win.isMaximized() ? win.unmaximize() : win.maximize();
  if (a === 'close') win.close();
});

/* ------------------------------------------------------------------ */
try { app.setAppUserModelId('net.rift.client'); } catch {}
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 780, minWidth: 1000, minHeight: 640,
    frame: false, backgroundColor: '#070b17', title: 'Rift Launcher',
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
