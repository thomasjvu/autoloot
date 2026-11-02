import {Hono} from 'hono';
import {randomBytes,createHash} from 'node:crypto';
import {parseObservation} from '../lib/integrations/vision.mjs';
import {body,equal} from '../lib/http/response.mjs';
const digest=value=>createHash('sha256').update(value).digest('hex');
const id=()=>randomBytes(24).toString('hex');
export function createHostedBridge({storage,media,base}){
  const config=storage.map('bridge'),jobs=storage.map('bridge-jobs');
  const active=()=>{const session=config.get('session');return session?.expires>Date.now()?session:null;};
  const authorize=c=>{const token=c.req.header('authorization')?.replace(/^Bearer /,'');const session=active();return token&&session&&equal(digest(token),session.hash)?session:null;};
  const connection={
    async status(){const session=active(),pending=config.get('pair');return {bridge:true,connected:Boolean(session&&Date.now()-session.lastSeen<20000&&session.connected),method:'Local Codex',pending:Boolean(pending?.expires>Date.now())};},
    async start(){const code=id();config.set('pair',{hash:digest(code),expires:Date.now()+600000});return {bridge:true,connected:false,pending:true,pairCode:code,command:`npm run companion:connect -- ${base}`,expiresAt:Date.now()+600000};},
    async cancel(){config.clear();jobs.clear();return {ok:true};},
    async apiKey(){throw Error('Configure Codex credentials on your local companion computer.');},
  };
  const router=new Hono();
  router.post('/api/bridge/claim',async c=>{
    const input=await body(c.req.raw),pending=config.get('pair');
    if(typeof input.code!=='string'||!pending||pending.expires<=Date.now()||!equal(digest(input.code),pending.hash))return c.json({error:'Pairing code is invalid or expired.'},403);
    config.delete('pair');jobs.clear();const token=id();
    config.set('session',{hash:digest(token),expires:Date.now()+12*3600000,lastSeen:Date.now(),connected:input.connected===true});
    return c.json({token,expiresAt:Date.now()+12*3600000});
  });
  router.post('/api/bridge/poll',async c=>{
    const session=authorize(c);if(!session)return c.json({error:'Companion authorization expired. Pair again.'},403);
    const input=await body(c.req.raw);session.lastSeen=Date.now();session.connected=input.connected===true;config.set('session',session);
    for(const [key,job]of jobs){
      if(job.expires<=Date.now()){jobs.delete(key);continue;}
      if(job.status!=='pending')continue;
      job.status='leased';job.lease=id();jobs.set(key,job);
      return c.json({job:{id:key,lease:job.lease,kind:job.kind||'reply',prompt:job.prompt,state:job.state,image:job.image||null}});
    }
    return c.json({job:null});
  });
  router.post('/api/bridge/result',async c=>{
    if(!authorize(c))return c.json({error:'Companion authorization expired. Pair again.'},403);
    const input=await body(c.req.raw,64000),job=jobs.get(input.id);
    if(!job||job.status!=='leased'||job.expires<=Date.now()||!equal(input.lease,job.lease))return c.json({error:'Companion job is no longer available.'},409);
    if(input.error)job.error='Local Codex could not complete this request.';
    else if(job.kind==='vision'){job.reply=parseObservation(JSON.stringify(input.reply));}
    else{
      const reply=input.reply;
      if(!reply||typeof reply.message!=='string'||reply.message.length>10000||!['none','start-next','pause','resume','draft-product','search-catalog','select-catalog'].includes(reply.action))return c.json({error:'Invalid companion reply.'},400);
      job.reply={message:reply.message,action:reply.action,productId:reply.productId,draftProduct:reply.draftProduct};
    }
    job.status='completed';jobs.set(input.id,job);return c.json({ok:true});
  });
  const runtime={async reply(prompt,state,{imagePath}={}){
    if(!(await connection.status()).connected)throw Error('Pair and start the local Codex companion first.');
    const safe={mode:state.mode,show:state.show,companion:state.companion,products:state.products,auction:state.auction,orders:state.orders.map(({number,status,amount,mode})=>({number,status,amount,mode})),catalog:state.catalog};
    let image=null;
    if(imagePath){const bytes=await media.read(imagePath.slice(3));if(!bytes)throw Error('Photo not found.');image={bytes:Buffer.from(bytes).toString('base64'),name:imagePath.slice(3)};}
    return enqueue({kind:'reply',prompt,state:safe,image});
  },async observe(image){
    if(!(await connection.status()).connected)throw Error('Pair the local companion to use local vision.');
    return enqueue({kind:'vision',image:{bytes:Buffer.from(image).toString('base64'),name:'frame.jpg'}});
  }};
  async function enqueue(input){
    const key=id(),job={...input,status:'pending',expires:Date.now()+120000};
    if(Buffer.byteLength(JSON.stringify(job))>1500000)throw Error('Companion request too large. Use a smaller image or reduce inventory context.');
    jobs.set(key,job);
    try{
      while(Date.now()<job.expires){
        const result=jobs.get(key);
        if(!result)throw Error('Companion disconnected.');
        if(result.status==='completed'){if(result.error)throw Error(result.error);return result.reply;}
        await new Promise(resolve=>setTimeout(resolve,500));
      }
      throw Error('Local companion timed out.');
    }finally{jobs.delete(key);}
  }
  return {router,connection,runtime};
}
