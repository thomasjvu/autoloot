// Shared presentation rules; these never authorize bids or change auction state.
export const widgetPresets = {
  pull: {label:'Pull spotlight',width:640,height:200},
  ribbon: {label:'Recent pulls',width:1280,height:200},
  full: { label: 'Full show', width: 1280, height: 720 },
  auction: { label: 'Compact auction', width: 960, height: 200 },
  vote: { label: 'Chat vote', width: 480, height: 540 },
  mochi: { label: 'Munny only', width: 400, height: 540 },
};
export function widgetType(search = '') {
  const value = new URLSearchParams(search).get('widget');
  return Object.hasOwn(widgetPresets, value) ? value : 'full';
}
export function widgetUrl(base, type) {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  if (Object.hasOwn(widgetPresets, type) && type !== 'full') url.searchParams.set('widget', type);
  return url.href;
}
export function nextBid(auction) {
  return auction?.highest ? auction.highest.amount + auction.increment : auction?.product.price;
}
export function publicStorefront(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  } catch { return false; }
}
export function goLiveChecks(state, url) {
  return [
    { label: 'Twitch channel', ready: state.twitch.connected, detail: state.twitch.connected ? `Connected as @${state.twitch.channel}.` : 'Authorize your broadcaster account to receive bids.' },
    { label: 'Public storefront', ready: publicStorefront(url), detail: publicStorefront(url) ? 'HTTPS URL configured. Test it on a second device before sharing.' : 'Set PUBLIC_URL to your public HTTPS address and register its Twitch callback.' },
    { label: 'Inventory', ready: state.products.some(p => p.quantity > 0 && !["p1", "p2", "p3", "p4"].includes(p.id)), detail: 'Add an in-stock item you own; sample lots are for practice.' },
    { label: 'Payment setup', ready: state.payments.configured && state.payments.environment === 'live', detail: state.payments.configured ? `Stripe ${state.payments.environment}. Real sales require live credentials and verified webhooks.` : 'Stripe is not configured. Live buy-now requires it; auction payments must be verified externally.' },
    { label: 'Seller policies', ready: ['name','email','shipping','returns','retention'].every(key => state.operator?.[key]?.trim()), detail: 'Publish your seller identity, public support/privacy contact, shipping, returns and retention notices in Settings.' },
    { label: 'Show mode', ready: state.mode === 'live', detail: state.mode === 'live' ? 'Live mode accepts registered Twitch bidders.' : 'Practice mode uses simulated purchases. Switch in advanced settings when ready.' },
  ];
}

export function reservationDeadline(order) {
  return order.status === 'pending' && !order.checkoutId && order.checkoutCreated == null && Number.isFinite(order.reservationExpiresAt)
    ? order.reservationExpiresAt : null;
}
