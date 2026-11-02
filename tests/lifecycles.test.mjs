import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutState,checkoutHeld,refundState,refundHeld,transition,shipmentGraph,deliveryGraph,runGraph,runPhaseGraph} from '../lib/commerce/lifecycles.mjs';

test('checkout evidence preserves holds including zero timestamps and processing',()=>{
 for(const [fields,state,held] of [
  [{},'reserved',false],[{checkoutCreated:0},'outcome-unknown',true],
  [{checkoutCreated:0,checkoutId:'cs_1'},'session-known',true],
  [{cryptoCheckout:{}},'wallet-reserved',true],[{status:'processing'},'processing',true],
  [{status:'paid',checkoutId:'cs_1'},'paid',false],[{status:'expired',checkoutCreated:0},'expired',false]
 ]){const order={status:'pending',...fields};assert.equal(checkoutState(order),state);assert.equal(checkoutHeld(order),held);}
});
test('refund holds survive missing responses and release only on authoritative outcomes',()=>{
 for(const [order,state,held] of [
  [{},'idle',false],[{refundRequestedAt:0},'outcome-unknown',true],
  [{refundRequestedAt:0,refundId:'re_1',refundStatus:'pending'},'provider-pending',true],
  [{refundStatus:'failed'},'failed',false],[{refundStatus:'canceled'},'canceled',false],
  [{refundStatus:'rejected'},'rejected',false],
  [{status:'refunded',refundRequestedAt:0},'succeeded',false]
 ]){assert.equal(refundState(order),state);assert.equal(refundHeld(order),held);}
});
test('uncertain label purchases cannot become a new purchase and finalized delivery cannot resend',()=>{
 for(const [graph,current,next] of [[shipmentGraph,'unknown','purchasing'],[shipmentGraph,'pending','quoted'],[deliveryGraph,'reconciling','submitting'],[deliveryGraph,'confirmed','submitting'],[runGraph,'completed','running'],[runPhaseGraph,'stopped','auction']]){
  const record={status:current};assert.throws(()=>transition(record,'status',next,graph),/Invalid/);assert.equal(record.status,current);
 }
 const label={status:'unknown'};transition(label,'status','purchased',shipmentGraph);assert.equal(label.status,'purchased');
 const delivery={status:'reconciling'};transition(delivery,'status','submitted',deliveryGraph);transition(delivery,'status','confirmed',deliveryGraph);
});
