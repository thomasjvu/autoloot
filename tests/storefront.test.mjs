import test from 'node:test';
import assert from 'node:assert/strict';
import {createStorefront} from '../public/storefront.js';

test('storefront renders signed-out and buyer payment states and refreshes viewer after logout',async()=>{
 const previous=globalThis.document;
 const handlers={},app={innerHTML:''};
 const logout={addEventListener:(name,fn)=>handlers.logout=fn};
 const login={addEventListener:(name,fn)=>handlers.login=fn};
 const ctx={state:{show:{title:'Card shop'},products:[],auction:null,mode:'live'},viewer:{orders:[],payments:{configured:true}},liveConnection:true,serverOffset:0};
 const $=selector=>selector==='#app'?app:selector==='#viewer-logout'?logout:selector==='#open-buyer-login'?login:null;
 globalThis.document={body:{},activeElement:null,querySelectorAll:()=>[],querySelector:()=>null};
 try{
  const requests=[];const noop=()=>'';
  const controller=createStorefront(ctx,{$,esc:String,usd:n=>'$'+n,isNftOrder:o=>o.product.fulfillment?.type==='nft',statusBadge:noop,modal:noop,api:async(path)=>{requests.push(path);return {orders:[],payments:{configured:true}};},toast:noop,brand:noop,visual:noop,assetDescription:noop,votePanel:noop,sellerSummary:noop,icon:noop,confirmAction:noop});
  controller.renderShop();assert.match(app.innerHTML,/Sign in with Twitch/);assert.match(app.innerHTML,/No items available/);
  ctx.viewer={user:{login:'buyer'},payments:{configured:true},orders:[{id:'order',number:'AL-1',product:{title:'Card'},status:'pending',mode:'live',amount:500}]};
  controller.renderShop();assert.match(app.innerHTML,/@buyer/);assert.match(app.innerHTML,/Continue to payment/);assert.match(app.innerHTML,/data-checkout="order"/);
  await handlers.logout();assert.deepEqual(requests,['/api/viewer/logout','/api/viewer']);assert.match(app.innerHTML,/Sign in with Twitch/);
  controller.disconnect();ctx.liveConnection=false;assert.equal(controller.reservationClock(Date.now()+10000),'—');
 }finally{globalThis.document=previous;}
});
