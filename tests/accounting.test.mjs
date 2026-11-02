import test from 'node:test';import assert from 'node:assert/strict';
import {Engine,seed} from '../lib/commerce/engine.mjs';import {accountingRows,recordCosts} from '../lib/commerce/accounting.mjs';
test('accounting separates practice, outstanding and refunds while seller costs persist independently',()=>{
 const e=new Engine(seed());const order=e.buyNow({productId:'p4',userId:'buyer',username:'buyer',requestId:'accounting'});
 let row=accountingRows(e.state)[0];assert.equal(row.mode,'practice');assert.equal(row.received,0);assert.equal(row.outstanding,1800);assert.equal(row.complete,false);
 e.orderUpdate(order.id,'test-pay');recordCosts(e,{id:order.id,itemCost:'5',paymentFees:'0',deliveryCost:'2',otherCost:'0',note:'Private cost'});
 row=accountingRows(e.state)[0];assert.equal(row.margin,1100);assert.equal(row.complete,true);assert.equal(order.note,undefined);assert.equal(order.itemCost,undefined);
 const restored=new Engine(structuredClone(e.state));assert.equal(accountingRows(restored.state)[0].expenses,700);
 e.markRefunded(order.id,'demo-refund');row=accountingRows(e.state)[0];assert.equal(row.refund,1800);assert.equal(row.net,0);assert.equal(row.margin,-700);
 const before=structuredClone(e.state.accounting);assert.throws(()=>recordCosts(e,{id:order.id,itemCost:'-1'}));assert.deepEqual(e.state.accounting,before);
});
test('Stripe sandbox money never appears as real sales; explicit external payments do',()=>{
 const state=seed();state.orders=[{id:'fixture',number:'AL-1',product:{title:'Card'},mode:'live',status:'paid',paymentLive:false,total:500,amount:500,createdAt:1}];
 assert.equal(accountingRows(state)[0].mode,'practice');state.orders[0].paymentLive=true;assert.equal(accountingRows(state)[0].mode,'live');state.orders[0].status='paid-external';state.orders[0].paymentLive=false;assert.equal(accountingRows(state)[0].mode,'live');
});
