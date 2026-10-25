// Presentation-only attention rules; no API calls, permissions or state transitions.
import {icon} from './icons.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const categories={review:{label:'Review',symbol:'check'},payment:{label:'Payment',symbol:'orders'},delivery:{label:'Delivery',symbol:'shipping'},system:{label:'System',symbol:'settings'},connection:{label:'Connection',symbol:'link'},show:{label:'Show',symbol:'play'}};
export function notifications(state){
 const items=[];
 if(state.run?.phase==='waiting-review')items.push({category:'review',title:'A lot is ready for review',detail:state.run.steps[state.run.index]?.product.title||'Approve it in Studio.',tab:'studio'});
 if(state.run?.status==='paused')items.push({category:'review',title:'Your run is paused',detail:state.run.reason||'Resume when ready.',tab:'studio'});
 const unpaid=state.orders.filter(o=>['pending','processing'].includes(o.status));
 if(unpaid.length)items.push({category:'payment',title:`${unpaid.length} orders awaiting payment`,detail:'Check progress in Orders.',tab:'orders'});
 const ready=state.orders.filter(o=>['paid','paid-external','test-paid'].includes(o.status));
 if(ready.length)items.push({category:'delivery',title:`${ready.length} orders to fulfill`,detail:'View delivery and shipping.',tab:'orders'});
 if(state.storage?.backupError)items.push({category:'system',title:'Your backup needs attention',detail:'Check system details.',tab:'connections'});
 if(!state.twitch.connected&&state.mode==='live')items.push({category:'connection',service:'twitch',title:'Connect your Twitch channel',detail:'Finish connecting in Settings.',tab:'connections'});
 return items;
}
function feedIcon(symbol,service,size){return service==='twitch'?`<img class="feed-brand-icon" src="/brand/services/twitch.svg" alt="" width="${size}" height="${size}">`:icon(symbol,size);}
export function notificationFeed(items){return `<div class="munny-notices">${items.length?items.map(item=>{const category=categories[item.category]||categories.show;return `<button class="notification-item feed-${escape(item.category)}" data-tab="${item.tab}"><span class="feed-icon">${feedIcon(category.symbol,item.service,20)}</span><span><strong>${escape(item.title)}</strong><small>${escape(item.detail)}</small></span>${icon('arrow',15)}</button>`;}).join(''):'<div class="munny-empty"><h3>All caught up.</h3><p>Anything that needs you will appear here.</p></div>'}</div>`;}
function categoryFor(event){
 if(['error','system'].includes(event.type))return 'system';
 if(['payment','refund'].includes(event.type))return 'payment';
 if(['delivery','shipping','fulfillment'].includes(event.type))return 'delivery';
 if(['run','moderation'].includes(event.type))return 'review';
 return 'show';
}
function rows(events){return events.map(event=>{const id=categoryFor(event),category=categories[id],date=new Date(event.at);return `<li class="feed-${id}"><span class="feed-icon">${feedIcon(category.symbol,/\btwitch\b/i.test(event.text)?'twitch':null,18)}</span><div><div class="feed-meta"><span class="feed-category">${category.label}</span><time datetime="${date.toISOString()}">${escape(date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}))}</time></div><p>${escape(event.text)}</p></div></li>`;}).join('');}
export function activityFeed(state){return `<div class="munny-activity">${state.activity?.length?`<ol>${rows(state.activity.slice(0,80))}</ol>`:'<div class="munny-empty"><h3>A fresh start.</h3><p>Your show’s activity will appear here.</p></div>'}${state.run?.events?.length?`<details><summary>Current run · ${state.run.events.length} events</summary><ol>${rows(state.run.events.slice(-30).reverse().map(event=>({...event,type:'run'})))}</ol></details>`:''}</div>`;}
