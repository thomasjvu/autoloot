import test from'node:test';import assert from'node:assert/strict';import{spawn}from'node:child_process';import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{createServer}from'node:net';
test('admin setup protects bootstrap, rejects token-only reuse, cross-origin requests and logout replay',async()=>{
 const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));const dir=mkdtempSync(join(tmpdir(),'admin-http-'));const base=`http://localhost:${port}`;const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),PUBLIC_URL:base,DATA_DIR:dir},stdio:'ignore'});
 try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).status<500)break;}catch{}await new Promise(r=>setTimeout(r,50));}
 assert.equal((await fetch(base+'/api/bootstrap')).status,401);assert.equal((await fetch(base+'/shop')).status,200);
 const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 assert.equal((await post('/api/admin/setup',{username:'streamer',password:'Correct-test-password-123!'},{Origin:'https://evil.example'})).status,403);
 assert.equal((await post('/api/admin/setup',{password:'Correct-test-password-123!'})).status,400);
 assert.equal((await post('/api/admin/setup',{username:'streamer',password:'StrongPass123 '})).status,400);
 const setup=await post('/api/admin/setup',{username:'streamer',password:'Correct-test-password-123!'});assert.equal(setup.status,200);const cookie=setup.headers.get('set-cookie').split(';')[0];assert.match(setup.headers.get('set-cookie'),/HttpOnly/);
 const status=await fetch(base+'/api/admin/status').then(r=>r.json());assert.equal(status.legacyPasswordOnly,false);assert.equal(status.username,undefined);
 assert.equal((await post('/api/admin/login',{username:'wrong',password:'Correct-test-password-123!'})).status,400);
 const boot=await fetch(base+'/api/bootstrap',{headers:{Cookie:cookie}}).then(r=>r.json());assert.ok(boot.admin);
 assert.equal((await post('/api/products',{title:'Free item',price:'0',quantity:1},{'X-Autoloot-Admin':boot.admin})).status,403);
 assert.equal((await post('/api/products',{title:'Owned item',price:'5',quantity:1},{Cookie:cookie,'X-Autoloot-Admin':boot.admin})).status,200);
 const publicState=await fetch(base+'/api/state').then(r=>r.json());assert.equal(publicState.orders,undefined);assert.equal(publicState.audit,undefined);
 assert.equal((await post('/api/admin/setup',{password:'replace-password'})).status,400);
 assert.equal((await post('/api/admin/logout',{})).status,401);
 const secondLogin=await post('/api/admin/login',{username:'streamer',password:'Correct-test-password-123!'});const secondCookie=secondLogin.headers.get('set-cookie').split(';')[0];
 await post('/api/admin/logout',{}, {Cookie:cookie});assert.equal((await fetch(base+'/api/bootstrap',{headers:{Cookie:secondCookie}})).status,200);
assert.equal((await fetch(base+'/api/bootstrap',{headers:{Cookie:cookie}})).status,401);
 assert.equal((await post('/api/products',{title:'Replay',price:'1',quantity:1},{Cookie:cookie,'X-Autoloot-Admin':boot.admin})).status,403);
 }finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));rmSync(dir,{recursive:true,force:true});}
});
