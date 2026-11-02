import test from 'node:test';
import assert from 'node:assert/strict';
import {captureDraftFocus,restoreDraftFocus} from '../public/lifecycle/focus.js';
import {giveawaysPage,wireGiveaways} from '../public/giveaways.js';
const field=(name,value='',tagName='INPUT',type='text')=>({name,value,tagName,type,checked:false,id:'',selectionStart:0,selectionEnd:0,selectionDirection:'forward',closest:()=>null,focus(){this.focused=true;},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}});
function form(key,fields){const f={dataset:{draftKey:key},elements:fields,buttons:[{disabled:false}],contains:x=>fields.includes(x),querySelectorAll:()=>f.buttons,addEventListener(name,fn){f[name]=fn;},reset(){for(const x of fields){x.value='';x.checked=false;}}};for(const x of fields)x.form=f;return f;}
function dom(forms,focused,surface='giveaways:demo',standalone=[]){const app={dataset:{draftSurface:surface},querySelectorAll:()=>forms,contains:x=>standalone.includes(x)||forms.some(f=>f.contains(x))};return {activeElement:focused,getElementById:id=>id==='app'?app:standalone.find(x=>x.id===id),querySelector:()=>null,app};}
const restore=(document,draft)=>restoreDraftFocus(document,draft,{quickOpen:false});
test('complete giveaway drafts survive same-entity updates including textarea caret and selections',()=>{
 const fields=[field('title','Prize'),field('rules','US only','TEXTAREA','textarea'),field('duration','60','SELECT','select-one'),field('claimDays','3','SELECT','select-one')];
 for(const f of fields.filter(f=>f.tagName==='SELECT'))f.options=['1','3','7','14','60','300'].map(value=>({value,selected:value===f.value}));
 fields[1].selectionStart=2;fields[1].selectionEnd=5;const captured=captureDraftFocus(dom([form('new:g1',fields)],fields[1]));
 const next=fields.map(f=>({...f,value:'',focused:false,options:f.options?.map(o=>({...o,selected:false}))})),document=dom([form('new:g1',next)],null);restore(document,captured);
 assert.deepEqual(next.slice(0,2).map(x=>x.value),['Prize','US only']);assert.equal(next[2].options.find(x=>x.value==='60').selected,true);assert.equal(next[3].options.find(x=>x.value==='3').selected,true);assert.equal(next[1].focused,true);assert.equal(next[1].selectionStart,2);assert.equal(next[1].selectionEnd,5);
});
test('same-name prize tracking and consent remain with exact prize and changed identities receive none',()=>{
 const a=[field('tracking','FIRST'),field('confirmed','on','INPUT','checkbox')],b=[field('tracking','SECOND'),field('confirmed','on','INPUT','checkbox')];b[1].checked=true;
 const captured=captureDraftFocus(dom([form('prize:a',a),form('prize:b',b)],b[0]));
 const nextA=[field('tracking'),field('confirmed','on','INPUT','checkbox')],nextB=[field('tracking'),field('confirmed','on','INPUT','checkbox')];
 restore(dom([form('prize:b',nextB),form('prize:a',nextA)],null),captured);assert.equal(nextA[0].value,'FIRST');assert.equal(nextB[0].value,'SECOND');assert.equal(nextA[1].checked,false);assert.equal(nextB[1].checked,true);assert.equal(nextB[0].focused,true);
 const changed=[field('tracking'),field('confirmed','on','INPUT','checkbox')];restore(dom([form('prize:c',changed)],null),captured);assert.equal(changed[0].value,'');restore(dom([form('prize:b',changed)],null,'giveaways:live'),captured);assert.equal(changed[0].value,'');restore(dom([],null),captured);
});
test('credentials, hidden fields, modal and maximum forms are excluded; standalone search uses its ID',()=>{
 const inputs=[field('password','private','INPUT','password'),field('file','private','INPUT','file'),field('id','private','INPUT','hidden'),field('apiKey','private'),field('title','safe')],search=field('query','search');search.id='search';
 const d=dom([form('safe',inputs)],search,'inventory:demo',[search]);const saved=captureDraftFocus(d);assert.equal(saved.forms[0].fields.length,1);assert.equal(JSON.stringify(saved).includes('private'),false);
 const nextSearch=field('query');nextSearch.id='search';restore(dom([],null,'inventory:demo',[nextSearch]),saved);assert.equal(nextSearch.value,'search');assert.equal(nextSearch.focused,true);
 const unrelated=field('query');unrelated.id='different';restore(dom([],null,'inventory:demo',[unrelated]),saved);assert.equal(unrelated.value,'');
});
test('giveaway markup keys drafts to mode, generation, prize identity and recipient revision',()=>{
 const g=id=>({id,title:'Prize',mode:'demo',status:'drawn',winnerUserId:'u',winner:'winner',claimDeadline:999,claim:{status:'submitted',submittedAt:1,updatedAt:2},draws:[]});
 const html=giveawaysPage({features:{giveaways:true},mode:'demo',twitch:{},giveaway:g('a'),giveawayHistory:[g('b')]});assert.match(html,/data-draft-key="[^"<>]+"/);assert.match(html,/data-prize-dispatch="a" data-draft-key=/);assert.match(html,/data-prize-dispatch="b" data-draft-key=/);assert.ok(html.includes('&quot;new-giveaway&quot;'));
});
test('pending submission stays disabled across rerender, rejects duplicates and recovers after success or failure',async()=>{
 const oldDocument=globalThis.document,oldFormData=globalThis.FormData;
 try{
  globalThis.FormData=class{constructor(f){this.fields=f.elements.map(x=>[x.name,x.value]);}*[Symbol.iterator](){yield* this.fields;}get(name){return this.fields.find(x=>x[0]===name)?.[1];}has(name){return this.fields.some(x=>x[0]===name);}};
  for(const reject of [false,true]){
   let current=form('new:pending'+reject,[field('title','Draft')]),resolve,calls=0,refreshes=0;
   globalThis.document={querySelector:s=>s==='#giveaway-form'?current:null,getElementById:id=>id==='giveaway-form'?current:null,querySelectorAll:s=>s==='form[data-draft-key]'?[current]:[]};
   const options={api:()=>{calls++;return new Promise((yes,no)=>{resolve=()=>reject?no(Error('failed')):yes({});});},refresh:async()=>{refreshes++;},toast:()=>{}};
   wireGiveaways(options);const first=current.submit({preventDefault(){},currentTarget:current});assert.equal(current.buttons[0].disabled,true);
   const recreated=form(current.dataset.draftKey,[field('title','Draft')]);current=recreated;wireGiveaways(options);assert.equal(current.buttons[0].disabled,true);await current.submit({preventDefault(){},currentTarget:current});assert.equal(calls,1);
   resolve();await first;await new Promise(r=>setImmediate(r));assert.equal(current.buttons[0].disabled,false);assert.equal(current.elements[0].value,reject?'Draft':'');assert.equal(refreshes,reject?0:1);
  }
 }finally{globalThis.document=oldDocument;globalThis.FormData=oldFormData;}
});
test('Munny focus remains explicit and unsupported duplicate draft identities fail closed',()=>{
 const quick=field('prompt','message');quick.id='quick';quick.selectionStart=1;quick.selectionEnd=3;quick.closest=()=>({});quick.matches=()=>true;
 const document=dom([],quick);document.querySelector=()=>quick;const saved=captureDraftFocus(document),next=field('prompt');
 const target=dom([],null);target.querySelector=()=>next;restoreDraftFocus(target,saved,{quickOpen:true});assert.equal(next.focused,true);assert.equal(next.selectionStart,1);assert.equal(next.selectionEnd,3);
 const input=field('title','source'),capture=captureDraftFocus(dom([form('duplicate',[input])],input)),a=field('title'),b=field('title');restore(dom([form('duplicate',[a]),form('duplicate',[b])],null),capture);assert.equal(a.value,'');assert.equal(b.value,'');
});
test('focused Rip search survives updates only inside the same stable form and surface',()=>{
 const search=field('query','Pikachu');search.id='rip-card-query';search.form={id:'rip-search',dataset:{}};
 const saved=captureDraftFocus(dom([],search,'rip:demo',[search]));
 const next=field('query');next.id='rip-card-query';next.form={id:'rip-search',dataset:{}};restore(dom([],null,'rip:demo',[next]),saved);assert.equal(next.value,'Pikachu');assert.equal(next.focused,true);
 for(const change of [()=>{next.form.id='different-form';},()=>{next.form=null;}]){next.value='';change();restore(dom([],null,'rip:demo',[next]),saved);assert.equal(next.value,'');}
 next.form={id:'rip-search',dataset:{}};restore(dom([],null,'inventory:demo',[next]),saved);assert.equal(next.value,'');
 const maximum=field('amount','100');maximum.id='ceiling';maximum.form={id:'maximum-bid-form',dataset:{}};assert.equal(captureDraftFocus(dom([],maximum,'shop:demo',[maximum])).standalone,null);
});
test('catalog query keeps a stable control ID and restores only in its search form',async()=>{
 const {catalogPage}=await import('../public/catalog.js');
 assert.match(catalogPage({catalog:{items:[]}}),/<input id="catalog-query" name="query"/);
 const query=field('query','Black Lotus');query.id='catalog-query';query.form={id:'catalog-search',dataset:{}};
 const saved=captureDraftFocus(dom([],query,'inventory:demo',[query])),next=field('query');next.id='catalog-query';next.form={id:'catalog-search',dataset:{}};
 restore(dom([],null,'inventory:demo',[next]),saved);assert.equal(next.value,'Black Lotus');assert.equal(next.focused,true);
 next.value='';next.form.id='catalog-add';restore(dom([],null,'inventory:demo',[next]),saved);assert.equal(next.value,'');
});
