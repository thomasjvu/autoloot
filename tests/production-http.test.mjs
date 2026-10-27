import {fetch} from './helpers/admin-client.mjs';
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

test('anonymous sign-in limits separate trusted proxy clients and ignore untrusted address headers',async()=>{
 for(const trusted of ['', '127.0.0.1']){
  const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
  const directory=mkdtempSync(join(tmpdir(),'autoloot-proxy-limits-'));const base=`http://localhost:${port}`;
  const child=spawn(process.execPath,['server.mjs'],{stdio:'ignore',env:{...process.env,PORT:String(port),DATA_DIR:directory,NODE_ENV:'production',AUTOLOOT_DEMO:'',PUBLIC_URL:base,AUTOLOOT_TRUSTED_PROXIES:trusted,TWITCH_CLIENT_ID:'fixture-client',TWITCH_CLIENT_SECRET:'fixture-secret',STRIPE_API_KEY:'',STRIPE_WEBHOOK_SECRET:''}});
  try{
   let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready);
   const login=ip=>fetch(base+'/auth/twitch',{redirect:'manual',headers:{'X-Autoloot-Client-IP':ip}});
   for(let i=0;i<60;i++)assert.equal((await login('203.0.113.1')).status,302);
   assert.equal((await login('203.0.113.1')).status,429);
   assert.equal((await login('203.0.113.2')).status,trusted?302:429);
   assert.equal((await fetch(base+'/api/bootstrap',{headers:{'X-Autoloot-Client-IP':'203.0.113.2'}})).status,403);
  }finally{const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exited;rmSync(directory,{recursive:true,force:true});}
 }
});
