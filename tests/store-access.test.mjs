import test from 'node:test';import assert from 'node:assert/strict';import {Hono} from 'hono';
import {configureStore,storeAccessMiddleware} from '../lib/http/store-access.mjs';
function setup(){const engine={state:{},commit(){}};const app=new Hono();app.onError((e,c)=>c.json({error:e.message},400));app.use('*',async(c,next)=>{c.set('request',{headers:{cookie:c.req.header('cookie')},socket:{remoteAddress:'fixture'}});await next();});app.use('*',storeAccessMiddleware({engine,auth:{valid:()=>false},localHost:()=>true}));app.all('*',c=>c.json({ok:true}));return {engine,app};}
test('password gate verifies secrets and invalidates cookies when password changes',async()=>{
 const {engine,app}=setup();configureStore(engine,{password:'Private-store-123',draft:false});assert.notEqual(engine.state.storeAccess.password.hash,'Private-store-123');
 assert.equal((await app.request('/api/state')).status,401);assert.equal((await app.request('/shop')).status,401);
 const unlock=await app.request('/store/unlock',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'password=Private-store-123'});assert.equal(unlock.status,302);const cookie=unlock.headers.get('set-cookie').split(';')[0];
 assert.equal((await app.request('/api/state',{headers:{cookie}})).status,200);
 configureStore(engine,{password:'Changed-store-123',draft:false});assert.equal((await app.request('/api/state',{headers:{cookie}})).status,401);
 assert.equal((await app.request('/api/state',{headers:{cookie:'autoloot_store=9999999999999.'+'é'.repeat(64)}})).status,401);
});
test('draft blocks transactions and fulfillment but allows signed payment webhook and refunds',async()=>{
 const {engine,app}=setup();configureStore(engine,{draft:true});
 for(const path of ['/api/viewer/buy','/api/viewer/checkout','/api/shipping/buy','/api/shipping/dispatch','/api/nft/submit','/api/auction/start'])assert.equal((await app.request(path,{method:'POST'})).status,403,path);
 assert.equal((await app.request('/api/stripe/webhook',{method:'POST'})).status,200);assert.equal((await app.request('/api/order',{method:'POST'})).status,200);
 engine.state.auction={status:'live'};assert.throws(()=>configureStore(engine,{draft:false}),/Finish/);
});
