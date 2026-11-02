import test from 'node:test';
import assert from 'node:assert/strict';
import {featureFlags} from '../lib/commerce/features.mjs';
import {Engine,seed} from '../lib/commerce/engine.mjs';
import {giveawaysPage} from '../public/giveaways.js';
import {workspaceNavigation} from '../public/workspace-navigation.js';

test('preview flags default off and require explicit environment opt-in',()=>{
 assert.deepEqual(featureFlags(),{ripStudio:false,giveaways:false,nft:false});
 assert.deepEqual(featureFlags({AUTOLOOT_RIP_STUDIO:'true',AUTOLOOT_GIVEAWAYS:'0'}),featureFlags());
 assert.deepEqual(featureFlags({AUTOLOOT_RIP_STUDIO:'1',AUTOLOOT_GIVEAWAYS:'1'}),{ripStudio:true,giveaways:true,nft:false});
});
test('disabling giveaways blocks creation and entry but preserves existing prize obligations',()=>{
 const e=new Engine(seed(),{features:featureFlags({AUTOLOOT_GIVEAWAYS:'1'})});
 e.openGiveaway({title:'Prize',rules:'Free US entry',duration:60});
 e.enterGiveaway({userId:'winner',username:'Winner',source:'demo'});
 const disabled=new Engine(structuredClone(e.state));
 assert.throws(()=>disabled.openGiveaway({}),/coming soon/);
 assert.throws(()=>disabled.enterGiveaway({userId:'other',username:'Other',source:'demo'}),/coming soon/);
 disabled.closeGiveaway();disabled.drawGiveaway();
 disabled.claimGiveaway({id:disabled.state.giveaway.id,confirmed:true,address:{name:'Winner',line1:'1 Main St',city:'Boston',state:'MA',postal_code:'02110',country:'US'}},{id:'winner',kind:'demo'});
 disabled.dispatchGiveaway({id:disabled.state.giveaway.id,tracking:'Practice 123',confirmed:true});
 assert.equal(disabled.state.giveaway.claim.status,'dispatched');
 const html=giveawaysPage({...disabled.state,features:disabled.features});
 assert.match(html,/Coming soon/);assert.match(html,/Prize claims and history/);assert.doesNotMatch(html,/id="giveaway-form"|id="giveaway-demo"/);
});
test('navigation labels disabled previews and removes labels when enabled',()=>{
 const args={tab:'studio',twitch:{},brand:'Autoloot'};
 assert.match(workspaceNavigation({...args,features:featureFlags()}),/Rip studio · Coming soon/);
 assert.doesNotMatch(workspaceNavigation({...args,features:{ripStudio:true,giveaways:true}}),/Coming soon/);
});

test('disabled Rip HTTP routes reject frames and actions before invoking providers',async()=>{
 const {createHttpApp}=await import('../lib/http/app.mjs');
 const engine=new Engine(seed());
 const app=createHttpApp({engine,policy:{middleware:async(c,next)=>{c.set('prepared',{adminAccess:true});await next();}},requestContext:()=>({}),auth:{},events:{},base:'http://localhost',twitch:{},payments:{},nft:{},media:{},rip:new Proxy({},{get:()=>()=>{throw Error('Provider must not run');}})});
 for(const path of ['frame','provider','search','select','confirm','clear']){
  const response=await app.request('/api/rip/'+path,{method:'POST',body:'ignored'});
  assert.equal(response.status,403,path);assert.match((await response.json()).error,/coming soon/);
 }
});

test('NFT preview blocks new inventory and sales while retaining existing orders',()=>{
 const asset={type:'nft',chain:'eip155:8453',sender:'0x'+'1'.repeat(40),contract:'0x'+'2'.repeat(40),tokenId:'1',provider:'Fixture'};
 const input={title:'NFT fixture',quantity:1,price:'5',buyNowPrice:'5',listed:true,fulfillment:asset};
 const disabled=new Engine(seed());
 assert.throws(()=>disabled.addProduct(input),/coming soon/);
 const enabled=new Engine(seed(),{features:featureFlags({AUTOLOOT_NFT:'1'})});
 const p=enabled.addProduct(input);
 const restored=new Engine(structuredClone(enabled.state));
 assert.throws(()=>restored.editProduct(p.id,{title:p.title,price:'5',quantity:1}),/coming soon/);
 assert.throws(()=>restored.start({productId:p.id,duration:60,increment:100}),/coming soon/);
 assert.throws(()=>restored.buyNow({productId:p.id,userId:'buyer',username:'Buyer',requestId:'new'}),/coming soon/);
 const order=enabled.buyNow({productId:p.id,userId:'buyer',username:'Buyer',requestId:'existing'});
 const after=new Engine(structuredClone(enabled.state));
 assert.equal(after.order(order.id).product.fulfillment.type,'nft');
 assert.equal(featureFlags({AUTOLOOT_NFT:'1'}).nft,true);
});
