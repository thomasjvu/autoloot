// Storefront presentation follows server state; it never starts/closes a sale.
export function dropPhase(auction,now,connected=true) {
 if(!connected)return {key:'offline',label:'Reconnecting',time:'—:—',seconds:null,progress:0};
 if(!auction)return {key:'waiting',label:'Between drops',time:'UP NEXT',seconds:null,progress:0};
 if(auction.status==='paused')return {key:'paused',label:'Drop paused',time:formatTime(auction.remaining||0),seconds:null,progress:Math.min(1,(auction.remaining||0)/(auction.duration*1000||1))};
 if(auction.status!=='live')return {key:auction.status,label:({sold:'Lot sold',unsold:'No bids this time',cancelled:'Drop cancelled'})[auction.status]||'Drop ended',time:auction.status==='sold'?'SOLD':'CLOSED',seconds:null,progress:0};
 const remaining=Math.max(0,auction.endsAt-now),seconds=Math.ceil(remaining/1000);
 return {key:seconds===0?'closing':seconds<=10?'final':'live',label:seconds===0?'Waiting for the result':seconds<=10?'Final call':'Bidding closes in',time:formatTime(remaining),seconds,progress:Math.max(0,Math.min(1,remaining/(auction.duration*1000||1)))};
}
function formatTime(ms){const seconds=Math.ceil(Math.max(0,ms)/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export function dropLineup(state){return state.products.filter(p=>p.quantity>0&&p.id!==state.auction?.productId).slice(0,6);}
export class DropEvents {
 constructor(){this.previous=null;this.initialized=false;}
 observe(state,connected=true){
  const a=state.auction,previous=this.previous;
  if(!connected){this.previous=null;this.initialized=false;return null;}
  this.previous=a?{id:a.id,status:a.status,endsAt:a.endsAt,bidId:state.bids?.find(b=>!b.voided)?.id,bidCount:a.bidCount}:null;
  if(!this.initialized){this.initialized=true;return null;}
  if(!a)return null;
  if(!previous)return {type:'open',text:'A new drop is open. '+a.product.title};
  if(previous.id!==a.id)return {type:'open',text:'A new drop is open. '+a.product.title};
  if(a.status==='sold'&&previous.status!=='sold')return {type:'sold',text:`${a.product.title} sold to @${a.highest?.username||'the winning bidder'}.`};
  if(a.status==='paused'&&previous.status!=='paused')return {type:'paused',text:'The drop is paused. The clock is holding.'};
  if(a.status==='live'&&previous.status==='paused')return {type:'open',text:'Bidding is back. The drop has resumed.'};
  if(a.status==='live'&&this.previous.bidId&&this.previous.bidId!==previous.bidId&&a.bidCount>previous.bidCount){
   const extended=a.antiSnipe&&a.endsAt>previous.endsAt;
   return {type:'bid',text:`New high bid from @${a.highest?.username}.${extended?' Late bid: clock reset to 10 seconds.':''}`};
  }
  if(['unsold','cancelled'].includes(a.status)&&previous.status!==a.status)return {type:'closed',text:a.status==='unsold'?'This drop closed without a bid.':'This drop was cancelled.'};
  return null;
 }
}
export function dropHero({state,viewer,connected,now,esc,usd,visual,assetDescription,nextBid}) {
 const a=state.auction,phase=dropPhase(a,now,connected),p=a?.product||dropLineup(state)[0];
 const leading=viewer?.user?.kind==='twitch'&&a?.highest?.username?.toLowerCase()===viewer.user.login.toLowerCase();
 const live=a?.status==='live'&&connected;
 const bids=(state.bids||[]).filter(b=>!b.voided).slice(0,4);
 return `<div class="drop-clock-band" data-drop-phase="${phase.key}"><div><strong data-drop-label>${esc(phase.label)}</strong></div><span class="drop-time" data-drop-time aria-label="${esc(phase.label+' '+phase.time)}">${phase.time}</span><div class="drop-time-track" aria-hidden="true"><span data-drop-progress style="transform:scaleX(${phase.progress})"></span></div></div><div class="drop-event-note" data-drop-event>${a?.status==='sold'?'Auction ended.':a?.status==='paused'?'Bidding paused.':a?.highest?'@'+esc(a.highest.username)+' has the high bid.':''}</div><div class="drop-product-stage"><div class="drop-exhibit"><div class="drop-art">${p?visual(p,true):'<span class="drop-empty-mark" aria-hidden="true">✦</span>'}</div><span class="drop-condition">${esc(p?.condition||'')}</span></div><div class="drop-product-copy"><h2>${esc(p?.title||'No live auction')}</h2>${p?`<details class="drop-product-details"><summary>About this ${p.fulfillment?.type==='nft'?'NFT':'item'}</summary><p>${esc(p.description)}</p>${assetDescription(p)}</details>`:''}${a?`<div class="drop-bid-value"><span>${a.status==='sold'?'Winning bid':a.highest?'Current high bid':'Opening bid'}</span><strong data-drop-price>${usd(a.highest?.amount||p.price)}</strong></div><div class="drop-bid-meta"><span>${a.bidCount} ${a.bidCount===1?'bid':'bids'}</span><span>${a.highest?`@${esc(a.highest.username)} ${a.status==='sold'?'wins':leading?'· you’re leading':'leads'}`:'Be the first to bid'}</span></div>${a.status==='sold'?`<div class="drop-result"><strong>@${esc(a.highest?.username||'winner')}</strong><p>${leading?'That’s you! Open Your orders to complete checkout.':'Winning bidder: complete checkout in Your orders.'}</p><a href="#shop-orders" class="btn">Your orders ↓</a></div>`:a.status==='live'?`<div class="bid-command drop-bid-command"><label>Next minimum bid<code>!bid ${(nextBid(a)/100).toFixed(2)}</code></label><button class="btn primary" data-copy-bid="!bid ${(nextBid(a)/100).toFixed(2)}" ${!live?'disabled':''}>Copy bid command</button><p>${state.mode==='demo'?'Practice drop · no real payments.':viewer?.user?.kind==='twitch'&&viewer.user.registered?(leading?'You’re leading.':''):'Sign in to bid.'}</p>${state.mode==='live'?'<p>Send the command in Twitch chat to bid.</p>':''}</div>`:`<div class="drop-result"><strong>${esc(phase.label)}</strong><p>${a.status==='paused'?'Bidding paused.':''}</p></div>`}`:`<p class="drop-waiting-copy">Waiting for the next lot.</p><a class="btn primary" href="#drop-lineup">Browse lots</a>`}</div></div>${a?`<div class="drop-round-footer"><span>${a.antiSnipe?'Late bids reset the clock to 10s':'Sudden death · fixed deadline'}</span><span>Follow this timer. Video may be delayed.</span></div><details class="drop-bid-feed"><summary>Bid history</summary><div class="drop-feed-title"><span>${bids.length?'Latest accepted bids':'Waiting for the first bid'}</span></div>${bids.length?`<ol>${bids.map((b,i)=>`<li><span class="drop-feed-dot" aria-hidden="true"></span><span>@${esc(b.username)}</span><strong>${usd(b.amount)}</strong>${i===0?'<small>Latest</small>':''}</li>`).join('')}</ol>`:'<p>No bids yet.</p>'}</details>`:''}`;
}
export function lineupMarkup(state,{esc,usd,visual}) {
 const lineup=dropLineup(state);
 return `<section class="drop-lineup-section" id="drop-lineup" aria-label="Drop lineup"><div class="drop-section-heading"><div><h2>Upcoming lots</h2></div></div>${lineup.length?`<div class="drop-lineup-grid">${lineup.map((p,i)=>`<article class="drop-lineup-card"><div class="drop-lineup-image"><span>${String(i+1).padStart(2,'0')}</span>${visual(p)}</div><div><small>${esc(p.condition)}</small><h3>${esc(p.title)}</h3><p>Opening bid <strong>${usd(p.price)}</strong></p></div></article>`).join('')}</div>`:'<p class="drop-lineup-empty">No upcoming lots.</p>'}</section>`;
}
export function updateDropClock(state,now,connected,{animate=true}={}) {
 const band=document.querySelector('[data-drop-phase]');if(!band)return;
 const phase=dropPhase(state.auction,now,connected),time=band.querySelector('[data-drop-time]'),old=time.textContent,previousPhase=band.dataset.dropPhase;
 if(connected&&previousPhase!==phase.key&&phase.key==='final'){const announcer=document.querySelector('#drop-announcer');if(announcer)announcer.textContent='Final call. '+phase.seconds+' seconds remain.';}
 band.dataset.dropPhase=phase.key;
 band.querySelector('[data-drop-label]').textContent=phase.label;
 time.textContent=phase.time;time.setAttribute('aria-label',phase.label+' '+phase.time);
 band.querySelector('[data-drop-progress]').style.transform=`scaleX(${phase.progress})`;
 if(animate&&connected&&old!==phase.time&&phase.key==='final'&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!state.companion?.reducedMotion)time.animate([{transform:'scale(1.035)'},{transform:'scale(1)'}],{duration:180,easing:'cubic-bezier(.2,.7,.2,1)'});
}
export function reactToDrop(event,state,connected) {
 if(!event||!connected)return;
 const announcer=document.querySelector('#drop-announcer');if(announcer)announcer.textContent=event.text;
 const notice=document.querySelector('[data-drop-event]');if(notice){notice.hidden=false;notice.textContent=event.text;notice.dataset.dropEventType=event.type;}
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||state.companion?.reducedMotion)return;
 const target=document.querySelector(event.type==='bid'?'[data-drop-price]':'.drop-exhibit');
 target?.animate([{transform:'translateY(3px) scale(.97)'},{transform:'translateY(0) scale(1)'}],{duration:event.type==='sold'?420:240,easing:'cubic-bezier(.2,.7,.2,1)'});
}
