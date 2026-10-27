let crop='0.65',reviewVariant='',reviewSelectionId=null,cancelPending=null;
let scanController;
let stream, video=document.createElement('video'), busy=false, epoch=0;
video.muted=true; video.autoplay=true; video.playsInline=true;
let message='Share the pack camera or stream window. Only the selected center area is sent when you scan.';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ripPage(state) {
 const r=state.rip||{},o=r.observation,s=r.selected;
 if((s?.selectionId||null)!==reviewSelectionId){reviewVariant='';reviewSelectionId=s?.selectionId||null;}
 return `<div class="page-heading"><h1>Rip studio</h1></div><div class="rip-workspace"><section class="panel rip-camera"><div id="rip-preview" class="${stream?'is-sharing':''}"><div class="rip-placeholder"><span aria-hidden="true">✦</span><h2>Show your next pull</h2><p>Connect your camera or share a window.</p></div></div><div class="rip-control-bar"><div><button class="btn" id="rip-camera">Use camera</button><button class="text-btn" id="rip-screen">Share window</button><button class="text-btn" id="rip-stop" ${stream?'':'hidden'}>Stop</button></div><button class="btn primary" id="rip-scan" ${stream?'':'disabled'}>Scan card</button></div><p id="rip-status" class="rip-status" role="status">${esc(message)}</p><details class="rip-options"><summary>Capture settings</summary><div class="rip-option-fields"><label>Read with<select id="rip-provider"><option value="local" ${r.vision?.mode==='local'?'selected':''}>Local Moondream</option><option value="cloud" ${r.vision?.mode==='cloud'?'selected':''}>Prime Inference${r.vision?.cloudConfigured?'':' · needs key'}</option></select></label><label>Frame area<select id="rip-crop"><option value="1" ${crop==='1'?'selected':''}>Full frame</option><option value="0.65" ${crop==='0.65'?'selected':''}>Center 65%</option><option value="0.4" ${crop==='0.4'?'selected':''}>Center 40%</option></select></label></div><p>${r.vision?.mode==='cloud'?'Selected frames go to Prime Inference.':'Vision runs on this machine.'}${r.elapsedMs?` Last read: ${(r.elapsedMs/1000).toFixed(1)}s.`:''} Hold one card steady with its name and number visible.</p></details></section><section class="panel rip-match"><h2>${s?'Review your pull':o?.name?esc(o.name):'Your next reveal'}</h2>${o&&!s?`<p class="rip-observation">${esc([o.number,o.setName].filter(Boolean).join(' · ')||'Choose the matching card below.')}</p>`:''}${!o&&!s?'<div class="rip-reveal-empty"><span aria-hidden="true">◇</span><p>Scan a card, then confirm its match.</p></div>':''}${r.error?`<p class="error-box">${esc(r.error)}</p>`:''}<div class="rip-candidates">${(r.candidates||[]).map(c=>`<button class="btn" data-rip-card="${esc(c.id)}"><strong>${esc(c.name)} ${esc(c.number)}</strong><small>${esc(c.setName||c.code)}</small></button>`).join('')}</div>${s?`<form id="rip-confirm" class="stack-form"><input type="hidden" name="selectionId" value="${esc(s.selectionId)}"><div class="rip-selected"><strong>${esc(s.name)} #${esc(s.number)}</strong><p>${esc(s.setName)}${s.rarity?' · '+esc(s.rarity):''}</p></div><details><summary>Add a market guide</summary><label>Printing<select name="variant"><option value="">No price</option>${s.variants.map(v=>`<option value="${esc(v.key)}" ${reviewVariant===v.key?'selected':''}>${esc(v.label)} · ${esc(v.currency)} ${v.price.toFixed(2)}${v.stale?' · stale':''}</option>`).join('')}</select></label><small>Match the printing and finish. Market guides aren’t guaranteed sale prices.</small></details><button class="btn primary">Confirm pull</button></form>`:''}<form id="rip-search" class="rip-search"><label for="rip-card-query">${o||s?'Find a different match':'Find a card manually'}</label><div><input id="rip-card-query" name="query" placeholder="Name or collector number" required maxlength="160"><button class="btn" aria-label="Search catalog">Search</button></div></form></section></div><section class="panel rip-log"><div class="panel-header"><h2>Recent pulls <span class="soft-count">${(r.pulls||[]).length}</span></h2><button class="text-btn" id="rip-export">Export</button></div>${(r.pulls||[]).slice(0,20).map(p=>`<article><strong>${esc(p.name)} #${esc(p.number)}</strong><span>${esc(p.setName)}</span></article>`).join('')||'<p class="empty">Your confirmed pulls will appear here.</p>'}</section>`;
}
export function disposeRip(){if(busy)cancelPending?.();scanController?.abort();epoch++;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;}
export function wireRip({api,token,toast,state,refresh}) {
 const root=document.querySelector('#rip-preview'); if(!root)return;
 root.append(video);cancelPending=()=>api('/api/rip/clear',{}).catch(()=>{});
 const status=t=>{message=t;const el=document.querySelector('#rip-status');if(el)el.textContent=t;};
 async function share(camera) {
  try {
   const requestEpoch=epoch;
   const next=camera?await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false}):await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
   if(requestEpoch!==epoch||!document.querySelector('#rip-preview')){next.getTracks().forEach(track=>track.stop());return;}
   stop();stream=next;video.srcObject=stream;await video.play();if(stream!==next)return;document.querySelector('#rip-preview')?.classList.add('is-sharing');document.querySelector('#rip-scan').disabled=false;document.querySelector('#rip-stop').hidden=false;status('Preview ready. Select the capture area and scan a reveal.');
   stream.getVideoTracks()[0].onended=stop;
  }catch(e){toast(e.message);}
 }
 function stop(){if(busy)cancelPending?.();scanController?.abort();epoch++;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;document.querySelector('#rip-preview')?.classList.remove('is-sharing');const scanButton=document.querySelector('#rip-scan'),stopButton=document.querySelector('#rip-stop');if(scanButton)scanButton.disabled=true;if(stopButton)stopButton.hidden=true;status('Sharing stopped.');}
 async function scan(){
  if(busy)return; if(!stream || !video.videoWidth){toast('Share a screen or camera first.');return;}
  busy=true;const current=epoch;status('Reading the reveal…');scanController=new AbortController();
  try {
   const crop=Number(document.querySelector('#rip-crop')?.value || .65), w=video.videoWidth*crop,h=video.videoHeight*crop;
   const canvas=document.createElement('canvas');const scale=Math.min(1,1280/w,1280/h);canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
   canvas.getContext('2d').drawImage(video,(video.videoWidth-w)/2,(video.videoHeight-h)/2,w,h,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.86));
   const response=await fetch('/api/rip/frame',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Autoloot-Admin':token},body:blob,signal:AbortSignal.any([scanController.signal,AbortSignal.timeout(45000)])});
   const result=await response.json();if(!response.ok)throw Error(result.error || 'Recognition failed.');
   if(current===epoch){status('Reveal read. Review the Metadata match.');reviewVariant='';await refresh();}
  }catch(e){if(current===epoch){status(e.message);toast(e.message);}}finally{busy=false;}
 }
 document.querySelector('#rip-crop').onchange=e=>{crop=e.target.value;};
 document.querySelector('[name=variant]')?.addEventListener('change',e=>{reviewVariant=e.target.value;});
 document.querySelector('#rip-provider').onchange=async e=>{scanController?.abort();epoch++;try{await api('/api/rip/provider',{mode:e.target.value});await refresh();}catch(error){toast(error.message);}};
 document.querySelector('#rip-screen').onclick=()=>share(false);
 document.querySelector('#rip-camera').onclick=()=>share(true);
 document.querySelector('#rip-stop').onclick=stop;
 document.querySelector('#rip-scan').onclick=scan;

 const act=async(path,b)=>{try{await api(path,b);await refresh();}catch(e){toast(e.message);}};
 document.querySelector('#rip-search').onsubmit=e=>{e.preventDefault();act('/api/rip/search',Object.fromEntries(new FormData(e.target)));};
 document.querySelectorAll('[data-rip-card]').forEach(el=>el.onclick=()=>{reviewVariant='';act('/api/rip/select',{id:el.dataset.ripCard});});
 document.querySelector('#rip-confirm')?.addEventListener('submit',e=>{e.preventDefault();reviewVariant='';act('/api/rip/confirm',Object.fromEntries(new FormData(e.target)));});
 document.querySelector('#rip-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state.rip.pulls,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='autoloot-pulls.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
window.addEventListener('pagehide',disposeRip);
