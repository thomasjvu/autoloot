let stream, video=document.createElement('video'), running=false, timer, busy=false, epoch=0;
video.muted=true; video.autoplay=true; video.playsInline=true;
let message='Share the pack camera or stream window. Only the selected center area is sent when you scan.';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ripPage(state) {
 const r=state.rip || {}, o=r.observation, s=r.selected;
 return `<div class="rip-title"><h1>Rip studio ☺</h1><p>Open packs. Meet your pulls. Let Mochi host.</p></div><div class="rip-grid"><section class="panel rip-camera"><h2>Your table, live.</h2><div id="rip-preview"></div><p id="rip-status" role="status">${esc(message)}</p><div class="rip-buttons"><button class="btn primary" id="rip-screen">Share screen</button><button class="btn" id="rip-camera">Use camera</button><button class="btn" id="rip-stop">Stop sharing</button></div><label>Capture area <select id="rip-crop"><option value="1">Whole source</option><option value="0.65" selected>Center 65%</option><option value="0.4">Center 40%</option></select></label><div class="rip-buttons"><button class="btn primary" id="rip-scan">Scan reveal</button><button class="btn" id="rip-auto">${running?'Pause':'Start'} auto scan</button></div><p>Auto scan reads the next reveal, then pauses for review. Hold one card still with its name and number visible. Each scan uses your local Codex login.</p></section><section class="panel rip-match"><h2>What did we pull?</h2>${o?`<p><strong>${esc(o.kind)} · ${esc(o.name || o.setName || 'Not readable yet')}</strong></p><p>${esc(o.number)} ${esc(o.language)} ${esc(o.finish)}</p><p>${esc(o.visibleText)}</p>`:'<p>Your next reveal goes here. Pack recognition identifies a set candidate; it does not establish a sealed product or its value.</p>'}${r.error?`<p class="error-box">${esc(r.error)}</p>`:''}<form id="rip-search"><label>Find or correct the card <input name="query" placeholder="Card name / collector number" required maxlength="160"></label><button class="btn">Search Metadata</button></form><p>Source: ${esc(r.source)} · Review set and collector number before confirming.</p><div class="rip-candidates">${(r.candidates || []).map(c=>`<button class="btn" data-rip-card="${esc(c.id)}">${esc(c.name)} ${esc(c.number)}<small>${esc(c.setName || c.code)}</small></button>`).join('')}</div>${s?`<form id="rip-confirm"><h3>${esc(s.name)} #${esc(s.number)}</h3><p>${esc(s.setName)} · ${esc(s.rarity)}</p><label>Matching raw variant <select name="variant"><option value="">No price / finish uncertain</option>${s.variants.map(v=>`<option value="${esc(v.key)}">${esc(v.label)} · ${esc(v.currency)} ${v.price.toFixed(2)}${v.stale?' · STALE':''}</option>`).join('')}</select></label><p>Match the printing, language and finish. Quotes are guides, not guaranteed sale prices.</p><button class="btn primary">Confirm pull + let Mochi host</button></form>`:''}</section></div><section class="panel rip-log"><div class="rip-buttons"><h2>The pull pile (${(r.pulls || []).length})</h2><button class="btn" id="rip-export">Export JSON</button></div><p>Session history stays in server memory. Export before restarting.</p>${(r.pulls || []).map(p=>`<article><strong>${esc(p.name)} #${esc(p.number)}</strong><span>${esc(p.setName)}</span><span>${p.price?`${esc(p.price.currency)} ${p.price.price.toFixed(2)} · ${esc(p.price.label)} · ${esc(p.price.asOf)}${p.price.stale?' · stale':''}`:'Unpriced'}</span></article>`).join('') || '<p>No pulls yet. Let’s find something good.</p>'}</section>`;
}
export function wireRip({api,token,toast,state,refresh}) {
 const root=document.querySelector('#rip-preview'); if(!root)return;
 root.append(video);
 const status=t=>{message=t;const el=document.querySelector('#rip-status');if(el)el.textContent=t;};
 async function share(camera) {
  try {
   const next=camera?await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false}):await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
   stop();stream=next;video.srcObject=stream;await video.play();status('Preview ready. Select the capture area and scan a reveal.');
   stream.getVideoTracks()[0].onended=stop;
  }catch(e){toast(e.message);}
 }
 function stop(){epoch++;running=false;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;status('Sharing stopped.');}
 async function scan(){
  if(busy)return; if(state.rip?.selected && running){running=false;status("Auto scan paused while you review the selected card.");return;} if(!stream || !video.videoWidth){toast('Share a screen or camera first.');return;}
  busy=true;const current=epoch;status('Mochi is reading the reveal…');
  try {
   const crop=Number(document.querySelector('#rip-crop')?.value || .65), w=video.videoWidth*crop,h=video.videoHeight*crop;
   const canvas=document.createElement('canvas');const scale=Math.min(1,1280/w,1280/h);canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
   canvas.getContext('2d').drawImage(video,(video.videoWidth-w)/2,(video.videoHeight-h)/2,w,h,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.86));
   const response=await fetch('/api/rip/frame',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Autoloot-Admin':token},body:blob,signal:AbortSignal.timeout(110000)});
   const result=await response.json();if(!response.ok)throw Error(result.error || 'Recognition failed.');
   if(current===epoch){status('Reveal read. Review the Metadata match.');await refresh();running=false;clearTimeout(timer);}
  }catch(e){status(e.message);running=false;toast(e.message);}finally{busy=false;if(running && current===epoch)timer=setTimeout(scan,15000);}
 }
 document.querySelector('#rip-screen').onclick=()=>share(false);
 document.querySelector('#rip-camera').onclick=()=>share(true);
 document.querySelector('#rip-stop').onclick=stop;
 document.querySelector('#rip-scan').onclick=scan;
 document.querySelector('#rip-auto').onclick=()=>{running=!running;clearTimeout(timer);if(running)scan();status(running?'Auto scan enabled.':'Auto scan paused.');};
 const act=async(path,b)=>{try{await api(path,b);await refresh();}catch(e){toast(e.message);}};
 document.querySelector('#rip-search').onsubmit=e=>{e.preventDefault();act('/api/rip/search',Object.fromEntries(new FormData(e.target)));};
 document.querySelectorAll('[data-rip-card]').forEach(el=>el.onclick=()=>act('/api/rip/select',{id:el.dataset.ripCard}));
 document.querySelector('#rip-confirm')?.addEventListener('submit',e=>{e.preventDefault();running=false;clearTimeout(timer);act('/api/rip/confirm',Object.fromEntries(new FormData(e.target)));});
 document.querySelector('#rip-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state.rip.pulls,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='autoloot-pulls.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
window.addEventListener('pagehide',()=>{running=false;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());});
