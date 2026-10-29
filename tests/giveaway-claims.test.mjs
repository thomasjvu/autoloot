import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine,seed} from '../lib/engine.mjs';
import {buyerPrizes,publicGiveaway} from '../lib/giveaways.mjs';
const recipient={name:'Winner',line1:'1 Main St',city:'Boston',state:'MA',postal_code:'02110',country:'US'};
function fixture(mode='demo'){let now=1000;const state=seed();state.mode=mode;const e=new Engine(state,{now:()=>now}),session={id:'winner',login:'renamed',kind:mode==='live'?'twitch':'demo'};e.openGiveaway({title:'Prize',rules:'Free, US, seven days',duration:60});e.enterGiveaway({userId:session.id,username:'Original',source:mode==='live'?'twitch':'demo'});e.closeGiveaway();e.drawGiveaway();return {e,session,setNow:v=>now=v};}
test('archive retains frozen roster, stable winner, claim and draw evidence',()=>{
 const {e,session}=fixture();const g=e.state.giveaway;e.claimGiveaway({id:g.id,address:recipient,confirmed:true},session);const saved=structuredClone(g);e.openGiveaway({title:'Next',rules:'Free',duration:60});assert.deepEqual(e.state.giveawayHistory[0],saved);assert.equal(buyerPrizes(e.state,session,e.now())[0].id,saved.id);e.dispatchGiveaway({id:saved.id,tracking:'USPS 123',confirmed:true});assert.equal(e.state.giveawayHistory[0].claim.status,'dispatched');assert.equal(e.state.orders.length,0);
});
test('claims use stable identity and session kind, not display name or registration',()=>{
 const {e,session}=fixture('live'),g=e.state.giveaway,input={id:g.id,address:recipient,confirmed:true};
 assert.throws(()=>e.claimGiveaway(input,{id:'other',login:'Original',kind:'twitch'}),/another/);assert.throws(()=>e.claimGiveaway(input,{...session,kind:'demo'}),/another/);assert.equal(buyerPrizes(e.state,{id:'other',kind:'twitch'}).length,0);e.claimGiveaway(input,session);assert.equal(g.claim.address.name,'Winner');assert.equal(e.state.registrations.length,0);
});
test('address validation, expiry, confirmation, corrections and dispatch replay boundaries',()=>{
 const {e,session,setNow}=fixture(),g=e.state.giveaway,input={id:g.id,address:recipient,confirmed:true};assert.throws(()=>e.claimGiveaway({...input,confirmed:false},session));assert.throws(()=>e.claimGiveaway({...input,address:{...recipient,country:'CA'}},session));e.claimGiveaway(input,session);const original=g.claim.submittedAt;e.claimGiveaway({...input,address:{...recipient,line2:'Unit 2'}},session);assert.equal(g.claim.submittedAt,original);assert.equal(g.claim.address.line2,'Unit 2');assert.throws(()=>e.dispatchGiveaway({id:g.id,tracking:'123'}));e.dispatchGiveaway({id:g.id,tracking:'USPS 123',confirmed:true});assert.equal(g.claim.simulated,true);e.dispatchGiveaway({id:g.id,tracking:'USPS 123',confirmed:true});assert.throws(()=>e.dispatchGiveaway({id:g.id,tracking:'other',confirmed:true}));assert.throws(()=>e.claimGiveaway(input,session));
 const f=fixture();f.setNow(f.e.state.giveaway.claimDeadline);assert.throws(()=>f.e.claimGiveaway({id:f.e.state.giveaway.id,address:recipient,confirmed:true},f.session),/deadline/);assert.equal(buyerPrizes(f.e.state,f.session,f.e.now())[0].status,'expired');setNow(9999999999);
});
test('public giveaway is strict allowlist and legacy identity cannot be inferred',()=>{
 const {e,session}=fixture(),g=e.state.giveaway;e.claimGiveaway({id:g.id,address:recipient,confirmed:true},session);g.secret='hidden';g.draws[0].private='hidden';const p=publicGiveaway(g),serialized=JSON.stringify(p);for(const word of ['winnerUserId','address','claimDeadline','submittedAt','hidden','entries'])assert.equal(serialized.includes(word),false);assert.equal(p.winner,'Original');delete g.winnerUserId;assert.equal(buyerPrizes(e.state,session).length,0);assert.throws(()=>e.claimGiveaway({id:g.id,address:recipient,confirmed:true},session),/another/);
});
test('claim and dispatch cannot cross operating mode or accept unknown deadline',()=>{
 const {e,session}=fixture(),g=e.state.giveaway;e.state.mode='live';assert.throws(()=>e.claimGiveaway({id:g.id,address:recipient,confirmed:true},session),/mode/);e.state.mode='demo';delete g.claimDeadline;assert.throws(()=>e.claimGiveaway({id:g.id,address:recipient,confirmed:true},session),/deadline/);
});
test('an on-time claim remains fulfillable after its submission deadline',()=>{
 const {e,session,setNow}=fixture(),g=e.state.giveaway;e.claimGiveaway({id:g.id,address:recipient,confirmed:true},session);setNow(g.claimDeadline+1);assert.equal(buyerPrizes(e.state,session,e.now())[0].status,'submitted');assert.throws(()=>e.claimGiveaway({id:g.id,address:recipient,confirmed:true},session),/deadline/);e.dispatchGiveaway({id:g.id,tracking:'USPS 123',confirmed:true});assert.equal(g.claim.status,'dispatched');
});
