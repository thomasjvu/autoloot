import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Storage} from '../lib/persistence/storage.mjs';
import {emptyWorkspace} from '../lib/commerce/workspace.mjs';

test('audit records persist independently of workspace activity trimming and page without duplicates',()=>{
 const dir=mkdtempSync(join(tmpdir(),'autoloot-audit-'));let storage=new Storage(dir);
 try{
  for(let i=0;i<105;i++)storage.recordAudit({requestId:'request-'+i,action:'POST /api/products',outcome:'completed',status:200});
  const state=emptyWorkspace();state.activity=[];storage.save(state);storage.close();storage=new Storage(dir);
  const first=storage.auditPage(),second=storage.auditPage(first.nextBefore);
  assert.equal(first.events.length,100);assert.equal(second.events.length,5);
  assert.equal(new Set([...first.events,...second.events].map(event=>event.id)).size,105);
  assert.throws(()=>storage.auditPage(-1),/cursor/);
  storage.recordAudit({requestId:'interrupted-request',action:'POST /api/companion/ask',outcome:'started'});
  storage.close();storage=new Storage(dir);
  const recovered=storage.auditPage().events.filter(event=>event.requestId==='interrupted-request');
  assert.deepEqual(recovered.map(event=>event.outcome),['interrupted','started']);
 }finally{storage.close();rmSync(dir,{recursive:true,force:true});}
});
