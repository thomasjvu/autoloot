import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine,seed} from '../lib/commerce/engine.mjs';
import {demoContent} from '../lib/commerce/workspace.mjs';
for(const enabled of [true,false])for(const [field,value] of [['giveaway',{status:'open'}],['giveaway',{status:'closed'}],['vote',{status:'open'}],['auction',{status:'live'}],['auction',{status:'paused'}],['run',{status:'running'}],['run',{status:'paused'}]]){
 test(`demo ${enabled} rejects active ${field} ${value.status} without any mutation`,()=>{
  const state=seed();state[field]=value;const engine=new Engine(state);const before=structuredClone(engine.state);
  assert.throws(()=>demoContent(engine,enabled));assert.deepEqual(engine.state,before);
 });
}
test('mode rejection does not change companion provider',()=>{const state=seed();state.products=[];state.companion.provider='demo';state.giveaway={status:'closed'};const engine=new Engine(state);assert.throws(()=>engine.setMode('live'),/giveaway/);assert.equal(state.companion.provider,'demo');});
