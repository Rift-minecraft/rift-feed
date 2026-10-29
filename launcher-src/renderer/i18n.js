/* Sprache: Die Oberfläche ist auf Deutsch geschrieben; für Englisch werden Texte beim Rendern übersetzt. */
const I18N = (() => {
  const EN = {
    'Einstellungen': 'Settings', 'Speichern': 'Save', 'Gespeichert.': 'Saved.', 'Gespeichert!': 'Saved!', 'Gespeichert und ausgerüstet!': 'Saved and equipped!',
    'Sprache': 'Language', 'Style': 'Style', 'Akzentfarbe': 'Accent color', 'Hintergrund': 'Background', 'Schwarz': 'Black', 'Graphit': 'Graphite', 'Deutsch': 'Deutsch',
    'Account:': 'Account:', 'Ausloggen': 'Log out', 'Einloggen': 'Log in', 'Nicht eingeloggt': 'Not logged in',
    'Standard-RAM (GB)': 'Default RAM (GB)', 'Java-Pfad (leer = automatisch Java 21 laden)': 'Java path (empty = download Java 21 automatically)',
    'Launcher beim Start minimieren': 'Minimize launcher on game start',
    'Profile': 'Profiles', 'Kein Profil': 'No profile', 'Kein Profil gewählt – Modpacks erstellen ein eigenes': 'No profile selected – modpacks create their own',
    'Noch keine Profile. Wähle eine Minecraft-Version oder installiere ein Modpack über „Mods“.': 'No profiles yet. Pick a Minecraft version or install a modpack via “Mods”.',
    'Profil erstellen': 'Create profile', 'Profil erstellt!': 'Profile created!', 'Profilname': 'Profile name', 'Version wählen': 'Choose version', 'Version ändern': 'Change version',
    'Lade Versionen…': 'Loading versions…', 'Lade…': 'Loading…', 'Lade herunter…': 'Downloading…', 'Bereite vor…': 'Preparing…', 'Wähle zuerst eine Version': 'Pick a version first', 'Noch keine Version gewählt': 'No version chosen yet',
    'Loader und Minecraft-Version aussuchen': 'Pick loader and Minecraft version', 'Original-Spiel ohne Mods': 'Original game without mods', 'Fabric-kompatibel, community-getrieben': 'Fabric-compatible, community driven',
    'Leicht & schnell – Sodium, Iris, …': 'Light & fast – Sodium, Iris, …', 'Klassiker für große Modpacks': 'Classic for big modpacks',
    'Suchen': 'Search', 'Suchen…': 'Searching…', 'Keine Treffer.': 'No results.', 'Installieren': 'Install', 'Installiert': 'Installed', 'Installiert:': 'Installed:', 'Noch nichts installiert.': 'Nothing installed yet.', 'Nur kompatibel': 'Compatible only',
    'Als Profil': 'As profile', 'Entfernen': 'Remove', 'Löschen': 'Delete', 'Ordner': 'Folder', 'Ändern': 'Edit', 'Öffnen': 'Open', 'Schließen': 'Close', 'Fertig': 'Done', 'Nochmal': 'Again',
    'Skins': 'Skins', 'Skins ändern & direkt auf deinen Account anwenden': 'Change skins & apply them to your account', 'Skin auf Account anwenden': 'Apply skin to account', 'Skin auf deinen Account angewendet!': 'Skin applied to your account!',
    'Skin geladen – „Anwenden“ drücken, um ihn zu übernehmen.': 'Skin loaded – press “Apply” to use it.', 'PNG importieren': 'Import PNG', 'Eigener Account-Skin': 'Your account skin',
    'Anwenden braucht den Microsoft-Login. Gewählte Skins siehst du sofort im Launcher.': 'Applying needs the Microsoft login. Selected skins show instantly in the launcher.', 'Erst einen Skin wählen oder importieren.': 'Pick or import a skin first.',
    'Capes': 'Capes', 'Eigene Capes': 'Your capes', 'Rift Capes': 'Rift Capes', 'Dein Account besitzt keine Capes.': 'Your account has no capes.', 'Keine Cape': 'No cape', 'Neue Cape malen': 'Paint new cape',
    'Cape-Editor': 'Cape editor', 'Cape-Editor freigeschaltet!': 'Cape editor unlocked!', 'Name der Cape': 'Cape name', 'Speichern & tragen': 'Save & wear',
    'Rift-Capes und eigene Capes sind Launcher-Cosmetics (im Launcher sichtbar). Minecraft-Capes deines Accounts werden im Spiel angezeigt.': 'Rift capes and custom capes are launcher cosmetics (visible in the launcher). Minecraft capes of your account show in-game.',
    'Stift': 'Pencil', 'Radierer': 'Eraser', 'Füllen': 'Fill', 'Pipette': 'Picker', 'Spiegeln (links/rechts)': 'Mirror (left/right)', 'Leeren': 'Clear', 'Vorlage': 'Template', 'Zurücksetzen': 'Reset', '↶ Zurück': '↶ Back',
    'Cosmetics': 'Cosmetics', 'Nametags': 'Nametags', 'Schulter-Pets': 'Shoulder pets', 'Auren': 'Auras', 'Badges': 'Badges', 'Standard-Farbe': 'Default color', 'Kein Pet': 'No pet', 'Keine Aura': 'No aura', 'Kein Badge': 'No badge',
    'Nametags, Pets, Auren und Badges – im Launcher sichtbar': 'Nametags, pets, auras and badges – visible in the launcher',
    'Shop': 'Shop', 'Crates': 'Crates', 'Zu den Crates': 'Go to crates', 'Im Besitz': 'Owned', 'Im Besitz:': 'Owned:', 'Nur in Crates': 'Crates only', 'Dieses Item gibt es nur in Crates.': 'This item is only available in crates.',
    'Verdiene Rift Coins mit Spielzeit (1 Coin/Min.) und dem täglichen Geschenk': 'Earn Rift Coins by playing (1 coin/min) and with the daily gift',
    'Daily Gift': 'Daily Gift', 'Geschenk abholen': 'Claim gift', 'Heute schon abgeholt': 'Already claimed today', 'Geschenk:': 'Gift:',
    'Hol dir jeden Tag ein Geschenk – 7 Tage in Folge für das große Finale. Verpasst du einen Tag, startet die Serie neu.': 'Claim a gift every day – 7 days in a row for the grand finale. Miss a day and the streak restarts.',
    'Neu in deiner Sammlung!': 'New in your collection!', 'Hol sie dir aus einer Crate im Shop!': 'Get it from a crate!',
    'Update': 'Update', 'Jetzt aktualisieren': 'Update now', 'Erneut versuchen': 'Try again', 'Starte neu…': 'Restarting…', 'Installer startet…': 'Installer starting…', 'Neue Version': 'New version', 'Aktiv': 'Active', 'Aktivieren': 'Activate',
    'Willkommen,': 'Welcome,', 'Dafür brauchst du Minecraft: Java Edition.': 'You need Minecraft: Java Edition for this.', 'Warte auf Anmeldefenster…': 'Waiting for the login window…',
    'Mehr erfahren': 'Learn more', 'Rift News': 'Rift News', 'Fast News': 'Fast News', 'Wartungsarbeiten': 'Maintenance', 'Pflicht': 'Required'
  };
  const RX = [
    [/^Nächster Bonus in (\d+) h\.$/, (m) => `Next bonus in ${m[1]} h.`],
    [/^Das heutige Geschenk hast du schon abgeholt – komm morgen wieder!$/, () => 'You already claimed today’s gift – come back tomorrow!'],
    [/^Nicht genug Rift Coins\.$/, () => 'Not enough Rift Coins.'],
    [/^Tag (\d+)$/, (m) => `Day ${m[1]}`],
    [/^Im Besitz: (\d+)$/, (m) => `Owned: ${m[1]}`],
    [/^Öffnen \((\d+)×\)$/, (m) => `Open (${m[1]}×)`],
    [/^(.+) gekauft!$/, (m) => `${m[1]} purchased!`], [/^(.+) abgeholt!$/, (m) => `${m[1]} claimed!`],
    [/^GRATIS – (.+)-Event$/, (m) => `FREE – ${m[1]} event`],
    [/^Nur im Event \((.+)\)$/, (m) => `Event only (${m[1]})`],
    [/^Schon im Besitz – (\d+) Rift Coins zurück$/, (m) => `Already owned – ${m[1]} Rift Coins refunded`],
    [/^(.+) wird geöffnet…$/, (m) => `Opening ${m[1]}…`],
    [/^Im Besitz: (\d+)$/, (m) => `Owned: ${m[1]}`],
    [/^Crates? .*$/, null]
  ];
  /* Textbausteine, die mitten in zusammengesetzten Texten vorkommen */
  const FRAG = [
    [' – Öffnen', ' – Open'], ['Öffne Crates mit Rift Coins oder aus deinem Inventar', 'Open crates with Rift Coins or from your inventory'], [' im Besitz', ' owned'], [' · bereit', ' · ready'],
    ['Nur im Event', 'Event only'], [' Crate wird geöffnet…', ' crate is opening…']
  ];
  let lang = 'de', busy = false, obs = null;
  function tr(str) {
    if (lang !== 'en' || !str) return str;
    const t = str.trim(); if (!t) return str;
    let out = EN[t];
    if (!out) for (const [re, fn] of RX) { if (!fn) continue; const m = re.exec(t); if (m) { out = fn(m); break; } }
    if (!out) { let r = t; for (const [a, b] of FRAG) if (a !== b && r.includes(a)) r = r.split(a).join(b); if (r === t) return str; out = r; }
    return str.split(t).join(out);
  }
  function apply(root = document.body) {
    if (lang !== 'en') return;
    busy = true;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
    root.querySelectorAll?.('[placeholder],[title]').forEach((e) => { for (const a of ['placeholder', 'title']) if (e.hasAttribute(a)) { const v = tr(e.getAttribute(a)); if (v !== e.getAttribute(a)) e.setAttribute(a, v); } });
    busy = false;
  }
  function setLang(l) {
    lang = l === 'en' ? 'en' : 'de';
    document.documentElement.lang = lang;
    if (!obs) {
      obs = new MutationObserver((ms) => { if (busy || lang !== 'en') return; for (const m of ms) { if (m.type === 'characterData') { busy = true; const v = tr(m.target.nodeValue); if (v !== m.target.nodeValue) m.target.nodeValue = v; busy = false; } else m.addedNodes.forEach((n) => { if (n.nodeType === 1) apply(n); else if (n.nodeType === 3) { busy = true; const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; busy = false; } }); } });
      obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  const origConfirm = window.confirm.bind(window); window.confirm = (m) => origConfirm(tr(String(m)));
  return { setLang, tr, apply, get lang() { return lang; } };
})();
