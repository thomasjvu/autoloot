import {rawBody} from './response.mjs';
import {randomBytes,scryptSync,timingSafeEqual,createHmac} from 'node:crypto';
// Workers permits cryptographic randomness in request context, not module scope.
let key;
const sign=value=>createHmac('sha256',key??=randomBytes(32)).update(value).digest('hex');
export function configureStore(engine,input){
 if(['live','paused'].includes(engine.state.auction?.status)||['running','paused'].includes(engine.state.run?.status))throw Error('Finish the auction and stop the run first.');
 const current=engine.state.storeAccess||{};
 let password=current.password;
 if(input.removePassword===true)password=null;
 else if(input.password){if(typeof input.password!=='string'||input.password.length<8||input.password.length>128)throw Error('Use a store password of 8–128 characters.');const salt=randomBytes(24).toString('hex');password={salt,hash:scryptSync(input.password,salt,32).toString('hex')};}
 engine.state.storeAccess={draft:input.draft===true,password};engine.commit();
}
export function storeAccessMiddleware({engine,auth,localHost,events}){
 const failures=new Map();
 return async(c,next)=>{
 const path=c.req.path,req=c.get('request'),access=engine.state.storeAccess||{};
 const admin=auth.valid(req)&&localHost(req);
 const lock=()=>c.html(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Private store · Autoloot</title><link rel="stylesheet" href="/styles/app.css"></head><body><main class="legal-page"><h1>Private store</h1><form method="post" action="/store/unlock" class="stack-form"><label>Store password<input name="password" type="password" required maxlength="128" autocomplete="current-password"></label><button class="btn primary">Enter store</button></form></main></body></html>`,401);
 if(path==='/store/unlock'&&c.req.method==='POST'){
  if(!access.password)return c.redirect('/shop');
  const id=req.socket?.remoteAddress||'unknown',now=Date.now();let bucket=failures.get(id);
  if(!bucket||now-bucket.at>900000){if(failures.size>=10000){for(const [k,v]of failures)if(now-v.at>900000)failures.delete(k);if(failures.size>=10000)return c.text('Store access is busy. Try later.',429);}bucket={at:now,count:0};failures.set(id,bucket);}
  if(++bucket.count>8)return c.text('Too many attempts. Try again in 15 minutes.',429);
  const bytes=await rawBody(c.req.raw,2048,'Password form too large.');
  const form=new URLSearchParams(bytes.toString('utf8')),password=String(form.get('password')||'');
  if(password.length>128)return lock();
  const valid=timingSafeEqual(scryptSync(password,access.password.salt,32),Buffer.from(access.password.hash,'hex'));
  if(!valid)return lock();
  const value=String(now+12*3600000),token=value+'.'+sign(value+access.password.hash);
  c.header('Set-Cookie',`autoloot_store=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${req.socket.encrypted?'; Secure':''}`);return c.redirect('/shop');
 }
 const protectedPath=path==='/shop'||path==='/api/state'||path==='/api/events'||path.startsWith('/api/viewer');
 if(!admin&&access.password&&protectedPath){
  const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('autoloot_store='))?.slice(15)||'';
  const [expiry,signature]=token.split('.'),expected=sign(expiry+access.password.hash);
  if(!(/^\d+$/.test(expiry||'')&&Number(expiry)>Date.now()&&/^[a-f0-9]{64}$/.test(signature||'')&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected))))return path==='/shop'?lock():c.json({error:'Store password required.'},401);
 }
 if(access.draft&&c.req.method==='POST'){
  const blocked=path.startsWith('/api/viewer/')&&!/\/(shipping|profile)$/.test(path)||['/api/shipping/buy','/api/shipping/dispatch','/api/nft/authorize','/api/nft/submit','/api/nft/demo-deliver','/api/giveaway/dispatch','/api/run/start','/api/auction/start'].includes(path);
  if(blocked)return c.json({error:'Store is in draft mode. Purchases and fulfillment are paused.'},403);
 }
 await next();
 };
}
