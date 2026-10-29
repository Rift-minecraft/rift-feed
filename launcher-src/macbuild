#!/bin/bash
# Rift Launcher – Mac-Installer (.dmg) bauen. Doppelklick (oder im Terminal: bash macbuild.command)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte LTS von https://nodejs.org installieren und diese Datei nochmal starten."
  open https://nodejs.org; read -n 1 -s -r -p "Taste druecken…"; exit 1
fi
export CSC_IDENTITY_AUTO_DISCOVERY=false
echo "=== Installiere Abhaengigkeiten ==="
npm install || { echo "FEHLER bei npm install"; read -n 1 -s -r -p "Taste druecken…"; exit 1; }
echo "=== Baue Mac-Installer (arm64 + Intel) ==="
rm -rf dist
npm run dist:mac || { echo "FEHLER beim Build – siehe oben."; read -n 1 -s -r -p "Taste druecken…"; exit 1; }
echo; echo "FERTIG! Die .dmg liegt im Ordner dist."
open dist
echo "Hinweis: Die App ist nicht signiert. Beim ersten Start: Rechtsklick auf die App -> Oeffnen."
read -n 1 -s -r -p "Taste druecken zum Beenden…"
