import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../lib/engine.mjs';
import {emptyWorkspace} from '../lib/workspace.mjs';
import {RipSession} from '../lib/rip-session.mjs';
const card={id:'card',name:'Pikachu',number:'25',setName:'Set'};
const metadata={base:'catalog',search:async()=>[card],detail:async()=>({card})};
const vision={mode:()=> 'local',status:()=>({mode:'local'}),observe:async()=>({kind:'card',name:'Pikachu'})};

test('late scan cannot replace a newer manual search or cleared review',async()=>{
 let release;const session=new RipSession(new Engine(emptyWorkspace()),metadata,{...vision,observe:()=>new Promise(resolve=>{release=resolve;})});
 const pending=session.scan(Buffer.from('x'));await session.search({query:'manual'});
 release({kind:'card',name:'Old reveal'});await pending;
 assert.equal(session.snapshot().observation,null);assert.equal(session.snapshot().candidates[0].id,'card');
});

test('selection revisions prevent stale detail responses and confirmations',async()=>{
 let release;const session=new RipSession(new Engine(emptyWorkspace()),{...metadata,detail:()=>new Promise(resolve=>{release=resolve;})},vision);
 await session.search({query:'card'});const selecting=session.select('card');session.clear();release({card});await assert.rejects(selecting,/changed/);
 assert.throws(()=>session.confirm({selectionId:'stale'}),/changed/);
});

test('confirmed pulls persist with the announcement, and duplicate confirmation cannot duplicate a pull',async()=>{
 let saved;const engine=new Engine(emptyWorkspace(),{save:s=>{saved=structuredClone(s);}}),session=new RipSession(engine,metadata,vision);
 await session.search({query:'card'});await session.select('card');const selectionId=session.snapshot().selected.selectionId;
 session.confirm({selectionId});assert.equal(saved.pulls.length,1);assert.match(saved.companion.message,/Pikachu/);
 assert.throws(()=>session.confirm({selectionId}),/changed/);
 const restored=new RipSession(new Engine(saved),metadata,vision);assert.equal(restored.snapshot().pulls.length,1);
 await restored.search({query:'same physical identity'});await restored.select('card');restored.confirm({selectionId:restored.snapshot().selected.selectionId});assert.equal(restored.snapshot().pulls.length,2);
});

test('failed persistence never publishes a confirmed pull',async()=>{
 const engine=new Engine(emptyWorkspace(),{save:()=>{throw Error('disk');}}),session=new RipSession(engine,metadata,vision);
 await session.search({query:'card'});await session.select('card');assert.throws(()=>session.confirm({selectionId:session.snapshot().selected.selectionId}),/disk/);assert.equal(session.snapshot().pulls.length,0);
});

test('malformed provider guides leave a review usable without a price and cannot create ghost pulls',async()=>{
 for(const quotes of [{currency:'invalid',variants:[{key:'raw',label:'Raw',mid:1}]},{currency:'USD',variants:{}},{currency:'USD',variants:[null,{},[]]}]){
  let saved;const engine=new Engine(emptyWorkspace(),{save:s=>{saved=structuredClone(s);}}),session=new RipSession(engine,{...metadata,detail:async()=>({card,quotes})},vision);
  await session.search({query:'card'});await session.select('card');const selected=structuredClone(session.state.selected),before=structuredClone(engine.state);
  assert.equal(selected.variants.length,0);assert.throws(()=>session.confirm({selectionId:selected.selectionId,variant:'raw'}),/available/);assert.deepEqual(engine.state,before);assert.deepEqual(session.state.selected,selected);
  engine.chat('fixture','unrelated');assert.equal(saved.pulls.length,0);
  session.confirm({selectionId:selected.selectionId});assert.equal(saved.pulls.length,1);assert.throws(()=>session.confirm({selectionId:selected.selectionId}),/changed/);
 }
});
test('announcement formatting is completed before any pull or companion mutation',async()=>{
 let saved;const engine=new Engine(emptyWorkspace(),{save:s=>{saved=structuredClone(s);}}),session=new RipSession(engine,metadata,vision);
 await session.search({query:'card'});await session.select('card');session.state.selected.variants=[{key:'raw',label:'Raw',price:1,currency:'invalid'}];
 const before=structuredClone(engine.state),selection=structuredClone(session.state.selected);
 assert.throws(()=>session.confirm({selectionId:selection.selectionId,variant:'raw'}),/currency/);assert.deepEqual(engine.state,before);assert.deepEqual(session.state.selected,selection);
 engine.chat('fixture','unrelated');assert.equal(saved.pulls.length,0);
 session.state.selected.variants[0].currency='EUR';session.confirm({selectionId:selection.selectionId,variant:'raw'});assert.equal(saved.pulls.length,1);assert.match(saved.companion.message,/€1\.00/);
 assert.throws(()=>session.confirm({selectionId:selection.selectionId,variant:'raw'}),/changed/);
});
