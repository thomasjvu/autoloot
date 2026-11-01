import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {CodexConnection} from '../lib/codex-connection.mjs';
function fixture({account=null,url='https://auth.openai.com/oauth/authorize?state=fixture',error=false}={}){
 const calls=[];let child,spawns=0;
 const service=new CodexConnection({env:{CODEX_BIN:'fixture',PATH:'/bin',STRIPE_SECRET_KEY:'must-not-inherit'},spawnProcess:(bin,args,options)=>{
  spawns++;assert.equal(bin,'fixture');assert.deepEqual(args,['app-server']);assert.equal(options.env.STRIPE_SECRET_KEY,undefined);
  child=new EventEmitter();child.stdout=new PassThrough();child.stdin=new PassThrough();child.kill=()=>{child.emit('close',0);};
  child.stdin.on('data',chunk=>{
   const message=JSON.parse(String(chunk));calls.push(message);if(!message.id)return;
   let result={};
   if(message.method==='account/read')result={account,secret:'never expose'};
   if(message.method==='account/login/start'){
    if(message.params.type==='apiKey'){account={type:'apiKey',apiKey:'never expose'};result={type:'apiKey'};}
    else result={loginId:'fixture-login',authUrl:url};
   }
   queueMicrotask(()=>child.stdout.write(JSON.stringify(error&&message.method==='account/read'?{id:message.id,error:{message:'sensitive raw provider error'}}:{id:message.id,result})+'\n'));
  });return child;
 }});
 return {service,calls,get spawns(){return spawns;},complete(){account={type:'chatgpt',email:'private-email'};child.stdout.write(JSON.stringify({method:'account/login/completed',params:{loginId:'fixture-login',success:true}})+'\n');}};
}
test('Codex auth bridge exposes only safe account status and reuses initialized transport',async()=>{
 const f=fixture({account:{type:'chatgpt',email:'private',token:'secret'}});
 try{assert.deepEqual(await f.service.status(),{connected:true,method:'ChatGPT',pending:false});await f.service.status();assert.equal(f.spawns,1);assert.equal(f.calls.filter(x=>x.method==='initialize').length,1);assert.ok(f.calls.some(x=>x.method==='initialized'));}finally{f.service.close();}
});
test('login start is idempotent, accepts only OpenAI URLs, and observes completion',async()=>{
 const f=fixture();try{
  const [a,b]=await Promise.all([f.service.start(),f.service.start()]);assert.deepEqual(a,b);assert.equal(f.calls.filter(x=>x.method==='account/login/start').length,1);assert.match(a.authUrl,/^https:\/\/auth.openai.com\//);
  f.complete();assert.equal((await f.service.status()).connected,true);assert.equal(f.service.timer,null);
 }finally{f.service.close();}
 for(const url of ['https://evil.example/','javascript:alert(1)','https://user:password@auth.openai.com/']){
  const bad=fixture({url});try{await assert.rejects(bad.service.start(),/unsupported|invalid/);}finally{bad.service.close();}
 }
});
test('cancel uses the current login ID and API keys never enter returned state',async()=>{
 const f=fixture();try{
  await f.service.start();await f.service.cancel();assert.ok(f.calls.some(x=>x.method==='account/login/cancel'&&x.params.loginId==='fixture-login'));assert.equal(f.service.timer,null);
  const status=await f.service.apiKey('fixture-private-key');assert.deepEqual(status,{connected:true,method:'API key',pending:false});assert.doesNotMatch(JSON.stringify(status),/fixture-private-key|never expose/);
 }finally{f.service.close();}
});
test('raw provider errors are replaced with safe messages',async()=>{
 const f=fixture({error:true});try{await assert.rejects(f.service.status(),error=>!error.message.includes('sensitive'));}finally{f.service.close();}
});
