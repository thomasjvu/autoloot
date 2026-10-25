import test from 'node:test';
import assert from 'node:assert/strict';
import {dropPhase,dropLineup,DropEvents,dropHero,lineupMarkup} from '../public/drop-shop.js';
const auction={id:'a1',productId:'p1',product:{id:'p1',title:'Card',price:500,condition:'Used'},status:'live',endsAt:60000,duration:60,bidCount:0,antiSnipe:true,highest:null};
const state=(a=auction,bids=[])=>({auction:structuredClone(a),bids,products:[{id:'p1',quantity:1},{id:'p2',quantity:0},{id:'p3',quantity:2}],mode:'demo'});
test('drop clock uses authoritative deadline, ceil seconds, final call and server-confirmed result',()=>{
 assert.deepEqual(dropPhase(auction,0),{key:'live',label:'Bidding closes in',time:'01:00',seconds:60,progress:1});
 assert.equal(dropPhase(auction,50001).time,'00:10');assert.equal(dropPhase(auction,50001).key,'final');
 assert.equal(dropPhase(auction,60000).key,'closing');assert.equal(dropPhase(auction,61000).time,'00:00');assert.notEqual(dropPhase(auction,61000).key,'sold');
 assert.equal(dropPhase({...auction,status:'sold'},61000).time,'SOLD');
});
test('pause holds, disconnect hides stale urgency, extensions use the revised deadline',()=>{
 const paused={...auction,status:'paused',remaining:12345};assert.equal(dropPhase(paused,999999).time,'00:13');assert.equal(dropPhase(paused,999999).key,'paused');
 assert.equal(dropPhase(auction,59000,false).key,'offline');assert.equal(dropPhase(auction,59000,false).time,'—:—');
 assert.equal(dropPhase({...auction,endsAt:69000},59000).time,'00:10');assert.equal(dropPhase({...auction,endsAt:69000},59000).progress,1/6);
 assert.equal(dropPhase(null,0).time,'UP NEXT');
});
test('lineup includes only available noncurrent products and caps visible previews',()=>{
 assert.deepEqual(dropLineup(state()).map(p=>p.id),['p3']);
 const s=state(null);s.products=Array.from({length:20},(_,i)=>({id:i,quantity:1}));assert.equal(dropLineup(s).length,6);
});
test('event reactions deduplicate snapshots and do not replay initial or reconnect history',()=>{
 const events=new DropEvents(),s=state();assert.equal(events.observe(s),null);assert.equal(events.observe(s),null);
 s.auction.highest={username:'viewer',amount:600};s.auction.bidCount=1;s.bids=[{id:'bid1'}];s.auction.endsAt=65000;
 let event=events.observe(s);assert.equal(event.type,'bid');assert.match(event.text,/reset to 10 seconds/);assert.equal(events.observe(s),null);
 s.auction.status='sold';assert.equal(events.observe(s).type,'sold');assert.equal(events.observe(s),null);
 events.observe(s,false);assert.equal(events.observe(s),null);
 s.auction={...auction,id:'a2'};assert.equal(events.observe(s).type,'open');
});
test('waiting room reacts to first opening, while voided bids do not trigger new-bid reactions',()=>{
 const events=new DropEvents();events.observe(state(null));const s=state();assert.equal(events.observe(s).type,'open');
 s.bids=[{id:'b',voided:true}];assert.equal(events.observe(s),null);
 s.auction.status='paused';assert.equal(events.observe(s).type,'paused');s.auction.status='live';assert.equal(events.observe(s).type,'open');
});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers={esc,usd:v=>'$'+(v/100).toFixed(2),visual:()=>'<img alt="item">',assetDescription:()=>'',nextBid:a=>a.highest?a.highest.amount+100:a.product.price};
test('storefront markup escapes untrusted content, labels demo and disables bids when disconnected',()=>{
 const s=state();s.auction.product.title='<img onerror=evil>';s.bids=[{id:'bad',username:'<script>',amount:900,voided:true}];
 const html=dropHero({state:s,viewer:null,connected:false,now:0,...helpers});assert.ok(html.includes('&lt;img onerror=evil&gt;'));assert.ok(html.includes('Practice drop'));assert.match(html,/data-copy-bid=[^>]+disabled/);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('$9.00'));
 const queue=lineupMarkup({...s,products:[{id:'other',title:'<script>',condition:'Used',quantity:1,price:500}]},helpers);assert.ok(queue.includes('&lt;script&gt;'));
});
