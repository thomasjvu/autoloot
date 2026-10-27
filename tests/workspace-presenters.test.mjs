import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkspace} from '../lib/workspace.mjs';
import {inventoryPage} from '../public/workspace/inventory.js';
import {ordersPage} from '../public/workspace/orders.js';
import {settingsPage} from '../public/workspace/settings.js';
import {createStudioViews} from '../public/workspace/studio.js';
import {companionPage} from '../public/workspace/companion.js';
import {createProductDialogs} from '../public/workspace/product-dialogs.js';
const noop=()=>'';
function state(){return {...emptyWorkspace(),payments:{configured:false},twitch:{configured:false},shipping:{},nft:{},metadata:{},vision:{},storage:{},catalog:{items:[]}};}
test('workspace views import without DOM and escape user-supplied product and buyer text',()=>{
 const s=state();s.products=[{id:'p',title:'<img>',quantity:1,price:100,art:'card',description:'<script>',condition:'Raw'}];
 assert.match(inventoryPage(s,{search:'',inventoryView:'owned'}),/&lt;img&gt;/);
 s.orders=[{id:'o',number:'AL-1',product:s.products[0],buyer:'<buyer>',status:'pending',mode:'live',amount:100}];
 const html=ordersPage(s,{}, {nftOrderDetails:noop,reservationNotice:noop});assert.match(html,/&lt;buyer&gt;/);assert.match(html,/confirm-paid/);
 assert.doesNotThrow(()=>settingsPage(s));assert.doesNotThrow(()=>companionPage(s));
});
test('studio and product dialogs read current state on every invocation',()=>{
 let s=state();const studio=createStudioViews({getState:()=>s,clock:()=>'',companionCard:noop,tutorialStatus:()=>({})});
 assert.match(studio.studio(),/Add your first lot/);
 s={...s,products:[{id:'p',title:'New product',quantity:1,price:100,art:'card'}],show:{title:'New title'},activity:[],bids:[],chat:[]};
 assert.match(studio.studio(),/New title/);assert.match(studio.studio(),/New product/);
 let markup='';const form={};const $=selector=>selector==='#start-form'?form:null;
 const dialog=createProductDialogs({getState:()=>s,getToken:noop,$,modal:html=>markup=html,api:noop,toast:noop,fetch:noop});
 dialog.startDialog('p');assert.match(markup,/New product/);s.products[0].title='Updated product';dialog.startDialog('p');assert.match(markup,/Updated product/);
});
