import {randomBytes} from 'node:crypto';
import {requestAllowed,anonymousClientAddress} from '../runtime.mjs';
import {equal} from './response.mjs';

// One ingress/identity/audit policy for every Hono route. Transport metadata
// comes from the platform adapter, never from a caller-controlled identity field.
export function createRequestPolicy({runtime,auth,adminToken,agentToken,localHost,storage,engine,twitch,broadcast,isClosing=()=>false,clock=()=>Date.now(),report=console.error}){
  const buckets=new Map();let activeRequests=0;
  const middleware=async(c,next)=>{
    c.header('Cache-Control','no-store');
    c.header('X-Content-Type-Options','nosniff');
    c.header('Referrer-Policy','no-referrer');
    c.header('Permissions-Policy','camera=(self), microphone=(), geolocation=()');
    c.header('Content-Security-Policy',"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");
    const reply=(value,status=200)=>{const response=c.json(value,status);c.res=response;return response;};
    const req=c.get('request');
    if(isClosing())return reply({error:'Server is shutting down.'},503);
    if(!runtime.hosts.has(req.headers.host))return reply({error:'Untrusted request host.'},403);
    const url=new URL(c.req.url),path=url.pathname;
    const oauthReturn=req.method==='GET'&&['/auth/twitch/callback','/auth/twitch/handoff'].includes(path);
    if(!oauthReturn&&(req.method==='POST'||path.startsWith('/api/bootstrap')||path.startsWith('/auth/'))&&path!=='/api/stripe/webhook'&&!requestAllowed(req,runtime))return reply({error:'Cross-origin request rejected.'},403);
    activeRequests++;
    let settled=false,audit,recorded=false;
    const settle=()=>{if(!settled){settled=true;activeRequests--;}};
    const complete=({finished,status})=>{
      settle();
      if(!audit||recorded)return;
      recorded=true;
      try{storage.recordAudit({...audit,action:auditContext.action.slice(0,180),outcome:finished?(status>=400?'rejected':'completed'):'interrupted',status:finished?status:null});broadcast();}
      catch{engine.halted=true;report('Audit storage failed; backend halted.');}
    };
    req.onComplete?.(complete);
    const adminAccess=auth.valid(req)&&localHost(req)&&(equal(req.headers['x-autoloot-admin'],adminToken)||equal(url.searchParams.get('admin'),adminToken));
    const nftAgent=Boolean(agentToken()&&equal(req.headers['x-autoloot-nft-agent'],agentToken()));
    const auditContext={};
    c.set('prepared',{url,path,adminAccess,nftAgent,auditContext,settle});
    try{
      const auditRead=['/api/orders.csv','/api/fulfillment.csv','/api/pirateship.csv'];
      if((adminAccess||nftAgent&&path==='/api/nft/submit')&&(req.method==='POST'&&path!=='/api/stripe/webhook'||auditRead.includes(path)||path==='/auth/twitch'&&url.searchParams.get('role')==='streamer')){
        auditContext.action=req.method+' '+path.slice(0,160);
        audit={requestId:randomBytes(16).toString('hex'),actor:adminAccess?'Local streamer':'NFT agent'};
        storage.recordAudit({...audit,action:auditContext.action,outcome:'started'});
      }
      if(path==='/api/audit'&&req.method==='GET'){
        if(!adminAccess)return reply({error:'Streamer access required.'},403);
        return reply(storage.auditPage(url.searchParams.get('before')||undefined));
      }
      if(path==='/api/health')return reply({ok:!engine.halted&&!storage.failed,storage:'sqlite'},engine.halted||storage.failed?503:200);
      if((engine.halted||storage.failed)&&path.startsWith('/api/'))return reply({error:'Backend halted. No further sales are accepted; operator recovery required.'},503);
      const session=twitch.session(req.headers.cookie);
      c.get('prepared').session=session;
      if(req.method==='POST'&&path!=='/api/stripe/webhook'||path==='/auth/twitch'){
        const key=adminAccess?'admin':session?.id||anonymousClientAddress(req,runtime),now=clock();
        let bucket=buckets.get(key);
        if(!bucket||now-bucket.at>60000){
          if(buckets.size>=10000){
            for(const [k,v]of buckets)if(now-v.at>60000)buckets.delete(k);
            if(!buckets.has(key)&&buckets.size>=10000)return reply({error:'Request capacity reached. Try again later.'},429);
          }
          bucket={at:now,count:0};buckets.set(key,bucket);
        }
        if(++bucket.count>(adminAccess?180:60))return reply({error:'Too many requests. Try again in a minute.'},429);
      }
      await next();
    }finally{
      // Real Node completion runs after bytes are written; Fetch-only hosts
      // settle when the response is produced. SSE settles at registration.
      if(!req.onComplete)complete({finished:true,status:c.res.status});
    }
  };
  return {middleware,get activeRequests(){return activeRequests;}};
}
