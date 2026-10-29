import test from 'node:test';
import assert from 'node:assert/strict';
import {Metadata,rawQuotes,hostPull} from '../lib/rip.mjs';
test('Metadata requests use server credentials, encode query and cache results',async()=>{
 let calls=0;
 const api=new Metadata({base:'https://metadata.example',key:'private',fetcher:async(url,options)=>{calls++;assert.equal(options.headers['X-Metadata-Service-Key'],'private');assert.equal(options.headers['X-Metadata-Vertical'],'tcg');assert.match(url,/q=Pikachu%20%26%20/);return {ok:true,json:async()=>({items:[{id:'p1',name:'Pikachu',number:'25',setName:'Base'}]})};}});
 assert.equal((await api.search({name:'Pikachu & ',kind:'card'}))[0].number,'25');
 await api.search({name:'Pikachu & ',kind:'card'});assert.equal(calls,1);
});
test('Metadata access failures remain errors rather than made-up prices',async()=>{
 const api=new Metadata({fetcher:async()=>({ok:false,status:402})});
 await assert.rejects(api.search({name:'Pikachu'}),/METADATA_SERVICE_KEY/);
});
test('raw quotes retain decimal USD and provenance, exclude graded and missing prices',()=>{
 const sources=[{source:'guide',price:12.5,basis:'guide'}];
 const quotes=rawQuotes({quotes:{currency:'USD',asOf:'2026-10-24',stale:true,variants:[{key:'holo',label:'Holo',mid:12.5,sources},{key:'psa10',label:'PSA 10',mid:500},{key:'normal',label:'Normal',mid:null}]}});
 assert.equal(quotes.length,1);assert.equal(quotes[0].price,12.5);assert.deepEqual(quotes[0].sources,sources);
 assert.match(hostPull({name:'Pikachu',number:'25',price:quotes[0]}),/\$12.50/);
 assert.match(hostPull({name:'Pikachu',number:'25',price:quotes[0]}),/stale quote/);
 assert.doesNotMatch(hostPull({name:'Pikachu'}),/\$/);
});

test('malformed provider guides never become usable quotes or silently change currency',()=>{
 for(const quotes of ['invalid',[],{}, {currency:'invalid',variants:[]},{currency:null,variants:[]},{currency:'USD',variants:{}}])assert.throws(()=>rawQuotes({quotes}),/invalid/);
 assert.deepEqual(rawQuotes({quotes:{currency:'EUR',variants:[null,[],{}, {key:'raw',label:'Raw',mid:2}]}}).map(q=>q.currency),['EUR']);
 assert.deepEqual(rawQuotes({quotes:null}),[]);
});
