# Rift-Mod (Fabric)
Zeigt Cosmetics aller Rift-Spieler im Spiel (Cape, Nametag mit Logo, Aura) – auch auf Vanilla-Servern (reiner Client-Mod).
Gebaut wird automatisch von GitHub Actions (`.github/workflows/mod.yml`) → Release `mod-latest` → der Launcher lädt die Datei beim Start selbst.
Neue Version hinzufügen: in `mod.yml` bei `matrix.mc` eintragen (Versionen, für die es einen gleichnamigen Branch in FabricMC/fabric-example-mod gibt).
