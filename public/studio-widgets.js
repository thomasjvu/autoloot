import {loadingProgressBar} from "./progress-bar.js";
// Snapshot-only dashboard widgets. Actions are wired by the workspace controller.
import {icon} from './icons.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function studioWidgets(state){
 const connected=state.twitch.connected;
 const real=(state.accountingRows||[]).filter(row=>row.mode==='live');
 const net=real.reduce((sum,row)=>sum+row.net,0);
 const revenue=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(net/100);
 const openOrders=state.orders.filter(order=>!['cancelled','expired','refunded','shipped','delivered','test-delivered'].includes(order.status)).length;
 const codex=state.companion||{},selected=codex.provider==='codex';
 const codexStatus=selected?(state.companionError?'Needs attention':Number.isFinite(codex.lastSuccessAt)?'Online':'Selected'):'Not connected';
 return `<section class="studio-widgets" aria-label="Workspace overview"><article class="panel studio-widget studio-widget-sales"><div class="studio-widget-title"><span class="studio-widget-icon">${icon('stats',22)}</span><h2>Sales</h2></div><strong class="studio-widget-value">${revenue}</strong><button class="text-btn" data-tab="accounting">Sales & numbers ${icon('arrow',15)}</button></article><article class="panel studio-widget studio-widget-twitch"><div class="studio-widget-title"><span class="studio-widget-icon twitch-widget-icon">${icon('chat',22)}</span><h2>Your channel</h2><span class="widget-dot ${connected?'connected':''}" aria-hidden="true"></span></div><strong class="studio-widget-value">${connected?'@'+esc(state.twitch.channel):'Not connected'}</strong><button class="text-btn" ${connected?'data-tab="connections"':'data-action="connect-twitch"'}>${connected?'Channel settings':'Connect Twitch'} ${icon('arrow',15)}</button></article><article class="panel studio-widget studio-widget-codex"><div class="studio-widget-title"><span class="studio-widget-icon">${icon('spark',26)}</span><h2>Codex</h2><span class="widget-dot ${codexStatus==='Online'?'connected':''}" aria-hidden="true"></span></div><strong class="studio-widget-value">${codexStatus}</strong><button class="text-btn" data-codex-connect>${selected?'Manage Codex':'Connect Codex'} ${icon('arrow',15)}</button></article><article class="panel studio-widget studio-widget-orders"><div class="studio-widget-title"><span class="studio-widget-icon">${icon('orders',22)}</span><h2>Orders</h2></div><strong class="studio-widget-value">${openOrders} <small>to follow up</small></strong><button class="text-btn" data-tab="orders">View orders ${icon('arrow',15)}</button></article></section>`;
}

export function setupChecklist(state,tour={completed:false,skipped:false}){
 const ownItems=state.products.some(product=>product.quantity>0&&!['p1','p2','p3','p4'].includes(product.id));
 const policy=state.operator||{};
 const steps=[
  {title:'Connect your channel',done:Boolean(state.twitch.connected),symbol:'twitch',copy:state.twitch.connected?'Your Twitch chat is connected.':'Bring your Twitch chat into the show.',action:'data-tab="connections"'},
  {title:'Add your first item',done:ownItems,symbol:'bag',copy:ownItems?'Your lineup is taking shape.':'Add an item you own, with a price and condition.',action:'data-tab="inventory"'},
  {title:'Add seller details',done:['name','email','shipping','returns','retention'].every(key=>typeof policy[key]==='string'&&policy[key].trim()),symbol:'seller',copy:'Your public contact, shipping and returns.',action:'data-action="operator-settings"'},
  {title:'Connect checkout',done:Boolean(state.payments.configured||state.payments.wallet?.configured),symbol:'orders',copy:state.payments.configured?(state.payments.environment==='live'?'Live checkout is configured.':'Test checkout is configured. Switch to live before real sales.'):'Set up payments for your buyers.',action:'data-action="payment-help"'},
  {title:'Choose your pace',done:['manual','review','automatic'].includes(state.automation?.mode),symbol:'companion',copy:'Lead each lot, review the queue or let it continue.',action:'data-tab="connections"'}
 ];
 const done=steps.filter(step=>step.done).length,percent=Math.round(done/steps.length*100);
 return `<section class="panel setup-checklist" aria-labelledby="setup-checklist-title"><div class="setup-checklist-heading"><h2 id="setup-checklist-title">${done===steps.length?'You’re set up':'Let’s get you set up'}</h2><span>${done} of ${steps.length} steps complete</span></div>${loadingProgressBar(percent)}<ol class="setup-todos">${steps.map(step=>`<li><button class="setup-todo ${step.done?'complete':''}" ${step.action}><span class="todo-check" aria-hidden="true">${step.done?icon('check',15):''}</span><span class="todo-symbol" aria-hidden="true">${icon(step.symbol==='twitch'?'chat':step.symbol,20)}</span><span class="todo-copy"><strong>${step.title}</strong></span><span class="todo-result">${step.done?'Done':icon('arrow',16)}</span></button></li>`).join('')}</ol><div class="setup-tour-link"><button class="text-btn" data-start-tutorial>${tour.completed||tour.skipped?'Replay tour':'Quick tour'} ${icon('arrow',14)}</button></div></section>`;
}
