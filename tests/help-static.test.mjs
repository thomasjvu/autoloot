import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {serveStatic} from '../lib/http/static.mjs';

async function fixture(run){
 const root=mkdtempSync(join(tmpdir(),'autoloot-help-'));
 // Deliberately copy only tracked static files: the optional docs checkout is absent.
 for(const file of ['help.html','404.html','index.html','privacy.html','terms.html','styles/app.css']){
  const target=join(root,'public',file);mkdirSync(dirname(target),{recursive:true});copyFileSync(new URL('../public/'+file,import.meta.url),target);
 }
 const server=createServer((req,res)=>serveStatic({req,res,path:req.url.split('?')[0],root}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{await run({root,base});}finally{await new Promise(resolve=>server.close(resolve));rmSync(root,{recursive:true,force:true});}
}

test('tracked-only Help follows redirects to a usable public FAQ and internal links',async()=>{
 await fixture(async({base})=>{
  for(const path of ['/help','/help.html']){
   const redirect=await fetch(base+path,{redirect:'manual'});assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'/docs/getting-started/faq');
   const response=await fetch(base+path);assert.equal(response.status,200);assert.equal(new URL(response.url).pathname,'/docs/getting-started/faq');
   assert.match(response.headers.get('content-type'),/^text\/html/);const html=await response.text();
   assert.match(html,/<h1>Help &amp; FAQ<\/h1>|<h1>Help & FAQ<\/h1>/);assert.match(html,/id="payments"/);for(const setup of ['STRIPE_API_KEY','STRIPE_WEBHOOK_SECRET','PUBLIC_URL','/api/stripe/webhook'])assert.ok(html.includes(setup));assert.match(html,/!bid 25\.00/);assert.match(html,/private maximum/);assert.match(html,/Your prizes/);
   assert.doesNotMatch(html,/http-equiv=["']refresh/i);assert.doesNotMatch(html,/<script\b/i);
   for(const [,href] of html.matchAll(/href="(\/[^"#]*)"/g))assert.equal((await fetch(base+href)).status,200,href);
  }
  for(const path of ['/docs/getting-started/faq','/docs/getting-started/faq/','/docs/getting-started/faq.html']){
   assert.equal((await fetch(base+path)).status,200);const head=await fetch(base+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  }
  for(const path of ['/docs/missing','/docs/getting-started/faq/unknown','/docs/getting-started/faq.html/missing'])assert.equal((await fetch(base+path)).status,404);
 });
});

test('optional rich FAQ and assets take precedence over the tracked fallback',async()=>{
 await fixture(async({root,base})=>{
  const docs=join(root,'documentation','dist');mkdirSync(join(docs,'docs','getting-started'),{recursive:true});mkdirSync(join(docs,'assets'),{recursive:true});
  writeFileSync(join(docs,'docs','getting-started','faq.html'),'<h1>Rich FAQ fixture</h1>');writeFileSync(join(docs,'assets','guide.css'),'body{}');
  for(const path of ['/help','/docs/getting-started/faq','/docs/getting-started/faq/','/docs/getting-started/faq.html']){
   const response=await fetch(base+path);assert.equal(response.status,200);assert.equal(await response.text(),'<h1>Rich FAQ fixture</h1>');assert.match(response.headers.get('content-type'),/^text\/html/);
  }
  const asset=await fetch(base+'/assets/guide.css');assert.equal(asset.status,200);assert.match(asset.headers.get('content-type'),/^text\/css/);assert.equal(await asset.text(),'body{}');
 });
});

test('invalid static paths never become FAQ fallbacks or expose deployment files',async()=>{
 await fixture(async({root,base})=>{
  writeFileSync(join(root,'private.txt'),'private fixture');
  // Raw HTTP paths avoid fetch normalizing dot segments before they reach the handler.
  for(const path of ['/docs/../../private.txt','/docs/getting-started/faq/../private.txt','/docs/%2e%2e/private.txt','/docs/getting-started/faq<script>']){
   const response=await new Promise((resolve,reject)=>{const req=request(base+ '/', {path},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body}));});req.on('error',reject);req.end();});
   assert.equal(response.status,404,path);assert.doesNotMatch(response.body,/private fixture/);
  }
 });
});


test('directories and object prototype names return clean 404s; legal pages support HEAD',async()=>{
 await fixture(async({base})=>{
  for(const path of ['/styles','/styles/','/constructor','/toString','/__proto__']){
   const response=await fetch(base+path);assert.equal(response.status,404,path);
   assert.match(response.headers.get('content-type'),/^text\/html/);
  }
  for(const path of ['/privacy','/terms','/404']){
   const response=await fetch(base+path,{method:'HEAD'});
   assert.equal(response.status,path==='/404'?404:200,path);assert.equal(await response.text(),'');
  }
 });
});
