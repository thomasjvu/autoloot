import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjections} from '../lib/http/projections.mjs';
import {seed} from '../lib/engine.mjs';
function fixture(){
 const engine={state:seed()},payments={status:{configured:false}},twitch={status:{configured:false}},nft={status:()=>({chains:[]})};
 const project=createProjections({engine,payments,twitch,nft});return {engine,payments,twitch,project};
}
test('viewer revision is opaque, process-keyed and stable for unrelated chat',()=>{
 const f=fixture(),first=f.project('viewer').viewerRevision;
 assert.match(first,/^[a-f0-9]{64}$/);f.engine.state.chat.push({text:'hello'});assert.equal(f.project('viewer').viewerRevision,first);
 f.engine.state.giveaway={id:'g',status:'open',entries:[]};const giveawayToken=f.project('viewer').viewerRevision;f.engine.state.giveaway.entries.push({userId:'entrant'});assert.equal(f.project('viewer').viewerRevision,giveawayToken);
 assert.notEqual(fixture().project('viewer').viewerRevision,first);
 for(const change of [()=>f.engine.state.orders.push({id:'private-buyer-order',shipping:{line1:'private address'}}),()=>f.engine.state.registrations.push({userId:'private-id'}),()=>f.payments.status.configured=true,()=>f.twitch.status.configured=true,()=>f.engine.state.giveawayHistory=[{claim:{address:'private'}}],()=>f.engine.state.privateBids={a:{ceiling:1000}}]){
  const previous=f.project('viewer').viewerRevision;change();const state=f.project('viewer');assert.notEqual(state.viewerRevision,previous);assert.equal(JSON.stringify(state).includes('private address'),false);assert.equal(JSON.stringify(state).includes('private-buyer-order'),false);
 }
});
