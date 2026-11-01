import test from 'node:test';
import assert from 'node:assert/strict';
import {salesBuckets,orderStatusCounts,ordersChart,salesChart} from '../public/shared/analytics.js';
test('sales buckets use UTC boundaries and keep refunds separate from collected totals',()=>{
 const now=Date.UTC(2026,10,1,15),rows=[{at:Date.UTC(2026,9,31,23,59),received:1200,refund:1200},{at:Date.UTC(2026,10,1),received:500,refund:0},{at:0,received:90000}];
 const b=salesBuckets(rows,{now,days:2});assert.deepEqual(b.map(({received,refund,orders})=>({received,refund,orders})),[{received:1200,refund:1200,orders:1},{received:500,refund:0,orders:1}]);
});
test('order overview partitions every status and excludes practice payments',()=>{
 const statuses=['pending','processing','paid','paid-external','shipped','delivered','refunded','canceled'];
 assert.deepEqual(orderStatusCounts(statuses.map(status=>({status}))).map(g=>g.value),[2,2,2,1,1]);
 assert.match(ordersChart([{mode:'demo',status:'test-paid'},{mode:'live',paymentLive:false,status:'paid'},{mode:'live',status:'pending'}]),/1 real orders/);
});
test('charts show empty states rather than sample sales',()=>{assert.match(salesChart([]),/No collections/);assert.match(ordersChart([]),/activity will appear/);});
