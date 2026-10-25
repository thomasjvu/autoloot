const status=document.querySelector('#setup-status'),form=document.querySelector('form');
let bootstrap;
try{const r=await fetch('/api/bootstrap');bootstrap=await r.json();if(!r.ok)throw Error(bootstrap.error);document.querySelector('#redirect').textContent=new URL('/auth/twitch/callback',bootstrap.viewerUrl).href;}catch(e){status.textContent=e.message;form.querySelector('button').disabled=true;}
form.onsubmit=async e=>{
 e.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='Saving your app…';
 try{
 const r=await fetch('/api/twitch/configure',{method:'POST',headers:{'Content-Type':'application/json','X-Autoloot-Admin':bootstrap.admin},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
 const data=await r.json();if(!r.ok)throw Error(data.error || 'Could not save app credentials.');
 form.reset();location.assign('/auth/twitch?role=streamer&admin='+encodeURIComponent(bootstrap.admin));
 }catch(e){status.textContent=e.message;button.disabled=false;}
};
