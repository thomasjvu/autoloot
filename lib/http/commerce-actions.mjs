import {recordCosts,accountingRows} from '../accounting.mjs';
import {encodeCsv} from '../csv.mjs';
import {isNft} from '../nft.mjs';
import {address as shippingAddress} from '../shipping.mjs';
import {writeFileSync,renameSync} from 'node:fs';
import {json} from './response.mjs';
export function createCommerceActions({engine,payments,nft,shipping,shippingConfigFile,localHost,broadcast}) {
 return async function action({path,b,req,res}) {
  switch(path) {
        case "/api/accounting/costs": recordCosts(engine,b);break;
        case "/api/accounting/export": json(res,{csv:encodeCsv([['Order','Item','Status','Mode','Date','Collected USD','Refunded USD','Net USD','Recorded costs USD','Estimated contribution USD','Costs complete','Item cost USD','Payment fees USD','Delivery cost USD','Other cost USD','Private note','Delivery cost source'],...accountingRows(engine.state).map(row=>[row.number,row.title,row.status,row.mode,new Date(row.at).toISOString(),...['received','refund','net','expenses','margin'].map(key=>row[key]===null?'':(row[key]/100).toFixed(2)),row.complete,...['itemCost','paymentFees','deliveryCost','otherCost'].map(key=>row[key]===null?'':(row[key]/100).toFixed(2)),row.note,row.deliveryCostSource])])});return true;

        case "/api/shipping/settings": {
          if(!localHost(req)){json(res,{error:'Configure shipping from localhost.'},403);return true;}
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
          if(o.shipment?.packageId || o.shipment && !['quoted','failed','voided'].includes(o.shipment.status))throw Error('Resolve the label before changing its address.');
          if(b.confirmed!==true)throw Error('Confirm the recipient address.');
          o.shipping=shippingAddress(b.address);delete o.shipment;engine.commit();break;
        }
        case "/api/shipping/package": shipping.createPackage(b);break;
        case "/api/shipping/package/release": shipping.releasePackage(b);break;
        case "/api/shipping/rates": await shipping.quote(b);break;
        case "/api/shipping/buy": await shipping.buy(b);break;
        case "/api/shipping/refresh": await shipping.refresh(b);break;
        case "/api/shipping/track": await shipping.track(b);break;
        case "/api/shipping/dispatch": shipping.dispatch(b);break;
        case "/api/nft/authorize": nft.authorize(b.id,{allowTransfer:b.allowTransfer===true,maxFeeAtomic:b.maxFeeAtomic}); break;
        case "/api/nft/verify": {const o=engine.order(b.id);if(!o.delivery?.transactionId)throw Error('Submit a transfer first.');const proof=await nft.verify(o);if(proof)nft.complete(o,proof);break;}
        case "/api/nft/demo-deliver": nft.simulate(b.id); break;
        case "/api/payments/reconcile-refund": await payments.reconcileRefund(b.id,b.refundId);break;
        case "/api/payments/reconcile-checkout": await payments.reconcileCheckout(b.id,b.sessionId);break;
        case "/api/order":
          if (b.action === "cancel") await payments.cancel(b.id);
          else if (b.action === "refund") await payments.refund(b.id);
          else if (b.action === "confirm-paid" && engine.order(b.id).checkoutId)
            throw new Error("An active checkout must be verified by Stripe.");
          else engine.orderUpdate(b.id, b.action, b.tracking);
          break;
   default:return false;
  }
  return true;
 };
}
