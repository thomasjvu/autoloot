import {createHash} from 'node:crypto';
import {assetKey} from '../lib/commerce/nft.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

// The Durable Object is the only writer. Engine commits remain synchronous and
// atomic; D1 is an ordered, retryable projection, never a second stock authority.
export class DurableStorage{
  constructor(storage,d1,workspaceId){
    this.storage=storage;this.sql=storage.sql;this.d1=d1;this.workspaceId=workspaceId;this.failed=false;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS workspace(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,state TEXT NOT NULL CHECK(json_valid(state)),hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS identities(product_id TEXT PRIMARY KEY,asset_key TEXT UNIQUE);
      CREATE TABLE IF NOT EXISTS values_store(namespace TEXT NOT NULL,key TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(namespace,key));
      CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY,request_id TEXT NOT NULL,at INTEGER NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,outcome TEXT NOT NULL,status INTEGER);
      CREATE TABLE IF NOT EXISTS projection(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS audit_requests ON audit_events(request_id,id);`);
    this.revision=this.row()?.revision||0;
    this.sql.exec("INSERT INTO audit_events(request_id,at,actor,action,outcome,status) SELECT a.request_id,?,a.actor,a.action,'interrupted',NULL FROM audit_events a WHERE a.outcome='started' AND NOT EXISTS(SELECT 1 FROM audit_events b WHERE b.request_id=a.request_id AND b.outcome<>'started')",Date.now());
  }
  row(){return this.sql.exec('SELECT * FROM workspace WHERE id=1').toArray()[0];}
  load(fallback){
    const row=this.row();
    if(!row){this.save(fallback);return fallback;}
    if(hash(row.state)!==row.hash)throw Error('Workspace integrity check failed.');
    return JSON.parse(row.state);
  }
  save(state){
    if(this.failed)throw Error('Storage is halted.');
    try{
      const text=JSON.stringify(state),next=this.revision+1;
      if(state.version!==1||!Array.isArray(state.products)||!Array.isArray(state.orders))throw Error('Invalid workspace.');
      const ids=new Set(),numbers=new Set(),checkouts=new Set(),deliveries=new Set();
      for(const order of state.orders){
        if(typeof order.id!=='string'||ids.has(order.id)||numbers.has(order.number)||!Number.isSafeInteger(order.amount)||order.amount<=0||!Number.isSafeInteger(order.total)||order.total<order.amount)throw Error('Invalid or duplicated order.');
        ids.add(order.id);numbers.add(order.number);
        if(order.checkoutId){if(checkouts.has(order.checkoutId))throw Error('Duplicate checkout identity.');checkouts.add(order.checkoutId);}
        if(order.delivery?.transactionId){const key=assetKey(order.product.fulfillment)+':'+order.delivery.transactionId;if(deliveries.has(key))throw Error('Duplicate NFT delivery proof.');deliveries.add(key);}
      }
      if(new Set(state.processedPayments).size!==state.processedPayments.length)throw Error('Duplicate payment event.');

      this.storage.transactionSync(()=>{
        if((this.row()?.revision||0)!==this.revision)throw Error('Workspace revision conflict.');
        this.sql.exec('DELETE FROM identities');
        for(const p of state.products){
          if(!Number.isSafeInteger(p.quantity)||p.quantity<0||!Number.isSafeInteger(p.price)||p.price<=0)throw Error('Invalid inventory.');
          this.sql.exec('INSERT INTO identities(product_id,asset_key) VALUES(?,?)',p.id,assetKey(p.fulfillment));
        }
        this.sql.exec('INSERT INTO workspace(id,revision,state,hash) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,state=excluded.state,hash=excluded.hash',next,text,hash(text));
      });
      this.revision=next;
    }catch(error){this.failed=true;throw Error('Persistent storage failed. No further sales are accepted; restart after recovery.',{cause:error});}
  }
  map(namespace){
    const sql=this.sql;
    return {
      get:key=>{if(typeof key!=='string')return;const row=sql.exec('SELECT value FROM values_store WHERE namespace=? AND key=?',namespace,key).toArray()[0];return row?JSON.parse(row.value):undefined;},
      set(key,value){sql.exec('INSERT INTO values_store(namespace,key,value) VALUES(?,?,?) ON CONFLICT(namespace,key) DO UPDATE SET value=excluded.value',namespace,key,JSON.stringify(value));},
      delete:key=>{if(typeof key==='string')sql.exec('DELETE FROM values_store WHERE namespace=? AND key=?',namespace,key);},
      clear:()=>sql.exec('DELETE FROM values_store WHERE namespace=?',namespace),
      *[Symbol.iterator](){for(const row of sql.exec('SELECT key,value FROM values_store WHERE namespace=?',namespace))yield [row.key,JSON.parse(row.value)];},
      get size(){return sql.exec('SELECT count(*) AS count FROM values_store WHERE namespace=?',namespace).one().count;},
    };
  }
  sessionStore(){
    const map=this.map('sessions');
    const valid=token=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
    return {
      get:token=>{if(!valid(token))return;const row=map.get(hash(token));return row?.expires>Date.now()?row:undefined;},
      set(token,value){if(!valid(token)||!Number.isSafeInteger(value.expires)||value.expires<=Date.now())throw Error('Invalid session.');for(const [key,row]of map)if(row.expires<=Date.now())map.delete(key);map.set(hash(token),value);},
      delete:token=>{if(valid(token))map.delete(hash(token));},clear:()=>map.clear(),
    };
  }
  recordAudit({requestId,actor='Streamer',action,outcome,status=null}){
    if(this.failed)throw Error('Storage is halted.');
    if(typeof action!=='string'||action.length>180||!['started','completed','rejected','interrupted'].includes(outcome))throw Error('Invalid audit record.');
    try{this.sql.exec('INSERT INTO audit_events(request_id,at,actor,action,outcome,status) VALUES(?,?,?,?,?,?)',requestId,Date.now(),actor,action,outcome,status);}
    catch{this.failed=true;throw Error('Audit storage failed; backend halted.');}
  }
  auditPage(before=Number.MAX_SAFE_INTEGER){
    const cursor=Number(before);if(!Number.isSafeInteger(cursor)||cursor<1)throw Error('Invalid audit cursor.');
    const events=this.sql.exec('SELECT id,request_id AS requestId,at,actor,action,outcome,status FROM audit_events WHERE id<? ORDER BY id DESC LIMIT 100',cursor).toArray();
    return {events,nextBefore:events.length===100?events.at(-1).id:null};
  }
  async project(){
    if(this.projecting)return this.projecting;
    this.projecting=(async()=>{
      let row=this.row();
      const projected=this.sql.exec('SELECT revision FROM projection WHERE id=1').toArray()[0]?.revision||0;
      if(!row||row.revision<=projected)return;
      await this.d1.prepare('INSERT INTO workspace_records(workspace_id,revision,state_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(workspace_id) DO UPDATE SET revision=excluded.revision,state_json=excluded.state_json,updated_at=excluded.updated_at WHERE excluded.revision>workspace_records.revision').bind(this.workspaceId,row.revision,row.state,Date.now()).run();
      this.sql.exec('INSERT INTO projection(id,revision) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision',row.revision);
      this.projectionError=null;
    })().catch(()=>{this.projectionError='D1 projection pending; authoritative workspace remains durable.';}).finally(()=>{this.projecting=null;});
    return this.projecting;
  }
  get projectionPending(){return (this.sql.exec('SELECT revision FROM projection WHERE id=1').toArray()[0]?.revision||0)<this.revision;}
  status(){return {backend:'durable-object-sqlite',schemaVersion:1,revision:this.revision,healthy:!this.failed,singleWriter:true,projectionPending:this.projectionPending,projectionError:this.projectionError||null};}
}
