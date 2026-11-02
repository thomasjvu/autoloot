import {bindingErrors} from './lib/bindings.mjs';
import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {join,resolve,dirname,relative} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'../..');
const skip=new Set(['node_modules','dist','vendor','fonts','characters','icons']);
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>skip.has(entry.name)?[]:entry.isDirectory()?walk(join(dir,entry.name)):/\.(mjs|js)$/.test(entry.name)?[join(dir,entry.name)]:[]);}
const files=[join(root,'server.mjs'),...['lib','public','scripts','apps/marketing','browser','cloudflare'].flatMap(dir=>walk(join(root,dir)))];
let failed=false;
const graph=new Map();
for(const file of files){
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 if(result.status!==0){process.stderr.write(result.stderr);failed=true;}
 const source=readFileSync(file,'utf8');graph.set(file,[]);
 if(result.status===0){
  for(const issue of bindingErrors(source,{browser:file.startsWith(join(root,'public')+'/')||file.startsWith(join(root,'browser')+'/')})){
   console.error(`${relative(root,file)}:${issue.line}: ${issue.message}`);failed=true;
  }
 }
 const imports=[...source.matchAll(/\b(?:import|export)\s+(?:[^;'"]+?\s+from\s*)?['"]([^'"]+)['"]/g),...source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)];
 for(const [,specifier] of imports){
  if(!specifier.startsWith('.')&&!specifier.startsWith('/'))continue;
  const target=specifier.startsWith('/')?join(root,'public',specifier):resolve(dirname(file),specifier);
  graph.get(file).push(target);
  if(!existsSync(target)||!statSync(target).isFile()){console.error(`${relative(root,file)}: missing local import ${specifier}`);failed=true;}
  if(file.startsWith(join(root,'public')+'/')&&!target.startsWith(join(root,'public')+'/')){console.error(`${relative(root,file)}: browser import escapes public/`);failed=true;}
 }
}
const visited=new Set(),active=new Set();
function visit(file){
 if(active.has(file)){console.error('Local import cycle at',relative(root,file));failed=true;return;}
 if(visited.has(file))return;visited.add(file);active.add(file);
 for(const target of graph.get(file)||[])visit(target);
 active.delete(file);
}
for(const file of files)visit(file);
function buyerBoundary(file,seen=new Set()){
 if(seen.has(file))return;seen.add(file);
 for(const target of graph.get(file)||[]){
  if(target.startsWith(join(root,'public/workspace')+'/')||['rip.js','admin-login.js'].includes(relative(join(root,'public'),target))){console.error('Buyer/overlay import reaches administrator or capture controller:',relative(root,target));failed=true;}
  buyerBoundary(target,seen);
 }
}
for(const entry of ['storefront.js','overlay-widgets.js'])buyerBoundary(join(root,'public',entry));
const entry=readFileSync(join(root,'public/styles/app.css'),'utf8');
for(const [,path]of entry.matchAll(/@import\s+url\(['"]([^'"]+)['"]\)/g))if(!existsSync(resolve(root,'public/styles',path))){console.error('Missing stylesheet:',path);failed=true;}
for(const name of readdirSync(join(root,'public')).filter(name=>name.endsWith('.html'))){const html=readFileSync(join(root,'public',name),'utf8');if(/href=["']\/(?:style|drop|street|drop-shop)\.css/.test(html)){console.error('Historical stylesheet entry in',name);failed=true;}}
if(failed)process.exitCode=1;else console.log(`Checked ${files.length} runtime modules: syntax, lexical bindings, local imports and stylesheet entry points.`);
