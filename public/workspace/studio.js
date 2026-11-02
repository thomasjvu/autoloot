import {productDescription,esc,usd,visual,assetDescription,statusBadge,time} from '../shared/presenters.js';
import {icon} from '../icons.js';
import {studioWidgets,setupChecklist} from '../studio-widgets.js';
export function createStudioViews({getState,clock,companionCard,tutorialStatus}) {
 const active=()=>['live','paused'].includes(getState().auction?.status);
function stats() {
 const state=getState();
  const orders = state.orders.filter(
    (o) => !["cancelled", "expired", "refunded"].includes(o.status),
  );
  const toShip = orders.filter((o) =>
    ["paid", "test-paid", "paid-external"].includes(o.status),
  ).length;
  return `<div class="stats-grid" aria-label="Show summary"><div class="stat"><span>Sales ${state.mode === "demo" ? "in demo" : ""}</span><strong>${usd(orders.reduce((n, o) => n + o.amount, 0))}</strong></div><div class="stat"><span>Items sold</span><strong>${orders.length}</strong></div><button class="stat stat-link" data-tab="orders"><span>Ready to fulfill</span><strong>${toShip} ${icon("arrow", 14)}</strong></button></div>`;
}
function auctionCard() {
 const state=getState();
  const a = state.auction,
    p = a?.product || state.products.find((p) => p.quantity > 0);
  return `<section class="panel auction-panel"><div class="panel-header"><h2>${active() ? "On the block" : "Ready for your next auction"}</h2>${statusBadge(a?.status || "ready")}</div>${p ? `<div class="auction-body"><div class="hero-product art-${p.art}">${visual(p, true)}<span class="condition-stamp">${esc(p.condition)}</span></div><div class="auction-info"><h3>${esc(p.title)}</h3><p class="description">${esc(productDescription(p))}</p>${assetDescription(p)}<div class="bid-price"><div><span>${a?.highest ? "Current bid" : "Starting price"}</span><strong>${usd(a?.highest?.amount || p.price)}</strong></div><div class="countdown-wrap"><span>${a?.status === "paused" ? "Paused" : "Time left"}</span><strong data-clock>${a ? clock(a) : String(Math.floor((state.show.bidDuration || 60) / 60)).padStart(2, "0") + ":" + String((state.show.bidDuration || 60) % 60).padStart(2, "0")}</strong></div></div><div class="bidder-line">${a?.highest ? `<span class="bidder-avatar">${esc(a.highest.username[0])}</span><strong>${esc(a.highest.username)}</strong> is leading · ${a.bidCount} ${a.bidCount === 1 ? "bid" : "bids"}` : a?.status === "paused" ? "Take your time. Bidding is paused." : "Your first bidder could be next."}</div><div class="auction-controls">${active() ? `<button class="btn primary" data-action="${a.status === "paused" ? "resume" : "pause"}">${icon(a.status === "paused" ? "play" : "pause", 16)} ${a.status === "paused" ? "Resume auction" : "Pause auction"}</button><button class="btn" data-action="finish">End auction ${icon("check", 16)}</button>` : `<button class="btn primary" data-start="${p.id}" ${state.products.find((i) => i.id === p.id)?.quantity < 1 ? "disabled" : ""}>${icon("play", 16)} Start auction</button><button class="btn" data-action="auction-settings" aria-label="Auction settings">${icon("settings", 17)} Settings</button>`}</div><div class="auction-footnote"><span>${icon("check", 13)} ${a?.antiSnipe === false ? "💀 Sudden death · fixed deadline" : "Standard · late bids reset to 10s"}</span>${active() ? '<button class="text-btn muted" data-action="cancel">Cancel auction</button>' : `<span>${usd(a?.increment || state.show.increment || 100)} bid steps</span>`}</div></div></div>` : '<div class="empty"><h3>Your first find goes here.</h3><p>Add a product and we’ll get it ready for the spotlight.</p><button class="btn primary" data-action="add-product">Add a product</button></div>'}</section>`;
}
function queue() {
 const state=getState();
  return `<section class="panel lineup-panel"><div class="panel-header"><h2>Up next <span class="soft-count">${state.products.length}</span></h2><button class="text-btn" data-tab="inventory">Manage products ${icon("arrow", 14)}</button></div><div class="queue-list">${state.products.map((p) => `<div class="queue-item ${active() && state.auction.productId === p.id ? "selected" : ""}"><div class="thumb art-${p.art}">${visual(p)}</div><div class="queue-text"><strong>${esc(p.title)}</strong><small>${p.quantity} available ${active() && state.auction.productId === p.id ? "· On the block" : ""}</small></div><strong class="queue-price">${usd(p.price)}</strong><button class="btn small" aria-label="Start auction for ${esc(p.title)}" data-start="${p.id}" ${active() || p.quantity < 1 ? "disabled" : ""}>Start ${icon("play", 12)}</button></div>`).join("")}</div><button class="add-lineup" data-action="add-product">${icon("plus", 17)} Add another product</button></section>`;
}
function chatPanel() {
 const state=getState();
  return `<section class="panel chat-panel"><div class="panel-header"><h2>${state.mode === "demo" ? "Test chat" : "Twitch chat"}</h2><span class="pill">${state.mode}</span></div><div class="chat-stream">${
    state.chat.length
      ? state.chat
          .slice(-8)
          .map(
            (m) =>
              `<div class="chat-row"><span class="chat-user">${esc(m.username)}</span><span>${esc(m.text)}</span></div>`,
          )
          .join("")
      : '<p class="empty-chat">No messages yet.</p>'
  }</div>${state.mode === "demo" ? `<form id="bid-form"><div class="demo-inputs"><input name="username" placeholder="Username" aria-label="Demo bidder name" value="testbuyer" required maxlength="30" pattern="[A-Za-z0-9_]{2,30}"><div class="money-input"><span>$</span><input name="amount" aria-label="Bid in USD" type="number" min="0.01" step="0.01" value="${((state.auction?.highest ? state.auction.highest.amount + state.auction.increment : state.auction?.product.price || 100) / 100).toFixed(2)}" required></div></div><button class="btn full" ${state.auction?.status !== "live" ? "disabled" : ""}>Submit test bid ${icon("arrow", 15)}</button><small class="demo-notice">Simulation. No funds move.</small></form>` : `<div class="chat-help">Bid syntax <code>!bid 25</code><br>Viewers register at <code>/shop</code></div>`}</section>`;
}
function bidHistory() {
 const state=getState();
  return `<section class="panel"><div class="panel-header"><h2>Bid feed</h2>${state.auction?.status === "paused" && state.auction.highest ? '<button class="text-btn danger-text" data-action="void-bid">Void last bid</button>' : ""}</div><div class="bid-feed">${
    state.bids.length
      ? state.bids
          .slice(0, 8)
          .map(
            (b) =>
              `<div class="feed-row ${b.voided ? "voided" : ""}"><time>${time(b.at)}</time><span>@${esc(b.username)} ${b.voided ? "[void]" : ""}</span><strong>${usd(b.amount)}</strong></div>`,
          )
          .join("")
      : '<p class="empty-chat">Accepted bids appear here.</p>'
  }</div></section>`;
}
function log() {
 const state=getState();
  return `<section class="panel log-panel"><div class="panel-header"><h2>Show log</h2><span class="muted">REC ●</span></div><div class="event-log">${
    state.activity
      .slice(0, 9)
      .map(
        (e) =>
          `<div class="log-row"><time>${time(e.at)}</time><span class="log-type">${esc(e.type)}</span><span>${esc(e.text)}</span></div>`,
      )
      .join("") || '<p class="empty-chat">System ready.</p>'
  }</div></section>`;
}
function votePanel(readOnly = false) {
 const state=getState();
  const v = state.vote;
  return `<section class="panel vote-panel"><div class="panel-header"><h2>Chat picks the next drop</h2>${v ? statusBadge(v.status) : ""}</div><div class="vote-content">${v ? `<p>${v.status === "open" ? "Type !vote 1, 2 or 3 in Twitch chat. You can change your vote." : v.status === "cancelled" ? "This vote was cancelled." : v.winner ? "Chat made its choice." : "No votes this time. Pick any product."}</p><div class="vote-options">${v.options.map((o, i) => `<div class="vote-option ${v.winner === o.productId ? "vote-winner" : ""}"><span class="vote-number">${o.number}</span><div class="thumb art-${o.product.art}">${visual(o.product)}</div><strong>${esc(o.product.title)}</strong><span>${v.counts[i]} ${v.counts[i] === 1 ? "vote" : "votes"}</span></div>`).join("")}</div><div class="vote-footer"><small>${v.voters} voters · ${v.status === "open" ? "<span data-vote-clock></span> remaining" : "Tie-break: earliest listed option"}</small>${!readOnly && v.status === "open" ? '<button class="text-btn" data-action="close-vote">Close vote</button>' : ""}${!readOnly && v.status === "closed" && v.winner ? `<button class="btn primary small" data-start="${v.winner}" ${active() ? "disabled" : ""}>Auction the winner ${icon("play", 12)}</button>` : ""}</div>${!readOnly && v.status === "open" && state.mode === "demo" ? `<form id="demo-vote-form" class="demo-vote-form"><input name="username" aria-label="Demo voter" placeholder="Test voter" value="viewer_one" required><select name="option" aria-label="Vote choice">${v.options.map((o) => `<option value="${o.number}">${o.number}</option>`).join("")}</select><button class="btn small">Test vote</button></form>` : ""}` : "<p>Let everyone in chat have a say—even if they’re just here to watch.</p>"}${!readOnly && v?.status !== "open" ? '<button class="btn" data-action="open-vote">Choose products & start a vote</button>' : ""}</div></section>`;
}
function showRecap() {
 const state=getState();
  const orders = state.orders.filter(
    (o) => !["cancelled", "expired", "refunded"].includes(o.status),
  );
  const paid = orders.filter((o) =>
    ["paid", "test-paid", "paid-external", "shipped", "delivered", "test-delivered"].includes(o.status),
  );
  return `<details class="show-recap"><summary>Show recap ${icon("arrow", 14)}</summary><div class="recap-grid"><div><strong>${state.history.filter((a) => a.status === "sold").length}</strong><span>Lots sold</span></div><div><strong>${usd(paid.reduce((n, o) => n + (o.total || o.amount), 0))}</strong><span>${state.mode === "demo" ? "Simulated + recorded funds" : "Collected + confirmed"}</span></div><div><strong>${orders.filter((o) => o.status === "pending").length}</strong><span>Awaiting payment</span></div><div><strong>${new Set(state.history.flatMap((a) => (a.highest ? [a.highest.userId] : []))).size}</strong><span>Auction winners</span></div></div><button class="text-btn" data-tab="orders">Open fulfillment queue ${icon("arrow", 14)}</button></details>`;
}

function runPanel() {
 const state=getState();
 const r = state.run, armed = r && ['running','paused'].includes(r.status);
 const labels = {'waiting-review':'Ready for your review','ready':'Ready for next item','auction':'Auction in progress','selling':'Fixed-price listing open','waiting-payment':'Waiting for verified payment','waiting-nft-delivery':'Waiting for finalized NFT delivery','waiting-fulfillment':'Waiting for fulfillment','completed':'Queue reconciled','stopped':'Stopped'};
 return `<section class="panel settings-panel run-panel"><div class="panel-header"><h2>Agent-led run</h2>${statusBadge(r?.status || 'not armed')}</div><p>Choose your lineup. Munny keeps the show moving at your pace.</p>${r ? `<div class="run-summary"><strong>${Math.min(r.index + 1, r.steps.length)} / ${r.steps.length} · ${esc(r.status === 'paused' ? 'Paused' : labels[r.phase] || r.phase)}</strong><p>${esc(r.steps[r.index]?.product.title || 'All queued items processed.')}</p><small>Armed until ${esc(new Date(r.expiresAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}))} · ${esc(r.mode)}</small></div>${r.reason ? `<p class="error-box">${esc(r.reason)}</p>` : ''}` : ''}<div class="heading-actions">${armed ? `${r.phase==='waiting-review'?'<button class="btn primary" data-action="run-approve">Approve this lot</button>':''}${r.status === 'running' ? '<button class="btn" data-action="run-pause">Pause run</button>' : '<button class="btn primary" data-action="run-resume">Resume run</button>'}<button class="btn" data-action="run-stop">Stop run</button>${r.phase === 'waiting-payment' || r.phase === 'waiting-fulfillment' || r.phase === 'waiting-nft-delivery' ? '<button class="btn" data-tab="orders">Open orders →</button>' : ''}` : '<button class="btn primary" data-action="run-configure">Configure run</button>'}</div>${r ? `<details class="run-audit"><summary>Run audit · ${r.events.length} events</summary><ol>${r.events.slice(-20).map(event => `<li><time>${esc(new Date(event.at).toLocaleTimeString())}</time> ${esc(event.text)}</li>`).join('')}</ol></details>` : ''}<p class="field-help">One unit per product. Restart, disconnect, expiry or an unexpected order outcome pauses the run. NFT orders complete at verified transfer. A human still records physical fulfillment.</p></section>`;
}

function showPage() {
 const state=getState();
  return `<div class="page-heading"><div><h1>${esc(state.show.title)}</h1><p>${state.mode === "demo" ? "Practice mode · no real payments" : "Live auctions"}</p></div><button class="btn" data-action="edit-show">Edit show ${icon("settings", 14)}</button></div><div class="studio-actions heading-actions"><button class="btn" data-action="viewer">${icon("bag", 16)} Storefront</button><button class="btn" data-action="overlay">${icon("external", 16)} Stream overlay</button></div><div class="studio-grid"><div class="main-column">${runPanel()}${auctionCard()}${stats()}${queue()}${votePanel()}${showRecap()}<details class="activity-details" id="show-activity"><summary>${icon("clock", 16)} Show activity <span>Bid history & event log</span></summary>${bidHistory()}${log()}<div class="reorder-tools"><p>Arrange your lineup</p>${state.products.map((p, i) => `<div><span>${esc(p.title)}</span><button class="text-btn" data-move="${p.id}" ${i === 0 ? "disabled" : ""}>Move up ↑</button></div>`).join("")}</div></details></div><div class="right-column">${companionCard()}${chatPanel()}<div class="studio-tip">${icon("check", 16)}<p>${state.mode === "demo" ? "You’re in demo mode. Try a bid, explore your orders, and make yourself at home." : "Your viewers bid in Twitch chat. Autoloot keeps the clock, stock and orders in sync."}</p></div></div></div>`;
}

function studio() {
 const state=getState(),hasProducts=state.products.length>0;
 return `<section class="panel welcome-panel" aria-labelledby="welcome-title"><div class="welcome-copy"><h1 id="welcome-title">${hasProducts?'Your next show starts here':'Add your first lot'}</h1><div class="heading-actions">${hasProducts?'<button class="btn primary" data-tab="show">Open your show</button>':'<button class="btn primary" data-tab="catalog">Browse catalog</button>'}<button class="btn" data-action="add-product">Add a lot</button>${hasProducts?'<button class="text-btn" data-tab="inventory">Manage inventory →</button>':'<button class="text-btn" data-tab="connections">Set up your channel →</button>'}</div></div><img class="welcome-mochi" src="/characters/mochi-hero-welcome.png" alt="Munny welcomes you with an open hand" decoding="async"></section>${studioWidgets(state)}${setupChecklist(state,tutorialStatus())}`;
}
return {studio,showPage,votePanel};
}
