import test from 'node:test';
import assert from 'node:assert/strict';
import {Vision,parseObservation} from '../lib/integrations/vision.mjs';
const observation={kind:'card',name:'Pikachu',number:'25',setName:'',language:'English',finish:'',visibleText:'Pikachu 25'};
const result=()=>Response.json({answer:JSON.stringify(observation)});

test('cloud authenticates only to the fixed Prime endpoint; local gets no cloud credentials',async()=>{
 const calls=[];const vision=new Vision({key:'secret',teamId:'team-test',fetcher:async(url,options)=>{calls.push({url,options});return url.includes('pinference.ai')?Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(observation)}}]}):result();}});
 assert.deepEqual(await vision.observe(Buffer.from('frame'),'cloud'),observation);
 assert.deepEqual(await vision.observe(Buffer.from('frame'),'local'),observation);
 assert.equal(calls[0].url,'https://api.pinference.ai/api/v1/chat/completions');
 assert.equal(calls[0].options.headers.Authorization,'Bearer secret');
 assert.equal(calls[1].url,'http://127.0.0.1:2021/query');
 assert.equal(calls[1].options.headers.Authorization,undefined);
 assert.equal(calls[0].options.redirect,'error');
 assert.equal(calls[0].options.headers['X-Prime-Team-ID'],'team-test');
 assert.equal(calls[1].options.headers['X-Prime-Team-ID'],undefined);
 assert.equal(JSON.parse(calls[0].options.body).model,'moondream/moondream3.1-9b-a2b');
 assert.equal(JSON.parse(calls[1].options.body).model,'moondream3.1-9B-A2B');
 assert.match(JSON.parse(calls[0].options.body).messages[0].content[1].image_url.url,/^data:image\/jpeg;base64,/);
 assert.equal(JSON.stringify(vision.status({})).includes('secret'),false);
});

test('local endpoint cannot redirect frames or credentials to arbitrary hosts',()=>{
 for(const localUrl of ['https://127.0.0.1:2021','http://example.com','http://user:pass@localhost:2021','http://localhost:2021/path'])assert.throws(()=>new Vision({localUrl}),/loopback/);
});

test('bad observations cannot become catalog identities',()=>{
 assert.deepEqual(parseObservation('```json\n'+JSON.stringify(observation)+'\n```'),observation);
 for(const value of ['not json','null',JSON.stringify({...observation,kind:'transfer'}),JSON.stringify({...observation,name:{command:'run'}}),JSON.stringify({...observation,visibleText:'x'.repeat(1001)})])assert.throws(()=>parseObservation(value));
});

test('missing keys and failed local requests never fall back to cloud',async()=>{
 let calls=0;const vision=new Vision({key:'',fetcher:async()=>{calls++;throw new TypeError('offline');}});
 await assert.rejects(vision.observe(Buffer.from('x'),'cloud'),/PRIME_API_KEY/);assert.equal(calls,0);
 await assert.rejects(vision.observe(Buffer.from('x'),'local'),/Cannot reach Moondream local/);assert.equal(calls,1);assert.equal(vision.busy,false);
});

test('only one inference runs at a time and failures release its slot',async()=>{
 let release;const vision=new Vision({fetcher:()=>new Promise(resolve=>{release=resolve;})});
 const first=vision.observe(Buffer.from('x'),'local');
 await assert.rejects(vision.observe(Buffer.from('x'),'local'),/already/);
 release(new Response('bad upstream',{status:503}));await assert.rejects(first,/503/);assert.equal(vision.busy,false);
 vision.fetcher=async()=>result();await vision.observe(Buffer.from('x'),'local');
});

test('oversized and invalid provider responses are rejected',async()=>{
 const vision=new Vision({fetcher:async()=>new Response('x'.repeat(32001))});
 await assert.rejects(vision.observe(Buffer.from('x'),'local'),/too large/);
 vision.fetcher=async()=>new Response('bad json');await assert.rejects(vision.observe(Buffer.from('x'),'local'),/invalid response/);
});

test('Prime refusals, truncated responses and missing choices never become observations',async()=>{
 const vision=new Vision({key:'test'});
 for(const payload of [{choices:[{finish_reason:'length',message:{content:JSON.stringify(observation)}}]},{choices:[]},{choices:[{finish_reason:'stop',message:{content:null,refusal:'Cannot identify'}}]}]){
 vision.fetcher=async()=>Response.json(payload);await assert.rejects(vision.observe(Buffer.from('x'),'cloud'));
 }
});
