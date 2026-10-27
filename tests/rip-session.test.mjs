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
