import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,extname,sep} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url)),dist=resolve(root,'dist');
const port=Number(process.env.MARKETING_PORT||4174);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid MARKETING_PORT.');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
let builtAt=0;
async function rebuild(){
 const latest=Math.max(...await Promise.all(['index.html','styles.css','build.mjs','_headers'].map(async f=>(await stat(resolve(root,f))).mtimeMs)));
 if(latest<=builtAt)return;
 const result=spawnSync(process.execPath,[resolve(root,'build.mjs')],{stdio:'inherit'});
 if(result.status!==0)throw Error('Marketing build failed.');
 builtAt=latest;
}
await rebuild();
createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  await rebuild();
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(dist,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(dist+sep)){res.writeHead(403);res.end();return;}
  let body,status=200;
  try{body=await readFile(file);}catch{status=404;body=await readFile(resolve(dist,'404.html'));}
  res.writeHead(status,{'Content-Type':status===404?'text/html; charset=utf-8':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(500);res.end('Marketing preview failed. Check the terminal.');}
}).listen(port,'127.0.0.1',()=>console.log(`Marketing: http://localhost:${port} (source edits rebuild on refresh)`));
