import {Hono} from 'hono';
import {actionRoutes} from './actions.mjs';
import {recordCosts,accountingRows} from '../accounting.mjs';
import {encodeCsv} from '../csv.mjs';
import {isNft} from '../nft.mjs';
import {address as shippingAddress} from '../shipping.mjs';
export function createCommerceActions({engine,payments,nft,shipping,configuration,localHost,broadcast,stateFor}) {
  const router=new Hono();
  const post=actionRoutes(router,stateFor);
  post("/api/accounting/costs",async(c,b,req)=>{
recordCosts(engine,b);
  });
  post("/api/accounting/export",async(c,b,req)=>{
return c.json({csv:encodeCsv([['Order','Item','Status','Mode','Date','Collected USD','Refunded USD','Net USD','Recorded costs USD','Estimated contribution USD','Costs complete','Item cost USD','Payment fees USD','Delivery cost USD','Other cost USD','Private note','Delivery cost source'],...accountingRows(engine.state).map(row=>[row.number,row.title,row.status,row.mode,new Date(row.at).toISOString(),...['received','refund','net','expenses','margin'].map(key=>row[key]===null?'':(row[key]/100).toFixed(2)),row.complete,...['itemCost','paymentFees','deliveryCost','otherCost'].map(key=>row[key]===null?'':(row[key]/100).toFixed(2)),row.note,row.deliveryCostSource])])});
  });
  post("/api/shipping/settings",async(c,b,req)=>{
{
          if(!localHost(req)){return c.json({error:'Configure shipping from localhost.'},403);}
          const token=String(b.token || '').trim();
          if(token && !/^shippo_(test|live)_[A-Za-z0-9]+$/.test(token))throw Error('Enter a valid Shippo test or live API token.');
          if(token && process.env.SHIPPO_API_TOKEN)throw Error('Shippo token is managed by SHIPPO_API_TOKEN. Update it on the server and restart.');
          shipping.configure(b);
          if(token){await configuration.write('shipping',{token});shipping.token=token;}
          broadcast();return;
        }
  });
  post("/api/shipping/address",async(c,b,req)=>{
{
          const o=engine.order(b.id);
          if(isNft(o)||!["paid","paid-external","test-paid"].includes(o.status)||o.refundRequestedAt!=null)throw Error("Choose a paid physical order without a requested refund.");
          if(o.shipment?.packageId || o.shipment && !['quoted','failed','voided'].includes(o.shipment.status))throw Error('Resolve the label before changing its address.');
          if(b.confirmed!==true)throw Error('Confirm the recipient address.');
          o.shipping=shippingAddress(b.address);delete o.shipment;engine.commit();return;
        }
  });
  post("/api/shipping/package",async(c,b,req)=>{
shipping.createPackage(b);
  });
  post("/api/shipping/package/release",async(c,b,req)=>{
shipping.releasePackage(b);
  });
  post("/api/shipping/rates",async(c,b,req)=>{
await shipping.quote(b);
  });
  post("/api/shipping/buy",async(c,b,req)=>{
await shipping.buy(b);
  });
  post("/api/shipping/refresh",async(c,b,req)=>{
await shipping.refresh(b);
  });
  post("/api/shipping/track",async(c,b,req)=>{
await shipping.track(b);
  });
  post("/api/shipping/dispatch",async(c,b,req)=>{
shipping.dispatch(b);
  });
  post("/api/nft/authorize",async(c,b,req)=>{
nft.authorize(b.id,{allowTransfer:b.allowTransfer===true,maxFeeAtomic:b.maxFeeAtomic});
  });
  post("/api/nft/verify",async(c,b,req)=>{
{const o=engine.order(b.id);if(!o.delivery?.transactionId)throw Error('Submit a transfer first.');const proof=await nft.verify(o);if(proof)nft.complete(o,proof);return;}
  });
  post("/api/nft/demo-deliver",async(c,b,req)=>{
nft.simulate(b.id);
  });
  post("/api/payments/reconcile-refund",async(c,b,req)=>{
await payments.reconcileRefund(b.id,b.refundId);
  });
  post("/api/payments/reconcile-checkout",async(c,b,req)=>{
await payments.reconcileCheckout(b.id,b.sessionId);
  });
  post("/api/order",async(c,b,req)=>{
if (b.action === "cancel") await payments.cancel(b.id);
          else if (b.action === "refund") await payments.refund(b.id);
          else if (b.action === "confirm-paid" && engine.order(b.id).checkoutId)
            throw new Error("An active checkout must be verified by Stripe.");
          else engine.orderUpdate(b.id, b.action, b.tracking);
  });
  return router;
}
