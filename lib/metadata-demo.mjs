import snapshot from '../data/metadata-demo/catalog.json' with {type:'json'};

// A deliberately bounded snapshot. No provider calls or price synthesis.
export class DemoMetadata {
  constructor(){
    this.data=snapshot;
  }
  async get(path){
    const url=new URL(path,'https://demo.invalid');
    const detail=url.pathname.match(/^\/v1\/tcg\/cards\/([^/]+)$/);
    if(detail){
      const card=this.data.cards.find(c=>c.id===decodeURIComponent(detail[1]));
      if(!card)throw Error('Card is outside the bundled demo catalog. Enable Metadata API access for the full catalog.');
      return structuredClone({card,set:this.data.sets.find(s=>s.id===card.setId) || null,quotes:null});
    }
    const kind=url.pathname==='/v1/tcg/cards'?'cards':url.pathname==='/v1/tcg/sets'?'sets':null;
    if(!kind)throw Error('Unsupported demo catalog request.');
    const q=(url.searchParams.get('q') || '').trim().toLowerCase(),game=url.searchParams.get('game');
    const rows=this.data[kind].filter(c=>(!game || c.gameId===game)&&(!q || [c.name,c.number,c.setName,c.code].filter(Boolean).join(' ').toLowerCase().includes(q)));
    const offset=Math.max(0,Number(url.searchParams.get('offset')) || 0),limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit')) || 24));
    return structuredClone({items:rows.slice(offset,offset+limit),total:rows.length});
  }
}
