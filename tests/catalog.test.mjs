import test from 'node:test';
import assert from 'node:assert/strict';
import {Catalog,catalogImage} from '../lib/catalog.mjs';
import {Engine,seed} from '../lib/engine.mjs';
test('catalog searches all games, pages results and selects only canonical identities',async()=>{
 let path;
 const card={id:'card-1',name:'Pikachu',number:'173',setName:'151',gameId:'pokemon',imageUrl:'https://images.example/card.png'};
 const c=new Catalog({get:async p=>{path=p;return {items:[card],total:100};},detail:async()=>({card})});
 await c.search({query:'Pikachu & friends',offset:24});
 assert.ok(!path.includes('game='));assert.match(path,/offset=24/);assert.match(path,/q=Pikachu/);
 await assert.rejects(c.select('invented'),/Search/);
 await c.select('card-1');const engine=new Engine(seed());
 assert.throws(()=>c.add(engine,{id:'card-1',price:'',quantity:1,condition:"Raw"}),/price/i);
 const p=c.add(engine,{id:'card-1',price:'5.00',quantity:2,condition:'Light play'});
 assert.equal(p.price,500);assert.equal(p.listed,false);assert.equal(p.image,card.imageUrl);assert.equal(p.metadata.id,card.id);
 await c.search({game:'pokemon'});assert.equal(c.state.selected,null);assert.match(path,/game=pokemon/);
});
test('catalog never substitutes fake results on upstream failure; unsafe images are rejected',async()=>{
 const c=new Catalog({get:async()=>{throw Error('Metadata unavailable');}});
 await assert.rejects(c.search({query:'Pikachu'}),/unavailable/);assert.deepEqual(c.state.items,[]);assert.match(c.state.error,/unavailable/);
 assert.equal(catalogImage('javascript:alert(1)'),null);assert.equal(catalogImage('http://example.com/x'),null);assert.equal(catalogImage('https://user:secret@example.com/x'),null);
});
test('latest search wins when responses arrive out of order',async()=>{
 let resolveOld;
 const old=new Promise(resolve=>{resolveOld=resolve;});
 const c=new Catalog({get:path=>path.includes('q=old')?old:Promise.resolve({items:[{id:'new',name:'New'}],total:1})});
 const first=c.search({query:'old'});
 await c.search({query:'new'});
 resolveOld({items:[{id:'old',name:'Old'}],total:1});await first;
 assert.equal(c.state.query,'new');assert.equal(c.state.items[0].id,'new');
});
test('a successful add consumes the reviewed selection and cannot duplicate on retry',async()=>{
 const card={id:'a',name:'A'};const c=new Catalog({get:async()=>({items:[card],total:1}),detail:async()=>({card})});
 await c.search();await c.select('a');const engine=new Engine(seed());
 const input={id:'a',price:'1',quantity:1,condition:'Raw'};
 c.add(engine,input);assert.throws(()=>c.add(engine,input),/Select and review/);
 assert.equal(engine.state.products.filter(p=>p.metadata?.id==='a').length,1);
});
