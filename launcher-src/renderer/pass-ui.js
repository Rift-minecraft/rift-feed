/* Halloween Battle Pass */
async function renderPass() {
  content.innerHTML = '<h2>Halloween Pass</h2><div class="mute">Lade…</div>';
  let d; try { d = await api('pass:get'); } catch (e) { return toast(e.message, true); }
  if (view !== 'pass') return;
  if (!d.active) { content.innerHTML = '<h2>Halloween Pass</h2><div class="card mute">Das Event ist gerade nicht aktiv.</div>'; return; }
  const tier = Math.min(20, Math.floor(d.xp / d.per)), into = tier >= 20 ? d.per : d.xp % d.per;
  const reward = (t) => t.type === 'coins' ? `<span class="hwg">🪙</span><b>${t.value}</b><small>Rift Coins</small>` : t.type === 'candy' ? `<span class="hwg">🍬</span><b>${t.value}</b><small>Candy Corn</small>`
    : t.type === 'crate' ? `<span class="hwg">🎃</span><b>${t.value}×</b><small>Halloween Crate</small>` : `<div class="hwi"></div><b>${esc(t.item?.name || t.value)}</b><small>${RARITY[t.item?.rarity] || ''} ${TYPE_LABEL[t.item?.type] || ''}</small>`;
  const ring = tier >= 20 ? 100 : into / d.per * 100, tot = Math.min(100, d.xp / (20 * d.per) * 100);
  content.innerHTML = `<div class="hwhero"><div class="hwsky"><i class="hwmoon"></i><i class="hwbat b1"></i><i class="hwbat b2"></i><i class="hwbat b3"></i></div>
      <div class="hwhl"><small>EVENT · 15. OKT – 2. NOV</small><h1>HALLOWEEN<br>PASS</h1><p>Sammle XP beim Spielen und hol dir pro Stufe eine Belohnung.</p>
        <button class="b ${d.dailyReady ? 'primary' : ''}" id="hwDaily" ${d.dailyReady ? '' : 'disabled'}>${d.dailyReady ? 'Tagesbonus abholen · +40 XP · +5 🍬' : '✓ Tagesbonus heute geholt'}</button></div>
      <div class="hwhr"><div class="hwring" style="--p:${ring}"><div><b>${tier}</b><small>STUFE</small></div></div>
        <div class="hwcn"><span>🍬</span><b>${d.candy}</b><small>CANDY CORN</small></div></div></div>
    <div class="hwmeta"><span>${tier >= 20 ? 'Pass komplett – stark!' : `${into} / ${d.per} XP bis Stufe ${tier + 1}`}</span><div class="hwbar2"><i style="width:${tot}%"></i></div><span>${Math.round(tot)} %</span></div>
    <div class="mute" style="font-size:12px;margin:2px 0 6px">XP: 5 pro Spielminute · +10 pro Start · +20 pro Crate · +15 pro Shop-Kauf · +10 pro Clip</div>
    <div class="hwprem ${d.premium ? 'on' : ''}"><div><b>PREMIUM-PASS ${d.premium ? '✓' : ''}</b><small>${d.premium ? 'Aktiv – die Premium-Belohnungen unter jeder Stufe sind freigeschaltet' : 'Zusätzliche Belohnungen pro Stufe · 2,99 $ · kostenlos mit Rift+'}</small></div>
      ${d.premium ? '' : d.canBuy ? '<button class="b primary" id="hwBuyP">Premium holen · 2,99 $</button>' : '<button class="b" disabled>Not for sale</button>'}</div>
    <div class="hwtrack" id="hwTrack"><div class="hwline"></div>${d.tiers.map((t) => `<div class="hwt2 ${t.claimed ? 'claimed' : t.unlocked ? 'ready' : 'locked'} ${t.type === 'item' ? 'big' : ''} ${t.tier === tier + 1 ? 'next' : ''}" data-t="${t.tier}">
      <div class="hwn">${t.claimed ? '✓' : t.tier}</div><div class="hwcard"><div class="hwr">${reward(t)}</div>
      <button class="b ${t.unlocked && !t.claimed ? 'primary' : ''}" ${t.unlocked && !t.claimed ? '' : 'disabled'}>${t.claimed ? 'Geholt' : t.unlocked ? 'Abholen' : '🔒 ' + (t.tier * d.per - d.xp) + ' XP'}</button>
      ${(() => { const q = d.premiumTiers[t.tier - 1]; return `<div class="hwpr ${d.premium ? '' : 'lock'}" data-pt="${q.tier}"><div class="hwr">${reward(q)}</div><button class="b ${d.premium && q.unlocked && !q.claimed ? 'primary' : ''}" ${d.premium && q.unlocked && !q.claimed ? '' : 'disabled'}>${!d.premium ? '🔒 Premium' : q.claimed ? 'Geholt' : q.unlocked ? 'Abholen' : '🔒'}</button></div>`; })()}</div></div>`).join('')}</div>
    <h3 class="hwh3">🎃 Candy-Shop <small>Gib deine Candy Corn für exklusive Halloween-Items aus</small></h3>
    <div class="hwshop">${d.shop.map((c) => `<div class="hws ${c.owned ? 'owned' : ''}" data-id="${c.id}"><div class="hwr">${c.kind === 'item' ? '<div class="hwi"></div><b>' + esc(c.item.name) + '</b><small>' + TYPE_LABEL[c.item.type] + '</small>' : '<span class="hwg">🎃</span><b>Halloween Crate</b><small>Zum Öffnen im Crates-Tab</small>'}</div>
      <button class="b ${c.owned ? '' : 'primary'}" ${c.owned ? 'disabled' : ''}>${c.owned ? '✓ Im Besitz' : '🍬 ' + c.price}</button></div>`).join('')}</div>`;
  // Item-Vorschauen
  d.tiers.filter((t) => t.item).forEach((t) => { const h = content.querySelector(`.hwt2[data-t="${t.tier}"] .hwi`); if (h) h.append(RT.front(t.item)); });
  d.premiumTiers.filter((t) => t.item).forEach((t) => { const h = content.querySelector(`.hwpr[data-pt="${t.tier}"] .hwi`); if (h) h.append(RT.front(t.item)); });
  d.shop.filter((c) => c.item).forEach((c) => { const h = content.querySelector(`.hws[data-id="${c.id}"] .hwi`); if (h) h.append(RT.front(c.item)); });
  content.querySelectorAll('.hwi canvas').forEach((cv) => { cv.style.cssText = 'width:100%;height:64px;object-fit:contain;image-rendering:pixelated'; });
  $('#hwDaily').onclick = guard(async () => { S = await api('pass:daily'); renderChrome(); toast('+40 XP und +5 Candy Corn!'); renderPass(); });
  content.querySelectorAll('.hwt2 button:not([disabled])').forEach((b) => b.onclick = guard(async () => { S = await api('pass:claim', +b.closest('.hwt2').dataset.t); renderChrome(); try { confetti('#f97316'); } catch {} renderPass(); }));
  content.querySelectorAll('.hwpr button:not([disabled])').forEach((b) => b.onclick = guard(async () => { S = await api('pass:claim', +b.closest('.hwpr').dataset.pt, 'premium'); renderChrome(); try { confetti('#22c55e'); } catch {} renderPass(); }));
  if ($('#hwBuyP')) $('#hwBuyP').onclick = guard(async () => { const ok = await buyFlow({ name: 'Halloween Premium-Pass', sub: 'Zusätzliche Belohnungen pro Stufe · Zahlung folgt später', price: '2,99', money: true, successText: 'Premium aktiv!', run: async () => { S = await api('pass:buyPremium'); renderChrome(); } }); if (ok) renderPass(); });
  content.querySelectorAll('.hws button:not([disabled])').forEach((b) => b.onclick = guard(async () => {
    const c = d.shop.find((x) => x.id === b.closest('.hws').dataset.id);
    const ok = await buyFlow({ name: c.kind === 'item' ? c.item.name : 'Halloween Crate', sub: 'Candy-Shop', price: c.price, unit: 'Candy Corn', balance: d.candy, run: async () => { S = await api('pass:buy', c.id); renderChrome(); } });
    if (ok) renderPass(); }));
  const first = content.querySelector('.hwt2.ready') || content.querySelector('.hwt2.next'); first && (document.querySelector('#hwTrack').scrollLeft = Math.max(0, first.offsetLeft - 200));
}
$('#hwTile').onclick = () => go('pass');
