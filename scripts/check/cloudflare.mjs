import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFileSync,mkdtempSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),directory=mkdtempSync(join(tmpdir(),'autoloot-cloudflare-'));
const checks=[],origin='https://workspace.example';
const workerOptions={
  workers:[{
    name:'workspace',modules:true,scriptPath:join(root,'.worker-build/worker.js'),compatibilityDate:'2026-10-30',compatibilityFlags:['nodejs_compat'],
    bindings:{PUBLIC_URL:origin,AUTOLOOT_WORKSPACE_ID:'fixture',AUTOLOOT_OWNER_TWITCH_ID:'42',TWITCH_CLIENT_ID:'fixture-client',TWITCH_CLIENT_SECRET:'fixture-secret',METADATA_MODE:'demo',STRIPE_API_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture'},
    durableObjects:{WORKSPACES:{className:'Workspace',useSQLite:true}},d1Databases:{DB:'fixture-d1'},r2Buckets:{MEDIA:'fixture-r2'},
    assets:{directory:join(root,'public'),binding:'ASSETS',run_worker_first:true,routerConfig:{has_user_worker:true},assetConfig:{html_handling:'none'}},
    outboundService:'providers',
  },{name:'providers',modules:true,scriptPath:join(root,'tests/fixtures/cloudflare/providers.mjs'),compatibilityDate:'2026-10-30'}],
  resourcePersistencePath:directory,
};
const options=convertV4MiniflareOptions(workerOptions);
let mf=new Miniflare(options);
const call=(path,options={})=>mf.dispatchFetch(origin+path,{redirect:'manual',...options});
async function login(role,code){
  const start=await call('/auth/twitch?role='+role);if(start.status!==302)throw Error(await start.text());
  const state=new URL(start.headers.get('location')).searchParams.get('state');
  const cookie=start.headers.get('set-cookie').split(';')[0];
  const result=await call('/auth/twitch/callback?'+new URLSearchParams({state,code}),{headers:{Cookie:cookie}});
  return {result,cookie:result.headers.get('set-cookie')?.split(';')[0]};
}
try{
  const {DB,MEDIA}=await mf.getBindings('workspace');
  await DB.batch(readFileSync(join(root,'cloudflare/migrations/0001_hosted.sql'),'utf8').split(';').map(s=>s.trim()).filter(Boolean).map(s=>DB.prepare(s)));
  const health=await call('/api/health');if(health.status!==200)throw Error(await health.text());
  assert.equal((await mf.dispatchFetch('https://untrusted.example/api/health')).status,403);
  assert.equal((await call('/api/bootstrap')).status,403);
  const intruder=await login('streamer','buyer');assert.equal(intruder.result.status,400);assert.equal(intruder.cookie,undefined);
  const owner=await login('streamer','owner');assert.equal(owner.result.status,302);assert.ok(owner.cookie);
  const bootstrap=await (await call('/api/bootstrap',{headers:{Cookie:owner.cookie}})).json();assert.ok(bootstrap.admin);
  const headers={Cookie:owner.cookie,'X-Autoloot-Admin':bootstrap.admin,'Content-Type':'application/json'};
  const post=async(path,data,extra={})=>call(path,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(data)});
  const json=async response=>{const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;};
  const status=await json(await call('/api/metadata/status',{headers}));assert.equal(status.mode,'demo');
  assert.equal((await post('/api/products',{}, {Origin:'https://untrusted.example'})).status,403);
  checks.push('Twitch OAuth owner allowlist, anonymous isolation, host and cross-origin rejection');
  await json(await post('/api/workspace/demo',{enabled:true}));
  const catalog=await json(await post('/api/catalog/search',{game:'pokemon'}));assert.equal(catalog.state.catalog.total,34);
  checks.push('Shared Hono catalog and practice workspace routes in workerd');
  const png=Uint8Array.from([137,80,78,71,13,10,26,10]);
  const upload=await json(await call('/api/upload',{method:'POST',headers:{Cookie:owner.cookie,'X-Autoloot-Admin':bootstrap.admin},body:png}));
  const media=await call(upload.image);assert.equal(media.status,200);assert.deepEqual(new Uint8Array(await media.arrayBuffer()),png);
  assert.ok(await MEDIA.head('fixture/'+upload.image.slice(7)));
  checks.push('R2 upload, workspace prefix and image serving');
  const added=await json(await post('/api/products',{title:'Concurrent last unit',price:'1.00',buyNowPrice:'2.00',quantity:1,condition:'Raw',listed:true}));
  const product=added.state.products.find(p=>p.title==='Concurrent last unit');assert.ok(product);
  const buyerResponse=await call('/api/viewer/demo-login',{method:'POST',body:'{}'});assert.equal(buyerResponse.status,200);
  const buyerCookie=buyerResponse.headers.get('set-cookie').split(';')[0];
  const buys=await Promise.all(['one','two'].map(requestId=>call('/api/viewer/buy',{method:'POST',headers:{Cookie:buyerCookie,'Content-Type':'application/json'},body:JSON.stringify({productId:product.id,requestId})})));
  assert.deepEqual(buys.map(r=>r.status).sort(),[200,400]);
  const state=await json(await call('/api/state',{headers}));assert.equal(state.products.find(p=>p.id===product.id).quantity,0);assert.equal(state.orders.filter(o=>o.product.id===product.id).length,1);
  const publicState=await json(await call('/api/state'));assert.equal(publicState.orders,undefined);assert.equal(publicState.audit,undefined);
  checks.push('Concurrent last-unit purchases serialize once; buyer/order data stays private');
  let projection;
  for(let i=0;i<40;i++){projection=await DB.prepare('SELECT revision,state_json FROM workspace_records WHERE workspace_id=?').bind('fixture').first();if(projection&&JSON.parse(projection.state_json).orders.length===state.orders.length)break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(JSON.parse(projection.state_json).orders.filter(o=>o.product.id===product.id).length,1);
  const account=await DB.prepare('SELECT twitch_user_id,role FROM workspace_accounts WHERE workspace_id=?').bind('fixture').first();assert.equal(account.twitch_user_id,'42');assert.equal(account.role,'owner');
  checks.push('D1 account ownership and monotonic durable workspace projection');
  const pairing=await json(await post('/api/companion/connection/start',{}));assert.ok(pairing.bridge);assert.ok(pairing.pairCode);
  const claimed=await json(await call('/api/bridge/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:pairing.pairCode,connected:true})}));
  const replay=await call('/api/bridge/claim',{method:'POST',body:JSON.stringify({code:pairing.pairCode})});assert.equal(replay.status,403);
  assert.equal((await call('/api/bridge/poll',{method:'POST',body:'{}'})).status,403);
  const companion=await json(await post('/api/companion/connection/status',{}));assert.equal(companion.connected,true);
  assert.equal((await call('/api/bootstrap',{headers:{Authorization:'Bearer '+claimed.token}})).status,403);
  checks.push('One-use companion pairing, scoped token and no administrator escalation');
  await json(await post('/api/companion/settings',{provider:'codex'}));
  const replyPending=post('/api/companion/ask',{prompt:'Describe the available inventory.'});
  const bridgeCall=(path,data)=>call(path,{method:'POST',headers:{Authorization:'Bearer '+claimed.token,'Content-Type':'application/json'},body:JSON.stringify(data)});
  let job;
  for(let i=0;i<30;i++){const poll=await json(await bridgeCall('/api/bridge/poll',{connected:true}));if(poll.job){job=poll.job;break;}await new Promise(r=>setTimeout(r,50));}
  assert.ok(job);assert.equal(job.kind,'reply');assert.ok(!JSON.stringify(job).includes('stripe-signature'));
  assert.ok(job.state.orders.every(o=>!o.shipping&&!o.userId));
  const completed=await bridgeCall('/api/bridge/result',{id:job.id,lease:job.lease,reply:{message:'Inventory reviewed.',action:'none',productId:null,draftProduct:null}});assert.equal(completed.status,200);
  assert.equal((await json(await replyPending)).state.companion.message,'Inventory reviewed.');
  const replayResult=await bridgeCall('/api/bridge/result',{id:job.id,lease:job.lease,reply:{message:'replay',action:'none'}});assert.equal(replayResult.status,409);
  await json(await post('/api/companion/connection/cancel',{}));
  assert.equal((await bridgeCall('/api/bridge/poll',{connected:true})).status,403);
  checks.push('Paired model job roundtrip, private-field exclusion, result replay rejection and revocation');
  const invalidWebhook=await call('/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':'invalid'},body:'{}'});assert.equal(invalidWebhook.status,400);
  const event=JSON.stringify({id:'evt_fixture_ignored',type:'fixture.ignored',data:{object:{}}});
  const timestamp=Math.floor(Date.now()/1000),signature=createHmac('sha256','whsec_fixture').update(timestamp+'.'+event).digest('hex');
  const signed=await call('/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':`t=${timestamp},v1=${signature}`},body:event});
  assert.equal(signed.status,200);assert.equal((await signed.json()).received,true);
  checks.push('Stripe WebCrypto verifies exact signed bytes and rejects invalid signatures');

  const auction=await json(await post('/api/auction/start',{productId:'p1',duration:10}));
  assert.equal(auction.state.auction.status,'live');
  await new Promise(resolve=>setTimeout(resolve,10500));
  const afterAlarm=await DB.prepare('SELECT state_json FROM workspace_records WHERE workspace_id=?').bind('fixture').first();
  assert.equal(JSON.parse(afterAlarm.state_json).auction.status,'unsold');
  checks.push('Durable alarm closes and projects an unattended auction without incoming requests');
  await mf.dispose();mf=new Miniflare(options);
  const restored=await json(await call('/api/state',{headers}));
  assert.equal(restored.orders.filter(o=>o.product.id===product.id).length,1);
  assert.equal(restored.products.find(p=>p.id===product.id).quantity,0);
  assert.equal((await call(upload.image)).status,200);
  assert.ok((await json(await call('/api/bootstrap',{headers:{Cookie:owner.cookie}}))).admin);
  checks.push('Runtime restart retains owner sessions, reserved stock, orders and R2 images');
  await mf.dispose();
  const setupOptions=structuredClone(workerOptions);
  setupOptions.workers[0].bindings.AUTOLOOT_SETUP_ONLY='1';
  setupOptions.workers[0].bindings.AUTOLOOT_OWNER_TWITCH_ID='';
  mf=new Miniflare(convertV4MiniflareOptions(setupOptions));
  const setup=await call('/');assert.equal(setup.status,503);assert.match(await setup.text(),/being set up/);
  for(const path of ['/api/health','/api/bootstrap','/shop','/auth/twitch?role=streamer'])assert.equal((await call(path)).status,503);
  assert.equal((await call('/api/stripe/webhook',{method:'POST',body:'{}'})).status,503);
  checks.push('Setup-only deployment denies dashboard, commerce, OAuth and webhooks without an owner');
  mkdirSync(join(root,'output'),{recursive:true});writeFileSync(join(root,'output/cloudflare-check.json'),JSON.stringify({ok:true,runtime:'workerd',checks},null,2)+'\n');
  console.log(checks.map(c=>'PASS: '+c).join('\n'));
}finally{await mf.dispose();rmSync(directory,{recursive:true,force:true});}
