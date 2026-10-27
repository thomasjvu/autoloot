import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequestPolicy} from '../lib/http/policy.mjs';
class Response extends EventEmitter {
 setHeader(){} writeHead(status){this.statusCode=status;}
 end(value){this.value=JSON.parse(value);this.writableFinished=true;this.emit('finish');this.emit('close');}
}
function fixture(){
 let time=0;const audit=[],engine={halted:false},storage={failed:false,recordAudit:row=>audit.push(row),auditPage:()=>[]};
 const policy=createRequestPolicy({runtime:{hosts:new Set(['localhost']),origins:new Set(['http://localhost']),trustedProxies:new Set()},auth:{valid:req=>req.admin===true},adminToken:'cap',agentToken:()=>'',localHost:()=>true,storage,engine,twitch:{session:()=>null},broadcast:()=>{},clock:()=>time});
 const request=(path='/api/products',admin=false,headers={})=>({method:'POST',url:path,headers:{host:'localhost',...(admin?{'x-autoloot-admin':'cap'}:{}),...headers},socket:{remoteAddress:'127.0.0.1'},admin});
 return {policy,request,audit,engine,storage,setTime:value=>time=value};
}
test('ingress rejects untrusted host before accounting; rate buckets reset by injected clock',()=>{
 const f=fixture(),bad=new Response();assert.equal(f.policy.begin(f.request('/api/products',false,{host:'evil'}),bad),undefined);assert.equal(bad.statusCode,403);assert.equal(f.policy.activeRequests,0);
 for(let i=0;i<60;i++){const res=new Response();assert.ok(f.policy.prepare(f.policy.begin(f.request(),res)));res.end('{}');}
 const limited=new Response();assert.equal(f.policy.prepare(f.policy.begin(f.request(),limited)),undefined);assert.equal(limited.statusCode,429);
 f.setTime(60001);const recovered=new Response();assert.ok(f.policy.prepare(f.policy.begin(f.request(),recovered)));recovered.end('{}');assert.equal(f.policy.activeRequests,0);
});
test('audit precedes halted rejection, diagnostics remain accessible, and webhook skips rate policy',()=>{
 const f=fixture();f.engine.halted=true;const res=new Response();assert.equal(f.policy.prepare(f.policy.begin(f.request('/api/products',true),res)),undefined);assert.equal(res.statusCode,503);assert.deepEqual(f.audit.map(x=>x.outcome),['started','rejected']);
 const health=new Response(),req=f.request('/api/health');req.method='GET';f.policy.prepare(f.policy.begin(req,health));assert.equal(health.statusCode,503);assert.equal(health.value.storage,'sqlite');
 f.engine.halted=false;
 for(let i=0;i<61;i++){const response=new Response();assert.ok(f.policy.prepare(f.policy.begin(f.request('/api/stripe/webhook'),response)));response.end('{}');}
});
test('cross-origin writes are rejected before dispatch; audit persistence failure halts further sales',()=>{
 const f=fixture(),cross=new Response();assert.equal(f.policy.begin(f.request('/api/products',false,{origin:'https://evil.example'}),cross),undefined);assert.equal(cross.statusCode,403);assert.equal(f.policy.activeRequests,0);
 let calls=0;f.storage.recordAudit=()=>{if(++calls>1)throw Error('disk failure');};
 const res=new Response();assert.ok(f.policy.prepare(f.policy.begin(f.request('/api/products',true),res)));res.end('{}');assert.equal(f.engine.halted,true);
 const blocked=new Response();f.policy.prepare(f.policy.begin(f.request('/api/products'),blocked));assert.equal(blocked.statusCode,503);
});
