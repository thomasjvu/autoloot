import {randomUUID} from 'node:crypto';
import {rawQuotes,hostPull} from './rip.mjs';
export class RipSession {
 constructor(engine,metadata,vision){this.engine=engine;this.metadata=metadata;this.vision=vision;this.revision=0;this.busy=false;this.state={observation:null,candidates:[],selected:null,error:''};}
 snapshot(){return {...this.state,revision:this.revision,pulls:this.engine.state.pulls||[],source:this.metadata.base,vision:this.vision.status(this.engine.state.companion)};}
 clear(){this.revision++;this.state={observation:null,candidates:[],selected:null,error:''};}
 async scan(image){
  if(this.busy)throw Error('A reveal is already being read.');
  this.busy=true;const revision=++this.revision,mode=this.vision.mode(this.engine.state.companion),started=Date.now();
  this.state={observation:null,candidates:[],selected:null,error:''};
  try {
   const observation=await this.vision.observe(image,mode);
   if(revision!==this.revision)return;
   let candidates=[],error='';
   if(['card','pack'].includes(observation.kind))try{candidates=await this.metadata.search(observation);}catch(e){error=e.message;}
   if(revision===this.revision)this.state={observation,candidates,selected:null,error,elapsedMs:Date.now()-started,provider:mode};
  }finally{this.busy=false;}
 }
 async search(input){const revision=++this.revision;this.state={observation:null,candidates:[],selected:null,error:''};const candidates=await this.metadata.search({kind:input.kind==='pack'?'pack':'card',name:String(input.query||'').slice(0,160)});if(revision===this.revision)this.state.candidates=candidates;}
 async select(id){
  const candidate=this.state.candidates.find(c=>c.id===id);if(!candidate)throw Error('Search for the card first.');
  if(this.state.observation?.kind==='pack'&&!candidate.number)throw Error('Show a single card to log a pull.');
  const revision=++this.revision;this.state.selected=null;
  const detail=await this.metadata.detail(id);
  if(revision!==this.revision)throw Error('Reveal changed. Choose the card again.');
  if(detail.card?.id!==id)throw Error('Catalog returned a different card.');
  this.state.selected={...candidate,selectionId:randomUUID(),rarity:detail.card.rarity||'',variants:rawQuotes(detail)};
 }
 confirm({selectionId,variant}){
  const selected=this.state.selected;if(!selected||selectionId!==selected.selectionId)throw Error('Reveal changed. Review and select the card again.');
  const price=variant?selected.variants.find(v=>v.key===variant):null;if(variant&&!price)throw Error('Choose an available variant.');
  const pull={id:randomUUID(),name:selected.name,number:selected.number,setName:selected.setName,rarity:selected.rarity,metadataId:selected.id,price,at:new Date(this.engine.now()).toISOString()};
  this.engine.state.pulls||=[];this.engine.state.pulls.unshift(pull);
  this.engine.say(hostPull(pull),'happy');this.engine.commit();this.clear();return pull;
 }
}
