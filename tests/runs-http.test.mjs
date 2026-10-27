import {fetch} from './helpers/admin-client.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,rmSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('HTTP runner enforces creator access, reconciles a sale and recovers without replay after restart', async () => {
  const free=createServer(); await new Promise(r=>free.listen(0,'127.0.0.1',r));
  const port=free.address().port; await new Promise(r=>free.close(r));
  const dir=mkdtempSync(join(tmpdir(),'autoloot-run-http-')),base=`http://localhost:${port}`;
  let child,token;
  const launch=async()=>{
    child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,AUTOLOOT_DEMO:'1',PUBLIC_URL:base,STRIPE_API_KEY:'',STRIPE_WEBHOOK_SECRET:'',TWITCH_CLIENT_ID:'',TWITCH_CLIENT_SECRET:''},stdio:['ignore','pipe','pipe']});
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Runner server startup timed out')),10000);
      child.stdout.once('data',()=>{clearTimeout(timer);resolve();});
      child.once('error',error=>{clearTimeout(timer);reject(error);});
      child.once('exit',code=>{clearTimeout(timer);reject(Error(`Server exited ${code}`));});
    });
    token=(await (await fetch(base+'/api/bootstrap')).json()).admin;
  };
  const stop=async()=>{if(child && child.exitCode===null){const done=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await done;}};
  const post=async(path,body={},authorized=true)=>{
    const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{'X-Autoloot-Admin':token}:{})},body:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  };
  const state=async()=>await (await fetch(base+'/api/state',{headers:{'X-Autoloot-Admin':token}})).json();
  const wait=async predicate=>{
    const until=Date.now()+5000;
    while(Date.now()<until){const s=await state();if(predicate(s))return s;await new Promise(r=>setTimeout(r,80));}
    throw Error('Runner did not reach expected state');
  };
  try {
    await launch();
    for(const headers of [{'X-Forwarded-For':'203.0.113.1'},{Origin:'https://evil.example'},{'Sec-Fetch-Site':'cross-site'}])
      assert.equal((await fetch(base+'/api/bootstrap',{headers})).status,403);
    assert.equal((await fetch(base+'/api/nft/jobs')).status,403);
    assert.equal((await (await fetch(base+'/api/legal')).json()).configured, false);
    const policy={name:'Fixture seller',email:'support@example.invalid',shipping:'Practice shipping only.',returns:'Contact fixture seller; mandatory rights apply.',retention:'Fixture records deleted when this test ends.',acknowledged:true};
    assert.equal((await post('/api/operator',policy,false)).status,403);
    assert.equal((await post('/api/operator',{...policy,acknowledged:false})).status,400);
    assert.equal((await post('/api/operator',{...policy,email:'invalid'})).status,400);
    assert.equal((await post('/api/operator',policy)).status,200);
    const published=await (await fetch(base+'/api/legal')).json();
    assert.equal(published.configured,true);
    assert.equal(published.operator.name,policy.name);
    assert.equal(published.operator.acknowledgedAt,undefined);
    assert.ok((await state()).operator.acknowledgedAt);
    for(const page of ['/terms','/privacy']) {
      const response=await fetch(base+page);assert.equal(response.status,200);
      const html=await response.text();assert.ok(html.includes('operator-policy'));assert.ok(html.includes('/legal.js'));
    }
    const help=await fetch(base+'/help',{redirect:'manual'});assert.equal(help.status,302);assert.equal(help.headers.get('location'),'/docs/getting-started/faq');
    assert.equal((await post('/api/run/arm',{},false)).status,403);
    const malformed=await fetch(base+'/api/run/arm',{method:'POST',headers:{'Content-Type':'application/json','X-Autoloot-Admin':'é'.repeat(64)},body:'{}'});
    assert.equal(malformed.status,403);assert.equal((await fetch(base+'/api/health')).status,200);
    let result=await post('/api/products',{title:'Run fixture auction',price:'5',quantity:1,condition:'Practice'});
    const a=result.body.state.products.find(p=>p.title==='Run fixture auction');
    result=await post('/api/products',{title:'Run fixture listing',price:'6',buyNowPrice:'7',quantity:1,condition:'Practice'});
    const b=result.body.state.products.find(p=>p.title==='Run fixture listing');
    assert.equal((await post('/api/run/arm',{requestId:'http-fixture',minutes:10,steps:[{productId:a.id,format:'auction'},{productId:b.id,format:'buy-now'}]})).status,200);
    let s=await wait(s=>s.auction?.productId===a.id && s.auction.status==='live');
    const auctionId=s.auction.id,runId=s.run.id;
    assert.equal((await post('/api/products/remove',{id:b.id})).status,400);
    assert.equal((await post('/api/show',{shippingPrice:'99'})).status,400);
    assert.equal((await post('/api/run/pause')).status,200);
    assert.equal((await post('/api/auction/resume')).status,400);
    assert.equal((await post('/api/run/resume')).status,200);
    assert.equal((await state()).auction.id,auctionId);
    await post('/api/auction/finish'); // no bids: progress to fixed-price listing
    s=await wait(s=>s.run.index===1 && s.products.find(p=>p.id===b.id).listed);
    const publicState=await (await fetch(base+'/api/state')).json();
    assert.equal(publicState.run,undefined);assert.equal(publicState.runHistory,undefined);assert.equal(publicState.orders,undefined);
    await post('/api/demo/buy',{productId:b.id,username:'run-buyer',requestId:'purchase'});
    s=await wait(s=>s.run.phase==='waiting-payment');
    const order=s.orders.find(o=>o.runId===runId);
    assert.ok(order);
    assert.equal(order.sellerPolicy.name,policy.name);
    assert.equal((await post('/api/operator',{...policy,name:'Changed during active run'})).status,400);
    await post('/api/order',{id:order.id,action:'test-pay'});
    await wait(s=>s.run.phase==='waiting-fulfillment');
    await stop(); await launch();
    s=await state();assert.equal(s.run.status,'paused');assert.equal(s.run.id,runId);
    assert.equal(s.orders.filter(o=>o.runId===runId).length,1);
    await post('/api/order',{id:order.id,action:'ship',tracking:'simulated-run-tracking'});
    assert.equal((await post('/api/run/resume')).status,200);
    s=await wait(s=>s.run.status==='completed');
    assert.equal(s.run.index,2);assert.equal(s.orders.filter(o=>o.runId===runId).length,1);
    const db=new DatabaseSync(join(dir,'autoloot.sqlite'),{readOnly:true});
    const persisted=JSON.parse(db.prepare('SELECT state FROM workspace WHERE id=1').get().state);db.close();
    assert.equal(persisted.run.status,'completed');
    assert.equal(persisted.operator.email,policy.email);
    assert.equal((await post('/api/operator',{...policy,name:'Updated fixture seller'})).status,200);
    assert.equal((await state()).orders.find(o=>o.id===order.id).sellerPolicy.name,policy.name);
    assert.ok(persisted.run.events.some(e=>e.text.includes('restarted')));
  } finally {await stop();rmSync(dir,{recursive:true,force:true});}
});
