# Rift changelog

## 1.x (latest)
- Fix: admins can now close/remove countdowns.
- Fix: NeoForge launch (libraryDirectory) – needs test.
- New: beta update channel (admin: "Beta" + "Full release" button; players: Settings → Beta).
- New: all pets are 3D (panda, fox, owl, bunny, penguin, bee, axolotl, wolf, robot).
- New: 3D previews for capes, skins and emotes.
- New: cape PNG upload in the cape editor.
- New in-game widgets: Weather & time of day, Statistics (play time/deaths), Radar (markers/players).
- New in-game key H: send your coordinates to chat.
- Cloud: Mojang token check is cached; in-game cosmetic errors show "Server error".
- New: macbuild (Mac installer .dmg; run on a Mac, needs Node.js).
- Fix: in-game cloud address is now re-read until found ("server not reachable" in the cosmetics tab).
- Cloud address: admin-only field in Settings, "Save for everyone" stores it in the feed (cloud.json) and it survives updates.
- In-game cloud errors show "Can't reach server" again.
- Reimagined Intro is now always included (Fabric/NeoForge) with all required dependencies (FancyMenu, Konkrete, Melody, Drippy Loading Screen, WaterMedia) – downloaded once.
- Fix: Reimagined Intro crash (FancyMenu: path not found) – game working directory is now the profile folder and FancyMenu folders are pre-created.
- New: in-game menu style "Rift" (rounded corners, default) or "Vanilla" (oak frame) – Design tab.
- New: friends – add by Rift code, online status, profile with skin + cosmetics preview (launcher); friends tab in the in-game menu. Worker needs redeploy (worker/deploy.bat).
- New: local servers can be shared with friends (free tunnel, bore.pub) and friends get invitations ("Join" starts the game on the server).
- New: import Modrinth modpacks from a .mrpack file (Profiles page); setup screen resumes at the step you left.
- New: macbuild.bat for Windows – GitHub builds the Mac .dmg for you (Actions → mac; download from the mac-latest release).
- New: Mods tab – provider dropdown (Modrinth / CurseForge; CurseForge needs a free API key set by the admin in Settings), search fixed (stale results no longer overwrite new ones, live search while typing).
- New: a scheduled update less than 24 h away shows a small countdown at the top automatically.
