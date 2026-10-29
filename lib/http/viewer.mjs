import {randomBytes} from 'node:crypto';
import {buyerPrizes} from '../giveaways.mjs';
import {isNft} from '../nft.mjs';
import {runOwns} from '../runs.mjs';
import {json,body,rawBody} from './response.mjs';
export function createViewer({engine,twitch,payments,nft,base}) {
 return async function handle({req,res,path,url,adminAccess,session}) {
  if(!(path==='/api/viewer' || path==='/api/receipt' && req.method==='GET' || path==='/api/stripe/webhook' && req.method==='POST' || path.startsWith('/api/viewer/') && req.method==='POST'))return false;
  await dispatch();
  return true;
  async function dispatch() {
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
        prizes:buyerPrizes(engine.state,session,engine.now()),
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
      const raw=await rawBody(req,1024*1024,'Webhook too large.');
      payments.webhook(raw, req.headers['stripe-signature']);
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
      if(path==='/api/viewer/giveaway/claim'){engine.claimGiveaway(b,session);return json(res,{ok:true});}
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
  }
 };
}
