import {createInterface} from 'node:readline/promises';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CodexConnection} from '../lib/codex-connection.mjs';
import {Vision} from '../lib/vision.mjs';
import {codexReply} from '../lib/companion.mjs';
const origin=new URL(process.argv[2]||'');
if(origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||!(origin.protocol==='https:'||origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)))throw Error('Supply the HTTPS workspace origin.');
const cli=new CodexConnection(),terminal=createInterface({input:process.stdin,output:process.stdout});
let token,stopping=false;
const call=async(path,input)=>{
  const r=await fetch(new URL(path,origin),{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(input),signal:AbortSignal.timeout(15000)});
  const data=await r.json();if(!r.ok)throw Error(data.error||`Workspace returned ${r.status}.`);return data;
};
try{
  const account=await cli.status();if(!account.connected)throw Error('Run codex login on this computer first.');
  const code=await terminal.question('One-time pairing code from the workspace: ');terminal.close();
  ({token}=await call('/api/bridge/claim',{code:code.trim(),connected:true}));
  console.log('Local Codex companion connected. Requests require creator review in the workspace.');
  process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
  while(!stopping){
    const {job}=await call('/api/bridge/poll',{connected:true});
    if(job){
      const dir=mkdtempSync(join(tmpdir(),'autoloot-bridge-'));
      try{
        let imagePath;
        if(job.image){if(!/^(?:[a-f0-9]+|frame)\.(png|jpg|webp)$/.test(job.image.name)||job.image.bytes.length>5*1024*1024)throw Error('Invalid companion image.');imagePath=join(dir,job.image.name);writeFileSync(imagePath,Buffer.from(job.image.bytes,'base64'),{mode:0o600});}
        const reply=job.kind==='vision'?await new Vision().observe(Buffer.from(job.image.bytes,'base64'),'local'):await codexReply(job.prompt,job.state,{imagePath});
        await call('/api/bridge/result',{id:job.id,lease:job.lease,reply});
      }catch{await call('/api/bridge/result',{id:job.id,lease:job.lease,error:true});}
      finally{rmSync(dir,{recursive:true,force:true});}
    }
    if(!stopping)await new Promise(resolve=>setTimeout(resolve,3000));
  }
}catch(error){console.error(error.message);process.exitCode=1;}
finally{terminal.close();cli.close();}
