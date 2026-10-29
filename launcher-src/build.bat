@echo off
cd /d "%~dp0"
title Build rift-client
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte von https://nodejs.org installieren ^(LTS^) und diese Datei nochmal starten.
  start https://nodejs.org
  pause
  exit /b 1
)
set CSC_IDENTITY_AUTO_DISCOVERY=false
echo === Installiere Abhaengigkeiten ===
call npm install
if errorlevel 1 goto fail
echo === Baue EXE ===
if exist dist rmdir /s /q dist
call npm run dist
if errorlevel 1 (
  echo.
  echo Der Installer-Build ist fehlgeschlagen ^(meist blockiert der Virenscanner die Installer-Erstellung^).
  echo Versuche stattdessen die portable EXE ...
  if exist dist rmdir /s /q dist
  call npm run dist:portable
  if errorlevel 1 goto fail
)
echo.
echo FERTIG! Die EXE liegt im Ordner "dist".
explorer dist
pause
exit /b 0
:fail
echo FEHLER beim Build - siehe oben.
pause
exit /b 1
