export {transition} from '../public/shared/state-machine.js';

// Derived from durable evidence: do not persist a second copy of payment state.
export function checkoutState(order) {
 if (order.status !== 'pending') return order.status;
 if (order.cryptoCheckout) return 'wallet-reserved';
 if (order.checkoutId) return 'session-known';
 if (order.checkoutCreated != null) return 'outcome-unknown';
 return 'reserved';
}
export const checkoutHeld = order => ['wallet-reserved','session-known','outcome-unknown','processing'].includes(checkoutState(order));
export function refundState(order) {
 if (order.status === 'refunded' || order.refundStatus === 'succeeded') return 'succeeded';
 if (order.refundRequestedAt != null) return order.refundId ? 'provider-pending' : 'outcome-unknown';
 if (['failed','canceled','rejected'].includes(order.refundStatus)) return order.refundStatus;
 return 'idle';
}
export const refundHeld = order => ['outcome-unknown','provider-pending'].includes(refundState(order));

export const runGraph = Object.freeze({running:['paused','completed'],paused:['running','stopped'],stopped:[],completed:[]});
// Pausing preserves phase; every active phase may reconcile directly to another
// after restart or a webhook. Status and domain guards authorize the action.
const phases=['ready','waiting-review','auction','selling','waiting-payment','waiting-fulfillment','waiting-nft-delivery'];
export const runPhaseGraph=Object.freeze(Object.fromEntries([...phases.map(p=>[p,[...phases,'stopped','completed']]),['stopped',[]],['completed',[]]]));
export const revealGraph=Object.freeze({
 idle:['scanning','searching'],scanning:['idle','searching','candidates','error'],
 searching:['idle','scanning','candidates','error'],candidates:['idle','scanning','searching','selecting'],
 selecting:['idle','scanning','searching','selecting','selected','error'],
 selected:['idle','scanning','searching','selecting'],error:['idle','scanning','searching','selecting']
});
const labelResults=['unknown','pending','purchased','failed','voided','refund-pending'];
export const shipmentGraph=Object.freeze({
 'package-ready':['quoted'],quoted:['purchasing'],purchasing:labelResults,
 ...Object.fromEntries(labelResults.map(s=>[s,[...labelResults,...(['failed','voided'].includes(s)?['quoted']:[])]]))
});
export const deliveryGraph=Object.freeze({
 queued:['submitting','submitted','reconciling'],submitting:['submitted','reconciling'],
 submitted:['confirmed'],reconciling:['submitted'],confirmed:[],simulated:[]
});
