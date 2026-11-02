import test from 'node:test';
import assert from 'node:assert/strict';
import {Metadata,rawQuotes} from '../lib/integrations/rip.mjs';
import {Catalog} from '../lib/integrations/catalog.mjs';

test('bundled catalog searches, paginates and selects without provider or price calls',async()=>{
  const metadata=new Metadata({mode:'demo',key:'unused',fetcher:()=>{throw Error('Demo must not fetch');}});
  const catalog=new Catalog(metadata);
  const first=await catalog.search({game:'pokemon'});
  assert.ok(first.items.length>0);assert.ok(first.total>first.items.length);
  const id=first.items[0].id;
  const selected=await catalog.select(id);
  assert.equal(selected.id,id);assert.equal(selected.image,null);
  assert.deepEqual(rawQuotes(await metadata.detail(id)),[]);
  const next=await catalog.search({game:'pokemon',offset:24});
  assert.ok(next.items.length>0);assert.ok(!next.items.some(c=>c.id===id));
  const matches=await metadata.search({kind:'card',name:selected.name});
  assert.ok(matches.some(c=>c.id===id));
  assert.equal((await catalog.search({game:'mtg'})).total,0);
  await assert.rejects(metadata.detail('outside-snapshot'),/outside the bundled demo/);
});

test('auto selects demo without credentials and API with credentials',()=>{
  assert.equal(new Metadata({key:'',mode:'auto'}).mode,'demo');
  assert.equal(new Metadata({key:'private',mode:'auto'}).mode,'api');
  assert.throws(()=>new Metadata({mode:'invalid'}),/METADATA_MODE/);
});
