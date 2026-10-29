import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {body,rawBody} from '../lib/http/response.mjs';
import {createCompanionActions} from '../lib/http/companion-actions.mjs';
import {bindingErrors} from '../scripts/lib/bindings.mjs';

test('JSON decoding preserves accented names and emoji at every byte boundary',async()=>{
 const expected={title:'Pokémon — フシギダネ 🌿',notes:'Crème brûlée'},bytes=Buffer.from(JSON.stringify(expected));
 for(let boundary=1;boundary<bytes.length;boundary++)assert.deepEqual(await body(Readable.from([bytes.subarray(0,boundary),bytes.subarray(boundary)])),expected);
 assert.deepEqual(await body(Readable.from([])),{});
 await assert.rejects(body(Readable.from([bytes]),bytes.length-1),/Request too large/);
 await assert.rejects(body(Readable.from([Buffer.from('{invalid}')])),SyntaxError);
 assert.deepEqual(await rawBody(Readable.from([...bytes].map(byte=>Buffer.from([byte]))),bytes.length,'large'),bytes);
});
test('rejected companion settings leave all state untouched and never commit or broadcast',async()=>{
 for(const provider of ['demo','invalid']){
  let saves=0,broadcasts=0;const engine={state:{mode:'live',companion:{provider:'offline',enabled:false,voice:false,lastSuccessAt:123,lastError:'prior'}},commit(){saves++;}};
  const before=structuredClone(engine.state),action=createCompanionActions({engine,broadcast:()=>broadcasts++});
  await assert.rejects(action({path:'/api/companion/settings',b:{provider,enabled:true,voice:true}}));
  assert.deepEqual(engine.state,before);assert.equal(saves,0);assert.equal(broadcasts,0);
 }
});
test('valid live and practice companion settings commit together and reset provider health only on change',async()=>{
 for(const [mode,provider]of [['live','codex'],['demo','demo']]){
  const saved=[];const engine={state:{mode,companion:{provider:'offline',enabled:false,lastSuccessAt:123,lastError:'prior'}},commit(){saved.push(structuredClone(this.state));}};
  const action=createCompanionActions({engine});
  await action({path:'/api/companion/settings',b:{provider,enabled:true,untrusted:'ignored'}});
  assert.equal(saved.length,1);assert.equal(saved[0].companion.enabled,true);assert.equal(saved[0].companion.provider,provider);assert.equal(saved[0].companion.lastSuccessAt,null);assert.equal(saved[0].companion.lastError,null);assert.equal(saved[0].companion.untrusted,undefined);
  engine.state.companion.lastSuccessAt=456;
  await action({path:'/api/companion/settings',b:{provider,voice:true}});assert.equal(engine.state.companion.lastSuccessAt,456);
 }
});
test('binding checks catch unresolved variables and direct initializer shadowing',()=>{
 assert.match(bindingErrors('export function run(){ return missingValue; }')[0].message,/Unresolved binding missingValue/);
 assert.match(bindingErrors('const clock=()=>1; function run(){const clock=clock(); return clock;}')[0].message,/before initialization/);
 assert.deepEqual(bindingErrors('const read=()=>later; const later=1; export {read};'),[]);
 assert.deepEqual(bindingErrors('export const read=()=>document.title;',{browser:true}),[]);
 assert.match(bindingErrors('export const read=()=>document.title;')[0].message,/document/);
 assert.deepEqual(bindingErrors("import {readFileSync} from 'node:fs'; export const read=()=>readFileSync('file');"),[]);
});
test('password meter checks agree with server validation, including whitespace and length limits',async()=>{
 const {passwordChecks,passwordError}=await import('../public/admin-credentials.js');
 for(const password of ['', 'short', 'StrongPass123 ', 'StrongPass123!', 'A'.repeat(257)+'a1!']){
  const checks=passwordChecks(password);assert.equal(checks.length,5);
  assert.equal(checks.every(check=>check.met),passwordError(password)==='');
 }
 assert.equal(passwordChecks('').filter(check=>check.met).length,0);
 assert.equal(passwordChecks('StrongPass123!').filter(check=>check.met).length,5);
 assert.equal(passwordChecks('StrongPass123 ')[4].met,false);
});
