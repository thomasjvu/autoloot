// The tour only navigates and explains. It never changes show data or permissions.
const key='autoloot-tour-v1';
const steps=[
 {tab:'studio',title:'Your show starts here',copy:'I’m Munny! I’ll help you find your way. This is your home base: add your first lot here, open Your show for the auction controls.',target:'.welcome-copy,.auction-panel'},
 {tab:'inventory',title:'Bring your own lineup',copy:'Here’s where your lineup begins. Add an item you own, or browse the catalog. You choose the price and condition; I can help draft the details.',target:'.workspace-main [data-action="add-product"]'},
 {tab:'show',title:'Host your show',copy:'Your auction, lineup, audience vote and chat live here. Open Your show from the menu whenever you’re ready to host.',target:'.auction-panel'},
 {tab:'orders',title:'Keep track of every sale',copy:'I’ll keep you pointed toward orders that need attention. This table brings payment, delivery and shipping together; each buyer gets their own private view.',target:'.orders-panel'},
 {tab:'connections',title:'Choose how much to hand over',copy:'Tell me how you want to host: lead each lot, have me check with you, or let an approved queue continue. You can always pause.',target:'.automation-options'},
 {tab:'studio',title:'Munny is a click away',copy:'That’s me down here! Open my panel for chat, notifications and show activity. A red count means something needs you. Come say hi whenever you like.',target:'.mochi-quick-toggle'}
];
let dismissed=false,index=-1,dialog,navigate,returnFocus,outcome='',refresh,observer,frame,targetNode;
try{outcome=localStorage.getItem(key)||'';dismissed=Boolean(outcome);}catch{}
export function tutorialStatus(){return {completed:outcome==='completed',skipped:outcome==='skipped'};}
function remember(result){outcome=result;dismissed=true;try{localStorage.setItem(key,result);}catch{}}
function stepTarget(){const selector=steps[index]?.tab==='connections'&&window.innerWidth<=600?'.automation-option.selected':steps[index]?.target;return selector?document.querySelector(selector)||document.querySelector('.workspace-main h1'):null;}
function clearHighlight(){document.querySelectorAll('.tour-highlight').forEach(el=>el.classList.remove('tour-highlight'));}
function finish(result){document.body.classList.remove('tour-active');observer?.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',scheduleSpotlight);window.removeEventListener('scroll',scheduleSpotlight,true);remember(result);index=-1;clearHighlight();dialog?.close();document.querySelector('.tour-invite')?.remove();refresh?.();if(returnFocus?.isConnected)returnFocus.focus();else {const heading=document.querySelector('.workspace-main h1,.workspace-main main');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}}
function scheduleSpotlight(){cancelAnimationFrame(frame);frame=requestAnimationFrame(positionSpotlight);}
function positionSpotlight(){
 if(index<0 || !dialog?.open)return;
 const target=stepTarget();
 if(!target)return;
 if(targetNode!==target){observer?.disconnect();observer=new ResizeObserver(scheduleSpotlight);observer.observe(target);targetNode=target;}
 const rect=target.getBoundingClientRect(),pad=9,w=window.innerWidth,h=window.innerHeight;
 const left=Math.max(6,rect.left-pad),top=Math.max(6,rect.top-pad),right=Math.min(w-6,rect.right+pad),bottom=Math.min(h-6,rect.bottom+pad);
 for(const node of dialog.querySelectorAll('[data-tour-window]')){
  node.setAttribute('x',left);node.setAttribute('y',top);node.setAttribute('width',Math.max(0,right-left));node.setAttribute('height',Math.max(0,bottom-top));
 }
 const card=dialog.querySelector('.tour-coach'),gap=22,margin=16;
 const cw=card.offsetWidth,ch=card.offsetHeight;
 const clamp=(value,max)=>Math.max(margin,Math.min(value,max-margin));
 const candidates=[
  {x:clamp(right-cw,w-cw),y:bottom+gap},
  {x:clamp(left,w-cw),y:top-ch-gap},
  {x:left-cw-gap,y:clamp(top,h-ch)},
  {x:right+gap,y:clamp(top,h-ch)}
 ];
 const fit=candidates.find(p=>p.x>=margin&&p.x+cw<=w-margin&&p.y>=margin&&p.y+ch<=h-margin);
 const selected=fit||{x:clamp(w-cw-margin,w-cw),y:Math.max(margin,h-ch-margin)};
 card.style.left=selected.x+'px';card.style.top=selected.y+'px';
}
function showStep(){
 const step=steps[index];navigate(step.tab);clearHighlight();
 const target=stepTarget();
 target?.scrollIntoView({block:window.innerWidth<=600?'start':'center',behavior:'instant'});
 dialog.innerHTML=`<svg class="tour-spotlight" aria-hidden="true" width="100%" height="100%"><defs><mask id="tour-window-mask"><rect width="100%" height="100%" fill="white"/><rect data-tour-window rx="14" fill="black"/></mask></defs><rect width="100%" height="100%" fill="#252823" fill-opacity=".24" mask="url(#tour-window-mask)"/><rect data-tour-window rx="14" fill="none" stroke="#71882c" stroke-width="3"/></svg><div class="tour-coach"><div class="tour-heading"><strong>Munny</strong><span>${index+1} / ${steps.length} · ${Math.round((index+1)/steps.length*100)}%</span><button class="text-btn" data-tour-skip>Skip tour</button></div><div class="tour-dialogue"><div><h2 id="tour-title">${step.title}</h2><p id="tour-copy">${step.copy}</p></div><img class="tour-munny" src="/characters/mochi-hero-wave.webp" alt="Munny waves as she shows you around" width="1024" height="1536"></div><div class="tour-progress" aria-hidden="true">${steps.map((_,i)=>`<span class="${i===index?'current':''}"></span>`).join('')}</div><div class="tour-actions"><button class="btn" data-tour-back ${index===0?'disabled':''}>Back</button><button class="btn primary" data-tour-next>${index===steps.length-1?'Let’s go!':'Next →'}</button></div></div>`;
 dialog.querySelector('[data-tour-skip]').onclick=()=>finish('skipped');
 dialog.querySelector('[data-tour-back]').onclick=()=>{if(index>0){index--;showStep();}};
 dialog.querySelector('[data-tour-next]').onclick=()=>{if(index===steps.length-1)finish('completed');else{index++;showStep();}};
 if(!dialog.open)dialog.showModal();
 positionSpotlight();scheduleSpotlight();
 dialog.querySelector('[data-tour-next]').focus({preventScroll:true});
}
export function startTutorial(){
 if(!navigate || document.querySelector('dialog[open]'))return;
 returnFocus=document.activeElement;document.body.classList.add('tour-active');remember('started');document.querySelector('.tour-invite')?.remove();index=0;
 if(!dialog){dialog=document.createElement('dialog');dialog.className='guided-tour';dialog.setAttribute('aria-labelledby','tour-title');dialog.setAttribute('aria-describedby','tour-copy');dialog.addEventListener('cancel',event=>{event.preventDefault();finish('skipped');});document.body.append(dialog);}
 window.addEventListener('resize',scheduleSpotlight);window.addEventListener('scroll',scheduleSpotlight,true);
 showStep();
}
export function mountTutorial(goTo,onChange){
 navigate=goTo;refresh=onChange;
 document.querySelector('[data-start-tutorial]')?.addEventListener('click',startTutorial);
 if(index>=0){scheduleSpotlight();return;}
 if(dismissed || document.querySelector('.tour-invite'))return;
 const invite=document.createElement('aside');invite.className='tour-invite';invite.setAttribute('aria-label','Optional quick tour');
 invite.innerHTML='<button class="tour-invite-close icon-btn" data-tour-dismiss aria-label="Dismiss tour invitation">×</button><span class="tour-speaker">Munny</span><p>Want a quick tour? I can show you around.</p><button class="btn primary" data-tour-start>Show me around →</button>';
 invite.querySelector('[data-tour-start]').onclick=startTutorial;
 invite.querySelector('[data-tour-dismiss]').onclick=()=>{remember('skipped');invite.remove();refresh?.();document.querySelector('#mochi-quick-toggle')?.focus();};
 document.querySelector('.mochi-quick')?.prepend(invite);
}
