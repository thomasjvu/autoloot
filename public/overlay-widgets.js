const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Uses only confirmed public facts; refreshes never replay a sound or financial action.
export function pullWidget(pulls=[],type='pull',connected=true){
 const items=pulls.slice(0,type==='ribbon'?5:1);
 return `<section class="pull-widget ${type==='ribbon'?'pull-ribbon':''}" aria-label="Confirmed pulls">${connected?'':'<span class="pull-offline">Offline · last confirmed pulls</span>'}${items.length?items.map(p=>`<article><span class="pull-symbol" aria-hidden="true">✦</span><div><small>Confirmed pull</small><h2>${esc(p.name)}${p.number?' #'+esc(p.number):''}</h2><p>${esc(p.setName)}${p.rarity?' · '+esc(p.rarity):''}</p></div></article>`).join(''):'<article><span class="pull-symbol" aria-hidden="true">✦</span><div><h2>Ready for the next reveal</h2><p>Confirmed pulls appear here.</p></div></article>'}</section>`;
}
