import test from 'node:test';import assert from 'node:assert/strict';import {Hono} from 'hono';import {createOauth} from '../lib/http/oauth.mjs';
function fixture(){
 let linked=null,issued=0,pendingRole,context;
 const auth={sessions:new Map([['active',Date.now()+60000]]),sessionKey:()=> 'active',get twitchIdentity(){return linked;},linkTwitch:i=>{linked=i;},loginTwitch:i=>{if(i.id!==linked?.id)throw Error('not linked');issued++;return 'session-token';}};
 const twitch={status:{configured:true},login:(r,n,c)=>{pendingRole=r;context=c;return 'https://id.twitch.tv/authorize';},callback:async()=>({role:pendingRole,context,identity:{id:'123',login:'owner'}})};
 const app=new Hono();app.onError((e,c)=>c.json({error:e.message},400));app.use('*',async(c,next)=>{c.set('request',{headers:{host:'localhost:4173'},socket:{}});c.set('prepared',{adminAccess:c.req.header('x-admin')==='yes'});await next();});app.route('/',createOauth({base:'http://localhost:4173',twitch,auth,localHost:()=>true,oauthHandoffs:new Map()}));return {app,auth,setRole:r=>{pendingRole=r;},issued:()=>issued};
}
test('admin OAuth cannot claim ownership and linking requires a live admin session',async()=>{
 const f=fixture();assert.equal((await f.app.request('/auth/twitch?role=admin-login')).status,400);assert.equal((await f.app.request('/auth/twitch?role=admin-link')).status,400);
 assert.equal((await f.app.request('/auth/twitch?role=admin-link',{headers:{'x-admin':'yes'}})).status,302);
 f.auth.sessions.clear();assert.equal((await f.app.request('/auth/twitch/callback?code=x&state=x')).status,400);assert.equal(f.auth.twitchIdentity,null);
 f.auth.sessions.set('active',Date.now()+60000);await f.app.request('/auth/twitch?role=admin-link',{headers:{'x-admin':'yes'}});
 assert.equal((await f.app.request('/auth/twitch/callback?code=x&state=x')).status,302);assert.equal(f.auth.twitchIdentity.id,'123');assert.equal(f.issued(),0);
 await f.app.request('/auth/twitch?role=admin-login');const result=await f.app.request('/auth/twitch/callback?code=x&state=x');assert.equal(result.status,302);assert.match(result.headers.get('set-cookie'),/autoloot_admin=session-token/);assert.equal(f.issued(),1);
});
