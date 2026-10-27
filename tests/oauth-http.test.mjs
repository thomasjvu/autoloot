import {fetch,adminCookie} from './helpers/admin-client.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {createServer} from 'node:net';

test('OAuth binds browser proof on public origin, supports local streamer handoff and rejects invalid callbacks',async()=>{
 const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const directory=mkdtempSync(join(tmpdir(),'autoloot-oauth-'));const base=`http://localhost:${port}`;
 const fixtureImport='data:text/javascript,'+encodeURIComponent(`const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{if(String(url)==='https://id.twitch.tv/oauth2/token')return Response.json({access_token:'fixture-token'});if(String(url)==='https://id.twitch.tv/oauth2/validate')return Response.json({client_id:'fixture-client',user_id:'fixture-buyer',login:'fixture-buyer'});return original(url,options);};`);
 const child=spawn(process.execPath,['--import',fixtureImport,'server.mjs'],{stdio:'ignore',env:{...process.env,PORT:String(port),DATA_DIR:directory,NODE_ENV:'production',AUTOLOOT_DEMO:'',PUBLIC_URL:'https://shop.example.com',TWITCH_CLIENT_ID:'fixture-client',TWITCH_CLIENT_SECRET:'fixture-secret',STRIPE_API_KEY:'',STRIPE_WEBHOOK_SECRET:''}});
 const get=(path,headers={})=>new Promise((resolve,reject)=>{const req=request(base+path,{headers:{Host:'shop.example.com',...headers}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end();});
 const verifyCookie=response=>{const cookie=response.headers['set-cookie'].join(';');assert.match(cookie,/autoloot_oauth=[a-f0-9]{64}/);for(const value of ['HttpOnly','SameSite=Lax','Path=/auth/twitch/callback','Max-Age=600','Secure'])assert.ok(cookie.includes(value));};
 try{
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready);
  const login=await get('/auth/twitch');assert.equal(login.status,302);verifyCookie(login);
  const state=new URL(login.headers.location).searchParams.get('state');
  for(const extra of [{},{Cookie:'autoloot_oauth='+'b'.repeat(64)}]){
   const response=await get(`/auth/twitch/callback?code=fixture&state=${state}`,{'Sec-Fetch-Site':'cross-site',...extra});
   assert.equal(response.status,400);assert.match(JSON.parse(response.body).error,/browser/);assert.equal(response.headers['set-cookie'],undefined);
  }
  const success=await get(`/auth/twitch/callback?code=fixture&state=${state}`,{'Sec-Fetch-Site':'cross-site',Cookie:login.headers['set-cookie'][0].split(';')[0]});assert.equal(success.status,302);
  const successCookies=success.headers['set-cookie'];assert.ok(successCookies.some(c=>c.startsWith('autoloot_session=')&&c.includes('HttpOnly')&&c.includes('Secure')));assert.ok(successCookies.some(c=>c.startsWith('autoloot_oauth=;')&&c.includes('Max-Age=0')));
  const viewer=await get('/api/viewer',{Cookie:successCookies.find(c=>c.startsWith('autoloot_session=')).split(';')[0]});assert.equal(JSON.parse(viewer.body).user.login,'fixture-buyer');
  const replay=await get(`/auth/twitch/callback?code=fixture&state=${state}`,{'Sec-Fetch-Site':'cross-site',Cookie:login.headers['set-cookie'][0].split(';')[0]});assert.equal(replay.status,400);assert.match(JSON.parse(replay.body).error,/expired/);
  assert.equal((await get('/auth/twitch/callback?code=fixture&state='+state,{Host:'untrusted.example','Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await get('/auth/twitch?role=streamer')).status,400,'public streamer initiation stays restricted');
  const boot=await fetch(base+'/api/bootstrap').then(r=>r.json());
  const start=await get('/auth/twitch?role=streamer',{Host:`localhost:${port}`,'X-Autoloot-Admin':boot.admin,Cookie:adminCookie(base)});assert.equal(start.status,302);assert.equal(start.headers['set-cookie'],undefined);
  const handoff=new URL(start.headers.location);assert.equal(handoff.origin,'https://shop.example.com');assert.equal(handoff.searchParams.has('admin'),false);
  const publicStart=await get(handoff.pathname+handoff.search,{'Sec-Fetch-Site':'cross-site'});assert.equal(publicStart.status,302);verifyCookie(publicStart);assert.match(new URL(publicStart.headers.location).searchParams.get('scope'),/user:write:chat/);
  assert.equal((await get(handoff.pathname+handoff.search,{'Sec-Fetch-Site':'cross-site'})).status,400,'handoff is one-use');
  assert.equal((await get('/auth/twitch/handoff?ticket=invalid',{'Sec-Fetch-Site':'cross-site'})).status,400);
 }finally{const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exited;rmSync(directory,{recursive:true,force:true});}
});
