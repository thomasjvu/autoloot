import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync,existsSync,readFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {Storage,backupDatabase} from '../lib/persistence/storage.mjs';
import {Engine,seed} from '../lib/commerce/engine.mjs';
const directory=t=>{const dir=mkdtempSync(join(tmpdir(),'autoloot-db-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;};
test('startup, backup and storage check reject a corrupted workspace commit',async t=>{
 const dir=directory(t),store=new Storage(dir);store.load(seed());
 assert.equal(statSync(join(dir,'autoloot.sqlite')).mode & 0o777,0o600);
 store.db.prepare("UPDATE workspace SET state=json_set(state,'$.show.title','Uncommitted change')").run();
 assert.throws(()=>store.load(seed()),/commit integrity/);
 const target=join(dir,'corrupt-backup.sqlite');
 await assert.rejects(backupDatabase(store.path,target),/commit integrity/);assert.equal(existsSync(target),false);
 const checked=spawnSync(process.execPath,['scripts/maintenance/storage.mjs','check'],{env:{...process.env,DATA_DIR:dir},encoding:'utf8'});
 assert.notEqual(checked.status,0);assert.match(checked.stderr,/commit integrity/);store.close();
 const reopened=new Storage(dir);assert.throws(()=>reopened.load(seed()),/commit integrity/);reopened.close();
});
test('sessions persist hashed tokens across restart, expire and revoke',t=>{
 const dir=directory(t),token='a'.repeat(64),identity={id:'buyer',login:'buyer',kind:'twitch',expires:Date.now()+60000};
 let store=new Storage(dir);store.load(seed());store.sessionStore().set(token,identity);
 assert.notEqual(store.db.prepare('SELECT token_hash FROM sessions').get().token_hash,token);store.close();
 store=new Storage(dir);assert.deepEqual(store.sessionStore().get(token),identity);
 store.db.prepare('UPDATE sessions SET expires=0').run();assert.equal(store.sessionStore().get(token),undefined);
 store.sessionStore().set(token,identity);store.sessionStore().delete(token);assert.equal(store.sessionStore().get(token),undefined);store.close();
});
test('a second writer is rejected even if it uses another server port',t=>{
 const dir=directory(t),store=new Storage(dir);store.load(seed());
 assert.throws(()=>new Storage(dir),/active writer/);store.close();
 const next=new Storage(dir);next.load(seed());next.close();
});
test('constraint failure rolls back inventory and order indexes and halts the engine',t=>{
 const dir=directory(t),store=new Storage(dir),engine=new Engine(store.load(seed()),{save:s=>store.save(s)});
 engine.commit();const previous=engine.state.products[0].quantity;
 engine.state.products[0].quantity=-1;
 assert.throws(()=>engine.commit(),/Persistent storage failed/);
 assert.equal(engine.state.products[0].quantity,previous);assert.equal(engine.halted,true);
 assert.equal(store.db.prepare('SELECT quantity FROM products WHERE id=?').get('p1').quantity,previous);
 assert.equal(JSON.parse(store.db.prepare('SELECT state FROM workspace WHERE id=1').get().state).products[0].quantity,previous);
 store.close();
});
test('online backup and offline restore preserve committed data and reject restore while active',async t=>{
 const dir=directory(t),store=new Storage(dir),state=store.load(seed());state.show.title='Before backup';store.save(state);
 const target=join(dir,'fixture.sqlite');await backupDatabase(store.path,target);
 state.show.title='After backup';store.save(state);
 let command=spawnSync(process.execPath,['scripts/maintenance/storage.mjs','restore',target],{env:{...process.env,DATA_DIR:dir},encoding:'utf8'});
 assert.notEqual(command.status,0);assert.match(command.stderr,/active writer/);store.close();
 command=spawnSync(process.execPath,['scripts/maintenance/storage.mjs','restore',target],{env:{...process.env,DATA_DIR:dir},encoding:'utf8'});
 assert.equal(command.status,0,command.stderr);
 const restored=new Storage(dir);assert.equal(restored.load(seed()).show.title,'Before backup');restored.close();
});
test('SIGKILL recovers the committed WAL and dead-writer lock without losing an order',async t=>{
 const dir=directory(t);
 const child=spawn(process.execPath,['--input-type=module','-e',`import {Storage} from './lib/persistence/storage.mjs';import {Engine,seed} from './lib/commerce/engine.mjs';const store=new Storage(process.env.DATA_DIR);const e=new Engine(store.load(seed()),{save:s=>store.save(s)});e.buyNow({productId:'p4',userId:'fixture',username:'fixture',requestId:'crash'});console.log('saved');setInterval(()=>{},1000);`],{env:{...process.env,DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error(`early exit ${code}`)));});
 const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGKILL');await exited;
 const store=new Storage(dir),state=store.load(seed());assert.equal(state.orders.length,1);assert.equal(state.products.find(p=>p.id==='p4').quantity,2);store.close();
});
test('automatic backup retention prunes old managed copies and preserves manual backups',async t=>{
 const dir=directory(t),store=new Storage(dir);store.load(seed());
 const manual=join(dir,'backups','manual.sqlite');
 await store.automaticBackup(1);await backupDatabase(store.path,manual);
 const first=readdirSync(join(dir,'backups')).find(name=>name.startsWith('autoloot-auto-'));
 await store.automaticBackup(1);
 const files=readdirSync(join(dir,'backups'));
 assert.equal(files.filter(name=>name.startsWith('autoloot-auto-')).length,1);assert.ok(!files.includes(first));
 assert.ok(readFileSync(manual).length);assert.equal(store.status().backupError,null);store.close();
});
