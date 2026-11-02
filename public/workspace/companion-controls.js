import {esc} from '../shared/presenters.js';
export function createCompanionControls({getState,getToken,refresh,api,modal,toast,document,fetch}) {
 const $=selector=>document.querySelector(selector);
function companionProfileDialog(){
 const c=getState().companion;
 modal(`<h2>Your companion</h2><form id="companion-profile-form" class="stack-form"><label>Name<input name="name" maxlength="40" value="${esc(c.name||'Munny')}" required></label><label>Tone<select name="tone">${['warm','concise','playful','calm'].map(tone=>`<option ${tone===(c.tone||'warm')?'selected':''}>${tone}</option>`).join('')}</select></label><label>Preferences<textarea name="instructions" maxlength="1000" placeholder="e.g. Keep replies short and focus on TCG listings.">${esc(c.instructions||'')}</textarea></label><label>Avatar (optional)<input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="field-help">Personalize the voice and look. Payment, listing and approval rules stay the same.</p><button class="btn primary">Save companion</button><button type="button" class="text-btn" id="restore-munny">Restore Munny</button></form><section class="settings-panel"><h3>Stream & accessibility</h3>${[['Overlay voice','overlayVoice'],['Show in overlay','enabled'],['Reduced motion','reducedMotion']].map(([label,key])=>`<div class="setting-row"><strong>${label}</strong><label class="toggle"><input type="checkbox" aria-label="${label}" data-setting="${key}" ${c[key]?'checked':''}><span></span></label></div>`).join('')}<a class="text-btn" href="/docs/integrations/twitch" target="_blank" rel="noopener">OBS setup ↗</a></section>`);
 $('#modal').querySelectorAll('[data-setting]').forEach(el=>{el.onchange=async()=>{try{await api('/api/companion/settings',{[el.dataset.setting]:el.checked});}catch(error){el.checked=!el.checked;toast(error.message);}};});
 $('#restore-munny').onclick=async()=>{try{await api('/api/companion/profile',{reset:true});$('#modal').close();await refresh();}catch(error){toast(error.message);}};
 $('#companion-profile-form').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{const data=new FormData(event.target);let avatar=c.avatar||'/characters/mochi-street-v3.png';const file=data.get('avatarFile');if(file?.size){const response=await fetch('/api/upload',{method:'POST',headers:{'X-Autoloot-Admin':getToken()},body:file});const result=await response.json();if(!response.ok)throw Error(result.error);avatar=result.image;}await api('/api/companion/profile',{name:data.get('name'),tone:data.get('tone'),instructions:data.get('instructions'),avatar});$('#modal').close();await refresh();}catch(error){toast(error.message);button.disabled=false;}};
}
async function ask(prompt) {
  try {
    await api("/api/companion/ask", { prompt });
  } catch (e) {
    toast(e.message);
  }
}
async function connectCodex(){
 modal('<h2>Connect Codex</h2><p role="status" id="codex-connection-status">Checking Codex on this computer…</p><div id="codex-connection-actions"></div>');
 let timer=null,checking=false;
 const dialog=$('#modal'),status=$('#codex-connection-status'),actions=$('#codex-connection-actions');
 const active=()=>dialog.open&&$('#codex-connection-status')===status;
 const stop=()=>{clearTimeout(timer);timer=null;};
 dialog.addEventListener('close',stop,{once:true});
 async function useAccount(){
  try{await api('/api/companion/settings',{provider:'codex'});stop();dialog.close();await refresh();toast('Codex connected.');}catch(error){if(active())status.textContent=error.message;}
 }
 function connected(result){
  stop();status.textContent=`Signed in with ${result.method || 'Codex'}. Ready to connect.`;
  actions.innerHTML='<button class="btn primary full" id="use-codex-account">Use this account</button><p class="field-help">Uses the same sign-in as Codex CLI on this computer. Disconnecting Autoloot will not sign you out of other Codex apps.</p>';
  $('#use-codex-account').onclick=useAccount;
 }
 async function check(){
  if(!active()||checking)return;checking=true;
  try{
   const result=await api('/api/companion/connection/status',{});if(!active())return;
   if(result.connected){await useAccount();return;}
   if(result.error||!result.pending){stop();status.textContent=result.error||'Sign-in ended. Close this panel and try connecting again.';return;}
   timer=setTimeout(check,2000);
  }catch(error){if(active()){status.textContent=error.message;stop();}}
  finally{checking=false;}
 }
 async function start(){
  actions.innerHTML='';status.textContent='Preparing secure sign-in…';
  try{
   const result=await api('/api/companion/connection/start',{});if(!active())return;
   if(result.connected){connected(result);return;}
   if(result.bridge){
    status.textContent='Start the companion on your computer, then enter this one-time pairing code.';
    actions.innerHTML=`<p>Run from your Autoloot checkout:</p><pre>${esc(result.command)}</pre><p>Pairing code (expires in ten minutes):</p><code>${esc(result.pairCode)}</code>`;
    timer=setTimeout(check,2000);return;
   }
   const url=new URL(result.authUrl);if(url.origin!=='https://auth.openai.com')throw Error('Invalid sign-in address.');
   status.textContent='Sign in with OpenAI, then return here. We’ll finish connecting automatically.';
   actions.innerHTML=`<a class="btn primary full" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">Continue to OpenAI ↗</a><button class="text-btn" id="cancel-codex-login">Cancel sign-in</button>`;
   $('#cancel-codex-login').onclick=async()=>{stop();try{await api('/api/companion/connection/cancel',{});dialog.close();}catch(error){status.textContent=error.message;}};
   timer=setTimeout(check,2000);
  }catch(error){if(active()){status.textContent=error.message;actions.innerHTML='<p class="field-help">Install the Codex CLI on this computer if needed, then retry.</p><code>npm install -g @openai/codex</code><button class="btn full" id="retry-codex">Try again</button><a class="text-btn" href="https://learn.chatgpt.com/docs/auth" target="_blank" rel="noopener noreferrer">Sign-in help ↗</a>';$('#retry-codex').onclick=start;}}
 }
 try{
  const result=await api('/api/companion/connection/status',{});if(!active())return;
  if(result.connected)connected(result);
  else if(result.bridge){status.textContent='Connect your local Codex companion to this hosted workspace.';actions.innerHTML='<button class="btn primary full" id="start-companion-pairing">Pair this computer</button>';$('#start-companion-pairing').onclick=start;}
  else{status.textContent='Sign in to Codex using your ChatGPT account. OpenAI handles your credentials.';actions.innerHTML='<button class="btn primary full" id="start-codex-login">Sign in with ChatGPT</button>';$('#start-codex-login').onclick=start;
   actions.insertAdjacentHTML('beforeend','<details class="form-details"><summary>Use an API key instead</summary><form id="codex-api-form" class="stack-form"><label>OpenAI API key<input name="apiKey" type="password" required maxlength="512" autocomplete="off" spellcheck="false"></label><p class="field-help">API usage is billed to your OpenAI API account. The key is stored by Codex on this computer.</p><button class="btn full">Connect API key</button></form></details>');
   $('#codex-api-form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),key=form.elements.apiKey.value;button.disabled=true;form.reset();try{const result=await api('/api/companion/connection/key',{apiKey:key});if(active()){if(!result.connected)throw Error('Codex could not confirm this API key.');await useAccount();}}catch(error){if(active()){status.textContent=error.message;button.disabled=false;}}};
}
 }catch(error){if(active()){status.textContent=error.message;actions.innerHTML='<p class="field-help">Install or update Codex CLI on this computer, then try again.</p><code>npm install -g @openai/codex</code><button class="btn full" id="retry-codex">Try again</button>';$('#retry-codex').onclick=()=>{dialog.close();connectCodex();};}}
}
function wire(){
 $('[data-codex-connect]')?.addEventListener('click',connectCodex);
 $('[data-codex-disconnect]')?.addEventListener('click',async()=>{try{await api('/api/companion/connection/cancel',{});await api('/api/companion/settings',{provider:'offline'});await refresh();toast('Companion disconnected.');}catch(error){toast(error.message);}});
  document.querySelectorAll("[data-setting]").forEach(
    (el) =>
      (el.onchange = async () => {
        try {
          await api("/api/companion/settings", {
            [el.dataset.setting]: el.checked,
          });
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  document
    .querySelectorAll("[data-prompt]")
    .forEach((el) => (el.onclick = () => ask(el.dataset.prompt)));
  $("#provider")?.addEventListener("change", async (e) => {
    try {
      await api("/api/companion/settings", { provider: e.target.value });
    } catch (e) {
      toast(e.message);
    }
  });
  $("#companion-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(new FormData(e.target).get("prompt"));
  });
}
return {profile:companionProfileDialog,ask,wire};
}
