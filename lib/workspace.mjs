import {seed} from './engine.mjs';
export function emptyWorkspace(){
 const s=seed();s.products=[];s.mode='live';s.show={...s.show,title:'Your show',subtitle:'',category:'TCG'};
 s.companion.message='Hi, I’m Munny. Add your first lot or connect Twitch to get started.';
 return s;
}
export function demoContent(engine,enabled){
 const s=engine.state;
 if(['live','paused'].includes(s.auction?.status))throw Error('Finish or cancel the current auction first.');
 const demoIds=new Set(['p1','p2','p3','p4']);
 // Seed IDs are reserved for sample inventory; user-created products use UUIDs.
 s.products=s.products.filter(p=>!demoIds.has(p.id));
 s.orders=s.orders.filter(o=>o.mode!=='demo');
 s.history=s.history.filter(a=>a.mode!=='demo');
 s.bids=s.bids.filter(b=>b.source!=='demo');s.chat=s.chat.filter(c=>c.source!=='demo');
 if(s.auction?.mode==='demo')s.auction=null;
 if(s.vote?.mode==='demo')s.vote=null;
 s.activity=s.activity.filter(a=>!/(demo|test-)/i.test(a.text));
 if(enabled){s.products.push(...seed().products);s.mode='demo';}
 else{s.mode='live';s.vote=null;}
 s.companion.message=enabled?'Sample lots loaded. Practice mode is on; no real payments.':'Your workspace is ready. Add a lot to start your show.';
 engine.commit();
}
