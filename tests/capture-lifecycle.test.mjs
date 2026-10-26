import test from 'node:test';
import assert from 'node:assert/strict';

test('Rip capture preserves crop through render and disposes media tracks when its controller exits',async()=>{
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{value:'0.65',classList:{add(){},remove(){}},append(){},addEventListener(){}});return elements.get(id);};
 let stopped=0;const video={muted:false,autoplay:false,playsInline:false,srcObject:null,play:async()=>{}};
 const handlers=new Map();
 globalThis.document={createElement:()=>video,querySelector:selector=>element(selector),querySelectorAll:()=>[]};
 globalThis.window={addEventListener:(event,fn)=>handlers.set(event,fn)};
 const track={stop:()=>{stopped++;}},stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>stream}}});
 const {ripPage,wireRip,disposeRip}=await import('../public/rip.js');
 const options={api:async()=>({}),token:'fixture',toast:message=>{throw Error(message);},state:{rip:{}},refresh:async()=>{}};
 wireRip(options);await element('#rip-camera').onclick();assert.equal(video.srcObject,stream);assert.equal(stopped,0);
 element('#rip-crop').value='0.4';element('#rip-crop').onchange({target:element('#rip-crop')});
 const rerender=ripPage({rip:{}});assert.match(rerender,/<option value="0.4" selected>/);
 wireRip(options);assert.equal(stopped,0,'live updates preserve the active track');
 disposeRip();assert.equal(video.srcObject,null);assert.equal(stopped,1,'section exit stops actual owned tracks');
 handlers.get('pagehide')();assert.equal(stopped,1,'disposal is idempotent');
});
