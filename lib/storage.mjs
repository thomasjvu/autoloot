import { assetKey } from './nft.mjs';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync, openSync, closeSync, chmodSync, lstatSync, readdirSync, rmSync, renameSync, fsyncSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hostname } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';

function privateFile(path) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw Error('Refusing a symbolic-link database path.');
  closeSync(openSync(path, 'a', 0o600));
  chmodSync(path, 0o600);
}
function alive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return true;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}
// Separate lock DB survives replacement/restoration of the application DB.
export function acquireStorageLock(directory) {
  mkdirSync(directory,{recursive:true,mode:0o700});
  if(lstatSync(directory).isSymbolicLink())throw Error('Data directory must not be a symbolic link.');
  chmodSync(directory,0o700);
  const path=join(directory,'runtime.sqlite'); privateFile(path);
  const db=new DatabaseSync(path);
  const token=randomUUID();
  try {
    db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS writer (id INTEGER PRIMARY KEY CHECK(id=1), token TEXT NOT NULL, pid INTEGER NOT NULL, host TEXT NOT NULL) STRICT; BEGIN IMMEDIATE;');
    const owner=db.prepare('SELECT * FROM writer WHERE id=1').get();
    if(owner && (owner.host !== hostname() || alive(owner.pid))) throw Error('This data directory already has an active writer. Stop the other server before continuing.');
    db.prepare('INSERT OR REPLACE INTO writer(id,token,pid,host) VALUES(1,?,?,?)').run(token,process.pid,hostname());
    db.exec('COMMIT');
  } catch(error) {try{db.exec('ROLLBACK');}catch{} db.close();throw error;}
  let closed=false;
  return {
    assert(){if(closed || db.prepare('SELECT token FROM writer WHERE id=1').get()?.token !== token)throw Error('Storage writer lock lost.');},
    close(){if(closed)return;db.prepare('DELETE FROM writer WHERE id=1 AND token=?').run(token);db.close();closed=true;}
  };
}
export function validateWorkspace(state) {
  if(state?.version!==1 || !['demo','live'].includes(state.mode) || !state.show || !state.companion ||
    !Number.isSafeInteger(state.orderSequence) || state.orderSequence<0 ||
    !['products','orders','bids','history','chat','activity','registrations','blocked','processedPayments'].every(k=>Array.isArray(state[k])))throw Error('Invalid workspace schema.');
  return state;
}
export function readWorkspace(db) {
  if(db.prepare('PRAGMA user_version').get().user_version!==2)throw Error('Unsupported database schema.');
  const row=db.prepare('SELECT state,revision FROM workspace WHERE id=1').get();
  if(!row)throw Error('Workspace is missing.');
  const commit=db.prepare('SELECT state_hash FROM commits WHERE revision=?').get(row.revision);
  if(!commit || commit.state_hash!==createHash('sha256').update(row.state).digest('hex'))throw Error('Workspace commit integrity check failed.');
  return {state:validateWorkspace(JSON.parse(row.state)),revision:row.revision};
}
export class Storage {
  constructor(directory) {
    this.directory=directory;this.failed=false;this.revision=0;
    this.lock=acquireStorageLock(directory);
    this.path=join(directory,'autoloot.sqlite');
    try {
      privateFile(this.path);
      this.db=new DatabaseSync(this.path);
      this.db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF; PRAGMA secure_delete=ON;');
      const version=this.db.prepare('PRAGMA user_version').get().user_version;
      if(![0,2].includes(version))throw Error('Unsupported database schema.');
      this.db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS workspace(id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, state TEXT NOT NULL CHECK(json_valid(state))) STRICT;
        CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, quantity INTEGER NOT NULL CHECK(quantity>=0), price INTEGER NOT NULL CHECK(price>0), revision INTEGER NOT NULL, asset_key TEXT UNIQUE) STRICT;
        CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, buyer_id TEXT NOT NULL, status TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0), total INTEGER NOT NULL CHECK(total>=amount), checkout_id TEXT UNIQUE, revision INTEGER NOT NULL) STRICT;
        CREATE INDEX IF NOT EXISTS orders_buyer ON orders(buyer_id);
        CREATE INDEX IF NOT EXISTS orders_status ON orders(status);
        CREATE TABLE IF NOT EXISTS payment_events(id TEXT PRIMARY KEY, revision INTEGER NOT NULL) STRICT;
        CREATE TABLE IF NOT EXISTS commits(revision INTEGER PRIMARY KEY, committed_at INTEGER NOT NULL, state_hash TEXT NOT NULL) STRICT;
        CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY, request_id TEXT NOT NULL, at INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, outcome TEXT NOT NULL, status INTEGER) STRICT;
        CREATE INDEX IF NOT EXISTS audit_events_request ON audit_events(request_id,id);
        CREATE TABLE IF NOT EXISTS nft_deliveries(order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE, asset_key TEXT NOT NULL, transaction_id TEXT, recipient TEXT NOT NULL, status TEXT NOT NULL, proof TEXT CHECK(proof IS NULL OR json_valid(proof)), revision INTEGER NOT NULL, UNIQUE(asset_key,transaction_id)) STRICT;
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, identity TEXT NOT NULL CHECK(json_valid(identity)), expires INTEGER NOT NULL) STRICT;
        CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
        PRAGMA user_version=2; COMMIT;`);
      this.db.prepare("INSERT INTO audit_events(request_id,at,actor,action,outcome,status) SELECT a.request_id,?,a.actor,a.action,'interrupted',NULL FROM audit_events a WHERE a.outcome='started' AND NOT EXISTS(SELECT 1 FROM audit_events b WHERE b.request_id=a.request_id AND b.outcome<>'started')").run(Date.now());
      this.revision=this.db.prepare('SELECT revision FROM workspace WHERE id=1').get()?.revision || 0;
      if(this.db.prepare('PRAGMA quick_check').get().quick_check !== 'ok')throw Error('SQLite integrity check failed. Restore a verified backup.');
    } catch(error){this.db?.close();this.lock.close();throw error;}
  }
  load(fallback) {
    const row=this.db.prepare('SELECT state,revision FROM workspace WHERE id=1').get();
    if(row){const saved=readWorkspace(this.db);this.revision=saved.revision;return saved.state;}
    this.save(fallback);
    return fallback;
  }
  sessionStore() {
    const hash=token=>createHash('sha256').update(token).digest('hex');
    const execute=fn=>{if(this.failed)throw Error('Storage is halted.');this.lock.assert();try{return fn();}catch(error){this.failed=true;throw Error('Session storage failed.',{cause:error});}};
    return {
      get:token=>execute(()=>{
        if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))return undefined;
        const row=this.db.prepare('SELECT identity,expires FROM sessions WHERE token_hash=?').get(hash(token));
        if(!row || row.expires<=Date.now())return undefined;
        return JSON.parse(row.identity);
      }),
      set:(token,identity)=>execute(()=>{
        if(!/^[a-f0-9]{64}$/.test(token)||!Number.isSafeInteger(identity.expires)||identity.expires<=Date.now())throw Error('Invalid session.');
        this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
        this.db.prepare('INSERT INTO sessions(token_hash,identity,expires) VALUES(?,?,?) ON CONFLICT(token_hash) DO UPDATE SET identity=excluded.identity,expires=excluded.expires').run(hash(token),JSON.stringify(identity),identity.expires);
      }),
      delete:token=>execute(()=>this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token))),
      clear:()=>execute(()=>this.db.exec('DELETE FROM sessions'))
    };
  }

  recordAudit({requestId,actor='Local streamer',action,outcome,status=null}){
    if(this.failed)throw Error('Storage is halted.');
    if(!['started','completed','rejected','interrupted'].includes(outcome)||typeof action!=='string'||action.length>180||typeof requestId!=='string')throw Error('Invalid audit record.');
    try{this.lock.assert();this.db.prepare('INSERT INTO audit_events(request_id,at,actor,action,outcome,status) VALUES(?,?,?,?,?,?)').run(requestId,Date.now(),String(actor).slice(0,100),action,outcome,status);}
    catch(error){this.failed=true;throw Error('Audit storage failed; backend halted.',{cause:error});}
  }
  auditPage(before=Number.MAX_SAFE_INTEGER){
    const cursor=Number(before);if(!Number.isSafeInteger(cursor)||cursor<1)throw Error('Invalid audit cursor.');
    const events=this.db.prepare('SELECT id,request_id AS requestId,at,actor,action,outcome,status FROM audit_events WHERE id<? ORDER BY id DESC LIMIT 100').all(cursor);
    return {events,nextBefore:events.length===100?events.at(-1).id:null};
  }
  save(state) {
    if(this.failed)throw Error('Storage is halted. Restart after resolving the storage failure.');
    try {
      this.lock.assert();validateWorkspace(state);
      const json=JSON.stringify(state),next=this.revision+1;
      this.db.exec('BEGIN IMMEDIATE');
      const current=this.db.prepare('SELECT revision FROM workspace WHERE id=1').get()?.revision || 0;
      if(current!==this.revision)throw Error('Workspace revision changed unexpectedly.');
      const product=this.db.prepare('INSERT INTO products(id,quantity,price,revision,asset_key) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity,price=excluded.price,revision=excluded.revision,asset_key=excluded.asset_key');
      for(const p of state.products)product.run(p.id,p.quantity,p.price,next,assetKey(p.fulfillment));
      this.db.prepare('DELETE FROM products WHERE revision<>?').run(next);
      const order=this.db.prepare('INSERT INTO orders(id,number,buyer_id,status,amount,total,checkout_id,revision) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET number=excluded.number,buyer_id=excluded.buyer_id,status=excluded.status,amount=excluded.amount,total=excluded.total,checkout_id=excluded.checkout_id,revision=excluded.revision');
      for(const o of state.orders)order.run(o.id,o.number,o.userId,o.status,o.amount,o.total ?? o.amount+(o.shippingPrice||0),o.checkoutId || null,next);
      this.db.prepare('DELETE FROM orders WHERE revision<>?').run(next);
      const delivery=this.db.prepare('INSERT INTO nft_deliveries(order_id,asset_key,transaction_id,recipient,status,proof,revision) VALUES(?,?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET asset_key=excluded.asset_key,transaction_id=excluded.transaction_id,recipient=excluded.recipient,status=excluded.status,proof=excluded.proof,revision=excluded.revision');
      for(const o of state.orders)if(o.delivery && o.product.fulfillment?.type==='nft')delivery.run(o.id,assetKey(o.product.fulfillment),o.delivery.transactionId || null,o.delivery.recipient,o.delivery.status,o.delivery.proof?JSON.stringify(o.delivery.proof):null,next);
      this.db.prepare('DELETE FROM nft_deliveries WHERE revision<>?').run(next);
      const event=this.db.prepare('INSERT INTO payment_events(id,revision) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision');
      for(const id of state.processedPayments || [])event.run(id,next);
      this.db.prepare('DELETE FROM payment_events WHERE revision<>?').run(next);
      this.db.prepare('INSERT INTO workspace(id,revision,state) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,state=excluded.state').run(next,json);
      this.db.prepare('INSERT INTO commits(revision,committed_at,state_hash) VALUES(?,?,?)').run(next,Date.now(),createHash('sha256').update(json).digest('hex'));
      this.db.exec('COMMIT');this.revision=next;
    } catch(error) {
      try{this.db.exec('ROLLBACK');}catch{}
      this.failed=true;
      throw Error('Persistent storage failed. No further sales are accepted; restart after recovery.',{cause:error});
    }
  }
  async automaticBackup(keep=24){
    if(this.backupBusy || this.failed)return;this.backupBusy=true;
    const directory=join(this.directory,'backups'),id=`autoloot-auto-${Date.now()}-${randomUUID()}`,temporary=join(directory,id+'.partial'),target=join(directory,id+'.sqlite');
    try{
      mkdirSync(directory,{recursive:true,mode:0o700});
      await backupDatabase(this.path,temporary);renameSync(temporary,target);
      const parent=openSync(directory,'r');try{fsyncSync(parent);}finally{closeSync(parent);}
      this.lastBackupAt=Date.now();this.lastBackupError=null;
      const files=readdirSync(directory).filter(name=>/^autoloot-auto-[0-9]+-[a-f0-9-]+\.sqlite$/.test(name)).sort().reverse();
      for(const name of files.slice(keep))rmSync(join(directory,name));
    }catch{this.lastBackupError='Automatic backup failed. Check disk space, permissions and backup monitoring.';}
    finally{rmSync(temporary,{force:true});this.backupBusy=false;}
  }
  status(){return {backend:'sqlite',schemaVersion:2,revision:this.revision,healthy:!this.failed,singleWriter:true,lastBackupAt:this.lastBackupAt||null,backupError:this.lastBackupError||null};}
  close(){try{this.db?.close();}finally{this.lock.close();}}
}
export async function backupDatabase(source,target) {
  // Exclusive creation prevents a concurrent backup from overwriting an existing destination.
  closeSync(openSync(target,'wx',0o600));
  let sourceDb,check;
  try {
    sourceDb=new DatabaseSync(source,{readOnly:true});
    await backup(sourceDb,target);
    sourceDb.close();sourceDb=null;
    check=new DatabaseSync(target);
    // A published backup is a self-contained file, without temporary WAL/SHM sidecars.
    check.exec('PRAGMA journal_mode=DELETE');
    if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||check.prepare('PRAGMA foreign_key_check').all().length)throw Error('Backup integrity check failed.');
    readWorkspace(check);
    check.close();check=null;
    const file=openSync(target,'r');try{fsyncSync(file);}finally{closeSync(file);}
    const parent=openSync(dirname(target),'r');try{fsyncSync(parent);}finally{closeSync(parent);}
  } catch(error) {
    check?.close();sourceDb?.close();
    for(const suffix of ['','-wal','-shm','-journal'])rmSync(target+suffix,{force:true});
    throw error;
  }
}
