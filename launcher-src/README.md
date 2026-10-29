# Rift Launcher (Launcher)

## EXE bauen (Windows)
1. Node.js LTS installieren: https://nodejs.org
2. `build.bat` doppelklicken → im Ordner `dist` liegen `RiftLauncher-Setup-1.0.0.exe` (Installer) und `RiftLauncher-Portable-1.0.0.exe`.
(Ohne Node: Ordner in ein GitHub-Repo pushen → Actions → "Build EXE" → Artifact `exe`.)

Zum Testen ohne Build: `npm install` und `npm start`.

## Features
Microsoft-Login (Pflicht, kein Offline-Modus) · Profile mit Vanilla/Fabric/Quilt/Forge · automatisches Java 21 · Modrinth (Mods, Modpacks, Shader, Resource Packs, Data Packs, inkl. Abhängigkeiten) · Skins (Import + Anwenden auf Account) · Capes · Shop mit Rift Coins (1 Coin/Min. Spielzeit), eigene Crates-Seite (Common, Rare, Epic, Legendary, Mythic + Halloween-Event) mit Öffnungs-Animation · Daily Gifts (7-Tage-Serie mit Coins und Crates) · Cosmetics: Nametag-Effekte (Rotor, Schwebend, Glitch, Fledermaus …), Auren, Badges, Schulter-Pets · Settings mit Sprache (DE/EN) und Style (Akzentfarbe, Hintergrund) · Popups/Wartungsmodus über Rift Launcher den Admin-Bereich.

## Popups, Wartung, Updates
Läuft über **Rift Launcher den Admin-Bereich**. Dessen Setup trägt das Feed-Repo automatisch in `config.json` ein – danach den Launcher einmal neu bauen (oder direkt in den Admin-Bereich „Update“ nutzen).

## Admin-Bereich (Updates & Popups an alle Spieler – ohne eigenen Server)
Rift Launcher den Admin-Bereich gibt es nicht mehr; alles steckt im Launcher:
1. **Einstellungen → Code → `Admin1398`** einlösen. Links erscheint der Abschnitt **ADMIN** (Update, Popups, Setup). Der Code schaltet nur die Oberfläche frei; ohne dein GitHub-Token kann niemand etwas verteilen.
2. **Setup**: GitHub verbinden (Token erstellen, einfügen). Das Token bleibt in `%AppData%/RiftClient/admin.json` und wird nicht an Spieler geschickt. Es legt das öffentliche Repo `rift-feed` an – GitHub ist der kostenlose Verteiler (Ankündigungen + Update-Dateien).
3. **Einmalig** vor dem Bauen des Installers für die Spieler: die angezeigte Zeile `"feedRepo": "DEINNAME/rift-feed"` in `config.json` eintragen. Nur so wissen frisch installierte Launcher, wo sie nach Updates schauen.
4. **Update**: die Projekt-ZIP (oder eine fertige EXE) in das Feld ziehen, Changelog schreiben, „Veröffentlichen“. Der Launcher sucht die richtigen Dateien heraus, prüft die Skripte auf Syntaxfehler, baut das kleine Update-Paket (`config.json` zeigt immer auf dein Repo), lädt es als GitHub-Release hoch und trägt es in den Feed ein. Alle Launcher holen es nach ca. 2 Minuten, zeigen den Update-Balken und starten nach einem Klick neu (`loader.js` lädt die neue Version aus `%AppData%/RiftClient/hot`). Optional lässt sich ein Zeitpunkt planen oder das Update zur Pflicht machen.
Neue Abhängigkeiten (`package.json`) oder Electron-Updates brauchen weiterhin einen neuen Installer (EXE-Upload funktioniert genauso). Die Mod-Jar (`mod/rift-launcher.jar`) wird mitverteilt, wenn sie in der ZIP liegt.

## Codes
Eigene Codes (Referral, Events …) in `main.js` in der Tabelle `CODES` eintragen (nur als Hash gespeichert, `coins`/`admin`, `repeat`). Aktuell: `RIFTDEBUG` (+2000 Coins, vor einem öffentlichen Release entfernen) und der Admin-Code.

## Eigene Pet-Bilder
PNGs als `renderer/pets/<pet-id>.png` (z. B. `parrot.png`) ersetzen den eingebauten Pixel-Sprite.

## Hinweise
- Cosmetics (Nametag-Effekte, Auren, Badges, Pets, Rift-Capes) sind Launcher-Cosmetics; im Spiel (und für andere Spieler) sind sie nur mit einer Client-Mod plus Server sichtbar; Skins lassen sich zusätzlich auf den echten Account anwenden.
- Rift Coins liegen lokal in `%AppData%/RiftClient/state.json`. Für einen fälschungssicheren Shop wäre ein Server nötig.
- NeoForge wird über den offiziellen Installer eingerichtet (ab MC 1.20.2) – noch ungetestet.
- Eine eigene Azure-App-ID ist nicht nötig (msmc nutzt eine Standard-ID).

## In-Game-Mod (immer aktiv)
`mod-src/` enthält die Fabric-Mod (Fullbright mit Hotkey, Low Fire, Armor-/Pfeil-HUD, Keystrokes, CPS, FPS, Koordinaten, Ping mit HUD-Editor, Cosmetics anderer Spieler, Rainbow-Nametag, Watermark; ungetestet, siehe `mod-src/README.md`). Der Launcher legt `mod/rift-launcher.jar` bei **jedem Start** in alle Fabric- und Quilt-Profile (überschreibt alte Versionen). Die Jar wird von **Rift Launcher den Admin-Bereich** gebaut (Gradle + JDK 21 nötig) und mit „Update-Dateien veröffentlichen“ an alle verteilt – oder du wählst dort eine fertige Jar aus. Für Vanilla/Forge-Profile gibt es die Mod nicht.

## Beta: Launch-Animation
Einstellungen → Beta → „Launch-Animation“ (Standard aus, mit Vorschau): Beim Start öffnet sich ein Rift (erst schnell und weiß, dann langsamer und rot), die Spielbox tritt heraus und wird zum roten Mojang-Ladebildschirm, der bleibt, bis Minecraft läuft. Klick überspringt.

## Debug
Einstellungen → Code: `RIFTDEBUG` = +2000 Coins. „Alle Daten löschen“ simuliert eine Neuinstallation.

## Java & Update-Feed
- Die passende Java-Version wird je Minecraft-Version automatisch geladen (z. B. Java 25 für 26.x); eine zu alte eigene Java aus den Einstellungen wird übergangen.
- Der Launcher liest das Feed-Ziel aus `config.json` oder, falls dort leer, aus `%AppData%/RiftClient/feed.json` (schreibt der Admin-Bereich auf demselben PC). Für andere Spieler muss der Launcher nach dem Admin-Setup einmal neu gebaut werden, damit `config.json` den Feed enthält. Einstellungen → Debug zeigt das aktuelle Feed-Ziel.

## Neu: R-Menü, Clips, Server, Stats, Wrapped, Skin Studio
- **R-Menü im Spiel** (Mod): Seitenleiste mit *Rift* (alle HUDs/Schalter), *Kamera*, *Skins* (öffnet das Skin Studio im Launcher), *PvP* (PvP-Modus: schnelle Grafik, alte Werte werden gemerkt und zurückgesetzt).
- **Clips**: Die Mod hält die letzten 30 s als JPEG-Bilder im Speicher. **F8** speichert sie nach `rift-clips/`, **F7** startet/stoppt eine Aufnahme (`rift-recordings/`). Alles erscheint im Launcher unter *Medien* (zusammen mit den Screenshots).
- Die Mod schreibt Wünsche (Galerie/Skin Studio) in `<Profil>/rift/request.txt`; der Launcher öffnet dann die Seite.
- **Server** (Tab): gespeicherte Server mit Live-Status (Ping), Beitritt per Klick (`--quickPlayMultiplayer`). **Host**: eigenen Server auf dem PC starten (Mojang-Server, EULA-Haken nötig).
- **Stats** und **Wrapped**: Spielzeit, Versionen, Serien, Jahresrückblick.

## Overlay im Spiel (ohne Mod, nur Windows)
Rift legt beim Spielstart ein durchsichtiges Fenster über Minecraft – funktioniert mit Vanilla und **jeder Version**:
- **Rechts-Shift**: Rift-Menü (Anzeigen, Kamera, PvP-Modus, Server hosten). HUDs per Maus verschieben.
- **F8**: Clip der letzten 30 s · **F7**: Aufnahme starten/stoppen (Ordner „Medien“ im Launcher).
- HUDs: Tasten, CPS, FPS (~), Uhr, Spielzeit, CPU/RAM, Ping, Logo.
- Grenzen ohne Mod: keine Koordinaten, Rüstung oder Effekte; FPS ist ein Schätzwert aus der Bildschirmaufnahme. Mit echtem Vollbild-Exklusivmodus kann das Overlay verdeckt sein (dann in Minecraft F11 → randloses Fenster).
- Nicht auf echtem Windows getestet.

Dort baut „Build EXE“ auch den Installer (Artifact `exe`), falls der lokale Build blockiert wird.
