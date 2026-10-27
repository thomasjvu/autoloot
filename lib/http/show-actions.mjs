import {runActive} from '../runs.mjs';
import {demoContent} from '../workspace.mjs';
export function createShowActions({engine,runs,shipping,nft,twitch,announce,base,companion,rip,broadcast}) {
 return async function action({path,b,req,res}) {
  switch(path) {
        case "/api/run/approve": runs.approve(b); break;
        case "/api/run/arm": runs.arm(b); break;
        case "/api/run/pause": runs.pause(); break;
        case "/api/run/resume": runs.resume(); break;
        case "/api/run/stop": runs.stop(); break;
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
          demoContent(engine,b.enabled);companion.proposal=null;rip.clear();broadcast();break;
        case "/api/mode":
          engine.setMode(b.mode);
          break;
        case "/api/giveaway/open":
          engine.openGiveaway(b);break;
        case "/api/giveaway/close":
          engine.closeGiveaway(Boolean(b.cancel));break;
        case "/api/giveaway/draw":
          engine.drawGiveaway();break;
        case "/api/giveaway/demo":
          if(engine.state.mode!=='demo')throw Error('Practice mode only.');
          engine.enterGiveaway({userId:'demo-'+String(b.username),username:b.username,source:'demo'});break;
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
   default:return false;
  }
  return true;
 };
}
