export function catalogImage(value) {
  try {const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password ? url.href : null;}catch{return null;}
}
export class Catalog {
  constructor(metadata){this.revision=0;this.metadata=metadata;this.state={items:[],total:0,offset:0,query:'',game:'',selected:null,error:''};}
  async search({query='',game='',offset=0}={}) {
    const revision=++this.revision;
    this.state.selected=null;this.state.error='';
    const q=String(query).trim().slice(0,160), g=String(game).slice(0,80), start=Math.max(0,Math.min(1000000,Number(offset)||0));
    this.state={...this.state,query:q,game:g,offset:start,total:0,items:[]};
    try {
      const data=await this.metadata.get('/v1/tcg/cards?'+new URLSearchParams({q,limit:'24',offset:String(Math.floor(start)),...(g?{game:g}:{})}));
      if(revision!==this.revision)return this.state;
      this.state={...this.state,query:q,game:g,offset:start,total:Number(data.total)||0,items:(data.items || []).slice(0,24).map(c=>({id:c.id,name:c.name,number:c.number || '',setName:c.setName || '',gameId:c.gameId,rarity:c.rarity || '',image:catalogImage(c.imageUrl || c.imageSmallUrl)}))};
    } catch(e){if(revision!==this.revision)return this.state;this.state.items=[];this.state.error=e.message;throw e;}
    return this.state;
  }
  async select(id){
    if(!this.state.items.some(c=>c.id===id))throw Error('Search the catalog before choosing a card.');
    const revision=++this.revision;this.state.selected=null;
    const detail=await this.metadata.detail(id),c=detail.card;
    if(revision!==this.revision)throw Error('Selection changed. Choose the card again.');
    if(!c?.id || c.id!==id)throw Error('Metadata returned a different card.');
    this.state.selected={id:c.id,name:c.name,number:c.number || '',setName:c.setName || detail.set?.name || '',gameId:c.gameId,rarity:c.rarity || '',image:catalogImage(c.imageUrl || c.imageSmallUrl)};
    return this.state.selected;
  }
  add(engine,input){
    const selected=this.state.selected;
    if(!selected || selected.id!==input.id)throw Error('Select and review the Metadata card first.');
    if(typeof input.condition!=="string" || !input.condition.trim())throw Error("Enter the actual item condition.");
    const product=engine.addProduct({title:`${selected.name}${selected.number?' #'+selected.number:''}`,description:`${selected.setName}. ${selected.rarity}. Catalog identity from Metadata. Seller supplied price and condition; catalog image is a reference.`,category:`${selected.gameId || 'TCG'} / singles`,art:'card',price:input.price,quantity:input.quantity,condition:input.condition,listed:false});
    product.metadata={id:selected.id,gameId:selected.gameId,setName:selected.setName,number:selected.number};
    if(selected.image)product.image=selected.image;
    this.state.selected=null;
    engine.commit();return product;
  }
}
