// One owner for initial reads, SSE versions and credential recovery. All mutable
// application state crosses explicit accessors; no captured state snapshot.
export function createLiveConnection({surface,api,getAdminToken,applyBootstrap,applySnapshot,setConnected,render,captureDraft,restoreDraft,notify,createSource=url=>new EventSource(url)}) {
 let source=null,closed=false,generation=0;
 function connect(){
  if(closed)return;
  let messageVersion=0,recovering=false;
  const events=createSource('/api/events'+(getAdminToken()?'?admin='+encodeURIComponent(getAdminToken()):''));
  source=events;
  const current=()=>!closed&&source===events;
  events.onmessage=async event=>{
   const version=++messageVersion,draft=captureDraft();
   try{
    const state=JSON.parse(event.data),viewer=surface==='shop'?await api('/api/viewer'):null;
    if(!current()||version!==messageVersion||events.readyState!==1)return;
    applySnapshot(state,viewer);setConnected(true);
   }catch{if(current()&&version===messageVersion)setConnected(false);return;}
   render();restoreDraft(draft);
  };
  events.onerror=async()=>{
   if(!current())return;
   messageVersion++;setConnected(false);
   if(recovering)return;
   recovering=true;
   try{
    if(getAdminToken()){
     const fresh=await api('/api/bootstrap');
     if(!current())return;
     if(fresh.admin!==getAdminToken()){
      events.close();applyBootstrap(fresh);render();connect();return;
     }
    }
   }catch{}
   if(current())notify('Connection interrupted. Reconnecting…');
   recovering=false;
  };
 }
 async function start(){
  source?.close();source=null;closed=false;
  const attempt=++generation;
  const current=()=>!closed&&generation===attempt;
  if(surface==='workspace'){
   const bootstrap=await api('/api/bootstrap');if(!current())return;applyBootstrap(bootstrap);
  }else{
   const state=await api('/api/state'),viewer=surface==='shop'?await api('/api/viewer'):null;
   if(!current())return;applySnapshot(state,viewer);
  }
  if(!current())return;render();connect();
 }
 return {start,close(){closed=true;generation++;source?.close();source=null;}};
}
