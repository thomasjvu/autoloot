import {seed} from './engine.mjs';
export function emptyWorkspace(){
 const s=seed();s.products=[];s.mode='live';s.show={...s.show,title:'Your show',subtitle:'',category:'TCG'};
 s.companion.provider='offline';
 s.companion.message='Hi, I’m Munny. Add your first lot or connect Twitch to get started.';
 return s;
}
export function demoContent(engine,enabled){
 engine.assertModeChange(enabled?'demo':'live',{clearPractice:true});
 const s=engine.state;
 const samples=seed().products;
 // Explicit practice ownership, with exact seed identity for older workspaces.
 s.products=s.products.filter(p=>!p.practiceOnly && !samples.some(sample=>sample.id===p.id && sample.title===p.title));
 s.orders=s.orders.filter(o=>o.mode!=='demo');
 s.history=s.history.filter(a=>a.mode!=='demo');
 s.bids=s.bids.filter(b=>b.source!=='demo');s.chat=s.chat.filter(c=>c.source!=='demo');
 if(s.auction?.mode==='demo')s.auction=null;
 if(s.vote?.mode==='demo')s.vote=null;
 s.activity=s.activity.filter(a=>!/(demo|test-)/i.test(a.text));
 if(enabled){s.products.push(...seed().products.map(p=>({...p,practiceOnly:true})));s.mode='demo';s.companion.provider='demo';}
 else{s.mode='live';s.vote=null;if(s.companion.provider==='demo')s.companion.provider='offline';}
 s.companion.message=enabled?'Sample lots loaded. Practice mode is on; no real payments.':'Your workspace is ready. Add a lot to start your show.';
 engine.commit();
}
