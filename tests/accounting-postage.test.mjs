import test from 'node:test';
import {routeApp,post} from './helpers/hono.mjs';
import assert from 'node:assert/strict';
import {accountingRows,postageCosts,recordCosts} from '../lib/commerce/accounting.mjs';
import {Engine,seed} from '../lib/commerce/engine.mjs';
import {createCommerceActions} from '../lib/http/commerce-actions.mjs';
const address={name:'Buyer',line1:'1 Main St',city:'Boston',state:'MA',postal_code:'02110',country:'US'};
const destination=JSON.stringify(['name','line1','line2','city','state','postal_code','country'].map(k=>String(address[k]||'').toLowerCase()));
function fixture(packageLabel=true){
 const state=seed();state.orders=['b','a','c'].map(id=>({id,number:id,userId:'u',product:{title:'Card'},createdAt:1,amount:500,total:700,shippingPrice:200,mode:'demo',status:'test-paid',shipping:{...address}}));
 const label={status:'purchased',providerStatus:'SUCCESS',attemptId:'attempt',transactionId:'transaction',test:true,rate:{amount:425},...(packageLabel?{packageId:'package',leaderId:'b',orderIds:['b','a'],ownerId:'u',mode:'demo',destination}:{})};
 for(const o of state.orders.slice(0,packageLabel?2:1))o.shipment=structuredClone(label);
 return state;
}
test('combined postage allocates exact cents once with stable remainder ordering and no mutations',()=>{
 const s=fixture(),before=JSON.stringify(s),costs=postageCosts(s);
 assert.equal(costs.get('a'),213);assert.equal(costs.get('b'),212);assert.equal(costs.has('c'),false);assert.equal([...costs.values()].reduce((a,b)=>a+b),425);
 assert.deepEqual(postageCosts({...s,orders:[...s.orders].reverse()}),new Map([['a',213],['b',212]]));assert.equal(JSON.stringify(s),before);
 const rows=accountingRows(s);assert.equal(rows[0].deliveryCostSource,'shippo');assert.equal(rows[0].complete,false);
});
test('manual zero wins, blank restores allocation and other costs still determine completeness',()=>{
 const e=new Engine(fixture());recordCosts(e,{id:'a',itemCost:'1',paymentFees:'0',deliveryCost:'0',otherCost:'0'});
 let row=accountingRows(e.state).find(r=>r.id==='a');assert.equal(row.deliveryCost,0);assert.equal(row.deliveryCostSource,'manual');assert.equal(row.complete,true);
 recordCosts(e,{id:'a',itemCost:'1',paymentFees:'0',deliveryCost:'',otherCost:'0'});row=accountingRows(e.state).find(r=>r.id==='a');assert.equal(row.deliveryCost,213);assert.equal(row.manualDeliveryCost,null);assert.equal(row.expenses,313);assert.equal(e.order('a').shippingPrice,200);
});
test('unverified labels and inconsistent package membership stay unknown',()=>{
 for(const patch of [{status:'quoted'},{status:'pending'},{status:'failed'},{status:'voided'},{test:false},{providerStatus:'QUEUED'},{transactionId:null},{rate:{amount:-1}}]){
  const s=fixture(false);Object.assign(s.orders[0].shipment,patch);assert.equal(postageCosts(s).size,0);
 }
 for(const change of [s=>s.orders.pop()&&s.orders.pop(),s=>s.orders[1].userId='other',s=>s.orders[1].shipping.line1='Other',s=>s.orders[1].mode='live',s=>s.orders[1].shipment.rate.amount=900,s=>s.orders[0].shipment.providerStatus='QUEUED',s=>s.orders[0].shipment.orderIds=['a','b']]){
  const s=fixture();change(s);assert.equal(postageCosts(s).size,0);assert.equal(postageCosts({...s,orders:[...s.orders].reverse()}).size,0);
 }
 const live=fixture(false);Object.assign(live.orders[0],{mode:'live',status:'paid',paymentLive:false});live.orders[0].shipment.test=false;assert.equal(postageCosts(live).size,0);live.orders[0].paymentLive=true;assert.equal(postageCosts(live).get('b'),425);
});
test('single purchased labels survive dispatch, voiding removes automatic cost and export includes provenance only',async()=>{
 const s=fixture(false);s.orders[0].status='shipped';assert.equal(postageCosts(s).get('b'),425);s.orders[0].shipment.status='voided';assert.equal(accountingRows(s)[0].deliveryCost,null);
 s.orders[0].shipment.status='purchased';const engine=new Engine(s),action=routeApp(createCommerceActions({engine,stateFor:()=>engine.state}));
 const body=await (await post(action,'/api/accounting/export',{})).json();assert.match(body.csv,/Delivery cost source/);assert.match(body.csv,/shippo/);assert.doesNotMatch(body.csv,/transaction|attempt|1 Main St/);
});
