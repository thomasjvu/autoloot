// Vanilla adaptation of Steez UI LoadingProgressBar (MIT).
// Upstream standalone source and license: /vendor/steez/.
export function loadingProgressBar(progress,{label='Setup completion'}={}){
 const value=Number.isFinite(progress)?Math.max(0,Math.min(100,progress)):0;
 const filled=Math.round(value/100*20);
 const safeLabel=String(label).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<div class="steez-progress" role="progressbar" aria-label="${safeLabel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><div class="steez-progress-segments" aria-hidden="true">${Array.from({length:20},(_,i)=>`<span class="steez-progress-segment ${i<filled?'is-filled':''}"></span>`).join('')}</div><strong class="setup-percent" aria-hidden="true">${Math.round(value)}%</strong></div>`;
}

// Keep the timeline across live DOM refreshes so incoming state cannot restart it.
let timeline=null,animationFrame=null;
export function animateSetupProgress(root=document){
 if(animationFrame!==null)cancelAnimationFrame(animationFrame);
 const bar=root.querySelector('.setup-checklist .steez-progress');
 if(!bar)return;
 const target=Number(bar.getAttribute('aria-valuenow'));
 if(!Number.isFinite(target))return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const now=performance.now();
 const valueAt=time=>{
   if(!timeline)return 0;
   const t=Math.min(1,Math.max(0,(time-timeline.start)/timeline.duration));
   return timeline.from+(timeline.target-timeline.from)*(1-(1-t)**2);
 };
 if(!timeline||timeline.target!==target){
   timeline={from:valueAt(now),target,start:now,duration:900};
 }
 const number=bar.querySelector('.setup-percent'),segments=[...bar.querySelectorAll('.steez-progress-segment')];
 const draw=time=>{
   if(!bar.isConnected)return;
   const finished=reduced.matches||time>=timeline.start+timeline.duration;
   const value=finished?target:valueAt(time);
   number.textContent=`${Math.round(value)}%`;
   const count=Math.round(value/100*segments.length);
   segments.forEach((segment,i)=>segment.classList.toggle('is-filled',i<count));
   // Accessible progress always reports the actual saved completion value.
   if(!finished)animationFrame=requestAnimationFrame(draw);
   else animationFrame=null;
 };
 draw(now);
}
