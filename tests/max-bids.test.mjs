import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine,seed} from '../lib/engine.mjs';
import {ownMaximum,resolveMaximums} from '../lib/max-bids.mjs';
import {createProjections} from '../lib/http/projections.mjs';
function fixture({antiSnipe=true,live=false}={}){
 let now=100000,request=0;const state=seed();state.products[0].price=500;state.products[0].practiceOnly=false;if(live)state.mode='live';
 const engine=new Engine(state,{now:()=>now});for(const id of ['a','b','c'])engine.register({id,login:id});engine.start({productId:'p1',duration:60,increment:'1',antiSnipe});
 const max=(id,amount,extra={})=>engine.maximumBid({auctionId:engine.state.auction.id,requestId:'r'+(++request),userId:id,username:id,source:live?'twitch':'demo',amount,...extra});
 const direct=(id,amount,extra={})=>engine.bid({userId:id,username:id,amount,source:live?'twitch':'demo',messageId:'d'+(++request),...extra});
 return {engine,max,direct,advance:ms=>now+=ms};
}
test('private ceilings charge the minimum, collapse same identity and never self-raise public price',()=>{
 const f=fixture();f.max('a','20');assert.equal(f.engine.state.auction.highest.amount,500);assert.equal(f.engine.state.bids.length,1);
 f.max('a','30');assert.equal(f.engine.state.auction.highest.amount,500);assert.equal(f.engine.state.bids.length,1);
 f.max('b','10');assert.equal(f.engine.state.auction.highest.userId,'a');assert.equal(f.engine.state.auction.highest.amount,1100);
 f.max('c','25');assert.equal(f.engine.state.auction.highest.amount,2600);
 f.max('b','35');assert.equal(f.engine.state.auction.highest.userId,'b');assert.equal(f.engine.state.auction.highest.amount,3100);
 assert.equal(ownMaximum(f.engine.state,{id:'a',kind:'demo'}).status,'outbid');
});
test('equal ceilings honor acceptance of current ceiling, including raises',()=>{
 const f=fixture();f.max('a','10');f.max('b','10');assert.equal(f.engine.state.auction.highest.userId,'a');assert.equal(f.engine.state.auction.highest.amount,1000);
 const g=fixture();g.max('a','10');g.max('b','20');g.max('a','20');assert.equal(g.engine.state.auction.highest.userId,'b');assert.equal(g.engine.state.auction.highest.amount,2000);
});
test('direct exact offers compete atomically with ceilings and cannot bid against themselves',()=>{
 const f=fixture();f.max('a','10');f.direct('b','8');assert.equal(f.engine.state.auction.highest.userId,'a');assert.equal(f.engine.state.auction.highest.amount,900);
 f.direct('b','10');assert.equal(f.engine.state.auction.highest.userId,'a');assert.equal(f.engine.state.auction.highest.amount,1000);
 f.direct('c','12');assert.equal(f.engine.state.auction.highest.userId,'c');assert.equal(f.engine.state.auction.highest.amount,1200);
 assert.throws(()=>f.direct('c','13'),/already/);
 f.max('c','30');assert.equal(f.engine.state.auction.highest.amount,1200);
 f.max('b','20');assert.equal(f.engine.state.auction.highest.amount,2100);
 const g=fixture();g.direct('a','8');g.max('a','20');assert.equal(g.engine.state.auction.highest.amount,800);g.max('b','10');assert.equal(g.engine.state.auction.highest.amount,1100);
});
test('fixed-cent resolver respects nondivisible prices, ties and maximum bounds',()=>{
 assert.equal(resolveMaximums([{userId:'a',maxCents:1001,maxSequence:1},{userId:'b',maxCents:999,maxSequence:2}],{opening:1,increment:7}).amount,1001);
 assert.equal(resolveMaximums([{userId:'a',directAmount:1000,directSequence:1},{userId:'b',maxCents:1000,maxSequence:2}],{opening:1,increment:100}).userId,'a');
 const f=fixture();for(const value of ['0','-1','1.001','1e3','1000001'])assert.throws(()=>f.max('a',value));
 f.max('a','1000000');assert.equal(f.engine.state.auction.highest.amount,500);
});
test('request replay is idempotent, conflicts reject, minimum and raise-only enforced',()=>{
 const f=fixture();const request={requestId:'same'};const first=f.max('a','20',request),count=f.engine.state.bids.length;
 assert.deepEqual(f.max('a','20',request),first);assert.equal(f.engine.state.bids.length,count);
 assert.throws(()=>f.max('a','21',request),/different/);assert.throws(()=>f.max('a','19'),/raised/);assert.throws(()=>f.max('b','5'),/at least/);
 assert.throws(()=>f.max('b','30',{auctionId:'stale'}),/changed/);
 f.engine.state.privateBids.requests=Array.from({length:2000},(_,i)=>({userId:'c',requestId:'old'+i}));assert.throws(()=>f.max('b','30'),/capacity/);
});
test('deadline, pause, cancel, restart and moderation preserve authority',()=>{
 const f=fixture();f.max('a','20');f.advance(55000);f.max('a','30');assert.equal(f.engine.state.auction.endsAt,160000);
 f.max('b','10');assert.equal(f.engine.state.auction.endsAt,165000);f.engine.pause();assert.throws(()=>f.max('c','40'),/no live/);assert.throws(()=>f.engine.voidBid(),/Cancel/);
 const restarted=new Engine(JSON.parse(JSON.stringify(f.engine.state)));assert.equal(restarted.state.privateBids.offers[0].maxCents,3000);
 f.engine.resume();f.advance(10000);assert.throws(()=>f.max('c','40'),/no live/);assert.equal(f.engine.state.orders[0].amount,1100);assert.equal(f.engine.state.orders[0].buyer,'a');
 assert.equal(JSON.stringify(f.engine.state.history).includes('maxCents'),false);
 const g=fixture({antiSnipe:false});g.max('a','20');g.advance(59000);g.max('b','10');assert.equal(g.engine.state.auction.endsAt,160000);g.engine.finish(true);assert.throws(()=>g.max('c','40'),/no live/);g.engine.start({productId:'p1'});assert.equal(g.engine.state.privateBids,undefined);
});
test('blocked and unregistered identities cannot set or influence new ceilings',()=>{
 const f=fixture({live:true});assert.throws(()=>f.max('a','20',{source:'demo'}),/Verified/);assert.throws(()=>f.max('unknown','20'),/Register/);
 f.max('a','30');f.max('b','20');f.engine.block('b',true);assert.throws(()=>f.max('b','40'),/disabled/);f.max('c','25');assert.equal(f.engine.state.auction.highest.amount,2600);
 assert.throws(()=>f.engine.block('a',true),/cancel/);
});
test('private ceiling namespace excluded from public and creator snapshots, own response only',()=>{
 const f=fixture();f.max('a','1234.56');
 const project=createProjections({engine:f.engine,payments:{status:{}},twitch:{status:{}},nft:{status:()=>({})},storage:{status:()=>({}),auditPage:()=>({events:[]})},rip:{snapshot:()=>({})},catalog:{state:{}},metadata:{},companion:{}});
 for(const role of ['public','viewer','overlay','admin']){const text=JSON.stringify(project(role));assert.equal(text.includes('maxCents'),false);assert.equal(text.includes('privateBids'),false);assert.equal(text.includes('123456'),false);}
 assert.equal(ownMaximum(f.engine.state,{id:'b',kind:'demo'}),null);assert.equal(ownMaximum(f.engine.state,{id:'a',kind:'twitch'}),null);assert.equal(ownMaximum(f.engine.state,{id:'a',kind:'demo'}).maxCents,123456);
 assert.equal(JSON.stringify(f.engine.state.activity).includes('1234'),false);assert.equal(f.engine.state.companion.message.includes('1234'),false);
});

test('leader ceiling raise after tied willingness never self-raises price or extends clock',()=>{
 for(const direct of [false,true]){const f=fixture();f.max('a','10');if(direct)f.direct('b','10');else f.max('b','10');assert.equal(f.engine.state.auction.highest.amount,1000);const bids=f.engine.state.auction.bidCount;f.advance(55000);f.max('a','20');assert.equal(f.engine.state.auction.highest.amount,1000);assert.equal(f.engine.state.auction.bidCount,bids);assert.equal(f.engine.state.auction.endsAt,160000);}
});
test('direct message dedupe survives public bid history trimming',()=>{
 const f=fixture();f.max('a','20');f.direct('b','10',{messageId:'direct-once'});f.engine.state.bids=[];const seq=f.engine.state.privateBids.sequence;assert.deepEqual(f.direct('b','10',{messageId:'direct-once'}),{duplicate:true});assert.equal(f.engine.state.privateBids.sequence,seq);
});
