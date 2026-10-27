import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveConnection} from '../public/lifecycle/connection.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(api,surface='shop'){
 const sources=[],snapshots=[],connections=[];let token='',renders=0;
 const controller=createLiveConnection({surface,api,getAdminToken:()=>token,applyBootstrap:b=>{token=b.admin;snapshots.push(b.state);},applySnapshot:(s,v)=>snapshots.push({s,v}),setConnected:x=>connections.push(x),render:()=>renders++,captureDraft:()=>({}),restoreDraft:()=>{},notify:()=>{},createSource:url=>{const source={url,readyState:1,close(){this.closed=true;}};sources.push(source);return source;}});
 return {controller,sources,snapshots,connections,get renders(){return renders;}};
}
test('latest SSE viewer response wins and close discards pending responses',async()=>{
 const pending=[];let startup=true;
 const f=fixture(async path=>path==='/api/state'?{version:0}:startup?{user:'initial'}:await new Promise(resolve=>pending.push(resolve)));
 await f.controller.start();startup=false;const events=f.sources[0];
 const first=events.onmessage({data:'{"version":1}'}),second=events.onmessage({data:'{"version":2}'});
 pending[1]({user:'second'});await second;pending[0]({user:'first'});await first;
 assert.equal(f.snapshots.at(-1).s.version,2);assert.equal(f.snapshots.length,2);
 const late=events.onmessage({data:'{"version":3}'});f.controller.close();pending[2]({user:'late'});await late;
 assert.equal(f.snapshots.length,2);assert.equal(events.closed,true);
});
test('close invalidates pending bootstrap; restart does not duplicate active subscriptions',async()=>{
 const pending=deferred();let count=0;
 const f=fixture(()=>++count===1?pending.promise:Promise.resolve({admin:'new',state:{version:2}}),'workspace');
 const starting=f.controller.start();f.controller.close();pending.resolve({admin:'old',state:{version:1}});await starting;assert.equal(f.snapshots.length,0);assert.equal(f.sources.length,0);
 await f.controller.start();await f.controller.start();assert.equal(f.sources[0].closed,true);assert.equal(f.sources[1].closed,undefined);
 f.controller.close();
});
test('credential recovery replaces old source and ignores messages from it',async()=>{
 let count=0;const f=fixture(async()=>({admin:++count===1?'old':'new',state:{version:count}}),'workspace');
 await f.controller.start();const old=f.sources[0];await old.onerror();assert.equal(old.closed,true);assert.match(f.sources[1].url,/admin=new/);
 const before=f.snapshots.length;await old.onmessage({data:'{"private":"stale"}'});assert.equal(f.snapshots.length,before);f.controller.close();
});
