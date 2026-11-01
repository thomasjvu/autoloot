import {ordersChart} from '../shared/analytics.js';
import {esc,usd,heading,statusBadge} from '../shared/presenters.js';
import {attentionReasons,packingGroups,packingBlockers,physicalFundsVerified} from './order-operations.js';
import {icon} from '../icons.js';
const isNftOrder=o=>o.product?.fulfillment?.type==='nft';
export function createOrderPresenters(state,{nftOrderDetails}) {
function shippingAction(o) {return physicalFundsVerified(o)&&!isNftOrder(o)&&(['paid','paid-external','test-paid'].includes(o.status)||o.status==='shipped'&&o.shipment)?`<button class="btn small" data-shipping-order="${esc(o.id)}">${o.shipment?`Shipping · ${esc(o.shipment.status)}`:'Create shipping label'}</button>`:'';}
function orderActions(o) {
  if(o.shipment?.packageId)return '<span class="muted">Manage shared label and dispatch in Shipping.</span>';
  if(!isNftOrder(o)&&["purchasing","unknown","pending","refund-pending"].includes(o.shipment?.status))return '<span class="muted">Resolve the existing label in Shipping before dispatch or refund.</span>';
  if(o.mode==='live' && (o.status==='pending' && o.checkoutCreated != null && !o.checkoutId || o.status==='paid' && o.refundRequestedAt != null && !o.refundId))return `<button class="btn small" data-order="${o.id}" data-order-action="${o.status==='pending'?'reconcile-checkout':'reconcile-refund'}">Reconcile with Stripe</button>`;
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
 const groups=filter==='packing'?packingGroups(state.orders):[];
 const groupStart=new Map(groups.map(g=>[g.orders[0].id,g]));
  const list = state.orders.filter(
    (o) =>
      filter === "all" ||
      (filter === "attention" && attentionReasons(o).length > 0) ||
      (filter === "packing" && packingBlockers(o).length === 0) ||
      (filter === "ready" && physicalFundsVerified(o) && ["paid","paid-external","test-paid"].includes(o.status) && !isNftOrder(o) && o.refundRequestedAt == null) ||
      (filter === "pending"
        ? ["pending", "processing"].includes(o.status)
        : filter === "shipped"
          ? ["shipped","delivered","test-delivered"].includes(o.status)
          : filter === "paid" && ["paid", "paid-external", "test-paid"].includes(o.status)),
  );
  if(filter==='packing')list.splice(0,list.length,...groups.flatMap(g=>g.orders));
  return `${heading("Your orders", "", `<details class="order-file-menu"><summary class="btn">${icon('download',16)} Import / export <span aria-hidden="true">⌄</span></summary><div class="order-file-options" aria-label="Order files"><button data-action="export">Export orders CSV</button><button data-action="export-fulfillment">Export shipping CSV</button><button data-action="export-pirateship">Export Pirate Ship CSV</button><button data-action="import-tracking">Import tracking CSV</button></div></details>`)}${ordersChart(state.orders)}<div class="filter-tabs">${[
    ["all", "All"],
    ["attention", `Needs attention (${state.orders.filter(o=>attentionReasons(o).length).length})`],
    ["packing", "Packing by buyer"],
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
    )}</div>${filter==='packing'?'<p class="section-note">Grouped by verified buyer, mode and matching destination. Review matching orders to create one package and label. Buyer shipping charges stay unchanged.</p>':''}<section class="panel orders-panel"><div class="table-scroll"><table><thead><tr><th>Order</th><th>Buyer</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>${list.map((o) => `${groupStart.has(o.id)?packingHeading(groupStart.get(o.id)):''}<tr><td><small>${esc(o.number)} / ${esc(o.kind || "auction")} / ${o.mode}</small><strong>${esc(o.product.title)}</strong>${reservationNotice(o)}${o.shipment?.packageId?`<small>Combined package · ${esc(o.shipment.orderIds.length)} orders</small>`:""}${filter==='attention'?attentionReasons(o).map(reason=>`<p class="section-note">${esc(reason)}</p>`).join(''):''}${!isNftOrder(o) && ["paid","paid-external","test-paid"].includes(o.status) && !o.shipping ? '<small>Shipping address missing — verify before shipment</small>' : ""}${o.shipping ? `<button class="text-btn" data-address="${o.id}">Shipping details ↗</button>` : ""}</td><td>@${esc(o.buyer)}</td><td><strong>${usd(o.total || o.amount)}</strong><small>+${usd(o.shippingPrice || 0)} shipping</small></td><td>${statusBadge(o.status)}${o.refundStatus && o.refundStatus !== "succeeded" ? `<small>Refund ${esc(o.refundStatus)}</small>` : ""}</td><td>${shippingAction(o)}${orderActions(o)}</td></tr>`).join("")}</tbody></table></div>${!list.length ? '<div class="empty"><h3>No orders.</h3><p>Sold lots and direct purchases appear here.</p></div>' : ""}</section>${filter==='packing'?packingExclusions(state.orders):''}<p class="section-note">${state.payments.configured ? `Stripe / ${state.payments.environment} environment. Payment is confirmed by signed webhooks.` : "Checkout is not configured. Live payments must be confirmed externally."} Demo payments are simulated.</p>`;
}

function packingHeading(g) {
 const a=g.shipping;
 return `<tr><th colspan="5">@${esc(g.buyer)} · ${esc(g.mode)} · ${g.orders.length} items / orders · ${usd(g.total)} total · ${usd(g.shippingTotal)} shipping charged separately${g.orders.length>1?` <button class="btn small" data-shipping-package="${esc(JSON.stringify(g.orders.map(o=>o.id)))}">Create combined package</button>`:""}<small>${esc(a.name)} · ${esc(a.line1)} ${esc(a.line2||'')} · ${esc(a.city)}, ${esc(a.state||'')} ${esc(a.postal_code)} · ${esc(a.country)}</small></th></tr>`;
}
function packingExclusions(orders) {
 const excluded=orders.filter(o=>!isNftOrder(o)&&['paid','paid-external','test-paid'].includes(o.status)&&packingBlockers(o).length);
 return excluded.length?`<section class="panel"><h2>Review before packing</h2>${excluded.map(o=>`<p>${esc(o.number)} · @${esc(o.buyer)} — ${esc(packingBlockers(o).join(' '))}${o.shipment?.packageId?` <button class="btn small" data-shipping-order="${esc(o.id)}">Open combined package</button>`:''}</p>`).join('')}<p>Open Needs attention or All to resolve these orders.</p></section>`:'';
}
