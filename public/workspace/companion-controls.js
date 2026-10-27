import {esc} from '../shared/presenters.js';
export function createCompanionControls({getState,getToken,refresh,api,modal,toast,document,fetch}) {
 const $=selector=>document.querySelector(selector);
function companionProfileDialog(){
 const c=getState().companion;
 modal(`<h2>Your companion</h2><form id="companion-profile-form" class="stack-form"><label>Name<input name="name" maxlength="40" value="${esc(c.name||'Munny')}" required></label><label>Tone<select name="tone">${['warm','concise','playful','calm'].map(tone=>`<option ${tone===(c.tone||'warm')?'selected':''}>${tone}</option>`).join('')}</select></label><label>Preferences<textarea name="instructions" maxlength="1000" placeholder="e.g. Keep replies short and focus on TCG listings.">${esc(c.instructions||'')}</textarea></label><label>Avatar (optional)<input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="field-help">Personalize the voice and look. Payment, listing and approval rules stay the same.</p><button class="btn primary">Save companion</button><button type="button" class="text-btn" id="restore-munny">Restore Munny</button></form>`);
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
function wire(){
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
