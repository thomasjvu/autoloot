import {featureFlags} from './lib/commerce/features.mjs';
import {SolanaCheckout} from './lib/integrations/solana-checkout.mjs';
import {CodexConnection} from './lib/integrations/codex-connection.mjs';
import {createRequestPolicy} from './lib/http/policy.mjs';
import {createEventHub} from './lib/http/events.mjs';
import {createProjections} from './lib/http/projections.mjs';
import {createHostedNodeAuth} from './lib/auth/hosted-node-auth.mjs';
import {AdminAuth} from './lib/auth/admin-auth.mjs';

import {RipSession} from './lib/commerce/rip-session.mjs';
import {Vision} from './lib/integrations/vision.mjs';
const vision=new Vision();
import {Shipping} from './lib/integrations/shipping.mjs';
import { runtimeConfig, localAdminRequest } from './lib/platform/runtime.mjs';
const runtime = runtimeConfig();
import {createAdaptorServer} from '@hono/node-server';
import {createHttpApp} from './lib/http/app.mjs';
import {nodeRequestContext} from './lib/http/node-platform.mjs';
import {createNodeAssets} from './lib/http/node-assets.mjs';
import {codexReply} from './lib/integrations/companion.mjs';
import { NftDelivery, walletBridge } from "./lib/commerce/nft.mjs";
import { Storage } from "./lib/persistence/storage.mjs";
process.umask(0o077);
import {emptyWorkspace} from "./lib/commerce/workspace.mjs";
import { Metadata } from "./lib/integrations/rip.mjs";
import { Catalog } from "./lib/integrations/catalog.mjs";
const metadata = new Metadata();
const catalog = new Catalog(metadata);
let rip;
import {
  readFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { Engine, seed } from "./lib/commerce/engine.mjs";
import { Twitch } from "./lib/integrations/twitch.mjs";
import { Runs } from "./lib/commerce/runs.mjs";
import { Payments } from "./lib/integrations/payments.mjs";
const root = fileURLToPath(new URL(".", import.meta.url));
const data = process.env.DATA_DIR || join(root, ".data");
mkdirSync(data, { recursive: true, mode: 0o700 });
const storage = new Storage(data);
let initial;
try {
  const initialWorkspace=emptyWorkspace();
  if(process.env.AUTOLOOT_DEMO==='1'){const practice=seed();practice.products=practice.products.map(p=>({...p,practiceOnly:true}));Object.assign(initialWorkspace,practice);}
  initial = storage.load(initialWorkspace);
}
catch(error) { storage.close(); throw error; }
let adminAuth=runtime.hosted?null:new AdminAuth(join(data,'admin-auth.json'));
const imageDir = join(data, "images");
mkdirSync(imageDir, { recursive: true, mode: 0o700 });
const oauthHandoffs = new Map();
const admin = randomBytes(32).toString("hex");
let engine, twitch, payments, nft, shipping;
const companion={proposal:null,busy:false};
function broadcast(){events.broadcast();}
let stateFor;
const events=createEventHub({stateFor:role=>stateFor(role),adminValid:req=>adminAuth.valid(req)});
engine = new Engine(initial, {
  features:featureFlags(process.env),
  save: (s) => storage.save(s),
  onChange: broadcast,
});
rip = new RipSession(engine,metadata,vision);
twitch = new Twitch(engine, broadcast, storage.sessionStore(), {authorizeStreamer:identity=>{
  if(runtime.hosted && identity.id!==process.env.AUTOLOOT_OWNER_TWITCH_ID)throw Error('This Twitch account does not own this workspace.');
}});
const hostedAuth=runtime.hosted?createHostedNodeAuth({twitch,owner:process.env.AUTOLOOT_OWNER_TWITCH_ID,events}):null;
if(hostedAuth)adminAuth=hostedAuth.auth;
const shippingConfigFile=join(data,'shippo.json');
let shippoToken=process.env.SHIPPO_API_TOKEN || '';
if(!shippoToken && existsSync(shippingConfigFile))shippoToken=JSON.parse(readFileSync(shippingConfigFile,'utf8')).token || '';
shipping=new Shipping(engine,{token:shippoToken});
const twitchConfigFile=join(data,'twitch-app.json');
if(existsSync(twitchConfigFile)) {
  const config=JSON.parse(readFileSync(twitchConfigFile,'utf8'));
  twitch.client=config.clientId; twitch.secret=config.clientSecret;
  twitch.status.configured=Boolean(twitch.client && twitch.secret);
}
payments = new Payments(engine);
let nftRpc={};
try { nftRpc=JSON.parse(process.env.NFT_RPC_CONFIG || '{}'); }
catch { storage.close(); throw Error('NFT_RPC_CONFIG must be a JSON object mapping chains to RPC URLs.'); }
try {
 for(const endpoint of Object.values(nftRpc)) {
  const address=new URL(endpoint);
  if(address.protocol!=='https:' && !(address.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(address.hostname)))throw Error();
 }
 nft=new NftDelivery(engine,{rpc:nftRpc,adapter:walletBridge(process.env.NFT_WALLET_URL,process.env.NFT_WALLET_TOKEN)});
} catch { storage.close(); throw Error('Invalid NFT RPC or wallet-bridge configuration. Use HTTPS or loopback URLs and a dedicated bridge credential.'); }
stateFor=createProjections({engine,nft,shipping,storage,payments,twitch,rip,catalog,metadata,companion,adminAuth});
// An interrupted live show resumes paused; never silently close an auction while offline.
if (engine.state.auction?.status === "live") {
  const a = engine.state.auction;
  a.remaining = Math.max(1000, a.endsAt - Date.now());
  a.status = "paused";
  engine.activity("Server restarted. Auction paused; review before resuming.");
  engine.commit();
}
const runs = new Runs(engine, { connected: () => twitch.status.connected, checkoutReady: () => payments.status.configured, nftReady:chain=>nft.configured(chain)&&Boolean(nft.adapter), deliverNft:(id,policy)=>nft.authorize(id,policy) });
runs.recover();
const {port, base} = runtime;
function localHost(req) { return runtime.hosted?adminAuth.valid(req):localAdminRequest(req, runtime); }

async function announce(message) {
  if (engine.state.mode !== "live") return;
  try {
    await twitch.send(message);
  } catch {
    engine.activity(
      "Twitch announcement failed. Check your connection.",
      "error",
    );
    engine.commit();
  }
}
let announcedAuction = null;
let announcedRunAuction = null;
let announcedRunListing = null;
const timer = setInterval(() => {
  if (storage.failed || engine.halted) return;
  try {
  engine.tick();
  if(engine.state.giveaway?.status==='open' && Date.now()>=engine.state.giveaway.endsAt)engine.closeGiveaway();
  runs.tick();
  const a = engine.state.auction;
  if (a?.runId && a.status === "live" && a.id !== announcedRunAuction) {
    announcedRunAuction = a.id;
    announce(engine.state.companion.message + " Register: " + base + "/shop");
  }
  const run = engine.state.run;
  if (run?.status === "running" && run.phase === "selling") {
    const key = run.id + ":" + run.index;
    if (key !== announcedRunListing) {
      announcedRunListing = key;
      announce(engine.state.companion.message + " Shop: " + base + "/shop");
    }
  }
  if (a && ["sold", "unsold"].includes(a.status) && a.id !== announcedAuction) {
    announcedAuction = a.id;
    if (a.mode === "live")
      announce(engine.state.companion.message + " Orders: " + base + "/shop");
  }
  } catch { engine.halted = true; console.error("Backend automation halted; review storage and restart after recovery."); }
}, 200);
timer.unref();
const validationTimer = setInterval(() => twitch.validate(), 55 * 60 * 1000);
validationTimer.unref();
const nftTimer=setInterval(()=>{nft.tick().catch(()=>{engine.halted=true;console.error("NFT worker halted; operator recovery required.");});},2000);
nftTimer.unref();
const {backupMinutes, backupKeep} = runtime;
const backupTimer=setInterval(()=>{storage.automaticBackup(backupKeep).catch(()=>console.error('Automatic backup failed.'));},backupMinutes*60000);
backupTimer.unref();
storage.automaticBackup(backupKeep).catch(()=>console.error('Initial database backup failed.'));
const solanaCheckout=new SolanaCheckout(engine);
payments.status.wallet=solanaCheckout.status;
const codexConnection=new CodexConnection();
let closing=false;
const policy=createRequestPolicy({runtime,auth:adminAuth,adminToken:admin,agentToken:()=>process.env.NFT_AGENT_TOKEN,localHost,storage,engine,twitch,broadcast,isClosing:()=>closing});
const platform=createNodeAssets({root,imageDir,twitchConfigFile,shippingConfigFile});
const localDocsOrigin=process.env.NODE_ENV!=='production'&&!runtime.hosted&&['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname)?'http://localhost:3333':undefined;
const app=createHttpApp({docsOrigin:localDocsOrigin,...(hostedAuth?{hosted:true,authRoutes:hostedAuth.routes,canStartStreamerLogin:()=>true}:{}),policy,requestContext:nodeRequestContext,...platform,auth:adminAuth,events,admin,port,base,engine,twitch,payments,nft,shipping,runs,catalog,rip,metadata,stateFor,localHost,broadcast,announce,companion,codexConnection,oauthHandoffs,storage,solanaCheckout,companionRuntime:{reply:codexReply}});
const server=createAdaptorServer({fetch:app.fetch,overrideGlobalObjects:false,autoCleanupIncoming:false});
server.requestTimeout=30000;
server.headersTimeout=10000;
server.keepAliveTimeout=5000;
server.maxRequestsPerSocket=1000;
server.maxConnections=512;
server.listen(port, runtime.host, () =>
  console.log(
    `Autoloot is ready at http://localhost:${port}\nViewer page: ${base}/shop\n${runtime.hosted?'Hosted Twitch owner access.':'Local streamer access only.'} Metadata: ${metadata.mode}. Data: ${data} (SQLite)`,
  ),
);
async function shutdown() {
  if(closing)return;
  closing=true;
  clearInterval(timer);clearInterval(nftTimer);clearInterval(validationTimer);clearInterval(backupTimer);
  twitch.close();codexConnection.close();
  events.close();
  server.close();
  server.closeIdleConnections();
  const deadline=Date.now()+30000;
  while((policy.activeRequests || nft.busy || storage.backupBusy || companion.busy) && Date.now()<deadline)
    await new Promise(resolve=>setTimeout(resolve,50));
  if(policy.activeRequests || nft.busy || storage.backupBusy || companion.busy) {
    console.error('Shutdown deadline exceeded; unresolved external operations will reconcile on restart.');
    process.exit(1);
  }
  storage.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
server.on("error", error => { storage.close(); console.error(error.message); process.exit(1); });
