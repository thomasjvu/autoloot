import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, seed } from '../lib/commerce/engine.mjs';
import { Runs } from '../lib/commerce/runs.mjs';
function fixture() {
  let now = Date.now(), online = true, checkout = true;
  const e = new Engine(seed(), {now:() => now});
  const a = e.addProduct({title:'First owned card',price:'5',quantity:1,condition:'Used'});
  const b = e.addProduct({title:'Second owned card',price:'7',buyNowPrice:'9',quantity:1,listed:true,condition:'Used'});
  const runs = new Runs(e, {connected:() => online, checkoutReady:() => checkout});
  const arm = (steps = [{productId:a.id,format:'auction'},{productId:b.id,format:'buy-now'}]) => runs.arm({steps,minutes:10,requestId:'request'});
  return { e,a,b,runs,arm,advance:ms => {now += ms;},offline:() => {online=false;},noCheckout:() => {checkout=false;} };
}
test('arming is idempotent, freezes terms and blocks queued purchases/manual auction overrides', () => {
  const {e,a,b,runs,arm} = fixture();
  const run = arm();
  assert.equal(arm().id, run.id);
  assert.equal(run.maxSpendCents, 0);
  assert.equal(b.listed, false);
  assert.throws(() => e.editProduct(a.id,{...a,price:'1'}), /Stop the agent/);
  assert.throws(() => e.removeProduct(b.id), /Stop the agent/);
  assert.throws(() => e.setMode('live'), /Stop the agent/);
  assert.throws(() => e.buyNow({productId:b.id,userId:'demo-buyer',username:'buyer',requestId:'buy'}), /not the active/);
  assert.throws(() => e.start({productId:b.id,runId:run.id,runStep:0}), /Stop the agent/);
  runs.tick();
  const id = e.state.auction.id;
  runs.tick();
  assert.equal(e.state.auction.id,id);
  assert.equal(e.state.auction.runId, run.id);
});
test('runner advances unsold lots and waits for payment and fulfillment of a fixed-price order', () => {
  const {e,b,runs,arm} = fixture();
  arm(); runs.tick(); e.finish(); runs.tick(); runs.tick();
  assert.equal(e.state.run.index,1);
  assert.equal(b.listed,true);
  const order=e.buyNow({productId:b.id,userId:'demo-buyer',username:'buyer',requestId:'buy'});
  runs.tick(); assert.equal(e.state.run.phase,'waiting-payment');
  e.orderUpdate(order.id,'test-pay');
  runs.tick(); assert.equal(e.state.run.phase,'waiting-fulfillment');
  assert.equal(e.state.run.index,1);
  e.orderUpdate(order.id,'ship','practice-tracking');
  runs.tick(); runs.tick();
  assert.equal(e.state.run.status,'completed');
  assert.equal(b.listed,false);
  assert.equal(e.state.orders.length,1);
});
test('auction orders are associated with their run and cannot advance on payment alone', () => {
  const {e,a,runs,arm} = fixture();
  arm([{productId:a.id,format:'auction'}]); runs.tick();
  e.bid({username:'buyer',userId:'demo-buyer',amount:'5'}); e.finish(); runs.tick();
  const order=e.state.orders[0];
  assert.equal(order.runId,e.state.run.id);
  assert.equal(order.runStep,0);
  e.orderUpdate(order.id,'test-pay'); runs.tick();
  assert.equal(e.state.run.phase,'waiting-fulfillment');
  assert.equal(e.state.run.index,0);
});
test('pause blocks auction resume outside the runner; restart recovery does not replay a sale', () => {
  const {e,runs,arm} = fixture(); arm(); runs.tick();
  const id=e.state.auction.id;
  runs.pause(); assert.equal(e.state.auction.status,'paused');
  assert.throws(() => e.resume(), /Resume the agent run/);
  runs.resume(); assert.equal(e.state.auction.id,id);
  const restored = new Engine(JSON.parse(JSON.stringify(e.state)));
  const recovered = new Runs(restored);
  recovered.recover(); recovered.tick();
  assert.equal(restored.state.run.status,'paused');
  assert.equal(restored.state.auction.status,'paused');
  assert.equal(restored.state.auction.id,id);
  recovered.resume(); recovered.tick();
  assert.equal(restored.state.auction.id,id);
});
test('arming expiry rejects late fixed-price purchases and unpublishes listings', () => {
  const {e,b,runs,arm,advance} = fixture(); arm([{productId:b.id,format:'buy-now'}]); runs.tick();
  advance(10*60000);
  assert.throws(() => e.buyNow({productId:b.id,userId:'demo-buyer',username:'buyer',requestId:'late'}), /not the active/);
  runs.tick(); assert.equal(e.state.run.status,'paused'); assert.equal(b.listed,false);
  assert.throws(() => runs.resume(), /expired/);
});
test('cancelled buyer order pauses instead of reselling the step', () => {
  const {e,b,runs,arm} = fixture(); arm([{productId:b.id,format:'buy-now'}]); runs.tick();
  const order=e.buyNow({productId:b.id,userId:'demo-buyer',username:'buyer',requestId:'buy'});
  e.orderUpdate(order.id,'cancel'); runs.tick(); runs.tick();
  assert.equal(e.state.run.status,'paused'); assert.equal(b.listed,false);
  assert.equal(e.state.orders.length,1);
});
test('live disconnect and checkout outages pause the bounded run', () => {
  const f=fixture(); f.e.setMode('live'); f.arm([{productId:f.b.id,format:'buy-now'}]); f.runs.tick();
  f.noCheckout(); f.runs.tick(); assert.equal(f.e.state.run.status,'paused'); assert.equal(f.b.listed,false);
  const g=fixture(); g.e.setMode('live'); g.arm(); g.runs.tick(); g.offline(); g.runs.tick();
  assert.equal(g.e.state.run.status,'paused'); assert.equal(g.e.state.auction.status,'paused');
  assert.throws(() => g.runs.resume(), /Reconnect/);
});
test('stopping retains existing orders and archives the old audit when another run is armed', () => {
  const {e,a,b,runs,arm}=fixture(); arm([{productId:b.id,format:'buy-now'}]); runs.tick();
  const order=e.buyNow({productId:b.id,userId:'demo-buyer',username:'buyer',requestId:'buy'});
  runs.stop(); assert.equal(order.status,'pending'); assert.equal(b.listed,false);
  const oldId=e.state.run.id;
  runs.arm({steps:[{productId:a.id,format:'auction'}],minutes:1,requestId:'second'});
  assert.equal(e.state.runHistory[0].id,oldId);
  assert.ok(e.state.runHistory[0].events.length);
  assert.equal(runs.arm({requestId:'request'}).id,oldId);
});

test('review mode requires current-lot approval, survives restart and rejects stale approvals',()=>{
 const {e,a,b,runs}=fixture();e.state.automation={mode:'review'};
 const run=runs.arm({requestId:'review',minutes:10,steps:[{productId:a.id,format:'auction'},{productId:b.id,format:'buy-now'}]});
 runs.tick();assert.equal(run.phase,'waiting-review');assert.equal(e.state.auction,null);
 assert.throws(()=>runs.approve({runId:run.id,index:1}),/no longer current/);
 runs.approve({runId:run.id,index:0});runs.tick();const auctionId=e.state.auction.id;
 assert.throws(()=>runs.approve({runId:run.id,index:0}),/no longer current/);
 e.finish();runs.tick();runs.tick();assert.equal(run.phase,'waiting-review');assert.equal(b.listed,false);
 const restored=new Engine(structuredClone(e.state)),recovered=new Runs(restored);recovered.recover();
 recovered.resume();recovered.tick();assert.equal(restored.state.run.phase,'waiting-review');assert.equal(restored.product(b.id).listed,false);
 recovered.approve({runId:run.id,index:1});recovered.tick();assert.equal(restored.product(b.id).listed,true);
 assert.equal(restored.state.auction.id,auctionId);
});

function biddingRun() {
  const f=fixture();
  f.e.state.show.bidDuration=3600;
  f.arm([{productId:f.a.id,format:'auction'}]);f.runs.tick();
  const direct=()=>f.e.bid({userId:'new-buyer',username:'new-buyer',amount:'6'});
  const maximum=()=>f.e.maximumBid({auctionId:f.e.state.auction.id,requestId:'new-max',userId:'new-buyer',username:'new-buyer',amount:'20'});
  const resolved=()=>f.e.resolveDirectBid({userId:'new-buyer',username:'new-buyer',price:600,source:'demo',messageId:'resolved'});
  return {...f,direct,maximum,resolved};
}
test('run bid authorization expires at the exact deadline without polling or state mutation',()=>{
  for(const entry of ['direct','maximum','resolved'])for(const offset of [0,1])for(const auctionDue of [false,true]){
    const f=biddingRun();
    f.e.bid({userId:'buyer',username:'buyer',amount:'5'});
    if(auctionDue)f.e.state.auction.endsAt=f.e.state.run.expiresAt;
    f.advance(10*60000+offset);
    const before=structuredClone(f.e.state);
    assert.throws(f[entry],/not authorized/);
    assert.deepEqual(f.e.state,before,`${entry}, offset ${offset}, due ${auctionDue}`);
  }
});
test('run direct and maximum bids remain accepted immediately before expiry',()=>{
  for(const entry of ['direct','maximum']){
    const f=biddingRun();f.advance(10*60000-1);f[entry]();
    assert.equal(f.e.state.auction.highest.userId,'new-buyer');
    assert.equal(f.e.state.auction.bidCount,1);
  }
});
test('run maximum raises and request replays cannot change state at expiry',()=>{
  const f=biddingRun(),args={auctionId:f.e.state.auction.id,userId:'buyer',username:'buyer',requestId:'first',amount:'10'};
  f.e.maximumBid(args);f.advance(10*60000);
  const before=structuredClone(f.e.state);
  for(const request of [args,{...args,requestId:'raise',amount:'20'}]){
    assert.throws(()=>f.e.maximumBid(request),/not authorized/);
    assert.deepEqual(f.e.state,before);
  }
});
test('all run bid entry points reject invalid owning run authority without side effects',()=>{
  const invalid={
    paused:f=>{f.e.state.run.status='paused';},
    stopped:f=>{f.e.state.run.status='stopped';},
    missing:f=>{delete f.e.state.run;},
    id:f=>{f.e.state.run.id='different-run';},
    index:f=>{f.e.state.run.index=1;},
    product:f=>{f.e.state.run.steps[0].productId='other-product';},
    format:f=>{f.e.state.run.steps[0].format='buy-now';},
    runMode:f=>{f.e.state.run.mode='live';},
    showMode:f=>{f.e.state.mode='live';},
    expiry:f=>{f.e.state.run.expiresAt=null;},
  };
  for(const [reason,mutate] of Object.entries(invalid))for(const entry of ['direct','maximum','resolved']){
    const f=biddingRun();mutate(f);const before=structuredClone(f.e.state);
    assert.throws(f[entry],/not authorized/,`${reason}: ${entry}`);
    assert.deepEqual(f.e.state,before);
  }
});
test('non-run auctions remain independent of an expired or missing run',()=>{
  for(const entry of ['direct','maximum'])for(const missing of [false,true]){
    const f=biddingRun();delete f.e.state.auction.runId;delete f.e.state.auction.runStep;
    if(missing)delete f.e.state.run;else f.e.state.run.expiresAt=0;
    f[entry]();assert.equal(f.e.state.auction.highest.userId,'new-buyer');
  }
});
test('auction deadline still settles accepted bids before run expiry',()=>{
  for(const entry of ['direct','maximum']){
    const f=biddingRun();f.e.state.auction.endsAt-=3590000;
    f.e.bid({userId:'buyer',username:'buyer',amount:'5'});
    f.advance(10000);assert.throws(f[entry],/no live/i);
    assert.equal(f.e.state.auction.status,'sold');assert.equal(f.e.state.orders[0].amount,500);
  }
});
test('accepted run bids can settle by clock or manual finish and orders remain payable after expiry',()=>{
  for(const manual of [false,true]){
    const f=biddingRun();f.e.bid({userId:'buyer',username:'buyer',amount:'5'});
    f.advance(10*60000);
    if(manual){f.runs.tick();assert.equal(f.e.state.auction.status,'paused');f.e.finish();}
    else {f.e.state.auction.endsAt=f.e.state.run.expiresAt;f.e.tick();}
    const order=f.e.state.orders[0];assert.equal(order.amount,500);assert.equal(order.runId,f.e.state.run.id);
    f.e.orderUpdate(order.id,'test-pay');assert.equal(order.status,'test-paid');
    f.e.orderUpdate(order.id,'ship','tracking');assert.equal(order.status,'shipped');
  }
});
