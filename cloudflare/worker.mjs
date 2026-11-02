import {featureFlags} from '../lib/commerce/features.mjs';
import {DurableObject} from 'cloudflare:workers';
import {Hono} from 'hono';
import Stripe from 'stripe';
import {randomBytes} from 'node:crypto';
import {createHttpApp} from '../lib/http/app.mjs';
import {createRequestPolicy} from '../lib/http/policy.mjs';
import {createEventHub} from '../lib/http/events.mjs';
import {createProjections} from '../lib/http/projections.mjs';
import {runtimeConfig} from '../lib/platform/runtime.mjs';
import {Engine} from '../lib/commerce/engine.mjs';
import {emptyWorkspace} from '../lib/commerce/workspace.mjs';
import {Metadata} from '../lib/integrations/rip.mjs';
import {Catalog} from '../lib/integrations/catalog.mjs';
import {RipSession} from '../lib/commerce/rip-session.mjs';
import {Vision} from '../lib/integrations/vision.mjs';
import {Twitch} from '../lib/integrations/twitch.mjs';
import {Payments} from '../lib/integrations/payments.mjs';
import {Shipping} from '../lib/integrations/shipping.mjs';
import {NftDelivery,walletBridge} from '../lib/commerce/nft.mjs';
import {SolanaCheckout} from '../lib/integrations/solana-checkout.mjs';
import {Runs} from '../lib/commerce/runs.mjs';
import {DurableStorage} from './storage.mjs';
import {createHostedBridge} from './bridge.mjs';

const front=new Hono();
front.all('*',async c=>{
  const env=c.env;
  // Explicit provisioning mode never initializes a workspace or accepts sales.
  if(env.AUTOLOOT_SETUP_ONLY==='1'){
    c.header('Cache-Control','no-store');
    c.header('X-Content-Type-Options','nosniff');
    c.header('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    if(c.req.method==='GET'&&new URL(c.req.url).pathname==='/')return c.html('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Autoloot — Setup</title><main><h1>Autoloot is being set up.</h1><p>This workspace is not open yet. Please check back later.</p></main></html>',503);
    return c.json({ok:false,error:'Workspace setup is incomplete. Access is disabled.'},503);
  }
  if(!env.PUBLIC_URL||!env.AUTOLOOT_WORKSPACE_ID||!/^\d+$/.test(env.AUTOLOOT_OWNER_TWITCH_ID||''))return c.json({error:'Hosted workspace origin and owner are not configured.'},503);
  if(new URL(c.req.url).origin!==new URL(env.PUBLIC_URL).origin)return c.json({error:'Untrusted request host.'},403);
  // No tenant or peer identity is taken from client-supplied internal headers.
  const headers=new Headers(c.req.raw.headers);
  headers.delete('x-autoloot-peer');headers.delete('x-autoloot-workspace');
  headers.set('x-autoloot-peer',c.req.header('cf-connecting-ip')||'unknown');
  const stub=env.WORKSPACES.get(env.WORKSPACES.idFromName(env.AUTOLOOT_WORKSPACE_ID));
  return stub.fetch(new Request(c.req.raw,{headers}));
});
export default front;

export class Workspace extends DurableObject{
  constructor(ctx,env){
    super(ctx,env);this.ctx=ctx;this.env=env;
    ctx.blockConcurrencyWhile(async()=>this.initialize());
  }
  initialize(){
    const env=this.env,base=new URL(env.PUBLIC_URL).origin,workspaceId=env.AUTOLOOT_WORKSPACE_ID;
    const storage=this.storage=new DurableStorage(this.ctx.storage,env.DB,workspaceId),runtimeValues=storage.map('runtime');
    this.configuration=storage.map('configuration');
    let stateFor;
    const events=this.events=createEventHub({stateFor:role=>stateFor(role),adminValid:req=>auth.valid(req)});
    const broadcast=()=>events.broadcast();
    const engine=this.engine=new Engine(storage.load(emptyWorkspace()),{features:featureFlags(env),save:state=>storage.save(state),onChange:()=>{broadcast();this.ctx.waitUntil(this.schedule());}});
    const sessions=storage.sessionStore();
    const twitchConfig=this.configuration.get('twitch');
    const twitchEnv={...env,...(twitchConfig?{TWITCH_CLIENT_ID:twitchConfig.clientId,TWITCH_CLIENT_SECRET:twitchConfig.clientSecret}:{})};
    const twitch=this.twitch=new Twitch(engine,broadcast,sessions,{env:twitchEnv,connectOnLogin:false,authorizeStreamer:async identity=>{
      if(identity.id!==env.AUTOLOOT_OWNER_TWITCH_ID)throw Error('This Twitch account does not own this workspace.');
      await env.DB.prepare("INSERT INTO workspace_accounts(workspace_id,twitch_user_id,login,role,updated_at) VALUES(?,?,?,'owner',?) ON CONFLICT(workspace_id,twitch_user_id) DO UPDATE SET login=excluded.login,updated_at=excluded.updated_at").bind(workspaceId,identity.id,identity.login,Date.now()).run();
      runtimeValues.set('owner',identity);
    },onTokens:tokens=>tokens?runtimeValues.set('twitch',tokens):runtimeValues.delete('twitch')});
    twitch.pending=storage.map('oauth');
    const saved=runtimeValues.get('twitch');
    if(saved){twitch.tokens=saved.tokens;twitch.user=saved.user;twitch.status.channel=saved.user.login;}
    const auth={loginPath:'/auth/twitch?role=streamer',get username(){return runtimeValues.get('owner')?.login||null;},valid(req){const user=twitch.session(req.headers.cookie);return user?.role==='streamer'&&user.id===env.AUTOLOOT_OWNER_TWITCH_ID;}};
    const canManage=req=>auth.valid(req);
    let admin=runtimeValues.get('admin');if(!admin){admin=randomBytes(32).toString('hex');runtimeValues.set('admin',admin);}
    const metadata=new Metadata({base:env.METADATA_API_URL||'https://metadata.fyi',key:env.METADATA_SERVICE_KEY||'',mode:env.METADATA_MODE||'auto'});
    const catalog=new Catalog(metadata);
    const media={
      async read(name){const item=await env.MEDIA.get(workspaceId+'/'+name);return item?new Uint8Array(await item.arrayBuffer()):null;},
      async write(name,bytes){await env.MEDIA.put(workspaceId+'/'+name,bytes,{httpMetadata:{contentType:name.endsWith('.png')?'image/png':name.endsWith('.jpg')?'image/jpeg':'image/webp'}});},
      async exists(name){return Boolean(await env.MEDIA.head(workspaceId+'/'+name));},
      path:name=>'r2:'+name,
    };
    const assets={async read(path){const response=await env.ASSETS.fetch(new Request(new URL(path,base)));return response.status===200?{body:new Uint8Array(await response.arrayBuffer()),type:response.headers.get('content-type')}:null;},async readDocs(){return null;}};
    const bridge=this.bridge=createHostedBridge({storage,media,base});
    const cloudVision=new Vision({key:env.PRIME_API_KEY||'',teamId:env.PRIME_TEAM_ID||'',primeModel:env.PRIME_VISION_MODEL||'moondream/moondream3.1-9b-a2b'});
    const vision={mode:c=>cloudVision.mode(c),status:c=>cloudVision.status(c),observe:(image,mode)=>mode==='local'?bridge.runtime.observe(image):cloudVision.observe(image,mode)};
    const rip=new RipSession(engine,metadata,vision);
    const shipping=new Shipping(engine,{token:env.SHIPPO_API_TOKEN||this.configuration.get('shipping')?.token||''});
    const stripe=env.STRIPE_API_KEY?new Stripe(env.STRIPE_API_KEY,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2,timeout:15000}):null;
    const payments=this.payments=new Payments(engine,{key:env.STRIPE_API_KEY||'',secret:env.STRIPE_WEBHOOK_SECRET||'',base,client:stripe,countries:(env.SHIPPING_COUNTRIES||'US').split(',').map(s=>s.trim()).filter(Boolean)});
    payments.webhook=async(raw,signature)=>{
      if(!stripe||!payments.secret)throw Error('Webhooks are not configured.');
      let event;try{event=await stripe.webhooks.constructEventAsync(raw,signature,payments.secret,undefined,Stripe.createSubtleCryptoProvider());}catch{throw Error('Invalid Stripe signature.');}
      return payments.applyWebhook(event);
    };
    const nft=this.nft=new NftDelivery(engine,{rpc:JSON.parse(env.NFT_RPC_CONFIG||'{}'),adapter:walletBridge(env.NFT_WALLET_URL,env.NFT_WALLET_TOKEN)});
    const solanaCheckout=new SolanaCheckout(engine,{env});payments.status.wallet=solanaCheckout.status;
    const companion={proposal:null,busy:false};
    stateFor=createProjections({engine,nft,shipping,storage,payments,twitch,rip,catalog,metadata,companion,adminAuth:auth});
    const announce=async message=>{if(engine.state.mode==='live')try{await twitch.send(message);}catch{engine.activity('Twitch announcement failed. Check your connection.','error');engine.commit();}};
    const runs=this.runs=new Runs(engine,{connected:()=>twitch.status.connected,checkoutReady:()=>payments.status.configured,nftReady:chain=>nft.configured(chain)&&Boolean(nft.adapter),deliverNft:(id,policy)=>nft.authorize(id,policy)});
    // A disconnected/restarted runtime never accepts bids until Twitch recovers.
    if(engine.state.auction?.status==='live'){engine.pause();engine.activity('Hosted runtime restarted; review and reconnect before resuming.');engine.commit();}
    runs.recover();
    const authRoutes=new Hono();
    authRoutes.all('/api/admin/status',c=>c.json({configured:true,authenticated:auth.valid(c.get('request')),legacyPasswordOnly:false,hosted:true}));
    authRoutes.post('/api/admin/logout',c=>{
      const req=c.get('request');if(!auth.valid(req))return c.json({error:'Admin sign-in required.'},401);
      twitch.logout(req.headers.cookie);for(const client of events.clients)if(client.role==='admin'&&!auth.valid(client.request))client.close();
      c.header('Set-Cookie','autoloot_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');return c.json({ok:true});
    });
    for(const path of ['/api/admin/setup','/api/admin/login'])authRoutes.post(path,c=>c.json({error:'Hosted workspaces use Twitch owner sign-in.'},400));
    const platformRoutes=new Hono();
    platformRoutes.get('/admin-login.html',c=>c.redirect('/auth/twitch?role=streamer',302));
    platformRoutes.route('/',bridge.router);
    const runtime=runtimeConfig({PUBLIC_URL:base,NODE_ENV:'production'});
    const policy=createRequestPolicy({runtime,auth,adminToken:admin,agentToken:()=>env.NFT_AGENT_TOKEN,localHost:canManage,storage,engine,twitch,broadcast});
    this.app=createHttpApp({policy,requestContext:c=>({method:c.req.method,url:new URL(c.req.url).pathname,headers:{...Object.fromEntries(c.req.raw.headers),host:new URL(c.req.url).host},socket:{remoteAddress:c.req.header('x-autoloot-peer')||'unknown',encrypted:new URL(c.req.url).protocol==='https:'}}),hosted:true,auth,authRoutes,platformRoutes,events,admin,port:443,base,engine,twitch,payments,nft,shipping,runs,catalog,rip,metadata,stateFor,localHost:canManage,broadcast,announce,companion,codexConnection:bridge.connection,companionRuntime:bridge.runtime,canStartStreamerLogin:()=>true,onStreamerLogin:()=>{this.ctx.waitUntil(twitch.connect().catch(()=>{twitch.status.error='Twitch chat could not connect. Reconnect from Settings.';broadcast();}));},oauthHandoffs:storage.map('handoffs'),storage,solanaCheckout,media,assets,configuration:{write:async(name,value)=>this.configuration.set(name,value)}});
    this.ctx.waitUntil(this.schedule());
  }
  async schedule(){
    const state=this.engine.state,times=[];
    if(state.auction?.status==='live')times.push(state.auction.endsAt);
    if(state.vote?.status==='open')times.push(state.vote.endsAt);
    if(state.giveaway?.status==='open')times.push(state.giveaway.endsAt);
    for(const o of state.orders)if(o.status==='pending'&&!o.checkoutId&&!o.checkoutCreated&&Number.isFinite(o.reservationExpiresAt))times.push(o.reservationExpiresAt);
    if(state.run?.status==='running'||state.orders.some(o=>o.delivery&&['queued','submitting','submitted','reconciling'].includes(o.delivery.status)))times.push(Date.now()+2000);
    if(this.storage.projectionPending)times.push(Date.now()+10000);
    if(times.length)await this.ctx.storage.setAlarm(Math.max(Date.now()+100,Math.min(...times)));
    else await this.ctx.storage.deleteAlarm();
  }
  async fetch(request){
    if(!this.storage.failed&&!this.engine.halted)this.engine.tick();
    const response=await this.app.fetch(request);
    this.ctx.waitUntil(this.storage.project().then(()=>this.schedule()));
    return response;
  }
  async alarm(){
    this.engine.tick();
    if(this.engine.state.giveaway?.status==='open'&&Date.now()>=this.engine.state.giveaway.endsAt)this.engine.closeGiveaway();
    this.runs.tick();await this.nft.tick();
    await this.storage.project();await this.schedule();
  }
}
