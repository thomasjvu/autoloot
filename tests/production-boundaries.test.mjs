import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../lib/commerce/engine.mjs';
import {emptyWorkspace,demoContent} from '../lib/commerce/workspace.mjs';
import {publicCompanion,publicPulls} from '../lib/commerce/public-state.mjs';
import {pullWidget} from '../public/overlay-widgets.js';

test('public companion and pull fields are explicit allowlists',()=>{
 const companion=publicCompanion({name:'Munny',message:'Hello',instructions:'private',visionMode:'cloud',futureSecret:'hidden'});
 assert.deepEqual(companion,{name:'Munny',message:'Hello'});
 const pulls=publicPulls([{id:'p',name:'Card',number:'1',setName:'Set',rarity:'Rare',at:'now',buyer:'private',price:{price:100}}]);
 assert.equal(JSON.stringify(pulls).includes('private'),false);assert.equal(pulls[0].price,undefined);
 assert.match(pullWidget([{name:'<script>',number:'1',setName:'Set'}]),/&lt;script&gt;/);
});

test('live workspace starts offline and practice stock cannot enter live sales',()=>{
 const e=new Engine(emptyWorkspace());assert.equal(e.state.companion.provider,'offline');
 demoContent(e,true);assert.ok(e.state.products.every(p=>p.practiceOnly));
 assert.throws(()=>e.setMode('live'),/practice/i);
 e.state.mode='live';assert.throws(()=>e.start({productId:'p1'}),/Practice/);
 e.register({id:'buyer',login:'buyer'});assert.throws(()=>e.buyNow({productId:'p4',userId:'buyer',username:'buyer',requestId:'one'}),/Practice/);
 e.state.mode='demo';demoContent(e,false);assert.equal(e.state.mode,'live');assert.equal(e.state.products.length,0);assert.equal(e.state.companion.provider,'offline');
});
