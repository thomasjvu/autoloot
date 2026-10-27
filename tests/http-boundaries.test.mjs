import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {createEventHub} from '../lib/http/events.mjs';
import {createViewer} from '../lib/http/viewer.mjs';
import {createInventoryActions} from '../lib/http/inventory-actions.mjs';
import {body,rawBody} from '../lib/http/response.mjs';

class Response extends EventEmitter {
 constructor(){super();this.writes=[];this.writableNeedDrain=false;this.destroyed=false;}
 writeHead(status,headers){this.statusCode=status;this.headers=headers;}
 write(value){this.writes.push(value);}
 end(value){this.writableEnded=true;if(value)this.write(value);this.emit('close');}
 destroy(){this.destroyed=true;this.emit('close');}
}
test('SSE settles registration, coalesces backpressure into latest snapshot and cleans each timer',()=>{
 let version=1,settled=0;const timers=new Map();let next=0;
 const valid=new Set(),hub=createEventHub({stateFor:role=>({role,version}),adminValid:req=>valid.has(req),setInterval:fn=>{timers.set(++next,fn);return next;},clearInterval:id=>timers.delete(id)});
 const req={};valid.add(req);const admin=new Response(),viewer=new Response();
 hub.connect(req,admin,'admin',()=>settled++);hub.connect({},viewer,'viewer',()=>settled++);
 assert.equal(settled,2);assert.equal(hub.clients.size,2);
 admin.writableNeedDrain=true;version=2;hub.broadcast();version=3;hub.broadcast();
 assert.equal(admin.writes.length,1);admin.writableNeedDrain=false;admin.emit('drain');
 assert.match(admin.writes.at(-1),/"version":3/);assert.match(viewer.writes.at(-1),/"role":"viewer"/);
 valid.delete(req);timers.get(1)();assert.equal(admin.writableEnded,true);assert.equal(hub.clients.size,1);assert.equal(timers.size,1);
 hub.close();assert.equal(hub.clients.size,0);assert.equal(timers.size,0);
});
test('SSE rejects expired admin sessions during broadcast and drain without leaking another snapshot',()=>{
 for(const delivery of ['broadcast','drain']){
  let authorized=true;const response=new Response();const hub=createEventHub({stateFor:()=>({private:true}),adminValid:()=>authorized,setInterval:()=>1,clearInterval:()=>{}});
  hub.connect({},response,'admin',()=>{});response.writableNeedDrain=true;hub.broadcast();authorized=false;
  if(delivery==='broadcast')hub.broadcast();else response.emit('drain');
  assert.equal(response.writes.length,1);assert.equal(response.writableEnded,true);
 }
});
test('HTTP helpers bound JSON and preserve unmodified webhook bytes',async()=>{
 const bytes=Buffer.from('{"message":"é"}\n');assert.deepEqual(await rawBody(Readable.from([bytes.subarray(0,5),bytes.subarray(5)]),100,'large'),bytes);
 await assert.rejects(rawBody(Readable.from([bytes]),1,'large'),/large/);
 assert.deepEqual(await body(Readable.from([Buffer.from('{"a":1}')])),{a:1});
 await assert.rejects(body(Readable.from([Buffer.from('{}')]),1),/Request too large/);
});
test('viewer route matching is explicit, webhook receives raw bytes and receipt enforces ownership',async()=>{
 let received;const order={id:'o',userId:'owner',number:'AL-1',product:{title:'Card'}};
 const route=createViewer({engine:{order:()=>order},payments:{webhook:(raw,signature)=>received={raw,signature}},base:'http://localhost'});
 const res=new Response();assert.equal(await route({req:{method:'GET'},res,path:'/api/products'}),false);assert.equal(res.writes.length,0);
 const bytes=Buffer.from('{ "exact": true }\n'),req=Readable.from([bytes]);req.method='POST';req.headers={'stripe-signature':'signature'};
 assert.equal(await route({req,res,path:'/api/stripe/webhook'}),true);assert.deepEqual(received,{raw:bytes,signature:'signature'});
 const denied=new Response();await route({req:{method:'GET'},res:denied,path:'/api/receipt',url:new URL('http://localhost/api/receipt?id=o'),session:{id:'other'},adminAccess:false});assert.equal(denied.statusCode,403);
});
test('inventory action dispatch distinguishes a handled command from unknown paths',async()=>{
 const added=[];const route=createInventoryActions({engine:{addProduct:b=>added.push(b)}});
 assert.equal(await route({path:'/api/unknown',b:{}}),false);assert.deepEqual(added,[]);
 const input={title:'Card'};assert.equal(await route({path:'/api/products',b:input}),true);assert.deepEqual(added,[input]);
});
