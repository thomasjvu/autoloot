import {Hono} from 'hono';
import {actionRoutes} from './actions.mjs';
import {runActive} from '../commerce/runs.mjs';
import {demoContent} from '../commerce/workspace.mjs';
export function createShowActions({engine,runs,shipping,nft,twitch,announce,base,companion,rip,broadcast,stateFor}) {
  const router=new Hono();
  const post=actionRoutes(router,stateFor);
  post("/api/run/approve",async(c,b,req)=>{
runs.approve(b);
  });
  post("/api/run/arm",async(c,b,req)=>{
runs.arm(b);
  });
  post("/api/run/pause",async(c,b,req)=>{
runs.pause();
  });
  post("/api/run/resume",async(c,b,req)=>{
runs.resume();
  });
  post("/api/run/stop",async(c,b,req)=>{
runs.stop();
  });
  post("/api/auction/void",async(c,b,req)=>{
engine.voidBid();
  });
  post("/api/bidder",async(c,b,req)=>{
engine.block(b.userId, Boolean(b.blocked));
  });
  post("/api/demo/buy",async(c,b,req)=>{
if (engine.state.mode !== "demo")
            throw new Error("Demo purchase is disabled in live mode.");
engine.buyNow({
            productId: b.productId,
            userId: "demo-" + String(b.username || "testbuyer").toLowerCase(),
            username: String(b.username || "testbuyer"),
            requestId: b.requestId,
          });
  });
  post("/api/auction/start",async(c,b,req)=>{
if(engine.state.mode==='live'&&engine.product(b.productId).fulfillment?.type==='nft'&&!nft.configured(engine.product(b.productId).fulfillment.chain))throw Error("Configure NFT receipt verification before opening this auction.");
if (engine.state.mode === "live" && !twitch.status.connected)
            throw new Error("Connect Twitch before starting a live auction.");
engine.start(b);
await announce(
            engine.state.companion.message + " Register: " + base + "/shop",
          );
  });
  post("/api/auction/pause",async(c,b,req)=>{
engine.pause();
await announce("Auction paused. Bidding is temporarily closed.");
  });
  post("/api/auction/resume",async(c,b,req)=>{
if (engine.state.mode === "live" && !twitch.status.connected)
            throw new Error("Reconnect Twitch first.");
engine.resume();
await announce("Auction resumed. Bidding is open again.");
  });
  post("/api/auction/finish",async(c,b,req)=>{
engine.tick();
if (["live", "paused"].includes(engine.state.auction?.status))
            engine.finish();
  });
  post("/api/auction/cancel",async(c,b,req)=>{
engine.finish(true);
await announce("Auction cancelled. No order was created.");
  });
  post("/api/demo/bid",async(c,b,req)=>{
if (engine.state.mode !== "demo")
            throw new Error("Demo bids are disabled in live mode.");
engine.chat(b.username, `!bid ${b.amount}`);
engine.bid({
            userId: "demo-" + String(b.username).toLowerCase(),
            username: b.username,
            amount: b.amount,
          });
  });
  post("/api/demo/chat",async(c,b,req)=>{
if (engine.state.mode !== "demo")
            throw new Error("Demo chat is disabled in live mode.");
engine.chat(
            "cozycollector",
            b.text || "The lavender keys are so cute ✨",
          );
  });
  post("/api/workspace/demo",async(c,b,req)=>{
if (runActive(engine.state.run)) throw Error("Stop the agent run before changing demo inventory.");
if(shipping.locks.size || engine.state.orders.some(o=>o.mode==='demo'&&['purchasing','unknown','pending','purchased','refund-pending'].includes(o.shipment?.status)))throw Error("Resolve practice shipping labels before clearing demo content.");
if(typeof b.enabled!=='boolean')throw Error('Choose load or remove demo content.');
demoContent(engine,b.enabled);
companion.proposal=null;
rip.clear();
broadcast();
  });
  post("/api/mode",async(c,b,req)=>{
engine.setMode(b.mode);
  });
  post("/api/giveaway/open",async(c,b,req)=>{
engine.openGiveaway(b);
  });
  post("/api/giveaway/close",async(c,b,req)=>{
engine.closeGiveaway(Boolean(b.cancel));
  });
  post("/api/giveaway/draw",async(c,b,req)=>{
engine.drawGiveaway();
  });
  post("/api/giveaway/dispatch",async(c,b,req)=>{
engine.dispatchGiveaway(b);
  });
  post("/api/giveaway/demo",async(c,b,req)=>{
if(engine.state.mode!=='demo')throw Error('Practice mode only.');
engine.enterGiveaway({userId:'demo-'+String(b.username),username:b.username,source:'demo'});
  });
  post("/api/vote/open",async(c,b,req)=>{
engine.openVote(b);
await announce(
            engine.state.companion.message +
              " " +
              engine.state.vote.options
                .map((o) => `${o.number}: ${o.product.title}`)
                .join(" / "),
          );
  });
  post("/api/vote/close",async(c,b,req)=>{
engine.closeVote(Boolean(b.cancel));
await announce(engine.state.companion.message);
  });
  post("/api/vote/demo",async(c,b,req)=>{
if (engine.state.mode !== "demo")
            throw Error("Demo voting is disabled in live mode.");
engine.vote({
            userId: "demo-" + String(b.username || "testviewer"),
            option: Number(b.option),
          });
  });
  return router;
}
