import {RipSession} from './lib/rip-session.mjs';
import {publicCompanion,publicPulls} from './lib/public-state.mjs';
import {Vision} from './lib/vision.mjs';
const vision=new Vision();
import {defaultProfile,validateProfile} from './lib/companion-profile.mjs';
import {accountingRows,recordCosts} from './lib/accounting.mjs';
import {Shipping, address as shippingAddress} from './lib/shipping.mjs';
import {encodeCsv,previewImport, applyImport, fulfillmentCsv, pirateShipCsv} from './lib/csv.mjs';
import { runtimeConfig, requestAllowed, localAdminRequest } from './lib/runtime.mjs';
const runtime = runtimeConfig();
import http from "node:http";
import { NftDelivery, walletBridge, isNft } from "./lib/nft.mjs";
import { Storage } from "./lib/storage.mjs";
process.umask(0o077);
import {emptyWorkspace,demoContent} from "./lib/workspace.mjs";
import { Metadata } from "./lib/rip.mjs";
import { Catalog } from "./lib/catalog.mjs";
const metadata = new Metadata();
const catalog = new Catalog(metadata);
let rip;
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  existsSync,
} from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Engine, seed, money, cents } from "./lib/engine.mjs";
import { Twitch } from "./lib/twitch.mjs";
import { publicVote } from "./lib/voting.mjs";
import { LEGAL_VERSION, operatorProfile, operatorConfigured, validateOperator } from "./lib/legal.mjs";
import { Runs, runActive, runOwns } from "./lib/runs.mjs";
import { Payments } from "./lib/payments.mjs";
import { demoReply, codexReply } from "./lib/companion.mjs";
const root = fileURLToPath(new URL(".", import.meta.url));
const data = process.env.DATA_DIR || join(root, ".data");
mkdirSync(data, { recursive: true, mode: 0o700 });
const storage = new Storage(data);
let initial;
try { initial = storage.load(process.env.AUTOLOOT_DEMO === '1' ? seed() : emptyWorkspace()); }
catch(error) { storage.close(); throw error; }
const imageDir = join(data, "images");
mkdirSync(imageDir, { recursive: true, mode: 0o700 });
const clients = new Set();
const admin = randomBytes(32).toString("hex");
let engine, twitch, payments, nft, shipping;
let proposal = null,
  busy = false;
function publicState() {
  const s = engine.state;
  return {
    mode: s.mode,
    vote: publicVote(s.vote),
    show: s.show,
    operator: operatorProfile(s.operator),
    products: s.products,
    auction: s.auction
      ? {
          ...s.auction,
          highest: s.auction.highest
            ? {
                username: s.auction.highest.username,
                amount: s.auction.highest.amount,
              }
            : null,
        }
      : null,
    bids: s.bids.map((b) => ({
      id: b.id,
      username: b.username,
      amount: b.amount,
      at: b.at,
      source: b.source,
      voided: Boolean(b.voided),
    })),
    companion: publicCompanion(s.companion),
    pulls:publicPulls(s.pulls),
    serverTime: Date.now(),
  };
}
function stateFor(role) {
  return role === "admin"
    ? {
        ...engine.state,
        accountingRows:accountingRows(engine.state),
        vote: publicVote(engine.state.vote),
        orders: engine.state.orders.map(({ claim, ...o }) => o),
        registrations: engine.state.registrations.map((r) => ({
          ...r,
          blocked: engine.state.blocked.some((b) => b.userId === r.userId),
        })),
        nft: nft?.status(),
        shippingProvider: shipping?.status(),
        storage: storage.status(),
        payments: payments.status,
        twitch: twitch.status,
        proposal,
        companionBusy: busy,
        audit:storage.auditPage().events,
        rip: rip.snapshot(),
        catalog: {...catalog.state, source:metadata.base},
        serverTime: Date.now(),
      }
    : publicState();
}
function broadcast() {
  const messages = new Map();
  for (const client of clients) {
    if (client.res.destroyed) continue;
    if (client.res.writableNeedDrain) { client.pending = true; continue; }
    if (!messages.has(client.role)) messages.set(client.role, `data: ${JSON.stringify(stateFor(client.role))}\n\n`);
    client.pending = false;
    client.res.write(messages.get(client.role));
  }
}

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
function equal(a, b) {
  if(typeof a!=="string" || typeof b!=="string")return false;
  const left=Buffer.from(a),right=Buffer.from(b);
  return left.length===right.length && timingSafeEqual(left,right);
}
function isAdmin(req, url) {
  return (
    equal(
      req.headers["x-autoloot-admin"],
      admin,
    ) || equal(url.searchParams.get("admin"), admin)
  );
}
function localHost(req) { return localAdminRequest(req, runtime); }

function json(res, value, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function body(req, limit = 32768) {
  let result = "",
    size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error("Request too large.");
    result += c;
  }
  return result ? JSON.parse(result) : {};
}
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
const buckets = new Map();
let closing = false, activeRequests = 0;
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
  );
  if (closing) return json(res,{error:'Server is shutting down.'},503);
  if (!runtime.hosts.has(req.headers.host)) return json(res,{error:'Untrusted request host.'},403);
  if ((req.method === 'POST' || req.url?.startsWith('/api/bootstrap') || req.url?.startsWith('/auth/')) && req.url !== '/api/stripe/webhook' && !requestAllowed(req,runtime))
    return json(res,{error:'Cross-origin request rejected.'},403);
  activeRequests++;
  let settled=false;
  const settle=()=>{if(!settled){settled=true;activeRequests--;}};
  res.once('finish',settle);res.once('close',settle);
  let url;
  try { url = new URL(req.url, "http://localhost"); }
  catch { return json(res,{error:"Invalid request URL."},400); }
  const path = url.pathname;
  const adminAccess = isAdmin(req, url);
  const nftAgent=Boolean(process.env.NFT_AGENT_TOKEN && equal(req.headers['x-autoloot-nft-agent'],process.env.NFT_AGENT_TOKEN));
  const auditContext={};
  try {
    const auditRead=['/api/orders.csv','/api/fulfillment.csv','/api/pirateship.csv'];
    if((adminAccess || nftAgent&&path==='/api/nft/submit') && (req.method==='POST'&&path!=='/api/stripe/webhook'||auditRead.includes(path)||path==='/auth/twitch'&&url.searchParams.get('role')==='streamer')){
      const requestId=randomBytes(16).toString('hex'),action=req.method+' '+path.slice(0,160);
      auditContext.action=action;
      storage.recordAudit({requestId,actor:adminAccess?'Local streamer':'NFT agent',action,outcome:'started'});
      let recorded=false;
      const complete=()=>{
        if(recorded)return;recorded=true;
        try{storage.recordAudit({requestId,actor:adminAccess?'Local streamer':'NFT agent',action:auditContext.action.slice(0,180),outcome:res.writableFinished?(res.statusCode>=400?'rejected':'completed'):'interrupted',status:res.writableFinished?res.statusCode:null});broadcast();}
        catch{engine.halted=true;console.error('Audit storage failed; backend halted.');}
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
        : session?.id || req.socket.remoteAddress;
      const now = Date.now();
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
    if (path === "/api/bootstrap") {
      if (!localHost(req))
        return json(
          res,
          { error: "Open the streamer dashboard at localhost." },
          403,
        );
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
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      const client = { res, role: adminAccess ? "admin" : "viewer" };
      clients.add(client);
      settle();
      res.write(`data: ${JSON.stringify(stateFor(client.role))}\n\n`);
      res.on('drain',()=>{
        if(client.pending && !res.destroyed) {
          client.pending=false;
          res.write(`data: ${JSON.stringify(stateFor(client.role))}\n\n`);
        }
      });
      res.on('error',()=>res.destroy());
      const keep = setInterval(() => {if(!res.writableNeedDrain)res.write(": keepalive\n\n");}, 15000);
      res.on("close", () => {
        clients.delete(client);
        clearInterval(keep);
      });
      return;
    }
    if (path === "/auth/twitch") {
      const role =
        url.searchParams.get("role") === "streamer" ? "streamer" : "viewer";
      if (role === "streamer" && !adminAccess)
        throw new Error("Open Connections in your local streamer dashboard.");
      if(!twitch.status.configured) {
        res.writeHead(302,{Location:role==='streamer'?'/twitch-setup.html':'/shop'});
        return res.end();
      }
      res.writeHead(302, { Location: twitch.login(role) });
      return res.end();
    }
    if (path === "/auth/twitch/callback") {
      if (url.searchParams.get("error"))
        throw new Error("Twitch login was cancelled.");
      const result = await twitch.callback(
        url.searchParams.get("code"),
        url.searchParams.get("state"),
      );
      if(result.role==='streamer')storage.recordAudit({requestId:randomBytes(16).toString('hex'),action:'GET /auth/twitch/callback',outcome:'completed',status:302});
      res.writeHead(302, {
        "Set-Cookie": `autoloot_session=${result.session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${base.startsWith("https:") ? "; Secure" : ""}`,
        Location: result.role === "streamer" ? "/" : "/shop",
      });
      return res.end();
    }
    if (path === "/api/viewer") {
      const orders = session
        ? engine.state.orders
            .filter((o) => o.userId === session.id)
            .map(({ claim, shipment, shipmentHistory, ...o }) => ({...o,...(shipment?{shipment:{status:shipment.status,test:shipment.test,trackingStatus:shipment.trackingStatus,trackingNumber:shipment.trackingNumber,trackingUrl:shipment.trackingUrl}}:{})}))
        : [];
      return json(res, {
        user: session
          ? {
              login: session.login,
              kind: session.kind,
              registered: engine.state.registrations.some(
                (r) => r.userId === session.id,
              ),
            }
          : null,
        orders,
        configured: twitch.status.configured,
        nft:nft.status(),
        payments: payments.status,
      });
    }
    if (path === "/api/receipt" && req.method === "GET") {
      const o = engine.order(url.searchParams.get("id"));
      if (!adminAccess && (!session || o.userId !== session.id))
        return json(res, { error: "Order access required." }, 403);
      return json(res, {
        receipt: o.number,
        product: o.product.title,
        subtotal: o.amount,
        shipping: o.shippingPrice,
        total: o.total,
        currency: "usd",
        status: o.status,
        createdAt: o.createdAt,
        paidAt: o.paidAt || null,
        tracking: o.tracking || null,
        delivery: isNft(o) ? {type:"nft",status:o.delivery?.status || "not-started",proof:o.delivery?.proof || null,simulated:o.delivery?.simulated || false} : {type:"physical"},
      });
    }
    if (req.method === "POST" && path === "/api/stripe/webhook") {
      let raw = [],
        size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024 * 1024) throw new Error("Webhook too large.");
        raw.push(chunk);
      }
      payments.webhook(Buffer.concat(raw), req.headers["stripe-signature"]);
      return json(res, { received: true });
    }
    if (req.method === "POST" && path.startsWith("/api/viewer/")) {
      const origin = req.headers.origin;
      if (
        origin &&
        origin !== `http://${req.headers.host}` &&
        origin !== `https://${req.headers.host}`
      )
        return json(res, { error: "Cross-origin request rejected." }, 403);
      const b = await body(req);
      if (path === "/api/viewer/demo-login") {
        if (engine.state.mode !== "demo")
          throw new Error("Demo identities are unavailable in live mode.");
        const id = randomBytes(16).toString("hex"),
          token = randomBytes(32).toString("hex");
        twitch.sessions.set(token, {
          id: "demo-" + id,
          login: "demo_" + id.slice(0, 4),
          kind: "demo",
          expires: Date.now() + 86400000,
        });
        res.setHeader(
          "Set-Cookie",
          `autoloot_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${base.startsWith("https:") ? "; Secure" : ""}`,
        );
        return json(res, { ok: true });
      }
      if (!session)
        return json(res, { error: "Sign in before continuing." }, 401);
      if (path === "/api/viewer/logout") {
        twitch.logout(req.headers.cookie);
        res.setHeader(
          "Set-Cookie",
          "autoloot_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
        );
        return json(res, { ok: true });
      }
      if (path === "/api/viewer/buy") {
        if (engine.state.mode === "live" && session.kind !== "twitch")
          throw new Error("Live purchases require Twitch sign-in.");
        if (engine.state.mode === "live" && !payments.status.configured)
          throw new Error("The seller has not configured checkout.");
        if (engine.state.mode === "live" && runOwns(engine.state, b.productId) && !twitch.status.connected)
          throw Error("Twitch disconnected. The agent-run listing is paused.");
        const item=engine.product(b.productId);
        if(engine.state.mode==='live'&&item.fulfillment?.type==='nft'&&!nft.configured(item.fulfillment.chain))throw Error("NFT receipt verification must be configured before selling this asset.");
        const order = engine.buyNow({
          productId: b.productId,
          requestId: b.requestId,
          userId: session.id,
          username: session.login,
        });
        return json(res, { ok: true, orderId: order.id });
      }
      const o = engine.order(b.id);
      if (o.userId !== session.id)
        return json(
          res,
          { error: "This order belongs to another account." },
          403,
        );
      if (path === "/api/viewer/checkout")
        return json(res, await payments.checkout(o.id));
      if (path === "/api/viewer/shipping") {
        if (!payments.countries.includes(b.shipping?.country))
          throw new Error("Shipping is not available for this country.");
        engine.shipping(o.id, b.shipping);
        return json(res, { ok: true });
      }
      if(path==='/api/viewer/wallet') {
        nft.setRecipient(o.id,b.address,b.confirmed);return json(res,{ok:true});
      }
      if(path==='/api/viewer/demo-deliver') {
        nft.simulate(o.id);return json(res,{ok:true});
      }
      if (path === "/api/viewer/demo-pay") {
        if (o.mode !== "demo")
          throw new Error("Live orders require verified payment.");
        if (isNft(o) ? !o.recipientWallet : !o.shipping) throw new Error(isNft(o) ? "Confirm an NFT destination wallet first." : "Add a demo shipping address first.");
        engine.orderUpdate(o.id, "test-pay");
        return json(res, { ok: true });
      }
      if (path === "/api/viewer/cancel") {
        await payments.cancel(o.id);
        return json(res, { ok: true });
      }
      throw new Error("Unknown viewer action.");
    }
    if (path.startsWith("/media/")) {
      const name = path.slice(7);
      if (
        !/^[a-f0-9-]+\.(png|jpg|webp)$/.test(name) ||
        !existsSync(join(imageDir, name))
      )
        return json(res, { error: "Image not found." }, 404);
      res.writeHead(200, {
        "Content-Type": name.endsWith(".png")
          ? "image/png"
          : name.endsWith(".jpg")
            ? "image/jpeg"
            : "image/webp",
        "Cache-Control": "public, max-age=3600",
      });
      return res.end(readFileSync(join(imageDir, name)));
    }
    if (req.method === "POST" && path === "/api/upload") {
      if (!adminAccess)
        return json(res, { error: "Streamer access required." }, 403);
      const origin = req.headers.origin;
      if (
        origin &&
        origin !== `http://${req.headers.host}` &&
        origin !== `https://${req.headers.host}`
      )
        return json(res, { error: "Cross-origin request rejected." }, 403);
      const chunks = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 3 * 1024 * 1024)
          throw new Error("Choose an image smaller than 3 MB.");
        chunks.push(c);
      }
      const image = Buffer.concat(chunks);
      const ext = image
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "png"
        : image[0] === 255 && image[1] === 216 && image[2] === 255
          ? "jpg"
          : image.toString("ascii", 0, 4) === "RIFF" &&
              image.toString("ascii", 8, 12) === "WEBP"
            ? "webp"
            : null;
      if (!ext) throw new Error("Choose a PNG, JPEG, or WebP image.");
      const name = randomBytes(16).toString("hex") + "." + ext;
      writeFileSync(join(imageDir, name), image, { mode: 0o600 });
      return json(res, { image: "/media/" + name });
    }
    if (req.method === "POST" && path === "/api/rip/frame") {
      if (!adminAccess) return json(res, {error:"Streamer access required."},403);
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(res,{error:"Cross-origin request rejected."},403);
      if(req.headers['content-type'] !== 'image/jpeg') throw Error('Send a JPEG frame.');
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>2000000)throw Error('Frame too large.');chunks.push(chunk);}
      const image=Buffer.concat(chunks);if(image[0]!==255||image[1]!==216)throw Error('Invalid JPEG.');
      await rip.scan(image);return json(res,rip.snapshot());
    }
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

      switch (path) {
        case "/api/accounting/costs": recordCosts(engine,b);break;
        case "/api/accounting/export": return json(res,{csv:encodeCsv([['Order','Item','Status','Mode','Date','Collected USD','Refunded USD','Net USD','Recorded costs USD','Estimated contribution USD','Costs complete','Item cost USD','Payment fees USD','Delivery cost USD','Other cost USD','Private note'],...accountingRows(engine.state).map(row=>[row.number,row.title,row.status,row.mode,new Date(row.at).toISOString(),...['received','refund','net','expenses','margin'].map(key=>row[key]===null?'':(row[key]/100).toFixed(2)),row.complete,...['itemCost','paymentFees','deliveryCost','otherCost'].map(key=>row[key]===null?'':(row[key]/100).toFixed(2)),row.note])])});

        case "/api/shipping/settings": {
          if(!localHost(req))return json(res,{error:'Configure shipping from localhost.'},403);
          const token=String(b.token || '').trim();
          if(token && !/^shippo_(test|live)_[A-Za-z0-9]+$/.test(token))throw Error('Enter a valid Shippo test or live API token.');
          if(token && process.env.SHIPPO_API_TOKEN)throw Error('Shippo token is managed by SHIPPO_API_TOKEN. Update it on the server and restart.');
          shipping.configure(b);
          if(token){writeFileSync(shippingConfigFile+'.tmp',JSON.stringify({token}),{mode:0o600});renameSync(shippingConfigFile+'.tmp',shippingConfigFile);shipping.token=token;}
          broadcast();break;
        }
        case "/api/shipping/address": {
          const o=engine.order(b.id);
          if(isNft(o)||!["paid","paid-external","test-paid"].includes(o.status)||o.refundRequestedAt!=null)throw Error("Choose a paid physical order without a requested refund.");
          if(o.shipment && !['quoted','failed','voided'].includes(o.shipment.status))throw Error('Resolve the label before changing its address.');
          if(b.confirmed!==true)throw Error('Confirm the recipient address.');
          o.shipping=shippingAddress(b.address);delete o.shipment;engine.commit();break;
        }
        case "/api/shipping/rates": await shipping.quote(b);break;
        case "/api/shipping/buy": await shipping.buy(b);break;
        case "/api/shipping/refresh": await shipping.refresh(b);break;
        case "/api/shipping/track": await shipping.track(b);break;
        case "/api/shipping/dispatch": shipping.dispatch(b);break;
        case "/api/operator": {
          if (runActive(engine.state.run) || ['live','paused'].includes(engine.state.auction?.status))
            throw Error('Stop the run and finish the auction before changing seller policies.');
          engine.state.operator = {...validateOperator(b), acknowledgedVersion:LEGAL_VERSION, acknowledgedAt:Date.now()};
          engine.activity('Operator published seller contact and transaction/privacy policies.', 'legal');
          engine.commit(); break;
        }
        case "/api/nft/authorize": nft.authorize(b.id,{allowTransfer:b.allowTransfer===true,maxFeeAtomic:b.maxFeeAtomic}); break;
        case "/api/nft/verify": {const o=engine.order(b.id);if(!o.delivery?.transactionId)throw Error('Submit a transfer first.');const proof=await nft.verify(o);if(proof)nft.complete(o,proof);break;}
        case "/api/nft/demo-deliver": nft.simulate(b.id); break;
        case "/api/automation": {
          if(!['manual','review','automatic'].includes(b.mode))throw Error('Choose an automation style.');
          if(runActive(engine.state.run))throw Error('Stop the current run before changing your automation style.');
          engine.state.automation={mode:b.mode};engine.commit();break;
        }
        case "/api/run/approve": runs.approve(b); break;
        case "/api/run/arm": runs.arm(b); break;
        case "/api/run/pause": runs.pause(); break;
        case "/api/run/resume": runs.resume(); break;
        case "/api/run/stop": runs.stop(); break;
        case "/api/twitch/configure": {
          if(!localHost(req))return json(res,{error:'Configure Twitch from localhost.'},403);
          if(engine.state.mode==='live' && ['live','paused'].includes(engine.state.auction?.status))throw Error('Finish or cancel the auction before changing the Twitch app.');
          const clientId=String(b.clientId || '').trim(),clientSecret=String(b.clientSecret || '').trim();
          if(!/^[a-zA-Z0-9]{10,128}$/.test(clientId) || !/^[a-zA-Z0-9_-]{10,256}$/.test(clientSecret))throw Error('Enter a valid Twitch client ID and client secret.');
          writeFileSync(twitchConfigFile+'.tmp',JSON.stringify({clientId,clientSecret}),{mode:0o600});
          renameSync(twitchConfigFile+'.tmp',twitchConfigFile);
          twitch.disconnect();twitch.pending.clear();twitch.sessions.clear();
          twitch.client=clientId;twitch.secret=clientSecret;twitch.status.configured=true;twitch.status.error=null;
          broadcast();break;
        }
        case "/api/catalog/search":
          await catalog.search(b); break;
        case "/api/catalog/select":
          await catalog.select(b.id); break;
        case "/api/catalog/add":
          catalog.add(engine,b); catalog.state.selected=null; break;
        case "/api/payments/reconcile-refund": await payments.reconcileRefund(b.id,b.refundId);break;
        case "/api/payments/reconcile-checkout": await payments.reconcileCheckout(b.id,b.sessionId);break;
        case "/api/rip/search": await rip.search(b);break;
        case "/api/rip/select": await rip.select(b.id);break;
        case "/api/rip/confirm": rip.confirm(b);break;
        case "/api/rip/clear": rip.clear();break;

        case "/api/import/preview": {
          const {state: discarded, ...preview} = previewImport(engine, b);
          return json(res, preview);
        }
        case "/api/import/apply": applyImport(engine, b); break;
        case "/api/products":
          engine.addProduct(b);
          break;
        case "/api/products/edit":
          engine.editProduct(b.id, b);
          break;
        case "/api/products/reorder":
          engine.reorder(b.id, b.direction);
          break;
        case "/api/auction/void":
          engine.voidBid();
          break;
        case "/api/bidder":
          engine.block(b.userId, Boolean(b.blocked));
          break;
        case "/api/demo/buy":
          if (engine.state.mode !== "demo")
            throw new Error("Demo purchase is disabled in live mode.");
          engine.buyNow({
            productId: b.productId,
            userId: "demo-" + String(b.username || "testbuyer").toLowerCase(),
            username: String(b.username || "testbuyer"),
            requestId: b.requestId,
          });
          break;
        case "/api/products/remove":
          engine.removeProduct(b.id);
          break;
        case "/api/auction/start":
          if(engine.state.mode==='live'&&engine.product(b.productId).fulfillment?.type==='nft'&&!nft.configured(engine.product(b.productId).fulfillment.chain))throw Error("Configure NFT receipt verification before opening this auction.");
          if (engine.state.mode === "live" && !twitch.status.connected)
            throw new Error("Connect Twitch before starting a live auction.");
          engine.start(b);
          await announce(
            engine.state.companion.message + " Register: " + base + "/shop",
          );
          break;
        case "/api/auction/pause":
          engine.pause();
          await announce("Auction paused. Bidding is temporarily closed.");
          break;
        case "/api/auction/resume":
          if (engine.state.mode === "live" && !twitch.status.connected)
            throw new Error("Reconnect Twitch first.");
          engine.resume();
          await announce("Auction resumed. Bidding is open again.");
          break;
        case "/api/auction/finish":
          engine.tick();
          if (["live", "paused"].includes(engine.state.auction?.status))
            engine.finish();

          break;
        case "/api/auction/cancel":
          engine.finish(true);
          await announce("Auction cancelled. No order was created.");
          break;
        case "/api/demo/bid":
          if (engine.state.mode !== "demo")
            throw new Error("Demo bids are disabled in live mode.");
          engine.chat(b.username, `!bid ${b.amount}`);
          engine.bid({
            userId: "demo-" + String(b.username).toLowerCase(),
            username: b.username,
            amount: b.amount,
          });
          break;
        case "/api/demo/chat":
          if (engine.state.mode !== "demo")
            throw new Error("Demo chat is disabled in live mode.");
          engine.chat(
            "cozycollector",
            b.text || "The lavender keys are so cute ✨",
          );
          break;
        case "/api/workspace/demo":
          if (runActive(engine.state.run)) throw Error("Stop the agent run before changing demo inventory.");
          if(shipping.locks.size || engine.state.orders.some(o=>o.mode==='demo'&&['purchasing','unknown','pending','purchased','refund-pending'].includes(o.shipment?.status)))throw Error("Resolve practice shipping labels before clearing demo content.");
          if(typeof b.enabled!=='boolean')throw Error('Choose load or remove demo content.');
          demoContent(engine,b.enabled);proposal=null;rip.clear();broadcast();break;
        case "/api/mode":
          engine.setMode(b.mode);
          break;
        case "/api/order":
          if (b.action === "cancel") await payments.cancel(b.id);
          else if (b.action === "refund") await payments.refund(b.id);
          else if (b.action === "confirm-paid" && engine.order(b.id).checkoutId)
            throw new Error("An active checkout must be verified by Stripe.");
          else engine.orderUpdate(b.id, b.action, b.tracking);
          break;
        case "/api/show":
          if (runActive(engine.state.run)) throw Error("Stop the agent run before changing show terms.");
          const nextSettings = {};
          if (b.shippingPrice !== undefined) {
            const value = Number(b.shippingPrice);
            if (
              !Number.isFinite(value) ||
              value < 0 ||
              value > 10000 ||
              !/^\d+(\.\d{1,2})?$/.test(String(b.shippingPrice))
            )
              throw new Error("Invalid shipping price.");
            nextSettings.shippingPrice = Math.round(value * 100);
          }
          if (b.duration !== undefined) {
            const d = Number(b.duration);
            if (!Number.isInteger(d) || d < 10 || d > 3600)
              throw new Error("Duration must be 10–3600 seconds.");
            nextSettings.bidDuration = d;
          }
          if (b.increment !== undefined)
            nextSettings.increment = cents(b.increment);
          if (typeof b.antiSnipe === "boolean")
            nextSettings.antiSnipe = b.antiSnipe;
          Object.assign(engine.state.show, nextSettings);
          engine.state.show.title = String(
            b.title || engine.state.show.title || "Untitled show",
          )
            .trim()
            .slice(0, 100);
          engine.commit();
          break;
        case "/api/vote/open":
          engine.openVote(b);
          await announce(
            engine.state.companion.message +
              " " +
              engine.state.vote.options
                .map((o) => `${o.number}: ${o.product.title}`)
                .join(" / "),
          );
          break;
        case "/api/vote/close":
          engine.closeVote(Boolean(b.cancel));
          await announce(engine.state.companion.message);
          break;
        case "/api/vote/demo":
          if (engine.state.mode !== "demo")
            throw Error("Demo voting is disabled in live mode.");
          engine.vote({
            userId: "demo-" + String(b.username || "testviewer"),
            option: Number(b.option),
          });
          break;
        case "/api/companion/photo": {
          if (busy) throw Error("Mochi is already working.");
          if (engine.state.companion.provider !== "codex")
            throw Error("Select Codex in Companion to draft from photos.");
          if (!/^\/media\/[a-f0-9]+\.(png|jpg|webp)$/.test(b.image || ""))
            throw Error("Upload a product photo first.");
          const imagePath = join(imageDir, b.image.slice(7));
          if (!existsSync(imagePath)) throw Error("Photo not found.");
          const price = cents(b.price);
          const quantity = Number(b.quantity);
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000)
            throw Error("Quantity must be 1–10,000.");
          const notes = String(b.notes || "").slice(0, 1500),
            condition = String(b.condition || "Used").slice(0, 40);
          if(engine.state.mode!=='demo' && engine.state.companion.provider!=='codex')throw Error('Connect a real companion provider in Companion settings first.');
          busy = true;
          broadcast();
          try {
            const reply = await codexReply(
              `Draft a product listing from the attached product photo. Creator confirmed condition: ${condition}. Opening price: ${(price / 100).toFixed(2)} USD. Quantity: ${quantity}. Notes: ${notes}. No buy-now listing. Describe visible features only.`,
              engine.state,
              { imagePath },
            );
            if (reply.action !== "draft-product" || !reply.draftProduct)
              throw Error(
                "The model could not draft this photo. Try clearer notes or add the product manually.",
              );
            Object.assign(reply.draftProduct, {
              price: (price / 100).toFixed(2),
              quantity,
              condition,
              listed: false,
              buyNowPrice: null,
              image: b.image,
            });
            proposal = { id: randomBytes(16).toString("hex"), ...reply };
            engine.say(reply.message);
            engine.commit();
          } finally {
            busy = false;
            broadcast();
          }
          break;
        }
        case "/api/rip/provider":
          if(!['cloud','local'].includes(b.mode))throw Error('Choose cloud or local vision.');
          engine.state.companion.visionMode=b.mode;rip.clear();engine.commit();break;
        case "/api/companion/profile": {
          if(b.reset===true)Object.assign(engine.state.companion,defaultProfile);
          else {const profile=validateProfile(b);if(profile.avatar.startsWith('/media/')&&!existsSync(join(imageDir,profile.avatar.slice(7))))throw Error('Upload the avatar first.');Object.assign(engine.state.companion,profile);}
          engine.commit();break;
        }
        case "/api/companion/settings":
          if (b.provider && !["offline", "demo", "codex"].includes(b.provider))
            throw new Error("Unknown provider.");
          for (const k of ["enabled", "voice", "overlayVoice", "reducedMotion"])
            if (typeof b[k] === "boolean") engine.state.companion[k] = b[k];
          if(b.provider==='demo'&&engine.state.mode!=='demo')throw Error('Scripted replies are available only in practice mode.');
          if (b.provider) engine.state.companion.provider = b.provider;
          engine.commit();
          break;
        case "/api/companion/ask": {
          if (busy) throw new Error("Mochi is already thinking.");
          if (
            typeof b.prompt !== "string" ||
            !b.prompt.trim() ||
            b.prompt.length > 2000
          )
            throw new Error("Enter a request under 2,000 characters.");
          if(engine.state.mode!=='demo' && engine.state.companion.provider!=='codex')throw Error('Connect a real companion provider in Companion settings first.');
          busy = true;
          broadcast();
          try {
            const reply =
              engine.state.companion.provider === "codex"
                ? await codexReply(b.prompt, {...engine.state, catalog:catalog.state})
                : demoReply(b.prompt, engine.state);
            if(reply.action === 'search-catalog') {
              await catalog.search({query:reply.productId || '',game:''});
              reply.action='none';reply.message=`Found ${catalog.state.total} Metadata matches. Open Catalog to review, or ask me to choose a result.`;
            } else if(reply.action === 'select-catalog') {
              const selected=await catalog.select(reply.productId);
              reply.action='none';reply.message=`Selected ${selected.name} ${selected.number} from ${selected.setName}. Review it in Catalog and set your opening price, quantity and condition before adding.`;
            }
            proposal =
              reply.action === "none"
                ? null
                : { id: randomBytes(16).toString("hex"), ...reply };
            engine.say(reply.message);
            engine.activity(
              `Companion replied (${engine.state.companion.provider}).`,
            );
            engine.commit();
          } finally {
            busy = false;
            broadcast();
          }
          break;
        }
        case "/api/companion/apply": {
          if (!proposal || b.id !== proposal.id)
            throw new Error("This proposal is no longer available.");
          const p = proposal;
          if (p.action === "start-next") {
            if (engine.state.mode === "live" && !twitch.status.connected)
              throw new Error("Connect Twitch first.");
            if(engine.state.mode==='live'&&engine.product(p.productId).fulfillment?.type==='nft'&&!nft.configured(engine.product(p.productId).fulfillment.chain))throw Error("Configure NFT receipt verification before opening this auction.");
            engine.start({ productId: p.productId });
          }
          if (p.action === "draft-product") {
            if (!p.draftProduct) throw new Error("The draft is incomplete.");
            engine.addProduct({
              ...p.draftProduct,
              ...(b.draftProduct || {}),
              image: p.draftProduct.image,
            });
          }
          if (p.action === "pause") engine.pause();
          if (p.action === "resume") {
            if (engine.state.mode === "live" && !twitch.status.connected)
              throw new Error("Reconnect Twitch first.");
            engine.resume();
          }
          proposal = null;
          broadcast();
          await announce(engine.state.companion.message);
          break;
        }
        case "/api/companion/dismiss":
          proposal = null;
          broadcast();
          break;
        case "/api/twitch/disconnect":
          if (
            engine.state.mode === "live" &&
            engine.state.auction?.status === "live"
          )
            engine.pause();
          twitch.disconnect();
          break;
        default:
          return json(res, { error: "Unknown action." }, 404);
      }
      return json(res, { ok: true, state: stateFor("admin") });
    }
    if(path === "/api/pirateship.csv") {
      if(!adminAccess)return json(res,{error:'Streamer access required.'},403);
      res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="autoloot-pirateship.csv"','Cache-Control':'no-store'});
      return res.end(pirateShipCsv(engine.state.orders));
    }
    if (path === "/api/fulfillment.csv") {
      if (!adminAccess) return json(res, {error:"Streamer access required."},403);
      res.writeHead(200,{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="autoloot-fulfillment.csv"',"Cache-Control":"no-store"});
      return res.end(fulfillmentCsv(engine.state.orders));
    }
    if (path === "/api/orders.csv") {
      if (!adminAccess)
        return json(res, { error: "Streamer access required." }, 403);
      const cell = (v) =>
        '"' +
        String(v ?? "")
          .replace(/^[=+\-@]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      const rows = [
        [
          "Order",
          "Product",
          "Buyer",
          "Subtotal USD",
          "Shipping USD",
          "Total USD",
          "Status",
          "Mode",
          "Tracking",
        ],
        ...engine.state.orders.map((o) => [
          o.number,
          o.product.title,
          o.buyer,
          (o.amount / 100).toFixed(2),
          ((o.shippingPrice || 0) / 100).toFixed(2),
          ((o.total || o.amount) / 100).toFixed(2),
          o.status,
          o.mode,
          o.tracking,
        ]),
      ];
      res.writeHead(200, {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="autoloot-orders.csv"',
      });
      return res.end(rows.map((r) => r.map(cell).join(",")).join("\r\n"));
    }
    const contentPages={'/privacy':'privacy','/terms':'terms','/help':'help','/404':'404'};
    if(contentPages[path] && req.method==='GET'){
      res.writeHead(path==='/404'?404:200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      return res.end(readFileSync(join(root,'public',contentPages[path]+'.html')));
    }
    const notFound=()=>{
      if(path.startsWith('/api/'))return json(res,{error:'Not found.'},404);
      res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      return res.end(readFileSync(join(root,'public','404.html')));
    };
    const file =
      path === "/" || path === "/shop" || path === "/overlay"
        ? "/index.html"
        : path;
    if (!/^\/[a-zA-Z0-9_./-]+$/.test(file) || file.includes(".."))
      return notFound();
    const full = join(root, "public", file);
    if (!existsSync(full)) return notFound();
    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon",
      ".webmanifest": "application/manifest+json",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
      ".woff2": "font/woff2",
    };
    res.setHeader(
      "Content-Type",
      types[extname(full)] || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-store");
    res.end(readFileSync(full));
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
  twitch.close();
  for(const client of clients)client.res.end();
  server.close();
  server.closeIdleConnections();
  const deadline=Date.now()+30000;
  while((activeRequests || nft.busy || storage.backupBusy || busy) && Date.now()<deadline)
    await new Promise(resolve=>setTimeout(resolve,50));
  if(activeRequests || nft.busy || storage.backupBusy || busy) {
    console.error('Shutdown deadline exceeded; unresolved external operations will reconcile on restart.');
    process.exit(1);
  }
  storage.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
server.on("error", error => { storage.close(); console.error(error.message); process.exit(1); });
