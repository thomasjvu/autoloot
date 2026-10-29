// Public display updates never wait for private order reads. One coalesced worker
// refreshes buyer state when the opaque commerce revision changes or after reconnect.
export function createLiveConnection({surface,api,getAdminToken,getViewer,applyBootstrap,applySnapshot,setConnected,render,captureDraft,restoreDraft,notify,createSource=url=>new EventSource(url),now=()=>Date.now(),viewerRefreshMs=30000}) {
 let source=null,closed=false,generation=0,cachedViewer=null,viewerRevision,lastViewerRead=0,renderedSignature,renderedViewer;
 const displaySignature=state=>{const {serverTime,viewerRevision:revision,...display}=state;return JSON.stringify(display);};
 function connect(){
  if(closed)return;
  let recovering=false,epoch=0,latestState=null,refreshPromise=null,forceViewer=false;
  const events=createSource('/api/events'+(getAdminToken()?'?admin='+encodeURIComponent(getAdminToken()):''));
  source=events;
  const current=()=>!closed&&source===events;
  const display=()=>{
   if(!current()||events.readyState!==1||!latestState)return;
   const signature=surface==='shop'?displaySignature(latestState):null;
   applySnapshot(latestState,surface==='shop'?cachedViewer:null);setConnected(true);
   if(surface==='shop'&&signature===renderedSignature&&cachedViewer===renderedViewer)return;
   const draft=captureDraft();render();restoreDraft(draft);renderedSignature=signature;renderedViewer=cachedViewer;
  };
  const refreshViewer=()=>{
   if(refreshPromise)return refreshPromise;
   refreshPromise=(async()=>{
    while(current()&&events.readyState===1&&latestState&&(forceViewer||latestState.viewerRevision!==viewerRevision||now()-lastViewerRead>=viewerRefreshMs)){
     const revision=latestState.viewerRevision,attempt=epoch,viewerBefore=cachedViewer;forceViewer=false;
     try{
      const viewer=await api('/api/viewer');
      if(!current()||events.readyState!==1)return;
      if(attempt!==epoch)continue;
      if(getViewer&&getViewer()!==viewerBefore){cachedViewer=getViewer();forceViewer=true;continue;}
      cachedViewer=viewer;viewerRevision=revision;lastViewerRead=now();display();
     }catch{if(current()&&attempt===epoch){forceViewer=true;setConnected(false);}return;}
    }
   })().finally(()=>{refreshPromise=null;});
   return refreshPromise;
  };
  events.onmessage=async event=>{
   if(!current()||events.readyState!==1)return;
   try{latestState=JSON.parse(event.data);}catch{setConnected(false);return;}
   if(surface==='shop'&&getViewer)cachedViewer=getViewer();
   display();
   if(surface==='shop')await refreshViewer();
  };
  events.onerror=async()=>{
   if(!current())return;
   epoch++;forceViewer=true;setConnected(false);
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
   if(!current())return;cachedViewer=viewer;viewerRevision=state.viewerRevision;lastViewerRead=now();renderedSignature=displaySignature(state);renderedViewer=viewer;applySnapshot(state,viewer);
  }
  if(!current())return;render();connect();
 }
 return {start,close(){closed=true;generation++;source?.close();source=null;}};
}
