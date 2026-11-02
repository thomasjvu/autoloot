import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cssRules,withoutComments,removeShadowedRootProperties} from '../scripts/check/lib/css-structure.mjs';
const styles=new URL('../public/styles/',import.meta.url);
test('ordered feature imports preserve the reviewed cascade and own every stylesheet exactly once',()=>{
 const entry=readFileSync(new URL('app.css',styles),'utf8');
 const imports=[...entry.matchAll(/@import url\('\.\/([^']+)'\);/g)].map(m=>m[1]);
 assert.equal(new Set(imports).size,imports.length);
 assert.deepEqual([...imports].sort(),readdirSync(styles).filter(name=>name.endsWith('.css')&&name!=='app.css').sort());
 const source=imports.map(name=>readFileSync(new URL(name,styles),'utf8')).join('\n');
 const signature=createHash('sha256').update(withoutComments(source).replace(/\s+/g,' ').trim()).digest('hex');
 const baseline=JSON.parse(readFileSync(new URL('./fixtures/css-cascade.json',import.meta.url)));
 assert.equal(signature,baseline.sha256,'Style behavior changed: review selectors, declarations and order before updating the baseline.');
 assert.ok(cssRules(source).length>600);
});
test('CSS reader preserves nested rules, comments, strings and semicolons',()=>{
 const source='/* comment { } */:root {--color:red;} @media (max-width:1px){.x{content:"};";}}';
 assert.equal(cssRules(source).length,2);
 assert.throws(()=>cssRules('.x{color:red;'),/Incomplete/);
 const pruned=removeShadowedRootProperties(':root{--color:red;color:var(--color);}@media(x){:root{--color:blue;}}:root{--color:green;}');
 assert.doesNotMatch(pruned,/--color:red/);assert.match(pruned,/--color:blue/);assert.match(pruned,/--color:green/);assert.match(pruned,/color:var\(--color\)/);
});
