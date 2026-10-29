const paid = ['paid', 'paid-external', 'test-paid'];
const uncertainLabels = ['purchasing', 'unknown', 'pending', 'refund-pending'];
const labelLiabilities = [...uncertainLabels, 'purchased'];
export const physicalFundsVerified = o => o.mode !== 'live' || o.status === 'paid-external' || (['paid', 'shipped'].includes(o.status) && o.paymentLive === true) || (o.status === 'shipped' && (o.paymentSource === 'external' || (o.paymentLive === undefined && !o.checkoutId && !o.paymentIntent)));
const physical = o => o.product?.fulfillment?.type !== 'nft';
export function completeAddress(o) {
 const a = o.shipping;
 return ['name', 'line1', 'city', 'postal_code', 'country', ...(a?.country === 'US' ? ['state'] : [])].every(key => String(a?.[key] || '').trim());
}
export function attentionReasons(o) {
 const reasons = [];
 if (o.status === 'pending') reasons.push(o.checkoutCreated != null && !o.checkoutId ? 'Checkout outcome uncertain — reconcile with Stripe before retrying payment.' : o.checkoutId ? 'Checkout open — await provider confirmation or resume existing checkout.' : 'Awaiting payment — buyer must open their private order.');
 if (o.status === 'processing') reasons.push('Payment processing — await provider confirmation.');
 if (o.refundRequestedAt != null && o.refundStatus !== 'succeeded' && o.status !== 'refunded') reasons.push('Refund unresolved — check the existing refund before retrying.');
 if (uncertainLabels.includes(o.shipment?.status)) reasons.push('Label outcome unresolved — refresh the existing label status.');
 if (o.shipment?.status === 'failed' && paid.includes(o.status)) reasons.push('Label failed — review provider status before requesting new rates.');
 if (paid.includes(o.status) && physical(o)) {
  if (!physicalFundsVerified(o)) reasons.push('Live fulfillment blocked — payment is test or unverified.');
  else if (!completeAddress(o)) reasons.push('Shipping address incomplete — open Shipping to review the recipient.');
 }
 if (paid.includes(o.status) && !physical(o) && o.delivery?.error) reasons.push('Digital delivery failed — review the existing transfer before retrying.');
 return reasons;
}
export function packingBlockers(o) {
 if (!physical(o) || !paid.includes(o.status)) return ['Only paid, unshipped physical orders can be packed.'];
 const reasons = [];
 if (!physicalFundsVerified(o)) reasons.push('Payment is test or unverified for a live order.');
 if (o.refundRequestedAt != null) reasons.push('Refund requested.');
 if (!o.userId) reasons.push('Verified buyer identity missing.');
 if (!completeAddress(o)) reasons.push('Shipping address incomplete.');
 if (o.shipment?.packageId || labelLiabilities.includes(o.shipment?.status)) reasons.push('Existing label must be handled separately.');
 return reasons;
}
export function packingGroups(orders) {
 const groups = new Map();
 for (const o of orders) {
  if (packingBlockers(o).length) continue;
  const destination = ['name', 'line1', 'line2', 'city', 'state', 'postal_code', 'country'].map(key => String(o.shipping[key] || '').trim().replace(/\s+/g, ' ').toLowerCase());
  const key = JSON.stringify([o.userId, o.mode, destination]);
  if (!groups.has(key)) groups.set(key, {buyer:o.buyer, mode:o.mode, shipping:o.shipping, orders:[], total:0, shippingTotal:0});
  const group = groups.get(key);
  group.orders.push(o); group.total += o.total ?? o.amount; group.shippingTotal += o.shippingPrice || 0;
 }
 return [...groups.values()];
}
