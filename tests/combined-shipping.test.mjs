import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine,seed} from '../lib/commerce/engine.mjs';
import {Shipping} from '../lib/integrations/shipping.mjs';
import {Payments} from '../lib/integrations/payments.mjs';
import {previewImport,pirateShipCsv} from '../lib/commerce/csv.mjs';
const recipient={name:'Buyer',line1:'1 Main St',city:'Boston',state:'MA',postal_code:'02110',country:'US'};
const parcel={length:'7',width:'5',height:'2',weight:'8'};
function fixture({fail=false,save=()=>{},gate=null}={}){
 const state=seed();state.orders=['a','b','c'].map(id=>({id,number:id,userId:'buyer',buyer:'Buyer',mode:'demo',status:'test-paid',product:{id,title:'Card '+id},shipping:{...recipient},amount:500,shippingPrice:200,total:700}));
 const engine=new Engine(state,{save});let txn,calls=0;
 const fetcher=async(url,opts)=>{const body=opts.body&&JSON.parse(opts.body);if(url.endsWith('/shipments/')){if(gate)await gate;return Response.json({test:true,rates:[{object_id:'rate',currency:'USD',provider:'USPS',amount:'4.25'}]});}if(url.endsWith('/transactions/')){calls++;txn={object_id:'txn',rate:'rate',metadata:body.metadata,test:true,status:'SUCCESS',label_url:'https://example.com/label',tracking_number:'123'};if(fail)throw Error('lost');return Response.json(txn);}if(url.includes('/transactions/?'))return Response.json({results:[txn]});if(url.includes('/transactions/txn/'))return Response.json(txn);return Response.json({tracking_status:{status:'TRANSIT'}});};
 const shipping=new Shipping(engine,{token:'shippo_test_fixture',fetcher});shipping.configure({from:recipient});
 const create=()=>shipping.createPackage({orderIds:['a','b'],confirmed:true});
 const quote=()=>shipping.quote({id:'b',parcel});
 const buy=()=>{const s=engine.order('a').shipment;return shipping.buy({id:'b',quoteId:s.quoteId,rateId:'rate',amount:425,confirmed:true});};
 return {engine,shipping,create,quote,buy,fetcher,getCalls:()=>calls,setStatus:value=>txn.status=value};
}
test('combined label persists independent projections, holds members, and dispatches atomically without changing charges',async()=>{
 let saves=0;const f=fixture({save:()=>saves++});f.create();
 assert.notEqual(f.engine.order('a').shipment,f.engine.order('b').shipment);
 for(const id of ['a','b']){assert.throws(()=>f.engine.orderUpdate(id,'ship','USPS · 123'),/combined/);await assert.rejects(new Payments(f.engine).refund(id));}
 assert.equal(previewImport(f.engine,{kind:'tracking',csv:'Order,Carrier,Tracking\na,USPS,123'}).valid,false);
 assert.equal(pirateShipCsv(f.engine.state.orders).includes('Card a'),false);
 await f.quote();await f.buy();assert.equal(f.getCalls(),1);assert.equal(f.engine.order('b').shipment.status,'purchased');
 const before=saves;f.shipping.dispatch({id:'b',confirmed:true});assert.equal(saves,before+1);
 for(const id of ['a','b']){const o=f.engine.order(id);assert.equal(o.status,'shipped');assert.equal(o.tracking,'USPS · 123');assert.equal(o.total,700);assert.equal(o.shippingPrice,200);}
 assert.equal(f.engine.order('c').status,'test-paid');f.shipping.dispatch({id:'a',confirmed:true});assert.equal(saves,before+1);
});
test('invalid membership is rejected without changing any orders',()=>{
 for(const patch of [{userId:'other'},{mode:'live'},{shipping:{...recipient,line2:'Unit 2'}},{status:'pending'},{product:{fulfillment:{type:'nft'}}},{refundRequestedAt:1},{userId:''}]){
 const f=fixture();Object.assign(f.engine.order('b'),patch);assert.throws(f.create);assert.equal(f.engine.order('a').shipment,undefined);
 }
 const f=fixture();for(const orderIds of [[],['a'],['a','a'],['a','missing'],['a',null]])assert.throws(()=>f.shipping.createPackage({orderIds,confirmed:true}));
 f.create();assert.throws(f.create);assert.throws(()=>f.shipping.createPackage({orderIds:['b','c'],confirmed:true}));
});
test('lost response remains held through JSON restart and any member recovers original single purchase',async()=>{
 const f=fixture({fail:true});f.create();await f.quote();await assert.rejects(f.buy());
 const engine=new Engine(JSON.parse(JSON.stringify(f.engine.state))),shipping=new Shipping(engine,{token:'shippo_test_fixture',fetcher:f.fetcher});
 assert.equal(engine.order('b').shipment.status,'unknown');assert.throws(()=>shipping.releasePackage({id:'b',confirmed:true}));await assert.rejects(shipping.quote({id:'a',parcel}));
 await shipping.refresh({id:'b'});assert.equal(engine.order('b').shipment.status,'purchased');assert.equal(f.getCalls(),1);
 await shipping.track({id:'b'});assert.equal(engine.order('a').shipment.trackingStatus,'TRANSIT');assert.equal(engine.order('b').shipment.trackingStatus,'TRANSIT');
 f.setStatus('REFUNDED');await shipping.refresh({id:'a'});shipping.releasePackage({id:'b',confirmed:true});
 for(const id of ['a','b']){assert.equal(engine.order(id).shipment,undefined);assert.equal(engine.order(id).shipmentHistory.at(-1).status,'voided');}
});
test('quote locks all members, prevents release and overlapping creation, and rejects changed destination',async()=>{
 let release;const gate=new Promise(r=>release=r),f=fixture({gate});f.create();const pending=f.quote();
 assert.throws(()=>f.shipping.releasePackage({id:'a',confirmed:true}));assert.throws(()=>f.shipping.createPackage({orderIds:['b','c'],confirmed:true}));await assert.rejects(f.shipping.quote({id:'a',parcel}));
 f.engine.order('b').shipping.line1='changed';release();await assert.rejects(pending,/destination/);assert.equal(f.getCalls(),0);
});
test('dispatch validates all members and disk failures never partially dispatch or spend without durable intent',async()=>{
 let failSave=false;const f=fixture({save:()=>{if(failSave)throw Error('disk');}});f.create();await f.quote();failSave=true;await assert.rejects(f.buy());assert.equal(f.getCalls(),0);assert.equal(f.engine.halted,true);
 failSave=false;const g=fixture({save:()=>{if(failSave)throw Error('disk');}});g.create();await g.quote();await g.buy();g.engine.order('b').refundRequestedAt=1;assert.throws(()=>g.shipping.dispatch({id:'a',confirmed:true}));assert.equal(g.engine.order('a').status,'test-paid');delete g.engine.order('b').refundRequestedAt;failSave=true;assert.throws(()=>g.shipping.dispatch({id:'b',confirmed:true}));assert.equal(g.engine.halted,true);assert.equal(g.engine.order('a').status,'test-paid');assert.equal(g.engine.order('b').status,'test-paid');
});

test('storage failure after provider response retains durable purchasing hold for restart recovery',async()=>{
 let failSave=false;const f=fixture({save:()=>{if(failSave)throw Error('disk');}});f.create();await f.quote();
 const original=f.shipping.fetcher;f.shipping.fetcher=async(...args)=>{const result=await original(...args);if(args[0].endsWith('/transactions/'))failSave=true;return result;};
 await assert.rejects(f.buy());assert.equal(f.getCalls(),1);assert.equal(f.engine.halted,true);
 for(const id of ['a','b'])assert.equal(f.engine.state.orders.find(o=>o.id===id).shipment.status,'purchasing');
 const engine=new Engine(JSON.parse(JSON.stringify(f.engine.state))),shipping=new Shipping(engine,{token:'shippo_test_fixture',fetcher:f.fetcher});
 await shipping.refresh({id:'b'});assert.equal(engine.order('a').shipment.status,'purchased');assert.equal(engine.order('b').shipment.status,'purchased');assert.equal(f.getCalls(),1);
});
test('member snapshots and owner changes fail closed and released packages retain original attempt history',async()=>{
 const f=fixture();f.create();f.engine.order('b').shipment.orderIds=['b','a'];await assert.rejects(f.quote(),/membership/);f.engine.order('b').shipment.orderIds=['a','b'];
 await f.quote();await f.buy();f.setStatus('ERROR');await f.shipping.refresh({id:'a'});await f.quote();
 for(const id of ['a','b'])assert.equal(f.engine.order(id).shipmentHistory.at(-1).providerStatus,'ERROR');
 f.shipping.releasePackage({id:'b',confirmed:true});for(const id of ['a','b'])assert.equal(f.engine.order(id).shipmentHistory.at(-1).releasedAt>0,true);
 const g=fixture();g.engine.order('b').mode='live';g.engine.order('b').status='paid';g.engine.order('b').paymentLive=false;g.shipping.token='shippo_live_fixture';assert.throws(g.create,/test|unverified|Demo/);
});
test('quotes never bind rates to an account or sender changed during the provider call',async()=>{
 for(const change of [f=>{f.shipping.token='shippo_test_changed';},f=>{f.engine.state.shippingSettings.from.line1='2 Other St';}]){
  let release;const gate=new Promise(r=>release=r),f=fixture({gate});f.create();const pending=f.quote();change(f);release();await assert.rejects(pending,/changed/);assert.equal(f.engine.order('a').shipment.status,'package-ready');assert.equal(f.getCalls(),0);
 }
});
