import {SolanaCheckout} from './lib/solana-checkout.mjs';
import {CodexConnection} from './lib/codex-connection.mjs';
import {createRequestPolicy} from './lib/http/policy.mjs';
import {serveStatic} from './lib/http/static.mjs';
import {createExports} from './lib/http/exports.mjs';
import {createMedia} from './lib/http/media.mjs';
import {createViewer} from './lib/http/viewer.mjs';
import {createOauth} from './lib/http/oauth.mjs';
import {createSettingsActions} from './lib/http/settings-actions.mjs';
import {createCompanionActions} from './lib/http/companion-actions.mjs';
import {createShowActions} from './lib/http/show-actions.mjs';
import {createCommerceActions} from './lib/http/commerce-actions.mjs';
import {createInventoryActions} from './lib/http/inventory-actions.mjs';
import {createEventHub} from './lib/http/events.mjs';
import {createProjections} from './lib/http/projections.mjs';
import {json,body} from './lib/http/response.mjs';
import {adminRoutes} from './lib/admin-routes.mjs';
import {AdminAuth} from './lib/admin-auth.mjs';

import {RipSession} from './lib/rip-session.mjs';
import {Vision} from './lib/vision.mjs';
const vision=new Vision();
import {Shipping} from './lib/shipping.mjs';
import { runtimeConfig, localAdminRequest } from './lib/runtime.mjs';
const runtime = runtimeConfig();
import http from "node:http";
import { NftDelivery, walletBridge, isNft } from "./lib/nft.mjs";
import { Storage } from "./lib/storage.mjs";
process.umask(0o077);
import {emptyWorkspace} from "./lib/workspace.mjs";
import { Metadata } from "./lib/rip.mjs";
import { Catalog } from "./lib/catalog.mjs";
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
import { Engine, seed } from "./lib/engine.mjs";
import { Twitch } from "./lib/twitch.mjs";
import { LEGAL_VERSION, operatorProfile, operatorConfigured } from "./lib/legal.mjs";
import { Runs } from "./lib/runs.mjs";
import { Payments } from "./lib/payments.mjs";
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
const adminAuth=new AdminAuth(join(data,'admin-auth.json'));
const imageDir = join(data, "images");
mkdirSync(imageDir, { recursive: true, mode: 0o700 });
const oauthHandoffs = new Map();
const admin = randomBytes(32).toString("hex");
let engine, twitch, payments, nft, shipping;
const companion={proposal:null,busy:false};
function broadcast(){events.broadcast();}
let stateFor;
const events=createEventHub({stateFor:role=>stateFor(role),adminValid:req=>adminAuth.valid(req)});
const clients=events.clients;
engine = new Engine(initial, {
  save: (s) => storage.save(s),
  onChange: broadcast,
});
rip = new RipSession(engine,metadata,vision);
twitch = new Twitch(engine, broadcast, storage.sessionStore());
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
function localHost(req) { return localAdminRequest(req, runtime); }

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
const oauthRoutes=createOauth({base,twitch,storage,oauthHandoffs});
const solanaCheckout=new SolanaCheckout(engine);
payments.status.wallet=solanaCheckout.status;
const viewerRoutes=createViewer({engine,twitch,payments,nft,base,solanaCheckout});
const mediaRoutes=createMedia({imageDir,rip});
const exportsRoutes=createExports({engine});
const inventoryActions=createInventoryActions({engine});
const commerceActions=createCommerceActions({engine,payments,nft,shipping,shippingConfigFile,localHost,broadcast});
const showActions=createShowActions({engine,runs,shipping,nft,twitch,announce,base,companion,rip,broadcast});
const codexConnection=new CodexConnection();
const companionActions=createCompanionActions({engine,catalog,rip,nft,twitch,imageDir,companion,broadcast,announce,codexConnection});
const settingsActions=createSettingsActions({engine,twitch,twitchConfigFile,localHost,broadcast});
const policy=createRequestPolicy({runtime,auth:adminAuth,adminToken:admin,agentToken:()=>process.env.NFT_AGENT_TOKEN,localHost,storage,engine,twitch,broadcast});
let closing = false;
const server = http.createServer(async (req, res) => {
  const context=policy.begin(req,res,closing);
  if(!context)return;
  try {
    const prepared=policy.prepare(context);
    if(!prepared)return;
    const {url,path,adminAccess,nftAgent,auditContext,settle,session}=prepared;
    if(await adminRoutes({req,res,path,auth:adminAuth,clients,localHost,json,body}))return;
    if(path==='/' && localHost(req) && !adminAuth.valid(req)){res.writeHead(302,{Location:'/admin-login.html'});return res.end();}
    if (path === "/api/bootstrap") {
      if (!localHost(req))
        return json(
          res,
          { error: "Open the streamer dashboard at localhost." },
          403,
        );
      if(!adminAuth.valid(req))return json(res,{error:'Admin sign-in required.'},401);
      return json(res, {
        admin,
        overlayUrl: `http://localhost:${port}/overlay`,
        viewerUrl: base + "/shop",
        state: stateFor("admin"),
      });
    }
    if(path==='/api/nft/jobs' && req.method==='GET') {
      if(!adminAccess && !nftAgent)return json(res,{error:'NFT agent or streamer access required.'},403);
      return json(res,{jobs:engine.state.orders.filter(o=>isNft(o)&&o.delivery&&['paid','paid-external'].includes(o.status)&&(adminAccess||o.delivery.allowTransfer)).map(o=>({...nft.manifest(o),status:o.delivery.status,transactionId:o.delivery.transactionId || null,error:o.delivery.error || null}))});
    }
    if(path==='/api/nft/submit' && req.method==='POST') {
      if(!adminAccess && !nftAgent)return json(res,{error:'NFT agent or streamer access required.'},403);
      const b=await body(req),o=engine.order(b.id);
      if(!adminAccess&&!o.delivery?.allowTransfer)return json(res,{error:'NFT transfer was not authorized for agent execution.'},403);
      nft.submit(o.id,b.transactionId);return json(res,{ok:true});
    }
    if (path === "/api/legal" && req.method === "GET")
      return json(res, { version:LEGAL_VERSION, operator:operatorProfile(engine.state.operator), configured:operatorConfigured(engine.state.operator) });
    if (path === "/api/state")
      return json(res, stateFor(adminAccess ? "admin" : "viewer"));
    if (path === "/api/events") {
      if (url.searchParams.has("admin") && !adminAccess)
        return json(res, { error: "Admin session expired." }, 403);
      if(clients.size >= 200) return json(res,{error:"Viewer connection limit reached."},429);
      events.connect(req,res,adminAccess?'admin':'viewer',settle);
      return;
    }
    if(await oauthRoutes({req,res,path,url,adminAccess,session}))return;
    if(await viewerRoutes({req,res,path,url,adminAccess,session}))return;
    if(await mediaRoutes({req,res,path,adminAccess}))return;
    if (req.method === "POST" && path.startsWith("/api/")) {
      const origin = req.headers.origin;
      if (
        origin &&
        origin !== `http://${req.headers.host}` &&
        origin !== `https://${req.headers.host}`
      )
        return json(res, { error: "Cross-origin request rejected." }, 403);
      if (!adminAccess)
        return json(res, { error: "Streamer access required." }, 403);
      const b = await body(req, path.startsWith("/api/import/") ? 1500000 : 32768);
      if(auditContext.action){
        const operation=['ship','cancel','refund','test-pay','confirm-paid'].includes(b.action)?b.action:null;
        const target=engine.state.orders.find(order=>order.id===b.id)?.number || engine.state.products.find(product=>product.id===b.id)?.id;
        if(operation)auditContext.action+=' · '+operation;
        if(target)auditContext.action+=' ['+target+']';
      }

      const handled=await inventoryActions({path,b,req,res}) || await commerceActions({path,b,req,res}) || await showActions({path,b,req,res}) || await companionActions({path,b,req,res}) || await settingsActions({path,b,req,res});
      if(!handled)return json(res,{error:'Unknown action.'},404);
      if(res.writableEnded)return;
      return json(res, { ok: true, state: stateFor("admin") });
    }
    if(await exportsRoutes({req,res,path,adminAccess}))return;
    serveStatic({req,res,path,root});
  } catch (e) {
    json(
      res,
      { error: e instanceof SyntaxError ? "Invalid JSON request." : e.message },
      400,
    );
  }
});
server.requestTimeout=30000;
server.headersTimeout=10000;
server.keepAliveTimeout=5000;
server.maxRequestsPerSocket=1000;
server.maxConnections=512;
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Autoloot is ready at http://localhost:${port}\nViewer page: ${base}/shop\nLocal streamer access only. Data: ${data} (SQLite)`,
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
