import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, seed } from '../lib/engine.mjs';
import { Runs } from '../lib/runs.mjs';
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
