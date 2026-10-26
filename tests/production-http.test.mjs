import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';

test('real HTTP and SSE projections keep custom instructions private; live scripted provider is rejected',async()=>{
 const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const directory=mkdtempSync(join(tmpdir(),'autoloot-boundaries-'));
 const child=spawn(process.execPath,['server.mjs'],{stdio:'ignore',env:{...process.env,PORT:String(port),DATA_DIR:directory,NODE_ENV:'production',AUTOLOOT_DEMO:'',PUBLIC_URL:`http://localhost:${port}`,TWITCH_CLIENT_ID:'',TWITCH_CLIENT_SECRET:'',STRIPE_API_KEY:'',STRIPE_WEBHOOK_SECRET:''}});
 const base=`http://localhost:${port}`;
 try{
  let boot;for(let i=0;i<60;i++){try{const response=await fetch(base+'/api/bootstrap');if(response.ok){boot=await response.json();break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
  assert.ok(boot,'server started');assert.equal(boot.state.companion.provider,'offline');
  const post=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Autoloot-Admin':boot.admin},body:JSON.stringify(body)});
  assert.equal((await post('/api/companion/profile',{name:'Private profile',tone:'calm',instructions:'INTERNAL_PROFILE_SENTINEL'})).status,200);
  const publicState=await fetch(base+'/api/state').then(r=>r.json());assert.equal(publicState.companion.name,'Private profile');assert.equal(publicState.companion.instructions,undefined);
  assert.equal(JSON.stringify(publicState).includes('INTERNAL_PROFILE_SENTINEL'),false);
  const controller=new AbortController();const events=await fetch(base+'/api/events',{signal:controller.signal});const reader=events.body.getReader();const first=await reader.read();controller.abort();assert.equal(new TextDecoder().decode(first.value).includes('INTERNAL_PROFILE_SENTINEL'),false);
  assert.equal((await post('/api/companion/settings',{provider:'demo'})).status,400);
  assert.equal((await post('/api/companion/ask',{prompt:'next lot'})).status,400);
  const audit=await fetch(base+'/api/audit',{headers:{'X-Autoloot-Admin':boot.admin}}).then(r=>r.json());
  assert.ok(audit.events.some(event=>event.action==='POST /api/companion/profile'&&event.outcome==='completed'));
  assert.ok(audit.events.some(event=>event.action==='POST /api/companion/settings'&&event.outcome==='rejected'));
  assert.ok(audit.events.every(event=>event.actor==='Local streamer'));
  assert.equal(JSON.stringify(audit).includes('INTERNAL_PROFILE_SENTINEL'),false);
  assert.equal((await fetch(base+'/api/audit')).status,403);
  assert.equal(publicState.audit,undefined);

 }finally{
  const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');await exited;rmSync(directory,{recursive:true,force:true});
 }
});
