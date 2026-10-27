// Vanilla adaptation of Steez UI LoadingProgressBar (MIT).
// Upstream standalone source and license: /vendor/steez/.
export function loadingProgressBar(progress,{label='Setup completion'}={}){
 const value=Number.isFinite(progress)?Math.max(0,Math.min(100,progress)):0;
 const filled=Math.round(value/100*20);
 const safeLabel=String(label).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<div class="steez-progress" role="progressbar" aria-label="${safeLabel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><div class="steez-progress-segments" aria-hidden="true">${Array.from({length:20},(_,i)=>`<span class="steez-progress-segment ${i<filled?'is-filled':''}" style="--bar-delay:${i*20}ms"></span>`).join('')}</div><strong class="setup-percent" aria-hidden="true">${Math.round(value)}%</strong></div>`;
}
