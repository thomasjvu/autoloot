import test from 'node:test';
import assert from 'node:assert/strict';
import {routeApp,post} from './helpers/hono.mjs';
import {Engine,seed} from '../lib/commerce/engine.mjs';
import {createViewer} from '../lib/http/viewer.mjs';
test('buyer payload cannot set identity, price, payment status or inventory quantity',async()=>{
 const engine=new Engine(seed()),product=engine.state.products.find(p=>p.listed&&p.buyNowPrice&&p.quantity>0),quantity=product.quantity;
 const route=createViewer({engine,payments:{status:{configured:true}},twitch:{},nft:{},base:'http://localhost'});
 const session={id:'real-buyer',login:'verified',kind:'demo'};const app=routeApp(route,{prepared:{session}});
 const res=await post(app,'/api/viewer/buy',{productId:product.id,requestId:'request-1',userId:'forged',username:'forged',amount:1,total:1,price:1,quantity:100,status:'paid',paymentLive:true});
 assert.equal(res.status,200);const result=await res.json(),order=engine.order(result.orderId);
 assert.equal(order.userId,session.id);assert.equal(order.buyer,session.login);assert.equal(order.amount,product.buyNowPrice);assert.equal(order.total,order.amount+order.shippingPrice);assert.equal(order.status,'pending');assert.equal(order.paymentLive,undefined);assert.equal(product.quantity,quantity-1);
 const retry=await (await post(app,'/api/viewer/buy',{productId:product.id,requestId:'request-1',amount:0})).json();
 assert.equal(retry.orderId,order.id);assert.equal(product.quantity,quantity-1);
});
test('changing order IDs cannot invoke another buyer checkout, shipping, wallet, cancellation or simulation',async()=>{
 const engine=new Engine(seed()),product=engine.state.products.find(p=>p.listed&&p.buyNowPrice&&p.quantity>0);
 const order=engine.buyNow({productId:product.id,userId:'owner',username:'owner',requestId:'owned'}),before=structuredClone(engine.state);
 const forbidden=()=>{throw Error('Unauthorized provider invocation');};
 const route=createViewer({engine,payments:{checkout:forbidden,cancel:forbidden,countries:['US']},twitch:{},nft:{setRecipient:forbidden,simulate:forbidden}});
 const app=routeApp(route,{prepared:{session:{id:'other',login:'other',kind:'demo'}}});
 for(const path of ['checkout','shipping','wallet','cancel','demo-pay','demo-deliver','wallet-checkout','wallet-verify','wallet-cancel']){
  const res=await post(app,'/api/viewer/'+path,{id:order.id,userId:'owner',shipping:{country:'US'}});
  assert.equal(res.status,403,path);assert.deepEqual(engine.state,before,path);
 }
});
