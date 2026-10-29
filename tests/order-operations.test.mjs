import test from 'node:test';
import assert from 'node:assert/strict';
import {attentionReasons,packingGroups,packingBlockers} from '../public/workspace/order-operations.js';
import {ordersPage} from '../public/workspace/orders.js';
const order=(extra={})=>({id:'a',number:'AL-1',userId:'u1',buyer:'buyer',mode:'live',status:'paid',paymentLive:true,product:{title:'Card'},amount:100,total:150,shippingPrice:50,shipping:{name:'Buyer',line1:'1 Main St',city:'Boston',state:'MA',postal_code:'02110',country:'US'},...extra});
test('attention distinguishes provider uncertainty from unpaid checkout and terminal orders',()=>{
 assert.match(attentionReasons(order({status:'pending',checkoutCreated:1})).join(),/reconcile with Stripe/);
 assert.match(attentionReasons(order({status:'pending',checkoutId:'cs'})).join(),/existing checkout/);
 assert.match(attentionReasons(order({status:'processing'})).join(),/await provider/);
 for(const status of ['cancelled','expired','refunded','shipped'])assert.deepEqual(attentionReasons(order({status,shipping:null})),[]);
 assert.match(attentionReasons(order({shipping:{}})).join(),/address incomplete/);
 assert.match(attentionReasons(order({paymentLive:false})).join(),/fulfillment blocked/);
 assert.match(attentionReasons(order({refundRequestedAt:1})).join(),/Refund unresolved/);
 assert.match(attentionReasons(order({shipment:{status:'unknown'}})).join(),/existing label/);
 assert.match(attentionReasons(order({product:{fulfillment:{type:'nft'}},delivery:{error:'failed'}})).join(),/existing transfer/);
});
test('packing separates identity, address and mode, normalizes destination and preserves charges',()=>{
 const a=order();const b=order({id:'b',shipping:{...a.shipping,line1:' 1  MAIN St '}});
 const groups=packingGroups([a,b,order({id:'c',userId:'u2'}),order({id:'d',mode:'demo'}),order({id:'e',shipping:{...a.shipping,line2:'Unit 2'}})]);
 assert.equal(groups.length,4);assert.equal(groups[0].orders.length,2);assert.equal(groups[0].shippingTotal,100);assert.equal(groups[0].total,300);
});
test('packing excludes payment, identity, address, refund and shipment liabilities',()=>{
 for(const patch of [{userId:null},{shipping:{}},{paymentLive:false},{refundRequestedAt:1},{status:'shipped'},{product:{fulfillment:{type:'nft'}}},...['purchasing','unknown','pending','purchased','refund-pending'].map(status=>({shipment:{status}}))]){
  const o=order(patch);assert.ok(packingBlockers(o).length);assert.deepEqual(packingGroups([o]),[]);
 }
 assert.equal(packingGroups([order({mode:'demo',status:'test-paid',paymentLive:false})]).length,1);
});
const render=(orders,filter)=>ordersPage({orders,payments:{configured:true,environment:'test'}},{filter},{nftOrderDetails:()=>'',reservationNotice:()=>''});
test('orders filters render actionable attention, grouped packing, exclusions and escaped values',()=>{
 const o=order({buyer:'<buyer>',product:{title:'<card>'}});
 const html=render([o,order({id:'b',shipping:{}})],'packing');
 assert.match(html,/Buyer shipping charges stay unchanged/);assert.match(html,/&lt;buyer&gt;/);assert.match(html,/&lt;card&gt;/);assert.match(html,/Review before packing/);assert.match(html,/data-shipping-order="a"/);
 const attention=render([order({id:'uncertain',status:'pending',checkoutCreated:1}),o],'attention');
 assert.match(attention,/reconcile-checkout/);assert.match(attention,/Checkout outcome uncertain/);assert.doesNotMatch(attention,/<strong>&lt;card&gt;<\/strong>/);
 assert.match(render([o],'all'),/&lt;card&gt;/);assert.match(render([o],'ready'),/&lt;card&gt;/);assert.doesNotMatch(render([o],'pending'),/&lt;card&gt;/);
});
test('uncertain labels retain reconciliation control and never offer dispatch or refund',()=>{
 const html=render([order({shipment:{status:'unknown'}})],'attention');
 assert.match(html,/data-shipping-order="a"/);assert.match(html,/Resolve the existing label/);
 assert.doesNotMatch(html,/data-order-action="ship"/);assert.doesNotMatch(html,/data-order-action="refund"/);
});
