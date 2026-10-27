import {esc,usd,heading,statusBadge} from '../shared/presenters.js';
import {icon} from '../icons.js';
const isNftOrder=o=>o.product?.fulfillment?.type==='nft';
const physicalFundsVerified=o=>o.mode!=='live'||o.status==='paid-external'||(['paid','shipped'].includes(o.status)&&o.paymentLive===true)||(o.status==='shipped'&&(o.paymentSource==='external'||(o.paymentLive===undefined&&!o.checkoutId&&!o.paymentIntent)));
export function createOrderPresenters(state,{nftOrderDetails}) {
function shippingAction(o) {return physicalFundsVerified(o)&&!isNftOrder(o)&&(['paid','paid-external','test-paid'].includes(o.status)||o.status==='shipped'&&o.shipment)?`<button class="btn small" data-shipping-order="${esc(o.id)}">${o.shipment?`Shipping · ${esc(o.shipment.status)}`:'Create shipping label'}</button>`:'';}
function orderActions(o) {
  if(o.mode==='live' && (o.status==='pending' && o.checkoutCreated && !o.checkoutId || o.status==='paid' && o.refundRequestedAt && !o.refundId))return `<button class="btn small" data-order="${o.id}" data-order-action="${o.status==='pending'?'reconcile-checkout':'reconcile-refund'}">Reconcile with Stripe</button>`;
  if (o.status === "pending")
    return `<div class="row-actions">${o.mode === "demo" ? `<button class="btn small" data-order="${o.id}" data-order-action="test-pay">Test payment</button>` : !state.payments.configured && !o.checkoutId ? `<button class="btn small" data-order="${o.id}" data-order-action="confirm-paid">Confirm external payment</button>` : '<span class="muted">Awaiting checkout</span>'}<button class="text-btn danger-text" data-order="${o.id}" data-order-action="cancel">Cancel</button></div>`;
  if (["paid", "test-paid", "paid-external"].includes(o.status))
    if (isNftOrder(o)) return `${nftOrderDetails(o,true)}${o.mode==='demo'?`<button class="btn small" data-nft-order="${o.id}">Simulate NFT delivery</button>`:!o.delivery?`<button class="btn small" data-nft-authorize="${o.id}">Authorize NFT delivery</button>`:`<span class="muted">Waiting for finalized transfer</span>`}`;
    else return physicalFundsVerified(o)?`<div class="row-actions"><button class="btn small" data-order="${o.id}" data-order-action="ship">Ship ${icon("arrow", 13)}</button>${o.status !== "paid-external" ? `<button class="text-btn danger-text" data-order="${o.id}" data-order-action="refund">${o.refundId ? "Check refund" : "Refund"}</button>` : ""}</div>`:`<span class="muted">Test payment · physical fulfillment unavailable</span><button class="text-btn danger-text" data-order="${o.id}" data-order-action="refund">${o.refundId ? 'Check refund' : 'Refund'}</button>`;
  if (["delivered","test-delivered"].includes(o.status)) return nftOrderDetails(o,true);
  return o.status === "shipped"
    ? `<span class="tracking">${esc(o.tracking)}</span>`
    : "—";
}
return {shippingAction,orderActions};
}
export function ordersPage(state,{filter='all'}={}, {nftOrderDetails,reservationNotice}) {
 const {shippingAction,orderActions}=createOrderPresenters(state,{nftOrderDetails});
  const list = state.orders.filter(
    (o) =>
      filter === "all" ||
      (filter === "ready" && physicalFundsVerified(o) && ["paid","paid-external","test-paid"].includes(o.status) && !isNftOrder(o) && o.refundRequestedAt == null) ||
      (filter === "pending"
        ? ["pending", "processing"].includes(o.status)
        : filter === "shipped"
          ? ["shipped","delivered","test-delivered"].includes(o.status)
          : filter === "paid" && ["paid", "paid-external", "test-paid"].includes(o.status)),
  );
  return `${heading("Your orders", "", `<div class="heading-actions shipping-order-tools"><button class="btn" data-action="export-fulfillment">Export shipping CSV</button><button class="btn" data-action="export-pirateship">Pirate Ship CSV</button><button class="btn" data-action="import-tracking">Import tracking</button><button class="btn" data-action="export">Export all orders</button></div>`)}<div class="filter-tabs">${[
    ["all", "All"],
    ["pending", "Unpaid"],
    ["ready", "Ready to ship"],
    ["paid", "All paid / digital delivery"],
    ["shipped", "Fulfilled"],
  ]
    .map(
      ([k, l]) =>
        `<button class="${filter === k ? "active" : ""}" data-filter="${k}">${l}</button>`,
    )
    .join(
      "",
    )}</div><section class="panel orders-panel"><div class="table-scroll"><table><thead><tr><th>Order</th><th>Buyer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>${list.map((o) => `<tr><td><small>${esc(o.number)} / ${esc(o.kind || "auction")} / ${o.mode}</small><strong>${esc(o.product.title)}</strong>${reservationNotice(o)}${!isNftOrder(o) && ["paid","paid-external","test-paid"].includes(o.status) && !o.shipping ? '<small>Shipping address missing — verify before shipment</small>' : ""}${o.shipping ? `<button class="text-btn" data-address="${o.id}">Shipping details ↗</button>` : ""}</td><td>@${esc(o.buyer)}</td><td><strong>${usd(o.total || o.amount)}</strong><small>+${usd(o.shippingPrice || 0)} shipping</small></td><td>${statusBadge(o.status)}${o.refundStatus && o.refundStatus !== "succeeded" ? `<small>Refund ${esc(o.refundStatus)}</small>` : ""}</td><td>${shippingAction(o)}${orderActions(o)}</td></tr>`).join("")}</tbody></table></div>${!list.length ? '<div class="empty"><h3>No orders.</h3><p>Sold lots and direct purchases appear here.</p></div>' : ""}</section><p class="section-note">${state.payments.configured ? `Stripe / ${state.payments.environment} environment. Payment is confirmed by signed webhooks.` : "Checkout is not configured. Live payments must be confirmed externally."} Demo payments are simulated.</p>`;
}
