const { contextBridge, ipcRenderer, webUtils } = require('electron');

const INVOKE = [
  'state:get', 'auth:microsoft', 'auth:offline', 'auth:logout',
  'profiles:save', 'profiles:delete', 'profiles:select', 'profiles:installed', 'profiles:removeMod', 'profiles:openFolder',
  'versions:minecraft', 'versions:images', 'game:launch', 'game:stop', 'net:check', 'ai:check', 'ai:fix', 'plus:get', 'plus:all', 'catalog:save', 'plus:shop', 'plus:buy', 'plus:color', 'emote:toggle', 'plus:subscribe', 'plus:cancel', 'plus:claim', 'pass:buyPremium', 'ref:status', 'ref:redeem', 'ref:claim',
  'modrinth:search', 'modrinth:install', 'modrinth:installModpack',
  'skin:apply', 'skin:account', 'cape:set',
  'feed:get', 'feed:seen', 'update:install', 'update:hot', 'shop:daily', 'shop:buyCrate', 'cosmetics:publish', 'shop:equip', 'shop:claim', 'shop:buyItem', 'editor:buy', 'editor:save', 'editor:delete', 'settings:save', 'code:redeem', 'admin:status', 'admin:openTokenPage', 'admin:connect', 'admin:disconnect', 'admin:feed', 'admin:post', 'admin:remove', 'admin:pickFile', 'admin:fileInfo', 'admin:publishUpdate', 'admin:promoteUpdate', 'admin:setCloud', 'friends:list', 'modpack:importFile', 'lserver:share', 'lserver:unshare', 'lserver:info', 'invite:send', 'invite:clear', 'friends:add', 'friends:remove', 'friends:profile', 'maint:ignore', 'mods:check', 'mods:update', 'servers:list', 'servers:save', 'servers:delete', 'servers:ping', 'stats:get', 'media:list', 'media:thumb', 'media:frames', 'media:full', 'media:videos', 'media:reveal', 'media:delete', 'lserver:list', 'lserver:create', 'lserver:start', 'lserver:stop', 'lserver:command', 'lserver:delete', 'lserver:folder', 'app:reset', 'win:control', 'overlay:get', 'overlay:set', 'overlay:menuClose', 'overlay:typing', 'pass:get', 'pass:daily', 'pass:claim', 'pass:buy', 'overlay:capture', 'overlay:screenId', 'overlay:saveClip', 'overlay:recStart', 'overlay:recChunk', 'overlay:recStop', 'overlay:nav'
];
const EVENTS = ['game:log', 'game:progress', 'game:state', 'install:progress', 'update:progress', 'game:window', 'game:spawn', 'nav', 'admin:progress', 'lserver:log', 'lserver:state', 'overlay:menu', 'overlay:picked', 'overlay:keys', 'overlay:size', 'overlay:sys', 'overlay:cfg', 'overlay:cmd', 'overlay:ctx', 'invite:new', 'lserver:share'];

contextBridge.exposeInMainWorld('rift', {
  pathOf: (file) => { try { return webUtils.getPathForFile(file); } catch { return ''; } },
  invoke: (channel, ...args) => {
    if (!INVOKE.includes(channel)) throw new Error('Blocked channel ' + channel);
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, cb) => {
    if (!EVENTS.includes(channel)) return;
    ipcRenderer.on(channel, (_e, data) => cb(data));
  }
});
