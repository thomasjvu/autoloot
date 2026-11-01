import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createEventHub} from '../lib/http/events.mjs';
import {createViewer} from '../lib/http/viewer.mjs';
import {createInventoryActions} from '../lib/http/inventory-actions.mjs';
import {body,rawBody} from '../lib/http/response.mjs';
import {routeApp,post} from './helpers/hono.mjs';
const decode=value=>new TextDecoder().decode(value);

test('SSE coalesces slow readers into the latest snapshot and cleans timers',async()=>{
 let version=1,settled=0;const timers=new Map();let next=0;
 const valid=new Set(),hub=createEventHub({stateFor:role=>({role,version}),adminValid:req=>valid.has(req),setInterval:fn=>{timers.set(++next,fn);return next;},clearInterval:id=>timers.delete(id)});
 const req={};valid.add(req);const admin=hub.connect(req,'admin',()=>settled++).body.getReader();
 assert.equal(settled,1);assert.equal(hub.clients.size,1);
 version=2;hub.broadcast();version=3;hub.broadcast();
 assert.match(decode((await admin.read()).value),/"version":1/);
 assert.match(decode((await admin.read()).value),/"version":3/);
 valid.delete(req);timers.get(1)();
 // A previously queued snapshot can still be read; no newly authorized data is sent.
 while(!(await admin.read()).done){}
 assert.equal(hub.clients.size,0);assert.equal(timers.size,0);
});
test('SSE closes expired admin sessions and aborted viewers',async()=>{
 let authorized=true;const timers=new Map();let id=0;
 const hub=createEventHub({stateFor:()=>({private:true}),adminValid:()=>authorized,setInterval:fn=>{timers.set(++id,fn);return id;},clearInterval:id=>timers.delete(id)});
 const reader=hub.connect({},'admin',()=>{}).body.getReader();await reader.read();
 authorized=false;hub.broadcast();assert.equal((await reader.read()).done,true);
 const controller=new AbortController();hub.connect({},'viewer',()=>{},controller.signal);assert.equal(timers.size,1);
 controller.abort();assert.equal(hub.clients.size,0);assert.equal(timers.size,0);
 hub.close();
});
test('HTTP helpers bound JSON and preserve unmodified webhook bytes',async()=>{
 const bytes=Buffer.from('{"message":"é"}\n');assert.deepEqual(await rawBody(Readable.from([bytes.subarray(0,5),bytes.subarray(5)]),100,'large'),bytes);
 await assert.rejects(rawBody(new Request('http://localhost',{method:'POST',body:bytes}),1,'large'),/large/);
 assert.deepEqual(await body(new Request('http://localhost',{method:'POST',body:'{"a":1}'})),{a:1});
 await assert.rejects(body(new Request('http://localhost',{method:'POST',body:'{}'}),1),/Request too large/);
});
test('viewer routes preserve raw webhook bytes and enforce receipt ownership',async()=>{
 let received;const order={id:'o',userId:'owner',number:'AL-1',product:{title:'Card'}};
 const app=routeApp(createViewer({engine:{order:()=>order},payments:{webhook:(raw,signature)=>received={raw,signature}},base:'http://localhost'}),{prepared:{session:{id:'other'},adminAccess:false}});
 assert.equal((await app.request('http://localhost/api/products')).status,404);
 const bytes=Buffer.from('{ "exact": true }\n');
 assert.equal((await app.request('http://localhost/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':'signature'},body:bytes})).status,200);
 assert.deepEqual(received,{raw:bytes,signature:'signature'});
 assert.equal((await app.request('http://localhost/api/receipt?id=o')).status,403);
});
test('inventory Hono routes reject unknown paths and dispatch valid commands',async()=>{
 const added=[];const app=routeApp(createInventoryActions({engine:{addProduct:b=>added.push(b)},stateFor:()=>({})}));
 assert.equal((await post(app,'/api/unknown',{})).status,404);assert.deepEqual(added,[]);
 const input={title:'Card'};assert.equal((await post(app,'/api/products',input)).status,200);assert.deepEqual(added,[input]);
});
