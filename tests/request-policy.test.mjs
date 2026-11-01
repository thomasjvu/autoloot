import test from 'node:test';
import assert from 'node:assert/strict';
import {Hono} from 'hono';
import {createRequestPolicy} from '../lib/http/policy.mjs';
function fixture(){
 let time=0;const audit=[],engine={halted:false},storage={failed:false,recordAudit:row=>audit.push(row),auditPage:()=>[]};
 const policy=createRequestPolicy({runtime:{hosts:new Set(['localhost']),origins:new Set(['http://localhost']),trustedProxies:new Set()},auth:{valid:req=>req.headers.cookie==='admin'},adminToken:'cap',agentToken:()=>'',localHost:()=>true,storage,engine,twitch:{session:()=>null},broadcast:()=>{},clock:()=>time,report:()=>{}});
 const app=new Hono();app.onError((e,c)=>c.json({error:e.message},400));
 app.use('*',async(c,next)=>{const url=new URL(c.req.url);c.set('request',{method:c.req.method,url:url.pathname,headers:{host:url.host,...Object.fromEntries(c.req.raw.headers)},socket:{remoteAddress:'127.0.0.1'}});await next();});
 app.use('*',policy.middleware);app.all('*',c=>c.json({ok:true}));
 const request=(path='/api/products',admin=false,headers={},method='POST')=>app.request('http://localhost'+path,{method,headers:{...(admin?{Cookie:'admin','X-Autoloot-Admin':'cap'}:{}),...headers}});
 return {policy,request,audit,engine,storage,setTime:value=>time=value};
}
test('ingress rejects untrusted hosts before accounting and rate buckets reset by clock',async()=>{
 const f=fixture();assert.equal((await f.request('/api/products',false,{host:'evil'})).status,403);assert.equal(f.policy.activeRequests,0);
 for(let i=0;i<60;i++)assert.equal((await f.request()).status,200);
 assert.equal((await f.request()).status,429);
 f.setTime(60001);assert.equal((await f.request()).status,200);assert.equal(f.policy.activeRequests,0);
});
test('audit precedes halted rejection, diagnostics remain accessible, webhook skips rate policy',async()=>{
 const f=fixture();f.engine.halted=true;
 assert.equal((await f.request('/api/products',true)).status,503);assert.deepEqual(f.audit.map(x=>x.outcome),['started','rejected']);
 const health=await f.request('/api/health',false,{},'GET');assert.equal(health.status,503);assert.equal((await health.json()).storage,'sqlite');
 f.engine.halted=false;
 for(let i=0;i<61;i++)assert.equal((await f.request('/api/stripe/webhook')).status,200);
});
test('cross-origin writes reject before dispatch and failed audit completion halts further sales',async()=>{
 const f=fixture();assert.equal((await f.request('/api/products',false,{origin:'https://evil.example'})).status,403);assert.equal(f.policy.activeRequests,0);
 let calls=0;f.storage.recordAudit=()=>{if(++calls>1)throw Error('disk failure');};
 assert.equal((await f.request('/api/products',true)).status,200);assert.equal(f.engine.halted,true);
 assert.equal((await f.request()).status,503);
});
