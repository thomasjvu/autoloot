import test from 'node:test';
import assert from 'node:assert/strict';
import {runtimeConfig} from '../lib/platform/runtime.mjs';
import {createHostedNodeAuth} from '../lib/auth/hosted-node-auth.mjs';
import {validateWorkerProduction} from '../scripts/deploy/worker-production.mjs';
import {readFileSync} from 'node:fs';

test('hosted Node requires explicit owner, credentials, persistent storage and HTTPS',()=>{
 const env={AUTOLOOT_NODE_MODE:'hosted',PUBLIC_URL:'https://shop.example.com',AUTOLOOT_OWNER_TWITCH_ID:'123',TWITCH_CLIENT_ID:'id',TWITCH_CLIENT_SECRET:'secret',DATA_DIR:'/data'};
 assert.equal(runtimeConfig(env).host,'0.0.0.0');
 for(const key of ['PUBLIC_URL','AUTOLOOT_OWNER_TWITCH_ID','TWITCH_CLIENT_ID','TWITCH_CLIENT_SECRET','DATA_DIR'])assert.throws(()=>runtimeConfig({...env,[key]:''}));
 assert.equal(runtimeConfig({}).host,'127.0.0.1');
});
test('hosted Node accepts only owner streamer sessions and revokes them on logout',async()=>{
 const sessions=new Map([['owner',{id:'123',role:'streamer'}],['viewer',{id:'123',role:'viewer'}],['other',{id:'456',role:'streamer'}]]);
 let closed=false;
 const req={headers:{cookie:'owner'}};
 const {auth,routes}=createHostedNodeAuth({owner:'123',twitch:{session:cookie=>sessions.get(cookie),logout:cookie=>sessions.delete(cookie)},events:{clients:[{role:'admin',request:req,close(){closed=true;}}]}});
 for(const cookie of ['viewer','other',undefined])assert.equal(auth.valid({headers:{cookie}}),false);
 assert.equal(auth.valid(req),true);
 routes.use('*',async(c,next)=>{await next();});
 // Mount middleware before the routes to supply transport context.
 const {Hono}=await import('hono');const app=new Hono();
 app.use('*',async(c,next)=>{c.set('request',req);await next();});app.route('/',routes);
 for(const path of ['/api/admin/setup','/api/admin/login','/api/admin/twitch/unlink'])assert.equal((await app.request(path,{method:'POST'})).status,403);
 const response=await app.request('/api/admin/logout',{method:'POST'});
 assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/Secure/);assert.equal(auth.valid(req),false);assert.equal(closed,true);
});
test('Worker production preflight rejects placeholders and local origins',()=>{
 const config=JSON.parse(readFileSync(new URL('../wrangler.production.example.json',import.meta.url),'utf8'));
 assert.ok(validateWorkerProduction(config).length);
 config.vars.PUBLIC_URL='https://shop.autoloot.test';config.routes=[{pattern:'shop.autoloot.test',custom_domain:true}];
 config.vars.AUTOLOOT_OWNER_TWITCH_ID='123';config.d1_databases[0].database_id='12345678-1234-1234-1234-123456789abc';
 assert.deepEqual(validateWorkerProduction(config),[]);
 config.vars.AUTOLOOT_OWNER_TWITCH_ID='';assert.ok(validateWorkerProduction(config).length);
 config.vars.AUTOLOOT_SETUP_ONLY='1';assert.deepEqual(validateWorkerProduction(config),[]);
 config.vars.PUBLIC_URL='http://localhost:8787';assert.ok(validateWorkerProduction(config).length);
});

test('hosted Node HTTP protects bootstrap, accepts Railway health probes and starts owner OAuth',async()=>{
 const {spawn}=await import('node:child_process');
 const {mkdtempSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const {createServer}=await import('node:net');
 const reservation=createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const directory=mkdtempSync(join(tmpdir(),'autoloot-hosted-'));
 const child=spawn(process.execPath,['server.mjs'],{stdio:'ignore',env:{...process.env,AUTOLOOT_NODE_MODE:'hosted',HOST:'127.0.0.1',PORT:String(port),DATA_DIR:directory,NODE_ENV:'production',AUTOLOOT_DEMO:'',PUBLIC_URL:'https://shop.example.com',AUTOLOOT_OWNER_TWITCH_ID:'123',TWITCH_CLIENT_ID:'fixture',TWITCH_CLIENT_SECRET:'fixture',STRIPE_API_KEY:'',STRIPE_WEBHOOK_SECRET:'',METADATA_MODE:'demo'}});
 const {request:rawRequest}=await import('node:http');
 const request=(path,options={})=>new Promise((resolve,reject)=>{const req=rawRequest({hostname:'127.0.0.1',port,path,method:options.method||'GET',headers:{host:'shop.example.com',...options.headers}},response=>{response.resume();resolve({status:response.statusCode,ok:response.statusCode===200,headers:new Headers(Object.entries(response.headers).map(([k,v])=>[k,Array.isArray(v)?v.join(','):v]))});});req.on('error',reject);req.end(options.body);});
 try{
  let ready=false;for(let i=0;i<80;i++){try{if((await request('/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready,'hosted server starts');
  assert.equal((await request('/api/bootstrap')).status,403);
  assert.equal((await request('/api/admin/setup',{method:'POST',body:'{}'})).status,403);
  assert.equal((await request('/')).headers.get('location'),'/auth/twitch?role=streamer');
  const oauth=await request('/auth/twitch?role=streamer');assert.equal(oauth.status,302);assert.match(oauth.headers.get('location'),/^https:\/\/id.twitch.tv/);assert.match(oauth.headers.get('set-cookie'),/Secure/);
  assert.equal((await request('/api/health',{headers:{host:'healthcheck.railway.app'}})).status,200);
  assert.equal((await request('/api/state',{headers:{host:'healthcheck.railway.app'}})).status,403);
  assert.equal((await request('/api/health',{method:'POST',headers:{host:'healthcheck.railway.app'}})).status,403);
  assert.equal((await request('/api/health',{headers:{host:'evil.example'}})).status,403);
 }finally{
  if(child.exitCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exited;}
  rmSync(directory,{recursive:true,force:true});
 }
});
