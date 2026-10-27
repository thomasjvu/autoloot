import {randomBytes} from 'node:crypto';
import {requestAllowed,anonymousClientAddress} from '../runtime.mjs';
import {equal,json} from './response.mjs';

// Ordered common policy: ingress -> request accounting -> identity -> audit ->
// diagnostic exceptions -> halted gate -> session -> rate limit -> domain dispatch.
// Route groups must only be invoked after both phases return a context.
export function createRequestPolicy({runtime,auth,adminToken,agentToken,localHost,storage,engine,twitch,broadcast,clock=()=>Date.now(),report=console.error}) {
 const buckets=new Map();let activeRequests=0;
 function begin(req,res,isClosing=false) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
  );
  if (isClosing) return json(res,{error:'Server is shutting down.'},503);
  if (!runtime.hosts.has(req.headers.host)) return json(res,{error:'Untrusted request host.'},403);
  const oauthReturn=req.method==='GET' && ['/auth/twitch/callback','/auth/twitch/handoff'].includes(req.url?.split('?')[0]);
  if (!oauthReturn && (req.method === 'POST' || req.url?.startsWith('/api/bootstrap') || req.url?.startsWith('/auth/')) && req.url !== '/api/stripe/webhook' && !requestAllowed(req,runtime))
    return json(res,{error:'Cross-origin request rejected.'},403);
  activeRequests++;
  let settled=false;
  const settle=()=>{if(!settled){settled=true;activeRequests--;}};
  res.once('finish',settle);res.once('close',settle);
  let url;
  try { url = new URL(req.url, "http://localhost"); }
  catch { return json(res,{error:"Invalid request URL."},400); }
  const path = url.pathname;
  const adminAccess = auth.valid(req) && localHost(req) && (equal(req.headers['x-autoloot-admin'],adminToken) || equal(url.searchParams.get('admin'),adminToken));
  const nftAgent=Boolean(agentToken() && equal(req.headers['x-autoloot-nft-agent'],agentToken()));
  const auditContext={};
  return {req,res,url,path,adminAccess,nftAgent,auditContext,settle};
 }
 function prepare(context){
  const {req,res,url,path,adminAccess,nftAgent,auditContext}=context;
    const auditRead=['/api/orders.csv','/api/fulfillment.csv','/api/pirateship.csv'];
    if((adminAccess || nftAgent&&path==='/api/nft/submit') && (req.method==='POST'&&path!=='/api/stripe/webhook'||auditRead.includes(path)||path==='/auth/twitch'&&url.searchParams.get('role')==='streamer')){
      const requestId=randomBytes(16).toString('hex'),action=req.method+' '+path.slice(0,160);
      auditContext.action=action;
      storage.recordAudit({requestId,actor:adminAccess?'Local streamer':'NFT agent',action,outcome:'started'});
      let recorded=false;
      const complete=()=>{
        if(recorded)return;recorded=true;
        try{storage.recordAudit({requestId,actor:adminAccess?'Local streamer':'NFT agent',action:auditContext.action.slice(0,180),outcome:res.writableFinished?(res.statusCode>=400?'rejected':'completed'):'interrupted',status:res.writableFinished?res.statusCode:null});broadcast();}
        catch{engine.halted=true;report('Audit storage failed; backend halted.');}
      };
      res.once('finish',complete);res.once('close',complete);
    }
    if(path==='/api/audit' && req.method==='GET'){
      if(!adminAccess)return json(res,{error:'Streamer access required.'},403);
      return json(res,storage.auditPage(url.searchParams.get('before')||undefined));
    }
    if (path === "/api/health") return json(res, {ok:!engine.halted && !storage.failed, storage:"sqlite"}, engine.halted || storage.failed ? 503 : 200);
    if ((engine.halted || storage.failed) && path.startsWith("/api/")) return json(res, {error:"Backend halted. No further sales are accepted; operator recovery required."},503);
    const session = twitch.session(req.headers.cookie);
    if ((req.method === "POST" && path !== "/api/stripe/webhook") || path === "/auth/twitch") {
      const key = adminAccess
        ? "admin"
        : session?.id || anonymousClientAddress(req,runtime);
      const now = clock();
      let bucket = buckets.get(key);
      if (!bucket || now - bucket.at > 60000) {
        if(buckets.size >= 10000) {
          for (const [k,v] of buckets) if(now-v.at>60000)buckets.delete(k);
          if(!buckets.has(key) && buckets.size>=10000)return json(res,{error:'Request capacity reached. Try again later.'},429);
        }
        bucket = { at: now, count: 0 };
        buckets.set(key, bucket);
      }
      if (++bucket.count > (adminAccess ? 180 : 60))
        return json(
          res,
          { error: "Too many requests. Try again in a minute." },
          429,
        );
    }
  return {...context,session};
 }
 return {begin,prepare,get activeRequests(){return activeRequests;}};
}
