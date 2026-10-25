import http from "node:http";
import {emptyWorkspace,demoContent} from "./lib/workspace.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { Metadata, visionSchema, visionTask, rawQuotes, hostPull } from "./lib/rip.mjs";
import { Catalog } from "./lib/catalog.mjs";
const metadata = new Metadata();
const catalog = new Catalog(metadata);
let rip = { observation: null, candidates: [], selected: null, pulls: [], error: "" };
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
import { Payments } from "./lib/payments.mjs";
import { demoReply, codexReply } from "./lib/companion.mjs";
const root = fileURLToPath(new URL(".", import.meta.url));
const data = process.env.DATA_DIR || join(root, ".data");
mkdirSync(data, { recursive: true, mode: 0o700 });
const stateFile = join(data, "show.json");
let initial = process.env.AUTOLOOT_DEMO === '1' ? seed() : emptyWorkspace();
if (existsSync(stateFile)) {
  try {
    initial = JSON.parse(readFileSync(stateFile, "utf8"));
    if (initial.version !== 1) throw Error();
  } catch {
    throw new Error(
      "Cannot read .data/show.json. Restore a valid backup before starting.",
    );
  }
}
const imageDir = join(data, "images");
mkdirSync(imageDir, { recursive: true, mode: 0o700 });
const clients = new Set();
const admin = randomBytes(32).toString("hex");
let engine, twitch, payments;
let proposal = null,
  busy = false;
function publicState() {
  const s = engine.state;
  return {
    mode: s.mode,
    vote: publicVote(s.vote),
    show: s.show,
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
    })),
    companion: s.companion,
    serverTime: Date.now(),
  };
}
function stateFor(role) {
  return role === "admin"
    ? {
        ...engine.state,
        vote: publicVote(engine.state.vote),
        orders: engine.state.orders.map(({ claim, ...o }) => o),
        registrations: engine.state.registrations.map((r) => ({
          ...r,
          blocked: engine.state.blocked.some((b) => b.userId === r.userId),
        })),
        payments: payments.status,
        twitch: twitch.status,
        proposal,
        companionBusy: busy,
        rip: {...rip, source: metadata.base},
        catalog: {...catalog.state, source:metadata.base},
        serverTime: Date.now(),
      }
    : publicState();
}
function broadcast() {
  for (const c of clients)
    c.res.write(`data: ${JSON.stringify(stateFor(c.role))}\n\n`);
}
engine = new Engine(initial, {
  save: (s) => {
    writeFileSync(stateFile + ".tmp", JSON.stringify(s), { mode: 0o600 });
    renameSync(stateFile + ".tmp", stateFile);
  },
  onChange: broadcast,
});
twitch = new Twitch(engine, broadcast);
const twitchConfigFile=join(data,'twitch-app.json');
if(existsSync(twitchConfigFile)) {
  const config=JSON.parse(readFileSync(twitchConfigFile,'utf8'));
  twitch.client=config.clientId; twitch.secret=config.clientSecret;
  twitch.status.configured=Boolean(twitch.client && twitch.secret);
}
payments = new Payments(engine);
// An interrupted live show resumes paused; never silently close an auction while offline.
if (engine.state.auction?.status === "live") {
  const a = engine.state.auction;
  a.remaining = Math.max(1000, a.endsAt - Date.now());
  a.status = "paused";
  engine.activity("Server restarted. Auction paused; review before resuming.");
  engine.commit();
}
const port = Number(process.env.PORT || 4173),
  base = process.env.PUBLIC_URL || `http://localhost:${port}`;
function equal(a, b) {
  return (
    typeof a === "string" &&
    a.length === b.length &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
function isAdmin(req, url) {
  return (
    equal(
      req.headers["x-autoloot-admin"] || req.headers["x-loot-admin"],
      admin,
    ) || equal(url.searchParams.get("admin"), admin)
  );
}
function localHost(req) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(
    String(req.headers.host).replace(/:\d+$/, ""),
  );
}
function json(res, value, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function body(req) {
  let result = "",
    size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 32768) throw new Error("Request too large.");
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
const timer = setInterval(() => {
  engine.tick();
  const a = engine.state.auction;
  if (a && ["sold", "unsold"].includes(a.status) && a.id !== announcedAuction) {
    announcedAuction = a.id;
    if (a.mode === "live")
      announce(engine.state.companion.message + " Orders: " + base + "/shop");
  }
}, 200);
timer.unref();
const validationTimer = setInterval(() => twitch.validate(), 55 * 60 * 1000);
validationTimer.unref();
const buckets = new Map();
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
  );
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  const adminAccess = isAdmin(req, url);
  const session = twitch.session(req.headers.cookie);
  try {
    if (req.method === "POST" && path !== "/api/stripe/webhook") {
      const key = adminAccess
        ? "admin"
        : session?.id || req.socket.remoteAddress;
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket || now - bucket.at > 60000) {
        bucket = { at: now, count: 0 };
        buckets.set(key, bucket);
      }
      if (++bucket.count > (adminAccess ? 180 : 60))
        return json(
          res,
          { error: "Too many requests. Try again in a minute." },
          429,
        );
      if (buckets.size > 10000)
        for (const [k, v] of buckets) if (now - v.at > 60000) buckets.delete(k);
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
    if (path === "/api/state")
      return json(res, stateFor(adminAccess ? "admin" : "viewer"));
    if (path === "/api/events") {
      if (url.searchParams.has("admin") && !adminAccess)
        return json(res, { error: "Admin session expired." }, 403);
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      const client = { res, role: adminAccess ? "admin" : "viewer" };
      clients.add(client);
      res.write(`data: ${JSON.stringify(stateFor(client.role))}\n\n`);
      const keep = setInterval(() => res.write(": keepalive\n\n"), 15000);
      req.on("close", () => {
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
            .map(({ claim, ...o }) => o)
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
      if (path === "/api/viewer/demo-pay") {
        if (o.mode !== "demo")
          throw new Error("Live orders require verified payment.");
        if (!o.shipping) throw new Error("Add a demo shipping address first.");
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
      if (busy) throw Error("Mochi is already working. Wait for this frame to finish.");
      if(req.headers['content-type'] !== 'image/jpeg') throw Error('Send a JPEG frame.');
      const chunks=[]; let size=0;
      for await(const chunk of req) { size+=chunk.length; if(size>2000000) throw Error('Frame too large.'); chunks.push(chunk); }
      const image=Buffer.concat(chunks);
      if(image[0]!==255 || image[1]!==216) throw Error('Invalid JPEG.');
      const dir=mkdtempSync(join(tmpdir(),'autoloot-rip-'));
      busy=true; broadcast();
      try {
        const imagePath=join(dir,'frame.jpg'); writeFileSync(imagePath,image,{mode:0o600});
        const observation=await codexReply('',engine.state,{imagePath,outputSchema:visionSchema,task:visionTask});
        rip.observation=observation; rip.selected=null; rip.candidates=[]; rip.error='';
        if(['card','pack'].includes(observation.kind)) {
          try { rip.candidates=await metadata.search(observation); } catch(e) {rip.error=e.message;}
        }
        return json(res,rip);
      } finally {rmSync(dir,{recursive:true,force:true});busy=false;broadcast();}
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
      const b = await body(req);
      switch (path) {
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
        case "/api/rip/search":
          rip.selected=null; rip.observation=null; rip.candidates=await metadata.search({kind:b.kind==='pack'?'pack':'card',name:b.query}); rip.error=''; break;
        case "/api/rip/select": {
          const candidate=rip.candidates.find(c=>c.id===b.id);
          if(!candidate) throw Error('Search for the card first.');
          if(rip.observation?.kind==='pack' && !candidate.number) throw Error('Pack set candidate: hold up a card and scan its reveal to log a pull.');
          const detail=await metadata.detail(candidate.id);
          if(!detail.card?.id) throw Error('Metadata returned no card detail.');
          rip.selected={...candidate,rarity:detail.card.rarity || '',variants:rawQuotes(detail)}; break;
        }
        case "/api/rip/confirm": {
          if(!rip.selected) throw Error('Select and review a card first.');
          const selected=rip.selected;
          const price=b.variant ? selected.variants.find(v=>v.key===b.variant):null;
          if(b.variant && !price) throw Error('Choose an available variant.');
          const pull={id:randomBytes(12).toString('hex'),name:selected.name,number:selected.number,setName:selected.setName,rarity:selected.rarity,metadataId:selected.id,price,at:new Date().toISOString()};
          rip.pulls.unshift(pull); rip.pulls=rip.pulls.slice(0,200);
          rip.selected=null; rip.observation=null; rip.candidates=[];
          engine.say(hostPull(pull),'happy'); break;
        }
        case "/api/rip/clear":
          rip.observation=null; rip.selected=null; rip.candidates=[]; rip.error=''; break;

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
          if(typeof b.enabled!=='boolean')throw Error('Choose load or remove demo content.');
          writeFileSync(join(data,'before-demo-change-'+Date.now()+'.json'),JSON.stringify(engine.state),{mode:0o600});
          demoContent(engine,b.enabled);proposal=null;rip={observation:null,candidates:[],selected:null,pulls:[],error:''};broadcast();break;
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
        case "/api/companion/settings":
          if (b.provider && !["demo", "codex"].includes(b.provider))
            throw new Error("Unknown provider.");
          for (const k of ["enabled", "voice", "overlayVoice", "reducedMotion"])
            if (typeof b[k] === "boolean") engine.state.companion[k] = b[k];
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
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Autoloot is ready at http://localhost:${port}\nViewer page: ${base}/shop\nLocal streamer access only. Data: ${data}`,
  ),
);
process.on("SIGTERM", () => {
  twitch.close();
  server.close();
  process.exit(0);
});
