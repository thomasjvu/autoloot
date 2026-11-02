import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../creative/video/munny-shop/stream/shop.html',import.meta.url),'utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/import .*?;\n/,'');
function harness(){
 const classes=new Set(),elements=new Map();let frames=0;const played=[];const pending=[];let now=0;
 const element=id=>{if(!elements.has(id))elements.set(id,{style:{},hidden:false,textContent:'',src:'',dataset:{}});return elements.get(id)};
 const classList={add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,v)=>v?classes.add(x):classes.delete(x)};
 const data={control:{revision:0,cueRevision:0,expression:'joyful',follow:true,at:Date.now(),text:'Old cue'},connected:true,companion:{eventId:'old',at:Date.now(),message:'Old event',enabled:true,overlayVoice:true}};
 const context=vm.createContext({URLSearchParams,location:{search:'?mode=live&sound=1'},document:{querySelector:element,body:{classList}},innerWidth:1920,innerHeight:1080,addEventListener(){},fetch:async()=>({ok:true,json:async()=>structuredClone(data)}),setTimeout(fn,ms){pending.push({fn,ms});return pending.length},clearTimeout(){},cancelAnimationFrame(){},requestAnimationFrame(){frames++;return frames},performance:{now:()=>now},createObjectUrl:()=> 'blob:vn-tts',URL:{revokeObjectURL(){}},Date,Intl,Audio:class{constructor(src){this.src=src}pause(){}play(){played.push(this.src);return Promise.resolve()}}});
 vm.runInContext(source,context);
 vm.runInContext('let lastText;const originalShow=show;show=(text,...args)=>{lastText=text;originalShow(text,...args)}',context);
 return {context,data,classes,element,played,advance:()=>{now+=1500;const tasks=pending.splice(0);for(const task of tasks)task.fn()},frames:()=>frames,poll:()=>vm.runInContext('pollLive()',context)};
}
test('shop follows new events without replaying history or reconnect events',async()=>{
 const h=harness();await h.poll();assert.equal(h.frames(),0);
 h.data.companion={...h.data.companion,eventId:'new',message:'A new bid!'};await h.poll();assert.equal(h.frames(),1);assert.ok(h.classes.has('has-dialogue'));
 h.data.connected=false;await h.poll();assert.ok(!h.classes.has('has-dialogue'));
 h.data.connected=true;h.data.companion.eventId='while-offline';await h.poll();assert.equal(h.frames(),1);
 h.data.companion.eventId='stale';h.data.companion.at=0;await h.poll();assert.equal(h.frames(),1);
});
test('expression cues keep dialogue intact and a clear cue stops it',async()=>{
 const h=harness();await h.poll();h.data.control={...h.data.control,revision:1,expression:'surprised'};await h.poll();assert.equal(h.frames(),0);assert.match(h.element('#munny').src,/munny-surprised-closed.svg/);
 h.data.control={...h.data.control,revision:2,cueRevision:1,text:'Hello!'};await h.poll();assert.equal(h.frames(),1);assert.ok(h.classes.has('has-dialogue'));
 h.data.control={...h.data.control,revision:3,expression:'thinking'};await h.poll();assert.equal(h.frames(),1);assert.ok(h.classes.has('has-dialogue'));
 h.data.control={...h.data.control,revision:4,cueRevision:2,text:''};await h.poll();assert.ok(!h.classes.has('has-dialogue'));
});

test('accepted bids and sale transitions sound once; new lots introduce the actual card',async()=>{
 const h=harness();h.data.auction={id:'one',title:'Charizard ex',price:4500,status:'live',bidCount:3};await h.poll();assert.equal(h.played.length,0);
 h.data.auction.bidCount=4;await h.poll();assert.match(h.played[0],/bid-kaching/);await h.poll();assert.equal(h.played.length,1);
 h.data.auction.status='sold';await h.poll();await h.poll();assert.equal(h.played.length,2);assert.match(h.played[1],/sale-finalized/);
 h.advance();h.data.auction={id:'two',title:'Mew ex',price:2500,status:'live',bidCount:0};await h.poll();assert.equal(h.frames(),1);assert.match(vm.runInContext('lastText',h.context),/Next up: Mew ex\. Opening at \$25\.00/);
 h.data.connected=false;await h.poll();h.data.connected=true;h.data.auction.bidCount=2;await h.poll();assert.equal(h.played.filter(x=>!x.startsWith('blob:')).length,2);
 h.data.auction.bidCount=1;await h.poll();assert.equal(h.played.filter(x=>!x.startsWith('blob:')).length,2);
});

test('bid dialogue waits until after the register cue before VN audio starts',async()=>{
 const h=harness();h.data.auction={id:'a',status:'live',bidCount:0};await h.poll();
 h.data.auction.bidCount=1;h.data.companion.eventId='bid1';h.data.companion.message='$50 from cardfan!';await h.poll();
 assert.match(h.played[0],/bid-kaching/);assert.equal(h.frames(),0);h.advance();assert.equal(h.frames(),1);assert.equal(h.played[1],'blob:vn-tts');
});
