/* Setzt das Rift-Icon in die EXE (electron-builder tut das bei signAndEditExecutable:false nicht) – sonst zeigt die Taskleiste das Electron-Icon. */
const path = require('path');
exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const exe = path.join(ctx.appOutDir, ctx.packager.appInfo.productFilename + '.exe');
  const ico = path.join(ctx.packager.projectDir, 'build', 'icon.ico');
  try {
    const rcedit = require('rcedit');
    await (rcedit.rcedit || rcedit)(exe, { icon: ico, 'version-string': { ProductName: 'Rift Launcher', FileDescription: 'Rift Launcher', CompanyName: 'Rift' } });
    console.log('  • Icon in EXE gesetzt:', exe);
  } catch (e) { console.warn('  • Icon konnte nicht gesetzt werden (' + e.message + ') – Build läuft weiter.'); }
};
