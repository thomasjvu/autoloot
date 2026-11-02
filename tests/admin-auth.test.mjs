import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,readFileSync,readdirSync,writeFileSync,mkdirSync,statSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{AdminAuth}from'../lib/admin-auth.mjs';
test('admin password hashes, login throttling, expiry, session cap and logout',async()=>{const dir=mkdtempSync(join(tmpdir(),'admin-security-'));try{const auth=new AdminAuth(join(dir,'auth.json'));await assert.rejects(auth.login('short',true,'streamer'),/12/);const token=await auth.login('Correct-password-123!',true,'streamer');assert.ok(!readFileSync(auth.file,'utf8').includes('correct-password'));const req={headers:{cookie:'autoloot_admin='+token}};assert.ok(auth.valid(req));await assert.rejects(auth.login('Another-password-123!',true,'streamer'),/already/);for(let i=0;i<8;i++)await assert.rejects(auth.login('wrong'),/Incorrect/);await assert.rejects(auth.login('Correct-password-123!',false,'streamer'),/Too many/);auth.failures=[];for(const key of auth.sessions.keys())auth.sessions.set(key,0);assert.equal(auth.valid(req),false);const session=await auth.login('Correct-password-123!',false,'streamer');auth.logout({headers:{cookie:'autoloot_admin='+session}});assert.equal(auth.valid({headers:{cookie:'autoloot_admin='+session}}),false);}finally{rmSync(dir,{recursive:true,force:true});}});

test('logout revokes only the supplied session and concurrent setup never overwrites a password',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'admin-race-'));
 try{
  const file=join(dir,'auth.json'),a=new AdminAuth(file),b=new AdminAuth(file);
  const outcomes=await Promise.allSettled([a.login('First-password-123!',true,'streamer'),b.login('Second-password-123!',true,'streamer')]);
  assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
  const winner=outcomes[0].status==='fulfilled'?a:b;
  const password=winner===a?'First-password-123!':'Second-password-123!';
  const first={headers:{cookie:'autoloot_admin='+outcomes.find(o=>o.status==='fulfilled').value}};
  const second={headers:{cookie:'autoloot_admin='+await winner.login(password,false,'streamer')}};
  winner.logout({headers:{}});assert.ok(winner.valid(first));assert.ok(winner.valid(second));
  winner.logout(first);assert.equal(winner.valid(first),false);assert.ok(winner.valid(second));
  assert.deepEqual(readdirSync(dir),['auth.json']);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('abandoned setup files do not block a private new password record',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'admin-stale-'));
 try{
  const file=join(dir,'auth.json');writeFileSync(file+'.tmp','legacy incomplete setup');mkdirSync(file+'.setup-abandoned');
  const auth=new AdminAuth(file),token=await auth.login('Fresh-password-123!',true,'streamer');
  assert.ok(auth.valid({headers:{cookie:'autoloot_admin='+token}}));
  assert.equal(statSync(file).mode & 0o777,0o600);
  assert.equal(readFileSync(file+'.tmp','utf8'),'legacy incomplete setup');
  assert.deepEqual(readdirSync(dir).sort(),['auth.json','auth.json.setup-abandoned','auth.json.tmp']);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('setup requires a username and strong password; username mismatch counts as failed credentials',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'admin-credentials-'));
 try{
  const auth=new AdminAuth(join(dir,'auth.json'));
  for(const password of ['short','lowercase-only-123!','UPPERCASE-ONLY-123!','Missing-Numbers!','MissingSymbols123','Spaces Instead 123','StrongPass123 '])
   await assert.rejects(auth.login(password,true,'streamer'),/12\+/);
  await assert.rejects(auth.login('Strong-password-123!',true,'x'),/3–32/);
  await assert.rejects(auth.login('Strong-password-123!',true,'bad name'),/3–32/);
  const token=await auth.login('Strong-password-123!',true,'Streamer_1');
  assert.equal(auth.legacyPasswordOnly,false);assert.equal(JSON.parse(readFileSync(auth.file)).username,'streamer_1');
  assert.ok(auth.valid({headers:{cookie:'autoloot_admin='+token}}));
  await assert.rejects(auth.login('Strong-password-123!',false,'wrong-user'),/Incorrect username or password/);
  await assert.rejects(auth.login('wrong-password',false,'streamer_1'),/Incorrect username or password/);
  assert.equal(auth.failures.length,2);
  assert.ok(await auth.login('Strong-password-123!',false,'STREAMER_1'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('existing password-only records retain login without new password rules or username',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'admin-legacy-'));
 try{
  const {scryptSync}=await import('node:crypto');const file=join(dir,'auth.json');
  writeFileSync(file,JSON.stringify({salt:'legacy-salt',hash:scryptSync('legacy-password','legacy-salt',64).toString('hex')}),{mode:0o600});
  const before=readFileSync(file,'utf8'),auth=new AdminAuth(file);
  assert.equal(auth.legacyPasswordOnly,true);assert.ok(await auth.login('legacy-password'));
  await assert.rejects(auth.login('wrong'),/Incorrect username or password/);
  assert.equal(readFileSync(file,'utf8'),before);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('remembered sessions extend server expiry and remain revocable',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'admin-remember-'));
 try{
  const auth=new AdminAuth(join(dir,'auth.json'));
  const normal=await auth.login('Strong-password-123!',true,'streamer');
  const remembered=await auth.login('Strong-password-123!',false,'streamer',true);
  const req=token=>({headers:{cookie:'autoloot_admin='+token}});
  const normalExpiry=auth.sessions.get(auth.sessionKey(req(normal))),rememberedExpiry=auth.sessions.get(auth.sessionKey(req(remembered)));
  assert.ok(normalExpiry-Date.now()<=12*3600000);assert.ok(rememberedExpiry-normalExpiry>29*86400000);
  auth.logout(req(remembered));assert.equal(auth.valid(req(remembered)),false);assert.equal(auth.valid(req(normal)),true);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('linked Twitch identity uses immutable ID, preserves password, persists and unlinks sessions',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'admin-twitch-'));
 try{
  const auth=new AdminAuth(join(dir,'auth.json'));
  assert.throws(()=>auth.loginTwitch({id:'123'}),/not linked/);
  await auth.login('Correct-password-123!',true,'streamer');
  auth.linkTwitch({id:'123',login:'original'});
  assert.throws(()=>auth.loginTwitch({id:'456',login:'original'}),/not linked/);
  assert.throws(()=>auth.linkTwitch({id:'456',login:'other'}),/Unlink/);
  const token=auth.loginTwitch({id:'123',login:'renamed'}),req={headers:{cookie:'autoloot_admin='+token}};
  assert.ok(auth.valid(req));assert.equal(new AdminAuth(auth.file).twitchIdentity.id,'123');
  await auth.login('Correct-password-123!',false,'streamer');
  auth.unlinkTwitch();assert.equal(auth.valid(req),false);assert.equal(auth.twitchIdentity,null);
  assert.throws(()=>auth.loginTwitch({id:'123'}),/not linked/);
  assert.ok(await auth.login('Correct-password-123!',false,'streamer'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
