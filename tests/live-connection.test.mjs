import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveConnection} from '../public/lifecycle/connection.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(api,surface='shop',options={}){
 const sources=[],snapshots=[],connections=[];let token='',renders=0;
 const controller=createLiveConnection({...options,surface,api,getAdminToken:()=>token,applyBootstrap:b=>{token=b.admin;snapshots.push(b.state);},applySnapshot:(s,v)=>snapshots.push({s,v}),setConnected:x=>connections.push(x),render:()=>renders++,captureDraft:()=>({}),restoreDraft:()=>{},notify:()=>{},createSource:url=>{const source={url,readyState:1,close(){this.closed=true;}};sources.push(source);return source;}});
 return {controller,sources,snapshots,connections,get renders(){return renders;}};
}
test('chat-only updates reuse viewer data and relevant revisions coalesce without freezing public state',async()=>{
 const pending=[];let reads=0;
 const f=fixture(async path=>path==='/api/state'?{version:0,viewerRevision:'a'}:++reads===1?{user:'initial'}:await new Promise(resolve=>pending.push(resolve)));
 await f.controller.start();const events=f.sources[0];
 await events.onmessage({data:JSON.stringify({version:1,viewerRevision:'a'})});assert.equal(reads,1);
 const first=events.onmessage({data:JSON.stringify({version:2,viewerRevision:'b'})});
 const second=events.onmessage({data:JSON.stringify({version:3,viewerRevision:'c'})});
 assert.equal(reads,2);assert.equal(f.snapshots.at(-1).s.version,3);assert.equal(f.snapshots.at(-1).v.user,'initial');
 pending[0]({user:'b'});await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,3);
 pending[1]({user:'c'});await Promise.all([first,second]);assert.equal(f.snapshots.at(-1).s.version,3);assert.equal(f.snapshots.at(-1).v.user,'c');
 const late=events.onmessage({data:JSON.stringify({version:4,viewerRevision:'d'})});const count=f.snapshots.length;f.controller.close();pending[2]({user:'late'});await late;
 assert.equal(f.snapshots.length,count);assert.equal(events.closed,true);
});
test('reconnect revalidates even unchanged revision',async()=>{
 let reads=0;const f=fixture(async path=>path==='/api/state'?{viewerRevision:'a'}:{read:++reads});
 await f.controller.start();await f.sources[0].onerror();await f.sources[0].onmessage({data:JSON.stringify({viewerRevision:'a'})});assert.equal(reads,2);assert.equal(f.snapshots.at(-1).v.read,2);f.controller.close();
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

test('external buyer action cannot be overwritten by an older private response',async()=>{
 let viewer={user:'initial'},reads=0;const pending=[];
 const sources=[];const controller=createLiveConnection({surface:'shop',getViewer:()=>viewer,api:async path=>path==='/api/state'?{viewerRevision:'a'}:++reads===1?viewer:await new Promise(resolve=>pending.push(resolve)),getAdminToken:()=>'',applyBootstrap:()=>{},applySnapshot:(state,value)=>{viewer=value;},setConnected:()=>{},render:()=>{},captureDraft:()=>({}),restoreDraft:()=>{},notify:()=>{},createSource:()=>{const s={readyState:1,close(){}};sources.push(s);return s;}});
 await controller.start();const refresh=sources[0].onmessage({data:JSON.stringify({viewerRevision:'b'})});viewer={user:null};pending[0]({user:'old session'});await new Promise(resolve=>setImmediate(resolve));assert.equal(viewer.user,null);pending[1]({user:null});await refresh;assert.equal(viewer.user,null);controller.close();
});
test('next event refreshes session after bounded cache age',async()=>{
 let clock=0,reads=0;const f=fixture(async path=>path==='/api/state'?{viewerRevision:'a'}:{read:++reads},'shop',{now:()=>clock,viewerRefreshMs:30});
 await f.controller.start();clock=31;await f.sources[0].onmessage({data:JSON.stringify({viewerRevision:'a'})});assert.equal(reads,2);f.controller.close();
});

test('chat-only snapshots differing only in server time do not rebuild the shop',async()=>{
 let reads=0;const f=fixture(async path=>path==='/api/state'?{viewerRevision:'a',serverTime:1,auction:{price:10}}:{read:++reads});
 await f.controller.start();const count=f.renders;await f.sources[0].onmessage({data:JSON.stringify({viewerRevision:'a',serverTime:2,auction:{price:10}})});assert.equal(f.renders,count);assert.equal(reads,1);f.controller.close();
});
