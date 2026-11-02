import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine,seed} from '../lib/commerce/engine.mjs';
import {Shipping,address,parcel} from '../lib/integrations/shipping.mjs';
import {Payments} from '../lib/integrations/payments.mjs';
import {pirateShipCsv,parseCsv,previewImport} from '../lib/commerce/csv.mjs';
const recipient={name:'Test Buyer',line1:'965 Mission St',line2:'',city:'San Francisco',state:'CA',postal_code:'94105',country:'US',phone:'',email:''};
const box={length:'7',width:'5',height:'1',weight:'3'};
function fixture({failPurchase=false,status='SUCCESS',save=()=>{},fetchOverride}={}){
 const state=seed();state.orders=[{id:'order-1',number:'AL-001',product:{id:'p1',title:'Practice card'},status:'test-paid',mode:'demo',shipping:{...recipient},amount:500,total:500}];
 const engine=new Engine(state,{save});const calls=[];let transaction;
 const fetcher=async(url,options)=>{
  calls.push({url,options});const input=options.body?JSON.parse(options.body):null;
  if(fetchOverride){const result=await fetchOverride(url,options,input);if(result)return Response.json(result);}
  if(url.endsWith('/shipments/'))return Response.json({object_id:'shipment1',test:true,rates:[{object_id:'rate1',provider:'USPS',servicelevel:{name:'Ground Advantage'},amount:'4.25',currency:'USD',estimated_days:3},{object_id:'eur',provider:'USPS',amount:'1',currency:'EUR'}]});
  if(url.includes('/transactions/?'))return Response.json({results:transaction?[transaction]:[]});
  if(url.endsWith('/transactions/')){transaction={object_id:'txn1',test:true,rate:input.rate,metadata:input.metadata,status,label_url:'https://labels.example/label.pdf',tracking_number:'001234',tracking_url_provider:'https://tracking.example/001234'};if(failPurchase)throw Error('Connection lost');return Response.json(transaction);}
  if(url.includes('/transactions/txn1/'))return Response.json(transaction);
  if(url.includes('/tracks/'))return Response.json({tracking_status:{status:'TRANSIT'}});
  throw Error('Unexpected mock request '+url);
 };
 const shipping=new Shipping(engine,{token:'shippo_test_fixture',fetcher});shipping.configure({from:recipient,presets:[{name:'Card',...box}]});
 const quote=()=>shipping.quote({id:'order-1',parcel:box});
 const buy=()=>{const s=engine.order('order-1').shipment;return shipping.buy({id:'order-1',quoteId:s.quoteId,rateId:'rate1',amount:425,confirmed:true});};
 return {engine,shipping,calls,quote,buy,getTransaction:()=>transaction,fetcher};
}
test('rates bind recipient, account, parcel and selected cost; label purchase does not dispatch',async()=>{
 const f=fixture();const q=await f.quote();assert.equal(q.rates.length,1);assert.equal(q.rates[0].amount,425);assert.equal(f.engine.order('order-1').status,'test-paid');
 const s=await f.buy();assert.equal(s.status,'purchased');assert.equal(f.engine.order('order-1').status,'test-paid');
 const call=f.calls.find(c=>c.url.endsWith('/transactions/'));assert.equal(JSON.parse(call.options.body).label_file_type,'PDF_4x6');assert.match(call.options.headers.Authorization,/ShippoToken shippo_test_/);
 await assert.rejects(f.buy());assert.equal(f.calls.filter(c=>c.url.endsWith('/transactions/')).length,1);
 await f.shipping.track({id:'order-1'});assert.equal(s.trackingStatus,'TRANSIT');assert.equal(f.engine.order('order-1').status,'test-paid');
 assert.throws(()=>f.shipping.dispatch({id:'order-1'}));f.shipping.dispatch({id:'order-1',confirmed:true});assert.equal(f.engine.order('order-1').tracking,'USPS · 001234');assert.equal(f.engine.order('order-1').status,'shipped');
});
test('unknown purchase stays blocked after restart and recovers only a matching provider transaction',async()=>{
 const f=fixture({failPurchase:true});await f.quote();await assert.rejects(f.buy());assert.equal(f.engine.order('order-1').shipment.status,'unknown');
 const restarted=new Shipping(new Engine(structuredClone(f.engine.state)),{token:'shippo_test_fixture',fetcher:f.fetcher});
 await assert.rejects(restarted.quote({id:'order-1',parcel:box}));
 const recovered=await restarted.refresh({id:'order-1'});assert.equal(recovered.status,'purchased');assert.equal(f.calls.filter(c=>c.url.endsWith('/transactions/')).length,1);
});
test('purchase holds block payment refunds and tracking imports; provider refund unlocks order refund',async()=>{
 const f=fixture();await f.quote();await f.buy();
 assert.throws(()=>f.engine.markRefunded('order-1','demo'));await assert.rejects(new Payments(f.engine).refund('order-1'));
 const plan=previewImport(f.engine,{kind:'tracking',csv:'Order,Carrier,Tracking\nAL-001,UPS,DIFFERENT'});assert.equal(plan.valid,false);
 f.getTransaction().status='REFUNDPENDING';await f.shipping.refresh({id:'order-1'});assert.throws(()=>f.shipping.dispatch({id:'order-1',confirmed:true}));
 f.getTransaction().status='REFUNDED';await f.shipping.refresh({id:'order-1'});assert.equal(f.engine.order('order-1').shipment.status,'voided');f.engine.markRefunded('order-1','demo');assert.equal(f.engine.order('order-1').status,'refunded');
});
test('price tampering, stale address/from, expiry and environment mismatches cannot purchase',async()=>{
 const f=fixture();await f.quote();const s=f.engine.order('order-1').shipment;
 await assert.rejects(f.shipping.buy({id:'order-1',quoteId:s.quoteId,rateId:'rate1',amount:1,confirmed:true}));
 f.engine.order('order-1').shipping.city='Changed';await assert.rejects(f.buy());f.engine.order('order-1').shipping.city=recipient.city;
 f.engine.state.shippingSettings.from.city='Changed';await assert.rejects(f.buy());f.engine.state.shippingSettings.from.city=recipient.city;
 s.expiresAt=0;await assert.rejects(f.buy());assert.equal(f.calls.filter(c=>c.url.endsWith('/transactions/')).length,0);
 f.engine.order('order-1').mode='live';await assert.rejects(f.quote());f.engine.order('order-1').mode='demo';f.engine.order('order-1').product.fulfillment={type:'nft'};await assert.rejects(f.quote());
});
test('provider mismatches cannot attach a label or allow a second purchase',async()=>{
 const f=fixture({fetchOverride:(url,opt,input)=>url.endsWith('/transactions/')?{object_id:'txn1',test:false,rate:'rate1',metadata:input.metadata,status:'SUCCESS'}:null});
 await f.quote();await assert.rejects(f.buy());assert.equal(f.engine.order('order-1').shipment.status,'unknown');await assert.rejects(f.buy());
});
test('pending and failed provider results are explicit; failures require a new quote',async()=>{
 const f=fixture({status:'QUEUED'});await f.quote();await f.buy();assert.equal(f.engine.order('order-1').shipment.status,'pending');await assert.rejects(f.buy());
 f.getTransaction().status='ERROR';await f.shipping.refresh({id:'order-1'});assert.equal(f.engine.order('order-1').shipment.status,'failed');await f.quote();assert.equal(f.engine.order('order-1').shipmentHistory.length,1);
});
test('purchase intent is committed before provider call and storage failure prevents spending',async()=>{
 let fail=false;const f=fixture({save:()=>{if(fail)throw Error('disk failed');}});await f.quote();fail=true;await assert.rejects(f.buy());assert.equal(f.calls.filter(c=>c.url.endsWith('/transactions/')).length,0);assert.equal(f.engine.halted,true);
});
test('same-order concurrency cannot charge twice',async()=>{
 let release;const gate=new Promise(r=>release=r);let called=false;
 const f=fixture({fetchOverride:async(url)=>{if(url.endsWith('/transactions/')){called=true;await gate;}}});await f.quote();const first=f.buy();assert.equal(called,true);await assert.rejects(f.buy());release();await first;assert.equal(f.calls.filter(c=>c.url.endsWith('/transactions/')).length,1);
});
test('domestic addresses and parcels validate; configuration failures leave saved settings intact',()=>{
 assert.throws(()=>address({...recipient,country:'CA'}));assert.throws(()=>address({...recipient,postal_code:'invalid'}));assert.throws(()=>parcel({...box,weight:'-1'}));assert.throws(()=>parcel({...box,length:200}));
 const f=fixture(),before=structuredClone(f.engine.state.shippingSettings);assert.throws(()=>f.shipping.configure({from:recipient,presets:[{name:'x',...box,weight:'0'}]}));assert.deepEqual(f.engine.state.shippingSettings,before);
});
test('Pirate Ship export contains separate address fields, preserves order ID and excludes labels',async()=>{
 const f=fixture();let csv=parseCsv(pirateShipCsv(f.engine.state.orders));assert.equal(csv.rows[0][csv.headers.indexOf('Order ID')],'order-1');assert.equal(csv.rows[0][csv.headers.indexOf('Zip')],'94105');
 await f.quote();await f.buy();assert.equal(pirateShipCsv(f.engine.state.orders).includes('Practice card'),false);
 const g=fixture();delete g.engine.order('order-1').shipping;assert.throws(()=>pirateShipCsv(g.engine.state.orders));
});

test('zero or ambiguous reconciliation results never unlock another purchase',async()=>{
 const f=fixture({failPurchase:true});await f.quote();await assert.rejects(f.buy());
 const state=structuredClone(f.engine.state);
 for(const results of [[],[f.getTransaction(),f.getTransaction()]]){
  const adapter=new Shipping(new Engine(structuredClone(state)),{token:'shippo_test_fixture',fetcher:async()=>Response.json({results})});
  await assert.rejects(adapter.refresh({id:'order-1'}));assert.equal(adapter.order('order-1').shipment.status,'unknown');await assert.rejects(adapter.quote({id:'order-1',parcel:box}));
 }
});

test('Stripe test or unverified live payments cannot request rates, buy labels or dispatch',async()=>{
 for(const paymentLive of [false,undefined]){
  const f=fixture(),o=f.engine.order('order-1');Object.assign(o,{mode:'live',status:'paid',paymentLive});f.shipping.token='shippo_live_fixture';
  await assert.rejects(f.quote(),/test or unverified/);await assert.rejects(f.shipping.buy({id:o.id}),/test or unverified/);
  o.shipment={status:'purchased',test:false,rate:{carrier:'USPS'},trackingNumber:'123'};
  assert.throws(()=>f.shipping.dispatch({id:o.id,confirmed:true}),/test or unverified/);
  assert.equal(f.calls.length,0);assert.equal(o.status,'paid');
 }
 const f=fixture(),o=f.engine.order('order-1');Object.assign(o,{mode:'live',status:'paid',paymentLive:true});f.shipping.token='shippo_live_fixture';assert.doesNotThrow(()=>f.shipping.eligible(o));
 o.status='paid-external';delete o.paymentLive;assert.doesNotThrow(()=>f.shipping.eligible(o));
});
